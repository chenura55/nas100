/* ---------- PDF export ---------- */
function pdfReady() {
  if (!window.jspdf?.jsPDF) { toast("PDF library not loaded. Check internet and refresh.", "error"); return null; }
  return window.jspdf.jsPDF;
}
function pdfHeader(doc, title, subtitle) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(124, 58, 237);
  doc.rect(0, 0, pageW, 28, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont(undefined, "bold");
  doc.text("NasLog · NAS100 Journal", 14, 12);
  doc.setFontSize(10);
  doc.setFont(undefined, "normal");
  doc.text(title, 14, 20);
  if (subtitle) {
    doc.setTextColor(140, 140, 150);
    doc.setFontSize(9);
    doc.text(subtitle, 14, 34);
  }
  doc.setTextColor(40, 40, 50);
  return subtitle ? 40 : 36;
}
function pdfFooter(doc) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const n = doc.internal.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 160);
    doc.text(`Generated ${new Date().toLocaleString()} · Page ${i} of ${n}`, 14, pageH - 8);
    doc.text("NasLog", pageW - 14, pageH - 8, { align: "right" });
  }
}
function dateRangeLabel(from, to) {
  if (from && to) return `${from} → ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "All dates";
}
function filterByDate(list, from, to, key = "trade_date") {
  return list.filter((x) => (!from || x[key] >= from) && (!to || x[key] <= to));
}
function exportBar(idPrefix, from, to) {
  return `<div class="expbar card" style="padding:12px 16px">
    <span class="lbl">Date range</span>
    <input id="${idPrefix}f" type="date" value="${from || ""}">
    <input id="${idPrefix}t" type="date" value="${to || ""}">
    <button class="pill sm" id="${idPrefix}cl">Clear</button>
    <button class="btn pdf" id="${idPrefix}pdf"><svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg> Export PDF</button>
  </div>`;
}

function exportDashboardPdf() {
  const jsPDF = pdfReady(); if (!jsPDF) return;
  const L = rangeTrades(), st = stats(L), nm = S.user?.name || "Trader";
  const rangeLbl = S.f.from || S.f.to ? dateRangeLabel(S.f.from, S.f.to) : (S.range === "all" ? "All time" : `Last ${S.range} days`);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Dashboard Performance Report", `${nm} · ${rangeLbl}`);
  doc.setFontSize(11); doc.setFont(undefined, "bold");
  doc.text("Summary", 14, y); y += 6;
  doc.setFont(undefined, "normal"); doc.setFontSize(10);
  const lines = [
    [`Total points`, sign(st.total)],
    [`Trades`, String(st.n)],
    [`Win rate`, st.win.toFixed(1) + "%"],
    [`Profit factor`, st.pf === Infinity ? "∞" : st.pf.toFixed(2)],
    [`Average R`, sign(st.avgR) + "R"],
    [`Expectancy / trade`, sign(st.exp)],
    [`Max drawdown`, "-" + st.dd.toFixed(1)],
    [`Avg win / loss`, `${sign(st.avgW)} / ${sign(st.avgL)}`],
    [`TP / SL / BE`, `${st.tp} / ${st.sl} / ${st.be}`],
    [`Best / worst`, `${sign(st.best)} / ${sign(st.worst)}`],
  ];
  lines.forEach(([a, b], i) => { doc.setTextColor(100, 100, 110); doc.text(a, 14, y + i * 6); doc.setTextColor(30, 30, 40); doc.text(b, 80, y + i * 6); });
  y += lines.length * 6 + 10;
  if (L.length) {
    doc.setFont(undefined, "bold"); doc.setFontSize(11); doc.setTextColor(30, 30, 40); doc.text("Trades in range", 14, y); y += 2;
    doc.autoTable({
      startY: y, head: [["Date", "Side", "Result", "Entry", "Exit", "Points", "R", "Setup"]],
      body: L.map((t) => [t.trade_date, t.direction, t.outcome, t.entry_price, t.exit_price, sign(t.points), t.r_multiple != null ? sign(t.r_multiple) + "R" : "-", t.setup || "-"]),
      styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [124, 58, 237], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 248] }, margin: { left: 14, right: 14 },
    });
  }
  pdfFooter(doc);
  doc.save(`NasLog-Dashboard-${dstr(new Date())}.pdf`);
  toast("Dashboard PDF exported");
}

function exportJournalPdf() {
  const jsPDF = pdfReady(); if (!jsPDF) return;
  const list = filtered(), st = stats(list);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Trade Journal Export", `${S.user?.name || "Trader"} · ${dateRangeLabel(S.f.from, S.f.to)} · ${list.length} trades · ${sign(st.total)} pts · ${st.win.toFixed(0)}% win`);
  doc.autoTable({
    startY: y, head: [["Date", "Side", "Result", "Entry", "Exit", "SL pts", "TP pts", "Points", "R", "Duration", "TF", "Session", "Setup", "Plan", "Mistake"]],
    body: list.map((t) => [t.trade_date, t.direction, t.outcome, t.entry_price, t.exit_price, t.sl_points ?? "-", t.tp_points ?? "-", sign(t.points), t.r_multiple != null ? sign(t.r_multiple) + "R" : "-", dur(t.duration_min), t.timeframe || "-", t.session || "-", t.setup || "-", t.followed_plan || "-", t.mistake || "-"]),
    styles: { fontSize: 7, cellPadding: 1.5 }, headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 248] }, margin: { left: 10, right: 10 },
  });
  pdfFooter(doc);
  doc.save(`NasLog-Journal-${dstr(new Date())}.pdf`);
  toast("Journal PDF exported");
}

function exportPremarketPdf() {
  const jsPDF = pdfReady(); if (!jsPDF) return;
  const L = filterByDate(S.logs, S.pf.from, S.pf.to, "log_date");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Premarket Routine Report", `${S.user?.name || "Trader"} · ${dateRangeLabel(S.pf.from, S.pf.to)} · ${L.length} days`);
  const byDay = {}; S.trades.forEach((t) => (byDay[t.trade_date] = byDay[t.trade_date] || []).push(t));
  const pts = (k) => (byDay[k] ? byDay[k].reduce((a, t) => a + t.points, 0) : null);
  doc.autoTable({
    startY: y, head: [["Date", "Done", "Total", "Score", "Day points", "Notes"]],
    body: L.map((l) => [l.log_date, String(l.done), String(l.total), l.score.toFixed(0) + "%", pts(l.log_date) != null ? sign(pts(l.log_date)) : "-", (l.notes || "").slice(0, 60)]),
    styles: { fontSize: 9, cellPadding: 2 }, headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 248] }, margin: { left: 14, right: 14 },
  });
  pdfFooter(doc);
  doc.save(`NasLog-Premarket-${dstr(new Date())}.pdf`);
  toast("Premarket PDF exported");
}

function exportConfluencePdf() {
  const jsPDF = pdfReady(); if (!jsPDF) return;
  const L = cfFiltered();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let y = pdfHeader(doc, "Entry Confluence Report", `${S.user?.name || "Trader"} · ${dateRangeLabel(S.cf.from, S.cf.to)} · ${L.length} entries`);
  const byDay = {}; S.trades.forEach((t) => (byDay[t.trade_date] = byDay[t.trade_date] || []).push(t));
  const pts = (k) => (byDay[k] ? byDay[k].reduce((a, t) => a + t.points, 0) : null);
  const body = L.map((r) => {
    const tags = TFS.filter((tf) => (r.data?.[tf] || []).length).map((tf) => `${tf}: ${(r.data[tf] || []).join(", ")}`).join(" | ");
    return [r.log_date, tags || "-", pts(r.log_date) != null ? sign(pts(r.log_date)) : "-", (r.notes || "").slice(0, 50)];
  });
  doc.autoTable({
    startY: y, head: [["Date", "Confluences", "Day pts", "Notes"]],
    body, styles: { fontSize: 8, cellPadding: 2 }, headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 248] }, margin: { left: 14, right: 14 }, columnStyles: { 1: { cellWidth: 90 } },
  });
  pdfFooter(doc);
  doc.save(`NasLog-Confluence-${dstr(new Date())}.pdf`);
  toast("Confluence PDF exported");
}

function exportCalendarPdf() {
  const jsPDF = pdfReady(); if (!jsPDF) return;
  const { y, m } = S.cal, pre = `${y}-${String(m + 1).padStart(2, "0")}`;
  const by = {}; S.trades.forEach((t) => { if (t.trade_date.startsWith(pre)) { const o = (by[t.trade_date] = by[t.trade_date] || { p: 0, n: 0 }); o.p += t.points; o.n++; } });
  const name = new Date(y, m, 1).toLocaleString("en", { month: "long", year: "numeric" });
  const rows = Object.entries(by).sort((a, b) => a[0].localeCompare(b[0])).map(([d, o]) => [d, String(o.n), sign(o.p)]);
  const tot = rows.reduce((a, r) => a + parseFloat(r[2]), 0);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  let yy = pdfHeader(doc, "Calendar Report · " + name, `${S.user?.name || "Trader"} · ${rows.length} trading days · Total ${sign(tot)} pts`);
  doc.autoTable({
    startY: yy, head: [["Date", "Trades", "Points"]],
    body: rows.length ? rows : [["—", "0", "0"]],
    styles: { fontSize: 10, cellPadding: 2.5 }, headStyles: { fillColor: [124, 58, 237], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 248] }, margin: { left: 14, right: 14 },
  });
  pdfFooter(doc);
  doc.save(`NasLog-Calendar-${pre}.pdf`);
  toast("Calendar PDF exported");
}
