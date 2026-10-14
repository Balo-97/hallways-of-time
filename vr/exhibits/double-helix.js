/**
 * The double helix: pair the bases, then watch the molecule copy itself.
 *
 * DNA is two strands wound round each other, held together by pairs of bases
 * across the middle: A always with T, G always with C. So each strand carries
 * the pattern of the other, and that, as Watson and Crick saw in 1953, is how
 * the molecule can be copied.
 *
 * A model some 500 million times life size turns slowly on a plinth. One
 * strand is given; the visitor chooses the partner for each of its twelve
 * bases, from the bottom up, and each rung fills in as it is paired. Then the
 * two strands unzip, and each one gathers new partners from round about,
 * until there are two molecules where there was one, alike in every rung.
 */
const PAIR = {A: 'T', T: 'A', G: 'C', C: 'G'};
const NAME = {A: 'Adenine', T: 'Thymine', G: 'Guanine', C: 'Cytosine'};
const BONDS = {A: 'two', T: 'two', G: 'three', C: 'three'};
const COLOR = {A: '#d9534f', T: '#e9bb3c', G: '#4f8fd9', C: '#5fbf6a'};
// The given strand begins ATG, the letters that start almost every gene.
const STRAND = 'ATGGCATTCCGA';
const N = STRAND.length;
const RISE = .165, RADIUS = .42, TURN = Math.PI * 2 / 10.5;   // ten and a half pairs to a turn, as in life
const GROOVE = .8 * Math.PI;                                   // the strands are not opposite: hence the major and minor grooves
const APART = .8;                                              // how far the two copies end up from the middle
// Strands: the given one, its partner, and the two new strands the copy builds,
// paler, so each copy is seen to keep one old strand and gain one new one.
const STRAND_COLORS = ['#c9a664', '#c3c8cf', '#eef1f4', '#f0e2b4'];

export function createDoubleHelix(kit, {angle}) {
  const {THREE, M, box, board, wrapped} = kit;
  const id = 'dna';
  const state = {paired: 0, popped: new Array(N).fill(-1), mode: 'build', copy: -1, spin: 0, feedback: null};

  // ── The plinth and the model ─────────────────────────────────────────
  const wall = kit.onWall(angle, 4.6);
  const plinth = new THREE.Group(); wall.add(plinth);
  box(plinth, [1.1, .08, 1.1], [0, .04, 0], M.slate);
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(.72, .78, .42, 48), M.ivory); drum.position.y = .29; plinth.add(drum);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.73, .025, 6, 48), M.gold); lip.rotation.x = Math.PI / 2; lip.position.y = .5; plinth.add(lip);
  const helix = new THREE.Group(); helix.position.y = .62; plinth.add(helix);
  const material = new THREE.MeshStandardMaterial({color: '#ffffff', metalness: .45, roughness: .35});
  const spheres = new THREE.InstancedMesh(new THREE.SphereGeometry(.045, 14, 10), material, 4 * N);
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(.013, .013, 1, 8), material, 4 * (N - 1));
  const halves = new THREE.InstancedMesh(new THREE.CylinderGeometry(.03, .03, 1, 10), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .45}), 4 * N);
  for (const mesh of [spheres, rods, halves]) { mesh.frustumCulled = false; helix.add(mesh); }
  kit.moving(helix);
  const tint = new THREE.Color();
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < N; k++) {
      spheres.setColorAt(s * N + k, tint.set(STRAND_COLORS[s]));
      const base = s === 0 || s === 3 ? STRAND[k] : PAIR[STRAND[k]];
      halves.setColorAt(s * N + k, tint.set(COLOR[base]));
    }
    for (let k = 0; k < N - 1; k++) rods.setColorAt(s * (N - 1) + k, tint.set(STRAND_COLORS[s]));
  }
  const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), m = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /** A strand's backbone point at rung k: its axis, its angle round it, its height. */
  const point = (out, axis, theta, k) => out.set(axis + Math.cos(theta) * RADIUS, .12 + k * RISE, Math.sin(theta) * RADIUS);
  const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, clamp01 = t => Math.max(0, Math.min(1, t));
  /** How far each rung of a strand is in place, 0 to 1, overshooting a little as it lands. */
  const pop = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  function placeAll() {
    const c = state.copy < 0 ? 0 : state.copy;
    const sep = ease(clamp01(c / 1.6));
    // The four strands: axis, angle offset, and how far each rung is in place.
    const strands = [
      {axis: -sep * APART, turn: 0, partner: GROOVE, grown: () => 1},
      {axis: sep * APART, turn: GROOVE, partner: 0, grown: k => state.popped[k] < 0 ? 0 : pop(state.popped[k] / .45)},
      {axis: -sep * APART, turn: GROOVE, partner: 0, grown: k => state.copy < 0 ? 0 : pop(clamp01((c - 1.5 - k * .2) / .55))},
      {axis: sep * APART, turn: 0, partner: GROOVE, grown: k => state.copy < 0 ? 0 : pop(clamp01((c - 1.5 - k * .2) / .55))}
    ];
    strands.forEach((s, si) => {
      for (let k = 0; k < N; k++) {
        const theta = k * TURN + state.spin, g = s.grown(k), index = si * N + k;
        if (g <= 0) { spheres.setMatrixAt(index, hidden); halves.setMatrixAt(index, hidden); continue; }
        point(a, s.axis, theta + s.turn, k);
        // The half-rung reaches to the middle of the chord between this strand and its partner's place.
        point(b, s.axis, theta + s.partner, k); m.addVectors(a, b).multiplyScalar(.5);
        // New pieces drift in from outside as they arrive, bead and half-rung together.
        if (si >= 2) { const out = 1 - g, dx = Math.sign(s.axis || 1) * out * .9, dy = out * .25; a.x += dx; a.y += dy; m.x += dx; m.y += dy; }
        o.position.copy(a); o.quaternion.identity(); o.scale.setScalar(Math.min(g, 1.2)); o.updateMatrix(); spheres.setMatrixAt(index, o.matrix);
        b.subVectors(m, a);
        const length = b.length() * Math.min(g, 1.1);
        o.position.copy(a).addScaledVector(b.normalize(), length / 2); o.quaternion.setFromUnitVectors(up, b); o.scale.set(1, Math.max(length, .001), 1); o.updateMatrix();
        halves.setMatrixAt(index, o.matrix);
      }
      for (let k = 0; k < N - 1; k++) {
        const index = si * (N - 1) + k, g = Math.min(s.grown(k), s.grown(k + 1));
        if (g <= 0) { rods.setMatrixAt(index, hidden); continue; }
        spheres.getMatrixAt(si * N + k, o.matrix); a.setFromMatrixPosition(o.matrix);
        spheres.getMatrixAt(si * N + k + 1, o.matrix); b.setFromMatrixPosition(o.matrix);
        m.subVectors(b, a);
        o.position.copy(a).addScaledVector(m, .5); o.quaternion.setFromUnitVectors(up, m.clone().normalize()); o.scale.set(Math.min(g, 1), m.length(), Math.min(g, 1)); o.updateMatrix();
        rods.setMatrixAt(index, o.matrix);
      }
    });
    for (const mesh of [spheres, rods, halves]) mesh.instanceMatrix.needsUpdate = true;
  }
  placeAll();
  // Pressing the model, or near it, opens its panel.
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 2.3, 16), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.25; plinth.add(proxy);
  kit.press(proxy, () => open(), 'The double helix');
  const centre = kit.inRoom(wall, 0, 0); kit.medallion(centre.x, centre.z);
  {
    const p = kit.inRoom(wall, 1.8, 1.7);
    kit.plaque(p.x, p.z, 0, 0, [
      ['THE DOUBLE HELIX', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Cambridge and London, 1953', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Two strands, wound round each other and held', .22, .033],
      ['by pairs of bases: A with T, G with C. Press', .27, .033],
      ['here to pair them, then watch it copy itself.', .32, .033],
      ['Some 500 million times life size: real DNA', .41, .026, '#a99a7c', 'italic #px Georgia, serif'],
      ['is two millionths of a millimetre across.', .45, .026, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Double helix plaque');
  }

  // ── The panel ────────────────────────────────────────────────────────
  const BUTTONS = ['A', 'T', 'G', 'C'].map((base, i) => ({base, x: 640 + (i % 2) * 254, y: 232 + Math.floor(i / 2) * 134, w: 240, h: 120}));
  function paintLadder(ctx) {
    for (let k = 0; k < N; k++) {
      const y = 744 - k * 44, given = STRAND[k], done = k < state.paired, current = k === state.paired && state.mode === 'build';
      ctx.fillStyle = COLOR[given]; ctx.fillRect(90, y - 30, 46, 36);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 24px Georgia'; ctx.textAlign = 'center'; ctx.fillText(given, 113, y - 4);
      ctx.strokeStyle = done ? '#c9a664' : '#4b5640'; ctx.lineWidth = done ? 4 : 2; ctx.setLineDash(done ? [] : [6, 6]);
      ctx.beginPath(); ctx.moveTo(140, y - 12); ctx.lineTo(320, y - 12); ctx.stroke(); ctx.setLineDash([]);
      if (done) {
        ctx.fillStyle = COLOR[PAIR[given]]; ctx.fillRect(324, y - 30, 46, 36);
        ctx.fillStyle = '#ffffff'; ctx.fillText(PAIR[given], 347, y - 4);
      } else {
        ctx.strokeStyle = current ? '#f4dca2' : '#4b5640'; ctx.lineWidth = current ? 3 : 1.5; ctx.strokeRect(324, y - 30, 46, 36);
        if (current) { ctx.fillStyle = '#f4dca2'; ctx.fillText('?', 347, y - 4); }
      }
      ctx.textAlign = 'left';
    }
    ctx.fillStyle = '#9d9786'; ctx.font = '18px Arial';
    ctx.fillText('GIVEN', 86, 774); ctx.fillText('PARTNER', 316, 774);
  }
  function paintPanel() {
    const building = state.mode === 'build';
    const {canvas, ctx} = board('THE DOUBLE HELIX · CAMBRIDGE AND LONDON, 1953', building ? 'Pair the bases' : 'How DNA copies itself');
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, building ? 'A always pairs with T, and G with C. The gold strand is given: choose the partner for each of its bases, from the bottom up.'
      : 'Unzipped, each strand is a template. Every base can take only its partner, so each strand rebuilds the other from the loose pieces round about.', 1080)
      .slice(0, 2).forEach((line, i) => ctx.fillText(line, 60, 172 + i * 31));
    paintLadder(ctx);
    if (building) {
      for (const {base, x, y, w, h} of BUTTONS) {
        ctx.fillStyle = COLOR[base]; ctx.fillRect(x, y, w, h);
        ctx.fillStyle = '#ffffff'; ctx.font = 'bold 58px Georgia'; ctx.textAlign = 'center'; ctx.fillText(base, x + w / 2, y + 66);
        ctx.font = '20px Arial'; ctx.fillText(NAME[base].toUpperCase(), x + w / 2, y + 100); ctx.textAlign = 'left';
      }
      ctx.fillStyle = '#d9bc7d'; ctx.font = '20px Arial'; ctx.fillText(`${state.paired} OF ${N} PAIRED`, 640, 540);
      if (state.feedback) {
        ctx.fillStyle = state.feedback.ok ? '#cfe3b0' : '#e8c56e'; ctx.font = '25px Georgia';
        wrapped(ctx, state.feedback.text, 500).slice(0, 4).forEach((line, i) => ctx.fillText(line, 640, 580 + i * 33));
      }
    } else {
      ctx.fillStyle = '#f1e5d0'; ctx.font = '25px Georgia';
      wrapped(ctx, 'One molecule becomes two, alike in every rung, each keeping one old strand and gaining one new one (the pale strands): the way every cell copies its DNA before it divides. Watson and Crick saw it at once, and said so in one quiet sentence at the end of their paper.', 500)
        .slice(0, 7).forEach((line, i) => ctx.fillText(line, 640, 250 + i * 33));
    }
    ctx.fillStyle = '#c8bfa7'; ctx.font = '21px Georgia';
    wrapped(ctx, 'The shape was read from X-ray photographs. Photograph 51, taken by Raymond Gosling in Rosalind Franklin’s laboratory, showed the cross of a helix; James Watson and Francis Crick published the structure in 1953.', 500)
      .slice(0, 5).forEach((line, i) => ctx.fillText(line, 640, 790 + i * 28));
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read the double helix in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  kit.panel(id, {
    paint: paintPanel,
    zones: () => [...(state.mode === 'build' ? BUTTONS.map(({base, x, y, w, h}) => ({x, y, w, h, label: base, fn: () => pick(base)})) : []),
      {x: 640, y: 945, w: 520, h: 40, label: 'The double helix’s story', fn: () => kit.story(id)}],
    actions: () => state.mode === 'build'
      ? [['START AGAIN', reset], ['COPY IT', copy, state.paired === N ? '#6a5a2c' : '#3a3f36'], ['CLOSE', kit.close]]
      : [['PAIR AGAIN', reset], ['CLOSE', kit.close]]
  });

  // ── What the visitor does ────────────────────────────────────────────
  function open() { kit.open(id); }
  function pick(base) {
    if (state.mode !== 'build' || state.paired >= N) return;
    const given = STRAND[state.paired], right = PAIR[given];
    if (base === right) {
      state.popped[state.paired] = 0; state.paired++;
      state.feedback = {ok: true, text: state.paired === N
        ? 'All twelve paired. Each rung joins a large base to a small one, so the ladder is the same width all the way up. Now press COPY IT.'
        : `${given} and ${right}: held together by ${BONDS[given]} hydrogen bonds.`};
    } else {
      state.feedback = {ok: false, text: `Not ${base}: ${given} pairs only with ${right}. Only that pair fits the gap and lines up its hydrogen bonds.`};
    }
    kit.redraw();
  }
  function copy() {
    if (state.paired < N) { state.feedback = {ok: false, text: `Pair all ${N} first: the copy needs a finished molecule to start from.`}; kit.redraw(); return; }
    state.mode = 'copy'; state.copy = 0; kit.redraw();
  }
  function reset() {
    state.paired = 0; state.popped.fill(-1); state.mode = 'build'; state.copy = -1; state.feedback = null;
    kit.redraw();
  }

  return {
    id,
    update(dt) {
      // It turns slowly, a turn every half minute; the rungs land, and the copy runs.
      state.spin = (state.spin + dt * Math.PI * 2 / 30) % (Math.PI * 2);
      for (let k = 0; k < N; k++) if (state.popped[k] >= 0 && state.popped[k] < 1) state.popped[k] += dt;
      if (state.copy >= 0 && state.copy < 6) state.copy += dt;
      placeAll();
    },
    /** On a screen, A, T, G and C typed while its panel is open pick the partner. */
    key(key) {
      if (kit.showing() !== id || state.mode !== 'build') return false;
      const base = key.toUpperCase();
      if (!PAIR[base]) return false;
      pick(base); return true;
    },
    getState: () => ({mode: state.mode, paired: state.paired, of: N, strand: STRAND, copied: state.copy >= 5.2, feedback: state.feedback?.ok ?? null}),
    targets: () => ({helix: plinth.localToWorld(new THREE.Vector3(0, 1.3, 0)).toArray()}),
    open, pick, copy, reset
  };
}
