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

// Points, R multiple and duration are calculated here so they are always consistent
function calc(t) {
  const entry = +t.entry_price, exit = +t.exit_price, sl = t.sl_price === "" || t.sl_price == null ? null : +t.sl_price;
  const points = +((t.direction === "BUY" ? exit - entry : entry - exit).toFixed(2));
  const risk = sl != null ? Math.abs(entry - sl) : 0;
  const duration = Math.max(0, Math.round((new Date(t.close_time) - new Date(t.entry_time)) / 60000));
  const num = (v) => (v === "" || v == null ? null : +v);
  return [
    String(t.entry_time).slice(0, 10), t.direction, t.outcome, entry, exit, sl, num(t.tp_price),
    points, risk ? +(points / risk).toFixed(2) : null, num(t.lots), num(t.pnl),
    t.entry_time, t.close_time, duration, t.setup || "", t.emotion || "", t.notes || "",
  ];
}
const COLS = "trade_date,direction,outcome,entry_price,exit_price,sl_price,tp_price,points,r_multiple,lots,pnl,entry_time,close_time,duration_min,setup,emotion,notes";
const valid = (t) => ["BUY", "SELL"].includes(t.direction) && ["TP", "SL", "BE"].includes(t.outcome) && t.entry_price !== "" && t.exit_price !== "" && t.entry_time && t.close_time && new Date(t.close_time) >= new Date(t.entry_time);

app.get("/api/trades", auth, async (req, res) => {
  const r = await db.execute({ sql: "SELECT * FROM trades WHERE user_id=? ORDER BY entry_time DESC", args: [req.uid] });
  res.json(r.rows);
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
app.get("/", (_, res) => res.send("NAS100 journal API running"));
app.listen(process.env.PORT || 3000, () => console.log("API up"));
