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
 * A scale model stands with its wheel laid open. Water runs, buckets fill, the
 * balance tips and the wheel steps; the globe and the sphere turn with it, and
 * on the hour a figure comes to its door. Its panel lets the visitor stop the
 * water, or take the escapement away and watch the wheel simply run.
 */
const BUCKETS = 36, FILL = 3.2, STEP = .55, HOUR = 6;   // seconds to fill a bucket, to step; ticks to an hour, all much faster than life
const STEP_ANGLE = Math.PI * 2 / BUCKETS;

export function createSuSongClock(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'susong';
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .55, ...extra});
  const lacquer = std('#9b2f22'), tiles = std('#33403b', {roughness: .7}), bronze = std('#8a6a3a', {metalness: .6, roughness: .35});
  const water = new THREE.MeshStandardMaterial({color: '#4f9ccf', roughness: .15, metalness: .1, transparent: true, opacity: .8});
  const state = {water: true, escapement: true, fill: 0, stepping: -1, rotation: 0, ticks: 0, hours: 0, jack: -1, page: 'escapement', fills: new Array(BUCKETS).fill(0), free: 0};

  // ── The tower ────────────────────────────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  const tower = new THREE.Group(); wall.add(tower);
  box(tower, [2.7, .16, 2.0], [0, .08, 0], M.ivory);
  box(tower, [2.8, .03, 2.1], [0, .175, 0], M.gold);
  const B = .19;   // the top of the base
  /** A hipped roof of tiles: a four-sided pyramid stretched to the storey's plan. */
  const roof = (x, y, w, d, h) => {
    const m = new THREE.Mesh(new THREE.ConeGeometry(Math.SQRT1_2, h, 4, 1), tiles);
    m.rotation.y = Math.PI / 4; m.scale.set(w, 1, d); m.position.set(x, y + h / 2, 0);
    const holder = new THREE.Group(); holder.add(m); tower.add(holder); return m;
  };
  // The pagoda storey, with three tiers of doors where the figures appear.
  const P = {x: -.55, w: 1.3, d: 1.3};
  box(tower, [P.w, 1.15, P.d], [P.x, B + .575, 0], lacquer);
  const doorY = [B + .33, B + .64, B + .95], doorMaterial = std('#1b1410');
  for (const y of doorY) {
    box(tower, [P.w + .16, .04, P.d + .16], [P.x, y + .16, 0], tiles);
    for (const dx of [-.38, 0, .38]) box(tower, [.16, .2, .02], [P.x + dx, y, P.d / 2 + .005], doorMaterial);
  }
  // The globe storey, open at the front: a celestial globe that turns with the sky.
  const G = B + 1.15;
  box(tower, [P.w + .2, .05, P.d + .2], [P.x, G + .02, 0], tiles);
  box(tower, [P.w - .1, .8, .05], [P.x, G + .45, -P.d / 2 + .08], lacquer);
  for (const side of [-1, 1]) box(tower, [.05, .8, P.d - .1], [P.x + side * (P.w / 2 - .08), G + .45, 0], lacquer);
  for (const side of [-1, 1]) box(tower, [.07, .8, .07], [P.x + side * (P.w / 2 - .08), G + .45, P.d / 2 - .08], M.gold);
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 512; skyCanvas.height = 256;
  {
    const ctx = skyCanvas.getContext('2d'); ctx.fillStyle = '#16264a'; ctx.fillRect(0, 0, 512, 256);
    let s = 1092; const r = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,236,190,${.5 + r() * .5})`; ctx.beginPath(); ctx.arc(r() * 512, 20 + r() * 216, .8 + r() * 1.8, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(232,197,110,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 128); ctx.lineTo(512, 128); ctx.stroke();
  }
  const celestial = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 16), new THREE.MeshStandardMaterial({map: kit.texture(skyCanvas), roughness: .5}));
  celestial.position.set(P.x, G + .45, .1); celestial.rotation.z = .4; tower.add(celestial);
  // The roof deck, and the armillary sphere on it under a raised roof.
  const D = G + .9;
  box(tower, [P.w + .26, .06, P.d + .26], [P.x, D, 0], tiles);
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) box(tower, [.05, .95, .05], [P.x + sx * .58, D + .5, sz * .58], M.wood);
  roof(P.x, D + .97, 1.7, 1.7, .42);
  const armillary = new THREE.Group(); armillary.position.set(P.x, D + .45, 0); tower.add(armillary);
  const ring = (r, rotation) => { const m = new THREE.Mesh(new THREE.TorusGeometry(r, .012, 6, 48), bronze); m.rotation.set(...rotation); armillary.add(m); return m; };
  ring(.32, [Math.PI / 2, 0, 0]); ring(.32, [0, 0, 0]); ring(.3, [Math.PI / 2 - .6, 0, 0]);
  const sighting = new THREE.Group(); armillary.add(sighting);
  { const m = new THREE.Mesh(new THREE.TorusGeometry(.26, .01, 6, 40), M.gold); sighting.add(m);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .5, 8), M.gold); tube.rotation.z = Math.PI / 2; sighting.add(tube); }
  box(tower, [.06, .3, .06], [P.x, D + .15, 0], bronze);

  // The wheel house, laid open to the visitor.
  const H = {x: .72, w: 1.05, d: 1.25};
  box(tower, [H.w, 2.5, .05], [H.x, B + 1.25, -H.d / 2 + .05], lacquer);
  for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1]]) box(tower, [.07, 2.5, .07], [H.x + sx * H.w / 2, B + 1.25, sz * H.d / 2], M.gold);
  roof(H.x, B + 2.5, 1.35, 1.5, .38);
  // The tank and its spout, high on the right; and the sump below.
  box(tower, [.34, .3, .34], [H.x + .3, B + 2.12, .1], M.wood);
  box(tower, [.16, .05, .06], [H.x + .18, B + 2.0, .1], M.wood);
  box(tower, [.85, .12, .5], [H.x, B + .1, .1], M.wood);
  box(tower, [.8, .01, .45], [H.x, B + .165, .1], water);
  // The wheel: hub, rim, spokes and buckets, turning about an axle toward the visitor.
  const WHEEL = {x: H.x, y: B + 1.12, z: .08, r: .52};
  const wheel = new THREE.Group(); wheel.position.set(WHEEL.x, WHEEL.y, WHEEL.z); tower.add(wheel);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .3, 16), M.darkWood); axle.rotation.x = Math.PI / 2; wheel.add(axle);
  for (const z of [-.07, .07]) { const rim = new THREE.Mesh(new THREE.TorusGeometry(WHEEL.r, .014, 6, 72), M.darkWood); rim.position.z = z; wheel.add(rim); }
  const o = new THREE.Object3D();
  const spokes = new THREE.InstancedMesh(new THREE.BoxGeometry(.016, WHEEL.r, .02), M.wood, BUCKETS);
  const buckets = new THREE.InstancedMesh(new THREE.BoxGeometry(.075, .07, .15), std('#5b3b24'), BUCKETS);
  // The water shows through the open front of each bucket, its level rising as it fills.
  const fills = new THREE.InstancedMesh(new THREE.BoxGeometry(.06, .055, .156), water, BUCKETS);
  for (let i = 0; i < BUCKETS; i++) {
    const a = i * STEP_ANGLE;
    o.position.set(Math.cos(a) * WHEEL.r / 2, Math.sin(a) * WHEEL.r / 2, 0); o.rotation.set(0, 0, a - Math.PI / 2); o.scale.set(1, 1, 1); o.updateMatrix(); spokes.setMatrixAt(i, o.matrix);
    o.position.set(Math.cos(a) * (WHEEL.r + .04), Math.sin(a) * (WHEEL.r + .04), 0); o.rotation.set(0, 0, 0); o.updateMatrix(); buckets.setMatrixAt(i, o.matrix);
  }
  for (const mesh of [spokes, buckets, fills]) { mesh.frustumCulled = false; wheel.add(mesh); }
  // The bucket under the spout sits a little right of the top; the wheel turns clockwise, so full buckets go down the right.
  // Bucket i sits at angle rotation + i steps; bucket 0 starts under the spout.
  const SPOUT = 77 * Math.PI / 180;
  state.rotation = SPOUT; wheel.rotation.z = state.rotation;
  // The water falling from the spout.
  const stream = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, 1, 8), water);
  const spoutAt = new THREE.Vector3(H.x + .12, B + 1.98, WHEEL.z), bucketTop = new THREE.Vector3(WHEEL.x + Math.cos(SPOUT) * (WHEEL.r + .04), WHEEL.y + Math.sin(SPOUT) * (WHEEL.r + .04) + .035, WHEEL.z);
  stream.position.lerpVectors(spoutAt, bucketTop, .5); stream.scale.y = spoutAt.distanceTo(bucketTop); stream.position.x = bucketTop.x; tower.add(stream);
  spoutAt.x = bucketTop.x;
  // The balance: a beam on a post, one end over the filling bucket, a weight on the other.
  const balance = new THREE.Group(); balance.position.set(WHEEL.x - .15, B + 1.88, .2); tower.add(balance);
  box(tower, [.05, .2, .05], [WHEEL.x - .15, B + 1.79, .2], M.darkWood);
  box(balance, [.62, .03, .03], [.12, 0, 0], M.darkWood);
  box(balance, [.08, .08, .08], [-.17, -.04, 0], bronze);
  box(balance, [.012, .16, .012], [bucketTop.x - balance.position.x, -.08, 0], M.brass);   // down to the filling bucket
  // The stop that holds a spoke until the balance lets it go.
  const stop = new THREE.Group(); stop.position.set(WHEEL.x - .5, WHEEL.y + .48, .16); tower.add(stop);
  box(stop, [.26, .03, .03], [.13, 0, 0], M.brass);
  // The figure that comes to the middle door of the lowest tier on the hour, holding up its tablet.
  const jack = new THREE.Group(); jack.position.set(P.x, doorY[0] - .08, P.d / 2 - .1); tower.add(jack);
  { const robe = new THREE.Mesh(new THREE.CylinderGeometry(.035, .05, .14, 10), std('#2f5e3b')); robe.position.y = .07; jack.add(robe);
    const headBall = new THREE.Mesh(new THREE.SphereGeometry(.03, 10, 8), std('#e2c39a')); headBall.position.y = .17; jack.add(headBall);
    box(jack, [.06, .08, .01], [0, .11, .05], M.ivory); }
  jack.visible = false;
  kit.moving(wheel, stream, balance, stop, jack, celestial, sighting);
  for (const part of [wheel, balance, stop, jack, sighting]) kit.settle(part, [spokes, buckets, fills]);

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
    const p = kit.inRoom(wall, 2.3, 1.5);
    kit.plaque(p.x, p.z, 0, 0, [
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
    // Celestial globe and armillary follow the wheel, a small turn a tick.
    celestial.rotation.y += .05; sighting.rotation.y += .05;
    if (state.ticks % HOUR === 0) { state.hours++; state.jack = 0; if (kit.showing() === id) bell(); }
    if (kit.showing() === id && state.page === 'escapement') kit.redraw();
  }

  return {
    id,
    update(dt) {
      stream.visible = state.water;
      if (state.water && state.escapement) {
        if (state.stepping < 0) {
          state.fill = Math.min(1, state.fill + dt / FILL);
          state.fills[underSpout()] = state.fill;
          balance.rotation.z = -state.fill * .05; stop.rotation.z = 0;
          if (state.fill >= 1) state.stepping = 0;
        } else {
          // The balance tips, the stop lifts, the wheel turns one bucket with a little swing, and is caught.
          state.stepping = Math.min(1, state.stepping + dt / STEP);
          const t = state.stepping;
          balance.rotation.z = -.05 - .18 * Math.sin(t * Math.PI); stop.rotation.z = .5 * Math.sin(t * Math.PI);
          wheel.rotation.z = state.rotation - STEP_ANGLE * (1 - (1 - t) ** 3);
          if (t >= 1) { state.rotation -= STEP_ANGLE; wheel.rotation.z = state.rotation; state.stepping = -1; state.fill = 0; tick(); }
        }
      } else if (state.water) {
        // No escapement: the wheel just runs, and the water spills from buckets that never stay to fill.
        state.rotation -= dt * 1.8; wheel.rotation.z = state.rotation;
        celestial.rotation.y += dt * 1.5; sighting.rotation.y += dt * 1.5; balance.rotation.z = 0; stop.rotation.z = .5;
        state.fills.fill(0);
      }
      // Full buckets carry their water down the right side and empty at the bottom.
      for (let i = 0; i < BUCKETS; i++) if (state.fills[i] > 0 && i !== underSpout()) {
        const a = ((state.rotation + i * STEP_ANGLE) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
        if (a > Math.PI * 1.35 && a < Math.PI * 1.6) state.fills[i] = 0;
      }
      placeFills();
      // The figure at its door: out, a moment holding up its tablet, and in again.
      if (state.jack >= 0) {
        state.jack += dt;
        const out = state.jack < .5 ? state.jack / .5 : state.jack < 2.2 ? 1 : Math.max(0, 1 - (state.jack - 2.2) / .5);
        jack.visible = out > 0; jack.position.z = P.d / 2 - .1 + out * .16;
        if (state.jack > 2.8) { state.jack = -1; jack.visible = false; }
      }
    },
    getState: () => ({water: state.water, escapement: state.escapement, ticks: state.ticks, hours: state.hours, page: state.page, fill: state.fill}),
    targets: () => ({susong: tower.localToWorld(new THREE.Vector3(0, 1.4, 0)).toArray()}),
    open, setWater, setEscapement, setPage
  };
}
