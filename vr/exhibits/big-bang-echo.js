/**
 * The echo of the Big Bang: a hiss from every direction.
 *
 * In 1964 Arno Penzias and Robert Wilson, at Bell Labs in Holmdel, New Jersey,
 * turned a horn antenna built for the first communication satellites to
 * measure faint radio waves from the Milky Way, and found a hiss in it that no
 * source could explain: some 3.5 degrees above absolute zero, the same
 * wherever they pointed, day and night, all year. They cleared out the pigeons
 * nesting in the horn and cleaned up after them, and the hiss remained. It was
 * the oldest light there is, released when the universe was 380,000 years old
 * and stretched by its expansion into microwaves: the echo of the Big Bang.
 *
 * A model of the horn, a sixth of its size, sweeps the sky on its turntable,
 * two pigeons perched on it. Beside it a receiver of the period draws the
 * hiss on a chart, the same level wherever the horn points. Clear the pigeons
 * and they fly off; turn the horn; listen to the hiss, made here from noise.
 * On the wall, an oval of the whole sky in that light: smooth, as it seemed in
 * 1965, and then, with the contrast raised a hundred thousand times, rippled,
 * as the COBE satellite found it in 1992 — drawn here as an impression, not
 * the real sky.
 */
const EXCESS = 3.5;               // kelvin above what the antenna and the air could account for, as they measured it
const SAMPLES = 220;
const smooth = s => s * s * (3 - 2 * s);
// The colours of the sky maps: cold blue through pale to hot red.
const STOPS = [[-1, [16, 30, 120]], [-.55, [40, 110, 210]], [-.18, [150, 205, 240]], [0, [246, 232, 200]], [.2, [250, 200, 110]], [.55, [232, 110, 40]], [1, [150, 24, 20]]];

export function createBigBangEcho(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'cmb';
  const state = {clock: 0, pigeons: 2, flight: null, page: 'hiss', listening: false, contrast: 0, contrastGoal: 0, cycle: 0, held: false,
    az: 0, el: .25, turn: null, turns: 0, samples: new Array(SAMPLES).fill(EXCESS), drawn: 0};
  const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

  // ── The oldest light, on the wall ────────────────────────────────────
  const wall = kit.onWall(angle, .12);
  const MAP = {w: 4.6, h: 2.3, y: 4.0};
  /**
   * An impression of the sky in microwaves: smoothed noise at three sizes,
   * coloured cold to hot, inside the oval of a whole-sky map. Random, so not
   * the real sky; with its contrast turned down, all one colour, as the hiss
   * seemed in 1965.
   */
  const skyCanvas = canvas(1024, 512, (ctx, W, H) => {
    const r = kit.seeded(1965);
    const noise = (w, h) => canvas(w, h, (c, w, h) => { const img = c.createImageData(w, h); for (let i = 0; i < w * h; i++) { const v = r() * 255; img.data.set([v, v, v, 255], i * 4); } c.putImageData(img, 0, 0); });
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    // Blobs of about a degree, as on the real map, with a little finer grain over them.
    for (const [w, h, alpha, blur] of [[40, 20, 1, 16], [96, 48, .85, 7], [220, 110, .35, 3]]) {
      ctx.globalAlpha = alpha; ctx.filter = `blur(${blur}px)`; ctx.drawImage(noise(w, h), -12, -12, W + 24, H + 24);
    }
    ctx.globalAlpha = 1; ctx.filter = 'none';
    const img = ctx.getImageData(0, 0, W, H), d = img.data;
    let sum = 0, sq = 0;
    for (let i = 0; i < W * H; i++) { sum += d[i * 4]; sq += d[i * 4] ** 2; }
    const mean = sum / (W * H), sd = Math.sqrt(sq / (W * H) - mean * mean) || 1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4, inside = ((x + .5) / W * 2 - 1) ** 2 + ((y + .5) / H * 2 - 1) ** 2 <= 1;
      const v = Math.max(-1, Math.min(1, (d[i] - mean) / sd / 2.2));
      let k = 1; while (k < STOPS.length - 1 && v > STOPS[k][0]) k++;
      const [v0, c0] = STOPS[k - 1], [v1, c1] = STOPS[k], f = (v - v0) / (v1 - v0);
      for (let j = 0; j < 3; j++) d[i + j] = c0[j] + (c1[j] - c0[j]) * Math.max(0, Math.min(1, f));
      d[i + 3] = inside ? 255 : 0;
    }
    ctx.putImageData(img, 0, 0);
  });
  const skyMap = kit.texture(skyCanvas);
  const middle = new THREE.Color(`rgb(${STOPS[3][1].join(',')})`);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {map: {value: skyMap}, contrast: {value: 0}, middle: {value: new THREE.Vector3(middle.r, middle.g, middle.b)}},
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D map; uniform float contrast; uniform vec3 middle; varying vec2 vUv;
      void main() { vec4 t = texture2D(map, vUv); if (t.a < .5) discard; gl_FragColor = vec4(mix(middle, t.rgb, contrast), 1.0);
      #include <colorspace_fragment>
      }`
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h), skyMaterial); sky.position.set(0, MAP.y, .02); wall.add(sky);
  {
    // A dark ground for it, and a gilt oval round it.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(1, 96), new THREE.MeshStandardMaterial({color: '#1a2129', roughness: .6}));
    ground.scale.set(MAP.w / 2 + .22, MAP.h / 2 + .22, 1); ground.position.set(0, MAP.y, .005); wall.add(ground);
    const points = Array.from({length: 97}, (_, i) => { const t = i / 96 * Math.PI * 2; return new THREE.Vector3(Math.cos(t) * (MAP.w / 2 + .05), MAP.y + Math.sin(t) * (MAP.h / 2 + .05), .03); });
    wall.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points, true), 160, .04, 8, true), M.gold));
    const outer = points.map(p => new THREE.Vector3((p.x) * (MAP.w / 2 + .22) / (MAP.w / 2 + .05), MAP.y + (p.y - MAP.y) * (MAP.h / 2 + .22) / (MAP.h / 2 + .05), .02));
    wall.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(outer, true), 160, .022, 6, true), M.gold));
  }
  // Under it, two captions, one fading into the other as the map does.
  const captions = [
    ['THE OLDEST LIGHT · AS IT SEEMED IN 1965', 'The same in every direction: about 3 degrees above absolute zero'],
    ['THE OLDEST LIGHT · CONTRAST RAISED 100,000 TIMES', 'Ripples of one part in 100,000, found by COBE in 1992: an impression, not the real sky']
  ].map(([title, line], i) => {
    const m = plane(wall, 4.2, .34, [0, MAP.y - MAP.h / 2 - .5, .03 + i * .002], kit.lettering(4.2, .34, [[title, .12, .09, '#e1c393', '600 #px Arial, sans-serif'], [line, .25, .065, '#f1ddba', 'italic #px Georgia, serif']], '#23303b'));
    m.material.transparent = true; m.material.opacity = i ? 0 : 1; return m;
  });
  kit.moving(sky, ...captions);

  // ── The horn antenna, on its turntable ───────────────────────────────
  const stage = kit.onWall(angle, kit.STAGE);
  const steel = new THREE.MeshStandardMaterial({color: '#7d868e', metalness: .55, roughness: .45});
  const panels = new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .55, map: kit.texture(canvas(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#dfe2e1'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(90,96,100,.5)'; ctx.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { ctx.beginPath(); ctx.moveTo(i * w / 4, 0); ctx.lineTo(i * w / 4, h); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, i * h / 4); ctx.lineTo(w, i * h / 4); ctx.stroke(); }
    ctx.fillStyle = 'rgba(80,86,90,.45)'; for (let x = 4; x < w; x += 16) for (let y = 4; y < h; y += 64) ctx.fillRect(x, y, 2, 2);
  }))});
  // A round concrete pad with two rails: the turntable runs on the inner, the receiver's cab on the outer.
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(2.25, 2.3, .06, 72), M.slate); pad.position.y = .03; stage.add(pad);
  for (const r of [1.2, 1.88]) { const rail = new THREE.Mesh(new THREE.TorusGeometry(r, .025, 6, 128), steel); rail.rotation.x = Math.PI / 2; rail.position.y = .075; stage.add(rail); }
  const azimuth = new THREE.Group(); azimuth.position.y = .09; stage.add(azimuth);
  {
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(1.22, 1.22, .07, 64), steel); deck.position.y = .035; azimuth.add(deck);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, wheel = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .04, 12), M.ink); wheel.rotation.z = Math.PI / 2; wheel.rotation.y = a; wheel.position.set(Math.cos(a) * 1.2, -.01, Math.sin(a) * 1.2); azimuth.add(wheel); }
    // The two frames that carry the horn's bearings, and the receiver's cab at its narrow end.
    for (const [x, half] of [[-.55, .26], [.62, .41]]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(half * Math.SQRT2 + .04, .03, 8, 32), steel); ring.rotation.y = Math.PI / 2; ring.position.set(x, .95, 0); azimuth.add(ring);
      for (const side of [-1, 1]) {
        const leg = box(azimuth, [.06, 1.0, .06], [x, .5, side * .38], steel); leg.rotation.x = side * .32;
        box(azimuth, [.05, .05, .8], [x, .5, 0], steel);
      }
    }
    box(azimuth, [.5, .5, .56], [-1.88, .36, 0], panels);
    box(azimuth, [.36, .14, .36], [-1.88, .04, 0], steel);
    for (const z of [-.12, .12]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .04, 12), M.ink); wheel.rotation.x = Math.PI / 2; wheel.position.set(-1.88, -.01, z); azimuth.add(wheel); }
    box(azimuth, [.16, .3, .02], [-1.88, .28, .285], M.ink);
    box(azimuth, [.14, .1, .02], [-1.75, .46, .285], new THREE.MeshBasicMaterial({color: '#f3e3b0'}));
  }
  const elevation = new THREE.Group(); elevation.position.y = .95; azimuth.add(elevation);
  {
    // The horn: a square funnel, widening from the cab to the reflector's box, whose open side looks at the sky.
    const horn = new THREE.Mesh(new THREE.CylinderGeometry(.42 * Math.SQRT2, .12 * Math.SQRT2, 2.4, 4, 1, true, Math.PI / 4), panels);
    horn.rotation.z = -Math.PI / 2; horn.position.x = -.4; horn.material.side = THREE.DoubleSide; elevation.add(horn);
    box(elevation, [.84, .84, .84], [1.22, 0, 0], panels);
    const mouth = new THREE.Mesh(new THREE.PlaneGeometry(.72, .72), new THREE.MeshBasicMaterial({color: '#0b1222'})); mouth.rotation.x = -Math.PI / 2; mouth.position.set(1.22, .422, 0); elevation.add(mouth);
    for (const [w, d, x, z] of [[.8, .04, 1.22, .38], [.8, .04, 1.22, -.38], [.04, .8, .84, 0], [.04, .8, 1.6, 0]]) box(elevation, [w, .03, d], [x, .43, z], M.gold);
    // Ribs round the horn, every so often.
    for (let k = 1; k < 6; k++) {
      const x = -1.6 + k * .4, half = .12 + (.42 - .12) * (k * .4) / 2.4;
      const rib = new THREE.Mesh(new THREE.TorusGeometry(half * Math.SQRT2, .012, 4, 4), steel); rib.rotation.set(0, Math.PI / 2, Math.PI / 4); rib.position.x = x; elevation.add(rib);
    }
  }
  // The pigeons, on the reflector's box.
  const grey = new THREE.MeshStandardMaterial({color: '#7f8896', roughness: .8}), dark = new THREE.MeshStandardMaterial({color: '#4a5260', roughness: .7});
  const birds = [0, 1].map(i => {
    const bird = new THREE.Group(); bird.position.set(1.0 + i * .38, .45, .2 + i * .1); bird.rotation.y = i ? 2.4 : -.4; elevation.add(bird);
    const body = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), grey); body.scale.set(.075, .05, .05); body.position.y = .05; bird.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(.028, 10, 8), dark); head.position.set(.065, .1, 0); bird.add(head);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(.007, .025, 6), new THREE.MeshStandardMaterial({color: '#d8b070'})); beak.rotation.z = -Math.PI / 2; beak.position.set(.098, .098, 0); bird.add(beak);
    box(bird, [.06, .012, .045], [-.085, .06, 0], dark);
    const wings = [-1, 1].map(side => { const hinge = new THREE.Group(); hinge.position.set(0, .07, side * .03); bird.add(hinge); box(hinge, [.08, .01, .07], [0, 0, side * .035], grey); return {hinge, side}; });
    const head0 = head.position.clone();
    return {bird, head, head0, wings, home: bird.position.clone(), turn: bird.rotation.y, phase: i * 1.7};
  });
  kit.moving(azimuth, elevation, ...birds.map(b => b.bird));
  kit.settle(azimuth, [elevation]);
  kit.settle(elevation, birds.map(b => b.bird));
  for (const b of birds) kit.settle(b.bird, [b.head, ...b.wings.map(w => w.hinge)]);

  // ── The receiver and its chart ───────────────────────────────────────
  const rack = new THREE.Group(); rack.position.set(2.75, 0, .55); rack.rotation.y = -.5; stage.add(rack);
  const grey60s = new THREE.MeshStandardMaterial({color: '#8e9692', roughness: .5});
  box(rack, [.7, 1.2, .5], [0, .6, 0], grey60s);
  box(rack, [.72, .03, .52], [0, 1.215, 0], M.ink);
  for (let i = 0; i < 3; i++) { const dial = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .03, 16), M.ink); dial.rotation.x = Math.PI / 2; dial.position.set(-.2 + i * .2, .4, .26); rack.add(dial); }
  box(rack, [.6, .02, .02], [0, .55, .26], M.brass);
  const chartCanvas = document.createElement('canvas'); chartCanvas.width = 512; chartCanvas.height = 300;
  const chartMap = kit.texture(chartCanvas);
  const chart = plane(rack, .56, .33, [0, .92, .253], chartMap);
  plane(rack, .56, .07, [0, 1.13, .253], kit.lettering(.56, .07, [['ANTENNA TEMPERATURE · 4,080 MHz', .035, .028, '#2a2a26', '600 #px Arial, sans-serif']], '#e8e2cf'));
  kit.moving(chart);
  /** The chart recorder: graph paper running down, and the pen's trace, steady at the level of the hiss. */
  function paintChart() {
    const ctx = chartCanvas.getContext('2d'), w = 512, h = 300, scroll = (state.clock * 16) % 20;
    ctx.fillStyle = '#f2ecd8'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(190,90,70,.25)'; ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 20) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = -20 + scroll; y < h; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
    const level = v => w * .15 + v / 6 * w * .75;
    // What the antenna and the air should have given, and what came.
    ctx.setLineDash([8, 6]); ctx.strokeStyle = '#6a6a60'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(level(0), 0); ctx.lineTo(level(0), h); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = '#1f2a6a'; ctx.lineWidth = 2.4; ctx.beginPath();
    state.samples.forEach((v, i) => { const y = h - i * h / (SAMPLES - 1); i ? ctx.lineTo(level(v), y) : ctx.moveTo(level(v), y); });
    ctx.stroke();
    ctx.fillStyle = '#2a2a26'; ctx.font = '600 20px Arial'; ctx.fillText('EXPECTED', level(0) - 46, 22); ctx.fillText(`+${EXCESS} K`, level(EXCESS) + 10, 22);
    chartMap.needsUpdate = true;
  }
  paintChart();
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(4.2, 1.8, 2.4), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.set(0, .9, 0); stage.add(proxy);
  kit.press(proxy, () => open('hiss'), 'The horn antenna');
  const skyProxy = new THREE.Mesh(new THREE.PlaneGeometry(MAP.w, MAP.h), new THREE.MeshBasicMaterial({visible: false}));
  skyProxy.position.set(0, MAP.y, .05); wall.add(skyProxy);
  kit.press(skyProxy, () => open('light'), 'The oldest light');
  {
    const p = kit.inRoom(stage, 3.3, 1.9);
    kit.plaque(p.x, p.z, 0, 0, [
      ['THE ECHO OF THE BIG BANG', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Penzias and Wilson, Holmdel, 1965', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['A hiss from every direction, the same day and', .22, .033],
      ['night: the oldest light there is. Clear out the', .27, .033],
      ['pigeons, turn the horn, and listen to it.', .32, .033],
      ['Their horn antenna, a sixth of its size;', .41, .026, '#a99a7c', 'italic #px Georgia, serif'],
      ['the sky above is an impression, not the real map.', .45, .026, '#a99a7c', 'italic #px Georgia, serif']], () => open('hiss'), 'Echo of the Big Bang plaque');
  }

  // ── The hiss, made here from noise ───────────────────────────────────
  let audio = null, hiss = null;
  function listen(on) {
    state.listening = on;
    try {
      if (on) {
        audio ??= new (window.AudioContext || window.webkitAudioContext)(); audio.resume?.();
        const buffer = audio.createBuffer(1, audio.sampleRate * 2, audio.sampleRate), data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        const source = audio.createBufferSource(); source.buffer = buffer; source.loop = true;
        const band = audio.createBiquadFilter(); band.type = 'bandpass'; band.frequency.value = 2400; band.Q.value = .6;
        const gain = audio.createGain(); gain.gain.value = .035;
        source.connect(band).connect(gain).connect(audio.destination); source.start();
        hiss = source;
      } else if (hiss) { hiss.stop(); hiss = null; }
    } catch { hiss = null; }
  }

  // ── The panel ────────────────────────────────────────────────────────
  function paintHiss() {
    const {canvas: c, ctx} = board('THE ECHO OF THE BIG BANG · HOLMDEL, 1965', 'A hiss from every direction');
    ctx.drawImage(chartCanvas, 60, 170, 460, 270);
    ctx.strokeStyle = '#9e8859'; ctx.lineWidth = 2; ctx.strokeRect(60, 170, 460, 270);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial';
    ctx.fillText(`THE HORN: TURNED ${state.turns} TIME${state.turns === 1 ? '' : 'S'}`, 60, 486);
    ctx.fillText(state.pigeons ? 'THE PIGEONS: STILL THERE' : 'THE PIGEONS: GONE', 60, 518);
    ctx.fillStyle = '#cfe3b0'; ctx.fillText(`THE HISS: ${EXCESS} K MORE THAN EXPECTED, UNCHANGED`, 60, 550, 480);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'In 1964 Arno Penzias and Robert Wilson, at Bell Labs in New Jersey, turned a horn antenna built for the first communication satellites to measure faint radio waves from the Milky Way. They found a hiss that nothing could explain, some 3.5 degrees above absolute zero: the same wherever they pointed, day and night, all year round. They cleared out the pigeons nesting in the horn, and what the pigeons had left. The hiss remained.', 560)
      .slice(0, 12).forEach((line, i) => ctx.fillText(line, 580, 200 + i * 32));
    ctx.fillStyle = '#c8bfa7'; ctx.font = '22px Georgia';
    wrapped(ctx, 'Some fifty kilometres away at Princeton, Robert Dicke’s group was building an instrument to look for just this: the cooled glow left over from a hot, dense beginning. The two papers appeared together in 1965. Penzias and Wilson shared the Nobel Prize in 1978.', 1080)
      .slice(0, 3).forEach((line, i) => ctx.fillText(line, 60, 640 + i * 30));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.fillText('The oldest light ›', 60, 968);
    ctx.textAlign = 'right'; ctx.fillText('Read the echo of the Big Bang in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return c;
  }
  function paintLight() {
    const {canvas: c, ctx} = board('THE ECHO OF THE BIG BANG · THE OLDEST LIGHT', 'Light from 380,000 years after the beginning');
    // The map, at the contrast it has now.
    ctx.save(); ctx.beginPath(); ctx.ellipse(600, 330, 520, 150, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = `rgb(${STOPS[3][1].join(',')})`; ctx.fillRect(80, 180, 1040, 300);
    ctx.globalAlpha = state.contrastGoal; ctx.drawImage(skyCanvas, 80, 180, 1040, 300); ctx.globalAlpha = 1; ctx.restore();
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Arial'; ctx.textAlign = 'center';
    ctx.fillText(state.contrastGoal ? 'CONTRAST RAISED 100,000 TIMES · AN IMPRESSION, NOT THE REAL SKY' : 'AS SMOOTH AS IT SEEMED IN 1965', 600, 515); ctx.textAlign = 'left';
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    let y = 570;
    for (const paragraph of [
      'For its first 380,000 years the universe was a glowing fog that light could not cross. When it had cooled to about 3,000 degrees, atoms formed, the fog cleared, and that light has travelled ever since. The expanding universe has stretched it a thousandfold on the way, from a glow hotter than a candle flame to microwaves less than three degrees above absolute zero: the hiss.',
      'In 1992 the COBE satellite found that it is not quite even: from place to place it differs by about one part in 100,000. Those ripples are where matter lay a little more thickly, the seeds of every galaxy. Planck mapped them across the whole sky in 2013.'
    ]) { for (const line of wrapped(ctx, paragraph, 1080)) { ctx.fillText(line, 60, y); y += 31; } y += 14; }
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read the echo of the Big Bang in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return c;
  }
  const story = {x: 640, y: 945, w: 520, h: 40, label: 'The echo’s story', fn: () => kit.story('cmb65')};
  kit.panel(id, {
    paint: () => state.page === 'light' ? paintLight() : paintHiss(),
    zones: () => state.page === 'light' ? [story] : [{x: 60, y: 945, w: 300, h: 40, label: 'The oldest light', fn: () => setPage('light')}, story],
    actions: () => state.page === 'light'
      ? [[state.contrastGoal ? 'AS IN 1965' : 'TURN UP THE CONTRAST', () => setContrast(state.contrastGoal ? 0 : 1), '#6a5a2c'], ['← THE HISS', () => setPage('hiss')], ['CLOSE', kit.close]]
      : [[state.pigeons ? 'CLEAR THE PIGEONS' : 'PIGEONS GONE', clearPigeons, state.pigeons ? '#6a5a2c' : '#3a3f36'], ['TURN THE HORN', turnHorn], [state.listening ? 'QUIET' : 'LISTEN', () => { listen(!state.listening); kit.redraw(); }], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function open(page = 'hiss') { state.page = page; kit.open(id); }
  function setPage(page) { state.page = page; kit.redraw(); }
  function clearPigeons() { if (state.pigeons && !state.flight) state.flight = {t: 0}; kit.redraw(); }
  /** Point the horn somewhere else in the sky; the hiss does not change. */
  function turnHorn() {
    const r = Math.random();
    state.turn = {t: 0, from: [state.az, state.el], to: [(r - .5) * 1.1, .05 + Math.random() * .6]};
    state.turns++; kit.redraw();
  }
  /** Raise the map's contrast, or let it fall back to how smooth it seemed in 1965; the visitor's choice holds it. */
  function setContrast(goal) { state.contrastGoal = goal; state.held = true; kit.redraw(); }

  return {
    id,
    update(dt) {
      state.clock += dt;
      // The map turns between smooth and rippled on its own, every dozen seconds, unless the visitor has chosen.
      if (!state.held) { state.cycle += dt; if (state.cycle > 12) { state.cycle = 0; state.contrastGoal = state.contrastGoal ? 0 : 1; if (kit.showing() === id && state.page === 'light') kit.redraw(); } }
      if (kit.showing() !== id) state.held = false;
      state.contrast += (state.contrastGoal - state.contrast) * Math.min(1, dt * 1.2);
      if (Math.abs(state.contrastGoal - state.contrast) < .002) state.contrast = state.contrastGoal;
      skyMaterial.uniforms.contrast.value = smooth(state.contrast);
      captions[1].material.opacity = smooth(state.contrast); captions[0].material.opacity = 1 - smooth(state.contrast);
      // The horn: a slow sweep of its own, or a turn to where the visitor sent it.
      if (state.turn) {
        state.turn.t = Math.min(1, state.turn.t + dt / 3);
        const s = smooth(state.turn.t);
        state.az = state.turn.from[0] + (state.turn.to[0] - state.turn.from[0]) * s; state.el = state.turn.from[1] + (state.turn.to[1] - state.turn.from[1]) * s;
        if (state.turn.t >= 1) state.turn = null;
      } else { state.az += Math.sin(state.clock * .07) * dt * .02; }
      // The open mouth tips up and toward the visitor, so its pigeons can be seen.
      azimuth.rotation.y = state.az; elevation.rotation.x = state.el;
      // The pigeons: a bob of the head now and then; cleared, they take off and fly away; a while later they are back.
      birds.forEach((b, i) => {
        b.head.position.y = b.head0.y + Math.max(0, Math.sin(state.clock * 2.3 + b.phase)) ** 8 * .015;
        if (state.flight) {
          const t = Math.max(0, state.flight.t - i * .15), k = smooth(Math.min(1, t / 2.2));
          b.bird.position.set(b.home.x + k * (1.6 + i * .5), b.home.y + k * k * 2.4 + Math.sin(t * 3) * .05 * k, b.home.z - k * (1.2 - i * .6));
          for (const {hinge, side} of b.wings) hinge.rotation.x = side * (t > 0 ? .9 * Math.sin(state.clock * 26) : 0);
          b.bird.visible = k < .98;
        } else if (state.pigeons) { b.bird.visible = true; b.bird.position.copy(b.home); for (const {hinge} of b.wings) hinge.rotation.x = 0; }
      });
      if (state.flight) {
        state.flight.t += dt;
        if (state.flight.t > 2.6 && state.pigeons) { state.pigeons = 0; state.away = 0; if (kit.showing() === id) kit.redraw(); }
        if (state.flight.t > 2.6) state.flight = state.pigeons ? state.flight : null;
      }
      if (!state.pigeons && !state.flight) { state.away = (state.away || 0) + dt; if (state.away > 40) { state.pigeons = 2; state.away = 0; if (kit.showing() === id) kit.redraw(); } }
      // The chart runs on: the hiss, the same level wherever the horn points and whatever the pigeons do.
      state.drawn += dt * 8;
      if (state.drawn >= 1) {
        while (state.drawn >= 1) { state.drawn -= 1; state.samples.shift(); state.samples.push(EXCESS + (Math.random() - .5) * .5 + Math.sin(state.clock * 3.1) * .08); }
        paintChart();
      }
      if (state.listening && kit.showing() !== id) listen(false);
    },
    getState: () => ({page: state.page, pigeons: state.pigeons, flying: !!state.flight, turns: state.turns, pointing: [Math.round(state.az * 100) / 100, Math.round(state.el * 100) / 100],
      excess: EXCESS, hiss: Math.round(state.samples.slice(-60).reduce((s, v) => s + v, 0) / 60 * 10) / 10, contrast: Math.round(state.contrast * 100) / 100, listening: state.listening}),
    targets: () => ({horn: stage.localToWorld(new THREE.Vector3(0, 1.0, 0)).toArray(), oldestLight: wall.localToWorld(new THREE.Vector3(0, MAP.y, .02)).toArray()}),
    open, clearPigeons, turnHorn, setContrast, setPage, listen
  };
}
