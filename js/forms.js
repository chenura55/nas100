/* ---------- premarket popup ---------- */
function pbody() {
  const P = S.pm, items = S.routine, done = P.done, mg = P.manage, d = items.filter((i) => done.has(i.id)).length, sc = items.length ? (d / items.length) * 100 : 0, keep = $("#na")?.value || "";
  $("#pmg").textContent = mg ? "Done" : "Edit routine";
  const row = (i) => {
    if (!mg) return `<label class="chk ${done.has(i.id) ? "done" : ""}"><input type="checkbox" data-c="${i.id}" ${done.has(i.id) ? "checked" : ""}><span>${esc(i.title)}</span></label>`;
    const left = P.edit === i.id ? `<input class="re" id="re" value="${esc(i.title)}" maxlength="120">` : `<span>${esc(i.title)}</span>`;
    const ed = P.edit === i.id ? `<button type="button" class="x ok" data-rs="${i.id}">✓</button>` : `<button type="button" class="x" data-rn="${i.id}">✎</button>`;
    const rm = P.rm === i.id ? `<button type="button" class="x dng" data-rm="${i.id}">Remove?</button>` : `<button type="button" class="x" data-rm="${i.id}">✕</button>`;
    return `<div class="chk" style="cursor:default">${left}<button type="button" class="x" data-up="${i.id}">▲</button><button type="button" class="x" data-dn="${i.id}">▼</button>${ed}${rm}</div>`;
  };
  $("#pb").innerHTML = `<div class="score"><b class="${scCls(sc)}">${sc.toFixed(0)}%</b><div class="lbl">${d} of ${items.length} activities done</div></div>
  ${items.length ? items.map(row).join("") : `<div class="lbl">No activities yet. Add your own below, or tap a suggestion:</div><div class="chips">${SUGGEST.map((x) => `<button type="button" class="pill" data-sg="${esc(x)}">+ ${esc(x)}</button>`).join("")}</div>`}
  <div class="add-row"><input id="na" placeholder="Add activity, e.g. Mark key levels" maxlength="120" value="${esc(keep)}"><button type="button" class="btn g" id="aa">Add</button></div>
  <div class="lbl">Activities you add are saved in your routine template and show up every day.</div>`;
  const err = (e) => ($("#pe").textContent = e.message);
  document.querySelectorAll("[data-c]").forEach((c) => (c.onchange = () => { const id = +c.dataset.c; c.checked ? done.add(id) : done.delete(id); pbody(); }));
  const mv = async (id, dir) => {
    const i = S.routine.findIndex((x) => x.id == id), j = i + dir; if (j < 0 || j >= S.routine.length) return;
    [S.routine[i], S.routine[j]] = [S.routine[j], S.routine[i]]; pbody();
    try { await api("/api/routine/reorder", "POST", { ids: S.routine.map((x) => x.id) }); } catch (e) { err(e); }
  };
  document.querySelectorAll("[data-up]").forEach((b) => (b.onclick = () => mv(b.dataset.up, -1)));
  document.querySelectorAll("[data-dn]").forEach((b) => (b.onclick = () => mv(b.dataset.dn, 1)));
  const saveRename = async (id) => {
    const t = $("#re").value.trim(), it = S.routine.find((x) => x.id == id); if (!t) return;
    try { await api("/api/routine/" + id, "PUT", { title: t }); it.title = t.slice(0, 120); P.edit = null; pbody(); } catch (e) { err(e); }
  };
  document.querySelectorAll("[data-rn]").forEach((b) => (b.onclick = () => { P.edit = +b.dataset.rn; P.rm = null; pbody(); $("#re").focus(); }));
  document.querySelectorAll("[data-rs]").forEach((b) => (b.onclick = () => saveRename(b.dataset.rs)));
  if ($("#re")) $("#re").onkeydown = (e) => { if (e.key === "Enter") saveRename(P.edit); if (e.key === "Escape") { P.edit = null; pbody(); } };
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = async () => {
    const id = +b.dataset.rm;
    if (P.rm !== id) { P.rm = id; pbody(); setTimeout(() => { if (P.rm === id && $("#pb")) { P.rm = null; pbody(); } }, 3000); return; }
    try { await api("/api/routine/" + id, "DELETE"); S.routine = S.routine.filter((i) => i.id !== id); done.delete(id); P.rm = null; pbody(); } catch (e) { err(e); }
  }));
  const add = async (title) => {
    const t = (title || $("#na").value).trim(); if (!t) return;
    try { S.routine.push(await api("/api/routine", "POST", { title: t })); if (!title) $("#na").value = ""; $("#pe").textContent = ""; pbody(); if (!title) $("#na").focus(); } catch (e) { err(e); }
  };
  document.querySelectorAll("[data-sg]").forEach((b) => (b.onclick = () => add(b.dataset.sg)));
  $("#aa").onclick = () => add(); $("#na").onkeydown = (e) => { if (e.key === "Enter") { e.preventDefault(); add(); } };
}

// The date is set automatically to today. Only the Edit button in History opens an older day.
async function openPerf(date = today()) {
  if (!window.Swal) return noSwal();
  const l = S.logs.find((x) => x.log_date === date);
  S.pm = { date, manage: false, edit: null, rm: null, done: new Set(l ? l.items.filter((i) => i.done).map((i) => i.id) : []) };
  const res = await Swal.fire({
    ...pop("nl-form"), title: "Premarket performance", confirmButtonText: "Save performance",
    html: `<div class="ph" style="align-items:center"><div id="pdl" style="font-size:14px"></div><button type="button" class="pill sm" id="pmg">Edit routine</button></div><div id="pb"></div>
      <div class="f" style="margin-top:14px"><div class="full"><label>Notes (optional)</label><textarea id="pn" rows="2" placeholder="Bias for today, key levels, how you feel…"></textarea></div></div><div class="err" id="pe"></div>`,
    didOpen: () => {
      $("#pdl").innerHTML = `${nice(date)} ${date === today() ? `<span class="tag" style="color:var(--lime)">Today</span>` : `<span class="tag">Editing past day</span>`}`;
      $("#pn").value = l?.notes || "";
      $("#pmg").onclick = () => { S.pm.manage = !S.pm.manage; S.pm.edit = S.pm.rm = null; pbody(); };
      pbody();
    },
    preConfirm: async () => {
      try { await api("/api/routine/logs", "POST", { log_date: S.pm.date, done_ids: [...S.pm.done], notes: $("#pn").value }); S.logs = await api("/api/routine/logs"); return true; }
      catch (e) { Swal.showValidationMessage(e.message); return false; }
    },
  });
  if (res.isConfirmed) { render(); toast("Performance saved"); } else render();
}

/* ---------- entry confluences ---------- */
// filter key = "timeframe|confluence". "15min|*" means: any confluence ticked on 15min
const cfHas = (r, k) => { const i = k.indexOf("|"), tf = k.slice(0, i), c = k.slice(i + 1), a = r.data?.[tf] || []; return c === "*" ? a.length > 0 : a.includes(c); };
function cfFiltered() {
  const { mode, sel, from, to } = S.cf, keys = [...sel];
  return S.cfs.filter((r) => (!from || r.log_date >= from) && (!to || r.log_date <= to) && (!keys.length || (mode === "all" ? keys.every((k) => cfHas(r, k)) : keys.some((k) => cfHas(r, k)))));
}

function confView() {
  const L = cfFiltered(), keys = [...S.cf.sel], td = S.cfs.filter((r) => r.log_date === today()).length;
  const byDay = {}; S.trades.forEach((t) => (byDay[t.trade_date] = byDay[t.trade_date] || []).push(t));
  const pts = (k) => (byDay[k] ? byDay[k].reduce((a, t) => a + t.points, 0) : null);
  const tr = [...new Set(L.map((r) => r.log_date))].flatMap((d) => byDay[d] || []), tp = tr.reduce((a, t) => a + t.points, 0), win = tr.length ? (tr.filter((t) => t.points > 0).length / tr.length) * 100 : null;
  const kp = (a, b, c, col) => `<div class="card kpi" style="--a:${col}"><div class="lbl">${a}</div><div class="big">${b}</div><div class="lbl">${c}</div></div>`;
  const on = (k) => (S.cf.sel.has(k) ? "on" : "");
  const frows = TFS.map((tf) => `<div class="cfr"><button class="cc tfa sm ${on(tf + "|*")}" data-fk="${tf}|*" title="Any confluence on ${tf}">${tf}</button>${CONF[tf].map((c) => `<button class="cc sm ${on(tf + "|" + c)}" data-fk="${tf}|${esc(c)}">${esc(c)}</button>`).join("")}</div>`).join("");
  const freq = TFS.map((tf) => `<div class="card"><div class="ct">${tf} · how often</div>${CONF[tf].map((c) => { const n = L.filter((r) => (r.data?.[tf] || []).includes(c)).length, p = L.length ? (n / L.length) * 100 : 0; return `<div class="rate"><span>${esc(c)}</span><div class="bar"><span style="width:${p}%;background:var(--p2)"></span></div><b style="min-width:64px;text-align:right">${n} · ${p.toFixed(0)}%</b></div>`; }).join("")}</div>`).join("");
  const rows = L.map((r) => {
    const p = pts(r.log_date);
    const tags = TFS.filter((tf) => (r.data?.[tf] || []).length).map((tf) => `<span class="tag"><b>${tf}</b>${r.data[tf].map(esc).join(" · ")}</span>`).join("");
    return `<div class="hist"><b style="min-width:92px">${r.log_date}</b><span class="lbl" style="flex:1">${nice(r.log_date).split(",")[0]} · ${p != null ? `<span class="${cls(p)}">${sign(p)} pts that day</span>` : "no trades"}</span>
      <span><button class="x" data-ce="${r.id}">Edit</button><button class="x" data-cd="${r.id}">Delete</button></span><div class="tfl">${tags}</div>${r.notes ? `<div class="hnote">${esc(r.notes)}</div>` : ""}</div>`;
  }).join("");
  const f = S.cf;
  const activeChips = keys.length ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:8px 0 0">${keys.map((k) => { const [tf, c] = k.split("|"); return `<span class="tag" style="background:var(--p);color:#fff">${esc(c === "*" ? tf + " (any)" : tf + " · " + c)} <button class="x" data-fk="${esc(k)}" style="color:#fff;padding:0 2px;margin-left:4px">×</button></span>`; }).join("")}</div>` : "";
  return `<div class="ph"><div><h1>Entry <span>confluence</span></h1><p class="sub">${nice(today())}</p></div><button class="btn p" id="nc">+ New entry</button></div>
  <div class="kpis">${kp("Entries logged", S.cfs.length, "all time", "var(--p2)")}${kp("Today", td, td === 1 ? "entry" : "entries", "var(--lime)")}${kp("Matching filter", L.length, `of ${S.cfs.length}`, "var(--blue)")}
    ${kp("Points on those days", `<span class="${cls(tp)}">${tr.length ? sign(tp) : "-"}</span>`, `${tr.length} trade${tr.length === 1 ? "" : "s"}`, "var(--lime)")}
    <div class="kpi wide card" style="--a:var(--blue)"><div class="lbl">Win rate on those days</div><div class="big">${win != null ? win.toFixed(0) + "%" : "-"}</div><div class="lbl">all trades that day</div></div></div>
  <div class="card" style="margin-bottom:16px">
    <div class="ph" style="align-items:center;flex-wrap:wrap;gap:10px">
      <div class="ct" style="margin:0">Filter by confluence</div>
      <div class="seg m"><button type="button" class="${f.mode === "all" ? "on" : ""}" data-fm="all">Match all</button><button type="button" class="${f.mode === "any" ? "on" : ""}" data-fm="any">Match any</button></div>
      <button class="btn pdf" id="cpdf" style="margin-left:auto"><svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg> Export PDF</button>
    </div>
    <p class="cc-hint">Tap chips to filter. <b>Match all</b> = every selected confluence must be present. <b>Match any</b> = at least one. Tap a timeframe label (e.g. 15min) to match any confluence on that TF.</p>
    <div style="display:flex;flex-direction:column;gap:6px">${frows}</div>
    ${activeChips}
    <div class="filters" style="margin:12px 0 0"><span class="lbl">Date</span><input id="cff" type="date" value="${f.from}"><input id="cft" type="date" value="${f.to}"><button class="pill sm" id="ccl">Clear filters</button></div>
  </div>
  <div class="bkg" style="margin:0 0 16px">${freq}</div>
  <div class="card"><div class="ct">History${keys.length || f.from || f.to ? ` · ${L.length} match${L.length === 1 ? "" : "es"}` : ""}</div>${rows || `<div class="empty">${S.cfs.length ? "No entries match this filter." : "No confluences logged yet. Tap “New entry” to start."}</div>`}</div>`;
}

function cbody() {
  const M = S.cfm;
  const total = TFS.reduce((a, tf) => a + M.data[tf].size, 0);
  $("#cb").innerHTML = `<p class="cc-hint" style="margin-bottom:10px">Open a timeframe and tap the confluences you had <b>before entry</b>. ${total ? `<b style="color:var(--p2)">${total} selected</b>` : "None selected yet."}</p>
  <div class="cf-wrap">${TFS.map((tf) => { const n = M.data[tf].size, open = M.open === tf;
    return `<div class="cf-tf"><button type="button" class="tfh ${open ? "open" : ""}" data-ot="${tf}"><b>${tf}</b>${n ? `<span class="n">${n} ticked</span>` : `<span class="lbl">tap to expand</span>`}<span class="lbl">${open ? "▲" : "▼"}</span></button>${open ? `<div class="cchips">${CONF[tf].map((c) => `<button type="button" class="cc ${M.data[tf].has(c) ? "on" : ""}" data-cc="${tf}|${esc(c)}">${esc(c)}</button>`).join("")}</div>` : ""}</div>`; }).join("")}</div>`;
  document.querySelectorAll("[data-ot]").forEach((b) => (b.onclick = () => { M.open = M.open === b.dataset.ot ? null : b.dataset.ot; cbody(); }));
  document.querySelectorAll("[data-cc]").forEach((b) => (b.onclick = () => { const i = b.dataset.cc.indexOf("|"), tf = b.dataset.cc.slice(0, i), c = b.dataset.cc.slice(i + 1), set = M.data[tf]; set.has(c) ? set.delete(c) : set.add(c); cbody(); }));
}

// Date is set to today automatically (you can still change it). Pick a timeframe, tick what you had before entry, save.
async function openConf(rec) {
  if (!window.Swal) return noSwal();
  S.cfm = { id: rec?.id || null, open: rec ? TFS.find((tf) => (rec.data?.[tf] || []).length) || "1D" : "1D", data: Object.fromEntries(TFS.map((tf) => [tf, new Set(rec?.data?.[tf] || [])])) };
  const res = await Swal.fire({
    ...pop("nl-form"), title: rec ? "Edit confluences" : "Entry confluences", confirmButtonText: "Save entry",
    html: `<div class="f"><div class="full"><label>Date</label><input id="cdt" type="date"></div></div>
      <div class="lbl" style="margin:14px 0 8px">Tap a timeframe, then tick the confluences you had before entry.</div><div id="cb"></div>
      <div class="f" style="margin-top:6px"><div class="full"><label>Notes (optional)</label><textarea id="cn" rows="2" placeholder="Anything about this setup…"></textarea></div></div><div class="err" id="ce"></div>`,
    didOpen: () => { $("#cdt").value = rec?.log_date || today(); $("#cn").value = rec?.notes || ""; cbody(); },
    preConfirm: async () => {
      const data = Object.fromEntries(TFS.map((tf) => [tf, [...S.cfm.data[tf]]]));
      try { await api("/api/confluence" + (S.cfm.id ? "/" + S.cfm.id : ""), S.cfm.id ? "PUT" : "POST", { log_date: $("#cdt").value, data, notes: $("#cn").value }); S.cfs = await api("/api/confluence"); return true; }
      catch (e) { Swal.showValidationMessage(e.message); return false; }
    },
  });
  if (res.isConfirmed) { render(); toast(rec ? "Entry updated" : "Entry saved"); }
}

/* ---------- trade popup ---------- */
function formHtml() {
  return `<div class="f">
  <div><label>Side</label><div class="seg" id="sd"><button type="button" data-v="BUY">Buy</button><button type="button" data-v="SELL">Sell</button></div></div>
  <div><label>Result</label><div class="seg" id="oc"><button type="button" data-v="TP">TP</button><button type="button" data-v="SL">SL</button><button type="button" data-v="BE">BE</button></div></div>
  <div><label>Entry price</label><input id="ep" type="number" step="0.01" inputmode="decimal"></div><div><label>Exit price</label><input id="xp" type="number" step="0.01" inputmode="decimal"></div>
  <div><label>Stop loss (SL) price</label><input id="sp" type="number" step="0.01" inputmode="decimal"></div><div><label>Take profit (TP) price</label><input id="tp" type="number" step="0.01" inputmode="decimal"></div>
  <div><label>Entry time</label><input id="et" type="datetime-local"></div><div><label>Close time</label><input id="ct" type="datetime-local"></div>
  <div><label>Lots</label><input id="lt" type="number" step="0.01" inputmode="decimal"></div><div><label>Profit / loss ($)</label><input id="pl" type="number" step="0.01" inputmode="decimal"></div>
  <div><label>Setup</label><input id="su" placeholder="e.g. Breakout, FVG, NY open"></div>
  <div><label>Emotion</label><select id="em"><option value="">-</option><option>Calm</option><option>Confident</option><option>Fearful</option><option>Greedy</option><option>Revenge</option><option>FOMO</option></select></div>
  <div><label>Timeframe</label><select id="tf"><option value="">-</option><option>1m</option><option>3m</option><option>5m</option><option>15m</option><option>1h</option><option>4h</option></select></div>
  <div><label>NY phase</label><select id="se"><option value="">-</option><option>NY Manipulation</option><option>NY Reversal</option><option>NY Continuation</option></select></div>
  <div><label>Max move in favour (MFE, pts)</label><input id="mf" type="number" step="0.01" inputmode="decimal" placeholder="Best price reached after entry"></div><div><label>Max move against (MAE, pts)</label><input id="ma" type="number" step="0.01" inputmode="decimal" placeholder="Worst drawdown after entry"></div>
  <div><label>Risk % of account</label><input id="rk" type="number" step="0.01" inputmode="decimal"></div><div><label>Fees / commission ($)</label><input id="fe" type="number" step="0.01" inputmode="decimal"></div>
  <div><label>Followed my plan?</label><select id="fp"><option value="">-</option><option>Yes</option><option>No</option></select></div>
  <div><label>Mistake</label><select id="mi"><option value="">None</option><option>Early entry</option><option>Late entry</option><option>Moved SL</option><option>Cut winner early</option><option>Over-risked</option><option>Overtrading</option><option>No setup</option><option>Revenge trade</option></select></div>
  <div><label>Execution rating</label><select id="rt"><option value="">-</option><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></div><div><label>Screenshot link</label><input id="sc" placeholder="TradingView / image URL"></div>
  <div class="full"><label>Notes</label><textarea id="nt" rows="3" placeholder="Why did you take it? What would you change?"></textarea></div>
  <div class="full live" id="lv"></div></div>`;
}

async function openForm(t) {
  if (!window.Swal) return noSwal();
  S.editing = t?.id || null;
  const v = { d: t?.direction || "BUY", o: t?.outcome || "TP" };
  const res = await Swal.fire({
    ...pop("nl-form"), title: t ? "Edit trade" : "New trade", html: formHtml(), confirmButtonText: "Save trade",
    didOpen: () => {
      const set = (id, val) => ($("#" + id).value = val ?? "");
      set("ep", t?.entry_price); set("xp", t?.exit_price); set("sp", t?.sl_price); set("tp", t?.tp_price); set("et", t?.entry_time); set("ct", t?.close_time);
      set("lt", t?.lots); set("tf", t?.timeframe); set("se", t?.session); set("mf", t?.mfe); set("ma", t?.mae); set("rk", t?.risk_pct); set("fe", t?.fees); set("fp", t?.followed_plan); set("mi", t?.mistake); set("rt", t?.rating); set("sc", t?.screenshot); set("pl", t?.pnl); set("su", t?.setup); set("em", t?.emotion); set("nt", t?.notes);
      const live = () => {
        const e = +$("#ep").value, x = +$("#xp").value, s = $("#sp").value, p = (v.d === "BUY" ? x - e : e - x), m = (new Date($("#ct").value) - new Date($("#et").value)) / 60000;
        const ok = $("#ep").value && $("#xp").value, sl = +s, tpv = $("#tp").value, slp = s ? Math.abs(e - sl) : null, tpp = tpv ? Math.abs(+tpv - e) : null;
        $("#lv").innerHTML = `<div><div class="lbl">Points</div><b class="${cls(p)}">${ok ? sign(p) : "-"}</b></div><div><div class="lbl">Entry → SL</div><b>${slp != null ? slp.toFixed(1) + " pts" : "-"}</b></div><div><div class="lbl">Entry → TP</div><b>${tpp != null ? tpp.toFixed(1) + " pts" : "-"}</b></div><div><div class="lbl">Planned RR</div><b>${slp && tpp ? "1:" + (tpp / slp).toFixed(2) : "-"}</b></div><div><div class="lbl">R result</div><b>${ok && s && slp ? sign(p / slp) + "R" : "-"}</b></div><div><div class="lbl">Duration</div><b>${m >= 0 ? dur(Math.round(m)) : "-"}</b></div>`;
      };
      const seg = (id, key) => { const el = $("#" + id), paint = () => el.querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === v[key])); el.querySelectorAll("button").forEach((b) => (b.onclick = () => { v[key] = b.dataset.v; paint(); live(); })); paint(); };
      seg("sd", "d"); seg("oc", "o"); ["ep", "xp", "sp", "tp", "et", "ct"].forEach((i) => ($("#" + i).oninput = live)); live();
    },
    preConfirm: async () => {
      const g = (id) => $("#" + id).value;
      const body = { direction: v.d, outcome: v.o, entry_price: g("ep"), exit_price: g("xp"), sl_price: g("sp"), tp_price: g("tp"), entry_time: g("et"), close_time: g("ct"), lots: g("lt"), timeframe: g("tf"), session: g("se"), mfe: g("mf"), mae: g("ma"), risk_pct: g("rk"), fees: g("fe"), followed_plan: g("fp"), mistake: g("mi"), rating: g("rt"), screenshot: g("sc"), pnl: g("pl"), setup: g("su"), emotion: g("em"), notes: g("nt") };
      try { await api("/api/trades" + (S.editing ? "/" + S.editing : ""), S.editing ? "PUT" : "POST", body); return true; }
      catch (e) { Swal.showValidationMessage(e.message); return false; }
    },
  });
  if (res.isConfirmed) { await load(); toast(S.editing ? "Trade updated" : "Trade saved"); }
}

