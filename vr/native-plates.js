/**
 * Plates for the native build: the museum's own lettering, painted here and
 * handed over as pictures.
 *
 * A Unity app has no browser to paint with, and its own text renderer draws in
 * a different typeface with different metrics — which would leave the native
 * museum reading like a different building. So anything native that carries
 * words and does not change is painted here, in the museum's own hand, and
 * exported as a picture with the size it should be shown at. The native side
 * only has to put the right picture on the right quad.
 *
 * That is why every state of a settings row is a plate of its own: pressing
 * "Walking speed" does not redraw anything in the headset, it swaps one picture
 * for the next. Sixteen plates cover the whole menu and the controls page.
 *
 * Everything here is measured in metres, and the canvas is scaled so that the
 * drawing code is written in metres too — a type size of 0.05 is five
 * centimetres of lettering, which at arm's length is comfortable to read.
 *
 * Only `scripts/export-native.mjs` calls this, through `museum.nativePlates()`.
 */
const GROUND = '#23303b', GOLD = '#e1c393', PALE = '#d8dee4', DIM = '#a9b4bd', RULE = '#4a5a68';
const DENSITY = 820;                       // pixels a metre, which a headset can resolve

/** A plate of a given size in metres, drawn in metres. */
function plate(wide, tall) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(wide * DENSITY);
  canvas.height = Math.round(tall * DENSITY);
  const ctx = canvas.getContext('2d');
  ctx.scale(DENSITY, DENSITY);             // one unit is one metre, in both axes
  ctx.textBaseline = 'middle';
  const sheet = {
    canvas, ctx, wide, tall,
    type: (metres, family = 'Georgia, serif') => {ctx.font = `${metres}px ${family}`;},
    fill: colour => {ctx.fillStyle = colour;},
    /** The ground, and a line round the edge. */
    ground: (edge = null, fill = GROUND) => {
      ctx.fillStyle = fill;
      ctx.fillRect(0, 0, wide, tall);
      if (!edge) return;
      ctx.strokeStyle = edge;
      ctx.lineWidth = .004;
      ctx.strokeRect(.002, .002, wide - .004, tall - .004);
    }
  };
  return sheet;
}

/**
 * One row of the settings menu: its name on the left, its value on the right,
 * at the size the museum uses for a label read at arm's length.
 */
function row(label, value, {wide = 1.46, tall = .17} = {}) {
  const sheet = plate(wide, tall);
  const {ctx} = sheet;
  sheet.ground(RULE);
  ctx.textAlign = 'left';
  sheet.type(.062);
  sheet.fill(GOLD);
  ctx.fillText(label, .05, tall * .54, wide * .62);
  if (value === null) return sheet;
  ctx.textAlign = 'right';
  sheet.type(.055);
  sheet.fill(DIM);
  ctx.fillText(value, wide - .05, tall * .55, wide * .33);
  return sheet;
}

/** The title above the rows. */
function title(text) {
  const sheet = plate(1.46, .2);
  const {ctx} = sheet;
  sheet.ground(GOLD);
  ctx.textAlign = 'center';
  sheet.type(.085);
  sheet.fill(GOLD);
  ctx.fillText(text, sheet.wide / 2, sheet.tall * .56, sheet.wide - .12);
  return sheet;
}

/**
 * The controls, all of them, on one plate — the page a visitor is shown on
 * arriving, because a headset has nowhere else to put instructions.
 */
function controls() {
  const sheet = plate(1.78, 1.2);
  const {ctx} = sheet;
  sheet.ground(GOLD);

  ctx.textAlign = 'center';
  sheet.type(.088);
  sheet.fill(GOLD);
  ctx.fillText('HALLWAYS OF TIME', sheet.wide / 2, .115, sheet.wide - .16);
  sheet.type(.05);
  sheet.fill(DIM);
  ctx.fillText('The controls, and what they do', sheet.wide / 2, .195, sheet.wide - .2);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = .003;
  ctx.beginPath(); ctx.moveTo(.12, .245); ctx.lineTo(sheet.wide - .12, .245); ctx.stroke();

  const rows = [
    ['Right stick', 'Walk, in the direction you are looking'],
    ['Left stick', 'Turn in steps, or smoothly if you choose'],
    ['Trigger', 'Point: open a door, press a button, walk to a spot'],
    ['Trigger, held', 'Take hold of the Earth, and turn it'],
    ['Y  and  X', 'Rise and descend, under the vault'],
    ['A', 'These settings, and this page again'],
    ['B', 'Back to the start of the museum']
  ];
  let y = .335;
  for (const [control, what] of rows) {
    ctx.textAlign = 'right';
    sheet.type(.058);
    sheet.fill(GOLD);
    ctx.fillText(control, .52, y, .44);
    ctx.textAlign = 'left';
    sheet.type(.053);
    sheet.fill(PALE);
    ctx.fillText(what, .58, y, sheet.wide - .66);
    y += .105;
  }

  ctx.textAlign = 'center';
  sheet.type(.046);
  sheet.fill(DIM);
  ctx.fillText('A door opens as you approach it, or on the trigger.', sheet.wide / 2, 1.09, sheet.wide - .2);
  sheet.type(.042);
  ctx.fillText('Point at this page and press the trigger to begin.', sheet.wide / 2, 1.145, sheet.wide - .2);
  return sheet;
}

/** A button under the reading panel, as the web museum draws its own. */
function button(text) {
  const sheet = plate(.42, .14);
  const {ctx} = sheet;
  sheet.ground(null, '#4b5640');
  ctx.textAlign = 'center';
  sheet.type(.046);
  sheet.fill('#eddfc4');
  ctx.fillText(text, sheet.wide / 2, sheet.tall * .54, sheet.wide - .04);
  return sheet;
}

/**
 * Who made the music: each space, and its piece on the piano and on the violin
 * — the composer, the work, the performer and the licence — painted from the
 * music's own manifest (native/Music/music.json), so the page cannot drift
 * from what plays.
 */
const SPACES = [
  ['cosmos', 'The cosmos', 'The Big Bang and Hall I'],
  ['earth', 'The living Earth', 'Hall II'],
  ['human', 'The human story', 'The globe room'],
  ['future', 'The unwritten future', 'The last room']
];
function credits(pieces) {
  const sheet = plate(1.96, 1.6);
  const {ctx} = sheet;
  sheet.ground(GOLD);
  ctx.textAlign = 'center';
  sheet.type(.08);
  sheet.fill(GOLD);
  ctx.fillText('MUSIC IN THE HALLS', sheet.wide / 2, .11, sheet.wide - .16);
  sheet.type(.042);
  sheet.fill(DIM);
  ctx.fillText('Compositions in the public domain, in recordings their performers gave to it',
    sheet.wide / 2, .185, sheet.wide - .2);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = .003;
  ctx.beginPath(); ctx.moveTo(.1, .23); ctx.lineTo(sheet.wide - .1, .23); ctx.stroke();

  const columns = [{x: .5, wide: .68, instrument: 'piano', heading: 'PIANO'},
                   {x: 1.24, wide: .66, instrument: 'violin', heading: 'VIOLIN'}];
  ctx.textAlign = 'left';
  sheet.type(.036);
  sheet.fill(GOLD);
  for (const column of columns) ctx.fillText(column.heading, column.x, .29, column.wide);

  let y = .375;
  for (const [space, name, where] of SPACES) {
    ctx.textAlign = 'left';
    sheet.type(.046);
    sheet.fill(GOLD);
    ctx.fillText(name, .08, y, .38);
    sheet.type(.034);
    sheet.fill(DIM);
    ctx.fillText(where, .08, y + .05, .38);
    for (const column of columns) {
      const piece = pieces.find(p => p.instrument === column.instrument && p.space === space);
      if (!piece) continue;
      sheet.type(.04);
      sheet.fill(PALE);
      ctx.fillText(piece.composer, column.x, y, column.wide);
      ctx.font = 'italic .036px Georgia, serif';
      ctx.fillText(piece.title, column.x, y + .047, column.wide);
      // In Arial, whose zero cannot be taken for the letter o, as Georgia's can in "CC0".
      ctx.font = '.029px Arial, sans-serif';
      sheet.fill(DIM);
      ctx.fillText(`${piece.performer} · ${piece.licence}`, column.x, y + .09, column.wide);
    }
    y += .205;
  }
  ctx.textAlign = 'center';
  sheet.type(.036);
  sheet.fill(DIM);
  ctx.fillText('The photographs on the exhibits are credited where they hang, and on the museum\u2019s website.',
    sheet.wide / 2, 1.235, sheet.wide - .2);

  ctx.strokeStyle = RULE;
  ctx.lineWidth = .003;
  ctx.beginPath(); ctx.moveTo(.1, 1.29); ctx.lineTo(sheet.wide - .1, 1.29); ctx.stroke();
  ctx.textAlign = 'left';
  sheet.type(.036);
  sheet.fill(GOLD);
  ctx.fillText('TERMS OF USE', .08, 1.35, .7);
  sheet.type(.034);
  sheet.fill(PALE);
  const terms = 'This museum is for your own enjoyment. It may not be copied, redistributed, or used for any ' +
    'commercial purpose without the consent of the team that made it \u2014 to ask, write to ' +
    'o.rehman.1997@gmail.com with \u201cHalls of Time\u201d as the subject. The photographs and the music keep ' +
    'the licences named above, which nothing here narrows.';
  wrap(ctx, terms, 1.78).forEach((line, index) => ctx.fillText(line, .08, 1.405 + index * .045, 1.8));
  return sheet;
}

/** Words wrapped to a width in the context's current type. */
function wrap(ctx, text, width) {
  const lines = [];
  let held = '';
  for (const word of text.split(' ')) {
    const next = held ? `${held} ${word}` : word;
    if (ctx.measureText(next).width > width && held) {lines.push(held); held = word;}
    else held = next;
  }
  if (held) lines.push(held);
  return lines;
}

/**
 * The welcome, before the Big Bang: the museum's mark and name, what it is, the
 * advice to sit, and what it asks of a visitor — which is nothing. As the web
 * museum opens on a page of its own, so does the headset.
 */
function welcome(mark) {
  const sheet = plate(1.9, 1.3);
  const {ctx} = sheet;
  sheet.ground(GOLD);
  const middle = sheet.wide / 2;
  if (mark) ctx.drawImage(mark, middle - .15, .03, .3, .3);
  ctx.textAlign = 'center';
  sheet.type(.092);
  sheet.fill(GOLD);
  ctx.fillText('HALLWAYS OF TIME', middle, .4, sheet.wide - .2);
  sheet.type(.034);
  sheet.fill(DIM);
  ctx.fillText('ONE PATH  ·  THREE GRAND HALLS  ·  A GLOBE OF HUMAN TIME', middle, .47, sheet.wide - .2);
  ctx.strokeStyle = RULE;
  ctx.lineWidth = .003;
  ctx.beginPath(); ctx.moveTo(.18, .515); ctx.lineTo(sheet.wide - .18, .515); ctx.stroke();

  sheet.type(.046);
  sheet.fill(PALE);
  const about = 'Walk from the first light of the Big Bang to the world we made: 495 moments of the cosmos, ' +
    'the living Earth and the human story, each with its picture and its story, and a globe that runs ' +
    'three hundred thousand years of history either way.';
  wrap(ctx, about, 1.62).forEach((line, index) => ctx.fillText(line, middle, .59 + index * .062, 1.66));
  sheet.type(.034);
  sheet.fill(DIM);
  ctx.fillText('Every sculpture, statue and hanging artwork here is original to this museum.', middle, .82, sheet.wide - .2);
  ctx.beginPath(); ctx.moveTo(.18, .875); ctx.lineTo(sheet.wide - .18, .875); ctx.stroke();

  const columns = [
    {x: .16, heading: 'BEST ENJOYED SEATED',
     text: 'Sit comfortably: walk with the right stick and turn with the left. There is no need to move about your room.'},
    {x: 1.0, heading: 'YOUR PRIVACY',
     text: 'No account and no internet connection. The museum asks for no permissions and collects nothing; your settings stay on this headset.'}
  ];
  ctx.textAlign = 'left';
  for (const column of columns) {
    sheet.type(.036);
    sheet.fill(GOLD);
    ctx.fillText(column.heading, column.x, .935, .76);
    sheet.type(.034);
    sheet.fill(PALE);
    wrap(ctx, column.text, .74).forEach((line, index) => ctx.fillText(line, column.x, .995 + index * .048, .76));
  }
  ctx.textAlign = 'center';
  sheet.type(.028);
  sheet.fill(DIM);
  ctx.fillText('\u00a9 2026 the Hallways of Time team \u00b7 for your own enjoyment; not to be copied or used ' +
    'commercially without our consent.', middle, 1.21, sheet.wide - .12);
  sheet.type(.03);
  ctx.fillText('Point at ENTER below and press the trigger.', middle, 1.26, sheet.wide - .2);
  return sheet;
}

/** The way in. */
function enter() {
  const sheet = plate(.96, .21);
  const {ctx} = sheet;
  sheet.ground(GOLD, '#4b5640');
  ctx.textAlign = 'center';
  sheet.type(.064);
  sheet.fill('#f3e6c6');
  ctx.fillText('ENTER THE MUSEUM', sheet.wide / 2, .085, sheet.wide - .08);
  sheet.type(.036);
  sheet.fill(GOLD);
  ctx.fillText('Begin at the Big Bang', sheet.wide / 2, .155, sheet.wide - .08);
  return sheet;
}

/** What is not in this build yet, said plainly rather than left silent. */
function note(head, body) {
  const sheet = plate(1.4, .46);
  const {ctx} = sheet;
  sheet.ground(GOLD);
  ctx.textAlign = 'center';
  sheet.type(.085);
  sheet.fill(GOLD);
  ctx.fillText(head, sheet.wide / 2, .13, sheet.wide - .12);
  sheet.type(.058);
  sheet.fill(PALE);
  const lines = [];
  let held = '';
  for (const word of body.split(' ')) {
    const next = held ? `${held} ${word}` : word;
    if (ctx.measureText(next).width > sheet.wide - .16 && held) {lines.push(held); held = word;}
    else held = next;
  }
  if (held) lines.push(held);
  lines.slice(0, 4).forEach((text, index) => ctx.fillText(text, sheet.wide / 2, .24 + index * .075, sheet.wide - .12));
  return sheet;
}

/**
 * Every plate the native build needs, each with the size it should be shown at.
 * The names are what the Unity side asks for.
 */
export async function nativePlates({music = null, mark = null} = {}) {
  // The museum's mark, for the welcome, from the SVG it is drawn from.
  let markImage = null;
  if (mark) {
    markImage = new Image();
    markImage.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(mark);
    await markImage.decode().catch(() => {markImage = null;});
  }
  const sheets = {
    'controls': controls(),
    'settings-title': title('Settings'),
    'speed-slow': row('Walking speed', 'Slow'),
    'speed-steady': row('Walking speed', 'Steady'),
    'speed-brisk': row('Walking speed', 'Brisk'),
    'turn-steps': row('Turning', '30° steps'),
    'turn-smooth': row('Turning', 'Smooth'),
    'sculpture-moving': row('Moving sculpture', 'Moving'),
    'sculpture-still': row('Moving sculpture', 'Still'),
    'opening-moving': row('Opening display', 'Moving'),
    'opening-still': row('Opening display', 'Still'),
    'image-sharpest': row('Headset image', 'Sharpest'),
    'image-standard': row('Headset image', 'Standard'),
    'row-controls': row('How to move and point', 'Show'),
    'music-piano': row('Music', 'Piano'),
    'music-violin': row('Music', 'Violin'),
    'music-off': row('Music', 'Off'),
    'row-credits': row('Credits and terms', 'Show'),
    'row-close': row('Close these settings', 'A'),
    'story-back': button('← BACK'),
    'story-close': button('CLOSE'),
    'story-next': button('NEXT →'),
    'chapter-end': note('The end of this hall’s chapters',
      'Turn back with PREVIOUS CHAPTER, or walk on through the doors to the next hall.'),
    'note-chapter': note('Not in this build yet',
      'That chapter is still to be carried across into the headset. This hall is coming across an era at a time; walk on through the doors to the next hall.'),
    'note-collection': note('Not in this build yet',
      'This hall’s exhibits, their pictures and their chapters are still to be carried across into the headset.')
  };
  if (music?.pieces?.length) sheets['credits-music'] = credits(music.pieces);
  sheets['welcome'] = welcome(markImage);
  sheets['welcome-enter'] = enter();
  return Object.entries(sheets).map(([name, sheet]) => ({
    name,
    widthMetres: +sheet.wide.toFixed(4),
    heightMetres: +sheet.tall.toFixed(4),
    pixels: [sheet.canvas.width, sheet.canvas.height],
    png: sheet.canvas.toDataURL('image/png')
  }));
}
