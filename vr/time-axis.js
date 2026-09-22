/**
 * The Sapiens time axis, in band space.
 *
 * Three hundred thousand years cannot be laid out to scale. The Contemporary
 * band is eighty years and the Middle Palaeolithic is a quarter of a million,
 * so a rail drawn in proportion would crowd every named person into its last
 * half-millimetre. The source timeline's Scale III answers this by giving each
 * band a height taken from how many entries it holds, and this module rebuilds
 * that axis so the room and the screen agree on where a moment sits.
 *
 * Positions inside a band stay linear in years before present, so the ordering
 * and the clustering within an era remain the real ones.
 */

const EPOCH = 2026;          // years before present are counted from here
const SPAN_FROM = 3.0e5;     // the axis opens 300,000 years ago
const BASE = 70;             // a band is never thinner than this
const PER_ENTRY = 88;        // ...and otherwise grows with the entries it holds
const PAD = 46;

/** Half-width of the live window, in band units: roughly nine moments at once. */
export const WINDOW = 400;

export const ZONES = [
  {id: 'midpal',    label: 'Middle Palaeolithic', color: '#8a7d5c', toY: 5.0e4},
  {id: 'uppal',     label: 'Upper Palaeolithic',  color: '#9c8b55', toY: 1.2e4},
  {id: 'neo',       label: 'After Farming',       color: '#ae9a54', toY: 5.2e3},
  {id: 'ancient',   label: 'Ancient',             color: '#c08f3c', toY: 2.8e3},
  {id: 'classical', label: 'Classical',           color: '#c9a63f', toY: 1.525e3},
  {id: 'medieval',  label: 'Medieval',            color: '#a8763a', toY: 626},
  {id: 'earlymod',  label: 'Early Modern',        color: '#b98f4e', toY: 276},
  {id: 'modern',    label: 'Modern',              color: '#cfae5a', toY: 81.5},
  {id: 'contemp',   label: 'Contemporary',        color: '#e0cf78', toY: 0}
];

export const ERAS = [
  {name: 'All eras',     span: '300 kya – now',      bands: ZONES.map(z => z.id)},
  {name: 'Prehistoric',  span: '300 kya – 3200 BCE', bands: ['midpal', 'uppal', 'neo']},
  {name: 'Ancient',      span: '3200 – 800 BCE',     bands: ['ancient']},
  {name: 'Classical',    span: '800 BCE – 500 CE',   bands: ['classical']},
  {name: 'Medieval',     span: '500 – 1400 CE',      bands: ['medieval']},
  {name: 'Early Modern', span: '1400 – 1750 CE',     bands: ['earlymod']},
  {name: 'Modern',       span: '1750 – 1945',        bands: ['modern']},
  {name: 'Contemporary', span: '1945 – now',         bands: ['contemp']}
];

const sig = (value, digits = 3) => Number(value.toPrecision(digits)).toLocaleString('en-US');

export function fmtYbp(years) {
  if (years <= 0) return 'present';
  if (years < 1e3) return Math.round(years) + ' yr ago';
  if (years < 1e6) return sig(years / 1e3) + ' kya';
  return sig(years / 1e6) + ' Mya';
}

/** Below the Neolithic, years before present stops being the natural unit. */
export function fmtEra(years) {
  if (years > 12000) return fmtYbp(years);
  const year = EPOCH - Math.round(years);
  if (years < 40) return String(year);
  return year > 0 ? year + ' CE' : (1 - year).toLocaleString('en-US') + ' BCE';
}

const clamp01 = value => value < 0 ? 0 : value > 1 ? 1 : value;

export function createTimeAxis(events) {
  let from = SPAN_FROM;
  const bands = ZONES.map(zone => {
    const band = {...zone, from, to: zone.toY, count: 0};
    from = zone.toY;
    return band;
  });
  // An entry belongs to the first band whose floor it is still above. The
  // oldest entry sits slightly before the axis opens, and clamps to its top.
  const bandOf = event => {
    const index = bands.findIndex(band => event.y > band.to - 1e-9);
    return index < 0 ? bands.length - 1 : index;
  };
  const entries = events.map(event => ({event, band: bandOf(event)}));
  for (const entry of entries) bands[entry.band].count++;
  let top = 0;
  for (const band of bands) {
    band.top = top;
    band.height = Math.max(BASE, band.count ? band.count * PER_ENTRY + PAD : 0);
    top += band.height;
  }
  const height = top;
  for (const entry of entries) {
    const band = bands[entry.band];
    const within = clamp01((band.from - entry.event.y) / (band.from - band.to));
    entry.u = (band.top + within * band.height) / height;
  }
  entries.sort((a, b) => a.u - b.u || a.event.y - b.event.y);
  entries.forEach((entry, index) => {entry.index = index;});
  const byId = new Map(entries.map(entry => [entry.event.id, entry]));

  const bandSpan = band => ({lo: band.top / height, hi: (band.top + band.height) / height});
  const eras = ERAS.map(era => {
    const held = bands.filter(band => era.bands.includes(band.id));
    const lo = bandSpan(held[0]).lo, hi = bandSpan(held[held.length - 1]).hi;
    return {...era, lo, hi, count: entries.filter(entry => entry.u >= lo - 1e-9 && entry.u <= hi + 1e-9).length};
  });

  function bandAt(u) {
    const position = clamp01(u) * height;
    for (const band of bands) if (position <= band.top + band.height) return band;
    return bands[bands.length - 1];
  }
  function yearsAt(u) {
    const position = clamp01(u) * height;
    const band = bandAt(u);
    const within = clamp01((position - band.top) / band.height);
    return band.from - within * (band.from - band.to);
  }
  /** The window never grows past half the visible span, so an era still scrubs. */
  const windowHalf = (lo = 0, hi = 1) => Math.min(WINDOW / height, Math.max(hi - lo, 1e-6) / 2);

  return {
    bands, eras, entries, byId, height, bandAt, yearsAt, windowHalf,
    bandSpan,
    uOf: id => byId.get(id)?.u ?? 0,
    label: u => fmtEra(yearsAt(u)),
    /** Index of the entry nearest a position on the axis. */
    nearest(u) {
      let best = 0, bestGap = Infinity;
      for (const entry of entries) {
        const gap = Math.abs(entry.u - u);
        if (gap < bestGap) {bestGap = gap; best = entry.index;}
      }
      return best;
    }
  };
}
