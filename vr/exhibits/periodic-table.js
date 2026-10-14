/**
 * The periodic table: where your atoms were made.
 *
 * All 118 elements on a wall, each an enamel tile coloured by where in the
 * universe its atoms were mostly made: in the first minutes after the Big
 * Bang, in dying stars like the Sun, in exploding massive stars and white
 * dwarfs, in colliding neutron stars, split off bigger atoms by cosmic rays, or
 * not made to last at all. The sources follow Jennifer Johnson's chart of the
 * origin of the elements (2019), in outline: a first source, and others where
 * they count. Some, the heaviest especially, are still argued.
 *
 * Press a tile and it lifts out of the wall and flies to the showcase in the
 * table's empty top, and its atom builds itself beside it, as the simple model
 * draws one: electrons arriving one by one into their shells in the order the
 * shells fill, and where an element breaks that order — chromium, copper, gold
 * — an electron hopping across at the end. Its card opens with the whole table
 * on it, so any element can be picked from there too. Press a colour in the
 * key and everything that source made rises from the wall and glows; turn to
 * what a human body is made of, or to Mendeleev's gaps, and the tiles turn
 * over in a wave to show it.
 */
const SOURCES = {
  bang: {name: 'The Big Bang', short: 'BIG BANG', color: '#4f86c6', text: 'made in the first few minutes after the Big Bang'},
  small: {name: 'Dying stars like the Sun', short: 'DYING SMALL STARS', color: '#e0a03a', text: 'made in stars like the Sun as they swell and die, and blown out into space'},
  big: {name: 'Exploding massive stars', short: 'EXPLODING BIG STARS', color: '#cf5640', text: 'made in massive stars and thrown out when they explode'},
  dwarf: {name: 'Exploding white dwarfs', short: 'EXPLODING WHITE DWARFS', color: '#d8cfba', text: 'made when white dwarfs, the cores of dead stars, explode'},
  merge: {name: 'Colliding neutron stars', short: 'COLLIDING NEUTRON STARS', color: '#8a5cc9', text: 'made when neutron stars collide, and perhaps in rare exploding stars too'},
  rays: {name: 'Cosmic rays', short: 'COSMIC RAYS', color: '#46a99c', text: 'split off bigger atoms by cosmic rays crossing space'},
  decay: {name: 'Radioactive decay', short: 'SHORT-LIVED', color: '#6a6e76', text: 'made only as uranium and thorium decay, and soon gone again; none survives from the stars'},
  none: {name: 'No stable form', short: 'SHORT-LIVED', color: '#6a6e76', text: 'without any stable form; the little on Earth comes from heavier atoms decaying or splitting, and most is made in reactors'},
  made: {name: 'Made by people', short: 'MADE BY PEOPLE', color: '#3e4249', text: 'made only by people, a few atoms at a time, in reactors and accelerators'}
};
// Symbol, name, and its sources, first the one that made most of it.
const TABLE = `H Hydrogen bang|He Helium bang,big|Li Lithium bang,rays,small|Be Beryllium rays|B Boron rays|C Carbon small,big|N Nitrogen small,big|O Oxygen big|F Fluorine big,small|Ne Neon big|Na Sodium big|Mg Magnesium big|Al Aluminium big|Si Silicon big,dwarf|P Phosphorus big|S Sulfur big,dwarf|Cl Chlorine big|Ar Argon big,dwarf|K Potassium big|Ca Calcium big,dwarf|Sc Scandium big|Ti Titanium big,dwarf|V Vanadium dwarf,big|Cr Chromium dwarf,big|Mn Manganese dwarf,big|Fe Iron dwarf,big|Co Cobalt big,dwarf|Ni Nickel dwarf,big|Cu Copper big,small|Zn Zinc big,small|Ga Gallium big,small|Ge Germanium big,small|As Arsenic big,small|Se Selenium big,small|Br Bromine big,small|Kr Krypton big,small|Rb Rubidium big,small|Sr Strontium small,big|Y Yttrium small,big|Zr Zirconium small,big|Nb Niobium small,big|Mo Molybdenum small,big|Tc Technetium none|Ru Ruthenium merge,small|Rh Rhodium merge,small|Pd Palladium merge,small|Ag Silver merge,small|Cd Cadmium small,merge|In Indium small,merge|Sn Tin small,merge|Sb Antimony merge,small|Te Tellurium merge|I Iodine merge|Xe Xenon merge,small|Cs Caesium merge,small|Ba Barium small,merge|La Lanthanum small,merge|Ce Cerium small,merge|Pr Praseodymium small,merge|Nd Neodymium small,merge|Pm Promethium none|Sm Samarium merge,small|Eu Europium merge|Gd Gadolinium merge,small|Tb Terbium merge|Dy Dysprosium merge|Ho Holmium merge|Er Erbium merge|Tm Thulium merge|Yb Ytterbium merge,small|Lu Lutetium merge,small|Hf Hafnium small,merge|Ta Tantalum small,merge|W Tungsten small,merge|Re Rhenium merge|Os Osmium merge|Ir Iridium merge|Pt Platinum merge|Au Gold merge|Hg Mercury small,merge|Tl Thallium small,merge|Pb Lead small,merge|Bi Bismuth small,merge|Po Polonium decay|At Astatine decay|Rn Radon decay|Fr Francium decay|Ra Radium decay|Ac Actinium decay|Th Thorium merge|Pa Protactinium decay|U Uranium merge|Np Neptunium none|Pu Plutonium none|Am Americium made|Cm Curium made|Bk Berkelium made|Cf Californium made|Es Einsteinium made|Fm Fermium made|Md Mendelevium made|No Nobelium made|Lr Lawrencium made|Rf Rutherfordium made|Db Dubnium made|Sg Seaborgium made|Bh Bohrium made|Hs Hassium made|Mt Meitnerium made|Ds Darmstadtium made|Rg Roentgenium made|Cn Copernicium made|Nh Nihonium made|Fl Flerovium made|Mc Moscovium made|Lv Livermorium made|Ts Tennessine made|Og Oganesson made`;
/** Where an element sits: the f-block in two rows under the table, as it is usually drawn. */
function cellOf(z) {
  if (z === 1) return [0, 0];
  if (z === 2) return [17, 0];
  const rows = [[3, 10, 1], [11, 18, 2], [19, 36, 3], [37, 54, 4], [55, 86, 5], [87, 118, 6]];
  const [first, , row] = rows.find(([a, b]) => z >= a && z <= b);
  if (z >= 57 && z <= 71) return [z - 57 + 3, 8.4];
  if (z >= 89 && z <= 103) return [z - 89 + 3, 9.4];
  const at = z - first;
  if (row <= 2) return [at < 2 ? at : at + 10, row];
  if (row <= 4) return [at, row];
  return [at < 2 ? at : at - 14, row];       // after the f-block's fifteen
}
const ELEMENTS = TABLE.split('|').map((entry, i) => {
  const [symbol, name, sources] = entry.split(' ');
  const [col, row] = cellOf(i + 1);
  return {z: i + 1, symbol, name, sources: sources.split(','), col, row};
});
// A few elements say more about themselves.
const NOTES = {
  1: 'Nearly every hydrogen atom in the universe dates from its first minutes. Two of them are in every molecule of water in you.',
  2: 'Most helium is as old as hydrogen. Stars make more, burning hydrogen into it, as the Sun is doing now.',
  6: 'The carbon in every living thing was made in stars, much of it in stars like the Sun near the end of their lives.',
  7: 'Most of the air you breathe is nitrogen, puffed out by dying stars like the Sun.',
  8: 'The oxygen you breathe was made in massive stars that exploded before the Sun was born.',
  20: 'The calcium in your bones and teeth was made in exploding stars.',
  26: 'Much of the iron in your blood was made when white dwarfs exploded, the rest in massive stars as they died.',
  14: 'The silicon in sand and rock was made in massive stars, and thrown out when they exploded.',
  79: 'Gold is made when neutron stars collide. In 2017 telescopes watched it happen, 130 million light years away.',
  78: 'Like gold, platinum is made in the rare, violent collisions of neutron stars.',
  92: 'Uranium is made only in the most violent events, like colliding neutron stars, and has been slowly decaying ever since.',
  3: 'A little lithium comes from the Big Bang; more was split off bigger atoms by cosmic rays, or made in stars.',
  4: 'Beryllium is not made in stars at all: cosmic rays chip it off larger atoms out in space.',
  5: 'Like beryllium, boron is chipped off larger atoms by cosmic rays.'
};
// What a body is made of, by mass.
const BODY = [[8, 65], [6, 18.5], [1, 9.5], [7, 3.2], [20, 1.5], [15, 1.0], [19, .4], [16, .3], [11, .2], [17, .2], [12, .1]];
// The three gaps Mendeleev left in 1869, what he said would fill them, and what did.
const GAPS = {
  31: {was: 'Eka-aluminium', found: 'Found in 1875 by Paul-Émile Lecoq de Boisbaudran.', said: [['Atomic weight', 'about 68', '69.7'], ['Density', '5.9', '5.9'], ['Melting point', 'low', '30 °C: it melts in the hand']]},
  21: {was: 'Eka-boron', found: 'Found in 1879 by Lars Fredrik Nilson.', said: [['Atomic weight', 'about 44', '45.0'], ['Its oxide', 'Eb₂O₃', 'Sc₂O₃']]},
  32: {was: 'Eka-silicon', found: 'Found in 1886 by Clemens Winkler.', said: [['Atomic weight', 'about 72', '72.6'], ['Density', '5.5', '5.35'], ['Its oxide', 'EsO₂', 'GeO₂']]}
};
// The table's tiles: 18 across and nine and a half down, the f-block below a gap.
const CELL = .22, COLS = 18, ROWS = 10.4;

// The electrons, shell by shell: the subshells in the order they fill (Madelung's rule),
// and where an element breaks that order, the electrons that end up a shell over.
const SUBSHELLS = [[1, 2], [2, 2], [2, 6], [3, 2], [3, 6], [4, 2], [3, 10], [4, 6], [5, 2], [4, 10], [5, 6], [6, 2], [4, 14], [5, 10], [6, 6], [7, 2], [5, 14], [6, 10], [7, 6]];
const MOVES = {24: [[4, 3]], 29: [[4, 3]], 41: [[5, 4]], 42: [[5, 4]], 44: [[5, 4]], 45: [[5, 4]], 46: [[5, 4], [5, 4]], 47: [[5, 4]],
  57: [[4, 5]], 58: [[4, 5]], 64: [[4, 5]], 78: [[6, 5]], 79: [[6, 5]], 89: [[5, 6]], 90: [[5, 6], [5, 6]], 91: [[5, 6]], 92: [[5, 6]],
  93: [[5, 6]], 96: [[5, 6]], 103: [[6, 7]]};
/** Shell by shell, in filling order, then the hops; and how many end in each shell. Beyond lawrencium, predicted. */
function electronsOf(z) {
  const order = [];
  for (const [n, room] of SUBSHELLS) for (let i = 0; i < room && order.length < z; i++) order.push(n);
  const moves = MOVES[z] || [], count = new Array(8).fill(0);
  order.forEach(n => count[n]++); moves.forEach(([from, to]) => { count[from]--; count[to]++; });
  let outer = 7; while (outer > 1 && !count[outer]) outer--;
  return {order, moves, shells: count.slice(1, outer + 1), predicted: z > 103};
}
// Neutrons in the commonest kind of each of the first twenty atoms, so their nuclei are drawn whole.
const NEUTRONS = [0, 2, 4, 5, 6, 6, 7, 8, 10, 10, 12, 12, 14, 14, 16, 16, 18, 22, 20, 20];
const smooth = s => s * s * (3 - 2 * s);
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

export function createPeriodicTable(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'mendeleev';
  const state = {z: 6, mode: 'origins', pulled: 6, lit: null, clock: 0};

  // ── The cabinet ──────────────────────────────────────────────────────
  const wall = kit.onWall(angle, .26);
  const W = COLS * CELL, H = ROWS * CELL, BOTTOM = .72;
  const display = new THREE.Group(); display.position.y = BOTTOM + H / 2; wall.add(display);
  const cellCentre = e => new THREE.Vector3((e.col + .5) * CELL - W / 2, H / 2 - (e.row + .5) * CELL, .004);
  box(display, [W + .5, H + .5, .06], [0, 0, -.04], M.slate);
  /** A frame round the table, `offset` out from its edge and `width` wide. */
  const ring = (offset, width, depth, z, material) => {
    const ow = W / 2 + offset, oh = H / 2 + offset;
    for (const side of [-1, 1]) {
      box(display, [2 * (ow + width), width, depth], [0, side * (oh + width / 2), z], material);
      box(display, [width, 2 * oh, depth], [side * (ow + width / 2), 0, z], material);
    }
  };
  ring(.05, .15, .1, .02, M.darkWood);
  ring(.02, .03, .075, .02, M.gold);
  ring(.2, .025, .115, .02, M.gold);
  // The showcase: the empty top of the table, between hydrogen and boron.
  const SHOW = {x0: 2 * CELL - W / 2, x1: 12 * CELL - W / 2, y0: H / 2, y1: H / 2 - 3 * CELL};
  {
    const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * (H + .1) / (W + .1));
    const ctx = c.getContext('2d'), k = c.width / (W + .1), X = x => (x + (W + .1) / 2) * k, Y = y => ((H + .1) / 2 - y) * k;
    ctx.fillStyle = '#11161b'; ctx.fillRect(0, 0, c.width, c.height);
    // Each tile's seat, darker a little below and to the right of it, as its shadow.
    ctx.fillStyle = 'rgba(0,0,0,.55)';
    for (const e of ELEMENTS) { const p = cellCentre(e); ctx.fillRect(X(p.x - .1) + 2, Y(p.y + .1) + 3, .2 * k, .2 * k); }
    const x0 = X(SHOW.x0 + .03), x1 = X(SHOW.x1 - .03), y0 = Y(SHOW.y0 - .03), y1 = Y(SHOW.y1 + .03);
    const glow = ctx.createRadialGradient((x0 + x1) / 2, (y0 + y1) / 2, 8, (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) * .62);
    glow.addColorStop(0, '#2c3946'); glow.addColorStop(1, '#151c23');
    ctx.fillStyle = glow; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = 'rgba(201,166,100,.75)'; ctx.lineWidth = 2; ctx.strokeRect(x0 + 5, y0 + 5, x1 - x0 - 10, y1 - y0 - 10);
    ctx.fillStyle = '#69707a'; ctx.font = `${Math.round(.05 * k)}px Arial`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [text, row] of [['57–71', 5], ['89–103', 6]]) ctx.fillText(text, X(2.5 * CELL - W / 2), Y(H / 2 - (row + .5) * CELL));
    plane(display, W + .1, H + .1, [0, 0, 0], kit.texture(c));
  }

  // ── The tiles: enamel, raised, one draw for all 118 ──────────────────
  /**
   * Every tile's face is painted once on one sheet, eleven by eleven: the
   * 118 elements, then Mendeleev's three gaps in gold. Each tile is told which
   * square of the sheet is its front and which its back, and how far to grey
   * each; turning a tile over shows its back, so a change of view is a wave of
   * tiles turning, with nothing repainted.
   */
  const T = 128, FACE = 120, SHEET = 11 * T, GAP_TILES = [31, 21, 32];
  const sheet = document.createElement('canvas'); sheet.width = sheet.height = SHEET;
  {
    const ctx = sheet.getContext('2d');
    const paint = (index, e, gold) => {
      const x = (index % 11) * T, y = Math.floor(index / 11) * T, f = x + 4, g = y + 4;
      ctx.fillStyle = gold ? '#d9bc7d' : SOURCES[e.sources[0]].color; ctx.fillRect(x, y, T, T);
      if (!gold && e.sources.length > 1) {
        const rest = e.sources.slice(1), w = FACE / rest.length;
        rest.forEach((key, i) => { ctx.fillStyle = SOURCES[key].color; ctx.fillRect(f + i * w, g + 103, w, FACE - 103 + 4); });
      }
      const glaze = ctx.createLinearGradient(0, g, 0, g + 90); glaze.addColorStop(0, 'rgba(255,255,255,.16)'); glaze.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = glaze; ctx.fillRect(f, g, FACE, 90);
      ctx.fillStyle = gold || e.sources[0] === 'dwarf' ? '#1d1a17' : '#f6efe0';
      ctx.textAlign = 'left'; ctx.font = '17px Arial'; ctx.fillText(String(e.z), f + 9, g + 21);
      ctx.textAlign = 'center'; ctx.font = 'bold 50px Georgia'; ctx.fillText(e.symbol, x + T / 2, g + 70);
      ctx.font = '13px Georgia'; ctx.fillText(e.name, x + T / 2, g + 93, FACE - 10);
    };
    ELEMENTS.forEach((e, i) => paint(i, e, false));
    GAP_TILES.forEach((z, i) => paint(118 + i, ELEMENTS[z - 1], true));
  }
  const sheetMap = kit.texture(sheet); sheetMap.anisotropy = 4;
  const square = index => [((index % 11) * T + 4) / SHEET, 1 - (Math.floor(index / 11) * T + 4 + FACE) / SHEET];
  /** What a tile shows in a view: its square on the sheet, and how grey. */
  function faceFor(e, mode) {
    if (mode === 'body') return [...square(e.z - 1), BODY.some(([z]) => z === e.z) ? 0 : 1];
    if (mode === 'mendeleev') return GAPS[e.z] ? [...square(118 + GAP_TILES.indexOf(e.z)), 0] : [...square(e.z - 1), 1];
    return [...square(e.z - 1), 0];
  }
  const enamel = new THREE.MeshStandardMaterial({map: sheetMap, roughness: .32});
  enamel.onBeforeCompile = shader => {
    shader.uniforms.tileSize = {value: FACE / SHEET};
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 face0;\nattribute vec4 face1;\nuniform float tileSize;\nvarying float vGrey;\nvarying float vGlow;')
      .replace('#include <uv_vertex>', `#include <uv_vertex>
        {
          // The front shows face0, the back face1, read the right way round; the sides take the tile's own colour.
          bool back = normal.z < -0.7, side = abs(normal.z) <= 0.7;
          vec4 face = back ? face1 : face0;
          vec2 local = side ? vec2(0.05, 0.5) : vec2(back ? 1.0 - uv.x : uv.x, uv.y);
          vMapUv = face.xy + clamp(local, 0.0, 1.0) * tileSize;
          vGrey = face.z; vGlow = face.w;
        }`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vGrey;\nvarying float vGlow;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        // Greyed, every tile goes dark with light lettering; a pale tile (more than 2) has its tones turned over to match.
        float inv = step(1.5, vGrey), amount = vGrey - 2.0 * inv;
        float tone = smoothstep(.45, .6, dot(diffuseColor.rgb, vec3(.2126, .7152, .0722)));
        tone = mix(tone, 1.0 - tone, inv);
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(mix(.022, .6, tone)) * vec3(.96, .98, 1.0), amount);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += diffuseColor.rgb * (.2 + vGlow * .45);`);
  };
  enamel.customProgramCacheKey = () => 'enamel-tiles';
  // A tile: a rounded square with bevelled edges, its face mapped whole.
  const tileGeometry = (() => {
    const s = CELL * .9, r = .02, h = s / 2, shape = new THREE.Shape();
    shape.moveTo(-h + r, -h); shape.lineTo(h - r, -h); shape.quadraticCurveTo(h, -h, h, -h + r); shape.lineTo(h, h - r);
    shape.quadraticCurveTo(h, h, h - r, h); shape.lineTo(-h + r, h); shape.quadraticCurveTo(-h, h, -h, h - r); shape.lineTo(-h, -h + r);
    shape.quadraticCurveTo(-h, -h, -h + r, -h);
    const g = new THREE.ExtrudeGeometry(shape, {depth: .02, bevelEnabled: true, bevelThickness: .005, bevelSize: .005, bevelSegments: 2, curveSegments: 3});
    g.translate(0, 0, .005);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / s + .5, p.getY(i) / s + .5);
    return g;
  })();
  const face0 = new Float32Array(118 * 4), face1 = new Float32Array(118 * 4);
  tileGeometry.setAttribute('face0', new THREE.InstancedBufferAttribute(face0, 4));
  tileGeometry.setAttribute('face1', new THREE.InstancedBufferAttribute(face1, 4));
  const tiles = new THREE.InstancedMesh(tileGeometry, enamel, 118);
  tiles.frustumCulled = false; display.add(tiles);
  // Each tile's own state: where it is between its seat and the showcase (u, eased),
  // whether it is turning over, and how far it is lit or greyed by the key.
  const SHOWN = {at: new THREE.Vector3(-1.08, .84, .06), scale: 2.1, turn: new THREE.Quaternion().setFromEuler(new THREE.Euler(.12, .2, 0))};
  const tile = ELEMENTS.map(e => {
    const [u0, v0, grey] = faceFor(e, 'origins');
    const seat = cellCentre(e), bend = seat.clone().add(SHOWN.at).multiplyScalar(.5).add(new THREE.Vector3(0, .3, .45));
    return {e, seat, bend, u: 0, goal: 0, front: [u0, v0, grey], back: [u0, v0, grey], flip: null, h: 0, hGoal: 0, hAt: 0, dirty: true};
  });
  tile[state.pulled - 1].u = tile[state.pulled - 1].goal = 1;
  const spin = new THREE.Quaternion(), turnOver = new THREE.Quaternion(), yAxis = new THREE.Vector3(0, 1, 0), outward = new THREE.Vector3();
  const place = new THREE.Vector3(), turning = new THREE.Quaternion(), size = new THREE.Vector3(), matrix = new THREE.Matrix4();
  function compose(i) {
    const t = tile[i], p = smooth(t.u);
    // Along a curve out from the wall and over to the showcase, turning once on the way.
    const a = (1 - p) * (1 - p), b = 2 * (1 - p) * p, c = p * p;
    place.set(a * t.seat.x + b * t.bend.x + c * SHOWN.at.x, a * t.seat.y + b * t.bend.y + c * SHOWN.at.y, a * t.seat.z + b * t.bend.z + c * SHOWN.at.z);
    turning.identity().slerp(SHOWN.turn, p).multiply(spin.setFromAxisAngle(yAxis, Math.PI * 2 * p));
    const scale = 1 + (SHOWN.scale - 1) * p;
    // Turning over, it comes forward so its edges clear the wall and its neighbours; lit, it rises.
    const over = t.flip && t.flip.s > 0 ? smooth(Math.min(1, t.flip.s)) : 0;
    const forward = Math.sin(Math.PI * over) * .12 + Math.max(0, t.h) * .05;
    place.add(outward.set(0, 0, forward).applyQuaternion(turning));
    if (over) turning.multiply(turnOver.setFromAxisAngle(yAxis, Math.PI * over));
    tiles.setMatrixAt(i, matrix.compose(place, turning, size.setScalar(scale)));
    const lit = Math.max(0, t.h), greyed = Math.max(0, -t.h) * .85, pale = t.e.sources[0] === 'dwarf' ? 2 : 0;
    face0.set([t.front[0], t.front[1], Math.max(t.front[2], greyed) + pale, lit], i * 4);
    face1.set([t.back[0], t.back[1], t.back[2] + pale, 0], i * 4);
  }
  function refresh() {
    tiles.instanceMatrix.needsUpdate = true; tileGeometry.attributes.face0.needsUpdate = true; tileGeometry.attributes.face1.needsUpdate = true;
  }
  tile.forEach((_, i) => compose(i)); refresh();

  // ── The atom in the showcase ─────────────────────────────────────────
  const atom = new THREE.Group(); atom.position.set(.14, .81, .2); display.add(atom); kit.moving(atom);
  const ORBIT = n => .07 + .033 * n;
  const nucleons = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({roughness: .42, emissive: '#1c1410'}), 60);
  nucleons.frustumCulled = false; atom.add(nucleons);
  const rings = new THREE.InstancedMesh(new THREE.TorusGeometry(1, .014, 6, 96), new THREE.MeshBasicMaterial({color: '#c9a664', transparent: true, opacity: .62}), 7);
  rings.frustumCulled = false; atom.add(rings);
  const glow = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const ctx = c.getContext('2d'), g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(190,226,255,.75)'); g.addColorStop(1, 'rgba(150,200,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64); return kit.texture(c);
  })();
  const electronAt = new Float32Array(118 * 3);
  const electrons = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(electronAt, 3)),
    new THREE.PointsMaterial({size: .05, map: glow, color: '#d6efff', transparent: true, depthWrite: false, blending: THREE.AdditiveBlending}));
  electrons.frustumCulled = false; atom.add(electrons);
  // Between the tile and its atom, its electrons counted by shell.
  const caption = document.createElement('canvas'); caption.width = 1024; caption.height = 330;
  const captionMap = kit.texture(caption);
  const captionPlate = plane(display, .62, .2, [-.48, .81, .02], captionMap); captionPlate.material.transparent = true;
  function paintCaption(z) {
    const ctx = caption.getContext('2d'), {shells, predicted} = electronsOf(z);
    ctx.clearRect(0, 0, 1024, 330); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#c9a664'; ctx.font = '600 46px Arial'; ctx.letterSpacing = '6px'; ctx.fillText('ELECTRONS BY SHELL', 512, 70, 1000);
    ctx.letterSpacing = '0px'; ctx.fillStyle = '#f1e5d0'; ctx.font = '88px Georgia'; ctx.fillText(shells.join(' · '), 512, 175, 1000);
    ctx.fillStyle = '#a99a7c'; ctx.font = 'italic 40px Georgia'; ctx.fillText(predicted ? 'predicted, not yet measured' : 'the simple model: not to scale', 512, 270, 1000);
    captionMap.needsUpdate = true;
  }
  /**
   * The atom as it is now: its nucleus, and each electron waiting, flying in
   * from the tile, or going round its shell. `shells` holds the electrons going
   * round, shell by shell; each spaces itself evenly among the others.
   */
  const built = {z: 0, next: 0, scale: 1, shells: [[], [], [], [], [], [], [], []], electrons: [], hops: [], phase: new Array(8).fill(0),
    grow: new Array(8).fill(0), used: new Array(8).fill(false), nucleons: [], born: 0, fit: 1};
  const o = new THREE.Object3D(), from = new THREE.Vector3(), toward = new THREE.Vector3();
  function respace(n) { const list = built.shells[n]; list.forEach((e, k) => { e.aim = Math.PI * 2 * k / list.length; }); }
  function begin(z, instantly) {
    const {order, moves} = electronsOf(z);
    // However many shells, the atom is drawn to fill the showcase.
    built.z = z; built.born = state.clock; built.fit = .29 / ORBIT(electronsOf(z).shells.length); built.shells = [[], [], [], [], [], [], [], []]; built.used.fill(false);
    // The nucleus: the first twenty drawn whole, the rest as sixty, neither to scale.
    const neutrons = z <= 20 ? NEUTRONS[z - 1] : Math.round(z * (1 + .0062 * z)), whole = z + neutrons, shown = Math.min(60, whole);
    const protons = Math.round(shown * z / whole), radius = .016 * Math.cbrt(shown) * 1.05, pick = kit.seeded(z * 7 + 1);
    const kinds = Array.from({length: shown}, (_, i) => i < protons).sort(() => pick() - .5);
    built.nucleons = kinds.map((proton, i) => {
      // Heights evenly down the ball, turns by the golden angle, depths by another sequence, so they fill a ball and not a band.
      const r = shown === 1 ? 0 : radius * Math.cbrt(((i + .5) * .7548776662) % 1), y = 1 - 2 * (i + .5) / shown, ring = Math.sqrt(1 - y * y), th = i * 2.39996;
      nucleons.setColorAt(i, new THREE.Color(proton ? '#d4553d' : '#b7c0ca'));
      return {at: new THREE.Vector3(ring * Math.cos(th) * r, y * r, ring * Math.sin(th) * r), delay: instantly ? -1 : i * .012};
    });
    nucleons.count = shown; nucleons.instanceColor.needsUpdate = true;
    const gap = Math.max(.025, Math.min(.16, 2.6 / z)), start = instantly ? -1e9 : state.clock + .35;
    built.electrons = order.map((n, j) => ({n, mode: 'wait', start: start + j * gap, f: 0, from: new THREE.Vector3(), aim: 0, angle: 0}));
    built.hops = moves.map(([a, b], i) => ({from: a, to: b, at: start + order.length * gap + .9 + i * .5}));
    if (instantly) {
      for (const e of built.electrons) { e.mode = 'orbit'; built.shells[e.n].push(e); built.used[e.n] = true; }
      for (const hop of built.hops) { const e = built.shells[hop.from].pop(); e.n = hop.to; built.shells[hop.to].push(e); built.used[hop.to] = true; }
      built.hops = [];
      built.shells.forEach((list, n) => { respace(n); list.forEach(e => { e.angle = e.aim; }); built.grow[n] = list.length ? ORBIT(n) : 0; });
    }
  }
  /** Where a going-round electron of shell `n` is, at its angle. */
  const onShell = (n, angle, out) => out.set(Math.cos(built.phase[n] + angle) * ORBIT(n), Math.sin(built.phase[n] + angle) * ORBIT(n), 0);
  function animateAtom(dt) {
    // A new element: the old atom shrinks away, the new one grows in its place.
    if (built.next) {
      built.scale = Math.max(0, built.scale - dt / .25);
      if (built.scale === 0) { begin(built.next, false); built.next = 0; }
    } else built.scale = Math.min(1, built.scale + dt / .3);
    atom.scale.setScalar(.001 + smooth(built.scale) * built.fit);
    atom.rotation.set(.28, Math.sin(state.clock * .35) * .35, 0);
    const now = state.clock, launch = atom.worldToLocal(display.localToWorld(from.copy(SHOWN.at).add(toward.set(0, 0, .04))));
    for (let n = 1; n < 8; n++) built.phase[n] += dt * 1.1 / n ** .8;
    // Exceptions: once the shells are full, the odd electron hops across.
    for (const hop of built.hops) if (!hop.done && now >= hop.at && built.shells[hop.from].length) {
      hop.done = true;
      const e = built.shells[hop.from].pop(); respace(hop.from);
      onShell(hop.from, e.angle, e.from); e.n = hop.to; e.mode = 'fly'; e.f = 0; built.used[hop.to] = true;
      e.aim = Math.PI * 2 * built.shells[hop.to].length / (built.shells[hop.to].length + 1);
    }
    let shown = 0;
    for (const e of built.electrons) {
      if (e.mode === 'wait') {
        if (now < e.start) break;
        e.mode = 'fly'; e.f = 0; e.from.copy(launch); built.used[e.n] = true;
        e.aim = Math.PI * 2 * built.shells[e.n].length / (built.shells[e.n].length + 1);
      }
      if (e.mode === 'fly') {
        e.f = Math.min(1, e.f + dt / .5);
        const f = 1 - (1 - e.f) ** 3;
        onShell(e.n, e.aim, toward);
        from.lerpVectors(e.from, toward, f); from.z += Math.sin(Math.PI * f) * .08;
        if (e.f >= 1) { e.mode = 'orbit'; e.angle = e.aim; built.shells[e.n].push(e); respace(e.n); }
        electronAt.set([from.x, from.y, from.z], shown * 3);
      } else {
        e.angle += wrapAngle(e.aim - e.angle) * Math.min(1, dt * 4);
        onShell(e.n, e.angle, toward); electronAt.set([toward.x, toward.y, toward.z], shown * 3);
      }
      shown++;
    }
    electrons.geometry.setDrawRange(0, shown); electrons.geometry.attributes.position.needsUpdate = true;
    for (let n = 1; n < 8; n++) {
      built.grow[n] += ((built.used[n] ? ORBIT(n) : 0) - built.grow[n]) * Math.min(1, dt * 5);
      o.position.set(0, 0, 0); o.rotation.set(0, 0, 0); o.scale.setScalar(Math.max(.0001, built.grow[n])); o.updateMatrix(); rings.setMatrixAt(n - 1, o.matrix);
    }
    rings.instanceMatrix.needsUpdate = true;
    built.nucleons.forEach((p, i) => {
      const s = p.delay < 0 ? 1 : Math.max(0, Math.min(1, (now - built.born - p.delay) / .3));
      const pop = s === 1 ? 1 : 1 + 2.7 * (s - 1) ** 3 + 1.7 * (s - 1) ** 2;   // overshooting a little as it lands
      o.position.copy(p.at); o.scale.setScalar(Math.max(.0001, .0165 * pop)); o.updateMatrix(); nucleons.setMatrixAt(i, o.matrix);
    });
    nucleons.instanceMatrix.needsUpdate = true;
    nucleons.rotation.y += dt * .2;
  }
  begin(state.pulled, true); paintCaption(state.pulled);

  // ── The title above, the key below ───────────────────────────────────
  plane(display, 3.4, .34, [0, H / 2 + .52, .01], kit.lettering(3.4, .34, [
    ['WHERE YOUR ATOMS WERE MADE', .14, .13, '#e1c393', '600 #px Arial, sans-serif'], ['The periodic table, coloured by what made each element', .27, .07, '#c8b793', 'italic #px Georgia, serif']], '#23303b'));
  const KEYS = ['bang', 'small', 'big', 'dwarf', 'merge', 'rays', 'none', 'made'];
  {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const ctx = c.getContext('2d');
    ctx.fillStyle = '#23303b'; ctx.fillRect(0, 0, 2048, 96);
    KEYS.forEach((key, i) => {
      const x = 20 + i * 254; ctx.fillStyle = SOURCES[key].color; ctx.fillRect(x, 30, 40, 40);
      ctx.fillStyle = '#f1ddba'; ctx.font = '600 22px Arial'; ctx.fillText(SOURCES[key].short, x + 52, 58, 196);
    });
    const key = plane(display, W, W * 96 / 2048, [0, -H / 2 - .42, .01], kit.texture(c));
    const local = new THREE.Vector3();
    kit.press(key, hit => {
      if (!hit?.point) return;
      key.worldToLocal(local.copy(hit.point));
      const i = Math.floor(((local.x / W + .5) * 2048 - 20) / 254);
      if (KEYS[i]) light(KEYS[i]);
    }, 'The key to the colours');
  }
  // One plane over the table to press; the tile under the point is worked out from where it was hit.
  const pickPlane = plane(display, W, H, [0, 0, .02], null); pickPlane.material.visible = false;
  {
    const local = new THREE.Vector3();
    kit.press(pickPlane, hit => {
      if (hit?.point) {
        display.worldToLocal(local.copy(hit.point));
        const col = Math.floor((local.x + W / 2) / CELL), row = (H / 2 - local.y) / CELL;
        const e = ELEMENTS.find(e => e.col === col && row >= e.row && row < e.row + 1);
        if (e) { select(e.z); return; }
      }
      open();
    }, 'The periodic table');
  }
  {
    const p = kit.plaqueAt(angle);   // front right, where every bay's plaque stands
    kit.plaque(p.x, p.z, 0, 0, [
      ['THE PERIODIC TABLE', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Mendeleev, St Petersburg, 1869', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Every element, coloured by where its atoms', .22, .033],
      ['were made. Press a tile to draw it out and', .27, .033],
      ['watch its atom build; press a colour in the', .32, .033],
      ['key to light up everything it made.', .37, .033],
      ['After Jennifer Johnson’s chart of the origin of', .44, .026, '#a99a7c', 'italic #px Georgia, serif'],
      ['the elements (2019), in outline; some still argued.', .48, .026, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Periodic table plaque');
  }

  // ── The panel: an element's card above, the whole table below ───────
  const colorOf = (e, mode) => {
    if (mode === 'body') return BODY.some(([z]) => z === e.z) ? SOURCES[e.sources[0]].color : '#2a2e33';
    if (mode === 'mendeleev') return GAPS[e.z] ? '#d9bc7d' : '#3a3f45';
    return SOURCES[e.sources[0]].color;
  };
  /** A tile drawn on the card, `s` pixels square, with its other sources in a band along its foot. */
  function drawTile(ctx, e, x, y, s) {
    ctx.fillStyle = colorOf(e, 'origins'); ctx.fillRect(x + s * .04, y + s * .04, s * .92, s * .92);
    if (e.sources.length > 1) {
      const rest = e.sources.slice(1), w = s * .92 / rest.length;
      rest.forEach((key, i) => { ctx.fillStyle = SOURCES[key].color; ctx.fillRect(x + s * .04 + i * w, y + s * .8, w, s * .16); });
    }
    ctx.fillStyle = e.sources[0] === 'dwarf' ? '#1d1a17' : '#f6efe0';
    ctx.font = `${Math.round(s * .16)}px Arial`; ctx.textAlign = 'left'; ctx.fillText(String(e.z), x + s * .1, y + s * .22);
    ctx.font = `bold ${Math.round(s * .4)}px Georgia`; ctx.textAlign = 'center'; ctx.fillText(e.symbol, x + s / 2, y + s * .62);
    ctx.textAlign = 'left';
  }
  const MINI = {x: 66, y: 420, cell: 56};
  const miniAt = e => ({x: MINI.x + e.col * MINI.cell, y: MINI.y + e.row * (MINI.cell * .78), w: MINI.cell, h: MINI.cell * .78});
  function paintMini(ctx) {
    for (const e of ELEMENTS) {
      const {x, y, w, h} = miniAt(e);
      ctx.fillStyle = colorOf(e, state.mode); ctx.fillRect(x + 2, y + 2, w - 4, h - 4);
      if (e.z === state.z) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3; ctx.strokeRect(x + 1, y + 1, w - 2, h - 2); }
      ctx.fillStyle = (e.sources[0] === 'dwarf' && state.mode === 'origins') || (state.mode === 'mendeleev' && GAPS[e.z]) ? '#1d1a17' : '#f6efe0';
      ctx.font = 'bold 19px Georgia'; ctx.textAlign = 'center'; ctx.fillText(e.symbol, x + w / 2, y + h / 2 + 7); ctx.textAlign = 'left';
    }
  }
  function paintKey(ctx, y) {
    const keys = state.mode === 'mendeleev' ? [] : ['bang', 'small', 'big', 'dwarf', 'merge', 'rays', 'none', 'made'];
    keys.forEach((key, i) => {
      const x = 60 + (i % 4) * 270, yy = y + Math.floor(i / 4) * 26;
      ctx.fillStyle = SOURCES[key].color; ctx.fillRect(x, yy - 14, 16, 16);
      ctx.fillStyle = '#c8bfa7'; ctx.font = '16px Arial'; ctx.fillText(SOURCES[key].short, x + 24, yy, 236);
    });
  }
  function paintElement(ctx) {
    const e = ELEMENTS[state.z - 1];
    drawTile(ctx, e, 60, 160, 150, 'origins', false);
    ctx.fillStyle = '#f1e5d0'; ctx.font = '44px Georgia'; ctx.fillText(e.name, 240, 200, 900);
    const {shells, predicted} = electronsOf(e.z);
    ctx.fillStyle = '#b3a98c'; ctx.font = '20px Arial'; ctx.fillText(`ELEMENT ${e.z} · ELECTRONS BY SHELL ${shells.join(' · ')}${predicted ? ' (PREDICTED)' : ''}`, 242, 230, 898);
    let y = 268;
    e.sources.forEach((key, i) => {
      ctx.fillStyle = SOURCES[key].color; ctx.fillRect(242, y - 18, 22, 22);
      ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
      ctx.fillText(`${i === 0 ? (e.sources.length > 1 ? 'Mostly' : 'All') : 'Also'} ${SOURCES[key].text}.`, 276, y, 864);
      y += 34;
    });
    if (NOTES[e.z]) {
      ctx.fillStyle = '#e8d9b2'; ctx.font = 'italic 23px Georgia';
      wrapped(ctx, NOTES[e.z], 898).slice(0, 2).forEach((line, i) => ctx.fillText(line, 242, y + 4 + i * 30));
    }
  }
  function paintBody(ctx) {
    ctx.fillStyle = '#f1e5d0'; ctx.font = '40px Georgia'; ctx.fillText('What you are made of', 60, 196);
    ctx.fillStyle = '#c8bfa7'; ctx.font = '20px Arial'; ctx.fillText('BY WEIGHT, IN A HUMAN BODY', 62, 226);
    let x = 60;
    for (const [z, share] of BODY) {
      const e = ELEMENTS[z - 1], w = Math.max(3, share / 100 * 1080);
      ctx.fillStyle = SOURCES[e.sources[0]].color; ctx.fillRect(x, 250, w - 2, 60);
      if (w > 60) { ctx.fillStyle = '#f6efe0'; ctx.font = 'bold 22px Georgia'; ctx.fillText(`${e.symbol} ${share}%`, x + 10, 288); }
      x += w;
    }
    ctx.fillStyle = '#f1e5d0'; ctx.font = '24px Georgia';
    wrapped(ctx, 'About a tenth of you, by weight, is hydrogen made in the first minutes of the universe. Nearly all the rest — the oxygen, the carbon, the calcium in your bones — was made inside stars that lived and died before the Sun was born.', 1080)
      .slice(0, 3).forEach((line, i) => ctx.fillText(line, 60, 345 + i * 30));
  }
  function paintGaps(ctx) {
    const gap = GAPS[state.z];
    if (!gap) {
      ctx.fillStyle = '#f1e5d0'; ctx.font = '40px Georgia'; ctx.fillText('Mendeleev’s gaps', 60, 196);
      ctx.font = '24px Georgia';
      wrapped(ctx, 'In 1869 Mendeleev laid the elements out by weight and found their properties repeating. Where the pattern broke he left gaps, and described the elements that would fill them. Press a gold tile to set his prediction beside what was found.', 1080)
        .slice(0, 4).forEach((line, i) => ctx.fillText(line, 60, 240 + i * 32));
      return;
    }
    const e = ELEMENTS[state.z - 1];
    ctx.fillStyle = '#f1e5d0'; ctx.font = '40px Georgia'; ctx.fillText(`${gap.was}, now ${e.name.toLowerCase()}`, 60, 196, 1080);
    ctx.fillStyle = '#c8bfa7'; ctx.font = '20px Arial'; ctx.fillText(gap.found.toUpperCase(), 62, 226, 1078);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '19px Arial'; ctx.fillText('MENDELEEV, 1869', 420, 262); ctx.fillText('FOUND', 760, 262);
    gap.said.forEach(([what, said, found], i) => {
      const y = 300 + i * 38;
      ctx.fillStyle = '#c8bfa7'; ctx.font = '22px Arial'; ctx.fillText(what, 62, y);
      ctx.fillStyle = '#f1e5d0'; ctx.font = '26px Georgia'; ctx.fillText(said, 420, y); ctx.fillText(found, 760, y, 380);
    });
  }
  function paintPanel() {
    const kicker = state.mode === 'body' ? 'THE PERIODIC TABLE · YOUR BODY' : state.mode === 'mendeleev' ? 'THE PERIODIC TABLE · MENDELEEV, 1869' : 'THE PERIODIC TABLE · WHERE ATOMS ARE MADE';
    const {canvas, ctx} = board(kicker, '');
    if (state.mode === 'body') paintBody(ctx); else if (state.mode === 'mendeleev') paintGaps(ctx); else paintElement(ctx);
    paintMini(ctx);
    paintKey(ctx, 912);
    ctx.fillStyle = '#d9bc7d'; ctx.font = '21px Georgia'; ctx.textAlign = 'right'; ctx.fillText('Read Mendeleev’s moment in the timeline ›', 1140, 968); ctx.textAlign = 'left';
    return canvas;
  }
  kit.panel(id, {
    paint: paintPanel,
    zones: () => [...ELEMENTS.map(e => ({...miniAt(e), label: e.symbol, fn: () => select(e.z)})),
      {x: 640, y: 945, w: 520, h: 40, label: 'Mendeleev’s story', fn: () => kit.story(id)}],
    actions: () => [
      ['WHERE MADE', () => setMode('origins'), state.mode === 'origins' ? '#6a5a2c' : undefined],
      ['YOUR BODY', () => setMode('body'), state.mode === 'body' ? '#6a5a2c' : undefined],
      ['THE GAPS', () => setMode('mendeleev'), state.mode === 'mendeleev' ? '#6a5a2c' : undefined],
      ['CLOSE', kit.close]]
  });


  // ── What the visitor does ────────────────────────────────────────────
  function open() { kit.open(id); }
  /** Draw an element out: its tile flies to the showcase, the one there flies home, and its atom builds. */
  function select(z) {
    if (!ELEMENTS[z - 1]) return;
    state.z = z;
    if (state.pulled !== z) {
      if (state.pulled) tile[state.pulled - 1].goal = 0;
      tile[z - 1].goal = 1; state.pulled = z;
      built.next = z; paintCaption(z);
    }
    if (kit.showing() === id) kit.redraw(); else open();
  }
  /** A new view: the tiles turn over in a wave from the left, each showing the new view on its back. */
  function setMode(mode) {
    if (!['origins', 'body', 'mendeleev'].includes(mode)) return;
    if (mode !== state.mode) {
      state.mode = mode; clearLight();
      tile.forEach(t => {
        if (t.flip) t.front = t.back;   // one still turning from before lands at once
        t.back = faceFor(t.e, mode);
        t.flip = {s: -(t.u > .5 ? .15 : t.e.col * .028 + t.e.row * .035) / .55};
        t.dirty = true;
      });
    }
    kit.redraw();
  }
  /** Light everything one source made: its tiles rise and glow, those it helped make a little, the rest grey. */
  function light(key) {
    if (!SOURCES[key]) return;
    if (state.lit === key) { clearLight(); return; }
    const wait = state.mode === 'origins' ? 0 : 1;
    if (wait) setMode('origins');
    state.lit = key;
    const matches = key === 'none' || key === 'decay' ? ['none', 'decay'] : [key];
    for (const t of tile) {
      t.hGoal = matches.includes(t.e.sources[0]) ? 1 : t.e.sources.slice(1).some(s => matches.includes(s)) ? .45 : -1;
      t.hAt = state.clock + wait + t.e.col * .025; t.dirty = true;
    }
  }
  function clearLight() {
    state.lit = null;
    for (const t of tile) { t.hGoal = 0; t.hAt = state.clock; t.dirty = true; }
  }

  return {
    id,
    update(dt) {
      state.clock += dt;
      let changed = false;
      tile.forEach((t, i) => {
        if (t.u !== t.goal) { t.u = t.goal > t.u ? Math.min(t.goal, t.u + dt / 1.2) : Math.max(t.goal, t.u - dt / 1.2); t.dirty = true; }
        if (t.flip) {
          t.flip.s += dt / .55; t.dirty = true;
          if (t.flip.s >= 1) { t.front = t.back; t.flip = null; }
        }
        if (t.h !== t.hGoal && state.clock >= t.hAt) {
          t.h += (t.hGoal - t.h) * Math.min(1, dt * 5);
          if (Math.abs(t.hGoal - t.h) < .005) t.h = t.hGoal;
          t.dirty = true;
        }
        if (t.dirty) { compose(i); t.dirty = t.u !== t.goal || !!t.flip || t.h !== t.hGoal; changed = true; }
      });
      if (changed) refresh();
      animateAtom(dt);
    },
    getState: () => {
      const e = ELEMENTS[state.z - 1], electrons = electronsOf(state.z);
      return {mode: state.mode, element: {z: e.z, symbol: e.symbol, name: e.name, sources: [...e.sources]}, pulled: state.pulled, count: ELEMENTS.length,
        gap: GAPS[state.z] ? GAPS[state.z].was : null, shells: electrons.shells, lit: state.lit,
        flipping: tile.some(t => t.flip), risen: tile.filter(t => t.h > .9).length,
        // The atom in the showcase as it stands: which element, and its electrons going round, shell by shell.
        atom: {z: built.next || built.z, shells: built.shells.slice(1).map(list => list.length).filter((n, i, all) => n || all.slice(i).some(Boolean)),
          settled: !built.next && built.electrons.every(x => x.mode === 'orbit') && built.hops.every(h => h.done)}};
    },
    targets: () => ({elements: display.localToWorld(new THREE.Vector3()).toArray()}),
    /** Where an element's tile is on the wall, to aim at. */
    tileAt: z => display.localToWorld(cellCentre(ELEMENTS[z - 1]).clone()).toArray(),
    open, select, setMode, light
  };
}
