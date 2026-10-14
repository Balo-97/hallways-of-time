/**
 * Continental drift, and the engine found for it fifty years later.
 *
 * In 1912 Alfred Wegener argued that the continents move: their coasts fit,
 * the same fossils and rocks continue across the oceans, and ice scoured
 * lands that now lie in the tropics. Geologists would not have it, for want
 * of a force, until the 1960s, when the seafloor's magnetic stripes showed it
 * spreading from the ridges like a conveyor belt.
 *
 * Two pieces stand together. A library globe on a walnut stand, on which South
 * America can be lifted and wound back against Africa, turned 57° about a pole
 * near the Azores — the fit Bullard, Everett and Smith computed in 1965, at the
 * edge of the continental shelf, which the globe shows — while the fossil
 * grounds of Mesosaurus, Cynognathus and Glossopteris close up across the seam
 * and glow where they meet. And a glass tank with a slice of ocean floor in it,
 * cut open at the front: magma rising under the ridge, new seafloor made at
 * its crest and carried outward, and in it a record of the Earth's magnetic
 * field, in stripes that mirror each other on either side. The field flips on
 * its own at uneven intervals; the visitor can flip it too, and watch the
 * needle of the gauge swing over and the record take it down.
 */
import {GEO} from '../coastlines.js';

// The fit of South America to Africa (Bullard, Everett and Smith, 1965).
const FIT = {lat: 44, lon: -30.6, angle: 57};
// Where each fossil is found, in a few places along its ground, as [lat, lon].
const FOSSILS = {
  mesosaurus: {name: 'Mesosaurus', what: 'a small freshwater reptile', color: '#3f8f5a',
    america: [[-22, -50], [-25, -51], [-28, -53], [-31, -55]], africa: [[-24, 16], [-26, 18], [-28, 20], [-30, 22]]},
  cynognathus: {name: 'Cynognathus', what: 'a land reptile the size of a wolf', color: '#c8743a',
    america: [[-31, -67], [-34, -67], [-37, -66]], africa: [[-29, 25], [-31, 26], [-32, 28]]},
  glossopteris: {name: 'Glossopteris', what: 'a seed fern of cold swamps', color: '#7ba24a',
    america: [[-20, -46], [-26, -49], [-30, -52]], africa: [[-22, 28], [-26, 29], [-29, 30]]}
};
const STEPS = 4;      // the fit, wound in quarters
const GLIDE = 1.6;    // seconds for a quarter
const smooth = s => s * s * (3 - 2 * s);

export function createContinentalDrift(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'wegener';
  const deg = Math.PI / 180;
  const state = {step: 0, shown: 0, from: 0, glide: 1, mode: 'fit', polarity: 1, flipIn: 4, stripes: [], made: 0, flips: 0,
    clock: 0, flash: 0, needle: 0, swing: 0};
  /** A place on the globe: the same mapping three.js's sphere uses for its texture. */
  const at = (lat, lon) => new THREE.Vector3(Math.cos(lat * deg) * Math.cos(lon * deg), Math.sin(lat * deg), -Math.cos(lat * deg) * Math.sin(lon * deg));
  const axis = at(FIT.lat, FIT.lon);
  const wall = kit.onWall(angle, kit.STAGE);
  const turned = (parent, profile, material, segments = 32) => {
    const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material); parent.add(m); return m;
  };
  const glowMap = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,255,255,.5)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); return kit.texture(c);
  })();
  /** Lettering round a ring, `from` and `to` in degrees clockwise from the front; upright to a visitor standing in front. */
  function aroundRing(ctx, cx, cy, r, text, middle) {
    const a = middle * deg, x = cx - Math.sin(a) * r, y = cy + Math.cos(a) * r;
    ctx.save(); ctx.translate(x, y); ctx.rotate(a + (Math.cos(a) < 0 ? Math.PI : 0)); ctx.fillText(text, 0, 0); ctx.restore();
  }

  // ── The globe, on a library stand ────────────────────────────────────
  const stand = new THREE.Group(); stand.position.x = -1.3; wall.add(stand);
  const RADIUS = .55, CENTRE = 1.42, HORIZON = {inner: RADIUS + .08, outer: RADIUS + .25, y: 1.42 - .12};
  const LEG = (HORIZON.inner + HORIZON.outer) / 2;
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2, leg = new THREE.Group(); leg.position.set(Math.cos(a) * LEG, 0, Math.sin(a) * LEG); stand.add(leg);
    turned(leg, [[0, 0], [.05, 0], [.055, .03], [.04, .06], [.03, .12], [.046, .2], [.03, .29], [.022, .52], [.03, .82], [.042, .92], [.026, 1.0],
      [.021, HORIZON.y - .2], [.034, HORIZON.y - .12], [.03, HORIZON.y - .03], [0, HORIZON.y - .03]], M.darkWood, 16);
  }
  // Stretchers crossing low between the legs, and a compass rose where they meet.
  for (const turn of [Math.PI / 4, -Math.PI / 4]) box(stand, [LEG * 2, .045, .05], [0, .24, 0], M.darkWood).rotation.y = turn;
  turned(stand, [[0, .2], [.1, .2], [.11, .24], [.1, .27], [0, .27]], M.darkWood, 24);
  {
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d');
    ctx.fillStyle = '#e9dcc0'; ctx.beginPath(); ctx.arc(128, 128, 128, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4, long = i % 2 ? 70 : 118;
      ctx.fillStyle = i % 2 ? '#8a6a3a' : '#7a2a1e'; ctx.beginPath();
      ctx.moveTo(128, 128); ctx.lineTo(128 + Math.sin(a - .18) * 26, 128 - Math.cos(a - .18) * 26); ctx.lineTo(128 + Math.sin(a) * long, 128 - Math.cos(a) * long);
      ctx.lineTo(128 + Math.sin(a + .18) * 26, 128 - Math.cos(a + .18) * 26); ctx.fill();
    }
    const rose = new THREE.Mesh(new THREE.CircleGeometry(.095, 40), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .6}));
    rose.rotation.x = -Math.PI / 2; rose.position.y = .272; stand.add(rose);
  }
  // The horizon ring: a printed paper ring, edged in walnut, a little below the globe's middle so the South Atlantic stands clear of it.
  {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const ctx = c.getContext('2d'), k = 512 / HORIZON.outer;
    const ri = HORIZON.inner * k;
    ctx.fillStyle = '#ecdfc2'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#4a3420'; ctx.fillStyle = '#4a3420';
    for (const r of [ri + 4, ri + 34, ri + 74, 508]) { ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(512, 512, r, 0, Math.PI * 2); ctx.stroke(); }
    for (let d = 0; d < 360; d += 5) {
      const a = d * deg, r0 = ri + 4, r1 = ri + (d % 30 ? 18 : 34);
      ctx.lineWidth = d % 30 ? 1.5 : 3; ctx.beginPath(); ctx.moveTo(512 - Math.sin(a) * r0, 512 + Math.cos(a) * r0); ctx.lineTo(512 - Math.sin(a) * r1, 512 + Math.cos(a) * r1); ctx.stroke();
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = 'italic 26px Georgia';
    ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
      .forEach((month, i) => aroundRing(ctx, 512, 512, ri + 54, month, i * 30 + 15));
    ctx.font = '600 34px Georgia'; ctx.fillStyle = '#7a2a1e';
    [['S', 0], ['W', 90], ['N', 180], ['E', 270]].forEach(([point, at]) => aroundRing(ctx, 512, 512, ri + 106, point, at));
    ctx.fillStyle = '#4a3420'; ctx.font = 'italic 22px Georgia';
    for (let i = 0; i < 4; i++) aroundRing(ctx, 512, 512, ri + 106, '· · ✦ · ·', i * 90 + 45);
    const paper = new THREE.Mesh(new THREE.RingGeometry(HORIZON.inner, HORIZON.outer, 96, 1), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .8}));
    paper.rotation.x = -Math.PI / 2; paper.position.y = HORIZON.y + .001; stand.add(paper);
    for (const r of [HORIZON.inner, HORIZON.outer]) {
      const edge = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .035, 96, 1, true), M.darkWood); edge.material = M.darkWood;
      edge.position.y = HORIZON.y - .016; stand.add(edge);
    }
    const under = new THREE.Mesh(new THREE.RingGeometry(HORIZON.inner, HORIZON.outer, 96, 1), M.darkWood);
    under.rotation.x = Math.PI / 2; under.position.y = HORIZON.y - .033; stand.add(under);
  }
  const globe = new THREE.Group(); globe.position.y = CENTRE; stand.add(globe);
  // Turned so the South Atlantic faces the visitor, tipped up toward their eye, north still up.
  const earth = new THREE.Group(); globe.add(earth);
  earth.quaternion.setFromUnitVectors(at(-24, -12), new THREE.Vector3(0, .42, 1).normalize());
  // The brass meridian, through both poles, seen whole round the globe, on a post from the stretchers.
  {
    const north = new THREE.Vector3(0, 1, 0).applyQuaternion(earth.quaternion);
    const across = new THREE.Vector3(1, 0, 0), normal = new THREE.Vector3().crossVectors(north, across).normalize();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + .035, .013, 6, 96), M.brass);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal); globe.add(ring);
    for (const end of [1, -1]) {
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .05, 8), M.brass);
      pin.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), north); pin.position.copy(north).multiplyScalar(end * (RADIUS + .015)); globe.add(pin);
    }
    // The meridian's lowest point, where the post meets it.
    const down = north.clone().sub(across.clone().multiplyScalar(north.dot(across))).normalize();
    const low = down.y > 0 ? down.clone().negate() : down.clone(), bottom = low.multiplyScalar(RADIUS + .035);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.018, .028, CENTRE + bottom.y - .27, 12), M.brass);
    post.position.set(bottom.x, (CENTRE + bottom.y + .27) / 2, bottom.z); stand.add(post);
  }

  // The globe's face: deep ocean, pale shelves along every coast, a graticule, lettered land.
  const W = 2048, H = 1024, px = lon => (lon + 180) / 360 * W, py = lat => (90 - lat) / 180 * H;
  /** Trace each coastline ring of `names`, unwrapped across the date line and closed over a pole if it runs right round, and `draw` it. */
  function coasts(ctx, names, draw) {
    for (const name of names) {
      const flat = GEO[name], points = []; let previous = null;
      for (let i = 0; i < flat.length; i += 2) {
        let lon = flat[i];
        if (previous !== null) { while (lon - previous > 180) lon -= 360; while (previous - lon > 180) lon += 360; }
        previous = lon; points.push([lon, flat[i + 1]]);
      }
      const lons = points.map(p => p[0]), pole = Math.max(...lons) - Math.min(...lons) > 270 ? (points[0][1] < 0 ? -90 : 90) : null;
      for (const offset of [-360, 0, 360]) {
        ctx.beginPath();
        points.forEach(([lon, lat], i) => i ? ctx.lineTo(px(lon + offset), py(lat)) : ctx.moveTo(px(lon + offset), py(lat)));
        if (pole !== null) { ctx.lineTo(px(points[points.length - 1][0] + offset), py(pole)); ctx.lineTo(px(points[0][0] + offset), py(pole)); }
        ctx.closePath(); draw(ctx, pole !== null);
      }
    }
  }
  /** The land of `names`, flecked and shaded, on a sheet of its own. */
  function land(names, seed) {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    coasts(ctx, names, ctx => { ctx.fillStyle = '#ad9262'; ctx.fill(); });
    ctx.globalCompositeOperation = 'source-atop';
    const r = kit.seeded(seed);
    for (let i = 0; i < 60; i++) {
      const x = r() * W, y = H * .1 + r() * H * .8, size = 30 + r() * 120, g = ctx.createRadialGradient(x, y, 0, x, y, size);
      const tone = r() < .5 ? '120,128,78' : '150,108,64';
      g.addColorStop(0, `rgba(${tone},.35)`); g.addColorStop(1, `rgba(${tone},0)`); ctx.fillStyle = g; ctx.fillRect(x - size, y - size, size * 2, size * 2);
    }
    for (let i = 0; i < 9000; i++) { ctx.fillStyle = r() < .5 ? 'rgba(70,50,30,.12)' : 'rgba(240,220,170,.1)'; ctx.fillRect(r() * W, r() * H, 1 + r() * 3, 1 + r() * 2); }
    ctx.globalCompositeOperation = 'source-over';
    coasts(ctx, names, (ctx, polar) => { if (!polar) { ctx.strokeStyle = 'rgba(70,46,24,.75)'; ctx.lineWidth = 2.5; ctx.stroke(); } });
    return c;
  }
  const shelf = (ctx, names) => coasts(ctx, names, (ctx, polar) => {
    if (polar) return;
    ctx.lineJoin = 'round'; ctx.strokeStyle = 'rgba(86,160,180,.55)'; ctx.lineWidth = 26; ctx.stroke();
    ctx.strokeStyle = 'rgba(120,190,200,.7)'; ctx.lineWidth = 11; ctx.stroke();
  });
  function fossilMarks(ctx, side) {
    for (const f of Object.values(FOSSILS)) for (const [lat, lon] of f[side]) {
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(px(lon), py(lat), 13, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#f6eedc'; ctx.lineWidth = 3; ctx.stroke();
    }
  }
  const letter = (ctx, text, lat, lon, size, color, spacing = 8) => {
    ctx.font = `italic ${size}px Georgia`; ctx.letterSpacing = `${spacing}px`; ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(text, px(lon), py(lat)); ctx.letterSpacing = '0px';
  };
  const sheet = (draw, radius, transparent) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    draw(ctx);
    const map = kit.texture(c); map.anisotropy = 4;
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), new THREE.MeshStandardMaterial({map, roughness: .55, transparent, depthWrite: !transparent}));
    earth.add(mesh); return mesh;
  };
  // The ocean and every continent that stays; South America is on a shell of its own.
  const others = Object.keys(GEO).filter(name => name !== 'samerica');
  sheet(ctx => {
    const ocean = ctx.createLinearGradient(0, 0, 0, H); ocean.addColorStop(0, '#0a2234'); ocean.addColorStop(.5, '#16567a'); ocean.addColorStop(1, '#0a2234');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H);
    shelf(ctx, others);
    ctx.strokeStyle = 'rgba(214,186,120,.32)'; ctx.lineWidth = 1.5;
    for (let lon = -180; lon <= 180; lon += 15) { ctx.beginPath(); ctx.moveTo(px(lon), 0); ctx.lineTo(px(lon), H); ctx.stroke(); }
    for (let lat = -75; lat <= 75; lat += 15) { ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(232,200,130,.6)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, py(0)); ctx.lineTo(W, py(0)); ctx.stroke();
    ctx.setLineDash([10, 9]); ctx.lineWidth = 2;
    for (const lat of [23.44, -23.44]) { ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.drawImage(land(others, 1912), 0, 0);
    fossilMarks(ctx, 'africa');
    letter(ctx, 'ATLANTIC', -7, -24, 30, 'rgba(226,214,180,.8)', 10);
    letter(ctx, 'OCEAN', -12, -24, 30, 'rgba(226,214,180,.8)', 10);
    letter(ctx, 'AFRICA', 8, 18, 30, 'rgba(60,40,22,.85)');
  }, RADIUS, false);
  const america = sheet(ctx => {
    shelf(ctx, ['samerica']);
    ctx.drawImage(land(['samerica'], 1965), 0, 0);
    fossilMarks(ctx, 'america');
    letter(ctx, 'SOUTH', -6, -60, 22, 'rgba(60,40,22,.85)', 6); letter(ctx, 'AMERICA', -11, -60, 22, 'rgba(60,40,22,.85)', 6);
  }, RADIUS * 1.006, true);
  // Where the fossils lie, as points of light that come up as the ocean closes.
  const fossilGlow = (parent, side, radius) => {
    const positions = [], colors = [], tint = new THREE.Color();
    for (const f of Object.values(FOSSILS)) for (const [lat, lon] of f[side]) { positions.push(...at(lat, lon).multiplyScalar(radius).toArray()); colors.push(...tint.set(f.color).toArray()); }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    const points = new THREE.Points(geometry, new THREE.PointsMaterial({size: .07, map: glowMap, vertexColors: true, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending}));
    parent.add(points); return points;
  };
  const glows = [fossilGlow(earth, 'africa', RADIUS * 1.01), fossilGlow(america, 'america', RADIUS * 1.01)];
  // The globe can be pressed to open the panel.
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(RADIUS + .08, 16, 12), new THREE.MeshBasicMaterial({visible: false}));
  globe.add(proxy); kit.press(proxy, () => open('fit'), 'Continental drift globe');

  // ── The ridge: a slice of ocean floor in a glass tank ────────────────
  const ridge = new THREE.Group(); ridge.position.x = 1.35; wall.add(ridge);
  const TABLE = {w: 2.1, d: .9, y: .8}, HALF = TABLE.w / 2, CRUST = .075, TOP = TABLE.y + .5;
  // The cabinet: mahogany, on a plinth, with panels and a gilt edge.
  box(ridge, [TABLE.w + .2, .07, TABLE.d + .2], [0, .035, 0], M.darkWood);
  box(ridge, [TABLE.w + .1, TABLE.y - .1, TABLE.d + .1], [0, .07 + (TABLE.y - .1) / 2, 0], M.wood);
  box(ridge, [TABLE.w + .18, .035, TABLE.d + .18], [0, TABLE.y - .012, 0], M.gold);
  for (const x of [-.7, .7]) box(ridge, [.62, .42, .012], [x, .4, TABLE.d / 2 + .055], M.darkWood);
  // The seafloor's height across the slice: a ridge in the middle with a rift down its crest, deepening away.
  const floorAt = x => TABLE.y + .2 + .13 * Math.exp(-((x / .3) ** 2)) - .03 * Math.exp(-((x / .04) ** 2)) - .03 * (x / HALF) ** 2;
  // The magnetic record: one strip of texture, the newest seafloor at its left end and the oldest at its right.
  const record = document.createElement('canvas'); record.width = 1024; record.height = 4;
  const recordMap = kit.texture(record);
  const SHADES = {normal: '#22262d', reversed: '#ebe5d4'};
  function paintRecord() {
    const ctx = record.getContext('2d'), k = record.width / HALF;
    ctx.fillStyle = state.polarity > 0 ? SHADES.normal : SHADES.reversed; ctx.fillRect(0, 0, record.width, 4);
    for (const s of state.stripes) { ctx.fillStyle = s.polarity > 0 ? SHADES.normal : SHADES.reversed; ctx.fillRect(s.offset * k, 0, STRIPE * k + .6, 4); }
    recordMap.needsUpdate = true;
  }
  {
    // The top of the seafloor and, down the cut face, the crust: both carry the record, mirrored about the crest.
    const N = 200, positions = [], uvs = [], index = [];
    const quad = (a, b, c, d) => index.push(a, b, c, b, d, c);
    for (let i = 0; i <= N; i++) {
      const x = -HALF + 2 * HALF * i / N, y = floorAt(x), u = Math.abs(x) / HALF;
      positions.push(x, y, -TABLE.d / 2, x, y, TABLE.d / 2); uvs.push(u, 0, u, 1);
      if (i) quad((i - 1) * 2, (i - 1) * 2 + 1, i * 2, i * 2 + 1);
    }
    const front = positions.length / 3;
    for (let i = 0; i <= N; i++) {
      const x = -HALF + 2 * HALF * i / N, y = floorAt(x), u = Math.abs(x) / HALF;
      positions.push(x, y, TABLE.d / 2, x, y - CRUST, TABLE.d / 2); uvs.push(u, 1, u, 0);
      if (i) quad(front + (i - 1) * 2 + 1, front + (i - 1) * 2, front + i * 2 + 1, front + i * 2);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(index); geometry.computeVertexNormals();
    ridge.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({map: recordMap, roughness: .75, side: THREE.DoubleSide})));
  }
  // Below the crust, the mantle, cut open: a chamber of magma under the crest, and the slow currents that carry the floor apart.
  {
    const shape = new THREE.Shape(); shape.moveTo(-HALF, TABLE.y); shape.lineTo(HALF, TABLE.y);
    for (let i = 100; i >= 0; i--) { const x = -HALF + 2 * HALF * i / 100; shape.lineTo(x, floorAt(x) - CRUST); }
    const geometry = new THREE.ShapeGeometry(shape), p = geometry.attributes.position, uv = geometry.attributes.uv, tall = .36;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + HALF) / (2 * HALF), (p.getY(i) - TABLE.y) / tall);
    const c = document.createElement('canvas'); c.width = 1024; c.height = 256; const ctx = c.getContext('2d');
    const depth = ctx.createLinearGradient(0, 0, 0, 256); depth.addColorStop(0, '#3c1a10'); depth.addColorStop(1, '#8c3014');
    ctx.fillStyle = depth; ctx.fillRect(0, 0, 1024, 256);
    const r = kit.seeded(1963);
    for (let i = 0; i < 2500; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '20,8,4' : '200,90,40'},.12)`; ctx.fillRect(r() * 1024, r() * 256, 2 + r() * 4, 1 + r() * 3); }
    const plume = ctx.createLinearGradient(0, 256, 0, 60); plume.addColorStop(0, 'rgba(255,120,40,0)'); plume.addColorStop(1, 'rgba(255,140,50,.55)');
    ctx.fillStyle = plume; ctx.beginPath(); ctx.moveTo(470, 256); ctx.quadraticCurveTo(500, 140, 470, 80); ctx.lineTo(554, 80); ctx.quadraticCurveTo(524, 140, 554, 256); ctx.fill();
    const chamber = ctx.createRadialGradient(512, 92, 4, 512, 92, 70); chamber.addColorStop(0, 'rgba(255,224,140,1)'); chamber.addColorStop(.35, 'rgba(255,140,40,.9)'); chamber.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = chamber; ctx.save(); ctx.translate(512, 92); ctx.scale(1.6, .7); ctx.translate(-512, -92); ctx.beginPath(); ctx.arc(512, 92, 70, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    // The currents: up under the crest, out beneath the floor on both sides, and down again.
    ctx.strokeStyle = 'rgba(255,214,170,.42)'; ctx.fillStyle = 'rgba(255,214,170,.42)'; ctx.lineWidth = 5;
    for (const side of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(512 + side * 40, 230); ctx.bezierCurveTo(512 + side * 60, 150, 512 + side * 140, 120, 512 + side * 330, 128);
      ctx.bezierCurveTo(512 + side * 450, 132, 512 + side * 470, 190, 512 + side * 430, 236); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(512 + side * 330, 116); ctx.lineTo(512 + side * 360, 128); ctx.lineTo(512 + side * 330, 140); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,226,190,.75)'; ctx.font = 'italic 20px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('magma rises', 512, 200); ctx.fillText('the mantle', 160, 236); ctx.fillText('the mantle', 864, 236);
    const section = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({map: kit.texture(c)}));
    section.position.z = TABLE.d / 2; ridge.add(section);
    const back = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: '#2a160e', side: THREE.DoubleSide}));
    back.position.z = -TABLE.d / 2; ridge.add(back);
    for (const side of [-1, 1]) box(ridge, [.012, floorAt(side * HALF) - TABLE.y, TABLE.d], [side * HALF, (floorAt(side * HALF) + TABLE.y) / 2, 0], M.darkWood);
  }
  // The crest, where the new floor is made: a seam that glows, and sparks of magma rising to it.
  const crest = new THREE.Mesh(new THREE.BoxGeometry(.024, .01, TABLE.d - .01), new THREE.MeshBasicMaterial({color: '#ff8a3c'}));
  crest.position.y = floorAt(0) + .003; ridge.add(crest);
  const SPARKS = 18, sparkAt = new Float32Array(SPARKS * 3), sparks = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(sparkAt, 3)),
    new THREE.PointsMaterial({size: .045, map: glowMap, color: '#ffa04a', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  sparks.frustumCulled = false; ridge.add(sparks);
  const sparkLife = Array.from({length: SPARKS}, (_, i) => ({t: i / SPARKS, x: 0}));
  // The water, filling the tank down to the floor, and the glass that holds it.
  {
    const shape = new THREE.Shape(); shape.moveTo(-HALF, TOP);
    for (let i = 0; i <= 100; i++) { const x = -HALF + 2 * HALF * i / 100; shape.lineTo(x, floorAt(x) + .002); }
    shape.lineTo(HALF, TOP); shape.lineTo(-HALF, TOP);
    const geometry = new THREE.ExtrudeGeometry(shape, {depth: TABLE.d, bevelEnabled: false}); geometry.translate(0, 0, -TABLE.d / 2);
    const water = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({color: '#3b86b4', transparent: true, opacity: .16, roughness: .05, metalness: .1, depthWrite: false}));
    water.renderOrder = 2; ridge.add(water);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(ridge, [.03, TOP - TABLE.y + .02, .03], [sx * (HALF + .01), (TOP + TABLE.y) / 2 + .01, sz * (TABLE.d / 2 + .01)], M.gold);
    for (const side of [-1, 1]) {
      box(ridge, [TABLE.w + .05, .025, .025], [0, TOP + .02, side * (TABLE.d / 2 + .01)], M.gold);
      box(ridge, [.025, .025, TABLE.d + .05], [side * (HALF + .01), TOP + .02, 0], M.gold);
    }
  }
  const ripples = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256; const ctx = c.getContext('2d'), r = kit.seeded(71);
    ctx.strokeStyle = 'rgba(220,240,255,.35)'; ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) { const x = r() * 256, y = r() * 256, w = 20 + r() * 50; ctx.beginPath(); ctx.ellipse(x, y, w, w * .25, 0, 0, Math.PI * (.6 + r() * .8)); ctx.stroke(); }
    const map = kit.texture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(3, 1.3); return map;
  })();
  const surface = new THREE.Mesh(new THREE.PlaneGeometry(TABLE.w, TABLE.d), new THREE.MeshBasicMaterial({map: ripples, transparent: true, opacity: .5, depthWrite: false}));
  surface.rotation.x = -Math.PI / 2; surface.position.y = TOP - .003; surface.renderOrder = 3; ridge.add(surface);
  // The gauge on the cabinet's front: which way the Earth's field points now.
  const gauge = new THREE.Group(); gauge.position.set(0, .44, TABLE.d / 2 + .06); ridge.add(gauge);
  {
    const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
    ctx.fillStyle = '#efe5cc'; ctx.beginPath(); ctx.arc(256, 256, 256, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#4a3420'; ctx.lineWidth = 3; for (const r of [240, 200]) { ctx.beginPath(); ctx.arc(256, 256, r, 0, Math.PI * 2); ctx.stroke(); }
    for (let d = 0; d < 360; d += 10) { const a = d * deg; ctx.lineWidth = d % 90 ? 2 : 4; ctx.beginPath(); ctx.moveTo(256 + Math.sin(a) * 200, 256 - Math.cos(a) * 200); ctx.lineTo(256 + Math.sin(a) * (d % 90 ? 222 : 238), 256 - Math.cos(a) * (d % 90 ? 222 : 238)); ctx.stroke(); }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#7a2a1e'; ctx.font = '600 52px Georgia'; ctx.fillText('N', 256, 140); ctx.fillStyle = '#4a3420'; ctx.fillText('S', 256, 376);
    ctx.font = '600 22px Arial'; ctx.fillText('THE FIELD AS NOW', 256, 92); ctx.fillText('REVERSED', 256, 426);
    const face = new THREE.Mesh(new THREE.CircleGeometry(.15, 48), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .6})); gauge.add(face);
    const bezel = new THREE.Mesh(new THREE.TorusGeometry(.155, .014, 8, 48), M.brass); gauge.add(bezel);
    // Two plates either side of it: what the stripes mean, and what the tank shows.
    const plate = lines => {
      const c = document.createElement('canvas'); c.width = 1024; c.height = 680; const lx = c.getContext('2d');
      lx.fillStyle = '#23303b'; lx.fillRect(0, 0, 1024, 680); lx.strokeStyle = '#c9a664'; lx.lineWidth = 4; lx.strokeRect(14, 14, 996, 652);
      lines(lx); return kit.texture(c);
    };
    plane(ridge, .58, .385, [-.7, .42, TABLE.d / 2 + .062], plate(lx => {
      lx.fillStyle = '#e1c393'; lx.font = '600 50px Arial'; lx.fillText('THE STRIPES', 60, 110);
      lx.fillStyle = SHADES.normal; lx.fillRect(60, 190, 110, 80); lx.strokeStyle = '#c9a664'; lx.lineWidth = 3; lx.strokeRect(60, 190, 110, 80);
      lx.fillStyle = SHADES.reversed; lx.fillRect(60, 330, 110, 80);
      lx.fillStyle = '#f1ddba'; lx.font = '46px Georgia'; lx.fillText('the field as it', 200, 222); lx.fillText('points now', 200, 270); lx.fillText('the field', 200, 362); lx.fillText('reversed', 200, 410);
      lx.fillStyle = '#c8b793'; lx.font = 'italic 40px Georgia'; lx.fillText('Each stripe is floor that cooled', 60, 520); lx.fillText('while the field pointed one way.', 60, 572);
    }));
    plane(ridge, .58, .385, [.7, .42, TABLE.d / 2 + .062], plate(lx => {
      lx.fillStyle = '#e1c393'; lx.font = '600 50px Arial'; lx.fillText('THE SLICE', 60, 110);
      lx.fillStyle = '#f1ddba'; lx.font = '44px Georgia';
      ['Magma rises under the crest', 'and cools into new floor,', 'which spreads both ways,', 'oldest at the edges.'].forEach((line, i) => lx.fillText(line, 60, 210 + i * 62));
      lx.fillStyle = '#c8b793'; lx.font = 'italic 40px Georgia'; lx.fillText('The gauge shows the field now.', 60, 520); lx.fillText('Press the tank to flip it yourself.', 60, 572);
    }));
  }
  const needle = new THREE.Group(); needle.position.z = .012; gauge.add(needle);
  {
    const half = (color, flip) => {
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(.022, 0); shape.lineTo(0, .125); shape.lineTo(-.022, 0); shape.lineTo(0, 0);
      const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({color, roughness: .4, metalness: .3})); if (flip) m.rotation.z = Math.PI; needle.add(m);
    };
    half('#b23a2e', false); half('#e8e2d2', true);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(.014, .014, .012, 16), M.brass); cap.rotation.x = Math.PI / 2; cap.position.z = .006; needle.add(cap);
  }
  kit.moving(america, needle, crest, surface, ...glows, sparks);
  plane(ridge, TABLE.w, .3, [0, TOP + .32, -TABLE.d / 2 - .06], kit.lettering(TABLE.w, .3, [
    ['A MID-OCEAN RIDGE', .1, .07, '#e1c393', '600 #px Arial, sans-serif'],
    ['New seafloor made at the crest and carried outward; the oldest at the edges', .21, .045, '#f1ddba', 'italic #px Georgia, serif']], '#23303b'));
  const tableProxy = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, TOP - TABLE.y + .3, TABLE.d), new THREE.MeshBasicMaterial({visible: false}));
  tableProxy.position.y = (TOP + TABLE.y) / 2; ridge.add(tableProxy);
  kit.press(tableProxy, () => open('engine'), 'Spreading ridge');
  const STRIPE = .045, SPEED = .06;
  // Start with a record already laid down, as a real ridge has.
  for (let offset = HALF - STRIPE; offset >= 0; offset -= STRIPE) state.stripes.push({offset, polarity: Math.sin(offset * 9.7) + Math.sin(offset * 23) > 0 ? 1 : -1});
  paintRecord();

  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, 0, 0, [
      ['CONTINENTAL DRIFT', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Wegener, 1912 · the seafloor, 1960s', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['On the globe, wind South America back to', .22, .033],
      ['Africa and watch the coasts and fossils meet.', .27, .033],
      ['At the ridge, flip the Earth’s field and watch', .32, .033],
      ['the seafloor record it, the same on both sides.', .37, .033],
      ['The fit: Bullard, Everett and Smith, 1965.', .45, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open('fit'), 'Continental drift plaque');
  }

  // ── The panels ───────────────────────────────────────────────────────
  /** The two continents seen face on, South America turned by `turn` of the fit. */
  function drawFit(ctx, cx, cy, r, turn) {
    const view = new THREE.Quaternion().setFromUnitVectors(at(-15, -12), new THREE.Vector3(0, 0, 1));
    const spin = new THREE.Quaternion().setFromAxisAngle(axis, turn * FIT.angle * deg);
    const project = (lat, lon, moved) => {
      const v = at(lat, lon); if (moved) v.applyQuaternion(spin); v.applyQuaternion(view);
      return v.z > 0 ? [cx + v.x * r, cy - v.y * r] : null;
    };
    ctx.fillStyle = '#123f5c'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
    for (const [name, moved] of [['africa', false], ['samerica', true]]) {
      const flat = GEO[name];
      ctx.beginPath(); let started = false;
      for (let i = 0; i < flat.length; i += 2) { const p = project(flat[i + 1], flat[i], moved); if (!p) continue; started ? ctx.lineTo(...p) : ctx.moveTo(...p); started = true; }
      ctx.closePath(); ctx.fillStyle = moved ? '#a88d5c' : '#9c8458'; ctx.fill(); ctx.strokeStyle = '#f4dca2'; ctx.lineWidth = 2; ctx.stroke();
    }
    for (const f of Object.values(FOSSILS)) for (const [side, moved] of [['america', true], ['africa', false]]) for (const [lat, lon] of f[side]) {
      const p = project(lat, lon, moved); if (!p) continue;
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, Math.PI * 2); ctx.fill();
    }
  }
  function paintFit() {
    const turn = state.step / STEPS;
    const {canvas, ctx} = board('CONTINENTAL DRIFT · WEGENER, 1912', turn ? `The Atlantic, ${Math.round(turn * 100)}% closed` : 'Close the Atlantic');
    drawFit(ctx, 300, 470, 260, turn);
    let y = 236;
    for (const f of Object.values(FOSSILS)) {
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(652, y - 8, 9, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1e5d0'; ctx.font = '22px Georgia'; ctx.fillText(`${f.name}, ${f.what}`, 672, y, 470); y += 34;
    }
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    const text = state.step === STEPS
      ? 'Closed. The coasts fit, and each fossil’s ground runs on from one continent into the other: found on both sides of an ocean, and nowhere else, because there was no ocean.'
      : 'Wegener saw that the coasts would fit. Then the fossils: the same small reptiles and seed ferns on both sides of the Atlantic, which none of them could have crossed. Close the ocean and watch their grounds meet.';
    wrapped(ctx, text, 500).slice(0, 8).forEach((line, i) => ctx.fillText(line, 640, 370 + i * 33));
    ctx.fillStyle = '#c8bfa7'; ctx.font = '21px Georgia';
    wrapped(ctx, 'He had it right, and the force wrong; geologists refused it for fifty years. The fit drawn here is the one computed in 1965 at the edge of the continental shelf, drawn pale on the globe round every coast.', 1080).slice(0, 2)
      .forEach((line, i) => ctx.fillText(line, 60, 818 + i * 30));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Wegener’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  function paintEngine() {
    const {canvas, ctx} = board('PLATE TECTONICS · THE 1960s', 'The engine Wegener lacked');
    // The ridge's record as it stands, drawn across the panel.
    const x0 = 600, scale = 520 / HALF;
    ctx.fillStyle = '#0d1014'; ctx.fillRect(60, 200, 1080, 170);
    for (const s of state.stripes) for (const side of [-1, 1]) {
      ctx.fillStyle = s.polarity > 0 ? SHADES.normal : SHADES.reversed;
      ctx.fillRect(x0 + side * s.offset * scale - (side < 0 ? STRIPE * scale : 0), 210, STRIPE * scale + .5, 150);
    }
    ctx.fillStyle = '#ff8a3c'; ctx.fillRect(x0 - 3, 200, 6, 170);
    ctx.fillStyle = '#c8bfa7'; ctx.font = '19px Arial';
    ctx.fillText('← OLDER', 70, 396); ctx.textAlign = 'center'; ctx.fillText('THE RIDGE: NEW SEAFLOOR', x0, 396); ctx.textAlign = 'right'; ctx.fillText('OLDER →', 1130, 396); ctx.textAlign = 'left';
    ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
    wrapped(ctx, 'Lava rising at a mid-ocean ridge cools into new seafloor, and its iron sets in the direction of the Earth’s magnetic field. Every so often the field flips. The floor spreads outward from the ridge, so it carries a striped record of the flips away on both sides — a mirror image, which nothing but spreading explains.', 1080)
      .slice(0, 5).forEach((line, i) => ctx.fillText(line, 60, 450 + i * 34));
    wrapped(ctx, `You have flipped the field ${state.flips} time${state.flips === 1 ? '' : 's'}. Real ridges spread about as fast as fingernails grow, and nowhere on Earth is the ocean floor older than about 180 million years: the oldest is drawn back down into the Earth.`, 1080)
      .slice(0, 3).forEach((line, i) => ctx.fillText(line, 60, 640 + i * 34));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read plate tectonics in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  kit.panel(id, {
    paint: () => state.mode === 'engine' ? paintEngine() : paintFit(),
    zones: () => [{x: 640, y: 945, w: 520, h: 40, label: state.mode === 'engine' ? 'Plate tectonics’ story' : 'Wegener’s story', fn: () => kit.story(state.mode === 'engine' ? 'plate' : 'wegener')}],
    actions: () => state.mode === 'engine'
      ? [['FLIP THE FIELD', flip, '#6a5a2c'], ['← THE FIT', () => setMode('fit')], ['CLOSE', kit.close]]
      : [['← OPEN', () => wind(-1)], ['CLOSE IT →', () => wind(1)], ['THE ENGINE', () => setMode('engine')], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function open(mode = 'fit') { state.mode = mode; kit.open(id); }
  function setMode(mode) { state.mode = mode; kit.redraw(); }
  /** Wind the fit a quarter on or back: South America lifts, glides there, and settles. */
  function wind(delta) {
    const step = Math.max(0, Math.min(STEPS, state.step + delta));
    if (step !== state.step) { state.step = step; state.from = state.shown; state.glide = 0; }
    kit.redraw();
  }
  function reverse() { state.polarity *= -1; state.flash = 1; }
  function flip() { reverse(); state.flips++; state.flipIn = 6 + Math.random() * 6; if (kit.showing() === id) kit.redraw(); }
  const spin = new THREE.Quaternion();

  return {
    id,
    update(dt) {
      state.clock += dt;
      // South America lifts a little off the globe, glides to the chosen step of the fit, and settles.
      if (state.glide < 1) {
        state.glide = Math.min(1, state.glide + dt / GLIDE);
        const target = state.step / STEPS;
        state.shown = state.from + (target - state.from) * smooth(state.glide);
        america.quaternion.copy(spin.setFromAxisAngle(axis, state.shown * FIT.angle * deg));
        america.scale.setScalar(1 + .028 * Math.sin(Math.PI * state.glide));
      }
      // Closed, the fossil grounds light up where they meet, and keep a slow glow.
      const closed = state.shown ** 4;
      for (const g of glows) g.material.opacity = closed * (.55 + .35 * Math.sin(state.clock * 2.4));
      // The seafloor spreads; a new stripe is made at the ridge whenever the last has moved a stripe's width.
      for (const s of state.stripes) s.offset += SPEED * dt;
      while (state.stripes.length && state.stripes[0].offset > HALF) state.stripes.shift();
      const newest = state.stripes[state.stripes.length - 1];
      if (!newest || newest.offset >= STRIPE) { state.stripes.push({offset: newest ? newest.offset - STRIPE : 0, polarity: state.polarity}); state.made++; }
      // Left alone, the field flips on its own, at uneven intervals, as the real one does.
      state.flipIn -= dt; if (state.flipIn <= 0) { reverse(); state.flipIn = 5 + Math.random() * 8; }
      paintRecord();
      // The needle swings over and settles, a little past and back, as a needle does.
      const goal = state.polarity > 0 ? 0 : Math.PI;
      state.swing += ((goal - state.needle) * 26 - state.swing * 5.5) * Math.min(dt, .05);
      state.needle += state.swing * Math.min(dt, .05);
      needle.rotation.z = state.needle;
      // The crest glows, and flares when the field turns over.
      state.flash = Math.max(0, state.flash - dt * 1.2);
      crest.material.color.setRGB(1, .54 + .12 * Math.sin(state.clock * 5) + .4 * state.flash, .24 + .7 * state.flash);
      sparkLife.forEach((s, i) => {
        s.t += dt / 1.6;
        if (s.t >= 1) { s.t -= 1; s.x = (Math.random() - .5) * .07; }
        const y = TABLE.y + .17 + (floorAt(0) - TABLE.y - .17) * s.t;
        sparkAt.set([s.x * (1 - s.t), y, TABLE.d / 2 + .004], i * 3);
      });
      sparks.geometry.attributes.position.needsUpdate = true;
      ripples.offset.set((state.clock * .012) % 1, (state.clock * .007) % 1);
    },
    getState: () => ({mode: state.mode, step: state.step, closed: state.step === STEPS, settled: state.glide >= 1, polarity: state.polarity, flips: state.flips,
      stripes: state.stripes.length, made: state.made, needle: Math.round(state.needle * 100) / 100}),
    targets: () => ({globe: globe.localToWorld(new THREE.Vector3()).toArray(), ridge: ridge.localToWorld(new THREE.Vector3(0, TABLE.y, 0)).toArray()}),
    open, wind, flip, setMode
  };
}
