/**
 * On Computable Numbers: a Turing machine to run.
 *
 * In 1936 Alan Turing asked whether a mechanical procedure could decide any
 * mathematical statement, and to answer he had first to say what a mechanical
 * procedure is: a tape of squares, a head that reads one square at a time,
 * and a table of rules saying what to write, which way to move, and what
 * state to be in next. With it he proved that no such machine can decide, for
 * every program, whether it will ever stop; and the by-product was the
 * definition of a computer.
 *
 * On an oak desk of the 1930s, by a banker's lamp and his paper, a paper tape
 * stands on edge between two spools and runs through a brass head. The head
 * reads the square in front of it by the light of a lamp, writes with a
 * pencil that comes down and draws the figure stroke by stroke, rubs out with
 * an eraser, and shows its state on a drum that rolls round to the next; the
 * spools turn as the tape moves. Behind, the table of rules, with a gold bar
 * that glides to the rule in use. Choose a program — add one in binary, add
 * two tally numbers, the two-state busy beaver, or one that never stops — and
 * step it, or let it run.
 */
const BLANK = ' ';
const PROGRAMS = [
  {label: 'ADD ONE', name: 'Add one, in binary', tape: '1011', start: 3,
    text: 'The tape holds eleven in binary, 1011. The machine adds one, carrying as you would on paper, and leaves twelve: 1100.',
    rules: {A: {'1': ['0', 'L', 'A'], '0': ['1', 'N', 'H'], [BLANK]: ['1', 'N', 'H']}}},
  {label: 'ADD TWO NUMBERS', name: 'Add two numbers', tape: '111 11', start: 0,
    text: 'Numbers as tally marks: three and two, with a gap between. The machine fills the gap and rubs out the last mark, leaving five.',
    rules: {A: {'1': ['1', 'R', 'A'], [BLANK]: ['1', 'R', 'B']}, B: {'1': ['1', 'R', 'B'], [BLANK]: [BLANK, 'L', 'C']}, C: {'1': [BLANK, 'N', 'H']}}},
  {label: 'BUSY BEAVER', name: 'The busy beaver', tape: '', start: 0,
    text: 'Two states and a blank tape: how many ones can a machine write before it stops? No machine with two states writes more than four.',
    rules: {A: {[BLANK]: ['1', 'R', 'B'], '1': ['1', 'L', 'B']}, B: {[BLANK]: ['1', 'L', 'A'], '1': ['1', 'R', 'H']}}},
  {label: 'NEVER STOPS', name: 'A machine that never stops', tape: '', start: 0,
    text: 'One rule: write a one and move right, for ever. You can see this one will never halt; Turing proved that no machine can see it for every program.',
    rules: {A: {[BLANK]: ['1', 'R', 'A']}}}
];
const CELL = .12, WINDOW = 15, STEP = .85;   // a square of tape, how many stand between the spools, seconds a step takes when running
const DRUM = ['A', 'B', 'C', 'HALT'];         // the faces of the state drum
const smooth = s => s * s * (3 - 2 * s);

export function createTuringMachine(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'turing';
  const state = {program: 0, tape: new Map(), head: 0, machine: 'A', steps: 0, halted: false, running: false, t: -1, pending: null, page: 'machine', wait: 0,
    drum: 0, drumShown: 0, row: 0, rowShown: 0, spools: 0, clock: 0, writing: null};
  const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; };

  // ── The desk ─────────────────────────────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  const desk = new THREE.Group(); wall.add(desk);
  const TOP = .78, oak = new THREE.MeshStandardMaterial({color: '#7a5434', roughness: .55});
  box(desk, [2.7, .05, .86], [0, TOP - .025, 0], oak);
  box(desk, [2.74, .02, .9], [0, TOP - .055, 0], M.darkWood);
  // A green leather top, tooled in gold at its edge.
  plane(desk, 2.5, .7, [0, TOP + .001, 0], kit.texture(canvas(1024, 288, (ctx, w, h) => {
    ctx.fillStyle = '#23402f'; ctx.fillRect(0, 0, w, h);
    const r = kit.seeded(36); for (let i = 0; i < 3000; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '10,24,16' : '60,96,72'},.15)`; ctx.fillRect(r() * w, r() * h, 2, 1); }
    ctx.strokeStyle = '#b8954e'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, w - 20, h - 20); ctx.setLineDash([3, 6]); ctx.strokeRect(20, 20, w - 40, h - 40);
  }))).rotation.x = -Math.PI / 2;
  // Two pedestals of drawers, brass-handled, and a panel between them.
  for (const side of [-1, 1]) {
    box(desk, [.6, TOP - .1, .78], [side * 1.0, (TOP - .1) / 2 + .05, 0], oak);
    box(desk, [.64, .05, .82], [side * 1.0, .025, 0], M.darkWood);
    for (let k = 0; k < 3; k++) {
      const y = .2 + k * .2;
      box(desk, [.52, .17, .01], [side * 1.0, y, .395], M.darkWood);
      box(desk, [.1, .018, .02], [side * 1.0, y, .41], M.brass);
    }
  }
  box(desk, [1.4, .45, .03], [0, TOP - .3, -.3], oak);

  // ── The tape, on edge between two spools ─────────────────────────────
  // The tape stands on a low bed toward the back of the desk, its face to the visitor.
  const BED = {y: TOP + .06, z: -.02}, TAPE_Y = BED.y + .03 + CELL / 2;
  box(desk, [2.36, .06, .3], [0, TOP + .03, BED.z], M.darkWood);
  box(desk, [2.4, .012, .34], [0, TOP + .066, BED.z], M.brass);
  const tapeCanvas = document.createElement('canvas'); tapeCanvas.width = WINDOW * 128; tapeCanvas.height = 128;
  const tapeMap = kit.texture(tapeCanvas); tapeMap.anisotropy = 4;
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(WINDOW * CELL, CELL), new THREE.MeshStandardMaterial({map: tapeMap, roughness: .9}));
  tape.position.set(0, TAPE_Y, BED.z + .06); desk.add(tape);
  // The spools: paper wound on brass reels, turning as the tape runs.
  const SPOOL = {x: WINDOW * CELL / 2 + .1, r: .1};
  const spools = [-1, 1].map(side => {
    const spool = new THREE.Group(); spool.position.set(side * SPOOL.x, TAPE_Y, BED.z + .06 - SPOOL.r); desk.add(spool);
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(SPOOL.r, SPOOL.r, CELL, 32), M.paper); spool.add(roll);
    for (const y of [-1, 1]) {
      const cheek = new THREE.Mesh(new THREE.CylinderGeometry(SPOOL.r + .035, SPOOL.r + .035, .008, 32), M.brass); cheek.position.y = y * (CELL / 2 + .004); spool.add(cheek);
      for (let k = 0; k < 3; k++) { const spoke = box(spool, [.012, .004, SPOOL.r * 1.7], [0, y * (CELL / 2 + .01), 0], M.darkWood); spoke.rotation.y = k * Math.PI / 3; }
    }
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.012, .012, CELL + .07, 10), M.brass); spool.add(post);
    return spool;
  });
  // From each end of the window, a short run of tape round to its spool.
  for (const side of [-1, 1]) {
    const length = SPOOL.x - WINDOW * CELL / 2;
    plane(desk, length, CELL, [side * (WINDOW * CELL / 2 + length / 2), TAPE_Y, BED.z + .06], null).material = M.paper;
  }

  // ── The head ─────────────────────────────────────────────────────────
  const head = new THREE.Group(); head.position.set(0, TAPE_Y, BED.z + .06); desk.add(head);
  for (const side of [-1, 1]) box(head, [.02, CELL + .14, .16], [side * (CELL / 2 + .03), 0, -.02], M.brass);
  box(head, [CELL + .1, .03, .16], [0, CELL / 2 + .085, -.02], M.brass);
  box(head, [CELL + .1, .03, .16], [0, -CELL / 2 - .055, -.02], M.brass);
  // A frame round the square being read, that glows as the head reads it.
  const reader = new THREE.Mesh(new THREE.PlaneGeometry(CELL + .012, CELL + .012), new THREE.MeshBasicMaterial({color: '#ffd76a', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending}));
  reader.position.z = .002; head.add(reader);
  // The pencil, on an arm from the bridge: it comes down to the tape to write.
  const pencilArm = new THREE.Group(); pencilArm.position.set(0, CELL / 2 + .07, .07); head.add(pencilArm);
  const pencil = new THREE.Group(); pencilArm.add(pencil);
  { const body = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .12, 6), new THREE.MeshStandardMaterial({color: '#c9a640', roughness: .5}));
    body.position.y = -.06; pencil.add(body);
    const point = new THREE.Mesh(new THREE.ConeGeometry(.007, .025, 6), new THREE.MeshStandardMaterial({color: '#e8c9a0'})); point.rotation.x = Math.PI; point.position.y = -.1325; pencil.add(point);
    const lead = new THREE.Mesh(new THREE.ConeGeometry(.0025, .008, 6), M.ink); lead.rotation.x = Math.PI; lead.position.y = -.146; pencil.add(lead); }
  const PENCIL = {rest: -2.0, write: .507};   // held up and out, clear of the square; down, its point on the tape
  pencil.rotation.x = PENCIL.rest;
  // The eraser, below the window: it rises and rubs to clear a square.
  const eraser = new THREE.Group(); eraser.position.set(0, -CELL / 2 - .06, .05); head.add(eraser);
  box(eraser, [.05, .028, .03], [0, 0, 0], new THREE.MeshStandardMaterial({color: '#c46a63', roughness: .9}));
  box(eraser, [.055, .012, .034], [0, -.018, 0], M.brass);
  // The state drum on the bridge, a face for each state, rolled round to the one the machine is in.
  const drum = new THREE.Group(); drum.position.set(0, CELL / 2 + .13, -.02); head.add(drum);
  {
    const c = canvas(512, 512, (ctx, w, h) => {
      ctx.fillStyle = '#1d2329'; ctx.fillRect(0, 0, w, h);
      DRUM.forEach((label, i) => {
        const y = (i + .5) * h / DRUM.length;
        ctx.fillStyle = label === 'HALT' ? '#cfe3b0' : '#f4dca2'; ctx.font = label === 'HALT' ? 'bold 76px Georgia' : 'bold 104px Georgia';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(label, w / 2, y);
        ctx.fillStyle = '#b8954e'; ctx.fillRect(0, i * h / DRUM.length, w, 4);
      });
    });
    const map = kit.texture(c); map.wrapS = THREE.RepeatWrapping;
    // The faces run round the drum: the texture's height wraps its circumference.
    const g = new THREE.CylinderGeometry(.045, .045, .1, 32, 1);
    const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getY(i), 1 - uv.getX(i));
    const roll = new THREE.Mesh(g, new THREE.MeshStandardMaterial({map, roughness: .5})); roll.rotation.z = -Math.PI / 2; drum.add(roll);
    for (const side of [-1, 1]) { const cap = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .008, 24), M.brass); cap.rotation.z = Math.PI / 2; cap.position.x = side * .054; drum.add(cap); }
  }
  // A small lamp on top, lit while the head reads.
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.018, 12, 8), new THREE.MeshBasicMaterial({color: '#6a5a2c'})); lamp.position.set(-.05, CELL / 2 + .12, .05); head.add(lamp);
  plane(head, .1, .03, [0, CELL / 2 + .195, -.02], kit.lettering(.1, .03, [['STATE', .015, .018, '#c8bfa7', '600 #px Arial, sans-serif']], '#1d2329'));

  // ── The rule card, on an easel behind ────────────────────────────────
  const card = document.createElement('canvas'); card.width = 1040; card.height = 640;
  const cardMap = kit.texture(card);
  const easel = new THREE.Group(); easel.position.set(0, 1.62, -.34); easel.rotation.x = -.08; desk.add(easel);
  box(easel, [1.46, .9, .04], [0, 0, -.02], oak);
  box(easel, [1.5, .94, .02], [0, 0, -.045], M.gold);
  const cardPlane = plane(easel, 1.36, .8, [0, 0, .002], cardMap);
  for (const side of [-1, 1]) box(desk, [.04, 1.0, .04], [side * .62, TOP + .42, -.37], oak);
  // The gold bar that glides to the rule in use.
  const RULES = {x: 40, y: 160, w: 960, row: 70};   // where the rows are on the card, in its pixels
  const bar = new THREE.Mesh(new THREE.PlaneGeometry(RULES.w / 1040 * 1.36, (RULES.row - 6) / 640 * .8), new THREE.MeshBasicMaterial({color: '#e8b84a', transparent: true, opacity: .35, depthWrite: false, blending: THREE.AdditiveBlending}));
  bar.position.z = .004; easel.add(bar);
  const rowY = r => .4 - (RULES.y + 14 + r * RULES.row + (RULES.row - 4) / 2) / 640 * .8;

  // ── On the desk: his paper, a pen, and a banker's lamp ───────────────
  {
    const paper = plane(desk, .32, .44, [-.82, TOP + .004, .16], kit.texture(canvas(512, 704, (ctx, w, h) => {
      ctx.fillStyle = '#f2ead6'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#2a2420'; ctx.textAlign = 'center';
      ctx.font = 'bold 30px Georgia'; ctx.fillText('ON COMPUTABLE NUMBERS,', w / 2, 120);
      ctx.font = 'bold 24px Georgia'; ctx.fillText('WITH AN APPLICATION TO THE', w / 2, 160); ctx.fillText('ENTSCHEIDUNGSPROBLEM', w / 2, 196);
      ctx.font = 'italic 24px Georgia'; ctx.fillText('By A. M. Turing.', w / 2, 250);
      ctx.font = '17px Georgia'; ctx.fillText('[Received 28 May, 1936.—Read 12 November, 1936.]', w / 2, 290);
      ctx.fillStyle = 'rgba(42,36,32,.55)';
      for (let y = 330; y < h - 40; y += 22) { const len = 360 + ((y * 37) % 60); ctx.fillRect((w - len) / 2, y, len, 5); }
    })));
    paper.rotation.set(-Math.PI / 2, 0, .12);
    const pen = new THREE.Mesh(new THREE.CylinderGeometry(.008, .006, .15, 10), new THREE.MeshStandardMaterial({color: '#141414', roughness: .3, metalness: .3}));
    pen.rotation.set(Math.PI / 2, 0, -.6); pen.position.set(-.58, TOP + .01, .24); desk.add(pen);
    // The lamp: a brass stem and a green glass shade, lit warm from within.
    const lampBase = new THREE.Group(); lampBase.position.set(1.0, TOP, .05); desk.add(lampBase);
    const turned = (profile, material) => { const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 24), material); lampBase.add(m); return m; };
    turned([[0, 0], [.09, 0], [.09, .02], [.05, .035], [.015, .05], [.012, .34], [0, .34]], M.brass);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(.13, .13, .26, 24, 1, true, 0, Math.PI), new THREE.MeshStandardMaterial({color: '#1f6b46', roughness: .2, metalness: .1, emissive: '#0f3a24', side: THREE.DoubleSide}));
    shade.rotation.set(0, 0, Math.PI / 2); shade.position.set(0, .36, -.02); shade.scale.set(1, 1, .62); lampBase.add(shade);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(.24, .05), new THREE.MeshBasicMaterial({color: '#ffe3a8'})); glow.rotation.x = Math.PI / 2; glow.position.set(0, .335, 0); lampBase.add(glow);
    const pool = new THREE.Mesh(new THREE.CircleGeometry(.3, 32), new THREE.MeshBasicMaterial({color: '#ffdca0', transparent: true, opacity: .14, depthWrite: false, blending: THREE.AdditiveBlending}));
    pool.rotation.x = -Math.PI / 2; pool.position.set(0, .003, .05); lampBase.add(pool);
  }
  kit.moving(tape, head, ...spools, bar);
  kit.settle(head, [pencilArm, eraser, drum, reader, lamp]);

  const read = pos => state.tape.get(pos) ?? BLANK;
  const ruleFor = () => PROGRAMS[state.program].rules[state.machine]?.[read(state.head)];
  /** The tape around the head; the square under it drawn only as far as the pencil has got, while it writes. */
  function paintTape() {
    const ctx = tapeCanvas.getContext('2d'), s = 128, centre = (WINDOW - 1) / 2;
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, tapeCanvas.width, s);
    for (let i = 0; i < WINDOW; i++) {
      const pos = state.head - centre + i, writing = state.writing && i === centre;
      ctx.strokeStyle = '#8c7d60'; ctx.lineWidth = 3; ctx.strokeRect(i * s + 1.5, 6, s - 3, s - 12);
      const symbol = writing ? state.writing.symbol : read(pos);
      if (symbol === BLANK) continue;
      ctx.save();
      if (writing) { ctx.beginPath(); ctx.rect(i * s, 0, s, s * state.writing.drawn); ctx.clip(); }
      ctx.fillStyle = '#26221e'; ctx.font = '86px "Courier New", monospace'; ctx.textAlign = 'center'; ctx.fillText(symbol, i * s + s / 2, 96);
      ctx.restore();
    }
    tapeMap.needsUpdate = true;
  }
  const show = symbol => symbol === BLANK ? '□' : symbol;
  const moveName = m => ({L: 'LEFT', R: 'RIGHT', N: 'STAY'})[m];
  const nextName = n => n === 'H' ? 'HALT' : n;
  /** The rows of the table, and which is in use. */
  function ruleRows() {
    const rows = [];
    for (const [s, reads] of Object.entries(PROGRAMS[state.program].rules)) for (const [symbol, [write, move, next]] of Object.entries(reads)) rows.push([s, symbol, write, move, next]);
    return rows;
  }
  /** The table of rules, the one in use lit. */
  function drawRules(ctx, x, y, w, rowHeight, size, lit = true) {
    const rows = ruleRows();
    const now = state.halted || !lit ? null : [state.machine, read(state.head)];
    const columns = ['IN STATE', 'READS', 'WRITES', 'MOVES', 'THEN'], cw = w / columns.length;
    ctx.fillStyle = '#d9bc7d'; ctx.font = `${Math.round(size * .62)}px Arial`; ctx.textAlign = 'center';
    columns.forEach((c, i) => ctx.fillText(c, x + cw * (i + .5), y));
    rows.forEach((row, r) => {
      const ry = y + 14 + r * rowHeight, on = now && row[0] === now[0] && row[1] === now[1];
      ctx.fillStyle = on ? '#6a5a2c' : r % 2 ? '#242c22' : '#2a3327'; ctx.fillRect(x, ry, w, rowHeight - 4);
      ctx.fillStyle = on ? '#fff4d6' : '#f1e5d0'; ctx.font = `${size}px Georgia`;
      [row[0], show(row[1]), show(row[2]), moveName(row[3]), nextName(row[4])].forEach((v, i) => ctx.fillText(v, x + cw * (i + .5), ry + rowHeight * .68));
    });
    ctx.textAlign = 'left';
  }
  /** The card on the easel: the table without a lit row, for the gold bar glides over it instead. */
  function paintCard() {
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#1a2026'; ctx.fillRect(0, 0, 1040, 640);
    ctx.fillStyle = '#e1c393'; ctx.font = '600 34px Arial'; ctx.fillText('THE TABLE OF RULES', 40, 58);
    ctx.fillStyle = '#c8b793'; ctx.font = 'italic 30px Georgia'; ctx.fillText(PROGRAMS[state.program].name, 40, 100, 960);
    drawRules(ctx, RULES.x, RULES.y, RULES.w, RULES.row, 34, false);
    ctx.fillStyle = state.halted ? '#cfe3b0' : '#c8bfa7'; ctx.font = '28px Arial';
    ctx.fillText(state.halted ? `HALTED AFTER ${state.steps} STEP${state.steps === 1 ? '' : 'S'}` : `STEP ${state.steps}`, 40, 610);
    cardMap.needsUpdate = true;
  }
  /** Where the drum and the bar should go, now. */
  function aim() {
    state.drum = state.halted ? DRUM.indexOf('HALT') : Math.max(0, DRUM.indexOf(state.machine));
    const now = ruleRows().findIndex(row => row[0] === state.machine && row[1] === read(state.head));
    if (now >= 0) state.row = now;
  }
  function paintAll() { paintTape(); paintCard(); aim(); }

  // A press on the desk, the tape or the card opens the panel.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.7, .9), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.1; desk.add(proxy);
  kit.press(proxy, () => open(), 'Turing machine');
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, 0, 0, [
      ['ON COMPUTABLE NUMBERS', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Alan Turing, Cambridge, 1936', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['A tape, a head that reads one square, and a', .22, .033],
      ['table of rules: Turing’s definition of what', .27, .033],
      ['a machine can compute. Press here to run one.', .32, .033],
      ['Every computer since is one of these,', .41, .028, '#a99a7c', 'italic #px Georgia, serif'],
      ['with a longer tape and quicker hands.', .45, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Turing plaque');
  }

  // ── The panel ────────────────────────────────────────────────────────
  const TABS = PROGRAMS.map((p, i) => ({x: 60 + i * 272, y: 158, w: 262, h: 48}));
  function paintMachine() {
    const program = PROGRAMS[state.program];
    const {canvas, ctx} = board('ON COMPUTABLE NUMBERS · TURING, 1936', program.name);
    TABS.forEach(({x, y, w, h}, i) => {
      ctx.fillStyle = i === state.program ? '#6a5a2c' : '#2a3327'; ctx.fillRect(x, y, w, h);
      ctx.fillStyle = '#f1e5d0'; ctx.font = '19px Arial'; ctx.textAlign = 'center'; ctx.fillText(PROGRAMS[i].label, x + w / 2, y + 31, w - 10); ctx.textAlign = 'left';
    });
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, program.text, 1080).slice(0, 2).forEach((line, i) => ctx.fillText(line, 60, 250 + i * 31));
    // The tape around the head.
    const cells = 15, s = 72, x0 = 600 - cells * s / 2, y0 = 320;
    for (let i = 0; i < cells; i++) {
      const pos = state.head - 7 + i, x = x0 + i * s;
      ctx.fillStyle = '#efe6cf'; ctx.fillRect(x + 2, y0, s - 4, s);
      const symbol = read(pos);
      if (symbol !== BLANK) { ctx.fillStyle = '#1d1a17'; ctx.font = 'bold 42px Georgia'; ctx.textAlign = 'center'; ctx.fillText(symbol, x + s / 2, y0 + 52); ctx.textAlign = 'left'; }
    }
    const hx = x0 + 7 * s;
    ctx.strokeStyle = '#e8c56e'; ctx.lineWidth = 5; ctx.strokeRect(hx, y0 - 4, s, s + 8);
    ctx.fillStyle = '#e8c56e'; ctx.beginPath(); ctx.moveTo(hx + s / 2, y0 + s + 10); ctx.lineTo(hx + s / 2 - 16, y0 + s + 36); ctx.lineTo(hx + s / 2 + 16, y0 + s + 36); ctx.fill();
    ctx.fillStyle = '#f4dca2'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center';
    ctx.fillText(state.halted ? 'HALTED' : `HEAD · STATE ${state.machine}`, hx + s / 2, y0 + s + 62); ctx.textAlign = 'left';
    drawRules(ctx, 60, 500, 1080, 50, 25);
    const ones = [...state.tape.values()].filter(v => v === '1').length;
    ctx.fillStyle = state.halted ? '#cfe3b0' : '#c8bfa7'; ctx.font = '23px Georgia';
    const status = state.halted ? `Halted after ${state.steps} step${state.steps === 1 ? '' : 's'}. The tape holds ${ones} one${ones === 1 ? '' : 's'}.`
      : state.running ? `Running: step ${state.steps}.` : `Step ${state.steps}. Press STEP to work one rule, or RUN.`;
    ctx.fillText(status, 60, 860, 1080);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia';
    ctx.fillText('Why no machine can tell if a program will stop ›', 60, 968);
    ctx.textAlign = 'right'; ctx.fillText('Read Turing’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  function paintHalting() {
    const {canvas, ctx} = board('ON COMPUTABLE NUMBERS · TURING, 1936', 'The question no machine can answer');
    ctx.fillStyle = '#f1e5d0'; ctx.font = '26px Georgia';
    let y = 200;
    for (const paragraph of [
      'Turing’s question was whether there is a mechanical method that can decide, for any mathematical statement, whether it is true. To answer, he first had to say what a mechanical method is. This machine is his answer: anything a person could work out by following rules with pencil and paper, a machine like this can do.',
      'Then the twist. Suppose some machine H could look at any program, with its input, and say whether it will ever stop. Build a program D that hands its own rules to H and does the opposite of the answer: if H says D stops, D runs for ever; if H says D runs for ever, D stops at once. Whatever H says about D is wrong. So no such H can exist.',
      'In the same paper he described a universal machine that can imitate any other, given that machine’s rules written on its tape: the idea of the computer that holds its program in its memory.'
    ]) { for (const line of wrapped(ctx, paragraph, 1080)) { ctx.fillText(line, 60, y); y += 35; } y += 22; }
    ctx.fillStyle = '#c8bfa7'; ctx.font = '21px Georgia';
    ctx.fillText('Alonzo Church reached the same conclusion by other means a few months earlier.', 60, 900, 1080);
    ctx.fillStyle = '#d9bc7d'; ctx.textAlign = 'right'; ctx.fillText('Read Turing’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  const story = {x: 640, y: 945, w: 520, h: 40, label: 'Turing’s story', fn: () => kit.story(id)};
  kit.panel(id, {
    paint: () => state.page === 'halting' ? paintHalting() : paintMachine(),
    zones: () => state.page === 'halting' ? [story] : [...TABS.map((t, i) => ({...t, label: PROGRAMS[i].label, fn: () => load(i)})),
      {x: 60, y: 945, w: 540, h: 40, label: 'The halting question', fn: () => setPage('halting')}, story],
    actions: () => state.page === 'halting' ? [['← THE MACHINE', () => setPage('machine')], ['CLOSE', kit.close]]
      : [['STEP', step, state.halted ? '#3a3f36' : '#6a5a2c'], [state.running ? 'PAUSE' : 'RUN', toggleRun], ['START AGAIN', () => load(state.program)], ['CLOSE', kit.close]]
  });


  // ── Running the machine ──────────────────────────────────────────────
  function load(index) { reset(index); kit.redraw(); }
  /** Put a program's tape on the desk and its rules on the card. */
  function reset(index) {
    const program = PROGRAMS[index];
    Object.assign(state, {program: index, tape: new Map(), head: program.start, machine: 'A', steps: 0, halted: false, running: false, t: -1, pending: null, writing: null});
    [...program.tape].forEach((symbol, i) => { if (symbol !== BLANK) state.tape.set(i, symbol); });
    tape.position.x = 0; paintAll();
  }
  /** Begin one step: read, then write, then move, animated by update(). */
  function step() {
    if (state.halted || state.t >= 0) return;
    const rule = ruleFor();
    if (!rule) { state.halted = true; state.running = false; paintAll(); kit.redraw(); return; }
    state.pending = rule; state.t = 0; state.written = false;
  }
  function toggleRun() {
    if (state.halted) return;
    state.running = !state.running;
    if (state.running) step();
    kit.redraw();
  }
  function setPage(page) { state.page = page; kit.redraw(); }
  function open() { state.page = 'machine'; kit.open(id); }
  function finishStep() {
    const [, move, next] = state.pending;
    const dir = move === 'L' ? -1 : move === 'R' ? 1 : 0;
    state.head += dir; state.machine = next === 'H' ? state.machine : next; state.halted = next === 'H';
    state.steps++; state.t = -1; state.pending = null; tape.position.x = 0;
    if (state.halted) state.running = false;
    paintAll();
    if (kit.showing() === id) kit.redraw();
    if (state.running) state.wait = .15;
  }
  reset(0);
  state.drumShown = state.drum; state.rowShown = state.row;

  return {
    id,
    update(dt) {
      state.clock += dt;
      // The drum rolls round to the state, and the bar glides to the rule in use.
      state.drumShown += (state.drum - state.drumShown) * Math.min(1, dt * 6);
      drum.rotation.x = -(state.drumShown + .5) * Math.PI / 2;
      state.rowShown += (state.row - state.rowShown) * Math.min(1, dt * 7);
      bar.position.y = rowY(state.rowShown);
      bar.material.opacity += ((state.halted ? 0 : state.t >= 0 && state.t < .3 ? .6 : .32) - bar.material.opacity) * Math.min(1, dt * 6);
      if (state.t < 0) {
        reader.material.opacity = Math.max(0, reader.material.opacity - dt * 3);
        if (state.running && !state.halted && (state.wait -= dt) <= 0) step();
        return;
      }
      state.t = Math.min(1, state.t + dt / STEP);
      const t = state.t, [write, move] = state.pending, dir = move === 'L' ? -1 : move === 'R' ? 1 : 0;
      // Read: the square lights, and the lamp.
      const reading = t < .3 ? Math.sin(t / .3 * Math.PI) : 0;
      reader.material.opacity = reading * .45; lamp.material.color.set(reading > .1 ? '#ffd76a' : '#6a5a2c');
      // Write: the pencil comes down and draws the figure, or the eraser rises and rubs it out.
      const before = read(state.head), changes = write !== before;
      if (changes && t >= .26 && t < .62) {
        const k = (t - .26) / .36, come = smooth(Math.min(1, k / .28)) * smooth(Math.min(1, (1 - k) / .22)), work = Math.max(0, Math.min(1, (k - .28) / .5));
        if (write === BLANK) {
          eraser.position.set(Math.sin(state.clock * 40) * .018 * come, -CELL / 2 - .06 + (CELL / 2 + .06) * come, .05 - .035 * come);
          state.writing = {symbol: before, drawn: 1 - work};
        } else {
          pencil.rotation.x = PENCIL.rest + (PENCIL.write - PENCIL.rest) * come;
          pencil.position.x = come * Math.sin(work * Math.PI * 3) * .012;
          state.writing = {symbol: write, drawn: work};
        }
        paintTape();
      } else if (state.writing && t >= .62) {
        state.writing = null; pencil.rotation.x = PENCIL.rest; pencil.position.x = 0; eraser.position.set(0, -CELL / 2 - .06, .05);
      }
      if (t >= .62 && !state.written) {
        state.written = true;
        if (write === BLANK) state.tape.delete(state.head); else state.tape.set(state.head, write);
        paintTape();
      }
      // Move: the tape slides a square the other way under the head, and the spools turn with it.
      if (t > .64) {
        const m = (t - .64) / .36, eased = m < .5 ? 2 * m * m : 1 - (-2 * m + 2) ** 2 / 2, x = -dir * CELL * eased;
        for (const spool of spools) spool.rotation.y -= (x - tape.position.x) / SPOOL.r;
        tape.position.x = x;
      }
      if (t >= 1) finishStep();
    },
    key(key) {
      if (kit.showing() !== id || state.page !== 'machine') return false;
      if (key === ' ') { step(); return true; }
      if (key === 'Enter') { toggleRun(); return true; }
      return false;
    },
    getState: () => ({program: state.program, name: PROGRAMS[state.program].name, steps: state.steps, halted: state.halted, running: state.running,
      state: state.machine, head: state.head, tape: [...state.tape.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v).join(''),
      ones: [...state.tape.values()].filter(v => v === '1').length, page: state.page, drum: DRUM[state.drum]}),
    targets: () => ({turing: desk.localToWorld(new THREE.Vector3(0, TOP + .2, 0)).toArray()}),
    open, load, step, toggleRun, setPage
  };
}
