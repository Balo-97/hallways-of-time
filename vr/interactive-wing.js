/**
 * Discovery Labs: a rotunda apart from the halls, reached by teleporting,
 * where a visitor does what the discoverers did. The Webb stands in the
 * middle; ten bays round the wall hold the exhibits, grouped by theme — the
 * sky, matter and the Earth, machines, life — and a plan at the way in takes
 * the visitor to any of them. The bays other than Galileo's and the two
 * Jupiters are modules of their own, in vr/exhibits/.
 *
 *   Galileo's telescope   look through it at Jupiter on the evenings of
 *                         January to March 1610, night by night, and watch
 *                         four points of light swing from side to side until
 *                         they can only be moons; then see the same evening
 *                         from above, where the swinging is circling.
 *   The Webb telescope    NASA's model at full size, the sunshield as large as
 *                         a tennis court; point at any part to learn what it
 *                         does, and set Webb's Jupiter beside Galileo's.
 *
 * The moons stand where JPL's Horizons ephemeris puts them for each evening
 * (data/galileo-nights.json, scripts/fetch-galileo-nights.mjs), and the Webb
 * is NASA's own model, simplified for a headset (scripts/make-webb.mjs).
 *
 * The gallery lies far beyond the halls, out of reach of the far plane, so the
 * two are never drawn together. It is for the web museum for now: the native
 * exporter leaves it out (`nativeSkip`).
 */
import {TEXTURE_CAP, TEXTURE_SCALE} from './detail.js';
import {loadGLB} from './glb.js';
import {createSpeedOfLight} from './exhibits/speed-of-light.js';
import {createPrintingPress} from './exhibits/printing-press.js';
import {createPeriodicTable} from './exhibits/periodic-table.js';
import {createDoubleHelix} from './exhibits/double-helix.js';
import {createContinentalDrift} from './exhibits/continental-drift.js';
import {createMendel} from './exhibits/mendel.js';
import {createTuringMachine} from './exhibits/turing-machine.js';
import {createSuSongClock} from './exhibits/su-song-clock.js';

/** World z of the gallery's centre. */
export const WING_Z = 400;
/**
 * A rotunda, in its own metres about its centre: a drum of wall under a dome,
 * the way in at +z. Places on the wall are given by their angle from the way
 * in, turning toward +x, the visitor's right as they arrive.
 */
const ROOM = {radius: 28, drum: 12, dome: 12};
/** How far in from the wall every bay's exhibit stands. */
const STAGE = 5;
const ARRIVAL = {x: 0, z: ROOM.radius - 3.5, yaw: 0};
// NASA's model looks along its +x; turned a quarter, its mirror faces the way in.
const WEBB = {x: 0, z: -2, turn: -Math.PI / 2};
// A gilt ellipse on the floor marks the Webb's ground: all of the telescope
// lies inside 11.5 by 8 metres about its centre, and the ellipse stands clear
// of that. It is not a barrier: visitors may walk through the Webb, and
// through everything else in the labs, to look as close as they like.
const ROPE = {along: 12.2, across: 8.7};
/**
 * Ten bays thirty degrees apart round the wall, the way in at 0 and the labs'
 * name opposite it, behind the Webb. On the left, the sky and then matter and
 * the Earth; on the right, machines and then life; each group in the order of
 * its dates, front to back.
 */
const BAYS = [
  {id: 'galileo', angle: -30, group: 'sky', name: 'Galileo’s telescope', label: 'GALILEO · 1610'},
  {id: 'romer', angle: -60, group: 'sky', name: 'The speed of light', label: 'RØMER · 1676'},
  {id: 'jupiters', angle: -90, group: 'sky', name: 'Two Jupiters', label: 'TWO JUPITERS · 1610 AND 2022'},
  {id: 'mendeleev', angle: -120, group: 'matter', name: 'The periodic table', label: 'MENDELEEV · 1869'},
  {id: 'wegener', angle: -150, group: 'matter', name: 'Continental drift', label: 'WEGENER · 1912'},
  {id: 'susong', angle: 30, group: 'machines', name: 'Su Song’s clock tower', label: 'SU SONG · 1092'},
  {id: 'gutenberg', angle: 60, group: 'machines', name: 'The printing press', label: 'GUTENBERG · 1450'},
  {id: 'turing', angle: 90, group: 'machines', name: 'A Turing machine', label: 'TURING · 1936'},
  {id: 'mendel', angle: 120, group: 'life', name: 'Mendel’s peas', label: 'MENDEL · 1866'},
  {id: 'dna', angle: 150, group: 'life', name: 'The double helix', label: 'THE DOUBLE HELIX · 1953'}
];
// Where Jupiter is painted in Galileo's window, from the middle of its sill: the telescope points there.
const JUPITER_IN_WINDOW = {x: .25, y: 3.0};
const MOON_ORBITS = [5.9, 9.4, 15, 26.4];   // mean distances, Jupiter radii
const MOON_NAMES = ['Io', 'Europa', 'Ganymede', 'Callisto'];

/** What each part of the Webb is, for a visitor who points at it. */
const PARTS = {
  webb: {kicker: 'FULL SIZE', title: 'The James Webb Space Telescope',
    text: 'Launched on 25 December 2021, Webb works 1.5 million kilometres from Earth, always keeping its sunshield between its mirrors and the Sun, Earth and Moon. It sees in infrared, which passes through dust and carries the light of the first galaxies, stretched on its way to us across more than 13 billion years. Point at any part of the telescope to learn what it does.',
    facts: [['Launched', '25 December 2021'], ['Distance from Earth', '1.5 million km'], ['Model', 'NASA, simplified for this museum']]},
  mirror: {kicker: 'THE TELESCOPE', title: 'The primary mirror',
    text: 'Eighteen hexagonal segments of beryllium, each with a thin coat of gold, together 6.5 metres across. Gold reflects infrared light very well. The segments were folded for launch and opened in space, then set to match one another to a tiny fraction of a hair’s width.',
    facts: [['Across', '6.5 metres'], ['Segments', '18'], ['Coating', 'Gold']]},
  secondary: {kicker: 'THE TELESCOPE', title: 'The secondary mirror',
    text: 'Held out on three long struts, it catches the light gathered by the primary mirror and sends it back through the hole at that mirror’s centre, to the instruments waiting behind it.',
    facts: [['Across', 'About 0.74 metres'], ['Held by', 'Three struts']]},
  sunshield: {kicker: 'KEEPING COLD', title: 'The sunshield',
    text: 'Five layers of Kapton film, each thinner than a human hair, spread to the size of a tennis court. The side facing the Sun is hot; behind the fifth layer the telescope stays colder than −220 °C, cold enough that its own warmth never drowns the faint heat of distant galaxies.',
    facts: [['Size', 'About 21 by 14 metres'], ['Layers', '5']]},
  spacecraft: {kicker: 'THE WARM SIDE', title: 'The spacecraft',
    text: 'Beneath the sunshield, on the warm side, are the parts that keep the observatory working: its computer, its thrusters and their fuel, its batteries, and the gyroscopes and star trackers that point it.',
    facts: []},
  array: {kicker: 'POWER', title: 'The solar array',
    text: 'Panels of solar cells, always turned toward the Sun, make the electricity for the whole observatory.',
    facts: []},
  antenna: {kicker: 'TALKING TO EARTH', title: 'The high-gain antenna',
    text: 'A dish that sends Webb’s observations home across 1.5 million kilometres, to the great radio dishes of NASA’s Deep Space Network in California, Spain and Australia.',
    facts: []},
  telescope: {kicker: 'THE TELESCOPE', title: 'The telescope and its instruments',
    text: 'The mirrors, and behind the primary mirror the four science instruments, kept in the shade of the sunshield and in the cold.',
    facts: [['Instruments', '4']]}
};
const PART_ORDER = ['webb', 'mirror', 'secondary', 'sunshield', 'spacecraft', 'array', 'antenna'];

/** What Galileo made of the evenings he recorded; the others share a line. */
const NIGHT_NOTES = {
  '7 January 1610': 'Beside Jupiter, Galileo saw small bright points in a straight line, two to the east and one to the west. He took them at first for ordinary stars.',
  '8 January 1610': 'The next evening all of them stood to the west. Stars do not change sides from one night to the next, so he kept watching.',
  '9 January 1610': 'Clouds covered the sky over Padua this evening, and Galileo saw nothing. This is the sky he missed.',
  '10 January 1610': 'Only two points now, both to the east. Galileo guessed that the third was hidden behind Jupiter.',
  '11 January 1610': 'Two again, both east. Galileo now decided these were not stars at all, but bodies moving around Jupiter, as Venus and Mercury move around the Sun.',
  '13 January 1610': 'For the first time he counted four.',
  '2 March 1610': 'The last evening of this run. That month Galileo published his nights in Sidereus Nuncius, “The Starry Messenger”. Jupiter’s four great moons are still called the Galilean moons.'
};
const NIGHT_DEFAULT = 'Night after night the points keep to their line but change their places. Step on and watch them swing from side to side.';
const ABOVE_NOTE = 'Seen from above, each moon runs round its own circle. From Earth we see those circles edge on, so each moon seems to swing from side to side: Io in under two days, Callisto in nearly seventeen.';
const JUPITER_CREDIT = 'NASA, ESA, Jupiter ERS Team; image processing by Judy Schmidt · CC BY 4.0';

export function createInteractiveWing(THREE, scene, callbacks) {
  const group = new THREE.Group();
  group.name = 'Discovery Labs';
  group.position.set(0, 0, WING_Z);
  // The native museum does not have this gallery yet; its exporter leaves it out.
  group.userData.nativeSkip = true;
  scene.add(group);
  const pickables = [], hotspots = [];
  // Every panel the room can show, by kind; the exhibits add their own.
  const panelSpecs = {};
  const state = {nights: null, night: 0, mode: 'lens', seen: new Set(), part: null, panelKind: null,
    webb: null, webbError: null, jupiter: null};

  // ── Materials and the small makers ───────────────────────────────────
  const std = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: .6, ...extra});
  // The halls' own marble, gilt and floor, so the rotunda is built of the same
  // stone as the rest of the museum; its own materials only where the halls have none.
  const hall = callbacks.materials || {};
  const M = {
    floor: hall.floor || std('#ece5d5', {roughness: .3, metalness: .06}),
    ivory: hall.ivory || std('#fff7e8', {roughness: .43}), gold: hall.gold || std('#c4a564', {metalness: .52, roughness: .33}),
    stone: hall.shades?.[0] || std('#253f60', {roughness: .34}),
    plaster: std('#f5e9d4', {roughness: .78, emissive: '#d3c5ac', emissiveIntensity: .1}),
    slate: std('#24303b', {roughness: .48}), wood: std('#5b3b24', {roughness: .62}), darkWood: std('#3a2618', {roughness: .58}),
    leather: std('#6a4428', {roughness: .74}), brass: std('#b48d4c', {metalness: .7, roughness: .32}),
    paper: std('#efe4c8', {roughness: .9}), ink: std('#1b1b22', {roughness: .3, metalness: .2}),
    bronze: std('#2c3a4c', {metalness: .12, roughness: .47})
  };
  const box = (parent, size, position, material) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(...size), material); m.position.set(...position); parent.add(m); return m;
  };
  const SIGN_PX = Math.round(680 * TEXTURE_SCALE);
  function canvasFor(width, height) {
    const px = Math.min(SIGN_PX, TEXTURE_CAP / Math.max(width, height));
    const c = document.createElement('canvas'); c.width = Math.round(width * px); c.height = Math.round(height * px);
    const ctx = c.getContext('2d'); ctx.scale(c.width / width, c.height / height);   // drawn in metres
    return {canvas: c, ctx};
  }
  function texture(canvas) { const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t; }
  function plane(parent, w, h, position, map, rotationY = 0) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({map, side: THREE.DoubleSide}));
    m.position.set(...position); m.rotation.y = rotationY; parent.add(m); return m;
  }
  /** A plate of lettering, `lines` as [text, size, colour, font] in metres. */
  function lettering(width, height, lines, background = '#172027') {
    const {canvas, ctx} = canvasFor(width, height);
    ctx.fillStyle = background; ctx.fillRect(0, 0, width, height);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [text, y, size, color = '#f1ddba', font = '#px Georgia, serif'] of lines) {
      ctx.fillStyle = color; ctx.font = font.replace('#', size); ctx.fillText(text, width / 2, y, width - .1);
    }
    return texture(canvas);
  }
  const press = (mesh, action, label) => { mesh.userData.action = action; mesh.userData.label = label; pickables.push(mesh); return mesh; };
  const moving = [];
  /** One geometry from many, each already placed: positions, normals and texture coordinates end to end. */
  function mergeGeometries(list) {
    let vertices = 0, count = 0;
    for (const g of list) { vertices += g.attributes.position.count; count += g.index ? g.index.count : g.attributes.position.count; }
    const position = new Float32Array(vertices * 3), normal = new Float32Array(vertices * 3), uv = new Float32Array(vertices * 2);
    const index = new Uint32Array(count);
    let v = 0, i = 0;
    for (const g of list) {
      const n = g.attributes.position.count;
      position.set(g.attributes.position.array, v * 3); normal.set(g.attributes.normal.array, v * 3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, v * 2);
      if (g.index) for (const k of g.index.array) index[i++] = k + v; else for (let k = 0; k < n; k++) index[i++] = v + k;
      v += n;
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.BufferAttribute(position, 3)); merged.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); merged.setIndex(new THREE.BufferAttribute(index, 1));
    merged.computeBoundingSphere();
    return merged;
  }
  /**
   * Merge everything under `root` that never moves into one mesh per material,
   * as the halls do, so the rotunda and its exhibits, hundreds of parts, cost a
   * few dozen draws. Parts under any of `keep`, which move, keep their own meshes,
   * and so does anything that can be pressed.
   */
  function settle(root, keep) {
    root.updateMatrixWorld(true);
    const into = root.matrixWorld.clone().invert(), buckets = new Map();
    root.traverse(o => {
      if (!o.isMesh || o.isInstancedMesh || Array.isArray(o.material) || !o.material.visible || pickables.includes(o)) return;
      for (let p = o; p && p !== root; p = p.parent) if (keep.includes(p)) return;
      if (!buckets.has(o.material)) buckets.set(o.material, []);
      buckets.get(o.material).push(o);
    });
    for (const [material, meshes] of buckets) {
      if (meshes.length < 2) continue;
      const parts = meshes.map(m => m.geometry.clone().applyMatrix4(into.clone().multiply(m.matrixWorld)));
      const merged = new THREE.Mesh(mergeGeometries(parts), material);
      merged.name = `Interactive museum, merged: ${material.name || material.color?.getHexString?.() || 'part'}`;
      root.add(merged);
      for (const m of meshes) { m.removeFromParent(); m.geometry.dispose(); }
      for (const g of parts) g.dispose();
    }
  }
  const invisible = new THREE.MeshBasicMaterial({visible: false});
  function seeded(seed) { return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296); }

  // ── The rotunda ──────────────────────────────────────────────────────
  const R = ROOM.radius, DRUM = ROOM.drum, DOME = ROOM.dome, deg = Math.PI / 180;
  /**
   * A frame on the wall at `angle` degrees from the way in, `inset` metres in
   * from it: x runs along the wall to the right of someone facing it, y up,
   * and z out from the wall toward the centre of the room.
   */
  function onWall(angle, inset = 0) {
    const a = angle * deg, frame = new THREE.Group();
    frame.position.set(Math.sin(a) * (R - inset), 0, Math.cos(a) * (R - inset));
    frame.rotation.y = a + Math.PI; frame.updateMatrix();
    group.add(frame);
    return frame;
  }
  /** A point given in a wall frame, in the room's own metres. */
  const inRoom = (frame, x, z) => new THREE.Vector3(x, 0, z).applyMatrix4(frame.matrix);
  /** Stand `object` at x, z in the room, turned to face the point tx, tz. */
  function facing(object, x, z, tx, tz) {
    object.position.set(x, 0, z); object.rotation.y = Math.atan2(tx - x, tz - z); group.add(object); return object;
  }
  /** The angle on the wall `x` metres to the right of `angle`, for a visitor facing it. */
  const beside = (angle, x) => angle - x / R / deg;
  /** Where a visitor stands to see the exhibit in a bay, and which way they face: toward it. */
  const standAt = angle => { const a = angle * deg, r = R - STAGE - 3.4; return {x: Math.sin(a) * r, z: Math.cos(a) * r, yaw: a + Math.PI}; };
  const bayOf = id => BAYS.find(b => b.id === id);

  // The floor is the halls' own: the same marble squares and inlaid diamonds,
  // the same polish, laid square to the room metre for metre as theirs are.
  // Their floor spreads its pattern over 18 by 242 metres, so these UVs do too.
  {
    const geometry = new THREE.CircleGeometry(R, 160), p = geometry.attributes.position, uv = geometry.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 18 + .5, p.getY(i) / 242 + .5);
    const floor = new THREE.Mesh(geometry, M.floor);
    floor.rotation.x = -Math.PI / 2; floor.name = 'Interactive museum floor';
    floor.userData.floor = true; group.add(floor); pickables.push(floor);
  }
  const flat = (geometry, material, y) => { const m = new THREE.Mesh(geometry, material); m.rotation.x = -Math.PI / 2; m.position.y = y; group.add(m); return m; };
  // A border of blue stone, edged in gilt, round the foot of the wall.
  flat(new THREE.RingGeometry(R - 1.3, R, 160, 1), M.stone, .008);
  flat(new THREE.RingGeometry(R - 1.44, R - 1.36, 160, 1), M.gold, .01);
  /** A flat band `width` wide along the ellipse of half-axes `along` (z) and `across` (x). */
  function ellipseBand(along, across, width) {
    const points = [], index = [], steps = 192;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps * Math.PI * 2, s = Math.sin(t), c = Math.cos(t);
      const nx = s / across, nz = c / along, l = Math.hypot(nx, nz);
      for (const side of [1, -1]) points.push(across * s + side * width / 2 * nx / l, 0, along * c + side * width / 2 * nz / l);
      if (i < steps) index.push(i * 2, i * 2 + 2, i * 2 + 1, i * 2 + 1, i * 2 + 2, i * 2 + 3);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geometry.setIndex(index); geometry.computeVertexNormals();
    // Wound to face up, whichever way the arithmetic went.
    if (geometry.attributes.normal.getY(0) < 0) { geometry.setIndex(index.map((v, i) => index[i - i % 3 + 2 - i % 3])); geometry.computeVertexNormals(); }
    return geometry;
  }
  for (const [grow, width] of [[0, .08], [.32, .035]]) {
    const rope = new THREE.Mesh(ellipseBand(ROPE.along + grow, ROPE.across + grow, width), M.gold);
    rope.position.set(WEBB.x, .012, WEBB.z); group.add(rope);
  }
  // The halls' floor medallions — two gilt rings and eight petals of stone —
  // where a visitor arrives, and under the stage of every bay, all on one ring.
  // Galileo's bay has its rug instead.
  const medallions = [[ARRIVAL.x, ARRIVAL.z], ...BAYS.filter(b => b.id !== 'galileo').map(b => [Math.sin(b.angle * deg) * (R - STAGE), Math.cos(b.angle * deg) * (R - STAGE)])];
  // The wall: a drum of plaster with a marble skirting, a dado rail and a cornice.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(R, R, DRUM, 192, 1, true), M.plaster);
  drum.material = M.plaster.clone(); drum.material.side = THREE.BackSide;
  drum.position.y = DRUM / 2; group.add(drum);
  const band = (radius, tube, y, material) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 224), material);
    m.rotation.x = Math.PI / 2; m.position.y = y; group.add(m); return m;
  };
  band(R - .04, .15, .12, M.ivory);
  band(R - .02, .05, 1.22, M.ivory); band(R - .02, .022, 1.32, M.gold);
  band(R - .12, .3, DRUM - .12, M.ivory); band(R - .18, .045, DRUM - .5, M.gold);
  // The frieze, under the cornice: over every bay the name of who stands in
  // it, and the name of the labs over the door and opposite it.
  const FRIEZE = {y: DRUM - 1.15, height: 1};
  {
    const labels = [...BAYS.map(b => [b.angle, b.label]), [0, 'DISCOVERY LABS'], [180, 'DISCOVERY LABS']];
    // Six lengths of sixty degrees, each over two bays; a length is 29 m long and
    // a metre high, so 2,048 by 70 pixels keeps the letters square.
    for (let start = -165; start < 195; start += 60) {
      const c = document.createElement('canvas'); c.width = 2048; c.height = 70; const ctx = c.getContext('2d');
      ctx.fillStyle = '#23303b'; ctx.fillRect(0, 0, 2048, 70);
      ctx.fillStyle = '#e1c393'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // The texture runs from the higher angle on the left, as a visitor facing the wall reads it.
      const x = angle => (start + 60 - angle) / 60 * 2048;
      for (const [angle, words] of labels) {
        const at = ((angle - start) % 360 + 360) % 360;
        if (at >= 60) continue;
        ctx.font = '600 38px Arial, sans-serif'; ctx.letterSpacing = '10px'; ctx.fillText(words, x(start + at), 36, 960);
      }
      // A star between bays; those at the ends of a length are halves, completed by its neighbour.
      ctx.letterSpacing = '0px'; ctx.font = '26px Arial, sans-serif';
      for (const between of [0, 1024, 2048]) ctx.fillText('✦', between, 36);
      const map = texture(c); map.wrapS = THREE.RepeatWrapping; map.repeat.set(-1, 1);   // read from inside the drum
      const length = new THREE.CylinderGeometry(R - .07, R - .07, FRIEZE.height, 64, 1, true, start * deg, 60 * deg);
      const frieze = new THREE.Mesh(length, new THREE.MeshBasicMaterial({map, side: THREE.BackSide}));
      frieze.position.y = FRIEZE.y; group.add(frieze);
    }
    // Gilt above and below it.
    band(R - .1, .05, FRIEZE.y - FRIEZE.height / 2 - .08, M.gold);
  }
  // Ivory pilasters every fifteen degrees, between the bays, standing up to the frieze.
  {
    const angles = [];
    for (let a = -172.5; a < 180; a += 15) angles.push(a);
    const top = FRIEZE.y - FRIEZE.height / 2 - .2, shaft = top - .3 - .34;
    const parts = [[new THREE.BoxGeometry(.7, shaft, .22), M.ivory, .3 + shaft / 2, .11],
      [new THREE.BoxGeometry(.86, .5, .3), M.ivory, .25, .15], [new THREE.BoxGeometry(.9, .34, .32), M.gold, top - .17, .16]];
    const o = new THREE.Object3D();
    for (const [geometry, material, y, inset] of parts) {
      const mesh = new THREE.InstancedMesh(geometry, material, angles.length);
      angles.forEach((angle, i) => {
        const a = angle * deg;
        o.position.set(Math.sin(a) * (R - inset), y, Math.cos(a) * (R - inset)); o.rotation.set(0, a, 0); o.updateMatrix();
        mesh.setMatrixAt(i, o.matrix);
      });
      group.add(mesh);
    }
  }
  // The dome: a night sky, the labs being about looking up, held by six gilt ribs.
  {
    const W = 2048, H = 1024, c = document.createElement('canvas'); c.width = W; c.height = H; const ctx = c.getContext('2d');
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0a1124'); sky.addColorStop(.75, '#16234a'); sky.addColorStop(1, '#2a3a63');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    // The canvas wraps the rim with 2,048 pixels but climbs to the crown with
    // 1,024, so a pixel is wider on the dome than it is tall, and wider still
    // toward the crown, where a row of texels is a small circle. Stars are
    // drawn narrow by as much, and thin out toward the crown, so they lie
    // evenly over the dome and stay round.
    const r = seeded(1610), wider = 2 * Math.PI * R / W / (Math.PI / 2 * (R + DOME) / 2 / H);
    for (let i = 0; i < 2800; i++) {
      const y = r() * H, around = Math.sin(y / H * Math.PI / 2);
      if (r() > around) continue;
      const size = r() ** 4 * 2.6 + .8;
      ctx.fillStyle = `rgba(255,${235 + r() * 20 | 0},${200 + r() * 55 | 0},${.4 + r() * .6})`;
      ctx.beginPath(); ctx.ellipse(r() * W, y, Math.min(size / wider / Math.max(around, .05), 40), size, 0, 0, Math.PI * 2); ctx.fill();
    }
    const map = texture(c);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(R, 112, 32, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshBasicMaterial({map, side: THREE.BackSide, fog: false}));
    dome.scale.y = DOME / R; dome.position.y = DRUM; group.add(dome);
    const RIBS = 6;
    const ribs = new THREE.InstancedMesh(new THREE.TorusGeometry(R - .3, .1, 6, 56, Math.PI / 2), M.gold, RIBS), o = new THREE.Object3D();
    for (let i = 0; i < RIBS; i++) { o.position.set(0, DRUM, 0); o.rotation.set(0, i * Math.PI * 2 / RIBS, 0); o.scale.set(1, DOME / R, 1); o.updateMatrix(); ribs.setMatrixAt(i, o.matrix); }
    group.add(ribs);
    const boss = new THREE.Mesh(new THREE.TorusGeometry(1.1, .16, 8, 48), M.gold);
    boss.rotation.x = Math.PI / 2; boss.position.y = DRUM + DOME - .3; group.add(boss);
  }
  // The way in, behind the visitor as they arrive: bronze doors, and the way back above them.
  {
    const door = onWall(0, .16), W = 4.2, H = 6.2;
    for (const side of [-1, 1]) {
      box(door, [W / 2 - .03, H, .14], [side * W / 4, H / 2, .07], M.bronze);
      for (const y of [H * .25, H * .7]) box(door, [W / 2 - .5, H * .36, .04], [side * W / 4, y, .16], M.ivory);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(.32, .022, 6, 36), M.gold); ring.position.set(side * W / 4, H * .48, .2); door.add(ring);
    }
    for (const side of [-1, 1]) box(door, [.24, H + .3, .3], [side * (W / 2 + .12), (H + .3) / 2, .1], M.gold);
    box(door, [W + .72, .3, .3], [0, H + .15, .1], M.gold);
    const back = plane(door, W, .5, [0, H + .62, .26], lettering(W, .5, [['←  RETURN TO THE MUSEUM', .25, .2, '#e1c393', '600 #px Arial, sans-serif']], '#23303b'));
    press(back, () => callbacks.returnToMuseum?.(), 'Return to the museum (door)');
  }

  // ── Galileo's bay: a window on the night, a telescope, a notebook ────
  const window_ = {bottom: 1.6, width: 3.4, height: 5.6};
  const galileoWall = onWall(bayOf('galileo').angle, .12);
  const GALILEO_STAGE = STAGE - .12;   // the telescope stands on the stage, in this frame
  {
    // The arched window, with an evening over Padua in it.
    const shape = new THREE.Shape(), w = window_.width / 2, straight = window_.height - w;
    shape.moveTo(-w, 0); shape.lineTo(w, 0); shape.lineTo(w, straight); shape.absarc(0, straight, w, 0, Math.PI, false); shape.lineTo(-w, 0);
    const geometry = new THREE.ShapeGeometry(shape, 24), uv = geometry.attributes.uv, pos = geometry.attributes.position;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (pos.getX(i) + w) / (2 * w), pos.getY(i) / window_.height);
    const {canvas, ctx} = canvasFor(window_.width, window_.height), sw = window_.width, sh = window_.height;
    const sky = ctx.createLinearGradient(0, 0, 0, sh); sky.addColorStop(0, '#0a1230'); sky.addColorStop(.72, '#1f3060'); sky.addColorStop(1, '#4a4f72');
    ctx.fillStyle = sky; ctx.fillRect(0, 0, sw, sh);
    const r = seeded(7);
    for (let i = 0; i < 260; i++) { ctx.fillStyle = `rgba(255,248,230,${.3 + r() * .6})`; ctx.beginPath(); ctx.arc(r() * sw, r() * sh * .8, .004 + r() ** 4 * .012, 0, Math.PI * 2); ctx.fill(); }
    // Jupiter, the brightest point in the evening sky, where the telescope looks.
    const jx = sw / 2 + JUPITER_IN_WINDOW.x, jy = sh - JUPITER_IN_WINDOW.y;
    const glow = ctx.createRadialGradient(jx, jy, 0, jx, jy, .22); glow.addColorStop(0, 'rgba(255,244,214,.95)'); glow.addColorStop(.12, 'rgba(255,236,200,.55)'); glow.addColorStop(1, 'rgba(255,236,200,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(jx, jy, .22, 0, Math.PI * 2); ctx.fill();
    // Roofs and a bell tower against the last of the light.
    ctx.fillStyle = '#121624';
    ctx.beginPath(); ctx.moveTo(0, sh);
    for (const [x, y] of [[0, sh - .5], [.5, sh - .55], [.75, sh - .75], [1.0, sh - .55], [1.45, sh - .6], [1.45, sh - 1.75], [1.52, sh - 1.95], [1.6, sh - 1.75], [1.6, sh - .7], [2.1, sh - .65], [2.35, sh - .9], [2.65, sh - .62], [3.4, sh - .5], [3.4, sh]]) ctx.lineTo(x, y);
    ctx.fill();
    const glass = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({map: texture(canvas)}));
    glass.position.y = window_.bottom; galileoWall.add(glass);
    // A gilt frame: jambs, sill and arch.
    for (const side of [-1, 1]) box(galileoWall, [.16, straight, .14], [side * (w + .08), window_.bottom + straight / 2, .02], M.gold);
    box(galileoWall, [window_.width + .44, .12, .26], [0, window_.bottom - .06, .08], M.gold);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(w + .08, .08, 6, 32, Math.PI), M.gold);
    arch.position.set(0, window_.bottom + straight, .02); galileoWall.add(arch);
  }
  // Stars that twinkle in the window: the ones painted on the glass keep still,
  // these brighten and fade one by one. Jupiter, a planet, shines steadily.
  const twinkle = {stars: null, phase: [], speed: []};
  {
    const w = window_.width / 2, straight = window_.height - w, r = seeded(1610), points = [];
    while (points.length < 70 * 3) {
      const x = (r() * 2 - 1) * (w - .12), y = .5 + r() * (window_.height - .7);
      const inside = y < straight || Math.hypot(x, y - straight) < w - .12;
      const nearJupiter = Math.hypot(x - JUPITER_IN_WINDOW.x, y - JUPITER_IN_WINDOW.y) < .35;
      // Above the rooftops and the bell tower painted along the foot of the window.
      if (inside && !nearJupiter && y > 2.1) points.push(x, window_.bottom + y, .03);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(new Array(points.length).fill(1), 3));
    const dot = document.createElement('canvas'); dot.width = dot.height = 32;
    { const ctx = dot.getContext('2d'), g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.3, 'rgba(255,246,220,.6)'); g.addColorStop(1, 'rgba(255,246,220,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 32, 32); }
    twinkle.stars = new THREE.Points(geometry, new THREE.PointsMaterial({size: .07, map: texture(dot), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
    galileoWall.add(twinkle.stars); moving.push(twinkle.stars);
    for (let i = 0; i < points.length / 3; i++) { twinkle.phase.push(r() * Math.PI * 2); twinkle.speed.push(1.5 + r() * 3.5); }
  }

  // ── Galileo's telescope, its stand, and his desk ─────────────────────
  /**
   * Leather with gilt tooling, as on the telescope of Galileo's that survives
   * in Florence covered in leather: u runs round the tube and v along it.
   */
  function tooledLeather() {
    const c = document.createElement('canvas'); c.width = 256; c.height = 1024; const ctx = c.getContext('2d');
    ctx.fillStyle = '#5c2c1c'; ctx.fillRect(0, 0, 256, 1024);
    const r = seeded(1609);
    for (let i = 0; i < 2600; i++) { ctx.fillStyle = r() < .5 ? `rgba(30,12,6,${.05 + r() * .08})` : `rgba(130,74,46,${.05 + r() * .07})`; ctx.fillRect(r() * 256, r() * 1024, 1 + r() * 3, 1 + r() * 2); }
    ctx.fillStyle = '#d8b25e';
    for (const v of [70, 330, 600, 870]) {
      ctx.fillRect(0, v - 13, 256, 3); ctx.fillRect(0, v + 10, 256, 3);
      for (let x = 8; x < 256; x += 32) { ctx.beginPath(); ctx.arc(x, v, 4.5, 0, Math.PI * 2); ctx.fill(); ctx.fillRect(x + 9, v - 1.2, 13, 2.4); }
    }
    ctx.fillStyle = 'rgba(216,178,94,.7)';
    for (let v = 120; v < 980; v += 52) for (let x = (Math.round(v / 52) % 2) * 32; x < 256; x += 64) {
      if ([70, 330, 600, 870].some(b => Math.abs(v - b) < 30)) continue;
      ctx.beginPath(); ctx.moveTo(x, v - 7); ctx.lineTo(x + 4.5, v); ctx.lineTo(x, v + 7); ctx.lineTo(x - 4.5, v); ctx.fill();
    }
    return texture(c);
  }
  /** A turned part: `profile` is [radius, height] pairs from one end to the other, along +y. */
  const turnedPart = (profile, material, segments = 28) => new THREE.Mesh(new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), segments), material);
  const galileoMoving = {scope: null, quill: null, cover: null, flame: null, halo: null, nudge: 0, t: 0};
  // The telescope, built along +y and laid along +z, which lookAt then turns toward Jupiter.
  const scope = new THREE.Group(); scope.name = 'Galileo’s telescope';
  const pivot = new THREE.Vector3(0, 1.75, GALILEO_STAGE);
  {
    scope.position.copy(pivot); galileoWall.add(scope);
    group.updateMatrixWorld(true);
    scope.lookAt(galileoWall.localToWorld(new THREE.Vector3(JUPITER_IN_WINDOW.x, window_.bottom + JUPITER_IN_WINDOW.y, 0)));
    scope.updateMatrixWorld(true);
    const tube = new THREE.Group(); tube.rotation.x = Math.PI / 2; scope.add(tube);
    const leather = new THREE.MeshStandardMaterial({map: tooledLeather(), roughness: .62});
    tube.add(turnedPart([[.0172, -.43], [.0182, -.3], [.0198, -.1], [.0214, .1], [.023, .3], [.0242, .44]], leather, 32));
    // The objective's wooden cell with a brass ring at the front, and the turned eyepiece.
    tube.add(turnedPart([[.0244, .43], [.028, .44], [.029, .47], [.027, .49], [.021, .495]], M.darkWood));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.0275, .0035, 8, 32), M.brass); ring.rotation.x = Math.PI / 2; ring.position.y = .485; tube.add(ring);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(.021, 24), new THREE.MeshStandardMaterial({color: '#9fb6c8', metalness: .6, roughness: .05})); lens.rotation.x = -Math.PI / 2; lens.position.y = .496; tube.add(lens);
    tube.add(turnedPart([[.008, -.52], [.011, -.51], [.0125, -.49], [.0115, -.47], [.016, -.455], [.0175, -.43]], M.darkWood));
    // A proxy larger than the slim tube, so it is easy to aim at.
    const handle = new THREE.Mesh(new THREE.BoxGeometry(.32, .32, 1.15), invisible); scope.add(handle);
    press(handle, () => openTelescope(), 'Galileo’s telescope');
    galileoMoving.scope = scope; galileoMoving.aim = scope.quaternion.clone(); moving.push(scope);
    // The stand: three turned legs on brass feet, a turned column, and a brass fork carrying the tube on a pin.
    const stand = new THREE.Group(); stand.position.set(pivot.x, 0, pivot.z); galileoWall.add(stand);
    const hub = .62, up = new THREE.Vector3(0, 1, 0);
    for (let i = 0; i < 3; i++) {
      const a = i / 3 * Math.PI * 2 + .3, foot = new THREE.Vector3(Math.cos(a) * .42, .02, Math.sin(a) * .42), top = new THREE.Vector3(Math.cos(a) * .05, hub, Math.sin(a) * .05);
      const span = top.clone().sub(foot), leg = turnedPart([[.014, 0], [.02, .1], [.016, .5], [.019, .9], [.014, 1]], M.wood, 12);
      leg.scale.set(1, span.length(), 1); leg.position.copy(foot); leg.quaternion.setFromUnitVectors(up, span.normalize()); stand.add(leg);
      const shoe = new THREE.Mesh(new THREE.SphereGeometry(.024, 10, 8), M.brass); shoe.position.copy(foot); stand.add(shoe);
    }
    const column = turnedPart([[.05, hub - .04], [.06, hub], [.035, hub + .06], [.028, hub + .4], [.034, hub + .55], [.026, hub + .7], [.03, pivot.y - .14], [.04, pivot.y - .1]], M.wood, 20);
    stand.add(column);
    // The fork turns with the tube's bearing; the tube tilts in it on the pin.
    const towards = galileoWall.worldToLocal(scope.localToWorld(new THREE.Vector3(0, 0, 1))).sub(pivot);
    const fork = new THREE.Group(); fork.position.y = pivot.y; fork.rotation.y = Math.atan2(towards.x, towards.z); stand.add(fork);
    for (const side of [-1, 1]) box(fork, [.008, .14, .05], [side * .034, -.05, 0], M.brass);
    box(fork, [.076, .014, .05], [0, -.12, 0], M.brass);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.006, .006, .09, 10), M.brass); pin.rotation.z = Math.PI / 2; fork.add(pin);
  }
  /** A plaque on a slate stand at x, z, turned to face tx, tz, that does `action` when pressed. */
  function plaque(x, z, tx, tz, lines, action, label) {
    const stand = facing(new THREE.Group(), x, z, tx, tz);
    box(stand, [.9, .95, .36], [0, .475, 0], M.slate); box(stand, [.98, .04, .44], [0, .97, 0], M.gold);
    const rake = new THREE.Group(); rake.position.set(0, 1.22, .03); rake.rotation.x = -.55; stand.add(rake);
    box(rake, [.94, .58, .03], [0, 0, -.02], M.gold);
    const plate = plane(rake, .9, .54, [0, 0, .001], lettering(.9, .54, lines));
    press(plate, action, label);
    return plate;
  }
  // Its plaque at the front right of the stage, as every bay's is.
  {
    const at = inRoom(galileoWall, 2.1, GALILEO_STAGE + 1.5);
    plaque(at.x, at.z, 0, 0, [
      ['GALILEO’S TELESCOPE', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Padua, January 1610', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['On 7 January 1610 Galileo turned a telescope', .22, .033],
      ['like this one on Jupiter. Press here, or on the', .27, .033],
      ['telescope, to look where he looked, night', .32, .033],
      ['after night, for the next two months.', .37, .033],
      ['A tube about a metre long, magnifying', .45, .028, '#a99a7c', 'italic #px Georgia, serif'],
      ['about twenty times.', .49, .028, '#a99a7c', 'italic #px Georgia, serif']], () => openTelescope(), 'Galileo plaque');
  }
  // A writing table with the visitor's notebook open on it: every evening they look at is written in.
  const book = {canvas: null, map: null};
  const DESK = {inkwell: new THREE.Vector3(.5, .79, -.2)};
  {
    const at = inRoom(galileoWall, -2.1, GALILEO_STAGE - .4), desk = facing(new THREE.Group(), at.x, at.z, 0, 0);
    // The table: a moulded top, an apron with a drawer, and four turned legs.
    box(desk, [1.56, .045, .82], [0, .775, 0], M.wood); box(desk, [1.5, .03, .76], [0, .745, 0], M.darkWood);
    box(desk, [1.36, .12, .64], [0, .67, 0], M.wood);
    box(desk, [.44, .08, .01], [0, .67, .325], M.darkWood);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(.014, 10, 8), M.brass); knob.position.set(0, .67, .335); desk.add(knob);
    for (const [x, z] of [[-.66, -.3], [.66, -.3], [-.66, .3], [.66, .3]]) {
      const leg = turnedPart([[.026, 0], [.022, .06], [.03, .12], [.02, .3], [.026, .5], [.024, .6], [.034, .61], [.034, .73]], M.darkWood, 14);
      leg.position.set(x, 0, z); desk.add(leg);
    }
    // Read from half a metre, so painted finer than the signs: 2,000 pixels a metre.
    const canvas = document.createElement('canvas'); canvas.width = 1520; canvas.height = 1000; book.canvas = canvas; book.map = texture(canvas);
    const paper = new THREE.MeshStandardMaterial({map: book.map, roughness: .9});
    const pages = new THREE.Mesh(new THREE.PlaneGeometry(.76, .5), paper);
    pages.rotation.x = -Math.PI / 2 + .12; pages.position.set(0, .82, .04); desk.add(pages);
    box(desk, [.8, .025, .54], [0, .805, .04], M.leather);
    // The paper not yet written on: a strip over a new line, drawn back as the quill writes.
    const cover = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshStandardMaterial({color: '#efe4c8', roughness: .9}));
    cover.geometry.translate(.5, 0, 0); cover.position.z = .0015; cover.visible = false; pages.add(cover);
    galileoMoving.cover = cover; galileoMoving.pages = pages; moving.push(cover);
    // The inkwell, and a quill standing in it.
    const well = turnedPart([[.0, 0], [.042, 0], [.046, .02], [.04, .05], [.022, .06], [.024, .072], [.016, .074]], new THREE.MeshStandardMaterial({color: '#1b2a2e', metalness: .3, roughness: .15}), 20);
    well.position.copy(DESK.inkwell).setY(.795); desk.add(well);
    const quill = new THREE.Group();
    { const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.0018, .003, .3, 6), M.paper); shaft.position.y = .15; quill.add(shaft);
      const vane = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshStandardMaterial({color: '#f2ece0', roughness: .8, side: THREE.DoubleSide}));
      vane.scale.set(.022, .11, .002); vane.position.y = .2; vane.rotation.z = .08; quill.add(vane); }
    desk.add(quill); galileoMoving.quill = quill; galileoMoving.desk = desk; moving.push(quill);
    // A candle in a brass stick, its flame flickering, and a stack of books.
    const stick = turnedPart([[.0, .795], [.06, .795], [.062, .805], [.02, .815], [.012, .86], [.018, .9], [.02, .905]], M.brass, 20);
    stick.position.set(-.55, 0, -.18); desk.add(stick);
    const wax = new THREE.Mesh(new THREE.CylinderGeometry(.014, .015, .14, 14), new THREE.MeshStandardMaterial({color: '#efe7d2', roughness: .7})); wax.position.set(-.55, .975, -.18); desk.add(wax);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial({color: '#ffc561'}));
    flame.geometry.translate(0, .7, 0); flame.scale.set(.008, .022, .008); flame.position.set(-.55, 1.05, -.18); desk.add(flame);
    const haloCanvas = document.createElement('canvas'); haloCanvas.width = haloCanvas.height = 64;
    { const ctx = haloCanvas.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,214,140,.9)'); g.addColorStop(.35, 'rgba(255,170,80,.35)'); g.addColorStop(1, 'rgba(255,150,60,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); }
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({map: texture(haloCanvas), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true}));
    halo.scale.setScalar(.22); halo.position.set(-.55, 1.07, -.18); desk.add(halo);
    galileoMoving.flame = flame; galileoMoving.halo = halo; moving.push(flame, halo);
    const covers = ['#5a2a1c', '#2e3d2a', '#6b4a22'];
    covers.forEach((color, i) => {
      const w = .26 - i * .02, d = .19 - i * .012, h = .045 - i * .006, y = .8 + [0, .045, .084][i] + h / 2;
      box(desk, [w, h, d], [.48, y, .14 + i * .008], new THREE.MeshStandardMaterial({color, roughness: .7}));
      box(desk, [w - .012, h - .01, d + .002], [.484, y, .14 + i * .008], M.paper);
    });
    press(pages, () => openTelescope(), 'Notebook');
    // A chair drawn up behind the table, facing the room, as if he had just stood up to look.
    const chair = new THREE.Group(); chair.position.set(.15, 0, -.62); chair.rotation.y = .25; desk.add(chair);
    box(chair, [.46, .04, .44], [0, .46, 0], M.wood);
    box(chair, [.42, .03, .4], [0, .485, 0], new THREE.MeshStandardMaterial({color: '#6b2a22', roughness: .85}));
    for (const [x, z] of [[-.2, -.18], [.2, -.18], [-.2, .18], [.2, .18]]) {
      const leg = turnedPart([[.018, 0], [.022, .08], [.016, .25], [.02, .44]], M.darkWood, 10); leg.position.set(x, 0, z); chair.add(leg);
    }
    for (const x of [-.2, .2]) box(chair, [.035, .55, .035], [x, .74, -.2], M.darkWood);
    box(chair, [.44, .1, .03], [0, .92, -.2], M.wood); box(chair, [.44, .05, .025], [0, .7, -.2], M.wood);
  }
  // A rug of the time under the telescope and the table: a red field, a medallion, borders in gold and blue.
  {
    const W = 4.2, D = 2.6, c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * D / W);
    const ctx = c.getContext('2d'), w = c.width, h = c.height;
    ctx.fillStyle = '#6e2019'; ctx.fillRect(0, 0, w, h);
    const band = (inset, width, color) => { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2); };
    band(10, 14, '#c9a664'); band(34, 30, '#20304a'); band(58, 6, '#c9a664');
    // Motifs along the blue border.
    ctx.fillStyle = '#c9a664';
    for (let x = 60; x < w - 50; x += 46) for (const y of [34, h - 34]) { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.fill(); }
    for (let y = 80; y < h - 70; y += 46) for (const x of [34, w - 34]) { ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 9, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 9, y); ctx.fill(); }
    // The central medallion, and quarter medallions in the corners of the field.
    const medallion = (x, y, r) => {
      ctx.fillStyle = '#20304a'; ctx.beginPath(); ctx.ellipse(x, y, r * 1.6, r, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 5; ctx.stroke();
      ctx.fillStyle = '#b8862e'; ctx.beginPath(); ctx.ellipse(x, y, r * .8, r * .5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#6e2019'; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.arc(x + Math.cos(a * Math.PI / 4) * r * 1.15, y + Math.sin(a * Math.PI / 4) * r * .72, r * .12, 0, Math.PI * 2); ctx.fill(); }
    };
    medallion(w / 2, h / 2, 110);
    for (const [x, y] of [[70, 70], [w - 70, 70], [70, h - 70], [w - 70, h - 70]]) medallion(x, y, 50);
    // Wear and the weave.
    const r = seeded(1592);
    for (let i = 0; i < 5000; i++) { ctx.fillStyle = `rgba(${r() < .5 ? '20,8,6' : '230,190,140'},${r() * .06})`; ctx.fillRect(r() * w, r() * h, 2, 1); }
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({map: texture(c), roughness: .95}));
    rug.rotation.x = -Math.PI / 2;
    const at = inRoom(galileoWall, -.95, GALILEO_STAGE - .15); rug.position.set(at.x, .028, at.z);
    rug.rotation.z = bayOf('galileo').angle * deg + Math.PI;   // laid square to the wall
    group.add(rug);
  }
  quillPose(0);
  /** Where a line of the notebook lies on the page, in the page's own metres. */
  const notebookRow = slot => { const column = slot < 8 ? 0 : 1, row = slot % 8; return {x: 30 + column * 380, y: 120 + row * 46}; };
  const pageAt = (px, py) => new THREE.Vector3((px / 760 - .5) * .76, (.5 - py / 500) * .5, 0);
  /** The quill's pose: resting in the inkwell, or writing at a point on the page. */
  function quillPose(t) {
    const q = galileoMoving.quill, w = galileoMoving.writing, rest = DESK.inkwell.clone().setY(.83);
    if (!w) { q.position.copy(rest); q.rotation.set(-.35, 0, .28); return; }
    const {x, y} = notebookRow(w.slot), start = galileoMoving.pages.localToWorld(pageAt(x + 6, y + 4)), end = galileoMoving.pages.localToWorld(pageAt(x + 335, y + 4));
    galileoMoving.desk.worldToLocal(start); galileoMoving.desk.worldToLocal(end);
    const ease = s => s < .5 ? 2 * s * s : 1 - (-2 * s + 2) ** 2 / 2;
    // Out of the inkwell to the line (0 to .25), along it (.25 to .8), back (.8 to 1).
    let p;
    if (t < .25) { const s = ease(t / .25); p = rest.clone().lerp(start, s); p.y += Math.sin(s * Math.PI) * .07; }
    else if (t < .8) { const s = (t - .25) / .55; p = start.clone().lerp(end, s); p.z += Math.sin(s * 40) * .004; p.y += Math.abs(Math.sin(s * 22)) * .004; }
    else { const s = ease((t - .8) / .2); p = end.clone().lerp(rest, s); p.y += Math.sin(s * Math.PI) * .07; }
    q.position.copy(p); q.rotation.set(-.55, .2, .35 + Math.sin(t * 30) * .03 * (t > .25 && t < .8));
    // The strip over the new line draws back behind the nib.
    const reveal = Math.max(0, Math.min(1, (t - .22) / .58)), from = pageAt(x - 4, y - 2), to = pageAt(x + 345, y - 2);
    const cover = galileoMoving.cover;
    cover.visible = reveal < 1; cover.position.set(from.x + (to.x - from.x) * reveal, from.y, .0015);
    cover.scale.set(Math.max(.001, (to.x - from.x) * (1 - reveal)), .034, 1);   // a line is some 30 of the page's 500 pixels tall
  }
  /** Each frame: the stars, the candle, the quill, and the telescope settling after a turn of the eye. */
  function animateGalileo(dt) {
    const g = galileoMoving; g.t += dt;
    const colors = twinkle.stars.geometry.attributes.color;
    for (let i = 0; i < colors.count; i++) { const b = .35 + .65 * (.5 + .5 * Math.sin(g.t * twinkle.speed[i] + twinkle.phase[i])) ** 3; colors.setXYZ(i, b, b, b * .92); }
    colors.needsUpdate = true;
    const flicker = 1 + Math.sin(g.t * 13) * .1 + Math.sin(g.t * 31.7) * .05 + Math.sin(g.t * 5.3) * .06;
    g.flame.scale.set(.008 * (2 - flicker), .022 * flicker, .008 * (2 - flicker)); g.flame.rotation.z = Math.sin(g.t * 3.1) * .08;
    g.halo.material.opacity = .75 + (flicker - 1) * 1.6;
    if (g.writing) { g.writing.t += dt / 2.6; if (g.writing.t >= 1) { g.writing = null; g.cover.visible = false; } quillPose(g.writing?.t ?? 0); }
    if (g.nudge > 0) {
      g.nudge = Math.max(0, g.nudge - dt);
      const swing = Math.sin((1 - g.nudge / 1.2) * Math.PI * 3) * (g.nudge / 1.2) * .025;
      g.scope.quaternion.copy(g.aim).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), swing));
    }
  }
  /** A new evening for the notebook: the quill writes its line, and the telescope is nudged to Jupiter's new place. */
  function writeEvening(index) {
    const rows = [...state.seen].sort((a, b) => a - b).slice(-16), slot = rows.indexOf(index);
    if (slot < 0) return;
    galileoMoving.writing = {t: 0, slot};
    quillPose(0);
  }

  // ── The Webb ─────────────────────────────────────────────────────────
  const webbPlace = new THREE.Group(); webbPlace.name = 'Webb telescope';
  webbPlace.position.set(WEBB.x, 0, WEBB.z); webbPlace.rotation.y = WEBB.turn; group.add(webbPlace);
  // Its lectern, to the left of the way in, toward the telescope.
  const lectern = facing(new THREE.Group(), -3.8, ARRIVAL.z - 4.4, ARRIVAL.x, ARRIVAL.z);
  {
    box(lectern, [1.5, 1.0, .46], [0, .5, 0], M.slate); box(lectern, [1.58, .045, .54], [0, 1.02, 0], M.gold);
    const rake = new THREE.Group(); rake.position.set(0, 1.34, .04); rake.rotation.x = -.52; lectern.add(rake);
    box(rake, [1.52, .9, .04], [0, 0, -.03], M.gold);
    const plate = plane(rake, 1.44, .82, [0, 0, .001], lettering(1.44, .82, [
      ['THE JAMES WEBB SPACE TELESCOPE', .11, .06, '#e1c393', '600 #px Arial, sans-serif'],
      ['Full size. Launched 25 December 2021.', .2, .048, '#c8b793', 'italic #px Georgia, serif'],
      ['Its sunshield is as large as a tennis court;', .33, .052],
      ['its gold mirror is 6.5 metres across.', .41, .052],
      ['Point at any part of the telescope', .52, .052],
      ['to learn what it does.', .6, .052],
      ['Model: NASA, simplified for this museum', .74, .036, '#a99a7c', 'italic #px Georgia, serif']]));
    press(plate, () => openPart('webb'), 'Webb lectern');
  }
  // Two Jupiters in one bay: as Galileo saw it on the left, as Webb sees it on the right.
  const jupiterFrames = {galileo: null, webb: null};
  {
    const placeholder = document.createElement('canvas'); placeholder.width = placeholder.height = 4;
    const bay = bayOf('jupiters').angle, y = 3.0;
    // Webb's picture, 1646 by 1561 pixels. Each frame hangs flat against the curve where it is.
    const wide = 2.9, tall = wide * 1561 / 1646, webbWall = onWall(beside(bay, .75), .1);
    box(webbWall, [wide + .22, tall + .22, .1], [0, y, .02], M.gold);
    jupiterFrames.webb = plane(webbWall, wide, tall, [0, y, .08], texture(placeholder));
    press(jupiterFrames.webb, () => openJupiter(), 'Webb’s Jupiter');
    plane(webbWall, wide + .2, .42, [0, y - tall / 2 - .38, .08], lettering(wide + .2, .42, [
      ['JUPITER, SEEN BY WEBB · 27 JULY 2022', .12, .07, '#e1c393', '600 #px Arial, sans-serif'],
      ['Infrared: auroras over both poles, high hazes, the Great Red Spot', .22, .055, '#f1ddba', 'italic #px Georgia, serif'],
      [JUPITER_CREDIT, .33, .05, '#c4b898', '#px Arial, sans-serif']]));
    const small = 1.5, galileoView = onWall(beside(bay, -2.05), .1);
    box(galileoView, [small + .18, small + .18, .1], [0, y, .02], M.gold);
    jupiterFrames.galileo = plane(galileoView, small, small, [0, y, .08], texture(placeholder));
    press(jupiterFrames.galileo, () => openJupiter(), 'Galileo’s Jupiter');
    plane(galileoView, small + .5, .42, [0, y - small / 2 - .38, .08], lettering(small + .5, .42, [
      ['JUPITER, AS GALILEO SAW IT', .12, .07, '#e1c393', '600 #px Arial, sans-serif'],
      ['7 January 1610, from Padua', .23, .055, '#f1ddba', 'italic #px Georgia, serif'],
      ['Positions: JPL Horizons (NASA)', .33, .05, '#c4b898', '#px Arial, sans-serif']]));
  }

  // ── The exhibitions, each its own module, built from the kit ──────────
  /**
   * What an exhibit is given to build itself with: the room's makers and
   * materials, a frame on the wall to stand at, a panel of its own, and the
   * way into the timeline's story of its moment. Every bay's stage stands
   * STAGE metres in from the wall, and its plaque at the stage's front right.
   */
  const kit = {
    THREE, M, deg, radius: R, STAGE, box, plane, lettering, canvasFor, texture, seeded, wrapped, board,
    onWall, inRoom, facing, press, plaque,
    /** Parts that move, and so keep meshes of their own when the room's still parts are merged. */
    moving: (...parts) => moving.push(...parts),
    /** Merge a moving part's own pieces, in its own frame, leaving out the parts within it that move on their own. */
    settle: (root, keep = []) => settle(root, keep),
    /** A panel of the exhibit's own: `paint` answers its canvas, `actions` its buttons, `zones` places on it to press. */
    panel: (kind, spec) => { panelSpecs[kind] = spec; },
    open: kind => open(kind), redraw: () => { if (panel) drawPanel(); }, close: () => closePanel(), showing: () => state.panelKind,
    story: id => callbacks.story?.(id),
    load: url => fetch(new URL(url, import.meta.url)).then(r => r.ok ? r.json() : Promise.reject(new Error(`${url} could not be loaded`)))
  };
  const at = id => ({angle: bayOf(id).angle});
  const exhibits = [createSpeedOfLight(kit, at('romer')), createPrintingPress(kit, at('gutenberg')),
    createPeriodicTable(kit, at('mendeleev')), createDoubleHelix(kit, at('dna')),
    createContinentalDrift(kit, at('wegener')), createMendel(kit, at('mendel')),
    createTuringMachine(kit, at('turing')), createSuSongClock(kit, at('susong'))];
  const exhibit = Object.fromEntries(exhibits.map(e => [e.id, e]));

  // ── The way in: a plan of the labs, and the way back ─────────────────
  /** Go to a bay: stand before its exhibit, facing it. */
  function goTo(id) {
    const {x, z, yaw} = standAt(bayOf(id).angle);
    closePanel(); callbacks.goTo?.(x, z + WING_Z, yaw);
  }
  const GROUPS = {sky: {name: 'THE SKY', color: '#6f9fd8'}, matter: {name: 'MATTER AND THE EARTH', color: '#7fb069'},
    machines: {name: 'MACHINES', color: '#d9a441'}, life: {name: 'LIFE', color: '#d9776a'}};
  const MAP = {w: 1.6, h: 1.04, px: 900};   // the plate in metres, and pixels to the metre
  const mapRows = [];   // where each name is listed on the plate, in its pixels
  const mapDots = [];   // where each bay is on the plan
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = Math.round(MAP.w * MAP.px); mapCanvas.height = Math.round(MAP.h * MAP.px);
  {
    const ctx = mapCanvas.getContext('2d'), W = mapCanvas.width, H = mapCanvas.height;
    ctx.fillStyle = '#172027'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(201,166,100,.6)'; ctx.lineWidth = 3; ctx.strokeRect(10, 10, W - 20, H - 20);
    ctx.fillStyle = '#e1c393'; ctx.font = '600 58px Arial, sans-serif'; ctx.letterSpacing = '6px'; ctx.fillText('DISCOVERY LABS', 46, 92); ctx.letterSpacing = '0px';
    ctx.fillStyle = '#c8b793'; ctx.font = 'italic 30px Georgia, serif'; ctx.fillText('Ten discoveries to try for yourself. Press one to go to it.', 48, 138, W - 90);
    // The plan, the way in at the foot, as the visitor stands to read it.
    const cx = 330, cy = 560, k = 250 / R;
    ctx.fillStyle = '#20302f'; ctx.beginPath(); ctx.arc(cx, cy, R * k, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 4; ctx.stroke();
    ctx.save(); ctx.translate(cx + WEBB.x * k, cy + WEBB.z * k); ctx.scale(ROPE.across * k, ROPE.along * k);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.restore();
    ctx.fillStyle = '#3a3550'; ctx.fill(); ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#e8d9b2'; ctx.font = '600 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('THE WEBB', cx + WEBB.x * k, cy + WEBB.z * k + 8);
    ctx.fillStyle = '#c8b793'; ctx.font = '20px Arial'; ctx.fillText('THE WAY IN', cx, cy + R * k + 34);
    // You are here.
    ctx.fillStyle = '#f4dca2'; ctx.beginPath(); ctx.arc(cx + ARRIVAL.x * k, cy + ARRIVAL.z * k, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4dca2'; ctx.font = '600 18px Arial'; ctx.fillText('YOU ARE HERE', cx + ARRIVAL.x * k, cy + ARRIVAL.z * k - 18);
    BAYS.forEach((b, i) => {
      const a = b.angle * deg, x = cx + Math.sin(a) * (R - STAGE) * k, y = cy + Math.cos(a) * (R - STAGE) * k;
      ctx.fillStyle = GROUPS[b.group].color; ctx.beginPath(); ctx.arc(x, y, 21, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#10161b'; ctx.font = 'bold 22px Arial'; ctx.fillText(String(i + 1), x, y + 8);
      mapDots.push({id: b.id, x, y});
    });
    ctx.textAlign = 'left';
    // The list, by theme.
    let y = 224;
    for (const [key, g] of Object.entries(GROUPS)) {
      ctx.fillStyle = g.color; ctx.font = '600 24px Arial'; ctx.letterSpacing = '3px'; ctx.fillText(g.name, 660, y); ctx.letterSpacing = '0px'; y += 40;
      BAYS.forEach((b, i) => {
        if (b.group !== key) return;
        ctx.fillStyle = g.color; ctx.beginPath(); ctx.arc(678, y - 10, 15, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#10161b'; ctx.font = 'bold 18px Arial'; ctx.textAlign = 'center'; ctx.fillText(String(i + 1), 678, y - 4); ctx.textAlign = 'left';
        ctx.fillStyle = '#f1ddba'; ctx.font = '28px Georgia'; ctx.fillText(b.name, 706, y, 640);
        mapRows.push({id: b.id, y0: y - 32, y1: y + 10});
        y += 44;
      });
      y += 14;
    }
  }
  // Straight ahead of the way in, so the plan lies the way the room does to the visitor reading it.
  const mapDesk = facing(new THREE.Group(), ARRIVAL.x, ARRIVAL.z - 3.2, ARRIVAL.x, ARRIVAL.z);
  {
    box(mapDesk, [1.7, 1.0, .5], [0, .5, 0], M.slate); box(mapDesk, [1.78, .045, .58], [0, 1.02, 0], M.gold);
    const rake = new THREE.Group(); rake.position.set(0, 1.38, .06); rake.rotation.x = -.62; mapDesk.add(rake);
    box(rake, [MAP.w + .08, MAP.h + .08, .04], [0, 0, -.03], M.gold);
    const plate = plane(rake, MAP.w, MAP.h, [0, 0, .001], texture(mapCanvas));
    // A press on a name in the list, or a numbered dot on the plan, goes there.
    const local = new THREE.Vector3();
    press(plate, hit => {
      if (!hit?.point) return;
      plate.worldToLocal(local.copy(hit.point));
      const px = (local.x / MAP.w + .5) * mapCanvas.width, py = (.5 - local.y / MAP.h) * mapCanvas.height;
      const row = px > 640 && mapRows.find(r => py >= r.y0 && py <= r.y1);
      const dot = mapDots.find(d => Math.hypot(d.x - px, d.y - py) < 30);
      const target = row?.id || dot?.id;
      if (target) goTo(target);
    }, 'Plan of the labs');
    const back = plane(mapDesk, 1.5, .24, [0, .62, .255], lettering(1.5, .24, [['←  RETURN TO THE MUSEUM', .12, .085, '#f1ddba', '600 #px Arial, sans-serif']], '#23303b'));
    press(back, () => callbacks.returnToMuseum?.(), 'Return to the museum');
  }

  // The medallions, one draw for each of their three parts.
  {
    const o = new THREE.Object3D(), rings = [[1.75, .022], [1.56, .017]];
    for (const [radius, tube] of rings) {
      const mesh = new THREE.InstancedMesh(new THREE.TorusGeometry(radius, tube, 6, 56), M.gold, medallions.length);
      medallions.forEach(([x, z], i) => { o.position.set(x, .022, z); o.rotation.set(Math.PI / 2, 0, 0); o.scale.set(1, 1, 1); o.updateMatrix(); mesh.setMatrixAt(i, o.matrix); });
      group.add(mesh);
    }
    const petals = new THREE.InstancedMesh(new THREE.BoxGeometry(.14, .013, 1.43), M.stone, medallions.length * 8);
    medallions.forEach(([x, z], i) => {
      for (let p = 0; p < 8; p++) {
        const a = p * Math.PI / 4;
        o.position.set(x + Math.sin(a) * .77, .015, z + Math.cos(a) * .77); o.rotation.set(0, a, 0); o.updateMatrix(); petals.setMatrixAt(i * 8 + p, o.matrix);
      }
    });
    group.add(petals);
  }
  settle(group, moving);

  // ── Loading what comes from files ────────────────────────────────────
  let environment = null;
  function setEnvironment(map) {
    environment = map;
    group.traverse(o => { for (const m of [o.material].flat()) if (m?.isMeshStandardMaterial && m.metalness >= .3 && !m.envMap) { m.envMap = map; m.envMapIntensity = .85; m.needsUpdate = true; } });
  }
  /**
   * Fetch the evenings, the model and the photograph. Each is fetched once;
   * one that fails is tried again the next time this is asked, which is the
   * next time a visitor arrives, so a dropped connection is not for good.
   */
  const loading = {};
  function prepare() {
    loading.nights ??= fetch(new URL('../data/galileo-nights.json', import.meta.url)).then(r => r.ok ? r.json() : Promise.reject(new Error('the evenings could not be loaded')))
      .then(data => { state.nights = data.nights; paintNotebook(); paintGalileoFrame(); if (state.panelKind === 'telescope') drawPanel(); })
      .catch(error => { loading.nights = null; console.warn('Galileo’s evenings could not be loaded:', error); });
    loading.webb ??= loadGLB(THREE, new URL('../assets/models/webb.glb', import.meta.url).href).then(model => {
      model.traverse(o => { if (o.isMesh) { o.matrixAutoUpdate = false; o.updateMatrix(); } });
      webbPlace.add(model); state.webb = model; state.webbError = null;
      if (environment) setEnvironment(environment);
      // Where each named part lies, as boxes to aim at.
      for (const [id, region] of Object.entries(model.userData.regions || {})) {
        if (id === 'telescope') continue;
        const size = region.max.map((v, i) => v - region.min[i]), centre = region.max.map((v, i) => (v + region.min[i]) / 2);
        const spot = new THREE.Mesh(new THREE.BoxGeometry(...size.map(v => Math.max(v, .3))), invisible);
        spot.position.fromArray(centre); spot.name = `Webb ${id}`; spot.userData.part = id;
        spot.userData.volume = size.reduce((a, b) => a * Math.max(b, .3), 1);
        webbPlace.add(spot); hotspots.push(spot);
        press(spot, () => openPart(pointedPart()), `Webb ${id}`);
      }
      callbacks.added?.(hotspots);
    }).catch(error => { state.webbError = error.message; loading.webb = null; console.warn('The Webb model could not be loaded:', error); });
    loading.photo ??= new Promise(resolve => {
      const image = new Image();
      image.onload = () => { state.jupiter = image; const map = texture(image); jupiterFrames.webb.material.map = map; jupiterFrames.webb.material.needsUpdate = true; if (state.panelKind === 'jupiter') drawPanel(); resolve(); };
      image.onerror = () => { loading.photo = null; resolve(); };
      image.src = new URL('../assets/photos/webb-jupiter-2022.jpg', import.meta.url).href;
    });
    for (const e of exhibits) if (e.prepare) loading[e.id] ??= e.prepare().catch(error => { loading[e.id] = null; console.warn(`The ${e.id} exhibit could not be loaded:`, error); });
    return Promise.allSettled([loading.nights, loading.webb, loading.photo, ...exhibits.map(e => loading[e.id])]);
  }
  /**
   * Which part of the Webb the visitor is pointing at: where the ray meets the
   * telescope itself, inside the smallest named part that holds that point.
   * The boxes overlap — the spacecraft sits under the sunshield — so the box
   * hit first is not the answer; the model is, tested once, on the press.
   */
  const ray = new THREE.Raycaster(), inside = new THREE.Box3();
  function pointedPart() {
    if (!state.webb || !callbacks.raycaster) return 'webb';
    ray.ray.copy(callbacks.raycaster.ray);
    const hit = ray.intersectObject(state.webb, true)[0];
    if (!hit) return 'webb';
    const holding = hotspots.filter(spot => inside.setFromObject(spot).expandByScalar(.05).containsPoint(hit.point));
    holding.sort((a, b) => a.userData.volume - b.userData.volume);
    return holding[0]?.userData.part || 'telescope';
  }

  // ── The evening sky, as the telescope shows it ───────────────────────
  /**
   * What a telescope like Galileo's shows: a field some twenty minutes of arc
   * across, about 25 Jupiter radii from the centre to the edge, and nothing
   * within a radius and a half of the planet, where its glare swallows a moon.
   * With those two limits the eyepiece agrees with what he wrote down: on
   * 7 January Callisto, 23.6 radii out, was the far star to the east; the next
   * evening, at 26, it had left the field and all he saw was to the west.
   */
  const FIELD = 25, GLARE = 1.5;
  const visible = moon => { const r = Math.hypot(moon[0], moon[1]); return r > GLARE && r < FIELD; };
  /** The view through the eyepiece: east on the left, as Galileo drew it. */
  function drawLens(ctx, cx, cy, radius, night, {labels = true} = {}) {
    const scale = radius / FIELD;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2); ctx.fillStyle = '#2a2219'; ctx.fill();
    const sky = ctx.createRadialGradient(cx, cy, radius * .1, cx, cy, radius); sky.addColorStop(0, '#0d1220'); sky.addColorStop(1, '#04060b');
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    if (night) {
      const glow = (x, y, r, a) => { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, `rgba(255,246,222,${a})`); g.addColorStop(1, 'rgba(255,246,222,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
      glow(cx, cy, scale * 3.2, .35);
      ctx.fillStyle = '#f6ead0'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(scale, 3), 0, Math.PI * 2); ctx.fill();
      for (const moon of night.moons) if (visible(moon)) {
        const x = cx - moon[0] * scale, y = cy - moon[1] * scale;
        glow(x, y, Math.max(5, scale * .9), .45);
        ctx.fillStyle = '#fbf6ea'; ctx.beginPath(); ctx.arc(x, y, Math.max(1.6, scale * .26), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
    if (labels) {
      ctx.fillStyle = '#b3a98c'; ctx.font = '22px Arial'; ctx.textAlign = 'left'; ctx.fillText('◂ EAST', cx - radius, cy + radius + 46);
      ctx.textAlign = 'right'; ctx.fillText('WEST ▸', cx + radius, cy + radius + 46); ctx.textAlign = 'left';
    }
  }
  /** The same evening from above Jupiter's pole, Earth below. */
  function drawAbove(ctx, cx, cy, radius, night) {
    const scale = radius / 29;
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, radius + 14, 0, Math.PI * 2); ctx.fillStyle = '#2a2219'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fillStyle = '#0b1019'; ctx.fill(); ctx.clip();
    ctx.strokeStyle = '#3e4a5e'; ctx.lineWidth = 2;
    for (const r of MOON_ORBITS) { ctx.beginPath(); ctx.arc(cx, cy, r * scale, 0, Math.PI * 2); ctx.stroke(); }
    ctx.fillStyle = '#f6ead0'; ctx.beginPath(); ctx.arc(cx, cy, Math.max(scale, 4), 0, Math.PI * 2); ctx.fill();
    if (night) night.moons.forEach((moon, i) => {
      const x = cx - moon[0] * scale, y = cy - moon[2] * scale;
      // Down toward Earth: where the moon falls on the line seen through the lens.
      ctx.setLineDash([6, 8]); ctx.strokeStyle = '#6c7487'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, cy + radius); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = visible(moon) ? '#fbf6ea' : '#7d8496'; ctx.beginPath(); ctx.arc(x, y, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#d9cfb6'; ctx.font = '20px Georgia'; ctx.fillText(MOON_NAMES[i], x + 11, y - 9);
    });
    ctx.restore();
    ctx.fillStyle = '#b3a98c'; ctx.font = '22px Arial'; ctx.textAlign = 'center'; ctx.fillText('▾ TOWARD EARTH ▾', cx, cy + radius + 46); ctx.textAlign = 'left';
  }
  /** One line of the notebook, in Galileo's manner: the planet, and stars beside it. */
  function drawNotebookLine(ctx, x, y, width, night, ink, strong) {
    const cx = x + width / 2, scale = width / 2 / FIELD;
    ctx.strokeStyle = ink; ctx.lineWidth = strong ? 2.2 : 1.6;
    ctx.beginPath(); ctx.arc(cx, y, 6.5, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ink; ctx.font = `${strong ? 26 : 22}px Georgia`; ctx.textAlign = 'center';
    for (const moon of night.moons) if (visible(moon)) ctx.fillText('*', cx - moon[0] * scale, y + 9);
    ctx.textAlign = 'left';
  }
  const shortDate = night => night.date.replace(/ 1610$/, '').replace(/January/, 'Jan').replace(/February/, 'Feb').replace(/March/, 'Mar');

  // ── The notebook on the desk ─────────────────────────────────────────
  function paintNotebook() {
    const c = book.canvas, ctx = c.getContext('2d'), w = c.width, h = c.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#efe4c8'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d9cba8'; ctx.fillRect(w / 2 - 3, 0, 6, h);
    ctx.setTransform(w / 760, 0, 0, h / 500, 0, 0);       // drawn on 760 by 500
    ctx.fillStyle = '#3b2a1c'; ctx.font = 'italic 30px Georgia'; ctx.fillText('Jupiter, from Padua', 30, 52);
    ctx.font = '18px Georgia'; ctx.fillStyle = '#6d5a43'; ctx.fillText('East ←            → West', 30, 82);
    const seen = [...state.seen].sort((a, b) => a - b);
    if (!seen.length || !state.nights) {
      ctx.font = 'italic 21px Georgia'; ctx.fillStyle = '#6d5a43';
      ['Look through the telescope,', 'and every evening you see', 'is written here.'].forEach((line, i) => ctx.fillText(line, 400, 150 + i * 34));
      book.map.needsUpdate = true;
      return;
    }
    const rows = seen.slice(-16);
    rows.forEach((index, i) => {
      const night = state.nights[index], column = i < 8 ? 0 : 1, row = i % 8, x = 30 + column * 380, y = 120 + row * 46;
      ctx.fillStyle = '#3b2a1c'; ctx.font = '19px Georgia'; ctx.fillText(shortDate(night), x, y + 6);
      drawNotebookLine(ctx, x + 70, y, 270, night, '#3b2a1c', false);
    });
    book.map.needsUpdate = true;
  }
  function paintGalileoFrame() {
    const c = document.createElement('canvas'); c.width = c.height = 768; const ctx = c.getContext('2d');
    ctx.fillStyle = '#100d09'; ctx.fillRect(0, 0, 768, 768);
    drawLens(ctx, 384, 360, 300, state.nights?.[0], {labels: false});
    ctx.fillStyle = '#b3a98c'; ctx.font = '26px Arial'; ctx.textAlign = 'left'; ctx.fillText('◂ EAST', 70, 728); ctx.textAlign = 'right'; ctx.fillText('WEST ▸', 698, 728);
    const old = jupiterFrames.galileo.material.map;
    jupiterFrames.galileo.material.map = texture(c); jupiterFrames.galileo.material.needsUpdate = true; old?.dispose();
  }
  paintNotebook(); paintGalileoFrame();

  // ── Panels: the eyepiece, a part of the Webb, two Jupiters ───────────
  let panel = null, panelTargets = [];
  function wrapped(ctx, text, width) {
    const out = []; let line = '';
    for (const word of text.split(/\s+/)) { const next = line ? line + ' ' + word : word; if (ctx.measureText(next).width > width && line) { out.push(line); line = word; } else line = next; }
    if (line) out.push(line); return out;
  }
  /** The board every panel is painted on: the reading panel's size, colours and border. */
  function board(kicker, title) {
    const c = document.createElement('canvas'); c.width = 1800; c.height = 1500; const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'high'; ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#20271f'; ctx.fillRect(0, 0, 1200, 1000);
    ctx.strokeStyle = '#9e8859'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 1184, 984);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '26px Arial'; ctx.fillText(kicker, 60, 64, 1080);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '44px Georgia'; ctx.fillText(title, 60, 124, 1080);
    return {canvas: c, ctx};
  }
  function paintTelescope() {
    const nights = state.nights, night = nights?.[state.night];
    const {canvas, ctx} = board('GALILEO’S TELESCOPE · PADUA', night ? night.date : 'Preparing the evening…');
    if (!night) return canvas;
    ctx.fillStyle = '#b3a98c'; ctx.font = '24px Arial';
    ctx.fillText(`EVENING ${state.night + 1} OF ${nights.length} · ABOUT AN HOUR AFTER SUNSET`, 60, 162, 1080);
    const above = state.mode === 'above';
    if (above) drawAbove(ctx, 300, 455, 245, night); else drawLens(ctx, 300, 455, 245, night);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '26px Georgia';
    wrapped(ctx, above ? ABOVE_NOTE : NIGHT_NOTES[night.date] || NIGHT_DEFAULT, 500).slice(0, 5).forEach((line, i) => ctx.fillText(line, 60, 790 + i * 34));
    // The notebook: every evening looked at so far.
    ctx.fillStyle = '#d9bc7d'; ctx.font = '24px Arial'; ctx.fillText('YOUR NOTEBOOK', 640, 226);
    ctx.fillStyle = '#9d9786'; ctx.font = '19px Arial'; ctx.fillText('EAST', 742, 254); ctx.textAlign = 'right'; ctx.fillText('WEST', 1140, 254); ctx.textAlign = 'left';
    const rows = [...state.seen].sort((a, b) => a - b), shown = rows.length > 14 ? rows.slice(-14) : rows;
    shown.forEach((index, i) => {
      const y = 296 + i * 48, current = index === state.night, ink = current ? '#f4dca2' : '#d8ceb7';
      if (current) { ctx.fillStyle = '#2f3a2c'; ctx.fillRect(630, y - 22, 520, 44); }
      ctx.fillStyle = ink; ctx.font = `${current ? 'bold ' : ''}21px Georgia`; ctx.fillText(shortDate(nights[index]), 640, y + 7);
      drawNotebookLine(ctx, 742, y, 398, nights[index], ink, current);
    });
    ctx.fillStyle = '#9d9786'; ctx.font = '19px Arial';
    ctx.fillText('Where the moons stood: JPL Horizons (NASA)', 640, 975, 520);
    return canvas;
  }
  function paintPart() {
    const part = PARTS[state.part] || PARTS.webb, {canvas, ctx} = board(part.kicker, part.title);
    ctx.font = '31px Georgia'; ctx.fillStyle = '#f1e5d0';
    let y = 205;
    for (const line of wrapped(ctx, part.text, 1080)) { ctx.fillText(line, 60, y); y += 44; }
    y += 24;
    for (const [key, value] of part.facts) {
      ctx.fillStyle = '#d9bc7d'; ctx.font = '24px Arial'; ctx.fillText(key.toUpperCase(), 60, y);
      ctx.fillStyle = '#f1e5d0'; ctx.font = '30px Georgia'; ctx.fillText(value, 420, y, 720); y += 50;
    }
    ctx.fillStyle = '#9d9786'; ctx.font = '22px Arial';
    ctx.fillText(`${partOrder().indexOf(state.part) + 1} OF ${partOrder().length}  ·  MODEL: NASA, SIMPLIFIED FOR HALLWAYS OF TIME`, 60, 950, 1080);
    return canvas;
  }
  function paintJupiter() {
    const {canvas, ctx} = board('JUPITER, FOUR HUNDRED YEARS APART', 'What Galileo saw, and what Webb sees');
    drawLens(ctx, 300, 420, 200, state.nights?.[0], {labels: false});
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText('GALILEO · 7 JANUARY 1610', 100, 680);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'A small disc and points of light beside it, through a lens a few centimetres across.', 420).forEach((line, i) => ctx.fillText(line, 100, 716 + i * 32));
    const image = state.jupiter;
    if (image) {
      const r = Math.min(470 / image.naturalWidth, 450 / image.naturalHeight), w = image.naturalWidth * r, h = image.naturalHeight * r;
      ctx.drawImage(image, 640 + (470 - w) / 2, 200 + (450 - h) / 2, w, h);
    } else { ctx.fillStyle = '#12160f'; ctx.fillRect(640, 200, 470, 450); }
    ctx.fillStyle = '#b3a98c'; ctx.font = '17px Arial'; ctx.fillText(JUPITER_CREDIT, 640, 672, 520);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '22px Arial'; ctx.fillText('WEBB · 27 JULY 2022', 640, 712);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'In infrared: auroras glowing over both poles, high hazes, and the Great Red Spot shining white.', 500).forEach((line, i) => ctx.fillText(line, 640, 748 + i * 32));
    ctx.fillStyle = '#f1e5d0'; ctx.font = '27px Georgia';
    wrapped(ctx, 'Both telescopes do what every telescope does: gather more light than an eye can. Galileo’s lens was a few centimetres across; Webb’s mirror is six and a half metres.', 1080).forEach((line, i) => ctx.fillText(line, 60, 868 + i * 36));
    return canvas;
  }
  function button(text, fn, i, count, tone = '#4b5640') {
    const c = document.createElement('canvas'); c.width = 768; c.height = 256; const ctx = c.getContext('2d');
    ctx.fillStyle = tone; ctx.fillRect(0, 0, 768, 256); ctx.fillStyle = '#eddfc4'; ctx.font = '62px Georgia';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 384, 128, 700);
    const m = plane(panel, .42, .14, [(i - (count - 1) / 2) * .46, -.85, .01], texture(c));
    m.userData.action = fn; m.userData.label = text; panelTargets.push(m);
  }
  function drawPanel() {
    const prior = panel;
    panel = new THREE.Group(); panel.name = 'Interactive museum panel';
    if (prior) { panel.position.copy(prior.position); panel.quaternion.copy(prior.quaternion); disposePanel(prior); }
    else callbacks.place?.(panel, 1.65);
    scene.add(panel); panelTargets = [];
    const spec = panelSpecs[state.panelKind];
    const sheet = plane(panel, 1.8, 1.5, [0, 0, 0], new THREE.CanvasTexture(spec.paint()));
    sheet.material.map.colorSpace = THREE.SRGBColorSpace; sheet.userData.action = () => {}; panelTargets.push(sheet);
    // Places on the sheet itself that can be pressed, given in the painting's own 1,200 by 1,000 units.
    for (const zone of spec.zones?.() || []) {
      const m = plane(panel, zone.w / 1200 * 1.8, zone.h / 1000 * 1.5, [(zone.x + zone.w / 2) / 1200 * 1.8 - .9, .75 - (zone.y + zone.h / 2) / 1000 * 1.5, .006], null);
      m.material.visible = false; m.userData.action = zone.fn; m.userData.label = zone.label; panelTargets.push(m);
    }
    const actions = spec.actions();
    actions.forEach(([text, fn, tone], i) => button(text, fn, i, actions.length, tone));
    // Drawn over everything, so an exhibit the visitor stands close to never cuts through it.
    // Marked transparent so it is drawn after the see-through things too, such as water.
    panel.traverse(o => { if (o.isMesh) { o.material.depthTest = false; o.material.transparent = true; o.renderOrder = 10 + (o === sheet ? 0 : 1); } });
  }
  Object.assign(panelSpecs, {
    telescope: {paint: paintTelescope, actions: () => [['← EARLIER', () => stepNight(-1)],
      [state.mode === 'above' ? 'THE LENS' : 'FROM ABOVE', () => setMode(state.mode === 'above' ? 'lens' : 'above')], ['LATER →', () => stepNight(1)], ['CLOSE', closePanel]]},
    part: {paint: paintPart, actions: () => [['← PART', () => stepPart(-1)], ['CLOSE', closePanel], ['PART →', () => stepPart(1)]]},
    jupiter: {paint: paintJupiter, actions: () => [['CLOSE', closePanel]]}
  });
  function disposePanel(group) {
    group.traverse(o => { if (o.isMesh) { o.geometry.dispose(); o.material.map?.dispose(); o.material.dispose(); } });
    group.removeFromParent();
  }
  function open(kind) {
    callbacks.opened?.();
    if (panel && state.panelKind !== kind) { disposePanel(panel); panel = null; }
    state.panelKind = kind; drawPanel();
  }
  function openTelescope(night) {
    prepare();
    if (Number.isInteger(night)) state.night = night;
    const fresh = state.nights && !state.seen.has(state.night);
    state.seen.add(state.night); paintNotebook();
    if (fresh) writeEvening(state.night);
    open('telescope');
  }
  function stepNight(delta) {
    if (!state.nights) return;
    const before = state.night;
    state.night = Math.max(0, Math.min(state.nights.length - 1, state.night + delta));
    if (state.night === before) return;
    const fresh = !state.seen.has(state.night);
    state.seen.add(state.night); paintNotebook(); drawPanel();
    if (fresh) writeEvening(state.night);
    galileoMoving.nudge = 1.2;   // the eye leaves the lens, and the tube is turned to Jupiter's new place
  }
  function setMode(mode) { state.mode = mode === 'above' ? 'above' : 'lens'; if (panel) drawPanel(); }
  function openPart(id) { state.part = PARTS[id] ? id : 'webb'; open('part'); }
  /** The parts the model has, to step through: the antenna and solar array are left out of it (scripts/make-webb.mjs). */
  const partOrder = () => PART_ORDER.filter(id => id === 'webb' || hotspots.some(h => h.userData.part === id));
  function stepPart(delta) { const order = partOrder(), i = order.indexOf(state.part); state.part = order[(Math.max(0, i) + delta + order.length) % order.length]; drawPanel(); }
  function openJupiter() { prepare(); open('jupiter'); }
  function closePanel() { if (panel) { disposePanel(panel); panel = null; panelTargets = []; } state.panelKind = null; }

  // ── Where a visitor may stand ────────────────────────────────────────
  /**
   * World coordinates; anywhere inside the rotunda's wall. Nothing in the room
   * stops a visitor: they can step into the Webb, lean into the orrery or
   * stand inside the press to see how it is made, and never be caught on an
   * exhibit. Only the wall keeps them in.
   */
  function validPosition(x, z) {
    return Math.hypot(x, z - WING_Z) <= R - .6;
  }
  const contains = z => Math.abs(z - WING_Z) < R + 2;
  /** How high a visitor may rise: under the dome, which is lower toward the wall. */
  const ceilingAt = (x, z) => DRUM + DOME * Math.sqrt(Math.max(0, 1 - (Math.hypot(x, z - WING_Z) / R) ** 2));

  function getState() {
    const night = state.nights?.[state.night];
    let triangles = 0, meshes = 0;
    state.webb?.traverse(o => { if (o.isMesh) { meshes++; triangles += o.geometry.index.count / 3; } });
    return {
      prepared: !!state.nights && (!!state.webb || !!state.webbError), nights: state.nights?.length || 0,
      panel: state.panelKind, night: state.night, date: night?.date || null, mode: state.mode, notebook: [...state.seen].sort((a, b) => a - b),
      visibleMoons: night ? night.moons.map(visible) : [], east: night ? night.moons.map(m => m[0]) : [],
      part: state.part, webb: {loaded: !!state.webb, error: state.webbError, meshes, triangles, size: state.webb?.userData.size || null,
        parts: hotspots.map(h => h.userData.part)},
      jupiterPhoto: !!state.jupiter, writing: !!galileoMoving.writing,
      exhibits: Object.fromEntries(exhibits.map(e => [e.id, e.getState()])),
      controls: panelTargets.filter(m => m.userData.label).map(m => ({label: m.userData.label, target: m.getWorldPosition(new THREE.Vector3()).toArray()}))
    };
  }
  return {
    group, pickables, hotspots, contains, validPosition, ceilingAt, prepare, setEnvironment, goTo,
    arrival: {x: ARRIVAL.x, z: WING_Z + ARRIVAL.z, yaw: ARRIVAL.yaw}, radius: R,
    bays: BAYS.map(b => ({id: b.id, angle: b.angle, group: b.group, name: b.name})),
    get panel() { return panel; }, get panelTargets() { return panelTargets; },
    openTelescope, stepNight, setMode, openPart, openJupiter, closePanel, getState, exhibit,
    /** Each frame the visitor is in the room: the exhibits' own motion. */
    update: dt => { animateGalileo(dt); for (const e of exhibits) e.update?.(dt); },
    /** A key pressed on a screen, offered to whichever exhibit is listening; true if one took it. */
    key: key => exhibits.some(e => e.key?.(key)),
    /** Where things stand, for tests and the guide: world positions to aim at. */
    targets: () => ({
      telescope: scope.localToWorld(new THREE.Vector3()).toArray(),
      notebook: galileoMoving.pages.localToWorld(new THREE.Vector3()).toArray(),
      webbLectern: lectern.localToWorld(new THREE.Vector3(0, 1.34, .04)).toArray(),
      centre: group.localToWorld(new THREE.Vector3()).toArray(),
      map: mapDesk.localToWorld(new THREE.Vector3(0, 1.38, .06)).toArray(),
      jupiter: jupiterFrames.webb.getWorldPosition(new THREE.Vector3()).toArray(),
      mirror: hotspots.find(h => h.userData.part === 'mirror')?.getWorldPosition(new THREE.Vector3()).toArray() || null,
      ...Object.assign({}, ...exhibits.map(e => e.targets?.() || {}))
    })
  };
}
