// OFFLINE-TILA: palvelimen pelilogiikka ajetaan selaimessa (rakennettu tiedostoista server/src/*.js, älä muokkaa käsin)
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
__m["map"] = (() => {

// ====== KARTTA: JOULUTORNI ======
// Kartat määritellään vain palvelimella. Palvelin lähettää kartan pelaajille liittyessä
// ja kartan vaihtuessa. Kaikki kartat kootaan tiedostossa maps.js.
// Tässä tiedostossa on myös renkaan kimpoilun laskenta (tireStep), joka on yhteinen kaikille kartoille.

// 60 m leveä (x) ja 150 m pitkä (z). Sininen base pohjoispäässä (+z), punainen eteläpäässä (-z).
const ARENA_X = 30;
const ARENA_Z = 75;

const B = [];
// Laatikko: keskipiste (x, z), leveys, syvyys, korkeus, väri, pohjan korkeus
const box = (x, z, w, d, h, color, y0 = 0) => B.push([x, z, w, d, h, color, y0]);
// Laatikko kulmapisteistä (helpompi seinille ja lattioille)
const rect = (x1, z1, x2, z2, y0, y1, color) => box((x1 + x2) / 2, (z1 + z2) / 2, x2 - x1, z2 - z1, y1 - y0, color, y0);
// Portaat: n askelmaa suuntaan (dx, dz), korkeudesta y0 korkeuteen y1
function stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color) {
  for (let i = 1; i <= n; i++) {
    const cx = x0 + dx * depth * (i - 0.5), cz = z0 + dz * depth * (i - 0.5);
    box(cx, cz, dx ? depth : width, dz ? depth : width, (y1 - y0) * i / n, color, y0);
  }
}

// --- Keskitorni: 14 x 14 m, neljä tasoa (maantaso, 1. kerros, 2. kerros, katto) ---
const WALL = 0x9ca3af, SLAB = 0x6b7280, STEPC = 0x8b8f99, F1 = 3.8, F2 = 7.3, ROOF = 10.8;
// Maantason seinät, ovet pohjois- ja eteläpäädyissä
for (const s of [-1, 1]) {
  rect(-7, s * 7 - 0.2, -1.5, s * 7 + 0.2, 0, 3.5, WALL);
  rect(1.5, s * 7 - 0.2, 7, s * 7 + 0.2, 0, 3.5, WALL);
  rect(s * 7 - 0.2, -6.8, s * 7 + 0.2, 6.8, 0, 3.5, WALL);
}
box(2.5, 0, 1.5, 1.5, 1, 0xa16207); // suojalaatikko sisällä
// Portaat maasta 1. kerrokseen (länsiseinän vierellä)
stairs(-5.35, -3, 0, 1, 2.5, 0, F1, 8, 0.75, STEPC);
// 1. kerroksen lattia, jossa aukko portaiden kohdalla
rect(-7, -7, -4.1, -3.5, 3.5, F1, SLAB);
rect(-7, 3, -4.1, 7, 3.5, F1, SLAB);
rect(-7, -3.5, -6.6, 3, 3.5, F1, SLAB);
rect(-4.1, -7, 7, 7, 3.5, F1, SLAB);
// 1. kerros: matalat kaiteet, pilarit ja leveät ikkuna-aukot
for (const s of [-1, 1]) {
  rect(-7, s * 7 - 0.2, 7, s * 7 + 0.2, F1, F1 + 1.0, WALL);
  rect(s * 7 - 0.2, -6.8, s * 7 + 0.2, 6.8, F1, F1 + 1.0, WALL);
  for (const t of [-1, 1]) box(s * 6.5, t * 6.5, 1, 1, 7.0 - F1, WALL, F1);
  box(0, s * 6.5, 1, 1, 7.0 - F1, WALL, F1);
}
// Portaat 1. kerroksesta 2. kerrokseen (itäseinän vierellä)
stairs(5.35, 3, 0, -1, 2.5, F1, F2, 7, 0.8, STEPC);
// 2. kerroksen lattia, jossa aukko portaiden kohdalla
rect(-7, -7, 4.1, 7, 7.0, F2, SLAB);
rect(4.1, -7, 7, -2.6, 7.0, F2, SLAB);
rect(4.1, 3.5, 7, 7, 7.0, F2, SLAB);
rect(6.6, -2.6, 7, 3.5, 7.0, F2, SLAB);
// 2. kerros: matalat kaiteet, pilarit ja ikkuna-aukot kuten 1. kerroksessa
for (const s of [-1, 1]) {
  rect(-7, s * 7 - 0.2, 7, s * 7 + 0.2, F2, F2 + 1.0, WALL);
  rect(s * 7 - 0.2, -6.8, s * 7 + 0.2, 6.8, F2, F2 + 1.0, WALL);
  for (const t of [-1, 1]) box(s * 6.5, t * 6.5, 1, 1, 10.5 - F2, WALL, F2);
  box(0, s * 6.5, 1, 1, 10.5 - F2, WALL, F2);
}
// Portaat 2. kerroksesta katolle (länsiseinän vierellä)
stairs(-5.35, -2.8, 0, 1, 2.5, F2, ROOF, 7, 0.8, STEPC);
// Katto, jossa aukko portaiden kohdalla
rect(-4.1, -7, 7, 7, 10.5, ROOF, SLAB);
rect(-7, -7, -4.1, -3.3, 10.5, ROOF, SLAB);
rect(-7, 2.8, -4.1, 7, 10.5, ROOF, SLAB);
rect(-7, -3.3, -6.6, 2.8, 10.5, ROOF, SLAB);
// Katon kaiteet
for (const s of [-1, 1]) {
  rect(-7, s * 7 - 0.2, 7, s * 7 + 0.2, ROOF, ROOF + 1.0, WALL);
  rect(s * 7 - 0.2, -6.8, s * 7 + 0.2, 6.8, ROOF, ROOF + 1.0, WALL);
}

// --- Muu kenttä: puolikas peilataan toiseen päätyyn, jotta päädyt ovat reilut ---
const MURU = 0x4b5563, CRATE = 0xa16207, CRATE2 = 0x92400e, PILLAR = 0x374151;
const half = [
  [-15, 0, 1, 8, 3, MURU],                                   // suojamuuri keskilinjalla
  [0, 20, 10, 1, 1.1, MURU],                                  // matala muuri (yli voi hypätä)
  [-12, 14, 2, 2, 1, CRATE], [12, 16, 2, 2, 1, CRATE], [-6, 26, 2, 2, 1, CRATE],
  [8, 30, 2, 2, 1, CRATE], [-18, 34, 2, 2, 1, CRATE], [20, 38, 2, 2, 1, CRATE],
  [20, 22, 3, 3, 2, CRATE2], [20, 24.5, 2, 2, 1, CRATE],     // laatikkopino: matalan kautta ylös
  [-20, 26, 3, 3, 2, CRATE2], [-20, 28.5, 2, 2, 1, CRATE],
  [0, 40, 12, 1, 3, MURU], [-15, 45, 1, 8, 3, MURU], [15, 45, 1, 8, 3, MURU],
  [-8, 36, 1.5, 1.5, 4, PILLAR], [10, 48, 1.5, 1.5, 4, PILLAR], [-22, 18, 1.5, 1.5, 4, PILLAR], [22, 30, 1.5, 1.5, 4, PILLAR],
];
for (const [x, z, w, d, h, c] of half) {
  box(x, z, w, d, h, c);
  if (x !== 0 || z !== 0) box(-x, -z, w, d, h, c); // peilikuva
}

// --- Tiimien basit päädyissä ---
// Base: matalat seinät kolmella sivulla, aukko keskustaa kohti, takana pöytä resepteille.
const BASES = {
  sininen: { z: 69, color: 0x3f6fd8 },
  punainen: { z: -69, color: 0xd8473f },
};
const BASE_RADIUS = 2.5; // reseptin tuontialueen säde base-keskuksen ympärillä
for (const [team, b] of Object.entries(BASES)) {
  const s = Math.sign(b.z), c = b.color;
  rect(-10.5, Math.min(s * 62.5, s * 75), -9.5, Math.max(s * 62.5, s * 75), 0, 3, c);   // vasen seinä
  rect(9.5, Math.min(s * 62.5, s * 75), 10.5, Math.max(s * 62.5, s * 75), 0, 3, c);    // oikea seinä
  rect(-10.5, Math.min(s * 62.5, s * 63.5), -3, Math.max(s * 62.5, s * 63.5), 0, 3, c); // etuseinä vasen
  rect(3, Math.min(s * 62.5, s * 63.5), 10.5, Math.max(s * 62.5, s * 63.5), 0, 3, c);   // etuseinä oikea (6 m oviaukko keskellä)
  box(0, s * 73, 3, 1, 0.9, 0x6b4a2e);                                                    // reseptipöytä
}
// --- Tähystystornit basejen vieressä: kapea 3 x 3 m torni, jonka ympäri portaat kiertävät ylös keskitornin katon korkeudelle ---
// Portaat: 4 sivua x 5 askelmaa + 4 kulma-askelmaa = 24 askelmaa, kukin 0,45 m.
function lookout(cx, cz, rot, color) {
  const T = (lx, lz) => [cx + rot * lx, cz + rot * lz];      // rot = -1 kääntää tornin 180 astetta (peilikuva)
  // Runko 4x4 m, portaat kiertävät sen ympäri kerran (23 askelmaa à 0,47 m). Askelma on 0,8 m syvä,
  // jotta leveäkin hahmo (Jari) mahtuu nousemaan. Lounaiskulma jää tyhjäksi = sisäänkäynti.
  const core = 2, w = 1.4, d = 0.8, rise = ROOF / 23;
  const put = (lx1, lz1, lx2, lz2, y1) => { const [a, b] = T(lx1, lz1), [c, d] = T(lx2, lz2); rect(Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d), 0, y1, STEPC); };
  rect(...(() => { const [a, b] = T(-core, -core), [c, d] = T(core, core); return [Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d)]; })(), 0, ROOF, color); // runko
  let k = 0;
  const step = (lx1, lz1, lx2, lz2) => put(lx1, lz1, lx2, lz2, rise * ++k);
  for (let i = 0; i < 5; i++) step(-core + i * d, -core - w, -core + (i + 1) * d, -core);   // etelä, itään päin
  step(core, -core - w, core + w, -core);                                                  // kaakkoiskulma
  for (let i = 0; i < 5; i++) step(core, -core + i * d, core + w, -core + (i + 1) * d);     // itä, pohjoiseen
  step(core, core, core + w, core + w);                                                    // koillinen
  for (let i = 0; i < 5; i++) step(core - (i + 1) * d, core, core - i * d, core + w);      // pohjoinen, länteen
  step(-core - w, core, -core, core + w);                                                  // luode
  for (let i = 0; i < 5; i++) step(-core - w, core - (i + 1) * d, -core, core - i * d);     // länsi, etelään -> huippu
  // Huipun kaiteet (aukko länsireunan eteläpäässä, josta portaat tulevat)
  const rail = (lx1, lz1, lx2, lz2) => { const [a, b] = T(lx1, lz1), [c, d] = T(lx2, lz2); rect(Math.min(a, c), Math.min(b, d), Math.max(a, c), Math.max(b, d), ROOF, ROOF + 1.0, WALL); };
  rail(-core, core - 0.2, core, core);      // pohjoinen
  rail(core - 0.2, -core, core, core);      // itä
  rail(0, -core, core, -core + 0.2);        // etelä (itäpuoli)
  rail(-core, 0, -core + 0.2, core);        // länsi (pohjoispuoli)
}
lookout(17, 66, 1, 0x3f6fd8);   // sinisen basen vieressä
lookout(-17, -66, -1, 0xd8473f); // punaisen basen vieressä

// Tiimien syntymäpaikat basen sisällä [x, z]
const TEAM_SPAWNS = {
  sininen: [[-6, 66], [6, 66], [-6, 70], [6, 70], [-7, 73], [7, 73]],
  punainen: [[-6, -66], [6, -66], [-6, -70], [6, -70], [-7, -73], [7, -73]],
};
// Resepti ilmestyy keskitornin katolle
const TOWER_RECIPE = [0, ROOF, 0];

// --- Grillit: [x, z]. Grilli on kiinteä este (näkymätön laatikko), malli piirretään pelissä. ---
const GRILLS = [
  [5.4, 0],                         // tornin maantasossa, 1. kerroksen portaiden alla
  [-12, 52],                        // pohjoispääty
  [12, -52],                        // eteläpääty
];
const GRILL_SIZE = [1.0, 0.95, 0.6]; // leveys (x), korkeus, syvyys (z)
for (const [x, z] of GRILLS) box(x, z, GRILL_SIZE[0], GRILL_SIZE[2], GRILL_SIZE[1], -1); // väri -1 = ei piirretä laatikkoa

// Valmis lista: [minX, minY, minZ, maxX, maxY, maxZ, väri]
const toMinMax = (list) => list.map(([x, z, w, d, h, color, y0, tex]) => {
  const b = [+(x - w / 2).toFixed(3), y0, +(z - d / 2).toFixed(3), +(x + w / 2).toFixed(3), +(y0 + h).toFixed(3), +(z + d / 2).toFixed(3), color];
  if (tex) b.push(tex); // pintakuvio (esim. "brick"), piirretään pelissä
  return b;
});

// Renkaan liike yhden askeleen (1/120 s) verran. Sama koodi on palvelimella (map.js) ja pelissä
// (index.html), jotta rengas kimpoilee molemmissa täsmälleen samaa reittiä.
// s = { p: [x, y, z], v: [vx, vy, vz], t }, R = RENGAS-asetukset, palauttaa 1 jos rengas kimposi seinästä.
function tireStep(s, boxes, R, AX, AZ) {
  const dt = 1 / 120, r = R.r, o = s.p, v = s.v;
  v[1] -= R.gravity * dt;
  const n = [o[0] + v[0] * dt, o[1] + v[1] * dt, o[2] + v[2] * dt];
  let wall = 0;
  const floor = (y) => {
    n[1] = y;
    if (v[1] >= 0) return;
    if (-v[1] < 2.5) { v[1] = 0; const f = Math.max(0, 1 - R.rollFriction * dt); v[0] *= f; v[2] *= f; } // vierii
    else { v[1] = -v[1] * R.groundBounce; v[0] *= R.groundKeep; v[2] *= R.groundKeep; }
  };
  const hitWall = (k, pos) => { n[k] = pos; v[k] = -v[k]; for (let i = 0; i < 3; i++) v[i] *= R.wallKeep; wall = 1; };
  if (n[1] < r) floor(r);
  for (const b of boxes) {
    if (n[0] <= b[0] - r || n[0] >= b[3] + r || n[1] <= b[1] - r || n[1] >= b[4] + r || n[2] <= b[2] - r || n[2] >= b[5] + r) continue;
    if (o[1] >= b[4] + r - 1e-6) floor(b[4] + r);                        // laatikon päälle
    else if (o[1] <= b[1] - r + 1e-6) { n[1] = b[1] - r; if (v[1] > 0) v[1] = -v[1] * 0.5; } // katto
    else if (o[0] <= b[0] - r + 1e-6) { if (v[0] > 0) hitWall(0, b[0] - r); else n[0] = b[0] - r; }
    else if (o[0] >= b[3] + r - 1e-6) { if (v[0] < 0) hitWall(0, b[3] + r); else n[0] = b[3] + r; }
    else if (o[2] <= b[2] - r + 1e-6) { if (v[2] > 0) hitWall(2, b[2] - r); else n[2] = b[2] - r; }
    else if (o[2] >= b[5] + r - 1e-6) { if (v[2] < 0) hitWall(2, b[5] + r); else n[2] = b[5] + r; }
    else floor(b[4] + r); // oli jo sisällä: nostetaan päälle
  }
  if (n[0] < -AX + r && v[0] < 0) hitWall(0, -AX + r); else if (n[0] > AX - r && v[0] > 0) hitWall(0, AX - r);
  if (n[2] < -AZ + r && v[2] < 0) hitWall(2, -AZ + r); else if (n[2] > AZ - r && v[2] > 0) hitWall(2, AZ - r);
  s.p = n;
  s.t = (s.t || 0) + dt;
  if (s.t * 1000 > R.lifeMs || (v[1] === 0 && Math.hypot(v[0], v[2]) < R.minSpeed)) s.done = true;
  return wall;
}

const JOULUTORNI = {
  id: "joulutorni",
  name: "Joulutorni",
  desc: "Pitkä kenttä, korkea keskitorni ja tähystystornit basejen vieressä.",
  x: ARENA_X, z: ARENA_Z, boxes: toMinMax(B), bases: BASES, baseRadius: BASE_RADIUS, spawns: TEAM_SPAWNS,
  recipe: TOWER_RECIPE, grills: GRILLS, grillSize: GRILL_SIZE,
  theme: { ground: "#5d6b4f", line: "#4c5841", sky: 0x9cc4e4, wall: 0x3b4252 },
};

return { toMinMax, tireStep, JOULUTORNI };
})();
__m["korjaamo"] = (() => {
const { toMinMax } = __m["map"];
// ====== KARTTA: DANIELIN AUTOKORJAAMO ======
// Z:n muotoinen kartta (TF2:n Sawmillin tapaan). Sininen base on vasemmassa yläkulmassa ja punainen
// oikeassa alakulmassa. Reitti kulkee basesta ylälaitaa pitkin, alas kujaa ja keskellä olevan
// ison korjaamohallin läpi. Resepti ilmestyy hallin lattialle keskelle.
// Hallissa on kaksi parvea (pohjoinen ja eteläinen). Kummallekin parvelle pääsee portaita kahdelta
// puolelta, ja parvelta pääsee ovesta ulos riippusiltaa pitkin torniin oman basen puolella.
// Kartta on pistesymmetrinen: jokainen este peilataan keskipisteen kautta toiselle puolelle.
//
// Laatikko: [minX, minY, minZ, maxX, maxY, maxZ, väri, pintakuvio]. Väri -1 = näkymätön este, jonka
// kuva piirretään erikseen (esim. rengaspino, tynnyri, puu). Pintakuviot ja koristeet piirtää peli.

const X = 36, Z = 56; // 72 m leveä, 112 m pitkä
const B = [], FLOORS = [], PROPS = [];
const box = (x, z, w, d, h, color, y0 = 0, tex) => B.push([x, z, w, d, h, color, y0, tex]);
const rect = (x1, z1, x2, z2, y0, y1, color, tex) => box((x1 + x2) / 2, (z1 + z2) / 2, x2 - x1, z2 - z1, y1 - y0, color, y0, tex);
// Este ja sen peilikuva (180° keskipisteen ympäri)
const both = (x1, z1, x2, z2, y0, y1, color, tex) => { rect(x1, z1, x2, z2, y0, y1, color, tex); rect(-x2, -z2, -x1, -z1, y0, y1, color, tex); };
function stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color, tex, extendLast) {
  for (let i = 1; i <= n; i++) {
    const cx = x0 + dx * depth * (i - 0.5), cz = z0 + dz * depth * (i - 0.5);
    let w = dx ? depth : width, d = dz ? depth : width, ox = 0, oz = 0;
    if (i === n && extendLast) { // ylin askelma jatkuu parven reunaan asti (etumerkki = suunta)
      if (dx) { d += Math.abs(extendLast); oz = extendLast / 2; } else { w += Math.abs(extendLast); ox = extendLast / 2; }
    }
    box(cx + ox, cz + oz, w, d, (y1 - y0) * i / n, color, y0, tex);
  }
}
const bothStairs = (x0, z0, dx, dz, width, y0, y1, n, depth, color, tex, ext) => {
  stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color, tex, ext);
  stairs(-x0, -z0, -dx, -dz, width, y0, y1, n, depth, color, tex, ext ? -ext : 0);
};
// Lattiat ja koristeet (vain kuvaa, ei törmäyksiä) peilikuvineen
const floor = (x1, z1, x2, z2, tex) => { FLOORS.push([x1, z1, x2, z2, tex]); FLOORS.push([-x2, -z2, -x1, -z1, tex]); };
const prop = (kind, ...a) => PROPS.push([kind, ...a]);
// Auto: kori, tummat ikkunat ja renkaat. ori = "x" tai "z" (pituussuunta)
function car(x, z, ori, color, y0 = 0) {
  const [hw, hl] = ori === "z" ? [0.9, 2.1] : [2.1, 0.9];
  const [cw, cl] = ori === "z" ? [0.8, 1.0] : [1.0, 0.8];
  rect(x - hw, z - hl, x + hw, z + hl, y0 + 0.3, y0 + 1.1, color, "paint");
  rect(x - cw, z - cl, x + cw, z + cl, y0 + 1.1, y0 + 1.65, 0x2b3440);
  rect(x - hw + 0.15, z - hl + 0.15, x + hw - 0.15, z + hl - 0.15, y0, y0 + 0.3, -1); // renkaiden kohta (este, ei kuvaa)
  prop("wheels", x, z, ori, y0, 1); // 1 = takapuskurissa "pösö"-logo
}
const bothCar = (x, z, ori, color, y0) => { car(x, z, ori, color, y0); car(-x, -z, ori, color, y0); };
// Rengaspino, öljytynnyri ja puu: näkymätön este + kuva
const tires = (x, z, n) => { rect(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0, n * 0.26, -1); prop("tires", x, z, n); };
const bothTires = (x, z, n) => { tires(x, z, n); tires(-x, -z, n); };
const barrel = (x, z, c) => { rect(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 0.9, -1); prop("barrel", x, z, c); };
const bothBarrel = (x, z, c) => { barrel(x, z, c); barrel(-x, -z, c); };
const tree = (x, z, s = 1) => { rect(x - 0.25, z - 0.25, x + 0.25, z + 0.25, 0, 3 * s, -1); prop("tree", x, z, s); };
const bothTree = (x, z, s) => { tree(x, z, s); tree(-x, -z, s); };
// Peilikuvassa seinään kiinnitetyt koristeet (ikkuna) kääntyvät myös 180°
const bothProp = (kind, x, z, ...a) => { prop(kind, x, z, ...a); prop(kind, -x, -z, ...(kind === "window" ? [a[0] + Math.PI, ...a.slice(1)] : a)); };

const BRICK = 0xa0583f, HALL = 0x9aa5ad, ROOFC = 0x6b747c, STEPC = 0x8b8f99, WOOD = 0x9a7349, YELLOW = 0xd9a520;
const CONT1 = 0x2f6b4f, CONT2 = 0xa0522d, BARRIER = 0xb8b2a6, RED = 0xb8322a;

// ===== Kentän muoto: kaksi isoa tiilirakennusta tekevät kentästä Z:n =====
both(-36, 14, -4, 36, 0, 8, BRICK, "brick");       // varastorakennus (sininen puoli), peilikuva punaisella
both(-36, 13.6, -4, 14, 0, 0.6, 0x6d6d6d, "concrete"); // sokkeli
// Ikkunat ja ovet varastojen seinissä (vain kuvaa)
for (let x = -32; x <= -8; x += 6) { bothProp("window", x, 13.95, Math.PI, 3.6); bothProp("window", x, 36.05, 0, 3.6); }
for (let z = 18; z <= 32; z += 7) bothProp("window", -3.95, z, Math.PI / 2, 3.6);

// ===== Iso korjaamohalli keskellä: 32 x 18 m, katto 9 m =====
const LOFT = 4.5; // parven lattian korkeus
// Pohjoisseinä: maantason ovi (x -10..-6) ja parven ovi ulos (x 8..10.5). Eteläseinä on peilikuva.
both(-16.2, 8.8, -10, 9.2, 0, 9, HALL, "metal");
both(-10, 8.8, -6, 9.2, 3.6, 9, HALL, "metal");
both(-6, 8.8, 8, 9.2, 0, 9, HALL, "metal");
both(8, 8.8, 10.5, 9.2, 0, LOFT, HALL, "metal");
both(8, 8.8, 10.5, 9.2, 7, 9, HALL, "metal");
both(10.5, 8.8, 16.2, 9.2, 0, 9, HALL, "metal");
// Päätyseinät: isot autotallinovet (6 m) keltaisine kehyksineen
both(15.8, -9.2, 16.2, -3, 0, 9, HALL, "metal");
both(15.8, 3, 16.2, 9.2, 0, 9, HALL, "metal");
both(15.8, -3, 16.2, 3, 5, 9, YELLOW, "metal");
rect(-16.2, -9.2, 16.2, 9.2, 9, 9.4, ROOFC, "metal"); // katto
// Parvi pohjoisseinällä (eteläinen on peilikuva)
both(-15.8, 4, 15.8, 8.8, LOFT - 0.3, LOFT, WOOD, "wood");
both(-15.8, 3.9, -13, 4.1, LOFT, LOFT + 0.95, YELLOW);   // kaide (aukot portaiden kohdalla)
both(-10, 3.9, 10, 4.1, LOFT, LOFT + 0.95, YELLOW);
both(13, 3.9, 15.8, 4.1, LOFT, LOFT + 0.95, YELLOW);
for (const px of [-8, 0, 8]) both(px - 0.15, 3.95, px + 0.15, 4.25, 0, LOFT - 0.3, 0x55595e, "metal"); // tukipilarit
// Portaat parvelle kahdelta puolelta: länsiportaat nousevat länteen, itäportaat itään
bothStairs(-3, 2.0, -1, 0, 2.0, 0, LOFT, 11, 0.8, STEPC, "metal", 1.0);
bothStairs(3, 2.0, 1, 0, 2.0, 0, LOFT, 11, 0.8, STEPC, "metal", 1.0);
// Riippusilta parven ovelta tornille (pohjoiseen) ja torni
both(8.2, 9.2, 10.3, 21.6, LOFT - 0.25, LOFT, WOOD, "wood");
both(7.95, 9.2, 8.1, 21.6, LOFT, LOFT + 0.9, 0x8a6a3a);     // köysikaiteet (estävät putoamisen)
both(10.4, 9.2, 10.55, 21.6, LOFT, LOFT + 0.9, 0x8a6a3a);
prop("bridge", 9.25, 9.2, 9.25, 21.6, LOFT); prop("bridge", -9.25, -9.2, -9.25, -21.6, LOFT);
both(6.8, 21.6, 11.7, 26.4, LOFT - 0.3, LOFT, WOOD, "wood");  // tornin taso
for (const [px, pz] of [[7, 21.8], [11.5, 21.8], [7, 26.2], [11.5, 26.2]]) both(px - 0.2, pz - 0.2, px + 0.2, pz + 0.2, 0, LOFT - 0.3, 0x6b4a2e, "wood");
both(6.8, 26.1, 11.7, 26.4, LOFT, LOFT + 1.1, WOOD, "wood");   // suojaseinät
both(6.8, 21.6, 7.1, 26.1, LOFT, LOFT + 1.1, WOOD, "wood");
both(6.8, 21.6, 8.1, 21.9, LOFT, LOFT + 1.1, WOOD, "wood");
both(10.4, 21.6, 11.7, 21.9, LOFT, LOFT + 1.1, WOOD, "wood");
bothStairs(12.6, 31, 0, -1, 1.8, 0, LOFT, 11, 0.8, WOOD, "wood"); // portaat maasta tornille
// Hallin sisustus: autonostimet parvien alla, työkalukaapit, työpöydät, rengaspinot ja lamput
for (const s of [1, -1]) {
  const cz = s * 6.4;
  const cx = -3 * s;
  for (const px of [-1.8, 1.8]) for (const pz of [-1.1, 1.1]) rect(cx + px - 0.12, cz + pz - 0.12, cx + px + 0.12, cz + pz + 0.12, 0, 2.0, YELLOW, "metal");
  car(cx, cz, "x", s > 0 ? 0x2aa198 : 0x8b2f2f, 1.9);
}
both(4.2, 5.4, 5.8, 8.8, 0, 1.0, WOOD, "wood");          // työpöytä
both(-15.6, 7.9, -13.4, 8.8, 0, 1.7, RED, "metal");      // työkalukaapit
both(-13.2, 7.9, -11.6, 8.8, 0, 1.2, RED, "metal");
both(11.5, 7.9, 13.5, 8.8, 0, 2.0, 0x3a6ea5, "metal");   // varaosahylly
car(9.5, 6.4, "x", 0xd0a020); car(-9.5, -6.4, "x", 0xd0a020); // korjattava auto
bothProp("hoist", 12.6, 5.6);                            // moottorinosturi
bothTires(14.6, 6.2, 4); bothTires(14.6, 5.2, 3); bothTires(-14.8, 0.5, 2);
bothBarrel(-15.3, -3.6, 0x1e5aa8); bothBarrel(-14.6, -3.9, 0x1e5aa8);
for (const x of [-11, 0, 11]) for (const z of [-2, 2]) prop("lamp", x, 8.6, z);
prop("sign", 0, 7.4, 9.25, 0, "DANIELIN AUTOKORJAAMO", 9, 1.2);
prop("sign", 0, 7.4, -9.25, Math.PI, "DANIELIN AUTOKORJAAMO", 9, 1.2);
floor(-16, -9, 16, 9, "concrete");
bothProp("oil", 2.5, 1, 1.2); bothProp("oil", -6, 3, 0.8);

// ===== Basit: sininen vasemmassa yläkulmassa, ovi itään. Punainen on peilikuva. =====
const BASES = {
  sininen: { x: -27, z: 48, color: 0x3f6fd8, table: [-34, 48, "z"], door: [1, 0] },
  punainen: { x: 27, z: -48, color: 0xd8473f, table: [34, -48, "z"], door: [-1, 0] },
};
both(-36, 40, -17, 41, 0, 3.2, 0x3f6fd8, "brick");
both(-18, 41, -17, 45, 0, 3.2, 0x3f6fd8, "brick");
both(-18, 51, -17, 56, 0, 3.2, 0x3f6fd8, "brick");
// (peilikuvassa seinät ovat punaisella puolella; värjätään ne punaisiksi)
for (const b of B.slice(-6)) if (b[1] < 0) b[5] = 0xd8473f;
both(-34.5, 46.5, -33.5, 49.5, 0, 0.9, 0x6b4a2e, "wood"); // reseptipöytä
floor(-36, 40, -17, 56, "tiles");
const SPAWNS = {
  sininen: [[-31, 43], [-31, 53], [-23, 43], [-23, 53], [-21, 48], [-30, 48]],
  punainen: [[31, -43], [31, -53], [23, -43], [23, -53], [21, -48], [30, -48]],
};

// ===== Ylälaita (sininen) ja alalaita (punainen): parkkipaikka, tankkauspiste, hinausauto =====
for (const [x, c] of [[2, 0xb03a2e], [7, 0x6d6d6d], [17, 0x3d5a80], [22, 0xd0a020], [31, 0x2e7d8c]]) car(x, 51.5, "z", c), car(-x, -51.5, "z", c);
for (let x = -0.5; x <= 34; x += 5) bothProp("lines", x, 51.5, 0.12, 4.6);
floor(-16, 54, 36, 56, "grass");
for (const x of [-12, 12, 26]) bothTree(x, 55, 1.1);
bothProp("bush", -6, 55.2, 1); bothProp("bush", 4.5, 55.2, 0.9); bothProp("bush", 34.5, 55, 1.2);
// Tankkauspiste katoksineen
both(21, 42.5, 28, 45.5, 0, 0.25, 0xb9b4aa, "concrete");
both(22.6, 43.6, 23.4, 44.4, 0.25, 1.9, RED, "metal"); both(25.6, 43.6, 26.4, 44.4, 0.25, 1.9, RED, "metal");
for (const [px, pz] of [[21.3, 42.8], [27.7, 42.8], [21.3, 45.2], [27.7, 45.2]]) both(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 0.25, 4.4, 0xdddddd, "metal");
both(20.5, 42, 28.5, 46, 4.4, 4.7, 0xf2f2f2, "metal");
// NistiPiha-kuorma-auto (maansiirtoauto): ohjaamo, nosturi ja avolava vihreillä laidoilla.
// Törmäyslaatikot ovat näkymättömiä, ja itse auton piirtää peli ("truck"-koriste).
// Lavalle pääsee takaa rengaspinoja pitkin hyppimällä, ja laidat suojaavat lavalla olijaa.
function truck(cx, cz, s) { // s = 1: ohjaamo lännessä (-x), s = -1: peilikuva
  const R = (x1, z1, x2, z2, y0, y1) => rect(Math.min(cx + s * x1, cx + s * x2), Math.min(cz + s * z1, cz + s * z2), Math.max(cx + s * x1, cx + s * x2), Math.max(cz + s * z1, cz + s * z2), y0, y1, -1);
  R(-6, -1.8, -3, 1.8, 0, 3.2);        // ohjaamo
  R(-3, -1.8, 6, 1.8, 0, 1.3);         // lavan pohja ja runko
  R(-3, -1.8, 6, -1.55, 1.3, 2.7);     // sivulaidat
  R(-3, 1.55, 6, 1.8, 1.3, 2.7);
  R(5.75, -1.55, 6, 1.55, 1.3, 2.7);   // takalaita
  R(-3, -1.55, -2.6, 1.55, 1.3, 2.7);  // etulaita (nosturin kohdalla)
  prop("truck", cx, cz, s > 0 ? 0 : Math.PI);
}
truck(2.6, 41, 1); truck(-2.6, -41, -1);
bothTires(9.1, 42.1, 4); bothTires(9.1, 41.1, 6); // rengaspinoja pitkin lavalle
// Rengasmuuri suojaksi ja tynnyrit
for (const [x, z] of [[-11, 44], [-10.1, 44], [-9.2, 44], [-11, 44.9], [-10.1, 44.9]]) bothTires(x, z, x === -10.1 && z === 44 ? 4 : 3);
bothBarrel(13, 38.2, 0xb03030); bothBarrel(13.7, 38.6, 0xb03030); bothBarrel(13.3, 39.3, 0x1e5aa8);
bothProp("oil", 9, 46, 1.4); bothProp("oil", -6, 49, 1);

// ===== Kuja ylälaidasta keskelle (x -4..36, z 14..36): kontit, romukasa, puita =====
both(26, 17, 28.6, 23, 0, 2.6, CONT1, "metal");
both(29, 17, 31.6, 23, 0, 2.6, CONT2, "metal");
both(29, 17.5, 31.6, 22.5, 2.6, 5.2, CONT1, "metal");
// Kontin katolle: rengaspinoja ja laatikoita pitkin hyppimällä
bothTires(25.4, 23.6, 2); bothTires(25.4, 22.6, 4); bothTires(25.4, 21.6, 6); bothTires(25.45, 20.6, 8);
both(26, 21.7, 27.3, 23, 2.6, 3.5, 0xa16207, "wood");
both(27.3, 21.7, 28.6, 23, 2.6, 4.4, 0x92400e, "wood");
bothCar(20, 28, "x", 0x8b2f2f); bothCar(-1, 22, "z", 0x6d6d6d);
both(17, 33.5, 21, 34.1, 0, 0.9, BARRIER, "concrete"); both(-2.5, 30, 1.5, 30.6, 0, 0.9, BARRIER, "concrete");
both(32, 29, 35.6, 34, 0, 1.4, 0x6f6a62, "metal");   // romukasa
bothProp("scrap", 33.8, 31.5);
floor(4, 17, 16, 35, "gravel");
floor(-4, 14, -1.2, 36, "grass");
for (const z of [16.5, 25, 33.5]) bothTree(-2.6, z, 1);
bothProp("bush", -2.6, 20.5, 0.9); bothProp("bush", -2.6, 29, 1.1);
bothProp("oil", 22, 20, 1.3);

// ===== Keskikaista hallin molemmin puolin (z -14..14): grillit, romuautot, tunkit =====
car(24, 8, "z", 0x6d6d6d, 0.5); car(-24, -8, "z", 0x6d6d6d, 0.5); // auto pukeilla
for (const [px, pz] of [[23.3, 6.5], [24.7, 6.5], [23.3, 9.5], [24.7, 9.5]]) both(px - 0.15, pz - 0.15, px + 0.15, pz + 0.15, 0, 0.5, 0x444444, "metal");
bothCar(31, -6, "z", 0x2e7d8c);
both(19, -11, 23, -10.4, 0, 0.9, BARRIER, "concrete");
both(19, 11.6, 22, 12.4, 0, 1.0, WOOD, "wood");      // lavapino
bothTires(33.5, 12.5, 4); bothTires(34.4, 12.5, 3); bothTires(33.5, 11.6, 2);
bothBarrel(29.5, 1.5, 0x1e5aa8); bothBarrel(30.2, 1.9, 0xb03030);
floor(17, -14, 36, -12, "grass");
bothTree(35, -13, 1.2); bothTree(17.5, -13, 1);
bothProp("bush", 26, -13.2, 1.1);
bothProp("oil", 27, -2, 1.5); bothProp("oil", 20, 4, 0.9);
// Pohjoiskuja hallin ja varaston välissä
for (const x of [-30, -20]) bothProp("bush", x, 13, 1);
bothProp("flowers", -25, 13.2); bothProp("flowers", -15, 13.2);

// NistiPiha-noutosäkit siellä täällä (näkymätön este + kuva)
const sack = (x, z, rot) => { rect(x - 0.5, z - 0.5, x + 0.5, z + 0.5, 0, 1.0, -1); prop("sack", x, z, rot); };
for (const [x, z, r] of [[10.4, 38.6, 0.3], [11.5, 38.9, -0.2], [-7, 37.8, 0.1], [33.6, 26.4, 0.5], [18.6, 15.6, -0.4], [20.6, -6.6, 0.2], [-14.6, 6.4, 0], [33.8, 44.5, 0.7]]) {
  sack(x, z, r); sack(-x, -z, r + Math.PI);
}

// Grillit kummallakin pihalla
// Pihvigrillien tilalla Posso-munkkikojut (munkki antaa saman elämälisän). [x, z, y, kääntö]
const GRILLS = [[26, -4, 0, Math.PI], [-26, 4, 0, 0]];
const GRILL_SIZE = [1.4, 2.6, 2.2]; // leveys x, korkeus, syvyys z
for (const [x, z] of GRILLS) box(x, z, GRILL_SIZE[0], GRILL_SIZE[2], GRILL_SIZE[1], -1);

// ===== Kotka kentän ympärillä (vain kuvaa, kentän ulkopuolella) =====
// Itäinen pitkä sivu: meri, Kotkan meripäivien iso purjelaiva ja muita veneitä, majakka ja saaret
prop("sea", 37.5, -800, 900, 800, -1.2);
prop("tallship", 78, 8, 0, 1);                 // täystakiloitu purjelaiva rannan suuntaisesti
prop("tallship", 150, -70, 0.35, 0.75);        // toinen, kauempana
for (const [x, z, r, c] of [[52, -40, 0.4, 0xffffff], [60, 55, 2.1, 0xd8473f], [110, 90, 1.2, 0xffffff], [95, -110, 2.8, 0x3f6fd8], [170, 30, 0.9, 0xffffff]]) prop("sailboat", x, z, r, c);
prop("lighthouse", 230, 130);
for (const [x, z, w, d] of [[300, -60, 90, 50], [380, 120, 120, 70], [260, 200, 60, 40], [420, -180, 140, 80]]) prop("island", x, z, w, d);
for (let z = -52; z <= 52; z += 8) prop("bollard", 37.2, z);
// Läntinen pitkä sivu: Sunila (Aallon valkoiset talot männikössä), aita estää pääsyn
prop("groundplane", -500, -800, -37.5, 800, "grass", 0.01);
prop("sunila", -38, 0);
prop("sign", -38.2, 3.4, 0, Math.PI / 2, "SUNILA", 6, 1.3);
prop("sign", -38.2, 3.4, -40, Math.PI / 2, "SUNILA", 6, 1.3);
prop("sign", -38.2, 3.4, 40, Math.PI / 2, "SUNILA", 6, 1.3);
// Pohjoispääty: Kotkansaaren kerrostaloja ja punatiilinen Kotkan kirkko; eteläpääty: satama nostureineen
prop("groundplane", -500, 56.5, 900, 800, "asphalt", 0.02);
prop("groundplane", -500, -800, 900, -56.5, "asphalt", 0.02);
prop("city", 0, 70);
prop("brickchurch", -10, 140);
prop("port", 0, -70);

const KORJAAMO = {
  id: "korjaamo",
  name: "Danielin autokorjaamo",
  desc: "Kerää pösön renkaita! Z:n muotoinen kartta: iso korjaamohalli, parvet, riippusillat ja tornit.",
  x: X, z: Z, boxes: toMinMax(B), bases: BASES, baseRadius: 2.5, spawns: SPAWNS,
  recipe: [0, 0, 0], recipeWhere: "hallissa", recipeTo: "halliin", item: "rengas",
  grills: GRILLS, grillSize: GRILL_SIZE, floors: FLOORS, props: PROPS,
  grillKind: "munkki",
  // Reunat: [etelä, pohjoinen, länsi, itä]. Itäreunalla matala laiturikaide, jotta meri näkyy;
  // länsireunalla Sunilan puolella kiviaita ja rautaaita. Pelaaja ei pääse reunojen yli.
  theme: { ground: "#3f4246", line: "#474a4f", groundTex: "asphalt", sky: 0xa8c8e8, wall: 0x6b5e4e, fogNear: 120, fogFar: 700,
           walls: [{ h: 3, color: 0x55606a, tex: "metal" }, { h: 3, color: 0xa0583f, tex: "brick" }, { h: 1.3, color: 0x8f8a80, tex: "stone", bars: 2.6 }, { h: 1.0, color: 0x8a8f96, tex: "concrete", quay: true }] },
};

return { KORJAAMO };
})();
__m["alppikyla"] = (() => {
const { toMinMax } = __m["map"];
// ====== KARTTA: OLAVIN ALPPIKYLÄ ======
// Joki virtaa kentän poikki keskellä (z -7..7), ja sen yli kulkee kivisilta. Resepti ilmestyy sillalle.
// Kylä on jokea korkeammalla (2,5 m) ja basit vielä ylempänä tasanteilla (5 m). Jokeen voi kävellä
// veden alle ja nousta toiselle puolelle rantaportaita pitkin. Sillan alta lähtee kumpaankin suuntaan
// viemäritunneli, joka nousee pintaan vastapuolen basen tasanteen juurella.
// Kummallakin rannalla on kirkko, jonka kellotorniin pääsee kierreportaita (tähystyspaikka Jarmolle).
// Mäellä on laidun lehmineen. Grilleissä on pihvien sijaan alppijuustoa.
// Basen ja sillan välissä on kallioinen kukkula, jonka ympäri polut kiemurtelevat sillalle.
// Kukkula estää näkemästä suoraan basesta vastustajan baseen.
// Tässä kartassa kerätään reseptien sijaan lampaita (sama pelimekaniikka).
// Kartta on pistesymmetrinen: jokainen este peilataan keskipisteen kautta toiselle puolelle.

const X = 34, Z = 62;     // 68 m leveä, 124 m pitkä
const T = 2.5;            // kylän taso (joen pohja on 0)
const P = 5.0;            // basien tasanne
const WATER = 2.0;        // vedenpinta
const B = [], FLOORS = [], PROPS = [];
const box = (x, z, w, d, h, color, y0 = 0, tex) => B.push([x, z, w, d, h, color, y0, tex]);
const rect = (x1, z1, x2, z2, y0, y1, color, tex) => box((x1 + x2) / 2, (z1 + z2) / 2, x2 - x1, z2 - z1, y1 - y0, color, y0, tex);
const both = (x1, z1, x2, z2, y0, y1, color, tex) => { rect(x1, z1, x2, z2, y0, y1, color, tex); rect(-x2, -z2, -x1, -z1, y0, y1, color, tex); };
function stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color, tex) {
  for (let i = 1; i <= n; i++) {
    const cx = x0 + dx * depth * (i - 0.5), cz = z0 + dz * depth * (i - 0.5);
    box(cx, cz, dx ? depth : width, dz ? depth : width, (y1 - y0) * i / n, color, y0, tex);
  }
}
const bothStairs = (x0, z0, dx, dz, width, y0, y1, n, depth, color, tex) => {
  stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color, tex);
  stairs(-x0, -z0, -dx, -dz, width, y0, y1, n, depth, color, tex);
};
const prop = (kind, ...a) => PROPS.push([kind, ...a]);
// Koriste ja sen peilikuva: sijainti peilataan ja kiertokulma käännetään 180°.
// RECT = koristeet, joiden alussa on suorakulmio [x1, z1, x2, z2]; XYZ = koristeet muotoa [x, y, z, ...].
const RECT = new Set(["roof", "fence", "pool", "drain"]), XYZ = new Set(["lamp", "sign"]);
const ROT = { window: 2, archwin: 2, door: 2, sheep: 3, bench: 3, hay: 3, skis: 3, balcony: 4, sign: 3 }; // kiertokulman paikka
const bothProp = (kind, ...a) => {
  prop(kind, ...a);
  const m = a.slice();
  if (RECT.has(kind)) { m[0] = -a[2]; m[1] = -a[3]; m[2] = -a[0]; m[3] = -a[1]; }
  else if (XYZ.has(kind)) { m[0] = -a[0]; m[2] = -a[2]; }
  else { m[0] = -a[0]; m[1] = -a[1]; }
  if (ROT[kind] !== undefined) m[ROT[kind]] = (a[ROT[kind]] || 0) + Math.PI;
  prop(kind, ...m);
};
// Lattiapinta (kuvio) korkeudella y ja sen peilikuva
const floor = (x1, z1, x2, z2, tex, y = 0) => { FLOORS.push([x1, z1, x2, z2, tex, y]); FLOORS.push([-x2, -z2, -x1, -z1, tex, y]); };

// ===== Pehmeä maasto =====
// Kumpareet, rinteet ja pyöristetyt reunat lasketaan korkeusfunktioista. Törmäyksiä varten maasto
// pilkotaan 0,5 m:n näkymättömiksi pylväiksi (pelaaja nousee loivaa rinnettä kuin portaita, STEP 0,55),
// ja peli piirtää päälle sileän pinnan (TERRAIN-laikut). Molemmat syntyvät samoista funktioista.
const TCELL = 0.5, TERRAIN = [];
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
// Laikku: alue, pohjan korkeus (pylväät alkavat siitä) ja pinnan korkeus f(x, z) (NaN = ei maastoa tässä)
function terrainPatch(x1, z1, x2, z2, base, f) {
  const nx = Math.round((x2 - x1) / TCELL) + 1, nz = Math.round((z2 - z1) / TCELL) + 1;
  const H = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const v = f(x1 + i * TCELL, z1 + j * TCELL); H.push(Number.isFinite(v) ? Math.round(v * 100) : null); }
  const mirror = H.slice().reverse(); // pistepeilaus: (x, z) -> (-x, -z)
  TERRAIN.push({ x0: x1, z0: z1, cell: TCELL, nx, nz, h: H }, { x0: -x2, z0: -z2, cell: TCELL, nx, nz, h: mirror });
  // Pylväät: ruudun korkeus = matalin kulma (pelaaja ei leiju rinteessä), pyöristys 5 cm alaspäin
  const rows = [];
  for (let j = 0; j < nz - 1; j++) {
    const row = [];
    for (let i = 0; i < nx - 1; i++) {
      const c = [H[j * nx + i], H[j * nx + i + 1], H[(j + 1) * nx + i], H[(j + 1) * nx + i + 1]];
      const h = c.some((v) => v === null) ? null : Math.floor(Math.min(...c) / 5) * 5 / 100;
      row.push(h !== null && h > base + 0.02 ? h : null);
    }
    rows.push(row);
  }
  // Yhdistetään vierekkäiset samankorkuiset ruudut suorakulmioiksi
  const used = rows.map((r) => r.map(() => false));
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) {
    const h = rows[j][i]; if (h === null || used[j][i]) continue;
    let w = 1; while (i + w < rows[j].length && rows[j][i + w] === h && !used[j][i + w]) w++;
    let d = 1; while (j + d < rows.length && rows[j + d].slice(i, i + w).every((v, k) => v === h && !used[j + d][i + k])) d++;
    for (let jj = j; jj < j + d; jj++) for (let ii = i; ii < i + w; ii++) used[jj][ii] = true;
    both(x1 + i * TCELL, z1 + j * TCELL, x1 + (i + w) * TCELL, z1 + (j + d) * TCELL, base, h, -1);
  }
}

const TURF = 0x8fae6a, ROCK = 0x8a8578, STONE = 0x9d978b, PLASTER = 0xf1ece0, WOOD = 0x8a5a33, DARKWOOD = 0x5c3a20, ROOFRED = 0x8e3b2e;

// ===== Maasto (sininen puoli z > 0, peilikuva punaiselle) =====
// Kylän taso joen molemmin puolin; keskellä viemäritunneli maan alla
// Joen penkka: alaosa on pystysuora kallio (1,6 m, vedestä ei pääse hyppäämällä ylös), yläreuna pyöristyy
// kylän tasolle 2 m matkalla. Sillan ja rantaportaiden kohdalla penkka on ennallaan.
const BANK = 1.6, BANK_W = 2;
const bankFull = [[-3, -1.2], [1.2, 3], [6.5, 9.5], [-23.5, -20.5], [24.5, 27.5]]; // silta ja rantaportaat
const inBankFull = (x) => bankFull.some(([a, b]) => x > a - 1e-6 && x < b + 1e-6);
const strictlyIn = (x, list) => list.some(([a, b]) => x > a + 1e-6 && x < b - 1e-6); // pinta ulottuu reunaan asti
both(-34, 7 + BANK_W, -1.2, 47, 0, T, TURF, "turf");
both(1.2, 7 + BANK_W, 34, 47, 0, T, TURF, "turf");
{
  const cuts = [-34, ...bankFull.flat(), 34].sort((a, b) => a - b);
  for (let k = 0; k < cuts.length - 1; k++) {
    const a = cuts[k], b = cuts[k + 1], mid = (a + b) / 2;
    if (b - a < 1e-6 || (mid > -1.2 && mid < 1.2)) continue; // tunnelin kohta katetaan erikseen
    if (inBankFull(mid)) both(a, 7, b, 7 + BANK_W, 0, T, TURF, "turf");
    else both(a, 7, b, 7 + BANK_W, 0, BANK, ROCK, "rock");
  }
}
terrainPatch(-34, 7, 34, 7 + BANK_W, BANK, (x, z) => (strictlyIn(x, bankFull) || Math.abs(x) < 3 - 1e-6 ? NaN : BANK + (T - BANK) * Math.sin((Math.PI / 2) * ((z - 7) / BANK_W))));
both(-1.2, 7, 1.2, 38, 2.2, T, TURF, "turf");      // tunnelin katto (tunnelin korkeus 2,2 m)
both(-1.2, 44, 1.2, 47, 0, T, TURF, "turf");
bothStairs(0, 40, 0, 1, 2.4, 0, T, 5, 0.8, STONE, "stone"); // tunnelista ylös (z 40..44)
// Aukko on 2 m portaita pidempi, jotta pisinkin hahmo (Juha 195 cm) mahtuu portailta tunneliin
both(-1.5, 37.7, 1.5, 38, T, T + 0.9, STONE, "stone"); // kaiteet aukon ympärillä
both(-1.5, 38, -1.2, 44, T, T + 0.9, STONE, "stone");
both(1.2, 38, 1.5, 44, T, T + 0.9, STONE, "stone");
for (let z = 12; z <= 36; z += 8) bothProp("lamp", 0, 2.05, z);  // viemärin lamput
bothProp("drain", -0.45, 7, 0.45, 39);                       // viemärin pohjalla valuva vesi
// Basien tasanne ja portaat sinne
both(-34, 47, 34, 62, 0, P, TURF, "turf");
for (const x of [-10, 10, 28]) bothStairs(x, 41, 0, 1, 4, T, P, 6, 1.0, STONE, "stone");
// Tasanteen reuna: pystysuora kallio 1,6 m ja pyöristyvä nurmireuna ylös (portaiden kohdalla ei)
const EMB = 45.2, stairX = [[-12, -8], [8, 12], [26, 30]];
const inStairs = (x) => stairX.some(([a, b]) => x > a - 1e-6 && x < b + 1e-6);
{
  const cuts = [-34, ...stairX.flat(), 34].sort((a, b) => a - b);
  for (let k = 0; k < cuts.length - 1; k++) if (!inStairs((cuts[k] + cuts[k + 1]) / 2)) both(cuts[k], EMB, cuts[k + 1], 47, T, T + BANK, ROCK, "rock");
}
terrainPatch(-34, EMB, 34, 47, T + BANK, (x, z) => (strictlyIn(x, stairX) ? NaN : T + BANK + (P - T - BANK) * Math.sin((Math.PI / 2) * Math.min(1, (z - EMB) / (47 - EMB)))));

// ===== Joki ja silta =====
// Joen pohja on maan tasolla (y 0). Vedenpinta 2,0 m: kävelijä menee kokonaan veden alle.
prop("water", -X, -7, X, 7, WATER, 1);
for (const x of [8, -22, 26]) bothStairs(x, 3, 0, 1, 2.2, 0, T, 5, 0.8, STONE, "stone"); // rantaportaat
both(13, 1.8, 15, 3.4, 0, 1.0, ROCK, "rock");      // kiviä joessa
both(-27, 3.5, -25.5, 5, 0, 1.4, ROCK, "rock");
both(20, -5.5, 21.2, -4.3, 0, 0.8, ROCK, "rock");
// Kivisilta: kansi 3,2 m, matalat kaiteet, luiskat kylän tasolta
rect(-3, -7.5, 3, 7.5, 2.6, 3.2, STONE, "stone");
rect(-3, -7.5, -2.6, 7.5, 3.2, 4.0, STONE, "stone");
rect(2.6, -7.5, 3, 7.5, 3.2, 4.0, STONE, "stone");
both(-3, 8.25, 3, 9, T, T + 0.35, STONE, "stone");
both(-3, 7.5, 3, 8.25, T, 3.2, STONE, "stone");
prop("arch", 0, 0, 7, 2.6);                        // kaari sillan alla (vain kuvaa)
floor(-3, 9, 3, 13, "cobble", T);  // sillan pää

// Harjakaton päällä voi kävellä: katon muotoinen näkymätön este 0,5 m:n kaistoina (ei pudota katon sisään).
// axis 0: harja z-suunnassa (lappeet x-suuntaan), axis 1: harja x-suunnassa.
function roofSolid(x1, z1, x2, z2, y, h, axis) {
  const lo = axis ? z1 : x1, W = axis ? z2 - z1 : x2 - x1, c = lo + W / 2, n = Math.ceil(W / 0.5);
  for (let i = 0; i < n; i++) {
    const a = lo + (i * W) / n, b = lo + ((i + 1) * W) / n, d = Math.max(Math.abs(a - c), Math.abs(b - c));
    const top = y + h * (1 - d / (W / 2)) + 0.06;
    if (top - y < 0.05) continue;
    axis ? both(x1, a, x2, b, y, top, -1) : both(a, z1, b, z2, y, top, -1);
  }
}
function roof(x1, z1, x2, z2, y, h, color, axis) { bothProp("roof", x1, z1, x2, z2, y, h, color, axis); roofSolid(x1, z1, x2, z2, y, h, axis); }

// ===== Kirkko kummallakin rannalla: kellotornissa kierreportaat tähystyspaikalle =====
function church(cx, cz) { // sinisen kirkko; peilikuva tehdään samalla
  const R = (x1, z1, x2, z2, y0, y1, color, tex) => both(cx + x1, cz + z1, cx + x2, cz + z2, y0, y1, color, tex);
  const TOP = T + 10.2; // kellotapulin lattia
  // Tornin seinät (ulkomitta 4,8 m), ovi lounaiskulmassa
  R(-2.4, -2.4, -2, -2, T, TOP + 1, STONE, "stone");
  R(-2, -2.4, -0.6, -2, T + 2.4, TOP + 1, STONE, "stone");
  R(-0.6, -2.4, 2.4, -2, T, TOP + 1, STONE, "stone");
  R(-2.4, 2, 2.4, 2.4, T, TOP + 1, STONE, "stone");
  R(-2.4, -2, -2, 2, T, TOP + 1, STONE, "stone");
  R(2, -2, 2.4, 2, T, TOP + 1, STONE, "stone");
  R(-0.6, -0.6, 0.6, 0.6, T, TOP, STONE, "stone"); // keskipilari
  // Kierreportaat: 23 askelmaa vastapäivään, joka kierroksella 8 askelmaa
  const seq = [[-0.6, -2, 0.6, -0.6], [0.6, -2, 2, -0.6], [0.6, -0.6, 2, 0.6], [0.6, 0.6, 2, 2], [-0.6, 0.6, 0.6, 2], [-2, 0.6, -0.6, 2], [-2, -0.6, -0.6, 0.6], [-2, -2, -0.6, -0.6]];
  const n = 23, rise = (TOP - T) / n;
  for (let k = 1; k <= n; k++) {
    const [x1, z1, x2, z2] = seq[(k - 1) % 8], h = T + k * rise;
    R(x1, z1, x2, z2, h - 0.35, h, DARKWOOD, "wood");
  }
  R(-2, -2, 0.6, -0.6, TOP - 0.35, TOP, DARKWOOD, "wood"); // kellotapulin lattia portaiden yläpäässä
  // Kellotapuli: kulmapilarit ja katto, kaiteena tornin seinät (1 m)
  for (const [px, pz] of [[-2.4, -2.4], [1.6, -2.4], [-2.4, 1.6], [1.6, 1.6]]) R(px, pz, px + 0.8, pz + 0.8, TOP + 1, TOP + 2.8, STONE, "stone");
  R(-2.6, -2.6, 2.6, 2.6, TOP + 2.8, TOP + 3.2, ROOFRED);
  bothProp("spire", cx, cz, TOP + 3.2, 2.6, 5);
  bothProp("bell", cx, cz, TOP + 2.2);
  // Kirkkosali tornin takana (kiinteä rakennus, harjakatto)
  R(-3.5, 2.4, 3.5, 13.5, T, T + 6.5, PLASTER, "plaster");
  roof(cx - 3.8, cz + 2.4, cx + 3.8, cz + 13.8, T + 6.5, 3.2, ROOFRED, 0);
  for (const dz of [5, 8.5, 12]) { bothProp("archwin", cx - 3.52, cz + dz, -Math.PI / 2, T + 3.4); bothProp("archwin", cx + 3.52, cz + dz, Math.PI / 2, T + 3.4); }
  bothProp("door", cx - 1.3, cz - 2.42, Math.PI, T);
}
church(-16, 12.5);

// ===== Kylä (sininen puoli) =====
// Talot: kiinteät rakennukset, puu- tai rappauspinta ja harjakatto
function house(x1, z1, x2, z2, h, wall, tex, axis) {
  both(x1, z1, x2, z2, T, T + h, wall, tex);
  roof(x1 - 0.5, z1 - 0.5, x2 + 0.5, z2 + 0.5, T + h, 2.6, DARKWOOD, axis);
  bothProp("balcony", (x1 + x2) / 2, axis ? z1 - 0.02 : z2 + 0.02, x2 - x1, T + h * 0.62, axis ? Math.PI : 0);
}
house(-31, 12, -24, 19, 5, PLASTER, "plaster", 1);
house(-32, 28, -25, 35, 5.5, WOOD, "wood", 0);
house(8.5, 13, 13.5, 19, 4.5, WOOD, "wood", 1);
house(-10, 33, -4.5, 38.5, 4.5, PLASTER, "plaster", 0);
// Juustola
both(8, 30, 13.5, 37, T, T + 4.5, PLASTER, "plaster");
roof(7.5, 29.5, 14, 37.5, T + 4.5, 2.4, ROOFRED, 1);
bothProp("sign", 10.75, T + 3.3, 29.96, Math.PI, "JUUSTOLA", 4.4, 1.0);

// ===== Kukkula basen ja sillan välissä =====
// Alarinteille pääsee hyppäämällä, mutta kalliohuippu (yli 4 m) on liian jyrkkä. Huippu on 9 m korkeudella,
// joten basen ovelta (silmien korkeus noin 6,6 m) ei näe sen yli vastapuolelle.
// Kumpu: pyöreähkö, reunoilta loiva ja keskeltä 2,2 m korkea, ja sen päällä kalliohuippu
const HC = [-1.75, 24], HA = 7.75, HB = 8;
function hillH(x, z) {
  const dx = (x - HC[0]) / HA, dz = (z - HC[1]) / HB, th = Math.atan2(dz, dx);
  const r = Math.pow(dx ** 4 + dz ** 4, 0.25) * (1 + 0.05 * (1 + Math.sin(3 * th + 0.7)) + 0.03 * (1 + Math.sin(5 * th + 2))); // epäsäännöllinen reuna
  return 2.2 * (1 - smooth(0.5, 1, r));
}
const hillY = (x, z) => T + hillH(x, z);
terrainPatch(-10, 15.5, 6.5, 32.5, T, (x, z) => (hillH(x, z) > 0 || hillH(x - 0.5, z) > 0 || hillH(x + 0.5, z) > 0 || hillH(x, z - 0.5) > 0 || hillH(x, z + 0.5) > 0 ? hillY(x, z) : NaN));
// Kummun päällä iso kaksikerroksinen alppimaja (umpinainen): estää näkymän basesta toiseen kiven sijaan
const MAJA = T + 2.2 + 4.6; // seinien yläreuna (9,3 m)
both(-6, 19.5, 3.5, 28.5, T, MAJA, WOOD, "logs");
roof(-6.7, 18.8, 4.2, 29.2, MAJA, 3.4, ROOFRED, 0);
for (const [z, r] of [[28.52, 0], [19.48, Math.PI]]) {
  bothProp("balcony", -1.25, z, 8, T + 2.2 + 2.7, r);
  for (const x of [-4.2, -1.25, 1.7]) { bothProp("window", x, z + (r ? -0.02 : 0.02), r, T + 2.2 + 1.2); bothProp("window", x, z + (r ? -0.02 : 0.02), r, T + 2.2 + 3.5); }
}
for (const [x, r] of [[3.52, Math.PI / 2], [-6.02, -Math.PI / 2]]) for (const z of [21.5, 26.5]) bothProp("window", x, z, r, T + 2.2 + 2.3);
bothProp("sign", -1.25, T + 2.2 + 1.9, 28.56, 0, "ALPPIMAJA", 3.2, 0.7);
bothProp("alphorn", -7.2, 18.6, hillY(-7.2, 18.6) - 0.05);
// Polut kiertävät kukkulan kummaltakin puolelta sillalle
floor(-12.5, 9, -3, 13, "cobble", T); floor(3, 9, 8.5, 13, "cobble", T);
floor(-12.5, 13, -9.5, 32, "cobble", T); floor(-13, 32, -10, 39, "cobble", T); floor(-13, 39, -8, 41, "cobble", T);
floor(6, 13, 8.5, 30, "cobble", T); floor(6, 30, 8, 38, "cobble", T); floor(6, 38, 12, 41, "cobble", T);

// Kyläaukio ja suihkulähde kirkon länsipuolella
both(-26, 21, -21.5, 25.5, T, T + 0.6, STONE, "stone");
both(-24.05, 22.95, -23.45, 23.55, T, T + 1.7, STONE, "stone");
bothProp("pool", -25.7, 21.3, -21.8, 25.2, T + 0.5);
floor(-27, 20, -20, 27.5, "cobble", T);
bothProp("bench", -23.75, 26.6, T, 0);
// Heinäpaalit, puupinot, sukset ja liput
for (const [x, z, r] of [[22, 13.5, 0], [23.8, 14.2, 0.5], [-27, 40.5, 0.2], [17.5, 44, 1.1], [-17.5, 30, 0.8]]) { both(x - 0.75, z - 0.6, x + 0.75, z + 0.6, T, T + 1.2, -1); bothProp("hay", x, z, T, r); }
both(-23.5, 38, -20.5, 39.2, T, T + 1.2, WOOD, "logs");
both(-30.8, 19.4, -27.8, 20.2, T, T + 1.0, WOOD, "logs");
bothProp("skis", -24.3, 15.5, T, Math.PI / 2);
bothProp("flag", 18, 58, P);
bothProp("flag", -18, 58, P);
// Kuuset reunoilla (runko on este, latvus vain kuvaa)
for (const [x, z, s] of [[-32.5, 9.5, 1.1], [-33, 24, 1.3], [-32, 43.5, 1.2], [31.5, 44, 1.2], [-19, 44, 1], [32.5, 9.5, 1.3], [24, 9.2, 1], [-8, 9.5, 0.9], [16, 27, 1], [-32.5, 52, 1.3], [32.5, 55, 1.2], [-25, 60.5, 1.1], [25, 60.5, 1.2]]) {
  const y = z > 47 ? P : x >= 14 && z >= 20 && z <= 40 ? pastY(x, z) - 0.1 : T; // laitumella kummun pinnalla
  both(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, y + 2.5 * s, -1);
  bothProp("pine", x, z, y, s);
}
// Kuusia kukkulan rinteillä
for (const [x, z, s] of [[-8.3, 28.5, 1.0], [4.8, 25, 1.1], [-7.2, 22, 0.9], [3.6, 29.2, 0.85], [-1, 17.2, 0.9]]) {
  const y = hillY(x, z) - 0.1; // runko hieman maan sisään rinteessä
  both(x - 0.3, z - 0.3, x + 0.3, z + 0.3, y, y + 2.5 * s, -1);
  bothProp("pine", x, z, y, s);
}

// ===== Lehmälaidun mäellä (sininen itäpuoli) =====
// Laidun on pehmeä kumpu: aitojen kohdalla kylän tasolla, ladon ympärillä 2 m korkeampi tasanne
function pastH(x, z) {
  const dx = Math.max(0, 20 - x), dz = Math.max(0, 26 - z, z - 34);
  return 2 * (1 - smooth(0, 6, Math.hypot(dx, dz)));
}
function pastY(x, z) { return T + pastH(x, z); }
terrainPatch(14, 20, 34, 40, T, (x, z) => (Math.hypot(Math.max(0, 20 - x), Math.max(0, 26 - z, z - 34)) < 6.6 ? pastY(x, z) : NaN));
// Aita laitumen ympärillä (portit länteen ja pohjoiseen)
function fence(x1, z1, x2, z2, y) { both(x1, z1, x2, z2, y, y + 1.0, -1); bothProp("fence", x1, z1, x2, z2, y); }
fence(13.8, 20, 14, 27, T); fence(13.8, 33, 14, 40, T);
fence(14, 19.8, 33.8, 20, T); fence(14, 40, 24, 40.2, T);
// Lehmät ja lato. Lehmät ovat palvelimella omia olioitaan: ne voi ampua, ja ne syntyvät uudelleen.
const COWS = [];
for (const [x, z, r] of [[22, 30, 0.4], [25, 27.5, 2.2], [27.5, 32, 4.1], [19.5, 34, 1.3], [24.5, 36.6, 5.5], [29, 24, 3.0]]) {
  const y = Math.max(pastY(x, z) - 0.15, Math.min(pastY(x - 0.6, z), pastY(x + 0.6, z), pastY(x, z - 0.8), pastY(x, z + 0.8))); // jalat maassa myös rinteessä
  COWS.push([x, z, y, r], [-x, -z, y, r + Math.PI]);
}
both(28.5, 27, 33.5, 33, T + 2, T + 5, DARKWOOD, "wood");
roof(28, 26.5, 34, 33.5, T + 5, 2, DARKWOOD, 1);

// ===== Basit tasanteella =====
const BASES = {
  sininen: { x: 0, z: 56, y: P, color: 0x3f6fd8 },
  punainen: { x: 0, z: -56, y: P, color: 0xd8473f },
};
for (const b of Object.values(BASES)) {
  const s = Math.sign(b.z), c = b.color, f = 50, back = Z;
  const R2 = (x1, z1, x2, z2, y0, y1, col, tex) => rect(Math.min(x1, x2), Math.min(s * z1, s * z2), Math.max(x1, x2), Math.max(s * z1, s * z2), y0, y1, col, tex);
  R2(-10.5, f, -9.5, back, P, P + 3, c, "stone");
  R2(9.5, f, 10.5, back, P, P + 3, c, "stone");
  R2(-10.5, f, -3, f + 1, P, P + 3, c, "stone");
  R2(3, f, 10.5, f + 1, P, P + 3, c, "stone");
  box(0, s * (b.z * s + 4), 3, 1, 0.9, 0x6b4a2e, P, "wood"); // reseptipöytä
}
floor(-10, 50, 10, 62, "tiles", P);
const SPAWNS = {
  sininen: [[-6, 53, P], [6, 53, P], [-6, 57, P], [6, 57, P], [-7, 60, P], [7, 60, P]],
  punainen: [[6, -53, P], [-6, -53, P], [6, -57, P], [-6, -57, P], [7, -60, P], [-7, -60, P]],
};

// Alppijuustopöydät (grillien paikalla): kylässä joen rannalla ja laitumen huipulla
const GY = Math.floor(Math.min(pastY(30.5, 20.7), pastY(31.5, 20.7)) * 100) / 100; // juustopöytä laitumen rinteessä
const GRILLS = [[-26, 9.6, T], [26, -9.6, T], [31, 21, GY], [-31, -21, GY]];
const GRILL_SIZE = [1.0, 0.95, 0.6];
for (const [x, z, y] of GRILLS) box(x, z, GRILL_SIZE[0], GRILL_SIZE[2], GRILL_SIZE[1], -1, y);

// Taustan lumihuippuiset vuoret
prop("mountains");

const ALPPIKYLA = {
  id: "alppikyla",
  name: "Olavin alppikylä",
  desc: "Kerää lampaita! Joki ja kivisilta, kirkontornit, viemäri vastapuolelle ja lehmälaidun.",
  x: X, z: Z, boxes: toMinMax(B), bases: BASES, baseRadius: 2.5, spawns: SPAWNS,
  recipe: [0, 3.2, 0], recipeWhere: "sillalla", recipeTo: "sillalle", item: "lammas", cows: COWS,
  grills: GRILLS, grillSize: GRILL_SIZE, grillKind: "juusto", floors: FLOORS, props: PROPS, terrain: TERRAIN,
  theme: { ground: "#6f8a52", line: "#5f7a45", groundTex: "gravel", sky: 0xa9cdef, wall: 0x7d776c, fogNear: 110, fogFar: 650 },
};

return { ALPPIKYLA };
})();
__m["pepino"] = (() => {
const { toMinMax } = __m["map"];
// ====== KARTTA: PEPIINO VS. PAPPA PIZZA (Espoon Vanttila) ======
// Kartta ei ole symmetrinen. Se on tehty Vanttilan teollisuusalueen mukaan, mutta pienennettynä.
// Länsipäässä (z+) on sininen base Ravintola Pepiinossa ja itäpäässä (z−) punainen base Pappa Pizzassa.
// Etelälaidalla (x+) kulkee iso tie pyörätien ja niityn kera, ja pohjoislaidalla (x−) on hallien takakuja.
// Keskellä on sininen halli, jonka lattialle pizzalaatikko ilmestyy. Kummastakin basesta
// on halliin suunnilleen yhtä pitkä matka (tarkistettu bottien reitinhaulla), vaikka reitit ovat erilaisia.
//
// Koordinaatit: +z = länsi (Pepiino), −z = itä (Pappa Pizza), +x = etelä (tie), −x = pohjoinen.
// Laatikko: [minX, minY, minZ, maxX, maxY, maxZ, väri, pintakuvio]. Väri -1 = näkymätön este.

const X = 36, Z = 64; // 72 m leveä, 128 m pitkä
const B = [], FLOORS = [], PROPS = [], TERRAIN = [];
const rect = (x1, z1, x2, z2, y0, y1, color, tex) => B.push([(x1 + x2) / 2, (z1 + z2) / 2, x2 - x1, z2 - z1, y1 - y0, color, y0, tex]);
const floor = (x1, z1, x2, z2, tex, y = 0) => FLOORS.push([x1, z1, x2, z2, tex, y]);
const prop = (kind, ...a) => PROPS.push([kind, ...a]);
// Tikkaat seinässä (kuten Minecraftissa): kävele seinää päin = nouset, irti = liu'ut alas, Shift = pysyt paikallasi.
// (x, z) on piste seinän pinnalla, (nx, nz) osoittaa seinään päin, w = leveys, y0..y1 = alapää ja yläpää (katon pinta).
const LADDERS = [];
const ladder = (x, z, nx, nz, w, y0, y1) => LADDERS.push({ x, z, nx, nz, w, y0, y1 });

// Seinä z-suunnassa (paksuus x1..x2) tai x-suunnassa (z1..z2) aukkoineen.
// gaps: [[alku, loppu, aukon alareuna, aukon yläreuna]]. Aukon ylä- ja alapuolelle tulee seinää.
function wall(x1, z1, x2, z2, y0, y1, color, tex, gaps = []) {
  const alongZ = z2 - z1 > x2 - x1, a0 = alongZ ? z1 : x1, a1 = alongZ ? z2 : x2;
  const seg = (s0, s1, yy0, yy1) => { if (s1 - s0 < 1e-6 || yy1 - yy0 < 1e-6) return; alongZ ? rect(x1, s0, x2, s1, yy0, yy1, color, tex) : rect(s0, z1, s1, z2, yy0, yy1, color, tex); };
  // Paloitellaan seinä aukkojen reunoista; jokaisessa palassa jätetään sen kohdalla olevat aukot pois
  const cuts = [...new Set([a0, a1, ...gaps.flatMap((g) => [g[0], g[1]])])].filter((v) => v >= a0 && v <= a1).sort((p, q) => p - q);
  for (let k = 0; k < cuts.length - 1; k++) {
    const s0 = cuts[k], s1 = cuts[k + 1], mid = (s0 + s1) / 2;
    const holes = gaps.filter((g) => g[0] < mid && g[1] > mid).map((g) => [g[2] ?? y0, g[3] ?? y0 + 2.5]).sort((p, q) => p[0] - q[0]);
    let cy = y0;
    for (const [hb, ht] of holes) { seg(s0, s1, cy, hb); cy = Math.max(cy, ht); }
    seg(s0, s1, cy, y1);
  }
}
// Portaat: alkaa kohdasta (x0, z0), nousee suuntaan (dx, dz)
function stairs(x0, z0, dx, dz, width, y0, y1, n, depth, color, tex) {
  for (let i = 1; i <= n; i++) {
    const cx = x0 + dx * depth * (i - 0.5), cz = z0 + dz * depth * (i - 0.5);
    const w = dx ? depth : width, d = dz ? depth : width;
    rect(cx - w / 2, cz - d / 2, cx + w / 2, cz + d / 2, y0, y0 + (y1 - y0) * i / n, color, tex);
  }
}
// Auto: kori, ikkunat ja renkaat. ori "x" tai "z" = pituussuunta
function car(x, z, ori, color, y0 = 0) {
  const [hw, hl] = ori === "z" ? [0.9, 2.1] : [2.1, 0.9];
  const [cw, cl] = ori === "z" ? [0.8, 1.0] : [1.0, 0.8];
  rect(x - hw, z - hl, x + hw, z + hl, y0 + 0.3, y0 + 1.1, color, "paint");
  rect(x - cw, z - cl, x + cw, z + cl, y0 + 1.1, y0 + 1.65, 0x2b3440);
  rect(x - hw + 0.15, z - hl + 0.15, x + hw - 0.15, z + hl - 0.15, y0, y0 + 0.3, -1);
  prop("wheels", x, z, ori, y0, 0);
}
// Pakettiauto (valkoinen, korkeampi)
function van(x, z, ori, color = 0xf2f2f0) {
  const [hw, hl] = ori === "z" ? [1.0, 2.6] : [2.6, 1.0];
  rect(x - hw, z - hl, x + hw, z + hl, 0.3, 2.4, color, "paint");
  rect(x - hw + 0.15, z - hl + 0.15, x + hw - 0.15, z + hl - 0.15, 0, 0.3, -1);
  prop("wheels", x, z, ori, 0, 0);
}
// Puut: näkymätön runkoeste + kuva
const birch = (x, z, s = 1) => { rect(x - 0.22, z - 0.22, x + 0.22, z + 0.22, 0, 6 * s, -1); prop("birch", x, z, s); };
const spruce = (x, z, s = 1) => { rect(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 2.5 * s, -1); prop("pine", x, z, 0, s); };
const tires = (x, z, n) => { rect(x - 0.45, z - 0.45, x + 0.45, z + 0.45, 0, n * 0.26, -1); prop("tires", x, z, n); };
const barrel = (x, z, c) => { rect(x - 0.3, z - 0.3, x + 0.3, z + 0.3, 0, 0.9, -1); prop("barrel", x, z, c); };
const pallet = (x, z, h = 1.2) => rect(x - 0.6, z - 0.5, x + 0.6, z + 0.5, 0, h, 0xa98a5c, "wood");
// Puuaita: este + kuva
const fence = (x1, z1, x2, z2, y = 0, h = 1.1) => { rect(x1, z1, x2, z2, y, y + h, -1); prop("fence", x1, z1, x2, z2, y); };

// Pehmeä maasto (kuten alppikylässä): näkymättömät 0,5 m:n pylväät törmäyksiin ja sileä pinta päälle
const TCELL = 0.5;
const smooth = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };
function terrainPatch(x1, z1, x2, z2, base, f) {
  const nx = Math.round((x2 - x1) / TCELL) + 1, nz = Math.round((z2 - z1) / TCELL) + 1, H = [];
  for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) { const v = f(x1 + i * TCELL, z1 + j * TCELL); H.push(Number.isFinite(v) ? Math.round(v * 100) : null); }
  TERRAIN.push({ x0: x1, z0: z1, cell: TCELL, nx, nz, h: H });
  for (let j = 0; j < nz - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const c = [H[j * nx + i], H[j * nx + i + 1], H[(j + 1) * nx + i], H[(j + 1) * nx + i + 1]];
    if (c.some((v) => v === null)) continue;
    const h = Math.floor(Math.min(...c) / 5) * 5 / 100;
    if (h > base + 0.02) rect(x1 + i * TCELL, z1 + j * TCELL, x1 + (i + 1) * TCELL, z1 + (j + 1) * TCELL, base, h, -1);
  }
}
// Pyöreä kumpu (heittää NaN:n kauempana, jotta pinta piirretään vain kummun kohdalle)
const mound = (cx, cz, rx, rz, h) => (x, z) => { const r = Math.hypot((x - cx) / rx, (z - cz) / rz); return r < 1.08 ? h * (1 - smooth(0.25, 1, r)) : NaN; };

const PEP = 0xdcdfdc, GREY = 0x9aa1a6, WHITEH = 0xe9e9e4, BLUEH = 0x7b8fa0, DARK = 0x24292e, GREENM = 0x8e9b74;
const WOODC = 0x7a5230, DECK = 0x8a6340, CONC = 0xa9a9a2, STEPC = 0x8b8f99;

// ===================== MAAPOHJAT =====================
floor(-36, 30, -32, 56, "gravel"); floor(-36, -18, -32, 22, "gravel"); floor(-36, -64, -32, -24, "gravel"); // pohjoinen takakuja
floor(-36, 56, 22, 64, "gravel");               // sorapiha Pepiinon länsipuolella
floor(-36, 22, -6, 30, "asphalt");              // katu 1 (pohjois-eteläsuuntainen)
floor(-6, 22, 16, 42, "asphalt");               // Pepiinon parkkipaikka
floor(-6, 42, -2, 56, "asphalt");               // kuja Pepiinon ja hallien välissä
floor(-9, 6, 16, 22, "gravel");                 // piha keskellä länsipuolta
floor(-32, -18, -20, 6, "gravel");              // romupiha
floor(-20, -18, 17, -8, "asphalt");             // keskihallin itäpuoli
floor(4, -8, 16.5, 6, "asphalt");                 // keskihallin eteläpuoli
floor(-20, -8, 4, 6, "concrete");               // keskihallin lattia
floor(-36, -24, 18, -18, "asphalt");            // katu 2
floor(-10, -48, 12, -36, "asphalt");            // Pappa Pizzan etupiha
floor(12, -64, 20, -24, "asphalt");             // Pappa Pizzan parkkipaikka
floor(-32, -52, -6, -48, "asphalt");            // hallien välinen kuja
// Tiet kiemurtelevat kuten Vanttilassa: asfalttitie idästä Pappa Pizzan ohi, risteys Pepiinon kohdalla ja
// sieltä kaarre lounaaseen liikenneympyrään. Pepiinon edessä länteen jatkuu hiekkatie. Tiet ovat vain pintaa.
const ROAD = [[28, -140], [28, -64], [27.5, -50], [26.5, -38], [25, -28], [22.5, -18], [20.5, -6], [19.6, 4], [19.6, 20], [20.5, 32], [21.5, 38], [24.5, 45], [28, 51], [31, 55], [40, 62], [70, 75]];
const BIKE = [[33.2, -140], [33.2, -64], [32.7, -50], [31.8, -38], [30.3, -28], [27.8, -18], [25.8, -6], [25.1, 4], [25.1, 20], [26, 32], [27.5, 37], [30.5, 44], [33.6, 49]];
const roadX = (z) => { for (let i = 0; i < ROAD.length - 1; i++) { const [x1, z1] = ROAD[i], [x2, z2] = ROAD[i + 1]; if ((z - z1) * (z - z2) <= 0 && z1 !== z2) return x1 + (x2 - x1) * (z - z1) / (z2 - z1); } return 20; };
prop("road", BIKE, 2.5, "concrete", "plain");
prop("road", [[19.5, 80], [19.5, 64], [19.2, 52], [19.5, 44], [21.5, 38]], 5, "gravel", "plain");
prop("road", ROAD, 7, "asphalt", "main");
prop("roundabout", 31, 55, 3);
floor(20, -46, 22.4, -40, "asphalt");           // Pappan ramppi tielle
{ const cx = roadX(-43); for (let x = cx - 3.2; x < cx + 3.2; x += 0.9) prop("lines", x, -43, 0.5, 4); // suojatie
  for (let x = 30.4; x < 32.3; x += 0.6) prop("lines", x + (roadX(-43) - 25.6), -43, 0.35, 2.4); }

// ===================== SININEN BASE: RAVINTOLA PEPIINO =====================
// Valkoinen aaltopeltitalo mustalla sokkelilla. Pohjakerros on korotettu (0,9 m): sisään noustaan puuportaita,
// joiden mustassa kaiteessa lukee PEPIINO. Pohjakerroksessa on tiiliseinäinen eteiskäytävä (U-portaat yläkertaan)
// ja sen takana Pepiinon sali, joka on base. Yläkerrassa ovat ruokailutila, pizzeriakeittiö, naisten ja miesten WC,
// urheilu-TV-huone ja leikkihuone. Yläkerrasta pääsee ulkoisille hätäportaille, jotka jatkuvat katolle.
// Ovet: pääovi itään (portaat), terassiovi etelään, takaovi pohjoiseen kujalle ja hätäovi yläkerrasta.
const FL = 0.9, PY1 = 4.0, PY2 = 4.3, PTOP = 7.6;
const PW = 0xf4f4ef, TRIM = 0xfbfbf8, SOK = 0x1c1e21, BRICK = 0x8e4a3a, PLAST = 0xece6da, GPLAST = 0xb9b7b0, STEEL = 0x4a5056;
const DOOR = (a, b) => [a, b, FL, FL + 2.4], WIN = (a, b) => [a, b, 5.2, 7.0];
rect(-2, 40, 12, 58, 0, FL, SOK, "concrete");                                                                    // musta sokkeli ja lattia
wall(-2, 40, 12, 40.3, FL, PTOP, PW, "metal", [DOOR(7.5, 10), WIN(4, 10)]);                                      // itäjulkisivu
wall(11.7, 40.3, 12, 57.7, FL, PTOP, PW, "metal", [DOOR(50, 52), WIN(44, 54.5), WIN(55.9, 57.4)]);               // etelä: ruokailutilan ikkunanauha
wall(-2, 40.3, -1.7, 57.7, FL, PTOP, PW, "metal", [DOOR(56, 57.5), [44.1, 45.7, PY2, PY2 + 2.3], WIN(50.5, 54.5)]); // pohjoinen
wall(-2, 57.7, 12, 58, FL, PTOP, PW, "metal", [WIN(-1, 4.6), WIN(6, 11)]);                                       // länsi
// Valkoiset kulmalistat ja kerroslista
for (const [x, z] of [[-2, 40], [12, 40], [-2, 58], [12, 58]]) rect(x - 0.12, z - 0.12, x + 0.12, z + 0.12, FL, PTOP + 0.4, TRIM, "paint");
rect(-2.06, 39.94, 12.06, 40, PY1, PY1 + 0.18, TRIM, "paint"); rect(12, 40, 12.06, 58, PY1, PY1 + 0.18, TRIM, "paint");
// Katto ja matala kaide (pohjoisreunassa aukko hätäportaille)
rect(-2, 40, 12, 58, PTOP, PTOP + 0.4, 0x8d9296, "metal");
for (const [a1, b1, a2, b2] of [[-2, 39.9, 12, 40.1], [-2, 57.9, 12, 58.1], [-2.1, 40, -1.9, 42.4], [-2.1, 43.8, -1.9, 48], [-2.1, 49.4, -1.9, 58], [11.9, 40, 12.1, 58]]) rect(a1, b1, a2, b2, PTOP + 0.4, PTOP + 1.0, 0x6f757a, "metal");

// --- Pohjakerros: eteiskäytävä (z 40.3..46) ja Pepiinon sali (z 46.3..57.7) ---
floor(-1.7, 40.3, 11.7, 46, "wood", FL); floor(-1.7, 46.3, 11.7, 57.7, "wood", FL);
wall(-1.7, 46, 11.7, 46.3, FL, PY1, BRICK, "brick", [DOOR(4, 7)]);                       // tiiliseinä käytävän ja salin välissä
// U-portaat käytävän pohjoispäässä: ensin ulkoseinää pitkin pohjoiseen, tasanne, sitten takaisin etelään
const LAND = 2.6;
for (let i = 1; i <= 5; i++) rect(4.9 - 0.7 * i, 40.3, 4.9 - 0.7 * (i - 1), 41.9, FL, FL + (LAND - FL) * i / 5, STEPC, "concrete");
rect(-1.7, 40.3, 1.4, 43.7, FL, LAND, STEPC, "concrete");                                // välitasanne
for (let i = 1; i <= 5; i++) rect(1.4 + 0.7 * (i - 1), 42.1, 1.4 + 0.7 * i, 43.7, FL, LAND + (PY2 - LAND) * i / 5, STEPC, "concrete");
rect(1.4, 41.9, 4.9, 42.1, FL, FL + 1.0, BRICK, "brick");                                // välikaide portaiden välissä
// Välipohja: puinen katto alakertaan, aukko portaikon kohdalla
rect(4.9, 40.3, 11.7, 43.7, PY1, PY2, 0x8a5a33, "wood");
rect(-1.7, 43.7, 11.7, 57.7, PY1, PY2, 0x8a5a33, "wood");
rect(4.9, 40.3, 5.0, 42.1, PY2, PY2 + 1.0, STEEL, "metal"); rect(-1.7, 43.7, 4.9, 43.8, PY2, PY2 + 1.0, STEEL, "metal"); // kaiteet aukon reunoilla
// Eteiskäytävän sisustus: tiilipilarit, valkoinen rappaus, puupalkit, lyhdyt, ilmastointiputki, matot, kukkaruukku
for (const x of [3.6, 7.4, 11.2]) rect(x - 0.25, 45.5, x + 0.25, 46, FL, PY1, BRICK, "brick");
rect(10.05, 40.3, 10.55, 40.8, FL, PY1, BRICK, "brick"); rect(6.6, 40.3, 7.4, 40.5, FL, PY1, BRICK, "brick"); // tiilipinnat pääoven vieressä
prop("beam", 4.9, 43.2, 11.7, 43.2, PY1 - 0.15); prop("beam", 4.9, 41.3, 11.7, 41.3, PY1 - 0.15);
prop("duct", 5, 44.6, 11.6, 44.6, PY1 - 0.35, 0.22);
for (const [x, z, r] of [[6.6, 45.45, Math.PI], [9.6, 45.45, Math.PI], [6.6, 40.85, 0], [9.6, 40.85, 0]]) prop("lantern", x, 2.9, z, r);
prop("rug", 8.7, 43, FL, 1.4, 2.2, 0); prop("rug", 5.5, 44.9, FL, 1.2, 1.8, Math.PI / 2);
prop("plant", 11.1, 44.6, FL);
// Pepiinon sali (base): puulattia, puupöydät mustin jaloin ja konjakinruskeat tuolit, matot, riippuvalaisimet
rect(1, 56.6, 9, 57.7, FL, FL + 1.0, 0x5a3a24, "wood");                                   // buffetpöytä (pizzalaatikot tähän)
rect(-1.7, 46.3, -1.65, 56, FL, PY1, GPLAST, "plaster"); rect(11.65, 46.3, 11.7, 50, FL, PY1, GPLAST, "plaster"); rect(11.65, 52, 11.7, 57.7, FL, PY1, GPLAST, "plaster");
for (const [x, z] of [[2.5, 49], [8.5, 49], [2.5, 54.5], [8.5, 54.5]]) {
  rect(x - 0.7, z - 0.45, x + 0.7, z + 0.45, FL, FL + 0.78, -1);
  prop("dtable", x, z, FL, 1.4, 0.9);
  for (const [cx, cz, cr] of [[-0.35, -0.8, 0], [0.35, -0.8, 0], [-0.35, 0.8, Math.PI], [0.35, 0.8, Math.PI]]) prop("chair", x + cx, z + cz, FL, cr);
}
for (const [x, z] of [[2.5, 49], [8.5, 49], [2.5, 54.5], [8.5, 54.5]]) prop("rug", x, z, FL, 2.0, 2.8, 0);
for (const [x, z] of [[2.5, 49], [8.5, 49], [2.5, 54.5], [8.5, 54.5], [5.5, 52]]) prop("pendant", x, PY1, z);
for (const z of [48, 51, 54, 57]) prop("beam", -1.7, z, 11.7, z, PY1 - 0.12);
prop("frame", -1.62, 2.4, 49, Math.PI / 2, 1.4, 1.0); prop("frame", 11.62, 2.4, 55, -Math.PI / 2, 1.2, 0.9);
prop("mirror", -1.62, 2.4, 54, Math.PI / 2);
prop("plant", 10.9, 56.3, FL); prop("plant", -0.9, 47, FL);
for (const [x, z, r] of [[-1.6, 51.5, Math.PI / 2], [11.6, 48, -Math.PI / 2]]) prop("lantern", x, 2.9, z, r);

// --- Yläkerta (lattia 4,3 m): ruokailutila ikkunoiden puolella, keittiö pohjoisseinällä tiskin takana ---
floor(4.9, 40.3, 11.7, 43.7, "wood", PY2); floor(-1.7, 43.7, 11.7, 57.7, "wood", PY2);
const UP = (x1, z1, x2, z2, gaps = [], color = PLAST, tex = "plaster") => wall(x1, z1, x2, z2, PY2, PTOP, color, tex, gaps.map(([a, b]) => [a, b, PY2, PY2 + 2.3]));
// WC:t portaikkoaulan vieressä pohjoisseinällä (naiset pohjoisin), ovet aulaan
UP(-1.7, 46, 4.8, 46.2, [[-1.2, 0], [2.4, 3.6]]); UP(1.4, 46.2, 1.6, 49.6); UP(4.6, 46.2, 4.8, 49.8); UP(-1.7, 49.6, 4.6, 49.8);
prop("sign", -0.6, PY2 + 2.55, 45.98, Math.PI, "NAISET", 1.0, 0.3, "#8a2a4a", "#ffffff", "#ffffff");
prop("sign", 3.0, PY2 + 2.55, 45.98, Math.PI, "MIEHET", 1.0, 0.3, "#2f3b4a", "#ffffff", "#ffffff");
for (const [x, z] of [[-0.2, 49.0], [3.1, 49.0]]) { prop("toilet", x, z, PY2, Math.PI); rect(x - 0.25, z - 0.35, x + 0.25, z + 0.3, PY2, PY2 + 0.45, -1); }
for (const [x, z] of [[1.1, 47.2], [4.3, 47.2]]) prop("sink", x, z, PY2, -Math.PI / 2);
// Pizzeriakeittiö pohjoisseinällä: pizzauuni, teräspöydät ja hyllyt; ruokailutilan puolella palvelutiski (yli voi ampua)
UP(-1.7, 55.0, 11.7, 55.2, [[4.2, 5.5], [7.5, 8.9]]);                                    // länsipään huoneiden seinä
rect(3.6, 51.0, 3.8, 55.0, PY2, PY2 + 1.1, 0x5a3a24, "wood");                              // palvelutiski (ovi pohjoispäässä)
rect(3.55, 51.0, 3.85, 55.0, PY2 + 1.1, PY2 + 1.16, 0x2b2b2b, "metal");                   // tiskin kansi
rect(-1.7, 52.6, -0.6, 54.2, PY2, PY2 + 1.7, -1); prop("oven", -1.05, 53.4, PY2, -Math.PI / 2);
rect(-1.7, 50.0, -1.0, 52.4, PY2, PY2 + 0.95, 0xcfd3d8, "metal");                        // teräspöytä seinällä
rect(0.6, 51.2, 2.0, 53.4, PY2, PY2 + 0.95, 0xcfd3d8, "metal");                          // työsaareke
prop("pizzaprep", 1.3, 52.3, PY2 + 0.95);
rect(-1.7, 54.4, 2.4, 55.0, PY2, PY2 + 2.0, 0x6f757a, "metal");                          // hyllykkö
prop("sign", 3.97, PY2 + 2.3, 52.9, Math.PI / 2, "PIZZERIA", 2.4, 0.5, "#c0262d", "#ffffff", "#f2c14e");
for (const z of [51.8, 53.2, 54.4]) prop("pizzabox", 3.7, z, PY2 + 1.16);
// Urheilu-TV-huone (etelä) ja leikkihuone (pohjoinen) länsipäässä
UP(5.6, 55.2, 5.8, 57.7);
prop("sign", 8.2, PY2 + 2.55, 54.98, Math.PI, "URHEILU-TV", 1.6, 0.35, "#1f3b6e", "#ffffff", "#f2c14e");
prop("sign", 4.85, PY2 + 2.55, 54.98, Math.PI, "LEIKKIHUONE", 1.6, 0.35, "#e88a1a", "#ffffff", "#ffffff");
prop("tv", 5.85, PY2 + 1.7, 56.45, Math.PI / 2, 1.9);
rect(9.6, 55.6, 11.4, 57.2, PY2, PY2 + 0.8, -1); prop("sofa", 10.5, 56.4, PY2, -Math.PI / 2);
rect(-1.4, 55.5, 1.6, 57.4, PY2, PY2 + 0.5, -1); prop("ballpit", 0.1, 56.45, PY2, 3, 1.9);
prop("toys", 3.6, 56.6, PY2);
// Ruokailutila etelän ikkunanauhan puolella: pöydät tuoleineen, matot, verhot, taulut, palkit ja riippuvalaisimet
for (const [x, z] of [[6.6, 47.2], [9.9, 47.2], [6.6, 50.8], [9.9, 50.8], [6.6, 54.1], [9.9, 54.1]]) {
  rect(x - 0.7, z - 0.45, x + 0.7, z + 0.45, PY2, PY2 + 0.78, -1);
  prop("dtable", x, z, PY2, 1.4, 0.9);
  for (const [cx, cz, cr] of [[-0.35, -0.75, 0], [0.35, -0.75, 0], [-0.35, 0.75, Math.PI], [0.35, 0.75, Math.PI]]) prop("chair", x + cx, z + cz, PY2, cr);
  prop("pendant", x, PTOP, z); prop("rug", x, z, PY2, 2.0, 2.6, 0);
}
for (const z of [45, 49, 53]) prop("beam", -1.7, z, 11.7, z, PTOP - 0.12);
for (const z of [44.35, 49.25, 54.15]) prop("curtain", 11.62, 6.1, z, -Math.PI / 2, 0.7, 2.2);
prop("frame", 10.3, 6.0, 54.97, Math.PI, 1.0, 0.8); prop("frame", 4.82, 6.0, 48, Math.PI / 2, 1.0, 0.8);
prop("mirror", 5.4, 6.0, 46.22, 0);
// Portaikkoaula: lyhdyt
for (const [x, z, r] of [[8, 40.38, 0], [11.6, 42.5, -Math.PI / 2]]) prop("lantern", x, PY2 + 2.0, z, r);
prop("wingrid", 7, 6.1, 40.0, Math.PI, 6, 1.8, 6, 2);
for (const [x, y, z, r, w] of [[-2.0, 6.1, 52.5, -Math.PI / 2, 4], [12.0, 6.1, 49.25, Math.PI / 2, 10.5], [12.0, 6.1, 56.65, Math.PI / 2, 1.5], [1.8, 6.1, 58, 0, 5.6], [8.5, 6.1, 58, 0, 5]]) prop("wingrid", x, y, z, r, w, 1.8, Math.max(1, Math.round(w / 1.1)), 2);

// --- Ulkoiset hätäportaat pohjoisseinällä: yläkerran hätäovelta alas parkkipaikalle ja ylös katolle ---
rect(-4, 43.9, -2, 46.0, PY2 - 0.25, PY2, STEEL, "metal");                                // tasanne hätäoven edessä
ladder(-2, 43.1, 1, 0, 1.0, 0, PTOP + 0.4);                                              // tikkaat maasta katolle hätäoven tasanteen vieressä
rect(-4.08, 43.9, -4, 46.0, PY2, PY2 + 1.0, STEEL, "metal");                              // tasanteen kaide
rect(-3, 56, -2, 57.5, 0, 0.45, STEPC, "concrete");                                       // askelma takaovelle
// Lankkusilta hallin H1 katolta pieneen parvekkeeseen Pepiinon seinällä ja sieltä tikkaat katolle (kattoreitti)
rect(-6.05, 47.8, -2, 49.6, 5.9, 6.15, 0x7a5a3a, "wood");
rect(-6.05, 47.7, -2, 47.8, 6.15, 7.0, 0x8a6a3a); rect(-6.05, 49.6, -2, 49.7, 6.15, 7.0, 0x8a6a3a);
ladder(-2, 48.7, 1, 0, 1.0, 6.15, PTOP + 0.4);

// --- Sisäänkäynti: puutasanne, portaat ja musta PEPIINO-kaide, valkoinen katos ---
rect(7.3, 38.2, 10.3, 40, 0, FL, DECK, "wood");
// Portaat nousevat tasanteelle molemmilta sivuilta (lännestä ja idästä), edessä porrastettu musta kaide
stairs(4.3, 39.1, 1, 0, 1.8, 0, FL, 3, 1.0, DECK, "wood");
stairs(13.3, 39.1, -1, 0, 1.8, 0, FL, 3, 1.0, DECK, "wood");
for (const [x1, x2, h] of [[4.3, 5.3, 0.3], [5.3, 6.3, 0.6], [6.3, 7.3, 0.9], [7.3, 10.3, 0.9], [10.3, 11.3, 0.9], [11.3, 12.3, 0.6], [12.3, 13.3, 0.3]]) rect(x1, 37.9, x2, 38.2, 0, h + 1.0, 0x141414, "paint");
prop("sign", 8.8, 1.35, 37.88, Math.PI, "P E P I I N O", 6.6, 0.75, "#141414", "#f4f4f4", "#141414");
rect(6.8, 38.4, 10.8, 40, 3.6, 3.75, TRIM, "paint");                                      // katos
prop("canopy", 8.8, 38.5, 3.6);
// Julkisivu: punaiset kirjaimet seinässä, musta ruokataulunauha, liekkikuvaiset ikkunat, tikkaat
prop("sign", 1.4, 7.05, 39.95, Math.PI, "RAVINTOLA PEPIINO", 6.4, 1.0, "none", "#d6302a");
prop("sign", 12.05, 7.05, 47, Math.PI / 2, "RAVINTOLA PEPIINO", 9, 1.3, "none", "#d6302a");
prop("sign", 1.4, 5.9, 39.95, Math.PI, "LOUNAS · BUFFET · PIZZAT · KEBAB · RULLAT", 6.0, 0.8, "#121212", "#f2f2f2", "#555");
prop("sign", 12.05, 5.9, 44, Math.PI / 2, "PIZZA · PASTA · BURGERIT", 3.8, 0.8, "#121212", "#f2f2f2", "#555");
for (const [x, z, r, w] of [[2.0, 39.96, Math.PI, 3.2], [5.6, 39.96, Math.PI, 2.6], [12.04, 44, Math.PI / 2, 3], [12.04, 54.5, Math.PI / 2, 3.6], [-2.04, 50, -Math.PI / 2, 4]]) prop("foodwin", x, 2.4, z, r, w, 1.7);
prop("ladder", 10.9, 39.93, FL + 2.8, PTOP + 0.9, Math.PI);
// Terassi etelään sokkelin tasolla: puulattia, aita, varjot ja portaat etelään
rect(12, 43, 16.5, 55, 0, FL, DECK, "wood");
fence(16.4, 43, 16.6, 51.5, FL); fence(16.4, 53.5, 16.6, 55, FL);
fence(12, 54.9, 16.5, 55.1, FL); fence(12, 42.9, 16.5, 43.1, FL);
stairs(19.5, 52.5, -1, 0, 2, 0, FL, 3, 1.0, DECK, "wood");
prop("umbrella", 14.3, 47.5, FL); prop("umbrella", 14.3, 51.5, FL);
for (const [tx, tz] of [[14.3, 46.6], [14.3, 50.6]]) rect(tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4, FL, FL + 0.75, 0x2b2b2b, "metal");
// Nurmipenkka, mainosbanneri ja vino puinen sähköpylväs lounaiskulmassa
terrainPatch(12.2, 56.2, 17, 63.8, 0, mound(14.6, 60, 2.6, 3.8, 0.8));
rect(12.9, 56.6, 16.3, 56.8, 0, 2.6, -1);
prop("sign", 14.6, 1.6, 56.82, 0, "ESPOON PARHAAT PIZZAT · LOUNAS · KOTIINKULJETUS", 3.4, 1.8, "#121212", "#ffffff", "#c8a040");
rect(16.3, 61.8, 16.7, 62.2, 0, 9, -1); prop("pole", 16.5, 62, 9, -0.12, 0.05);
// Asuntovaunu ja auto sorapihalla
rect(0, 60.8, 6, 63.2, 0.35, 2.9, 0xf4f4f0, "paint"); rect(0.3, 61.1, 5.7, 62.9, 0, 0.35, -1); prop("wheels", 3, 62, "x", 0, 0);
for (const x of [1.2, 4.8]) prop("window", x, 60.78, Math.PI, 1.8);
car(10, 62, "x", 0xdedede); car(-6, 61.5, "x", 0x8a1f1f);
// Parkkipaikka: autoja, pakettiauto ja puuaita kivineen
// Parkkipaikka: autot pohjois-eteläsuunnassa ruutuihin, kaksi riviä; sisäänkäynnin portaille jää tilaa molemmin puolin
// Parkkipaikka: yksi rivi aitaa vasten, keulat itään kohti Pappa Pizzaa
for (const [x, c] of [[6.2, 0xf2f2f2], [8.5, 0x1d2126], [10.8, 0xf2f2f2], [13.1, 0x7c8a94]]) car(x, 30.6, "z", c);
for (let x = -1.85; x <= 13.5; x += 2.3) prop("lines", x, 30.6, 0.12, 4.6);
fence(-3.5, 27.9, 16, 28.1); rect(14.3, 26.6, 15.5, 27.6, 0, 0.6, 0x8b8a84, "rock");
birch(28.6, 27.5, 1.4); birch(28.8, 21, 1.2);
// Harmaat hallit Pepiinon pohjoispuolella (nosturiovet kadulle ja kujalle)
// Kolme hallia kujineen kuten Vanttilassa: H3 kadun varressa, H2 pitkä halli pohjoisessa ja H1 Pepiinon takana
rect(-32, 30, -14, 40, 0, 6, GREY, "metal");                 // H3
rect(-32, 44, -20, 56, 0, 5.5, 0xb3b8bc, "metal");           // H2
rect(-16, 42, -6, 56, 0, 6, 0x8f969c, "metal");              // H1
floor(-32, 40, -6, 42, "gravel"); floor(-32, 42, -16, 44, "gravel"); floor(-20, 44, -16, 56, "gravel");
rect(-16, 40, -14, 42, 5.85, 6.0, 0x7a5a3a, "wood");          // lankkusilta H3:n katolta H1:n katolle (kattoreitti)
for (const x of [-28, -21]) prop("garage", x, 29.98, Math.PI, 4, 4);
for (const z of [46, 52]) prop("garage", -5.98, z, Math.PI / 2, 4, 4);
prop("garage", -26, 43.98, Math.PI, 3.6, 3.6); prop("garage", -11, 41.98, Math.PI, 3.6, 3.6);
prop("sign", -20, 5, 29.96, Math.PI, "VARASTO · KONEPAJA", 6, 0.8, "#2f3b4a", "#f2f2f2", "#9aa1a6");

// Pizzalähettiautot: kattokyltti, teksti kyljissä, takaluukku auki ja kontissa pesäpallomaila
function pizzaCar(x, z, ori, rot, color, text, txt, panel) {
  const [hw, hl] = ori === "z" ? [0.9, 2.1] : [2.1, 0.9];
  const [cw, cl] = ori === "z" ? [0.8, 1.2] : [1.2, 0.8];
  rect(x - hw, z - hl, x + hw, z + hl, 0.3, 1.1, -1);
  rect(x - cw, z - cl, x + cw, z + cl, 1.1, 2.1, -1);
  rect(x - hw + 0.15, z - hl + 0.15, x + hw - 0.15, z + hl - 0.15, 0, 0.3, -1);
  prop("wheels", x, z, ori, 0, 0);
  prop("pizzacar", x, z, rot, color, text, txt, panel);
}
// Pepiinon parkkipaikalla kaksi punaista, keula Pepiinoon päin (luukku parkkipaikalle)
pizzaCar(-0.7, 30.6, "z", Math.PI / 2, 0xd42a20, "PEPIINO PIZZA", "#ffffff", "#1f7a3a");
pizzaCar(1.6, 30.6, "z", Math.PI / 2, 0xd42a20, "PEPIINO PIZZA", "#ffffff", "#1f7a3a");

// ===================== LÄNSIPUOLEN PIHA (z 6..22) =====================
rect(-30, 8, -14, 20, 0, 5, WHITEH, "metal");                 // aurinkopaneelikattoinen halli
prop("solar", -24.5, 8.5, -14.5, 19.5, 5);
rect(-30, 8, -25, 13.5, 5, 7.6, 0xb8bcc0, "metal");            // ilmanvaihtokonehuone katolla
prop("sign", -24.98, 6.6, 10.75, Math.PI / 2, "IV-KONEHUONE", 2.2, 0.4, "#2f3b4a", "#ffffff", "#9aa1a6");
rect(-14, 10, -9, 16, 0, 4, 0xc9ccd0, "metal");               // lisäsiipi
for (const z of [11, 15]) prop("window", -8.98, z + 0, Math.PI / 2, 1.8);
prop("garage", -18, 7.98, Math.PI, 4, 3.6);
// ===== KATTOREITTI PEPIINOON =====
// Teräsportaat romupihalta aurinkopaneelihallin katolle, riippusilta kadun yli harmaiden hallien katolle
// ja hallien katolta lankkusilta Pepiinon hätäportaille (ylös katolle tai sisään hätäovesta).
ladder(-23.5, 8, 0, 1, 1.0, 0, 5);                              // tikkaat romupihalta aurinkopaneelihallin katolle
rect(-24, 18.5, -22, 19.25, 5, 5.5, STEEL, "metal"); rect(-24, 19.25, -22, 20, 5, 6.0, STEEL, "metal");
rect(-24, 20, -22, 30, 5.75, 6.0, 0x7a5a3a, "wood");
rect(-24.15, 20, -24, 30, 6.0, 6.9, 0x8a6a3a); rect(-22, 20, -21.85, 30, 6.0, 6.9, 0x8a6a3a);
prop("bridge", -23, 20, -23, 30, 6.0);
// Maansiirtoauto pihalla (NistiPiha-kuorma-auto, ohjaamo pohjoiseen)
function truck(cx, cz) {
  const R = (x1, z1, x2, z2, y0, y1) => rect(cx + x1, cz + z1, cx + x2, cz + z2, y0, y1, -1);
  R(-6, -1.8, -3, 1.8, 0, 3.2); R(-3, -1.8, 6, 1.8, 0, 1.3);
  R(-3, -1.8, 6, -1.55, 1.3, 2.7); R(-3, 1.55, 6, 1.8, 1.3, 2.7);
  R(5.75, -1.55, 6, 1.55, 1.3, 2.7); R(-3, -1.55, -2.6, 1.55, 1.3, 2.7);
  prop("truck", cx, cz, 0);
}
truck(5, 15);
tires(11.6, 14.4, 4); tires(11.6, 15.4, 6);       // rengaspinoja pitkin lavalle
for (const [x, z] of [[-4, 9], [-2.6, 9], [-4, 10.2]]) pallet(x, z);
pallet(-3.3, 9.6, 2.4);
barrel(1, 20, 0x2e6fb0); barrel(1.8, 20.4, 0xb03a2e);
prop("sign", 15.6, 1.7, 23.6, Math.PI / 2, "MAAKONE OY ←", 2.6, 0.8, "#ffffff", "#1f3b6e", "#1f3b6e");
rect(15.5, 23.5, 15.7, 23.7, 0, 1.4, -1);
prop("barrier", 13, 22.6, 15.4, 22.6); rect(13, 22.5, 15.4, 22.7, 0, 1.0, -1);

// ===================== KESKIHALLI: PIZZALAATIKKO =====================
// Sininen peltihalli. Isot nosturiovet länteen ja itään (eri kohdissa) sekä ovet etelään ja pohjoiseen.
const HT = 11; // korkea varastohalli: estää näkymän katolta katolle
wall(-20, 5.6, 4, 6, 0, HT, BLUEH, "metal", [[-9, -4, 0, 4.2]]);         // länsiseinä
wall(-20, -8, 4, -7.6, 0, HT, BLUEH, "metal", [[-15, -10, 0, 4.2]]);     // itäseinä
wall(3.6, -7.6, 4, 5.6, 0, HT, BLUEH, "metal", [[-3, 0, 0, 2.6]]);       // eteläseinä
wall(-20, -7.6, -19.6, 5.6, 0, HT, BLUEH, "metal", [[-1, 2, 0, 2.6]]);   // pohjoisseinä
rect(-20, -8, 4, 6, HT, HT + 0.4, 0x5d6b78, "metal");
// Lavahyllyt ja laatikot suojaksi
rect(-18.8, -6.5, -16.8, -1.5, 0, 3, 0x2f5f9f, "metal"); rect(-18.8, 2.5, -16.8, 5, 0, 3, 0x2f5f9f, "metal");
rect(-2, 2.5, 1.5, 4, 0, 1.4, 0xa98a5c, "wood"); rect(-3, -6.5, 0, -5, 0, 1.8, 0xa98a5c, "wood");
rect(-14, 1.5, -12.5, 3, 0, 1.0, 0xa98a5c, "wood");
prop("sign", -8, 4.8, 6.04, 0, "VANTTILAN VARASTO", 6, 0.9, "#1f3b6e", "#ffffff", "#f2c14e");
prop("sign", -12.5, 4.8, -8.04, Math.PI, "VANTTILAN VARASTO", 6, 0.9, "#1f3b6e", "#ffffff", "#f2c14e");
// Kaksikerroksinen toimistorakennus keskihallin kyljessä (estää näkymän Pepiinon yläkerrasta Pappan terassille)
rect(4, 0.5, 12.5, 6, 0, 11, 0xc8ccd0, "metal");
for (const z of [1.8, 4.6]) for (const wy of [1.6, 5, 8.4]) prop("window", 12.52, z, Math.PI / 2, wy);
prop("sign", 12.54, 3.3, 3.25, Math.PI / 2, "TOIMISTO", 2.6, 0.6, "#2f3b4a", "#ffffff", "#9aa1a6");
// Merikontti toimiston eteläpuolella (estää näkymän terassilta terassille)
rect(12.7, -3, 15.1, 3.1, 0, 2.9, 0x2f6b4f, "metal");
prop("sign", 15.12, 1.6, 0, Math.PI / 2, "VANTTILAN VARASTO", 4.2, 0.6, "#2f6b4f", "#ffffff", "#2f6b4f");
// Punakattoinen pikkurakennus etelässä (suoja tien puolella)
rect(6, -16, 12, -8, 0, 4, 0xd9c9a8, "plaster");
rect(6.5, -15.5, 11.5, -8.5, 4, 5.6, -1);                       // katon kohta
prop("roof", 5.7, -16.3, 12.3, -7.7, 4, 1.8, 0xb5532f, 1);
for (const z of [-14, -10]) prop("window", 12.02, z, Math.PI / 2, 2);
// Romupiha pohjoisessa
rect(-32, -17, -25, -8, 0, 5, 0xc9ccd0, "metal");           // pieni konepajahalli romupihan laidalla
prop("garage", -24.98, -12.5, Math.PI / 2, 3.6, 3.4);
for (const [x, z] of [[-22, -12.5], [-24, -3]]) prop("scrap", x, z, 1), rect(x - 1.2, z - 1, x + 1.2, z + 1, 0, 0.9, -1); // romukasat maassa
tires(-22, -9, 5); tires(-21.2, -9.6, 3); barrel(-22, -15.5, 0x4a6b3a); barrel(-22.8, -15.9, 0x2e6fb0);
car(-29, 3, "x", 0x6d6d6d);

// ===================== ITÄPUOLI: PUURIVI JA TYÖMAA =====================
// Koivu- ja kuusirivi katu 2:n itäpuolella, kaksi aukkoa kulkua varten
for (let x = -35; x <= 5; x += 2.2) {
  if ((x > -27 && x < -21) || (x > -11 && x < -5)) continue;
  const z = -29.5 + Math.sin(x * 1.7) * 1.2;
  ((Math.round(x * 10) % 3 === 0) ? spruce : birch)(x, z, 1 + ((x * 7) % 3 + 3) % 3 * 0.12);
}
// Työmaa: sorakasa ja punakeltaiset työmaa-aidat
terrainPatch(5, -37, 13, -29, 0, mound(9, -33, 3.6, 3.4, 2.3));
for (const [x1, z1, x2, z2] of [[4.5, -28.6, 13.5, -28.6], [13.5, -37.4, 13.5, -28.6]]) { prop("barrier", x1, z1, x2, z2); rect(Math.min(x1, x2) - 0.1, Math.min(z1, z2) - 0.1, Math.max(x1, x2) + 0.1, Math.max(z1, z2) + 0.1, 0, 1.0, -1); }
// Kuorma-auto Pappan etupihan laidalla
rect(13, -26.5, 19.5, -24, 0.3, 3.0, 0x6b4a33, "paint"); rect(13.1, -26.4, 19.4, -24.1, 0, 0.3, -1); prop("wheels", 16.2, -25.2, "x", 0, 0);

// ===================== PUNAINEN BASE: PAPPA PIZZA =====================
// Pitkien valkoisten hallien eteläpää. Pohjakerros on korotettu (1 m), ulko-ovelle nousevat puuportaat.
// Alakerrassa tummat lasit, yläkerrassa vihreä aaltopelti ja ikkunanauha. Terassi punaisine markiiseineen.
const RF = 1.0, RY1 = 4.6, RY2 = 4.9, RTOP = 8.2;
rect(-6, -62, 8, -48, 0, RF, 0x3a3f45, "concrete");                                             // korotettu sokkeli
wall(7.7, -62, 8, -48, RF, RY1, DARK, "metal", [[-50.5, -48.5, RF, RF + 2.4], [-58, -56, RF, RF + 2.4]]); // eteläseinä alakerta
wall(7.7, -62, 8, -48, RY1, RTOP, GREENM, "metal", [[-61, -52, 5.8, 7.0]]);                       // yläkerta, ikkunanauha
wall(-6, -48.3, 8, -48, RF, RY1, DARK, "metal", [[4, 6, RF, RF + 2.4]]);                          // länsiseinä, sivuovi eteläpäässä
wall(-6, -48.3, 8, -48, RY1, RTOP, GREENM, "metal", [[-4, 6, 5.8, 7.0]]);
wall(-6, -62, -5.7, -48, RF, RTOP, WHITEH, "metal", [[-51, -49, RF, RF + 2.4]]);                  // pohjoisseinä (halliin päin)
wall(-6, -62, 8, -61.7, RF, RTOP, WHITEH, "metal");                                               // itäseinä
// Katto: aukko koillisnurkan portaikolle (portaat katolle), matala kaide; pohjoisreunassa aukko hallin katolta nouseville portaille
rect(-6, -57.5, 8, -48, RTOP, RTOP + 0.4, 0x8d9296, "metal"); rect(-1.5, -62, 8, -57.5, RTOP, RTOP + 0.4, 0x8d9296, "metal");
rect(-6, -62, -1.5, -61.7, RTOP, RTOP + 0.4, 0x8d9296, "metal"); rect(-6, -61.7, -5.7, -57.5, RTOP, RTOP + 0.4, 0x8d9296, "metal");
for (const [a1, b1, a2, b2] of [[-6, -62.1, 8, -61.9], [-6, -48.1, 8, -47.9], [-6.1, -62, -5.9, -56.2], [-6.1, -53.8, -5.9, -48], [7.9, -62, 8.1, -48], [-5.7, -57.6, -3.7, -57.5]]) rect(a1, b1, a2, b2, RTOP + 0.4, RTOP + 1.0, 0x6f757a, "metal");
// Välipohja (aukko portaikon kohdalla)
rect(-1.5, -61.7, 7.7, -48.3, RY1, RY2, 0xb8b3a8, "concrete"); rect(-5.7, -57.5, -1.5, -48.3, RY1, RY2, 0xb8b3a8, "concrete");
floor(-5.7, -61.7, 7.7, -48.3, "tiles", RF); floor(-1.5, -61.7, 7.7, -48.3, "wood", RY2); floor(-5.7, -57.5, -1.5, -48.3, "wood", RY2);
// --- Pohjakerros piirroksen mukaan ---
// Pohjoisreunassa ruokailutilaa ja koillisnurkassa portaat (ylös yläkertaan ja edelleen katolle). Väliseinässä aukko.
const PL = 0xece6da;
wall(-1.5, -61.7, -1.3, -48.3, RF, RY1, PL, "plaster", [[-57.5, -54.3, RF, RY1 - 0.01]]);
const RL1 = 2.95, RL2 = 6.75;
for (let i = 1; i <= 5; i++) rect(-5.7, -57.5 - 0.6 * i, -3.7, -57.5 - 0.6 * (i - 1), RF, RF + (RL1 - RF) * i / 5, STEPC, "concrete");     // 1. nousu pohjoisseinää pitkin
rect(-5.7, -61.7, -1.5, -60.5, RF, RL1, STEPC, "concrete");                                                                              // välitasanne
for (let i = 1; i <= 5; i++) rect(-3.5, -60.5 + 0.6 * (i - 1), -1.5, -60.5 + 0.6 * i, RF, RL1 + (RY2 - RL1) * i / 5, STEPC, "concrete");  // 2. nousu yläkertaan
rect(-3.7, -60.5, -3.5, -57.5, RF, RF + 1.0, PL, "plaster");                                                                             // portaiden välikaide
// Yläkerrasta katolle samassa portaikossa (ohuet porrasaskelmat edellisten yläpuolella)
for (let i = 1; i <= 5; i++) { const t = RY2 + (RL2 - RY2) * i / 5; rect(-5.7, -57.5 - 0.6 * i, -3.7, -57.5 - 0.6 * (i - 1), t - 0.3, t, STEPC, "concrete"); }
rect(-5.7, -61.7, -1.5, -60.5, RL2 - 0.3, RL2, STEPC, "concrete");
for (let i = 1; i <= 5; i++) { const t = RL2 + (RTOP + 0.4 - RL2) * i / 5; rect(-3.5, -60.5 + 0.6 * (i - 1), -1.5, -60.5 + 0.6 * i, t - 0.3, t, STEPC, "concrete"); }
rect(-1.5, -61.7, -1.4, -57.5, RY2, RY2 + 1.0, STEEL, "metal");                                                                          // kaide yläkerrassa
prop("sign", -1.28, 3.3, -59.6, Math.PI / 2, "PORTAAT KATOLLE ↑", 2.2, 0.4, "#121417", "#ffffff", "#8ccf3a");
// Keittiö länsiseinällä ja baaritiski sen itä- ja eteläpuolella (pizzalaatikot pinotaan eteläiselle tiskille)
rect(-0.1, -53.8, 3.6, -53.6, RF, RF + 1.0, 0x2a2a2a, "wood");                            // itäinen baaritiski (aukko pohjoispäässä)
rect(3.6, -53.8, 4.2, -48.3, RF, RF + 1.0, 0x2a2a2a, "wood");                             // eteläinen baaritiski
rect(-0.1, -53.85, 4.25, -53.6, RF + 1.0, RF + 1.06, 0xc0262d, "paint"); rect(3.55, -53.6, 4.25, -48.3, RF + 1.0, RF + 1.06, 0xc0262d, "paint");
rect(-0.15, -49.2, 1.45, -48.3, RF, RF + 1.7, -1); prop("oven", 0.65, -48.75, RF, 0);   // pizzauuni länsiseinällä
rect(-1.3, -53.4, -0.5, -50, RF, RF + 0.95, 0xcfd3d8, "metal");                           // teräspöytä
rect(1.0, -52.6, 2.6, -51.2, RF, RF + 0.95, 0xcfd3d8, "metal"); prop("pizzaprep", 1.8, -51.9, RF + 0.95);
rect(2.9, -49.3, 3.55, -48.3, RF, RF + 2.0, 0xe6e6e6, "metal");                          // kylmäkaappi
for (const z of [-52.5, -50.5]) prop("pizzabox", 3.9, z, RF + 1.06);
prop("sign", 4.22, 3.3, -51, Math.PI / 2, "PIZZA · KEBAB · LOUNAS", 3.4, 0.6, "#121417", "#8ccf3a", "#e8333a");
// Akvaario keskellä ruokailutilaa
rect(0, -58.6, 2.2, -56.6, RF, RF + 1.6, -1); prop("aquarium", 1.1, -57.6, RF, 2.2, 2.0, 1.6);
// Ruokailutilat: pöydät tuoleineen, riippuvalaisimet ja taulut
for (const [x, z] of [[-3.4, -52.8], [6.0, -60.6], [0.6, -60.7], [3.3, -60.7]]) {
  rect(x - 0.7, z - 0.45, x + 0.7, z + 0.45, RF, RF + 0.78, -1);
  prop("dtable", x, z, RF, 1.4, 0.9);
  for (const [cx, cz, cr] of [[-0.35, -0.75, 0], [0.35, -0.75, 0], [-0.35, 0.75, Math.PI], [0.35, 0.75, Math.PI]]) prop("chair", x + cx, z + cz, RF, cr);
  prop("pendant", x, RY1, z);
}
prop("frame", -5.68, 2.6, -52.5, Math.PI / 2, 1.2, 0.9); prop("frame", 7.68, 2.6, -53.5, -Math.PI / 2, 1.2, 0.9); prop("frame", 5.5, 2.6, -61.68, 0, 1.4, 1.0);
prop("plant", 7.2, -61.2, RF); prop("plant", -5.2, -48.8, RF);
// Yläkerta: pöytiä ikkunanauhojen äärellä
for (const [x, z] of [[0, -52], [4, -55], [5, -59.8]]) {
  rect(x - 0.7, z - 0.45, x + 0.7, z + 0.45, RY2, RY2 + 0.78, -1);
  prop("dtable", x, z, RY2, 1.4, 0.9);
  for (const [cx, cz, cr] of [[-0.35, -0.75, 0], [0.35, -0.75, 0], [-0.35, 0.75, Math.PI], [0.35, 0.75, Math.PI]]) prop("chair", x + cx, z + cz, RY2, cr);
  prop("pendant", x, RTOP, z);
}
// Ulkoportaat: pääovelle etelästä, sivuovelle lännestä ja takaovelle pohjoisesta
stairs(11, -49.5, -1, 0, 2, 0, RF, 3, 1.0, DECK, "wood");
stairs(5, -45, 0, -1, 2, 0, RF, 3, 1.0, DECK, "wood");
rect(-7, -51, -6, -49, 0, 0.5, STEPC, "concrete");
// Terassi: puulattia sokkelin tasolla, aita ja kaksi punaista markiisia
rect(8, -61.5, 12.5, -50.5, 0, RF, DECK, "wood");
fence(12.4, -61.5, 12.6, -50.5, RF); fence(8, -61.6, 12.5, -61.4, RF); fence(9.8, -50.6, 12.5, -50.4, RF);
prop("awning", 8.05, -58.3, 3.6, Math.PI / 2, 4.2, "PAPPA PIZZA");
prop("awning", 8.05, -53.9, 3.6, Math.PI / 2, 4.2, "LOUNASRAVINTOLA");
for (const [tx, tz] of [[10.5, -59], [10.5, -55]]) rect(tx - 0.4, tz - 0.4, tx + 0.4, tz + 0.4, RF, RF + 0.75, 0x2b2b2b, "metal");
prop("pappasign", 8.06, 5.35, -50, Math.PI / 2, 3.9);
prop("pappasign", -0.5, 7.55, -47.96, 0, 3.9);
prop("sign", 8.06, 2.3, -60.6, Math.PI / 2, "LOUNAS · PIZZAT · KEBABIT", 2.4, 0.8, "#c0262d", "#ffffff", "#ffffff");
barrel(11.4, -48.2, 0x1f3a2a); barrel(11.4, -52.2, 0xc9a35a);
// Pitkät valkoiset hallit Pappan pohjoispuolella, välissä kuja
rect(-32, -62, -6, -52, 0, 6.5, WHITEH, "metal");
rect(-32, -48, -10, -38, 0, 6.5, WHITEH, "metal");
for (const x of [-18, -12.5]) prop("garage", x, -37.98, 0, 3.6, 3.6);
// ===== KATTOREITTI PAPPA PIZZAAN =====
// Teräsportaat hallin A länsikylkeä pitkin katolle, riippusilta kujan yli hallin B katolle
// ja portaat hallin katolta Pappa Pizzan katolle (sieltä portaikko alas sisälle).
ladder(-21.5, -38, 0, -1, 1.0, 0, 6.5);                         // tikkaat hallin A kylkeä pitkin katolle
rect(-21, -52, -19, -48, 6.3, 6.5, 0x7a5a3a, "wood");
rect(-21.15, -52, -21, -48, 6.5, 7.4, 0x8a6a3a); rect(-19, -52, -18.85, -48, 6.5, 7.4, 0x8a6a3a);
prop("bridge", -20, -52, -20, -48, 6.5);
ladder(-6, -55, 1, 0, 1.0, 6.5, RTOP + 0.4);                     // tikkaat hallin B katolta Pappa Pizzan katolle
for (const x of [-26, -16]) prop("window", x, -51.98, 0, 3), prop("window", x, -48.02, Math.PI, 3);
// Parkkipaikka ja ramppi tielle kuusirivin läpi, mainostaulu
for (const [z, c] of [[-58, 0x1d2126], [-55.5, 0xf2f2f2], [-44, 0x3d5a80], [-34, 0xdedede]]) car(16, z, "x", c);
// Pappa Pizzan lähettiautot (tummanpunaiset), keula rakennukseen päin ja luukku tielle päin
pizzaCar(16, -50.6, "x", Math.PI, 0x7a1018, "PAPPA PIZZA", "#8ccf3a", "#121417");
pizzaCar(16, -47.8, "x", Math.PI, 0x7a1018, "PAPPA PIZZA", "#e8333a", "#f2f2f2");
for (const z of [-59.3, -56.8, -54.2, -45.3, -42.7, -35.3, -32.7]) prop("lines", 16, z, 4.6, 0.12);
for (let z = -63; z <= -27; z += 2.4) if (z < -46 || z > -40) spruce(20.6, z, 1.25 + ((z * 13) % 4 + 4) % 4 * 0.08);
rect(21.1, -38.2, 21.3, -36.2, 0, 3.6, -1);
prop("sign", 21.0, 2.6, -37.2, Math.PI / 2, "PAPPA PIZZA · TÄYTETTY ITSE!", 3.6, 1.8, "#f4f0e4", "#c0262d", "#2e8a3a");
prop("sign", 21.6, 2.4, -46.4, Math.PI / 2, "▲", 0.6, 0.6, "#2f6fd8", "#ffffff", "#ffffff");
rect(21.5, -46.6, 21.7, -46.2, 0, 2.8, -1);

// ===================== ETELÄLAITA: TIE, PYÖRÄTIE JA NIITTY =====================
for (const z of [-56, -40, -24, -8, 8, 24]) { const x = roadX(z) + 4.2; rect(x - 0.15, z - 0.15, x + 0.15, z + 0.15, 0, 7, -1); prop("streetlight", x, z, 7); }
// Niitty pyörätien eteläpuolella: mäntyjä ja koivuja suojaksi
for (const [x, z, s] of [[33.5, 38, 1.1], [34.5, 22, 1.4], [34.6, -8, 1.3], [33.6, -20, 1.2], [34.2, -36, 1.4]]) spruce(x, z, s);
for (const [x, z, s] of [[33.6, 46, 1.2], [34.3, 30, 1.1], [33.5, -14, 1.2], [34.2, -28, 1.1], [34, -60, 1.3]]) birch(x, z, s);
terrainPatch(33, -40.5, 36, -28, 0, mound(35.5, -34, 2.6, 5.5, 1.1));
terrainPatch(32.5, 24, 36, 40, 0, mound(35.5, 32, 3, 7, 1.0));
// Bussipysäkki: katos (suoja) tien varressa
rect(27.2, -2.5, 29, 2.5, 2.4, 2.55, 0x3a3f45, "metal"); rect(28.8, -2.5, 29, 2.5, 0, 2.4, 0x9fc4d8, "metal");
rect(27.25, -2.5, 27.45, -2.3, 0, 2.4, 0x3a3f45, "metal"); rect(27.25, 2.3, 27.45, 2.5, 0, 2.4, 0x3a3f45, "metal");
// Tien eteläpuolen talot kuten ilmakuvassa: painotalo keskellä ja halli kaakossa
rect(27.5, 8, 35.5, 19, 0, 6, 0x6f7f95, "metal");
prop("sign", 27.46, 4.8, 13.5, -Math.PI / 2, "VANTTILAN PAINO", 5, 0.8, "#2f3b4a", "#ffffff", "#9aa1a6");
prop("garage", 27.48, 16.5, -Math.PI / 2, 3.2, 3.4);
for (const z of [10, 12]) prop("window", 27.48, z, -Math.PI / 2, 1.6);
rect(32, -54, 36, -42, 0, 5, 0xd9dadc, "metal");
prop("garage", 31.98, -48, -Math.PI / 2, 3.6, 3.6);

// ===================== TAKAKUJA POHJOISESSA =====================
tires(-35.4, 10, 4); barrel(-35, -40, 0x2e6fb0); car(-34, -56, "x", 0xb03a2e);
for (const z of [-46, 40]) { rect(-36, z - 0.6, -34.9, z + 0.6, 0, 1.5, 0x2f6b4f, "metal"); }   // jäteastiat

// ===================== BASET JA ELÄMÄT =====================
const BASES = {
  sininen: { x: 5.5, y: FL, z: 52, color: 0x3f6fd8, table: [5, 57.15, "x"], door: [0, -1], cam: { p: [5, 10.8, 41.2], look: [0, 2.5, 12] } },  // kuolinkamera katolla
  punainen: { x: 5.8, y: RF, z: -55.5, color: 0xd8473f, table: [3.9, -51, "z"], door: [0, 1], cam: { p: [2, 11.4, -49.2], look: [-2, 2.5, -20] } },
};
const SPAWNS = {
  sininen: [[2, 47.2, FL], [8.5, 47.2, FL], [2, 55.8, FL], [9, 55.8, FL], [5.5, 47.6, FL], [8.5, 43, FL], [5.6, 45, PY2], [10.8, 45.4, PY2], [4.6, 52.5, PY2]],
  punainen: [[-3, -49.6, RF], [-4.6, -55.8, RF], [5.8, -58.3, RF], [6.2, -50.5, RF], [1.2, -55.2, RF], [2, -52, RY2], [5.5, -50, RY2], [4, -58, RY2]],
};
// Pizzapöydät: yksi pohjoisella takakujalla ja yksi niityllä tien eteläpuolella, keskikohdan tuntumassa
const GRILLS = [[-34.3, 2, 0, -Math.PI / 2], [33.6, 6, 0, Math.PI / 2]];
const GRILL_SIZE = [1.2, 1.0, 1.8];
for (const [x, z] of GRILLS) rect(x - GRILL_SIZE[0] / 2, z - GRILL_SIZE[2] / 2, x + GRILL_SIZE[0] / 2, z + GRILL_SIZE[2] / 2, 0, GRILL_SIZE[1], -1);

// ===================== TAUSTA KENTÄN ULKOPUOLELLA =====================
prop("groundplane", -400, -500, 400, -64.5, "grass", 0.01);
prop("groundplane", -400, 64.5, 400, 500, "grass", 0.01);
prop("groundplane", 36.5, -64.5, 400, 64.5, "grass", 0.01);
prop("groundplane", -400, -64.5, -36.5, 64.5, "grass", 0.01);

// Lisää halleja pohjoisessa ja metsää ympärillä
for (const [x1, z1, x2, z2, h, c] of [[-80, 20, -45, 60, 7, 0x9aa1a6], [-70, -30, -44, 10, 6, 0xc9ccd0], [-90, -80, -48, -40, 8, 0xe9e9e4], [-60, 70, -40, 100, 6, 0x8f969c], [44, 70, 70, 96, 6, 0x9aa1a6]]) prop("hall", x1, z1, x2, z2, h, c);
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < 70; i++) {
  const side = i % 3, t = rnd();
  const [x, z] = side === 0 ? [-40 + t * 80, -70 - rnd() * 40] : side === 1 ? [40 + rnd() * 45, -120 + t * 240] : [-40 - rnd() * 30, -120 + t * 60];
  const sc = 1.3 + rnd() * 0.8;
  if (rnd() < 0.6) prop("pine", x, z, 0, sc); else prop("birch", x, z, sc);
}

const PEPINO = {
  id: "pepino",
  name: "Pepiino vs. Pappa Pizza",
  desc: "Kerää pizzalaatikoita! Espoon Vanttila: Ravintola Pepiino vastaan Pappa Pizza, keskellä sininen halli.",
  x: X, z: Z, boxes: toMinMax(B), bases: BASES, baseRadius: 2.5, spawns: SPAWNS,
  recipe: [-10, 0, -1.0], recipeWhere: "hallissa", recipeTo: "halliin", item: "pizza",
  grills: GRILLS, grillSize: GRILL_SIZE, grillKind: "pizza", floors: FLOORS, props: PROPS, terrain: TERRAIN, ladders: LADDERS,
  // Reunat: [itä (z−), länsi (z+), pohjoinen (x−), etelä (x+)]
  theme: { ground: "#5b7a3a", line: "#66844a", groundTex: "grass", sky: 0xa9c6e4, wall: 0x6b7a5a, fogNear: 110, fogFar: 600,
           walls: [{ h: 1.2, color: 0x6b5a40, tex: "wood" }, { h: 1.2, color: 0x6b5a40, tex: "wood" }, { h: 2.2, color: 0x7d858c, tex: "metal" }, { h: 0.8, color: 0x8f949a, tex: "metal" }] },
};

return { PEPINO };
})();
__m["margariini"] = (() => {
const { toMinMax } = __m["map"];
// ====== KARTTA: MIKAN MARGARIINITEHDAS ======
// Totin piirroksen mukaan (TF2:n Turbinen henkeen). Kartta on pistesymmetrinen: punainen puoli on sininen
// puoli käännettynä 180° keskipisteen ympäri (x → −x, z → −z).
//  - Sininen synnyinpaikka on luoteessa toisessa kerroksessa (4,8 m), base lounaassa maantasossa.
//  - Synnyinpaikasta portaat alas baseen (etelään) ja keskihalliin (itään).
//  - Keskihallissa on pyöreä margariinisiilo; sen katolle ilmestyy margariiniresepti. Siilon ympäri kiertää
//    kaksi luiskaa maasta katolle. Hallin seinillä on parveke (4,8 m), jolle pääsee luiskilta silloilla.
//  - Parvekkeelta toisen kerroksen tunneli vie vastustajan synnyinpaikan käytävään ja baseen (pudotus).
//  - Alempi reitti: base → konehuone → käytävä → halli.
//  - Goody Cao -kaakao antaa elämää: kolme per puoli.
//
// Rakennus "kaiverretaan": jokainen tila on suorakulmio, jolla on lattia- ja kattokorkeus. Ruudukko (0,5 m)
// laskee jokaiselle kohdalle, mikä korkeus on kiinteää, ja yhdistää samanlaiset ruudut laatikoiksi.
// Näin seinät, lattiat, välikatot ja katot syntyvät automaattisesti ja tilat liittyvät toisiinsa vain siellä,
// missä ne koskettavat samalla korkeudella.

const X = 68, Z = 28;          // kartan puolikkaat (136 × 56 m)
const F2 = 6.0;                // toinen kerros (kerroskorkeus 6 m)
const HALL_TOP = 20;           // keskihallin (korkea tehdashalli) katon korkeus
const ROOF_TOP = HALL_TOP + 0.4; // koko rakennuksen yläpinta: katot ja seinät ulottuvat tänne, jotta taivas ei pilkota raoista
const BASE_CEIL = F2 + 4.0;    // basen korkeus (tunnelin reunus mahtuu sisään)
const SILO_R = 3.2, SILO_H = 8.0;
const D = -6;                  // sinisen puolen huoneet siirretty 6 m länteen, jotta keskihalli mahtuu suuremmaksi
const sx = (x) => x + D;
const B = [], PROPS = [], LADDERS = [];
const prop = (kind, ...a) => PROPS.push([kind, ...a]);
const box = (x1, y1, z1, x2, y2, z2, color, tex) => B.push([(x1 + x2) / 2, (z1 + z2) / 2, x2 - x1, z2 - z1, y2 - y1, color, y1, tex]);

// ---- Tilat (sininen puoli + keskihalli). f = lattia (luku tai funktio), c = katto ----
// zone: "b" = sininen puoli (x siirretään D:llä), "h" = halli (punainen puoli peilataan automaattisesti, zone "r")
const SPACES = [];
const space = (x1, z1, x2, z2, f, c, zone = "b") => {
  const sh = zone !== "h" ? D : 0, mv = (v) => (typeof v === "number" ? v : { ax: v.ax, fn: v.ax === "x" ? (x) => v.fn(x - sh) : v.fn });
  SPACES.push({ x1: x1 + sh, z1, x2: x2 + sh, z2, f: mv(f), c: mv(c), zone });
};
// Tasaiset portaat: n samankorkuista askelmaa (enintään 0,4 m, kävellen noustava), jokainen askelma vähintään 0,5 m syvä
const stepF = (a, b, ya, yb, step = 0.4) => { const n = Math.ceil(Math.abs(yb - ya) / step - 1e-9); return (v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return ya + ((yb - ya) * Math.min(n, Math.floor(t * (n + 1)))) / n; }; };
const lin = (a, b, ya, yb) => (v) => ya + (yb - ya) * Math.max(0, Math.min(1, (v - a) / (b - a)));
const SLOPES = []; // portaiden kaltevat katot (näkyvä tasainen luiska, porrastettu törmäyskatto sen yläpuolella)
const UP = 4.2, LOW = 4.6;     // käytävien huonekorkeus: yläkerta ja alakerta

// Sininen synnyinpaikka (2. kerros) ja sen käytävä itään + Goody Cao -syvennys pohjoisessa
space(-53.7, -14.9, -33.3, -3.0, F2, F2 + 5.5);   // korkea synnyinpaikka
space(-48.2, -9.5, -23.5, -5.4, F2, F2 + UP);
space(-30.3, -12.2, -26.5, -9.5, F2, F2 + UP);
// Portaat itään alas (6 → 0) ja maakäytävä halliin
const stE = stepF(-23.5, -13.5, F2, 0);
space(-23.5, -9.5, -13.5, -5.4, { ax: "x", fn: stE }, { ax: "x", fn: lin(-23.5, -13.5, F2 + UP, LOW) });
SLOPES.push([sx(-23.5), -9.5, sx(-13.5), -5.4, "x", F2 + UP - 0.2, LOW - 0.2]);
space(-13.5, -9.5, -11.6, -5.4, 0, LOW);
// Portaat etelään alas baseen
const stS = stepF(-3.0, 6.4, F2, 0);
space(-48.2, -3.0, -43.9, 6.4, { ax: "z", fn: stS }, { ax: "z", fn: lin(-3.0, 6.4, F2 + UP, LOW) });
SLOPES.push([sx(-48.2), -3.0, sx(-43.9), 6.4, "z", F2 + UP - 0.2, LOW - 0.2]);
space(-48.2, 6.4, -43.9, 9.4, 0, LOW);
// Base (kaksi kerrosta korkea, jotta tunnelin pudotusreunus mahtuu)
space(-49.9, 9.4, -37.1, 25.1, 0, BASE_CEIL, "B"); // zone "B": basen oma sisustus (Turbinen tiedusteluhuone)
// Neuvotteluhuone basen takana: lasiseinän takana, sinne ei pääse (lasi on näkymätön seinä)
space(-59.7, 12.3, -49.9, 24.2, 0, 4.2, "B");
// Alempi reitti: konehuone → kone- ja säiliöhuone → käytävät → halliin
space(-36.6, 11.0, -30.3, 22.5, 0, LOW);
space(-37.1, 16.8, -36.6, 20.2, 0, 3.2); // ovi basesta konehuoneeseen
space(-30.3, 2.6, -23.5, 10.4, 0, LOW);   // salainen tutkimusosasto (koriste lasin takana)
space(-30.3, 12.0, -23.5, 19.0, 0, LOW);  // maantason käytävä konehuoneesta leveään käytävään portaiden vieressä
// Leveä alakerran käytävä (korkea), jonka eteläpäässä on korotettu taso
const WIDE = 6.0, PLAT_H = 2.0;
space(-23.5, 3.0, -13.0, 23.4, 0, WIDE);
// Yhdyskäytävä konehuoneesta (basen puolelta): portaat ylös korotetulle tasolle
space(-30.3, 20.0, -23.5, 23.4, { ax: "x", fn: stepF(-30.3, -23.5, 0, PLAT_H) }, WIDE);
space(-13.0, 3.0, -11.6, 8.1, 0, LOW);
// Toisen kerroksen tunneli = neliskanttinen ilmastointikanava (metallia, yksi askelma sisään):
// synnyinpaikan käytävästä etelään, sitten itään hallin koppiin ja länteen baseen
const TUN_F = F2 + 0.4, TUN_C = TUN_F + 2.6;
space(-28.2, -5.4, -25.8, -0.4, TUN_F, TUN_C, "t");
space(-28.2, -2.6, -11.6, -0.4, TUN_F, TUN_C, "t");
space(-40.6, -2.6, -28.2, -0.4, TUN_F, TUN_C, "t");
space(-40.6, -0.4, -38.4, 9.4, TUN_F, TUN_C, "t");
// Keskihalli (iso kuten Turbinessa): 35 × 40 m, 20 m korkea (skaalataan lopuksi 1,5-kertaiseksi)
const HX = 17.6, HZ = 20;
space(-HX, -HZ, HX, HZ, 0, HALL_TOP, "h");
// Goody Cao -syvennykset hallin pohjois- ja eteläseinässä porttien vasemmalla puolella (molemmat erikseen, halli ei peilaudu)
space(-5.0, -HZ - 1.4, -3.0, -HZ, 0, 2.4, "h");
space(3.0, HZ, 5.0, HZ + 1.4, 0, 2.4, "h");

// ---- Erityiset kerrokset (ruudussa kaksi tilaa päällekkäin) ----
// Parveke vain joukkueen omalla seinällä (kuten Turbinessa), keskeltä leveämpi kopin kohdalta. Punainen peilataan.
const BAL = 3.5;
const BALCONY = [[-HX, -HZ, -HX + BAL, HZ], [-HX, -5.5, -11.6, 5.5]];
// Portaat lattialta parvekkeelle hallin pohjois- ja eteläseinällä (kiinteät, kuten Turbinessa)
const STAIR_X0 = -HX + BAL, STAIR_X1 = -2.1, stH = stepF(STAIR_X1, STAIR_X0, 0, F2);
const STAIRS = [[STAIR_X0, HZ - 2.4, STAIR_X1, HZ]]; // sininen nousee eteläseinällä, punainen (peilattu) pohjoisseinällä
// Korotettu taso käytävän päässä ja portaat siltä alas käytävään (sininen; punainen peilataan)
const OVR = [
  { r: [sx(-23.5), 17.5, sx(-13.0), 23.4], f: () => PLAT_H, c: WIDE, zone: "b" },
];
// Tunnelin pää basessa: reunus toisen kerroksen korkeudella (pudotus alas, tikkaat takaisin ylös)
// Basessa toisen kerroksen kiertävä käytävä seinien vierellä (Turbinen tapaan); tunneli tulee itäreunalle
const LEDGE = [[-49.9, 9.4, -37.1, 11.0], [-49.9, 23.5, -37.1, 25.1], [-49.9, 9.4, -48.3, 25.1], [-40.6, 9.4, -37.1, 25.1]].map(([a, b, c, d]) => [sx(a), b, sx(c), d]);
const inR = (x, z, r) => x > r[0] && x < r[2] && z > r[1] && z < r[3];
const inSym = (x, z, list) => list.some((r) => inR(x, z, r) || inR(-x, -z, r));

// ---- Ruudukko ----
const C = 0.5, NX = Math.round((2 * X) / C), NZ = Math.round((2 * Z) / C);
const mirror = (s) => ({ ...s, x1: -s.x2, x2: -s.x1, z1: -s.z2, z2: -s.z1, zone: { b: "r", B: "R" }[s.zone] || s.zone, mir: true });
const ALL = [...SPACES, ...SPACES.filter((s) => s.zone !== "h").map(mirror)];
const val = (v, s, x, z) => (typeof v === "number" ? v : v.fn(v.ax === "x" ? (s.mir ? -x : x) : (s.mir ? -z : z)));
function cellSpaces(x, z) {
  const out = [];
  for (const s of ALL) {
    if (x < s.x1 || x > s.x2 || z < s.z1 || z > s.z2) continue;
    out.push({ f: val(s.f, s, x, z), c: val(s.c, s, x, z), open: s.open, zone: s.zone });
  }
  for (const o of OVR) {
    if (inR(x, z, o.r)) return [{ f: o.f(x, z), c: o.c, zone: o.zone }];
    if (inR(-x, -z, o.r)) return [{ f: o.f(-x, -z), c: o.c, zone: { b: "r", B: "R" }[o.zone] || o.zone }];
  }
  for (const r of STAIRS) {
    if (inR(x, z, r)) return [{ f: stH(x), c: HALL_TOP, zone: "h", fr: "stair" }];
    if (inR(-x, -z, r)) return [{ f: stH(-x), c: HALL_TOP, zone: "h", fr: "stair" }];
  }
  // Parvekkeet ja reunus jakavat tilan kahteen kerrokseen
  const ledge = inSym(x, z, LEDGE);
  if (inSym(x, z, BALCONY) || ledge) {
    const top = ledge ? BASE_CEIL : HALL_TOP;
    return [{ f: 0, c: F2 - 0.3, zone: out[0]?.zone || "h" }, { f: F2, c: top, zone: out[0]?.zone || "h" }];
  }
  if (out.length < 2) return out;
  // Päällekkäiset tilat yhdistetään (sama kerros): lattia matalin, katto korkein
  out.sort((a, b) => a.f - b.f);
  const merged = [out[0]];
  for (const s of out.slice(1)) {
    const m = merged[merged.length - 1];
    if (s.f <= m.c - 0.5) { m.c = Math.max(m.c, s.c); m.open = m.open || s.open; m.f = Math.min(m.f, s.f); } else merged.push({ ...s });
  }
  return merged;
}
const grid = [];
for (let i = 0; i < NX; i++) { grid[i] = []; for (let j = 0; j < NZ; j++) grid[i][j] = cellSpaces(-X + (i + 0.5) * C, -Z + (j + 0.5) * C); }
const ROOF = 0.3;
const keyOf = [];
// Turbinen tapaan: lattiat joukkueen värisiä, seinät harmaita ja seinän alaosassa joukkueen värinen raita.
// Ilmastointikanava (zone "t") on kauttaaltaan metallia.
const COL = { floor_b: [0x5d71a0, "concrete"], floor_r: [0x9a5a4c, "concrete"], floor_h: [0x85837e, "concrete"], floor_t: [0x9aa1a8, "metal"],
  slab: [0x8a8f97, "metal"], stair: [0x7d838b, "metal"], roof: [0xd2cdc2, "plaster"], duct: [0x9aa1a8, "metal"],
  wall: [0xb6b8ba, "plaster"], wall_h: [0xc6c6c1, "brick"],
  stripe_b: [0x3f63b8, "plaster"], stripe_r: [0xb2443a, "plaster"], stripe_h: [0x56595e, "plaster"],
  // Base Turbinen tiedusteluhuoneen tapaan: tumma lattia, beige seinä, leveä vaalea väriraita ja tumma aaltopeltikatto
  floor_B: [0x4d5a70, "concrete"], floor_R: [0x6e4740, "concrete"], wall_base: [0xd9c9ae, "plaster"],
  stripe_B: [0x6a9bbb, "plaster"], stripe_R: [0xc07a68, "plaster"], roof_base: [0x5c6169, "metal"] };
const STRIPE = 0.8, STRIPE_BASE = 1.5; // väriraidan korkeus seinän alaosassa (basessa korkeampi)
const isBase = (z) => z === "B" || z === "R";
function paint(segs, y0, y1, role) {
  const out = [];
  for (const [a, b, r] of segs) {
    if (b <= y0 || a >= y1) { out.push([a, b, r]); continue; }
    if (a < y0) out.push([a, y0, r]);
    out.push([Math.max(a, y0), Math.min(b, y1), role]);
    if (b > y1) out.push([y1, b, r]);
  }
  return out;
}
for (let i = 0; i < NX; i++) {
  keyOf[i] = [];
  for (let j = 0; j < NZ; j++) {
    const sp = grid[i][j];
    let iv = [];
    if (sp.length) {
      let y = 0;
      sp.forEach((s) => {
        if (s.f > y + 1e-6) iv.push([y, s.f, s.fr || (y === 0 ? "floor_" + s.zone : "slab")]);
        y = s.c;
      });
      const lz = sp[sp.length - 1].zone;
      if (ROOF_TOP > y + 1e-6) iv.push([y, ROOF_TOP, lz === "t" ? "duct" : isBase(lz) ? "roof_base" : "roof"]); // kaikki katot samaan yläpintaan: ei rakoja
    } else {
      // Seinä: ruutu, jonka vieressä on tilaa. Väritetään korkeuden mukaan naapuritilojen perusteella.
      const nb = [];
      for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) { const n = grid[i + di]?.[j + dj]; if (n) nb.push(...n); }
      if (nb.length) {
        let segs = [[0, ROOF_TOP, nb.some((n) => n.zone === "h") ? "wall_h" : nb.some((n) => isBase(n.zone)) ? "wall_base" : "wall"]];
        for (const n of nb) if (n.zone !== "t") segs = paint(segs, n.f, Math.min(n.c, n.f + (isBase(n.zone) ? STRIPE_BASE : STRIPE)), "stripe_" + n.zone);
        for (const n of nb) if (n.zone === "t") segs = paint(segs, n.f - 0.05, n.c + 0.05, "duct");
        for (const sg of segs) { const l = iv[iv.length - 1]; if (l && l[2] === sg[2] && Math.abs(l[1] - sg[0]) < 1e-6) l[1] = sg[1]; else if (sg[1] - sg[0] > 1e-3) iv.push([...sg]); }
      }
    }
    keyOf[i][j] = iv.length ? JSON.stringify(iv.map((v) => [+v[0].toFixed(2), +v[1].toFixed(2), v[2]])) : "";
  }
}
// Samanlaiset ruudut yhdistetään suorakulmioiksi
const used = keyOf.map((r) => r.map(() => false));
for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) {
  const k = keyOf[i][j];
  if (!k || used[i][j]) continue;
  let i2 = i; while (i2 + 1 < NX && keyOf[i2 + 1][j] === k && !used[i2 + 1][j]) i2++;
  let j2 = j; outer: while (j2 + 1 < NZ) { for (let a = i; a <= i2; a++) if (keyOf[a][j2 + 1] !== k || used[a][j2 + 1]) break outer; j2++; }
  for (let a = i; a <= i2; a++) for (let b = j; b <= j2; b++) used[a][b] = true;
  const x1 = -X + i * C, x2 = -X + (i2 + 1) * C, z1 = -Z + j * C, z2 = -Z + (j2 + 1) * C;
  for (const [y0, y1, role] of JSON.parse(k)) { const [col, tex] = COL[role]; box(x1, y0, z1, x2, y1, z2, col, tex); }
}

// ---- Tikkaat: tunnelin reunukselta basessa takaisin ylös (ja peilattuna) ----
// (ei tikkaita: basen kiertävälle käytävälle pääsee vain tunnelista)

// Katon korkeus kohdassa (x, z): valaisimet kiinnitetään aina oikeaan kattoon
const ceilAt = (x, z) => { const sp = cellSpaces(x, z); return sp.length ? sp[sp.length - 1].c : 4; };

// ---- Koristeet ja koneet: s = 1 sininen puoli, s = −1 punainen (x → −x, z → −z, kääntö +180°) ----
// Hallin koordinaatit ovat sellaisenaan; sivuhuoneiden x siirretään sx():llä.
const BOOTH = { x1: -HX, x2: -13.6, z1: -4.5, z2: 4.5 }; // parvekkeen valvomokoppi
for (const s of [1, -1]) {
  const r = (rot) => (s > 0 ? rot : rot + Math.PI), team = s > 0 ? "#3f6fd8" : "#d8473f", teamHex = s > 0 ? 0x3f6fd8 : 0xd8473f;
  const bx = (x1, y1, z1, x2, y2, z2, col, tex) => (s > 0 ? box(x1, y1, z1, x2, y2, z2, col, tex) : box(-x2, y1, -z2, -x1, y2, -z1, col, tex));
  const P = (x, z) => [x * s, z * s];
  // Kyltit (taso osoittaa suuntaan (sin rot, cos rot))
  prop("sign", (-HX + 0.06) * s, F2 + 5.0, -12 * s, r(Math.PI / 2), "MIKAN MARGARIINITEHDAS", 6, 1.0, "#f2c531", "#2a2622", "#2a2622");
  prop("sign", sx(-43.6) * s, F2 + 3.2, -14.95 * s, r(0), "SYNNYINPAIKKA", 5, 0.8, team, "#ffffff", "#ffffff");
  prop("sign", sx(-43.5) * s, BASE_CEIL - 2.0, 24.95 * s, r(Math.PI), "MARGARIINIVARASTO", 5.5, 0.8, team, "#ffffff", "#ffffff");
  prop("sign", sx(-26.9) * s, 3.4, 2.55 * s, r(0), "SALAINEN TUTKIMUSOSASTO", 4.5, 0.6, "#2a2622", "#f2c531", "#f2c531");
  // Valaisimet katossa
  // Tehtaan loisteputkivalaisimet katossa (alongZ = putki z-suuntaan). Portaikoissa ei valaisimia.
  for (const [x, z, y, alongZ] of [[-43, -9, F2 + 5.5, 0], [-37, -11, F2 + 5.5, 0], [-50, -11, F2 + 5.5, 0], [-36, -5.5, F2 + 5.5, 0], [-30, -7.4, F2 + UP, 0], [-40, -7.4, F2 + UP, 0],
                                   [-43.5, 12, BASE_CEIL, 0], [-39.5, 21, BASE_CEIL, 1], [-33.7, 17, LOW, 1], [-27, 9, LOW, 1], [-21, 8, WIDE, 1], [-15.5, 8, WIDE, 1],
                                   [-21, 14.5, WIDE, 1], [-17, 20.5, WIDE, 0], [-27, 15.5, LOW, 0], [-55.8, 15.5, 4.2, 1], [-55.8, 21, 4.2, 1], [-34.4, -10.8, F2 + UP, 0]])
    prop("tubelight", sx(x) * s, ceilAt(sx(x), z), z * s, r(alongZ ? Math.PI / 2 : 0), 1.8, 0.15);
  for (const [x, z, alongZ] of [[-34, -1.5, 0], [-20, -1.5, 0], [-39.5, 4, 1], [-27, -3.8, 1]]) prop("tubelight", sx(x) * s, TUN_C, z * s, r(alongZ ? Math.PI / 2 : 0), 1.2, 0); // kanavan kattovalot
  // Ilmastointiputket konehuoneissa
  prop("duct", sx(-24.2) * s, 3.2 * s, sx(-24.2) * s, 10.0 * s, LOW - 0.4, 0.22);
  prop("duct", sx(-14.0) * s, 3.5 * s, sx(-14.0) * s, 23.0 * s, WIDE - 0.5, 0.3);
  prop("duct", sx(-22.6) * s, 3.5 * s, sx(-22.6) * s, 23.0 * s, WIDE - 0.4, 0.22);
  // Neuvotteluhuone: pöytä, tuolit ja suuri lasiseinä basen puolella (lasi on törmäävä, näkymätön seinä)
  prop("dtable", sx(-55.8) * s, 18.2 * s, 0, 1.4, 4.2);
  for (const z of [16.6, 18.2, 19.8]) { prop("chair", sx(-57.2) * s, z * s, 0, r(Math.PI / 2)); prop("chair", sx(-54.4) * s, z * s, 0, r(-Math.PI / 2)); }
  bx(sx(-50.25), 0, 12.3, sx(-49.9), 4.2, 24.2, -1);
  prop("glass", sx(-50.05) * s, 18.25 * s, 0, 4.2, r(Math.PI / 2), 11.9);
  prop("frame", sx(-59.6) * s, 2.1, 18.2 * s, r(Math.PI / 2), 2.4, 1.5);
  // Margariinikone konehuoneessa ja säiliöt alemmalla käytävällä (törmäävät)
  // Salainen tutkimusosasto on koriste: lasiseinät käytävän ja konehuoneen puolella, sisään ei pääse
  bx(sx(-23.8), 0, 2.6, sx(-23.5), LOW, 10.4, -2);
  prop("glass", sx(-23.62) * s, 6.5 * s, 0, LOW, r(Math.PI / 2), 7.8);
  prop("sign", sx(-23.45) * s, LOW - 0.45, 6.5 * s, r(Math.PI / 2), "SALAINEN TUTKIMUSOSASTO", 4.5, 0.6, "#2a2622", "#f2c531", "#f2c531");
  prop("dtable", sx(-25.5) * s, 6.0 * s, 0, 1.2, 3.0);
  for (const z of [4.6, 6.0, 7.4]) prop("chair", sx(-24.4) * s, z * s, 0, r(-Math.PI / 2));
  prop("console", sx(-29.9) * s, 0.95, 5.5 * s, r(Math.PI / 2), 3.0);
  bx(sx(-30.25), 0, 4.0, sx(-29.7), 0.95, 7.0, 0x3a3d42, "metal");
  bx(sx(-28.6), 0, 4.6, sx(-26.6), 1.3, 9.6, 0xd9b84a, "metal");       // liukuhihnakone
  bx(sx(-28.3), 1.3, 5.0, sx(-26.9), 1.45, 9.2, 0x2a2a2c, "metal");    // hihna
  bx(sx(-14.8), 0, 8.0, sx(-13.2), 3.0, 9.6, 0xbfc4c8, "metal");       // säiliöt leveän käytävän seinällä
  bx(sx(-14.8), 0, 10.2, sx(-13.2), 3.0, 11.8, 0xbfc4c8, "metal");
  bx(sx(-23.3), PLAT_H, 21.4, sx(-21.7), PLAT_H + 2.6, 23.2, 0xbfc4c8, "metal"); // säiliö korotetulla tasolla
  // Synnyinpaikan L-muotoinen lasikoppi (pohjois- ja länsiseinän vierellä); ovista pääsee käytävälle
  const gwall = (x1, z1, x2, z2) => {
    const y0 = F2, y1 = F2 + 3.2, alongX = z1 === z2, len = alongX ? x2 - x1 : z2 - z1;
    bx(alongX ? x1 : x1 - 0.06, y0, alongX ? z1 - 0.06 : z1, alongX ? x2 : x1 + 0.06, y1, alongX ? z1 + 0.06 : z2, -2);
    prop("glass", ((x1 + x2) / 2) * s, ((z1 + z2) / 2) * s, y0, y1, r(alongX ? 0 : Math.PI / 2), len, true);
  };
  for (const [a, b] of [[-50.4, -45.0], [-43.0, -40.0], [-38.0, -36.5]]) gwall(sx(a), -11.6, sx(b), -11.6);
  gwall(sx(-36.5), -14.9, sx(-36.5), -11.6);
  for (const [a, b] of [[-11.6, -7.5], [-5.5, -3.0]]) gwall(sx(-50.4), a, sx(-50.4), b);
  for (const [a, b] of [[-45.0, -43.0], [-40.0, -38.0]]) bx(sx(a), F2 + 2.5, -11.68, sx(b), F2 + 3.2, -11.52, 0x2c2f34, "metal"); // ovien yläpuitteet
  bx(sx(-50.48), F2 + 2.5, -7.5, sx(-50.32), F2 + 3.2, -5.5, 0x2c2f34, "metal");

  // Basen pöytä, jolle kerätyt margariinit asetetaan (pöytälevy 0,9 m korkeudella)
  bx(sx(-46.6), 0.92, 23.25, sx(-44.4), 1.0, 23.95, 0x8f979e, "metal");
  for (const [lx, lz] of [[-46.5, 23.35], [-44.6, 23.35], [-46.5, 23.75], [-44.6, 23.75]]) bx(sx(lx), 0, lz, sx(lx) + 0.1, 0.92, lz + 0.1, 0x3a3d42, "metal");
  bx(sx(-36.4), 0, 20.6, sx(-34.4), 1.1, 22.2, 0x8a6a3a, "wood");       // laatikkopino

  // ---- Base Turbinen tiedusteluhuoneen tapaan: kaiteilla rajattu vaalea reseptialue, valokatto ja palkit ----
  const IA = [sx(-48.6), 17.6, sx(-42.4), 24.8]; // reseptialue (x1, z1, x2, z2)
  prop("intelarea", ...(s > 0 ? IA : [-IA[2], -IA[3], -IA[0], -IA[1]]), sx(-45.5) * s, 21 * s, teamHex);
  prop("skylight", sx(-44.45) * s, 17.25 * s, 6.4, 9.5, BASE_CEIL, r(0));
  // Kiertävän käytävän kaide (itäreunassa aukko tunnelin kohdalla, josta voi pudottautua alas)
  { const X1 = sx(-48.3), X2 = sx(-40.6), Z1 = 11.0, Z2 = 23.5;
    for (const [x1, z1, x2, z2] of [[X1, Z1, X2, Z1], [X1, Z2, X2, Z2], [X1, Z1, X1, Z2], [X2, 13.6, X2, Z2]]) {
      bx(Math.min(x1, x2) - 0.06, F2, Math.min(z1, z2) - 0.06, Math.max(x1, x2) + 0.06, F2 + 1.05, Math.max(z1, z2) + 0.06, -1);
      prop("railing", ...(s > 0 ? [x1, z1, x2, z2] : [-x1, -z1, -x2, -z2]), F2);
    } }
  const rail = (x1, z1, x2, z2) => { bx(x1 - 0.06, 0, z1 - 0.06, x2 + 0.06, 1.05, z2 + 0.06, -1); prop("railing", ...(s > 0 ? [x1, z1, x2, z2] : [-x1, -z1, -x2, -z2])); };
  rail(IA[0], IA[1], sx(-46.6), IA[1]); rail(sx(-44.4), IA[1], IA[2], IA[1]);     // pohjoissivu, aukko keskellä
  rail(IA[2], IA[1], IA[2], 20.0); rail(IA[2], 22.2, IA[2], IA[3]);                // itäsivu, aukko konehuoneen oven suuntaan
  rail(IA[0], IA[1], IA[0], IA[3]);                                                // länsisivu (lasiseinän puolella)
  prop("board", sx(-37.15) * s, 2.0, 13.5 * s, r(-Math.PI / 2));                  // ilmoitustaulu

  // ---- Keskihallin alakerta Turbinen tapaan: turbiinit laattakehyksissä, kontit, rullaovet ----
  for (const [x, z] of [[-8.5, -11.5], [-9.5, 12]]) { const [px, pz] = P(x, z); bx(x - 0.9, 0, z - 0.9, x + 0.9, 2.6, z + 0.9, -1); prop("turbine", px, pz); }
  bx(-10.6, 0, 0.5, -8.2, 2.6, 6.5, s > 0 ? 0x2f5fa8 : 0xa8382f, "metal");  // oma kontti
  prop("sign", (-8.18) * s, 1.4, 3.5 * s, r(Math.PI / 2), s > 0 ? "SININEN" : "PUNAINEN", 3.2, 0.7, "none", "#f2f0e8", "#f2f0e8");
  prop("sign", (-10.62) * s, 1.4, 3.5 * s, r(-Math.PI / 2), s > 0 ? "SININEN" : "PUNAINEN", 3.2, 0.7, "none", "#f2f0e8", "#f2f0e8");
  prop("shutter", 0, 1.6, -19.97 * s, r(0), 3.4, 3.2);
  prop("sign", 2.6 * s, 3.6, -19.96 * s, r(0), "PORTTI " + (s > 0 ? 1 : 2), 1.2, 0.45, "#c0392b", "#ffffff", "#ffffff");
  // Ikkunat yläreunassa: pohjois-/eteläseinillä neljä, oman parvekkeen seinällä kaksi
  // Suuret ikkunat katonrajassa: pohjois-/eteläseinillä neljä, parvekeseinällä kolme
  for (const x of [-13, -4.5, 4.5, 13]) prop("hallwin", x * s, 16.2, -19.96 * s, r(0), 7.4, 5);
  for (const z of [-12.5, 0, 12.5]) prop("hallwin", (-HX + 0.04) * s, 16.2, z * s, r(Math.PI / 2), 9, 5);

  // ---- Valvomokoppi parvekkeella (ikkunat halliin, ovet pohjoiseen ja etelään, tunneli tulee takaseinästä) ----
  const { x1, x2, z1, z2 } = BOOTH, y = F2, wall = 0xdcd6c8, T = 0.2;
  bx(x2 - T, y, z1, x2, y + 1.0, z2, wall, "plaster");                              // etuseinän alaosa
  bx(x2 - T, y + 2.4, z1, x2, y + 3.0, z2, teamHex, "plaster");                     // ylälista joukkueen värinen
  for (const pz of [z1, -1.6, 1.4, z2 - T]) bx(x2 - T, y + 1.0, pz, x2, y + 2.4, pz + T, wall, "plaster"); // ikkunapielet
  for (const [za, zb] of [[z1, z1 + T], [z2 - T, z2]]) {
    bx(x1, y, za, -16.6, y + 3.0, zb, wall, "plaster");                             // sivuseinä takana
    bx(-15.0, y, za, x2, y + 1.0, zb, wall, "plaster");                             // sivuikkunan alaosa
    bx(-15.0, y + 2.4, za, x2, y + 3.0, zb, wall, "plaster");
    bx(-16.6, y + 2.3, za, -15.0, y + 3.0, zb, wall, "plaster");                    // oven yläpuoli
  }
  bx(x1, y + 3.0, z1, x2, y + 3.25, z2, 0x8a8f97, "metal");                         // katto
  // Lasit ikkunoihin: luodit eivät mene läpi (näkymätön törmäävä laatikko + lasi)
  for (const [za, zb] of [[z1 + T, -1.6], [-1.4, 1.4], [1.6, z2 - T]]) {
    bx(x2 - 0.14, y + 1.0, za, x2 - 0.06, y + 2.4, zb, -2);
    prop("glass", (x2 - 0.1) * s, ((za + zb) / 2) * s, y + 1.0, y + 2.4, r(Math.PI / 2), zb - za, false);
  }
  for (const [za, zb] of [[z1, z1 + T], [z2 - T, z2]]) {
    bx(-15.0, y + 1.0, (za + zb) / 2 - 0.04, x2 - T, y + 2.4, (za + zb) / 2 + 0.04, -2);
    prop("glass", ((-15.0 + x2 - T) / 2) * s, ((za + zb) / 2) * s, y + 1.0, y + 2.4, r(0), x2 - T + 15.0, false);
  }
  for (const [za, zb] of [[-4.3, -2.2], [2.2, 4.3]]) {                               // ohjauspöydät ikkunan edessä
    bx(-14.5, y, za, x2 - T, y + 0.95, zb, 0x3a3d42, "metal");
    prop("console", -14.1 * s, y + 0.95, ((za + zb) / 2) * s, r(-Math.PI / 2), zb - za);
  }
  prop("tubelight", -15.6 * s, y + 3.0, 0, r(Math.PI / 2), 1.8, 0);
  prop("sign", (x2 + 0.02) * s, y + 2.7, 0, r(Math.PI / 2), s > 0 ? "SININEN VALVOMO" : "PUNAINEN VALVOMO", 3.6, 0.45, "none", "#ffffff", "#ffffff");
}
// Hallin kattopalkit ja valaisimet
for (const z of [-14, -7, 0, 7, 14]) box(-HX, HALL_TOP - 0.7, z - 0.3, HX, HALL_TOP, z + 0.3, 0x55595f, "metal");
for (const z of [-14, -7, 7, 14]) for (const x of [-12, -4, 4, 12]) prop("tubelight", x, HALL_TOP - 0.7, z, 0, 2.4, 1.4);
prop("sign", 0, 11.6, -19.95, 0, "MIKAN MARGARIINITEHDAS", 10, 1.4, "#f2c531", "#2a2622", "#2a2622");
prop("sign", 0, 11.6, 19.95, Math.PI, "MIKAN MARGARIINITEHDAS", 10, 1.4, "#f2c531", "#2a2622", "#2a2622");

// Portaiden tasaiset vinokatot (sininen ja peilattu punainen)
for (const [x1, z1, x2, z2, ax, ya, yb] of SLOPES) { prop("slopeceil", x1, z1, x2, z2, ax, ya, yb); prop("slopeceil", -x2, -z2, -x1, -z1, ax, yb, ya); }

// ---- Koko rakennus venytetään 1,5-kertaiseksi vaakasuunnassa (korkeudet ennallaan) ----
// Siilo ja kierreluiskat lisätään vasta tämän jälkeen, jotta luiskat pysyvät jyrkkinä.
const K = 1.5;
for (const b of B) { b[0] *= K; b[1] *= K; b[2] *= K; b[3] *= K; }
// Propit: [paikkaindeksit, kokoindeksit] (koot venytetään vain, jos esine kuuluu seinään tai lattiaan)
const SCALE = { sign: [[0, 2], []], pendant: [[0, 2], []], tubelight: [[0, 2], []], lamp: [[0, 2], []], duct: [[0, 1, 2, 3], []], dtable: [[0, 1], []], chair: [[0, 1], []],
  frame: [[0, 2], []], glass: [[0, 1], [5]], console: [[0, 2], [4]], turbine: [[0, 1], []], shutter: [[0, 2], [4]], hallwin: [[0, 2], [4]], slopeceil: [[0, 1, 2, 3], []],
  intelarea: [[0, 1, 2, 3, 4, 5], []], skylight: [[0, 1], [2, 3]], railing: [[0, 1, 2, 3], []], board: [[0, 2], []] };
for (const pr of PROPS) {
  const rule = SCALE[pr[0]];
  if (!rule) throw new Error("margariini: tuntematon propin skaalaus " + pr[0]);
  for (const i of [...rule[0], ...rule[1]]) pr[i + 1] *= K;
  if (pr[0] === "turbine") pr[3] = K; // turbiini piirretään isompana
}
for (const L of LADDERS) { L.x *= K; L.z *= K; }
const kx = (p) => [p[0] * K, p[1], p[2] * K];

// ---- Margariinisiilo ja kaksi jyrkkää kierreluiskaa (törmäys näkymättömillä laatoilla, ulkonäkö propeilla) ----
// Pyöreä siilo laatikoilla, joiden kulmat ovat kehällä 11,25° välein (aukot kehän ja laatikoiden välissä alle 6 cm)
for (const deg of [11.25, 22.5, 33.75, 45]) {
  const c = SILO_R * Math.cos((deg * Math.PI) / 180), sn = SILO_R * Math.sin((deg * Math.PI) / 180);
  box(-c, 0, -sn, c, SILO_H, sn, -2, "round"); // "round": pelaaja törmää pyöreään sylinteriin, ei kulmikkaisiin laatikoihin
  if (deg < 45) box(-sn, 0, -c, sn, SILO_H, c, -2, "round");
}
const RAMP_IN = SILO_R, RAMP_OUT = 5.6, TURNS = 1.0, NSEG = 72; // pidempi ja leveämpi luiska (kokonainen kierros)
const rampEnds = [];
for (const a0 of [-Math.PI / 2, Math.PI / 2]) { // luiska A alkaa pohjoisesta ja päättyy länteen, B etelästä itään
  for (let i = 0; i < NSEG; i++) {
    const t = (i + 0.5) / NSEG, a = a0 + t * TURNS * Math.PI * 2, h = (SILO_H * (i + 1)) / NSEG;
    for (const r of [3.4, 4.5, 5.0]) { const cx = Math.cos(a) * r, cz = Math.sin(a) * r; box(cx - 0.6, h - 0.25, cz - 0.6, cx + 0.6, h, cz + 0.6, -1); } // sisäreuna menee siilon sisään: ei rakoa
  }
  prop("helixramp", 0, 0, RAMP_IN, RAMP_OUT, a0, TURNS, SILO_H);
  // Tasanne luiskan yläpäästä siilon katolle
  const ae = a0 + TURNS * Math.PI * 2, ex = Math.round(Math.cos(ae)), ez = Math.round(Math.sin(ae));
  rampEnds.push(ae);
  if (ex) box(ex > 0 ? 1.5 : -RAMP_OUT, SILO_H - 0.25, -1.3, ex > 0 ? RAMP_OUT : -1.5, SILO_H, 1.3, -1);
  else box(-1.3, SILO_H - 0.25, ez > 0 ? 1.5 : -RAMP_OUT, 1.3, SILO_H, ez > 0 ? RAMP_OUT : -1.5, -1);
}
prop("silo", 0, 0, SILO_R, SILO_H, rampEnds);
const CYLINDERS = [[0, 0, SILO_R, 0, SILO_H]];

// ---- Basit, synnyinpaikat ja Goody Cao ----
const BASES = {
  sininen: { x: sx(-45.5) * K, y: 0, z: 21 * K, color: 0x3f6fd8, table: [sx(-45.5) * K, 23.6 * K, "x"], door: [1, 0], cam: { p: kx([sx(-38.2), 8.0, 24.4]), look: kx([sx(-48), 1, 16]) } },
  punainen: { x: -sx(-45.5) * K, y: 0, z: -21 * K, color: 0xd8473f, table: [-sx(-45.5) * K, -23.6 * K, "x"], door: [-1, 0], cam: { p: kx([-sx(-38.2), 8.0, -24.4]), look: kx([-sx(-48), 1, -16]) } },
};
const BLUE_SPAWNS = [[-52, -13.3], [-48.5, -13.3], [-45, -13.3], [-41.5, -13.3], [-38.2, -13.3], [-52.1, -9.8], [-52.1, -7.8], [-52.1, -5.5], [-52.1, -4.0]].map(([x, z]) => [sx(x), z]); // L-kopissa
const SPAWNS = { sininen: BLUE_SPAWNS.map(([x, z]) => [x * K, z * K, F2]), punainen: BLUE_SPAWNS.map(([x, z]) => [-x * K, -z * K, F2]) };
const BLUE_COCOA = [[sx(-28.4), -11.1, F2, 0], [sx(-31.9), 13.4, 0, 0], [-4.0, -HZ - 0.7, 0, 0]]; // kolmas hallin pohjoisseinän syvennyksessä Portti 1:n vasemmalla puolella
const GRILLS = [...BLUE_COCOA, ...BLUE_COCOA.map(([x, z, y, r]) => [-x, -z, y, r + Math.PI])].map(([x, z, y, r]) => [x * K, z * K, y, r]);

const MARGARIINI = {
  id: "margariini",
  name: "Mikan margariinitehdas",
  desc: "Hae margariinia siilon katolta! Iso tehdashalli, kierreluiskat, valvomokopit ja salainen tunneli vastustajan baseen.",
  x: X * K, z: Z * K, boxes: toMinMax(B), bases: BASES, baseRadius: 2.5, spawns: SPAWNS,
  recipe: [0, SILO_H, 0], recipeWhere: "siilon katolla", recipeTo: "siilon katolle", item: "margariini",
  cylinders: CYLINDERS, grills: GRILLS, grillSize: [0.9, 1.0, 0.7], grillKind: "kaakao", floors: [], props: PROPS, terrain: [], ladders: LADDERS,
  theme: { indoor: true, menuCam: { r: 16, y: 10.5, look: [0, 5, 0] }, ground: "#6a6862", line: "#74726b", groundTex: "concrete", sky: 0xb9c4cc, wall: 0x6f6a60, fogNear: 120, fogFar: 600,
           walls: [{ h: 1, color: 0x6f6a60, tex: "concrete" }, { h: 1, color: 0x6f6a60, tex: "concrete" }, { h: 1, color: 0x6f6a60, tex: "concrete" }, { h: 1, color: 0x6f6a60, tex: "concrete" }] },
};

return { MARGARIINI };
})();
__m["maps"] = (() => {
const { JOULUTORNI } = __m["map"];
const { KORJAAMO } = __m["korjaamo"];
const { ALPPIKYLA } = __m["alppikyla"];
const { PEPINO } = __m["pepino"];
const { MARGARIINI } = __m["margariini"];
// ====== KARTAT ======
// Kaikki kartat kootaan tähän. Uusi kartta: tee oma tiedosto (kuten korjaamo.js) ja lisää se listaan.





const MAPS = {};
for (const m of [JOULUTORNI, KORJAAMO, ALPPIKYLA, PEPINO, MARGARIINI]) {
  // Ulkoseinät pysäyttävät luodit ja pisarat (piirretään pelissä erikseen)
  m.outer = [
    [-m.x - 1, 0, -m.z - 1, -m.x, 4, m.z + 1],
    [m.x, 0, -m.z - 1, m.x + 1, 4, m.z + 1],
    [-m.x - 1, 0, -m.z - 1, m.x + 1, 4, -m.z],
    [-m.x - 1, 0, m.z, m.x + 1, 4, m.z + 1],
  ];
  MAPS[m.id] = m;
}
const DEFAULT_MAP = "joulutorni";

// Pelaajille lähetettävä kartta
const mapPayload = (m) => ({ id: m.id, name: m.name, x: m.x, z: m.z, boxes: m.boxes, terrain: m.terrain || [], ladders: m.ladders || [], grills: m.grills, grillSize: m.grillSize, theme: m.theme, floors: m.floors || [], props: m.props || [], cylinders: m.cylinders || [], grillKind: m.grillKind || "pihvi", cows: m.cows || [] });
// Äänestystä varten kaikkien karttojen nimi ja pohjapiirros (pelaaja piirtää siitä pienoiskartan)
const mapList = () => Object.values(MAPS).map((m) => ({ id: m.id, name: m.name, desc: m.desc, x: m.x, z: m.z,
  boxes: m.boxes.filter((b) => b[6] !== -1).map((b) => [b[0], b[2], b[3], b[5], b[4]].map((v) => Math.round(v * 10) / 10)),
  bases: Object.fromEntries(Object.entries(m.bases).map(([t, b]) => [t, [b.x || 0, b.z]])),
  water: (m.props || []).filter((p) => p[0] === "water").map((p) => p.slice(1, 5)) }));

return { MAPS, DEFAULT_MAP, mapPayload, mapList };
})();
__m["bots"] = (() => {

// ====== Bottien reitinhaku ======
// Kenttä jaetaan 1 m ruutuihin. Jokaisessa ruudussa voi olla useita kerroksia, joilla botti voi seistä:
// maa, laatikoiden päälliset, portaat, parvet, sillat... (esim. joen pohja ja silta sen yläpuolella).
// Kerros on kelvollinen, jos botin vartalo mahtuu sen päälle (ei estettä 0,55–1,85 m korkeudella).
// Vierekkäisten ruutujen kerrokset yhdistyvät, jos korkeusero on pieni (portaat), ja alas voi pudota
// enintään 3,5 m. Jokaiselle kartalle lasketaan oma verkko kerran, ja se jaetaan kaikkien huoneiden kesken.
const cache = new Map();
function navFor(map) {
  if (!cache.has(map.id)) cache.set(map.id, makeNav(map));
  return cache.get(map.id);
}

const CELL = 0.5;
const MARGIN = 0.5;   // vartalon säde reitinhaussa
const STEP = 0.6;     // suurin nousu ruudusta toiseen (portaat)
const DROP = 3.5;     // suurin pudotus
const BODY = 1.85;    // tarvittava tila päällä

function makeNav(map) {
  const AX = map.x, AZ = map.z, BOXES = map.boxes;
  const NX = Math.round((2 * AX) / CELL), NZ = Math.round((2 * AZ) / CELL);
  const cellOf = (x, z) => [Math.floor((x + AX) / CELL), Math.floor((z + AZ) / CELL)];
  const centerOf = (i, j) => [-AX + (i + 0.5) * CELL, -AZ + (j + 0.5) * CELL];
  const inGrid = (i, j) => i >= 0 && j >= 0 && i < NX && j < NZ;

  // Laatikot ruuduittain (nopeampi haku)
  const near = Array.from({ length: NX * NZ }, () => []);
  for (const b of BOXES) {
    const [i1, j1] = cellOf(b[0] - MARGIN, b[2] - MARGIN), [i2, j2] = cellOf(b[3] + MARGIN, b[5] + MARGIN);
    for (let i = Math.max(0, i1); i <= Math.min(NX - 1, i2); i++) for (let j = Math.max(0, j1); j <= Math.min(NZ - 1, j2); j++) near[i * NZ + j].push(b);
  }

  // Kerrokset: jokaiselle ruudulle lista korkeuksia, joilla voi seistä
  const cellNodes = new Array(NX * NZ);
  const nodeH = [], nodeCell = [];
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) {
      const k = i * NZ + j, [cx, cz] = centerOf(i, j), list = [];
      cellNodes[k] = list;
      if (Math.abs(cx) > AX - MARGIN || Math.abs(cz) > AZ - MARGIN) continue;
      const boxes = near[k];
      // Ehdokkaat: maa ja laatikoiden päälliset, jotka ovat ruudun keskellä
      const cand = [0];
      for (const b of boxes) if (cx >= b[0] && cx <= b[3] && cz >= b[2] && cz <= b[5]) cand.push(b[4]);
      for (const h of [...new Set(cand)].sort((a, b) => a - b)) {
        // Seisomapinta on korkein pinta tällä korkeudella (ei saa olla laatikon sisällä)
        let ok = true;
        for (const b of boxes) {
          const inX = b[0] < cx + MARGIN && b[3] > cx - MARGIN && b[2] < cz + MARGIN && b[5] > cz - MARGIN;
          if (!inX) continue;
          if (b[1] < h + BODY && b[4] > h + 0.55) { ok = false; break; } // este vartalon korkeudella
        }
        if (ok) { list.push(nodeH.length); nodeH.push(h); nodeCell.push(k); }
      }
    }
  }
  const N = nodeH.length;
  // Mahtuuko vartalo ruutuun korkeudella h (käytetään pudotuksissa: kaide tai seinä estää)
  const passable = (k, h) => {
    const [cx, cz] = centerOf(Math.floor(k / NZ), k % NZ);
    for (const b of near[k]) {
      if (b[0] < cx + MARGIN && b[3] > cx - MARGIN && b[2] < cz + MARGIN && b[5] > cz - MARGIN && b[1] < h + BODY && b[4] > h + 0.55) return false;
    }
    return true;
  };

  // Naapurit: 8 suuntaa, sopiva korkeusero (nousu enintään STEP, pudotus enintään DROP)
  const nodeAt = (i, j, h, up = STEP, down = STEP) => {
    if (!inGrid(i, j)) return -1;
    let best = -1, bd = Infinity;
    for (const n of cellNodes[i * NZ + j]) {
      const dh = nodeH[n] - h;
      if (dh > up || -dh > down) continue;
      if (Math.abs(dh) < bd) { bd = Math.abs(dh); best = n; }
    }
    return best;
  };
  const LINKS = new Map(); // tikkaiden lisäyhteydet
  const neigh = (n) => {
    const k = nodeCell[n], i = Math.floor(k / NZ), j = k % NZ, h = nodeH[n], out = [...(LINKS.get(n) || [])];
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const m = nodeAt(i + di, j + dj, h, STEP, DROP);
      if (m < 0) continue;
      if (di && dj && (nodeAt(i + di, j, h) < 0 || nodeAt(i, j + dj, h) < 0)) continue; // ei kulmien läpi
      const drop = h - nodeH[m] > STEP;
      if (drop && !passable(nodeCell[m], h)) continue; // pudotus vain, jos reunalla ei ole kaidetta tai seinää
      out.push([m, (di && dj ? 1.414 : 1) + (drop ? 2 : 0) + Math.abs(nodeH[m] - h) * 0.5]);
    }
    return out;
  };

  // Lähin kerros annetun pisteen ympäriltä (painotetaan korkeutta)
  function nearestNode(x, y, z, maxR = 8) {
    const [ci, cj] = cellOf(x, z);
    for (let r = 0; r <= maxR; r++) {
      let best = -1, bd = Infinity;
      for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r || !inGrid(ci + di, cj + dj)) continue;
        const [px, pz] = centerOf(ci + di, cj + dj);
        for (const n of cellNodes[(ci + di) * NZ + cj + dj]) {
          const above = nodeH[n] - y;
          if (above > STEP) continue; // ei pinnoille, jotka ovat selvästi yläpuolella
          const d = Math.hypot(px - x, pz - z) + Math.abs(above) * 1.5;
          if (d < bd) { bd = d; best = n; }
        }
      }
      if (best >= 0) return best;
    }
    // viimeinen keino: mikä tahansa lähin kerros
    for (let r = 0; r <= maxR; r++) for (let di = -r; di <= r; di++) for (let dj = -r; dj <= r; dj++) {
      if (inGrid(ci + di, cj + dj) && cellNodes[(ci + di) * NZ + cj + dj].length) return cellNodes[(ci + di) * NZ + cj + dj][0];
    }
    return -1;
  }

  // Voiko pisteestä a kävellä suoraan pisteeseen b samaa pintaa pitkin (tarkistetaan 0,25 m välein)
  function clearLine(ax, ah, az, bx, bz, bh = null) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.25);
    let h = ah;
    for (let k = 1; k <= n; k++) {
      const [i, j] = cellOf(ax + ((bx - ax) * k) / n, az + ((bz - az) * k) / n);
      const m = nodeAt(i, j, h);
      if (m < 0) return false;
      h = nodeH[m];
    }
    return bh === null || Math.abs(h - bh) <= STEP; // päädyttävä samalle tasolle kuin kohde
  }

  // Botin askel: onko kohdassa (x, z) pinta, jolle pääsee korkeudelta y (nousu tai pieni pudotus)
  function walkableAt(x, z, y = 0, fall = false) {
    const [i, j] = cellOf(x, z);
    return nodeAt(i, j, y, STEP, fall ? DROP : STEP) >= 0;
  }

  // A*-reitinhaku. Palauttaa listan pisteitä [x, z, korkeus] (oiottu), tai null jos reittiä ei ole.
  function findPath(sx, sy, sz, tx, ty, tz) {
    const S = nearestNode(sx, sy, sz), T = nearestNode(tx, ty + 0.5, tz);
    if (S < 0 || T < 0) return null;
    const g = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
    const [ti, tj] = [Math.floor(nodeCell[T] / NZ), nodeCell[T] % NZ];
    const heap = [];
    const push = (f, k) => { heap.push([f, k]); let c = heap.length - 1; while (c > 0) { const p = (c - 1) >> 1; if (heap[p][0] <= heap[c][0]) break; [heap[p], heap[c]] = [heap[c], heap[p]]; c = p; } };
    const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let c = 0; for (;;) { const l = 2 * c + 1, r = l + 1; let m = c; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === c) break; [heap[m], heap[c]] = [heap[c], heap[m]]; c = m; } } return top; };
    const hfun = (n) => { const k = nodeCell[n], dx = Math.abs(Math.floor(k / NZ) - ti), dz = Math.abs((k % NZ) - tj); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + Math.abs(nodeH[n] - nodeH[T]) * 0.5; };
    g[S] = 0; push(hfun(S), S);
    let found = false, iter = 0;
    while (heap.length && iter++ < 120000) {
      const [, n] = pop();
      if (closed[n]) continue;
      if (n === T) { found = true; break; }
      closed[n] = 1;
      for (const [m, cost] of neigh(n)) {
        const ng = g[n] + cost;
        if (ng < g[m]) { g[m] = ng; from[m] = n; push(ng + hfun(m), m); }
      }
    }
    if (!found) return null;
    const pts = [];
    for (let n = T; n !== -1; n = from[n]) { const k = nodeCell[n]; pts.push([...centerOf(Math.floor(k / NZ), k % NZ), nodeH[n]]); }
    pts.reverse();
    // Oiotaan: hypätään suoraan niin pitkälle kuin samaa pintaa pääsee
    const out = [];
    let a = [sx, sz, nodeH[S]], idx = 0;
    while (idx < pts.length - 1) {
      let far = idx + 1;
      for (let k = Math.min(pts.length - 1, idx + 50); k > idx + 1; k--) if (clearLine(a[0], a[2], a[1], pts[k][0], pts[k][1], pts[k][2])) { far = k; break; }
      out.push(pts[far]); a = pts[far]; idx = far;
    }
    if (!out.length) out.push(pts[pts.length - 1]);
    return out;
  }

  // Satunnainen kuljettava piste alueelta (z-väli): [x, z, korkeus]
  function randomPoint(zMin, zMax, xMax = AX) {
    for (let tries = 0; tries < 80; tries++) {
      const x = (Math.random() * 2 - 1) * xMax, z = zMin + Math.random() * (zMax - zMin);
      const [i, j] = cellOf(x, z);
      if (!inGrid(i, j)) continue;
      const list = cellNodes[i * NZ + j];
      if (list.length) { const n = list[Math.floor(Math.random() * list.length)]; return [x, z, nodeH[n]]; }
    }
    return [0, (zMin + zMax) / 2, 0];
  }

  // Tikkaat: suora yhteys tikkaiden juurelta katolle (ja takaisin alas)
  const ladders = (map.ladders || []).map((L) => ({ ...L, bx: L.x - L.nx * 0.6, bz: L.z - L.nz * 0.6, tx: L.x + L.nx * 0.7, tz: L.z + L.nz * 0.7 }));
  for (const L of ladders) {
    const a = nearestNode(L.bx, L.y0, L.bz, 2), t = nearestNode(L.tx, L.y1, L.tz, 2);
    if (a < 0 || t < 0 || Math.abs(nodeH[a] - L.y0) > 0.6 || Math.abs(nodeH[t] - L.y1) > 0.6) continue;
    const cost = 2 + (L.y1 - L.y0);
    (LINKS.get(a) || LINKS.set(a, []).get(a)).push([t, cost]);
    (LINKS.get(t) || LINKS.set(t, []).get(t)).push([a, cost * 0.6]);
  }
  // Onko piste tikkaiden kohdalla (botti kiipeää)
  function ladderNear(x, y, z) {
    for (const L of ladders) {
      const along = Math.abs((x - L.x) * -L.nz + (z - L.z) * L.nx), out = -((x - L.x) * L.nx + (z - L.z) * L.nz);
      if (along < L.w / 2 + 0.6 && out > -0.3 && out < 1.4 && y > L.y0 - 0.4 && y < L.y1 + 0.3) return L;
    }
    return null;
  }

  return { findPath, walkableAt, randomPoint, nearestNode, clearLine, ladderNear, nodes: N };
}

return { navFor };
})();
__m["index"] = (() => {
const { tireStep } = __m["map"];
const { MAPS, DEFAULT_MAP, mapPayload, mapList } = __m["maps"];
const { navFor } = __m["bots"];
// Areenan palvelin: Cloudflare Worker + Durable Objects.
// Jokainen huone on oma GameRoom-olionsa.
// - Pelaajat laskevat oman liikkeensä itse (liike tuntuu heti sulavalta); palvelin
//   tarkistaa ettei kukaan liiku liian nopeasti tai karkaa areenalta.
// - Ampumisen palvelin ratkaisee itse: se kelaa muut pelaajat siihen hetkeen,
//   jonka ampuja näki ruudullaan, ja tarkistaa osuman ja seinät.


// ====== PELIN SÄÄDÖT (muutosten jälkeen: npx wrangler deploy) ======
// Hahmot. Nimet ja kuvaukset ovat index.html:ssä, pelin arvot täällä.
// jump = hypyn lähtönopeus. Hypyn korkeus = jump² / (2 × GRAVITY): kaikilla 1,5 m (jump 9,8), Olavilla lisäksi tuplahyppy
const CLASSES = {
  // loadout = aseet, joita hahmo voi vaihtaa hiiren rullalla
  // head = pään keskikohdan korkeus ja säde (pääosumia varten)
  panssari: { speed: 5.6, jump: 9.8, radius: 0.6,  height: 1.6,  hp: 300, head: [1.38, 0.25], loadout: ["pistooli", "patukka", "detektori"] }, // Jari (160 cm)
  sotilas:  { speed: 7.0, jump: 9.8, radius: 0.5,  height: 1.95, hp: 250, head: [1.79, 0.17], loadout: ["pistooli", "banaani", "platsi"] },             // Juha (195 cm)
  vikkela:  { speed: 7.0, jump: 9.8, radius: 0.42, height: 1.8,  hp: 200, head: [1.645, 0.16], loadout: ["pistooli", "liima", "kivaari"] },  // Jarmo (180 cm)
  // airJumps = lisähypyt ilmassa (Olavi hyppää kahdesti). Hyppy 1,5 m + toinen hyppy ilmassa.
  olavi:    { speed: 8.0, jump: 9.8, radius: 0.38, height: 1.83, hp: 150, head: [1.68, 0.16], airJumps: 1, loadout: ["pistooli", "sauva", "pyora"] },               // Olavi (183 cm)
  danny:    { speed: 7.0, jump: 9.8, radius: 0.46, height: 1.75, hp: 200, head: [1.57, 0.17], loadout: ["pistooli", "rengas", "pesu"] },                        // Daniel (175 cm)
  mika:     { speed: 7.0, jump: 9.8, radius: 0.42, height: 1.7,  hp: 175, head: [1.53, 0.16], loadout: ["pistooli", "kortit", "pepti"] },                        // Mika (170 cm), kemisti
};
const GRAVITY = 32; // m/s² (oli 25, tuntui kuulta)
// Kaikilla sama ase toistaiseksi
const WEAPON = {
  name: "Pistooli",
  dmgNear: [18, 22],   // vahinko lähietäisyydeltä (satunnainen väliltä)
  dmgFar: [2, 3],      // vahinko kaukaa
  nearDist: 5,         // tätä lähempää täysi vahinko (m)
  farDist: 50,         // tätä kauempaa pienin vahinko (m), välissä vähenee tasaisesti
  cooldownMs: 280,     // laukausten väli
  mag: 10,             // lippaan koko
  reloadMs: 1300,      // latauksen kesto
  range: 120,
};
// Jarin Tulipatukka: heitettävä, räjähtää osuessaan maahan, seinään tai pelaajaan
const PATUKKA = {
  name: "Tulipatukka",
  cooldownMs: 900,     // heittojen väli
  chargeMs: 1400,      // täyteen lataukseen kuluva aika (hiiri pohjassa)
  speedMin: 9,         // heittonopeus ilman latausta (m/s)
  speedMax: 27,        // heittonopeus täydellä latauksella
  lift: 2.5,           // lisänosto ylöspäin (m/s), jotta heitto kaartaa
  gravity: 22,         // patukan painovoima
  radius: 4.5,         // räjähdyksen säde (m)
  dmgMax: 65,          // vahinko räjähdyksen keskellä
  dmgMin: 12,          // vahinko säteen reunalla
  knock: 14,           // lennätysvoima keskellä (m/s), suunta poispäin räjähdyksestä
  knockUp: 4,          // lisänosto ylöspäin lennätyksessä
  selfDamageMax: 25,   // heittäjä ottaa omasta räjähdyksestä enintään tämän verran (vähemmän kauempana)
  lifeMs: 6000,
};
// Danielin autonrengas: heitetään kuten Tulipatukka, mutta se kimpoilee seinistä ja menettää vauhtia.
// Vahinko riippuu renkaan vauhdista osumahetkellä (täysin ladattu heitto = 50).
const RENGAS = {
  name: "Autonrengas",
  cooldownMs: 1500,    // heittojen väli (Tulipatukka 900)
  chargeMs: 1400,      // täyteen lataukseen kuluva aika
  speedMin: 9,         // heittonopeus ilman latausta (m/s)
  speedMax: 28,        // heittonopeus täydellä latauksella
  lift: 2.5,           // lisänosto ylöspäin
  gravity: 22,
  r: 0.35,             // renkaan säde osumissa (m)
  wallKeep: 0.85,      // seinästä kimmotessa jäljelle jäävä vauhti
  groundBounce: 0.45,  // maasta pomppaaminen (pystysuunnan vauhdista)
  groundKeep: 0.92,    // vaakavauhti maahan osuessa
  rollFriction: 0.5,   // vierimisen hidastuminen
  hitKeep: 0.6,        // vauhti pelaajaan osumisen jälkeen
  dmgMax: 100,         // suurin vahinko (vauhdilla speedMax tai enemmän)
  dmgMin: 5,           // pienin vahinko
  minSpeed: 1.5,       // tätä hitaampi vierivä rengas katoaa
  lifeMs: 7000,
};
// Olavin pyöräsyöksy (kuten TF2:n Demomanin rynnäkkö)
const CHARGE = {
  name: "Pyöräsyöksy",
  durMs: 2500,       // syöksyn kesto
  speed: 17,         // nopeus syöksyn aikana (m/s), Olavi normaalisti 8
  turnRate: 1.6,     // kääntymisnopeus syöksyssä (rad/s): ohjaus on kankeaa
  cooldownMs: 30000, // uusi syöksy 30 s kuluttua
  damage: 65,        // törmäyksen vahinko
  knock: 30,         // lennätys vaakasuunnassa: vastustaja lentää noin 30 m
  knockUp: 18,       // ...ja ylöspäin (noin 5 m korkeuteen)
  hitRange: 0.45,    // törmäysetäisyys vartaloiden välissä
};
// Danielin lasinpesunestepyssy: suihkuttaa pisaroita kuin letkusta noin 8 m päähän.
// Maahan osuva neste jättää 10 s sinisen lätäkön: siinä liikkuu nopeammin, mutta liukuu.
const PESU = {
  name: "Lasinpesunestepyssy",
  fireMs: 50,          // pisaroiden väli (20 krt/s)
  speed: 14,           // pisaran lähtönopeus (m/s), luoti on välitön
  gravity: 9.8,        // vaakasuoraan suihkutettu neste osuu maahan noin 8 m päähän
  lifeMs: 800,
  r: 0.15,             // pisaran koko osumissa
  damage: 10,          // vahinko per pisara (noin 200 vahinkoa sekunnissa lähietäisyydeltä)
  tank: 120,           // säiliössä 6 s suihkua
  refillPerSec: 30,    // säiliö täyttyy itsestään
  refillDelayMs: 600,  // ...kun suihkuttamisesta on kulunut tämä aika
  puddleR: 0.9,        // lätäkön säde (m)
  puddleMs: 10000,     // lätäkkö kuivuu 10 s kuluttua
  maxPuddles: 120,
  speedBoost: 1.35,    // lätäkössä 35 % nopeampi
  grip: 1.8,           // lätäkössä ohjaus reagoi hitaasti (pienempi = liukkaampi)
};
// Jarmon puikkoliima: lähitaisteluase, joka liimaa kohteen
const LIIMA = {
  name: "Puikkoliima",
  range: 2.3,          // ulottuvuus silmistä (m)
  cooldownMs: 600,     // iskujen väli
  damage: 15,          // iskun vahinko
  durationMs: 5000,    // liimauksen kesto
  slow: 0.5,           // liimattu kävelee 50 % hitaammin
  vulnerable: 0.5,     // liimattu ottaa 50 % enemmän vahinkoa
};
// Juhan banaaniserveri: asetettava automaattitykki (TF2:n minisentryn tapaan)
const BANAANI = {
  name: "Juhan banaaniserveri",
  hp: 75,              // elämäpisteet valmiina
  buildMs: 2000,       // rakentumisaika (elämät nousevat 25 → 75 rakentuessa, ei ammu)
  cooldownMs: 30000,   // seuraavan banaanin voi asettaa vasta tämän jälkeen
  range: 15,           // ampumaetäisyys (m)
  damage: 5,           // vahinko per laukaus
  fireMs: 200,         // laukausten väli yhdellä banaanilla (5 laukausta sekunnissa)
  maxLevel: 7,         // tertussa enintään 7 banaania; jokainen päivitys tuo +5 laukausta sekunnissa
  upgradeMs: 900,      // päivitysanimaation aika (ei ammu sillä välin)
  turnSpeed: 6,        // kääntymisnopeus (rad/s)
  aimTolerance: 0.25,  // ampuu, kun katse on näin lähellä kohdetta (rad)
  half: 0.45,          // koko: 0,9 x 0,9 m pohja
  height: 0.75,        //        ja 0,75 m korkeus
  muzzleY: 0.5,        // piipun (banaanin varren) korkeus
  maxPlaceDist: 3.2,   // kuinka kauas eteensä banaanin voi asettaa
};
// Jarin Shit detector: heitettävä tikku, joka jää maahan ja paljastaa seinien takana olevat Jarille
const DETEKTORI = {
  name: "Shit detector",
  speed: 14,           // heittonopeus (m/s)
  lift: 3,             // lisänosto ylöspäin
  durationMs: 10000,   // maassa 10 s
  cooldownMs: 30000,   // heitettävissä kerran 30 sekunnissa
  radius: 15,          // näin lähellä olevat seinät muuttuvat Jarille läpinäkyviksi (m)
  opacity: 0.25,       // seinien näkyvyys (0,25 = 75 % läpinäkyvä)
};
// Jarmon tarkkuuskivääri (TF2:n tapaan): oikea hiiri zoomaa, pääosuma vain zoomattuna
const KIVAARI = {
  name: "Tarkkuuskivääri",
  noscopeDamage: 50,   // osuma ilman tähtäintä (aina tämä, ei pääosumia)
  bodyDamage: 100,     // vartalo-osuma tähtäimen läpi täydellä latauksella
  headDamage: 200,     // pääosuma tähtäimen läpi: aina tämä, lataus ei vaikuta
  chargeMs: 5000,      // tähtäimessä vartalovahinko kasvaa: täysi 5 s latauksen jälkeen
  minCharge: 0.1,      // pienin vartalovahinko tähtäimen läpi (10 %)
  cooldownMs: 2000,    // laukausten väli
  range: 200,
  zoomFov: 20,         // näkökenttä zoomattuna (normaali 80)
  zoomSpeed: 0.1,      // liikkumisnopeus zoomattuna (10 %)
  boltMs: 750,         // tähtäimen läpi ammuttu laukaus sulkee tähtäimen ja kivääri ladataan (lukko taakse ja eteen)
  boltSpeed: 0.35,     // liikkumisnopeus latauksen aikana (35 %)
  beamHoldMs: 1000,    // laukauksen säde näkyy täysin tämän ajan…
  beamFadeMs: 1000,    // …ja hiipuu sitten pois tässä ajassa
};
// Juhan mahaplätsi: hyppy valittuun kohtaan, laskeutuminen tekee patukan verran vahinkoa ja lennättää
const PLATSI = {
  name: "Mahaplätsi",
  maxDist: 5,          // kuinka kauas voi hypätä (m)
  height: 2,           // hypyn korkeus lähtökohdasta (m)
  radius: 2.5,         // laskeutumisalueen säde (m)
  cooldownMs: 4000,    // hyppyjen väli
};
// Olavin suksisauva: lähitaisteluase kuten puikkoliima, mutta ilman erikoisvaikutuksia
// Mikan korttipakka: kortti lähtee 0,125 s välein, sinkoilee ja leijuu maahan viimeistään noin 30 m päässä.
// Lentorata (sama kaava selaimessa): p(t) = o + (v + A/k)/k · (1 − e^(−kt)) − A·t/k, missä k = drag ja
// A = painovoima + satunnainen sivuttainen kaartuminen. Vaakamatka on aina alle speed / drag = 30 m.
const KORTIT = {
  name: "Korttipakka",
  fireMs: 125,         // korttien väli (8 korttia / s)
  speed: 24,           // lähtönopeus (m/s)
  drag: 0.8,           // ilmanvastus (1/s)
  gravity: 2.5,        // kortti leijuu hitaasti alas (vaakasuoraan heitetty putoaa noin 19 m päähän)
  spread: 0.15,        // hajonta (rad): kortti lähtee satunnaisesti tämän säteisen ympyrän sisältä
  curve: 9,            // sivuttainen kaartuminen (m/s²): kortti pyörii vaakatasossa ja kaartuu, sivupoikkeama kasvaa matkan myötä
  lifeMs: 3000,
  r: 0.12,             // kortin koko osumissa
  dmgNear: [7, 10],    // vahinko läheltä (satunnainen)
  dmgFar: [1, 2],      // vahinko kaukaa
  nearDist: 3,         // tätä lähempää täysi vahinko
  farDist: 25,         // tätä kauempaa pienin vahinko
};
// Mikan peptiditykki (kuten TF2:n Medicin medigun): ruisku tarttuu omaan pelaajaan ja letkusta virtaa steroideja
const PEPTI = {
  name: "Peptiditykki",
  range: 10,           // yhteys katkeaa yli 10 m päässä tai seinän takana
  heal: 10,            // elämää sekunnissa
  overheal: 1.5,       // ladataan enintään 150 % normaaleista elämistä
  decaySec: 20,        // ylimääräiset elämät valuvat pois 20 s:ssa, kun kukaan ei hoida
  uberRate: 2.5,       // "Steroidia suoneen" latautuu %/s hoitaessa (täyteen 40 s)
  uberOverRate: 1.25,  // ...puolet hitaammin, jos kohteella on jo yli 142,5 % elämistä
  uberMs: 8000,        // kesto: Mika ja hoidettava eivät ota vahinkoa
  lockCone: 0.5,       // kuinka tarkasti kohteeseen pitää tähdätä ruiskua ammuttaessa (rad)
  dartSpeed: 40,       // ruisku lentää letkun perässä kuin taserin piikki (m/s)
};
const SAUVA = { name: "Suksisauva", range: LIIMA.range, cooldownMs: LIIMA.cooldownMs, damage: 30 };
const WEAPONS = { pyora: CHARGE, pesu: PESU, rengas: RENGAS, sauva: SAUVA, pistooli: WEAPON, patukka: PATUKKA, liima: LIIMA, banaani: BANAANI, detektori: DETEKTORI, kivaari: KIVAARI, platsi: PLATSI, kortit: KORTIT, pepti: PEPTI };
// Kortin paikka hetkellä t (s)
function cardPos(cd, t) {
  const k = KORTIT.drag, e = (1 - Math.exp(-k * t)) / k;
  return [0, 1, 2].map((i) => cd.o[i] + (cd.v[i] + cd.A[i] / k) * e - (cd.A[i] * t) / k);
}
function cardAccel(v, c) {
  const vh = Math.hypot(v[0], v[2]), px = vh > 1e-3 ? -v[2] / vh : 1, pz = vh > 1e-3 ? v[0] / vh : 0;
  return [px * c, -KORTIT.gravity, pz * c];
}
// Hypyn lähtönopeus ja kesto: nousee "height" metriä korkeimman kohdan yläpuolelle ja laskeutuu kohteeseen
function leapPlan(y0, y1, dist) {
  const apex = Math.max(y0, y1) + PLATSI.height;
  const vy = Math.sqrt(2 * GRAVITY * (apex - y0));
  const T = vy / GRAVITY + Math.sqrt(2 * (apex - y1) / GRAVITY);
  return { vy, T, vh: dist / T };
}
// Botin heitto: etsitään lataus ja heittokulma, joilla heitto osuu matkan päähän oikealle korkeudelle
function solveThrow(C, y0, yT, dist) {
  let best = null;
  for (let c = 0; c <= 1.0001; c += 0.1) {
    const sp = C.speedMin + (C.speedMax - C.speedMin) * c;
    for (let a = -0.3; a <= 1.0; a += 0.02) {
      const vh = sp * Math.cos(a), vy = sp * Math.sin(a) + C.lift;
      if (vh < 1) continue;
      const t = dist / vh, y = y0 + vy * t - 0.5 * C.gravity * t * t;
      const err = Math.abs(y - yT) + t * 0.3; // suositaan nopeita, suoria heittoja
      if (Math.abs(y - yT) < 0.4 && (!best || err < best.err)) best = { c, pitch: a, err };
    }
  }
  return best;
}
// Kyykky: hahmo on 25 % matalampi (osuma-alue ja pää laskevat)
const CROUCH = 0.25;
function dims(q) {
  const c = CLASSES[q.cls];
  if (!q.crouch) return c;
  const drop = c.height * CROUCH;
  return { ...c, height: c.height - drop, head: [c.head[0] - drop, c.head[1]] };
}
const sentryMin = (s) => [s.x - BANAANI.half, s.y, s.z - BANAANI.half];
const sentryMax = (s) => [s.x + BANAANI.half, s.y + BANAANI.height, s.z + BANAANI.half];
const angleDiff = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const rand = (a, b) => a + Math.random() * (b - a);
function damageAt(dist) {
  const f = Math.max(0, Math.min(1, (dist - WEAPON.nearDist) / (WEAPON.farDist - WEAPON.nearDist)));
  const near = rand(...WEAPON.dmgNear), far = rand(...WEAPON.dmgFar);
  return Math.max(1, Math.round(near + (far - near) * f));
}
const RESPAWN_MS = 10000; // kuolleena 10 s: ensin näkymä tappajaan, viimeiset 5 s oma base
// ====== Reseptipeli (capture the flag) ======
const CTF = {
  winScore: 3,           // näin monta reseptiä omassa basessa = voitto
  firstRecipeMs: 60000,  // ensimmäinen resepti tornin katolle minuutin kuluttua kierroksen alusta
  towerEveryMs: 180000,  // seuraava 3 min kuluttua siitä, kun edellinen on haettu tornin katolta
  droppedReturnMs: 30000,// pudotettu resepti palaa tornille, jos kukaan ei poimi sitä
  pickupRange: 1.3,      // kuinka läheltä reseptin voi poimia (m)
  roundEndMs: 8000,      // voiton jälkeen uusi kierros alkaa tämän ajan kuluttua
};
const TEAMS = ["sininen", "punainen"];
const TEAM_COLORS = {
  sininen: ["#3f6fd8", "#2f8fe0", "#4a5fc0", "#5a8ff0", "#3050a8"],
  punainen: ["#d8473f", "#e0602f", "#c03a4a", "#f07050", "#a83030"],
};
const sameTeam = (a, b) => !!a && !!b && a !== b && a.team && a.team === b.team;
// Grillit: pihvi ilmestyy kerran minuutissa, ja siitä saa 50 elämää
const PIHVI = { heal: 50, respawnMs: 60000 };

// Botit (perusversio: liikkuvat maan tasolla ja ampuvat pistoolilla)
const BOT = {
  maxPerTeam: 4,
  reactionMs: 550,     // viive ennen kuin botti ampuu nähtyään vihollisen
  spread: 0.065,       // tähtäyksen hajonta (radiaaneina). Pienempi = tarkempi botti
  moveSpread: 0.03,    // lisähajonta liikkuessa
  fireSlow: 1.5,       // ampuu hitaammin kuin pistooli sallii (1 = täysi tulinopeus)
  turnRate: 7,         // kääntymisnopeus
  sightRange: 40,      // näkee vihollisen tätä lähempää (m)
  shootRange: 35,      // ampuu tätä lähempää
  chaseDist: 22,       // tätä kauempana olevaa vihollista lähdetään jahtaamaan
  speedFactor: 0.92,   // botit liikkuvat hieman pelaajia hitaammin
};
// Lehmät alppikylän laitumella
const COW = { hp: 40, respawnMs: 15000 };
// Karttaäänestys kierroksen lopussa
// Voiton jälkeen nöyryytys (kuten TF2): häviäjät eivät voi ampua ja juoksevat kädet ylhäällä, voittajat saavat ampua.
// Karttaäänestys alkaa vasta tämän jälkeen.
const HUMILIATION_MS = 12000;
const VOTE = { ms: 15000, minMs: 3000, options: 4 }; // kaikki neljä karttaa äänestykseen
// Pilkkanauru (G): kesto = naurutiedoston kuuluva osa + pieni varmuus (hahmo nauraa paikallaan)
const TAUNT_MS = { olavi: 2750, sotilas: 3500, vikkela: 3150, danny: 3650, panssari: 3850, mika: 3000 };
const BOT_NAMES = { panssari: "Jari", sotilas: "Juha", vikkela: "Jarmo", olavi: "Olavi", danny: "Daniel", mika: "Mika" };
const TICK_MS = 33;       // palvelin päivittää tilan noin 30 kertaa sekunnissa
const HISTORY_TICKS = 45; // 1,5 s historiaa osumien tarkistukseen
const MAX_PLAYERS = 10;
const MAX_HEIGHT = 20;
const COLORS = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#42d4f4", "#f032e6", "#bfef45", "#fabed4", "#ffe119"];


const __default = {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Tähän osoitteeseen yhdistetään WebSocketilla.", { status: 426 });
      }
      const room = cleanName(url.searchParams.get("room"), "aula").toLowerCase();
      return env.ROOMS.get(env.ROOMS.idFromName(room)).fetch(request);
    }
    // Etusivun taustakartta ja karttaluettelo (selain hakee ennen peliin liittymistä)
    if (url.pathname === "/map" || url.pathname === "/maps") {
      const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "cache-control": "max-age=300" };
      if (url.pathname === "/maps") return new Response(JSON.stringify(mapList()), { headers });
      const m = MAPS[url.searchParams.get("id")] || MAPS[DEFAULT_MAP];
      return new Response(JSON.stringify(mapPayload(m)), { headers });
    }
    return new Response("Areenan palvelin toimii. Peli yhdistää osoitteeseen /ws?room=huoneen-nimi", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
};

function cleanName(value, fallback) {
  const s = (value || "").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 16);
  return s || fallback;
}

const r2 = (v) => Math.round(v * 100) / 100;
const num = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
const vec = (a) => (Array.isArray(a) && a.length === 3 && a.every((v) => num(v) !== null) ? a : null);

// Säde vs. laatikko: palauttaa etäisyyden osumaan tai null
function rayBox(o, d, min, max) {
  let tmin = 0, tmax = Infinity;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-9) {
      if (o[i] < min[i] || o[i] > max[i]) return null;
    } else {
      let t1 = (min[i] - o[i]) / d[i], t2 = (max[i] - o[i]) / d[i];
      if (t1 > t2) [t1, t2] = [t2, t1];
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) return null;
    }
  }
  return tmin;
}

class GameRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.players = new Map();
    this.sockets = new Map();
    this.nextId = 1;
    this.loop = null;
    this.seq = 0;
    this.history = []; // [{seq, pos: Map(id -> [x, y, z])}]
    this.projectiles = [];
    this.tires = []; // Danielin kimpoilevat renkaat
    this.drops = [];   // lasinpesunestepisarat
    this.cards = [];   // Mikan kortit
    this.puddles = []; // siniset lätäköt
    this.nextPuddle = 1;
    this.nextProj = 1;
    this.sentries = new Map(); // omistajan id -> banaani (yksi kerrallaan)
    this.detectors = [];       // maahan heitetyt Shit detectorit
    this.setMap(DEFAULT_MAP);
    this.resetRound();
    this.nextSentry = 1;
  }

  async fetch(request) {
    const url = new URL(request.url);
    const [client, server] = Object.values(new WebSocketPair());
    server.accept();

    // Huoneen ensimmäinen pelaaja valitsee kartan (myöhemmin liittyvät tulevat samaan karttaan)
    const wantMap = url.searchParams.get("map");
    if (wantMap && MAPS[wantMap] && wantMap !== this.M.id && ![...this.players.values()].some((q) => !q.bot)) {
      this.setMap(wantMap);
      this.resetRound();
      this.projectiles = []; this.tires = []; this.drops = []; this.cards = []; this.puddles = []; this.detectors = [];
      for (const sn of [...this.sentries.values()]) this.destroySentry(sn, null);
    }

    if (this.players.size >= (this.maxPlayers || MAX_PLAYERS)) { // täynnä: botti antaa tilaa oikealle pelaajalle
      const bot = [...this.players.values()].find((q) => q.bot && !q.carrying) || [...this.players.values()].find((q) => q.bot);
      if (bot) this.removePlayer(bot.id);
    }
    if (this.players.size >= (this.maxPlayers || MAX_PLAYERS)) {
      server.send(JSON.stringify({ type: "full" }));
      server.close(1000, "Huone on täynnä");
      return new Response(null, { status: 101, webSocket: client });
    }

    const id = this.nextId++;
    const cls = CLASSES[url.searchParams.get("cls")] ? url.searchParams.get("cls") : "sotilas";
    const player = {
      id, cls,
      name: cleanName(url.searchParams.get("name"), "Pelaaja " + id),
      color: "#8a8a8a", team: null, carrying: null,
      x: 0, y: 0, z: 0, yaw: 0, pitch: 0,
      hp: CLASSES[cls].hp, alive: false, kills: 0, deaths: 0, caps: 0, steals: 0, // pelaaja syntyy vasta valittuaan puolen
      lastMove: Date.now(), lastShot: 0, ammo: WEAPON.mag, reloadUntil: 0,
      weapon: 0, lastThrow: 0, knockUntil: 0, knockSpeed: 0, lastMelee: 0, gluedUntil: 0, buildReadyAt: 0,
      detReadyAt: 0, lastSnipe: 0, zoomed: false, zoomAt: 0, leapUntil: 0, leapReadyAt: 0,
    };
    this.players.set(id, player);
    this.sockets.set(id, server);

    server.send(JSON.stringify({
      type: "welcome", id, color: player.color,
      alone: ![...this.players.values()].some((q) => !q.bot && q.id !== id), // tyhjä huone: liittyjä valitsee kartan
      spawn: null,
      map: mapPayload(this.M),
      ctf: this.ctfInfo(),
      maps: mapList(),
      classes: CLASSES, weapon: WEAPON, weapons: WEAPONS, gravity: GRAVITY, tick: TICK_MS,
    }));

    server.addEventListener("message", (event) => {
      let msg;
      try { msg = JSON.parse(event.data); } catch { return; }
      // Nauraessa ei ammuta eikä käytetä erikoiskykyjä
      // Hävinnyt joukkue antautuu: ei ampumista, kykyjä, hoitamista eikä pilkkanaurua
      if (this.humiliated(player) && ["shoot", "throw", "spray", "card", "melee", "build", "leap", "charge", "uber", "dart", "medi", "taunt", "zoom"].includes(msg.type)) return;
      if (Date.now() < (player.tauntUntil || 0) && ["shoot", "throw", "spray", "card", "melee", "build", "leap", "charge", "uber", "dart"].includes(msg.type)) return;
      if (msg.type === "taunt") {
        const now = Date.now();
        if (player.alive && player.team && now >= (player.tauntUntil || 0) && now >= (player.chargeUntil || 0)) {
          const ms = TAUNT_MS[player.cls] || 3000;
          player.tauntUntil = now + ms;
          this.sendAll({ type: "taunt", id: player.id, k: player.cls, ms });
        }
        return;
      }
      if (msg.type === "move") this.handleMove(player, msg, server);
      else if (msg.type === "shoot") this.handleShoot(player, msg);
      else if (msg.type === "reload") this.startReload(player);
      else if (msg.type === "throw") this.handleThrow(player, msg);
      else if (msg.type === "spray") this.handleSpray(player, msg);
      else if (msg.type === "card") this.handleCard(player, msg);
      else if (msg.type === "medi") this.handleMedi(player, msg);
      else if (msg.type === "uber") this.handleUber(player);
      else if (msg.type === "dart") { // ruisku lähtee tykistä: muut näkevät sen lennon
        const now = Date.now(), d = vec(msg.d), L = num(msg.L);
        if (player.alive && d && L !== null && CLASSES[player.cls].loadout[player.weapon] === "pepti" && now - (player.lastDart || 0) > 300) {
          player.lastDart = now;
          this.sendAll({ type: "dart", id: player.id, d: d.map(r2), L: Math.max(0.5, Math.min(PEPTI.range, L)) }, player.id);
        }
      }
      else if (msg.type === "melee") this.handleMelee(player, msg);
      else if (msg.type === "build") this.handleBuild(player, msg);
      else if (msg.type === "zoom") {
        const on = !!msg.on && CLASSES[player.cls].loadout.includes("kivaari");
        if (on && !player.zoomed) player.zoomAt = Date.now(); // lataus alkaa tähtäimen avautuessa
        player.zoomed = on;
      }
      else if (msg.type === "leap") this.handleLeap(player, msg);
      else if (msg.type === "charge") this.handleCharge(player);
      else if (msg.type === "vote") this.handleVote(player, String(msg.map || ""));
      else if (msg.type === "pickMap") { // tyhjään huoneeseen liittynyt valitsee kartan ennen puolen valintaa
        const id = String(msg.map || "");
        if (MAPS[id] && !player.team && ![...this.players.values()].some((q) => !q.bot && q !== player)) {
          this.winner = null;
          this.vote = { opts: [id], votes: new Map(), until: 0, startedAt: 0 };
          this.finishVote(Date.now());
        }
      }
      else if (msg.type === "team") this.handleTeam(player, msg.t);
      else if (msg.type === "class") this.handleClass(player, msg.cls);
      else if (msg.type === "ping") server.send(JSON.stringify({ type: "pong", t: msg.t })); // viivemittari
      else if (msg.type === "help") { // APUA-huuto (E), enintään 2,5 s välein; huutaja soittaa oman huutonsa itse
        const now = Date.now();
        if (player.alive && player.team && now - (player.lastHelp || 0) >= 2500) {
          player.lastHelp = now;
          this.sendAll({ type: "help", id: player.id, k: player.cls, v: Math.max(0, Math.min(2, num(msg.v) | 0)) }, player.id); // v = mikä kolmesta huudosta
          for (const b of this.players.values()) // oman joukkueen Mika-botit lähtevät auttamaan
            if (b.bot && b.alive && b.brain && sameTeam(b, player) && CLASSES[b.cls].loadout.includes("pepti")) { b.brain.helpFrom = player.id; b.brain.helpUntil = now + 10000; b.brain.helpAt = now; }
        }
      }
      else if (msg.type === "shout") { // taisteluhuuto kaikille (enintään 2,5 s välein)
        const now = Date.now();
        if (now - (player.lastShout || 0) >= 2500) { player.lastShout = now; this.sendAll({ type: "shout", id: player.id, k: player.cls }); }
      }
      else if (msg.type === "weapon") {
        const w = num(msg.w);
        if (w !== null && w >= 0 && w < CLASSES[player.cls].loadout.length) player.weapon = Math.floor(w);
      }
    });
    const leave = () => this.removePlayer(id);
    // Kuitataan sulkeminen, jotta pelaajan selain pääsee heti valikkoon
    server.addEventListener("close", () => { try { server.close(1000, "Hei hei"); } catch {} leave(); });
    server.addEventListener("error", leave);

    if (!this.loop) this.loop = setInterval(() => this.broadcastState(), TICK_MS);
    return new Response(null, { status: 101, webSocket: client });
  }

  // Puolen valinta (ovi): pelaaja syntyy oman tiiminsä baseen
  handleTeam(p, t) {
    if (!TEAMS.includes(t) || p.team === t) return;
    this.dropRecipe(p);
    const switching = !!p.team;
    p.team = t;
    const used = new Set([...this.players.values()].filter((q) => q.team === t && q !== p).map((q) => q.color));
    p.color = TEAM_COLORS[t].find((c) => !used.has(c)) || TEAM_COLORS[t][0];
    if (switching && p.alive) { p.alive = false; } // puolta vaihtaessa syntyy uudelleen uuteen baseen
    this.respawn(p.id);
    this.sendAll({ type: "teamJoin", id: p.id, name: p.name, team: t });
  }

  // Hahmon vaihto kesken pelin (Esc-valikosta). Omassa basessa vaihto tapahtuu heti,
  // muualla hahmo kaatuu ja syntyy uutena hahmona normaalin odotuksen jälkeen (kuten TF2:ssa).
  handleClass(p, cls) {
    if (!CLASSES[cls] || p.cls === cls) return;
    this.dropRecipe(p);
    const sn = this.sentries.get(p.id);
    if (sn && !CLASSES[cls].loadout.includes("banaani")) this.destroySentry(sn, null);
    const hb = p.team && this.M.bases[p.team], inBase = hb && Math.hypot(p.x - (hb.x || 0), p.z - hb.z) < 9 && p.y < (hb.y || 0) + 1.5;
    p.cls = cls; p.weapon = 0; p.zoomed = false; p.leapUntil = 0; p.crouch = false;
    p.ammo = WEAPON.mag; p.reloadUntil = 0;
    this.send(p.id, { type: "classChanged", cls });
    if (!p.team) { p.hp = CLASSES[cls].hp; return; }
    if (!p.alive) return; // kuolleena: syntyy uutena hahmona, kun odotus päättyy
    if (inBase) { p.alive = false; this.respawn(p.id); return; }
    p.alive = false; p.hp = 0;
    this.sendAll({ type: "kill", killer: p.name, kc: p.color, victim: p.name, vc: p.color, killerId: p.id, victimId: p.id, via: "vaihto", respawnMs: RESPAWN_MS });
    setTimeout(() => { if (!p.alive) this.respawn(p.id); }, RESPAWN_MS);
  }

  placeAtSpawn(p) {
    const list = this.M.spawns[p.team] || this.M.spawns.sininen;
    const [sx, sz, sy] = list[Math.floor(Math.random() * list.length)];
    p.x = sx; p.y = sy || 0; p.z = sz;
    p.yaw = Math.atan2(sx, sz); // katse kohti areenan keskustaa
    p.pitch = 0;
    p.lastMove = Date.now();
  }

  handleMove(p, msg, ws) {
    if (!p.alive) return;
    const x = num(msg.x), y = num(msg.y), z = num(msg.z), yaw = num(msg.yaw), pitch = num(msg.pitch);
    if (x === null || y === null || z === null || yaw === null || pitch === null) return;

    const now = Date.now();
    const elapsed = Math.min(1, (now - p.lastMove) / 1000);
    // Pelivaraa verkon heittelyn takia, mutta ei teleporttausta
    let maxDist = CLASSES[p.cls].speed * elapsed * 1.6 + 0.6;
    if (now < (p.chargeUntil || 0) + 600) maxDist = Math.max(maxDist, CHARGE.speed * elapsed * 1.4 + 0.8); // pyöräsyöksy
    if (now < p.knockUntil) maxDist += p.knockSpeed * elapsed * 1.5 + 1; // räjähdys lennättää
    if (this.puddles.some((pd) => Math.hypot(pd.x - p.x, pd.z - p.z) < pd.r + 4)) maxDist *= PESU.speedBoost * 1.15; // liukas lätäkkö
    if (now < (p.tauntUntil || 0) && now >= p.knockUntil) maxDist = 0.35; // nauraessa paikoillaan (räjähdys saa silti lennättää)
    const dist = Math.hypot(x - p.x, z - p.z);
    const inside = Math.abs(x) <= this.M.x && Math.abs(z) <= this.M.z && y >= -0.01 && y <= MAX_HEIGHT;

    if (dist > maxDist || !inside) {
      ws.send(JSON.stringify({ type: "correct", x: p.x, y: p.y, z: p.z }));
      p.lastMove = now;
      return;
    }
    p.x = x; p.y = y; p.z = z;
    p.yaw = yaw;
    p.pitch = Math.max(-1.6, Math.min(1.6, pitch));
    p.crouch = !!msg.c;
    p.lastMove = now;
  }

  // Muiden pelaajien sijainnit sillä hetkellä, jonka ampuja näki (kahden tilan välistä)
  rewind(sa, sb, t) {
    const a = this.history.find((h) => h.seq === sa);
    const b = this.history.find((h) => h.seq === sb);
    if (!a || !b) return null;
    t = Math.max(0, Math.min(1, num(t) ?? 1));
    const out = new Map();
    for (const [id, pb] of b.pos) {
      const pa = a.pos.get(id) || pb;
      out.set(id, [pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t]);
    }
    return out;
  }

  startReload(p) {
    if (p.reloadUntil && Date.now() >= p.reloadUntil) { p.ammo = WEAPON.mag; p.reloadUntil = 0; }
    if (!p.alive || p.reloadUntil || p.ammo >= WEAPON.mag) return;
    p.reloadUntil = Date.now() + WEAPON.reloadMs;
  }

  handleShoot(p, msg) {
    if (!p.alive) return;
    const now = Date.now();
    const sniper = msg.w === "kivaari" && CLASSES[p.cls].loadout.includes("kivaari");
    let charge = 1;
    if (sniper) {
      if (now - p.lastSnipe < KIVAARI.cooldownMs * 0.9) return;
      // Lataus: aika tähtäimen avaamisesta tai edellisestä laukauksesta
      if (p.zoomed) charge = Math.max(KIVAARI.minCharge, Math.min(1, (now - Math.max(p.zoomAt || 0, p.lastSnipe)) / KIVAARI.chargeMs));
      p.lastSnipe = now;
    } else {
      // Lataus valmis? (pieni pelivara verkon viiveen takia)
      if (p.reloadUntil && now >= p.reloadUntil - 150) { p.ammo = WEAPON.mag; p.reloadUntil = 0; }
      if (p.reloadUntil || p.ammo <= 0) return;                // lataus kesken tai lipas tyhjä
      if (now - p.lastShot < WEAPON.cooldownMs * 0.8) return;  // liian nopea tuli
      p.lastShot = now;
      p.ammo--;
      if (p.ammo === 0) p.reloadUntil = now + WEAPON.reloadMs; // automaattinen lataus
    }

    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    // Ampumispisteen pitää olla pelaajan silmien kohdalla
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;

    // Lähin seinä tai lattia
    let tWall = sniper ? KIVAARI.range : WEAPON.range;
    for (const b of this.M.boxes) {
      const t = rayBox(o, d, [b[0], b[1], b[2]], [b[3], b[4], b[5]]);
      if (t !== null && t < tWall) tWall = t;
    }
    for (const b of this.M.outer) {
      const t = rayBox(o, d, [b[0], b[1], b[2]], [b[3], b[4], b[5]]);
      if (t !== null && t < tWall) tWall = t;
    }
    if (d[1] < 0) tWall = Math.min(tWall, (0 - o[1]) / d[1]);

    // Lähin pelaaja ennen seinää
    const past = this.rewind(msg.sa, msg.sb, msg.t);
    let best = null;
    for (const q of this.players.values()) {
      if (q === p || !q.alive || sameTeam(p, q)) continue; // luodit menevät omien läpi
      const c = dims(q);
      const [x, y, z] = past?.get(q.id) || [q.x, q.y, q.z];
      const t = rayBox(o, d, [x - c.radius, y, z - c.radius], [x + c.radius, y + c.height, z + c.radius]);
      if (t !== null && t < tWall && (!best || t < best.t)) {
        // Osuiko päähän? (pään ympärillä pieni laatikko)
        const [hy, hr] = c.head, hb = hr * 1.15;
        const th = rayBox(o, d, [x - hb, y + hy - hr, z - hb], [x + hb, y + hy + hr * 1.1, z + hb]);
        best = { q, t: th !== null ? th : t, head: th !== null };
      }
    }

    // Lehmät
    this.cows.forEach((c, i) => {
      if (c.deadUntil) return;
      const t = rayBox(o, d, [c.x - 0.7, c.y, c.z - 0.7], [c.x + 0.7, c.y + 1.5, c.z + 0.7]);
      if (t !== null && t < tWall && (!best || t < best.t)) best = { cow: i, t };
    });

    // Banaanit (ei omaa)
    for (const sn of this.sentries.values()) {
      if (sn.owner === p.id || sameTeam(p, this.players.get(sn.owner))) continue;
      const t = rayBox(o, d, sentryMin(sn), sentryMax(sn));
      if (t !== null && t < tWall && (!best || t < best.t)) best = { sn, t };
    }

    const dist = best ? best.t : tWall;
    const end = o.map((v, i) => r2(v + d[i] * dist));
    // Muut näkevät laukauksen jäljen
    this.sendAll({ type: "shot", id: p.id, tm: p.team, o: o.map(r2), e: end, hit: !!best, w: sniper ? "kivaari" : "pistooli" }, p.id);

    if (!best) return;
    if (best.cow !== undefined) return this.hitCow(p, best.cow, sniper ? KIVAARI.noscopeDamage : damageAt(best.t), end);
    if (sniper) {
      // Pääosuma vain tähtäimen läpi (kuten TF2:ssa)
      const head = best.head && p.zoomed;
      const dmg = head ? KIVAARI.headDamage : !p.zoomed ? KIVAARI.noscopeDamage : Math.max(1, Math.round(KIVAARI.bodyDamage * charge));
      if (best.sn) this.damageSentry(p, best.sn, dmg, end);
      else this.applyDamage(p, best.q, dmg, end, o, head ? "pää" : undefined);
      return;
    }
    if (best.sn) this.damageSentry(p, best.sn, damageAt(best.t), end);
    else this.applyDamage(p, best.q, damageAt(best.t), end, o);
  }

  // Vahinko pelaajalle q pelaajalta p (yhteinen kaikille aseille)
  applyDamage(p, q, amount, at, from, via) {
    const self = p === q; // esim. Jari omasta Tulipatukastaan
    if (!q.alive || (!self && sameTeam(p, q))) return; // omiin ei vahinkoa
    if (Date.now() < (q.invulnUntil || 0)) return; // steroidia suoneen: ei vahinkoa
    if (Date.now() < q.gluedUntil) amount = Math.round(amount * (1 + LIIMA.vulnerable)); // liimattu ottaa enemmän vahinkoa
    const dmg = Math.min(q.hp, amount);
    q.hp -= dmg;
    if (q.bot && p !== q) { q.brain.hurtBy = p.id; q.brain.hurtAt = Date.now(); }
    const killed = q.hp <= 0;
    if (via !== "banaani" && !self) this.send(p.id, { type: "hit", target: q.id, dmg, kill: killed, at, head: via === "pää" }); // banaanin osumista ei omistajalle numeroita
    this.send(q.id, { type: "hurt", dmg, from: p.id, fx: from[0], fz: from[2] });
    if (killed) {
      q.alive = false;
      this.dropRecipe(q); // kantaja pudottaa reseptin
      q.deaths++;
      if (!self) p.kills++;
      this.sendAll({ type: "kill", killer: p.name, kc: p.color, victim: q.name, vc: q.color, killerId: p.id, victimId: q.id, via, respawnMs: RESPAWN_MS });
      setTimeout(() => { if (!q.alive) this.respawn(q.id); }, RESPAWN_MS); // kierroksen vaihto on voinut jo herättää
    }
  }

  // ====== Puikkoliima ======
  handleMelee(p, msg) {
    const W = msg.w === "sauva" ? SAUVA : LIIMA, glue = W === LIIMA;
    if (!p.alive || !CLASSES[p.cls].loadout.includes(glue ? "liima" : "sauva")) return;
    const now = Date.now();
    if (now - p.lastMelee < W.cooldownMs * 0.8) return;
    p.lastMelee = now;
    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
    this.sendAll({ type: "swing", id: p.id }, p.id); // muut näkevät iskun

    let reach = W.range;
    for (const b of this.M.boxes) { const t = rayBox(o, d, [b[0], b[1], b[2]], [b[3], b[4], b[5]]); if (t !== null && t < reach) reach = t; }
    const past = this.rewind(msg.sa, msg.sb, msg.t);
    let best = null;
    for (const q of this.players.values()) {
      if (q === p || !q.alive || sameTeam(p, q)) continue; // luodit menevät omien läpi
      const c = dims(q), pad = 0.3; // lähitaisteluun hieman anteeksiantava osuma-alue
      const [x, y, z] = past?.get(q.id) || [q.x, q.y, q.z];
      const t = rayBox(o, d, [x - c.radius - pad, y, z - c.radius - pad], [x + c.radius + pad, y + c.height + 0.1, z + c.radius + pad]);
      if (t !== null && t <= reach && (!best || t < best.t)) best = { q, t };
    }
    for (const sn of this.sentries.values()) {
      if (sn.owner === p.id || sameTeam(p, this.players.get(sn.owner))) continue;
      const t = rayBox(o, d, sentryMin(sn), sentryMax(sn));
      if (t !== null && t <= reach && (!best || t < best.t)) best = { sn, t };
    }
    if (!best) return;
    const at = o.map((v, i) => r2(v + d[i] * best.t));
    if (best.sn) { this.damageSentry(p, best.sn, W.damage, at); return; }
    const q = best.q;
    this.applyDamage(p, q, W.damage, at, o);
    if (!q.alive || !glue) return;
    q.gluedUntil = now + LIIMA.durationMs;
    this.send(q.id, { type: "glued", ms: LIIMA.durationMs, from: p.id });
  }

  // ====== Reseptipeli ======
  // ====== Kartat ja äänestys ======
  setMap(id) {
    this.M = MAPS[id] || MAPS[DEFAULT_MAP];
    this.nav = navFor(this.M);
    this.steakAt = this.M.grills.map(() => 0); // milloin kunkin grillin pihvi on valmis (0 = heti)
    // Lehmät (alppikylä): ammuttavia, kuolevat ja syntyvät hetken päästä uudelleen
    this.cows = (this.M.cows || []).map(([x, z, y, rot]) => ({ x, z, y, rot, hp: COW.hp, deadUntil: 0 }));
  }

  // Luoti osui lehmään
  hitCow(p, i, dmg, at) {
    const c = this.cows[i];
    if (!c || c.deadUntil) return;
    c.hp -= dmg;
    const dead = c.hp <= 0;
    this.send(p.id, { type: "hit", target: "c" + i, dmg: Math.min(dmg, dmg + Math.min(0, c.hp)), kill: dead, at });
    if (dead) { c.deadUntil = Date.now() + COW.respawnMs; this.sendAll({ type: "cow", i, ev: "die" }); }
  }

  updateCows(now) {
    this.cows.forEach((c, i) => {
      if (c.deadUntil && now >= c.deadUntil) { c.deadUntil = 0; c.hp = COW.hp; this.sendAll({ type: "cow", i, ev: "spawn" }); }
    });
  }

  ctfInfo() {
    return { bases: this.M.bases, baseRadius: this.M.baseRadius, tower: this.M.recipe, winScore: CTF.winScore,
             where: this.M.recipeWhere || "katolla", whereTo: this.M.recipeTo || "katolle", item: this.M.item || "resepti" };
  }

  // Voiton jälkeen pelaajat äänestävät seuraavan kartan (enintään 3 vaihtoehtoa)
  startVote(now) {
    const ids = Object.keys(MAPS);
    const others = ids.filter((id) => id !== this.M.id).sort(() => Math.random() - 0.5);
    const opts = [this.M.id, ...others].slice(0, VOTE.options).sort(() => Math.random() - 0.5);
    this.vote = { opts, votes: new Map(), until: now + VOTE.ms, startedAt: now };
  }

  handleVote(p, id) {
    if (!this.vote || !this.vote.opts.includes(id)) return;
    this.vote.votes.set(p.id, id);
  }

  voteCounts() {
    const c = Object.fromEntries(this.vote.opts.map((id) => [id, 0]));
    for (const id of this.vote.votes.values()) if (id in c) c[id]++;
    return c;
  }

  // Äänestys päättyy, kun aika loppuu tai kaikki ovat äänestäneet
  finishVote(now) {
    const c = this.voteCounts(), max = Math.max(...Object.values(c));
    let pick;
    if (max === 0) { // kukaan ei äänestänyt: arvotaan jokin muu kuin nykyinen kartta (jos sellainen on)
      const others = this.vote.opts.filter((id) => id !== this.M.id);
      pick = (others.length ? others : this.vote.opts)[Math.floor(Math.random() * (others.length || this.vote.opts.length))];
    } else {
      const top = this.vote.opts.filter((id) => c[id] === max);
      pick = top[Math.floor(Math.random() * top.length)];
    }
    this.vote = null;
    const changed = pick !== this.M.id;
    if (changed) {
      this.setMap(pick);
      this.projectiles = []; this.tires = []; this.drops = []; this.cards = []; this.puddles = []; this.detectors = [];
      for (const sn of [...this.sentries.values()]) this.destroySentry(sn, null);
      for (const q of this.players.values()) if (q.bot) { q.brain.path = []; q.brain.goal = null; q.brain.kn = null; q.brain.leap = null; }
    }
    this.resetRound();
    // Kartta lähetetään ennen uudelleensyntymistä, jotta pelaajat syntyvät uuteen kenttään
    this.sendAll({ type: "map", map: mapPayload(this.M), ctf: this.ctfInfo(), changed });
    for (const q of this.players.values()) { q.carrying = null; q.chargeUntil = 0; q.kills = 0; q.deaths = 0; q.caps = 0; q.steals = 0; if (q.team) { q.alive = false; this.respawn(q.id); } } // pistetaulukko nollautuu
    this.sendAll({ type: "ctf", ev: "newRound", map: this.M.name });
  }

  resetRound() {
    this.score = { sininen: 0, punainen: 0 };
    this.recipes = [];        // { id, st: "tower" | "carried" | "dropped", x, y, z, carrier, droppedAt }
    this.nextRecipe = 1;
    this.towerAt = Date.now() + CTF.firstRecipeMs;
    this.roundOverAt = 0;
    this.winner = null;
  }

  dropRecipe(p) {
    const r = this.recipes?.find((r) => r.st === "carried" && r.carrier === p.id);
    p.carrying = null;
    if (!r) return;
    r.st = "dropped"; r.carrier = 0; r.droppedAt = Date.now();
    r.x = p.x; r.z = p.z; r.y = this.supportAt(p.x, p.z, p.y + 0.5);
    this.sendAll({ type: "ctf", ev: "drop", name: p.name, team: p.team });
  }

  updateCTF(now) {
    if (!this.recipes) this.resetRound();
    // Voiton jälkeen odotetaan ja aloitetaan uusi kierros
    if (this.winner) {
      if (now < (this.humilUntil || 0)) return; // nöyryytys ensin, sitten äänestys
      if (!this.vote) this.startVote(now);
      const humans = [...this.players.values()].filter((q) => !q.bot);
      const allVoted = humans.length > 0 && humans.every((q) => this.vote.votes.has(q.id));
      if (now >= this.vote.until || (allVoted && now - this.vote.startedAt > VOTE.minMs)) this.finishVote(now);
      return;
    }
    // Uusi resepti tornin katolle
    if (!this.recipes.some((r) => r.st === "tower") && now >= this.towerAt) {
      this.recipes.push({ id: this.nextRecipe++, st: "tower", x: this.M.recipe[0], y: this.M.recipe[1], z: this.M.recipe[2], carrier: 0 });
      this.sendAll({ type: "ctf", ev: "spawn" });
    }
    const touching = (q, x, y, z, r) => Math.hypot(q.x - x, q.z - z) <= r + CLASSES[q.cls].radius && y >= q.y - 0.8 && y <= q.y + CLASSES[q.cls].height + 0.6;
    for (const r of [...this.recipes]) {
      if (r.st === "carried") {
        const c = this.players.get(r.carrier);
        if (!c || !c.alive) { r.st = "dropped"; r.droppedAt = now; continue; }
        r.x = c.x; r.y = c.y + CLASSES[c.cls].height + 0.5; r.z = c.z;
        continue;
      }
      // Pudotettu resepti palaa tornille, jos sitä ei poimita ajoissa
      if (r.st === "dropped" && now - r.droppedAt > CTF.droppedReturnMs) {
        if (this.recipes.some((o) => o.st === "tower")) this.recipes.splice(this.recipes.indexOf(r), 1);
        else { r.st = "tower"; r.x = this.M.recipe[0]; r.y = this.M.recipe[1]; r.z = this.M.recipe[2]; }
        this.sendAll({ type: "ctf", ev: "return" });
        continue;
      }
      // Poiminta (tornista tai maasta), kuka tahansa tiimiläinen jolla ei ole jo reseptiä
      for (const q of this.players.values()) {
        if (!q.alive || !q.team || q.carrying) continue;
        if (!touching(q, r.x, r.y, r.z, CTF.pickupRange)) continue;
        if (r.st === "tower") this.towerAt = now + CTF.towerEveryMs;
        r.st = "carried"; r.carrier = q.id; q.carrying = r.id;
        this.sendAll({ type: "ctf", ev: "pickup", name: q.name, team: q.team });
        break;
      }
    }
    // Basit: tuonti omaan baseen ja varastaminen vastapuolelta
    for (const q of this.players.values()) {
      if (!q.alive || !q.team) continue;
      for (const [team, b] of Object.entries(this.M.bases)) {
        if (!touching(q, b.x || 0, b.y || 0, b.z, this.M.baseRadius) || q.y > (b.y || 0) + 1.5) continue;
        if (team === q.team && q.carrying) {
          const i = this.recipes.findIndex((r) => r.id === q.carrying);
          const stolen = i >= 0 && this.recipes[i].stolen;
          if (i >= 0) this.recipes.splice(i, 1);
          q.carrying = null;
          this.score[team]++;
          q.caps++;                 // pistetaulukko: kotiin tuotu
          if (stolen) q.steals++;   // ...ja vastustajalta varastettu ja onnistuneesti kotiin tuotu
          this.sendAll({ type: "ctf", ev: "capture", name: q.name, team });
          if (this.score[team] >= CTF.winScore) {
            this.winner = team; this.humilUntil = now + HUMILIATION_MS; this.roundOverAt = this.humilUntil;
            this.sendAll({ type: "ctf", ev: "win", team });
          }
        } else if (team !== q.team && !q.carrying && this.score[team] > 0) {
          this.score[team]--;
          const r = { id: this.nextRecipe++, st: "carried", carrier: q.id, x: q.x, y: q.y + 2, z: q.z, stolen: true };
          this.recipes.push(r);
          q.carrying = r.id;
          this.sendAll({ type: "ctf", ev: "steal", name: q.name, team: q.team, from: team });
        }
      }
    }
  }

  // ====== Grillit ja pihvit ======
  updateGrills(now) {
    const [gw, , gd] = this.M.grillSize;
    this.M.grills.forEach(([gx, gz, gy], i) => {
      if (now < this.steakAt[i]) return;
      for (const q of this.players.values()) {
        if (!q.alive) continue;
        const c = CLASSES[q.cls];
        if (q.hp >= c.hp) continue; // täysillä elämillä pihvi jää muille
        // pelaaja koskettaa grilliä (pieni pelivara reunoilla)
        const near = Math.abs(q.x - gx) <= gw / 2 + c.radius + 0.3 && Math.abs(q.z - gz) <= gd / 2 + c.radius + 0.3 && Math.abs(q.y - (gy || 0)) < 1.6;
        if (!near) continue;
        const heal = Math.min(PIHVI.heal, c.hp - q.hp);
        q.hp += heal;
        this.steakAt[i] = now + PIHVI.respawnMs;
        this.send(q.id, { type: "heal", amount: heal, hp: q.hp });
        this.sendAll({ type: "steak", i, by: q.id });
        break;
      }
    });
  }

  // ====== Juhan mahaplätsi ======
  handleLeap(p, msg) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("platsi")) return;
    const now = Date.now();
    if (now < p.leapReadyAt - 300) return;
    const x = num(msg.x), y = num(msg.y), z = num(msg.z);
    if (x === null || y === null || z === null) return;
    const dist = Math.hypot(x - p.x, z - p.z);
    if (dist > PLATSI.maxDist + 0.4 || y > p.y + PLATSI.height + 0.3) return;
    const plan = leapPlan(p.y, y, dist);
    p.leapReadyAt = now + PLATSI.cooldownMs;
    p.leapUntil = now + plan.T * 1000;
    p.knockUntil = Math.max(p.knockUntil, p.leapUntil + 500); // liikkeen tarkistukselle pelivaraa
    p.knockSpeed = Math.max(p.knockSpeed, plan.vh);
    const target = [x, y, z];
    setTimeout(() => this.slam(p, target), plan.T * 1000);
  }

  // Laskeutuminen: vahinko ja lennätys kuten Tulipatukassa (Juha itse ei kärsi)
  slam(p, at) {
    if (!this.players.has(p.id) || !p.alive) return;
    this.sendAll({ type: "slam", id: p.id, at: at.map(r2), r: PLATSI.radius });
    for (const q of this.players.values()) {
      if (q === p || !q.alive || sameTeam(p, q)) continue; // luodit menevät omien läpi
      const c = dims(q);
      const nx = Math.max(q.x - c.radius, Math.min(at[0], q.x + c.radius));
      const ny = Math.max(q.y, Math.min(at[1] + 0.3, q.y + c.height));
      const nz = Math.max(q.z - c.radius, Math.min(at[2], q.z + c.radius));
      const dist = Math.hypot(at[0] - nx, at[1] + 0.3 - ny, at[2] - nz);
      if (dist > PLATSI.radius) continue;
      const f = 1 - dist / PLATSI.radius;
      const dv = [q.x - at[0], q.y + c.height / 2 - at[1], q.z - at[2]];
      const dl = Math.hypot(...dv) || 1;
      const dir = dv.map((v) => v / dl);
      const K = PATUKKA.knock * f;
      const kv = [dir[0] * K, Math.max(0, dir[1]) * K + PATUKKA.knockUp * f, dir[2] * K];
      q.knockUntil = Date.now() + 2500;
      q.knockSpeed = Math.hypot(kv[0], kv[2]);
      this.send(q.id, { type: "knock", v: kv.map(r2) });
      const dmg = Math.round(PATUKKA.dmgMin + (PATUKKA.dmgMax - PATUKKA.dmgMin) * f);
      this.applyDamage(p, q, dmg, [q.x, q.y + c.height * 0.7, q.z].map(r2), at, "plätsi");
    }
    for (const sn of [...this.sentries.values()]) {
      if (sn.owner === p.id || sameTeam(p, this.players.get(sn.owner))) continue;
      if (Math.hypot(sn.x - at[0], sn.z - at[2]) <= PLATSI.radius + BANAANI.half) this.damageSentry(p, sn, PATUKKA.dmgMax, [sn.x, sn.y + 0.5, sn.z].map(r2));
    }
  }

  // ====== Juhan banaaniserveri ======
  // Korkein taso (lattia tai laatikon kansi), jonka päällä kohta (x, z) on, enintään korkeudella maxY
  supportAt(x, z, maxY) {
    let top = 0;
    for (const b of this.M.boxes) if (x >= b[0] && x <= b[3] && z >= b[2] && z <= b[5] && b[4] <= maxY + 0.05) top = Math.max(top, b[4]);
    return top;
  }

  handleBuild(p, msg) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("banaani")) return;
    const now = Date.now();
    const x = num(msg.x), y = num(msg.y), z = num(msg.z), yaw = num(msg.yaw) ?? p.yaw;
    const fail = (why) => this.send(p.id, { type: "buildFail", why });
    if (now < p.buildReadyAt) return fail("odota");
    // Jos banaaniserveri on jo kentällä, uusi banaani päivittää sen tertuksi (yksi banaani lisää)
    const cur = this.sentries.get(p.id);
    if (cur) {
      if (cur.built < 1 || now < (cur.upgUntil || 0)) return fail("rakentuu vielä");
      if (cur.lv >= BANAANI.maxLevel) return fail(`terttu on jo täynnä (${BANAANI.maxLevel} banaania)`);
      cur.lv++; cur.upgUntil = now + BANAANI.upgradeMs;
      p.buildReadyAt = now + BANAANI.cooldownMs;
      this.send(p.id, { type: "built", readyIn: BANAANI.cooldownMs, lv: cur.lv });
      return;
    }
    if (x === null || y === null || z === null) return;
    if (Math.hypot(x - p.x, z - p.z) > BANAANI.maxPlaceDist || Math.abs(y - p.y) > 1.2) return fail("liian kaukana");
    if (Math.abs(x) > this.M.x - BANAANI.half || Math.abs(z) > this.M.z - BANAANI.half) return fail("areenan reunalla");
    const sy = this.supportAt(x, z, y + 0.3);
    if (Math.abs(sy - y) > 0.3) return fail("ei tasaista alustaa");
    const sn = { x, y: sy, z };
    const mn = sentryMin(sn), mx = sentryMax(sn);
    const overlaps = (a, b) => a[0] < b[3] - 0.01 && mx[0] > b[0] + 0.01 && mn[1] < b[4] - 0.01 && mx[1] > b[1] + 0.01 && mn[2] < b[5] - 0.01 && mx[2] > b[2] + 0.01;
    for (const b of this.M.boxes) if (overlaps(mn, b)) return fail("tiellä on jotain");
    for (const q of this.players.values()) {
      if (!q.alive) continue;
      const c = dims(q);
      if (overlaps(mn, [q.x - c.radius, q.y, q.z - c.radius, q.x + c.radius, q.y + c.height, q.z + c.radius])) return fail("pelaaja on tiellä");
    }
    const s = {
      id: this.nextSentry++, owner: p.id, x, y: sy, z, yaw, lv: 1, upgUntil: 0,
      hp: BANAANI.hp * 0.33, built: 0, born: now, target: 0, lastFire: 0,
    };
    this.sentries.set(p.id, s);
    p.buildReadyAt = now + BANAANI.cooldownMs;
    this.send(p.id, { type: "built", readyIn: BANAANI.cooldownMs });
  }

  damageSentry(p, sn, amount, at) {
    if (!this.sentries.has(sn.owner) || p.id === sn.owner || sameTeam(p, this.players.get(sn.owner))) return;
    const dmg = Math.min(Math.ceil(sn.hp), amount);
    sn.hp -= dmg;
    const destroyed = sn.hp <= 0;
    this.send(p.id, { type: "hit", target: "s" + sn.id, dmg, kill: destroyed, at });
    if (destroyed) this.destroySentry(sn, p);
  }

  destroySentry(sn, by) {
    this.sentries.delete(sn.owner);
    const owner = this.players.get(sn.owner);
    this.sendAll({ type: "sentryDown", id: sn.id, at: [sn.x, sn.y + 0.4, sn.z].map(r2), by: by?.name, bc: by?.color, owner: owner?.name, oc: owner?.color });
  }

  // Näkeekö banaani kohdan (seinät estävät)
  lineOfSight(a, b) {
    const dv = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], len = Math.hypot(...dv);
    if (len < 1e-6) return true;
    const d = dv.map((v) => v / len);
    for (const bx of this.M.boxes) { const t = rayBox(a, d, [bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]]); if (t !== null && t < len) return false; }
    return true;
  }

  updateSentries(now, dt) {
    for (const s of [...this.sentries.values()]) {
      const owner = this.players.get(s.owner);
      if (!owner) { this.destroySentry(s, null); continue; }
      // Rakentuminen: elämät nousevat, ei ammu
      if (s.built < 1) {
        const before = s.built;
        s.built = Math.min(1, (now - s.born) / BANAANI.buildMs);
        s.hp = Math.min(BANAANI.hp, s.hp + BANAANI.hp * 0.67 * (s.built - before));
        continue;
      }
      if (this.humiliated(owner)) continue; // hävinneen joukkueen banaani ei ammu
      if (now < (s.upgUntil || 0)) continue; // päivitys käynnissä
      const muzzle = [s.x, s.y + BANAANI.muzzleY, s.z];
      // Kohde: pidetään nykyinen jos yhä kelpaa, muuten lähin näkyvä vihollinen 10 m sisällä
      const valid = (q) => {
        if (!q || !q.alive || q.id === s.owner || sameTeam(q, owner)) return false;
        const c = dims(q);
        const chest = [q.x, q.y + c.height * 0.6, q.z];
        if (Math.hypot(chest[0] - muzzle[0], chest[1] - muzzle[1], chest[2] - muzzle[2]) > BANAANI.range) return false;
        return this.lineOfSight(muzzle, chest);
      };
      let target = this.players.get(s.target);
      if (!valid(target)) {
        target = null;
        let bestD = Infinity;
        for (const q of this.players.values()) {
          if (!valid(q)) continue;
          const dd = Math.hypot(q.x - s.x, q.z - s.z);
          if (dd < bestD) { bestD = dd; target = q; }
        }
      }
      const prevTarget = s.target;
      s.target = target ? target.id : 0;
      if (target && target.id !== prevTarget) this.send(target.id, { type: "spotted", id: s.id }); // piippaus kohteelle
      if (!target) continue;

      // Käänny kohti kohdetta rajoitetulla nopeudella
      const c = dims(target);
      const want = Math.atan2(-(target.x - s.x), -(target.z - s.z));
      const diff = angleDiff(s.yaw, want);
      const step = BANAANI.turnSpeed * dt;
      s.yaw += Math.max(-step, Math.min(step, diff));
      if (Math.abs(angleDiff(s.yaw, want)) > BANAANI.aimTolerance) continue;

      // Ammu (useampi laukaus, jos väliä on kertynyt)
      const fireMs = BANAANI.fireMs / (s.lv || 1); // jokainen banaani tuo +5 laukausta sekunnissa
      while (now - s.lastFire >= fireMs) {
        s.lastFire = s.lastFire && now - s.lastFire < fireMs * 3 ? s.lastFire + fireMs : now;
        const aim = [target.x + (Math.random() - 0.5) * 0.2, target.y + c.height * (0.35 + Math.random() * 0.4), target.z + (Math.random() - 0.5) * 0.2];
        this.sendAll({ type: "sshot", id: s.id, e: aim.map(r2) });
        this.applyDamage(owner, target, BANAANI.damage, aim.map(r2), muzzle, "banaani");
        if (!target.alive) { s.target = 0; break; }
      }
    }
  }

  // ====== Tulipatukka ======
  handleThrow(p, msg) {
    if (msg.kind === "rengas") return this.throwTire(p, msg);
    const det = msg.kind === "detektori";
    if (!p.alive || !CLASSES[p.cls].loadout.includes(det ? "detektori" : "patukka")) return;
    const now = Date.now();
    if (det ? now < p.detReadyAt - 300 : now - p.lastThrow < PATUKKA.cooldownMs * 0.8) return;
    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
    let v;
    if (det) {
      p.detReadyAt = now + DETEKTORI.cooldownMs;
      v = [d[0] * DETEKTORI.speed, d[1] * DETEKTORI.speed + DETEKTORI.lift, d[2] * DETEKTORI.speed];
      this.send(p.id, { type: "detThrown", readyIn: DETEKTORI.cooldownMs });
    } else {
      p.lastThrow = now;
      const charge = Math.max(0, Math.min(1, num(msg.c) ?? 0));
      const speed = PATUKKA.speedMin + (PATUKKA.speedMax - PATUKKA.speedMin) * charge;
      v = [d[0] * speed, d[1] * speed + PATUKKA.lift, d[2] * speed];
    }
    const start = [o[0] + d[0] * 0.5, o[1] + d[1] * 0.5 - 0.15, o[2] + d[2] * 0.5];
    const proj = { id: this.nextProj++, owner: p.id, o: start, v, born: now, pos: start.slice(), kind: det ? "det" : "bar" };
    this.projectiles.push(proj);
    this.sendAll({ type: "proj", id: proj.id, owner: p.id, o: start.map(r2), v: v.map(r2), kind: proj.kind });
  }

  // ====== Botit ======
  // Botit täyttävät joukkueet tasan: jos sinisellä on 2 pelaajaa ja punaisella 1, punaiselle tulee botti.
  // Yksin pelatessa vastaan tulee yksi botti. Kun oikea pelaaja liittyy, botti poistuu tilalta.
  balanceBots(now) {
    if (now < (this.botCheckAt || 0)) return;
    const T = this.botTargets; // offline-tila: pelaajien määrä per puoli (sinä mukaan lukien)
    this.botCheckAt = now + (T ? 60 : 1000);
    const all = [...this.players.values()], humans = all.filter((q) => !q.bot);
    if (!humans.length) { for (const b of all) this.removePlayer(b.id); return; }
    const hc = { sininen: 0, punainen: 0 };
    for (const q of humans) if (q.team) hc[q.team]++;
    if (hc.sininen + hc.punainen === 0) return; // pelaajat vasta valitsevat puolta
    const target = Math.max(hc.sininen, hc.punainen, 1);
    for (const team of TEAMS) {
      const bots = all.filter((q) => q.bot && q.team === team);
      const need = T ? Math.max(0, (T[team] || 0) - hc[team]) : Math.min(BOT.maxPerTeam, Math.max(0, target - hc[team]));
      if (bots.length < need && this.players.size < (this.maxPlayers || MAX_PLAYERS)) { this.addBot(team); return; } // yksi kerrallaan
      if (bots.length > need) {
        const out = bots.find((b) => !b.carrying) || bots[0];
        this.removePlayer(out.id);
        return;
      }
    }
  }

  addBot(team) {
    const id = this.nextId++;
    // Joukkueen hahmot jaetaan tasaisesti: botit ottavat ensin hahmot, joita joukkueessa (pelaajat mukaan lukien) ei vielä ole, sitten toinen kierros jne.
    const count = Object.fromEntries(Object.keys(CLASSES).map((k) => [k, 0]));
    for (const q of this.players.values()) if (q.team === team && count[q.cls] !== undefined) count[q.cls]++; // myös oikeat pelaajat: botti ei ota samaa hahmoa kuin sinä
    const least = Math.min(...Object.values(count));
    const pool = Object.keys(count).filter((k) => count[k] === least);
    const cls = pool[Math.floor(Math.random() * pool.length)];
    const bot = {
      id, cls, bot: true,
      name: `${BOT_NAMES[cls] || cls} (botti)`,
      color: "#8a8a8a", team: null, carrying: null,
      x: 0, y: 0, z: 0, yaw: 0, pitch: 0,
      hp: CLASSES[cls].hp, alive: false, kills: 0, deaths: 0, caps: 0, steals: 0,
      lastMove: Date.now(), lastShot: 0, ammo: WEAPON.mag, reloadUntil: 0,
      weapon: 0, lastThrow: 0, knockUntil: 0, knockSpeed: 0, lastMelee: 0, gluedUntil: 0, buildReadyAt: 0,
      detReadyAt: 0, lastSnipe: 0, zoomed: false, zoomAt: 0, leapUntil: 0, leapReadyAt: 0,
      brain: { path: [], goal: null, replanAt: 0, target: 0, seenAt: 0, lastSeen: null, fireAt: 0, senseAt: 0,
               strafe: 1, strafeUntil: 0, stuck: null, role: id % 3 ? "hyökkää" : "puolustaa", roamUntil: 0, hurtBy: 0, hurtAt: 0 },
    };
    this.players.set(id, bot);
    this.handleTeam(bot, team);
  }

  // Näkeekö botti pisteen (silmistä suora viiva ilman laatikoita välissä)
  botSees(eye, to) {
    const d = [to[0] - eye[0], to[1] - eye[1], to[2] - eye[2]], len = Math.hypot(...d);
    if (len < 1e-6) return true;
    const dir = d.map((v) => v / len);
    for (const b of this.M.boxes) {
      if (b[6] === -1) continue; // grillit eivät peitä näkyvyyttä
      const t = rayBox(eye, dir, [b[0], b[1], b[2]], [b[3], b[4], b[5]]);
      if (t !== null && t < len - 0.05) return false;
    }
    return true;
  }

  updateBots(now, dt) {
    for (const b of this.players.values()) if (b.bot) this.botThink(b, now, dt);
  }

  botThink(p, now, dt) {
    const B = p.brain, c = CLASSES[p.cls];
    if (!p.alive || !p.team) { B.path = []; B.target = 0; return; }
    // Mahaplätsin lento: botti liikkuu kaarta pitkin kohteeseen
    if (B.leap) {
      const L = B.leap, t = Math.min(1, (now - L.t0) / L.T), ts = (t * L.T) / 1000;
      p.x = L.x0 + (L.x1 - L.x0) * t; p.z = L.z0 + (L.z1 - L.z0) * t;
      p.y = Math.max(t >= 1 ? L.y1 : 0, L.y0 + L.vy * ts - 0.5 * GRAVITY * ts * ts);
      if (t >= 1) { p.y = L.y1; B.leap = null; }
      p.lastMove = now;
      return;
    }
    // Räjähdys tai törmäys lennättää bottia (painovoima ja maahan laskeutuminen)
    if (B.kn) {
      const v = B.kn;
      v[1] -= GRAVITY * dt;
      const nx = p.x + v[0] * dt, nz = p.z + v[2] * dt;
      if (Math.abs(nx) < this.M.x - 0.5 && this.nav.walkableAt(nx, p.z, p.y, true)) p.x = nx; else v[0] = 0;
      if (Math.abs(nz) < this.M.z - 0.5 && this.nav.walkableAt(p.x, nz, p.y, true)) p.z = nz; else v[2] = 0;
      p.y += v[1] * dt;
      const ground = this.supportAt(p.x, p.z, Math.max(0, p.y) + 0.3);
      if (p.y <= ground && v[1] <= 0) { p.y = ground; B.kn = null; B.path = []; }
      p.lastMove = now;
      return;
    }
    if (p.weapon !== 0 && now >= (B.wBackAt || 0) && !B.snipeStart) p.weapon = 0;
    // Juha asettaa banaanin myös partioidessaan, kun se on valmis
    if (CLASSES[p.cls].loadout.includes("banaani") && !this.humiliated(p) && Math.hypot(p.x - (this.M.bases[p.team].x || 0), p.z - this.M.bases[p.team].z) > 12) this.botBuild(p, now);
    const eye = [p.x, p.y + c.height * 0.9, p.z];
    // --- Havainnot (5 krt/s): lähin näkyvä vihollinen ---
    if (now >= B.senseAt) {
      B.senseAt = now + 200;
      let best = null, bd = BOT.sightRange;
      for (const q of this.players.values()) {
        if (!q.alive || !q.team || q.team === p.team) continue;
        const d = Math.hypot(q.x - p.x, q.z - p.z);
        if (d > bd) continue;
        if (!this.botSees(eye, [q.x, q.y + CLASSES[q.cls].height * 0.6, q.z])) continue;
        best = q; bd = d;
      }
      if (best) {
        if (B.target !== best.id || now - B.seenAt > 1500) B.fireAt = now + BOT.reactionMs * (0.7 + Math.random() * 0.6); // reaktioaika
        B.target = best.id; B.seenAt = now; B.lastSeen = [best.x, best.z, best.y];
      } else if (B.target && now - B.seenAt > 2500) B.target = 0;
      // Joku ampui selkään: käännytään katsomaan sinne päin
      if (!best && B.hurtBy && now - B.hurtAt < 1500) {
        const h = this.players.get(B.hurtBy);
        if (h?.alive) { B.lastSeen = [h.x, h.z, h.y]; B.target = h.id; B.seenAt = now - 1000; }
        B.hurtBy = 0;
      }
    }
    const tq = B.target ? this.players.get(B.target) : null;
    const visible = tq && tq.alive && now - B.seenAt < 300 && !this.humiliated(p); // antautunut botti ei taistele
    // Pyöräsyöksy käynnissä: polje suoraan eteenpäin ja ohjaa kankeasti kohti vihollista
    if (p.chargeUntil > now) {
      if (tq) p.yaw += Math.max(-CHARGE.turnRate * dt, Math.min(CHARGE.turnRate * dt, angleDiff(p.yaw, Math.atan2(-(tq.x - p.x), -(tq.z - p.z)))));
      if (!this.botStep(p, -Math.sin(p.yaw) * CHARGE.speed * dt, -Math.cos(p.yaw) * CHARGE.speed * dt)) p.chargeUntil = 0; // seinä
      B.moving = true; B.path = [];
      p.lastMove = now;
      return;
    }
    const speed = c.speed * (now < p.gluedUntil ? 1 - LIIMA.slow : 1) * BOT.speedFactor;
    let moved = false;
    // Mika-botti hoitaa lähellä olevaa omaa pelaajaa peptiditykillä (ja taistelee vain yksin ollessaan)
    const med = this.humiliated(p) ? null : this.botMedic(p, now, dt, speed, visible);
    if (med) { B.moving = med.moved; p.lastMove = now; return; }

    if (visible) {
      // --- Taistelu: tähtää, ammu ja sivuttaisliiku ---
      const ty = tq.y + CLASSES[tq.cls].height * 0.62;
      const dx = tq.x - p.x, dz = tq.z - p.z, dist = Math.hypot(dx, dz);
      const wantYaw = Math.atan2(-dx, -dz), wantPitch = Math.atan2(ty - eye[1], dist);
      p.yaw += angleDiff(p.yaw, wantYaw) * Math.min(1, dt * BOT.turnRate);
      p.pitch = wantPitch;
      if (p.reloadUntil && now >= p.reloadUntil) { p.ammo = WEAPON.mag; p.reloadUntil = 0; }
      const aimed = Math.abs(angleDiff(p.yaw, wantYaw)) < 0.25;
      const special = this.botWeapons(p, tq, dist, now, eye, wantYaw, aimed);
      if (!special && p.weapon !== 0 && now >= (B.wBackAt || 0)) p.weapon = 0; // takaisin pistooliin
      if (!special && p.weapon === 0 && aimed && now >= B.fireAt && now - p.lastShot >= WEAPON.cooldownMs * BOT.fireSlow * (0.8 + Math.random() * 0.5) && dist < BOT.shootRange) {
        const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15; // likimain normaalijakauma
        const spread = BOT.spread + (B.moving ? BOT.moveSpread : 0) + Math.min(0.03, dist * 0.0006);
        const yaw = wantYaw + g() * spread, pitch = wantPitch + g() * spread * 0.7, cp = Math.cos(pitch);
        this.handleShoot(p, { o: eye, d: [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp], w: "pistooli" });
      }
      // Pidetään sopiva etäisyys ja väistellään sivuttain
      if (now > B.strafeUntil) { B.strafe = Math.random() < 0.5 ? -1 : 1; B.strafeUntil = now + 500 + Math.random() * 1000; }
      const melee = CLASSES[p.cls].loadout.includes("sauva"), sprayer = CLASSES[p.cls].loadout.includes("pesu");
      // Pelin tavoite (resepti kotiin, maassa oleva resepti, keskeltä haku, varastaminen) menee taistelun edelle:
      // botti juoksee reittiä pitkin ja ampuu samalla. Vain lähelle tullutta vihollista taistellaan paikallaan.
      const g = this.botGoal(p, now);
      const objective = g && (g.kind === "koti" || g.kind === "resepti" || g.kind === "torni" || g.kind === "varasta") && (p.carrying || dist > 5 || g.kind === "resepti");
      if (objective) {
        if (B.snipeStart) { B.snipeStart = 0; p.zoomed = false; }
        moved = this.botFollow(p, g, speed, dt, now, g.moving ? 900 : 2500);
      } else if (B.snipeStart) moved = false; // tarkka-ampuja seisoo paikallaan
      else if (dist > BOT.chaseDist) moved = this.botFollow(p, [tq.x, tq.z], speed, dt, now, 800);
      else {
        const fx = dx / (dist || 1), fz = dz / (dist || 1);
        // Olavi rynnii lähelle sauvan kanssa, Daniel pesunestepyssyn kantamalle
        // Juha lähestyy, kun mahaplätsi on valmis
        const leaper = CLASSES[p.cls].loadout.includes("platsi") && now >= p.leapReadyAt && dist < 16;
        const fwd = melee ? (dist > 1.6 ? 1.2 : 0) : sprayer && dist > 6 ? 0.9 : leaper && dist > 3.5 ? 1 : dist > 14 ? 0.5 : dist < 6 ? -0.6 : 0;
        let mx = -fz * B.strafe + fx * fwd, mz = fx * B.strafe + fz * fwd;
        const ml = Math.hypot(mx, mz) || 1;
        moved = this.botStep(p, (mx / ml) * speed * dt, (mz / ml) * speed * dt);
        if (!moved) { B.strafe *= -1; B.strafeUntil = now + 600; }
        B.path = [];
      }
    } else {
      if (B.snipeStart) { B.snipeStart = 0; p.zoomed = false; }
      // --- Tavoite: resepti, kantaja, pihvi tai partiointi ---
      const goal = this.botGoal(p, now);
      moved = goal ? this.botFollow(p, goal, speed, dt, now, goal.moving ? 900 : 4000) : false;
      // Katse kulkusuuntaan
      if (B.path.length) {
        const [nx, nz] = B.path[0];
        p.yaw += angleDiff(p.yaw, Math.atan2(-(nx - p.x), -(nz - p.z))) * Math.min(1, dt * 6);
      }
      p.pitch *= 0.9;
    }
    B.moving = moved;
    // Jumissa? Valitaan uusi suunta
    if (!B.stuck || now - B.stuck.t > 1500) {
      if (B.stuck && B.path.length && Math.hypot(p.x - B.stuck.x, p.z - B.stuck.z) < 0.3) { B.path = []; B.goal = null; B.roamUntil = 0; B.replanAt = 0; }
      B.stuck = { x: p.x, z: p.z, t: now };
    }
    p.lastMove = now;
  }

  // Mika-botti on ennen kaikkea hoitaja: se hoitaa ja seuraa omia pelaajia (oikeita pelaajia ensin, eniten vahinkoa ottaneita ensin).
  // Kun joku huutaa APUA (E), se menee tämän luo ensimmäisenä. Taisteluun se ryhtyy vain, jos lähellä ei ole ketään hoidettavaa.
  // Kun mittari on täynnä ja vihollinen näkyy, botti laukaisee "Steroidia suoneen".
  botMedic(p, now, dt, speed, enemyVisible) {
    const L = CLASSES[p.cls].loadout;
    if (!L.includes("pepti")) return null;
    const B = p.brain;
    const ok = (r) => r && r !== p && r.alive && sameTeam(p, r) && !CLASSES[r.cls].loadout.includes("pepti"); // ei toisia Mikoja (eivät jää hoitamaan toisiaan)
    let q = null;
    if (B.helpUntil > now) { // APUA-huuto ensin, kunnes huutaja on ladattu täyteen
      const h = this.players.get(B.helpFrom);
      if (ok(h) && !(h.hp >= CLASSES[h.cls].hp * 1.45 && now - B.helpAt > 2500)) q = h; else B.helpUntil = 0;
    }
    if (!q && p.mediT) { const r = this.players.get(p.mediT); if (ok(r) && this.mediOk(p, r)) q = r; } // pysytään nykyisessä
    if (!q) {
      let best = Infinity;
      for (const r of this.players.values()) {
        if (!ok(r)) continue;
        const d = Math.hypot(r.x - p.x, r.z - p.z);
        if (d > 30) continue;
        const score = r.hp / CLASSES[r.cls].hp + (r.bot ? 0.25 : 0) + d * 0.02;
        if (score < best) { best = score; q = r; }
      }
    }
    if (!q) { if (L[p.weapon] === "pepti") { p.mediOn = false; p.mediT = 0; } return null; }
    p.weapon = L.indexOf("pepti"); B.wBackAt = now + 800;
    p.mediOn = true;
    const inRange = this.mediOk(p, q);
    p.mediT = inRange ? q.id : 0;
    const dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
    p.yaw += angleDiff(p.yaw, Math.atan2(-dx, -dz)) * Math.min(1, dt * 8);
    p.pitch = Math.atan2(q.y + CLASSES[q.cls].height * 0.6 - (p.y + CLASSES[p.cls].height * 0.9), d || 1);
    if (inRange && (p.uber || 0) >= 100 && enemyVisible) this.handleUber(p);
    let moved = false;
    if (d > 4.5 || !inRange) moved = this.botFollow(p, [q.x, q.z, q.y], speed, dt, now, 600);
    else B.path = [];
    return { moved };
  }

  // Mihin botti on menossa, kun vihollista ei näy
  botGoal(p, now) {
    const B = p.brain, enemy = p.team === "sininen" ? "punainen" : "sininen";
    const home = this.M.bases[p.team], away = this.M.bases[enemy];
    const mid = (z1, z2) => [Math.min(z1, z2), Math.max(z1, z2)];
    if (p.carrying || this.humiliated(p)) return Object.assign([home.x || 0, home.z, home.y || 0], { kind: "koti" }); // antautunut pakenee kotiin               // vie resepti kotiin
    const c = CLASSES[p.cls];
    if (p.hp < c.hp * 0.45) { // pihville, jos elämät ovat vähissä
      let best = null, bd = Infinity;
      this.M.grills.forEach(([gx, gz, gy], i) => { if (now >= this.steakAt[i]) { const d = Math.hypot(gx - p.x, gz - p.z); if (d < bd) { bd = d; best = [gx, gz, gy || 0]; } } });
      if (best && bd < 45) return Object.assign(best, { kind: "grilli" });
    }
    // Pelin tavoitteet ensin: vihollisen kantaja kiinni, maassa oleva resepti, keskeltä haku ja varastaminen
    const carrier = this.recipes.map((r) => r.st === "carried" && this.players.get(r.carrier)).find((q) => q && q.team !== p.team);
    const dc = carrier ? Math.hypot(carrier.x - p.x, carrier.z - p.z) : Infinity;
    if (carrier && (B.role === "puolustaa" || dc < 35)) return Object.assign([carrier.x, carrier.z, carrier.y], { kind: "kantaja", moving: true });
    const dropped = this.recipes.filter((r) => r.st === "dropped" && r.y < 1);
    if (dropped.length) { const r = dropped.sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; if (B.role === "hyökkää" || Math.hypot(r.x - p.x, r.z - p.z) < 40) return Object.assign([r.x, r.z, r.y], { kind: "resepti" }); }
    const tw = this.recipes.find((r) => r.st === "tower"); // resepti keskellä: hyökkääjät hakevat (ja puolustajat, jos se on lähellä)
    if (tw && (B.role === "hyökkää" || Math.hypot(tw.x - p.x, tw.z - p.z) < 25)) return Object.assign([tw.x, tw.z, tw.y], { kind: "torni" });
    if (B.role === "hyökkää" && this.score[enemy] > 0) return Object.assign([away.x || 0, away.z, away.y || 0], { kind: "varasta" });
    if (carrier) return Object.assign([carrier.x, carrier.z, carrier.y], { kind: "kantaja", moving: true });
    if (B.target && B.lastSeen) return Object.assign(B.lastSeen.slice(), { kind: "jäljitä", moving: true }); // viimeksi nähty vihollinen
    // Partiointi: hyökkääjä vastustajan puolella ja keskellä, puolustaja oman puolen keskivaiheilla
    if (!B.goal || now > B.roamUntil || Math.hypot(B.goal[0] - p.x, B.goal[1] - p.z) < 1.5 || B.goal.kind !== "partio") {
      const s = Math.sign(home.z);
      const Z = this.M.z;
      const [z1, z2] = B.role === "hyökkää" ? mid(-s * Z * 0.67, s * Z * 0.08) : mid(s * Z * 0.16, s * Z * 0.77);
      B.goal = Object.assign(this.nav.randomPoint(z1, z2, this.M.x - 3), { kind: "partio" });
      B.roamUntil = now + 8000 + Math.random() * 8000;
    }
    return B.goal;
  }

  // Kuljetaan reittiä pitkin kohti pistettä. replanMs = kuinka usein reitti lasketaan uudelleen.
  botFollow(p, goal, speed, dt, now, replanMs) {
    const B = p.brain;
    const goalMoved = !B.pathGoal || Math.hypot(B.pathGoal[0] - goal[0], B.pathGoal[1] - goal[1]) > 1.5;
    if (now >= B.replanAt && (goalMoved || !B.path.length) || (goalMoved && !goal.moving)) {
      B.path = this.nav.findPath(p.x, p.y, p.z, goal[0], goal[2] ?? p.y, goal[1]) || [];
      B.pathGoal = [goal[0], goal[1]];
      B.replanAt = now + replanMs;
    }
    // Viimeiset metrit suoraan kohteeseen (esim. grilli tai reseptin luo)
    if (!B.path.length) {
      const d = Math.hypot(goal[0] - p.x, goal[1] - p.z);
      if (d > 0.2 && d < 2.2) return this.botStep(p, ((goal[0] - p.x) / d) * Math.min(speed * dt, d), ((goal[1] - p.z) / d) * Math.min(speed * dt, d), true);
      return false;
    }
    const [nx, nz, nh] = B.path[0], dx = nx - p.x, dz = nz - p.z, d = Math.hypot(dx, dz);
    // Tikkaat: seuraava piste on selvästi ylempänä ja botti on tikkaiden juurella -> kiivetään
    if (nh !== undefined && nh > p.y + 0.05) {
      const L = this.nav.ladderNear?.(p.x, p.y, p.z);
      // Kiivetään, jos seuraava piste on selvästi ylempänä, tai jatketaan jo aloitettua kiipeämistä huipulle asti
      if (L && (nh > p.y + 0.6 || p.y > L.y0 + 0.3)) { p.y = Math.min(L.y1 + 0.05, p.y + 3 * dt); if (p.y < nh - 0.05) return true; }
    }
    // Tikkaiden yläpäässä: astutaan tikkaiden takana olevalle tasolle (botti voi roikkua hieman irti seinästä)
    if (nh !== undefined && Math.abs(nh - p.y) < 0.2) {
      const L = this.nav.ladderNear?.(p.x, p.y, p.z);
      if (L && Math.abs(p.y - L.y1) < 0.2 && this.supportAt(p.x, p.z, p.y + 0.2) < p.y - 0.6) {
        const x = p.x + L.nx * 0.9, z = p.z + L.nz * 0.9;
        if (this.supportAt(x, z, L.y1 + 0.2) >= L.y1 - 0.05) { p.x = x; p.z = z; p.y = L.y1; return true; }
      }
    }
    // Perillä: vaakasuunnassa lähellä ja oikealla korkeudella (tai aivan pisteen päällä)
    if (d < 0.12 || (d < 0.35 && (nh === undefined || Math.abs(p.y - nh) < 0.45))) { B.path.shift(); return true; }
    const step = Math.min(speed * dt, d);
    return this.botStep(p, (dx / d) * step, (dz / d) * step, true, nh !== undefined && nh < p.y - 0.6); // pudotus vain jos reitti menee alas
  }

  // Yksi liikeaskel. Seinän läpi ei mennä (paitsi viimeiset sentit kohteeseen).
  // Yksi liikeaskel. Botti ei kävele laatikoiden läpi eikä putoa reunalta, ellei reitti
  // nimenomaan vie alas (allowDrop). Jos suora askel osuu esteeseen, yritetään liukua akselin suuntaisesti.
  botStep(p, mx, mz, force = false, allowDrop = false) {
    const tryMove = (x, z) => {
      if (Math.abs(x) > this.M.x - 0.4 || Math.abs(z) > this.M.z - 0.4) return false;
      if (!force && !this.nav.walkableAt(x, z, p.y)) return false;
      if (this.botBlocked(x, z, p.y) && !this.botBlocked(p.x, p.z, p.y)) return false; // jo kiinni seinässä: pääsee irti
      const sup = this.supportAt(x, z, p.y + 0.62); // askelmat ja pienet korokkeet (sama 0,6 m kuin reitinhaussa)
      if (sup < p.y - 0.6 && !allowDrop) return false;  // reunalta ei pudota vahingossa
      p.x = x; p.z = z; p.y = sup;
      return true;
    };
    return tryMove(p.x + mx, p.z + mz) || (force && (tryMove(p.x + mx, p.z) || tryMove(p.x, p.z + mz)));
  }

  // Onko kohdassa este botin vartalon korkeudella (seinä, kaide, korkea laatikko)
  botBlocked(x, z, y) {
    const r = 0.15; // keskikohdan tarkistus (reitinhaku pitää botin jo väljässä tilassa)
    for (const b of this.M.boxes) if (x + r > b[0] && x - r < b[3] && z + r > b[2] && z - r < b[5] && b[1] < y + 1.7 && b[4] > y + 0.62) return true; // 0,6 m askel kuten reitinhaussa
    return false;
  }

  // ====== Bottien erikoisaseet ======
  // Palauttaa true, jos botti käytti tällä hetkellä erikoisasetta (silloin pistoolilla ei ammuta).
  botWeapons(p, tq, dist, now, eye, wantYaw, aimed) {
    const B = p.brain, L = CLASSES[p.cls].loadout, has = (w) => L.includes(w);
    const hold = (w, ms = 900) => { p.weapon = L.indexOf(w); B.wBackAt = now + ms; };
    const g = () => (Math.random() + Math.random() + Math.random() - 1.5) * 1.15;
    const ready = aimed && now >= B.fireAt;
    const ty = tq.y + CLASSES[tq.cls].height * 0.62;
    // Tarkkuuskivääri kaukaa: pysähdy, tähtää ja ammu pääosuma (Jarmo)
    if (has("kivaari") && dist > 14 && dist < 60) {
      if (!B.snipeStart) { B.snipeStart = now; p.zoomed = true; p.zoomAt = now; B.snipeAt = now + 1100 + Math.random() * 1200; }
      hold("kivaari", 1500);
      if (ready && now >= B.snipeAt && now - p.lastSnipe >= KIVAARI.cooldownMs) {
        const hy = tq.y + CLASSES[tq.cls].head[0], s = BOT.spread * 0.55;
        const yaw = wantYaw + g() * s, pitch = Math.atan2(hy - eye[1], dist) + g() * s * 0.6, cp = Math.cos(pitch);
        this.handleShoot(p, { o: eye, d: [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp], w: "kivaari" });
        B.snipeAt = now + KIVAARI.cooldownMs + 800 + Math.random() * 1200;
      }
      return true;
    }
    if (B.snipeStart) { B.snipeStart = 0; p.zoomed = false; }
    // Lähitaistelu: puikkoliima (Jarmo) ja suksisauva (Olavi)
    for (const w of ["liima", "sauva"]) {
      if (!has(w) || dist > 2.3) continue;
      hold(w);
      const W = w === "liima" ? LIIMA : SAUVA;
      if (ready && now - p.lastMelee >= W.cooldownMs * 1.1) {
        const pitch = Math.atan2(ty - eye[1], dist), cp = Math.cos(pitch);
        this.handleMelee(p, { w, o: eye, d: [-Math.sin(wantYaw) * cp, Math.sin(pitch), -Math.cos(wantYaw) * cp] });
      }
      return true;
    }
    // Lasinpesunestepyssy lähelle (Daniel)
    if (has("kortit") && dist < 16) { // Mika: korttipakka (kortit sinkoilevat hajonnan mukaan)
      hold("kortit", 500);
      if (ready && now - (p.lastCard || 0) >= KORTIT.fireMs) {
        const t = dist / (KORTIT.speed * 0.8);
        const s = KORTIT.spread * Math.sqrt(Math.random()), a = Math.random() * Math.PI * 2;
        const pitch = Math.atan2(ty - eye[1] + 0.5 * KORTIT.gravity * t * t, dist) + Math.sin(a) * s, yaw = wantYaw + Math.cos(a) * s, cp = Math.cos(pitch);
        this.handleCard(p, { o: eye, d: [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp], c: (Math.random() < 0.5 ? -1 : 1) * 0.3 * KORTIT.curve });
      }
      return true;
    }
    if (has("pesu") && dist < 7.5) {
      hold("pesu", 500);
      if (ready && now - (p.lastSpray || 0) >= PESU.fireMs) {
        const t = dist / PESU.speed; // nostetaan suihkua sen verran kuin neste putoaa matkalla
        const pitch = Math.atan2(ty - eye[1] + 0.5 * PESU.gravity * t * t, dist) + g() * 0.04, yaw = wantYaw + g() * 0.05, cp = Math.cos(pitch);
        this.handleSpray(p, { o: eye, d: [-Math.sin(yaw) * cp, Math.sin(pitch), -Math.cos(yaw) * cp] });
      }
      return true;
    }
    // Heitot: Tulipatukka (Jari) ja autonrengas (Daniel)
    const throwW = has("patukka") ? ["patukka", PATUKKA, 5, 22, p.lastThrow] : has("rengas") ? ["rengas", RENGAS, 3.5, 18, p.lastTire || 0] : null;
    if (throwW && ready && dist > throwW[2] && dist < throwW[3] && now - throwW[4] >= throwW[1].cooldownMs * 1.4 && Math.random() < 0.08) {
      const [w, C] = throwW, aimY = w === "patukka" ? tq.y + 0.3 : ty;
      const sol = solveThrow(C, eye[1] - 0.15, aimY, dist - 0.5);
      if (sol) {
        const yaw = wantYaw + g() * 0.04, cp = Math.cos(sol.pitch);
        this.handleThrow(p, { kind: w === "rengas" ? "rengas" : undefined, o: eye, d: [-Math.sin(yaw) * cp, Math.sin(sol.pitch), -Math.cos(yaw) * cp], c: sol.c });
        hold(w, 700);
        return true;
      }
    }
    // Pyöräsyöksy kohti vihollista (Olavi)
    if (has("pyora") && ready && dist > 4 && dist < 16 && now >= (p.chargeReadyAt || 0) && Math.abs(tq.y - p.y) < 1 && Math.random() < 0.06) {
      p.yaw = wantYaw;
      this.handleCharge(p);
      hold("pyora", CHARGE.durMs + 300);
      return true;
    }
    // Mahaplätsi lähellä olevan vihollisen päälle (Juha)
    if (has("platsi") && ready && dist > 1.5 && dist < PLATSI.maxDist && now >= p.leapReadyAt && Math.abs(tq.y - p.y) < 1 && Math.random() < 0.1) {
      const tx = tq.x, tz = tq.z, ty2 = this.supportAt(tx, tz, tq.y + 0.3);
      const plan = leapPlan(p.y, ty2, Math.hypot(tx - p.x, tz - p.z));
      this.handleLeap(p, { x: tx, y: ty2, z: tz });
      if (p.leapUntil > now) { B.leap = { x0: p.x, y0: p.y, z0: p.z, x1: tx, y1: ty2, z1: tz, t0: now, T: plan.T * 1000, vy: plan.vy }; hold("platsi", plan.T * 1000 + 300); }
      return true;
    }
    // Banaaniserveri taistelun lähellä, jos sitä ei vielä ole (Juha)
    if (has("banaani") && dist < 14) this.botBuild(p, now);
    return false;
  }

  // Juha asettaa banaanin eteensä (kokeillaan muutamaa kohtaa)
  botBuild(p, now) {
    const B = p.brain;
    if (now < p.buildReadyAt || now < (B.buildTryAt || 0)) return;
    const cur = this.sentries.get(p.id);
    if (cur) { if (cur.lv < BANAANI.maxLevel && cur.built >= 1) this.handleBuild(p, {}); return; } // päivitetään terttua
    B.buildTryAt = now + 2000;
    for (const a of [0, 0.6, -0.6, 1.3, -1.3, Math.PI]) {
      const yaw = p.yaw + a, x = p.x - Math.sin(yaw) * 1.6, z = p.z - Math.cos(yaw) * 1.6;
      this.handleBuild(p, { x, y: p.y, z, yaw: p.yaw });
      if (this.sentries.has(p.id)) { p.weapon = CLASSES[p.cls].loadout.indexOf("banaani"); B.wBackAt = now + 700; return; }
    }
  }

  // ====== Danielin lasinpesunestepyssy ======
  // Pelaaja lähettää jokaisesta pisarasta oman viestin (10 krt/s). Pisara lentää kaarena noin 8 m.
  handleSpray(p, msg) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("pesu")) return;
    const now = Date.now();
    if (now - (p.lastSpray || 0) < PESU.fireMs * 0.7) return;
    this.refillTank(p, now);
    if (p.tank < 1) return;
    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
    p.tank -= 1;
    p.lastSpray = now;
    const start = [o[0] + d[0] * 0.4, o[1] + d[1] * 0.4 - 0.12, o[2] + d[2] * 0.4].map(r2);
    const v = d.map((w) => r2(w * PESU.speed));
    const drop = { id: this.nextProj++, owner: p.id, o: start, v, born: now, pos: start.slice(), t: 0 };
    this.drops.push(drop);
    this.sendAll({ type: "spray", id: drop.id, owner: p.id, o: start, v }, p.id); // ampuja piirtää omat pisaransa heti itse
  }

  // ====== Mikan korttipakka ======
  // Selain arpoo hajonnan ja kaartumisen (c) ja lähettää jokaisesta kortista oman viestin
  handleCard(p, msg) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("kortit")) return;
    const now = Date.now();
    if (now - (p.lastCard || 0) < KORTIT.fireMs * 0.7) return;
    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
    const c = Math.max(-KORTIT.curve, Math.min(KORTIT.curve, num(msg.c) || 0));
    p.lastCard = now;
    const start = [o[0] + d[0] * 0.4, o[1] + d[1] * 0.4 - 0.1, o[2] + d[2] * 0.4].map(r2);
    const v = d.map((w) => r2(w * KORTIT.speed));
    const cd = { id: this.nextProj++, owner: p.id, o: start, v, A: cardAccel(v, c), born: now, pos: start.slice(), t: 0 };
    this.cards.push(cd);
    this.sendAll({ type: "card", id: cd.id, owner: p.id, o: start, v, c: r2(c) }, p.id); // heittäjä piirtää omat korttinsa heti itse
  }

  updateCards(now) {
    for (let i = this.cards.length - 1; i >= 0; i--) {
      const cd = this.cards[i];
      const owner = this.players.get(cd.owner);
      const tEnd = Math.min((now - cd.born) / 1000, KORTIT.lifeMs / 1000);
      let end = false;
      for (let t = cd.t; t < tEnd && !end; t = Math.min(tEnd, t + 1 / 60)) {
        const t2 = Math.min(tEnd, t + 1 / 60);
        const a = cd.pos, b = cardPos(cd, t2);
        const seg = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], segLen = Math.hypot(...seg);
        if (segLen > 1e-6) {
          const dir = seg.map((v) => v / segLen);
          let hit = null, what = null;
          const test = (min, max, w) => { const h = rayBox(a, dir, min, max); if (h !== null && h <= segLen && (hit === null || h < hit)) { hit = h; what = w; } };
          for (const bx of this.M.boxes) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]], "box");
          for (const bx of this.M.outer) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]], "box");
          if (dir[1] < 0 && a[1] + dir[1] * segLen <= 0) { const h = Math.max(0, -a[1] / dir[1]); if (hit === null || h < hit) { hit = h; what = "box"; } }
          for (const q of this.players.values()) {
            if (!q.alive || q.id === cd.owner || sameTeam(q, owner)) continue;
            const c = dims(q);
            test([q.x - c.radius - KORTIT.r, q.y, q.z - c.radius - KORTIT.r], [q.x + c.radius + KORTIT.r, q.y + c.height, q.z + c.radius + KORTIT.r], q);
          }
          for (const sn of this.sentries.values()) if (owner && sn.owner !== owner.id && !sameTeam(owner, this.players.get(sn.owner))) test(sentryMin(sn), sentryMax(sn), sn);
          if (hit !== null) {
            end = true;
            const at = a.map((v, k) => v + dir[k] * hit);
            const far = Math.hypot(at[0] - cd.o[0], at[1] - cd.o[1], at[2] - cd.o[2]);
            const f = Math.max(0, Math.min(1, (far - KORTIT.nearDist) / (KORTIT.farDist - KORTIT.nearDist)));
            const dmg = Math.max(1, Math.round(rand(...KORTIT.dmgNear) + (rand(...KORTIT.dmgFar) - rand(...KORTIT.dmgNear)) * f));
            if (what && what.cls && owner) { this.applyDamage(owner, what, dmg, at.map(r2), cd.o, "kortit"); this.sendAll({ type: "cardEnd", id: cd.id }); }
            else if (what && what.hp !== undefined && !what.cls && owner) { this.damageSentry(owner, what, dmg, at.map(r2)); this.sendAll({ type: "cardEnd", id: cd.id }); }
          }
        }
        cd.pos = b; cd.t = t2;
      }
      if (end || cd.t >= KORTIT.lifeMs / 1000 - 1e-6) this.cards.splice(i, 1);
    }
  }

  // ====== Mikan peptiditykki ======
  // Selain kertoo, pitääkö Mika hiirtä pohjassa (on) ja kenet ruisku osui (t). Palvelin tarkistaa yhteyden joka tikillä.
  handleMedi(p, msg) {
    p.mediOn = !!msg.on && p.alive && CLASSES[p.cls].loadout[p.weapon] === "pepti";
    if (!p.mediOn) { p.mediT = 0; return; }
    const t = num(msg.t);
    if (!t || t === p.mediT) return;
    const q = this.players.get(t);
    if (!this.mediOk(p, q)) return;
    // Ruisku pitää ampua suunnilleen kohti kohdetta
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z], to = [q.x - eye[0], q.y + CLASSES[q.cls].height * 0.6 - eye[1], q.z - eye[2]];
    const L = Math.hypot(...to) || 1, cp = Math.cos(p.pitch), aim = [-Math.sin(p.yaw) * cp, Math.sin(p.pitch), -Math.cos(p.yaw) * cp];
    const ang = Math.acos(Math.max(-1, Math.min(1, (aim[0] * to[0] + aim[1] * to[1] + aim[2] * to[2]) / L)));
    if (ang > PEPTI.lockCone + Math.atan(0.6 / L)) return;
    p.mediT = q.id;
  }
  humiliated(p) { return !!this.winner && !!p.team && p.team !== this.winner; }
  mediOk(p, q) {
    if (!q || !q.alive || q === p || !sameTeam(p, q)) return false;
    const a = [p.x, p.y + CLASSES[p.cls].height * 0.75, p.z], b = [q.x, q.y + CLASSES[q.cls].height * 0.6, q.z];
    if (Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) > PEPTI.range) return false;
    return this.botSees(a, b);
  }
  // Oikea hiiri: "Steroidia suoneen" (kuten ÜberCharge), kun mittari on täynnä
  handleUber(p) {
    const now = Date.now();
    if (!p.alive || CLASSES[p.cls].loadout[p.weapon] !== "pepti" || (p.uber || 0) < 100 || now < (p.uberUntil || 0)) return;
    p.uberUntil = now + PEPTI.uberMs;
    this.sendAll({ type: "uber", id: p.id });
  }
  updateMedi(now, dt) {
    for (const p of this.players.values()) {
      if (!CLASSES[p.cls]?.loadout.includes("pepti")) continue;
      if (!p.alive) { p.mediT = 0; p.mediOn = false; p.uber = 0; p.uberUntil = 0; continue; }
      const holding = CLASSES[p.cls].loadout[p.weapon] === "pepti";
      let q = p.mediT ? this.players.get(p.mediT) : null;
      if (q && !(holding && p.mediOn && now >= (p.tauntUntil || 0) && !this.humiliated(p) && this.mediOk(p, q))) { q = null; p.mediT = 0; }
      if (this.humiliated(p)) { p.uberUntil = 0; p.mediOn = false; }
      if (!holding) p.mediOn = false;
      const deployed = now < (p.uberUntil || 0);
      if (deployed) {
        p.uber = Math.max(0, (100 * (p.uberUntil - now)) / PEPTI.uberMs);
        if (holding) { p.invulnUntil = now + 150; if (q) q.invulnUntil = now + 150; } // aseen vaihto katkaisee suojan
      } else if (p.uberUntil) { p.uberUntil = 0; p.uber = 0; }
      if (!q) continue;
      const max = CLASSES[q.cls].hp, cap = Math.floor(max * PEPTI.overheal);
      if (q.hp < cap) {
        q.healAcc = (q.healAcc || 0) + PEPTI.heal * dt;
        const n = Math.floor(q.healAcc);
        if (n) { q.healAcc -= n; q.hp = Math.min(cap, q.hp + n); }
      }
      q.healedAt = now;
      if (!deployed) p.uber = Math.min(100, (p.uber || 0) + (q.hp >= max * 1.425 ? PEPTI.uberOverRate : PEPTI.uberRate) * dt);
    }
    // Ylimääräiset elämät valuvat hitaasti pois, kun kukaan ei hoida
    for (const q of this.players.values()) {
      if (!q.alive) continue;
      const max = CLASSES[q.cls].hp;
      if (q.hp > max && now - (q.healedAt || 0) > 300) {
        q.decayAcc = (q.decayAcc || 0) + (max * (PEPTI.overheal - 1) / PEPTI.decaySec) * dt;
        const n = Math.floor(q.decayAcc);
        if (n) { q.decayAcc -= n; q.hp = Math.max(max, q.hp - n); }
      }
    }
  }

  // Säiliö täyttyy itsestään, kun ei suihkuteta
  refillTank(p, now) {
    if (p.tank === undefined) { p.tank = PESU.tank; p.tankAt = now; }
    const from = Math.max(p.tankAt, (p.lastSpray || 0) + PESU.refillDelayMs);
    if (now > from) p.tank = Math.min(PESU.tank, p.tank + ((now - from) / 1000) * PESU.refillPerSec);
    p.tankAt = now;
  }

  updateDrops(now) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const dr = this.drops[i];
      const owner = this.players.get(dr.owner);
      const tEnd = Math.min((now - dr.born) / 1000, PESU.lifeMs / 1000);
      let end = null, puddle = null;
      for (let t = dr.t; t < tEnd && !end; t = Math.min(tEnd, t + 1 / 60)) {
        const t2 = Math.min(tEnd, t + 1 / 60);
        const a = dr.pos, b = [dr.o[0] + dr.v[0] * t2, dr.o[1] + dr.v[1] * t2 - 0.5 * PESU.gravity * t2 * t2, dr.o[2] + dr.v[2] * t2];
        const seg = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], segLen = Math.hypot(...seg);
        if (segLen > 1e-6) {
          const dir = seg.map((v) => v / segLen);
          let hit = null, what = null;
          const test = (min, max, w) => { const h = rayBox(a, dir, min, max); if (h !== null && h <= segLen && (hit === null || h < hit)) { hit = h; what = w; } };
          for (const bx of this.M.boxes) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]], bx);
          for (const bx of this.M.outer) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]], "wall");
          if (dir[1] < 0 && a[1] + dir[1] * segLen <= 0) { const h = Math.max(0, -a[1] / dir[1]); if (hit === null || h < hit) { hit = h; what = "ground"; } }
          for (const q of this.players.values()) {
            if (!q.alive || q.id === dr.owner || sameTeam(q, owner)) continue;
            const c = dims(q);
            test([q.x - c.radius - PESU.r, q.y, q.z - c.radius - PESU.r], [q.x + c.radius + PESU.r, q.y + c.height, q.z + c.radius + PESU.r], q);
          }
          for (const sn of this.sentries.values()) if (owner && sn.owner !== owner.id && !sameTeam(owner, this.players.get(sn.owner))) test(sentryMin(sn), sentryMax(sn), sn);
          if (hit !== null) {
            end = a.map((v, k) => v + dir[k] * hit);
            if (what === "ground") puddle = [end[0], 0, end[2]];
            else if (Array.isArray(what) && Math.abs(end[1] - what[4]) < 0.05) puddle = [end[0], what[4], end[2]]; // laatikon päälle
            else if (what && what.cls && owner) this.applyDamage(owner, what, PESU.damage, end.map(r2), dr.o, "pesu");
            else if (what && what.owner !== undefined && what.hp !== undefined && owner && !what.cls) this.damageSentry(owner, what, PESU.damage, end.map(r2));
          }
        }
        dr.pos = b; dr.t = t2;
      }
      if (end || dr.t >= PESU.lifeMs / 1000 - 1e-6) {
        this.drops.splice(i, 1);
        if (puddle) this.addPuddle(puddle, now);
      }
    }
    this.puddles = this.puddles.filter((pd) => pd.until > now);
  }

  // Sininen lätäkkö maahan. Lähekkäiset pisarat yhdistetään samaan lätäkköön.
  addPuddle([x, y, z], now) {
    const near = this.puddles.find((pd) => Math.abs(pd.y - y) < 0.2 && Math.hypot(pd.x - x, pd.z - z) < PESU.puddleR * 0.8);
    if (near) { near.until = now + PESU.puddleMs; near.r = Math.min(PESU.puddleR * 1.6, near.r + 0.03); return; }
    if (this.puddles.length >= PESU.maxPuddles) this.puddles.sort((a, b) => a.until - b.until).shift();
    this.puddles.push({ id: this.nextPuddle++, x: r2(x), y: r2(y), z: r2(z), r: PESU.puddleR, until: now + PESU.puddleMs });
  }

  // ====== Olavin pyöräsyöksy ======
  // Kuten TF2:n Demomanin rynnäkkö: Olavi polkee hetken todella lujaa eteenpäin, kääntyminen on kankeaa.
  // Ensimmäinen vastustaja, johon hän törmää, ottaa 65 vahinkoa ja lentää kauas. Syöksy päättyy törmäykseen.
  handleCharge(p) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("pyora")) return;
    const now = Date.now();
    if (now < (p.chargeReadyAt || 0) - 300) return;
    p.chargeUntil = now + CHARGE.durMs;
    p.chargeReadyAt = now + CHARGE.cooldownMs;
    this.sendAll({ type: "bell", id: p.id, at: [p.x, p.y + 1, p.z].map(r2) }, p.id);
  }

  updateCharges(now) {
    for (const p of this.players.values()) {
      if (!p.chargeUntil || now > p.chargeUntil) continue;
      if (!p.alive) { p.chargeUntil = 0; continue; }
      const cp = dims(p), fx = -Math.sin(p.yaw), fz = -Math.cos(p.yaw);
      for (const q of this.players.values()) {
        if (q === p || !q.alive || sameTeam(p, q)) continue;
        const cq = dims(q), dx = q.x - p.x, dz = q.z - p.z, d = Math.hypot(dx, dz);
        if (d > cp.radius + cq.radius + CHARGE.hitRange || Math.abs(q.y - p.y) > 1.6) continue;
        // Törmäys: lennätys syöksyn suuntaan ja vähän sivuun osumakohdasta
        let kx = fx * 0.6 + (d > 0.01 ? dx / d : fx) * 0.4, kz = fz * 0.6 + (d > 0.01 ? dz / d : fz) * 0.4;
        const kl = Math.hypot(kx, kz) || 1; kx /= kl; kz /= kl;
        const kv = [kx * CHARGE.knock, CHARGE.knockUp, kz * CHARGE.knock];
        q.knockUntil = now + 2500;
        q.knockSpeed = CHARGE.knock;
        this.applyDamage(p, q, CHARGE.damage, [q.x, q.y + cq.height * 0.6, q.z].map(r2), [p.x, p.y + 1, p.z], "pyora");
        if (q.alive) this.send(q.id, { type: "knock", v: kv.map(r2) });
        p.chargeUntil = 0;
        this.send(p.id, { type: "chargeEnd", hit: 1 });
        this.sendAll({ type: "crash", at: [q.x, q.y + 1, q.z].map(r2) });
        break;
      }
    }
  }

  // ====== Danielin autonrengas ======
  throwTire(p, msg) {
    if (!p.alive || !CLASSES[p.cls].loadout.includes("rengas")) return;
    const now = Date.now();
    if (now - (p.lastTire || 0) < RENGAS.cooldownMs * 0.8) return;
    let o = vec(msg.o), d = vec(msg.d);
    if (!d) return;
    const len = Math.hypot(d[0], d[1], d[2]);
    if (len < 1e-6) return;
    d = d.map((v) => v / len);
    const eye = [p.x, p.y + CLASSES[p.cls].height * 0.9, p.z];
    if (!o || Math.hypot(o[0] - eye[0], o[1] - eye[1], o[2] - eye[2]) > 1.5) o = eye;
    p.lastTire = now;
    const charge = Math.max(0, Math.min(1, num(msg.c) ?? 0));
    const speed = RENGAS.speedMin + (RENGAS.speedMax - RENGAS.speedMin) * charge;
    // Pyöristetyt arvot: peli laskee renkaan reitin samoista luvuista
    const v = [d[0] * speed, d[1] * speed + RENGAS.lift, d[2] * speed].map(r2);
    const start = [o[0] + d[0] * 0.5, o[1] + d[1] * 0.5 - 0.15, o[2] + d[2] * 0.5].map(r2);
    const tire = { id: this.nextProj++, owner: p.id, s: { p: start, v, t: 0 }, born: now, simT: 0, hit: new Set() };
    this.tires.push(tire);
    this.sendAll({ type: "tire", id: tire.id, owner: p.id, p: start, v });
  }

  updateTires(now) {
    const dt = 1 / 120;
    for (let i = this.tires.length - 1; i >= 0; i--) {
      const tr = this.tires[i];
      const owner = this.players.get(tr.owner);
      const target = (now - tr.born) / 1000;
      while (tr.simT < target && !tr.s.done) {
        tireStep(tr.s, this.M.boxes, RENGAS, this.M.x, this.M.z);
        tr.simT += dt;
        if (!owner) { tr.s.done = true; break; }
        const [x, y, z] = tr.s.p, v = tr.s.v;
        const spd = Math.hypot(v[0], v[1], v[2]);
        const dmg = Math.max(RENGAS.dmgMin, Math.round(RENGAS.dmgMax * Math.min(1, spd / RENGAS.speedMax)));
        let hitPos = null;
        for (const q of this.players.values()) {
          if (!q.alive || q.id === tr.owner || tr.hit.has(q.id) || sameTeam(q, owner)) continue;
          const c = dims(q);
          const cx = Math.max(q.x - c.radius, Math.min(x, q.x + c.radius)), cy = Math.max(q.y, Math.min(y, q.y + c.height)), cz = Math.max(q.z - c.radius, Math.min(z, q.z + c.radius));
          if (Math.hypot(x - cx, y - cy, z - cz) > RENGAS.r) continue;
          tr.hit.add(q.id);
          this.applyDamage(owner, q, dmg, [x, y, z].map(r2), [x, y, z], "rengas");
          hitPos = [q.x, q.z];
          break;
        }
        if (!hitPos) for (const sn of [...this.sentries.values()]) {
          if (tr.hit.has("s" + sn.id) || sn.owner === tr.owner || sameTeam(owner, this.players.get(sn.owner))) continue;
          const mn = sentryMin(sn), mx = sentryMax(sn);
          const dist = Math.hypot(...[x, y, z].map((w, k) => w - Math.max(mn[k], Math.min(w, mx[k]))));
          if (dist > RENGAS.r) continue;
          tr.hit.add("s" + sn.id);
          this.damageSentry(owner, sn, dmg, [x, y, z].map(r2));
          hitPos = [sn.x, sn.z];
          break;
        }
        if (hitPos) {
          // Rengas kimpoaa osumakohdasta poispäin ja hidastuu. Uusi reitti kerrotaan kaikille.
          let nx = x - hitPos[0], nz = z - hitPos[1];
          const nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
          const dot = v[0] * nx + v[2] * nz;
          if (dot < 0) { v[0] -= 2 * dot * nx; v[2] -= 2 * dot * nz; }
          tr.s.v = v.map((w) => r2(w * RENGAS.hitKeep));
          tr.s.p = tr.s.p.map(r2);
          this.sendAll({ type: "tire", id: tr.id, owner: tr.owner, p: tr.s.p, v: tr.s.v, hit: 1 });
        }
      }
      if (tr.s.done) {
        this.tires.splice(i, 1);
        this.sendAll({ type: "tireEnd", id: tr.id });
      }
    }
  }

  // Patukan sijainti t sekuntia heiton jälkeen (sama kaava pelissä)
  projAt(pr, t) {
    return [pr.o[0] + pr.v[0] * t, pr.o[1] + pr.v[1] * t - 0.5 * PATUKKA.gravity * t * t, pr.o[2] + pr.v[2] * t];
  }

  updateProjectiles(now) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      const tEnd = (now - pr.born) / 1000;
      let exploded = null;
      // Edetään pienin askelin ja tarkistetaan osuuko matkalla johonkin
      for (let t = pr.t || 0; t < tEnd && !exploded; t = Math.min(tEnd, t + 0.01)) {
        const a = pr.pos, b = this.projAt(pr, Math.min(tEnd, t + 0.01));
        const seg = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
        const segLen = Math.hypot(...seg);
        if (segLen > 1e-6) {
          const dir = seg.map((v) => v / segLen);
          let hit = null;
          const test = (min, max) => { const h = rayBox(a, dir, min, max); if (h !== null && h <= segLen && (hit === null || h < hit)) hit = h; };
          for (const bx of this.M.boxes) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]]);
          for (const bx of this.M.outer) test([bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]]);
          if (dir[1] < 0 && a[1] + dir[1] * segLen <= 0) { const h = -a[1] / dir[1]; if (hit === null || h < hit) hit = Math.max(0, h); }
          for (const q of this.players.values()) {
            if (!q.alive || (q.id === pr.owner && now - pr.born < 300) || sameTeam(q, this.players.get(pr.owner))) continue; // ei osu heittäjään heti eikä omiin
            const c = dims(q);
            test([q.x - c.radius, q.y, q.z - c.radius], [q.x + c.radius, q.y + c.height, q.z + c.radius]);
          }
          for (const sn of this.sentries.values()) test(sentryMin(sn), sentryMax(sn));
          if (hit !== null) exploded = a.map((v, k) => v + dir[k] * Math.max(0, hit - (pr.kind === "det" ? 0.15 : 0.02)));
        }
        pr.pos = b;
        pr.t = Math.min(tEnd, t + 0.01);
      }
      if (!exploded && now - pr.born > PATUKKA.lifeMs) exploded = pr.pos;
      if (exploded) {
        this.projectiles.splice(i, 1);
        if (pr.kind === "det") this.plantDetector(pr, exploded);
        else this.explode(pr, exploded);
      }
    }
  }

  // Shit detector jää maahan kiinni osumakohdan alle
  plantDetector(pr, at) {
    const x = Math.max(-this.M.x + 0.2, Math.min(this.M.x - 0.2, at[0]));
    const z = Math.max(-this.M.z + 0.2, Math.min(this.M.z - 0.2, at[2]));
    const y = this.supportAt(x, z, at[1] + 0.1);
    this.detectors.push({ id: pr.id, owner: pr.owner, x, y, z, until: Date.now() + DETEKTORI.durationMs });
    this.sendAll({ type: "detPlant", id: pr.id });
  }

  explode(pr, at) {
    const owner = this.players.get(pr.owner);
    if (at[1] < 0.05) at[1] = 0.05;
    this.sendAll({ type: "boom", id: pr.id, at: at.map(r2), r: PATUKKA.radius });
    for (const sn of [...this.sentries.values()]) {
      if (!owner || sn.owner === owner.id || sameTeam(owner, this.players.get(sn.owner))) continue;
      const mn = sentryMin(sn), mx = sentryMax(sn);
      const dist = Math.hypot(...at.map((v, k) => v - Math.max(mn[k], Math.min(v, mx[k]))));
      if (dist > PATUKKA.radius) continue;
      const f = 1 - dist / PATUKKA.radius;
      this.damageSentry(owner, sn, Math.round(PATUKKA.dmgMin + (PATUKKA.dmgMax - PATUKKA.dmgMin) * f), [sn.x, sn.y + 0.5, sn.z].map(r2));
    }
    for (const q of this.players.values()) {
      if (!q.alive || sameTeam(owner, q)) continue; // omat eivät lennä eivätkä ota vahinkoa
      const c = dims(q);
      const center = [q.x, q.y + c.height / 2, q.z];
      const dv = [center[0] - at[0], center[1] - at[1], center[2] - at[2]];
      // Etäisyys lähimpään kohtaan pelaajan "laatikossa"
      const nx = Math.max(q.x - c.radius, Math.min(at[0], q.x + c.radius));
      const ny = Math.max(q.y, Math.min(at[1], q.y + c.height));
      const nz = Math.max(q.z - c.radius, Math.min(at[2], q.z + c.radius));
      const dist = Math.hypot(at[0] - nx, at[1] - ny, at[2] - nz);
      if (dist > PATUKKA.radius) continue;
      // Seinä suojaa räjähdykseltä
      const toC = Math.hypot(...dv);
      if (toC > 0.3) {
        const dir = dv.map((v) => v / toC);
        let blocked = false;
        for (const bx of this.M.boxes) { const h = rayBox(at, dir, [bx[0], bx[1], bx[2]], [bx[3], bx[4], bx[5]]); if (h !== null && h > 0.05 && h < toC - c.radius) { blocked = true; break; } }
        if (blocked) continue;
      }
      const f = 1 - dist / PATUKKA.radius;
      // Lennätys: suoraan poispäin räjähdyksestä (alta tuleva räjähdys lennättää ylös) + vähän lisää ylöspäin
      const dir = toC > 0.05 ? dv.map((v) => v / toC) : [0, 1, 0];
      const K = PATUKKA.knock * f;
      const kv = [dir[0] * K, Math.max(0, dir[1]) * K + PATUKKA.knockUp * f, dir[2] * K];
      q.knockUntil = Date.now() + 2500;
      q.knockSpeed = Math.hypot(kv[0], kv[2]);
      this.send(q.id, { type: "knock", v: kv.map(r2) });
      // Vahinko (heittäjä ottaa itse enintään selfDamageMax)
      if (owner) {
        const dmg = q.id === owner.id ? Math.round(PATUKKA.selfDamageMax * f) : Math.round(PATUKKA.dmgMin + (PATUKKA.dmgMax - PATUKKA.dmgMin) * f);
        if (dmg <= 0) continue;
        this.applyDamage(owner, q, dmg, [q.x, q.y + c.height * 0.7, q.z].map(r2), at);
      }
    }
  }

  respawn(id) {
    const q = this.players.get(id);
    if (!q || !q.team) return; // lähti pelistä tai ei ole valinnut puolta
    this.placeAtSpawn(q);
    q.hp = CLASSES[q.cls].hp;
    q.alive = true; q.tauntUntil = 0;
    q.mediT = 0; q.mediOn = false; q.uber = 0; q.uberUntil = 0; q.invulnUntil = 0; q.healAcc = 0; q.decayAcc = 0;
    q.ammo = WEAPON.mag;
    q.reloadUntil = 0;
    q.knockUntil = 0;
    q.gluedUntil = 0;
    q.zoomed = false;
    q.leapUntil = 0;
    q.tank = PESU.tank; q.tankAt = Date.now();
    q.chargeUntil = 0;
    this.send(id, { type: "respawn", spawn: { x: q.x, y: q.y, z: q.z, yaw: q.yaw }, hp: q.hp, team: q.team, color: q.color });
  }

  removePlayer(id) {
    const leaving = this.players.get(id);
    if (leaving) this.dropRecipe(leaving);
    const sn = this.sentries.get(id);
    if (sn) this.destroySentry(sn, null);
    this.detectors = this.detectors.filter((d) => d.owner !== id);
    this.players.delete(id);
    this.sockets.delete(id);
    if (leaving && !leaving.bot && ![...this.players.values()].some((q) => !q.bot)) {
      for (const b of [...this.players.values()]) this.removePlayer(b.id); // viimeinen ihminen lähti: botit pois
    }
    if (this.players.size === 0 && this.loop) {
      clearInterval(this.loop);
      this.loop = null;
      this.history = [];
      this.projectiles = [];
      this.tires = [];
      this.drops = [];
      this.puddles = [];
      this.sentries.clear();
      this.resetRound(); // tyhjä huone: peli alkaa alusta
    }
  }

  freeColor() {
    const used = new Set([...this.players.values()].map((p) => p.color));
    return COLORS.find((c) => !used.has(c)) || COLORS[0];
  }

  send(id, obj) {
    const bp = this.players.get(id);
    if (bp?.bot) { if (obj.type === "knock") bp.brain.kn = obj.v.slice(); return; } // botti lentää palvelimella
    const ws = this.sockets.get(id);
    if (!ws) return;
    try { ws.send(JSON.stringify(obj)); } catch { this.removePlayer(id); }
  }

  sendAll(obj, exceptId) {
    const s = JSON.stringify(obj);
    for (const [id, ws] of this.sockets) {
      if (id === exceptId) continue;
      try { ws.send(s); } catch { this.removePlayer(id); }
    }
  }

  broadcastState() {
    this.updateProjectiles(Date.now());
    this.updateTires(Date.now());
    this.updateCharges(Date.now());
    this.updateCows(Date.now());
    this.updateDrops(Date.now());
    this.updateCards(Date.now());
    this.updateMedi(Date.now(), TICK_MS / 1000);
    this.updateSentries(Date.now(), TICK_MS / 1000);
    const nowD = Date.now();
    this.updateGrills(nowD);
    this.updateCTF(nowD);
    this.balanceBots(nowD);
    this.updateBots(nowD, TICK_MS / 1000);
    this.detectors = this.detectors.filter((d) => d.until > nowD); // 10 s jälkeen detektori tuhoutuu
    const seq = ++this.seq;
    const list = [...this.players.values()];
    this.history.push({ seq, pos: new Map(list.map((p) => [p.id, [p.x, p.y, p.z]])) });
    if (this.history.length > HISTORY_TICKS) this.history.shift();

    this.sendAll({
      type: "state", seq,
      players: list.map((p) => ({
        id: p.id, n: p.name, c: p.color, k: p.cls,
        x: r2(p.x), y: r2(p.y), z: r2(p.z), yw: r2(p.yaw), p: r2(p.pitch),
        h: p.hp, a: p.alive ? 1 : 0, kl: p.kills, de: p.deaths, cp: p.caps || 0, st: p.steals || 0, tn: p.alive && nowD < (p.tauntUntil || 0) ? 1 : 0,
        mt: p.mediT || 0, uc: Math.floor(p.uber || 0), ub: nowD < (p.invulnUntil || 0) ? 1 : 0, ud: nowD < (p.uberUntil || 0) ? 1 : 0, tm: p.team, cr2: p.carrying ? 1 : 0,
        rl: p.reloadUntil > Date.now() ? 1 : 0, w: p.weapon, gl: p.gluedUntil > Date.now() ? 1 : 0, lp: p.leapUntil > Date.now() ? 1 : 0, ch: p.chargeUntil > Date.now() ? 1 : 0, cr: p.crouch ? 1 : 0,
      })),
      grills: this.steakAt.map((t) => (nowD >= t ? 1 : 0)),
      ctf: {
        score: [this.score.sininen, this.score.punainen],
        r: this.recipes.map((r) => ({ id: r.id, st: r.st, x: r2(r.x), y: r2(r.y), z: r2(r.z), c: r.carrier })),
        next: this.recipes.some((r) => r.st === "tower") ? 0 : Math.max(0, this.towerAt - nowD),
        win: this.winner, end: this.winner ? Math.max(0, (this.vote ? this.vote.until : this.roundOverAt) - nowD) : 0,
        vote: this.vote ? { opts: this.vote.opts, c: this.voteCounts(), left: Math.max(0, this.vote.until - nowD) } : null, map: this.M.id,
      },
      cw: this.cows.map((c) => (c.deadUntil ? 0 : 1)),
      pud: this.puddles.map((pd) => [pd.id, pd.x, pd.y, pd.z, r2(pd.r), pd.until - nowD]),
      dets: this.detectors.map((d) => ({ id: d.id, o: d.owner, x: r2(d.x), y: r2(d.y), z: r2(d.z), ms: d.until - nowD })),
      sentries: [...this.sentries.values()].map((s) => ({
        id: s.id, o: s.owner, x: r2(s.x), y: r2(s.y), z: r2(s.z), yw: r2(s.yaw), h: Math.ceil(s.hp), b: r2(s.built), t: s.target, lv: s.lv,
      })),
    });
  }
}

return { default: __default, GameRoom };
})();

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
