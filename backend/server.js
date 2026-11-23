import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@libsql/client";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});
const SECRET = process.env.JWT_SECRET || "dev-secret";
const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || true }));
app.use(express.json());

await db.batch([
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE TABLE IF NOT EXISTS trades (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL,
    trade_date TEXT, direction TEXT, outcome TEXT,
    entry_price REAL, exit_price REAL, sl_price REAL, tp_price REAL,
    points REAL, r_multiple REAL, lots REAL, pnl REAL,
    entry_time TEXT, close_time TEXT, duration_min INTEGER,
    setup TEXT, emotion TEXT, notes TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id, entry_time)`,
]);

// Auto-migrate: adds new columns to an existing database without losing data
const NEW = { sl_points: "REAL", tp_points: "REAL", planned_rr: "REAL", mfe: "REAL", mae: "REAL", session: "TEXT", timeframe: "TEXT", risk_pct: "REAL", fees: "REAL", followed_plan: "TEXT", mistake: "TEXT", rating: "INTEGER", screenshot: "TEXT" };
for (const [c, t] of Object.entries(NEW)) { try { await db.execute(`ALTER TABLE trades ADD COLUMN ${c} ${t}`); } catch {} }

// trade_type = forward | backtest. confluences = JSON of ticked confluences per timeframe
try { await db.execute("ALTER TABLE trades ADD COLUMN trade_type TEXT DEFAULT 'forward'"); } catch {}
try { await db.execute("ALTER TABLE trades ADD COLUMN confluences TEXT"); } catch {}

// Gym tracker: habits (with a schedule) and one check-in per habit per day
await db.batch([
  `CREATE TABLE IF NOT EXISTS habits (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, name TEXT NOT NULL,
    kind TEXT DEFAULT 'check', unit TEXT, sched_type TEXT DEFAULT 'daily', sched TEXT,
    start_date TEXT NOT NULL, end_date TEXT, skips_per_month INTEGER DEFAULT 2,
    position INTEGER DEFAULT 0, created_at TEXT DEFAULT CURRENT_TIMESTAMP)`,
  `CREATE INDEX IF NOT EXISTS idx_habits_user ON habits(user_id, position)`,
  `CREATE TABLE IF NOT EXISTS habit_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, habit_id INTEGER NOT NULL,
    check_date TEXT NOT NULL, status TEXT NOT NULL, value REAL, created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(habit_id, check_date))`,
  `CREATE INDEX IF NOT EXISTS idx_checkins_user ON habit_checkins(user_id, check_date)`,
]);

// New journal fields
const NEW2 = { entry_pattern: "TEXT", ny_gap_time: "TEXT", retracement: "INTEGER", sl_pd_array: "TEXT", ath: "INTEGER", inside_bar: "INTEGER", inside_bar_tf: "TEXT", inside_bar_bias: "TEXT", invalidation: "INTEGER", invalidation_types: "TEXT", reversal_time: "TEXT", reversal_gap_min: "INTEGER", liq_point: "TEXT" };
for (const [c, t] of Object.entries(NEW2)) { try { await db.execute(`ALTER TABLE trades ADD COLUMN ${c} ${t}`); } catch {} }
// Old data: rename emotions, and carry over old setups that match the new entry patterns
try {
  await db.execute("UPDATE trades SET emotion='Neutral' WHERE emotion='Calm'");
  await db.execute("UPDATE trades SET emotion='Over confident' WHERE emotion='Confident'");
  await db.execute("UPDATE trades SET entry_pattern=setup WHERE entry_pattern IS NULL AND setup IN ('Perfect Man','Late Guest','Ghost Shadow','Left Over Eater')");
} catch {}

const auth = (req, res, next) => {
  try {
    req.uid = jwt.verify((req.headers.authorization || "").replace("Bearer ", ""), SECRET).uid;
    next();
  } catch { res.status(401).json({ error: "Please log in again" }); }
};
const token = (u) => ({ token: jwt.sign({ uid: u.id }, SECRET, { expiresIn: "30d" }), user: { id: u.id, name: u.name, email: u.email } });

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;
  if (!email || !password || password.length < 6) return res.status(400).json({ error: "Email and a 6+ character password required" });
  try {
    const r = await db.execute({ sql: "INSERT INTO users (name,email,password_hash) VALUES (?,?,?)", args: [name || "", email.toLowerCase(), await bcrypt.hash(password, 10)] });
    res.json(token({ id: Number(r.lastInsertRowid), name, email }));
  } catch { res.status(409).json({ error: "Email already registered" }); }
});

app.post("/api/auth/login", async (req, res) => {
  const { email = "", password = "" } = req.body;
  const r = await db.execute({ sql: "SELECT * FROM users WHERE email=?", args: [email.toLowerCase()] });
  const u = r.rows[0];
  if (!u || !(await bcrypt.compare(password, u.password_hash))) return res.status(401).json({ error: "Wrong email or password" });
  res.json(token(u));
});

const PATTERNS = ["Perfect Man", "Late Guest", "Ghost Shadow", "Left Over Eater"];
const PD = ["FVG", "IFVG", "OB", "Breaker", "Mitigation Block", "Rejection Block", "Propulsion Block", "Liquidity", "Premium / Discount", "Old High / Low", "Other"];
const COLS = "trade_date,direction,outcome,entry_price,exit_price,sl_price,tp_price,r_multiple,entry_time,close_time,duration_min,emotion,notes,sl_points,tp_points,planned_rr,mfe,mae,session,risk_pct,followed_plan,mistake,rating,screenshot,trade_type,confluences,entry_pattern,ny_gap_time,retracement,sl_pd_array,ath,inside_bar,inside_bar_tf,inside_bar_bias,invalidation,invalidation_types,reversal_time,reversal_gap_min,liq_point";

// R multiple, duration and reversal gap are calculated here so they are always consistent
function calc(t) {
  const num = (v) => (v === "" || v == null ? null : +v);
  const entry = +t.entry_price, exit = +t.exit_price, sl = num(t.sl_price);
  const move = t.direction === "BUY" ? exit - entry : entry - exit;
  const risk = sl != null ? Math.abs(entry - sl) : 0;
  const mins = (a, b) => Math.round((new Date(a) - new Date(b)) / 60000);
  const slp = sl != null ? +Math.abs(entry - sl).toFixed(2) : null;
  const tpp = num(t.tp_price) != null ? +Math.abs(+t.tp_price - entry).toFixed(2) : null;
  const isSL = t.outcome === "SL", ib = t.inside_bar ? 1 : 0, inv = t.invalidation ? 1 : 0, ret = isSL && t.retracement ? 1 : 0;
  const row = {
    trade_date: String(t.entry_time).slice(0, 10), direction: t.direction, outcome: t.outcome, entry_price: entry, exit_price: exit, sl_price: sl, tp_price: num(t.tp_price),
    r_multiple: risk ? +(move / risk).toFixed(2) : null, entry_time: t.entry_time, close_time: t.close_time, duration_min: Math.max(0, mins(t.close_time, t.entry_time)),
    emotion: t.emotion || "", notes: t.notes || "", sl_points: slp, tp_points: tpp, planned_rr: slp && tpp ? +(tpp / slp).toFixed(2) : null, mfe: num(t.mfe), mae: num(t.mae),
    session: t.session || "", risk_pct: num(t.risk_pct), followed_plan: t.followed_plan || "", mistake: t.mistake || "", rating: num(t.rating), screenshot: t.screenshot || "",
    trade_type: t.trade_type === "backtest" ? "backtest" : "forward", confluences: JSON.stringify(cleanConf(t.confluences)),
    entry_pattern: PATTERNS.includes(t.entry_pattern) ? t.entry_pattern : "", ny_gap_time: /^\d{2}:\d{2}$/.test(t.ny_gap_time || "") ? t.ny_gap_time : "",
    retracement: ret, sl_pd_array: ret && PD.includes(t.sl_pd_array) ? t.sl_pd_array : "", ath: t.ath ? 1 : 0,
    inside_bar: ib, inside_bar_tf: ib && ["1D", "1H", "15min"].includes(t.inside_bar_tf) ? t.inside_bar_tf : "", inside_bar_bias: ib && ["Yes", "No"].includes(t.inside_bar_bias) ? t.inside_bar_bias : "",
    invalidation: inv, invalidation_types: JSON.stringify(inv && Array.isArray(t.invalidation_types) ? ["I.SMT", "SMT"].filter((x) => t.invalidation_types.includes(x)) : []),
    reversal_time: t.reversal_time || "", reversal_gap_min: t.reversal_time ? mins(t.entry_time, t.reversal_time) : null, liq_point: String(t.liq_point || "").trim().slice(0, 120),
  };
  return COLS.split(",").map((c) => row[c] ?? null);
}
const valid = (t) => ["BUY", "SELL"].includes(t.direction) && ["TP", "SL", "BE"].includes(t.outcome) && t.entry_price !== "" && t.exit_price !== "" && t.entry_time && t.close_time && new Date(t.close_time) >= new Date(t.entry_time);

app.get("/api/trades", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM trades WHERE user_id=? ORDER BY entry_time DESC", args: [req.uid] });
  res.json(r.rows.map((t) => ({ ...t, confluences: parseJson(t.confluences), invalidation_types: parseArr(t.invalidation_types) })));
});
app.post("/api/trades", auth, async (req, res) => {
  if (!valid(req.body)) return res.status(400).json({ error: "Check direction, outcome, prices and times (close must be after entry)" });
  await db.execute({ sql: `INSERT INTO trades (user_id,${COLS}) VALUES (?,${COLS.split(",").map(() => "?")})`, args: [req.uid, ...calc(req.body)] });
  res.json({ ok: true });
});
app.put("/api/trades/:id", auth, async (req, res) => {
  if (!valid(req.body)) return res.status(400).json({ error: "Check direction, outcome, prices and times" });
  await db.execute({ sql: `UPDATE trades SET ${COLS.split(",").map((c) => c + "=?")} WHERE id=? AND user_id=?`, args: [...calc(req.body), req.params.id, req.uid] });
  res.json({ ok: true });
});
app.delete("/api/trades/:id", auth, async (req, res) => {
  await db.execute({ sql: "DELETE FROM trades WHERE id=? AND user_id=?", args: [req.params.id, req.uid] });
  res.json({ ok: true });
});
// ---------- Entry confluences ----------
// Each trade stores the confluences ticked on every timeframe BEFORE entering.
const CONF = {
  "1D": ["SCB", "PDH/PDL taken"],
  "1H": ["SCB", "I.SMT", "E.SMT"],
  "15min": ["SCB", "I.SMT", "E.SMT"],
  "5min": ["SCB", "I.SMT", "E.SMT", "SMT", "IFVG"],
  "1min": ["I.SMT", "SMT", "MSS", "IFVG"],
};
// Keeps only known timeframes / confluences, so bad data never gets saved
const cleanConf = (raw) => {
  const out = {};
  for (const [tf, list] of Object.entries(CONF)) {
    const got = raw && Array.isArray(raw[tf]) ? raw[tf] : [];
    const keep = list.filter((c) => got.includes(c));
    if (keep.length) out[tf] = keep;
  }
  return out;
};
const parseArr = (v) => { try { const a = JSON.parse(v || "[]"); return Array.isArray(a) ? a : []; } catch { return []; } };
const parseJson = (v) => { try { return JSON.parse(v || "{}"); } catch { return {}; } };

// ---------- Gym tracker ----------
// Habits only store the schedule. Streaks, completion rates and badges are calculated in the app from these saved records.
const SCHEDS = ["daily", "weekdays", "weekly_count", "custom_week", "interval"];
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
const clampInt = (v, lo, hi, d) => { const n = parseInt(v, 10); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
const addDays = (s, n) => new Date(Date.parse(s) + n * 864e5).toISOString().slice(0, 10);
const HCOLS = "name,kind,unit,sched_type,sched,start_date,end_date,skips_per_month";

function cleanHabit(b) {
  const name = String(b.name || "").trim().slice(0, 60);
  if (!name) return { error: "Give the habit a name" };
  if (!isDate(b.start_date)) return { error: "Pick a valid start date" };
  const end = b.end_date ? b.end_date : null;
  if (end && (!isDate(end) || end < b.start_date)) return { error: "End date must be on or after the start date" };
  const type = SCHEDS.includes(b.sched_type) ? b.sched_type : "daily", s = b.sched || {};
  const days = [...new Set((Array.isArray(s.days) ? s.days : []).map(Number).filter((d) => Number.isInteger(d) && d >= 0 && d <= 6))].sort();
  let sched = {};
  if (type === "weekdays") { if (!days.length) return { error: "Pick at least one weekday" }; sched = { days }; }
  else if (type === "weekly_count") sched = { target: clampInt(s.target, 1, 7, 3) };
  else if (type === "custom_week") { if (!days.length) return { error: "Pick at least one weekday" }; sched = { days, target: clampInt(s.target, 1, days.length, days.length) }; }
  else if (type === "interval") sched = { every: clampInt(s.every, 2, 365, 7), anchor: isDate(s.anchor) ? s.anchor : b.start_date };
  const kind = b.kind === "value" ? "value" : "check";
  return { row: [name, kind, kind === "value" ? String(b.unit || "").trim().slice(0, 12) : "", type, JSON.stringify(sched), b.start_date, end, 0] };
}
const habitOut = (h) => ({ ...h, sched: parseJson(h.sched) });
const nextPos = async (uid) => (await db.execute({ sql: "SELECT COALESCE(MAX(position),0)+1 AS p FROM habits WHERE user_id=?", args: [uid] })).rows[0].p;
const HINS = `INSERT INTO habits (user_id,${HCOLS},position) VALUES (?,${HCOLS.split(",").map(() => "?")},?)`;

app.get("/api/habits", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM habits WHERE user_id=? ORDER BY position,id", args: [req.uid] });
  res.json(r.rows.map(habitOut));
});
app.post("/api/habits", auth, async (req, res) => {
  const c = cleanHabit(req.body);
  if (c.error) return res.status(400).json({ error: c.error });
  await db.execute({ sql: HINS, args: [req.uid, ...c.row, await nextPos(req.uid)] });
  res.json({ ok: true });
});
app.post("/api/habits/bulk", auth, async (req, res) => {
  const list = (Array.isArray(req.body.habits) ? req.body.habits : []).slice(0, 20), cleaned = list.map(cleanHabit);
  const bad = cleaned.find((c) => c.error);
  if (!list.length || bad) return res.status(400).json({ error: bad ? bad.error : "Nothing to add" });
  const p = await nextPos(req.uid);
  await db.batch(cleaned.map((c, i) => ({ sql: HINS, args: [req.uid, ...c.row, p + i] })));
  res.json({ ok: true, added: cleaned.length });
});
app.put("/api/habits/:id", auth, async (req, res) => {
  const c = cleanHabit(req.body);
  if (c.error) return res.status(400).json({ error: c.error });
  await db.execute({ sql: `UPDATE habits SET ${HCOLS.split(",").map((x) => x + "=?")} WHERE id=? AND user_id=?`, args: [...c.row, req.params.id, req.uid] });
  res.json({ ok: true });
});
app.delete("/api/habits/:id", auth, async (req, res) => {
  await db.batch([
    { sql: "DELETE FROM habit_checkins WHERE habit_id=? AND user_id=?", args: [req.params.id, req.uid] },
    { sql: "DELETE FROM habits WHERE id=? AND user_id=?", args: [req.params.id, req.uid] },
  ]);
  res.json({ ok: true });
});

app.get("/api/checkins", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT habit_id,check_date,status,value FROM habit_checkins WHERE user_id=?", args: [req.uid] });
  res.json(r.rows);
});
// status "done" ticks the day, an empty status clears it (there is no skip: not ticked = missed)
app.put("/api/checkins", auth, async (req, res) => {
  const { habit_id, date, status, value } = req.body;
  if (!isDate(date)) return res.status(400).json({ error: "Invalid date" });
  const slToday = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Colombo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); // a day unlocks at 00:00 Sri Lanka time
  if (date > slToday) return res.status(400).json({ error: "This day unlocks at 00:00 Sri Lanka time" });
  const h = await db.execute({ sql: "SELECT id,sched_type,sched,start_date,end_date FROM habits WHERE id=? AND user_id=?", args: [habit_id, req.uid] });
  if (!h.rows.length) return res.status(404).json({ error: "Habit not found" });
  // Repeat-interval habits (weight, waist...): a new entry unlocks only N days after the previous entry
  const hb = h.rows[0];
  if (status === "done" && hb.sched_type === "interval") {
    const sc = parseJson(hb.sched), every = Math.max(1, +sc.every || 7), anchor = sc.anchor && sc.anchor > hb.start_date ? sc.anchor : hb.start_date;
    const ex = (await db.execute({ sql: "SELECT check_date FROM habit_checkins WHERE habit_id=? AND user_id=? AND status='done'", args: [habit_id, req.uid] })).rows.map((r) => r.check_date).sort();
    if (hb.end_date && date > hb.end_date) return res.status(400).json({ error: "This habit has ended" });
    if (!ex.includes(date)) {
      const prev = ex.filter((x) => x < date).pop(), next = ex.find((x) => x > date), unlock = prev ? addDays(prev, every) : anchor;
      if (date < unlock) return res.status(400).json({ error: `Locked. This unlocks on ${unlock}` });
      if (next && addDays(date, every) > next) return res.status(400).json({ error: `Too close to your next entry on ${next}` });
    }
  }
  if (!status) await db.execute({ sql: "DELETE FROM habit_checkins WHERE habit_id=? AND check_date=? AND user_id=?", args: [habit_id, date, req.uid] });
  else if (status === "done") {
    const v = value === "" || value == null || !Number.isFinite(+value) ? null : +value;
    await db.execute({
      sql: `INSERT INTO habit_checkins (user_id,habit_id,check_date,status,value) VALUES (?,?,?,?,?)
            ON CONFLICT(habit_id,check_date) DO UPDATE SET status=excluded.status,value=excluded.value`,
      args: [req.uid, habit_id, date, status, v],
    });
  } else return res.status(400).json({ error: "Invalid status" });
  res.json({ ok: true });
});

app.get("/", (_, res) => res.send("NAS100 journal API running"));
app.listen(process.env.PORT || 3000, () => console.log("API up"));