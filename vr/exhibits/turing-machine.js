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
 * On a desk, a paper tape runs under a brass reading head, and a card behind
 * it holds the machine's table of rules, the rule in use lit in gold. Choose a
 * program — add one in binary, add two tally numbers, the two-state busy
 * beaver, or one that never stops — and step it, or let it run.
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
const CELL = .11, WINDOW = 29, STEP = .85;   // a square of tape, how many lie on the desk, seconds a step takes when running

export function createTuringMachine(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'turing';
  const state = {program: 0, tape: new Map(), head: 0, machine: 'A', steps: 0, halted: false, running: false, t: -1, pending: null, page: 'machine', wait: 0};

  // ── The desk, the tape, the head and the rule card ───────────────────
  const wall = kit.onWall(angle, 4.0);
  const desk = new THREE.Group(); wall.add(desk);
  const TOP = .84;
  box(desk, [3.5, .06, .74], [0, TOP, 0], M.darkWood);
  box(desk, [3.56, .02, .8], [0, TOP - .04, 0], M.gold);
  for (const [x, z] of [[-1.65, -.3], [1.65, -.3], [-1.65, .3], [1.65, .3]]) box(desk, [.07, TOP, .07], [x, TOP / 2, z], M.wood);
  box(desk, [3.3, .5, .04], [0, .5, -.33], M.wood);
  // The tape: one canvas, the squares around the head, sliding a square as the head moves.
  const tapeCanvas = document.createElement('canvas'); tapeCanvas.width = WINDOW * 96; tapeCanvas.height = 96;
  const tapeMap = kit.texture(tapeCanvas);
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(WINDOW * CELL, CELL), new THREE.MeshStandardMaterial({map: tapeMap, roughness: .9}));
  tape.rotation.x = -Math.PI / 2; tape.position.set(0, TOP + .032, .08); desk.add(tape);
  // Spools at either end, as if the tape ran on for ever.
  for (const side of [-1, 1]) {
    const spool = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, CELL + .03, 20), M.paper);
    spool.rotation.x = Math.PI / 2; spool.position.set(side * (WINDOW * CELL / 2 + .07), TOP + .1, .08); desk.add(spool);
    for (const z of [-.075, .075]) { const cheek = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .01, 20), M.brass); cheek.rotation.x = Math.PI / 2; cheek.position.set(side * (WINDOW * CELL / 2 + .07), TOP + .1, .08 + z); desk.add(cheek); }
  }
  // The head: a brass carriage straddling the tape, with a stylus, a lamp and its state.
  const head = new THREE.Group(); head.position.set(0, TOP + .03, .08); desk.add(head);
  for (const side of [-1, 1]) box(head, [.025, .24, .2], [side * .08, .12, 0], M.brass);
  box(head, [.19, .05, .2], [0, .25, 0], M.brass);
  const stylus = new THREE.Mesh(new THREE.CylinderGeometry(.006, .002, .14, 8), M.ink); stylus.position.y = .16; head.add(stylus);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(.022, 12, 8), new THREE.MeshBasicMaterial({color: '#6a5a2c'})); lamp.position.set(0, .3, 0); head.add(lamp);
  const plate = document.createElement('canvas'); plate.width = 256; plate.height = 112;
  const plateMap = kit.texture(plate);
  plane(head, .17, .074, [0, .17, .102], plateMap);
  // The rule card behind, on a stand.
  const card = document.createElement('canvas'); card.width = 1040; card.height = 640;
  const cardMap = kit.texture(card);
  box(desk, [1.42, .86, .04], [0, 1.6, -.3], M.gold);
  plane(desk, 1.36, .8, [0, 1.6, -.275], cardMap);
  // Its legs stand behind it, from the desk to the card's foot.
  box(desk, [.05, .4, .05], [-.5, TOP + .2, -.35], M.brass); box(desk, [.05, .4, .05], [.5, TOP + .2, -.35], M.brass);
  kit.moving(tape, stylus, lamp);

  const read = pos => state.tape.get(pos) ?? BLANK;
  const ruleFor = () => PROGRAMS[state.program].rules[state.machine]?.[read(state.head)];
  function paintTape() {
    const ctx = tapeCanvas.getContext('2d'), s = 96;
    ctx.fillStyle = '#efe6cf'; ctx.fillRect(0, 0, tapeCanvas.width, s);
    for (let i = 0; i < WINDOW; i++) {
      const symbol = read(state.head - (WINDOW - 1) / 2 + i);
      ctx.strokeStyle = '#8c7d60'; ctx.lineWidth = 3; ctx.strokeRect(i * s + 1.5, 1.5, s - 3, s - 3);
      if (symbol !== BLANK) { ctx.fillStyle = '#1d1a17'; ctx.font = 'bold 76px Georgia'; ctx.textAlign = 'center'; ctx.fillText(symbol, i * s + s / 2, 76); }
    }
    tapeMap.needsUpdate = true;
  }
  const show = symbol => symbol === BLANK ? '□' : symbol;
  const moveName = m => ({L: 'LEFT', R: 'RIGHT', N: 'STAY'})[m];
  const nextName = n => n === 'H' ? 'HALT' : n;
  function paintPlate() {
    const ctx = plate.getContext('2d');
    ctx.fillStyle = '#1d2329'; ctx.fillRect(0, 0, 256, 112);
    ctx.fillStyle = '#c8bfa7'; ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.fillText('STATE', 128, 34);
    ctx.fillStyle = state.halted ? '#cfe3b0' : '#f4dca2'; ctx.font = 'bold 54px Georgia'; ctx.fillText(state.halted ? 'HALT' : state.machine, 128, 94);
    plateMap.needsUpdate = true;
  }
  /** The table of rules, the one in use lit. */
  function drawRules(ctx, x, y, w, rowHeight, size) {
    const rows = [];
    for (const [s, reads] of Object.entries(PROGRAMS[state.program].rules)) for (const [symbol, [write, move, next]] of Object.entries(reads)) rows.push([s, symbol, write, move, next]);
    const now = state.halted ? null : [state.machine, read(state.head)];
    const columns = ['IN STATE', 'READS', 'WRITES', 'MOVES', 'THEN'], cw = w / columns.length;
    ctx.fillStyle = '#d9bc7d'; ctx.font = `${Math.round(size * .62)}px Arial`; ctx.textAlign = 'center';
    columns.forEach((c, i) => ctx.fillText(c, x + cw * (i + .5), y));
    rows.forEach((row, r) => {
      const ry = y + 14 + r * rowHeight, lit = now && row[0] === now[0] && row[1] === now[1];
      ctx.fillStyle = lit ? '#6a5a2c' : r % 2 ? '#242c22' : '#2a3327'; ctx.fillRect(x, ry, w, rowHeight - 4);
      ctx.fillStyle = lit ? '#fff4d6' : '#f1e5d0'; ctx.font = `${size}px Georgia`;
      [row[0], show(row[1]), show(row[2]), moveName(row[3]), nextName(row[4])].forEach((v, i) => ctx.fillText(v, x + cw * (i + .5), ry + rowHeight * .68));
    });
    ctx.textAlign = 'left';
  }
  function paintCard() {
    const ctx = card.getContext('2d');
    ctx.fillStyle = '#1a2026'; ctx.fillRect(0, 0, 1040, 640);
    ctx.fillStyle = '#e1c393'; ctx.font = '600 34px Arial'; ctx.fillText('THE TABLE OF RULES', 40, 58);
    ctx.fillStyle = '#c8b793'; ctx.font = 'italic 30px Georgia'; ctx.fillText(PROGRAMS[state.program].name, 40, 100, 960);
    drawRules(ctx, 40, 160, 960, 70, 34);
    ctx.fillStyle = state.halted ? '#cfe3b0' : '#c8bfa7'; ctx.font = '28px Arial';
    ctx.fillText(state.halted ? `HALTED AFTER ${state.steps} STEP${state.steps === 1 ? '' : 'S'}` : `STEP ${state.steps}`, 40, 610);
    cardMap.needsUpdate = true;
  }
  function paintAll() { paintTape(); paintPlate(); paintCard(); }

  // A press on the desk, the tape or the card opens the panel.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.7, .8), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.1; desk.add(proxy);
  kit.press(proxy, () => open(), 'Turing machine');
  const front = kit.inRoom(wall, 0, 1.8); kit.medallion(front.x, front.z);
  {
    const p = kit.inRoom(wall, 2.4, 1.6);
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
    Object.assign(state, {program: index, tape: new Map(), head: program.start, machine: 'A', steps: 0, halted: false, running: false, t: -1, pending: null});
    [...program.tape].forEach((symbol, i) => { if (symbol !== BLANK) state.tape.set(i, symbol); });
    tape.position.x = 0; paintAll();
  }
  /** Begin one step: read, then write, then move, animated by update(). */
  function step() {
    if (state.halted || state.t >= 0) return;
    const rule = ruleFor();
    if (!rule) { state.halted = true; state.running = false; paintAll(); kit.redraw(); return; }
    state.pending = rule; state.t = 0;
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
    const [write, move, next] = state.pending;
    const dir = move === 'L' ? -1 : move === 'R' ? 1 : 0;
    state.head += dir; state.machine = next === 'H' ? state.machine : next; state.halted = next === 'H';
    state.steps++; state.t = -1; state.pending = null; tape.position.x = 0;
    if (state.halted) state.running = false;
    paintAll();
    if (kit.showing() === id) kit.redraw();
    if (state.running) state.wait = .15;
  }
  reset(0);

  return {
    id,
    update(dt) {
      if (state.t < 0) {
        if (state.running && !state.halted && (state.wait -= dt) <= 0) step();
        return;
      }
      state.t = Math.min(1, state.t + dt / STEP);
      const t = state.t, [write, move] = state.pending, dir = move === 'L' ? -1 : move === 'R' ? 1 : 0;
      // Read: the lamp glows. Write: the stylus dips, and the square changes as it touches.
      lamp.material.color.set(t < .3 ? '#ffd76a' : '#6a5a2c');
      const dip = t > .3 && t < .5 ? Math.sin((t - .3) / .2 * Math.PI) : 0;
      stylus.position.y = .16 - dip * .085;
      if (t > .4 && !state.written) { state.written = true; if (write === BLANK) state.tape.delete(state.head); else state.tape.set(state.head, write); paintTape(); }
      // Move: the tape slides a square the other way under the head.
      if (t > .55) { const m = (t - .55) / .45, eased = m < .5 ? 2 * m * m : 1 - (-2 * m + 2) ** 2 / 2; tape.position.x = -dir * CELL * eased; }
      if (t >= 1) { state.written = false; finishStep(); }
    },
    key(key) {
      if (kit.showing() !== id || state.page !== 'machine') return false;
      if (key === ' ') { step(); return true; }
      if (key === 'Enter') { toggleRun(); return true; }
      return false;
    },
    getState: () => ({program: state.program, name: PROGRAMS[state.program].name, steps: state.steps, halted: state.halted, running: state.running,
      state: state.machine, head: state.head, tape: [...state.tape.entries()].sort((a, b) => a[0] - b[0]).map(([, v]) => v).join(''),
      ones: [...state.tape.values()].filter(v => v === '1').length, page: state.page}),
    targets: () => ({turing: desk.localToWorld(new THREE.Vector3(0, TOP + .2, 0)).toArray()}),
    open, load, step, toggleRun, setPage
  };
}
