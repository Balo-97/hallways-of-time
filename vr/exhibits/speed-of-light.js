/**
 * The speed of light, as Rømer found it in Paris in 1676.
 *
 * Io slips into Jupiter's shadow every 42½ hours, as regular as a clock, and
 * astronomers timed those eclipses to find longitude. Rømer saw that they did
 * not keep time: they came later and later as the Earth drew away from
 * Jupiter, and earlier as it came back — by the time light takes to cross the
 * difference. Light was not instantaneous.
 *
 * On a mahogany tripod table a geared brass orrery shows where the Sun, the Earth and Jupiter
 * stood on any day of 1676 (JPL Horizons, data/romer-1676.json), with Io
 * circling into Jupiter's shadow and a pulse of light crossing to the Earth,
 * slower the farther it has to go. Its panel steps through the year, plotting
 * how late the eclipses were seen; puts Rømer's prediction for 9 November to
 * the visitor; and works out the speed of light from it. Beside it stands a
 * clock with a seconds pendulum, the kind the eclipses were timed with.
 */
import {GEO} from '../coastlines.js';

const AU_MINUTES = 499.004784 / 60;        // light's time across one astronomical unit
const AU_KM = 149597870.7;
const SCALE = .24;                         // orrery metres to the astronomical unit
const TOO_NEAR_THE_SUN = 25;               // degrees: Jupiter lost in the evening glare
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// 1676 was a leap year, as 2000 was, so the days of 2000 stand in for its dates.
const dayOf = (month, date) => Math.round((Date.UTC(2000, month, date) - Date.UTC(2000, 0, 1)) / 864e5);
const dateOf = day => { const d = new Date(Date.UTC(2000, 0, 1 + day)); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} 1676`; };
const MONTH_STARTS = MONTHS.map((_, m) => dayOf(m, 1));
// Rømer's prediction, made in September: the eclipse of 9 November, measured against those of late August.
const BET = {from: dayOf(7, 20), to: dayOf(10, 9)};

export function createSpeedOfLight(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'romer';
  const state = {days: null, day: dayOf(5, 1), seen: new Set(), mode: 'year', bet: null, io: 0};
  let nearest = 0, closest = 0;

  // ── Reading the year ─────────────────────────────────────────────────
  const at = day => state.days[day];
  const distance = day => { const [ex, ey, jx, jy] = at(day); return Math.hypot(jx - ex, jy - ey); };
  /** How far from the Sun Jupiter stands in the Earth's sky, in degrees. */
  const elongation = day => {
    const [ex, ey, jx, jy] = at(day), sx = -ex, sy = -ey, vx = jx - ex, vy = jy - ey;
    return Math.acos((sx * vx + sy * vy) / Math.hypot(sx, sy) / Math.hypot(vx, vy)) * 180 / Math.PI;
  };
  const visible = day => elongation(day) > TOO_NEAR_THE_SUN;
  /** Minutes later than when the Earth was nearest Jupiter that the eclipses were seen. */
  const late = day => (distance(day) - closest) * AU_MINUTES;
  const minutes = m => { const whole = Math.floor(m), s = Math.round((m - whole) * 60); return `${whole} min ${s} s`; };

  // ── The table and its orrery ─────────────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  // The orrery and its table larger than life, so the year on its face reads standing back; the clock stays a clock.
  const table = new THREE.Group(); table.scale.setScalar(1.3); wall.add(table);
  const mahogany = new THREE.MeshStandardMaterial({color: '#5a2a1a', roughness: .42, metalness: .05});
  const brass = M.brass;
  const up = new THREE.Vector3(0, 1, 0), span = new THREE.Vector3();
  /** A turned part: `profile` is [radius, height] pairs from the bottom up. */
  const turned = (profile, material, segments = 32) => new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
  // A tripod table: a turned column on three curving legs, a round top with a brass rim.
  {
    const column = turned([[.11, .12], [.13, .16], [.09, .24], [.075, .45], [.1, .52], [.07, .6], [.065, .74], [.12, .78]], mahogany); table.add(column);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + Math.PI / 6, out = new THREE.Vector3(Math.sin(a), 0, Math.cos(a));
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, .26, 0).addScaledVector(out, .08), new THREE.Vector3(0, .02, 0).addScaledVector(out, .3), new THREE.Vector3(0, .04, 0).addScaledVector(out, .62));
      table.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 20, .032, 8, false), mahogany));
      const foot = new THREE.Mesh(new THREE.SphereGeometry(.045, 12, 8), brass); foot.position.copy(out).multiplyScalar(.62).setY(.04); table.add(foot);
    }
    const top = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.48, .06, 96), mahogany); top.position.y = .81; table.add(top);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.5, .022, 6, 128), brass); rim.rotation.x = Math.PI / 2; rim.position.y = .84; table.add(rim);
  }
  // An enamel map of the year on the table top, painted once the year is loaded.
  const enamel = document.createElement('canvas'); enamel.width = enamel.height = 1024;
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.42, 96), new THREE.MeshStandardMaterial({map: kit.texture(enamel), roughness: .35, metalness: .1}));
  face.rotation.x = -Math.PI / 2; face.position.y = .842; table.add(face);
  // The orrery: in the table's plane, ecliptic x to the right and ecliptic y away from the visitor.
  const orrery = new THREE.Group(); orrery.position.y = .96; table.add(orrery); kit.moving(orrery);
  const place = (x, y) => new THREE.Vector3(x * SCALE, 0, -y * SCALE);
  /** A soft round glow, for the Sun, light, and the flash where it lands. */
  const glowMap = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128; const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, 'rgba(255,250,230,1)'); g.addColorStop(.25, 'rgba(255,214,130,.7)'); g.addColorStop(1, 'rgba(255,180,80,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128); return kit.texture(c);
  })();
  const sprite = (size, opacity = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({map: glowMap, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity}));
    s.scale.setScalar(size); return s;
  };
  // The mechanism under the Sun: a brass drum and three gears, which turn as the year is wound.
  const gears = [];
  {
    const drum = turned([[.0, -.17], [.15, -.17], [.15, -.12], [.13, -.11], [.13, -.06], [.04, -.05]], brass, 40); orrery.add(drum);
    const gear = (radius, teeth, y, thickness) => {
      const shape = new THREE.Shape(), depth = radius * .12;
      for (let i = 0; i <= teeth * 4; i++) {
        const a = i / (teeth * 4) * Math.PI * 2, r = i % 4 < 2 ? radius : radius - depth;
        i ? shape.lineTo(Math.cos(a) * r, Math.sin(a) * r) : shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      const hole = new THREE.Path(); hole.absarc(0, 0, radius * .25, 0, Math.PI * 2, true); shape.holes.push(hole);
      const m = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, {depth: thickness, bevelEnabled: false, curveSegments: 6}), brass);
      m.rotation.x = -Math.PI / 2; m.position.y = y; orrery.add(m); gears.push(m); return m;
    };
    gear(.12, 30, -.105, .012); gear(.085, 21, -.085, .012); gear(.055, 14, -.065, .012);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, .12, 12), brass); post.position.y = -.05; orrery.add(post);
  }
  const sun = new THREE.Mesh(new THREE.SphereGeometry(.06, 32, 16), new THREE.MeshBasicMaterial({color: '#ffcf6a'})); orrery.add(sun);
  const corona = sprite(.42, .9); orrery.add(corona);
  /** A sphere painted on a 512 by 256 canvas by `paint(ctx)`, in the equirectangular way. */
  const painted = (radius, paint) => {
    const c = document.createElement('canvas'); c.width = 512; c.height = 256; paint(c.getContext('2d'));
    return new THREE.Mesh(new THREE.SphereGeometry(radius, 32, 16), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .55}));
  };
  const earth = painted(.034, ctx => {
    ctx.fillStyle = '#245a9c'; ctx.fillRect(0, 0, 512, 256);
    ctx.fillStyle = '#5d8a4a'; ctx.strokeStyle = '#7da35e'; ctx.lineWidth = 1;
    for (const ring of Object.values(GEO)) {
      // A coast that runs right round the world is Antarctica's: the polar ice below stands for it.
      const lons = ring.filter((_, i) => i % 2 === 0); if (Math.max(...lons) - Math.min(...lons) > 270) continue;
      ctx.beginPath(); let prev = null;
      for (let i = 0; i < ring.length; i += 2) {
        let lon = ring[i]; if (prev !== null) { while (lon - prev > 180) lon -= 360; while (prev - lon > 180) lon += 360; } prev = lon;
        const x = (lon + 180) / 360 * 512, y = (90 - ring[i + 1]) / 180 * 256; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(240,245,250,.9)'; ctx.fillRect(0, 0, 512, 10); ctx.fillRect(0, 244, 512, 12);
  });
  // Jupiter is a frame for its globe, its moon and its shadow; only the globe spins.
  const jupiter = new THREE.Group(), jupiterGlobe = painted(.062, ctx => {
    const bands = ['#e8dcc4', '#c9a27a', '#efe4cf', '#b8835a', '#f1e7d4', '#c49a72', '#e6d6bb', '#a8734f', '#ecdfc8', '#c8a07c', '#e9dcc6'];
    bands.forEach((color, i) => { ctx.fillStyle = color; ctx.fillRect(0, i * 256 / bands.length, 512, 256 / bands.length + 1); });
    // Soft edges between bands, and the Great Red Spot.
    for (let i = 0; i < 400; i++) { ctx.fillStyle = `rgba(120,80,50,${Math.random() * .08})`; ctx.fillRect(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 60, 2); }
    ctx.fillStyle = '#b45a3c'; ctx.beginPath(); ctx.ellipse(330, 168, 22, 11, 0, 0, Math.PI * 2); ctx.fill();
  });
  const io = new THREE.Mesh(new THREE.SphereGeometry(.013, 16, 10), new THREE.MeshStandardMaterial({color: '#e8d58a', roughness: .6}));
  orrery.add(earth, jupiter); jupiter.add(jupiterGlobe, io);
  // Brass arms below the plane of the planets, each with a post up to its planet.
  const arm = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 1, 8), brass); orrery.add(m); return m; };
  const post = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .06, 8), brass); orrery.add(m); return m; };
  const earthArm = arm(), jupiterArm = arm(), earthPost = post(), jupiterPost = post();
  // Jupiter's shadow, a dark cone pointing away from the Sun, fading toward its tip, which Io passes into.
  const shadowFade = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64; const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 64); g.addColorStop(0, '#000'); g.addColorStop(1, '#fff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 64); const t = new THREE.CanvasTexture(c); return t;
  })();
  const shadow = new THREE.Mesh(new THREE.ConeGeometry(.062, .34, 24, 1, true), new THREE.MeshBasicMaterial({color: '#05070c', transparent: true, opacity: .6, alphaMap: shadowFade, side: THREE.DoubleSide, depthWrite: false}));
  jupiter.add(shadow);
  // The light, and pulses of it crossing from Jupiter to the Earth: each sets out
  // the moment Io comes out of the shadow, and crosses at an astronomical unit
  // a second, a short trail behind it. Where it lands a ring spreads round the
  // Earth: that is the moment an astronomer saw Io reappear, later the farther
  // the light had to come.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.003, .003, 1, 6), new THREE.MeshBasicMaterial({color: '#e8c56e', transparent: true, opacity: .25, depthWrite: false}));
  orrery.add(beam);
  const TRAIL = 5;
  const pulses = Array.from({length: 6}, () => {
    const dots = Array.from({length: TRAIL}, (_, k) => { const s = sprite(.11 * (1 - k * .15), 1 - k * .18); s.visible = false; orrery.add(s); return s; });
    return {dots, travelled: -1};
  });
  const ripple = new THREE.Mesh(new THREE.RingGeometry(.04, .052, 48), new THREE.MeshBasicMaterial({color: '#fff1c4', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide}));
  ripple.rotation.x = -Math.PI / 2; orrery.add(ripple);
  const flash = sprite(.12, 0); orrery.add(flash);
  const stretch = (mesh, from, to) => { span.subVectors(to, from); mesh.position.copy(from).addScaledVector(span, .5); mesh.scale.set(1, span.length(), 1); mesh.quaternion.setFromUnitVectors(up, span.normalize()); };
  /** The year at a day that need not be whole, so a step of a month glides rather than jumps. */
  const between = day => { const a = at(Math.floor(day)), b = at(Math.min(state.days.length - 1, Math.ceil(day))), t = day - Math.floor(day); return a.map((v, i) => v + (b[i] - v) * t); };
  const ARM_Y = -.06;
  function setOrrery() {
    if (!state.days) return;
    const [ex, ey, jx, jy] = between(state.shown ?? state.day), e = place(ex, ey), j = place(jx, jy);
    earth.position.copy(e); jupiter.position.copy(j);
    const low = v => v.clone().setY(ARM_Y);
    stretch(earthArm, low(sun.position), low(e)); stretch(jupiterArm, low(sun.position), low(j));
    earthPost.position.copy(e).setY(ARM_Y / 2); jupiterPost.position.copy(j).setY(ARM_Y / 2);
    stretch(beam, j, e);
    beam.material.opacity = visible(Math.round(state.shown ?? state.day)) ? .25 : .06;
    // The shadow points straight away from the Sun: the cone's tip, its +y, turned that way.
    const away = j.clone().normalize();
    shadow.quaternion.setFromUnitVectors(up, away);
    shadow.position.copy(away).multiplyScalar(.17);
  }
  // A crank on the rim at the front, which turns as the year is wound on.
  const crank = new THREE.Group(); crank.position.set(0, .87, 1.46); table.add(crank); kit.moving(crank);
  {
    const boss = new THREE.Mesh(new THREE.CylinderGeometry(.035, .035, .05, 16), brass); boss.rotation.x = Math.PI / 2; crank.add(boss);
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.016, .13, .012), brass); handle.position.set(0, .06, .03); crank.add(handle);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, .06, 12), mahogany); knob.rotation.x = Math.PI / 2; knob.position.set(0, .12, .06); crank.add(knob);
  }

  // ── A seconds pendulum ───────────────────────────────────────────────
  // Rømer's colleagues in Paris timed Io's eclipses with pendulum clocks, the
  // best timekeepers of the day: a pendulum a metre long swings once a second.
  // This one keeps the time where the visitor is, and its pendulum shows through the trunk.
  const clock = new THREE.Group(); clock.position.set(-2.5, 0, -.9); clock.rotation.y = .35; wall.add(clock);
  const walnut = new THREE.MeshStandardMaterial({color: '#4a2c19', roughness: .45});
  box(clock, [.62, .16, .4], [0, .08, 0], walnut);
  // The trunk is hollow, its front glazed between a frame, so the pendulum shows.
  box(clock, [.5, 1.36, .02], [0, .84, -.16], new THREE.MeshStandardMaterial({color: '#24170e', roughness: .85}));
  for (const x of [-.24, .24]) box(clock, [.02, 1.36, .32], [x, .84, -.01], walnut);
  for (const x of [-.215, .215]) box(clock, [.07, 1.36, .02], [x, .84, .145], walnut);
  box(clock, [.5, .24, .02], [0, .28, .145], walnut); box(clock, [.5, .18, .02], [0, 1.43, .145], walnut);
  box(clock, [.6, .52, .38], [0, 1.78, 0], walnut);
  box(clock, [.66, .06, .42], [0, 2.07, 0], walnut);
  const crest = new THREE.Mesh(new THREE.ConeGeometry(.32, .16, 4), walnut); crest.rotation.y = Math.PI / 4; crest.scale.z = .6; crest.position.y = 2.18; clock.add(crest);
  for (const x of [-.27, .27]) { const pillar = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .5, 12), brass); pillar.position.set(x, 1.78, .19); clock.add(pillar); }
  // The trunk's window, glazed, and the dial in the hood.
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(.3, .9), new THREE.MeshStandardMaterial({color: '#cfe0e8', transparent: true, opacity: .18, roughness: .05, metalness: .3, depthWrite: false}));
  glass.position.set(0, .87, .15); clock.add(glass);
  const dialCanvas = document.createElement('canvas'); dialCanvas.width = dialCanvas.height = 512;
  {
    const ctx = dialCanvas.getContext('2d');
    ctx.fillStyle = '#efe4c8'; ctx.beginPath(); ctx.arc(256, 256, 250, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(256, 256, 236, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(256, 256, 176, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1d1a17'; ctx.font = 'bold 40px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((n, i) => { const a = i / 12 * Math.PI * 2; ctx.fillText(n, 256 + Math.sin(a) * 206, 256 - Math.cos(a) * 206); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 228 : 222; ctx.beginPath(); ctx.moveTo(256 + Math.sin(a) * r0, 256 - Math.cos(a) * r0); ctx.lineTo(256 + Math.sin(a) * 234, 256 - Math.cos(a) * 234); ctx.lineWidth = i % 5 ? 2 : 4; ctx.stroke(); }
    ctx.font = 'italic 24px Georgia'; ctx.fillText('Paris', 256, 330);
  }
  const dial = new THREE.Mesh(new THREE.CircleGeometry(.2, 48), new THREE.MeshStandardMaterial({map: kit.texture(dialCanvas), roughness: .6}));
  dial.position.set(0, 1.79, .192); clock.add(dial);
  const handOf = (length, width, color) => {
    const g = new THREE.Group(); g.position.set(0, 1.79, .2 + width * .1); clock.add(g);
    const m = new THREE.Mesh(new THREE.BoxGeometry(width, length, .004), new THREE.MeshStandardMaterial({color, roughness: .4, metalness: .5})); m.position.y = length / 2 - .015; g.add(m);
    return g;
  };
  const hourHand = handOf(.11, .014, '#1d1a17'), minuteHand = handOf(.16, .01, '#1d1a17'), secondHand = handOf(.15, .004, '#9b2f22');
  // The pendulum, hung just below the dial: a rod a metre long and a brass bob.
  const pendulum = new THREE.Group(); pendulum.position.set(0, 1.5, -.03); clock.add(pendulum);
  { const rod = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, .95, 6), brass); rod.position.y = -.475; pendulum.add(rod);
    const bob = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, .018, 32), brass); bob.rotation.x = Math.PI / 2; bob.position.y = -.95; pendulum.add(bob); }
  kit.moving(pendulum, hourHand, minuteHand, secondHand);
  const clockState = {t: 0, second: -1};
  // Pressing the table, or anything on it, looks at the year.
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .5, 24), new THREE.MeshBasicMaterial({visible: false}));
  // Turned half a segment, so a press from straight in front never runs exactly along an edge and misses both faces.
  proxy.position.y = 1.05; proxy.rotation.y = Math.PI / 24; table.add(proxy);
  kit.press(proxy, () => open(), 'Rømer’s orrery');
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, p.tx, p.tz, [
      ['THE SPEED OF LIGHT', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Ole Rømer, Paris, 1676', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Io vanishes into Jupiter’s shadow every', .22, .033],
      ['42½ hours, like the tick of a clock — yet seen', .27, .033],
      ['from Earth the ticks run late. Press here or', .32, .033],
      ['on the orrery, and find out why.', .37, .033],
      ['The orrery shows 1676 as it was: JPL Horizons', .45, .028, '#a99a7c', 'italic #px Georgia, serif'],
      ['Distances to scale; sizes are not.', .49, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Rømer plaque');
  }

  function paintEnamel() {
    const ctx = enamel.getContext('2d'), c = 512, k = 512 / 1.4 * SCALE;       // pixels to the astronomical unit
    ctx.fillStyle = '#16213b'; ctx.fillRect(0, 0, 1024, 1024);
    ctx.strokeStyle = '#c9a664'; ctx.fillStyle = '#e1c393'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(c, c, k, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, 5.2 * k, 0, Math.PI * 2); ctx.globalAlpha = .45; ctx.stroke(); ctx.globalAlpha = 1;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // The months round the Earth's orbit, and Jupiter's way through the year on its own.
    MONTH_STARTS.forEach((day, m) => {
      const [ex, ey, jx, jy] = at(day);
      ctx.font = '600 20px Arial'; ctx.fillText(MONTHS[m].slice(0, 3).toUpperCase(), c + ex * k * 1.75, c - ey * k * 1.75);
      // Jupiter moves a twelfth of its orbit in a year: a dot each month, a name each season.
      ctx.beginPath(); ctx.arc(c + jx * k, c - jy * k, 5, 0, Math.PI * 2); ctx.fill();
      if (m % 3 === 0) { ctx.font = '600 18px Arial'; ctx.fillText(MONTHS[m].slice(0, 3).toUpperCase(), c + jx * k * .92, c - jy * k * .92); }
    });
    ctx.font = 'italic 26px Georgia'; ctx.fillText('The Earth and Jupiter through 1676', c, 1024 - 70);
    face.material.map.needsUpdate = true;
  }

  // ── The panel ────────────────────────────────────────────────────────
  const KICKER = 'RØMER’S CLOCK · PARIS OBSERVATORY, 1676';
  function drawYearMap(ctx, cx, cy, radius, days) {
    const k = radius / 5.6;
    ctx.save();
    ctx.fillStyle = '#0d1220'; ctx.beginPath(); ctx.arc(cx, cy, radius + 10, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#3e4a5e'; ctx.lineWidth = 2;
    for (const r of [1, 5.2]) { ctx.beginPath(); ctx.arc(cx, cy, r * k, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#ffd47a'; ctx.beginPath(); ctx.arc(cx, cy, 8, 0, Math.PI * 2); ctx.fill();
    for (const [day, strong] of days) {
      const [ex, ey, jx, jy] = at(day), seen = visible(day);
      ctx.strokeStyle = seen ? (strong ? '#e8c56e' : '#8f7a46') : '#555b66'; ctx.lineWidth = strong ? 3 : 2;
      ctx.setLineDash(seen ? [] : [6, 6]);
      ctx.beginPath(); ctx.moveTo(cx + jx * k, cy - jy * k); ctx.lineTo(cx + ex * k, cy - ey * k); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#4f86c6'; ctx.beginPath(); ctx.arc(cx + ex * k, cy - ey * k, strong ? 8 : 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9b58c'; ctx.beginPath(); ctx.arc(cx + jx * k, cy - jy * k, strong ? 11 : 8, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    ctx.fillStyle = '#9d9786'; ctx.font = '18px Arial'; ctx.textAlign = 'center';
    ctx.fillText('SUN · EARTH (BLUE) · JUPITER (GOLD), FROM ABOVE', cx, cy + radius + 36); ctx.textAlign = 'left';
  }
  function drawChart(ctx) {
    const x0 = 650, x1 = 1140, y0 = 600, y1 = 280, most = 18;
    const X = day => x0 + (x1 - x0) * day / 365, Y = m => y0 - (y0 - y1) * m / most;
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText('HOW LATE IO’S ECLIPSES ARE SEEN', 640, 236);
    // When Jupiter is too near the Sun to watch, the year is shaded.
    ctx.fillStyle = '#2b2f2a';
    for (let day = 0; day < 366; day++) if (!visible(day)) ctx.fillRect(X(day), y1, (x1 - x0) / 365 + .5, y0 - y1);
    ctx.strokeStyle = '#4b5640'; ctx.lineWidth = 1;
    ctx.fillStyle = '#9d9786'; ctx.font = '16px Arial';
    for (const m of [0, 5, 10, 15]) { ctx.beginPath(); ctx.moveTo(x0, Y(m)); ctx.lineTo(x1, Y(m)); ctx.stroke(); ctx.fillText(`${m}`, x0 - 26, Y(m) + 5); }
    ctx.fillText('min', x0 - 34, y1 - 8);
    MONTHS.forEach((name, m) => ctx.fillText(name[0], X(MONTH_STARTS[m]) + 12, y0 + 24));
    // Once half the year is looked at, the whole curve is drawn in faintly.
    if (state.seen.size >= 6) {
      ctx.strokeStyle = 'rgba(232,197,110,.35)'; ctx.lineWidth = 2; ctx.beginPath();
      for (let day = 0; day < 366; day++) day ? ctx.lineTo(X(day), Y(late(day))) : ctx.moveTo(X(day), Y(late(day)));
      ctx.stroke();
    }
    for (const day of state.seen) {
      const current = day === state.day;
      ctx.fillStyle = visible(day) ? (current ? '#f4dca2' : '#c9a664') : '#6b6f78';
      ctx.beginPath(); ctx.arc(X(day), Y(late(day)), current ? 8 : 5, 0, Math.PI * 2); ctx.fill();
    }
  }
  function storyLink(ctx, words) {
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right';
    ctx.fillText(words, 1140, 968); ctx.textAlign = 'left';
  }
  function caption(ctx, text, y = 800) {
    ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
    wrapped(ctx, text, 1080).slice(0, 4).forEach((line, i) => ctx.fillText(line, 60, y + i * 33));
  }
  function paintYear() {
    const {canvas, ctx} = board(KICKER, state.days ? dateOf(state.day) : 'Preparing the year…');
    if (!state.days) return canvas;
    ctx.fillStyle = '#b3a98c'; ctx.font = '22px Arial';
    ctx.fillText('IO SLIPS INTO JUPITER’S SHADOW EVERY 42½ HOURS, AS REGULAR AS A CLOCK', 60, 162, 1080);
    drawYearMap(ctx, 320, 445, 230, [[state.day, true]]);
    drawChart(ctx);
    const d = distance(state.day);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '40px Georgia';
    ctx.fillText(visible(state.day) ? `Seen ${late(state.day).toFixed(1)} minutes late` : 'No eclipses to be seen', 640, 676, 500);
    ctx.fillStyle = '#b3a98c'; ctx.font = '20px Arial';
    ctx.fillText(visible(state.day) ? `than on ${dateOf(nearest)}, when the Earth was nearest Jupiter` : 'Jupiter is too near the Sun, lost in the evening glare', 640, 710, 500);
    ctx.fillText(`EARTH TO JUPITER: ${d.toFixed(2)} AU, ${Math.round(d * AU_KM / 1e6)} MILLION KM · LIGHT TAKES ${minutes(d * AU_MINUTES).toUpperCase()}`, 60, 760, 1080);
    caption(ctx, 'Astronomers timed these eclipses to find longitude, and they would not keep time: as the Earth drew away from Jupiter they came later and later, as it came back, earlier. Step through the year and plot them. Then make Rømer’s bet.', 806);
    storyLink(ctx, 'Read Rømer’s moment in the timeline ›');
    return canvas;
  }
  const betFacts = () => {
    const extra = distance(BET.to) - distance(BET.from);
    return {au: extra, km: Math.round(extra * AU_KM / 1e6), minutes: extra * AU_MINUTES};
  };
  function paintBet() {
    const {canvas, ctx} = board(KICKER, 'Rømer’s bet, September 1676');
    drawYearMap(ctx, 320, 445, 230, [[BET.from, false], [BET.to, true]]);
    ctx.fillStyle = '#9d9786'; ctx.font = '18px Arial';
    ctx.fillText('FAINT: LATE AUGUST  ·  BRIGHT: 9 NOVEMBER', 140, 740);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '27px Georgia';
    const question = 'That September Rømer made a prediction about the eclipse of Io due on 9 November. Measured against the eclipses of late August, would Io vanish early, on time, or late?';
    wrapped(ctx, question, 490).forEach((line, i) => ctx.fillText(line, 650, 250 + i * 37));
    if (state.bet) {
      const f = betFacts(), right = state.bet === 'late';
      ctx.fillStyle = right ? '#cfe3b0' : '#e8c56e'; ctx.font = '36px Georgia';
      ctx.fillText(right ? 'Late — you called it.' : `Not ${state.bet === 'early' ? 'early' : 'on time'}: late.`, 650, 545);
      ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
      wrapped(ctx, `About ten minutes late, just as Rømer had said. Since late August the Earth had drawn ${f.au.toFixed(2)} AU farther from Jupiter — ${f.km} million kilometres — and the light took ${f.minutes.toFixed(1)} minutes longer to cross it.`, 490)
        .forEach((line, i) => ctx.fillText(line, 650, 595 + i * 34));
    }
    storyLink(ctx, 'Read Rømer’s moment in the timeline ›');
    return canvas;
  }
  function paintAnswer() {
    const {canvas, ctx} = board(KICKER, 'How fast is light?');
    const across = 2 * AU_KM, seconds = 2 * AU_MINUTES * 60;
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText('ACROSS THE EARTH’S ORBIT', 60, 232);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '50px Georgia';
    ctx.fillText(`${Math.round(across / 1e6)} million km  ÷  ${minutes(seconds / 60)}`, 60, 300, 1080);
    ctx.fillStyle = '#e8c56e'; ctx.font = '62px Georgia';
    ctx.fillText(`≈ ${Math.round(across / seconds).toLocaleString('en-GB')} km every second`, 60, 390, 1080);
    caption(ctx, 'Across the width of the Earth’s orbit, some 300 million kilometres, light takes about 16 minutes 38 seconds. Rømer put the delay at about 22 minutes, and the speed others worked out from his figure was some 25% low — but he had shown that light takes time to travel, when most held that it arrived in an instant.', 480);
    caption(ctx, 'Light from the Sun reaches us in 8 minutes 19 seconds. Since 1983 its speed has been fixed exactly: 299,792,458 metres every second, and the metre is measured by it.', 690);
    storyLink(ctx, 'Read Rømer’s moment in the timeline ›');
    return canvas;
  }
  const storyZone = () => [{x: 640, y: 945, w: 520, h: 40, label: 'Rømer’s story', fn: () => kit.story(id)}];
  kit.panel(id, {
    paint: () => state.mode === 'bet' ? paintBet() : state.mode === 'answer' ? paintAnswer() : paintYear(),
    zones: storyZone,
    actions: () => state.mode === 'year'
      ? [['← A MONTH', () => stepMonth(-1)], ['A MONTH →', () => stepMonth(1)], ['RØMER’S BET', () => setMode('bet')], ['CLOSE', kit.close]]
      : state.mode === 'bet' && !state.bet
        ? [['EARLY', () => bet('early')], ['ON TIME', () => bet('on time')], ['LATE', () => bet('late')], ['← THE YEAR', () => setMode('year')]]
        : state.mode === 'bet'
          ? [['← THE YEAR', () => setMode('year')], ['LIGHT’S SPEED →', () => setMode('answer')], ['CLOSE', kit.close]]
          : [['← THE YEAR', () => setMode('year')], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function open() {
    if (state.days) state.seen.add(state.day);
    state.mode = 'year'; kit.open(id);
  }
  function setDay(day) {
    if (!state.days) return;
    state.day = Math.max(0, Math.min(state.days.length - 1, day)); state.seen.add(state.day); setOrrery(); kit.redraw();
  }
  function stepMonth(delta) {
    const month = MONTH_STARTS.findLastIndex(start => start <= state.day);
    const next = state.day > MONTH_STARTS[month] && delta < 0 ? month : month + delta;
    setDay(MONTH_STARTS[Math.max(0, Math.min(11, next))]);
  }
  function setMode(mode) {
    state.mode = mode;
    if (mode === 'bet') { state.bet = null; state.day = BET.to; setOrrery(); }
    kit.redraw();
  }
  function bet(choice) { state.bet = choice; kit.redraw(); }

  return {
    id,
    prepare: () => kit.load('../data/romer-1676.json').then(data => {
      // Turned so that Jupiter's way through the year lies across the far side
      // of the table, and the visitor looks over the Earth's orbit toward it.
      // Distances and angles between the bodies do not change.
      const mean = data.days.reduce((s, d) => [s[0] + d[2], s[1] + d[3]], [0, 0]);
      const turn = Math.PI / 2 - Math.atan2(mean[1], mean[0]), c = Math.cos(turn), s = Math.sin(turn);
      state.days = data.days.map(([ex, ey, jx, jy]) => [ex * c - ey * s, ex * s + ey * c, jx * c - jy * s, jx * s + jy * c]);
      const distances = state.days.map((_, day) => distance(day));
      closest = Math.min(...distances); nearest = distances.indexOf(closest);
      paintEnamel(); setOrrery();
      if (kit.showing() === id) kit.redraw();
    }),
    update(dt) {
      clockState.t += dt;
      // The clock: the pendulum swings a second each way, and the second hand steps as it reaches the end of a swing.
      const now = new Date(), seconds = now.getSeconds(), minutes = now.getMinutes() + seconds / 60, hours = now.getHours() % 12 + minutes / 60;
      pendulum.rotation.z = Math.sin((now.getMilliseconds() / 1000 + seconds) * Math.PI) * .07;
      if (seconds !== clockState.second) { clockState.second = seconds; clockState.tick = 0; }
      clockState.tick = Math.min(1, (clockState.tick ?? 1) + dt * 12);
      const settle = 1 + Math.sin(clockState.tick * Math.PI) * .08 * (1 - clockState.tick);   // a little overshoot as it lands
      secondHand.rotation.z = -((seconds - 1) + clockState.tick * settle) / 60 * Math.PI * 2;
      minuteHand.rotation.z = -minutes / 60 * Math.PI * 2; hourHand.rotation.z = -hours / 12 * Math.PI * 2;
      // The Sun breathes a little; the planets turn on their axes.
      corona.scale.setScalar(.42 * (1 + Math.sin(clockState.t * 1.7) * .05 + Math.sin(clockState.t * 4.3) * .02));
      earth.rotation.y += dt * 1.2; jupiterGlobe.rotation.y += dt * 2.6;
      if (!state.days) return;
      // The planets glide to a newly chosen date along their orbits, and the gears and the crank turn with them.
      if (state.shown === undefined) state.shown = state.day;
      if (state.shown !== state.day) {
        const before = state.shown;
        state.shown += (state.day - state.shown) * Math.min(1, dt * 3);
        if (Math.abs(state.day - state.shown) < .05) state.shown = state.day;
        const turned = (state.shown - before) / 365 * Math.PI * 2;
        gears.forEach((g, i) => { g.rotation.z += turned * (i % 2 ? -1.4 : 1) * (1 + i * .5); });
        crank.rotation.z -= turned * 6;
        setOrrery();
      }
      // Io round Jupiter, a turn every three seconds, darkening as it slips into the shadow.
      state.io = (state.io + dt * Math.PI * 2 / 3) % (Math.PI * 2);
      io.position.set(Math.cos(state.io) * .12, 0, Math.sin(state.io) * .12);
      const away = jupiter.position.clone().setY(0).normalize();
      const into = Math.cos(state.io) * away.x + Math.sin(state.io) * away.z, shaded = into > Math.cos(.42);
      io.material.color.set('#e8d58a').lerp(new THREE.Color('#25272e'), Math.max(0, Math.min(1, (into - Math.cos(.55)) / (Math.cos(.38) - Math.cos(.55)))));
      // Coming out of the shadow, Io sends a pulse of light toward the Earth.
      const seen = visible(Math.round(state.shown));
      if (state.shaded && !shaded && seen) { const free = pulses.find(p => p.travelled < 0); if (free) { free.travelled = 0; state.sent = (state.sent || 0) + 1; } }
      state.shaded = shaded;
      const d = jupiter.position.distanceTo(earth.position) / SCALE;
      for (const p of pulses) {
        if (p.travelled < 0) continue;
        p.travelled += dt;                       // an astronomical unit a second
        if (p.travelled >= d + .3) { p.travelled = -1; p.dots.forEach(s => s.visible = false); continue; }
        if (p.travelled >= d && !p.landed) { p.landed = true; state.flash = 1; }
        if (p.travelled < d) p.landed = false;
        // The trail: each dot a little behind the one before, and none past the Earth.
        p.dots.forEach((s, k) => {
          const along = p.travelled - k * .05;
          s.visible = along > 0 && along < d;
          if (s.visible) s.position.lerpVectors(jupiter.position, earth.position, along / d);
        });
      }
      // Where light lands, a ring spreads round the Earth and a glow fades.
      state.flash = Math.max(0, (state.flash || 0) - dt * 1.1);
      const spread = 1 - state.flash;
      ripple.position.copy(earth.position); ripple.scale.setScalar(1 + spread * 3.2); ripple.material.opacity = state.flash * .9;
      flash.position.copy(earth.position); flash.material.opacity = state.flash ** 2 * .9; flash.scale.setScalar(.08 + spread * .1);
    },
    getState: () => state.days ? {loaded: true, day: state.day, date: dateOf(state.day), mode: state.mode, bet: state.bet,
      late: late(state.day), visible: visible(state.day), nearest: dateOf(nearest), seen: [...state.seen].sort((a, b) => a - b),
      betMinutes: betFacts().minutes, inFlight: pulses.filter(p => p.travelled >= 0).length, sent: state.sent || 0, range: (Math.max(...state.days.map((_, d) => distance(d))) - closest) * AU_MINUTES} : {loaded: false},
    targets: () => ({romer: table.localToWorld(new THREE.Vector3(0, 1.05, 0)).toArray()}),
    open, setDay, stepMonth, setMode, bet
  };
}
