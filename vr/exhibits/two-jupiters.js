/**
 * Two Jupiters: the planet as Galileo saw it in 1610, and as Webb sees it now.
 *
 * On a length of blue cloth between two pilasters hang two pictures four
 * hundred years apart: the evening sky through a telescope like Galileo's, in
 * a gilt frame of his century, and Webb's infrared photograph of 2022 in a
 * plain one of ours, each under a picture light.
 *
 * Before them stands a model of Jupiter and the four moons Galileo found, at
 * their true distances from the planet (the planet and the moons themselves
 * drawn larger, or they could not be seen). It moves the moons from evening to
 * evening, from 7 January to 2 March 1610, as they really moved between them,
 * from NASA's positions; and each time it reaches an evening the picture of
 * Galileo's view turns to that evening. Seen from the front, at the moons'
 * height, they swing back and forth along a line: all he could see.
 */
const PERIODS = [1.769, 3.551, 7.155, 16.689];       // days, Io to Callisto
const K = .085;                                       // the model's metres to a Jupiter radius
const PLANET = .17;                                   // the planet, drawn twice its size
const CENTRE = 1.6;                                   // the planet and the moons, at a standing visitor’s eye
const MOON_SIZE = [.04, .034, .058, .053];            // as their diameters, but all drawn larger
const MOON_COLOR = ['#e8c75a', '#f1e8d6', '#a89884', '#6e6050'];
const HOLD = 2.6, STEP = 3.2, PANEL_STEP = 2.2;       // seconds at an evening, and on the way to the next
const MOONS = [
  {name: 'Io', period: '1 day 18 hours', out: '422,000 km out', across: '3,643 km across',
    note: 'The most volcanic world known, kneaded hot by Jupiter’s pull.'},
  {name: 'Europa', period: '3 days 13 hours', out: '671,000 km out', across: '3,122 km across',
    note: 'Under its ice lies an ocean of salt water, deeper than any on Earth.'},
  {name: 'Ganymede', period: '7 days 4 hours', out: '1,070,000 km out', across: '5,268 km across',
    note: 'The largest moon in the solar system, larger than the planet Mercury.'},
  {name: 'Callisto', period: '16 days 17 hours', out: '1,883,000 km out', across: '4,821 km across',
    note: 'One of the most cratered places known, little changed for four billion years.'}
];
const wrap = a => Math.atan2(Math.sin(a), Math.cos(a));
const smooth = s => s * s * (3 - 2 * s);

/**
 * Jupiter's face, painted: its belts and zones by latitude, stirred along
 * their edges, the Great Red Spot in its hollow and a string of white ovals
 * to the south of it. Equirectangular, north at the top.
 */
function paintJupiter(width = 512, height = 256) {
  const c = document.createElement('canvas'); c.width = width; c.height = height;
  const ctx = c.getContext('2d'), image = ctx.createImageData(width, height), data = image.data;
  // From the north pole to the south: latitude, and the colour there.
  const stops = [[90, [128, 122, 112]], [62, [146, 136, 120]], [50, [178, 162, 138]], [42, [146, 120, 94]], [35, [210, 194, 166]],
    [29, [158, 116, 82]], [23, [228, 214, 188]], [18, [170, 104, 66]], [8, [150, 90, 58]], [5, [224, 206, 174]], [0, [240, 228, 202]],
    [-5, [228, 208, 172]], [-8, [156, 98, 64]], [-17, [172, 112, 74]], [-20, [230, 216, 192]], [-27, [222, 206, 180]], [-31, [152, 118, 90]],
    [-37, [206, 188, 158]], [-45, [160, 136, 108]], [-60, [146, 136, 120]], [-90, [128, 122, 112]]];
  const at = lat => {
    for (let i = 1; i < stops.length; i++) if (lat >= stops[i][0]) {
      const [l0, c0] = stops[i - 1], [l1, c1] = stops[i], f = (lat - l1) / (l0 - l1);
      return [0, 1, 2].map(k => c1[k] + (c0[k] - c1[k]) * f);
    }
    return stops[stops.length - 1][1];
  };
  const SPOT = {lat: -22, lon: 1.25};
  const OVALS = [2.55, 3.2, 3.9].map(lon => ({lat: -33, lon}));
  for (let y = 0; y < height; y++) {
    const lat = 90 - (y + .5) / height * 180, calm = Math.cos(lat * Math.PI / 180);
    for (let x = 0; x < width; x++) {
      const lon = (x + .5) / width * Math.PI * 2;
      // The edges of the belts curl and wander.
      const warped = lat + calm * (1.5 * Math.sin(3 * lon + lat * .21) + .9 * Math.sin(9 * lon - lat * .5 + 1.1) + .45 * Math.sin(23 * lon + lat * 1.3 + 2.3));
      let [r, g, b] = at(warped);
      const streak = 1 + .05 * Math.sin(41 * lon + 7 * Math.sin(lat * .7)) * Math.sin(lat * 2.3) + .03 * Math.sin(97 * lon + lat * 3.1);
      r *= streak; g *= streak; b *= streak;
      // The Great Red Spot, a storm wider than the Earth, in a pale hollow of its own.
      const dx = wrap(lon - SPOT.lon) * 180 / Math.PI * calm, dy = lat - SPOT.lat, e = Math.hypot(dx / 12, dy / 6.2);
      if (e < 1.55) {
        const hollow = Math.max(0, 1 - Math.abs(e - 1.18) / .35) * .55;
        r += (238 - r) * hollow; g += (226 - g) * hollow; b += (204 - b) * hollow;
        const inner = Math.max(0, Math.min(1, (1.02 - e) / .3));
        const swirl = 1 + .08 * Math.sin(e * 15 + Math.atan2(dy, dx) * 2);
        r += (198 * swirl - r) * inner; g += (102 * swirl - g) * inner; b += (66 * swirl - b) * inner;
      }
      for (const oval of OVALS) {
        const o = Math.hypot(wrap(lon - oval.lon) * 180 / Math.PI * calm / 3.2, (lat - oval.lat) / 1.9);
        if (o < 1) { const w = (1 - o * o) * .85; r += (246 - r) * w; g += (240 - g) * w; b += (228 - b) * w; }
      }
      const i = (y * width + x) * 4;
      data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return c;
}

export function createTwoJupiters(kit, {angle, nights, drawLens, credit}) {
  const {THREE, M, box, plane, lettering, texture, wrapped, board} = kit;
  const id = 'jupiters', R = kit.radius, deg = kit.deg;
  const state = {photo: null, page: 'moons', orbits: null};
  /** A frame on the wall `x` metres to the right of the bay's middle, hanging flat where the wall curves. */
  const along = (x, inset) => kit.onWall(angle - x / R / deg, inset);
  const glowMap = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.18, 'rgba(255,246,222,.7)'); g.addColorStop(1, 'rgba(255,240,210,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return texture(c);
  })();

  // ── The wall: blue cloth between the pilasters, edged in gilt ──────────
  const Y = 3.2;
  {
    const half = 3.22, top = 5.45, bottom = 1.48, span = 2 * half / R;
    // Within this group the room's own coordinates hold: its centre at the origin.
    const room = new THREE.Group(); room.position.set(0, 0, R); room.rotation.y = -(angle * deg + Math.PI);
    kit.onWall(angle, 0).add(room);
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    ctx.fillStyle = '#1e2f48'; ctx.fillRect(0, 0, 128, 128);
    // A woven damask: a lattice of lozenges, each with a small flower, a shade lighter than the ground.
    ctx.strokeStyle = 'rgba(150,170,205,.13)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(64, 0); ctx.lineTo(128, 64); ctx.lineTo(64, 128); ctx.lineTo(0, 64); ctx.closePath(); ctx.stroke();
    ctx.fillStyle = 'rgba(160,180,215,.12)';
    for (const [x, y] of [[64, 64], [0, 0], [128, 0], [0, 128], [128, 128]]) for (let p = 0; p < 4; p++) {
      ctx.beginPath(); ctx.ellipse(x + Math.cos(p * Math.PI / 2) * 9, y + Math.sin(p * Math.PI / 2) * 9, 8, 4, p * Math.PI / 2, 0, Math.PI * 2); ctx.fill();
    }
    const r = kit.seeded(90);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '10,18,30' : '70,92,128'},.08)`; ctx.fillRect(r() * 128, r() * 128, 1 + r() * 2, 1); }
    const map = texture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; map.repeat.set(2 * half / .5, (top - bottom) / .5);
    const cloth = new THREE.Mesh(new THREE.CylinderGeometry(R - .03, R - .03, top - bottom, 24, 1, true, angle * deg - span / 2, span),
      new THREE.MeshStandardMaterial({map, roughness: .95, side: THREE.BackSide}));
    cloth.position.y = (top + bottom) / 2; room.add(cloth);
    const arc = y => {
      const points = [];
      for (let i = 0; i <= 24; i++) { const b = angle * deg - span / 2 + span * i / 24; points.push(new THREE.Vector3(Math.sin(b) * (R - .05), y, Math.cos(b) * (R - .05))); }
      return new THREE.CatmullRomCurve3(points);
    };
    for (const y of [top, bottom]) room.add(new THREE.Mesh(new THREE.TubeGeometry(arc(y), 32, .035, 6), M.gold));
    for (const side of [-1, 1]) box(along(side * half, .05), [.07, top - bottom, .05], [0, (top + bottom) / 2, 0], M.gold);
  }

  /**
   * A moulded frame, turned on a lathe of four sides so its corners come out
   * mitred: `profile` is [out from the picture's edge, depth] from the sight
   * edge outward, for a picture `half` metres from its middle to each side.
   */
  function moulding(parent, half, profile, material, y, aspect = 1) {
    // Outside in, so the faces look out of the wall.
    const points = profile.map(([out, depth]) => new THREE.Vector2((half + out) * Math.SQRT2, depth)).reverse();
    const geometry = new THREE.LatheGeometry(points, 4, Math.PI / 4).toNonIndexed();
    geometry.computeVertexNormals();
    const frame = new THREE.Mesh(geometry, material);
    frame.rotation.x = Math.PI / 2; frame.scale.set(1, 1, aspect); frame.position.y = y; parent.add(frame);
    return frame;
  }
  const lightStrip = new THREE.MeshBasicMaterial({color: '#fff2d4'});
  const wash = new THREE.MeshBasicMaterial({map: (() => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 128; const ctx = c.getContext('2d');
    // Faded to nothing well inside its edges, so the pool has none.
    const g = ctx.createRadialGradient(64, 42, 1, 64, 42, 38); g.addColorStop(0, 'rgba(255,230,186,.42)'); g.addColorStop(.45, 'rgba(255,224,176,.14)'); g.addColorStop(1, 'rgba(255,224,176,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return texture(c);
  })(), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending});
  /** A brass picture light over a frame whose top edge is at `top`, and the light it throws on the cloth. */
  function pictureLight(frame, width, top) {
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, width * .7, 14), M.brass);
    bar.rotation.z = Math.PI / 2; bar.position.set(0, top + .24, .34); frame.add(bar);
    const hood = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, width * .7, 14, 1, true, Math.PI * .1, Math.PI), M.brass);
    hood.rotation.z = Math.PI / 2; hood.position.set(0, top + .24, .34); hood.material = M.brass; frame.add(hood);
    box(frame, [width * .68, .012, .05], [0, top + .2, .35], lightStrip);
    for (const side of [-1, 1]) {
      box(frame, [.026, .026, .34], [side * width * .25, top + .24, .17], M.brass);
      box(frame, [.08, .14, .025], [side * width * .25, top + .24, .012], M.brass);
    }
    // Brightest on the cloth just under the light, and soft every way from there.
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(width * 1.7, 2), wash);
    pool.position.set(0, top - .24, .012); frame.add(pool);
  }

  // ── Galileo's view, in a gilt frame of his century ───────────────────
  const SMALL = 1.5, galileoWall = along(-1.8, .06);
  moulding(galileoWall, SMALL / 2, [[0, .035], [0, .06], [.02, .075], [.035, .07], [.06, .1], [.1, .125], [.14, .112], [.165, .085], [.19, .07], [.205, .04], [.21, 0]], M.gold, Y);
  box(galileoWall, [SMALL + .02, SMALL + .02, .03], [0, Y, .015], M.darkWood);
  // Two sheets, so one evening can fade into the next.
  const sheets = [0, 1].map(() => { const c = document.createElement('canvas'); c.width = c.height = 768; return {canvas: c, map: texture(c)}; });
  const view = plane(galileoWall, SMALL, SMALL, [0, Y, .036], sheets[0].map);
  const next = plane(galileoWall, SMALL, SMALL, [0, Y, .038], sheets[1].map);
  next.material.transparent = true; next.material.opacity = 0; next.visible = false;
  kit.moving(view, next);
  kit.press(view, () => open('pictures'), 'Galileo’s Jupiter');
  plane(galileoWall, SMALL + .5, .42, [0, Y - SMALL / 2 - .45, .04], lettering(SMALL + .5, .42, [
    ['JUPITER, AS GALILEO SAW IT', .12, .07, '#e1c393', '600 #px Arial, sans-serif'],
    ['Evening by evening, January to March 1610', .23, .052, '#f1ddba', 'italic #px Georgia, serif'],
    ['Positions: JPL Horizons (NASA)', .33, .048, '#c4b898', '#px Arial, sans-serif']]));
  pictureLight(galileoWall, SMALL + .42, Y + SMALL / 2 + .21);
  function paintView(sheet, index) {
    const ctx = sheet.canvas.getContext('2d'), night = nights()?.[index];
    ctx.fillStyle = '#100d09'; ctx.fillRect(0, 0, 768, 768);
    drawLens(ctx, 384, 352, 292, night, {labels: false});
    ctx.fillStyle = '#b3a98c'; ctx.font = '24px Arial'; ctx.textAlign = 'left'; ctx.fillText('◂ EAST', 54, 728);
    ctx.textAlign = 'right'; ctx.fillText('WEST ▸', 714, 728);
    ctx.fillStyle = '#e8d6ae'; ctx.font = 'italic 32px Georgia'; ctx.textAlign = 'center'; ctx.fillText(night?.date || '', 384, 730); ctx.textAlign = 'left';
    sheet.map.needsUpdate = true;
  }

  // ── Webb's photograph, in a plain frame of ours ──────────────────────
  // 1646 by 1561 pixels.
  const WIDE = 2.7, TALL = WIDE * 1561 / 1646, MAT = .14, webbWall = along(1.12, .06);
  const placeholder = document.createElement('canvas'); placeholder.width = placeholder.height = 4;
  plane(webbWall, WIDE + 2 * MAT, TALL + 2 * MAT, [0, Y, .03], null).material = M.ivory;
  moulding(webbWall, (WIDE + 2 * MAT) / 2, [[0, .03], [0, .07], [.055, .07], [.055, 0]], M.ink, Y, (TALL + 2 * MAT) / (WIDE + 2 * MAT));
  const photo = plane(webbWall, WIDE, TALL, [0, Y, .034], texture(placeholder));
  kit.press(photo, () => open('pictures'), 'Webb’s Jupiter');
  plane(webbWall, WIDE + .2, .42, [0, Y - TALL / 2 - MAT - .38, .04], lettering(WIDE + .2, .42, [
    ['JUPITER, SEEN BY WEBB · 27 JULY 2022', .12, .07, '#e1c393', '600 #px Arial, sans-serif'],
    ['Infrared: auroras over both poles, high hazes, the Great Red Spot', .22, .055, '#f1ddba', 'italic #px Georgia, serif'],
    [credit, .33, .05, '#c4b898', '#px Arial, sans-serif']]));
  pictureLight(webbWall, WIDE + .4, Y + TALL / 2 + MAT + .06);

  // ── The model: Jupiter and its four moons, on a turned table ─────────
  const stage = kit.onWall(angle, kit.STAGE);   // on the bay's medallion; z toward the visitor
  {
    const turned = (profile, material, segments = 48) => {
      const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material); stage.add(m); return m;
    };
    turned([[0, 0], [.5, 0], [.5, .035], [.47, .06], [.45, .1], [.42, .12], [.42, .66], [.45, .69], [.5, .73], [.53, .77], [.53, .8], [0, .8]], M.wood);
    turned([[0, .8], [.5, .8], [.5, .812], [0, .812]], M.brass);
    // The column the planet stands on.
    turned([[0, .81], [.09, .81], [.09, .84], [.06, .87], [.035, .9], [.026, .96], [.028, CENTRE - PLANET - .08], [.045, CENTRE - PLANET - .04], [.07, CENTRE - PLANET + .02], [.0, CENTRE - PLANET + .02]], M.brass, 24);
  }
  // The dial on the table's top: the evenings, round its rim.
  const DAYS = 55;
  {
    const c = document.createElement('canvas'); c.width = c.height = 1024; const ctx = c.getContext('2d'), cx = 512, cy = 512;
    ctx.fillStyle = '#b48d4c'; ctx.fillRect(0, 0, 1024, 1024);
    const sheen = ctx.createRadialGradient(cx, cy, 40, cx, cy, 512); sheen.addColorStop(0, 'rgba(255,240,200,.25)'); sheen.addColorStop(1, 'rgba(60,40,10,.25)');
    ctx.fillStyle = sheen; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#3d2a12'; ctx.fillStyle = '#3d2a12'; ctx.lineWidth = 3;
    for (const r of [480, 410, 300]) { ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); }
    // Day 0, 7 January, at the front; the days run round clockwise, seen from above.
    const point = (d, r) => { const a = d / DAYS * Math.PI * 2; return [cx - Math.sin(a) * r, cy + Math.cos(a) * r]; };
    for (let d = 0; d < DAYS; d++) {
      const [x0, y0] = point(d, 480), [x1, y1] = point(d, d % 7 ? 455 : 435);
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }
    ctx.font = 'italic 40px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [name, from, to] of [['Ianuarius', 0, 25], ['Februarius', 25, 53], ['Mart.', 53, 55]]) {
      const middle = (from + to) / 2, [x, y] = point(middle, 372), a = middle / DAYS * Math.PI * 2;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a + (Math.cos(a) < 0 ? Math.PI : 0)); ctx.fillText(name, 0, 0); ctx.restore();
      const [bx0, by0] = point(from, 480), [bx1, by1] = point(from, 410);
      ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(bx0, by0); ctx.lineTo(bx1, by1); ctx.stroke(); ctx.lineWidth = 3;
    }
    ctx.font = '600 34px Georgia'; ctx.fillText('IOVIS · MDCX', cx, cy + 230);
    const dial = new THREE.Mesh(new THREE.CircleGeometry(.5, 64), new THREE.MeshStandardMaterial({map: texture(c), metalness: .55, roughness: .38}));
    dial.rotation.x = -Math.PI / 2; dial.position.y = .814; stage.add(dial);
  }
  const pointer = new THREE.Group(); pointer.position.y = .818; stage.add(pointer); kit.moving(pointer);
  box(pointer, [.014, .008, .46], [0, 0, .23], M.ink);
  box(pointer, [.05, .008, .05], [0, 0, .44], M.ink).rotation.y = Math.PI / 4;

  const jupiter = new THREE.Mesh(new THREE.SphereGeometry(PLANET, 48, 32), (() => {
    const map = texture(paintJupiter());
    return new THREE.MeshStandardMaterial({map, emissiveMap: map, emissive: '#ffffff', emissiveIntensity: .22, roughness: .85});
  })());
  jupiter.position.y = CENTRE; jupiter.rotation.z = 3 * deg; stage.add(jupiter); kit.moving(jupiter);
  const moons = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshStandardMaterial({roughness: .7, emissive: '#2a2620'}), 4);
  MOON_COLOR.forEach((color, k) => moons.setColorAt(k, new THREE.Color(color)));
  moons.frustumCulled = false; stage.add(moons);
  // Each moon a point of light as well, as Galileo saw them.
  const glows = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Array(12).fill(0), 3)),
    new THREE.PointsMaterial({size: .16, map: glowMap, color: '#fff4dc', transparent: true, opacity: .6, depthWrite: false, blending: THREE.AdditiveBlending}));
  glows.frustumCulled = false; stage.add(glows);
  const rings = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({color: '#c9a664', transparent: true, opacity: .24}));
  stage.add(rings);
  const pick = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), new THREE.MeshBasicMaterial({visible: false}));
  pick.position.y = CENTRE; stage.add(pick);
  kit.press(pick, () => open('moons'), 'Jupiter and its moons');
  moons.visible = glows.visible = false;

  // Its plaque at the front right of the stage, as every bay's is.
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, 0, 0, [
      ['TWO JUPITERS', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Galileo, 1610 · Webb, 2022', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['The four moons Galileo found, moving as', .22, .033],
      ['they really moved between his evenings.', .27, .033],
      ['From the front, at their height, they swing', .32, .033],
      ['in a line, as he saw them. Press to step.', .37, .033],
      ['Distances true; the planet and moons drawn larger.', .46, .026, '#a99a7c', 'italic #px Georgia, serif']], () => open('moons'), 'Two Jupiters plaque');
  }

  // ── Where the moons were, and how they got from evening to evening ───
  /**
   * From each evening's positions — east and north across the sky and depth
   * away from Earth — the angle each moon had reached round Jupiter. Between
   * one evening and the next a moon goes round by a day's worth of its orbit,
   * so the whole turns are put back that the positions alone cannot show: Io,
   * going round in under two days, gains more than half a turn each night.
   * Each orbit, seen from Earth, is tilted a little; its tilt is fitted as
   * height = a cos θ + b sin θ, and the evenings' own heights kept exactly.
   */
  function fitOrbits(list) {
    const orbits = MOONS.map((_, k) => {
      const at = list.map(night => { const [east, north, depth] = night.moons[k]; return {x: -east * K, y: north * K, z: -depth * K}; });
      return {at, theta: at.map(p => Math.atan2(p.z, p.x)), r: at.map(p => Math.hypot(p.x, p.z))};
    });
    let sense = 0;
    for (let i = 1; i < list.length; i++) sense += wrap(orbits[3].theta[i] - orbits[3].theta[i - 1]);
    sense = Math.sign(sense) || 1;
    orbits.forEach((o, k) => {
      const daily = sense * Math.PI * 2 / PERIODS[k];
      o.turn = [o.theta[0]];
      for (let i = 1; i < o.theta.length; i++) {
        const step = wrap(o.theta[i] - o.theta[i - 1]);
        o.turn.push(o.turn[i - 1] + step + Math.PI * 2 * Math.round((daily - step) / (Math.PI * 2)));
      }
      let cc = 0, ss = 0, cs = 0, yc = 0, ys = 0;
      o.theta.forEach((t, i) => { const c = Math.cos(t), s = Math.sin(t), y = o.at[i].y; cc += c * c; ss += s * s; cs += c * s; yc += y * c; ys += y * s; });
      const det = cc * ss - cs * cs || 1;
      o.a = (yc * ss - ys * cs) / det; o.b = (ys * cc - yc * cs) / det;
      o.left = o.theta.map((t, i) => o.at[i].y - o.a * Math.cos(t) - o.b * Math.sin(t));
      o.radius = o.r.reduce((s, v) => s + v, 0) / o.r.length;
    });
    return orbits;
  }
  /** Where moon `k` is, in the stage's frame, `t` evenings after the first. */
  function moonAt(k, t) {
    const o = state.orbits[k], i = Math.max(0, Math.min(o.turn.length - 2, Math.floor(t))), f = t - i;
    const th = o.turn[i] + (o.turn[i + 1] - o.turn[i]) * f, r = o.r[i] + (o.r[i + 1] - o.r[i]) * f;
    return [Math.cos(th) * r, CENTRE + o.a * Math.cos(th) + o.b * Math.sin(th) + o.left[i] + (o.left[i + 1] - o.left[i]) * f, Math.sin(th) * r];
  }
  function drawRings() {
    const points = [];
    for (const o of state.orbits) for (let i = 0; i < 96; i++) for (const j of [i, i + 1]) {
      const th = j / 96 * Math.PI * 2;
      points.push(Math.cos(th) * o.radius, CENTRE + o.a * Math.cos(th) + o.b * Math.sin(th), Math.sin(th) * o.radius);
    }
    rings.geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    rings.geometry.computeBoundingSphere();
  }

  // ── The run of evenings ──────────────────────────────────────────────
  const run = {t: 0, from: 0, to: 0, s: 1, travel: STEP, hold: HOLD, fade: 1, fading: 0, shown: -1, sheet: 0, cross: 1, coming: 0};
  const last = () => (nights()?.length || 1) - 1;
  /** Set the moons going toward evening `index`, over `seconds`. */
  function travelTo(index, seconds) {
    run.from = run.t; run.to = Math.max(0, Math.min(last(), Math.round(index))); run.s = run.to === run.t ? 1 : 0; run.travel = seconds;
    if (run.s === 1) arrive();
  }
  function arrive() {
    run.t = run.to; run.hold = HOLD; turnView(run.to);
    if (kit.showing() === 'jupiter') kit.redraw();
  }
  /** The picture of Galileo's view fades to evening `index`. */
  function turnView(index) {
    if (index === run.shown && run.cross >= 1) return;
    const sheet = sheets[1 - run.sheet];
    paintView(sheet, index);
    next.material.map = sheet.map; next.material.opacity = 0; next.visible = true;
    run.cross = 0; run.coming = index;
  }
  const o = new THREE.Object3D(), glowAt = glows.geometry.attributes.position;

  // ── The panel: the four moons, and the two pictures ──────────────────
  function paintMoons() {
    const night = nights()?.[run.to];
    const {canvas, ctx} = board('JUPITER’S FOUR MOONS · AS GALILEO FOUND THEM', night ? night.date : 'Preparing the evenings…');
    ctx.fillStyle = '#b3a98c'; ctx.font = '22px Arial'; ctx.fillText(`EVENING ${run.to + 1} OF ${last() + 1} · THROUGH THE TELESCOPE`, 60, 162, 1080);
    drawLens(ctx, 270, 400, 200, night);
    MOONS.forEach((moon, k) => {
      const y = 228 + k * 118;
      ctx.fillStyle = MOON_COLOR[k]; ctx.beginPath(); ctx.arc(560, y - 10, 15, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f1e5d0'; ctx.font = 'bold 30px Georgia'; ctx.fillText(moon.name, 592, y);
      ctx.fillStyle = '#c8bfa7'; ctx.font = '20px Arial'; ctx.fillText(`ROUND IN ${moon.period.toUpperCase()} · ${moon.out.toUpperCase()}`, 594, y + 32, 560);
      ctx.fillStyle = '#e8d9b2'; ctx.font = 'italic 22px Georgia'; ctx.fillText(moon.note, 594, y + 64, 560);
    });
    ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
    wrapped(ctx, 'The model before you moves each moon as it really moved between Galileo’s evenings, from NASA’s positions. Seen from the front, at the moons’ height, they swing back and forth in a line — all Galileo could see. Seen from above, each runs round a circle.', 1080)
      .slice(0, 4).forEach((line, i) => ctx.fillText(line, 60, 744 + i * 33));
    ctx.fillStyle = '#d9bc7d'; ctx.font = 'italic 23px Georgia';
    wrapped(ctx, 'Io, Europa and Ganymede keep in step: for each turn Ganymede makes, Europa makes two and Io four.', 1080).slice(0, 2).forEach((line, i) => ctx.fillText(line, 60, 890 + i * 30));
    ctx.fillStyle = '#9d9786'; ctx.font = '19px Arial'; ctx.fillText('Where the moons stood: JPL Horizons (NASA) · Distances true; planet and moons drawn larger', 60, 965, 1080);
    return canvas;
  }
  function paintPictures() {
    const night = nights()?.[run.to];
    const {canvas, ctx} = board('JUPITER, FOUR HUNDRED YEARS APART', 'What Galileo saw, and what Webb sees');
    drawLens(ctx, 300, 420, 200, night, {labels: false});
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText(`GALILEO · ${(night?.date || '7 January 1610').toUpperCase()}`, 100, 680, 460);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'A small disc and points of light beside it, through a lens a few centimetres across.', 420).forEach((line, i) => ctx.fillText(line, 100, 716 + i * 32));
    const image = state.photo;
    if (image) {
      const r = Math.min(470 / image.naturalWidth, 450 / image.naturalHeight), w = image.naturalWidth * r, h = image.naturalHeight * r;
      ctx.drawImage(image, 640 + (470 - w) / 2, 200 + (450 - h) / 2, w, h);
    } else { ctx.fillStyle = '#12160f'; ctx.fillRect(640, 200, 470, 450); }
    ctx.fillStyle = '#b3a98c'; ctx.font = '17px Arial'; ctx.fillText(credit, 640, 672, 520);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText('WEBB · 27 JULY 2022', 640, 712);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'In infrared: auroras glowing over both poles, high hazes, and the Great Red Spot shining white.', 500).forEach((line, i) => ctx.fillText(line, 640, 748 + i * 32));
    ctx.fillStyle = '#f1e5d0'; ctx.font = '27px Georgia';
    wrapped(ctx, 'Both telescopes do what every telescope does: gather more light than an eye can. Galileo’s lens was a few centimetres across; Webb’s mirror is six and a half metres.', 1080).forEach((line, i) => ctx.fillText(line, 60, 868 + i * 36));
    return canvas;
  }
  kit.panel('jupiter', {
    paint: () => state.page === 'moons' ? paintMoons() : paintPictures(),
    actions: () => state.page === 'moons'
      ? [['← EARLIER', () => step(-1)], ['LATER →', () => step(1)], ['TWO PICTURES', () => setPage('pictures')], ['CLOSE', kit.close]]
      : [['THE FOUR MOONS', () => setPage('moons')], ['CLOSE', kit.close]]
  });
  function open(page = 'moons') { state.page = page === 'pictures' ? 'pictures' : 'moons'; kit.open('jupiter'); }
  function setPage(page) { state.page = page; kit.redraw(); }
  /** Step the model an evening earlier or later; it pauses its own run while the panel is open. */
  function step(delta) { if (state.orbits) travelTo(run.to + delta, PANEL_STEP); }
  /** Go straight to an evening, with nothing between: for tests and the guide. */
  function showEvening(index) { run.to = Math.max(0, Math.min(last(), index)); run.s = 1; arrive(); }

  return {
    id,
    prepare: () => state.photo ? Promise.resolve() : new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => {
        state.photo = image; const old = photo.material.map; photo.material.map = texture(image); photo.material.needsUpdate = true; old?.dispose();
        if (kit.showing() === 'jupiter') kit.redraw();
        resolve();
      };
      image.onerror = () => reject(new Error('Webb’s photograph of Jupiter could not be loaded'));
      image.src = new URL('../../assets/photos/webb-jupiter-2022.jpg', import.meta.url).href;
    }),
    update(dt) {
      // The first picture is painted here, once the room's lens drawing is ready.
      if (!run.painted) { run.painted = true; paintView(sheets[0], -1); }
      jupiter.rotation.y += dt * .45;
      if (!state.orbits) {
        const list = nights();
        if (!list) return;
        state.orbits = fitOrbits(list); drawRings(); moons.visible = glows.visible = true; turnView(0);
      }
      const ours = kit.showing() === 'jupiter';
      if (run.s < 1) {
        run.s = Math.min(1, run.s + dt / run.travel);
        run.t = run.from + (run.to - run.from) * smooth(run.s);
        if (run.s >= 1) arrive();
      } else if (!ours && !run.fading) {
        run.hold -= dt;
        if (run.hold <= 0) { if (run.t >= last()) run.fading = -1; else travelTo(run.t + 1, STEP); }
      }
      // At the end of the run the moons fade, and come back on the first evening.
      if (run.fading) {
        run.fade = Math.max(0, Math.min(1, run.fade + run.fading * dt / .7));
        if (run.fading < 0 && run.fade === 0) { run.fading = 1; run.t = run.from = run.to = 0; run.s = 1; turnView(0); }
        else if (run.fading > 0 && run.fade === 1) { run.fading = 0; run.hold = HOLD; }
      }
      if (run.cross < 1) {
        run.cross = Math.min(1, run.cross + dt / .8);
        next.material.opacity = smooth(run.cross);
        if (run.cross >= 1) { run.sheet = 1 - run.sheet; view.material.map = sheets[run.sheet].map; next.visible = false; run.shown = run.coming; }
      }
      for (let k = 0; k < 4; k++) {
        const [x, y, z] = moonAt(k, run.t);
        o.position.set(x, y, z); o.scale.setScalar(MOON_SIZE[k] * Math.max(.001, run.fade)); o.updateMatrix(); moons.setMatrixAt(k, o.matrix);
        glowAt.setXYZ(k, x, y, z);
      }
      moons.instanceMatrix.needsUpdate = true; glowAt.needsUpdate = true; glows.material.opacity = .6 * run.fade;
      pointer.rotation.y = -run.t / DAYS * Math.PI * 2;
    },
    getState: () => ({
      photo: !!state.photo, page: state.page, evening: run.to, date: nights()?.[run.to]?.date || null, shown: run.shown, travelling: run.s < 1,
      // Each moon's place east of the planet, in Jupiter radii, as the model has it now.
      east: state.orbits ? MOONS.map((_, k) => Math.round(-moonAt(k, run.t)[0] / K * 1000) / 1000) : []
    }),
    targets: () => ({
      jupiter: photo.getWorldPosition(new THREE.Vector3()).toArray(),
      jove: jupiter.getWorldPosition(new THREE.Vector3()).toArray()
    }),
    open, step, showEvening, setPage
  };
}
