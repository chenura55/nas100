/* ---------- maths + charts ---------- */
function filtered() {
  const { dir, out, from, to } = S.f;
  return S.trades.filter((t) => (!dir || t.direction === dir) && (!out || t.outcome === out) && (!from || t.trade_date >= from) && (!to || t.trade_date <= to));
}
function rangeTrades() {
  if (S.f.from || S.f.to) return filterByDate(S.trades, S.f.from, S.f.to);
  if (S.range === "all") return S.trades;
  const c = new Date(); c.setDate(c.getDate() - +S.range); const k = dstr(c);
  return S.trades.filter((t) => t.trade_date >= k);
}

function stats(list) {
  const n = list.length, w = list.filter((t) => t.points > 0), l = list.filter((t) => t.points < 0);
  const total = list.reduce((a, t) => a + t.points, 0), gp = w.reduce((a, t) => a + t.points, 0), gl = Math.abs(l.reduce((a, t) => a + t.points, 0));
  const rs = list.filter((t) => t.r_multiple != null);
  const ch = [...list].reverse(); let c = 0, pk = 0, dd = 0, ws = 0, ls = 0, cw = 0, cl = 0;
  ch.forEach((t) => { c += t.points; pk = Math.max(pk, c); dd = Math.max(dd, pk - c); if (t.points > 0) { cw++; cl = 0; } else if (t.points < 0) { cl++; cw = 0; } else { cw = 0; cl = 0; } ws = Math.max(ws, cw); ls = Math.max(ls, cl); });
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0), pl = list.filter((t) => t.followed_plan), cap = w.filter((t) => t.mfe > 0).map((t) => (t.points / t.mfe) * 100);
  const ex = { dd, ws, ls, exp: n ? total / n : 0, best: Math.max(0, ...list.map((t) => t.points)), worst: Math.min(0, ...list.map((t) => t.points)), adh: pl.length ? (pl.filter((t) => t.followed_plan === "Yes").length / pl.length) * 100 : null, prr: avg(list.filter((t) => t.planned_rr).map((t) => t.planned_rr)), wDur: Math.round(avg(w.map((t) => t.duration_min))), lDur: Math.round(avg(l.map((t) => t.duration_min))), cap: cap.length ? avg(cap) : null, avgSL: avg(list.filter((t) => t.sl_points).map((t) => t.sl_points)), avgTP: avg(list.filter((t) => t.tp_points).map((t) => t.tp_points)), avgMae: avg(list.filter((t) => t.mae != null).map((t) => t.mae)) };
  return {
    ...ex, n, total, win: n ? (w.length / n) * 100 : 0, pf: gl ? gp / gl : gp ? Infinity : 0,
    avgW: w.length ? gp / w.length : 0, avgL: l.length ? -gl / l.length : 0,
    avgDur: n ? Math.round(list.reduce((a, t) => a + t.duration_min, 0) / n) : 0,
    avgR: rs.length ? rs.reduce((a, t) => a + t.r_multiple, 0) / rs.length : 0,
    tp: list.filter((t) => t.outcome === "TP").length, sl: list.filter((t) => t.outcome === "SL").length, be: list.filter((t) => t.outcome === "BE").length,
  };
}

let gid = 0;
function curve(list, o = {}) {
  const pts = [...list].reverse(); let c = 0; const ys = [0, ...pts.map((t) => (c += t.points))];
  if (ys.length < 2) return `<div class="empty sm" style="color:inherit;opacity:.7">Log a trade to see your curve</div>`;
  const W = 600, H = o.mini ? 90 : 230, pad = o.mini ? 8 : 16, min = Math.min(0, ...ys), max = Math.max(0, ...ys), r = max - min || 1, id = "g" + ++gid;
  const X = (i) => (i / (ys.length - 1)) * W, Y = (v) => H - pad - ((v - min) / r) * (H - pad * 2);
  const d = ys.map((v, i) => `${i ? "L" : "M"}${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ");
  const col = o.mini ? "#fff" : ys[ys.length - 1] >= 0 ? "#c6f432" : "#f0627a";
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display:block"><defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${col}" stop-opacity=".35"/><stop offset="1" stop-color="${col}" stop-opacity="0"/></linearGradient></defs>
  ${o.mini ? "" : `<line x1="0" x2="${W}" y1="${Y(0)}" y2="${Y(0)}" stroke="#555" stroke-dasharray="4" vector-effect="non-scaling-stroke"/>`}<path d="${d} L${W},${H} L0,${H}Z" fill="url(#${id})"/><path d="${d}" fill="none" stroke="${col}" stroke-width="${o.mini ? 2 : 2.5}" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
}

function donut(parts, center, sub, size = 120) {
  const R = 44, C = 2 * Math.PI * R; let off = 0;
  const segs = parts.filter((p) => p.v > 0).map((p) => { const len = Math.min(1, p.v) * C, s = `<circle cx="60" cy="60" r="${R}" fill="none" stroke="${p.c}" stroke-width="12" stroke-dasharray="${len.toFixed(2)} ${(C - len).toFixed(2)}" stroke-dashoffset="${(-off).toFixed(2)}" transform="rotate(-90 60 60)"/>`; off += len; return s; }).join("");
  return `<svg viewBox="0 0 120 120" width="${size}" height="${size}" style="flex:none"><circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--card2)" stroke-width="12"/>${segs}<text x="60" y="${sub ? 60 : 66}" text-anchor="middle" fill="#f4f4f6" font-size="22" font-weight="600">${center}</text>${sub ? `<text x="60" y="77" text-anchor="middle" fill="#8e8e9a" font-size="10">${sub}</text>` : ""}</svg>`;
}

function group(list, kf) {
  const m = {}; list.forEach((t) => { const k = kf(t) || "-"; (m[k] = m[k] || []).push(t); });
  return Object.entries(m).map(([k, a]) => ({ k, n: a.length, w: (a.filter((t) => t.points > 0).length / a.length) * 100, p: a.reduce((s, t) => s + t.points, 0) })).sort((a, b) => b.p - a.p);
}
const bk = (title, rows) => `<div class="card"><div class="ct">${title}</div>${rows.length ? rows.map((r) => `<div class="brow"><span class="bn">${esc(r.k)}</span><span class="lbl">${r.n}×</span><div class="bar slim"><span style="width:${r.w}%;background:${wCol(r.w)}"></span></div><b>${r.w.toFixed(0)}%</b><b class="${cls(r.p)} bp">${sign(r.p)}</b></div>`).join("") : `<div class="empty sm">No data yet</div>`}</div>`;
