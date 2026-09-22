/**
 * Sculpture and statuary for the three halls.
 *
 * Every piece is original and built from primitives in code: nothing here is
 * a scan or a reproduction of an existing work. Each hall receives the same
 * three kinds, themed to what that hall holds —
 *
 *   hanging   suspended from the vault on the centre line, between chandeliers
 *   pedestal  small works on marble pedestals along the side aisles, some where benches once stood
 *   statue    monumental works on tall plinths in the window bays
 *
 * Quest budget: every piece that never moves is merged into one mesh per
 * material per hall, and every plaque in a hall shares one canvas, so a hall's
 * statues and pedestals cost a few draw calls rather than hundreds. Only the
 * hanging works that turn or drift keep meshes of their own.
 */
import {TEXTURE_SCALE} from './detail.js';

export function createSculptureGallery(THREE, {materials, hallStep = 88}) {
  const group = new THREE.Group();
  group.name = 'Sculpture and statuary';
  const obstacles = [], pieces = [], motions = [];
  // Each hall's works are shown from 60 m before it to 60 m after it. Down the
  // long axis every hall's pieces would otherwise be drawn at once, and at that
  // range they sit inside the fog, so they arrive without a visible pop.
  const halls = [0, 1, 2].map(wing => {
    const hall = new THREE.Group();
    hall.name = ['Cosmos', 'Living Earth', 'Humanity'][wing] + ' sculpture';
    group.add(hall);
    return hall;
  });
  const HALL_FRONT = [Infinity, -76, -164], HALL_BACK = [-76, -164, -200], REACH = 60;
  let meshCount = 0, triangleCount = 0, motionTime = 0;

  const UP = new THREE.Vector3(0, 1, 0);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const bay = (wing, index) => -7 - wing * hallStep - index * 12;
  // The barrel vault is x = 9 cos a, y = 7 + 5.7 sin a; cables stop just below it.
  const vaultAt = x => 7 + 5.7 * Math.sqrt(Math.max(0, 1 - (x / 9) ** 2)) - .06;
  const random = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  // `rotation` may be 0 for none; `scale` may be one number for all three axes.
  const matrix = (position = [0, 0, 0], rotation = 0, scale = 1) => new THREE.Matrix4().compose(
    V(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...(rotation || [0, 0, 0]))),
    typeof scale === 'number' ? V(scale, scale, scale) : V(...scale));

  // ── Materials ───────────────────────────────────────────────────────────
  const {ivory: marble, gold, darkGold, shades} = materials;
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .5, ...extra});
  const M = {
    bronze: std('#8b5b34', {metalness: .72, roughness: .36}),
    verdigris: std('#5e8475', {metalness: .42, roughness: .52}),
    glow: std('#f4cf78', {metalness: .25, roughness: .3, emissive: '#ffb845', emissiveIntensity: .85}),
    flame: new THREE.MeshBasicMaterial({color: '#ffb54f'}),
    obsidian: std('#101116', {metalness: .55, roughness: .16}),
    bone: std('#eee4cb', {roughness: .64}),
    enamel: std('#e4d3ab', {roughness: .46}),
    fossil: std('#8a8171', {roughness: .86}),
    fossilDark: std('#4d463d', {roughness: .7}),
    shell: std('#7a6d5e', {roughness: .9, side: THREE.DoubleSide}),
    amethyst: std('#9467cf', {metalness: .08, roughness: .14, emissive: '#3c2163', emissiveIntensity: .4, flatShading: true}),
    flint: std('#6d5f51', {metalness: .04, roughness: .42, flatShading: true}),
    terracotta: std('#b8673c', {roughness: .72}),
    glaze: std('#1c1511', {roughness: .5}),
    wood: std('#8a5f3a', {roughness: .72}),
    cloth: std('#ebe0c7', {roughness: .92, side: THREE.DoubleSide}),
    jelly: std('#a4e6df', {roughness: .18, transparent: true, opacity: .46, emissive: '#3aa99f',
      emissiveIntensity: .3, side: THREE.DoubleSide, depthWrite: false}),
    beads: std('#ffffff', {metalness: .25, roughness: .34, emissive: '#1d1b16'}),
    starlight: new THREE.MeshBasicMaterial({color: '#ffffff'}),
    beam: new THREE.MeshBasicMaterial({color: '#bfe0ff', transparent: true, opacity: .2, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide}),
    blueStar: std('#d7e6ff', {roughness: .3, emissive: '#89b4ff', emissiveIntensity: .9}),
    saturn: std('#d4b37f', {roughness: .66, side: THREE.DoubleSide}),
    manta: std('#34404b', {roughness: .55}),
    membrane: std('#a8765c', {roughness: .82, side: THREE.DoubleSide}),
    flyer: std('#ffffff', {roughness: .62, side: THREE.DoubleSide}),
    lapis: std('#2f4f8f', {roughness: .55}),
    silver: std('#d3d7da', {metalness: .5, roughness: .32}),
    kapton: std('#e6c384', {metalness: .38, roughness: .34, side: THREE.DoubleSide}),
    bronzeDouble: std('#b98150', {metalness: .42, roughness: .38, side: THREE.DoubleSide}),
    wing: std('#e9d7a1', {metalness: .3, roughness: .24, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false}),
    coral: std('#df8a6c', {roughness: .78}),
    sarsen: std('#9d9686', {roughness: .95, flatShading: true}),
    // The voyaging canoe: dark lacquered hulls with a red strake, ochre sails,
    // pale sennit lashings and a thatched deck house.
    hull: std('#2b1f19', {roughness: .42, metalness: .06}),
    strake: std('#8a3324', {roughness: .5}),
    sail: std('#c4683c', {roughness: .9, side: THREE.DoubleSide, emissive: '#3a1a0c', emissiveIntensity: .35}),
    sennit: std('#dac9a2', {roughness: .95}),
    thatch: std('#b3955e', {roughness: .96, flatShading: true}),
    // The flyer: muslin stretched on spruce, lit from within a little so its
    // undersides read as cloth rather than grey from the floor below.
    muslin: std('#f3ead5', {roughness: .86, side: THREE.DoubleSide, emissive: '#5a5040', emissiveIntensity: .32}),
    spruce: std('#c8a372', {roughness: .68}),
    propeller: std('#9c6c3f', {roughness: .5, metalness: .05}),
    wire: std('#3b3a37', {metalness: .6, roughness: .4})
  };
  // Each material answers to the name it is written under.
  for (const [key, material] of Object.entries(M)) material.name = key;

  // ── Shared primitives, each cloned into place when a hall is merged ─────
  const G = {
    box: new THREE.BoxGeometry(1, 1, 1),
    sphere: new THREE.SphereGeometry(1, 20, 14),
    small: new THREE.SphereGeometry(1, 10, 8),
    cylinder: new THREE.CylinderGeometry(1, 1, 1, 16),
    rod: new THREE.CylinderGeometry(1, 1, 1, 8),
    taper: new THREE.CylinderGeometry(1, .6, 1, 12),
    cone: new THREE.ConeGeometry(1, 1, 10),
    hexPrism: new THREE.CylinderGeometry(1, 1, 1, 6),
    hexTip: new THREE.ConeGeometry(1, 1, 6),
    octahedron: new THREE.OctahedronGeometry(1),
    dodecahedron: new THREE.DodecahedronGeometry(1),
    bead: new THREE.IcosahedronGeometry(1, 0),
    rock: new THREE.IcosahedronGeometry(1, 1),
    torus: new THREE.TorusGeometry(1, .06, 6, 36),
    torusFine: new THREE.TorusGeometry(1, .006, 4, 96),
    torusFat: new THREE.TorusGeometry(1, .45, 8, 48),
    knot: new THREE.TorusKnotGeometry(.24, .062, 110, 10, 2, 3),
    hemisphere: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
    plane: new THREE.PlaneGeometry(1, 1),
    ring: new THREE.TorusGeometry(1, .02, 5, 64),
    hoop: new THREE.TorusGeometry(1, .036, 6, 56),
    rim: new THREE.TorusGeometry(1, .07, 8, 48),
    limb: new THREE.CylinderGeometry(.8, 1, 1, 8),
    tiny: new THREE.SphereGeometry(1, 7, 5),
    annulusInner: new THREE.RingGeometry(1.24, 1.95, 72, 1),
    annulusOuter: new THREE.RingGeometry(2.03, 2.27, 72, 1)
  };
  const lathe = (profile, segments, phiStart = 0, phiLength = Math.PI * 2) =>
    new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments, phiStart, phiLength);

  /**
   * Collects geometry per material in the frame of `base`. Frames nest, share
   * one store, and widen one bounding box, so a piece placed anywhere in a
   * hall still knows its own extent after it has been merged away.
   */
  function kit(store = new Map(), base = new THREE.Matrix4(), bounds = null) {
    return {
      store, bounds,
      put(material, geometry, local = new THREE.Matrix4()) {
        const placed = base.clone().multiply(local);
        if (!store.has(material)) store.set(material, []);
        store.get(material).push({geometry, matrix: placed});
        if (bounds) {
          if (!geometry.boundingBox) geometry.computeBoundingBox();
          bounds.union(geometry.boundingBox.clone().applyMatrix4(placed));
        }
      },
      frame(local, ownBounds = bounds) { return kit(store, base.clone().multiply(local), ownBounds); },
      rod(material, a, b, radius, geometry = G.rod) {
        const from = V(...a), to = V(...b), direction = to.clone().sub(from), length = direction.length();
        this.put(material, geometry, new THREE.Matrix4().compose(from.add(to).multiplyScalar(.5),
          new THREE.Quaternion().setFromUnitVectors(UP, direction.normalize()), V(radius, length, radius)));
      }
    };
  }

  /** Flatten, transform and concatenate a material's parts into one geometry. */
  function merge(parts) {
    const flat = parts.map(({geometry, matrix: placed}) => {
      const copy = geometry.index ? geometry.toNonIndexed() : geometry.clone();
      copy.applyMatrix4(placed);
      if (!copy.attributes.normal) copy.computeVertexNormals();
      return copy;
    });
    const count = flat.reduce((sum, g) => sum + g.attributes.position.count, 0);
    const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
    let offset = 0;
    for (const g of flat) {
      position.set(g.attributes.position.array, offset * 3);
      normal.set(g.attributes.normal.array, offset * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, offset * 2);
      offset += g.attributes.position.count;
      g.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(position, 3));
    merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    merged.computeBoundingSphere();
    return merged;
  }
  function build(store, parent, name) {
    for (const [material, parts] of store) {
      const mesh = new THREE.Mesh(merge(parts), material);
      mesh.name = name;
      parent.add(mesh);
      meshCount++;
      triangleCount += mesh.geometry.attributes.position.count / 3;
    }
  }

  // ── Statues ─────────────────────────────────────────────────────────────
  // Monumental works on tall plinths in the window bays: instruments of the
  // sky, forms from living things and the first machines, each large enough
  // to read from across the hall. The plinth's cap is at 1.33 m.
  const CAP = 1.33;

  /** A tube whose radius follows `radiusAt(s)`, s running 0–1 along its length. */
  function taperedTube(curve, radiusAt, segments, radial = 8) {
    const geometry = new THREE.TubeGeometry(curve, segments, 1, radial, false);
    const p = geometry.attributes.position, point = new THREE.Vector3();
    for (let i = 0; i <= segments; i++) {
      curve.getPointAt(i / segments, point);
      const r = radiusAt(i / segments);
      for (let j = 0; j <= radial; j++) {
        const n = i * (radial + 1) + j;
        p.setXYZ(n, point.x + (p.getX(n) - point.x) * r, point.y + (p.getY(n) - point.y) * r, point.z + (p.getZ(n) - point.z) * r);
      }
    }
    return geometry;
  }

  // The edges of a solid, as pairs of points, for building it in wire.
  const EDGES = new Map();
  function edgesOf(name, make) {
    if (!EDGES.has(name)) {
      const source = make(), edges = new THREE.EdgesGeometry(source), p = edges.attributes.position, list = [];
      for (let i = 0; i < p.count; i += 2) list.push([V(p.getX(i), p.getY(i), p.getZ(i)), V(p.getX(i + 1), p.getY(i + 1), p.getZ(i + 1))]);
      source.dispose(); edges.dispose();
      EDGES.set(name, list);
    }
    return EDGES.get(name);
  }
  const wireframe = (k, material, name, make, scale, radius) => {
    for (const [a, b] of edgesOf(name, make)) k.rod(material, a.clone().multiplyScalar(scale).toArray(), b.clone().multiplyScalar(scale).toArray(), radius);
  };
  const column = (k, height, radius = .07) => {
    k.put(M.bronze, G.cylinder, matrix([0, CAP + .06, 0], 0, [radius * 4.4, .12, radius * 4.4]));
    k.put(M.bronze, G.taper, matrix([0, CAP + .12 + height / 2, 0], [Math.PI, 0, 0], [radius, height, radius]));
  };

  // Hall I · the sky
  const armillary = k => {
    column(k, 1, .08);
    k.put(gold, G.cylinder, matrix([0, CAP + 1.14, 0], 0, [.1, .05, .1]));
    const R = .78, mount = k.frame(matrix([0, CAP + 1.95, 0]));
    mount.put(gold, G.hoop, matrix([0, 0, 0], [Math.PI / 2, 0, 0], R * 1.1));
    mount.put(gold, G.hoop, matrix([0, 0, 0], 0, R * 1.02));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      mount.rod(M.bronze, [0, -.8, 0], [Math.cos(a) * R * 1.1, 0, Math.sin(a) * R * 1.1], .014);
    }
    // The sky's own circles turn about a polar axis pinned to the meridian.
    const sky = mount.frame(matrix([0, 0, 0], [0, 0, .72])), r = R * .93, tilt = 23.44 * Math.PI / 180;
    sky.rod(M.bronze, [0, -R * 1.02, 0], [0, R * 1.02, 0], .016);
    for (const end of [-1, 1]) sky.put(gold, G.small, matrix([0, end * R * 1.02, 0], 0, .045));
    sky.put(gold, G.hoop, matrix([0, 0, 0], [Math.PI / 2, 0, 0], r));
    for (const s of [-1, 1]) {
      sky.put(gold, G.hoop, matrix([0, s * r * Math.sin(tilt), 0], [Math.PI / 2, 0, 0], r * Math.cos(tilt)));
      sky.put(gold, G.hoop, matrix([0, s * r * Math.cos(tilt), 0], [Math.PI / 2, 0, 0], r * Math.sin(tilt)));
    }
    sky.put(gold, G.hoop, matrix([0, 0, 0], [0, Math.PI / 2, 0], r));
    sky.put(darkGold, G.hoop, matrix([0, 0, 0], [Math.PI / 2 + tilt, 0, 0], [r * 1.01, r * 1.01, r * 4.2]));
    sky.put(M.glow, G.sphere, matrix([0, 0, 0], 0, .13));
  };

  // Eight Moons round a dial, each lit from the same distant Sun.
  const lunarMonth = k => {
    column(k, .7, .06);
    const face = k.frame(matrix([0, CAP + 1.74, 0]));
    face.put(shades[0], G.cylinder, matrix([0, 0, 0], [Math.PI / 2, 0, 0], [.92, .1, .92]));
    face.put(gold, G.torus, matrix([0, 0, 0], 0, .93));
    face.put(gold, G.ring, matrix([0, 0, .055], 0, .66));
    face.put(M.bronze, G.sphere, matrix([0, 0, .07], 0, .12));
    for (let i = 0; i < 8; i++) {
      const t = i / 8 * Math.PI * 2, at = V(Math.sin(t) * .66, Math.cos(t) * .66, .14);
      // New Moon at the top, lit from behind; full Moon at the foot, lit from the front.
      const lit = V(Math.sin(t), 0, -Math.cos(t)), size = V(.15, .15, .15);
      face.put(M.bone, G.hemisphere, new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(UP, lit), size));
      face.put(M.obsidian, G.hemisphere, new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromUnitVectors(UP, lit.clone().negate()), size));
      face.put(gold, G.ring, matrix([at.x, at.y, .06], 0, .19));
    }
  };

  // A Möbius band: one side and one edge, the edge traced in gold.
  const MOBIUS_R = .62, MOBIUS_W = .24;
  const mobiusPoint = (u, v) => V((MOBIUS_R + v * Math.cos(u / 2)) * Math.cos(u), (MOBIUS_R + v * Math.cos(u / 2)) * Math.sin(u), v * Math.sin(u / 2));
  const withoutEnd = k => {
    column(k, 1.02, .06);
    const U = 132, W = 6, positions = [], uvs = [], index = [];
    for (let i = 0; i <= U; i++) for (let j = 0; j <= W; j++) {
      const p = mobiusPoint(i / U * Math.PI * 2, (j / W * 2 - 1) * MOBIUS_W);
      positions.push(p.x, p.y, p.z); uvs.push(i / U, j / W);
    }
    for (let i = 0; i < U; i++) for (let j = 0; j < W; j++) {
      const a = i * (W + 1) + j, b = a + W + 1;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
    const band = new THREE.BufferGeometry();
    band.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    band.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    band.setIndex(index); band.computeVertexNormals();
    // Turned off the viewer's axis, so the half-twist reads as a twist rather than a ring.
    const f = k.frame(matrix([0, CAP + 1.76, 0], [0, .95, 0]));
    f.put(M.bronzeDouble, band);
    const edge = [];
    for (let i = 0; i < 160; i++) edge.push(mobiusPoint(i / 160 * Math.PI * 4, MOBIUS_W));
    f.put(gold, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(edge, true), 240, .02, 6, true));
    f.put(gold, G.small, matrix([0, -MOBIUS_R - .02, 0], 0, [.07, .05, .07]));
  };

  // Kepler's nest of the five regular solids, each between two planetary spheres.
  const keplerSolids = k => {
    column(k, 1, .06);
    const c = [0, CAP + 1.94, 0], shell = k.frame(matrix(c)), nest = k.frame(matrix(c, [.35, .6, 0]));
    const S = [.82]; S[1] = S[0] / Math.sqrt(3); S[2] = S[1] / 3; S[3] = S[2] * .7947; S[4] = S[3] * .7947; S[5] = S[4] / Math.sqrt(3);
    for (const rotation of [[Math.PI / 2, 0, 0], [0, 0, 0], [0, Math.PI / 2, 0]]) shell.put(gold, G.ring, matrix([0, 0, 0], rotation, S[0]));
    const cube = 2 / Math.sqrt(3);
    [
      ['cube', () => new THREE.BoxGeometry(cube, cube, cube), gold, .015],
      ['tetrahedron', () => new THREE.TetrahedronGeometry(1), M.bronze, .012],
      ['dodecahedron', () => new THREE.DodecahedronGeometry(1), M.verdigris, .007],
      ['icosahedron', () => new THREE.IcosahedronGeometry(1), gold, .006],
      ['octahedron', () => new THREE.OctahedronGeometry(1), M.bronze, .005]
    ].forEach(([name, make, material, radius], i) => {
      wireframe(nest, material, name, make, S[i], radius);
      if (i) nest.put(darkGold, G.ring, matrix([0, 0, 0], [Math.PI / 2, 0, 0], S[i]));
    });
    nest.put(M.glow, G.small, matrix([0, 0, 0], 0, S[5]));
  };

  // Hall II · living forms
  function frond(k, seed) {
    const rand = random(seed), points = [];
    for (let i = 0; i <= 10; i++) points.push(V(-.18 * Math.sin(i / 10 * Math.PI * .9), 1.45 * i / 10, 0));
    const top = points[10], centre = V(top.x + .3, top.y, 0);
    for (let i = 1; i <= 36; i++) {
      const turned = i / 36 * Math.PI * 3.4, r = .3 * Math.exp(-.19 * turned);
      points.push(V(centre.x + r * Math.cos(Math.PI - turned), centre.y + r * Math.sin(Math.PI - turned), 0));
    }
    const curve = new THREE.CatmullRomCurve3(points), STEM = .52;
    k.put(M.bronze, taperedTube(curve, s => s < STEM ? .05 - .018 * s / STEM : .032 * (1 - .72 * (s - STEM) / (1 - STEM)), 96, 8));
    for (let i = 0; i < 24; i++) {
      const s = .3 + i / 23 * .66, at = curve.getPointAt(s), tangent = curve.getTangentAt(s), size = 1.15 - s * .85;
      for (const side of [-1, 1]) {
        k.put(M.verdigris, G.small, matrix([at.x, at.y, side * .14 * size], [side * (.12 + rand() * .06), 0, Math.atan2(tangent.y, tangent.x)],
          [.07 * size, .018 * size, .17 * size]));
      }
    }
  }
  const fiddlehead = k => {
    k.put(M.bronze, G.cylinder, matrix([0, CAP + .04, 0], 0, [.34, .08, .34]));
    k.put(M.fossilDark, G.hemisphere, matrix([0, CAP + .08, 0], 0, [.3, .12, .3]));
    frond(k.frame(matrix([.06, CAP + .1, .05])), 41);
    frond(k.frame(matrix([-.16, CAP + .1, -.12], [0, .75, 0], .62)), 43);
  };

  const radiolarian = k => {
    column(k, 1.0, .05);
    const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(.3, .4, 0)), R0 = .66;
    const cell = k.frame(new THREE.Matrix4().compose(V(0, CAP + 1.72, 0), turn, V(1, 1, 1)));
    const nodes = new Map(), core = [];
    for (const [a, b] of edgesOf('lattice', () => new THREE.IcosahedronGeometry(1, 1))) {
      cell.rod(M.bone, a.clone().multiplyScalar(R0).toArray(), b.clone().multiplyScalar(R0).toArray(), .013);
      for (const v of [a, b]) nodes.set(v.toArray().map(n => n.toFixed(3)).join(), v);
    }
    for (const [a, b] of edgesOf('core', () => new THREE.IcosahedronGeometry(1, 0))) {
      cell.rod(M.bone, a.clone().multiplyScalar(.3).toArray(), b.clone().multiplyScalar(.3).toArray(), .01);
      for (const v of [a, b]) if (!core.some(c => c.distanceTo(v) < 1e-3)) core.push(v);
    }
    for (const v of core) cell.rod(M.bone, v.clone().multiplyScalar(.3).toArray(), v.clone().multiplyScalar(R0).toArray(), .008);
    for (const v of nodes.values()) {
      // Long spines from the twelve great vertices, except the one aimed at the column.
      const primary = core.some(c => c.distanceTo(v) < 1e-3) && v.clone().applyQuaternion(turn).y > -.7;
      const length = primary ? .46 : .12, base = primary ? .032 : .016;
      cell.put(M.bone, G.bead, matrix(v.clone().multiplyScalar(R0).toArray(), 0, .026));
      cell.put(M.bone, G.cone, new THREE.Matrix4().compose(v.clone().multiplyScalar(R0 + length / 2),
        new THREE.Quaternion().setFromUnitVectors(UP, v), V(base, length, base)));
    }
  };

  // Wings in the XY plane, leading edge up; `side` flips which way they reach.
  function wingGeometry(side, length, chord) {
    const s = new THREE.Shape(), L = side * length;
    s.moveTo(0, .02);
    s.bezierCurveTo(L * .35, chord * .5, L * .8, chord * .45, L, chord * .12);
    s.bezierCurveTo(L * 1.02, -chord * .12, L * .7, -chord * .55, L * .3, -chord * .5);
    s.bezierCurveTo(L * .12, -chord * .45, 0, -chord * .2, 0, .02);
    return new THREE.ShapeGeometry(s, 10);
  }
  const griffinfly = k => {
    k.put(M.bronze, G.cylinder, matrix([0, CAP + .04, 0], 0, [.3, .08, .3]));
    const reed = new THREE.CatmullRomCurve3([V(0, CAP + .08, 0), V(.05, CAP + .6, -.02), V(.02, CAP + 1.05, .05), V(-.02, CAP + 1.28, .1)]);
    k.put(M.verdigris, taperedTube(reed, s => .038 - .02 * s, 24, 8));
    for (const side of [-1, 1]) k.put(M.verdigris, G.small, matrix([side * .1, CAP + .55, 0], [0, 0, -side * .3], [.028, .48, .012]));
    const body = k.frame(matrix([0, CAP + 1.5, .02], [-.28, 0, 0]));
    body.put(M.bronze, G.sphere, matrix([0, 0, .1], 0, [.12, .13, .24]));
    body.put(M.bronze, G.sphere, matrix([0, .03, .4], 0, [.11, .1, .09]));
    for (const s of [-1, 1]) body.put(M.verdigris, G.sphere, matrix([s * .075, .06, .43], 0, [.075, .08, .075]));
    for (let i = 0; i < 10; i++) {
      const z = -.12 - i * .105, r = .07 - i * .0035, y = -.0015 * i * i;
      body.put(M.bronze, G.cylinder, matrix([0, y, z], [Math.PI / 2 - .01 * i, 0, 0], [r, .1, r]));
      body.put(gold, G.cylinder, matrix([0, y, z + .052], [Math.PI / 2, 0, 0], [r * 1.08, .014, r * 1.08]));
    }
    for (const s of [-1, 1]) body.rod(M.bronze, [0, -.14, -1.15], [s * .05, -.17, -1.3], .008);
    for (const [z, length, chord, sweep] of [[.2, 1.05, .2, -.06], [.03, .98, .26, .1]]) for (const side of [-1, 1]) {
      const wing = body.frame(matrix([side * .09, .1, z], [0, side * sweep, side * .07]));
      wing.put(M.wing, wingGeometry(side, length, chord), matrix([0, 0, 0], [Math.PI / 2, 0, 0]));
      const L = side * length;
      wing.rod(gold, [0, 0, .02], [L * .5, 0, chord * .42], .007);
      wing.rod(gold, [L * .5, 0, chord * .42], [L * .98, 0, chord * .12], .006);
      wing.rod(gold, [0, 0, 0], [L * .93, 0, -chord * .05], .004);
      wing.put(M.obsidian, G.box, matrix([L * .86, 0, chord * .26], 0, [.06, .006, .03]));
    }
    // Six legs grip the top of the reed.
    for (const s of [-1, 1]) for (const dz of [-.06, .04, .14]) {
      const hip = [s * .05, CAP + 1.43, .1 + dz], knee = [s * .13, CAP + 1.38, .1 + dz * 1.3], foot = [s * .03, CAP + 1.27, .1 + dz * .3];
      k.rod(M.bronze, hip, knee, .008);
      k.rod(M.bronze, knee, foot, .006);
    }
  };

  const coral = k => {
    const rand = random(31);
    k.put(M.fossil, G.rock, matrix([0, CAP + .12, 0], [.2, .6, 0], [.48, .2, .42]));
    const grow = (from, direction, length, radius, depth) => {
      const to = from.clone().addScaledVector(direction, length);
      k.put(M.coral, G.limb, new THREE.Matrix4().compose(from.clone().add(to).multiplyScalar(.5),
        new THREE.Quaternion().setFromUnitVectors(UP, direction), V(radius, length, radius)));
      if (depth === 0) {k.put(M.coral, G.small, matrix(to.toArray(), 0, radius * .86)); return;}
      k.put(M.coral, G.bead, matrix(to.toArray(), 0, radius * .84));
      const count = rand() < .3 ? 3 : 2;
      for (let i = 0; i < count; i++) {
        const angle = rand() * Math.PI * 2, axis = V(Math.cos(angle), 0, Math.sin(angle)).cross(direction);
        const next = axis.lengthSq() > 1e-6 ? direction.clone().applyAxisAngle(axis.normalize(), .35 + rand() * .4) : direction.clone();
        next.y = Math.max(next.y, .3);
        grow(to, next.normalize(), length * (.76 + rand() * .14), radius * .8, depth - 1);
      }
    };
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * Math.PI * 2 + .4;
      grow(V(Math.cos(a) * .16, CAP + .2, Math.sin(a) * .13), V(Math.cos(a) * .42, 1, Math.sin(a) * .42).normalize(), .5, .062, 3);
    }
  };

  // Hall III · what people made
  const wheel = k => {
    k.put(M.bronze, G.box, matrix([0, CAP + .04, 0], 0, [.46, .08, .7]));
    for (const s of [-1, 1]) k.put(M.bronze, G.box, matrix([0, CAP + .57, s * .26], 0, [.12, 1.02, .07]));
    const w = k.frame(matrix([0, CAP + 1.06, 0]));
    w.rod(M.bronze, [0, 0, -.32], [0, 0, .32], .04, G.cylinder);
    w.put(M.wood, G.cylinder, matrix([0, 0, 0], [Math.PI / 2, 0, 0], [.13, .3, .13]));
    for (const dz of [-.12, .12]) w.put(darkGold, G.cylinder, matrix([0, 0, dz], [Math.PI / 2, 0, 0], [.145, .03, .145]));
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      w.rod(M.wood, [Math.cos(a) * .12, Math.sin(a) * .12, 0], [Math.cos(a) * .82, Math.sin(a) * .82, 0], .026, G.cylinder);
    }
    w.put(M.wood, G.rim, matrix([0, 0, 0], 0, [.86, .86, 1.3]));
    w.put(M.obsidian, G.rim, matrix([0, 0, 0], 0, [.925, .925, .9]));
  };

  let SARSEN = null;
  const standingStones = k => {
    // Weathered blocks: every vertex pushed by a hash of where it sits, so faces stay joined.
    SARSEN ??= (() => {
      const geometry = new THREE.BoxGeometry(1, 1, 1, 2, 4, 2), p = geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i), key = [Math.round(x * 100), Math.round(y * 100), Math.round(z * 100)];
        const bulge = (1 + (hash(...key) - .5) * .18) * (1 - (y + .5) * .1);
        p.setXYZ(i, x * bulge, y + (hash(key[1], key[2], key[0]) - .5) * .05, z * bulge);
      }
      geometry.computeVertexNormals();
      return geometry;
    })();
    k.put(M.sarsen, SARSEN, matrix([-.37, CAP + 1.0, 0], [0, .05, .025], [.4, 1.9, .4]));
    k.put(M.sarsen, SARSEN, matrix([.37, CAP + .98, .02], [0, -.07, -.02], [.38, 1.86, .42]));
    k.put(M.sarsen, SARSEN, matrix([0, CAP + 2.1, 0], [0, .03, .015], [1.4, .34, .46]));
  };

  const STATUES = [
    [
      {title: 'Armillary Sphere', subtitle: 'The circles of the sky, set in bronze and gold', build: armillary},
      {title: 'The Lunar Month', subtitle: 'One Moon, lit from one side, seen from Earth', build: lunarMonth},
      {title: 'Without End', subtitle: 'A band with one side, one edge and no beginning', build: withoutEnd},
      {title: "Kepler's Solids", subtitle: 'His 1596 guess at why the planets keep their distances', build: keplerSolids}
    ],
    [
      {title: 'Fiddlehead', subtitle: 'A fern unrolling, as ferns have for 300 million years', build: fiddlehead},
      {title: 'Radiolarian', subtitle: 'The glass skeleton of a single-celled sea creature', build: radiolarian},
      {title: 'Griffinfly', subtitle: 'An insect with 70 cm wings, 300 million years ago', build: griffinfly},
      {title: 'Staghorn Coral', subtitle: 'Tiny animals, building reefs of stone', build: coral}
    ],
    [
      {title: 'The Wheel', subtitle: 'Turning on axles for some 5,500 years', build: wheel},
      {title: 'Standing Stones', subtitle: 'Raised to frame the solstice sun, 4,500 years ago', build: standingStones}
    ]
  ];

  function statue(k, wing, work) {
    k.put(marble, G.box, matrix([0, .08, 0], 0, [1.32, .16, 1.32]));
    k.put(shades[wing], G.box, matrix([0, .68, 0], 0, [1, 1.04, 1]));
    k.put(gold, G.box, matrix([0, 1.215, 0], 0, [1.2, .03, 1.2]));
    k.put(marble, G.box, matrix([0, 1.28, 0], 0, [1.18, .1, 1.18]));
    work.build(k);
  }

  // ── Pedestal works ──────────────────────────────────────────────────────
  const TOP = 1.15;
  function pedestal(k, wing) {
    k.put(marble, G.box, matrix([0, .06, 0], 0, [.84, .12, .84]));
    k.put(shades[wing], G.box, matrix([0, .58, 0], 0, [.6, .92, .6]));
    k.put(gold, G.box, matrix([0, 1.055, 0], 0, [.7, .03, .7]));
    k.put(marble, G.box, matrix([0, 1.11, 0], 0, [.74, .08, .74]));
  }
  function mount(k, height) {
    k.put(M.bronze, G.cylinder, matrix([0, TOP + .025, 0], 0, [.13, .05, .13]));
    k.rod(M.bronze, [0, TOP + .05, 0], [0, TOP + height, 0], .018);
  }

  const knot = k => {
    mount(k, .22);
    k.put(M.bronze, G.knot, matrix([0, TOP + .52, 0], [.35, .5, 0]));
  };
  const accretion = k => {
    mount(k, .3);
    const c = [0, TOP + .52, 0], tilt = [Math.PI / 2 + .4, 0, .25];
    k.put(M.obsidian, G.sphere, matrix(c, 0, .14));
    k.put(M.glow, G.torusFat, matrix(c, tilt, [.3, .3, .04]));
    k.put(gold, G.torus, matrix(c, tilt, .44));
  };
  const ringed = k => {
    mount(k, .26);
    const c = [0, TOP + .5, 0];
    k.put(M.bronze, G.sphere, matrix(c, 0, .19));
    k.put(gold, G.torusFat, matrix(c, [Math.PI / 2 + .45, 0, .3], [.34, .34, .02]));
    k.put(M.verdigris, G.small, matrix([.36, TOP + .64, .1], 0, .035));
  };
  const nova = k => {
    mount(k, .3);
    const c = V(0, TOP + .56, 0), phi = (1 + Math.sqrt(5)) / 2;
    k.put(M.glow, G.dodecahedron, matrix(c.toArray(), [.3, .2, 0], .12));
    const vertices = [[0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi], [1, phi, 0], [-1, phi, 0],
      [1, -phi, 0], [-1, -phi, 0], [phi, 0, 1], [-phi, 0, 1], [phi, 0, -1], [-phi, 0, -1]];
    for (const vertex of vertices) {
      const direction = V(...vertex).normalize();
      k.put(M.bronze, G.cone, new THREE.Matrix4().compose(c.clone().addScaledVector(direction, .24),
        new THREE.Quaternion().setFromUnitVectors(UP, direction), V(.035, .26, .035)));
    }
  };

  const ammonite = k => {
    k.put(M.fossil, G.box, matrix([0, TOP + .05, 0], 0, [.36, .1, .22]));
    for (let i = 0; i < 30; i++) {
      const t = i * .36, r = .026 * Math.exp(.19 * t), size = .012 + .42 * r;
      const at = [Math.cos(t) * r, TOP + .34 + Math.sin(t) * r, 0];
      k.put(M.fossil, G.small, matrix(at, [0, 0, t], [size, size * .9, size * .62]));
      if (i % 2) k.put(M.fossilDark, G.small, matrix(at, [0, 0, t + Math.PI / 2], [size * 1.05, size * .18, size * .66]));
    }
  };
  const trilobite = k => {
    k.rod(M.bronze, [0, TOP, -.18], [0, TOP + .3, -.22], .014);
    const slab = k.frame(matrix([0, TOP + .18, 0], [.55, 0, 0]));
    slab.put(M.fossil, G.box, matrix([0, 0, 0], 0, [.46, .05, .6]));
    const body = slab.frame(matrix([0, .03, 0]));
    body.put(M.fossilDark, G.sphere, matrix([0, 0, -.2], 0, [.2, .05, .11]));
    for (const s of [-1, 1]) body.put(M.obsidian, G.small, matrix([s * .09, .035, -.2], 0, .024));
    for (let i = 0; i < 9; i++) {
      const z = -.09 + i * .037, width = .19 - i * .009;
      body.put(M.fossilDark, G.box, matrix([0, .012, z], 0, [width, .022, .028]));
      body.put(M.fossil, G.small, matrix([0, .03, z], 0, [.035, .02, .02]));
    }
    body.put(M.fossilDark, G.sphere, matrix([0, 0, .29], 0, [.09, .03, .07]));
  };
  const geode = k => {
    const f = k.frame(matrix([0, TOP + .27, 0], [-.25, 0, 0]));
    f.put(M.shell, G.hemisphere, matrix([0, 0, 0], [-Math.PI / 2, 0, 0], .25));
    f.put(marble, G.torus, matrix([0, 0, 0], 0, [.245, .245, .4]));
    const rand = random(19);
    for (let i = 0; i < 34; i++) {
      const u = rand() * Math.PI * 2, v = rand() * .95;
      const out = V(Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), -Math.cos(v));
      const base = out.clone().multiplyScalar(.23), inward = out.clone().negate().lerp(V(0, 0, 1), .35).normalize();
      const length = .07 + rand() * .08, turn = new THREE.Quaternion().setFromUnitVectors(UP, inward);
      f.put(M.amethyst, G.hexPrism, new THREE.Matrix4().compose(base.clone().addScaledVector(inward, length / 2), turn, V(.022, length, .022)));
      f.put(M.amethyst, G.hexTip, new THREE.Matrix4().compose(base.clone().addScaledVector(inward, length + .018), turn, V(.022, .04, .022)));
    }
  };
  /**
   * A Tyrannosaurus skull on its mount, 86 cm long, snout toward the aisle.
   *
   * What makes the skull recognisable is not its outline but its openings —
   * the long naris, the antorbital fenestra before the eye, the orbit, and the
   * infratemporal fenestra behind it. So each side of the cranium is one
   * profile extruded into a plate with those four openings cut through it, and
   * the pair splay apart toward the back, narrow at the snout and wide across
   * the braincase, bridged by the nasal ridge, the skull roof and the palate.
   * The jaw is built the same way and hinges open at the joint.
   */
  const boneShape = (outline, holes = []) => {
    const trace = (path, points) => {
      path.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) path.lineTo(x, y);
      path.closePath();
      return path;
    };
    const shape = trace(new THREE.Shape(), outline);
    for (const hole of holes) shape.holes.push(trace(new THREE.Path(), hole));
    return new THREE.ExtrudeGeometry(shape, {depth: .046, bevelEnabled: true, bevelThickness: .012, bevelSize: .012, bevelSegments: 1});
  };
  // Snout at +x, jaw line near y = 0, the back of the skull at x = -0.42. The
  // top edge is kept on its own, because the ridge that bridges the two sides
  // is built from the same points and so can never drift away from them.
  const CRANIUM_TOP = [[.452, .058], [.442, .10], [.40, .132], [.30, .155], [.16, .21], [.02, .285], [-.08, .35], [-.15, .40],
    [-.30, .40], [-.38, .335]];
  const CRANIUM_SIDE = boneShape(
    [...CRANIUM_TOP, [-.41, .235], [-.375, .115], [-.325, .03], [-.22, .04], [-.10, .02], [.08, 0], [.26, .008], [.38, .022], [.435, .032]],
    [[[.235, .128], [.345, .112], [.357, .15], [.245, .166]],
      [[.03, .085], [.20, .062], [.216, .186], [.055, .236]],
      [[-.035, .232], [-.078, .318], [-.138, .258], [-.088, .178]],
      [[-.328, .108], [-.19, .092], [-.17, .29], [-.308, .308]]]);
  // The jaw is drawn from its joint, so it can simply be hinged there.
  const JAW_SIDE = boneShape(
    [[0, 0], [-.052, -.062], [.012, -.132], [.17, -.162], [.37, -.156], [.55, -.126], [.69, -.086], [.752, -.032],
      [.57, -.046], [.37, -.062], [.17, -.068], [.012, -.056]],
    [[[.13, -.086], [.245, -.096], [.256, -.132], [.142, -.124]]]);
  function trexSkull(k) {
    const GAPE = .26, JOINT = [.01, -.325];
    const mount = k.frame(matrix([0, TOP, 0], [0, -.16, 0]));
    // The armature: a plate, two uprights and a cross brace under the cheeks.
    mount.put(M.fossilDark, G.box, matrix([0, .02, 0], 0, [.58, .04, .42]));
    for (const z of [-.19, .15]) {
      mount.put(M.bronze, G.cylinder, matrix([0, .045, z], 0, [.05, .03, .05]));
      mount.rod(M.bronze, [0, .05, z], [0, .33, z * .9], .017);
    }
    mount.rod(M.bronze, [0, .33, -.17], [0, .33, .135], .011);
    const skull = mount.frame(matrix([0, .38, 0], [.04, 0, 0]));
    // Each side of the cranium, splayed so the snout is narrow and the braincase wide.
    for (const s of [-1, 1]) {
      skull.put(M.bone, CRANIUM_SIDE, matrix([s * .082, 0, -.023], [0, -Math.PI / 2 - s * .085, 0]));
      skull.put(M.bone, G.sphere, matrix([s * .105, .35, -.06], 0, [.038, .026, .058]));
      skull.put(M.bronze, G.sphere, matrix([s * .092, JOINT[0], JOINT[1]], 0, .021));
    }
    // The nasal ridge and skull roof, one panel to each segment of the top
    // edge, narrow over the snout and wide across the braincase.
    for (let i = 0; i < CRANIUM_TOP.length - 1; i++) {
      const [z1, y1] = CRANIUM_TOP[i], [z2, y2] = CRANIUM_TOP[i + 1];
      const length = Math.hypot(z2 - z1, y2 - y1), tilt = -Math.atan2(y2 - y1, z2 - z1);
      const width = .085 + .105 * Math.min(1, Math.max(0, (.2 - (z1 + z2) / 2) / .5));
      skull.put(M.bone, G.box, matrix([0, (y1 + y2) / 2, (z1 + z2) / 2], [tilt, 0, 0], [width, .045, length + .02]));
    }
    skull.put(M.bone, G.box, matrix([0, .025, .09], 0, [.11, .035, .56]));
    skull.put(M.bone, G.box, matrix([0, .21, -.385], 0, [.155, .27, .05]));
    skull.put(M.bone, G.sphere, matrix([0, .105, -.405], 0, [.033, .03, .028]));
    // The jaw, hinged at the joint and hanging open.
    const jaw = skull.frame(matrix([0, JOINT[0], JOINT[1]], [GAPE, 0, 0]));
    for (const s of [-1, 1]) jaw.put(M.bone, JAW_SIDE, matrix([s * .078, 0, 0], [0, -Math.PI / 2 - s * .075, 0]));
    jaw.put(M.bone, G.box, matrix([0, -.115, .37], [.025, 0, 0], [.12, .04, .56]));
    jaw.put(M.bone, G.box, matrix([0, -.05, .745], 0, [.075, .05, .05]));
    // Teeth: longest at the front of the maxilla, dwindling toward the joint.
    const tooth = (into, s, at, length, radius, lean, up) => into.put(M.enamel, G.cone, new THREE.Matrix4().compose(
      V(s * .072, at[0] + (up ? length / 2 : -length / 2), at[1]),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(lean, 0, up ? 0 : Math.PI)),
      V(radius, length, radius * .66)));
    for (const s of [-1, 1]) {
      for (let i = 0; i < 11; i++) {
        const z = .36 - i * .052, size = Math.sin(Math.PI * Math.min(1, (z + .16) / .6));
        tooth(skull, s, [.012, z], .052 + size * .058, .015 + size * .008, .06 - i * .013, false);
      }
      for (let i = 0; i < 12; i++) {
        const z = .70 - i * .056, size = Math.sin(Math.PI * Math.min(1, z / .68));
        tooth(jaw, s, [-.052, z], .04 + size * .045, .013 + size * .007, -.05 + i * .011, true);
      }
    }
  }

  const hash = (a, b, c) => {const s = Math.sin(a * 12.9898 + b * 78.233 + c * 37.719) * 43758.5453; return s - Math.floor(s);};
  // Knapped facets: jitter keyed by position, so the lathe seam stays closed.
  const HAND_AXE = (() => {
    const geometry = lathe([[0, 0], [.05, .02], [.09, .08], [.11, .16], [.1, .24], [.072, .31], [.032, .36], [0, .385]], 12);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
      const key = [Math.round(x * 1e4), Math.round(y * 1e4), Math.round(z * 1e4)];
      p.setXYZ(i, x * (1 + (hash(...key) - .5) * .14), y, z * .34 * (1 + (hash(key[2], key[0], key[1]) - .5) * .3));
    }
    geometry.computeVertexNormals();
    return geometry;
  })();
  const handAxe = k => {
    k.put(M.bronze, G.cylinder, matrix([0, TOP + .025, 0], 0, [.15, .05, .15]));
    for (const s of [-1, 1]) k.rod(M.bronze, [s * .06, TOP + .05, 0], [s * .1, TOP + .2, 0], .008);
    k.put(M.flint, HAND_AXE, matrix([0, TOP + .06, 0], [0, .35, 0], 1.5));
  };
  const AMPHORA = lathe([[0, 0], [.04, 0], [.05, .04], [.034, .1], [.09, .2], [.16, .34], [.185, .48], [.175, .6],
    [.12, .7], [.07, .76], [.052, .8], [.05, .92], [.066, .95], [.062, .975], [.045, .97], [.044, .8], [0, .8]], 28);
  const AMPHORA_BAND = lathe([[.176, .4], [.186, .44], [.19, .48], [.188, .52], [.183, .56]], 28);
  const HANDLE = new THREE.TorusGeometry(.09, .016, 6, 18, Math.PI);
  const amphora = k => {
    k.put(M.bronze, G.cylinder, matrix([0, TOP + .015, 0], 0, [.16, .03, .16]));
    k.put(M.bronze, G.torus, matrix([0, TOP + .16, 0], [Math.PI / 2, 0, 0], [.1, .1, .5]));
    for (let i = 0; i < 3; i++) {
      const a = i * Math.PI * 2 / 3;
      k.rod(M.bronze, [Math.cos(a) * .14, TOP + .03, Math.sin(a) * .14], [Math.cos(a) * .1, TOP + .16, Math.sin(a) * .1], .008);
    }
    const jar = k.frame(matrix([0, TOP + .04, 0]));
    jar.put(M.terracotta, AMPHORA);
    jar.put(M.glaze, AMPHORA_BAND);
    for (const s of [-1, 1]) jar.put(M.terracotta, HANDLE, matrix([s * .085, .78, 0], [0, 0, -s * Math.PI / 2]));
  };

  const PEDESTALS = [
    [
      {title: 'Knot of Spacetime', subtitle: 'Space and time, tied into one', build: knot},
      {title: 'Accretion', subtitle: 'Matter circling a dark centre', build: accretion},
      {title: 'Ringed World', subtitle: 'A planet and the debris it keeps', build: ringed},
      {title: 'Nova', subtitle: 'A star, casting off its outer layers', build: nova}
    ],
    [
      {title: 'Ammonite', subtitle: 'A chambered shell, spiralling as it grew', build: ammonite},
      {title: 'Trilobite', subtitle: 'Eyes of stone: lenses grown as crystals', build: trilobite, entry: 'The First Trilobites'},
      {title: 'Geode', subtitle: 'Crystals grown in the dark of a stone', build: geode},
      {title: 'Tyrannosaurus Skull', subtitle: 'A metre and a half of jaw in life, and sixty teeth', build: trexSkull}
    ],
    [
      {title: 'Hand Axe', subtitle: 'A shape our ancestors kept for a million years', build: handAxe},
      {title: 'Amphora', subtitle: 'The shipping jar of the ancient Mediterranean', build: amphora}
    ]
  ];

  // ── Plaques: one canvas per hall ────────────────────────────────────────
  function plaques(entries) {
    // A statue's plaque is 84 cm wide and read from about a metre. Every size
    // below is written for a 512-unit cell and multiplied by `u`, so the
    // lettering grows with the canvas: when the native build took more texture
    // and the sizes stayed in pixels, its plaques carried smaller words.
    const COLS = 2, W = Math.round(640 * TEXTURE_SCALE), H = Math.round(320 * TEXTURE_SCALE), u = W / 512;
    const rows = Math.max(1, Math.ceil(entries.length / COLS));
    const canvas = document.createElement('canvas');
    canvas.width = COLS * W; canvas.height = rows * H;
    const ctx = canvas.getContext('2d');
    entries.forEach((entry, index) => {
      const x = (index % COLS) * W, y = Math.floor(index / COLS) * H;
      ctx.fillStyle = '#1b2127'; ctx.fillRect(x, y, W, H);
      ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 6 * u; ctx.strokeRect(x + 7 * u, y + 7 * u, W - 14 * u, H - 14 * u);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#f1dfb8'; ctx.font = `${Math.round(60 * u)}px Georgia, serif`;
      ctx.fillText(entry.title, x + W / 2, y + 86 * u, W - 44 * u);
      ctx.fillStyle = '#d6c7a4'; ctx.font = `italic ${Math.round(32 * u)}px Georgia, serif`;
      ctx.fillText(entry.subtitle, x + W / 2, y + 152 * u, W - 44 * u);
      // That every work is original to the museum is said once, beside the
      // opening display, rather than on every plaque.
      if (entry.entry) {
        ctx.fillStyle = '#c9b27c'; ctx.font = `${Math.round(26 * u)}px Arial, sans-serif`;
        ctx.fillText(`In the collection: ${entry.entry}`, x + W / 2, y + 204 * u, W - 44 * u);
      }
    });
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({map: texture});
    return (k, index, position, size) => {
      const geometry = G.plane.clone(), uv = geometry.attributes.uv;
      const col = index % COLS, row = Math.floor(index / COLS);
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (col + uv.getX(i)) / COLS, 1 - (row + 1 - uv.getY(i)) / rows);
      k.put(material, geometry, matrix(position, 0, [size[0], size[1], 1]));
    };
  }

  // ── Hung from the vault ─────────────────────────────────────────────────
  // Motion the native build can carry out for itself. The museum animates in
  // closures, which no exporter can carry across, so a motion that turns or
  // lifts a whole group also *declares* what it does: which group, about which
  // axis, how fast, and the pose the group was authored in. The native exporter
  // keeps such a group as a node of its own instead of merging it into the
  // static building, and the Unity side turns it from the same numbers.
  //
  // The closure stays the authority here. The declaration beside it is a
  // description of the closure, kept next to it so the two cannot drift apart.
  const nativeParts = [];
  const nativePart = (wing, node, part) => {
    const {of: piece, ...spec} = part;
    node.name = `${piece} · ${spec.kind} ${nativeParts.length}`;
    node.userData.nativePart = {...spec, wing, piece, name: node.name,
      base: {position: node.position.toArray(), quaternion: node.quaternion.toArray(), scale: node.scale.toArray()}};
    nativeParts.push(node.userData.nativePart);
  };
  const addMotion = (wing, motion, part = null) => {
    motion.hall = halls[wing];
    motions.push(motion);
    if (part) {const {node, ...spec} = part; nativePart(wing, node, spec);}
  };
  function hang(name, wing, root, bounds, extra = {}) {
    halls[wing].add(root);
    pieces.push({name, kind: 'hanging', wing, root, bounds, ...extra});
  }

  function orrery(wing, z, store) {
    const root = new THREE.Group(); root.position.set(0, 7.4, z);
    const bounds = new THREE.Box3(), frame = kit(store, matrix([0, 7.4, z]), bounds);
    frame.rod(darkGold, [0, .42, 0], [0, vaultAt(0) - 7.4, 0], .022);
    frame.put(M.glow, G.sphere, matrix([0, 0, 0], 0, .42));
    const orbits = [{r: .95, size: .07, speed: .34}, {r: 1.35, size: .1, speed: .21},
      {r: 1.85, size: .16, speed: .13, ring: true}, {r: 2.3, size: .12, speed: .08}];
    for (const orbit of orbits) frame.put(darkGold, G.torusFine, matrix([0, 0, 0], [Math.PI / 2, 0, 0], orbit.r));
    orbits.forEach((orbit, i) => {
      const arm = new THREE.Group(); root.add(arm);
      const piece = kit();
      piece.rod(M.bronze, [.42, 0, 0], [orbit.r, 0, 0], .009);
      piece.put(M.bronze, G.sphere, matrix([orbit.r, 0, 0], 0, orbit.size));
      if (orbit.ring) piece.put(M.bronze, G.torusFat, matrix([orbit.r, 0, 0], [Math.PI / 2 + .5, 0, .2], [orbit.size * 1.7, orbit.size * 1.7, .012]));
      build(piece.store, arm, 'Orrery arm');
      addMotion(wing, t => {arm.rotation.y = i * 1.7 + t * orbit.speed;},
        {node: arm, of: 'Orrery', kind: 'spin', axis: 'y', rate: orbit.speed, phase: i * 1.7});
    });
    hang('Orrery', wing, root, bounds);
  }

  function beadCloud(count, place) {
    const mesh = new THREE.InstancedMesh(G.bead, M.beads, count);
    const at = new THREE.Matrix4(), color = new THREE.Color(), still = new THREE.Quaternion();
    for (let i = 0; i < count; i++) {
      const {position, size, tint} = place(i);
      mesh.setMatrixAt(i, at.compose(position, still, V(size, size, size)));
      mesh.setColorAt(i, color.set(tint));
    }
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    meshCount++; triangleCount += count * 20;
    return mesh;
  }

  function galaxy(wing, z, store) {
    const root = new THREE.Group(); root.position.set(0, 7.2, z);
    const bounds = new THREE.Box3();
    kit(store, matrix([0, 7.2, z]), bounds).rod(darkGold, [0, .08, 0], [0, vaultAt(0) - 7.2, 0], .018);
    const tilt = new THREE.Group(); tilt.rotation.set(.38, 0, .12); root.add(tilt);
    const spin = new THREE.Group(); tilt.add(spin);
    const core = kit(); core.put(M.glow, G.sphere, matrix([0, 0, 0], 0, [.3, .13, .3]));
    build(core.store, spin, 'Galaxy core');
    const rand = random(3), inner = new THREE.Color('#ffe6a8'), outer = new THREE.Color('#9cc4ff');
    spin.add(beadCloud(420, i => {
      const t = rand(), r = .18 + 2.45 * Math.pow(t, .85);
      const theta = Math.log(r / .18) / .3 + (i % 2) * Math.PI + (rand() - .5) * .5, spread = .06 + .16 * t;
      const tint = rand() < .12 ? '#ffffff' : '#' + inner.clone().lerp(outer, Math.min(1, t * 1.3)).getHexString();
      return {position: V(Math.cos(theta) * r + (rand() - .5) * spread, (rand() - .5) * .08 * (1 - t),
        Math.sin(theta) * r + (rand() - .5) * spread), size: .028 + .03 * (1 - t) + rand() * .012, tint};
    }));
    addMotion(wing, t => {spin.rotation.y = -t * .05;},
      {node: spin, of: 'Spiral Galaxy', kind: 'spin', axis: 'y', rate: -.05});
    hang('Spiral Galaxy', wing, root, bounds);
  }

  function comet(wing, z, store) {
    const root = new THREE.Group(); root.position.set(0, 8.1, z - 2.6);
    const bounds = new THREE.Box3(), frame = kit(store, matrix([0, 8.1, z - 2.6]), bounds);
    frame.put(M.flint, G.rock, matrix([0, 0, 0], [.4, .7, 0], .3));
    frame.put(M.glow, G.sphere, matrix([0, 0, .12], 0, .16));
    frame.rod(darkGold, [0, .28, 0], [0, vaultAt(0) - 8.1, 0], .014);
    frame.rod(darkGold, [0, -.62, 3.4], [0, vaultAt(0) - 8.1, 3.4], .01);
    const tail = new THREE.Group(); root.add(tail);
    const rand = random(11), head = new THREE.Color('#ffd98a'), end = new THREE.Color('#d4e8ff');
    tail.add(beadCloud(200, () => {
      const t = Math.pow(rand(), .7), spread = .04 + t * .75, angle = rand() * Math.PI * 2, radial = spread * Math.sqrt(rand());
      return {position: V(Math.cos(angle) * radial, -t * t * 1.1 + Math.sin(angle) * radial, .3 + t * 7),
        size: .06 * (1 - t * .75) + .01, tint: '#' + head.clone().lerp(end, t).getHexString()};
    }));
    addMotion(wing, t => {tail.rotation.z = t * .08;},
      {node: tail, of: 'Comet', kind: 'spin', axis: 'z', rate: .08});
    hang('Comet', wing, root, bounds);
  }

  function helix(wing, z, store) {
    const root = new THREE.Group(); root.position.set(0, 5.0, z);
    const bounds = new THREE.Box3();
    kit(store, matrix([0, 5.0, z]), bounds).rod(darkGold, [0, 3.72, 0], [0, vaultAt(0) - 5.0, 0], .016);
    const spin = new THREE.Group(); root.add(spin);
    const PAIRS = 42, HEIGHT = 3.7, TURNS = 3.3, RADIUS = .52, rand = random(5);
    const angle = i => i / (PAIRS - 1) * TURNS * Math.PI * 2, height = i => i / (PAIRS - 1) * HEIGHT;
    spin.add(beadCloud(PAIRS * 2, i => {
      const pair = i >> 1, a = angle(pair) + (i & 1) * Math.PI;
      return {position: V(Math.cos(a) * RADIUS, height(pair), Math.sin(a) * RADIUS), size: .07, tint: i & 1 ? '#86b8a6' : '#e7c47d'};
    }));
    const rungs = new THREE.InstancedMesh(G.rod, M.beads, PAIRS);
    const at = new THREE.Matrix4(), color = new THREE.Color();
    for (let i = 0; i < PAIRS; i++) {
      const a = angle(i);
      rungs.setMatrixAt(i, at.compose(V(0, height(i), 0), new THREE.Quaternion().setFromUnitVectors(UP, V(Math.cos(a), 0, Math.sin(a))),
        V(.018, RADIUS * 1.72, .018)));
      rungs.setColorAt(i, color.set(['#e8795f', '#f1cc8f', '#7fb39a', '#4a6b94'][Math.floor(rand() * 4)]));
    }
    rungs.computeBoundingBox(); rungs.computeBoundingSphere();
    spin.add(rungs); meshCount++; triangleCount += PAIRS * 24;
    const backbone = kit();
    for (let i = 0; i < PAIRS - 1; i++) for (const offset of [0, Math.PI]) {
      const a = angle(i) + offset, b = angle(i + 1) + offset;
      backbone.rod(darkGold, [Math.cos(a) * RADIUS, height(i), Math.sin(a) * RADIUS],
        [Math.cos(b) * RADIUS, height(i + 1), Math.sin(b) * RADIUS], .012);
    }
    build(backbone.store, spin, 'Helix backbone');
    addMotion(wing, t => {spin.rotation.y = t * .12;},
      {node: spin, of: 'Double Helix', kind: 'spin', axis: 'y', rate: .12});
    hang('Double Helix', wing, root, bounds);
  }

  function whale(wing, z, store) {
    const root = new THREE.Group(); root.position.set(0, 6.9, z);
    const sway = new THREE.Group(); root.add(sway);
    const bones = kit();
    const spine = s => V(0, .2 * Math.sin(Math.PI * s) - .5 * s * s, -3.3 + 7.4 * s);
    for (let i = 0; i <= 46; i++) {
      const s = i / 46, at = spine(s), tangent = spine(Math.min(1, s + .01)).sub(spine(Math.max(0, s - .01))).normalize();
      const thickness = .1 * (1 - .55 * s) + .02, radius = .13 * (1 - .7 * s) + .025;
      bones.rod(M.bone, at.clone().addScaledVector(tangent, -thickness / 2).toArray(), at.clone().addScaledVector(tangent, thickness / 2).toArray(), radius, G.cylinder);
      if (s < .85) bones.rod(M.bone, at.toArray(), at.clone().add(V(0, .22 * (1 - s) + .04, .05)).toArray(), .012);
      if (s > .1 && s < .6) bones.rod(M.bone, at.clone().add(V(-.3 * (1 - s), 0, 0)).toArray(), at.clone().add(V(.3 * (1 - s), 0, 0)).toArray(), .01);
    }
    bones.put(M.bone, G.sphere, matrix([0, .02, -4.05], [.08, 0, 0], [.52, .24, .95]));
    bones.put(M.bone, G.sphere, matrix([0, -.02, -4.85], [.05, 0, 0], [.3, .12, .7]));
    const tube = (points, radius, segments = 12) =>
      bones.put(M.bone, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => V(...p))), segments, radius, 5));
    for (const s of [-1, 1]) {
      tube([[s * .42, -.2, -3.55], [s * .56, -.34, -4.5], [s * .34, -.3, -5.55]], .045);
      for (let i = 0; i < 13; i++) {
        const P = spine(.06 + i * .03), depth = 1 - i / 22;
        tube([[P.x + s * .12, P.y + .02, P.z], [P.x + s * .62 * depth, P.y - .12, P.z + .05],
          [P.x + s * .72 * depth, P.y - .62 * depth, P.z + .12], [P.x + s * .42 * depth, P.y - 1.05 * depth, P.z + .16]], .022, 10);
      }
      const shoulder = spine(.05);
      tube([[s * .42, shoulder.y - .2, shoulder.z], [s * .95, shoulder.y - .7, shoulder.z + .35], [s * 1.35, shoulder.y - .95, shoulder.z + .7]], .04);
      for (let d = 0; d < 4; d++) {
        const spread = (d - 1.5) * .12;
        tube([[s * 1.35, shoulder.y - .95, shoulder.z + .7], [s * (1.62 + spread * .4), shoulder.y - 1.05 + spread, shoulder.z + .95],
          [s * (1.82 + spread * .6), shoulder.y - 1.1 + spread * 1.5, shoulder.z + 1.2]], .018, 8);
      }
    }
    build(bones.store, sway, 'Whale skeleton');
    const bounds = new THREE.Box3(), cables = kit(store, matrix([0, 6.9, z]), bounds);
    for (const s of [.12, .62]) {
      const at = spine(s);
      cables.rod(darkGold, [0, at.y + .15, at.z], [0, vaultAt(0) - 6.9, at.z], .012);
    }
    cables.rod(darkGold, [0, .26, -4.05], [0, vaultAt(0) - 6.9, -4.05], .012);
    addMotion(wing, t => {sway.rotation.z = Math.sin(t * .21) * .008; sway.rotation.y = Math.sin(t * .13) * .012;},
      {node: sway, of: 'Whale Skeleton', kind: 'sway', roll: .008, rollRate: .21, yaw: .012, yawRate: .13});
    hang('Whale Skeleton', wing, root, bounds);
  }

  /**
   * Three jellyfish that swim: each bell pulses, and each rises and sinks on
   * its own line, the line paying out and drawing back as it goes. Their rest
   * heights leave room to sink without the longest tentacles reaching the
   * height of a visitor's head.
   */
  function jellyfish(wing, z) {
    const specs = [{x: -1.3, y: 6.85, dz: -1.8, r: .42, phase: 0, swim: .46},
      {x: .2, y: 7.7, dz: .6, r: .55, phase: 2.1, swim: .42},
      {x: 1.4, y: 6.55, dz: 2.4, r: .36, phase: 4, swim: .5}];
    const root = new THREE.Group(), bounds = new THREE.Box3();
    specs.forEach((spec, index) => {
      const holder = new THREE.Group(); holder.position.set(spec.x, spec.y, z + spec.dz); root.add(holder);
      const body = new THREE.Group(); holder.add(body);
      const jelly = kit(), rand = random(23 + index);
      jelly.put(M.jelly, G.hemisphere, matrix([0, 0, 0], 0, [spec.r, spec.r * .62, spec.r]));
      jelly.put(M.jelly, G.hemisphere, matrix([0, 0, 0], 0, [spec.r * .8, spec.r * .5, spec.r * .8]));
      jelly.put(M.jelly, G.torus, matrix([0, 0, 0], [Math.PI / 2, 0, 0], [spec.r, spec.r, .3]));
      const strand = (radiusAt, drop, radius, waves, segments) => {
        const angle = rand() * Math.PI * 2, points = [];
        for (let i = 0; i <= 5; i++) {
          const t = i / 5, wobble = Math.sin(t * waves + angle) * .08 * t;
          points.push(V(Math.cos(angle) * radiusAt + wobble, -t * drop, Math.sin(angle) * radiusAt + wobble * .6));
        }
        jelly.put(M.jelly, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 4));
      };
      for (let i = 0; i < 4; i++) strand(spec.r * .12, spec.r * 2.2, .024, 5, 16);
      for (let i = 0; i < 10; i++) strand(spec.r * .94, spec.r * 3.8, .006, 7, 12);
      build(jelly.store, body, 'Jellyfish');
      // The line is its own mesh, anchored at the vault: it lengthens as the
      // jellyfish sinks, so the bell is never left hanging off the end of it.
      const anchor = vaultAt(spec.x) - .07, line = new THREE.Mesh(G.rod, darkGold);
      line.scale.set(.004, 1, .004);
      line.position.set(spec.x, 0, z + spec.dz);
      root.add(line); meshCount++; triangleCount += 16;
      bounds.expandByPoint(V(spec.x, anchor, z + spec.dz));
      const top = () => holder.position.y + spec.r * .6;
      addMotion(wing, t => {
        const pulse = Math.sin(t * 1.3 + spec.phase);
        body.scale.set(1 + pulse * .03, 1 - pulse * .05, 1 + pulse * .03);
        // Slow drift up and down, with a little thrust on every contraction.
        holder.position.y = spec.y + Math.sin(t * .23 + spec.phase) * spec.swim - pulse * .045;
        line.position.y = (anchor + top()) / 2;
        line.scale.y = Math.max(.01, anchor - top());
      }, {node: holder, of: 'Jellyfish', kind: 'jelly', pair: index,
        rest: spec.y, phase: spec.phase, swim: spec.swim, radius: spec.r, anchor});
      line.position.y = (anchor + top()) / 2;
      line.scale.y = Math.max(.01, anchor - top());
      // The line is a mesh of its own, so it is a moving part of its own: the
      // native build pays it out and draws it back from the same numbers.
      nativePart(wing, line, {of: 'Jellyfish', kind: 'jellyLine', pair: index,
        rest: spec.y, phase: spec.phase, swim: spec.swim, radius: spec.r, anchor});
    });
    // What the swim comes to over a whole cycle: how far each bell travels, and
    // the lowest any tentacle reaches, which has to stay well above head height.
    const stretch = 1.05, sink = spec => spec.y - spec.swim - .045 - stretch * spec.r * 3.8;
    hang('Jellyfish', wing, root, bounds,
      {swim: {travel: 2 * Math.max(...specs.map(spec => spec.swim)), lowest: Math.min(...specs.map(sink))}});
  }

  // The globe room's two hanging pieces never move, so they merge with its statics.
  /**
   * A Polynesian double-hulled voyaging canoe, the kind that settled the
   * Pacific: two slim dark hulls whose bow and stern pieces sweep up and curl
   * back, a lashed deck between them with a small thatched shelter, and two
   * crab-claw sails — the shape of the Pacific — set across the wind so they
   * read broadside from the floor. Hulls run along z, 4.2 m long.
   */
  function canoe(k) {
    const HULL = lathe([[0, 0], [.05, .12], [.15, .42], [.23, .92], [.27, 1.55], [.28, 2.1],
      [.27, 2.65], [.23, 3.28], [.15, 3.78], [.05, 4.08], [0, 4.2]], 20);
    for (const s of [-1, 1]) {
      const x = s * .84;
      k.put(M.hull, HULL, matrix([x, 0, -2.1], [Math.PI / 2, 0, 0], [.58, 1, .66]));
      // A red strake along each gunwale, the line that makes the hull read.
      k.put(M.strake, G.box, matrix([x, .15, 0], 0, [.3, .05, 3.3]));
      // Bow and stern pieces sweeping up from the hull and curling back.
      for (const end of [-1, 1]) {
        const sweep = new THREE.CatmullRomCurve3([
          V(x, .06, end * 1.9), V(x, .3, end * 2.2), V(x, .62, end * 2.36), V(x, .86, end * 2.3), V(x, .96, end * 2.14)]);
        k.put(M.hull, taperedTube(sweep, t => .085 - .06 * t, 20, 8));
        k.put(M.strake, G.small, matrix([x, .97, end * 2.12], 0, .035));
      }
    }
    // Crossbeams, each lashed to both hulls.
    for (const z of [-1.35, -.45, .45, 1.35]) {
      k.put(M.wood, G.box, matrix([0, .22, z], 0, [2.05, .075, .1]));
      for (const s of [-1, 1]) k.put(M.sennit, G.box, matrix([s * .84, .22, z], 0, [.2, .1, .14]));
    }
    // The deck between the hulls, and a small shelter on it.
    k.put(M.wood, G.box, matrix([0, .28, 0], 0, [1.3, .035, 2.55]));
    for (const s of [-1, 1]) k.put(M.thatch, G.box, matrix([s * .21, .55, -.9], [0, 0, -s * .72], [.5, .04, .7]));
    k.put(M.wood, G.box, matrix([0, .38, -.9], 0, [.62, .2, .66]));
    // Two crab-claw sails: two spars meeting at the foot, the head between
    // their tips curved in like a claw. Set across the hulls at an angle, so
    // the cloth faces the room rather than presenting its edge.
    const claw = new THREE.Shape();
    claw.moveTo(0, 0); claw.lineTo(-.72, 2.45); claw.quadraticCurveTo(.3, 1.45, 1.3, 2.05); claw.lineTo(0, 0);
    const cloth = new THREE.ShapeGeometry(claw, 16);
    for (const [z, turn, lean] of [[.62, -.55, .1], [-.55, -.35, -.06]]) {
      k.rod(M.wood, [0, .28, z], [0, .9, z], .03);
      const sail = k.frame(matrix([0, .5, z], [lean, turn, 0]));
      sail.put(M.sail, cloth);
      sail.rod(M.wood, [0, 0, 0], [-.72, 2.45, 0], .024);
      sail.rod(M.wood, [0, 0, 0], [1.3, 2.05, 0], .024);
      for (let i = 1; i < 4; i++) sail.rod(M.sennit, [-.72 * i / 4, 2.45 * i / 4, 0], [1.3 * i / 4, 2.05 * i / 4, 0], .006);
    }
    // A steering paddle over the stern.
    k.rod(M.wood, [.55, .3, 1.75], [.72, -.5, 2.65], .022);
    k.put(M.wood, G.box, matrix([.76, -.62, 2.78], [.6, 0, .18], [.05, .42, .16]));
  }
  /** A thin wing of muslin with a curved section, as the Wrights built theirs. */
  function cambered(span, chord, camber, ribs) {
    const geometry = new THREE.PlaneGeometry(span, chord, ribs * 2, 8);
    geometry.rotateX(-Math.PI / 2);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const along = p.getZ(i) / chord + .5;          // 0 at the leading edge, 1 at the trailing
      p.setY(i, p.getY(i) + camber * Math.sin(Math.PI * along) * (1 - .35 * along));
    }
    geometry.computeVertexNormals();
    return geometry;
  }
  /**
   * The Wright Flyer of 1903: two cambered muslin wings on spruce, braced with
   * wire; the elevator out in front and twin rudders behind; the engine on the
   * lower wing beside the pilot's cradle; and the two long propellers behind
   * the wings, turned by chains, which are what make it unmistakably itself.
   * The span runs along x, the nose toward negative z.
   */
  function flyer(k) {
    const SPAN = 4, CHORD = .62, RIBS = 14;
    const wing = cambered(SPAN, CHORD, .045, RIBS);
    for (const y of [.42, -.26]) {
      k.put(M.muslin, wing, matrix([0, y, 0]));
      for (const dz of [-.3, .3]) k.rod(M.spruce, [-2, y, dz], [2, y, dz], .012);
      // Ribs showing through the cloth, as they do on the original.
      for (let i = 0; i <= RIBS; i++) {
        const x = -SPAN / 2 + SPAN * i / RIBS;
        k.rod(M.spruce, [x, y + .004, -.3], [x, y + .004, .3], .006);
      }
    }
    // Uprights between the wings, and wire bracing crossed in every bay.
    const posts = [-1.7, -1.05, -.4, .4, 1.05, 1.7];
    for (const x of posts) for (const dz of [-.26, .26]) k.rod(M.spruce, [x, -.25, dz], [x, .41, dz], .01);
    for (let i = 0; i < posts.length - 1; i++) {
      if (posts[i] < 0 && posts[i + 1] > 0) continue;       // the middle bay holds the engine and pilot
      for (const dz of [-.26, .26]) {
        k.rod(M.wire, [posts[i], -.25, dz], [posts[i + 1], .41, dz], .0035);
        k.rod(M.wire, [posts[i], .41, dz], [posts[i + 1], -.25, dz], .0035);
      }
    }
    // The elevator, two small cambered surfaces out in front on outriggers.
    const elevator = cambered(1.3, .34, .025, 4);
    for (const y of [.18, -.02]) k.put(M.muslin, elevator, matrix([0, y, -1.95]));
    for (const s of [-1, 1]) {
      k.rod(M.spruce, [s * .35, -.26, -.3], [s * .25, -.02, -1.9], .01);
      k.rod(M.spruce, [s * .35, .42, -.3], [s * .25, .18, -1.95], .01);
      // Twin rudders behind.
      k.put(M.muslin, G.box, matrix([s * .2, .08, 2], 0, [.012, .62, .36]));
      k.rod(M.spruce, [s * .4, .42, .3], [s * .2, .36, 1.9], .01);
      k.rod(M.spruce, [s * .4, -.26, .3], [s * .2, -.2, 1.9], .01);
      // Skids.
      k.rod(M.spruce, [s * .3, -.45, -1.4], [s * .3, -.45, .6], .012);
      k.rod(M.spruce, [s * .3, -.45, -.2], [s * .3, -.26, -.2], .01);
      // The propellers, behind the wings: two long twisted blades on each
      // hub, driven by a chain from the engine.
      const hub = [s * .85, .08, .48];
      k.put(M.propeller, G.cylinder, matrix(hub, [Math.PI / 2, 0, 0], [.035, .06, .035]));
      for (const blade of [-1, 1]) {
        k.put(M.propeller, G.box, matrix([hub[0], hub[1] + blade * .23, hub[2]], [0, blade * s * .45, 0], [.07, .44, .018]));
      }
      k.rod(M.wire, [.35, -.1, .12], [hub[0], hub[1], hub[2] - .04], .006);
    }
    // The engine on the lower wing, its radiator beside it, and the pilot's hip cradle.
    k.put(M.obsidian, G.box, matrix([.35, -.15, 0], 0, [.24, .18, .3]));
    k.put(M.wire, G.box, matrix([.12, -.02, .02], 0, [.03, .3, .24]));
    k.put(M.spruce, G.box, matrix([-.25, -.2, .04], 0, [.22, .04, .5]));
  }

  // ── More works over the side aisles ─────────────────────────────────────
  // In halls I and II a second rank hangs over each side aisle, level with
  // the chandeliers and one either side of each, clear of the chandelier's
  // crystals and of the centre-line works between them.
  const SIDE_X = 4.75;
  const aisle = (wing, bayIndex, side, y) => [side * SIDE_X, y, bay(wing, bayIndex)];

  /** A cable from `local` on a piece straight up to the vault above it. */
  function cableUp(k, origin, yaw, local, radius = .008) {
    const [dx, dy, dz] = local, worldX = origin[0] + Math.cos(yaw) * dx + Math.sin(yaw) * dz;
    k.rod(darkGold, local, [dx, vaultAt(worldX) - origin[1], dz], radius);
  }
  /** A piece that never moves: merged into its hall's meshes. */
  function fixedPiece(name, wing, store, origin, yaw, make) {
    const bounds = new THREE.Box3(), k = kit(store, matrix(origin, [0, yaw, 0]), bounds);
    make(k, bounds);
    pieces.push({name, kind: 'hanging', wing, bounds});
  }
  /** A piece with moving parts under `root`; its cables and frame still merge. */
  function movingPiece(name, wing, store, origin, make) {
    const root = new THREE.Group(); root.position.set(...origin);
    const bounds = new THREE.Box3();
    make(root, kit(store, matrix(origin), bounds));
    hang(name, wing, root, bounds);
  }
  function instanced(geometry, material, placements) {
    const mesh = new THREE.InstancedMesh(geometry, material, placements.length), color = new THREE.Color();
    placements.forEach(({matrix: placed, tint}, i) => {
      mesh.setMatrixAt(i, placed);
      if (tint) mesh.setColorAt(i, color.set(tint));
    });
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    meshCount++;
    triangleCount += placements.length * (geometry.index ? geometry.index.count : geometry.attributes.position.count) / 3;
    return mesh;
  }

  // Hall I
  function saturn(wing, store, origin) {
    fixedPiece('Saturn', wing, store, origin, 0, k => {
      cableUp(k, origin, 0, [0, .64, 0], .012);
      const planet = k.frame(matrix([0, 0, 0], [.47, 0, .22]));
      planet.put(M.saturn, G.sphere, matrix([0, 0, 0], 0, [.72, .65, .72]));
      for (const lat of [-.42, -.12, .2, .5]) {
        const r = .72 * Math.cos(lat) + .004;
        planet.put(darkGold, G.hoop, matrix([0, .65 * Math.sin(lat), 0], [Math.PI / 2, 0, 0], [r, r, r * 1.6]));
      }
      // The rings, with the Cassini Division between the two broad bands.
      planet.put(M.saturn, G.annulusInner, matrix([0, 0, 0], [-Math.PI / 2, 0, 0], .72));
      planet.put(M.saturn, G.annulusOuter, matrix([0, 0, 0], [-Math.PI / 2, 0, 0], .72));
    });
  }

  function firstAtoms(wing, store, origin) {
    movingPiece('First Atoms', wing, store, origin, (root, fixed) => {
      cableUp(fixed, origin, 0, [0, .3, 0], .01);
      const nucleons = [[0, 0, 0], [.2, .02, 0], [-.1, .17, .02], [-.1, -.16, .03], [.06, .08, .18], [.05, -.09, -.18], [-.15, .01, -.16]];
      nucleons.forEach((at, i) => fixed.put(i < 3 ? M.bronze : M.bone, G.small, matrix(at, 0, .135)));
      const orbits = [0, 1, 2].map(i => new THREE.Quaternion().setFromEuler(new THREE.Euler(.35, i * Math.PI * 2 / 3, .95)));
      const R = 1.12;
      for (const turn of orbits) fixed.put(gold, G.ring, new THREE.Matrix4().compose(V(), turn.clone().multiply(
        new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0))), V(R, R, R)));
      // Each electron is a bead on an arm that turns: one group tilted to its
      // orbit, one turning inside it. Held as instances of a single mesh whose
      // matrices were rewritten every frame, they could not cross into the
      // native build at all — an exporter can animate a node and nothing else.
      orbits.forEach((turn, i) => {
        const tilt = new THREE.Group(); tilt.quaternion.copy(turn); root.add(tilt);
        const arm = new THREE.Group(); tilt.add(arm);
        const bead = kit();
        bead.put(M.glow, G.small, matrix([R, 0, 0], 0, .075));
        build(bead.store, arm, 'Electron');
        // Turning the arm by -a puts the bead where the museum has always had
        // it: at (cos a, 0, sin a) on its own tilted circle.
        addMotion(wing, t => {arm.rotation.y = -(t * .7 + i * 2.1);},
          {node: arm, of: 'First Atoms', kind: 'spin', axis: 'y', rate: -.7, phase: -i * 2.1});
      });
      // The electrons' paths are known, so widen the merged bounds to the whole of each orbit.
      for (const turn of orbits) for (let a = 0; a < 16; a++) {
        fixed.bounds.expandByPoint(V(Math.cos(a / 16 * Math.PI * 2) * R, 0, Math.sin(a / 16 * Math.PI * 2) * R)
          .applyQuaternion(turn).add(V(...origin)));
      }
    });
  }

  function pulsar(wing, store, origin) {
    movingPiece('Pulsar', wing, store, origin, (root, fixed) => {
      cableUp(fixed, origin, 0, [0, .22, 0], .01);
      const spin = new THREE.Group(); root.add(spin);
      const star = kit(), axis = V(Math.sin(.5), Math.cos(.5), 0);
      star.put(M.glow, G.sphere, matrix([0, 0, 0], 0, .22));
      for (const end of [1, -1]) {
        const out = axis.clone().multiplyScalar(end), L = 1.25;
        star.put(M.beam, G.cone, new THREE.Matrix4().compose(out.clone().multiplyScalar(.2 + L / 2),
          new THREE.Quaternion().setFromUnitVectors(UP, out.clone().negate()), V(.34, L, .34)));
      }
      // Field lines: loops through the star, fanned around its magnetic axis.
      const toAxis = new THREE.Quaternion().setFromUnitVectors(UP, axis);
      for (let i = 0; i < 6; i++) {
        const loop = new THREE.Matrix4().compose(V(), toAxis.clone().multiply(new THREE.Quaternion().setFromAxisAngle(UP, i * Math.PI / 3)), V(1, 1, 1))
          .multiply(matrix([.5, 0, 0], 0, [.5, .78, .5]));
        star.put(gold, G.ring, loop);
      }
      build(star.store, spin, 'Pulsar');
      addMotion(wing, t => {spin.rotation.y = t * .9;},
        {node: spin, of: 'Pulsar', kind: 'spin', axis: 'y', rate: .9});
    });
  }

  function binaryStar(wing, store, origin) {
    movingPiece('Binary Star', wing, store, origin, (root, fixed) => {
      cableUp(fixed, origin, 0, [0, .06, 0], .01);
      const tilt = [.28, 0, 0], big = .72, small = 1.12;
      const plane = fixed.frame(matrix([0, 0, 0], tilt));
      plane.put(gold, G.ring, matrix([0, 0, 0], [Math.PI / 2, 0, 0], big));
      plane.put(gold, G.ring, matrix([0, 0, 0], [Math.PI / 2, 0, 0], small));
      plane.put(gold, G.small, matrix([0, 0, 0], 0, .05));
      for (const r of [big, small]) for (let a = 0; a < 16; a++) {
        fixed.bounds.expandByPoint(V(Math.cos(a / 16 * Math.PI * 2) * r, 0, Math.sin(a / 16 * Math.PI * 2) * r)
          .applyEuler(new THREE.Euler(...tilt)).add(V(...origin)));
      }
      const tiltGroup = new THREE.Group(); tiltGroup.rotation.set(...tilt); root.add(tiltGroup);
      const arm = new THREE.Group(); tiltGroup.add(arm);
      const pair = kit();
      pair.rod(darkGold, [-big, 0, 0], [small, 0, 0], .012);
      pair.put(M.glow, G.sphere, matrix([-big, 0, 0], 0, .3));
      pair.put(M.blueStar, G.sphere, matrix([small, 0, 0], 0, .19));
      build(pair.store, arm, 'Binary star');
      addMotion(wing, t => {arm.rotation.y = t * .35;},
        {node: arm, of: 'Binary Star', kind: 'spin', axis: 'y', rate: .35});
    });
  }

  function stellarNursery(wing, store, origin) {
    movingPiece('Stellar Nursery', wing, store, origin, (root, fixed) => {
      // A gilt hoop and harness carry the cloud, so no cable passes through it.
      const hoop = 1.55, apex = [0, 1.45, 0];
      fixed.put(gold, G.hoop, matrix([0, -.1, 0], [Math.PI / 2, 0, 0], hoop));
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 + .4;
        fixed.rod(darkGold, [Math.cos(a) * hoop, -.1, Math.sin(a) * hoop], apex, .008);
      }
      cableUp(fixed, origin, 0, apex, .01);
      const spin = new THREE.Group(); root.add(spin);
      const rand = random(47), blobs = [[-.55, .1, .1, .55], [.35, -.05, -.2, .6], [.1, .35, .3, .4], [.75, .25, .15, .32]];
      const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
      spin.add(beadCloud(520, i => {
        if (i < 14) return {position: V((rand() - .5) * 1.8, (rand() - .5) * .7, (rand() - .5) * 1.2), size: .045 + rand() * .03, tint: '#ffffff'};
        const [bx, by, bz, r] = blobs[i % blobs.length], hydrogen = rand() < .62;
        return {position: V(bx + gauss() * r * 1.25, by + gauss() * r * .7, bz + gauss() * r * 1.25),
          size: .018 + rand() * .026, tint: hydrogen ? (rand() < .5 ? '#ff8fb0' : '#e0607e') : (rand() < .5 ? '#6fd6c9' : '#9ce8f0')};
      }));
      addMotion(wing, t => {spin.rotation.y = t * .04;},
        {node: spin, of: 'Stellar Nursery', kind: 'spin', axis: 'y', rate: .04});
    });
  }

  // Orion, as seen from Earth: each star at its place on the sky, one degree to 15 cm.
  const ORION = {
    Betelgeuse: [-5.5, 7.4, '#ffb173', .1], Bellatrix: [1.95, 6.35, '#dfe8ff', .07], Meissa: [-.5, 9.9, '#e8eeff', .05],
    Alnitak: [-1.95, -1.94, '#e3eaff', .065], Alnilam: [-.75, -1.2, '#e8eeff', .07], Mintaka: [.3, -.3, '#e3eaff', .06],
    Saiph: [-3.7, -9.67, '#dce6ff', .065], Rigel: [4.6, -8.2, '#cfe0ff', .1]
  };
  const ORION_LINES = [['Meissa', 'Betelgeuse'], ['Meissa', 'Bellatrix'], ['Betelgeuse', 'Bellatrix'], ['Betelgeuse', 'Alnitak'],
    ['Bellatrix', 'Mintaka'], ['Alnitak', 'Alnilam'], ['Alnilam', 'Mintaka'], ['Alnitak', 'Saiph'], ['Mintaka', 'Rigel']];
  function constellation(wing, store, origin, yaw) {
    fixedPiece('Orion', wing, store, origin, yaw, (k, bounds) => {
      const depth = {Betelgeuse: .2, Rigel: -.25, Alnilam: -.35, Meissa: .1, Saiph: -.1};
      const at = name => {const [x, y] = ORION[name]; return [x * .15, y * .15, depth[name] || 0];};
      for (const [a, b] of ORION_LINES) k.rod(gold, at(a), at(b), .016);
      for (const name of ['Meissa', 'Betelgeuse', 'Bellatrix']) cableUp(k, origin, yaw, at(name), .006);
      const base = matrix(origin, [0, yaw, 0]), rand = random(53), placements = [];
      for (const [name, [, , tint, size]] of Object.entries(ORION)) {
        placements.push({matrix: base.clone().multiply(matrix(at(name), 0, size * 1.7)), tint});
      }
      // The Orion Nebula, in the hunter's sword below the belt.
      for (let i = 0; i < 26; i++) {
        placements.push({matrix: base.clone().multiply(matrix([-.09 + (rand() - .5) * .22, -.81 + (rand() - .5) * .3, (rand() - .5) * .15], 0, .026 + rand() * .026)),
          tint: rand() < .6 ? '#ff9ab8' : '#8fe3ea'});
      }
      const stars = instanced(G.small, M.starlight, placements);
      halls[wing].add(stars);
      bounds.union(stars.boundingBox);
    });
  }

  // Hall II
  function mantaRay(wing, store, origin) {
    fixedPiece('Manta Ray', wing, store, origin, 0, ray => {
      for (const s of [-1, 1]) cableUp(ray, origin, 0, [s * .42, .08, 0], .006);
      // A lofted wing: thick at the body, thin at the swept tips, upper and lower skins.
      const U = 26, W = 10, skins = {};
      for (const sign of [1, -1]) {
        const positions = [], index = [], start = 0;
        for (let i = 0; i <= U; i++) for (let j = 0; j <= W; j++) {
          const u = i / U * 2 - 1, v = j / W, a = Math.abs(u);
          const lead = -.62 + .8 * Math.pow(a, 1.4), trail = .42 - .12 * a + .1 * a ** 3;
          const thick = .14 * (1 - Math.pow(a, 1.6)) * Math.pow(Math.sin(Math.PI * v), .7) + .004;
          positions.push(u * 1.3, .16 * a * a + sign * thick * (sign > 0 ? .6 : .4), lead + (trail - lead) * v);
        }
        for (let i = 0; i < U; i++) for (let j = 0; j < W; j++) {
          const a = start + i * (W + 1) + j, b = a + W + 1;
          if (sign > 0) index.push(a, a + 1, b, a + 1, b + 1, b); else index.push(a, b, a + 1, a + 1, b, b + 1);
        }
        const skin = new THREE.BufferGeometry();
        skin.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        skin.setIndex(index); skin.computeVertexNormals();
        skins[sign] = skin;
      }
      ray.put(M.manta, skins[1]);
      ray.put(M.bone, skins[-1]);
      for (const s of [-1, 1]) ray.put(M.manta, G.small, matrix([s * .22, 0, -.64], [0, s * .25, 0], [.045, .03, .15]));
      ray.rod(M.manta, [0, .01, .42], [0, .03, 1.35], .012);
    });
  }

  function seaTurtle(wing, store, origin) {
    fixedPiece('Sea Turtle', wing, store, origin, 0, k => {
      for (const dz of [-.5, .5]) cableUp(k, origin, 0, [0, .36, dz], .006);
      const t = k.frame(matrix([0, 0, 0], 0, 1.25)), A = .58, H = .26, B = .74;
      t.put(M.wood, G.hemisphere, matrix([0, 0, 0], 0, [A, H, B]));
      t.put(M.bone, G.hemisphere, matrix([0, 0, 0], [Math.PI, 0, 0], [A * .95, .07, B * .95]));
      const scute = (x, z, size) => {
        const y = H * Math.sqrt(Math.max(0, 1 - (x / A) ** 2 - (z / B) ** 2));
        const normal = V(x / A ** 2, y / H ** 2, z / B ** 2).normalize();
        t.put(M.fossilDark, G.hexPrism, new THREE.Matrix4().compose(V(x, y, z), new THREE.Quaternion().setFromUnitVectors(UP, normal), V(size, .02, size * 1.1)));
      };
      for (const z of [-.44, -.22, 0, .22, .44]) scute(0, z, .11);
      for (const s of [-1, 1]) for (const z of [-.33, -.11, .11, .33]) scute(s * .27, z, .1);
      // Heading toward later time, down the hall.
      t.put(M.fossil, G.small, matrix([0, .01, -.7], 0, [.1, .08, .12]));
      t.put(M.fossil, G.sphere, matrix([0, .03, -.84], 0, [.13, .11, .18]));
      for (const s of [-1, 1]) {
        t.put(M.fossil, G.sphere, matrix([s * .74, -.02, -.36], [0, s * .55, -s * .12], [.6, .035, .15]));
        t.put(M.fossil, G.sphere, matrix([s * .42, -.03, .62], [0, -s * .6, 0], [.22, .03, .1]));
      }
      t.put(M.fossil, G.cone, matrix([0, -.01, .8], [Math.PI / 2, 0, 0], [.04, .12, .03]));
    });
  }

  function pterosaur(wing, store, origin) {
    fixedPiece('Pterosaur', wing, store, origin, 0, k => {
      for (const s of [-1, 1]) cableUp(k, origin, 0, [s * .9, .04, 0], .006);
      cableUp(k, origin, 0, [0, .38, -1.0], .006);
      const neck = new THREE.CatmullRomCurve3([V(0, .04, -.24), V(0, .22, -.58), V(0, .32, -.95)]);
      k.put(M.wood, G.sphere, matrix([0, 0, 0], 0, [.13, .12, .34]));
      k.put(M.wood, taperedTube(neck, s => .065 - .03 * s, 16, 8));
      k.put(M.wood, G.sphere, matrix([0, .34, -1.02], 0, [.07, .09, .16]));
      k.put(M.bone, G.cone, matrix([0, .31, -1.5], [-Math.PI / 2, 0, 0], [.05, .72, .06]));
      k.put(M.coral, G.cone, matrix([0, .5, -.85], [1.05, 0, 0], [.015, .42, .1]));
      for (const side of [-1, 1]) {
        const w = k.frame(matrix([side * .1, .02, 0], [0, 0, side * .08]));
        const s = new THREE.Shape(), X = side * 1.8;
        s.moveTo(0, -.08); s.lineTo(side * .55, -.12); s.lineTo(side * .9, -.02);
        s.quadraticCurveTo(side * 1.45, .02, X, .1); s.quadraticCurveTo(side * 1.1, .28, side * .55, .42);
        s.quadraticCurveTo(side * .25, .5, side * .1, .38); s.lineTo(0, .1);
        w.put(M.membrane, new THREE.ShapeGeometry(s, 8), matrix([0, 0, 0], [Math.PI / 2, 0, 0]));
        const bones = [[0, -.08, .032], [side * .55, -.12, .026], [side * .9, -.02, .016], [X, .1, .006]];
        for (let i = 1; i < bones.length; i++) w.rod(M.wood, [bones[i - 1][0], .01, bones[i - 1][1]], [bones[i][0], .01, bones[i][1]], bones[i - 1][2]);
        k.rod(M.wood, [side * .08, -.04, .25], [side * .14, -.1, .58], .018);
      }
    });
  }

  function shoal(wing, store, origin) {
    movingPiece('Shoal of Fish', wing, store, origin, (root, fixed) => {
      const hoop = 1.0, apex = [0, 1.25, 0];
      fixed.put(gold, G.hoop, matrix([0, .55, 0], [Math.PI / 2, 0, 0], hoop));
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3;
        fixed.rod(darkGold, [Math.cos(a) * hoop, .55, Math.sin(a) * hoop], apex, .007);
      }
      cableUp(fixed, origin, 0, apex, .01);
      const fish = kit();
      fish.put(M.beads, G.tiny, matrix([0, 0, 0], 0, [.035, .07, .17]));
      fish.put(M.beads, G.cone, matrix([0, 0, -.22], [Math.PI / 2, 0, 0], [.012, .12, .07]));
      const body = merge(fish.store.get(M.beads)), rand = random(61), placements = [];
      for (let i = 0; i < 72; i++) {
        const a = i / 72 * Math.PI * 2 + rand() * .15, r = .85 + (rand() - .5) * .45, y = (rand() - .5) * .7;
        placements.push({matrix: new THREE.Matrix4().compose(V(Math.cos(a) * r, y, Math.sin(a) * r),
          new THREE.Quaternion().setFromAxisAngle(UP, -a), V(1, 1, 1)), tint: ['#dbe6ee', '#a9bfd0', '#eef3f5', '#c3d0d8'][i % 4]});
      }
      const ring = new THREE.Group(); root.add(ring);
      const school = instanced(body, M.beads, placements);
      ring.add(school);
      fixed.bounds.union(school.boundingBox.clone().translate(V(...origin)));
      addMotion(wing, t => {ring.rotation.y = -t * .22;},
        {node: ring, of: 'Fish School', kind: 'spin', axis: 'y', rate: -.22});
    });
  }

  /**
   * Flyers held still on threads, only their wings beating: one instanced
   * mesh for the bodies and one for every wing, left wings mirrored.
   */
  function wingedFlock(name, wing, store, origin, {bodyParts, wingShape, spots, beat, tint, bodyTint}) {
    movingPiece(name, wing, store, origin, (root, fixed) => {
      const bodyKit = kit();
      bodyParts(bodyKit);
      const bodyGeometry = merge(bodyKit.store.get(M.flyer));
      const wingGeometry = new THREE.ShapeGeometry(wingShape(), 6); wingGeometry.rotateX(Math.PI / 2);
      const bases = spots.map(({position, yaw}) => new THREE.Matrix4().compose(V(...position), new THREE.Quaternion().setFromAxisAngle(UP, yaw), V(1, 1, 1)));
      for (const {position} of spots) cableUp(fixed, origin, 0, [position[0], position[1] + .04, position[2]], .003);
      const bodies = instanced(bodyGeometry, M.flyer, bases.map((matrix0, i) => ({matrix: matrix0, tint: bodyTint(i)})));
      const wings = instanced(wingGeometry, M.flyer, spots.flatMap((spot, i) => [{matrix: new THREE.Matrix4(), tint: tint(i)}, {matrix: new THREE.Matrix4(), tint: tint(i)}]));
      wings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      root.add(bodies, wings);
      const joint = new THREE.Matrix4(), out = new THREE.Matrix4(), q = new THREE.Quaternion(), Z = V(0, 0, 1);
      const pose = t => {
        bases.forEach((base, i) => {
          const lift = beat(t, i);
          for (const side of [1, -1]) {
            joint.compose(V(side * .012, 0, 0), q.setFromAxisAngle(Z, side * lift), V(side, 1, 1));
            wings.setMatrixAt(i * 2 + (side > 0 ? 0 : 1), out.multiplyMatrices(base, joint));
          }
        });
        wings.instanceMatrix.needsUpdate = true;
      };
      pose(0);
      wings.computeBoundingBox();
      fixed.bounds.union(wings.boundingBox.clone().expandByScalar(.35).translate(V(...origin)));
      fixed.bounds.union(bodies.boundingBox.clone().translate(V(...origin)));
      addMotion(wing, pose);
    });
  }

  function birds(wing, store, origin) {
    const spots = [];
    for (let i = 0; i < 9; i++) {
      const rank = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      spots.push({position: [side * rank * .36, -rank * .05, -.84 + rank * .42], yaw: 0});
    }
    wingedFlock('Flight of Geese', wing, store, origin, {
      spots,
      bodyParts: b => {
        b.put(M.flyer, G.tiny, matrix([0, 0, 0], 0, [.055, .05, .2]));
        b.put(M.flyer, G.tiny, matrix([0, .03, -.3], 0, [.032, .032, .05]));
        b.rod(M.flyer, [0, .005, -.16], [0, .03, -.29], .018);
        b.put(M.flyer, G.cone, matrix([0, .025, -.37], [-Math.PI / 2, 0, 0], [.012, .07, .012]));
        b.put(M.flyer, G.cone, matrix([0, 0, .24], [-Math.PI / 2, 0, 0], [.06, .12, .012]));
      },
      wingShape: () => {
        const s = new THREE.Shape();
        s.moveTo(0, -.07); s.quadraticCurveTo(.26, -.1, .52, .03); s.quadraticCurveTo(.3, .04, 0, .1); s.lineTo(0, -.07);
        return s;
      },
      beat: (t, i) => Math.sin(t * 2.6 + i * .7) * .45,
      tint: i => i ? '#ded6c6' : '#cfc3ad',
      bodyTint: i => i % 3 ? '#b9ad98' : '#8f836f'
    });
  }

  function butterflies(wing, store, origin) {
    const rand = random(71), spots = [];
    for (let i = 0; i < 24; i++) {
      const a = i * 2.4, r = .45 + rand() * .6;
      spots.push({position: [Math.cos(a) * r, -.75 + i / 23 * 1.5 + (rand() - .5) * .2, Math.sin(a) * r], yaw: -a + (rand() - .5) * .6});
    }
    const colours = ['#f08a24', '#f2b632', '#3d7fe0', '#62b8e8', '#f4e7c6', '#e05a3a'];
    wingedFlock('Butterflies', wing, store, origin, {
      spots,
      bodyParts: b => b.put(M.flyer, G.tiny, matrix([0, 0, 0], 0, [.018, .018, .11])),
      wingShape: () => {
        const s = new THREE.Shape();
        s.moveTo(0, 0);
        s.bezierCurveTo(.03, -.12, .2, -.2, .22, -.1);
        s.bezierCurveTo(.23, -.02, .12, 0, .1, .01);
        s.bezierCurveTo(.2, .05, .17, .17, .08, .16);
        s.bezierCurveTo(.03, .15, 0, .06, 0, 0);
        return s;
      },
      beat: (t, i) => .25 + .95 * (.5 + .5 * Math.sin(t * 4.2 + i * 1.3)),
      tint: i => colours[i % colours.length],
      bodyTint: () => '#2a2420'
    });
  }

  // Globe room: craft that carried people further, all still, all merged.
  function balloon(k) {
    const profile = [[0, -.95], [.26, -.9], [.52, -.58], [.82, .02], [.94, .55], [.88, 1.0], [.62, 1.36], [.3, 1.53], [0, 1.57]];
    for (let g = 0; g < 12; g++) {
      k.put(g % 2 ? gold : M.lapis, lathe(profile, 3, g * Math.PI / 6, Math.PI / 6));
    }
    k.put(darkGold, G.hoop, matrix([0, .55, 0], [Math.PI / 2, 0, 0], [.95, .95, 3]));
    k.put(darkGold, G.hoop, matrix([0, -.9, 0], [Math.PI / 2, 0, 0], .27));
    // Rigging from the throat ring down to a wicker basket.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2;
      k.rod(M.wood, [Math.cos(a) * .26, -.92, Math.sin(a) * .26], [Math.cos(a) * .2, -1.45, Math.sin(a) * .2], .006);
    }
    k.put(M.wood, G.cylinder, matrix([0, -1.6, 0], 0, [.24, .3, .24]));
    k.put(darkGold, G.hoop, matrix([0, -1.45, 0], [Math.PI / 2, 0, 0], .245));
  }

  function sputnik(k) {
    k.put(M.silver, G.sphere, matrix([0, 0, 0], 0, .5));
    k.put(darkGold, G.hoop, matrix([0, 0, 0], [0, Math.PI / 2, 0], [.505, .505, .6]));
    // Four whip antennas, swept back from the front half, two long and two short.
    for (const [x, y, length] of [[.3, .3, 2.45], [-.3, .3, 2.0], [.3, -.3, 2.0], [-.3, -.3, 2.45]]) {
      const base = V(x, y, -.28).normalize().multiplyScalar(.5), direction = V(x * 1.6, y * 1.6, 1).normalize();
      k.put(M.silver, G.cylinder, new THREE.Matrix4().compose(base.clone().addScaledVector(direction, .06),
        new THREE.Quaternion().setFromUnitVectors(UP, direction), V(.035, .12, .035)));
      k.rod(M.silver, base.toArray(), base.clone().addScaledVector(direction, length).toArray(), .01);
    }
  }

  /**
   * The James Webb Space Telescope: eighteen gold hexagons in a honeycomb with
   * no segment at its centre, the secondary mirror on its tripod, and the
   * five-layer sunshield spread below with the bus and solar array beneath it.
   * Built mirror upward and tilted back, the way the telescope flies with its
   * shield always between the mirror and the Sun.
   */
  function webbTelescope(k, origin, yaw) {
    // Hung tipped past the vertical, so the gold face looks down into the room
    // and the sunshield stands above it, between the mirror and the vault.
    const R = .26, step = R * Math.sqrt(3), TILT = 2.3;
    const craft = k.frame(matrix([0, 0, 0], [TILT, 0, 0]));
    const lift = point => V(...point).applyEuler(new THREE.Euler(TILT, 0, 0)).toArray();
    // Axial coordinates on the honeycomb: the six segments around the empty
    // centre, then the twelve outside them.
    const e1 = V(Math.sin(Math.PI / 6), 0, Math.cos(Math.PI / 6)).multiplyScalar(step), e2 = V(step, 0, 0);
    const segmentAt = ([q, r]) => e1.clone().multiplyScalar(q).addScaledVector(e2, r);
    const cells = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1],
      [2, 0], [1, 1], [0, 2], [-1, 2], [-2, 2], [-2, 1], [-2, 0], [-1, -1], [0, -2], [1, -2], [2, -2], [2, -1]];
    // The backplane, then each segment on its own three-point mount.
    craft.put(M.fossilDark, G.hexPrism, matrix([0, -.13, 0], 0, [step * 1.62, .06, step * 1.62]));
    for (const cell of cells) {
      const at = segmentAt(cell);
      craft.put(M.fossilDark, G.hexPrism, matrix([at.x, -.045, at.z], 0, [R * .99, .04, R * .99]));
      craft.put(gold, G.hexPrism, matrix([at.x, .005, at.z], 0, [R * .95, .022, R * .95]));
    }
    // Three struts carry the secondary mirror out in front of the primary.
    const boom = [0, 1.15, .1];
    for (const cell of [[2, -1], [-2, 1], [0, -2]]) {
      const at = segmentAt(cell);
      craft.rod(M.silver, [at.x * .92, .02, at.z * .92], boom, .013);
    }
    craft.put(M.fossilDark, G.hexPrism, matrix([boom[0], boom[1] + .035, boom[2]], 0, [.18, .04, .18]));
    craft.put(gold, G.hexPrism, matrix(boom, 0, [.155, .025, .155]));
    // The instrument module behind the mirror, and the tower down to the bus.
    craft.put(M.silver, G.box, matrix([0, -.3, -.1], 0, [.8, .3, .62]));
    craft.rod(M.silver, [0, -.42, -.06], [0, -.78, -.06], .05);
    // The sunshield: five kite-shaped layers, the widest on top.
    const kite = (width, length) => {
      const shape = new THREE.Shape();
      shape.moveTo(0, length * .54);
      shape.quadraticCurveTo(width * .42, length * .3, width / 2, 0);
      shape.quadraticCurveTo(width * .36, -length * .34, 0, -length * .46);
      shape.quadraticCurveTo(-width * .36, -length * .34, -width / 2, 0);
      shape.quadraticCurveTo(-width * .42, length * .3, 0, length * .54);
      return new THREE.ShapeGeometry(shape, 10);
    };
    const shield = craft.frame(matrix([0, -.86, -.06], [Math.PI / 2 - .12, 0, 0]));
    for (let layer = 0; layer < 5; layer++) {
      const scale = 1 - layer * .05, width = 2.5 * scale, length = 1.95 * scale;
      shield.put(layer ? M.kapton : M.silver, kite(width, length), matrix([0, 0, layer * .085]));
      // A spar along the long axis of each layer holds it taut.
      shield.rod(M.silver, [-width / 2, 0, layer * .085], [width / 2, 0, layer * .085], .012);
    }
    // The bus, its solar array and the high-gain antenna, under the shield.
    const bus = craft.frame(matrix([0, -1.12, -.04]));
    bus.put(M.silver, G.hexPrism, matrix([0, 0, 0], 0, [.3, .18, .3]));
    bus.put(M.fossilDark, G.hexPrism, matrix([0, -.11, 0], 0, [.25, .05, .25]));
    bus.put(M.lapis, G.box, matrix([0, -.14, .58], [.2, 0, 0], [1.0, .03, .66]));
    bus.rod(M.silver, [0, -.08, .16], [0, -.12, .3], .022);
    bus.put(M.silver, lathe([[0, 0], [.09, .015], [.17, .055], [.22, .12]], 14), matrix([.22, -.1, -.16], [2.5, 0, .5]));
    bus.rod(M.silver, [.22, -.02, -.16], [.1, -.02, -.06], .012);
    // Three lines to the vault, from the back of the mirror's rim.
    for (const point of [[0, .02, step * 1.95], [step * 1.7, .02, -step * .95], [-step * 1.7, .02, -step * .95]]) {
      cableUp(k, origin, yaw, lift(point), .007);
    }
  }

  function airship(k, origin, yaw = 0) {
    const profile = [];
    for (let i = 0; i <= 18; i++) {
      const y = -2.2 + i / 18 * 4.4, t = y / 2.2;
      profile.push([.62 * Math.pow(Math.max(0, 1 - t * t), t < 0 ? .42 : .6), y]);
    }
    const hull = k.frame(matrix([0, 0, 0], [0, 0, Math.PI / 2]));
    hull.put(M.silver, lathe(profile, 24));
    for (const y of [-1.5, -.8, 0, .8, 1.5]) {
      const r = .62 * Math.pow(1 - (y / 2.2) ** 2, y < 0 ? .42 : .6) + .004;
      hull.put(darkGold, G.ring, matrix([0, y, 0], [Math.PI / 2, 0, 0], r));
    }
    for (let i = 0; i < 4; i++) {
      hull.put(M.silver, G.box, matrix([0, -1.75, 0], [0, i * Math.PI / 2, 0], 1).multiply(matrix([.42, 0, 0], [0, 0, .12], [.5, .6, .02])));
    }
    k.put(M.wood, G.box, matrix([-.75, -.66, 0], 0, [.85, .2, .26]));
    k.put(M.obsidian, G.box, matrix([-.75, -.66, 0], 0, [.72, .06, .27]));
    for (const s of [-1, 1]) {
      k.rod(darkGold, [-.2, -.5, s * .2], [.05, -.72, s * .62], .008);
      k.put(M.silver, G.sphere, matrix([.1, -.74, s * .66], 0, [.2, .08, .08]));
      k.put(M.wood, G.box, matrix([.31, -.74, s * .66], 0, [.02, .34, .04]));
    }
    for (const x of [-1.2, 1.1]) cableUp(k, origin, yaw, [x, .6, 0], .007);
  }

  function leonardoWings(k, origin, yaw = 0) {
    k.put(M.wood, G.box, matrix([0, 0, 0], 0, [.46, .05, 1.3]));
    k.put(M.wood, G.hoop, matrix([0, .22, -.25], [0, Math.PI / 2, 0], [.2, .2, .5]));
    for (const s of [-1, 1]) {
      const w = k.frame(matrix([s * .2, .12, -.2], [0, 0, s * .22]));
      const spar = s * 1.75, shape = new THREE.Shape();
      shape.moveTo(0, -.05); shape.lineTo(spar, -.08);
      // A scalloped trailing edge between five ribs, like a bat's wing.
      const ribs = [[spar * .98, .25], [spar * .72, .72], [spar * .46, .95], [spar * .22, .98], [0, .8]];
      let last = [spar, -.08];
      for (const [x, y] of ribs) {
        shape.quadraticCurveTo((last[0] + x) / 2, (last[1] + y) / 2 - .12, x, y);
        last = [x, y];
      }
      shape.lineTo(0, -.05);
      w.put(M.cloth, new THREE.ShapeGeometry(shape, 6), matrix([0, 0, 0], [Math.PI / 2, 0, 0]));
      w.rod(M.wood, [0, .01, -.05], [spar, .01, -.08], .03);
      for (const [x, y] of ribs) w.rod(M.wood, [spar * .55, .01, -.07], [x, .01, y], .012);
      k.rod(M.wood, [s * .1, .22, -.25], [s * .8, .3, -.18], .014);
    }
    const tail = new THREE.Shape();
    tail.moveTo(0, 0); tail.lineTo(-.45, .75); tail.quadraticCurveTo(0, .9, .45, .75); tail.lineTo(0, 0);
    k.put(M.cloth, new THREE.ShapeGeometry(tail, 6), matrix([0, .02, .6], [Math.PI / 2, 0, 0]));
    for (const x of [-.4, 0, .4]) k.rod(M.wood, [0, .03, .6], [x, .03, 1.35], .01);
    for (const x of [-1.3, 1.3]) cableUp(k, origin, yaw, [x, .12 + Math.abs(x) * .22, -.2], .006);
  }

  function lunarModule(k, origin, yaw = 0) {
    k.put(gold, new THREE.CylinderGeometry(.62, .62, .5, 8), matrix([0, 0, 0], [0, Math.PI / 8, 0]));
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + i * Math.PI / 2, out = V(Math.cos(a), 0, Math.sin(a));
      const hip = out.clone().multiplyScalar(.55).add(V(0, .12, 0)), foot = out.clone().multiplyScalar(1.02).add(V(0, -.62, 0));
      k.rod(M.silver, hip.toArray(), foot.toArray(), .025);
      k.rod(M.silver, out.clone().multiplyScalar(.6).add(V(0, -.2, 0)).toArray(), foot.clone().add(V(0, .12, 0)).toArray(), .014);
      k.put(M.silver, G.cylinder, matrix(foot.toArray(), 0, [.13, .03, .13]));
    }
    k.put(M.silver, G.box, matrix([0, .58, .05], 0, [.86, .62, .66]));
    k.put(M.silver, new THREE.CylinderGeometry(.3, .3, .5, 10), matrix([0, .6, -.36], [Math.PI / 2, 0, 0]));
    for (const s of [-1, 1]) k.put(M.obsidian, G.box, matrix([s * .14, .72, -.62], [0, 0, s * .5], [.14, .1, .02]));
    k.put(M.obsidian, G.box, matrix([0, .38, -.61], 0, [.28, .3, .02]));
    k.put(M.silver, G.cylinder, matrix([0, .96, .05], 0, [.2, .14, .2]));
    for (const [x, z] of [[-.47, -.3], [.47, -.3], [-.47, .38], [.47, .38]]) k.put(M.silver, G.box, matrix([x, .72, z], 0, [.08, .08, .08]));
    k.rod(M.silver, [.25, .9, .3], [.45, 1.15, .45], .01);
    k.put(M.silver, G.hemisphere, matrix([.45, 1.15, .45], [-.6, 0, .4], [.14, .05, .14]));
    for (const x of [-.3, .3]) cableUp(k, origin, yaw, [x, .89, .05], .006);
  }

  // ── Works where the benches stood: bays 2 and 4 of halls I and II ──────
  function etchedTexture() {
    // The cross-hatched crystal pattern an etched iron meteorite shows when cut.
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d'), rand = random(83);
    ctx.fillStyle = '#9b9791'; ctx.fillRect(0, 0, 512, 512);
    for (const angle of [0, Math.PI / 3, -Math.PI / 3]) {
      ctx.save(); ctx.translate(256, 256); ctx.rotate(angle);
      for (let x = -400; x < 400; x += 10 + rand() * 22) {
        ctx.fillStyle = rand() < .5 ? 'rgba(58,56,53,.42)' : 'rgba(222,219,212,.34)';
        ctx.fillRect(x, -400, 2 + rand() * 5, 800);
      }
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  Object.assign(M, {
    iron: std('#57524c', {metalness: .78, roughness: .42, flatShading: true}),
    etched: new THREE.MeshStandardMaterial({map: etchedTexture(), metalness: .8, roughness: .24}),
    glass: std('#e4f3f6', {roughness: .06, metalness: .1, transparent: true, opacity: .24, depthWrite: false, side: THREE.DoubleSide}),
    sand: std('#e2c28a', {roughness: .9}),
    amber: std('#e8962c', {roughness: .12, transparent: true, opacity: .6, emissive: '#7a3a00', emissiveIntensity: .35, depthWrite: false})
  });
  G.dome = new THREE.SphereGeometry(1, 12, 4, 0, Math.PI * 2, 0, Math.PI / 2);

  // Hall I
  const telescope = k => {
    const apex = [0, CAP + 1.22, 0];
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + Math.PI / 2, foot = [Math.cos(a) * .46, CAP + .02, Math.sin(a) * .46];
      k.rod(M.wood, foot, apex, .026, G.cylinder);
      k.put(darkGold, G.cylinder, matrix(foot, 0, [.04, .05, .04]));
    }
    k.put(M.bronze, G.cylinder, matrix(apex, 0, [.09, .1, .09]));
    for (const s of [-1, 1]) k.put(M.bronze, G.box, matrix([s * .1, CAP + 1.36, 0], 0, [.025, .24, .06]));
    // The tube aims up and out toward the aisle, leather-brown with gilt bands.
    const tilt = .62, length = 1.7, t = k.frame(new THREE.Matrix4().compose(V(0, CAP + 1.46, 0),
      new THREE.Quaternion().setFromUnitVectors(UP, V(0, Math.sin(tilt), Math.cos(tilt))), V(1, 1, 1)));
    t.put(M.wood, G.taper, matrix([0, 0, 0], 0, [.075, length, .075]));
    for (const y of [-.72, -.3, .3, .78]) {
      const r = .06 + .015 * (y + length / 2) / length;
      t.put(gold, G.cylinder, matrix([0, y, 0], 0, [r * 1.14, .035, r * 1.14]));
    }
    t.put(gold, G.cylinder, matrix([0, length / 2 + .02, 0], 0, [.086, .05, .086]));
    t.put(M.glass, G.cylinder, matrix([0, length / 2 + .048, 0], 0, [.07, .008, .07]));
    t.put(M.bronze, G.cylinder, matrix([0, -length / 2 - .08, 0], 0, [.03, .16, .03]));
    t.rod(M.bronze, [-.12, 0, 0], [.12, 0, 0], .02, G.cylinder);
  };

  let METEORITE = null;
  const meteorite = k => {
    METEORITE ??= (() => {
      const geometry = new THREE.IcosahedronGeometry(1, 3), p = geometry.attributes.position, v = new THREE.Vector3();
      for (let i = 0; i < p.count; i++) {
        const n = v.fromBufferAttribute(p, i).normalize();
        // Broad lumps and thumbprint hollows, then one face sawn flat and polished.
        const relief = 1 + .1 * Math.sin(n.x * 5.1 + n.y * 2.3) * Math.cos(n.z * 4.2 - n.x * 1.7) - .06 * Math.abs(Math.sin(n.y * 9 + n.z * 7));
        v.multiplyScalar(relief).multiply(V(.55, .62, .45));
        p.setXYZ(i, v.x, v.y, Math.min(v.z, .28));
      }
      geometry.computeVertexNormals();
      return geometry;
    })();
    k.put(M.bronze, G.box, matrix([0, CAP + .05, 0], 0, [.74, .1, .52]));
    for (const s of [-1, 1]) k.rod(M.bronze, [s * .24, CAP + .1, 0], [s * .42, CAP + .62, .02], .026, G.cylinder);
    const rock = k.frame(matrix([0, CAP + 1.15, 0], [.12, -.18, 0], 1.35));
    rock.put(M.iron, METEORITE);
    rock.put(M.etched, new THREE.CircleGeometry(.36, 40), matrix([0, 0, .283], 0, [1, 1.15, 1]));
  };

  const HOURGLASS = lathe([[0, 0], [.1, .02], [.13, .1], [.12, .2], [.07, .3], [.02, .36], [.02, .38], [.07, .44], [.12, .54],
    [.13, .64], [.1, .72], [0, .74]], 24);
  const hourglass = k => {
    for (const y of [TOP + .02, TOP + .8]) k.put(M.wood, G.cylinder, matrix([0, y, 0], 0, [.2, .04, .2]));
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + .5;
      k.put(M.wood, G.cylinder, matrix([Math.cos(a) * .165, TOP + .41, Math.sin(a) * .165], 0, [.014, .76, .014]));
    }
    // Most of the sand has already fallen; a thin stream still runs.
    k.put(M.sand, G.cone, matrix([0, TOP + .125, 0], 0, [.11, .13, .11]));
    k.put(M.sand, G.cone, matrix([0, TOP + .47, 0], [Math.PI, 0, 0], [.085, .12, .085]));
    k.rod(M.sand, [0, TOP + .41, 0], [0, TOP + .19, 0], .004);
    k.put(M.glass, HOURGLASS, matrix([0, TOP + .04, 0]));
  };

  const saltCrystal = k => {
    mount(k, .24);
    const f = k.frame(matrix([0, TOP + .55, 0], [.35, .55, 0])), step = .16;
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) for (let l = 0; l < 3; l++) {
      const at = [(i - 1) * step, (j - 1) * step, (l - 1) * step], chlorine = (i + j + l) % 2 === 0;
      f.put(chlorine ? M.verdigris : M.amethyst, G.tiny, matrix(at, 0, chlorine ? .055 : .036));
      if (i < 2) f.rod(gold, at, [at[0] + step, at[1], at[2]], .006);
      if (j < 2) f.rod(gold, at, [at[0], at[1] + step, at[2]], .006);
      if (l < 2) f.rod(gold, at, [at[0], at[1], at[2] + step], .006);
    }
  };

  // Hall II
  function ginkgoLeaf(k, material, veins) {
    // A fan split at its crown, built facing +z with its stalk at the origin.
    const half = .95, R0 = .72, shape = new THREE.Shape();
    shape.moveTo(0, 0);
    for (let i = 0; i <= 44; i++) {
      const theta = -half + 2 * half * i / 44;
      const r = R0 * (1 + .025 * Math.sin(theta * 16)) * (1 - .24 * Math.exp(-((theta / .07) ** 2)));
      shape.lineTo(r * Math.sin(theta), r * Math.cos(theta));
    }
    shape.lineTo(0, 0);
    k.put(material, new THREE.ExtrudeGeometry(shape, {depth: .018, bevelEnabled: true, bevelThickness: .006, bevelSize: .008,
      bevelSegments: 1, curveSegments: 4}), matrix([0, 0, -.009]));
    for (let i = 0; i < 13; i++) {
      const theta = -half * .92 + 2 * half * .92 * i / 12;
      k.rod(veins, [0, .02, .02], [Math.sin(theta) * R0 * .9, Math.cos(theta) * R0 * .9, .02], .0045);
    }
  }
  const ginkgo = k => {
    k.put(M.bronze, G.cylinder, matrix([0, CAP + .04, 0], 0, [.3, .08, .3]));
    const stalk = new THREE.CatmullRomCurve3([V(0, CAP + .08, 0), V(.06, CAP + .5, .04), V(.02, CAP + .9, .1), V(0, CAP + 1.1, .12)]);
    k.put(M.bronze, taperedTube(stalk, s => .034 - .016 * s, 24, 8));
    ginkgoLeaf(k.frame(matrix([0, CAP + 1.1, .12], [-.28, .18, .1], 1.5)), gold, darkGold);
    const small = new THREE.CatmullRomCurve3([V(0, CAP + .3, 0), V(-.16, CAP + .55, .02), V(-.3, CAP + .78, .1)]);
    k.put(M.bronze, taperedTube(small, s => .022 - .01 * s, 16, 8));
    ginkgoLeaf(k.frame(matrix([-.3, CAP + .78, .1], [-.15, .6, .5], .8)), M.verdigris, M.bronze);
  };

  const tusks = k => {
    k.put(M.wood, G.box, matrix([0, CAP + .06, 0], 0, [.7, .12, .46]));
    // A bronze mount holds both sockets together at the centre.
    k.rod(M.bronze, [0, CAP + .12, -.08], [0, CAP + .5, -.08], .045, G.cylinder);
    k.put(M.bronze, G.box, matrix([0, CAP + .54, -.08], 0, [.34, .12, .16]));
    for (const s of [-1, 1]) {
      // Out and down from the socket, forward, then up, with the tip turned back in —
      // the inward spiral of a mammoth's tusks.
      const curve = new THREE.CatmullRomCurve3([
        [s * .12, .54, -.08], [s * .36, .38, .06], [s * .62, .48, .24], [s * .72, .9, .3],
        [s * .56, 1.32, .22], [s * .3, 1.52, .06], [s * .1, 1.46, -.06]
      ].map(([x, y, z]) => V(x, CAP + y, z)));
      k.put(M.bone, taperedTube(curve, u => .082 * (1 - .8 * u), 64, 10));
      k.put(M.bronze, G.cylinder, matrix([s * .13, CAP + .54, -.08], [0, 0, s * Math.PI / 2], [.088, .05, .088]));
    }
  };

  const amber = k => {
    k.put(M.bronze, G.cylinder, matrix([0, TOP + .025, 0], 0, [.14, .05, .14]));
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2;
      k.rod(M.bronze, [Math.cos(a) * .1, TOP + .05, Math.sin(a) * .1], [Math.cos(a) * .12, TOP + .21, Math.sin(a) * .12], .008);
    }
    // The insect, held inside the resin.
    const bug = k.frame(matrix([0, TOP + .36, 0], [.2, .6, .1]));
    bug.put(M.obsidian, G.small, matrix([0, 0, .03], 0, [.018, .016, .03]));
    bug.put(M.obsidian, G.small, matrix([0, 0, -.045], 0, [.014, .012, .05]));
    bug.put(M.obsidian, G.small, matrix([0, .005, .07], 0, .013));
    for (const s of [-1, 1]) {
      bug.put(M.wing, G.small, matrix([s * .045, .012, 0], [0, s * .25, 0], [.05, .002, .018]));
      for (const dz of [-.01, .02, .05]) bug.rod(M.obsidian, [s * .012, -.01, dz], [s * .04, -.035, dz + .01], .0025);
    }
    k.put(M.amber, G.sphere, matrix([0, TOP + .36, 0], [.3, .4, .2], [.2, .15, .16]));
  };

  STATUES[0].push(
    {title: 'Refracting Telescope', subtitle: 'A lens and a tube, first turned on the sky in 1609', build: telescope},
    {title: 'Iron Meteorite', subtitle: 'Metal from the core of a shattered asteroid, cut to show its crystals', build: meteorite});
  STATUES[1].push(
    {title: 'Ginkgo', subtitle: 'A living fossil whose leaves have barely changed since the Jurassic', build: ginkgo},
    {title: 'Mammoth Tusks', subtitle: 'Ivory of the Ice Age, curving up to four metres in life', build: tusks});
  PEDESTALS[0].push(
    {title: 'Deep Time', subtitle: 'An hourglass: most of the sand has already fallen', build: hourglass},
    {title: 'Salt Crystal', subtitle: 'Sodium and chlorine, forged in stars, locked in a cube', build: saltCrystal});
  PEDESTALS[1].push(
    {title: 'Amber', subtitle: 'An insect held in tree resin for 40 million years', build: amber});

  // ── Placing the collection ──────────────────────────────────────────────
  const facing = side => -side * Math.PI / 4;   // toward the aisle and the visitor walking in

  for (let wing = 0; wing < 3; wing++) {
    const plinthHall = wing < 2;
    const statueSlots = plinthHall
      ? [[1, -1], [1, 1], [5, -1], [5, 1], [2, -1], [2, 1]].map(([b, side]) => ({x: side * 6.35, z: bay(wing, b) + (b === 5 ? 1.5 : 0), side}))
      : [{x: -6.4, z: -168, side: -1}, {x: 6.4, z: -168, side: 1}];
    // Bays 2 and 4 are where the benches used to stand and must hold sculpture;
    // bay 2 takes statues, so bay 4 is listed before bay 3. Hall Ⅱ has one work
    // fewer than it has spots, and the spare one falls in bay 3 as a result.
    const pedestalSlots = plinthHall
      ? [[0, -1], [0, 1], [4, -1], [4, 1], [3, -1], [3, 1]].map(([b, side]) => ({x: side * 6.25, z: bay(wing, b), side}))
      : [{x: -6.3, z: -196, side: -1}, {x: 6.3, z: -196, side: 1}];
    const store = new Map();
    const labels = [...STATUES[wing], ...PEDESTALS[wing]];
    const plaque = plaques(labels);

    STATUES[wing].forEach((pose, i) => {
      const {x, z, side} = statueSlots[i], bounds = new THREE.Box3();
      const k = kit(store, matrix([x, 0, z], [0, facing(side), 0]), bounds);
      statue(k, wing, pose);
      plaque(k, i, [0, .7, .505], [.84, .42]);
      obstacles.push({x, z, halfX: .95, halfZ: .95});
      pieces.push({name: pose.title, kind: 'statue', wing, footprint: {x, z, halfX: .95, halfZ: .95}, bounds});
    });
    PEDESTALS[wing].forEach((work, i) => {
      const {x, z, side} = pedestalSlots[i], bounds = new THREE.Box3();
      const k = kit(store, matrix([x, 0, z], [0, facing(side), 0]), bounds);
      pedestal(k, wing);
      work.build(k);
      plaque(k, STATUES[wing].length + i, [0, .62, .305], [.56, .28]);
      obstacles.push({x, z, halfX: .62, halfZ: .62});
      pieces.push({name: work.title, kind: 'pedestal', wing, footprint: {x, z, halfX: .62, halfZ: .62}, bounds});
    });

    if (wing === 0) {
      orrery(wing, bay(0, 1), store); galaxy(wing, bay(0, 3), store); comet(wing, bay(0, 5), store);
      saturn(wing, store, aisle(0, 0, -1, 7.5));
      firstAtoms(wing, store, aisle(0, 0, 1, 7.6));
      pulsar(wing, store, aisle(0, 2, -1, 7.7));
      binaryStar(wing, store, aisle(0, 2, 1, 7.6));
      stellarNursery(wing, store, aisle(0, 4, -1, 7.3));
      constellation(wing, store, aisle(0, 4, 1, 7.7), 0);
    }
    if (wing === 1) {
      helix(wing, bay(1, 1), store); whale(wing, bay(1, 3), store); jellyfish(wing, bay(1, 5));
      mantaRay(wing, store, aisle(1, 0, -1, 7.0));
      seaTurtle(wing, store, aisle(1, 0, 1, 7.1));
      pterosaur(wing, store, aisle(1, 2, -1, 7.6));
      shoal(wing, store, aisle(1, 2, 1, 6.9));
      birds(wing, store, aisle(1, 4, -1, 7.8));
      butterflies(wing, store, aisle(1, 4, 1, 7.2));
    }
    if (wing === 2) {
      for (const [name, build0, x, y, yaw] of [['Voyaging Canoe', canoe, -5.4, 6.7, 1.35], ['Powered Flyer', flyer, 5.4, 7.3, -.2]]) {
        const bounds = new THREE.Box3(), k = kit(store, matrix([x, y, -174], [0, yaw, 0]), bounds);
        build0(k);
        for (const [dx, dz] of [[-.8, -1.8], [.8, -1.8], [-.8, 1.8], [.8, 1.8]]) {
          const overhead = x + Math.cos(yaw) * dx + Math.sin(yaw) * dz;
          k.rod(darkGold, [dx, name === 'Powered Flyer' ? .43 : .1, dz], [dx, vaultAt(overhead) - y, dz], .008);
        }
        pieces.push({name, kind: 'hanging', wing, bounds});
      }
      const craft = [
        ['Hot-Air Balloon', [0, 9.2, -167.6], 0, (k, at) => {balloon(k); cableUp(k, at, 0, [0, 1.57, 0], .01);}],
        ['Sputnik 1', [0, 8.9, -196.4], 0, (k, at) => {sputnik(k); cableUp(k, at, 0, [0, .5, 0], .008);}],
        ['James Webb Space Telescope', [-5.4, 7.1, -191.4], Math.PI / 2 - .12, webbTelescope],
        ['Airship', [5.4, 7.7, -191.4], 0, airship],
        ["Leonardo's Wings", [-5.4, 8.1, -167.8], 0, leonardoWings],
        ['Lunar Module', [5.4, 7.7, -167.8], .5, lunarModule]
      ];
      for (const [name, at, yaw, make] of craft) fixedPiece(name, wing, store, at, yaw, k => make(k, at, yaw));
    }
    build(store, halls[wing], halls[wing].name);
  }

  function boxOf(piece) {
    const box = piece.bounds ? piece.bounds.clone() : new THREE.Box3();
    if (piece.root) {
      piece.root.updateMatrixWorld(true);
      box.union(new THREE.Box3().setFromObject(piece.root));
    }
    return box;
  }

  return {
    group, obstacles,
    /**
     * `look`, when given, carries the view's forward z and whether the door at
     * a z is open. A neighbouring hall is then drawn only through an open door
     * and only while the visitor is not facing away from it: its nearest works
     * sit 19 m or more past the door, so they stay outside the field of view
     * whenever the view is turned more than 70 degrees from them.
     */
    update(elapsed, still, headZ = 0, look = null) {
      halls.forEach((hall, wing) => {
        const front = HALL_FRONT[wing], back = HALL_BACK[wing];
        if (headZ <= front && headZ >= back) hall.visible = true;
        else if (headZ > front) hall.visible = headZ - front < REACH && (!look || (look.forwardZ < .35 && look.doorOpen(front)));
        else hall.visible = back - headZ < REACH && (!look || (look.forwardZ > -.35 && look.doorOpen(back)));
      });
      const t = still ? 0 : elapsed;
      motionTime = t;
      for (const motion of motions) if (motion.hall.visible) motion(t);
    },
    getLayout: () => pieces.map(piece => {
      const box = boxOf(piece);
      return {name: piece.name, kind: piece.kind, wing: piece.wing, footprint: piece.footprint || null,
        swim: piece.swim || null, bounds: {min: box.min.toArray(), max: box.max.toArray()}};
    }),
    getState: () => ({
      counts: [0, 1, 2].map(wing => ({
        hanging: pieces.filter(p => p.wing === wing && p.kind === 'hanging').length,
        pedestal: pieces.filter(p => p.wing === wing && p.kind === 'pedestal').length,
        statue: pieces.filter(p => p.wing === wing && p.kind === 'statue').length
      })),
      pieces: pieces.map(({name, kind, wing}) => ({name, kind, wing})),
      visibleHalls: halls.map(hall => hall.visible),
      meshes: meshCount, triangles: Math.round(triangleCount), animated: motions.length, motionTime,
      nativeParts: nativeParts.length
    })
  };
}
