/* ---------- views ---------- */
function dash() {
  const L = rangeTrades(), st = stats(L), tot = st.n || 1;
  const td = S.trades.filter((t) => t.trade_date === today()), tp = td.reduce((a, t) => a + t.points, 0);
  const hr = new Date().getHours(), greet = hr < 12 ? "Good morning" : hr < 18 ? "Good afternoon" : "Good evening";
  const pm = S.logs.find((l) => l.log_date === today()), sk = streaks(), nm = esc(S.user?.name || "trader");
  const rng = [["all", "All"], ["90", "90D"], ["30", "30D"], ["7", "7D"]].map(([k, l]) => `<button class="${S.range === k ? "on" : ""}" data-rg="${k}">${l}</button>`).join("");
  const wins = L.filter((t) => t.points > 0).length, loss = L.filter((t) => t.points < 0).length;
  const recent = S.trades.slice(0, 5).map((t) => `<div class="rt"><span class="tag ${t.direction}">${t.direction}</span><div class="m"><b>${t.entry_price} → ${t.exit_price}</b><small>${t.trade_date} · ${dur(t.duration_min)}${t.setup ? " · " + esc(t.setup) : ""}</small></div><span class="tag ${t.outcome}">${t.outcome}</span><b class="${cls(t.points)}" style="min-width:64px;text-align:right">${sign(t.points)}</b></div>`).join("");
  const kv = (a, b) => `<div><span>${a}</span><b>${b}</b></div>`;
  return `${exportBar("dx", S.f.from, S.f.to)}
  <div class="dash">
    <div class="card hero"><div class="ph" style="align-items:center"><div><div class="lbl">${greet}</div><h1>${nm}</h1></div><div class="rng">${rng}</div></div>
      <div class="hero-main"><div><div class="lbl">Total points</div><div class="huge ${st.total > 0 ? "up" : st.total < 0 ? "dn" : ""}">${sign(st.total)}</div>
        <div class="hchips"><span class="chip">${st.n} trades</span><span class="chip">Today <b class="${cls(tp)}">${sign(tp)}</b></span><span class="chip">${st.win.toFixed(0)}% win</span></div></div>
        <div class="spark">${curve(L, { mini: true })}</div></div></div>
    <div class="card pmc"><div class="ct">Premarket routine · ${nice(today()).split(",")[0]}</div><div class="pmr">${donut([{ v: pm ? pm.score / 100 : 0, c: pm ? (pm.score >= 80 ? "#c6f432" : pm.score >= 50 ? "#38bdf8" : "#f0627a") : "#7c3aed" }], pm ? pm.score.toFixed(0) + "%" : "–", pm ? `${pm.done}/${pm.total} done` : "not done", 112)}
      <div style="min-width:0"><div class="lbl">${S.routine.length ? (pm ? "Today's checklist is logged" : "Start your day right") : "Create your routine"}</div><div style="margin:4px 0 12px"><b>${sk.cur}</b> <span class="lbl">day streak (80%+)</span></div><button class="btn p" id="pk">${pm ? "Update" : "Start"}</button></div></div></div></div>
  <div class="kpis">
    <div class="card kpi" style="--a:var(--lime)"><div class="lbl">Win rate</div><div class="big">${st.win.toFixed(1)}%</div><div class="lbl">${wins} wins · ${loss} losses</div></div>
    <div class="card kpi" style="--a:var(--p2)"><div class="lbl">Profit factor</div><div class="big">${st.pf === Infinity ? "∞" : st.pf.toFixed(2)}</div><div class="lbl">${sign(st.avgW)} / ${sign(st.avgL)}</div></div>
    <div class="card kpi" style="--a:var(--blue)"><div class="lbl">Average R</div><div class="big ${cls(st.avgR)}">${sign(st.avgR)}R</div><div class="lbl">Plan RR ${st.prr ? "1:" + st.prr.toFixed(2) : "-"}</div></div>
    <div class="card kpi" style="--a:var(--lime)"><div class="lbl">Expectancy / trade</div><div class="big ${cls(st.exp)}">${sign(st.exp)}</div><div class="lbl">Avg ${dur(st.avgDur)}</div></div>
    <div class="card kpi wide" style="--a:var(--red)"><div class="lbl">Max drawdown</div><div class="big dn">-${st.dd.toFixed(1)}</div><div class="lbl">Worst ${sign(st.worst)} pts</div></div></div>
  <div class="grid two" style="margin-bottom:16px">
    <div class="card"><div class="ph" style="align-items:center;margin-bottom:10px"><div class="ct" style="margin:0">Equity curve (points)</div><span class="lbl">Now <b class="${cls(st.total)}">${sign(st.total)}</b></span></div>${curve(L)}</div>
    <div class="card"><div class="ct">Outcomes</div><div style="display:flex;align-items:center;gap:18px;flex-wrap:wrap">${donut([{ v: st.tp / tot, c: "#c6f432" }, { v: st.be / tot, c: "#38bdf8" }, { v: st.sl / tot, c: "#f0627a" }], st.n, "trades")}
      <div class="legend"><span><i style="background:var(--lime)"></i>TP ${st.tp}</span><span><i style="background:var(--blue)"></i>BE ${st.be}</span><span><i style="background:var(--red)"></i>SL ${st.sl}</span></div></div>
      <div class="kv" style="grid-template-columns:1fr;margin-top:12px">${kv("Avg win", `<span class="up">${sign(st.avgW)} pts</span>`)}${kv("Avg loss", `<span class="dn">${sign(st.avgL)} pts</span>`)}</div></div></div>
  <div class="grid two" style="margin-bottom:0">
    <div class="card"><div class="ph" style="align-items:center"><div class="ct">Recent trades</div><button class="pill sm" data-nav="journal">View all</button></div>${recent || `<div class="empty sm">No trades yet. Log your first one.</div>`}</div>
    <div class="card"><div class="ct">More insights</div><div class="kv" style="grid-template-columns:1fr">
      ${kv("Best / worst trade", `<span class="up">${sign(st.best)}</span> / <span class="dn">${sign(st.worst)}</span>`)}${kv("Max win / loss streak", `<span class="up">${st.ws}</span> / <span class="dn">${st.ls}</span>`)}
      ${kv("Avg SL / TP distance", `${st.avgSL.toFixed(1)} / ${st.avgTP.toFixed(1)} pts`)}${kv("Avg win / loss duration", `${dur(st.wDur)} / ${dur(st.lDur)}`)}
      ${kv("Avg MAE (heat taken)", `${st.avgMae.toFixed(1)} pts`)}${kv("Move captured (winners)", st.cap != null ? st.cap.toFixed(0) + "%" : "-")}
      ${kv("Plan adherence", `<span class="${st.adh >= 80 ? "up" : ""}">${st.adh != null ? st.adh.toFixed(0) + "%" : "-"}</span>`)}</div></div></div>
  <div class="bkg">${bk("By NY phase", group(L, (t) => t.session))}${bk("By weekday", group(L, (t) => DAYS[new Date(t.trade_date + "T00:00").getDay()]))}${bk("By setup", group(L, (t) => t.setup))}${bk("By mistake", group(L.filter((t) => t.mistake), (t) => t.mistake))}${bk("By timeframe", group(L, (t) => t.timeframe))}${bk("By side", group(L, (t) => t.direction))}</div>`;
}

function calView() {
  const { y, m } = S.cal, days = new Date(y, m + 1, 0).getDate(), off = (new Date(y, m, 1).getDay() + 6) % 7, pre = `${y}-${String(m + 1).padStart(2, "0")}`;
  const by = {}; S.trades.forEach((t) => { if (t.trade_date.startsWith(pre)) { const o = (by[t.trade_date] = by[t.trade_date] || { p: 0, n: 0 }); o.p += t.points; o.n++; } });
  const vals = Object.values(by), tot = vals.reduce((a, o) => a + o.p, 0), cnt = vals.reduce((a, o) => a + o.n, 0), gd = vals.filter((o) => o.p > 0).length, rd = vals.filter((o) => o.p < 0).length;
  const arr = Array(off).fill(null); for (let d = 1; d <= days; d++) arr.push({ d, key: `${pre}-${String(d).padStart(2, "0")}` }); while (arr.length % 7) arr.push(null);
  let grid = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "Week"].map((h) => `<div class="h ${h === "Week" ? "wk" : ""}">${h}</div>`).join("");
  for (let w = 0; w < arr.length; w += 7) {
    const wk = arr.slice(w, w + 7); let wp = 0, wn = 0;
    grid += wk.map((c) => { if (!c) return `<div class="cd blank"></div>`; const x = by[c.key]; if (x) { wp += x.p; wn += x.n; }
      return `<div class="cd ${x ? (x.p > 0 ? "win" : x.p < 0 ? "loss" : "be") : ""}" ${x ? `data-day="${c.key}"` : ""}><span class="dnum">${c.d}</span>${x ? `<b>${sign(x.p)}</b><small>${x.n} trade${x.n > 1 ? "s" : ""}</small>` : ""}</div>`; }).join("");
    grid += `<div class="cd wk"><span class="dnum">Week ${w / 7 + 1}</span>${wn ? `<b class="${cls(wp)}">${sign(wp)}</b><small>${wn} trade${wn > 1 ? "s" : ""}</small>` : ""}</div>`;
  }
  const name = new Date(y, m, 1).toLocaleString("en", { month: "long", year: "numeric" });
  return `<div style="display:flex;align-items:center;gap:12px;margin-bottom:6px;flex-wrap:wrap"><button class="pill" id="cp">‹</button><h1 style="margin:0;font-size:28px;flex:1;text-align:center">${name}</h1><button class="pill" id="cn">›</button>
  <button class="btn pdf" id="calpdf"><svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg> Export PDF</button></div>
  <p class="sub" style="text-align:center">Total <b class="${cls(tot)}">${sign(tot)} pts</b> · ${cnt} trades · ${gd} green · ${rd} red. Tap a day to open its trades.</p><div class="card"><div class="cal">${grid}</div></div>`;
}

// Streak = consecutive days with score >= 80%. Weekends are skipped, a missed weekday breaks it.
function streaks() {
  const ok = new Set(S.logs.filter((l) => l.score >= 80).map((l) => l.log_date));
  const wkend = (d) => d.getDay() === 0 || d.getDay() === 6;
  let cur = 0, d = new Date(), first = true;
  for (let i = 0; i < 4000; i++, d.setDate(d.getDate() - 1)) {
    if (ok.has(dstr(d))) cur++;
    else if (wkend(d) || (first && cur === 0)) { /* skip */ }
    else break;
    first = false;
  }
  let best = 0, run = 0;
  if (S.logs.length) {
    const ds = S.logs.map((l) => l.log_date).sort(), e = new Date(ds[ds.length - 1] + "T00:00");
    for (let x = new Date(ds[0] + "T00:00"); x <= e; x.setDate(x.getDate() + 1)) {
      if (ok.has(dstr(x))) { run++; best = Math.max(best, run); } else if (!wkend(x)) run = 0;
    }
  }
  return { cur, best };
}

function preView() {
  const all = S.logs, L = filterByDate(all, S.pf.from, S.pf.to, "log_date"), n = L.length, avg = n ? L.reduce((a, l) => a + l.score, 0) / n : 0, td = all.find((l) => l.log_date === today()), sk = streaks();
  const byDay = {}; S.trades.forEach((t) => (byDay[t.trade_date] = byDay[t.trade_date] || []).push(t));
  const pts = (k) => (byDay[k] ? byDay[k].reduce((a, t) => a + t.points, 0) : null);
  const rows = L.map((l) => `<div class="hist"><b style="min-width:92px">${l.log_date}</b><span class="lbl" style="min-width:36px">${l.done}/${l.total}</span>
    <div class="bar"><span style="width:${l.score}%;background:${scCol(l.score)}"></span></div><b class="${scCls(l.score)}" style="min-width:44px">${l.score.toFixed(0)}%</b>
    <span class="lbl" style="min-width:84px">${pts(l.log_date) != null ? `<span class="${cls(pts(l.log_date))}">${sign(pts(l.log_date))} pts</span>` : "no trades"}</span>
    <span><button class="x" data-pe="${l.log_date}">Edit</button><button class="x" data-pd="${l.id}">Delete</button></span>${l.notes ? `<div class="hnote">${esc(l.notes)}</div>` : ""}</div>`).join("");
  let cols = "";
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); const k = dstr(d), l = all.find((x) => x.log_date === k);
    cols += `<div style="flex:1;min-width:0;text-align:center"><div class="mini"><div style="margin:0 2px;height:${l ? Math.max(l.score, 4) : 4}%;background:${l ? scCol(l.score) : "var(--card2)"}" title="${k}: ${l ? l.score.toFixed(0) + "%" : "not logged"}"></div></div><div class="lbl" style="font-size:10px;margin-top:4px">${d.getDate()}</div></div>`;
  }
  const rate = S.routine.map((i) => { let a = 0, dn = 0; L.forEach((l) => { const x = l.items.find((y) => y.id === i.id); if (x) { a++; if (x.done) dn++; } }); return { t: i.title, a, p: a ? (dn / a) * 100 : null }; }).filter((r) => r.a).sort((x, y) => x.p - y.p);
  const grp = (f) => { const days = L.filter((l) => f(l.score) && byDay[l.log_date]), tr = days.flatMap((l) => byDay[l.log_date]), p = tr.reduce((a, t) => a + t.points, 0); return { d: days.length, avg: days.length ? p / days.length : null, win: tr.length ? (tr.filter((t) => t.points > 0).length / tr.length) * 100 : null }; };
  const hi = grp((s) => s >= 80), lo = grp((s) => s < 80);
  const cmp = (title, g) => `<div class="card"><div class="lbl">${title}</div><div class="big ${g.avg != null ? cls(g.avg) : ""}">${g.avg != null ? sign(g.avg) + " pts/day" : "-"}</div><p class="lbl" style="margin:8px 0 0">${g.d} traded day${g.d === 1 ? "" : "s"} · win rate ${g.win != null ? g.win.toFixed(0) + "%" : "-"}</p></div>`;
  const kp = (a, b, c, col) => `<div class="card kpi" style="--a:${col}"><div class="lbl">${a}</div><div class="big">${b}</div><div class="lbl">${c}</div></div>`;
  return `<div class="ph"><div><h1>Premarket <span>routine</span></h1><p class="sub">${nice(today())}</p></div><button class="btn p" id="np">+ New performance</button></div>
  ${exportBar("px", S.pf.from, S.pf.to)}
  <div class="kpis">
    ${kp("Today's score", `<span class="${td ? scCls(td.score) : ""}">${td ? td.score.toFixed(0) + "%" : "-"}</span>`, td ? `${td.done}/${td.total} done` : "not logged", "var(--lime)")}
    ${kp("Average score", `<span class="${scCls(avg)}">${n ? avg.toFixed(0) + "%" : "-"}</span>`, `${n} day${n === 1 ? "" : "s"} in range`, "var(--blue)")}
    ${kp("Current streak", `${sk.cur} <span class="lbl">day${sk.cur === 1 ? "" : "s"}</span>`, "80%+ days", "var(--p2)")}
    ${kp("Best streak", `${sk.best} <span class="lbl">day${sk.best === 1 ? "" : "s"}</span>`, "all time", "var(--p2)")}
    <div class="kpi wide card" style="--a:var(--blue)"><div class="lbl">Activities</div><div class="big">${S.routine.length}</div><div class="lbl">in your routine</div></div></div>
  <div class="grid two" style="margin-bottom:16px"><div class="card"><div class="ct">Last 14 days</div><div style="display:flex">${cols}</div></div>
    <div class="card"><div class="ct">Consistency · weakest first</div>${rate.length ? rate.map((r) => `<div class="rate"><span>${esc(r.t)}</span><div class="bar"><span style="width:${r.p}%;background:${scCol(r.p)}"></span></div><b style="min-width:38px;text-align:right">${r.p.toFixed(0)}%</b></div>`).join("") : `<div class="empty sm">Log a day to see this</div>`}</div></div>
  ${hi.d + lo.d ? `<div class="bkg" style="margin:0 0 16px"><div class="lbl" style="grid-column:1/-1;margin-bottom:-6px">Does routine discipline affect your trading? (days with both a routine log and trades)</div>${cmp("Routine 80%+ days", hi)}${cmp("Routine under 80% days", lo)}</div>` : ""}
  <div class="card"><div class="ct">History${S.pf.from || S.pf.to ? ` · ${L.length} in range` : ""}</div>${rows || `<div class="empty">No performance logged yet. Tap “New performance” to start.</div>`}</div>`;
}

function journalView(list, st) {
  const rows = list.map((t) => `<tr><td>${t.trade_date}</td><td><span class="tag ${t.direction}">${t.direction}</span></td><td><span class="tag ${t.outcome}">${t.outcome}</span></td>
      <td>${t.entry_price}</td><td>${t.exit_price}</td><td>${t.sl_price ?? "-"}</td><td>${t.tp_price ?? "-"}</td><td>${t.sl_points ?? "-"}</td><td>${t.tp_points ?? "-"}</td><td>${t.planned_rr ? "1:" + t.planned_rr : "-"}</td>
      <td class="${cls(t.points)}">${sign(t.points)}</td><td>${t.r_multiple != null ? sign(t.r_multiple) + "R" : "-"}</td><td>${t.mfe ?? "-"}</td><td>${t.mae ?? "-"}</td>
      <td>${fmtT(t.entry_time)}</td><td>${fmtT(t.close_time)}</td><td>${dur(t.duration_min)}</td><td>${esc(t.timeframe)}</td><td>${esc(t.session)}</td><td>${esc(t.setup)}</td><td>${esc(t.followed_plan)}</td><td>${esc(t.mistake)}</td><td>${esc(t.emotion)}</td><td>${t.rating ? t.rating + "/5" : ""}</td>
      <td>${safeUrl(t.screenshot) ? `<a href="${safeUrl(t.screenshot)}" target="_blank" rel="noopener" style="color:var(--p2)">View</a>` : ""}<button class="x" data-e="${t.id}">Edit</button><button class="x" data-d="${t.id}">Delete</button></td></tr>`).join("");
  const mc = list.map((t) => `<div class="card mcard"><div class="r1"><span><span class="tag ${t.direction}">${t.direction}</span> <span class="tag ${t.outcome}">${t.outcome}</span></span><b class="${cls(t.points)}">${sign(t.points)} pts</b></div>
      <div class="lbl">${t.trade_date} · ${fmtT(t.entry_time).slice(6)}–${fmtT(t.close_time).slice(6)} · ${dur(t.duration_min)}</div>
      <div class="g2"><div><span class="lbl">Entry → Exit</span><br>${t.entry_price} → ${t.exit_price}</div><div><span class="lbl">SL / TP pts</span><br>${t.sl_points ?? "-"} / ${t.tp_points ?? "-"}</div>
      <div><span class="lbl">Plan RR / R</span><br>${t.planned_rr ? "1:" + t.planned_rr : "-"} / ${t.r_multiple != null ? sign(t.r_multiple) + "R" : "-"}</div><div><span class="lbl">MFE / MAE</span><br>${t.mfe ?? "-"} / ${t.mae ?? "-"}</div></div>
      <div class="lbl">${[t.session, t.timeframe, t.setup, t.followed_plan ? "Plan: " + t.followed_plan : "", t.mistake, t.emotion].filter(Boolean).map(esc).join(" · ")}</div>
      <div style="margin-top:8px">${safeUrl(t.screenshot) ? `<a href="${safeUrl(t.screenshot)}" target="_blank" rel="noopener" style="color:var(--p2);margin-right:14px">Screenshot</a>` : ""}<button class="x" data-e="${t.id}">Edit</button> <button class="x" data-d="${t.id}">Delete</button></div></div>`).join("");
  return `<h1>Journal</h1><p class="sub">${st.n} trades · <b class="${cls(st.total)}">${sign(st.total)} pts</b> · ${st.win.toFixed(0)}% win rate · avg ${dur(st.avgDur)}</p>
    <div class="filters"><select id="fd"><option value="">Buy & Sell</option><option ${S.f.dir === "BUY" ? "selected" : ""}>BUY</option><option ${S.f.dir === "SELL" ? "selected" : ""}>SELL</option></select>
    <select id="fo"><option value="">TP, SL & BE</option>${["TP", "SL", "BE"].map((o) => `<option ${S.f.out === o ? "selected" : ""}>${o}</option>`).join("")}</select>
    <input id="ff" type="date" value="${S.f.from}"><input id="ft" type="date" value="${S.f.to}">
    <button class="pill sm" id="jcl">Clear</button>
    <button class="btn pdf" id="jpdf"><svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg> Export PDF</button></div>
    <div class="card scroll tbl">${rows ? `<table><tr><th>Date</th><th>Side</th><th>Result</th><th>Entry</th><th>Exit</th><th>SL</th><th>TP</th><th>SL pts</th><th>TP pts</th><th>Plan RR</th><th>Points</th><th>R</th><th>MFE</th><th>MAE</th><th>Entry time</th><th>Close time</th><th>Duration</th><th>TF</th><th>Session</th><th>Setup</th><th>Plan?</th><th>Mistake</th><th>Emotion</th><th>Rating</th><th></th></tr>${rows}</table>` : `<div class="empty">No trades yet. Log your first NAS100 trade with “New trade”.</div>`}</div><div class="mc">${mc || `<div class="card empty">No trades yet. Tap “New trade”.</div>`}</div>`;
}
