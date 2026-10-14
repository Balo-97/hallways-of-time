/**
 * Gutenberg's press: set your name in type and print it.
 *
 * The press was not the invention — screw presses squeezed grapes and linen
 * long before. What Gutenberg solved, around 1450 in Mainz, was the type:
 * letters cast by the thousand in a hand mould, each one back to front so that
 * it prints the right way round, and an oily ink that clings to metal.
 *
 * A wooden common press stands with its type cases, ink balls and a drying
 * line. Its panel is the type case: pick the letters, and watch them go into
 * the composing stick backwards, as metal type does, while the stick on the
 * case fills with sorts. Then ink and print, and the press works through the
 * whole of a pull: the balls dab ink on the type, a sheet is laid on the
 * tympan, the frisket and tympan fold down, the bed rolls in under the platen,
 * the bar comes over and the screw presses, the bed rolls out, and the page —
 * its initial painted in red, as the initials of Gutenberg's Bible were, by
 * hand — is carried to the line to dry.
 */
const LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', '&', '.', ',', '-', ' ', '⌫'];
const LONGEST = 14;
const DRYING = 4;      // pages on the line at once
// The pull, step by step, in seconds.
const STEPS = [['ink', 1.8], ['sheet', .7], ['frisket', .5], ['tympan', .8], ['in', .9], ['pull', 1.5], ['out', .9], ['open', .8], ['take', 1.6]];
const TOTAL = STEPS.reduce((sum, [, d]) => sum + d, 0);
const STARTS = Object.fromEntries(STEPS.map(([name], i) => [name, STEPS.slice(0, i).reduce((s, [, d]) => s + d, 0)]));
const DURATION = Object.fromEntries(STEPS);
const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const clamp01 = t => Math.max(0, Math.min(1, t));

export function createPrintingPress(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'gutenberg';
  const state = {line: '', t: -1, pulling: '', printed: [], sway: 0};
  /** How far through a step of the pull, 0 before it and 1 after. */
  const phase = name => state.t < 0 ? 0 : clamp01((state.t - STARTS[name]) / DURATION[name]);

  // ── Materials: oak with its grain, iron, and the forme's type ────────
  const grain = (base, dark, seed) => {
    const c = document.createElement('canvas'); c.width = 128; c.height = 512; const ctx = c.getContext('2d');
    ctx.fillStyle = base; ctx.fillRect(0, 0, 128, 512);
    let s = seed; const random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 70; i++) {
      const x = random() * 128, w = .4 + random() * 1.6;
      ctx.strokeStyle = `rgba(${dark},${.04 + random() * .1})`; ctx.lineWidth = w;
      ctx.beginPath(); ctx.moveTo(x, 0); for (let y = 0; y <= 512; y += 64) ctx.lineTo(x + Math.sin(y / 160 + i) * 1.2, y); ctx.stroke();
    }
    const map = kit.texture(c); map.wrapS = map.wrapT = THREE.RepeatWrapping; return map;
  };
  const oak = new THREE.MeshStandardMaterial({color: '#ffffff', map: grain('#7a5232', '40,22,10', 11), roughness: .66});
  const darkOak = new THREE.MeshStandardMaterial({color: '#ffffff', map: grain('#4a301c', '20,10,4', 23), roughness: .6});
  // Beams lie across the grain's way in their texture, so theirs is turned a quarter to run along them.
  const across = material => { const m = material.clone(); m.map = material.map.clone(); m.map.center.set(.5, .5); m.map.rotation = Math.PI / 2; m.map.needsUpdate = true; return m; };
  const oakBeam = across(oak), darkBeam = across(darkOak);
  const iron = new THREE.MeshStandardMaterial({color: '#2d2f33', metalness: .6, roughness: .45});
  const parchment = new THREE.MeshStandardMaterial({color: '#e9dcbc', roughness: .9, side: THREE.DoubleSide});
  const up = new THREE.Vector3(0, 1, 0);
  /** A timber from one point to another, `w` by `d` in section. */
  function strut(parent, from, to, w, d, material) {
    const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), span = b.clone().sub(a);
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, span.length(), d), material);
    m.position.copy(a).addScaledVector(span, .5); m.quaternion.setFromUnitVectors(up, span.normalize()); parent.add(m); return m;
  }

  // ── The press ────────────────────────────────────────────────────────
  // In its wall frame: x along the wall, z out toward the room, the press's front.
  const wall = kit.onWall(angle, kit.STAGE);
  const press = new THREE.Group(); wall.add(press);
  for (const side of [-1, 1]) {
    box(press, [.17, 2.1, .3], [side * .62, 1.05, 0], oak);                  // the cheeks
    box(press, [.22, .16, 1.75], [side * .62, .08, .25], darkBeam);         // the feet, long sills front and back
    strut(press, [side * .62, .16, .82], [side * .62, .95, .15], .09, .09, oak);   // braces
    strut(press, [side * .62, .16, -.58], [side * .62, .95, -.15], .09, .09, oak);
  }
  box(press, [1.56, .3, .34], [0, 1.96, 0], oakBeam);                        // the head
  box(press, [1.7, .08, .42], [0, 2.15, 0], darkBeam);                       // the cap
  for (const side of [-1, 1]) {
    const finial = new THREE.Mesh(new THREE.SphereGeometry(.07, 16, 10), darkOak); finial.position.set(side * .78, 2.24, 0); press.add(finial);
  }
  box(press, [1.27, .07, .3], [0, 1.18, -.04], oakBeam);                     // the till, which steadies the hose
  box(press, [1.56, .22, .34], [0, .78, 0], oakBeam);                        // the winter, under the bed
  // The screw: brass, cut with its thread.
  const screw = new THREE.Group(); screw.position.y = 1.62; press.add(screw);
  {
    screw.add(new THREE.Mesh(new THREE.CylinderGeometry(.042, .042, .5, 20), M.brass));
    const turns = 6, curve = new THREE.Curve();
    curve.getPoint = t => new THREE.Vector3(Math.cos(t * turns * Math.PI * 2) * .045, -.24 + t * .48, Math.sin(t * turns * Math.PI * 2) * .045);
    screw.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 120, .009, 6, false), M.brass));
  }
  // The hose that carries the platen, the platen itself, and the bar that turns the screw.
  const hose = new THREE.Group(); hose.position.y = 1.36; press.add(hose);
  box(hose, [.16, .26, .16], [0, 0, 0], oak);
  for (const y of [-.1, .1]) box(hose, [.17, .025, .17], [0, y, 0], iron);
  const platen = new THREE.Group(); platen.position.y = -.17; hose.add(platen);
  box(platen, [.68, .07, .52], [0, -.03, 0], darkOak); box(platen, [.6, .015, .44], [0, -.07, 0], iron);
  for (const [x, z] of [[-.3, -.22], [.3, -.22], [-.3, .22], [.3, .22]]) strut(platen, [x, 0, z], [x * .2, .14, z * .2], .012, .012, iron);
  const bar = new THREE.Group(); bar.position.y = 1.52; press.add(bar);
  {
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(.017, .02, .78, 10), iron); rod.rotation.z = Math.PI / 2; rod.position.x = .39; bar.add(rod);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .24, 12), oak); grip.rotation.z = Math.PI / 2; grip.position.x = .86; bar.add(grip);
  }
  const BAR_REST = .55; bar.rotation.y = BAR_REST;
  // The rails the bed runs on, held up at the front by a stand, with the rounce to wind it.
  for (const x of [-.3, .3]) box(press, [.06, .05, 2.0], [x, .915, .55], darkOak);
  for (const x of [-.36, .36]) box(press, [.08, .89, .08], [x, .445, 1.48], oak);
  box(press, [.8, .06, .1], [0, .86, 1.48], oak);
  const rounce = new THREE.Group(); rounce.position.set(.46, .93, 1.2); press.add(rounce);
  {
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .2, 8), iron); axle.rotation.z = Math.PI / 2; rounce.add(axle);
    const crank = box(rounce, [.025, .26, .025], [.09, .12, 0], iron);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(.022, .022, .12, 10), oak); knob.rotation.z = Math.PI / 2; knob.position.set(.15, .24, 0); rounce.add(knob);
    crank.name = 'rounce crank';
  }
  // The carriage: the coffin that holds the forme of type, rolling on the rails.
  const OUT = .62, IN = 0;
  const carriage = new THREE.Group(); carriage.position.set(0, .94, OUT); press.add(carriage);
  box(carriage, [.74, .06, .64], [0, 0, 0], darkOak);
  for (const side of [-1, 1]) box(carriage, [.04, .06, .64], [side * .35, .05, 0], oak);
  // The forme: the type locked in its chase, the line set back to front.
  const formeCanvas = document.createElement('canvas'); formeCanvas.width = 512; formeCanvas.height = 384;
  const formeMap = kit.texture(formeCanvas);
  const forme = new THREE.Mesh(new THREE.BoxGeometry(.56, .045, .42), [iron, iron, new THREE.MeshStandardMaterial({map: formeMap, metalness: .55, roughness: .4}), iron, iron, iron]);
  forme.position.y = .05; carriage.add(forme);
  function paintForme(words, inked) {
    const ctx = formeCanvas.getContext('2d');
    ctx.fillStyle = inked ? '#26262a' : '#7c8189'; ctx.fillRect(0, 0, 512, 384);
    ctx.strokeStyle = '#3a3c40'; ctx.lineWidth = 10; ctx.strokeRect(5, 5, 502, 374);
    // Rows of sorts, and the visitor's line among them, read back to front.
    ctx.fillStyle = inked ? '#121214' : '#999ea6';
    for (let y = 30; y < 360; y += 30) for (let x = 24; x < 490; x += 14) if (Math.abs(y - 196) > 34) ctx.fillRect(x, y, 10, 18);
    ctx.save(); ctx.translate(256, 210); ctx.scale(-1, 1);
    ctx.fillStyle = inked ? '#050506' : '#d8dce2'; ctx.font = 'bold 54px Georgia'; ctx.textAlign = 'center';
    ctx.fillText(words || '', 0, 0, 460); ctx.restore();
    formeMap.needsUpdate = true;
  }
  paintForme('', false);
  // The tympan, hinged at the front of the coffin, and the frisket on the tympan's far end.
  // Open, the tympan leans back toward the printer, so the sheet on it, and the press behind, can be seen.
  const TYMPAN_OPEN = 2.45, FRISKET_OPEN = -1.7;
  const tympan = new THREE.Group(); tympan.position.set(0, .09, .33); carriage.add(tympan);
  for (const [w, d, x, z] of [[.62, .03, 0, -.02], [.62, .03, 0, -.54], [.03, .55, -.3, -.28], [.03, .55, .3, -.28]]) box(tympan, [w, .03, d], [x, 0, z], oak);
  const skin = plane(tympan, .58, .5, [0, .005, -.28], null); skin.material = parchment; skin.rotation.x = -Math.PI / 2;
  // The sheet laid on the tympan: blank until the pull, then the page.
  const sheetMaterial = new THREE.MeshStandardMaterial({color: '#f3ead6', roughness: .9, side: THREE.DoubleSide, transparent: true});
  const sheet = new THREE.Mesh(new THREE.PlaneGeometry(.38, .5), sheetMaterial);
  sheet.rotation.x = -Math.PI / 2; sheet.position.set(0, .016, -.28); sheet.visible = false; tympan.add(sheet);
  const frisket = new THREE.Group(); frisket.position.set(0, .03, -.55); tympan.add(frisket);
  for (const [w, d, x, z] of [[.6, .035, 0, .02], [.6, .035, 0, .52], [.035, .5, -.29, .27], [.035, .5, .29, .27]]) box(frisket, [w, .012, d], [x, 0, z], iron);
  tympan.rotation.x = TYMPAN_OPEN; frisket.rotation.x = FRISKET_OPEN;

  // Ink balls on the ink block beside it, ready to be lifted.
  const inkTable = new THREE.Group(); inkTable.position.set(-1.2, 0, .45); press.add(inkTable);
  box(inkTable, [.46, .82, .36], [0, .41, 0], darkOak);
  box(inkTable, [.4, .03, .3], [0, .835, 0], M.ink);
  const balls = [-.11, .11].map(x => {
    const ball = new THREE.Group(); ball.position.set(x, .9, 0); inkTable.add(ball);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(.09, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.leather); pad.scale.y = .7; pad.rotation.x = Math.PI; pad.position.y = .02; ball.add(pad);
    const stock = new THREE.Mesh(new THREE.CylinderGeometry(.03, .045, .06, 12), oak); stock.position.y = .04; ball.add(stock);
    const grip = new THREE.Mesh(new THREE.CylinderGeometry(.018, .02, .2, 10), oak); grip.position.y = .17; ball.add(grip);
    return {ball, home: ball.position.clone()};
  });
  // What moves in a pull keeps meshes of its own; the rest of the press is merged.
  kit.moving(bar, screw, hose, carriage, tympan, frisket, rounce, ...balls.map(b => b.ball));
  // The type cases on their frame: capitals in the upper case, small letters in the lower.
  const frame = new THREE.Group(); frame.position.set(1.42, 0, .5); frame.rotation.y = -.35; press.add(frame);
  for (const x of [-.45, .45]) { box(frame, [.07, 1.25, .07], [x, .62, -.15], oak); box(frame, [.07, .9, .07], [x, .45, .2], oak); }
  function caseTexture(rows, across, seed) {
    const c = document.createElement('canvas'); c.width = 512; c.height = Math.round(512 * rows / across * .9); const ctx = c.getContext('2d');
    ctx.fillStyle = '#4a311d'; ctx.fillRect(0, 0, c.width, c.height);
    const w = c.width / across, h = c.height / rows;
    let s = seed; const random = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
    for (let y = 0; y < rows; y++) for (let x = 0; x < across; x++) {
      ctx.fillStyle = '#24170d'; ctx.fillRect(x * w + 3, y * h + 3, w - 6, h - 6);
      ctx.fillStyle = '#8c9098';
      for (let i = 0; i < 6; i++) ctx.fillRect(x * w + 6 + random() * (w - 16), y * h + 6 + random() * (h - 16), 5, 7);
    }
    return kit.texture(c);
  }
  const caseOf = (y, z, tilt, w, d, rows, across, seed) => {
    const tray = new THREE.Group(); tray.position.set(0, y, z); tray.rotation.x = -tilt; frame.add(tray);
    box(tray, [w + .04, .05, d + .04], [0, -.03, 0], oak);
    const top = plane(tray, w, d, [0, .001, 0], caseTexture(rows, across, seed)); top.rotation.x = -Math.PI / 2;
    kit.press(top, () => open(), 'Type case');
    return tray;
  };
  caseOf(1.22, -.1, .95, .9, .34, 4, 8, 3);       // the upper case
  const lower = caseOf(.98, .14, .42, .9, .42, 5, 9, 5);      // the lower case
  // The composing stick on the lower case's ledge, filling with sorts as letters are chosen.
  const stick = new THREE.Group(); stick.position.set(0, .03, .25); lower.add(stick);
  box(stick, [.42, .015, .06], [0, 0, 0], M.brass); box(stick, [.42, .04, .008], [0, .02, -.03], M.brass);
  const sorts = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .03, .045), new THREE.MeshStandardMaterial({color: '#9a9fa8', metalness: .6, roughness: .35}), LONGEST);
  sorts.count = 0; sorts.frustumCulled = false; stick.add(sorts);
  const placeSorts = () => {
    const o = new THREE.Object3D(), n = state.line.length;
    for (let i = 0; i < n; i++) { o.position.set(.19 - i * .026, .022, 0); o.updateMatrix(); sorts.setMatrixAt(i, o.matrix); }
    sorts.count = n; sorts.instanceMatrix.needsUpdate = true;
  };

  // The drying line behind, wider than the press, so the pages hang where they can be seen.
  const line = new THREE.Group(); line.position.set(0, 0, -.9); press.add(line);
  for (const x of [-2.1, 2.1]) { box(line, [.07, 2.4, .07], [x, 1.2, 0], darkOak); box(line, [.3, .05, .3], [x, .025, 0], darkOak); }
  const cord = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, 4.2, 6), M.paper); cord.rotation.z = Math.PI / 2; cord.position.y = 2.25; line.add(cord);
  const SLOTS = [-1.2, 1.2, -1.68, 1.68];
  const hanging = [];
  // Pressing the press itself sets type too.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.2, 1.0), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.set(0, 1.1, .1); press.add(proxy);
  kit.press(proxy, () => open(), 'Printing press');
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, 0, 0, [
      ['THE PRINTING PRESS', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Johannes Gutenberg, Mainz, about 1450', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Screw presses were old; Gutenberg’s invention', .22, .033],
      ['was the type, cast by the thousand, each letter', .27, .033],
      ['back to front. Press here to set your name', .32, .033],
      ['in type, ink it, and pull the bar.', .37, .033],
      ['Every page you print hangs on the line to dry.', .45, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Gutenberg plaque');
  }

  // Each moving part merged within itself: the bed's timbers, the tympan's frame, the frisket's, and so on.
  for (const part of [screw, hose, rounce, frisket, ...balls.map(b => b.ball)]) kit.settle(part);
  kit.settle(tympan, [frisket]); kit.settle(carriage, [tympan]);

  // ── The printed page ─────────────────────────────────────────────────
  /** A page as it comes off the press: the name in black, its initial painted in red. */
  function page(words) {
    const c = document.createElement('canvas'); c.width = 512; c.height = 680; const ctx = c.getContext('2d');
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, 512, 680);
    // Laid paper and uneven ink, so it looks pressed rather than printed by a machine.
    let seed = [...words].reduce((s, ch) => s * 31 + ch.charCodeAt(0), 7) >>> 0;
    const random = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
    ctx.fillStyle = 'rgba(120,100,70,.06)'; for (let y = 0; y < 680; y += 6) ctx.fillRect(0, y, 512, 1);
    ctx.strokeStyle = '#1d1a17'; ctx.lineWidth = 3; ctx.strokeRect(36, 36, 440, 608); ctx.lineWidth = 1; ctx.strokeRect(46, 46, 420, 588);
    const name = words.trim() || ' ';
    let size = 74; ctx.font = `bold ${size}px Georgia`;
    while (ctx.measureText(name.slice(1)).width + size * 1.25 > 380 && size > 26) { size -= 2; ctx.font = `bold ${size}px Georgia`; }
    const initial = name[0], rest = name.slice(1), big = size * 1.6;
    ctx.font = `bold ${big}px Georgia`; const iw = ctx.measureText(initial).width;
    ctx.font = `bold ${size}px Georgia`; const rw = ctx.measureText(rest).width;
    const x = 256 - (iw + rw) / 2, y = 320;
    ctx.fillStyle = '#a3241c'; ctx.font = `bold ${big}px Georgia`; ctx.fillText(initial, x, y);
    ctx.fillStyle = '#1d1a17'; ctx.font = `bold ${size}px Georgia`; ctx.fillText(rest, x + iw + 2, y);
    for (let i = 0; i < 900; i++) { ctx.fillStyle = `rgba(239,230,207,${random() * .5})`; ctx.fillRect(x + random() * (iw + rw), y - big + random() * big * 1.1, 2, 2); }
    ctx.fillStyle = '#1d1a17'; ctx.font = 'italic 22px Georgia'; ctx.textAlign = 'center';
    ctx.fillText('Set by hand in movable type', 256, 430);
    ctx.fillText('and pulled on a wooden press', 256, 460);
    ctx.font = '16px Georgia'; ctx.fillText('DISCOVERY LABS · HALLWAYS OF TIME', 256, 600);
    return c;
  }
  /** A page pegged to the line: it slides into the first slot, and the others move along. */
  function hang(canvas) {
    const map = kit.texture(canvas);
    const page = plane(line, .38, .5, [SLOTS[0], 1.98, .02], map);
    for (const x of [-.12, .12]) box(page, [.03, .06, .02], [x, .25, .01], oak);      // pegs
    page.userData.swing = .25;
    hanging.unshift(page);
    while (hanging.length > DRYING) {
      const old = hanging.pop();
      old.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material !== oak) { o.material.map?.dispose(); o.material.dispose(); } } });
      old.removeFromParent();
    }
  }

  // ── The panels: the type case, and the page ──────────────────────────
  const KICKER = 'GUTENBERG’S PRESS · MAINZ, ABOUT 1450';
  const CELL = {x: 60, y: 300, w: 76, h: 76, gap: 6, across: 8};
  const cellAt = i => ({x: CELL.x + (i % CELL.across) * (CELL.w + CELL.gap), y: CELL.y + Math.floor(i / CELL.across) * (CELL.h + CELL.gap)});
  /** Metal type: grey blocks with the letters standing back to front on their faces. */
  function drawStick(ctx, x, y, width) {
    ctx.fillStyle = '#b48d4c'; ctx.fillRect(x, y, width, 96);
    ctx.fillStyle = '#7d5f2e'; ctx.fillRect(x, y + 84, width, 12);
    // The blocks narrow as the line grows, so the longest name still fits the stick.
    const chars = [...state.line], block = Math.min(42, (width - 28) / Math.max(chars.length, 1) - 2);
    // Read in the stick from the right, as a compositor sees it: the line, mirrored.
    chars.forEach((ch, i) => {
      const bx = x + width - 14 - (i + 1) * (block + 2);
      ctx.fillStyle = '#6f747c'; ctx.fillRect(bx, y + 14, block, 66);
      ctx.save(); ctx.translate(bx + block / 2, y + 60); ctx.scale(-1, 1);
      ctx.fillStyle = '#e6e8ec'; ctx.font = `bold ${Math.round(Math.min(34, block * .85))}px Georgia`; ctx.textAlign = 'center'; ctx.fillText(ch === ' ' ? '' : ch, 0, 0);
      ctx.restore();
    });
  }
  function paintCase() {
    const {canvas, ctx} = board(KICKER, 'Set your name in type');
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'Pick the letters from the case. Each piece of type is cast back to front, so that pressed on paper it reads the right way round.', 1080)
      .forEach((line, i) => ctx.fillText(line, 60, 176 + i * 32));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '20px Arial'; ctx.fillText('THE TYPE CASE', 60, 288);
    LETTERS.forEach((ch, i) => {
      const {x, y} = cellAt(i);
      ctx.fillStyle = '#4a311d'; ctx.fillRect(x, y, CELL.w, CELL.h);
      ctx.fillStyle = '#2a1b10'; ctx.fillRect(x + 4, y + 4, CELL.w - 8, CELL.h - 8);
      ctx.fillStyle = '#f1e5d0'; ctx.font = ch === ' ' ? '18px Arial' : ch === '⌫' ? '30px Arial' : 'bold 34px Georgia';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(ch === ' ' ? 'space' : ch, x + CELL.w / 2, y + CELL.h / 2 + 2); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    });
    ctx.fillStyle = '#d9bc7d'; ctx.font = '20px Arial'; ctx.fillText('THE TYPE, AS IT STANDS IN THE STICK', 740, 288, 400);
    drawStick(ctx, 740, 300, 400);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '20px Arial'; ctx.fillText('AS IT WILL PRINT', 740, 448);
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(740, 460, 400, 110);
    ctx.fillStyle = '#1d1a17'; ctx.font = 'bold 40px Georgia'; ctx.fillText(state.line || '…', 760, 528, 360);
    ctx.fillStyle = '#9d9786'; ctx.font = '19px Arial';
    ctx.fillText(`${state.line.length} OF ${LONGEST} LETTERS${state.line ? '' : ' · ON A KEYBOARD, JUST TYPE'}`, 740, 600);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'Gutenberg’s real invention was the mould that cast these letters, thousands alike, in a metal that swells a little as it cools to fill every line of the letter. Capitals were kept in the upper case and small letters in the lower: the names we still use.', 1080)
      .forEach((line, i) => ctx.fillText(line, 60, 680 + i * 32));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Gutenberg’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  function paintPage() {
    const {canvas, ctx} = board('FRESH FROM THE PRESS', 'Your page');
    const sheet = page(state.printed[0] || '');
    ctx.drawImage(sheet, 60, 160, 420, 558);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '26px Georgia';
    wrapped(ctx, 'Ink on paper, pressed by a screw. It hangs on the line behind the press to dry, beside the last pages printed here.', 600)
      .forEach((line, i) => ctx.fillText(line, 540, 200 + i * 35));
    wrapped(ctx, 'The red initial is how Gutenberg’s Bible, finished around 1455, was made beautiful: its great initials were painted in by hand after printing. Within fifty years Europe had printed millions of books.', 600)
      .forEach((line, i) => ctx.fillText(line, 540, 380 + i * 35));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Gutenberg’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  const story = {x: 640, y: 945, w: 520, h: 40, label: 'Gutenberg’s story', fn: () => kit.story(id)};
  kit.panel('press', {
    paint: paintCase,
    zones: () => [...LETTERS.map((ch, i) => ({...cellAt(i), w: CELL.w, h: CELL.h, label: ch === ' ' ? 'space' : ch === '⌫' ? 'delete' : ch,
      fn: () => ch === '⌫' ? remove() : add(ch)})), story],
    actions: () => [['INK AND PRINT', print, state.line.trim() ? '#6a5a2c' : '#3a3f36'], ['CLEAR', clear], ['CLOSE', kit.close]]
  });
  kit.panel('page', {paint: paintPage, zones: () => [story], actions: () => [['SET ANOTHER', open], ['CLOSE', kit.close]]});

  // ── What the visitor does ────────────────────────────────────────────
  const printing = () => state.t >= 0;
  function open() { if (!printing()) kit.open('press'); }
  function add(ch) { if (state.line.length < LONGEST && !printing()) { state.line += ch; placeSorts(); kit.redraw(); } }
  function remove() { state.line = state.line.slice(0, -1); placeSorts(); kit.redraw(); }
  function clear() { state.line = ''; placeSorts(); kit.redraw(); }
  /** Ink the type and pull: the panel stands aside, and the press works through a whole pull. */
  function print() {
    if (!state.line.trim() || printing()) return;
    state.pulling = state.line.trim(); state.t = 0; state.inked = false; state.pressed = false;
    // The line goes from the stick into the forme.
    state.line = ''; placeSorts(); paintForme(state.pulling, false);
    sheetMaterial.map = null; sheetMaterial.opacity = 0; sheetMaterial.needsUpdate = true;
    sheet.visible = true; tympan.add(sheet); sheet.position.set(0, .016, -.28); sheet.rotation.set(-Math.PI / 2, 0, 0);
    kit.close();
  }
  const flight = {from: new THREE.Vector3(), turn: new THREE.Quaternion(), to: new THREE.Vector3(), lift: new THREE.Vector3()};
  /** Every moving part of the press, posed for the moment `state.t` of the pull. */
  function pose() {
    // The ink balls: lifted, carried over the forme, dabbed three times, and set back down.
    const ink = phase('ink');
    balls.forEach(({ball, home}, i) => {
      const over = new THREE.Vector3(1.2 + (i ? .1 : -.1), 1.08, OUT - .45);   // just above the forme, in the ink table's frame
      const lift = clamp01(ink / .2), carry = ease(clamp01((ink - .15) / .25)), back = ease(clamp01((ink - .8) / .2));
      const dab = ink > .4 && ink < .8 ? Math.abs(Math.sin((ink - .4) / .4 * Math.PI * 3)) * .08 : 0;
      ball.position.copy(home).lerp(over, carry - back);
      ball.position.y += (lift - back) * .12 * (1 - carry + back) - (carry - back) * dab + (carry - back) * .04;
      ball.rotation.z = (carry - back) * (i ? -.25 : .25);
    });
    if (!state.inked && ink > .55) { state.inked = true; paintForme(state.pulling, true); }
    // A fresh sheet settles onto the open tympan.
    const laid = phase('sheet');
    if (state.t >= 0 && phase('take') === 0) { sheetMaterial.opacity = laid; sheet.position.y = .016 + (1 - ease(laid)) * .2; }
    // The frisket folds onto the tympan, the tympan onto the forme; both open again after the pull.
    tympan.rotation.x = TYMPAN_OPEN * (1 - (ease(phase('tympan')) - ease(phase('open'))));
    frisket.rotation.x = FRISKET_OPEN * (1 - (ease(phase('frisket')) - ease(phase('open'))));
    // The bed rolls in under the platen and out again, the rounce turning as it goes.
    const run = ease(phase('in')) - ease(phase('out'));
    carriage.position.z = OUT + (IN - OUT) * run;
    rounce.rotation.x = -run * Math.PI * 4;
    // The pull: the bar comes over, the screw turns and presses the platen down, holds, and lets go.
    const p = phase('pull'), s = p < .4 ? ease(p / .4) : p < .62 ? 1 : 1 - ease((p - .62) / .38);
    bar.rotation.y = BAR_REST - 1.3 * s; screw.rotation.y = -1.3 * s; hose.position.y = 1.36 - .05 * s;
    if (!state.pressed && p > .5) {
      state.pressed = true;
      sheetMaterial.map = kit.texture(page(state.pulling)); sheetMaterial.needsUpdate = true;
    }
    // The page is taken off the tympan and carried over the press to the line.
    const take = phase('take');
    if (take > 0) {
      if (sheet.parent !== press) {
        press.attach(sheet);
        flight.from.copy(sheet.position); flight.turn.copy(sheet.quaternion);
        flight.to.set(SLOTS[0], 1.98, -.88); flight.lift.set(SLOTS[0] * .5, 2.75, -.1);
      }
      const t = ease(take), a = flight.from, b = flight.lift, c = flight.to;
      sheet.position.set((1 - t) ** 2 * a.x + 2 * (1 - t) * t * b.x + t * t * c.x, (1 - t) ** 2 * a.y + 2 * (1 - t) * t * b.y + t * t * c.y, (1 - t) ** 2 * a.z + 2 * (1 - t) * t * b.z + t * t * c.z);
      sheet.quaternion.slerpQuaternions(flight.turn, new THREE.Quaternion(), t);
    }
  }
  function finish() {
    const words = state.pulling;
    state.t = -1;
    sheet.visible = false; sheetMaterial.map?.dispose(); sheetMaterial.map = null; tympan.add(sheet);
    paintForme('', false);
    state.printed.unshift(words); state.printed.length = Math.min(state.printed.length, DRYING);
    hang(page(words));
    kit.open('page');
  }

  return {
    id,
    update(dt) {
      // The pages on the line: each slides to its slot, and sways a little as it settles.
      state.sway += dt;
      hanging.forEach((p, i) => {
        p.position.x += (SLOTS[i] - p.position.x) * Math.min(1, dt * 3);
        p.userData.swing *= Math.exp(-dt * 1.2);
        p.rotation.x = Math.sin(state.sway * 2.1 + i * 1.7) * (.03 + p.userData.swing);
      });
      if (!printing()) return;
      state.t += dt;
      pose();
      if (state.t >= TOTAL) finish();
    },
    /** On a screen, letters typed while the type case is open go into the stick. */
    key(key) {
      if (kit.showing() !== 'press') return false;
      if (key === 'Backspace') { remove(); return true; }
      if (key === 'Enter') { print(); return true; }
      const ch = key.length === 1 ? key.toUpperCase() : '';
      if (LETTERS.includes(ch) && ch !== '⌫') { add(ch); return true; }
      return false;
    },
    getState: () => ({line: state.line, printing: printing(), step: printing() ? STEPS.find(([name]) => phase(name) < 1)?.[0] || 'take' : null,
      printed: [...state.printed], hanging: hanging.length, sorts: sorts.count}),
    targets: () => ({press: press.localToWorld(new THREE.Vector3(0, 1.1, .4)).toArray()}),
    open, add, remove, clear, print
  };
}
