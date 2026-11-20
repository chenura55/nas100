/* ---------- auth + shell ---------- */
function authView() {
  const reg = S.mode === "register";
  $("#app").innerHTML = `<div class="auth card"><div class="logo" style="margin-bottom:18px"><i></i>NasLog</div><h1 style="font-size:28px">${reg ? "Create account" : "Welcome back"}</h1><p class="sub">NAS100 trading journal</p>
  ${reg ? `<input id="nm" placeholder="Name" autocomplete="name">` : ""}<input id="em" type="email" placeholder="Email" autocomplete="email"><input id="pw" type="password" placeholder="Password (6+ characters)" autocomplete="${reg ? "new-password" : "current-password"}">
  <div class="err" id="err"></div><button class="btn p" style="width:100%;padding:13px" id="go">${reg ? "Sign up" : "Log in"}</button>
  <p class="sub" style="margin:14px 0 0;text-align:center"><a href="#" id="sw" style="color:var(--p2)">${reg ? "Have an account? Log in" : "New here? Create an account"}</a></p></div>`;
  $("#sw").onclick = (e) => { e.preventDefault(); S.mode = reg ? "login" : "register"; authView(); };
  const go = async () => {
    try {
      const d = await api("/api/auth/" + S.mode, "POST", { name: $("#nm")?.value, email: $("#em").value, password: $("#pw").value });
      S.token = localStorage.token = d.token; S.user = d.user; localStorage.user = JSON.stringify(d.user); load();
    } catch (e) { $("#err").textContent = e.message; }
  };
  $("#go").onclick = go; $("#pw").onkeydown = (e) => { if (e.key === "Enter") go(); };
}

const go = (v) => { S.view = v; render(); scrollTo(0, 0); };

function render() {
  if (!S.token) return authView();
  const list = filtered(), st = stats(list);
  const nav = VIEWS.map((v) => `<button class="pill ${S.view === v ? "on" : ""}" data-nav="${v}">${vlabel(v)}</button>`).join("");
  const tabs = VIEWS.map((v) => `<button class="${S.view === v ? "on" : ""}" data-nav="${v}">${ICON[v]}<span>${vlabel(v)}</span></button>`).join("");
  const head = `<div class="top"><div class="logo"><i></i>NasLog</div><div class="nav">${nav}</div>
    <button class="btn pdf" id="toppdf" title="Export this tab to PDF"><svg class="ic" style="width:16px;height:16px" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 18v-6M9 15l3 3 3-3"/></svg><span>Export PDF</span></button>
    <button class="btn p addbtn ${S.view === "dashboard" || S.view === "premarket" || S.view === "confluence" ? "nomob" : ""}" id="add">+ New trade</button>
    <button class="pill outb" id="out" title="Log out">${ICON.out}<span>Log out</span></button></div>`;
  const body = S.view === "dashboard" ? dash() : S.view === "calendar" ? calView() : S.view === "premarket" ? preView() : S.view === "confluence" ? confView() : journalView(list, st);
  $("#app").innerHTML = head + body + `<nav class="tabbar">${tabs}</nav>`;
  document.querySelectorAll("[data-nav]").forEach((b) => (b.onclick = () => go(b.dataset.nav)));
  document.querySelectorAll("[data-rg]").forEach((b) => (b.onclick = () => { S.range = b.dataset.rg; S.f.from = S.f.to = ""; render(); }));
  $("#out").onclick = logout; $("#add").onclick = () => openForm();
  if ($("#toppdf")) $("#toppdf").onclick = () => {
    if (S.view === "dashboard") exportDashboardPdf();
    else if (S.view === "calendar") exportCalendarPdf();
    else if (S.view === "premarket") exportPremarketPdf();
    else if (S.view === "confluence") exportConfluencePdf();
    else exportJournalPdf();
  };
  if ($("#np")) $("#np").onclick = () => openPerf();
  if ($("#pk")) $("#pk").onclick = () => openPerf();
  if ($("#nc")) $("#nc").onclick = () => openConf();
  document.querySelectorAll("[data-ce]").forEach((b) => (b.onclick = () => openConf(S.cfs.find((r) => r.id == b.dataset.ce))));
  document.querySelectorAll("[data-cd]").forEach((b) => (b.onclick = async () => { if (await ask("Delete this entry?", "This can't be undone.")) { await api("/api/confluence/" + b.dataset.cd, "DELETE"); S.cfs = await api("/api/confluence"); render(); toast("Entry deleted"); } }));
  document.querySelectorAll("[data-fk]").forEach((b) => (b.onclick = () => { const k = b.dataset.fk; S.cf.sel.has(k) ? S.cf.sel.delete(k) : S.cf.sel.add(k); render(); }));
  document.querySelectorAll("[data-fm]").forEach((b) => (b.onclick = () => { S.cf.mode = b.dataset.fm; render(); }));
  if ($("#cff")) { $("#cff").onchange = () => { S.cf.from = $("#cff").value; render(); }; $("#cft").onchange = () => { S.cf.to = $("#cft").value; render(); }; $("#ccl").onclick = () => { S.cf = { mode: "all", sel: new Set(), from: "", to: "" }; render(); }; }
  document.querySelectorAll("[data-pe]").forEach((b) => (b.onclick = () => openPerf(b.dataset.pe)));
  document.querySelectorAll("[data-pd]").forEach((b) => (b.onclick = async () => { if (await ask("Delete this day's performance?", "This can't be undone.")) { await api("/api/routine/logs/" + b.dataset.pd, "DELETE"); S.logs = await api("/api/routine/logs"); render(); toast("Performance deleted"); } }));
  if ($("#cp")) { $("#cp").onclick = () => { if (--S.cal.m < 0) { S.cal.m = 11; S.cal.y--; } render(); }; $("#cn").onclick = () => { if (++S.cal.m > 11) { S.cal.m = 0; S.cal.y++; } render(); }; }
  if ($("#calpdf")) $("#calpdf").onclick = exportCalendarPdf;
  document.querySelectorAll("[data-day]").forEach((c) => (c.onclick = () => { S.f = { dir: "", out: "", from: c.dataset.day, to: c.dataset.day }; go("journal"); }));
  document.querySelectorAll("[data-e]").forEach((b) => (b.onclick = () => openForm(S.trades.find((t) => t.id == b.dataset.e))));
  document.querySelectorAll("[data-d]").forEach((b) => (b.onclick = async () => { if (await ask("Delete this trade?", "This can't be undone.")) { await api("/api/trades/" + b.dataset.d, "DELETE"); await load(); toast("Trade deleted"); } }));
  if ($("#fd")) { const u = () => { S.f = { dir: $("#fd").value, out: $("#fo").value, from: $("#ff").value, to: $("#ft").value }; render(); }; ["#fd", "#fo", "#ff", "#ft"].forEach((s) => ($(s).onchange = u)); }
  if ($("#jcl")) $("#jcl").onclick = () => { S.f = { dir: "", out: "", from: "", to: "" }; render(); };
  if ($("#jpdf")) $("#jpdf").onclick = exportJournalPdf;
  if ($("#dxf")) { $("#dxf").onchange = () => { S.f.from = $("#dxf").value; S.range = "all"; render(); }; $("#dxt").onchange = () => { S.f.to = $("#dxt").value; S.range = "all"; render(); }; $("#dxcl").onclick = () => { S.f.from = S.f.to = ""; render(); }; $("#dxpdf").onclick = exportDashboardPdf; }
  if ($("#pxf")) { $("#pxf").onchange = () => { S.pf.from = $("#pxf").value; render(); }; $("#pxt").onchange = () => { S.pf.to = $("#pxt").value; render(); }; $("#pxcl").onclick = () => { S.pf = { from: "", to: "" }; render(); }; $("#pxpdf").onclick = exportPremarketPdf; }
  if ($("#cpdf")) $("#cpdf").onclick = exportConfluencePdf;
}

S.token ? load().catch(authView) : authView();
