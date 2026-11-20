/* NasLog — shared helpers */
const $ = (s) => document.querySelector(s);
const dur = (m) => (m == null ? "-" : m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);
const sign = (n) => (n > 0 ? "+" : "") + (+n).toFixed(2);
const cls = (n) => (n > 0 ? "up" : n < 0 ? "dn" : "");
const fmtT = (s) => (s || "").replace("T", " ").slice(5, 16);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? esc(u) : "");
const dstr = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => dstr(new Date());
const nice = (k) => new Date(k + "T00:00").toLocaleDateString("en", { weekday: "long", day: "numeric", month: "short", year: "numeric" });
const scCls = (s) => (s >= 80 ? "up" : s < 50 ? "dn" : "");
const scCol = (s) => (s >= 80 ? "var(--lime)" : s >= 50 ? "var(--blue)" : "var(--red)");
const wCol = (w) => (w >= 50 ? "var(--lime)" : "var(--red)");
const isMob = () => innerWidth <= 700;
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const VIEWS = ["dashboard", "calendar", "premarket", "confluence", "journal"];
const vlabel = (v) => v[0].toUpperCase() + v.slice(1);

const ICON = {
  dashboard: `<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="9" rx="2"/><rect x="14" y="3" width="7" height="5" rx="2"/><rect x="14" y="12" width="7" height="9" rx="2"/><rect x="3" y="16" width="7" height="5" rx="2"/></svg>`,
  calendar: `<svg class="ic" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="3"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>`,
  premarket: `<svg class="ic" viewBox="0 0 24 24"><path d="M12 3v3M4.9 6.9l2.1 2.1M19.1 6.9L17 9M2 16h2M20 16h2M7 16a5 5 0 0110 0M3 20h18"/></svg>`,
  journal: `<svg class="ic" viewBox="0 0 24 24"><path d="M4 4h12a4 4 0 014 4v12H8a4 4 0 01-4-4z"/><path d="M8 9h8M8 13h6"/></svg>`,
  confluence: `<svg class="ic" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  out: `<svg class="ic" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>`,
};

const CONF = {
  "1D": ["SCB", "PDH/PDL taken"],
  "1H": ["SCB", "I.SMT", "E.SMT"],
  "15min": ["SCB", "I.SMT", "E.SMT"],
  "5min": ["SCB", "I.SMT", "E.SMT", "SMT", "IFVG"],
  "1min": ["I.SMT", "SMT", "MSS", "IFVG"],
};
const TFS = Object.keys(CONF);
const SUGGEST = ["Check economic calendar", "Mark key levels", "Mark HTF bias", "Review last trades", "Set max daily loss", "Read my trading rules", "Breathing / meditation"];
