/**
 * The periodic table: where your atoms were made.
 *
 * All 118 elements on a wall, each tile coloured by where in the universe its
 * atoms were mostly made: in the first minutes after the Big Bang, in dying
 * stars like the Sun, in exploding massive stars and white dwarfs, in
 * colliding neutron stars, split off bigger atoms by cosmic rays, or not made
 * to last at all. The sources follow Jennifer Johnson's chart of the origin of
 * the elements (2019), in outline: a first source, and others where they count.
 * Some, the heaviest especially, are still argued.
 *
 * Press a tile and it slides out of the wall, and its card opens. The panel
 * holds the whole table, so any element can be picked from it, and two more
 * ways of looking: what a human body is made of, and Mendeleev's gaps — the
 * three elements he left room for in 1869, and whose properties he predicted
 * before anyone had found them.
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

export function createPeriodicTable(kit, {angle}) {
  const {THREE, M, box, plane, board, wrapped} = kit;
  const id = 'mendeleev';
  const state = {z: 26, mode: 'origins', pulled: 0};

  // ── The wall of elements ─────────────────────────────────────────────
  const wall = kit.onWall(angle, .26);
  const W = COLS * CELL, H = ROWS * CELL, BOTTOM = .72;
  const display = new THREE.Group(); display.position.y = BOTTOM + H / 2; wall.add(display);
  box(display, [W + .32, H + .32, .06], [0, 0, -.04], M.slate);
  for (const [w, h, x, y] of [[W + .4, .08, 0, H / 2 + .2], [W + .4, .08, 0, -H / 2 - .2], [.08, H + .48, -W / 2 - .2, 0], [.08, H + .48, W / 2 + .2, 0]]) box(display, [w, h, .09], [x, y, -.02], M.gold);
  // One canvas carries every tile, so the table costs a single draw.
  const face = document.createElement('canvas'); face.width = 2048; face.height = Math.round(2048 * ROWS / COLS);
  const faceMap = kit.texture(face);
  const table = plane(display, W, H, [0, 0, .005], faceMap);
  const px = face.width / COLS;
  const colorOf = (e, mode) => {
    if (mode === 'body') return BODY.some(([z]) => z === e.z) ? SOURCES[e.sources[0]].color : '#2a2e33';
    if (mode === 'mendeleev') return GAPS[e.z] ? '#d9bc7d' : '#3a3f45';
    return SOURCES[e.sources[0]].color;
  };
  function drawTile(ctx, e, x, y, s, mode, strong) {
    ctx.fillStyle = colorOf(e, mode); ctx.fillRect(x + s * .04, y + s * .04, s * .92, s * .92);
    // A band along the foot shows the other sources, where there are any.
    if (mode === 'origins' && e.sources.length > 1) {
      const rest = e.sources.slice(1), w = s * .92 / rest.length;
      rest.forEach((key, i) => { ctx.fillStyle = SOURCES[key].color; ctx.fillRect(x + s * .04 + i * w, y + s * .8, w, s * .16); });
    }
    const dark = ['dwarf'].includes(e.sources[0]) && mode === 'origins' || (mode === 'mendeleev' && GAPS[e.z]);
    ctx.fillStyle = dark ? '#1d1a17' : '#f6efe0';
    ctx.font = `${Math.round(s * .16)}px Arial`; ctx.textAlign = 'left'; ctx.fillText(String(e.z), x + s * .1, y + s * .22);
    ctx.font = `bold ${Math.round(s * .4)}px Georgia`; ctx.textAlign = 'center'; ctx.fillText(e.symbol, x + s / 2, y + s * .62);
    if (strong) { ctx.strokeStyle = '#ffffff'; ctx.lineWidth = s * .05; ctx.strokeRect(x + s * .04, y + s * .04, s * .92, s * .92); }
    ctx.textAlign = 'left';
  }
  function paintWall() {
    const ctx = face.getContext('2d');
    ctx.fillStyle = '#1d2329'; ctx.fillRect(0, 0, face.width, face.height);
    for (const e of ELEMENTS) {
      if (e.z === state.pulled) { ctx.fillStyle = '#0d1014'; ctx.fillRect(e.col * px + px * .04, e.row * px + px * .04, px * .92, px * .92); continue; }
      drawTile(ctx, e, e.col * px, e.row * px, px, state.mode, false);
    }
    // Where the f-block belongs in the table.
    ctx.fillStyle = '#5a5f66'; ctx.font = `${Math.round(px * .2)}px Arial`; ctx.textAlign = 'center';
    ctx.fillText('57–71', 2.5 * px, 5.55 * px); ctx.fillText('89–103', 2.5 * px, 6.55 * px); ctx.textAlign = 'left';
    faceMap.needsUpdate = true;
  }
  // The title above, the key below.
  plane(display, 3.4, .34, [0, H / 2 + .48, .01], kit.lettering(3.4, .34, [
    ['WHERE YOUR ATOMS WERE MADE', .14, .13, '#e1c393', '600 #px Arial, sans-serif'], ['The periodic table, coloured by what made each element', .27, .07, '#c8b793', 'italic #px Georgia, serif']], '#23303b'));
  {
    const keys = ['bang', 'small', 'big', 'dwarf', 'merge', 'rays', 'none', 'made'];
    const c = document.createElement('canvas'); c.width = 2048; c.height = 96; const ctx = c.getContext('2d');
    ctx.fillStyle = '#23303b'; ctx.fillRect(0, 0, 2048, 96);
    keys.forEach((key, i) => {
      const x = 20 + i * 254; ctx.fillStyle = SOURCES[key].color; ctx.fillRect(x, 30, 40, 40);
      ctx.fillStyle = '#f1ddba'; ctx.font = '600 22px Arial'; ctx.fillText(SOURCES[key].short, x + 52, 58, 196);
    });
    plane(display, W, W * 96 / 2048, [0, -H / 2 - .38, .01], kit.texture(c));
  }
  // The tile drawn out of the wall: it slides forward and tilts toward the visitor.
  const tileFace = document.createElement('canvas'); tileFace.width = tileFace.height = 256;
  const tileMap = kit.texture(tileFace);
  const pulled = new THREE.Group(); display.add(pulled);
  const tileBox = new THREE.Mesh(new THREE.BoxGeometry(CELL * .94, CELL * .94, .05), [M.slate, M.slate, M.slate, M.slate, new THREE.MeshBasicMaterial({map: tileMap}), M.slate]);
  pulled.add(tileBox); pulled.visible = false; kit.moving(pulled);
  const cellCentre = e => new THREE.Vector3((e.col + .5) * CELL - W / 2, H / 2 - (e.row + .5) * CELL, .03);
  function paintPulled(e) {
    const ctx = tileFace.getContext('2d'); ctx.clearRect(0, 0, 256, 256);
    drawTile(ctx, e, 0, 0, 256, state.mode, false);
    ctx.fillStyle = ['dwarf'].includes(e.sources[0]) && state.mode === 'origins' ? '#1d1a17' : '#f6efe0';
    ctx.font = '22px Georgia'; ctx.textAlign = 'center'; ctx.fillText(e.name, 128, 192, 236); ctx.textAlign = 'left';
    tileMap.needsUpdate = true;
  }
  const slide = {t: 0, from: new THREE.Vector3(), to: new THREE.Vector3()};
  function pull(z) {
    const e = ELEMENTS[z - 1];
    state.pulled = z; paintPulled(e); paintWall();
    slide.from.copy(cellCentre(e)); slide.to.copy(slide.from).add(new THREE.Vector3(0, -.04, .32)); slide.t = 0;
    pulled.visible = true; pulled.position.copy(slide.from);
  }
  // One plane over the table to press; the tile under the point is worked out from where it was hit.
  const pickPlane = plane(display, W, H, [0, 0, .02], null); pickPlane.material.visible = false;
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
  {
    const p = kit.inRoom(wall, -W / 2 - .9, 2.4);
    kit.plaque(p.x, p.z, 0, 0, [
      ['THE PERIODIC TABLE', .07, .042, '#e1c393', '600 #px Arial, sans-serif'],
      ['Mendeleev, St Petersburg, 1869', .13, .034, '#c8b793', 'italic #px Georgia, serif'],
      ['Every element, coloured by where in the', .22, .033],
      ['universe its atoms were made. Press any', .27, .033],
      ['tile to draw it out and read its story.', .32, .033],
      ['After Jennifer Johnson’s chart of the origin of', .41, .026, '#a99a7c', 'italic #px Georgia, serif'],
      ['the elements (2019), in outline; some still argued.', .45, .026, '#a99a7c', 'italic #px Georgia, serif']], () => open(), 'Periodic table plaque');
  }
  const front = kit.inRoom(wall, 0, 2.6); kit.medallion(front.x, front.z);

  // ── The panel: an element's card above, the whole table below ───────
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
    ctx.fillStyle = '#b3a98c'; ctx.font = '20px Arial'; ctx.fillText(`ELEMENT ${e.z}`, 242, 230);
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
  function select(z) {
    if (!ELEMENTS[z - 1]) return;
    state.z = z; pull(z);
    if (kit.showing() === id) kit.redraw(); else open();
  }
  function setMode(mode) { state.mode = mode; paintWall(); if (state.pulled) paintPulled(ELEMENTS[state.pulled - 1]); kit.redraw(); }
  paintWall();

  return {
    id,
    update(dt) {
      if (!pulled.visible || slide.t >= 1) return;
      slide.t = Math.min(1, slide.t + dt / .6);
      const t = 1 - (1 - slide.t) ** 3;
      pulled.position.lerpVectors(slide.from, slide.to, t);
      pulled.rotation.x = -.35 * t;
    },
    getState: () => {
      const e = ELEMENTS[state.z - 1];
      return {mode: state.mode, element: {z: e.z, symbol: e.symbol, name: e.name, sources: [...e.sources]}, pulled: state.pulled, count: ELEMENTS.length,
        gap: GAPS[state.z] ? GAPS[state.z].was : null};
    },
    targets: () => ({elements: table.localToWorld(new THREE.Vector3()).toArray()}),
    /** Where an element's tile is on the wall, to aim at. */
    tileAt: z => display.localToWorld(cellCentre(ELEMENTS[z - 1]).clone()).toArray(),
    open, select, setMode
  };
}
