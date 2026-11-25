// Rakentaa offline.js:n: palvelimen pelilogiikka (server/src) yhdeksi selaimessa toimivaksi tiedostoksi.
// Aja kansiossa areena:  node tools/build-offline.mjs
import fs from "node:fs";
const dir = "server/src/", order = ["map", "korjaamo", "alppikyla", "pepino", "margariini", "maps", "bots", "index"];
let out = `// OFFLINE-TILA: palvelimen pelilogiikka ajetaan selaimessa (rakennettu tiedostoista server/src/*.js, älä muokkaa käsin)
class DurableObject { constructor(ctx, env) { this.ctx = ctx; this.env = env; } }
class Response { constructor(body, init = {}) { this.body = body; this.status = init.status || 200; this.webSocket = init.webSocket; this.headers = init.headers || {}; } }
// Selaimen sisäinen "WebSocket"-pari: palvelinpää (GameRoom) ja selainpää (peli)
class ServerEnd { constructor() { this.l = { message: [], close: [], error: [] }; this.peer = null; this.open = true; }
  accept() {} addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  send(s) { const c = this.peer; if (!c || c.readyState > 1) return; if (c.readyState === 0) { c.q.push(s); return; } setTimeout(() => { if (c.readyState === 1) c._emit("message", { data: s }); }, 0); }
  close() { if (!this.open) return; this.open = false; const c = this.peer; setTimeout(() => c && c._closed(), 0); }
  _emit(t, e) { for (const f of this.l[t] || []) f(e); } }
class ClientEnd { constructor() { this.readyState = 0; this.l = {}; this.peer = null; this.q = []; this.onopen = this.onmessage = this.onclose = this.onerror = null; }
  addEventListener(t, f) { (this.l[t] ||= []).push(f); }
  send(s) { const p = this.peer; if (this.readyState !== 1) return; setTimeout(() => p.open && p._emit("message", { data: s }), 0); }
  close() { if (this.readyState > 1) return; this.readyState = 3; const p = this.peer; setTimeout(() => { if (p.open) { p.open = false; p._emit("close", {}); } }, 0); this._emit("close", { code: 1000 }); }
  _emit(t, e) { this["on" + t]?.(e); for (const f of this.l[t] || []) f(e); }
  _opened() { this.readyState = 1; this._emit("open", {}); const q = this.q; this.q = []; for (const s of q) setTimeout(() => this.readyState === 1 && this._emit("message", { data: s }), 0); }
  _closed() { if (this.readyState === 3) return; this.readyState = 3; this._emit("close", { code: 1000 }); } }
let __nextClient = null;
class WebSocketPair { constructor() { const c = __nextClient || new ClientEnd(), s = new ServerEnd(); __nextClient = null; c.peer = s; s.peer = c; this[0] = c; this[1] = s; } }
const __m = {};
`;
for (const f of order) {
  let src = fs.readFileSync(dir + f + ".js", "utf8");
  const imports = [], exps = [];
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*"\.\/([\w-]+)\.js";?\s*$/gm, (_, names, mod) => { imports.push(`const {${names}} = __m[${JSON.stringify(mod)}];`); return ""; });
  src = src.replace(/^import\s*\{[^}]*\}\s*from\s*"cloudflare:workers";?\s*$/gm, "");
  src = src.replace(/^export\s+default\s+/m, () => { exps.push("default: __default"); return "const __default = "; });
  src = src.replace(/^export\s+(const|let|function|class|async function)\s+([A-Za-z_$][\w$]*)/gm, (_, kw, name) => { exps.push(name); return `${kw} ${name}`; });
  if (/^\s*(import|export)\b/m.test(src)) throw new Error("Tuntematon import/export tiedostossa " + f);
  out += `__m[${JSON.stringify(f)}] = (() => {\n${imports.join("\n")}\n${src}\nreturn { ${exps.join(", ")} };\n})();\n`;
}
out += `
// Käynnistää paikallisen pelihuoneen ja palauttaa WebSocketin kaltaisen yhteyden.
// teams = { sininen: n, punainen: m } pelaajia per puoli (sinä mukaan lukien), loput ovat botteja.
const { GameRoom } = __m.index, worker = __m.index.default;
let room = null;
export function connect(query, teams) {
  if (!room || room.players.size === 0) {
    if (room?.loop) clearInterval(room.loop);
    room = new GameRoom({}, {});
  }
  room.botTargets = { sininen: Math.max(0, Math.min(20, teams.sininen | 0)), punainen: Math.max(0, Math.min(20, teams.punainen | 0)) };
  room.maxPlayers = 41;
  const env = { ROOMS: { idFromName: (n) => n, get: () => room } };
  // Selain ei salli Upgrade-otsaketta oikeassa Requestissa, joten annetaan pelkkä kuvaus pyynnöstä
  const req = { url: "https://offline.local/ws?" + query, method: "GET", headers: { get: (k) => (String(k).toLowerCase() === "upgrade" ? "websocket" : null) } };
  const client = new ClientEnd();
  __nextClient = client; // palvelimen luoma WebSocketPair käyttää tätä selainpäänä
  Promise.resolve(worker.fetch(req, env)).then((r) => {
    if (r.webSocket !== client) { client._closed(); return; } // huone täynnä tms.
    setTimeout(() => client._opened(), 0);
  }, (e) => { console.warn("Offline-huone ei käynnistynyt:", e); client._closed(); });
  return client;
}
`;
fs.writeFileSync("offline.js", out);
console.log("offline.js rakennettu:", (out.length / 1024).toFixed(0), "kt");
