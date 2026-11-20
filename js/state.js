/* NasLog — app state */
const API = location.hostname === "localhost" || location.protocol === "file:" ? "http://localhost:3000" : "https://nas100.onrender.com";

let S = {
  token: localStorage.token,
  user: JSON.parse(localStorage.user || "null"),
  trades: [],
  routine: [],
  logs: [],
  cfs: [],
  cf: { mode: "all", sel: new Set(), from: "", to: "" },
  cfm: null,
  pm: { done: new Set() },
  view: "dashboard",
  range: "all",
  mode: "login",
  f: { dir: "", out: "", from: "", to: "" },
  pf: { from: "", to: "" },
  editing: null,
  cal: { y: new Date().getFullYear(), m: new Date().getMonth() },
};
