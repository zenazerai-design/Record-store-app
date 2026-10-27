// The Possibilities screen lives in index.html. These checks load that script
// and run the brief filter and the conversion scoring directly.
import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";

const html = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const src = scripts.find((s) => s.includes("function pickThree"));
const start = src.indexOf("function wishTypes");
const end = src.indexOf("function withConv");
const pickStart = src.indexOf("function pickThree");
const pickEnd = src.indexOf("function unmetNote");
const scoreStart = src.indexOf("function scoreAt");
const scoreEnd = src.indexOf("function findSpot");

const brief = new Function(
  "S",
  `var PREF=["wish","suite","bedoffice","twobed","suite2","single","office"];\n${src.slice(start, end)}\n${src.slice(pickStart, pickEnd)}\nreturn { wishTypes, coversRequest, pickThree };`,
);

const FULL = 2.2;
const COUNT = 1.5;
const LOSS = 0.2;
const S = { uses: ["bedDouble", "hobby", "bathroom"], features: [] };
let heights = () => [2.6, 2.6];
function hRaw(x, y) { return heights(x, y); }
function eff(x, y) { return Math.max(0, hRaw(x, y)[1] - LOSS); }
const scoreAt = new Function(
  "S", "FULL", "COUNT", "LOSS", "hRaw", "eff",
  `function accessPenalty(){ return 0; }\n${src.slice(scoreStart, scoreEnd)}\nreturn scoreAt;`,
)(S, FULL, COUNT, LOSS, hRaw, eff);

const accessStart = src.indexOf("function ownAccess");
const accessEnd = src.indexOf("function scoreAt");
function loadAccess(env) {
  const fn = new Function(
    "S", "T", "DOORW", "Wm", "Dm", "eff", "FPM", "pip", "inPoly", "suggestLanding", "stairAxis",
    `${src.slice(accessStart, accessEnd)}\nreturn { ownAccess, planAccessLanding, entranceOnto };`,
  );
  return fn(env.S, env.T, env.DOORW, env.Wm, env.Dm, env.eff, env.FPM, env.pip, env.inPoly, env.suggestLanding, env.stairAxis);
}

test("a bedroom, hobby room and bathroom brief is the wish list", () => {
  const api = brief(S);
  assert.deepEqual(api.wishTypes(), ["bedDouble", "hobby", "bathroom"]);
});

test("suggestions keep every requested room and do not substitute other programmes", () => {
  const api = brief(S);
  const wish = { rc: { id: "wish" }, types: ["bedDouble", "hobby", "bathroom"], sig: "bathroom,bedDouble,hobby", bad: 0, checks: [] };
  const suite = { rc: { id: "suite" }, types: ["bedDouble", "ensuite", "wardrobe", "eaves"], sig: "suite", bad: 0, checks: [] };
  const office = { rc: { id: "bedoffice" }, types: ["bedDouble", "ensuite", "office"], sig: "office", bad: 0, checks: [] };
  const SG = { wish, all: [wish, suite, office] };
  const shown = api.pickThree(SG);
  assert.deepEqual(shown.map((x) => x.rc.id), ["wish"]);
  assert.equal(shown[0].types.includes("hobby") && shown[0].types.includes("bathroom"), true);
});

test("an infeasible brief is explained by the wish layout, not replaced", () => {
  const api = brief(S);
  const wish = { rc: { id: "wish" }, types: ["bedDouble", "hobby", "bathroom"], sig: "wish", bad: 2, checks: [{ l: "bad", t: "The hobby room does not fit." }] };
  const suite = { rc: { id: "suite" }, types: ["bedDouble", "ensuite", "wardrobe", "eaves"], sig: "suite", bad: 0, checks: [] };
  const shown = api.pickThree({ wish, all: [wish, suite] });
  assert.deepEqual(shown.map((x) => x.rc.id), ["wish"]);
});

test("an open brief can still show other programmes", () => {
  const open = { uses: [], features: [] };
  const api = brief(open);
  const wish = { rc: { id: "wish" }, types: [], sig: "", bad: 1, checks: [] };
  const suite = { rc: { id: "suite" }, types: ["bedDouble", "ensuite"], sig: "suite", bad: 0, checks: [] };
  const office = { rc: { id: "bedoffice" }, types: ["bedDouble", "office"], sig: "office", bad: 0, checks: [] };
  const shown = api.pickThree({ wish, all: [wish, suite, office] });
  assert.deepEqual(shown.map((x) => x.rc.id), ["suite", "bedoffice", "wish"]);
});

test("habitable rooms score the space a conversion adds, and eaves storage does not", () => {
  // Front eaves stay low. The ridge is the tallest existing roof. The rear is a dormer: a little lower than the ridge, and newly created.
  heights = (x, y) => (y >= 5 ? [0.9, 2.35] : y <= 1.2 ? [0.7, 0.7] : [2.6, 2.6]);
  const room = { low: false };
  const storage = { low: true };
  const ridge = scoreAt(room, "bedDouble", 1.3, 1.4, 3.4, 3.4, []);
  const dormer = scoreAt(room, "bedDouble", 1.3, 5.2, 3.4, 3.4, []);
  assert.ok(dormer > ridge, `dormer ${dormer} should beat ridge ${ridge}`);
  // The last stretch of the rear is still below 1.5 m. Sitting on it should lose to the tall part of the dormer.
  heights = (x, y) => (y >= 8.2 ? [0.4, 1.2] : y >= 5 ? [0.9, 2.35] : y <= 1.2 ? [0.7, 0.7] : [2.6, 2.6]);
  const pressedIn = scoreAt(room, "bedDouble", 1.3, 5.6, 3.4, 3.4, []);
  const inset = scoreAt(room, "bedDouble", 1.3, 4.6, 3.4, 3.4, []);
  assert.ok(inset > pressedIn, `inset ${inset} should beat the low strip ${pressedIn}`);
  const eavesLow = scoreAt(storage, "eaves", 1.5, 0.1, 3, 0.9, []);
  const eavesInDormer = scoreAt(storage, "eaves", 1.5, 5.5, 3, 0.9, []);
  assert.ok(eavesLow > eavesInDormer, "storage stays in the low eaves");
});

test("a landing is only as wide as the rooms that need a door, and it stays clear of the stairs", () => {
  const stairs = { type: "stairs", x: 0, y: 3.2, w: 0.9, h: 2.7 };
  let lowX = 99;
  const api = loadAccess({
    S: { conv: "dormer", _accessNeed: 3 },
    T: { bedDouble: { hab: true }, hobby: { hab: true }, bathroom: { wet: true }, ensuite: { wet: true }, wardrobe: {}, eaves: { low: true } },
    DOORW: 0.8,
    Wm: () => 6,
    Dm: () => 9,
    eff: (x, y) => (x > lowX || y > 8.2 ? 1.0 : 2.3),
    FPM: { pts: null },
    pip: () => true,
    inPoly: (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    suggestLanding: () => [0, 5.9, 0.9, 0.9],
    stairAxis: () => "y",
  });
  assert.equal(api.ownAccess("bedDouble") && api.ownAccess("hobby") && api.ownAccess("bathroom"), true);
  assert.equal(api.ownAccess("ensuite") || api.ownAccess("wardrobe") || api.ownAccess("eaves"), false);
  const hall = api.planAccessLanding([stairs], 3);
  assert.ok(hall[2] > 1.2, `landing width ${hall[2]}`);
  assert.ok(hall[3] <= 1.05, `landing stays shallow ${hall[3]}`);
  assert.ok(hall[1] >= 5.85, "landing stays at the top of the stairs");
  const overlap = Math.min(hall[0] + hall[2], stairs.x + stairs.w) - Math.max(hall[0], stairs.x);
  const overlapY = Math.min(hall[1] + hall[3], stairs.y + stairs.h) - Math.max(hall[1], stairs.y);
  assert.ok(!(overlap > 0.05 && overlapY > 0.05), "landing does not sit on the stairs");

  lowX = 1.6;
  const stopped = api.planAccessLanding([stairs], 3);
  assert.ok(stopped[0] + stopped[2] <= 1.75, `landing stops before the low zone, width ends at ${stopped[0] + stopped[2]}`);
});

test("a room is reachable only when a door opens onto circulation from the landing", () => {
  const stairs = { type: "stairs", x: 0, y: 3.2, w: 0.9, h: 2.7 };
  const landing = { type: "landing", x: 0, y: 5.9, w: 2.2, h: 0.9 };
  const bedroom = { type: "bedDouble", x: 0.9, y: 3.2, w: 5.1, h: 2.7 };
  const hobby = { type: "hobby", x: 2.2, y: 0.3, w: 2.6, h: 2.6 };
  const api = loadAccess({
    S: { conv: "dormer", _accessNeed: 3 },
    T: { bedDouble: { hab: true }, hobby: { hab: true }, bathroom: { wet: true }, ensuite: { wet: true }, wardrobe: {} },
    DOORW: 0.8,
    Wm: () => 6,
    Dm: () => 9,
    eff: () => 2.3,
    FPM: { pts: null },
    pip: () => true,
    inPoly: (r, x, y) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h,
    suggestLanding: () => [0, 5.9, 0.9, 0.9],
    stairAxis: () => "y",
  });
  const around = [stairs, landing, bedroom];
  assert.equal(api.entranceOnto("bedDouble", bedroom.x, bedroom.y, bedroom.w, bedroom.h, [stairs, landing], null), true);
  assert.equal(api.entranceOnto("hobby", hobby.x, hobby.y, hobby.w, hobby.h, around, null), false);
  const suiteBed = { type: "bedDouble", x: 3, y: 3, w: 2.8, h: 3 };
  const ensuite = { type: "ensuite", x: 1.2, y: 3.4, w: 1.8, h: 2 };
  assert.equal(api.entranceOnto("ensuite", ensuite.x, ensuite.y, ensuite.w, ensuite.h, [suiteBed], null), true);
});

import vm from "node:vm";

function loadPrototype() {
  const marker = "render();\n})();";
  const at = src.lastIndexOf(marker);
  if (at < 0) throw new Error("could not find the prototype bootstrap");
  const script = src.slice(0, at) + `
    S={fp:{x:60,y:70,w:300,h:450},ppm:50,ridgeH:2.6,ridgeAxis:"x",rear:"far",conv:"dormer",ends:{start:"party",end:"party"},uses:["bedDouble","hobby","bathroom"],features:[{id:"f1",type:"stairsBelow",x:0,y:3.6,w:1,h:1.8},{id:"f2",type:"bathBelow",x:3.3,y:3.6,w:2.7,h:1.8},{id:"f3",type:"chimney",x:0,y:1.3,w:0.45,h:1}],rooms:[],doors:[],furniture:[],house:"mid",step:6,stage:"layout"};
    if(typeof syncFootprint==="function") syncFootprint();
    globalThis.__api={S:S,buildLayout:buildLayout,analyse:analyse,refreshPendingDoors:refreshPendingDoors,doorGeom:doorGeom,scoreDoor:scoreDoor,routeReaches:routeReaches,suggestDoor:suggestDoor,syncFootprint:syncFootprint,buildScene:buildScene,inPoly:inPoly,polyArea:polyArea,joinLandings:joinLandings};
  })();`;
  function el() {
    return {
      style: {}, classList: { add() {}, remove() {}, toggle() {} },
      setAttribute() {}, getAttribute() { return null; }, appendChild() {}, removeChild() {},
      innerHTML: "", textContent: "", addEventListener() {}, removeEventListener() {},
      querySelector() { return null; }, querySelectorAll() { return []; }, children: [],
      getContext() { return { measureText() { return { width: 10 }; }, fillRect() {}, clearRect() {}, beginPath() {}, moveTo() {}, lineTo() {}, stroke() {}, fill() {}, save() {}, restore() {}, translate() {}, scale() {}, setTransform() {}, fillText() {}, drawImage() {} }; },
    };
  }
  const window = {
    addEventListener() {}, removeEventListener() {}, innerWidth: 1200, innerHeight: 800, devicePixelRatio: 1,
    matchMedia() { return { matches: false, addEventListener() {}, addListener() {} }; },
    requestAnimationFrame() { return 1; }, cancelAnimationFrame() {},
    localStorage: { getItem() { return null; }, setItem() {}, removeItem() {} },
    indexedDB: { open() { return {}; } }, location: { hash: "", href: "" }, scrollTo() {},
  };
  const document = {
    getElementById() { return el(); }, querySelector() { return el(); }, querySelectorAll() { return []; },
    createElement() { return el(); }, body: el(), documentElement: { style: {}, classList: { add() {}, remove() {} } }, addEventListener() {},
  };
  window.document = document;
  const context = {
    document, window, console, setTimeout, clearTimeout, Uint8Array, Float32Array, Math, JSON, Object, Array,
    Number, String, Boolean, Map, Set, Date, parseInt, parseFloat, isNaN, isFinite,
    Image: function () { return el(); }, Blob: function () {}, URL: { createObjectURL() { return ""; }, revokeObjectURL() {} },
    requestAnimationFrame() { return 1; }, localStorage: window.localStorage, indexedDB: window.indexedDB,
  };
  context.globalThis = context;
  context.window = Object.assign(window, context);
  vm.createContext(context);
  vm.runInContext(script, context, { timeout: 60000 });
  context.__api.S.fp = { x: 60, y: 70, w: 300, h: 450 };
  context.__api.S.ppm = 50;
  context.__api.S.ridgeH = 2.6;
  context.__api.S.ridgeAxis = "x";
  context.__api.S.rear = "far";
  context.__api.S.conv = "dormer";
  context.__api.S.ends = { start: "party", end: "party" };
  context.__api.S.uses = ["bedDouble", "hobby", "bathroom"];
  context.__api.S.features = [
    { id: "f1", type: "stairsBelow", x: 0, y: 3.6, w: 1, h: 1.8 },
    { id: "f2", type: "bathBelow", x: 3.3, y: 3.6, w: 2.7, h: 1.8 },
    { id: "f3", type: "chimney", x: 0, y: 1.3, w: 0.45, h: 1 },
  ];
  context.__api.S.rooms = [];
  context.__api.S.doors = [];
  context.__api.S.furniture = [];
  context.__api.S.house = "mid";
  context.__api.syncFootprint();
  return context.__api;
}

const rules = new Function(
  "S", "T", "DOORW", "Wm", "Dm", "eff",
  `${src.slice(accessStart, accessEnd)}\nreturn { neighbourOK, routeReaches, storageTouch };`,
)({ furniture: [] }, { bedDouble:{hab:true}, hobby:{hab:true}, office:{hab:true}, play:{hab:true}, gym:{hab:true}, bathroom:{wet:true}, wc:{wet:true}, ensuite:{wet:true}, wardrobe:{}, eaves:{low:true} }, 0.8, () => 6, () => 9, () => 2.3);

test("an independent room's door has to open onto the landing, not open floor or another room", () => {
  assert.equal(rules.neighbourOK("bedDouble", { kind: "landing", room: { type: "landing" } }), true);
  assert.equal(rules.neighbourOK("hobby", { kind: "open" }), false);
  assert.equal(rules.neighbourOK("office", { kind: "room", room: { type: "bedDouble" } }), false);
  assert.equal(rules.neighbourOK("bathroom", { kind: "landing", room: { type: "landing" } }), true);
  assert.equal(rules.neighbourOK("bathroom", { kind: "room", room: { type: "bedDouble" } }), true);
});

test("an en-suite opens from the bedroom and storage can open from an adjoining room", () => {
  assert.equal(rules.neighbourOK("ensuite", { kind: "room", room: { type: "bedDouble" } }), true);
  assert.equal(rules.neighbourOK("ensuite", { kind: "landing" }), false);
  assert.equal(rules.neighbourOK("wardrobe", { kind: "room", room: { type: "bedDouble" } }), true);
  assert.equal(rules.neighbourOK("eaves", { kind: "landing", room: { type: "landing" } }), true);
  const bed = { type: "bedDouble", x: 1, y: 2, w: 3.4, h: 3.4 };
  const cupboard = { type: "eaves", x: 1, y: 1.1, w: 3, h: 0.9 };
  const floating = { type: "eaves", x: 1, y: 0, w: 2, h: 0.6 };
  assert.equal(rules.storageTouch(cupboard, [bed, cupboard]), true);
  assert.equal(rules.storageTouch(floating, [bed, floating]), false);
});

test("a door with no walkable route from the stairs is rejected", () => {
  const stairs = { type: "stairs", x: 0, y: 0.4, w: 0.9, h: 2.7 };
  const landing = { type: "landing", x: 0, y: 3.1, w: 2.2, h: 0.9 };
  const goal = [1.1, 3.5];
  assert.equal(rules.routeReaches(goal, [stairs, landing], null), true);
  const barrier = { type: "bedDouble", x: 0, y: 2.6, w: 6, h: 1.4 };
  assert.equal(rules.routeReaches(goal, [stairs, landing, barrier], null), false);
});

test("the dormer brief puts every door on the landing, and furniture can cut that route", () => {
  const plan = loadPrototype();
  const rooms = plan.buildLayout("dormer", ["bedDouble", "hobby", "bathroom"], false);
  plan.S.rooms = rooms;
  plan.S.conv = "dormer";
  plan.S.doors = [];
  plan.S.furniture = [];
  plan.refreshPendingDoors();
  const report = plan.analyse();
  assert.equal(rooms.map((r) => String(r.type)).filter((t) => t !== "stairs" && t !== "landing").sort().join(","), "bathroom,bedDouble,hobby");
  const bed = rooms.find((r) => r.type === "bedDouble");
  const bedStat = report.rooms.find((s) => s.id === bed.id);
  assert.ok(bedStat.counted >= 11.5, `bedroom countable area ${bedStat.counted}`);
  const doors = plan.S.doors.map((d) => {
    const g = plan.doorGeom(d);
    const sc = plan.scoreDoor(g.r, g);
    return { type: g.r.type, beyond: sc.beyond.kind, route: plan.routeReaches(g.out, rooms, null), out: g.out };
  });
  assert.equal(doors.length, 3);
  for (const d of doors) {
    assert.equal(d.beyond, "landing", `${d.type} opens onto ${d.beyond}`);
    assert.equal(d.route, true, `${d.type} has no route from the stairs`);
  }
  const bad = report.rooms.flatMap((s) => s.issues.filter((i) => i.l === "bad"));
  assert.equal(bad.length, 0, bad.map((i) => i.t).join("; "));
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = rooms[i], b = rooms[j];
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      assert.ok(!(w > 0.05 && h > 0.05), `${a.type} overlaps ${b.type}`);
    }
  }
  const shoved = rooms.map((r) => r.type === "bedDouble" ? Object.assign({}, r, { y: 0.2, pts: [[r.x, 0.2], [r.x + r.w, 0.2], [r.x + r.w, 0.2 + r.h], [r.x, 0.2 + r.h]] }) : r);
  plan.S.rooms = shoved;
  plan.S.doors = [];
  const shovedReport = plan.analyse();
  const shovedBad = shovedReport.rooms.find((s) => s.id === bed.id).issues.filter((i) => i.l === "bad");
  assert.ok(shovedBad.length > 0, "a bedroom whose door faces the low front is rejected");

  plan.S.rooms = rooms;
  plan.S.furniture = [{ type: "wardrobe", x: 0.3, y: 6.05, w: 1.8, h: 0.7 }];
  const bedDoor = doors.find((d) => d.type === "bedDouble");
  assert.equal(plan.routeReaches(bedDoor.out, rooms, null), false);

  const suiteBed = { id: "bed", type: "bedDouble", name: "Double bedroom", x: 2.4, y: 5, w: 3.4, h: 3.4 };
  const ensuite = { id: "ens", type: "ensuite", name: "En-suite", x: 0.4, y: 5.2, w: 2, h: 2.2 };
  plan.S.rooms = rooms.filter((r) => r.type === "stairs" || r.type === "landing").concat([suiteBed, ensuite]);
  plan.S.furniture = [];
  const ensDoor = plan.suggestDoor(ensuite);
  assert.ok(ensDoor, "en-suite has a door");
  assert.equal(ensDoor.sc.beyond.kind, "room");
  assert.equal(ensDoor.sc.beyond.room.type, "bedDouble");
});

test("the landing is one circulation zone on the continuous loft floor", () => {
  const plan = loadPrototype();
  const rooms = plan.buildLayout("dormer", ["bedDouble", "hobby", "bathroom"], false);
  plan.S.rooms = rooms;
  plan.S.conv = "dormer";
  plan.S.doors = [];
  plan.S.furniture = [];
  plan.S.windows = [];
  plan.S.style = { id: "scandi", floor: null, wall: null };
  plan.refreshPendingDoors();
  const lands = rooms.filter((r) => r.type === "landing");
  assert.equal(lands.length, 1, "one circulation zone, labelled once");
  const land = lands[0];
  assert.equal(rooms.filter((r) => r.type !== "landing").length, rooms.length - 1);
  assert.ok(land.zone && land.zone.length >= 2, "the spur stays part of the zone");
  assert.ok(land.pts.length > 4, "the zone is a single outline");
  const bar = land.zone[0];
  const spur = land.zone[1];
  assert.equal(plan.inPoly(land, bar[0] + bar[2] / 2, bar[1] + bar[3] / 2), true);
  assert.equal(plan.inPoly(land, spur[0] + spur[2] / 2, spur[1] + spur[3] / 2), true);
  const notchX = Math.min(bar[0], spur[0]) + 0.15;
  const notchY = spur[1] + 0.2;
  const notchInside = land.zone.some((z) => notchX >= z[0] && notchX <= z[0] + z[2] && notchY >= z[1] && notchY <= z[1] + z[3]);
  if (!notchInside) assert.equal(plan.inPoly(land, notchX, notchY), false, "the bounding box is not solid floor");
  const drawn = plan.polyArea(land.pts);
  const reserved = land.zone.reduce((sum, z) => sum + z[2] * z[3], 0);
  assert.ok(Math.abs(drawn - reserved) < 0.08, `shared circulation is drawn once (${drawn} vs ${reserved})`);
  for (const room of rooms) {
    if (room === land || room.type === "stairs") continue;
    let overlap = 0;
    for (const z of land.zone) {
      const w = Math.min(room.x + room.w, z[0] + z[2]) - Math.max(room.x, z[0]);
      const h = Math.min(room.y + room.h, z[1] + z[3]) - Math.max(room.y, z[1]);
      if (w > 0 && h > 0) overlap += w * h;
    }
    assert.ok(overlap < 0.05, `${room.type} sits on the landing`);
  }

  const scene = plan.buildScene("doll");
  const floor = scene.faces.find((f) => f.pts.length === 4 && f.pts.every((p) => Math.abs(p[1]) < 0.001) && f.pts.some((p) => p[0] < 0.01 && p[2] < 0.01));
  assert.ok(floor, "the loft floor is one surface");
  const floorX = floor.pts.map((p) => p[0]);
  const floorZ = floor.pts.map((p) => p[2]);
  assert.ok(Math.max(...floorX) > 5.5 && Math.max(...floorZ) > 8.5, "the floor covers the landing and the rooms");
  const stairs = rooms.find((r) => r.type === "stairs");
  const opening = scene.faces.some((f) => f.pts.every((p) => Math.abs(p[1] - 0.003) < 0.001) && f.pts.some((p) => Math.abs(p[0] - stairs.x) < 0.05 && Math.abs(p[2] - stairs.y) < 0.05));
  assert.equal(opening, true, "the stair opening stays in the floor");
  const raised = scene.faces.filter((f) => {
    const ys = f.pts.map((p) => p[1]);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    if (maxY - minY > 0.08 || minY < 0.02 || minY > 0.45) return false;
    const xs = f.pts.map((p) => p[0]);
    const zs = f.pts.map((p) => p[2]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), z0 = Math.min(...zs), z1 = Math.max(...zs);
    return land.zone.some((z) => Math.abs(x0 - z[0]) < 0.2 && Math.abs(z0 - z[1]) < 0.2 && Math.abs(x1 - x0 - z[2]) < 0.25 && Math.abs(z1 - z0 - z[3]) < 0.25);
  });
  assert.equal(raised.length, 0, "no separate landing slab");
  function onEdge(r, x, z) {
    const p = r.pts && r.pts.length >= 3 ? r.pts : [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      const dx = b[0] - a[0], dy = b[1] - a[1], len = dx * dx + dy * dy || 1;
      const t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dy) / len));
      if (Math.hypot(x - a[0] - dx * t, z - a[1] - dy * t) < 0.08) return true;
    }
    return false;
  }
  const others = rooms.filter((r) => r.type !== "landing" && r.type !== "stairs");
  const boxed = scene.faces.filter((f) => {
    const ys = f.pts.map((p) => p[1]);
    if (Math.max(...ys) - Math.min(...ys) < 0.4) return false;
    const mx = f.pts.reduce((s, p) => s + p[0], 0) / f.pts.length;
    const mz = f.pts.reduce((s, p) => s + p[2], 0) / f.pts.length;
    if (mx < 0.08 || mz < 0.08 || mx > 5.92 || mz > 8.92) return false;
    if (!onEdge(land, mx, mz)) return false;
    if (others.some((r) => onEdge(r, mx, mz))) return false;
    return true;
  });
  assert.equal(boxed.length, 0, "the landing is not extruded as its own room");

  const doors = plan.S.doors.map((d) => {
    const g = plan.doorGeom(d);
    return { type: g.r.type, beyond: plan.scoreDoor(g.r, g).beyond.kind, route: plan.routeReaches(g.out, rooms, null) };
  });
  assert.equal(doors.length, 3);
  for (const d of doors) {
    assert.equal(d.beyond, "landing", `${d.type} opens onto ${d.beyond}`);
    assert.equal(d.route, true, `${d.type} route`);
  }

  const spare = rooms.filter((r) => r.type !== "landing");
  plan.S.rooms = spare.concat([
    { id: "bar", type: "landing", name: "Landing", x: bar[0], y: bar[1], w: bar[2], h: bar[3] },
    { id: "spur", type: "landing", name: "Landing 2", spur: true, x: spur[0], y: spur[1], w: spur[2], h: spur[3] },
  ]);
  plan.joinLandings();
  const joined = plan.S.rooms.filter((r) => r.type === "landing");
  assert.equal(joined.length, 1);
  assert.equal(joined[0].name, "Landing");
  assert.equal(plan.inPoly(joined[0], spur[0] + spur[2] / 2, spur[1] + spur[3] / 2), true);
});
