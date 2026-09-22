/**
 * How much texture the museum spends on the things that carry writing.
 *
 * The web museum runs on phones as well as headsets, so its lettering is drawn
 * at 680 texels a metre and no canvas is allowed past 2,048 pixels — a limit
 * every browser honours and which keeps texture memory modest. A native build
 * has neither constraint and one more demand: a Quest 3 resolves about 25
 * pixels a degree, which at arm's length is some 950 pixels a metre, so a plate
 * read from a metre away wants more texture than the web museum gives it.
 *
 * `?textures=large` raises both, and only the native exporter asks for it
 * (scripts/export-native.mjs). Nothing else in the museum changes: the same
 * canvases are painted by the same code, on a larger grid.
 */
const asked = new URLSearchParams(location.search).get('textures');
export const LARGE_TEXTURES = asked === 'large';
/** Multiplies the texel density of anything carrying words. */
export const TEXTURE_SCALE = LARGE_TEXTURES ? 1.5 : 1;
/** The largest canvas the museum will paint, in pixels along a side. */
export const TEXTURE_CAP = LARGE_TEXTURES ? 4096 : 2048;
/**
 * How many pixels of canvas to spend on each pixel the drawing code thinks in.
 * The globe room's panels are drawn in fixed pixel units — a 40-pixel title, a
 * 42-pixel margin — so they are painted on a finer grid under a scaling
 * transform rather than redrawn at another size. Never below one: a canvas
 * already past the cap keeps the size it has.
 */
export const LETTERING_DENSITY = LARGE_TEXTURES ? 2 : 1;
