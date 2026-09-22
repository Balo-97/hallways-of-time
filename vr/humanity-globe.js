import {GEO} from './coastlines.js';
import {createTimeAxis, fmtEra} from './time-axis.js';

/**
 * Hall Ⅲ is a room, not a corridor.
 *
 * A species that spread over the whole planet cannot be drawn as one line of
 * plinths: where a moment happened is half of what it means. So the Human
 * Story is a single room-sized instrument — a globe you turn by hand, and a
 * rail that runs time forwards and backwards across it. Only the moments in
 * the rail's window have pins, and any of them can be taken from the globe.
 *
 * Dates, places and text stay exactly as the source collection has them.
 * The seven entries that are genuinely worldwide are given no pin at all;
 * they are named above the globe instead.
 */
import {LETTERING_DENSITY, TEXTURE_CAP, TEXTURE_SCALE} from './detail.js';

export function createHumanityGlobe(THREE, events, callbacks = {}) {
  // ── Fixed dimensions of the room and the instrument, in metres ──────────
  const R = 4.4;
  const CENTER = new THREE.Vector3(0, 4.95, -182);
  const DAIS = 5.7;                                    // keep visitors off the plinth
  const FRONT = new THREE.Vector3(0, -.27, .963).normalize();  // the visitor's sight line to the globe
  const UP = new THREE.Vector3(0, 1, 0);
  const LABEL_SLOTS = 7;
  // Half speed first, for a slow walk through a crowded era; a visit starts at ×1.
  const SPEEDS = [.5, 1, 2, 4, 8];
  const RESTING_SPEED = SPEEDS.indexOf(1);
  const READOUT = 13.6;                                // the readout canvas' aspect

  const axis = createTimeAxis(events);
  const group = new THREE.Group();
  group.name = 'The globe of human time';
  const pickables = [];

  const located = event => Number.isFinite(event.lat) && Number.isFinite(event.lon);
  const mapped = axis.entries.filter(entry => located(entry.event));
  const worldwide = axis.entries.filter(entry => !located(entry.event));
  const placeOf = event => located(event)
    ? ([event.site || event.place, event.country].filter(Boolean)
        .filter((value, index, all) => all.indexOf(value) === index).join(' · ') || 'Somewhere on Earth')
    : 'Worldwide · no single place';

  // ── Materials ───────────────────────────────────────────────────────────
  const gold = new THREE.MeshStandardMaterial({color: '#d8ba77', metalness: .66, roughness: .29});
  const stone = new THREE.MeshStandardMaterial({color: '#4a2d33', metalness: .1, roughness: .45});
  const slate = new THREE.MeshStandardMaterial({name: 'console slate', color: '#1d242b', metalness: .12, roughness: .5});

  // ── Canvas-backed surfaces ──────────────────────────────────────────────
  // Every panel in this room is drawn in fixed pixel units, and painted on a
  // grid `density` times finer (vr/detail.js): the native build reads its
  // console from arm's length, where 480 pixels a metre is a third of what a
  // headset can show. `pen` hands back a context that draws in the logical size.
  function makeCanvas(width, height) {
    const canvas = document.createElement('canvas');
    const density = Math.max(1, Math.min(LETTERING_DENSITY, TEXTURE_CAP / Math.max(width, height)));
    canvas.width = Math.round(width * density); canvas.height = Math.round(height * density);
    canvas.density = density; canvas.logicalWidth = width; canvas.logicalHeight = height;
    return canvas;
  }
  function pen(canvas) {
    const ctx = canvas.getContext('2d'), density = canvas.density || 1;
    ctx.setTransform(density, 0, 0, density, 0, 0);
    return {ctx, W: canvas.logicalWidth || canvas.width, H: canvas.logicalHeight || canvas.height};
  }
  function makeTexture(canvas) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  /** A plane whose pixels we own. `shared` lets two panels show one canvas. */
  function surface(parent, width, height, position, pixels, {shared, transparent = false, rotation, oneSided = false} = {}) {
    const canvas = shared ? shared.canvas : makeCanvas(pixels[0], pixels[1]);
    const texture = shared ? shared.texture : makeTexture(canvas);
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({map: texture, transparent, side: oneSided ? THREE.FrontSide : THREE.DoubleSide}));
    mesh.position.set(...position);
    if (rotation) mesh.rotation.set(...rotation);
    parent.add(mesh);
    mesh.userData.canvas = canvas; mesh.userData.texture = texture;
    return mesh;
  }
  /**
   * Fit one line of text into `width`: take the type down a little first, and
   * only cut with an ellipsis if it still will not go. Squeezing it with
   * fillText's maxWidth distorts the letterforms, and keeping only the first
   * wrapped line drops the rest of the words without a sign that it has.
   */
  function fitLine(ctx, text, width, family, size, min) {
    let px = size, out = String(text);
    ctx.font = `${px}px ${family}`;
    while (px > min && ctx.measureText(out).width > width) {px -= 1; ctx.font = `${px}px ${family}`;}
    if (ctx.measureText(out).width > width) {
      while (out.length > 1 && ctx.measureText(out + '…').width > width) out = out.slice(0, -1);
      out = out.replace(/[\s,;:·]+$/, '') + '…';
    }
    return out;
  }
  const wrap = (ctx, text, width) => {
    const out = []; let line = '';
    for (const word of String(text).split(/\s+/)) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > width && line) {out.push(line); line = word;} else line = next;
    }
    if (line) out.push(line);
    return out;
  };

  // Button faces are painted onto their console's deck canvas, so a whole
  // console is one texture and one draw. Each button keeps an unrendered
  // plane of its own for aiming, picking and the test surface.
  const TONES = {
    idle: {top: '#2b3742', bottom: '#1c252d', edge: 'rgba(216,186,119,.36)', text: '#efe1c0'},
    on:   {top: '#e7c987', bottom: '#b48e4a', edge: '#f6e3b0', text: '#1d170f'},
    off:  {top: '#1c2329', bottom: '#151a1f', edge: 'rgba(140,128,100,.3)', text: '#8d8573'},
    go:   {top: '#5d8f5f', bottom: '#3a633d', edge: '#b6e0ad', text: '#f3fcef'}
  };
  const buttons = [], decks = [];
  const pickSurface = new THREE.MeshBasicMaterial({visible: false});
  const resolve = value => typeof value === 'function' ? value() : value;
  function button(deck, rect, spec) {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(rect.w, rect.h), pickSurface);
    mesh.position.set(rect.x, rect.y, .012);
    deck.group.add(mesh);
    mesh.userData.action = spec.action;
    // The button is painted on the deck; this plane is only for aiming at it.
    // The native build takes its size and place from here and its purpose from
    // the id, so a native console presses the same buttons the web one does.
    mesh.userData.nativeButton = {id: spec.id || 'button', w: rect.w, h: rect.h};
    pickables.push(mesh);
    const entry = {...spec, tone: spec.tone || (() => 'idle'), deck, rect, mesh};
    buttons.push(entry);
    deck.buttons.push(entry);
    return entry;
  }
  function refreshButtons() {
    for (const deck of decks) {
      let key = '';
      for (const entry of deck.buttons) key += resolve(entry.caption) + entry.tone() + '|';
      if (key !== deck.key) {deck.key = key; drawDeck(deck);}
    }
  }
  const ellipsize = (ctx, text, width) => {
    if (ctx.measureText(text).width <= width) return text;
    let cut = text.length;
    while (cut > 1 && ctx.measureText(text.slice(0, cut) + '…').width > width) cut--;
    return text.slice(0, cut).trimEnd() + '…';
  };

  /** A control's pictogram, drawn about the origin within a size-by-size square. */
  function drawIcon(ctx, icon, size, color) {
    const h = size / 2;
    ctx.fillStyle = ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, size * .13);
    ctx.lineCap = ctx.lineJoin = 'round';
    const triangle = (x, dir) => {
      ctx.beginPath();
      ctx.moveTo(x - dir * h * .5, -h * .78); ctx.lineTo(x + dir * h * .78, 0); ctx.lineTo(x - dir * h * .5, h * .78);
      ctx.closePath(); ctx.fill();
    };
    const bar = x => ctx.fillRect(x - h * .14, -h * .78, h * .28, h * 1.56);
    const stroke = points => {
      ctx.beginPath();
      points.forEach(([x, y], i) => i ? ctx.lineTo(x * h, y * h) : ctx.moveTo(x * h, y * h));
      ctx.stroke();
    };
    const ring = () => {ctx.beginPath(); ctx.arc(0, 0, h * .82, 0, Math.PI * 2); ctx.stroke();};
    const turning = (from, to, clockwise) => {
      const r = h * .62, head = h * .62;
      ctx.beginPath(); ctx.arc(0, 0, r, from, to, !clockwise); ctx.stroke();
      const tx = clockwise ? -Math.sin(to) : Math.sin(to), ty = clockwise ? Math.cos(to) : -Math.cos(to);
      const x = Math.cos(to) * r, y = Math.sin(to) * r;
      ctx.beginPath();
      ctx.moveTo(x + tx * head * .6, y + ty * head * .6);
      ctx.lineTo(x - tx * head * .4 - ty * head * .62, y - ty * head * .4 + tx * head * .62);
      ctx.lineTo(x - tx * head * .4 + ty * head * .62, y - ty * head * .4 - tx * head * .62);
      ctx.closePath(); ctx.fill();
    };
    switch (icon) {
      case 'play': triangle(h * .1, 1); break;
      case 'reverse': triangle(-h * .1, -1); break;
      case 'hold': bar(-h * .34); bar(h * .34); break;
      case 'start': bar(-h * .7); triangle(h * .24, -1); break;
      case 'end': bar(h * .7); triangle(-h * .24, 1); break;
      case 'earlier': stroke([[.3, -.72], [-.36, 0], [.3, .72]]); break;
      case 'later': stroke([[-.3, -.72], [.36, 0], [-.3, .72]]); break;
      case 'up': stroke([[-.72, .34], [0, -.36], [.72, .34]]); break;
      case 'down': stroke([[-.72, -.34], [0, .36], [.72, -.34]]); break;
      case 'turnLeft': turning(Math.PI * .15, -Math.PI * 1.05, false); break;
      case 'turnRight': turning(Math.PI * .85, Math.PI * 2.05, true); break;
      case 'upright':
        ring();
        ctx.beginPath(); ctx.moveTo(0, -h * .58); ctx.lineTo(h * .3, h * .34); ctx.lineTo(0, h * .14); ctx.lineTo(-h * .3, h * .34);
        ctx.closePath(); ctx.fill();
        break;
      case 'follow':
        ring();
        ctx.beginPath(); ctx.arc(0, 0, h * .24, 0, Math.PI * 2); ctx.fill();
        break;
      case 'read':
        ring();
        ctx.fillRect(-h * .11, -h * .1, h * .22, h * .52);
        ctx.beginPath(); ctx.arc(0, -h * .36, h * .13, 0, Math.PI * 2); ctx.fill();
        break;
      case 'guide':
        ring();
        ctx.font = `bold ${Math.round(size * .66)}px Arial, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('?', 0, h * .06);
        break;
    }
  }

  /** Repaint a console deck: its plate, row headings, every button and the hint line. */
  function drawDeck(deck) {
    const {ctx, W, H} = pen(deck.canvas);
    const k = W / deck.width, px = x => (x + deck.width / 2) * k, py = y => (deck.height / 2 - y) * k;
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, '#1e262d'); wash.addColorStop(1, '#12181d');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(214,184,120,.5)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(14, 14, W - 28, H - 28, 26); ctx.stroke();
    ctx.textBaseline = 'middle';
    for (const heading of deck.headings) {
      ctx.textAlign = 'left'; ctx.fillStyle = '#c3a466';
      ctx.font = `600 ${Math.round(.056 * k)}px Arial, sans-serif`;
      ctx.letterSpacing = `${Math.round(.014 * k)}px`;
      ctx.fillText(heading.text, px(heading.x + .02), py(heading.y));
      ctx.letterSpacing = '0px';
    }
    if (deck.hint) {
      ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(210,192,150,.72)';
      ctx.font = `italic ${Math.round(.044 * k)}px Georgia, serif`;
      ctx.fillText(deck.hint.text, W / 2, py(deck.hint.y), W - 80);
    }
    for (const entry of deck.buttons) {
      const {x, y, w, h} = entry.rect, skin = TONES[entry.tone()] || TONES.idle;
      const left = px(x - w / 2), top = py(y + h / 2), bw = w * k, bh = h * k, radius = bh * .24;
      ctx.fillStyle = 'rgba(0,0,0,.34)';
      ctx.beginPath(); ctx.roundRect(left + 2, top + bh * .07, bw, bh, radius); ctx.fill();
      const body = ctx.createLinearGradient(0, top, 0, top + bh);
      body.addColorStop(0, skin.top); body.addColorStop(1, skin.bottom);
      ctx.fillStyle = body;
      ctx.beginPath(); ctx.roundRect(left, top, bw, bh, radius); ctx.fill();
      ctx.strokeStyle = skin.edge; ctx.lineWidth = 3; ctx.stroke();
      const caption = resolve(entry.caption), iconSize = entry.icon ? bh * .36 : 0, gap = entry.icon ? bh * .15 : 0;
      let size = Math.round(bh * .33), font = () => `600 ${size}px Arial, sans-serif`;
      ctx.font = font();
      let textWidth = ctx.measureText(caption).width;
      while (textWidth + iconSize + gap > bw - bh * .3 && size > 14) {size -= 2; ctx.font = font(); textWidth = ctx.measureText(caption).width;}
      const start = left + (bw - iconSize - gap - textWidth) / 2, middle = top + bh / 2;
      if (entry.icon) {
        ctx.save();
        ctx.translate(entry.iconAfter ? start + textWidth + gap + iconSize / 2 : start + iconSize / 2, middle);
        drawIcon(ctx, entry.icon, iconSize, skin.text);
        ctx.restore();
      }
      ctx.font = font(); ctx.fillStyle = skin.text; ctx.textAlign = 'left';
      ctx.fillText(caption, entry.iconAfter ? start : start + iconSize + gap, middle + bh * .02);
    }
    deck.texture.needsUpdate = true;
  }

  // ── The Earth ───────────────────────────────────────────────────────────
  const earth = new THREE.Group();
  earth.position.copy(CENTER);
  group.add(earth);
  // The native build turns the Earth itself, so it is kept as a node of its
  // own there rather than merged into the room (see scripts/export-native.mjs).
  earth.name = 'Earth and its pins';
  earth.userData.nativePart = {kind: 'globe', name: earth.name, piece: 'The Globe of Human Time', radius: R,
    base: {position: earth.position.toArray(), quaternion: [0, 0, 0, 1], scale: [1, 1, 1]}};

  /**
   * One equirectangular plate drawn from the same coastline rings the flat
   * timeline uses. The flat globe leaves land unfilled because a hidden
   * landmass projects to disconnected patches there; on a real sphere that
   * problem does not exist, so here the continents are solid.
   */
  function earthPlate() {
    const W = 3072, H = 1536;
    const canvas = makeCanvas(W, H), {ctx} = pen(canvas);
    const ocean = ctx.createLinearGradient(0, 0, 0, H);
    ocean.addColorStop(0, '#0a2130'); ocean.addColorStop(.26, '#103c56');
    ocean.addColorStop(.5, '#155776'); ocean.addColorStop(.74, '#103c56');
    ocean.addColorStop(1, '#0a2130');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, W, H);

    // The sphere's u = 0 falls at 90° west, so the plate is shifted a quarter turn.
    const px = lon => (lon / 360 + .25) * W;
    const py = lat => (90 - lat) / 180 * H;

    ctx.lineWidth = 1.6; ctx.strokeStyle = 'rgba(232,226,207,.11)';
    for (let lat = -75; lat <= 75; lat += 15) {
      ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke();
    }
    for (let lon = -180; lon < 180; lon += 15) {
      const x = ((px(lon) % W) + W) % W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(232,226,207,.2)';
    for (const lat of [0, 23.44, -23.44, 66.56, -66.56]) {
      ctx.beginPath(); ctx.moveTo(0, py(lat)); ctx.lineTo(W, py(lat)); ctx.stroke();
    }

    // Unwrap each ring so a coast that crosses the date line stays continuous.
    const rings = Object.values(GEO).map(flat => {
      const points = []; let previous = null;
      for (let i = 0; i < flat.length; i += 2) {
        let lon = flat[i];
        if (previous !== null) {
          while (lon - previous > 180) lon -= 360;
          while (previous - lon > 180) lon += 360;
        }
        previous = lon; points.push([lon, flat[i + 1]]);
      }
      const lons = points.map(point => point[0]);
      // A ring that runs right around the sphere is a polar coast, and has to
      // be closed over its pole or it fills as a band across the whole map.
      const encircles = Math.max(...lons) - Math.min(...lons) > 270;
      const mean = points.reduce((sum, point) => sum + point[1], 0) / points.length;
      return {points, pole: encircles ? (mean < 0 ? -90 : 90) : null};
    });
    const trace = (ring, offset) => {
      ctx.beginPath();
      ring.points.forEach(([lon, lat], i) => {
        const x = px(lon + offset), y = py(lat);
        if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      });
      if (ring.pole !== null) {
        ctx.lineTo(px(ring.points[ring.points.length - 1][0] + offset), py(ring.pole));
        ctx.lineTo(px(ring.points[0][0] + offset), py(ring.pole));
      }
      ctx.closePath();
    };
    const land = ctx.createLinearGradient(0, 0, 0, H);
    land.addColorStop(0, '#9c8f74'); land.addColorStop(.3, '#93764a');
    land.addColorStop(.52, '#8a6a3c'); land.addColorStop(.78, '#8d7449');
    land.addColorStop(1, '#a49a80');
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // Shelf haze, then the land, then the coast itself.
    for (const pass of [{stroke: 'rgba(224,197,134,.09)', width: 30},
                        {fill: land},
                        {stroke: '#efd49a', width: 4.2}]) {
      for (const ring of rings) for (const offset of [-360, 0, 360]) {
        trace(ring, offset);
        if (pass.fill) {ctx.fillStyle = pass.fill; ctx.fill();}
        else {ctx.strokeStyle = pass.stroke; ctx.lineWidth = pass.width; ctx.stroke();}
      }
    }
    return makeTexture(canvas);
  }

  const globe = new THREE.Mesh(new THREE.SphereGeometry(R, 96, 64),
    new THREE.MeshStandardMaterial({map: earthPlate(), roughness: .72, metalness: .05, emissive: '#0d2231', emissiveIntensity: .22}));
  globe.name = 'Earth';
  globe.userData.globe = true;
  // A pin is a few centimetres across on a globe nine metres wide, so aiming
  // at the Earth selects the moment in the window nearest where the ray lands.
  globe.userData.action = hit => {
    const entry = hit?.point ? liveNear(hit.point) : null;
    if (entry) choose(entry);
  };
  earth.add(globe);
  pickables.push(globe);

  // Gilt studs mark the poles, flush with the surface: an axle standing out
  // of the poles would swing across the view whenever the Earth is tilted.
  for (const end of [-1, 1]) {
    const stud = new THREE.Mesh(new THREE.SphereGeometry(.16, 16, 8), gold);
    stud.scale.y = .35;
    stud.position.y = end * (R + .01);
    earth.add(stud);
  }

  // ── The dais ────────────────────────────────────────────────────────────
  // The globe stands free on its dais. Any ring round a sphere this size runs
  // across its face from somewhere in the room, so it has none.
  for (const [radius, height, y, material] of [[DAIS, .16, .08, stone], [DAIS - .45, .10, .21, gold], [4.2, .22, .37, stone]]) {
    const tier = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 72), material);
    tier.position.set(0, y, CENTER.z);
    group.add(tier);
  }

  // ── Pins: one per located moment, shown only while it is in the window ─
  const direction = (lat, lon) => {
    const phi = lat * Math.PI / 180, lambda = lon * Math.PI / 180;
    return new THREE.Vector3(Math.cos(phi) * Math.sin(lambda), Math.sin(phi), Math.cos(phi) * Math.cos(lambda));
  };
  for (const entry of mapped) entry.direction = direction(entry.event.lat, entry.event.lon);

  const pins = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 7, 5),
    new THREE.MeshBasicMaterial(), mapped.length);
  pins.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  pins.userData.globe = true;
  pins.userData.action = hit => {
    const entry = mapped[hit.instanceId];
    if (entry && isLive(entry)) choose(entry);
  };
  earth.add(pins);
  pickables.push(pins);
  // What changes with time is not building: the native build places its own
  // pins, marker, halo, labels and worldwide panel (see `native` below).
  pins.userData.nativeSkip = true;

  const active = new THREE.Mesh(new THREE.SphereGeometry(.15, 18, 12), new THREE.MeshBasicMaterial({color: '#fff2c2'}));
  active.userData.globe = true;
  active.userData.action = () => read();
  active.userData.nativeSkip = true;
  earth.add(active);
  pickables.push(active);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(.30, .028, 8, 36), new THREE.MeshBasicMaterial({color: '#ffdf95'}));
  halo.userData.nativeSkip = true;
  earth.add(halo);

  // Every label's leader line lives in one buffer, so they cost one draw call.
  const leaderPositions = new Float32Array((LABEL_SLOTS + 1) * 6);
  const leaderGeometry = new THREE.BufferGeometry();
  leaderGeometry.setAttribute('position', new THREE.BufferAttribute(leaderPositions, 3));
  const leaders = new THREE.LineSegments(leaderGeometry, new THREE.LineBasicMaterial({color: '#f3dda8', transparent: true, opacity: .62}));
  leaders.frustumCulled = false;
  group.add(leaders);

  const labels = [];
  for (let slot = 0; slot < LABEL_SLOTS; slot++) {
    const mesh = surface(group, 1.95, .46, [0, 0, 0], [880, 208], {transparent: true});
    mesh.visible = false;
    mesh.renderOrder = 2;
    mesh.material.depthWrite = false;
    mesh.userData.nativeSkip = true;
    labels.push({mesh, entry: null, drawn: null});
  }
  function drawLabel(label, entry, isActive) {
    const {ctx, W, H} = pen(label.mesh.userData.canvas);
    const event = entry.event, band = axis.bands[entry.band];
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isActive ? 'rgba(46,38,18,.93)' : 'rgba(16,24,30,.86)';
    ctx.beginPath(); ctx.roundRect(4, 4, W - 8, H - 8, 12); ctx.fill();
    ctx.strokeStyle = isActive ? '#ffe9ab' : band.color; ctx.lineWidth = 5; ctx.stroke();
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    const inner = W - 44, h = H;
    ctx.fillStyle = '#fff4d8';
    ctx.fillText(fitLine(ctx, event.title, inner, 'Georgia, serif', Math.round(h * .33), Math.round(h * .25)),
      22, Math.round(h * .37));
    ctx.fillStyle = band.color;
    ctx.fillText(fitLine(ctx, `${fmtEra(event.y)} · ${placeOf(event)}`, inner, 'Arial, sans-serif', Math.round(h * .22), Math.round(h * .15)),
      22, Math.round(h * .73));
    label.mesh.userData.texture.needsUpdate = true;
  }

  // Worldwide moments have no place on the sphere, so they are named above it.
  const globalPanel = surface(group, 5.4, .62, [0, CENTER.y + R + 1.25, CENTER.z], [1350, 155], {transparent: true});
  globalPanel.visible = false;
  globalPanel.userData.nativeSkip = true;
  function drawGlobalPanel(live) {
    const {ctx, W, H} = pen(globalPanel.userData.canvas);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(18,28,34,.88)';
    ctx.beginPath(); ctx.roundRect(3, 3, W - 6, H - 6, 14); ctx.fill();
    ctx.strokeStyle = '#c9b075'; ctx.lineWidth = 5; ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#d9bd80'; ctx.font = '25px Arial, sans-serif';
    ctx.fillText('WORLDWIDE · NO SINGLE PLACE', W / 2, 34);
    ctx.fillStyle = '#fff4d8';
    ctx.fillText(fitLine(ctx, live.map(entry => entry.event.title).join('   ·   '), W - 44, 'Georgia, serif', 40, 27),
      W / 2, 100);
    globalPanel.userData.texture.needsUpdate = true;
  }

  // ── Time state ──────────────────────────────────────────────────────────
  let cursor = 1, viewLo = 0, viewHi = 1, era = 0;
  let playing = 0, speedIndex = RESTING_SPEED, follow = true;
  let liveFrom = 0, liveTo = -1, pastEnd = -1, activeEntry = null, chosen = null, visiblePins = 0;
  const isLive = entry => entry.index >= liveFrom && entry.index <= liveTo;
  let liveKey = '', readoutDue = 0, drag = null;
  const half = () => axis.windowHalf(viewLo, viewHi);
  const speed = () => SPEEDS[speedIndex];

  // ── Consoles ────────────────────────────────────────────────────────────
  const rails = [];
  let readoutShare = null, railShare = null, boardHeader = null, boardList = null, boardDetail = null;
  const RAIL = 20;                                     // the rail's width over its height

  function buildRail(deck, width, v) {
    const height = width / RAIL;
    // Both consoles show one rail canvas, so each is drawn whenever either changes.
    const rail = surface(deck.group, width, height, [0, v, .006], [2400, 120], {shared: railShare, oneSided: true});
    railShare ??= {canvas: rail.userData.canvas, texture: rail.userData.texture};
    rail.userData.rail = true;
    rail.userData.action = hit => scrubToPoint(rail, hit.point);
    rail.userData.nativeSurface = {id: 'rail', width, height, pixels: [2400, 120]};
    pickables.push(rail);
    const window = new THREE.Mesh(new THREE.PlaneGeometry(1, height),
      new THREE.MeshBasicMaterial({color: '#ffe9ae', transparent: true, opacity: .2, depthWrite: false}));
    window.position.set(0, v, .009);
    window.userData.nativeSkip = true;
    deck.group.add(window);
    const thumb = new THREE.Mesh(new THREE.PlaneGeometry(.04, height * 1.5), new THREE.MeshBasicMaterial({color: '#fff6da'}));
    thumb.position.set(0, v, .014);
    thumb.userData.nativeSkip = true;
    deck.group.add(thumb);
    const entry = {rail, window, thumb, width, v};
    rails.push(entry);
    return entry;
  }
  /** Lay cells out along a row; `gapBefore` opens a wider gap between groups. */
  function layoutRow(deck, cells, left, span, y, height) {
    const gap = .045, groupGap = .14;
    const gaps = cells.reduce((sum, cell, i) => sum + (i ? (cell.gapBefore ? groupGap : gap) : 0), 0);
    const unit = (span - gaps) / cells.reduce((sum, cell) => sum + (cell.span || 1), 0);
    let x = left;
    cells.forEach((cell, i) => {
      if (i) x += cell.gapBefore ? groupGap : gap;
      const w = unit * (cell.span || 1);
      button(deck, {x: x + w / 2, y, w, h: height}, cell);
      x += w;
    });
  }

  const eraCells = () => axis.eras.map((item, index) => ({
    id: `era:${index}`, label: item.name.toUpperCase(), caption: item.name,
    action: () => setEra(index), tone: () => era === index ? 'on' : 'idle'
  }));
  const CONTROLS = {
    start: {label: 'TO 300 kya', caption: '300 kya', icon: 'start', action: () => {stop(); setCursorTo(viewLo);}},
    earlier: {label: 'EARLIER', caption: 'Earlier', icon: 'earlier', action: () => step(-1)},
    rewind: {label: 'REWIND', caption: 'Rewind', icon: 'reverse', action: () => play(-1), tone: () => playing < 0 ? 'go' : 'idle'},
    hold: {label: 'HOLD', caption: 'Hold', icon: 'hold', action: () => {stop(); notify();}, tone: () => playing ? 'idle' : 'on'},
    play: {label: 'PLAY', caption: 'Play', icon: 'play', action: () => play(1), tone: () => playing > 0 ? 'go' : 'idle'},
    later: {label: 'LATER', caption: 'Later', icon: 'later', iconAfter: true, action: () => step(1)},
    end: {label: 'TO PRESENT', caption: 'Present', icon: 'end', iconAfter: true, action: () => {stop(); setCursorTo(viewHi);}},
    speed: {label: () => `SPEED ×${speed()}`, caption: () => `Speed ×${speed()}`, action: () => {speedIndex = (speedIndex + 1) % SPEEDS.length; notify();}},
    turnLeft: {label: 'TURN LEFT', caption: 'Turn left', icon: 'turnLeft', action: () => nudge(-.36, 0)},
    turnRight: {label: 'TURN RIGHT', caption: 'Turn right', icon: 'turnRight', iconAfter: true, action: () => nudge(.36, 0)},
    tiltUp: {label: 'TILT UP', caption: 'Tilt up', icon: 'up', action: () => nudge(0, -.26)},
    tiltDown: {label: 'TILT DOWN', caption: 'Tilt down', icon: 'down', action: () => nudge(0, .26)},
    upright: {label: 'UPRIGHT VIEW', caption: 'Upright', icon: 'upright', action: () => resetView()},
    follow: {label: () => `FOLLOW ${follow ? 'ON' : 'OFF'}`, caption: () => follow ? 'Follow on' : 'Follow off', icon: 'follow',
      action: () => {follow = !follow; if (follow) aim(); notify();}, tone: () => follow ? 'on' : 'off'},
    read: {label: 'READ THIS', caption: 'Read', icon: 'read', action: () => read()},
    guide: {label: 'GUIDE', caption: 'Guide', icon: 'guide', action: () => callbacks.help?.()}
  };
  const cells = (...names) => names.map(name => name.startsWith('|')
    ? {...CONTROLS[name.slice(1)], id: name.slice(1), gapBefore: true} : {...CONTROLS[name], id: name});

  /**
   * A waist-high console. Its deck stops at 1.63 m, just under standing eye
   * height, so the globe is never hidden behind the controls that drive it,
   * and every button stays inside comfortable reach in a headset.
   */
  function buildConsole({z, facing, width, full, title}) {
    const root = new THREE.Group();
    root.position.set(0, 0, z);
    root.rotation.y = facing;
    group.add(root);
    const depth = full ? 1.7 : 1.35;
    const body = new THREE.Mesh(new THREE.BoxGeometry(width + .4, .58, depth), stone);
    body.position.set(0, .29, 0);
    root.add(body);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(width + .5, .05, depth + .1), gold);
    cap.position.set(0, .60, 0);
    root.add(cap);
    // An engraved plate on the cabinet front, read on the way in.
    if (title) {
      // The plate is nearly six metres wide: its canvas is shaped to match, or
      // the engraved lettering is squeezed to well under its natural width.
      const plateSpan = width - .2, px = Math.min(420 * TEXTURE_SCALE, TEXTURE_CAP / plateSpan);
      const fw = Math.round(plateSpan * px), fh = Math.round(.26 * px);
      const fascia = surface(root, plateSpan, .26, [0, .33, depth / 2 + .014], [fw, fh]);
      const {ctx} = pen(fascia.userData.canvas);
      ctx.fillStyle = '#2b1d21'; ctx.fillRect(0, 0, fw, fh);
      ctx.strokeStyle = '#c9a664'; ctx.lineWidth = 4; ctx.strokeRect(2, 2, fw - 4, fh - 4);
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#e6cd9c'; ctx.font = `${Math.round(fh * .42)}px Georgia, serif`;
      ctx.fillText(title, Math.round(fw / 2), Math.round(fh * .54), fw - 60);
      fascia.userData.texture.needsUpdate = true;
    }

    const group0 = new THREE.Group();
    group0.position.set(0, 1.10, -(depth / 2) + .92);
    group0.rotation.x = -.96;
    root.add(group0);
    const plateWidth = width + .22, plateHeight = full ? 1.88 : 1.22;
    const frame = new THREE.Mesh(new THREE.BoxGeometry(plateWidth + .06, plateHeight + .06, .035), gold);
    frame.position.z = -.02;
    group0.add(frame);
    const face = surface(group0, plateWidth, plateHeight, [0, 0, 0],
      [Math.round(plateWidth * 480), Math.round(plateHeight * 480)], {oneSided: true});
    const deck = {group: group0, canvas: face.userData.canvas, texture: face.userData.texture,
      width: plateWidth, height: plateHeight, buttons: [], headings: [], hint: null, key: ''};
    decks.push(deck);

    const top = plateHeight / 2 - .05, readoutHeight = width / READOUT;
    const readout = surface(group0, width, readoutHeight, [0, top - readoutHeight / 2, .006], [1632, 120],
      {shared: readoutShare, oneSided: true});
    readoutShare ??= {canvas: readout.userData.canvas, texture: readout.userData.texture};
    readout.userData.nativeSurface = {id: 'readout', width, height: readoutHeight, pixels: [1632, 120]};
    const railY = top - readoutHeight - .045 - width / RAIL / 2;
    buildRail(deck, width, railY);

    // Rows under small engraved headings: the era, time itself, and the globe.
    const gutter = full ? .5 : 0;
    const rows = full
      ? [['ERA', .2, eraCells()],
         ['TIME', .25, cells('start', 'earlier', '|rewind', 'hold', 'play', '|later', 'end', '|speed')],
         ['GLOBE', .2, cells('turnLeft', 'turnRight', 'tiltUp', 'tiltDown', 'upright', 'follow', '|read', 'guide')]]
      : [[null, .24, cells('rewind', 'hold', 'play', '|earlier', 'later', '|turnLeft', 'turnRight', '|read')]];
    let y = railY - width / RAIL / 2 - .075;
    for (const [heading, height, row] of rows) {
      const middle = y - height / 2;
      layoutRow(deck, row, -width / 2 + gutter, width - gutter, middle, height);
      if (heading) deck.headings.push({text: heading, x: -width / 2, y: middle});
      y -= height + .07;
    }
    deck.hint = {y: -plateHeight / 2 + .075, text: 'Hold the trigger on the Earth to turn it  ·  drag along the rail to travel through time'};
    drawDeck(deck);
    return root;
  }
  buildConsole({z: -172.30, facing: 0, width: 6.0, full: true,
    title: '320 moments, placed where they happened  ·  Turn the Earth, and run time either way'});
  buildConsole({z: -191.70, facing: Math.PI, width: 5.4, full: false});

  // Two boards beside the globe, turned toward the main console and hung low
  // enough to read. Both carry the date across the room. Beneath it, the one on
  // the right (seen from the console) lists the moments happening now, and the
  // one on the left says what the highlighted moment was: its place, a
  // paragraph, its three facts and its picture. Each sits between the room's
  // first column and the globe's labels.
  const BOARD = {width: 3.6, header: 1.0, list: 1.95, gap: .06};
  const BOARD_POSITION = {x: 6.45, y: 4.3, z: -179.3, turn: .74};
  for (const side of [-1, 1]) {
    const board = new THREE.Group();
    board.position.set(side * BOARD_POSITION.x, BOARD_POSITION.y, BOARD_POSITION.z);
    board.rotation.y = -side * BOARD_POSITION.turn;
    group.add(board);
    const tall = BOARD.header + BOARD.gap + BOARD.list;
    // A gilt edge round a slate back, so the board is finished seen from either end of the room.
    const rim = new THREE.Mesh(new THREE.BoxGeometry(BOARD.width + .16, tall + .16, .04), gold);
    rim.position.z = -.04;
    board.add(rim);
    const backing = new THREE.Mesh(new THREE.BoxGeometry(BOARD.width + .08, tall + .08, .06), slate);
    backing.position.z = -.036;
    board.add(backing);
    const headerY = tall / 2 - BOARD.header / 2, listY = -tall / 2 + BOARD.list / 2;
    const header = surface(board, BOARD.width, BOARD.header, [0, headerY, 0], [1536, 427], {shared: boardHeader, oneSided: true});
    boardHeader ??= {canvas: header.userData.canvas, texture: header.userData.texture};
    header.userData.nativeSurface = {id: 'header', width: BOARD.width, height: BOARD.header, pixels: [1536, 427]};
    if (side < 0) {
      const detail = surface(board, BOARD.width, BOARD.list, [0, listY, 0], [1536, 832], {oneSided: true});
      boardDetail = {canvas: detail.userData.canvas, texture: detail.userData.texture};
      detail.userData.nativeSurface = {id: 'detail', width: BOARD.width, height: BOARD.list, pixels: [1536, 832]};
    } else {
      const list = surface(board, BOARD.width, BOARD.list, [0, listY, 0], [1536, 832], {shared: boardList, oneSided: true});
      boardList ??= {canvas: list.userData.canvas, texture: list.userData.texture};
      list.userData.nativeSurface = {id: 'list', width: BOARD.width, height: BOARD.list, pixels: [1536, 832]};
    }
    const divider = new THREE.Mesh(new THREE.BoxGeometry(BOARD.width, .022, .02), gold);
    divider.position.set(0, tall / 2 - BOARD.header - BOARD.gap / 2, .004);
    board.add(divider);
  }

  // ── Drawing the changing parts ──────────────────────────────────────────
  function drawRails() {
    if (!railShare) return;
    const {texture} = railShare, {ctx, W, H} = pen(railShare.canvas), top = 42;
    const span = Math.max(viewHi - viewLo, 1e-6), at = u => (u - viewLo) / span * W;
    ctx.fillStyle = '#0d1317'; ctx.fillRect(0, 0, W, H);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const band of axis.bands) {
      const {lo, hi} = axis.bandSpan(band);
      if (hi < viewLo || lo > viewHi) continue;
      const x0 = Math.max(0, at(lo)), x1 = Math.min(W, at(hi));
      ctx.globalAlpha = .28; ctx.fillStyle = band.color; ctx.fillRect(x0, top, x1 - x0, H - top);
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#0a0f12'; ctx.fillRect(x0 - 1.5, top, 3, H - top);
      if (x1 - x0 > 150) {
        ctx.fillStyle = band.color; ctx.font = '600 24px Arial, sans-serif';
        ctx.fillText(band.label.toUpperCase(), (x0 + x1) / 2, top / 2 + 2, x1 - x0 - 16);
      }
    }
    for (const entry of axis.entries) {
      if (entry.u < viewLo || entry.u > viewHi) continue;
      const live = entry.index >= liveFrom && entry.index <= liveTo;
      const height = (H - top) * (live ? .8 : .42);
      ctx.fillStyle = live ? '#fff4cf' : entry.u <= cursor ? '#d8b878' : '#56636d';
      ctx.fillRect(at(entry.u) - 2, H - height - 6, 4, height);
    }
    ctx.strokeStyle = 'rgba(214,184,120,.6)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 12); ctx.stroke();
    texture.needsUpdate = true;
  }
  function syncRails() {
    const span = Math.max(viewHi - viewLo, 1e-6), reach = Math.min(half(), span / 2);
    for (const entry of rails) {
      const lo = Math.max(viewLo, cursor - reach), hi = Math.min(viewHi, cursor + reach);
      const scale = Math.max((hi - lo) / span, .004);
      entry.window.scale.x = scale * entry.width;
      entry.window.position.x = ((lo + hi) / 2 - viewLo) / span * entry.width - entry.width / 2;
      entry.thumb.position.x = (cursor - viewLo) / span * entry.width - entry.width / 2;
    }
  }
  const statusText = () => playing > 0 ? `PLAYING ×${speed()}` : playing < 0 ? `REWINDING ×${speed()}` : 'TIME HELD';

  // Each drawing is keyed on what it shows, so an unchanged texture is never re-sent.
  let readoutKey = '', headerKey = '';
  function drawReadout() {
    if (!readoutShare) return;
    const band = axis.bandAt(cursor), count = liveTo - liveFrom + 1, date = axis.label(cursor), status = statusText();
    const key = `${date}|${band.id}|${status}|${count}|${activeEntry?.event.id}`;
    if (key === readoutKey) return;
    readoutKey = key;
    const {texture} = readoutShare, {ctx, W, H} = pen(readoutShare.canvas);
    ctx.fillStyle = '#0d1317'; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(214,184,120,.55)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.roundRect(2, 2, W - 4, H - 4, 14); ctx.stroke();
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
    ctx.fillStyle = '#fff3d3'; ctx.font = '52px Georgia, serif';
    ctx.fillText(date, 28, 46, 350);
    ctx.fillStyle = band.color; ctx.font = '600 22px Arial, sans-serif'; ctx.letterSpacing = '2px';
    ctx.fillText(band.label.toUpperCase(), 30, 92, 350);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(214,184,120,.35)'; ctx.fillRect(400, 20, 2, H - 40);
    if (activeEntry) {
      ctx.fillStyle = '#fff3d3'; ctx.font = '38px Georgia, serif';
      ctx.fillText(ellipsize(ctx, activeEntry.event.title, 850), 430, 44);
      ctx.fillStyle = '#d9bd80'; ctx.font = '24px Arial, sans-serif';
      ctx.fillText(ellipsize(ctx, `${fmtEra(activeEntry.event.y)}  ·  ${placeOf(activeEntry.event)}`, 850), 430, 90);
    }
    ctx.fillStyle = 'rgba(214,184,120,.35)'; ctx.fillRect(1310, 20, 2, H - 40);
    const tone = playing ? TONES.go : TONES.idle;
    ctx.fillStyle = playing ? tone.bottom : '#2a2f33';
    ctx.beginPath(); ctx.roundRect(1340, 18, 264, 46, 23); ctx.fill();
    ctx.textAlign = 'center'; ctx.fillStyle = playing ? tone.text : '#e6d6b0'; ctx.font = '600 22px Arial, sans-serif';
    ctx.fillText(status, 1472, 42, 244);
    ctx.fillStyle = '#a99c7e'; ctx.font = '22px Arial, sans-serif';
    ctx.fillText(`${count} of ${axis.entries.length} moments in view`, 1472, 92, 264);
    texture.needsUpdate = true;
  }
  function drawDate() {
    if (!boardHeader) return;
    const band = axis.bandAt(cursor), date = axis.label(cursor), status = statusText();
    const key = `${date}|${band.id}|${status}`;
    if (key === headerKey) return;
    headerKey = key;
    const {texture} = boardHeader, {ctx, W, H} = pen(boardHeader.canvas);
    ctx.fillStyle = '#121a20'; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = band.color; ctx.fillRect(0, 0, W, 12);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff4d8'; ctx.font = '184px Georgia, serif';
    ctx.fillText(date, W / 2, 168, W - 90);
    ctx.fillStyle = band.color; ctx.font = '600 60px Arial, sans-serif'; ctx.letterSpacing = '6px';
    ctx.fillText(band.label.toUpperCase(), W / 2, 314, W - 90);
    ctx.letterSpacing = '3px'; ctx.fillStyle = '#b9ad90'; ctx.font = '40px Arial, sans-serif';
    ctx.fillText(status, W / 2, 380, W - 90);
    ctx.letterSpacing = '0px';
    texture.needsUpdate = true;
  }
  // Each moment's own illustration, loaded once and kept: the plates are local
  // vector files, so they draw into a canvas without any cross-origin taint.
  const plates = new Map();
  function plateFor(event, then) {
    if (!event?.art) return null;
    const known = plates.get(event.art);
    if (known) return known.complete && known.naturalWidth ? known : null;
    const image = new Image();
    image.onload = () => then?.();
    image.src = new URL(event.art, location.href).href;
    plates.set(event.art, image);
    return null;
  }
  /** Words wrapped to a width, ending in an ellipsis if they run past `lines`. */
  function wrapped(ctx, words, width, lines) {
    const out = [];
    let held = '';
    for (const word of String(words || '').split(/\s+/).filter(Boolean)) {
      const next = held ? `${held} ${word}` : word;
      if (ctx.measureText(next).width <= width || !held) { held = next; continue; }
      out.push(held);
      held = word;
      if (out.length === lines) break;
    }
    if (out.length < lines && held) out.push(held);
    const all = String(words || '').trim(), shown = out.join(' ');
    if (out.length && shown.length < all.length) out[out.length - 1] = ellipsize(ctx, out[out.length - 1] + ' \u2026', width);
    return out;
  }
  /**
   * The left-hand board's page: the highlighted moment in a little more depth
   * than a single line — where it happened, a paragraph, its three facts and
   * its own illustration. Everything on it is the event's own text.
   */
  function drawDetail() {
    if (!boardDetail) return;
    const {texture} = boardDetail, {ctx, W, H} = pen(boardDetail.canvas);
    const entry = activeEntry, event = entry?.event;
    ctx.fillStyle = '#10171c'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c9ab6a'; ctx.font = '600 48px Arial, sans-serif'; ctx.letterSpacing = '5px';
    ctx.fillText('ABOUT THIS MOMENT', 60, 72);
    ctx.letterSpacing = '0px';
    ctx.fillStyle = 'rgba(201,171,106,.45)'; ctx.fillRect(60, 118, W - 120, 3);
    if (!event) {
      ctx.fillStyle = '#a39a86'; ctx.font = '56px Georgia, serif';
      ctx.fillText('Choose a moment on the globe or the rail.', 60, 210, W - 120);
      texture.needsUpdate = true;
      return;
    }
    const band = axis.bands[entry.band];
    ctx.textAlign = 'right'; ctx.fillStyle = band?.color || '#e6c886'; ctx.font = '600 42px Arial, sans-serif';
    ctx.fillText(event.date || fmtEra(event.y), W - 60, 72, 520);

    // Its title, and where.
    ctx.textAlign = 'left'; ctx.fillStyle = '#fff6e0';
    ctx.fillText(fitLine(ctx, event.title, W - 120, 'Georgia, serif', 76, 54), 60, 192);
    ctx.fillStyle = '#b9ae96';
    ctx.fillText(fitLine(ctx, placeOf(event), W - 120, 'Arial, sans-serif', 42, 32), 60, 258);

    // A paragraph beside its picture — or across the board if it has none.
    const picture = plateFor(event, () => {if (activeEntry?.event === event) drawDetail();});
    const pictureWidth = 470, pictureHeight = Math.round(pictureWidth / 2.27);
    const textWidth = picture ? W - 120 - pictureWidth - 44 : W - 120;
    ctx.fillStyle = '#e6ddc8'; ctx.font = '44px Georgia, serif';
    wrapped(ctx, event.detail, textWidth, 5).forEach((line, index) => ctx.fillText(line, 60, 334 + index * 56));
    if (picture) {
      const x = W - 60 - pictureWidth, y = 304;
      ctx.drawImage(picture, x, y, pictureWidth, pictureHeight);
      ctx.strokeStyle = 'rgba(214,184,120,.6)'; ctx.lineWidth = 3; ctx.strokeRect(x, y, pictureWidth, pictureHeight);
    }

    // Its three facts, across the foot.
    const facts = (event.facts || []).slice(0, 3);
    if (facts.length) {
      ctx.fillStyle = 'rgba(201,171,106,.35)'; ctx.fillRect(60, 626, W - 120, 2);
      const column = (W - 120) / facts.length;
      facts.forEach(([label, value], index) => {
        const x = 60 + index * column;
        ctx.textAlign = 'left';
        ctx.fillStyle = '#c9ab6a'; ctx.font = '600 32px Arial, sans-serif'; ctx.letterSpacing = '3px';
        ctx.fillText(ellipsize(ctx, String(label).toUpperCase(), column - 40), x, 682);
        ctx.letterSpacing = '0px';
        ctx.fillStyle = '#fff4d8';
        ctx.fillText(fitLine(ctx, String(value), column - 40, 'Georgia, serif', 42, 30), x, 744);
      });
    }
    texture.needsUpdate = true;
  }

  function drawList() {
    if (!boardList) return;
    const {texture} = boardList, {ctx, W, H} = pen(boardList.canvas);
    const count = liveTo - liveFrom + 1;
    ctx.fillStyle = '#10171c'; ctx.fillRect(0, 0, W, H);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left'; ctx.fillStyle = '#c9ab6a'; ctx.font = '600 48px Arial, sans-serif'; ctx.letterSpacing = '5px';
    ctx.fillText('HAPPENING NOW', 60, 72);
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'right'; ctx.fillStyle = '#9a917a'; ctx.font = '42px Arial, sans-serif';
    if (count > 0) ctx.fillText(`${count} in view`, W - 60, 72);
    ctx.fillStyle = 'rgba(201,171,106,.45)'; ctx.fillRect(60, 118, W - 120, 3);
    if (count <= 0) {
      ctx.textAlign = 'left'; ctx.fillStyle = '#a39a86'; ctx.font = '56px Georgia, serif';
      ctx.fillText('No recorded moment falls in this window.', 60, 210, W - 120);
      texture.needsUpdate = true;
      return;
    }
    // Five rows at most, kept around the moment nearest the cursor.
    const ROWS = 5, focus = activeEntry && activeEntry.index >= liveFrom && activeEntry.index <= liveTo ? activeEntry.index : liveTo;
    const first = Math.max(liveFrom, Math.min(focus - 2, liveTo - ROWS + 1)), last = Math.min(liveTo, first + ROWS - 1);
    let y = 200;
    for (let index = first; index <= last; index++) {
      const entry = axis.entries[index], current = entry === activeEntry;
      if (current) {
        ctx.fillStyle = 'rgba(216,186,119,.15)';
        ctx.beginPath(); ctx.roundRect(36, y - 60, W - 72, 120, 16); ctx.fill();
        ctx.fillStyle = '#e6c886'; ctx.fillRect(36, y - 60, 10, 120);
      }
      ctx.textAlign = 'left';
      ctx.fillStyle = current ? '#f2d596' : '#bca06a'; ctx.font = '600 52px Arial, sans-serif';
      ctx.fillText(fmtEra(entry.event.y), 74, y, 330);
      ctx.fillStyle = current ? '#fff6e0' : '#e0d6c0'; ctx.font = '70px Georgia, serif';
      ctx.fillText(ellipsize(ctx, entry.event.title, W - 470), 420, y + 2);
      y += 132;
    }
    texture.needsUpdate = true;
  }

  // ── Pin state, recomputed only when the window actually moves ───────────
  const colorPast = new THREE.Color(), colorLive = new THREE.Color('#fff4cf');
  const matrix = new THREE.Matrix4(), scale = new THREE.Vector3(), place = new THREE.Vector3();
  // Only the moments inside the slider's window are on the globe at all.
  function paintPins() {
    visiblePins = 0;
    for (let i = 0; i < mapped.length; i++) {
      const entry = mapped[i], live = isLive(entry);
      place.copy(entry.direction).multiplyScalar(R + .09);
      matrix.compose(place, new THREE.Quaternion(), scale.setScalar(live ? .115 : 0));
      pins.setMatrixAt(i, matrix);
      pins.setColorAt(i, live ? colorLive : colorPast.set(axis.bands[entry.band].color));
      if (live) visiblePins++;
    }
    pins.instanceMatrix.needsUpdate = true;
    if (pins.instanceColor) pins.instanceColor.needsUpdate = true;
    pins.computeBoundingSphere();
  }

  /** The live window, the newest moment in it, and everything that follows. */
  function syncWindow({quiet = false} = {}) {
    const reach = half();
    const lo = Math.max(viewLo, cursor - reach), hi = Math.min(viewHi, cursor + reach);
    liveFrom = axis.entries.length; liveTo = -1;
    for (const entry of axis.entries) {
      if (entry.u < lo - 1e-9 || entry.u > hi + 1e-9) continue;
      if (entry.index < liveFrom) liveFrom = entry.index;
      if (entry.index > liveTo) liveTo = entry.index;
    }
    if (liveTo < liveFrom) liveFrom = 0;
    // The active moment is one chosen from the globe while it stays in the
    // window; otherwise the one nearest the cursor, preferring a placed one.
    let best = null, bestGap = Infinity;
    if (chosen && !isLive(chosen)) chosen = null;
    if (chosen) best = chosen;
    else for (let index = liveFrom; index <= liveTo; index++) {
      const entry = axis.entries[index], gap = Math.abs(entry.u - cursor);
      if (gap < bestGap - 1e-12 || (Math.abs(gap - bestGap) < 1e-12 && located(entry.event) && !located(best?.event ?? {}))) {
        bestGap = gap; best = entry;
      }
    }
    if (!best) best = axis.entries[axis.nearest(cursor)];
    const changed = best !== activeEntry;
    activeEntry = best;

    const key = `${liveFrom}:${liveTo}:${activeEntry?.event.id}`;
    let end = 0;
    while (end < mapped.length && mapped[end].u <= cursor + 1e-9) end++;
    if (key !== liveKey || end !== pastEnd) {
      const windowMoved = key !== liveKey;
      liveKey = key; pastEnd = end;
      paintPins();
      drawRails();
      if (windowMoved) {
        drawList();
        drawDetail();
        layoutLabels();
        if (changed && follow && !drag) aim();
      }
    }
    syncRails();
    readoutDue = 0;
    if (!quiet) notify();
  }

  function layoutLabels() {
    const named = [];
    for (let index = liveTo; index >= liveFrom && named.length < LABEL_SLOTS; index--) {
      const entry = axis.entries[index];
      if (located(entry.event)) named.push(entry);
    }
    if (activeEntry && located(activeEntry.event) && isLive(activeEntry) && !named.includes(activeEntry)) {
      if (named.length >= LABEL_SLOTS) named.pop();
      named.unshift(activeEntry);
    }
    labels.forEach((label, slot) => {
      const entry = named[slot] || null;
      label.entry = entry;
      label.mesh.visible = false;
      if (!entry) return;
      const key = entry.event.id + (entry === activeEntry ? '*' : '');
      if (label.drawn !== key) {label.drawn = key; drawLabel(label, entry, entry === activeEntry);}
    });
    const live = worldwide.filter(entry => entry.index >= liveFrom && entry.index <= liveTo);
    globalPanel.visible = live.length > 0;
    if (live.length) drawGlobalPanel(live);
  }

  // ── Turning the globe ───────────────────────────────────────────────────
  const spin = new THREE.Quaternion(), tilt = new THREE.Quaternion();
  const right = new THREE.Vector3(1, 0, 0), velocity = {yaw: 0, pitch: 0};
  const target = new THREE.Quaternion();
  let aiming = false;

  function turn(yaw, pitch, axisRight = right) {
    if (yaw) {spin.setFromAxisAngle(UP, yaw); earth.quaternion.premultiply(spin);}
    if (pitch) {tilt.setFromAxisAngle(axisRight, pitch); earth.quaternion.premultiply(tilt);}
    earth.quaternion.normalize();
  }
  const GLIDE = .217;                        // seconds of coast after a flick
  const spinTo = (yaw, pitch) => {
    velocity.yaw = Math.max(-3.2, Math.min(3.2, yaw));
    velocity.pitch = Math.max(-3.2, Math.min(3.2, pitch));
  };
  function nudge(yaw, pitch) {aiming = false; spinTo(yaw / GLIDE, pitch / GLIDE); notify();}

  /**
   * Bring a site to the front of the globe with north still up. The minimal
   * rotation between two directions would leave the Earth lolling on its
   * side, so both frames are built as a full basis.
   */
  const basisLocal = new THREE.Matrix4(), basisRoom = new THREE.Matrix4();
  const localRight = new THREE.Vector3(), localUp = new THREE.Vector3();
  const roomRight = new THREE.Vector3(), roomUp = new THREE.Vector3();
  function orientation(point) {
    localRight.crossVectors(UP, point);
    if (localRight.lengthSq() < 1e-8) return target.setFromUnitVectors(point, FRONT);
    localRight.normalize();
    localUp.crossVectors(point, localRight);
    roomRight.crossVectors(UP, FRONT).normalize();
    roomUp.crossVectors(FRONT, roomRight);
    basisLocal.makeBasis(point, localRight, localUp).transpose();
    basisRoom.makeBasis(FRONT, roomRight, roomUp).multiply(basisLocal);
    return target.setFromRotationMatrix(basisRoom);
  }
  function aim() {
    if (!activeEntry || !located(activeEntry.event)) return;
    orientation(activeEntry.direction);
    aiming = true;
    velocity.yaw = velocity.pitch = 0;
  }
  function resetView() {
    aiming = false;
    velocity.yaw = velocity.pitch = 0;
    earth.quaternion.identity();
    notify();
  }

  // ── Time controls ───────────────────────────────────────────────────────
  const clamp = value => Math.min(viewHi, Math.max(viewLo, value));
  function setCursorTo(value, {quiet = false} = {}) {
    const next = clamp(value);
    if (Math.abs(next - cursor) < 1e-12) {syncWindow({quiet}); return;}
    cursor = next;
    chosen = null;
    syncWindow({quiet});
  }
  function stop() {if (playing) {playing = 0; drawRails();} }
  function play(direction) {
    playing = playing === direction ? 0 : direction;
    chosen = null;
    if (playing > 0 && cursor >= viewHi - 1e-9) cursor = viewLo;
    if (playing < 0 && cursor <= viewLo + 1e-9) cursor = viewHi;
    syncWindow();
  }
  /** One moment along the sequence, and never out of the chosen era. */
  function step(delta) {
    stop();
    const here = activeEntry ? activeEntry.index : axis.nearest(cursor);
    const entry = axis.entries[here + delta];
    if (!entry || entry.u < viewLo - 1e-9 || entry.u > viewHi + 1e-9) {notify(); return;}
    setCursorTo(entry.u);
  }
  function setEra(index) {
    era = Math.max(0, Math.min(axis.eras.length - 1, index));
    const range = axis.eras[era];
    viewLo = range.lo; viewHi = range.hi;
    stop();
    cursor = index === 0 ? 1 : clamp(cursor < viewLo || cursor > viewHi ? viewLo : cursor);
    liveKey = '';
    drawRails();
    syncWindow();
  }
  function focusEvent(id) {
    const entry = axis.byId.get(id);
    if (!entry) return false;
    if (entry.u < viewLo - 1e-9 || entry.u > viewHi + 1e-9) setEra(0);
    stop();
    setCursorTo(entry.u);
    if (located(entry.event)) {orientation(entry.direction); aiming = true;}
    return true;
  }
  function read() {
    stop();
    notify();
    if (activeEntry) callbacks.read?.(activeEntry.event);
  }
  /** The placed moment in the window nearest a world point on the globe, within a hand's width. */
  const pointOnEarth = new THREE.Vector3();
  function liveNear(point, reach = .6) {
    earth.updateWorldMatrix(true, false);
    const local = earth.worldToLocal(pointOnEarth.copy(point)).normalize();
    let best = null, bestAngle = reach / R;
    for (let index = liveFrom; index <= liveTo; index++) {
      const entry = axis.entries[index];
      if (!located(entry.event)) continue;
      const angle = entry.direction.angleTo(local);
      if (angle < bestAngle) {bestAngle = angle; best = entry;}
    }
    return best;
  }
  /** Make a moment in the window the active one and open it, without moving time. */
  function choose(entry) {
    if (!isLive(entry)) return;
    stop();
    chosen = entry;
    syncWindow({quiet: true});
    notify();
    callbacks.read?.(entry.event);
  }
  const notify = () => callbacks.change?.();

  // ── Dragging, shared by the pointer and the controllers ─────────────────
  const plane = new THREE.Plane(), scratchRay = new THREE.Ray();
  const pointA = new THREE.Vector3(), pointB = new THREE.Vector3();
  const quaternionA = new THREE.Quaternion();
  function railFor(object) {return rails.find(entry => entry.rail === object) || null;}
  function dragKind(object) {
    if (!object) return null;
    if (object.userData?.globe) return 'turn';
    if (object.userData?.rail) return 'scrub';
    return null;
  }
  function scrubToPoint(rail, point) {
    const entry = railFor(rail);
    if (!entry) return;
    stop();
    const local = entry.rail.worldToLocal(pointA.copy(point));
    setCursorTo(viewLo + (local.x / entry.width + .5) * (viewHi - viewLo));
  }
  function scrubToRay(entry, ray) {
    entry.rail.updateWorldMatrix(true, false);
    entry.rail.getWorldQuaternion(quaternionA);
    plane.setFromNormalAndCoplanarPoint(
      pointA.set(0, 0, 1).applyQuaternion(quaternionA),
      entry.rail.getWorldPosition(pointB));
    scratchRay.copy(ray);
    if (!scratchRay.intersectPlane(plane, pointA)) return;
    const local = entry.rail.worldToLocal(pointA);
    setCursorTo(viewLo + (local.x / entry.width + .5) * (viewHi - viewLo));
  }
  /** `grip` is a controller's world quaternion; omit it for a screen drag. */
  function beginDrag(object, {ray, grip} = {}) {
    const kind = dragKind(object);
    if (!kind) return null;
    stop();
    velocity.yaw = velocity.pitch = 0;
    aiming = false;
    if (kind === 'turn') {
      // Keep the inverse of the grip we started from, so each frame of the
      // turn is one multiply rather than an allocation and an inversion.
      drag = {kind, start: earth.quaternion.clone(), grip: grip ? grip.clone().invert() : null};
    } else {
      const entry = railFor(object) || rails[0];
      drag = {kind, entry};
      if (ray) scrubToRay(entry, ray); else notify();
    }
    return kind;
  }
  function moveDrag({ray, grip, dx = 0, dy = 0, rate = 0, axisRight} = {}) {
    if (!drag) return;
    if (drag.kind === 'scrub') {if (ray) scrubToRay(drag.entry, ray); return;}
    if (drag.grip && grip) {
      earth.quaternion.copy(quaternionA.copy(grip).multiply(drag.grip).multiply(drag.start)).normalize();
      return;
    }
    if (dx || dy) {
      spinTo(dx * rate * .45, dy * rate * .45);
      turn(dx, dy, axisRight || right);
    }
  }
  function endDrag() {
    if (drag?.kind === 'turn' && drag.grip) {velocity.yaw = velocity.pitch = 0;}
    drag = null;
    if (follow) aim();
    notify();
  }

  // ── Per-frame ───────────────────────────────────────────────────────────
  const toCamera = new THREE.Vector3(), worldDirection = new THREE.Vector3();
  const anchor = new THREE.Vector3(), seat = new THREE.Vector3(), sideways = new THREE.Vector3();
  const cameraUp = new THREE.Vector3(), cameraRight = new THREE.Vector3();
  const taken = [];
  function update(dt, inRoom, view) {
    if (!inRoom) {
      if (playing) {playing = 0; drawRails(); notify();}
      if (drag) drag = null;
      leaders.visible = false;
      for (const label of labels) label.mesh.visible = false;
      return;
    }
    leaders.visible = true;
    if (playing) {
      // One entry per second at ×1: the axis gives every moment equal room.
      const next = cursor + playing * speed() * 88 / axis.height * dt;
      if (playing > 0 && next >= viewHi) {cursor = viewHi; playing = 0; drawRails();}
      else if (playing < 0 && next <= viewLo) {cursor = viewLo; playing = 0; drawRails();}
      else cursor = Math.min(viewHi, Math.max(viewLo, next));
      syncWindow({quiet: true});
    }
    if (velocity.yaw || velocity.pitch) {
      turn(velocity.yaw * dt, velocity.pitch * dt);
      const decay = Math.pow(.01, dt);
      velocity.yaw *= decay; velocity.pitch *= decay;
      if (Math.abs(velocity.yaw) < 1e-4 && Math.abs(velocity.pitch) < 1e-4) velocity.yaw = velocity.pitch = 0;
    } else if (aiming && !drag) {
      earth.quaternion.slerp(target, Math.min(1, dt * 3.4));
      if (earth.quaternion.angleTo(target) < .004) {earth.quaternion.copy(target); aiming = false;}
    }

    readoutDue -= dt;
    if (readoutDue <= 0) {readoutDue = .12; drawReadout(); drawDate();}
    refreshButtons();

    // Place the active marker, then billboard whatever labels face the visitor.
    const hasPlace = !!activeEntry && located(activeEntry.event) && isLive(activeEntry);
    active.visible = halo.visible = hasPlace;
    if (hasPlace) {
      anchor.copy(activeEntry.direction).multiplyScalar(R + .17);
      active.position.copy(anchor);
      halo.position.copy(anchor);
      halo.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), activeEntry.direction);
    }
    if (!view) return;
    toCamera.copy(view.position).sub(CENTER).normalize();
    cameraUp.set(0, 1, 0).applyQuaternion(view.quaternion);
    cameraRight.set(1, 0, 0).applyQuaternion(view.quaternion);
    taken.length = 0;
    let vertex = 0;
    for (const label of labels) {
      const entry = label.entry;
      if (!entry) continue;
      worldDirection.copy(entry.direction).applyQuaternion(earth.quaternion);
      if (worldDirection.dot(toCamera) < .26) continue;
      anchor.copy(CENTER).addScaledVector(worldDirection, R + .1);
      // Labels sit on one plane just in front of the globe, offset across the
      // view by as much as their site is: out at the limb a label seated along
      // its own radius lies level with the globe and with the room's boards,
      // and both cut it in half. The leader line still runs back to the site.
      sideways.copy(worldDirection).addScaledVector(toCamera, -worldDirection.dot(toCamera));
      seat.copy(CENTER).addScaledVector(toCamera, R + .95).addScaledVector(sideways, R + .30);
      // Two sites a day's walk apart are one point on a globe this size. Lift
      // a label along the view's vertical, but only far enough to clear one
      // already placed: a fixed ladder of offsets throws them off the sphere.
      const across = seat.dot(cameraRight), base = seat.dot(cameraUp);
      let lift = 0;
      for (let attempt = 0; attempt < 9; attempt++) {
        lift = attempt === 0 ? 0 : (attempt % 2 ? 1 : -1) * Math.ceil(attempt / 2) * .5;
        if (!taken.some(slot => Math.abs(slot.across - across) < 1.7 && Math.abs(slot.height - base - lift) < .5)) break;
      }
      taken.push({across, height: base + lift});
      label.mesh.position.copy(seat).addScaledVector(cameraUp, lift);
      label.mesh.quaternion.copy(view.quaternion);
      label.mesh.visible = true;
      anchor.toArray(leaderPositions, vertex * 3); vertex++;
      label.mesh.position.toArray(leaderPositions, vertex * 3); vertex++;
    }
    for (let blank = vertex; blank < (LABEL_SLOTS + 1) * 2; blank++) {
      leaderPositions[blank * 3] = leaderPositions[blank * 3 + 1] = leaderPositions[blank * 3 + 2] = 0;
    }
    leaderGeometry.attributes.position.needsUpdate = true;
    globalPanel.quaternion.copy(view.quaternion);
  }

  function validPosition(x, z, fromZ = z) {
    if (Math.hypot(x, z - CENTER.z) < DAIS + .35) return false;
    // Block teleports that would jump straight through the globe as well.
    if (Math.abs(x) < DAIS + .35 && Math.min(z, fromZ) < CENTER.z && Math.max(z, fromZ) > CENTER.z) return false;
    for (const console of [{z: -172.30, halfX: 3.25, halfZ: 1.0}, {z: -191.70, halfX: 2.95, halfZ: .85}]) {
      if (Math.abs(x) < console.halfX && Math.abs(z - console.z) < console.halfZ) return false;
    }
    return true;
  }

  function getState() {
    group.updateMatrixWorld(true);
    const event = activeEntry?.event;
    return {
      radius: R, center: CENTER.toArray(),
      cursor, era, eraName: axis.eras[era].name, playing, speed: speed(), follow,
      years: axis.yearsAt(cursor), label: axis.label(cursor), band: axis.bandAt(cursor).id,
      total: axis.entries.length, mappedCount: mapped.length, worldwideCount: worldwide.length,
      eventIds: axis.entries.map(entry => entry.event.id),
      liveFrom, liveTo, liveCount: liveTo - liveFrom + 1,
      revealed: mapped.reduce((count, entry) => entry.u <= cursor + 1e-9 ? count + 1 : count, 0),
      visiblePins, chosenId: chosen?.event.id || null,
      livePins: mapped.filter(isLive).map(entry => ({
        id: entry.event.id,
        target: earth.localToWorld(new THREE.Vector3().copy(entry.direction).multiplyScalar(R + .09)).toArray()
      })),
      eventId: event?.id, title: event?.title, date: event?.date,
      location: event && located(event) ? placeOf(event) : 'Worldwide',
      mapped: !!event && located(event),
      labels: labels.filter(label => label.mesh.visible).map(label => label.entry.event.id),
      quaternion: earth.quaternion.toArray(),
      dragging: drag?.kind || null,
      bands: axis.bands.map(band => ({id: band.id, count: band.count, height: band.height})),
      eras: axis.eras.map(item => ({name: item.name, count: item.count})),
      controls: buttons.map(entry => ({
        label: (typeof entry.label === 'function' ? entry.label() : entry.label).replace(/\n/g, ' '),
        target: entry.mesh.getWorldPosition(new THREE.Vector3()).toArray()
      })),
      rails: rails.map(entry => ({target: entry.rail.getWorldPosition(new THREE.Vector3()).toArray(), width: entry.width})),
      activeTarget: hasActiveTarget()
    };
  }
  function hasActiveTarget() {
    if (!activeEntry || !located(activeEntry.event) || !isLive(activeEntry)) return null;
    return active.getWorldPosition(new THREE.Vector3()).toArray();
  }

  // ── For the native build ────────────────────────────────────────────────
  /**
   * Everything the native build needs to run this room itself: the time axis
   * and its 320 moments, the changing surfaces and where they hang, each
   * moment's illustration as the left-hand board shows it, and every face each
   * console button can show — painted by drawDeck, so a lit button natively is
   * the web's own. The instrument's state is put back as it was.
   */
  async function native() {
    group.updateMatrixWorld(true);
    const pose = node => {
      const at = new THREE.Vector3(), turn = new THREE.Quaternion(), size = new THREE.Vector3();
      node.matrixWorld.decompose(at, turn, size);
      return {position: at.toArray(), rotation: turn.toArray()};
    };
    const surfaces = [];
    group.traverse(node => {
      const spec = node.userData.nativeSurface;
      if (spec) surfaces.push({...spec, density: node.userData.canvas?.density || 1, ...pose(node)});
    });

    // Each moment's illustration, as drawDetail draws it: 470 by 207, twice over.
    const load = src => new Promise(done => {
      const image = new Image();
      const timer = setTimeout(() => done(null), 15000);
      image.onload = () => {clearTimeout(timer); done(image);};
      image.onerror = () => {clearTimeout(timer); done(null);};
      image.src = new URL(src, location.href).href;
    });
    const art = {};
    for (const entry of axis.entries) {
      if (!entry.event.art) continue;
      const image = await load(entry.event.art);
      if (!image) continue;
      const canvas = document.createElement('canvas');
      canvas.width = 940; canvas.height = 414;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      art[entry.event.id] = canvas.toDataURL('image/png');
    }

    // Every face a button can show. A button's look depends on one piece of
    // state, so each setting is tried over the resting one and each look kept once.
    const kept = {era, playing, speedIndex, follow};
    const faces = [], seen = new Set();
    const settings = [{}, ...axis.eras.map((_, index) => ({era: index})), {playing: -1}, {playing: 1},
      ...SPEEDS.map((_, index) => ({speedIndex: index})), {follow: false}];
    for (const setting of settings) {
      ({era, playing, speedIndex, follow} = {era: 0, playing: 0, speedIndex: RESTING_SPEED, follow: true, ...setting});
      decks.forEach((deck, index) => {
        drawDeck(deck);
        const k = deck.canvas.width / deck.width, margin = .012;
        for (const entry of deck.buttons) {
          const tone = entry.tone(), caption = resolve(entry.caption), key = `${index}|${entry.id}|${tone}|${caption}`;
          if (seen.has(key)) continue;
          seen.add(key);
          const {x, y, w, h} = entry.rect, cw = w + 2 * margin, chh = h + 2 * margin;
          const crop = document.createElement('canvas');
          crop.width = Math.round(cw * k); crop.height = Math.round(chh * k);
          crop.getContext('2d').drawImage(deck.canvas, Math.round((x - cw / 2 + deck.width / 2) * k),
            Math.round((deck.height / 2 - y - chh / 2) * k), crop.width, crop.height, 0, 0, crop.width, crop.height);
          const at = deck.group.localToWorld(new THREE.Vector3(x, y, .002));
          const turn = deck.group.getWorldQuaternion(new THREE.Quaternion());
          faces.push({deck: index, id: entry.id, tone, caption, width: cw, height: chh,
            position: at.toArray(), rotation: turn.toArray(), png: crop.toDataURL('image/png')});
        }
      });
    }
    ({era, playing, speedIndex, follow} = kept);
    decks.forEach(drawDeck);

    // The date as the rail shows it, at points along the axis, so the native
    // build can check its own reading of a date against this one.
    const dates = Array.from({length: 97}, (_, i) => {const u = i / 96; return {u, label: axis.label(u)};});
    return {
      radius: R, center: CENTER.toArray(), front: FRONT.toArray(), dais: DAIS,
      labelSlots: LABEL_SLOTS, speeds: SPEEDS, railAspect: RAIL, window: axis.windowHalf(0, 1) * axis.height,
      label: {width: 1.95, height: .46, pixels: [880, 208], density: labels[0].mesh.userData.canvas.density || 1},
      worldwide: {width: 5.4, height: .62, pixels: [1350, 155], density: globalPanel.userData.canvas.density || 1,
        position: globalPanel.getWorldPosition(new THREE.Vector3()).toArray()},
      axis: {
        height: axis.height,
        bands: axis.bands.map(band => ({id: band.id, label: band.label, color: band.color,
          from: band.from, to: band.to, top: band.top, height: band.height, count: band.count})),
        eras: axis.eras.map(item => ({name: item.name, span: item.span, lo: item.lo, hi: item.hi, count: item.count})),
        entries: axis.entries.map(entry => {
          const event = entry.event;
          return {id: event.id, index: entry.index, u: entry.u, band: entry.band, years: event.y,
            title: event.title, date: event.date || '', place: placeOf(event), located: located(event),
            lat: located(event) ? event.lat : 0, lon: located(event) ? event.lon : 0,
            detail: event.detail || '', facts: (event.facts || []).slice(0, 3).map(([label, value]) => ({label: String(label), value: String(value)})),
            art: !!art[event.id]};
        })
      },
      surfaces, faces, art, dates
    };
  }

  // The constructor cannot notify the museum before it has been handed back.
  const announce = callbacks.change;
  callbacks.change = null;
  setEra(0);
  resetView();
  aim();
  earth.quaternion.copy(target);
  aiming = false;
  drawRails(); drawReadout(); drawDate(); drawList(); drawDetail();
  callbacks.change = announce;

  return {
    group, pickables, axis, update, validPosition, getState, native,
    setCursorTo, step, play, stop, setEra, focusEvent, read, resetView, nudge,
    beginDrag, moveDrag, endDrag, dragKind,
    get info() {
      return {
        cursor, viewLo, viewHi, era, playing, speed: speed(), follow,
        placed: mapped.length,
        label: axis.label(cursor), band: axis.bandAt(cursor),
        live: (liveTo < liveFrom ? [] : axis.entries.slice(liveFrom, liveTo + 1)).map(entry => entry.event),
        active: activeEntry?.event || null,
        total: axis.entries.length
      };
    },
    setFollow(value) {follow = value; if (follow) aim(); notify();},
    setSpeed(value) {const index = SPEEDS.indexOf(value); if (index >= 0) speedIndex = index; notify();}
  };
}
