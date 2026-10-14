/**
 * Mendel's peas: cross them, and count.
 *
 * In the garden of his monastery in Brno, Gregor Mendel crossed pea plants
 * for eight years. A tall plant crossed with a short one gave only tall ones;
 * crossed again among themselves, those gave back the short, in about one in
 * four. Traits come in units that do not blend — what we now call genes —
 * one from each parent.
 *
 * Twenty clay pots stand on a weathered potting bench, seed jars and a
 * watering can on the shelf behind. Pea plants grow in them node by node, each
 * pair of leaflets opening as the stem passes, tendrils at the tips, flowers
 * and then pods, the tall ones tied to canes, all stirring a little as if in a
 * breeze. Cross the parents and a brush carries pollen from one flower to the
 * other, as Mendel did; the first generation comes up, every plant tall.
 * Cross two of those and the short return. Plant more and the tally comes
 * closer and closer to three to one — though by chance it wanders, which is
 * why Mendel's own counts, so close to the ideal, have been doubted since 1936.
 */
const POTS = 20;
const TALL = .72, SHORT = .2;
// Mendel's own count for stem length, in the second generation.
const MENDEL = {tall: 787, short: 277};
const NODES = {tall: 6, short: 3};
const smooth = s => s * s * (3 - 2 * s);
const clamp01 = v => Math.max(0, Math.min(1, v));

export function createMendel(kit, {angle}) {
  const {THREE, M, box, board, wrapped} = kit;
  const id = 'mendel';
  const state = {stage: 'P', plants: [], grown: new Array(POTS).fill(0), batch: {tall: 0, short: 0}, tally: {tall: 0, short: 0}, batches: 0, clock: 0};
  // What stands on the bench, which can lag behind what the counts say while the brush is at work.
  const view = {plants: new Array(POTS).fill(null), grown: new Array(POTS).fill(0), pods: new Array(POTS).fill(0), next: null, wither: 0, brush: null};
  const isTall = g => g.includes('T');
  const child = (a, b) => (a[Math.random() < .5 ? 0 : 1] + b[Math.random() < .5 ? 0 : 1]).split('').sort().join('');   // 'T' sorts before 't'
  const canvas = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return kit.texture(c); };

  // ── The potting bench ────────────────────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  const bench = new THREE.Group(); wall.add(bench);
  const BENCH = {w: 2.3, d: 1.05, y: .78};
  const boards = new THREE.MeshStandardMaterial({roughness: .88, map: canvas(512, 256, (ctx, w, h) => {
    const r = kit.seeded(1866);
    for (let p = 0; p < 6; p++) {
      const y0 = p * h / 6, tone = 110 + r() * 30;
      ctx.fillStyle = `rgb(${tone},${tone * .78 | 0},${tone * .58 | 0})`; ctx.fillRect(0, y0, w, h / 6);
      for (let i = 0; i < 40; i++) { ctx.strokeStyle = `rgba(50,32,18,${.12 + r() * .2})`; ctx.lineWidth = 1 + r(); ctx.beginPath(); const y = y0 + r() * h / 6; ctx.moveTo(0, y); ctx.bezierCurveTo(w * .3, y + (r() - .5) * 8, w * .6, y + (r() - .5) * 8, w, y + (r() - .5) * 6); ctx.stroke(); }
      ctx.fillStyle = 'rgba(30,18,10,.6)'; ctx.fillRect(0, y0, w, 2);
      for (const x of [16, w - 16]) { ctx.fillStyle = '#3a3430'; ctx.beginPath(); ctx.arc(x, y0 + h / 12, 3, 0, Math.PI * 2); ctx.fill(); }
    }
  })});
  box(bench, [BENCH.w, .06, BENCH.d], [0, BENCH.y, 0], boards);
  for (const [x, z] of [[-1.08, -.46], [1.08, -.46], [-1.08, .46], [1.08, .46]]) box(bench, [.07, BENCH.y, .07], [x, BENCH.y / 2, z], M.darkWood);
  box(bench, [BENCH.w - .1, .04, BENCH.d - .1], [0, .22, 0], boards);
  for (const z of [-.46, .46]) box(bench, [BENCH.w - .1, .06, .03], [0, .5, z], M.darkWood);
  // The back: a board, and a shelf with seed jars, saucers and a watering can.
  box(bench, [BENCH.w, .7, .035], [0, BENCH.y + .38, -BENCH.d / 2 - .02], boards);
  box(bench, [BENCH.w - .06, .03, .17], [0, BENCH.y + .52, -BENCH.d / 2 + .065], boards);
  {
    const glass = new THREE.MeshStandardMaterial({color: '#cfe4e8', roughness: .08, transparent: true, opacity: .32, depthWrite: false});
    const peas = new THREE.MeshStandardMaterial({color: '#a8b45a', roughness: .7}), wrinkled = new THREE.MeshStandardMaterial({color: '#8d8a4c', roughness: .9});
    [-.95, -.75, -.55].forEach((x, i) => {
      const fill = new THREE.Mesh(new THREE.CylinderGeometry(.043, .043, .07 + i * .02, 14), i === 1 ? wrinkled : peas); fill.position.set(x, BENCH.y + .57 + (.07 + i * .02) / 2, -BENCH.d / 2 + .06); bench.add(fill);
      const jar = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, .15, 16, 1, true), glass); jar.position.set(x, BENCH.y + .61, -BENCH.d / 2 + .06); bench.add(jar);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(.053, .053, .02, 16), M.darkWood); lid.position.set(x, BENCH.y + .695, -BENCH.d / 2 + .06); bench.add(lid);
    });
    for (let i = 0; i < 4; i++) { const saucer = new THREE.Mesh(new THREE.CylinderGeometry(.07, .055, .015, 16), new THREE.MeshStandardMaterial({color: '#b5643c', roughness: .85})); saucer.position.set(.55, BENCH.y + .545 + i * .016, -BENCH.d / 2 + .06); bench.add(saucer); }
    const can = new THREE.Group(); can.position.set(.88, BENCH.y + .535, -BENCH.d / 2 + .07); bench.add(can);
    const zinc = new THREE.MeshStandardMaterial({color: '#8d9496', metalness: .6, roughness: .45});
    const body = new THREE.Mesh(new THREE.CylinderGeometry(.07, .08, .17, 18), zinc); body.position.y = .085; can.add(body);
    const spout = new THREE.Mesh(new THREE.CylinderGeometry(.008, .014, .22, 8), zinc); spout.position.set(-.13, .13, 0); spout.rotation.z = 1.0; can.add(spout);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(.022, .012, .03, 10), zinc); rose.position.set(-.22, .19, 0); rose.rotation.z = 1.0; can.add(rose);
    const handle = new THREE.Mesh(new THREE.TorusGeometry(.06, .008, 6, 16, Math.PI), zinc); handle.position.set(.02, .17, 0); can.add(handle);
  }
  // Pots in five rows of four, and the plants in them, all instanced.
  const slot = i => new THREE.Vector3(-.9 + (i % 5) * .45, BENCH.y + .03, -.33 + Math.floor(i / 5) * .22);
  const terracotta = new THREE.MeshStandardMaterial({color: '#b5643c', roughness: .85});
  const pots = new THREE.InstancedMesh(new THREE.LatheGeometry([[0, 0], [.05, 0], [.054, .01], [.068, .108], [.08, .112], [.08, .132], [.071, .132], [.068, .124], [0, .124]].map(([r, y]) => new THREE.Vector2(r, y)), 16), terracotta, POTS);
  const soil = new THREE.InstancedMesh(new THREE.CircleGeometry(.068, 16).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({color: '#3b2a1c', roughness: 1}), POTS);
  const o = new THREE.Object3D();
  for (let i = 0; i < POTS; i++) {
    o.position.copy(slot(i)); o.rotation.set(0, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); pots.setMatrixAt(i, o.matrix);
    o.position.y += .122; o.updateMatrix(); soil.setMatrixAt(i, o.matrix);
  }
  // The parts of a pea plant: stem, cane, leaflets in pairs, tendrils, flowers, and pods.
  const green = new THREE.MeshStandardMaterial({color: '#4f8a3a', roughness: .7});
  const leafGreen = new THREE.MeshStandardMaterial({color: '#5f9e45', roughness: .65, side: THREE.DoubleSide});
  const leafShape = new THREE.Shape(); leafShape.moveTo(0, 0); leafShape.quadraticCurveTo(.022, .018, 0, .05); leafShape.quadraticCurveTo(-.022, .018, 0, 0);
  const stems = new THREE.InstancedMesh(new THREE.CylinderGeometry(.007, .009, 1, 6).translate(0, .5, 0), green, POTS);
  const canes = new THREE.InstancedMesh(new THREE.CylinderGeometry(.003, .0035, 1, 5).translate(0, .5, 0), new THREE.MeshStandardMaterial({color: '#bfae84', roughness: .8}), POTS);
  const leaflets = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 4).scale(1.7, 1.7, 1.7), leafGreen, POTS * NODES.tall * 4);
  const tendrils = new THREE.InstancedMesh(new THREE.TorusGeometry(.012, .0016, 4, 14, Math.PI * 1.6), green, POTS * 2);
  const banners = new THREE.InstancedMesh(new THREE.CircleGeometry(.027, 14).scale(1, 1.15, 1), new THREE.MeshStandardMaterial({color: '#8e5bb5', roughness: .5, side: THREE.DoubleSide}), POTS * 2);
  const keels = new THREE.InstancedMesh(new THREE.SphereGeometry(.013, 8, 6).scale(1, .7, 1.8), new THREE.MeshStandardMaterial({color: '#c9a7dc', roughness: .5}), POTS * 2);
  const pods = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8).scale(.009, .038, .012), new THREE.MeshStandardMaterial({color: '#7fb04f', roughness: .55}), POTS * 2);
  for (const mesh of [pots, soil, stems, canes, leaflets, tendrils, banners, keels, pods]) { mesh.frustumCulled = false; bench.add(mesh); }
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0), up = new THREE.Vector3(), at = new THREE.Vector3();
  const phase = Array.from({length: POTS}, (_, i) => i * 2.39);
  /** Where a plant's flower is, now, in the bench's frame: for the brush to visit. */
  const flowerAt = i => { const g = view.plants[i]; return slot(i).add(new THREE.Vector3(0, .13 + (g && isTall(g) ? TALL : SHORT) + .02, 0)); };
  function placePlants() {
    for (let i = 0; i < POTS; i++) {
      const g = view.plants[i], grow = clamp01(view.grown[i]) * (1 - view.wither);
      const nodes = g && isTall(g) ? NODES.tall : NODES.short, off = (k, n) => k + i * NODES.tall * 2 + n;
      if (!g || grow <= 0) {
        stems.setMatrixAt(i, hidden); canes.setMatrixAt(i, hidden);
        for (let k = 0; k < NODES.tall * 4; k++) leaflets.setMatrixAt(i * NODES.tall * 4 + k, hidden);
        for (let k = 0; k < 2; k++) { tendrils.setMatrixAt(i * 2 + k, hidden); banners.setMatrixAt(i * 2 + k, hidden); keels.setMatrixAt(i * 2 + k, hidden); pods.setMatrixAt(i * 2 + k, hidden); }
        continue;
      }
      const tall = isTall(g), full = tall ? TALL : SHORT, height = full * smooth(grow), base = slot(i).add(new THREE.Vector3(0, .124, 0));
      // The stem leans a little and stirs, more at its top.
      const sway = (.05 + .03 * Math.sin(state.clock * .7 + phase[i])) * Math.sin(state.clock * 1.3 + phase[i]) * grow;
      up.set(Math.sin(sway), Math.cos(sway), 0);
      o.position.copy(base); o.rotation.set(0, 0, -sway); o.scale.set(1, Math.max(height, .001), 1); o.updateMatrix(); stems.setMatrixAt(i, o.matrix);
      if (tall) { o.position.copy(base).add(at.set(.022, 0, -.02)); o.rotation.set(0, 0, 0); o.scale.set(1, (full + .04) * Math.min(1, grow * 3), 1); o.updateMatrix(); canes.setMatrixAt(i, o.matrix); }
      else canes.setMatrixAt(i, hidden);
      const along = h => at.copy(base).addScaledVector(up, h);
      // Two pairs of leaflets at each node, each node turned half round from the last, opening as the stem passes it.
      for (let k = 0; k < NODES.tall; k++) for (let n = 0; n < 4; n++) {
        const index = i * NODES.tall * 4 + k * 4 + n, pair = n >> 1;
        if (k >= nodes) { leaflets.setMatrixAt(index, hidden); continue; }
        const h = full * (k + 1) / (nodes + .7) + pair * .028, open = smooth(clamp01((height - h) / .07)) * (1 - view.wither);
        if (open <= 0) { leaflets.setMatrixAt(index, hidden); continue; }
        const side = n & 1 ? 1 : -1, yaw = k * Math.PI + i + pair * .5;
        along(h); o.position.copy(at); o.rotation.set(0, yaw, side * (1.15 - .25 * open) - sway); o.scale.setScalar(open * (tall ? 1 : 1.35) * (pair ? .8 : 1)); o.updateMatrix();
        leaflets.setMatrixAt(index, o.matrix);
      }
      // Tendrils curling at the tip; then the flowers; then, once grown, the pods.
      const bloom = smooth(clamp01((grow - .82) / .18));
      for (let k = 0; k < 2; k++) {
        const top = along(height - .015 * k).clone();
        o.position.copy(top).add(at.set(k ? -.02 : .02, .01, 0)); o.rotation.set(Math.PI / 2, 0, k * Math.PI + state.clock * .2); o.scale.setScalar(Math.min(1, grow * 1.4)); o.updateMatrix(); tendrils.setMatrixAt(i * 2 + k, o.matrix);
        const fh = k ? height * .78 : height + .012;
        if (bloom <= 0 || (!tall && k)) { banners.setMatrixAt(i * 2 + k, hidden); keels.setMatrixAt(i * 2 + k, hidden); }
        else {
          along(fh); const turn = k * Math.PI * .9 + i;
          o.position.copy(at).add(new THREE.Vector3(Math.sin(turn) * .012, .006, Math.cos(turn) * .012)); o.rotation.set(-.2, turn, 0); o.scale.setScalar(bloom); o.updateMatrix(); banners.setMatrixAt(i * 2 + k, o.matrix);
          o.position.copy(at).add(new THREE.Vector3(Math.sin(turn) * .018, -.004, Math.cos(turn) * .018)); o.updateMatrix(); keels.setMatrixAt(i * 2 + k, o.matrix);
        }
        const pod = view.pods[i] * (1 - view.wither);
        if (pod <= 0 || (!tall && k)) pods.setMatrixAt(i * 2 + k, hidden);
        else { along(full * (k ? .45 : .62) * smooth(grow)); o.position.copy(at).add(new THREE.Vector3(k ? -.03 : .03, -.03, .01)); o.rotation.set(0, i, (k ? -.35 : .35)); o.scale.setScalar(smooth(pod)); o.updateMatrix(); pods.setMatrixAt(i * 2 + k, o.matrix); }
      }
    }
    for (const mesh of [stems, canes, leaflets, tendrils, banners, keels, pods]) mesh.instanceMatrix.needsUpdate = true;
  }
  // The brush that carries pollen from flower to flower, and the pollen it shakes off on the way.
  const brush = new THREE.Group(); brush.visible = false; bench.add(brush);
  { const handle = new THREE.Mesh(new THREE.CylinderGeometry(.004, .005, .16, 6).translate(0, .1, 0), M.darkWood); brush.add(handle);
    const ferrule = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .02, 8).translate(0, .015, 0), M.brass); brush.add(ferrule);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(.007, .025, 8).rotateX(Math.PI).translate(0, -.008, 0), new THREE.MeshStandardMaterial({color: '#e8d9a8', roughness: .9})); brush.add(tip); }
  brush.rotation.z = .35;
  const POLLEN = 14, pollenAt = new Float32Array(POLLEN * 3).fill(-10), pollenLife = new Array(POLLEN).fill(0);
  const pollen = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(pollenAt, 3)),
    new THREE.PointsMaterial({size: .012, color: '#ffd84a', transparent: true, opacity: .9, depthWrite: false}));
  pollen.frustumCulled = false; bench.add(pollen);
  kit.moving(stems, canes, leaflets, tendrils, banners, keels, pods, brush, pollen);
  // A sign on posts above the back board, and the bench to press.
  const proxy = new THREE.Mesh(new THREE.BoxGeometry(BENCH.w, 1.0, BENCH.d), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = BENCH.y + .45; bench.add(proxy);
  kit.press(proxy, () => open(), 'Mendel’s peas');
  for (const x of [-.72, .72]) box(bench, [.04, .5, .04], [x, BENCH.y + .95, -BENCH.d / 2 - .02], M.darkWood);
  kit.plane(bench, 1.4, .26, [0, BENCH.y + 1.15, -BENCH.d / 2], kit.lettering(1.4, .26, [
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
  /**
   * A new generation: the counts change at once; on the bench, the brush first
   * carries pollen between two flowers if there are parents to cross, the old
   * plants wither, and the new come up one after another.
   */
  function sow(plants, from, to) {
    state.plants = plants; state.grown = plants.map(() => 1);
    state.batch = {tall: plants.filter(isTall).length, short: plants.filter(g => !isTall(g)).length};
    view.next = plants;
    if (from !== undefined && view.plants[from] && view.plants[to]) view.brush = {t: 0, from: flowerAt(from), to: flowerAt(to)};
    else { view.brush = null; view.wither = Math.max(view.wither, .001); }
  }
  function cross() {
    if (state.stage === 'P') { state.stage = 'F1'; sow(Array.from({length: POTS}, () => child('TT', 'tt')), 15, 19); }
    else {
      const first = state.stage === 'F1';
      state.stage = 'F2'; sow(Array.from({length: POTS}, () => child('Tt', 'Tt')), first ? 10 : undefined, first ? 12 : undefined);
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
    view.plants = [...state.plants]; view.grown = state.plants.map(() => 1); view.pods = state.plants.map(g => g ? 1 : 0);
    view.next = null; view.brush = null; view.wither = 0; brush.visible = false;
  }
  function reset() {
    state.stage = 'P'; state.tally = {tall: 0, short: 0}; state.batches = 0;
    showParents(); placePlants(); kit.redraw();
  }
  function open() { kit.open(id); }
  showParents(); placePlants();
  const lift = new THREE.Vector3(0, .1, 0), path = new THREE.Vector3();

  return {
    id,
    update(dt) {
      state.clock += dt;
      // The brush: down to the first flower, a dab, over to the second, a dab, and away; pollen falls from it.
      if (view.brush) {
        const b = view.brush; b.t = Math.min(1, b.t + dt / 2.4);
        const t = b.t, dab = k => Math.max(0, Math.sin(clamp01((t - k) / .14) * Math.PI)) * .05;
        const across = smooth(clamp01((t - .3) / .35));
        path.lerpVectors(b.from, b.to, across).add(lift).addScaledVector(lift, Math.sin(across * Math.PI) * 1.2);
        path.y -= dab(.16) + dab(.68);
        const arrive = smooth(clamp01(t / .12)), leave = smooth(clamp01((1 - t) / .1));
        brush.visible = true; brush.position.copy(path).add(new THREE.Vector3(0, (1 - arrive * leave) * .4, 0)); brush.scale.setScalar(Math.max(.001, arrive * leave));
        if (t > .2 && t < .9 && Math.random() < .5) {
          const k = pollenLife.findIndex(l => l <= 0);
          if (k >= 0) { pollenLife[k] = 1; pollenAt.set([brush.position.x + (Math.random() - .5) * .02, brush.position.y - .02, brush.position.z + (Math.random() - .5) * .02], k * 3); }
        }
        if (t >= 1) { view.brush = null; brush.visible = false; view.wither = .001; }
      }
      for (let k = 0; k < POLLEN; k++) if (pollenLife[k] > 0) { pollenLife[k] -= dt * 1.2; pollenAt[k * 3 + 1] -= dt * .06; if (pollenLife[k] <= 0) pollenAt[k * 3 + 1] = -10; }
      pollen.geometry.attributes.position.needsUpdate = true;
      // The old plants wither away; then the new are sown, coming up one after another.
      if (view.wither > 0) {
        view.wither = Math.min(1, view.wither + dt / .6);
        if (view.wither >= 1 && view.next) {
          view.plants = view.next; view.next = null; view.wither = 0;
          view.grown = view.plants.map((_, i) => -i * .06); view.pods.fill(0);
        }
      }
      for (let i = 0; i < POTS; i++) {
        if (view.grown[i] < 1) view.grown[i] = Math.min(1, view.grown[i] + dt * .5);
        else if (view.plants[i] && view.pods[i] < 1) view.pods[i] = Math.min(1, view.pods[i] + dt * .6);
      }
      placePlants();
    },
    getState: () => ({stage: state.stage, batch: {...state.batch}, tally: {...state.tally}, batches: state.batches,
      ratio: state.tally.short ? state.tally.tall / state.tally.short : null,
      // What stands on the bench: plants shown, how many fully grown, and whether the brush is at work.
      bench: {plants: view.plants.filter(Boolean).length, grown: view.grown.filter((g, i) => view.plants[i] && g >= 1).length, brushing: !!view.brush}}),
    targets: () => ({mendel: bench.localToWorld(new THREE.Vector3(0, BENCH.y + .3, 0)).toArray()}),
    open, cross, plantMany, reset
  };
}
