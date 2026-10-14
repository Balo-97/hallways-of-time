/**
 * Mendel's peas: cross them, and count.
 *
 * In the garden of his monastery in Brno, Gregor Mendel crossed pea plants
 * for eight years. A tall plant crossed with a short one gave only tall ones;
 * crossed again among themselves, those gave back the short, in about one in
 * four. Traits come in units that do not blend — what we now call genes —
 * one from each parent.
 *
 * Twenty pots stand on a potting bench. Cross the parents and the first
 * generation grows, every plant tall; cross two of those and the short return.
 * Plant more and the tally comes closer and closer to three to one — though by
 * chance it wanders, which is why Mendel's own counts, so close to the ideal,
 * have been doubted since 1936.
 */
const POTS = 20;
const TALL = .72, SHORT = .2;
// Mendel's own count for stem length, in the second generation.
const MENDEL = {tall: 787, short: 277};

export function createMendel(kit, {angle}) {
  const {THREE, M, box, board, wrapped} = kit;
  const id = 'mendel';
  const state = {stage: 'P', plants: [], grown: new Array(POTS).fill(0), batch: {tall: 0, short: 0}, tally: {tall: 0, short: 0}, batches: 0};
  const isTall = g => g.includes('T');
  const child = (a, b) => (a[Math.random() < .5 ? 0 : 1] + b[Math.random() < .5 ? 0 : 1]).split('').sort().join('');   // 'T' sorts before 't'

  // ── The potting bench and its pots ───────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  const bench = new THREE.Group(); wall.add(bench);
  const BENCH = {w: 2.3, d: 1.05, y: .78};
  box(bench, [BENCH.w, .07, BENCH.d], [0, BENCH.y, 0], M.wood);
  for (const [x, z] of [[-1.05, -.42], [1.05, -.42], [-1.05, .42], [1.05, .42]]) box(bench, [.07, BENCH.y, .07], [x, BENCH.y / 2, z], M.darkWood);
  box(bench, [BENCH.w - .1, .04, BENCH.d - .1], [0, .2, 0], M.darkWood);
  // Pots in five rows of four, and the plants in them, all instanced.
  const slot = i => new THREE.Vector3(-.9 + (i % 5) * .45, BENCH.y + .035, -.33 + Math.floor(i / 5) * .22);
  const terracotta = new THREE.MeshStandardMaterial({color: '#b5643c', roughness: .85});
  const pots = new THREE.InstancedMesh(new THREE.CylinderGeometry(.075, .055, .13, 14), terracotta, POTS);
  const soil = new THREE.InstancedMesh(new THREE.CylinderGeometry(.068, .068, .01, 14), new THREE.MeshStandardMaterial({color: '#3b2a1c', roughness: 1}), POTS);
  const o = new THREE.Object3D();
  for (let i = 0; i < POTS; i++) {
    o.position.copy(slot(i)).add(new THREE.Vector3(0, .065, 0)); o.updateMatrix(); pots.setMatrixAt(i, o.matrix);
    o.position.y += .058; o.updateMatrix(); soil.setMatrixAt(i, o.matrix);
  }
  const green = new THREE.MeshStandardMaterial({color: '#4f8a3a', roughness: .7});
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.007, .009, 1, 6), green, POTS);
  const leaves = new THREE.InstancedMesh(new THREE.SphereGeometry(.035, 8, 6), new THREE.MeshStandardMaterial({color: '#5f9e45', roughness: .7}), POTS * 4);
  const flowers = new THREE.InstancedMesh(new THREE.SphereGeometry(.026, 10, 8), new THREE.MeshStandardMaterial({color: '#8e5bb5', roughness: .5}), POTS);
  for (const mesh of [pots, soil, stems, leaves, flowers]) { mesh.frustumCulled = false; bench.add(mesh); }
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  function placePlants() {
    for (let i = 0; i < POTS; i++) {
      const g = state.plants[i], grow = state.grown[i];
      if (!g || grow <= 0) { stems.setMatrixAt(i, hidden); flowers.setMatrixAt(i, hidden); for (let k = 0; k < 4; k++) leaves.setMatrixAt(i * 4 + k, hidden); continue; }
      const base = slot(i).add(new THREE.Vector3(0, .13, 0)), height = (isTall(g) ? TALL : SHORT) * grow;
      o.position.copy(base).add(new THREE.Vector3(0, height / 2, 0)); o.rotation.set(0, 0, 0); o.scale.set(1, Math.max(height, .001), 1); o.updateMatrix(); stems.setMatrixAt(i, o.matrix);
      for (let k = 0; k < 4; k++) {
        const side = k % 2 ? 1 : -1;
        o.position.copy(base).add(new THREE.Vector3(side * .03, height * (.3 + k * .17), 0)); o.rotation.set(0, i + k, side * .6); o.scale.set(1.2 * grow, .35, .7); o.updateMatrix();
        leaves.setMatrixAt(i * 4 + k, o.matrix);
      }
      o.position.copy(base).add(new THREE.Vector3(0, height + .015, 0)); o.rotation.set(0, 0, 0); o.scale.setScalar(Math.min(1, grow * 1.2)); o.updateMatrix(); flowers.setMatrixAt(i, o.matrix);
    }
    for (const mesh of [stems, leaves, flowers]) mesh.instanceMatrix.needsUpdate = true;
  }
  kit.moving(stems, leaves, flowers);
  // A sign on the bench, and the bench to press.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(BENCH.w, 1.0, BENCH.d), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = BENCH.y + .45; bench.add(proxy);
  kit.press(proxy, () => open(), 'Mendel’s peas');
  // Above the tallest plants, so they never hide it.
  kit.plane(bench, 1.4, .26, [0, BENCH.y + 1.15, -BENCH.d / 2 - .02], kit.lettering(1.4, .26, [
    ['TALL × SHORT', .1, .07, '#e1c393', '600 #px Arial, sans-serif'], ['and then the grandchildren', .19, .05, '#f1ddba', 'italic #px Georgia, serif']], '#23303b'));
  {
    const p = kit.inRoom(wall, 2.0, 1.5);
    kit.plaque(p.x, p.z, 0, 0, [
      ['MENDEL’S PEAS', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Gregor Mendel, Brno, published 1866', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Cross a tall pea with a short one, then cross', .22, .033],
      ['their children. Do the traits blend, or do', .27, .033],
      ['they come back? Press here, and count.', .32, .033],
      ['Mendel counted some 28,000 plants', .41, .028, '#a99a7c', 'italic #px Georgia, serif'],
      ['over eight years.', .45, .028, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Mendel plaque');
  }

  // ── The panel ────────────────────────────────────────────────────────
  const TITLES = {P: 'The parents', F1: 'Their children', F2: 'Their grandchildren'};
  const parents = () => state.stage === 'P' ? ['TT', 'tt'] : ['Tt', 'Tt'];
  function drawSquare(ctx, x, y) {
    const [a, b] = parents(), cell = 110;
    ctx.fillStyle = '#c8bfa7'; ctx.font = '19px Arial'; ctx.fillText(`CROSSING ${a} × ${b}`, x, y - 16);
    ctx.font = 'bold 30px Georgia'; ctx.textAlign = 'center';
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = '#d9bc7d'; ctx.fillText(a[i], x + 60 + (i + .5) * cell, y + 30);
      ctx.fillText(b[i], x + 26, y + 60 + (i + .5) * cell + 10);
    }
    for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) {
      const g = [a[c], b[r]].sort().join(''), tall = isTall(g), cx = x + 60 + c * cell, cy = y + 50 + r * cell;
      ctx.fillStyle = tall ? '#3f6d33' : '#7a6a3a'; ctx.fillRect(cx + 4, cy + 4, cell - 8, cell - 8);
      ctx.fillStyle = '#f6efe0'; ctx.font = 'bold 32px Georgia'; ctx.fillText(g, cx + cell / 2, cy + cell / 2 + 4);
      ctx.font = '17px Arial'; ctx.fillText(tall ? 'TALL' : 'SHORT', cx + cell / 2, cy + cell / 2 + 30);
    }
    ctx.textAlign = 'left';
  }
  function bar(ctx, x, y, w, tall, short, label) {
    const total = tall + short || 1;
    ctx.fillStyle = '#3f6d33'; ctx.fillRect(x, y, w * tall / total, 34);
    ctx.fillStyle = '#7a6a3a'; ctx.fillRect(x + w * tall / total, y, w * short / total, 34);
    ctx.fillStyle = '#f6efe0'; ctx.font = '19px Arial';
    ctx.fillText(`${label}: ${tall.toLocaleString('en-GB')} tall, ${short.toLocaleString('en-GB')} short${short ? ` · ${(tall / short).toFixed(2)} to 1` : ''}`, x, y + 60, w);
  }
  function paintPanel() {
    const {canvas, ctx} = board('MENDEL’S PEAS · BRNO, 1866', TITLES[state.stage]);
    const text = {
      P: 'A tall plant that breeds true, and a short one. Each carries two factors for height, one from each of its own parents: TT and tt. Cross them. Will their children come out in between?',
      F1: 'Every one tall. The shortness has not blended away; it is hidden. Each child has one factor from each parent, Tt, and tall wins. Now cross two of these.',
      F2: 'The short plants come back: about one in four. Each parent passes on one of its two factors, at random, so a quarter of the grandchildren get two for short. The more you plant, the closer the count comes to three to one.'
    }[state.stage];
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, text, 1080).slice(0, 3).forEach((line, i) => ctx.fillText(line, 60, 172 + i * 31));
    drawSquare(ctx, 60, 320);
    const x = 400, w = 740;
    if (state.stage !== 'P') bar(ctx, x, 330, w, state.batch.tall, state.batch.short, 'ON THE BENCH NOW');
    if (state.stage === 'F2') {
      bar(ctx, x, 440, w, state.tally.tall, state.tally.short, `ALL YOUR GRANDCHILDREN (${state.batches} BATCH${state.batches === 1 ? '' : 'ES'} AND MORE)`);
      bar(ctx, x, 550, w, MENDEL.tall, MENDEL.short, 'MENDEL’S OWN COUNT');
      ctx.fillStyle = '#c8bfa7'; ctx.font = '22px Georgia';
      wrapped(ctx, 'Mendel’s counts came so close to three to one that in 1936 Ronald Fisher argued they were too good to be chance. Plant a few batches of twenty and see how far yours wander.', w)
        .slice(0, 4).forEach((line, i) => ctx.fillText(line, x, 680 + i * 30));
    }
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Mendel’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  kit.panel(id, {
    paint: paintPanel,
    zones: () => [{x: 640, y: 945, w: 520, h: 40, label: 'Mendel’s story', fn: () => kit.story(id)}],
    actions: () => state.stage === 'P' ? [['CROSS THEM', cross, '#6a5a2c'], ['CLOSE', kit.close]]
      : state.stage === 'F1' ? [['CROSS TWO OF THESE', cross, '#6a5a2c'], ['START AGAIN', reset], ['CLOSE', kit.close]]
        : [['PLANT 20 MORE', cross, '#6a5a2c'], ['PLANT 1,000', () => plantMany(1000)], ['START AGAIN', reset], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function sow(plants) {
    state.plants = plants; state.grown = plants.map((_, i) => -i * .06);   // they come up one after another
    state.batch = {tall: plants.filter(isTall).length, short: plants.filter(g => !isTall(g)).length};
  }
  function cross() {
    if (state.stage === 'P') { state.stage = 'F1'; sow(Array.from({length: POTS}, () => child('TT', 'tt'))); }
    else {
      state.stage = 'F2'; sow(Array.from({length: POTS}, () => child('Tt', 'Tt')));
      state.tally.tall += state.batch.tall; state.tally.short += state.batch.short; state.batches++;
    }
    kit.redraw();
  }
  function plantMany(n) {
    for (let i = 0; i < n; i++) isTall(child('Tt', 'Tt')) ? state.tally.tall++ : state.tally.short++;
    kit.redraw();
  }
  /** The parents stand at the two ends of the front row, the rest of the pots empty. */
  function showParents() {
    state.plants = [...Array(POTS)].map((_, i) => i === 15 ? 'TT' : i === 19 ? 'tt' : null);
    state.grown = state.plants.map(() => 1); state.batch = {tall: 0, short: 0};
  }
  function reset() {
    state.stage = 'P'; state.tally = {tall: 0, short: 0}; state.batches = 0;
    showParents(); placePlants(); kit.redraw();
  }
  function open() { kit.open(id); }
  showParents(); placePlants();

  return {
    id,
    update(dt) {
      let changed = false;
      for (let i = 0; i < POTS; i++) if (state.grown[i] < 1) { state.grown[i] = Math.min(1, state.grown[i] + dt * .8); changed = true; }
      if (changed) placePlants();
    },
    getState: () => ({stage: state.stage, batch: {...state.batch}, tally: {...state.tally}, batches: state.batches,
      ratio: state.tally.short ? state.tally.tall / state.tally.short : null}),
    targets: () => ({mendel: bench.localToWorld(new THREE.Vector3(0, BENCH.y + .3, 0)).toArray()}),
    open, cross, plantMany, reset
  };
}
