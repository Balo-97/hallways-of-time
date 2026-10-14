/**
 * Su Song's clock tower: the escapement, ticking.
 *
 * In 1092, in the Song capital Kaifeng, Su Song finished a tower some twelve
 * metres high whose clock was driven by water. Water poured from a tank into
 * the buckets of a great wheel; the wheel was held still until the bucket
 * under the spout was heavy enough to tip a balance, then let turn by one
 * bucket and caught again. That is an escapement — what makes a clock keep
 * time instead of running down — two centuries before any in Europe. The
 * wheel turned an armillary sphere on the roof for watching the sky, a
 * celestial globe inside that kept pace with the heavens, and figures at the
 * doors of a pagoda that came out to ring bells and strike the hours.
 *
 * A scale model stands on a stone platform, its wheel laid open under curved
 * tiled roofs. Water runs from the tank, splashing into the bucket under the
 * spout; the bucket presses its lever down, the lever pulls the balance over,
 * the balance lifts the lock, and the wheel steps one bucket and is caught,
 * with a small jolt. The celestial globe, sunk to its horizon in a case as Su
 * Song's was and painted with his asterisms, and the bronze rings of the
 * armillary turn on with each step; on the hour the doors of the pagoda swing
 * open and a figure comes out with its tablet. The panel lets the visitor stop
 * the water, or take the escapement away and watch the wheel simply run.
 */
const BUCKETS = 36, FILL = 3.2, STEP = .55, HOUR = 6;   // seconds to fill a bucket, to step; ticks to an hour, all much faster than life
const STEP_ANGLE = Math.PI * 2 / BUCKETS;
const smooth = s => s * s * (3 - 2 * s);

export function createSuSongClock(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'susong';
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .55, ...extra});
  const state = {water: true, escapement: true, fill: 0, stepping: -1, rotation: 0, ticks: 0, hours: 0, jack: -1, page: 'escapement', fills: new Array(BUCKETS).fill(0), free: 0,
    clock: 0, caught: 1, sky: 0, skyShown: 0};

  // ── Materials, painted ───────────────────────────────────────────────
  const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return kit.texture(c); };
  /** Glazed tiles in rows running down the slope. */
  const tileMap = canvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#2f453c'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 16) {
      const g = ctx.createLinearGradient(x, 0, x + 16, 0); g.addColorStop(0, '#22332c'); g.addColorStop(.45, '#5b7a68'); g.addColorStop(1, '#22332c');
      ctx.fillStyle = g; ctx.fillRect(x + 1, 0, 14, h);
    }
    ctx.fillStyle = 'rgba(10,18,14,.35)'; for (let y = 0; y < h; y += 32) ctx.fillRect(0, y, w, 3);
  });
  tileMap.wrapS = tileMap.wrapT = THREE.RepeatWrapping;
  const tiles = std('#ffffff', {map: tileMap, roughness: .42, side: THREE.DoubleSide});
  const ridgeTiles = std('#24372f', {roughness: .5});
  /** Red lacquer walls, framed in gilt, with lattice panels. */
  const lattice = canvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#8a2519'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 8; ctx.strokeRect(10, 10, w - 20, h - 20);
    ctx.fillStyle = '#3c120c'; ctx.fillRect(36, 36, w - 72, h - 72);
    ctx.strokeStyle = '#b8873e'; ctx.lineWidth = 5;
    for (let i = -h; i < w; i += 28) { ctx.beginPath(); ctx.moveTo(36 + i, 36); ctx.lineTo(36 + i + (h - 72), h - 36); ctx.stroke(); ctx.beginPath(); ctx.moveTo(w - 36 - i, 36); ctx.lineTo(w - 36 - i - (h - 72), h - 36); ctx.stroke(); }
    ctx.strokeStyle = '#8a2519'; ctx.lineWidth = 14; ctx.strokeRect(36, 36, w - 72, h - 72);
  });
  const walls = std('#ffffff', {map: lattice, roughness: .5});
  const lacquer = std('#9b2f22', {roughness: .38});
  /** The painted beams under the eaves: blue and green bands with gilt between. */
  const beamMap = canvas(256, 32, (ctx, w, h) => {
    ctx.fillStyle = '#1f5a5c'; ctx.fillRect(0, 0, w, h);
    for (let x = 0; x < w; x += 64) { ctx.fillStyle = '#2f7a4e'; ctx.fillRect(x + 6, 4, 26, h - 8); ctx.fillStyle = '#c9a664'; ctx.fillRect(x + 36, 2, 4, h - 4); ctx.beginPath(); ctx.arc(x + 52, h / 2, 7, 0, Math.PI * 2); ctx.fill(); }
  });
  beamMap.wrapS = THREE.RepeatWrapping; beamMap.repeat.set(4, 1);
  const beams = std('#ffffff', {map: beamMap, roughness: .5});
  const bronze = std('#8a6a3a', {metalness: .6, roughness: .35});
  const stone = std('#d8cfbd', {roughness: .7});
  const water = new THREE.MeshStandardMaterial({color: '#4f9ccf', roughness: .12, metalness: .1, transparent: true, opacity: .82});

  // ── The tower ────────────────────────────────────────────────────────
  // A quarter larger than at first: a little over four metres to the top of its roof.
  const wall = kit.onWall(angle, kit.STAGE, 1.25);
  const tower = new THREE.Group(); wall.add(tower);
  // A stone platform of two tiers, a low red balustrade round the upper.
  box(tower, [3.05, .12, 2.3], [0, .06, 0], stone);
  box(tower, [2.85, .1, 2.12], [0, .17, 0], stone);
  box(tower, [2.89, .02, 2.16], [0, .225, 0], M.gold);
  const B = .235;   // the top of the platform
  {
    const rail = (from, to) => {
      const length = Math.hypot(to[0] - from[0], to[1] - from[1]), steps = Math.max(2, Math.round(length / .2));
      const rod = box(tower, [length, .02, .02], [(from[0] + to[0]) / 2, B + .13, (from[1] + to[1]) / 2], lacquer); rod.rotation.y = -Math.atan2(to[1] - from[1], to[0] - from[0]);
      for (let i = 0; i <= steps; i++) { const t = i / steps; box(tower, [.03, .14, .03], [from[0] + (to[0] - from[0]) * t, B + .07, from[1] + (to[1] - from[1]) * t], lacquer); }
    };
    rail([-1.38, 1.02], [-.3, 1.02]); rail([.3, 1.02], [1.38, 1.02]);
    rail([-1.38, -1.02], [-1.38, 1.02]); rail([1.38, -1.02], [1.38, 1.02]);
  }
  /**
   * A tiled roof as the Song built them: hipped, its slopes curving out flat
   * toward the eaves and its corners turned up. `hole` leaves the middle open,
   * for an eave skirting a storey.
   */
  function roof(x, y, w, d, h, {hole = 0, lift = .3} = {}) {
    const n = 24, positions = [], uvs = [], index = [];
    const at = (u, v) => {
      const ring = Math.max(Math.abs(u), Math.abs(v)), corner = Math.min(Math.abs(u), Math.abs(v));
      const slope = Math.max(0, (1 - ring) / (1 - hole));
      return [u * w / 2, h * slope ** 1.7 + h * lift * corner ** 4 * ring ** 8, v * d / 2];
    };
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) {
      const u = i / n * 2 - 1, v = j / n * 2 - 1;
      positions.push(...at(u, v));
      uvs.push((Math.abs(v) >= Math.abs(u) ? u * w : v * d) * 4, Math.max(Math.abs(u), Math.abs(v)) * 3);
    }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = j * (n + 1) + i, b = a + 1, c = a + n + 1, e = c + 1, u = (i + .5) / n * 2 - 1, v = (j + .5) / n * 2 - 1;
      if (Math.max(Math.abs(u), Math.abs(v)) < hole) continue;
      // Each quad split along the hip that runs through its quarter, so the hips stay sharp.
      if (u * v > 0) index.push(a, c, e, a, e, b); else index.push(a, c, b, b, c, e);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index); geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, tiles); mesh.position.set(x, y, 0); tower.add(mesh);
    // The hips, capped with ridge tiles, and a finial on a closed roof.
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const points = [];
      for (let k = 0; k <= 12; k++) { const t = hole + (1 - hole) * k / 12, [px, py, pz] = at(sx * t, sz * t); points.push(new THREE.Vector3(px, py + .012, pz)); }
      const cap = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, .014, 5), ridgeTiles); cap.position.copy(mesh.position); tower.add(cap);
    }
    if (!hole) { const finial = new THREE.Mesh(new THREE.ConeGeometry(.03, .12, 8), M.gold); finial.position.set(x, y + h + .06, 0); tower.add(finial); }
    return mesh;
  }
  /** A red column with a bracket set on top. */
  function column(x, z, y0, y1) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(.03, .034, y1 - y0, 12), lacquer); c.position.set(x, (y0 + y1) / 2, z); tower.add(c);
    box(tower, [.075, .03, .075], [x, y1 + .015, z], M.gold);
    box(tower, [.12, .025, .045], [x, y1 + .042, z], beams); box(tower, [.045, .025, .12], [x, y1 + .042, z], beams);
  }

  // The pagoda: three tiers of doors where the figures appear, each under a tiled eave.
  const P = {x: -.66, w: 1.2, d: 1.2, tier: .3};
  const doorY = [];
  for (let k = 0; k < 3; k++) {
    const y0 = B + k * P.tier;
    box(tower, [P.w, P.tier - .04, P.d], [P.x, y0 + (P.tier - .04) / 2, 0], walls);
    box(tower, [P.w + .04, .035, P.d + .04], [P.x, y0 + P.tier - .04, 0], beams);
    roof(P.x, y0 + P.tier - .025, P.w + .3, P.d + .3, .07, {hole: .74, lift: .5});
    doorY.push(y0 + .12);
    for (const dx of [-.36, .36]) box(tower, [.13, .18, .02], [P.x + dx, y0 + .12, P.d / 2 + .006], std('#1b1410'));
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) column(P.x + sx * (P.w / 2 + .01), sz * (P.d / 2 + .01), B, B + 3 * P.tier - .04);
  // The middle door of the lowest tier, whose two leaves swing open on the hour.
  const leaves = [-1, 1].map(side => {
    const hinge = new THREE.Group(); hinge.position.set(P.x + side * .075, doorY[0], P.d / 2 + .012); tower.add(hinge);
    box(hinge, [.074, .18, .014], [-side * .037, 0, 0], std('#5a1a12', {roughness: .45}));
    box(hinge, [.012, .012, .02], [-side * .06, 0, .01], M.gold);
    return {hinge, side};
  });
  box(tower, [.16, .2, .01], [P.x, doorY[0], P.d / 2 + .001], std('#120c08'));
  // The globe storey, open at the front: the celestial globe, half sunk in its case as Su Song's was.
  const G = B + 3 * P.tier + .02;
  box(tower, [P.w + .1, .05, P.d + .1], [P.x, G, 0], M.wood);
  box(tower, [P.w + .12, .03, P.d + .12], [P.x, G - .035, 0], beams);
  box(tower, [P.w - .08, .66, .04], [P.x, G + .35, -P.d / 2 + .06], walls);
  for (const side of [-1, 1]) box(tower, [.04, .66, P.d - .1], [P.x + side * (P.w / 2 - .06), G + .35, 0], walls);
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) column(P.x + sx * (P.w / 2 - .02), sz * (P.d / 2 - .02), G + .025, G + .68);
  box(tower, [.62, .2, .62], [P.x, G + .125, .05], M.darkWood);
  box(tower, [.66, .025, .66], [P.x, G + .235, .05], M.gold);
  const skyMap = canvas(1024, 512, (ctx, w, h) => {
    ctx.fillStyle = '#122244'; ctx.fillRect(0, 0, w, h);
    const r = kit.seeded(1092);
    // The twenty-eight lunar lodges, as lines from pole to pole.
    ctx.strokeStyle = 'rgba(232,197,110,.28)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 28; i++) { const x = i / 28 * w; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(232,197,110,.65)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, h / 2); ctx.lineTo(w, h / 2); ctx.stroke();
    ctx.strokeStyle = 'rgba(230,120,90,.6)'; ctx.lineWidth = 2.5; ctx.beginPath();
    for (let x = 0; x <= w; x += 8) ctx.lineTo(x, h / 2 - Math.sin(x / w * Math.PI * 2) * h * .13); ctx.stroke();
    for (let i = 0; i < 520; i++) { ctx.fillStyle = `rgba(255,236,200,${.25 + r() * .4})`; ctx.beginPath(); ctx.arc(r() * w, 20 + r() * (h - 40), .6 + r() * 1.2, 0, Math.PI * 2); ctx.fill(); }
    // His asterisms: stars as small rings joined by lines, as his printed charts drew them.
    for (let a = 0; a < 70; a++) {
      let x = r() * w, y = 30 + r() * (h - 60); const count = 3 + Math.floor(r() * 4), stars = [];
      for (let k = 0; k < count; k++) { stars.push([x, y]); x += (r() - .5) * 60; y += (r() - .5) * 40; }
      ctx.strokeStyle = 'rgba(232,197,110,.75)'; ctx.lineWidth = 1.6; ctx.beginPath(); stars.forEach(([sx, sy], k) => k ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy)); ctx.stroke();
      for (const [sx, sy] of stars) { ctx.fillStyle = '#f6e7c0'; ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#122244'; ctx.lineWidth = 1; ctx.stroke(); }
    }
  });
  const celestial = new THREE.Mesh(new THREE.SphereGeometry(.26, 48, 24), new THREE.MeshStandardMaterial({map: skyMap, roughness: .45}));
  celestial.position.set(P.x, G + .24, .05); celestial.rotation.z = .61; tower.add(celestial);
  // The deck, and on it the armillary sphere under a pavilion roof of its own.
  const D = G + .72;
  roof(P.x, D - .04, P.w + .3, P.d + .3, .08, {hole: .72, lift: .5});
  box(tower, [P.w + .06, .05, P.d + .06], [P.x, D, 0], stone);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) column(P.x + sx * .52, sz * .52, D + .025, D + .86);
  box(tower, [1.12, .05, 1.12], [P.x, D + .9, 0], beams);
  roof(P.x, D + .92, 1.75, 1.75, .4, {lift: .35});
  const armillary = new THREE.Group(); armillary.position.set(P.x, D + .45, 0); tower.add(armillary);
  const graduated = canvas(1024, 32, (ctx, w, h) => {
    ctx.fillStyle = '#9a7a44'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#3a2810'; for (let i = 0; i < 365; i++) { const x = i / 365 * w; ctx.fillRect(x, 0, 1.4, i % 10 ? 8 : 16); ctx.fillRect(x, h - (i % 10 ? 8 : 16), 1.4, i % 10 ? 8 : 16); }
  });
  const bands = new THREE.MeshStandardMaterial({map: graduated, metalness: .6, roughness: .35, side: THREE.DoubleSide});
  /** A bronze ring, a band graduated round its face, its axis along `normal`. */
  const ringBand = (parent, radius, normal) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, .028, 64, 1, true), bands);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...normal).normalize()); parent.add(m); return m;
  };
  // The fixed rings: the horizon, the meridian, and the equator, tilted to Kaifeng's latitude.
  const LATITUDE = 34.8 * Math.PI / 180;
  ringBand(armillary, .33, [0, 1, 0]); ringBand(armillary, .32, [1, 0, 0]);
  ringBand(armillary, .3, [0, Math.sin(LATITUDE), -Math.cos(LATITUDE)]);
  // The inner rings and their sighting tube, turning about the pole.
  const polar = new THREE.Group(); polar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, Math.sin(LATITUDE), Math.cos(LATITUDE))); armillary.add(polar);
  const sighting = new THREE.Group(); polar.add(sighting);
  ringBand(sighting, .26, [1, 0, 0]);
  { const tube = new THREE.Mesh(new THREE.CylinderGeometry(.013, .013, .5, 10), M.gold); tube.rotation.z = Math.PI / 2 - .5; sighting.add(tube); }
  { const axle = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .7, 6), bronze); polar.add(axle); }
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    // Bronze posts holding the horizon ring at four points.
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(.013, .02, .43, 8), bronze); leg.position.set(P.x + sx * .233, D + .24, sz * .233); tower.add(leg);
  }

  // The wheel house, laid open to the visitor: lattice behind, red columns, a roof.
  const H = {x: .74, w: 1.08, d: 1.25};
  box(tower, [H.w, 2.45, .05], [H.x, B + 1.225, -H.d / 2 + .05], walls);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) column(H.x + sx * H.w / 2, sz * H.d / 2, B, B + 2.45);
  box(tower, [H.w + .08, .06, .08], [H.x, B + 2.48, H.d / 2], beams); box(tower, [H.w + .08, .06, .08], [H.x, B + 2.48, -H.d / 2], beams);
  roof(H.x, B + 2.53, 1.5, 1.62, .42, {lift: .35});
  // The tank, banded, with water in it, and the bronze spout; below, the sump.
  box(tower, [.36, .3, .36], [H.x + .3, B + 2.12, .1], M.wood);
  for (const y of [B + 2.02, B + 2.22]) box(tower, [.37, .02, .37], [H.x + .3, y, .1], bronze);
  const tankWater = new THREE.Mesh(new THREE.PlaneGeometry(.32, .32), water); tankWater.rotation.x = -Math.PI / 2; tankWater.position.set(H.x + .3, B + 2.26, .1); tower.add(tankWater);
  { const spout = new THREE.Mesh(new THREE.CylinderGeometry(.018, .028, .2, 10), bronze); spout.rotation.z = Math.PI / 2; spout.position.set(H.x + .1, B + 2.0, .1); tower.add(spout); }
  box(tower, [.9, .14, .52], [H.x, B + .07, .1], M.wood);
  const ripples = canvas(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3d86b8'; ctx.fillRect(0, 0, w, h); const r = kit.seeded(5);
    ctx.strokeStyle = 'rgba(220,240,255,.45)'; ctx.lineWidth = 2;
    for (let i = 0; i < 18; i++) { ctx.beginPath(); ctx.ellipse(r() * w, r() * h, 10 + r() * 24, 3 + r() * 6, 0, 0, Math.PI * 2); ctx.stroke(); }
  });
  ripples.wrapS = ripples.wrapT = THREE.RepeatWrapping;
  const sump = new THREE.Mesh(new THREE.PlaneGeometry(.84, .46), new THREE.MeshStandardMaterial({map: ripples, roughness: .1, transparent: true, opacity: .9}));
  sump.rotation.x = -Math.PI / 2; sump.position.set(H.x, B + .13, .1); tower.add(sump);
  tankWater.material = sump.material;

  // The wheel: an iron-banded hub, two rims on twelve pairs of spokes, and thirty-six buckets between them.
  const WHEEL = {x: H.x, y: B + 1.12, z: .08, r: .52};
  const wheel = new THREE.Group(); wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z); tower.add(wheel);
  { const hub = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .2, 16), M.darkWood); hub.rotation.x = Math.PI / 2; wheel.add(hub);
    for (const z of [-.08, .08]) { const band = new THREE.Mesh(new THREE.CylinderGeometry(.079, .079, .02, 16), bronze); band.rotation.x = Math.PI / 2; band.position.z = z; wheel.add(band); }
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(.025, .025, H.d / 2 + .05, 10), bronze); axle.rotation.x = Math.PI / 2; axle.position.z = -H.d / 4; wheel.add(axle); }
  for (const z of [-.075, .075]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.r, .016, 6, 72), M.darkWood); rim.position.z = z; wheel.add(rim); }
  const o = new THREE.Object3D();
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(.02, WHEEL.r - .07, .024), M.wood, 24);
  for (let i = 0; i < 24; i++) {
    const a = (i % 12) * Math.PI / 6, z = i < 12 ? -.075 : .075, mid = (WHEEL.r + .07) / 2;
    o.position.set(Math.cos(a) * mid, Math.sin(a) * mid, z); o.rotation.set(0, 0, a - Math.PI / 2); o.updateMatrix(); spokes.setMatrixAt(i, o.matrix);
  }
  const buckets = new THREE.InstancedMesh(new THREE.BoxGeometry(.075, .07, .15), std('#5b3b24'), BUCKETS);
  // The water shows through the open front of each bucket, its level rising as it fills.
  const fills = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .055, .156), water, BUCKETS);
  for (let i = 0; i < BUCKETS; i++) {
    const a = i * STEP_ANGLE;
    o.position.set(Math.cos(a) * (WHEEL.r + .04), Math.sin(a) * (WHEEL.r + .04), 0); o.rotation.set(0, 0, 0); o.updateMatrix(); buckets.setMatrixAt(i, o.matrix);
  }
  for (const mesh of [spokes, buckets, fills]) { mesh.frustumCulled = false; wheel.add(mesh); }
  // The bucket under the spout sits a little right of the top; the wheel turns clockwise, so full buckets go down the right.
  // Bucket i sits at angle rotation + i steps; bucket 0 starts under the spout.
  const SPOUT = 77 * Math.PI / 180;
  state.rotation = SPOUT; wheel.rotation.z = state.rotation;
  // The water falling from the spout, running, and splashing where it lands.
  const bucketTop = new THREE.Vector3(WHEEL.x + Math.cos(SPOUT) * (WHEEL.r + .04), WHEEL.y + Math.sin(SPOUT) * (WHEEL.r + .04) + .035, WHEEL.z);
  const spoutAt = new THREE.Vector3(bucketTop.x, B + 1.99, WHEEL.z);
  const flow = canvas(16, 64, (ctx, w, h) => {
    ctx.fillStyle = 'rgba(120,190,235,.75)'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16) { ctx.fillStyle = 'rgba(235,248,255,.8)'; ctx.fillRect(3, y, w - 6, 5); }
  });
  flow.wrapT = THREE.RepeatWrapping; flow.repeat.set(1, 4);
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.011, .014, 1, 8, 1, true), new THREE.MeshBasicMaterial({map: flow, transparent: true, depthWrite: false}));
  stream.position.lerpVectors(spoutAt, bucketTop, .5); stream.scale.y = spoutAt.distanceTo(bucketTop); tower.add(stream);
  { const lip = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .04, 10), bronze); lip.position.copy(spoutAt).add(new THREE.Vector3(0, .01, 0)); tower.add(lip); }
  const DROPS = 10, dropAt = new Float32Array(DROPS * 3), drops = Array.from({length: DROPS}, (_, i) => ({t: i / DROPS, vx: 0, vz: 0, vy: 0}));
  const splash = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(dropAt, 3)),
    new THREE.PointsMaterial({size: .018, color: '#d8eeff', transparent: true, opacity: .85, depthWrite: false}));
  splash.frustumCulled = false; tower.add(splash);
  // The linkage. Under the filling bucket a weighing lever; from its end under the bucket a rod up to the
  // balance on the beam above, which a weight holds level; from the balance's other end a rod down to the
  // lock that holds the wheel at its rim. The full bucket presses the lever down, the rod pulls the balance
  // over, and its far end rises and lifts the lock.
  const lever = new THREE.Group(); lever.position.set(bucketTop.x - .2, bucketTop.y - .1, .2); tower.add(lever);
  box(lever, [.32, .022, .022], [.1, 0, 0], M.darkWood);
  box(lever, [.045, .02, .045], [.2, .02, 0], bronze);
  box(tower, [.03, .16, .03], [lever.position.x, lever.position.y - .08, .2], M.darkWood);
  const balance = new THREE.Group(); balance.position.set(WHEEL.x - .05, B + 1.9, .2); tower.add(balance);
  box(tower, [.05, .2, .05], [WHEEL.x - .05, B + 1.8, .2], M.darkWood);
  box(balance, [.66, .03, .03], [0, 0, 0], M.darkWood);
  box(balance, [.08, .08, .08], [-.29, -.04, 0], bronze);
  const stop = new THREE.Group(); stop.position.set(WHEEL.x - .42, WHEEL.y + .5, .2); tower.add(stop);
  box(stop, [.26, .03, .03], [.12, 0, 0], M.brass);
  box(stop, [.03, .07, .03], [.24, -.035, 0], M.brass);
  box(tower, [.03, .12, .03], [stop.position.x, stop.position.y - .06, .2], M.darkWood);
  const rodGeometry = new THREE.CylinderGeometry(.006, .006, 1, 6);
  const pull = new THREE.Mesh(rodGeometry, bronze), lift = new THREE.Mesh(rodGeometry, bronze); tower.add(pull, lift);
  const ATTACH = {lever: new THREE.Vector3(.2, 0, 0), balanceRight: new THREE.Vector3(bucketTop.x - balance.position.x, 0, 0),
    balanceLeft: new THREE.Vector3(-.22, 0, 0), stop: new THREE.Vector3(.15, 0, 0)};
  const ends = [new THREE.Vector3(), new THREE.Vector3()], up = new THREE.Vector3(0, 1, 0), along = new THREE.Vector3();
  /** A rod from where it hangs on one part to where it holds another, now. */
  function hang(rod, a, partA, b, partB) {
    partA.updateMatrix(); partB.updateMatrix();
    ends[0].copy(a).applyMatrix4(partA.matrix); ends[1].copy(b).applyMatrix4(partB.matrix);
    rod.position.copy(ends[0]).add(ends[1]).multiplyScalar(.5);
    along.subVectors(ends[1], ends[0]); rod.scale.y = along.length(); rod.quaternion.setFromUnitVectors(up, along.normalize());
  }
  function rods() { hang(pull, ATTACH.lever, lever, ATTACH.balanceRight, balance); hang(lift, ATTACH.balanceLeft, balance, ATTACH.stop, stop); }
  // The figure that comes out of the middle door of the lowest tier on the hour, and holds up its tablet.
  const jack = new THREE.Group(); jack.position.set(P.x, doorY[0] - .08, P.d / 2 - .1); tower.add(jack);
  const tablet = new THREE.Group(); jack.add(tablet);
  { const robe = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .14, 10), std('#2f5e3b')); robe.position.y = .07; jack.add(robe);
    const headBall = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), std('#e2c39a')); headBall.position.y = .17; jack.add(headBall);
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(.012, .03, .03, 8), std('#1b1410')); hat.position.y = .2; jack.add(hat);
    box(tablet, [.06, .08, .01], [0, .11, .05], M.ivory); }
  jack.visible = false;
  kit.moving(wheel, stream, balance, stop, jack, celestial, sighting, lever, pull, lift, splash, sump, ...leaves.map(l => l.hinge));
  for (const part of [wheel, balance, stop, jack, sighting, lever]) kit.settle(part, [spokes, buckets, fills]);
  rods();

  function placeFills() {
    for (let i = 0; i < BUCKETS; i++) {
      const f = state.fills[i];
      if (f <= 0) { o.position.set(0, 0, 0); o.scale.set(0, 0, 0); }
      else { const a = i * STEP_ANGLE; o.position.set(Math.cos(a) * (WHEEL.r + .04), Math.sin(a) * (WHEEL.r + .04) - .0275 * (1 - f), 0); o.scale.set(1, Math.max(f, .02), 1); }
      o.rotation.set(0, 0, 0); o.updateMatrix(); fills.setMatrixAt(i, o.matrix);
    }
    fills.instanceMatrix.needsUpdate = true;
  }
  /** Which bucket is under the spout now. */
  const underSpout = () => ((Math.round((SPOUT - state.rotation) / STEP_ANGLE) % BUCKETS) + BUCKETS) % BUCKETS;
  placeFills();

  // A press on the tower opens the panel.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(2.4, 3.6, 1.6), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.8; tower.add(proxy);
  kit.press(proxy, () => open(), 'Su Song’s clock tower');
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, p.tx, p.tz, [
      ['SU SONG’S CLOCK TOWER', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Kaifeng, 1092 · a model, much smaller', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Water fills a bucket; the bucket tips a balance;', .22, .033],
      ['the wheel turns one step and is caught again.', .27, .033],
      ['That is an escapement. Press here to stop', .32, .033],
      ['the water, or take the escapement away.', .37, .033],
      ['It runs here many times faster than the real one.', .45, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Su Song plaque');
  }

  // ── The bell ─────────────────────────────────────────────────────────
  // Struck on the hour while the panel is open, from a sound made here: no recording.
  let audio = null;
  function bell() {
    try {
      if (!audio) return;
      const now = audio.currentTime;
      for (const [freq, level] of [[392, .07], [784, .035], [1180, .02], [1568, .012]]) {
        const osc = audio.createOscillator(), gain = audio.createGain();
        osc.frequency.value = freq; osc.type = 'sine';
        gain.gain.setValueAtTime(level, now); gain.gain.exponentialRampToValueAtTime(.0001, now + 2.6);
        osc.connect(gain).connect(audio.destination); osc.start(now); osc.stop(now + 2.7);
      }
    } catch { /* no sound to be had */ }
  }

  // ── The panel ────────────────────────────────────────────────────────
  function drawWheel(ctx, cx, cy, r) {
    const spout = underSpout();
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
    for (let i = 0; i < BUCKETS; i++) {
      const a = state.rotation + i * STEP_ANGLE, x = cx + Math.cos(a) * r, y = cy - Math.sin(a) * r;
      ctx.strokeStyle = '#5b3b24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
      ctx.fillStyle = '#5b3b24'; ctx.fillRect(x - 11, y - 10, 22, 20);
      const f = i === spout ? state.fill : state.fills[i];
      if (f > 0) { ctx.fillStyle = '#4f9ccf'; ctx.fillRect(x - 9, y + 8 - 16 * f, 18, 16 * f); }
      if (i === spout) { ctx.strokeStyle = '#f4dca2'; ctx.lineWidth = 3; ctx.strokeRect(x - 13, y - 12, 26, 24); }
    }
    const sx = cx + Math.cos(SPOUT) * r, sy = cy - Math.sin(SPOUT) * r;
    ctx.fillStyle = '#8a6a3a'; ctx.fillRect(sx - 30, sy - 110, 70, 40);
    if (state.water) { ctx.fillStyle = '#4f9ccf'; ctx.fillRect(sx - 3, sy - 70, 6, 56); }
    ctx.fillStyle = '#c8bfa7'; ctx.font = '18px Arial'; ctx.textAlign = 'left';
    ctx.fillText('WATER IN', sx + 48, sy - 84); ctx.fillText('THE BUCKET FILLING', sx + 26, sy + 6);
    ctx.fillText('FULL BUCKETS', cx + r + 20, cy + 40); ctx.fillText('INTO THE SUMP', cx - 70, cy + r + 44);
  }
  function paintEscapement() {
    const {canvas, ctx} = board('SU SONG’S CLOCK TOWER · KAIFENG, 1092', 'The escapement');
    drawWheel(ctx, 290, 540, 190);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    const text = !state.water ? 'The water is stopped, so nothing moves: the clock has lost its power, and stands.'
      : !state.escapement ? 'Without the escapement the wheel simply runs while the water lasts: fast, unsteady and uncounted. It turns, but it keeps no time. This is the problem the escapement solves.'
        : 'Water runs steadily into the bucket under the spout. The wheel is held still by a stop until that bucket is heavy enough to tip a balance; then the stop lifts, the wheel turns by one bucket, and the next spoke is caught. Equal steps at equal intervals: the clock ticks.';
    wrapped(ctx, text, 500).slice(0, 9).forEach((line, i) => ctx.fillText(line, 640, 210 + i * 33));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial';
    ctx.fillText(`TICKS: ${state.ticks}   ·   HOURS STRUCK: ${state.hours}`, 640, 560);
    ctx.fillStyle = '#c8bfa7'; ctx.font = '21px Georgia';
    wrapped(ctx, 'Every mechanical clock since has had an escapement of some kind, from the pendulum to the vibrating quartz in a watch. Su Song’s came about two centuries before any known in Europe.', 500)
      .slice(0, 5).forEach((line, i) => ctx.fillText(line, 640, 610 + i * 29));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Su Song’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  function paintTower() {
    const {canvas, ctx} = board('SU SONG’S CLOCK TOWER · KAIFENG, 1092', 'A tower that kept the sky’s time');
    ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
    let y = 200;
    for (const paragraph of [
      'The real tower stood some twelve metres high. Its water-driven wheel turned three things: an armillary sphere on the roof, for sighting the stars; a celestial globe inside, which turned in step with the sky; and figures at the doors of a five-storey pagoda that came out to ring bells, beat drums, strike gongs and hold up tablets showing the hour.',
      'Invaders took the tower apart in 1127, and no one could make it run again. It survives because Su Song wrote it all down: a book with detailed drawings of every part, from which working reconstructions have been built. The same book holds the earliest surviving printed star charts.'
    ]) { for (const line of wrapped(ctx, paragraph, 1080)) { ctx.fillText(line, 60, y); y += 34; } y += 24; }
    ctx.fillStyle = '#c8bfa7'; ctx.font = '21px Georgia';
    ctx.fillText('This model shows the parts in their places, smaller and far faster than life.', 60, 900, 1080);
    ctx.fillStyle = '#d9bc7d'; ctx.textAlign = 'right'; ctx.fillText('Read Su Song’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  kit.panel(id, {
    paint: () => state.page === 'tower' ? paintTower() : paintEscapement(),
    zones: () => [{x: 640, y: 945, w: 520, h: 40, label: 'Su Song’s story', fn: () => kit.story(id)}],
    actions: () => state.page === 'tower' ? [['← THE ESCAPEMENT', () => setPage('escapement')], ['CLOSE', kit.close]]
      : [[state.escapement ? 'REMOVE ESCAPEMENT' : 'PUT IT BACK', () => setEscapement(!state.escapement), state.escapement ? undefined : '#6a5a2c'],
        [state.water ? 'STOP THE WATER' : 'START THE WATER', () => setWater(!state.water), state.water ? undefined : '#6a5a2c'],
        ['THE TOWER →', () => setPage('tower')], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function open() {
    try { audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.(); } catch { audio = null; }
    state.page = 'escapement'; kit.open(id);
  }
  function setPage(page) { state.page = page; kit.redraw(); }
  function setWater(on) { state.water = on; kit.redraw(); }
  function setEscapement(on) {
    state.escapement = on;
    // Back in place, the stop catches the nearest spoke.
    if (on) { state.rotation = SPOUT - Math.round((SPOUT - state.rotation) / STEP_ANGLE) * STEP_ANGLE; state.stepping = -1; state.fill = 0; wheel.rotation.z = state.rotation; }
    kit.redraw();
  }
  function tick() {
    state.ticks++;
    // The celestial globe and the armillary follow the wheel, a small turn a tick, gliding there.
    state.sky += .05;
    if (state.ticks % HOUR === 0) { state.hours++; state.jack = 0; if (kit.showing() === id) bell(); }
    if (kit.showing() === id && state.page === 'escapement') kit.redraw();
  }

  return {
    id,
    update(dt) {
      state.clock += dt;
      stream.visible = state.water;
      let weigh = 0, release = 0;
      if (state.water && state.escapement) {
        if (state.stepping < 0) {
          state.fill = Math.min(1, state.fill + dt / FILL);
          state.fills[underSpout()] = state.fill;
          weigh = state.fill;
          if (state.fill >= 1) state.stepping = 0;
        } else {
          // The balance tips, the lock lifts, the wheel turns one bucket, and is caught.
          state.stepping = Math.min(1, state.stepping + dt / STEP);
          const t = state.stepping;
          weigh = 1; release = Math.sin(t * Math.PI);
          wheel.rotation.z = state.rotation - STEP_ANGLE * (1 - (1 - t) ** 3);
          if (t >= 1) { state.rotation -= STEP_ANGLE; state.stepping = -1; state.fill = 0; state.caught = 0; tick(); }
        }
        // Caught, the wheel jolts against the lock and settles.
        if (state.stepping < 0) {
          state.caught = Math.min(1, state.caught + dt / .45);
          wheel.rotation.z = state.rotation + STEP_ANGLE * .07 * Math.exp(-7 * state.caught) * Math.sin(state.caught * 22);
        }
      } else if (state.water) {
        // No escapement: the wheel just runs, and the water spills from buckets that never stay to fill.
        state.rotation -= dt * 1.8; wheel.rotation.z = state.rotation;
        state.sky += dt * 1.5; release = 1;
        state.fills.fill(0);
      }
      lever.rotation.z = -.05 * weigh - .1 * release;
      balance.rotation.z = -.04 * weigh - .16 * release;
      stop.rotation.z = .45 * release;
      rods();
      // Full buckets carry their water down the right side and empty at the bottom.
      for (let i = 0; i < BUCKETS; i++) if (state.fills[i] > 0 && i !== underSpout()) {
        const a = ((state.rotation + i * STEP_ANGLE) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (a > Math.PI * 1.35 && a < Math.PI * 1.6) state.fills[i] = 0;
      }
      placeFills();
      // The globe and the rings glide to where the ticks have sent them.
      state.skyShown += (state.sky - state.skyShown) * Math.min(1, dt * 3);
      celestial.rotation.y = state.skyShown; sighting.rotation.y = state.skyShown;
      // Water running down the stream, splashing where it lands, and stirring the sump and the tank.
      flow.offset.y = (flow.offset.y + dt * 2.2) % 1;
      ripples.offset.set((state.clock * .03) % 1, (state.clock * .017) % 1);
      splash.visible = state.water;
      drops.forEach((d, i) => {
        d.t += dt / .45;
        if (d.t >= 1) { d.t %= 1; d.vx = (Math.random() - .5) * .5; d.vz = (Math.random() - .5) * .4; d.vy = .3 + Math.random() * .35; }
        const s = d.t * .45;
        dropAt.set([bucketTop.x + d.vx * s, bucketTop.y + d.vy * s - 4.9 * s * s, bucketTop.z + d.vz * s], i * 3);
      });
      splash.geometry.attributes.position.needsUpdate = true;
      // On the hour: the doors swing open, the figure comes out and lifts its tablet, goes in, and the doors close.
      if (state.jack >= 0) {
        state.jack += dt;
        const j = state.jack, doors = j < .6 ? smooth(j / .6) : j < 3.4 ? 1 : Math.max(0, 1 - (j - 3.4) / .6);
        const out = j < .5 ? 0 : j < 1.1 ? smooth((j - .5) / .6) : j < 2.8 ? 1 : Math.max(0, 1 - (j - 2.8) / .6);
        for (const {hinge, side} of leaves) hinge.rotation.y = side * doors * 1.9;
        jack.visible = out > 0; jack.position.z = P.d / 2 - .1 + out * .17;
        tablet.position.y = j > 1.2 && j < 2.7 ? .04 * smooth(Math.min(1, (j - 1.2) / .3)) * smooth(Math.min(1, (2.7 - j) / .3)) : 0;
        if (j > 4) { state.jack = -1; jack.visible = false; for (const {hinge} of leaves) hinge.rotation.y = 0; }
      }
    },
    getState: () => ({water: state.water, escapement: state.escapement, ticks: state.ticks, hours: state.hours, page: state.page, fill: state.fill,
      doors: Math.round(Math.abs(leaves[0].hinge.rotation.y) * 100) / 100}),
    targets: () => ({susong: tower.localToWorld(new THREE.Vector3(0, 1.4, 0)).toArray()}),
    open, setWater, setEscapement, setPage,
    /** Strike the hour now: the doors open and the figure comes out. For the guide and the tests. */
    strike: () => { state.jack = 0; if (kit.showing() === id) bell(); }
  };
}
