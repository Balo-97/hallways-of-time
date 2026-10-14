/**
 * Continental drift, and the engine found for it fifty years later.
 *
 * In 1912 Alfred Wegener argued that the continents move: their coasts fit,
 * the same fossils and rocks continue across the oceans, and ice scoured
 * lands that now lie in the tropics. Geologists would not have it, for want
 * of a force, until the 1960s, when the seafloor's magnetic stripes showed it
 * spreading from the ridges like a conveyor belt.
 *
 * Two pieces stand together. A globe on which South America can be wound back
 * against Africa, turned 57° about a pole near the Azores — the fit Bullard,
 * Everett and Smith computed in 1965 — while the fossil grounds of Mesosaurus,
 * Cynognathus and Glossopteris close up across the seam. And a model ridge,
 * where new seafloor is made in the middle and carried outward, taking with it
 * a record of the Earth's magnetic field in stripes that mirror each other on
 * either side: the visitor can flip the field, and watch the record grow.
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
const STEPS = 4;   // the fit, wound in quarters

export function createContinentalDrift(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'wegener';
  const deg = Math.PI / 180;
  const state = {step: 0, shown: 0, mode: 'fit', polarity: 1, flipIn: 4, stripes: [], made: 0, flips: 0};
  /** A place on the globe: the same mapping three.js's sphere uses for its texture. */
  const at = (lat, lon) => new THREE.Vector3(Math.cos(lat * deg) * Math.cos(lon * deg), Math.sin(lat * deg), -Math.cos(lat * deg) * Math.sin(lon * deg));
  const axis = at(FIT.lat, FIT.lon);

  // ── The globe ────────────────────────────────────────────────────────
  const wall = kit.onWall(angle, 4.6);
  const stand = new THREE.Group(); stand.position.x = -1.3; wall.add(stand);
  box(stand, [.8, .1, .8], [0, .05, 0], M.slate);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.07, .1, .75, 16), M.brass); column.position.y = .45; stand.add(column);
  const RADIUS = .55;
  const globe = new THREE.Group(); globe.position.y = 1.42; stand.add(globe);
  const meridian = new THREE.Mesh(new THREE.TorusGeometry(RADIUS + .05, .012, 6, 72, Math.PI * 1.3), M.brass);
  meridian.rotation.z = -Math.PI * .65 + Math.PI / 2; globe.add(meridian);
  // Turned so the South Atlantic faces the visitor, north still up.
  const earth = new THREE.Group(); globe.add(earth);
  earth.quaternion.setFromUnitVectors(at(-18, -12), new THREE.Vector3(0, .18, 1).normalize());
  /** Paint coastline rings, unwrapped across the date line, closed over a pole if they run right round. */
  function paint(ctx, W, H, names, fill, stroke) {
    const px = lon => (lon + 180) / 360 * W, py = lat => (90 - lat) / 180 * H;
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
        ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 3; ctx.stroke();
      }
    }
    return {px, py};
  }
  function fossilMarks(ctx, px, py, side) {
    for (const f of Object.values(FOSSILS)) for (const [lat, lon] of f[side]) {
      ctx.fillStyle = f.color; ctx.beginPath(); ctx.arc(px(lon), py(lat), 9, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 1.5; ctx.stroke();
    }
  }
  const W = 2048, H = 1024;
  const layer = (draw, radius, transparent) => {
    const c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    draw(ctx);
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 96, 48), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .7, transparent, depthWrite: !transparent}));
    earth.add(mesh); return mesh;
  };
  // The ocean, the continents that stay, and South America on a shell of its own.
  layer(ctx => {
    const ocean = ctx.createLinearGradient(0, 0, 0, H); ocean.addColorStop(0, '#0b2335'); ocean.addColorStop(.5, '#17587a'); ocean.addColorStop(1, '#0b2335');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H);
    const others = Object.keys(GEO).filter(name => name !== 'samerica');
    const {px, py} = paint(ctx, W, H, others, '#9c8458', '#efd49a');
    fossilMarks(ctx, px, py, 'africa');
  }, RADIUS, false);
  const america = layer(ctx => {
    const {px, py} = paint(ctx, W, H, ['samerica'], '#a88d5c', '#f4dca2');
    fossilMarks(ctx, px, py, 'america');
  }, RADIUS * 1.006, true);
  // The globe and its base can be pressed to open the panel.
  const proxy = new THREE.Mesh(new THREE.SphereGeometry(RADIUS + .08, 16, 12), new THREE.MeshBasicMaterial({visible: false}));
  globe.add(proxy); kit.press(proxy, () => open('fit'), 'Continental drift globe');

  // ── The ridge: new seafloor, and the stripes it carries ──────────────
  const ridge = new THREE.Group(); ridge.position.x = 1.35; wall.add(ridge);
  const TABLE = {w: 2.1, d: 1.0, y: .82};
  box(ridge, [TABLE.w + .1, TABLE.y, TABLE.d + .1], [0, TABLE.y / 2, 0], M.slate);
  box(ridge, [TABLE.w + .16, .04, TABLE.d + .16], [0, TABLE.y + .02, 0], M.gold);
  box(ridge, [.05, .04, TABLE.d], [0, TABLE.y + .06, 0], new THREE.MeshBasicMaterial({color: '#ff8a3c'}));   // the glowing crest
  const STRIPE = .045, SPEED = .06, HALF = TABLE.w / 2 - .02;
  const stripeMaterial = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .55});
  const stripes = new THREE.InstancedMesh(new THREE.BoxGeometry(STRIPE, .03, TABLE.d - .04), stripeMaterial, 2 * Math.ceil(HALF / STRIPE + 2));
  stripes.frustumCulled = false; ridge.add(stripes);
  // A compass beside it, its needle showing which way the field points now.
  const dial = new THREE.Group(); dial.position.set(0, TABLE.y + .05, TABLE.d / 2 + .18); ridge.add(dial);
  const face = new THREE.Mesh(new THREE.CylinderGeometry(.12, .12, .02, 32), M.ivory); dial.add(face);
  const needle = new THREE.Group(); needle.position.y = .02; dial.add(needle);
  box(needle, [.03, .012, .1], [0, 0, -.05], new THREE.MeshBasicMaterial({color: '#b23a2e'}));
  box(needle, [.03, .012, .1], [0, 0, .05], new THREE.MeshBasicMaterial({color: '#e8e2d2'}));
  kit.moving(america, needle);
  plane(ridge, TABLE.w, .3, [0, TABLE.y + .45, -TABLE.d / 2 - .02], kit.lettering(TABLE.w, .3, [
    ['A MID-OCEAN RIDGE', .1, .07, '#e1c393', '600 #px Arial, sans-serif'],
    ['New seafloor in the middle; the oldest at the edges. Black: the field as it is now', .21, .045, '#f1ddba', 'italic #px Georgia, serif']], '#23303b'));
  const tableProxy = new THREE.Mesh(new THREE.BoxGeometry(TABLE.w, .4, TABLE.d), new THREE.MeshBasicMaterial({visible: false}));
  tableProxy.position.y = TABLE.y + .2; ridge.add(tableProxy);
  kit.press(tableProxy, () => open('engine'), 'Spreading ridge');
  const o = new THREE.Object3D(), tint = new THREE.Color();
  function placeStripes() {
    let n = 0;
    for (const s of state.stripes) for (const side of [-1, 1]) {
      o.position.set(side * (s.offset + STRIPE / 2), TABLE.y + .055, 0); o.updateMatrix();
      stripes.setMatrixAt(n, o.matrix); stripes.setColorAt(n, tint.set(s.polarity > 0 ? '#20242b' : '#ece6d6')); n++;
    }
    stripes.count = n; stripes.instanceMatrix.needsUpdate = true; if (stripes.instanceColor) stripes.instanceColor.needsUpdate = true;
  }
  // Start with a record already laid down, as a real ridge has.
  for (let offset = HALF - STRIPE; offset >= 0; offset -= STRIPE) state.stripes.push({offset, polarity: Math.sin(offset * 9.7) + Math.sin(offset * 23) > 0 ? 1 : -1});
  placeStripes();

  const centre = kit.inRoom(wall, 0, 0); kit.medallion(centre.x, centre.z);
  {
    const p = kit.inRoom(wall, 0, 2.2);
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
    wrapped(ctx, 'He had it right, and the force wrong; geologists refused it for fifty years. The fit drawn here is the one computed in 1965 at the edge of the continental shelf.', 1080).slice(0, 2)
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
      ctx.fillStyle = s.polarity > 0 ? '#20242b' : '#ece6d6';
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
  function wind(delta) { state.step = Math.max(0, Math.min(STEPS, state.step + delta)); kit.redraw(); }
  function flip() { state.polarity *= -1; state.flips++; state.flipIn = 6 + Math.random() * 6; if (kit.showing() === id) kit.redraw(); }
  const spin = new THREE.Quaternion();

  return {
    id,
    update(dt) {
      // South America glides to the chosen step of the fit.
      const target = state.step / STEPS;
      if (Math.abs(state.shown - target) > 1e-4) {
        state.shown += (target - state.shown) * Math.min(1, dt * 2.5);
        if (Math.abs(state.shown - target) < .002) state.shown = target;
        america.quaternion.copy(spin.setFromAxisAngle(axis, state.shown * FIT.angle * deg));
      }
      // The seafloor spreads; a new stripe is made at the ridge whenever the last has moved a stripe's width.
      for (const s of state.stripes) s.offset += SPEED * dt;
      while (state.stripes.length && state.stripes[0].offset > HALF) state.stripes.shift();
      const newest = state.stripes[state.stripes.length - 1];
      if (!newest || newest.offset >= STRIPE) { state.stripes.push({offset: newest ? newest.offset - STRIPE : 0, polarity: state.polarity}); state.made++; }
      // Left alone, the field flips on its own, at uneven intervals, as the real one does.
      state.flipIn -= dt; if (state.flipIn <= 0) { state.polarity *= -1; state.flipIn = 5 + Math.random() * 8; }
      needle.rotation.y += ((state.polarity > 0 ? 0 : Math.PI) - needle.rotation.y) * Math.min(1, dt * 4);
      placeStripes();
    },
    getState: () => ({mode: state.mode, step: state.step, closed: state.step === STEPS, polarity: state.polarity, flips: state.flips,
      stripes: state.stripes.length, made: state.made}),
    targets: () => ({globe: globe.localToWorld(new THREE.Vector3()).toArray(), ridge: ridge.localToWorld(new THREE.Vector3(0, TABLE.y, 0)).toArray()}),
    open, wind, flip, setMode
  };
}
