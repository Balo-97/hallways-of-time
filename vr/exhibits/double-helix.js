/**
 * The double helix: pair the bases, then watch the molecule copy itself.
 *
 * DNA is two strands wound round each other, held together by pairs of bases
 * across the middle: A always with T, G always with C. So each strand carries
 * the pattern of the other, and that, as Watson and Crick saw in 1953, is how
 * the molecule can be copied.
 *
 * A model some 500 million times life size turns slowly on a marble plinth,
 * loose pieces drifting round it. Its backbones wind smoothly; its bases are
 * flat slabs, the double-ringed A and G longer than the single-ringed T and C,
 * so every rung joins a long one to a short one and the ladder keeps its
 * width; between partners glow their hydrogen bonds, two for A and T, three
 * for G and C. One strand is given; the visitor chooses the partner for each of
 * its twelve bases, from the bottom up: the right one flies in and lands with a
 * flash, a wrong one bounces off. Then the strands unzip, and each gathers new
 * partners from round about, until there are two molecules where there was
 * one, alike in every rung.
 */
const PAIR = {A: 'T', T: 'A', G: 'C', C: 'G'};
const NAME = {A: 'Adenine', T: 'Thymine', G: 'Guanine', C: 'Cytosine'};
const BONDS = {A: 'two', T: 'two', G: 'three', C: 'three'};
const COLOR = {A: '#d9534f', T: '#e9bb3c', G: '#4f8fd9', C: '#5fbf6a'};
const PURINE = {A: true, G: true};
// The given strand begins ATG, the letters that start almost every gene.
const STRAND = 'ATGGCATTCCGA';
const N = STRAND.length;
const RISE = .165, RADIUS = .42, TURN = Math.PI * 2 / 10.5;   // ten and a half pairs to a turn, as in life
const GROOVE = .8 * Math.PI;                                   // the strands are not opposite: hence the major and minor grooves
const APART = .8;                                              // how far the two copies end up from the middle
const SUB = 4;                                                 // pieces of backbone between one rung and the next
// Strands: the given one, its partner, and the two new strands the copy builds,
// paler, so each copy is seen to keep one old strand and gain one new one.
const STRAND_COLORS = ['#c9a664', '#c3c8cf', '#eef1f4', '#f0e2b4'];
const LOOSE = 8;                                              // loose pieces drifting round the model

export function createDoubleHelix(kit, {angle}) {
  const {THREE, M, box, board, wrapped} = kit;
  const id = 'dna';
  const state = {paired: 0, popped: new Array(N).fill(-1), mode: 'build', copy: -1, spin: 0, feedback: null, clock: 0, reject: null};

  // ── The plinth ───────────────────────────────────────────────────────
  const wall = kit.onWall(angle, kit.STAGE);
  const plinth = new THREE.Group(); wall.add(plinth);
  const turned = (profile, material, segments = 48) => { const m = new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material); plinth.add(m); return m; };
  turned([[0, 0], [.86, 0], [.86, .06], [.8, .09], [.78, .12], [0, .12]], M.slate);
  turned([[0, .12], [.76, .12], [.74, .16], [.72, .2], [.72, .44], [.75, .47], [.78, .5], [0, .5]], M.ivory);
  for (const y of [.18, .46]) { const band = new THREE.Mesh(new THREE.TorusGeometry(.735, .014, 6, 64), M.gold); band.rotation.x = Math.PI / 2; band.position.y = y; plinth.add(band); }
  {
    // A band of lettering round the drum.
    const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const ctx = c.getContext('2d');
    ctx.fillStyle = '#23303b'; ctx.fillRect(0, 0, 2048, 96);
    ctx.fillStyle = '#e1c393'; ctx.font = '600 44px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.letterSpacing = '10px';
    for (let i = 0; i < 4; i++) ctx.fillText(i % 2 ? 'G WITH C' : 'A WITH T', (i + .5) * 512, 50);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(.723, .723, .2, 64, 1, true), new THREE.MeshStandardMaterial({map: kit.texture(c), roughness: .5}));
    band.position.y = .32; plinth.add(band);
  }
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.77, .022, 6, 64), M.gold); lip.rotation.x = Math.PI / 2; lip.position.y = .5; plinth.add(lip);

  // ── The model ────────────────────────────────────────────────────────
  const helix = new THREE.Group(); helix.position.y = .62; plinth.add(helix);
  const glossy = new THREE.MeshStandardMaterial({color: '#ffffff', metalness: .4, roughness: .3});
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(.034, 14, 10), glossy, 4 * N);
  const backbone = new THREE.InstancedMesh(new THREE.CylinderGeometry(.017, .017, 1, 10), glossy, 4 * (N - 1) * SUB);
  const bases = new THREE.InstancedMesh(new THREE.BoxGeometry(1, .02, .065), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .35, metalness: .05}), 4 * N);
  const bonds = new THREE.InstancedMesh(new THREE.SphereGeometry(.009, 8, 6), new THREE.MeshBasicMaterial({color: '#fff6dc'}), 3 * 3 * N);
  for (const mesh of [beads, backbone, bases, bonds]) { mesh.frustumCulled = false; helix.add(mesh); }
  kit.moving(helix);
  const tint = new THREE.Color(), white = new THREE.Color('#ffffff');
  for (let s = 0; s < 4; s++) {
    for (let k = 0; k < N; k++) beads.setColorAt(s * N + k, tint.set(STRAND_COLORS[s]));
    for (let k = 0; k < (N - 1) * SUB; k++) backbone.setColorAt(s * (N - 1) * SUB + k, tint.set(STRAND_COLORS[s]));
  }
  const baseOf = (s, k) => s === 0 || s === 3 ? STRAND[k] : PAIR[STRAND[k]];
  const o = new THREE.Object3D(), up = new THREE.Vector3(0, 1, 0), a = new THREE.Vector3(), b = new THREE.Vector3(), m = new THREE.Vector3(), d = new THREE.Vector3();
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  /** A strand's backbone point at height u (in rungs, fractions between): its axis, its angle round it. */
  const point = (out, axis, theta, u) => out.set(axis + Math.cos(theta) * RADIUS, .12 + u * RISE, Math.sin(theta) * RADIUS);
  const ease = t => t < .5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2, clamp01 = t => Math.max(0, Math.min(1, t));
  /** How far each rung of a strand is in place, 0 to 1, overshooting a little as it lands. */
  const pop = t => t <= 0 ? 0 : t >= 1 ? 1 : 1 + 2.2 * (t - 1) ** 3 + 1.2 * (t - 1) ** 2;
  /** Where rung k's half-rung of a strand meets its partner's: a long base reaches further than a short one. */
  const reach = base => PURINE[base] ? .56 : .44;
  // Where each strand's beads stand this frame, with the drift of pieces still on their way in.
  const anchors = Array.from({length: 4}, () => Array.from({length: N}, () => ({at: new THREE.Vector3(), drift: new THREE.Vector3(), g: 0})));
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
        const theta = k * TURN + state.spin, g = s.grown(k), index = si * N + k, anchor = anchors[si][k];
        anchor.g = g;
        // New pieces, and the partner strand's as it is paired, drift in from outside as they arrive.
        const out = si >= 1 ? 1 - Math.min(1, g) : 0;
        anchor.drift.set(si === 1 ? out * .9 : Math.sign(s.axis || 1) * out * .9, out * .25, 0);
        point(anchor.at, s.axis, theta + s.turn, k).add(anchor.drift);
        if (g <= 0) { beads.setMatrixAt(index, hidden); bases.setMatrixAt(index, hidden); continue; }
        o.position.copy(anchor.at); o.quaternion.identity(); o.scale.setScalar(Math.min(g, 1.2)); o.updateMatrix(); beads.setMatrixAt(index, o.matrix);
        // The base: a slab from the backbone toward the partner's, as long as its kind reaches.
        point(b, s.axis, theta + s.partner, k).add(anchor.drift);
        d.subVectors(b, anchor.at); const full = d.length(), length = full * reach(baseOf(si, k)) * Math.min(g, 1.05);
        d.normalize();
        o.position.copy(anchor.at).addScaledVector(d, length / 2); o.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d); o.scale.set(Math.max(length, .001), 1, 1); o.updateMatrix();
        bases.setMatrixAt(index, o.matrix);
        // A base just paired flashes as it lands.
        const fresh = si === 1 && state.popped[k] >= 0 ? Math.max(0, 1 - state.popped[k] / .7) : 0;
        bases.setColorAt(index, tint.set(COLOR[baseOf(si, k)]).lerp(white, fresh * .7));
      }
      // The backbone, curving with the helix from rung to rung.
      for (let k = 0; k < N - 1; k++) for (let p = 0; p < SUB; p++) {
        const index = (si * (N - 1) + k) * SUB + p, g = Math.min(anchors[si][k].g, anchors[si][k + 1].g);
        if (g <= 0) { backbone.setMatrixAt(index, hidden); continue; }
        const u0 = p / SUB, u1 = (p + 1) / SUB, theta = k * TURN + state.spin + s.turn;
        point(a, s.axis, theta + u0 * TURN, k + u0).addScaledVector(anchors[si][k].drift, 1 - u0).addScaledVector(anchors[si][k + 1].drift, u0);
        point(b, s.axis, theta + u1 * TURN, k + u1).addScaledVector(anchors[si][k].drift, 1 - u1).addScaledVector(anchors[si][k + 1].drift, u1);
        m.subVectors(b, a);
        o.position.copy(a).addScaledVector(m, .5); o.quaternion.setFromUnitVectors(up, m.clone().normalize()); o.scale.set(Math.min(g, 1), m.length() * 1.08, Math.min(g, 1)); o.updateMatrix();
        backbone.setMatrixAt(index, o.matrix);
      }
    });
    // The hydrogen bonds, glowing where two partners meet: across the first molecule until it unzips, then across each copy.
    let n = 0;
    const pairs = sep < .04 ? [[0, 1]] : [[0, 2], [1, 3]];
    for (const [p, q] of pairs) for (let k = 0; k < N; k++) {
      const g = Math.min(anchors[p][k].g, anchors[q][k].g);
      if (g < .95) continue;
      const count = BONDS[baseOf(p, k)] === 'three' ? 3 : 2;
      d.subVectors(anchors[q][k].at, anchors[p][k].at);
      const junction = a.copy(anchors[p][k].at).addScaledVector(d, reach(baseOf(p, k))), across = m.set(-d.z, 0, d.x).normalize();
      for (let h = 0; h < count; h++) {
        o.position.copy(junction).addScaledVector(across, (h - (count - 1) / 2) * .02).y += .016;
        o.quaternion.identity(); o.scale.setScalar(.8 + .25 * Math.sin(state.clock * 4 + k + h)); o.updateMatrix(); bonds.setMatrixAt(n++, o.matrix);
      }
    }
    bonds.count = n;
    for (const mesh of [beads, backbone, bases, bonds]) mesh.instanceMatrix.needsUpdate = true;
    bases.instanceColor.needsUpdate = true;
  }
  // A wrong base, flying in toward the rung being paired and bouncing off it.
  const reject = new THREE.Mesh(new THREE.BoxGeometry(.3, .02, .065), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .35})); reject.visible = false; helix.add(reject);
  // Loose pieces drifting round the model: the stock the copy draws on.
  const loose = new THREE.InstancedMesh(new THREE.BoxGeometry(.15, .016, .045), new THREE.MeshStandardMaterial({color: '#ffffff', roughness: .4}), LOOSE);
  const looseBeads = new THREE.InstancedMesh(new THREE.SphereGeometry(.022, 10, 8), glossy, LOOSE);
  const drift = Array.from({length: LOOSE}, (_, i) => ({r: .78 + (i % 3) * .1, y: .25 + (i * .41) % 1.6, phase: i * 2.1, speed: .12 + (i % 4) * .03, base: 'ATGC'[i % 4]}));
  drift.forEach((p, i) => { loose.setColorAt(i, tint.set(COLOR[p.base])); looseBeads.setColorAt(i, tint.set(STRAND_COLORS[2])); });
  for (const mesh of [loose, looseBeads]) { mesh.frustumCulled = false; plinth.add(mesh); }
  kit.moving(loose, looseBeads);
  function placeLoose() {
    drift.forEach((p, i) => {
      const t = state.clock * p.speed + p.phase, y = .62 + p.y + Math.sin(t * 2.3) * .08;
      o.position.set(Math.cos(t) * p.r, y, Math.sin(t) * p.r); o.quaternion.setFromEuler(new THREE.Euler(Math.sin(t * 1.7) * .4, -t + Math.PI / 2, Math.cos(t * 1.3) * .3)); o.scale.setScalar(1); o.updateMatrix();
      loose.setMatrixAt(i, o.matrix);
      o.translateX(-.075); o.quaternion.identity(); o.updateMatrix(); looseBeads.setMatrixAt(i, o.matrix);
    });
    loose.instanceMatrix.needsUpdate = true; looseBeads.instanceMatrix.needsUpdate = true;
  }
  placeAll(); placeLoose();
  // Pressing the model, or near it, opens its panel.
  const proxy = new THREE.Mesh(new THREE.CylinderGeometry(.6, .6, 2.3, 16), new THREE.MeshBasicMaterial({visible: false}));
  proxy.position.y = 1.25; plinth.add(proxy);
  kit.press(proxy, () => open(), 'The double helix');
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
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
      state.reject = {t: 0, k: state.paired, base};
      reject.material.color.set(COLOR[base]);
    }
    kit.redraw();
  }
  function copy() {
    if (state.paired < N) { state.feedback = {ok: false, text: `Pair all ${N} first: the copy needs a finished molecule to start from.`}; kit.redraw(); return; }
    state.mode = 'copy'; state.copy = 0; kit.redraw();
  }
  function reset() {
    state.paired = 0; state.popped.fill(-1); state.mode = 'build'; state.copy = -1; state.feedback = null; state.reject = null; reject.visible = false;
    kit.redraw();
  }
  const toward = new THREE.Vector3(), from = new THREE.Vector3();

  return {
    id,
    update(dt) {
      state.clock += dt;
      // It turns slowly, a turn every half minute; the rungs land, and the copy runs.
      state.spin = (state.spin + dt * Math.PI * 2 / 30) % (Math.PI * 2);
      for (let k = 0; k < N; k++) if (state.popped[k] >= 0 && state.popped[k] < 1) state.popped[k] += dt;
      if (state.copy >= 0 && state.copy < 6) state.copy += dt;
      placeAll(); placeLoose();
      // The wrong base: in toward the gap, a jolt as it fails to fit, and away, fading.
      if (state.reject) {
        const r = state.reject; r.t = Math.min(1, r.t + dt / 1.1);
        const theta = r.k * TURN + state.spin;
        point(toward, 0, theta + GROOVE, r.k); point(from, 0, theta + GROOVE, r.k).add(new THREE.Vector3(1.1, .3, 0));
        const inward = r.t < .45 ? ease(r.t / .45) * .82 : .82 - ease((r.t - .45) / .55) * .82 + Math.sin(Math.min(1, (r.t - .45) / .12) * Math.PI) * .04;
        reject.position.lerpVectors(from, toward, inward);
        d.subVectors(point(m, 0, theta, r.k), toward).normalize();
        reject.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d);
        reject.rotation.z += r.t > .45 ? (r.t - .45) * 2.5 : 0;
        reject.scale.setScalar(Math.max(.001, r.t < .8 ? 1 : 1 - (r.t - .8) / .2));
        reject.visible = true;
        if (r.t >= 1) { state.reject = null; reject.visible = false; }
      }
    },
    /** On a screen, A, T, G and C typed while its panel is open pick the partner. */
    key(key) {
      if (kit.showing() !== id || state.mode !== 'build') return false;
      const base = key.toUpperCase();
      if (!PAIR[base]) return false;
      pick(base); return true;
    },
    getState: () => ({mode: state.mode, paired: state.paired, of: N, strand: STRAND, copied: state.copy >= 5.2, feedback: state.feedback?.ok ?? null,
      bonds: bonds.count, rejecting: !!state.reject}),
    targets: () => ({helix: plinth.localToWorld(new THREE.Vector3(0, 1.3, 0)).toArray()}),
    open, pick, copy, reset
  };
}
