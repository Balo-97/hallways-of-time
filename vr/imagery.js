/**
 * Photographs for the museum, each one credited.
 *
 * `data/image-credits.json` pins one picture per event, resolved from
 * Wikimedia Commons and English Wikipedia by scripts/resolve-image-credits.mjs
 * together with its author, licence and file page. The museum shows only that
 * picture, so the credit beside it is always the right one; nothing is
 * searched for while you walk. Images are requested with CORS because they
 * are drawn into WebGL. An event without a credited picture, or a visit
 * without a network, keeps its generated illustration.
 */
export function createImagery(credits = {}) {
  const stats = {requested: 0, photos: 0, unresolved: 0, failed: 0};
  const images = new Map();                       // id → loaded HTMLImageElement
  const jobs = new Map();                         // id → Promise<{url, image, credit} | null>

  function load(url) {
    return new Promise(resolve => {
      if (!url) return resolve(null);
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.decoding = 'async';
      let done = false;
      const finish = value => {if (!done) {done = true; resolve(value);}};
      image.onload = () => finish(image.naturalWidth > 1 ? image : null);
      image.onerror = () => finish(null);
      setTimeout(() => finish(null), 15000);
      image.src = url;
    });
  }

  async function resolve(event) {
    stats.requested++;
    const credit = credits[event.id];
    if (!credit) {stats.unresolved++; return null;}
    const image = await load(credit.image);
    if (!image) {stats.failed++; stats.unresolved++; return null;}
    images.set(event.id, image);
    stats.photos++;
    return {url: credit.image, image, credit};
  }

  return {
    /** The credited photograph for an event, once it has loaded, or null. */
    photo(event) {
      if (!event?.id) return Promise.resolve(null);
      if (!jobs.has(event.id)) jobs.set(event.id, resolve(event));
      return jobs.get(event.id);
    },
    /** A photograph already loaded for this event, without asking for one. */
    ready: event => images.get(event?.id) || null,
    /** The credit for an event's photograph, whether or not it has loaded. */
    credit: event => credits[event?.id] || null,
    getState: () => ({...stats, loaded: images.size, credited: Object.keys(credits).length})
  };
}

/** "Picture: Author · Licence · Wikimedia Commons" */
export function creditLine(credit) {
  if (!credit) return '';
  return `Picture: ${credit.artist} · ${credit.license} · ${credit.host === 'enwiki' ? 'English Wikipedia' : 'Wikimedia Commons'}`;
}
