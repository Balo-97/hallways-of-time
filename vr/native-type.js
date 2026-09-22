/**
 * The museum's typefaces, for the native build to set its own lettering in.
 *
 * Most of what the native build shows in words was painted here and handed
 * over as pictures. The globe room cannot be: its date runs continuously as
 * time is played, through some thirteen thousand readings from 300 kya to the
 * present, and its boards follow whichever moments are in view. So the headset
 * sets that lettering itself, in the typefaces the museum draws it in: each
 * face's glyphs are rendered by the browser and handed over as a signed
 * distance field — a picture of how far each point is from the letter's edge —
 * which draws a clean edge at any size, from the 22-pixel console readout to
 * the 184-pixel date across the room. With the glyphs go the browser's own
 * advances and kerning, and where its "middle" baseline sits, so a line set
 * natively falls where the web museum's fillText puts it.
 */

/** The faces the globe room's lettering uses, by the names the native side asks for. */
export const FACES = [
  {name: 'serif', css: 'Georgia, serif'},
  {name: 'sans', css: 'Arial, sans-serif'},
  {name: 'sansBold', css: 'Arial, sans-serif', weight: '600'}
];

const RENDER = 192;      // pixels to the em the glyphs are drawn at
const SPREAD = 24;       // how far the field reaches, at that size
const SHRINK = 3;        // the field is kept at a third of that size
const ATLAS = 1024;      // the width of each face's sheet

/** Every printable ASCII character, the museum's own punctuation, and whatever else `text` holds. */
export function charset(text = '') {
  const set = new Set();
  for (let code = 32; code < 127; code++) set.add(String.fromCharCode(code));
  for (const ch of '·×–—…‘’“”≈°±→←é') set.add(ch);
  for (const ch of String(text)) set.add(ch);
  for (const ch of String(text).toUpperCase()) set.add(ch);
  return [...set].filter(ch => ch !== '\n' && ch !== '\r' && ch !== '\t').sort();
}

/**
 * Squared Euclidean distance transform of one line (Felzenszwalb and
 * Huttenlocher): `f` holds 0 where the feature is and a large number elsewhere.
 */
function edt1(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) {k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);}
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
/** Distances, in pixels, from every pixel to the nearest pixel where `inside` is as asked. */
function distances(inside, w, h, want) {
  const BIG = 1e20, grid = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) grid[i] = inside[i] === want ? 0 : BIG;
  const n = Math.max(w, h), f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
    edt1(f, h, d, v, z);
    for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
    edt1(f, w, d, v, z);
    for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
  }
  return grid;
}

/** One face: its glyphs as a distance-field sheet, and its metrics per pixel of font size. */
function face(spec, chars) {
  const font = size => `${spec.weight ? spec.weight + ' ' : ''}${size}px ${spec.css}`;
  const scratch = document.createElement('canvas').getContext('2d', {willReadFrequently: true});
  scratch.font = font(RENDER);

  // Where the museum's textBaseline = 'middle' puts the alphabetic baseline,
  // measured by drawing an H both ways and finding the foot of its stems.
  const foot = baseline => {
    const c = document.createElement('canvas'); c.width = RENDER * 2; c.height = RENDER * 3;
    const ctx = c.getContext('2d', {willReadFrequently: true});
    ctx.font = font(RENDER); ctx.fillStyle = '#fff'; ctx.textBaseline = baseline;
    ctx.fillText('H', 10, RENDER * 1.5);
    const data = ctx.getImageData(0, 0, c.width, c.height).data;
    for (let y = c.height - 1; y >= 0; y--) for (let x = 0; x < c.width; x++) if (data[(y * c.width + x) * 4 + 3] > 127) return y + 1;
    return RENDER * 1.5;
  };
  // How far below a 'middle' anchor the alphabetic baseline falls, per pixel of size.
  const middle = (foot('middle') - foot('alphabetic')) / RENDER;
  const probe = scratch.measureText('Hg');

  const glyphs = {};
  const cells = [];
  for (const ch of chars) {
    const m = scratch.measureText(ch);
    const advance = m.width;
    const left = Math.ceil(m.actualBoundingBoxLeft), right = Math.ceil(m.actualBoundingBoxRight);
    const ascent = Math.ceil(m.actualBoundingBoxAscent), descent = Math.ceil(m.actualBoundingBoxDescent);
    const inkW = left + right, inkH = ascent + descent;
    if (inkW <= 0 || inkH <= 0 || ch === ' ') {glyphs[ch] = {advance: advance / RENDER}; continue;}
    // Drawn large, padded by the field's reach, and rounded to the shrink.
    const w = Math.ceil((inkW + 2 * SPREAD) / SHRINK) * SHRINK, h = Math.ceil((inkH + 2 * SPREAD) / SHRINK) * SHRINK;
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const ctx = c.getContext('2d', {willReadFrequently: true});
    ctx.font = font(RENDER); ctx.fillStyle = '#fff'; ctx.textBaseline = 'alphabetic';
    const ox = SPREAD + left, oy = SPREAD + ascent;
    ctx.fillText(ch, ox, oy);
    const data = ctx.getImageData(0, 0, w, h).data;
    const inside = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) inside[i] = data[i * 4 + 3] > 127 ? 1 : 0;
    const toInk = distances(inside, w, h, 1), toSpace = distances(inside, w, h, 0);
    const cw = w / SHRINK, cellH = h / SHRINK, field = new Uint8ClampedArray(cw * cellH);
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cw; x++) {
      let sum = 0;
      for (let dy = 0; dy < SHRINK; dy++) for (let dx = 0; dx < SHRINK; dx++) {
        const i = (y * SHRINK + dy) * w + x * SHRINK + dx;
        // Positive inside the letter, negative outside, half a pixel either side of the edge.
        sum += inside[i] ? toSpace[i] - .5 : -(toInk[i] - .5);
      }
      const signed = sum / (SHRINK * SHRINK);
      field[y * cw + x] = Math.round(255 * Math.min(1, Math.max(0, .5 + signed / (2 * SPREAD))));
    }
    cells.push({ch, cw, ch_: cellH, field});
    glyphs[ch] = {advance: advance / RENDER, x: 0, y: 0, w: cw, h: cellH,
      // The cell's top-left, from the pen on the baseline, per pixel of font size (y down).
      left: -ox / RENDER, top: -oy / RENDER, width: w / RENDER, height: h / RENDER};
  }

  // Shelf-packed into one sheet, tallest first.
  cells.sort((a, b) => b.ch_ - a.ch_);
  let x = 0, y = 0, row = 0;
  for (const cell of cells) {
    if (x + cell.cw > ATLAS) {x = 0; y += row + 1; row = 0;}
    cell.x = x; cell.y = y;
    x += cell.cw + 1; row = Math.max(row, cell.ch_);
  }
  const height = 2 ** Math.ceil(Math.log2(y + row + 1));
  const sheet = document.createElement('canvas'); sheet.width = ATLAS; sheet.height = height;
  const ctx = sheet.getContext('2d');
  const image = ctx.createImageData(ATLAS, height);
  for (const cell of cells) {
    for (let cy = 0; cy < cell.ch_; cy++) for (let cx = 0; cx < cell.cw; cx++) {
      const value = cell.field[cy * cell.cw + cx], i = ((cell.y + cy) * ATLAS + cell.x + cx) * 4;
      image.data[i] = image.data[i + 1] = image.data[i + 2] = value; image.data[i + 3] = 255;
    }
    Object.assign(glyphs[cell.ch], {x: cell.x, y: cell.y});
  }
  ctx.putImageData(image, 0, 0);

  // Kerning, as the browser applies it: what a pair measures beyond its two advances.
  const kerning = {};
  const inked = chars.filter(ch => glyphs[ch]);
  for (const a of inked) for (const b of inked) {
    const k = scratch.measureText(a + b).width - glyphs[a].advance * RENDER - glyphs[b].advance * RENDER;
    if (Math.abs(k) > RENDER * .002) kerning[a + b] = +(k / RENDER).toFixed(5);
  }

  return {
    name: spec.name, css: font(1).replace(/^(600 )?1px /, ''), weight: spec.weight || '400',
    render: RENDER, spread: SPREAD / RENDER, atlasWidth: ATLAS, atlasHeight: height,
    middle: +middle.toFixed(5),
    ascent: +(probe.fontBoundingBoxAscent / RENDER).toFixed(5), descent: +(probe.fontBoundingBoxDescent / RENDER).toFixed(5),
    glyphs: Object.entries(glyphs).map(([ch, g]) => ({ch, ...g})),
    kerning: Object.entries(kerning).map(([pair, k]) => ({pair, k})),
    png: sheet.toDataURL('image/png')
  };
}

/** Every face, with the glyphs `text` needs. */
export function nativeType(text = '') {
  const chars = charset(text);
  return FACES.map(spec => face(spec, chars));
}

/**
 * The browser's own measure of a line, for the native side to check its
 * typesetting against: widths of sample lines in each face, at 100 px.
 */
export function measureSamples(lines) {
  const ctx = document.createElement('canvas').getContext('2d');
  return FACES.map(spec => ({
    name: spec.name,
    widths: lines.map(line => {ctx.font = `${spec.weight ? spec.weight + ' ' : ''}100px ${spec.css}`; return ctx.measureText(line).width;})
  }));
}
