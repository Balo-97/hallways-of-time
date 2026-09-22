/**
 * The Hallways of Time: a continuous, vaulted museum made from reusable geometry.
 * All distances are metres. Static architecture is instanced for mobile XR.
 */
export function createGrandArchitecture(THREE) {
  const group = new THREE.Group();
  group.name = 'Grand Hallways of Time';
  const doorways = [0, 1, 2].map(index => ({index, z: index === 2 ? -200 : -76-index*88, width: 5.6, height: 7.5}));
  const collisionObstacles = [];
  const materials = {};
  const geometries = new Map();
  const buckets = new Map();
  const transform = new THREE.Object3D();
  const center = (wing, bay) => -7-wing*88-bay*12;

  /**
   * The side windows. The head, with its mouldings and keystone, has to finish
   * clear of the entablature at the springing of the vault, whose soffit is at
   * 6.75 m; a taller window ran its arch crown up inside that lip.
   */
  const WINDOW = {width: 4.55, height: 4.66, sill: 1.59, corniceSoffit: 6.75};
  WINDOW.spring = WINDOW.height-WINDOW.width/2;
  WINDOW.springLine = WINDOW.sill+WINDOW.spring;
  WINDOW.head = WINDOW.sill+WINDOW.height;
  /**
   * A light stain for each window, a different colour in every bay, so the
   * halls change colour as you walk. Both sides of a bay take the same one, so
   * the hall stays composed; the roundel in the arch head is a deeper
   * companion of the same hue, and the light it lays on the floor is paler.
   */
  const STAINS = [
    {name: 'honey', glass: '#f2cd7f', rose: '#dda049', pool: '#ffeec2'},
    {name: 'rose', glass: '#f1bdc5', rose: '#d3859f', pool: '#ffdfe3'},
    {name: 'celadon', glass: '#bde0bb', rose: '#83bb8d', pool: '#ddf2da'},
    {name: 'sky', glass: '#bad2f0', rose: '#7fa9dc', pool: '#dee9ff'},
    {name: 'lilac', glass: '#d3c4ea', rose: '#a086cb', pool: '#eae1fa'},
    {name: 'seafoam', glass: '#b4ded8', rose: '#79c2ba', pool: '#d6f1ec'},
  ];
  const stainFor = (wing, bay) => STAINS[(bay+wing*2)%STAINS.length];
  const glazing = [];

  // Materials carry the name they are known by, so a mesh built from them can
  // be identified — in a frame debugger, and in the native export.
  function standard(name, color, extra = {}) {
    return materials[name] = new THREE.MeshStandardMaterial({name, color, roughness: .58, ...extra});
  }
  function basic(name, color, extra = {}) {
    return materials[name] = new THREE.MeshBasicMaterial({name, color, ...extra});
  }
  function geometry(key, create) {
    if (!geometries.has(key)) geometries.set(key, create());
    return geometries.get(key);
  }
  /** A white vertex colour, so one material can carry a different stain per instance. */
  function tintable(geo) {
    if (!geo.getAttribute('color')) {
      const white = new Float32Array(geo.getAttribute('position').count*3).fill(1);
      geo.setAttribute('color', new THREE.BufferAttribute(white, 3));
    }
    return geo;
  }
  function place(geo, mat, position, scale = [1, 1, 1], rotation = [0, 0, 0], tint = null) {
    if (mat.vertexColors) tintable(geo);
    const key = `${geo.uuid}:${mat.uuid}`;
    if (!buckets.has(key)) buckets.set(key, {geo, mat, matrices: [], tints: []});
    transform.position.set(...position);
    transform.scale.set(...scale);
    transform.rotation.set(...rotation);
    transform.updateMatrix();
    const bucket = buckets.get(key);
    bucket.matrices.push(transform.matrix.clone());
    bucket.tints.push(tint);
  }
  const cube = geometry('cube', () => new THREE.BoxGeometry(1, 1, 1));
  const cylinder = geometry('cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 24));
  const thinCylinder = geometry('thin-cylinder', () => new THREE.CylinderGeometry(1, 1, 1, 10));
  const shaft = geometry('shaft', () => new THREE.CylinderGeometry(.82, 1, 1, 32));
  const sphere = geometry('sphere', () => new THREE.SphereGeometry(1, 14, 9));
  const plane = geometry('plane', () => new THREE.PlaneGeometry(1, 1));
  function box(size, pos, mat, rotation) { place(cube, mat, pos, size, rotation); }
  function col(radius, height, pos, mat) { place(radius < .11 ? thinCylinder : cylinder, mat, pos, [radius, height, radius]); }
  function ring(radius, tube, pos, mat, rotation = [0, 0, 0], scale = [1, 1, 1], arc = Math.PI*2) {
    const geo = geometry(`ring:${radius}:${tube}:${arc}`, () => new THREE.TorusGeometry(radius, tube, 6, 56, arc));
    place(geo, mat, pos, scale, rotation);
  }

  function marbleTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#f5f0e5'; ctx.fillRect(0, 0, 512, 512);
    let seed = 5813;
    const random = () => ((seed = (seed*1664525+1013904223) >>> 0)/4242967296);
    for (let i = 0; i < 55; i++) {
      const start = random()*700-100;
      ctx.beginPath(); ctx.moveTo(start, -10);
      ctx.bezierCurveTo(start+80, 110, start-105, 320, start+120, 522);
      ctx.strokeStyle = i%4 === 0 ? '#aea69819' : '#c3bcaf10';
      ctx.lineWidth = i%4 === 0 ? .7 : 2.5+random()*5;
      ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  function floorTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#e6ddc8'; ctx.fillRect(0, 0, 1024, 1024);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) {
      const px = x*256, py = y*256;
      ctx.fillStyle = (x+y)%2 ? '#ece5d5' : '#f5efdf';
      ctx.fillRect(px+1, py+1, 254, 254);
      ctx.strokeStyle = '#b9ac8d'; ctx.lineWidth = 1.5;
      ctx.strokeRect(px+10, py+10, 236, 236);
      for (let i = 0; i < 5; i++) {
        ctx.beginPath(); ctx.moveTo(px+10, py+30+i*43);
        ctx.bezierCurveTo(px+75, py+i*43+15, px+150, py+i*43+65, px+246, py+i*43+35);
        ctx.strokeStyle = '#8478610a'; ctx.lineWidth = .7+i*.12; ctx.stroke();
      }
      ctx.fillStyle = '#40545a';
      for (const [dx, dy] of [[0, 0], [256, 0], [0, 256], [256, 256]]) {
        ctx.beginPath(); ctx.moveTo(px+dx, py+dy-12); ctx.lineTo(px+dx+12, py+dy);
        ctx.lineTo(px+dx, py+dy+12); ctx.lineTo(px+dx-12, py+dy); ctx.closePath(); ctx.fill();
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(18/8, 242/8);
    return texture;
  }

  /**
   * Leaded glazing, drawn in neutral tones so each window's stain can be
   * multiplied over it: quarry panes of slightly uneven glass, a margin band
   * of small squares following the arch, radiating lights in the head, and a
   * soft backlit glow. Kept opaque, so no window ever needs sorting.
   *
   * `springFraction` is where the arch springs, as a fraction of the height;
   * v = 0 is the sill, so the head is drawn at the top of the canvas.
   */
  function windowTexture(springFraction) {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 1536;
    const ctx = canvas.getContext('2d');
    ctx.scale(3, 3);
    const W = 256, H = 512, spring = H*(1-springFraction), radius = W/2;
    const wash = ctx.createLinearGradient(0, 0, 0, H);
    wash.addColorStop(0, '#fffcf2'); wash.addColorStop(.42, '#f7faf5'); wash.addColorStop(1, '#eaf0e7');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, W, H);
    // The outline of the glass, for the margin band and for clipping the quarries.
    const glassPath = () => {
      const path = new Path2D();
      path.moveTo(0, H); path.lineTo(0, spring);
      path.arc(radius, spring, radius, Math.PI, 0);
      path.lineTo(W, H); path.closePath(); return path;
    };
    let seed = 20461;
    const random = () => ((seed = (seed*1664525+1013904223) >>> 0)/4294967296);
    const pane = shade => shade > .82 ? '#ffffff6b' : shade > .5 ? '#ffffff2e' : shade > .22 ? '#0e17120d' : '#1a231c17';
    // Quarry panes below the springing: a true diamond lattice, each light a
    // little different, as hand-blown glass is.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, spring, W, H-spring); ctx.clip();
    ctx.clip(glassPath());
    const qw = 26, qh = 36;
    for (let row = 0; row*qh/2 < H+qh; row++) for (let col = -1; col*qw < W+qw; col++) {
      const cx = col*qw+(row%2 ? qw/2 : 0), cy = spring+row*qh/2;
      ctx.beginPath(); ctx.moveTo(cx, cy-qh/2); ctx.lineTo(cx+qw/2, cy); ctx.lineTo(cx, cy+qh/2); ctx.lineTo(cx-qw/2, cy);
      ctx.closePath();
      ctx.fillStyle = pane(random()); ctx.fill();
      ctx.strokeStyle = '#7f8c874f'; ctx.lineWidth = 1.15; ctx.stroke();
    }
    ctx.restore();
    // A fanlight fills the arch: wedge lights struck from the centre of the arch.
    ctx.save();
    ctx.beginPath(); ctx.rect(0, 0, W, spring); ctx.clip();
    ctx.clip(glassPath());
    const rings = [radius*.30, radius*.66, radius];
    for (let i = 0; i < 12; i++) {
      const from = Math.PI*i/12, to = Math.PI*(i+1)/12;
      for (let r = 0; r < rings.length; r++) {
        const inner = r ? rings[r-1] : 0;
        ctx.beginPath();
        ctx.arc(radius, spring, rings[r], Math.PI+from, Math.PI+to);
        ctx.arc(radius, spring, inner, Math.PI+to, Math.PI+from, true);
        ctx.closePath();
        ctx.fillStyle = pane(random()); ctx.fill();
        ctx.strokeStyle = '#7f8c874f'; ctx.lineWidth = 1.3; ctx.stroke();
      }
    }
    ctx.restore();
    // A margin band of small squares just inside the frame, as in leaded glazing.
    ctx.save(); ctx.clip(glassPath());
    ctx.strokeStyle = '#dfe6dd'; ctx.lineWidth = 15;
    ctx.stroke(glassPath());
    ctx.strokeStyle = '#8f9a9459'; ctx.lineWidth = 1.4;
    ctx.stroke(glassPath());
    const band = new Path2D();
    band.moveTo(15, H); band.lineTo(15, spring);
    band.arc(radius, spring, radius-15, Math.PI, 0);
    band.lineTo(W-15, H);
    ctx.stroke(band);
    // Squares up the jambs and round the arch, alternating light and shade.
    let square = 0;
    const mark = (x, y) => {
      ctx.fillStyle = square++%2 ? '#ffffff96' : '#c9d3c959';
      ctx.fillRect(x-4.5, y-4.5, 9, 9);
      ctx.strokeStyle = '#8f9a9463'; ctx.lineWidth = 1; ctx.strokeRect(x-4.5, y-4.5, 9, 9);
    };
    for (let y = H-17; y > spring; y -= 26) {mark(7.5, y); mark(W-7.5, y);}
    for (let i = 1; i < 11; i++) {
      const a = Math.PI*i/11;
      mark(radius-Math.cos(a)*(radius-7.5), spring-Math.sin(a)*(radius-7.5));
    }
    ctx.restore();
    const glow = ctx.createRadialGradient(radius, spring+40, 10, radius, spring+40, 250);
    glow.addColorStop(0, '#ffffff8c'); glow.addColorStop(1, '#ffffff00');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  /**
   * The roundel set in each arch head: a small rose of eight lights, drawn in
   * neutral tones and stained a deeper shade of its window's colour.
   */
  function rosetteTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.fillStyle = '#fbfaf2'; ctx.fillRect(0, 0, 256, 256);
    ctx.translate(128, 128);
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i*Math.PI/4);
      ctx.beginPath(); ctx.ellipse(0, 64, 25, 50, 0, 0, Math.PI*2);
      ctx.fillStyle = i%2 ? '#ffffff' : '#dde6dd'; ctx.fill();
      ctx.strokeStyle = '#7f8c87'; ctx.lineWidth = 2.4; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, Math.PI*2);
    ctx.fillStyle = '#c8d3c8'; ctx.fill();
    ctx.strokeStyle = '#7f8c87'; ctx.lineWidth = 3; ctx.stroke();
    for (let i = 0; i < 8; i++) {
      ctx.save(); ctx.rotate(i*Math.PI/4+Math.PI/8);
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, 34);
      ctx.strokeStyle = '#8f9a94'; ctx.lineWidth = 2; ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI*2);
    ctx.fillStyle = '#ffffff'; ctx.fill();
    ctx.strokeStyle = '#7f8c87'; ctx.lineWidth = 2; ctx.stroke();
    for (const [r, width] of [[120, 7], [112, 1.8]]) {
      ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI*2);
      ctx.strokeStyle = width > 4 ? '#6f7b76' : '#8f9a94'; ctx.lineWidth = width; ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  function lightPoolTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 1, 64, 64, 64);
    gradient.addColorStop(0, '#fff6ce45'); gradient.addColorStop(.48, '#fff5d21c'); gradient.addColorStop(1, '#fff5d200');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }

  function mosaicTexture(wing) {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 2048;
    const ctx = canvas.getContext('2d'), palettes = [
      ['#243c5e', '#496a88', '#ddc58a'], ['#284e46', '#618374', '#e0c995'], ['#693b43', '#a16c64', '#e6c68f'],
    ];
    const [ink, mid, gilt] = palettes[wing];
    ctx.scale(2, 2);
    ctx.fillStyle = ink; ctx.fillRect(0, 0, 512, 1024);
    // Individual irregular tesserae make this read as inlaid mosaic at headset distance.
    let seed = 708+wing*179;
    const random = () => ((seed = (seed*1664525+1013904223) >>> 0)/4242967296);
    for (let y = 0; y < 1024; y += 10) for (let x = 0; x < 512; x += 10) {
      ctx.fillStyle = random() > .65 ? `${mid}67` : '#fff2d00b';
      ctx.fillRect(x+1+random(), y+1+random(), 7+random(), 7+random());
    }
    for (const [inset, stroke, width] of [[8, '#f0e4c7', 10], [22, gilt, 4], [35, gilt, 1.5], [51, gilt, 2]]) {
      ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.strokeRect(inset, inset, 512-inset*2, 1024-inset*2);
    }
    // A repeated leaf border surrounds a celestial / botanical / human sunburst cartouche.
    ctx.strokeStyle = gilt; ctx.fillStyle = gilt;
    for (let y = 76; y < 970; y += 37) for (const side of [-1, 1]) {
      const x = side < 0 ? 43 : 469;
      ctx.beginPath(); ctx.ellipse(x, y, 4, 10, side*.55, 0, Math.PI*2); ctx.fill();
    }
    for (const y of [180, 844]) {
      ctx.save(); ctx.translate(256, y);
      for (let i = 0; i < 12; i++) {
        ctx.rotate(Math.PI/6); ctx.beginPath(); ctx.ellipse(0, 25, 8, 24, 0, 0, Math.PI*2);
        ctx.fillStyle = i%2 ? gilt : '#f3e8ce'; ctx.fill();
      }
      ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI*2); ctx.fill(); ctx.restore();
    }
    ctx.save(); ctx.translate(256, 512);
    for (const radius of [160, 151, 116, 107]) {
      ctx.beginPath(); ctx.ellipse(0, 0, radius, radius*1.62, 0, 0, Math.PI*2);
      ctx.strokeStyle = gilt; ctx.lineWidth = radius === 160 ? 5 : 1.5; ctx.stroke();
    }
    for (let i = 0; i < 32; i++) {
      const a = i*Math.PI/16;
      ctx.beginPath(); ctx.moveTo(Math.sin(a)*64, Math.cos(a)*64);
      ctx.lineTo(Math.sin(a+.035)*101, Math.cos(a+.035)*151);
      ctx.lineTo(Math.sin(a-.035)*101, Math.cos(a-.035)*151); ctx.closePath();
      ctx.fillStyle = i%2 ? gilt : '#f3ead4'; ctx.fill();
    }
    ctx.fillStyle = gilt; ctx.beginPath(); ctx.arc(0, 0, 59, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = ink; ctx.beginPath(); ctx.arc(0, 0, 52, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = '#ecdbaf'; ctx.lineWidth = 1.5;
    for (let petal = 0; petal < 8; petal++) {
      ctx.save(); ctx.rotate(petal*Math.PI/4); ctx.beginPath(); ctx.ellipse(0, 20, 13, 25, 0, 0, Math.PI*2); ctx.stroke(); ctx.restore();
    }
    ctx.fillStyle = '#f2e8cb'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI*2); ctx.fill(); ctx.restore();
    // Symmetrical acanthus vines fill the shoulders of the elongated cartouche.
    for (const side of [-1, 1]) for (const end of [-1, 1]) {
      ctx.save(); ctx.translate(256, 512); ctx.scale(side, end);
      ctx.strokeStyle = gilt; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(45, 240); ctx.bezierCurveTo(130, 280, 180, 325, 140, 397); ctx.stroke();
      for (let i = 0; i < 7; i++) {
        const y = 255+i*18, x = 88+i*10-Math.max(0, i-4)*10;
        ctx.beginPath(); ctx.ellipse(x, y, 6, 21, -.8+i*.1, 0, Math.PI*2);
        ctx.fillStyle = i%2 ? '#ead8ae' : gilt; ctx.fill();
      }
      ctx.restore();
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  const marbleMap = marbleTexture();
  const ivory = standard('ivory', '#fff7e8', {map: marbleMap, roughness: .43});
  const plaster = standard('plaster', '#f5e9d4', {roughness: .78, side: THREE.DoubleSide, emissive: '#d3c5ac', emissiveIntensity: .10});
  const relief = standard('relief', '#e0cfad', {roughness: .72, side: THREE.DoubleSide, emissive: '#c9ba9c', emissiveIntensity: .07});
  const gold = standard('gold', '#c4a564', {metalness: .52, roughness: .33});
  const darkGold = standard('darkGold', '#8e7441', {metalness: .48, roughness: .42});
  const shadow = standard('shadow', '#9a8c72', {roughness: .8});
  const floorMat = standard('floor', '#ffffff', {map: floorTexture(), roughness: .30, metalness: .06});
  const shades = ['#253f60', '#285849', '#653942'].map((color, i) => standard(`stone${i}`, color, {map: marbleMap, roughness: .34, metalness: .08}));
  // One stained-glass material for every window: the colour rides on each
  // instance, so twenty-eight differently stained windows cost one draw call.
  const glass = basic('glass', '#ffffff', {map: windowTexture(WINDOW.spring/WINDOW.height), side: THREE.DoubleSide, vertexColors: true});
  const glassRose = basic('glassRose', '#ffffff', {map: rosetteTexture(), side: THREE.DoubleSide, vertexColors: true});
  const lamp = basic('lamp', '#fff3cd');
  const crystal = standard('crystal', '#ebf4f1', {metalness: .15, roughness: .12, emissive: '#dbece6', emissiveIntensity: .24, flatShading: true});
  const pool = basic('pool', '#ffffff', {map: lightPoolTexture(), transparent: true, depthWrite: false, opacity: .65, vertexColors: true});
  const mosaics = [0, 1, 2].map(index => standard(`mosaic${index}`, '#fff5df', {map: mosaicTexture(index), roughness: .5, side: THREE.DoubleSide, emissive: '#ddcba6', emissiveIntensity: .10}));

  const sky = new THREE.HemisphereLight('#fff4de', '#8a9389', 2.1); group.add(sky);
  const daylight = new THREE.DirectionalLight('#fff4dc', 2.35); daylight.position.set(-10, 15, 7); group.add(daylight);
  const fill = new THREE.DirectionalLight('#d8e9ff', .6); fill.position.set(8, 9, -12); group.add(fill);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 242), floorMat);
  floor.name = 'Continuous marble walking floor'; floor.rotation.x = -Math.PI/2;
  floor.position.set(0, 0, -97); floor.userData.floor = true; group.add(floor);
  for (const side of [-1, 1]) {
    box([.30, 7.15, 242], [side*9.12, 3.55, -97], plaster);
    box([.23, .24, 242], [side*8.84, .12, -97], ivory);
    box([.18, .12, 242], [side*8.81, 1.22, -97], ivory);
    box([.14, .035, 242], [side*8.75, 1.32, -97], gold);
    box([.56, .28, 242], [side*8.78, 6.89, -97], ivory);
    box([.64, .12, 242], [side*8.72, 7.09, -97], relief);
    box([.08, .07, 242], [side*8.40, 7.04, -97], gold);
    box([.065, .012, 239], [side*4.65, .014, -97], gold);
    box([.025, .012, 239], [side*4.87, .014, -97], darkGold);
    box([.6, .013, 239], [side*7.91, .013, -97], shadow);
    box([.038, .013, 239], [side*7.57, .017, -97], gold);
  }

  // An elliptical barrel vault. Normal direction is immaterial because the plaster is double sided.
  function vaultGeometry(from = 0, to = Math.PI, radialInset = 0, length = 1, textureLength = length/8) {
    const vertices = [], uvs = [], indices = [], steps = Math.max(6, Math.ceil((to-from)*24));
    for (let i = 0; i <= steps; i++) {
      const a = from+(to-from)*i/steps;
      const x = (9-radialInset)*Math.cos(a), y = 7+(5.7-radialInset)*Math.sin(a);
      vertices.push(x, y, -.5*length, x, y, .5*length);
      uvs.push(i/steps, 0, i/steps, textureLength);
      if (i < steps) {const n = i*2; indices.push(n, n+2, n+1, n+1, n+2, n+3);}
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals();
    return geo;
  }
  const vault = vaultGeometry(0, Math.PI, 0, 219);
  place(vault, plaster, [0, 0, -108.5]);
  // Five rows of sunken coffers and gold edging make the height legible from the floor.
  const angles = [.30, .88, Math.PI/2, Math.PI-.88, Math.PI-.30];
  const ceilingRose = geometry('ceiling-rose', () => new THREE.TorusGeometry(.22, .024, 4, 28).rotateX(Math.PI/2));
  const ceilingDome = geometry('ceiling-dome', () => new THREE.SphereGeometry(.16, 16, 4, 0, Math.PI*2, 0, Math.PI/2).scale(1, .4, 1).rotateX(Math.PI));
  const ceilingLamp = geometry('ceiling-lamp', () => new THREE.SphereGeometry(.07, 12, 4, 0, Math.PI*2, 0, Math.PI/2).scale(1, .9, 1).rotateX(Math.PI));
  const ceilingLights = [], panelCentres = [], mosaicTextureOffsets = [];
  for (const a of angles) {
    // One whole mosaic per panel: its medallion falls on the bay centre, under the light.
    const panelGeo = vaultGeometry(a-.18, a+.18, .055, 8.5, 1);
    const rimGeo = vaultGeometry(a-.19, a+.19, .085, .095);
    // How far the texture's centre lies from the panel's centre along the hall, in metres.
    {
      const position = panelGeo.attributes.position, uv = panelGeo.attributes.uv;
      let near = 0, far = 0;
      for (let i = 0; i < position.count; i++) if (position.getZ(i) < 0) near = uv.getY(i); else far = uv.getY(i);
      mosaicTextureOffsets.push(((near+far)/2-.5)/Math.abs(far-near)*8.5);
    }
    for (let wing = 0; wing < 3; wing++) for (let bay = 0; bay < (wing === 2 ? 2 : 6); bay++) {
      const z = center(wing, bay);
      place(panelGeo, mosaics[wing], [0, 0, z]);
      panelCentres.push({x: 8.945*Math.cos(a), y: 7+5.645*Math.sin(a), z});
      for (const dz of [-4.36, 4.36]) place(rimGeo, gold, [0, 0, z+dz]);
      for (const angle of [a-.19, a+.19]) {
        const x = 8.9*Math.cos(angle), y = 7+5.6*Math.sin(angle);
        box([.055, .055, 8.7], [x, y, z], gold);
      }
      // A ceiling light at the medallion's centre, seated square to the curved vault.
      // Where a chandelier hangs, its own ceiling rose takes the place.
      if (wing < 2 && a === Math.PI/2 && bay%2 === 0) continue;
      const outward = new THREE.Vector2(Math.cos(a)/9, Math.sin(a)/5.7).normalize();
      const tilt = Math.atan2(-outward.x, outward.y);
      const surface = [8.945*Math.cos(a), 7+5.645*Math.sin(a)];
      const at = depth => [surface[0]-outward.x*depth, surface[1]-outward.y*depth, z];
      place(ceilingRose, gold, at(.012), [1, 1, 1], [0, 0, tilt]);
      place(ceilingDome, ivory, at(.004), [1, 1, 1], [0, 0, tilt]);
      place(ceilingLamp, lamp, at(.05), [1, 1, 1], [0, 0, tilt]);
      ceilingLights.push({x: surface[0], y: surface[1], z, angle: a});
    }
  }

  // Reusable arched glass and recessed stone border for the luminous side galleries.
  function archShape(width, height) {
    const r = width/2, spring = height-r;
    const shape = new THREE.Shape(); shape.moveTo(-r, 0); shape.lineTo(r, 0); shape.lineTo(r, spring);
    shape.absarc(0, spring, r, 0, Math.PI, false); shape.lineTo(-r, 0); shape.closePath(); return shape;
  }
  const windowGeo = geometry('arched-window', () => new THREE.ShapeGeometry(archShape(WINDOW.width, WINDOW.height), 24));
  // ShapeGeometry's physical UV coordinates are normalized to the complete window texture.
  const windowUV = windowGeo.getAttribute('uv');
  for (let i = 0; i < windowUV.count; i++) windowUV.setXY(i, (windowUV.getX(i)+WINDOW.width/2)/WINDOW.width, windowUV.getY(i)/WINDOW.height);
  // The recessed stone border keeps the same reveal above the glass as beside it.
  const windowBackingGeo = geometry('window-backing', () => new THREE.ShapeGeometry(archShape(WINDOW.width+.49, WINDOW.height+.33), 24));
  const roseGeo = geometry('window-rose', () => new THREE.CircleGeometry(.74, 40));
  // The head is set out from the springing line, so the whole assembly — arch
  // mouldings, keystone, mullions and transoms — follows the window's height.
  const HEAD = {
    arch: WINDOW.springLine, keystone: WINDOW.springLine+2.428, rose: WINDOW.springLine+.95,
    jamb: [1.465, WINDOW.springLine+.02], mullion: [1.57, WINDOW.head-.22],
    transoms: [WINDOW.sill+WINDOW.height*.386, WINDOW.springLine+.015],
  };

  function column(x, z, accent) {
    collisionObstacles.push({x, z, halfX: .61, halfZ: .64});
    box([1.15, .17, 1.15], [x, .085, z], ivory);
    box([.98, .13, .98], [x, .235, z], relief);
    box([.86, .12, .86], [x, .36, z], ivory);
    col(.46, .12, [x, .48, z], gold);
    col(.46, .12, [x, .6, z], ivory);
    place(shaft, ivory, [x, 3.58, z], [.39, 5.84, .39]);
    col(.344, .065, [x, 6.45, z], gold);
    col(.41, .15, [x, 6.57, z], ivory);
    col(.49, .17, [x, 6.72, z], relief);
    box([1.04, .17, 1.04], [x, 6.91, z], ivory);
    box([1.17, .11, 1.17], [x, 7.045, z], ivory);
    // Fluting catches the directional light without a high-resolution column mesh.
    for (let j = 0; j < 10; j++) {
      const a = j*Math.PI/5, cx = x+Math.cos(a)*.36, cz = z+Math.sin(a)*.36;
      place(thinCylinder, relief, [cx, 3.6, cz], [.016, 5.44, .016]);
    }
    for (let j = 0; j < 4; j++) {
      const a = Math.PI/4+j*Math.PI/2;
      place(sphere, ivory, [x+Math.cos(a)*.34, 6.65, z+Math.sin(a)*.34], [.16, .23, .16]);
    }
    // A colored marble dado between the shaft and the wall anchors the colonnade.
    box([.22, 1.13, 1.4], [Math.sign(x)*8.88, .59, z], accent);
  }

  const chandeliers = [];
  function chandelier(z) {
    const jewel = geometry('cut-crystal', () => new THREE.IcosahedronGeometry(1, 0));
    const arm = geometry('chandelier-arm', () => new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(.58, -.24, 0), new THREE.Vector3(1.39, -.40, 0), new THREE.Vector3(1.72, -.04, 0),
    ]), 16, .035, 6, false));
    box([.065, 1.52, .065], [0, 11.86, z], darkGold);
    place(ceilingRose, gold, [0, 12.63, z], [1.25, 1, 1.25]);
    chandeliers.push({x: 0, y: 12.645, z});
    col(.17, .20, [0, 12.49, z], gold);
    place(sphere, gold, [0, 11.05, z], [.30, .44, .30]);
    col(.075, 2.65, [0, 10.08, z], gold);
    const tiers = [{r: 1.55, y: 10.37, n: 28}, {r: 1.10, y: 9.69, n: 22}, {r: .58, y: 9.12, n: 14}];
    for (const {r, y, n} of tiers) {
      ring(r, .055, [0, y, z], gold, [Math.PI/2, 0, 0]);
      ring(r-.055, .023, [0, y-.12, z], gold, [Math.PI/2, 0, 0]);
      for (let i = 0; i < n; i++) {
        const a = i*Math.PI*2/n, x = Math.cos(a)*r, dz = Math.sin(a)*r;
        col(.014, .14, [x, y-.13, z+dz], gold);
        place(jewel, crystal, [x, y-.36, z+dz], [.07, .25+(i%2)*.05, .07]);
        place(sphere, lamp, [x, y-.24, z+dz], [.025, .038, .025]);
      }
    }
    for (let i = 0; i < 12; i++) {
      const a = i*Math.PI/6, x = Math.cos(a), dz = Math.sin(a);
      place(arm, gold, [0, 10.76, z], [1, 1, 1], [0, -a, 0]);
      col(.10, .08, [x*1.72, 10.75, z+dz*1.72], gold);
      col(.035, .28, [x*1.72, 10.93, z+dz*1.72], ivory);
      place(sphere, lamp, [x*1.72, 11.12, z+dz*1.72], [.053, .12, .053]);
      // Three jewel beads form a bright draped chain down toward the second tier.
      for (let bead = 0; bead < 4; bead++) {
        const radius = 1.38-bead*.23, y = 10.30-bead*.17;
        place(jewel, crystal, [x*radius, y, z+dz*radius], [.057, .075, .057]);
      }
    }
    place(jewel, crystal, [0, 8.61, z], [.17, .34, .17]);
    place(sphere, lamp, [0, 8.83, z], [.075, .095, .075]);
  }

  /** Concatenate transformed parts into one geometry, so a whole fixture instances as one mesh per material. */
  function mergeParts(parts) {
    const flat = parts.map(({geo, matrix}) => {
      const copy = geo.index ? geo.toNonIndexed() : geo.clone();
      copy.applyMatrix4(matrix);
      if (!copy.attributes.normal) copy.computeVertexNormals();
      geo.dispose();
      return copy;
    });
    const count = flat.reduce((sum, g) => sum+g.attributes.position.count, 0);
    const position = new Float32Array(count*3), normal = new Float32Array(count*3), uv = new Float32Array(count*2);
    let offset = 0;
    for (const g of flat) {
      position.set(g.attributes.position.array, offset*3);
      normal.set(g.attributes.normal.array, offset*3);
      if (g.attributes.uv) uv.set(g.attributes.uv.array, offset*2);
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
  const at4 = (position = [0, 0, 0], rotation = [0, 0, 0]) =>
    new THREE.Matrix4().compose(new THREE.Vector3(...position), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)), new THREE.Vector3(1, 1, 1));

  // A sconce is built facing +z, its back flat to the wall at z = 0.
  const sconce = (() => {
    const gilt = [], stone = [], light = [];
    const cartouche = scale => {
      const shape = new THREE.Shape(), w = .15*scale, h = .36*scale;
      shape.moveTo(0, -h);
      shape.bezierCurveTo(w*.6, -h*.8, w, -h*.45, w, -h*.05);
      shape.lineTo(w, h*.55);
      shape.bezierCurveTo(w, h*.9, w*.45, h, 0, h);
      shape.bezierCurveTo(-w*.45, h, -w, h*.9, -w, h*.55);
      shape.lineTo(-w, -h*.05);
      shape.bezierCurveTo(-w, -h*.45, -w*.6, -h*.8, 0, -h);
      return shape;
    };
    gilt.push({geo: new THREE.ExtrudeGeometry(cartouche(1), {depth: .016, bevelEnabled: true, bevelThickness: .008, bevelSize: .012, bevelSegments: 1, curveSegments: 6}), matrix: at4([0, 0, .008])});
    stone.push({geo: new THREE.ShapeGeometry(cartouche(.76), 6), matrix: at4([0, 0, .034])});
    const flame = new THREE.LatheGeometry([[0, 0], [.02, .015], [.032, .055], [.028, .1], [.012, .14], [0, .16]].map(([x, y]) => new THREE.Vector2(x, y)), 10);
    for (const side of [-1, 1]) {
      const arm = new THREE.CatmullRomCurve3([[0, -.1, .036], [side*.03, -.2, .12], [side*.12, -.19, .24], [side*.2, -.08, .3], [side*.22, .04, .3]]
        .map(point => new THREE.Vector3(...point)));
      gilt.push({geo: new THREE.TubeGeometry(arm, 20, .014, 6), matrix: at4()});
      gilt.push({geo: new THREE.CylinderGeometry(.05, .024, .03, 12), matrix: at4([side*.22, .045, .3])});
      gilt.push({geo: new THREE.TorusGeometry(.05, .006, 4, 16), matrix: at4([side*.22, .06, .3], [Math.PI/2, 0, 0])});
      gilt.push({geo: new THREE.CylinderGeometry(.02, .02, .1, 10), matrix: at4([side*.22, .11, .3])});
      light.push({geo: flame.clone(), matrix: at4([side*.22, .16, .3])});
    }
    flame.dispose();
    gilt.push({geo: new THREE.SphereGeometry(.036, 12, 8), matrix: at4([0, -.1, .05])});
    gilt.push({geo: new THREE.SphereGeometry(.03, 10, 6), matrix: at4([0, .39, .014])});
    gilt.push({geo: new THREE.ConeGeometry(.022, .1, 10), matrix: at4([0, -.43, .014], [Math.PI, 0, 0])});
    return {gilt: mergeParts(gilt), stone: mergeParts(stone), light: mergeParts(light)};
  })();
  function sconceGlowTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const gradient = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    gradient.addColorStop(0, '#ffc463d9'); gradient.addColorStop(.35, '#ffcb7066'); gradient.addColorStop(1, '#ffd58a00');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 128, 128);
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const sconceGlow = basic('sconceGlow', '#ffffff', {map: sconceGlowTexture(), transparent: true, depthWrite: false});
  const candle = basic('candle', '#ffe2a0');

  // Halls are lit by the chandeliers and the wall sconces; the floor is left
  // open between the columns for statuary rather than freestanding lamps.
  let sconceCount = 0;
  for (let wing = 0; wing < 3; wing++) {
    const accent = shades[wing];
    for (const side of [-1, 1]) {
      const ry = side === -1 ? Math.PI/2 : -Math.PI/2;
      box([.20, 1.04, wing === 2 ? 34 : 86], [side*8.96, .59, wing === 2 ? -182 : -32-wing*88], accent);
      for (let boundary = 0; boundary <= (wing === 2 ? 2 : 6); boundary++) {
        column(side*7.9, -1-wing*88-boundary*12, accent);
      }
      for (let bay = 0; bay < (wing === 2 ? 2 : 6); bay++) {
        const z = center(wing, bay), x = side*8.94, stain = stainFor(wing, bay);
        place(windowBackingGeo, shadow, [x, WINDOW.sill-.15, z], [1, 1, 1], [0, ry, 0]);
        place(windowGeo, glass, [side*8.87, WINDOW.sill, z], [1, 1, 1], [0, ry, 0], stain.glass);
        place(roseGeo, glassRose, [side*8.855, HEAD.rose, z], [1, 1, 1], [0, ry, 0], stain.rose);
        glazing.push({wing, bay, side, z, stain: stain.name, glass: stain.glass, rose: stain.rose,
          head: WINDOW.head, keystoneTop: HEAD.keystone+.175, archTop: HEAD.arch+2.543});
        // Arch mouldings, keystone and full-height thin mullions.
        ring(2.37, .11, [side*8.76, HEAD.arch, z], ivory, [0, ry, 0], [1, 1, 1], Math.PI);
        ring(2.51, .033, [side*8.72, HEAD.arch, z], gold, [0, ry, 0], [1, 1, 1], Math.PI);
        for (const dz of [-2.38, 2.38]) box([.21, HEAD.jamb[1]-HEAD.jamb[0], .20], [side*8.77, (HEAD.jamb[0]+HEAD.jamb[1])/2, z+dz], ivory);
        box([.40, .17, 5.20], [side*8.71, 1.53, z], ivory);
        box([.15, .04, 5.22], [side*8.61, 1.66, z], gold);
        for (const dz of [-.77, .77]) box([.065, HEAD.mullion[1]-HEAD.mullion[0], .065], [side*8.73, (HEAD.mullion[0]+HEAD.mullion[1])/2, z+dz], ivory);
        box([.06, .075, WINDOW.width], [side*8.72, HEAD.transoms[0], z], ivory);
        box([.06, .065, WINDOW.width], [side*8.72, HEAD.transoms[1], z], ivory);
        box([.23, .35, .23], [side*8.66, HEAD.keystone, z], gold);
        // The floor takes a paler cast of the window's colour.
        place(plane, pool, [side*5.55, .018, z-.8], [5.4, 7.6, 1], [-Math.PI/2, 0, side*.19], stain.pool);
        // Twin-armed sconces seated flat on the wall, and small marble panels, add human-scale detail.
        for (const dz of [-4.25, 4.25]) {
          const wall = [side*8.965, 3.4, z+dz], facing = [0, -side*Math.PI/2, 0], size = [1.3, 1.3, 1.3];
          place(sconce.gilt, gold, wall, size, facing);
          place(sconce.stone, accent, wall, size, facing);
          place(sconce.light, candle, wall, size, facing);
          place(plane, sconceGlow, [side*8.945, 3.62, z+dz], [1.7, 1.7, 1], facing);
          sconceCount++;
        }
        for (const dz of [-1.56, 0, 1.56]) {
          box([.035, .69, 1.32], [side*8.79, .64, z+dz], ivory);
          box([.040, .57, 1.19], [side*8.765, .64, z+dz], accent);
        }
      }
    }
    for (let boundary = 0; boundary <= (wing === 2 ? 2 : 6); boundary++) {
      const z = -1-wing*88-boundary*12;
      ring(8.9, .18, [0, 7, z], ivory, [0, 0, 0], [1, 5.65/8.9, 1], Math.PI);
      for (const dz of [-.15, .15]) ring(8.88, .026, [0, 7, z+dz], gold, [0, 0, 0], [1, 5.63/8.88, 1], Math.PI);
      // Fan-shaped medallions in the floor land between successive exhibit plinths.
      ring(1.75, .022, [0, .022, z], gold, [Math.PI/2, 0, 0]);
      ring(1.56, .017, [0, .024, z], gold, [Math.PI/2, 0, 0]);
      for (let petal = 0; petal < 8; petal++) {
        const angle = petal*Math.PI/4;
        box([.14, .013, 1.43], [Math.sin(angle)*.77, .015, z+Math.cos(angle)*.77], accent, [0, angle, 0]);
      }
    }
    if (wing < 2) for (const bay of [0, 2, 4]) chandelier(center(wing, bay));
  }

  // The first light is held in a high, quiet domed chamber at the beginning of time.
  // Crop the elliptical dome to the room, so no spherical rim hangs into the first gallery.
  const domeVertices = [], domeIndices = [], domeUVs = [], domeSteps = 32;
  for (let row = 0; row <= domeSteps; row++) for (let columnIndex = 0; columnIndex <= domeSteps; columnIndex++) {
    const x = -9+18*columnIndex/domeSteps, z = 1+23*row/domeSteps;
    const height = 7+7.6*Math.sqrt(Math.max(0, 1-(x/12)**2-((z-12)/16)**2));
    const entranceHeight = 7+5.7*Math.sqrt(Math.max(0, 1-(x/9)**2));
    const join = Math.min(1, (z-1)/3);
    domeVertices.push(x, entranceHeight+(height-entranceHeight)*join, z);
    domeUVs.push(columnIndex/domeSteps, row/domeSteps);
    if (row < domeSteps && columnIndex < domeSteps) {
      const a = row*(domeSteps+1)+columnIndex, b = a+domeSteps+1;
      domeIndices.push(a, b, a+1, a+1, b, b+1);
    }
  }
  const domeGeo = new THREE.BufferGeometry();
  domeGeo.setAttribute('position', new THREE.Float32BufferAttribute(domeVertices, 3));
  domeGeo.setAttribute('uv', new THREE.Float32BufferAttribute(domeUVs, 2));
  domeGeo.setIndex(domeIndices); domeGeo.computeVertexNormals();
  place(domeGeo, plaster, [0, 0, 0]);
  box([18, .15, 24], [0, 14.64, 12], plaster);
  for (const side of [-1, 1]) box([.30, 7.6, 24], [side*9.12, 10.8, 12], plaster);
  // Four slender gold ribs are cropped at the room boundary with the dome itself.
  for (const angle of [0, Math.PI/4, Math.PI/2, Math.PI*.75]) {
    const points = [];
    for (let i = 0; i <= 160; i++) {
      const a = Math.PI*i/160, x = 12*Math.cos(a)*Math.cos(angle), z = 12+16*Math.cos(a)*Math.sin(angle);
      if (Math.abs(x) > 8.98 || z < 1.06 || z > 23.94) continue;
      const height = 7+7.6*Math.sin(a), entranceHeight = 7+5.7*Math.sqrt(Math.max(0, 1-(x/9)**2));
      const join = Math.min(1, (z-1)/3);
      points.push(new THREE.Vector3(x, entranceHeight+(height-entranceHeight)*join-.075, z));
    }
    if (points.length > 1) place(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), points.length, .065, 6, false), gold, [0, 0, 0]);
  }
  ring(1.24, .095, [0, 14.35, 12], gold, [Math.PI/2, 0, 0]);
  place(sphere, lamp, [0, 14.38, 12], [1.10, .05, 1.10]);
  for (const side of [-1, 1]) for (const z of [5, 18]) column(side*7.9, z, shades[0]);
  box([18, 14.6, .42], [0, 7.3, 24.18], plaster);
  for (const side of [-1, 1]) {
    box([.28, 9, .32], [side*6.9, 4.5, 23.90], ivory);
    box([.12, 8.5, .1], [side*6.55, 4.7, 23.70], gold);
  }
  // A monumental, inlaid halo behind the expanding origin installation.
  ring(5.5, .18, [0, 6.4, 23.82], ivory);
  ring(5.20, .037, [0, 6.4, 23.62], gold);
  ring(4.76, .025, [0, 6.4, 23.64], gold);
  const backdrop = new THREE.CircleGeometry(5.1, 64);
  place(backdrop, shades[0], [0, 6.4, 23.77], [1, 1, 1], [0, Math.PI, 0]);
  for (let i = 0; i < 32; i++) {
    const a = i*Math.PI/16;
    place(sphere, gold, [5.28*Math.sin(a), 6.4+5.28*Math.cos(a), 23.55], [.035, .035, .035]);
  }
  ring(4.4, .026, [0, .025, 15], gold, [Math.PI/2, 0, 0]);
  ring(4.66, .02, [0, .025, 15], gold, [Math.PI/2, 0, 0]);

  // Each full-width end wall has an actual opening. Door leaves are supplied by the scene.
  const endShape = new THREE.Shape();
  endShape.moveTo(-9, 0); endShape.lineTo(-9, 7);
  for (let i = 0; i <= 48; i++) {
    const a = Math.PI-i*Math.PI/48; endShape.lineTo(9*Math.cos(a), 7+5.7*Math.sin(a));
  }
  endShape.lineTo(9, 0); endShape.lineTo(2.8, 0); endShape.lineTo(2.8, 4.7);
  endShape.absarc(0, 4.7, 2.8, 0, Math.PI, false);
  endShape.lineTo(-2.8, 0); endShape.lineTo(-9, 0); endShape.closePath();
  const endWallGeo = geometry('portal-wall', () => new THREE.ExtrudeGeometry(endShape, {depth: .65, bevelEnabled: false, curveSegments: 32}));
  for (const doorway of doorways) {
    const {index, z} = doorway;
    place(endWallGeo, ivory, [0, 0, z-.325]);
    for (const side of [-1, 1]) {
      box([.49, 4.78, .90], [side*3.13, 2.39, z], relief);
      box([.14, 4.85, .98], [side*2.88, 2.425, z], gold);
      box([.36, 4.73, .88], [side*3.53, 2.365, z], ivory);
      box([.97, .20, 1.03], [side*3.21, .1, z], ivory);
      for (const facing of [-1, 1]) {
        box([3.72, 5.84, .06], [side*6.35, 3.61, z+facing*.38], shades[index]);
        for (const xOffset of [-1.97, 1.97]) box([.08, 6.04, .09], [side*6.35+xOffset, 3.61, z+facing*.44], gold);
        for (const y of [.59, 6.63]) box([4.02, .08, .09], [side*6.35, y, z+facing*.44], gold);
      }
    }
    ring(3.13, .245, [0, 4.7, z], relief, [0, 0, 0], [1, 1, 1], Math.PI);
    for (const dz of [-.47, .47]) {
      ring(2.88, .062, [0, 4.7, z+dz], gold, [0, 0, 0], [1, 1, 1], Math.PI);
      ring(3.48, .093, [0, 4.7, z+dz], ivory, [0, 0, 0], [1, 1, 1], Math.PI);
      ring(3.63, .027, [0, 4.7, z+dz], gold, [0, 0, 0], [1, 1, 1], Math.PI);
      // The cartouche is decorative, leaving all lettering to the navigation UI.
      place(sphere, gold, [0, 8.48, z+dz], [.47, .60, .10]);
      place(sphere, ivory, [0, 8.48, z+dz*1.10], [.34, .46, .095]);
    }
    box([5.6, .028, 1.35], [0, .014, z], shades[index]);
    for (const dz of [-.72, .72]) box([5.8, .018, .046], [0, .025, z+dz], gold);
  }

  // A small luminous epilogue chamber remains beyond the third door.
  box([18, 12.75, .35], [0, 6.375, -218.14], ivory);
  for (const x of [-5.3, 5.3]) column(x, -214.9, shades[2]);
  ring(3.2, .12, [0, 6.4, -217.83], gold);
  ring(3.42, .06, [0, 6.4, -217.82], ivory);
  // Daylight behind the future gallery's own rose window, which hangs in front of this.
  place(new THREE.CircleGeometry(3.1, 48), glass, [0, 6.4, -217.8], [1, 1, 1], [0, 0, 0], '#f6dfad');
  ring(3.4, .026, [0, .02, -209], gold, [Math.PI/2, 0, 0]);

  let instanceCount = 0, stainedInstances = 0;
  const instanceTint = new THREE.Color();
  for (const {geo, mat, matrices, tints} of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
    mesh.name = `Museum ${Object.keys(materials).find(key => materials[key] === mat) || 'detail'}`;
    matrices.forEach((matrix, i) => mesh.setMatrixAt(i, matrix));
    mesh.instanceMatrix.needsUpdate = true;
    // A stain per instance, where one was given; everything else stays white.
    if (tints.some(Boolean)) {
      tints.forEach((tint, i) => mesh.setColorAt(i, instanceTint.set(tint || '#ffffff')));
      mesh.instanceColor.needsUpdate = true;
      stainedInstances += tints.filter(Boolean).length;
    }
    mesh.computeBoundingSphere();
    group.add(mesh); instanceCount += matrices.length;
  }

  return {
    group, floor, doorways, collisionObstacles,
    // Where each light meets the vault, and where each mosaic's medallion is.
    lighting: {chandeliers, ceilingLights, panelCentres, mosaicTextureOffsets},
    // Every window: its stain, and how its head stands against the vault's lip.
    glazing: {windows: glazing.map(window => ({...window})), corniceSoffit: WINDOW.corniceSoffit,
      stains: STAINS.map(stain => stain.name), width: WINDOW.width, height: WINDOW.height, sill: WINDOW.sill},
    // Shared so statuary is carved from the same marble and gilt as the halls.
    materials: {ivory, gold, darkGold, shades},
    getState: () => ({
      style: 'Grand ivory museum with elliptical vaults, a domed origin chamber, and three ceremonial portals',
      hallWidth: 18, vaultHeight: 12.7, originDomeHeight: 14.6,
      windowCount: 28, doorCount: doorways.length, mosaicPanels: 70, chandeliers: 6, wallSconces: sconceCount, lightPosts: 0, benches: 0, ceilingLights: ceilingLights.length,
      architecturalInstances: instanceCount,
      // Glass, roundels and the light they lay on the floor, each carrying its own stain.
      stainedInstances,
      architectureDrawCalls: buckets.size+1,
      doorways: doorways.map(door => ({...door})),
      columnCount: 40, obstacleCount: collisionObstacles.length,
    }),
  };
}
