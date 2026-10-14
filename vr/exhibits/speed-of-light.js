/**
 * The speed of light, as Rømer found it in Paris in 1676.
 *
 * Io slips into Jupiter's shadow every 42½ hours, as regular as a clock, and
 * astronomers timed those eclipses to find longitude. Rømer saw that they did
 * not keep time: they came later and later as the Earth drew away from
 * Jupiter, and earlier as it came back — by the time light takes to cross the
 * difference. Light was not instantaneous.
 *
 * On a round table a brass orrery shows where the Sun, the Earth and Jupiter
 * stood on any day of 1676 (JPL Horizons, data/romer-1676.json), with Io
 * circling into Jupiter's shadow and a pulse of light crossing to the Earth,
 * slower the farther it has to go. Its panel steps through the year, plotting
 * how late the eclipses were seen; puts Rømer's prediction for 9 November to
 * the visitor; and works out the speed of light from it.
 */
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
  const table = new THREE.Group(); wall.add(table);
  box(table, [.9, .78, .9], [0, .39, 0], M.slate);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .07, 96), M.ivory); top.position.y = .815; table.add(top);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.45, .03, 6, 96), M.gold); rim.rotation.x = Math.PI / 2; rim.position.y = .85; table.add(rim);
  // An enamel map of the year on the table top, painted once the year is loaded.
  const enamel = document.createElement('canvas'); enamel.width = enamel.height = 1024;
  const face = new THREE.Mesh(new THREE.CircleGeometry(1.4, 96), new THREE.MeshStandardMaterial({map: kit.texture(enamel), roughness: .4, metalness: .1}));
  face.rotation.x = -Math.PI / 2; face.position.y = .852; table.add(face);
  // The orrery: in the table's plane, ecliptic x to the right and ecliptic y away from the visitor.
  const orrery = new THREE.Group(); orrery.position.y = .92; table.add(orrery); kit.moving(orrery);
  const place = (x, y) => new THREE.Vector3(x * SCALE, 0, -y * SCALE);
  const glow = (color, r) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), new THREE.MeshBasicMaterial({color}));
  const sun = glow('#ffd47a', .055); orrery.add(sun);
  const sphere = (color, r) => new THREE.Mesh(new THREE.SphereGeometry(r, 20, 12), new THREE.MeshStandardMaterial({color, roughness: .5}));
  const earth = sphere('#4f86c6', .03), jupiter = sphere('#d9b58c', .05), io = sphere('#f4ecd8', .012);
  orrery.add(earth, jupiter); jupiter.add(io);
  const arm = () => { const m = new THREE.Mesh(new THREE.CylinderGeometry(.004, .004, 1, 6), M.brass); orrery.add(m); return m; };
  const earthArm = arm(), jupiterArm = arm();
  // Jupiter's shadow, a dark cone pointing away from the Sun, which Io passes into.
  const shadow = new THREE.Mesh(new THREE.ConeGeometry(.05, .3, 16, 1, true), new THREE.MeshBasicMaterial({color: '#0b0d14', transparent: true, opacity: .55, side: THREE.DoubleSide}));
  jupiter.add(shadow);
  // The light, and a pulse of it crossing from Jupiter to the Earth.
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.005, .005, 1, 6), new THREE.MeshBasicMaterial({color: '#e8c56e', transparent: true, opacity: .55}));
  orrery.add(beam);
  // Pulses of light: each sets out from Jupiter the moment Io comes out of the
  // shadow, and crosses to the Earth at an astronomical unit a second. When
  // one arrives the Earth flashes: that is the moment an astronomer saw Io
  // reappear, later the farther the light had to come.
  const pulses = Array.from({length: 8}, () => { const mesh = glow('#fff3c2', .022); mesh.visible = false; orrery.add(mesh); return {mesh, travelled: -1}; });
  const flash = glow('#fff6d6', .045); flash.material.transparent = true; flash.material.opacity = 0; flash.material.depthWrite = false; earth.add(flash);
  const up = new THREE.Vector3(0, 1, 0), span = new THREE.Vector3();
  const stretch = (mesh, from, to) => { span.subVectors(to, from); mesh.position.copy(from).addScaledVector(span, .5); mesh.scale.set(1, span.length(), 1); mesh.quaternion.setFromUnitVectors(up, span.normalize()); };
  /** The year at a day that need not be whole, so a step of a month glides rather than jumps. */
  const between = day => { const a = at(Math.floor(day)), b = at(Math.min(state.days.length - 1, Math.ceil(day))), t = day - Math.floor(day); return a.map((v, i) => v + (b[i] - v) * t); };
  function setOrrery() {
    if (!state.days) return;
    const [ex, ey, jx, jy] = between(state.shown ?? state.day), e = place(ex, ey), j = place(jx, jy);
    earth.position.copy(e); jupiter.position.copy(j);
    stretch(earthArm, sun.position, e); stretch(jupiterArm, sun.position, j);
    stretch(beam, j, e);
    beam.material.opacity = visible(Math.round(state.shown ?? state.day)) ? .35 : .1;
    // The shadow points straight away from the Sun: the cone's tip, its +y, turned that way.
    const away = j.clone().normalize();
    shadow.quaternion.setFromUnitVectors(up, away);
    shadow.position.copy(away).multiplyScalar(.15);
  }
  // Pressing the table, or anything on it, looks at the year.
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.45, .5, 24), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.05; table.add(proxy);
  kit.press(proxy, () => open(), 'Rømer’s orrery');
  {
    const p = kit.inRoom(wall, 2.5, 1.5);
    kit.plaque(p.x, p.z, 0, 0, [
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
      if (!state.days) return;
      // The planets glide to a newly chosen date along their orbits.
      if (state.shown === undefined) state.shown = state.day;
      if (state.shown !== state.day) {
        state.shown += (state.day - state.shown) * Math.min(1, dt * 3.5);
        if (Math.abs(state.day - state.shown) < .05) state.shown = state.day;
        setOrrery();
      }
      // Io round Jupiter, a turn every three seconds, dark while it is in the shadow.
      state.io = (state.io + dt * Math.PI * 2 / 3) % (Math.PI * 2);
      io.position.set(Math.cos(state.io) * .11, 0, Math.sin(state.io) * .11);
      const away = jupiter.position.clone().setY(0).normalize();
      const shaded = Math.cos(state.io) * away.x + Math.sin(state.io) * away.z > Math.cos(.42);
      io.material.color.set(shaded ? '#2f323a' : '#f4ecd8');
      // Coming out of the shadow, Io sends a pulse of light toward the Earth.
      const seen = visible(Math.round(state.shown));
      if (state.shaded && !shaded && seen) { const free = pulses.find(p => p.travelled < 0); if (free) free.travelled = 0; }
      state.shaded = shaded;
      const d = jupiter.position.distanceTo(earth.position) / SCALE;
      for (const p of pulses) {
        if (p.travelled < 0) continue;
        p.travelled += dt;                       // an astronomical unit a second
        if (p.travelled >= d) { p.travelled = -1; p.mesh.visible = false; state.flash = .7; continue; }
        p.mesh.visible = true; p.mesh.position.lerpVectors(jupiter.position, earth.position, p.travelled / d);
      }
      state.flash = Math.max(0, (state.flash || 0) - dt);
      flash.material.opacity = state.flash / .7 * .8; flash.scale.setScalar(1 + (1 - state.flash / .7) * 1.5);
    },
    getState: () => state.days ? {loaded: true, day: state.day, date: dateOf(state.day), mode: state.mode, bet: state.bet,
      late: late(state.day), visible: visible(state.day), nearest: dateOf(nearest), seen: [...state.seen].sort((a, b) => a - b),
      betMinutes: betFacts().minutes, range: (Math.max(...state.days.map((_, d) => distance(d))) - closest) * AU_MINUTES} : {loaded: false},
    targets: () => ({romer: table.localToWorld(new THREE.Vector3(0, 1.05, 0)).toArray()}),
    open, setDay, stepMonth, setMode, bet
  };
}
