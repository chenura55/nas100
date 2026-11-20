/* NasLog — API + auth helpers */
async function api(path, method = "GET", body) {
  const r = await fetch(API + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + S.token },
    body: body && JSON.stringify(body),
  });
  const d = await r.json();
  if (r.status === 401 && S.token) logout();
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

const logout = () => {
  localStorage.clear();
  S.token = null;
  render();
};

async function load() {
  const [t, r, g, c] = await Promise.all([
    api("/api/trades"),
    api("/api/routine"),
    api("/api/routine/logs"),
    api("/api/confluence"),
  ]);
  S.trades = t;
  S.routine = r;
  S.logs = g;
  S.cfs = c;
  render();
}
