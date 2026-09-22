import {TEXTURE_SCALE} from './detail.js';

/** Original procedural art for the salon beyond the third ceremonial doorway. */
export function createFutureGallery(THREE) {
  const group = new THREE.Group();
  group.name = 'The Future Salon — imagination, mathematics, and architecture';
  // The murals are drawn in a 768 x 1024 space and painted at DENSITY pixels
  // to the unit, so every size in the drawing code below is in one coordinate
  // system however much texture is spent on it. A mural is 3.57 m wide, and the
  // small print under each equation is 8 cm tall: at the old density that was
  // 17 pixels of texture for some 45 pixels of headset screen, which is the
  // mush a visitor reported. The native build paints at twice the density.
  const W = 768, H = 1024, DENSITY = 1.33 * TEXTURE_SCALE;
  const painting = (width, height) => {
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * DENSITY);
    canvas.height = Math.round(height * DENSITY);
    const ctx = canvas.getContext('2d');
    ctx.scale(canvas.width / width, canvas.height / height);
    return {canvas, ctx};
  };
  const gold = new THREE.MeshStandardMaterial({color: '#d4af58', metalness: .74, roughness: .27});
  const ivory = new THREE.MeshStandardMaterial({color: '#fff0cd', metalness: .1, roughness: .42});
  const reveal = new THREE.MeshStandardMaterial({color: '#195968', roughness: .5});
  const lamp = new THREE.MeshBasicMaterial({color: '#fff0cb', toneMapped: false});
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const buckets = new Map();
  const transform = new THREE.Object3D();
  const textures = [];
  const murals = [];
  const random = (() => {
    let seed = 5311;
    return () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  })();
  function instance(geometry, material, position, scale, rotation = [0, 0, 0]) {
    const key = `${geometry.uuid}:${material.uuid}`;
    if (!buckets.has(key)) buckets.set(key, {geometry, material, matrices: []});
    transform.position.set(...position); transform.scale.set(...scale); transform.rotation.set(...rotation);
    transform.updateMatrix(); buckets.get(key).matrices.push(transform.matrix.clone());
  }
  function box(size, position, material, rotation) { instance(cube, material, position, size, rotation); }
  function line(ctx, points, color, width = 2, close = false) {
    ctx.beginPath(); ctx.moveTo(...points[0]);
    points.slice(1).forEach(point => ctx.lineTo(...point));
    if (close) ctx.closePath();
    ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke();
  }
  function polygon(ctx, points, color) {
    ctx.beginPath(); ctx.moveTo(...points[0]); points.slice(1).forEach(point => ctx.lineTo(...point));
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  }
  function circle(ctx, x, y, radius, fill, stroke, width = 2) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = width; ctx.stroke(); }
  }
  function arch(ctx, x, y, width, height, fill, stroke = '#eecb7c', lineWidth = 3) {
    const radius = width / 2;
    ctx.beginPath(); ctx.moveTo(x, y + height); ctx.lineTo(x, y + radius);
    ctx.arc(x + radius, y + radius, radius, Math.PI, 0);
    ctx.lineTo(x + width, y + height); ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    ctx.strokeStyle = stroke; ctx.lineWidth = lineWidth; ctx.stroke();
  }
  function lettering(ctx, text, y, size = 34, color = '#fff3ce') {
    ctx.font = `${size}px Georgia`; ctx.textAlign = 'center'; ctx.fillStyle = color;
    ctx.fillText(text, W / 2, y, W - 86);
  }
  function canvasPanel(top, bottom, title, subtitle) {
    const {canvas, ctx} = painting(W, H);
    const background = ctx.createLinearGradient(0, 0, W, H);
    background.addColorStop(0, top); background.addColorStop(1, bottom);
    ctx.fillStyle = background; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#ffe6a783'; ctx.lineWidth = 2; ctx.strokeRect(24, 24, W - 48, H - 48);
    ctx.strokeStyle = '#ffe6a72e'; ctx.strokeRect(36, 36, W - 72, H - 72);
    lettering(ctx, title, 97, 34);
    lettering(ctx, subtitle, 138, 17, '#f3e3c2');
    return {canvas, ctx};
  }
  function finishTexture(canvas, ctx) {
    // Small, translucent flecks give the murals the grain of a hand-painted surface.
    for (let i = 0; i < 4100; i++) {
      ctx.fillStyle = i % 2 ? '#fff5d90c' : '#1924510b';
      ctx.fillRect(random() * W, random() * H, 1 + random() * 2, 1 + random() * 2);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace; textures.push(texture); return texture;
  }
  function mathTexture(kind) {
    const specifications = [
      ['#148687', '#4a3b96', 'THE MUSIC OF NUMBERS', 'Algebra meets the geometry of a circle'],
      ['#cc5b4e', '#6d3983', 'ENERGY & MATTER', 'Two expressions of the same physical reality'],
      ['#2467b2', '#19958a', 'THE GEOMETRY OF POSSIBILITY', 'A relation that helps us measure our world'],
      ['#34789d', '#ca568b', 'A WORLD IN MOTION', 'Force, mass, and acceleration']
    ];
    const {canvas, ctx} = canvasPanel(...specifications[kind]);
    ctx.save(); ctx.beginPath(); ctx.rect(45, 175, W - 90, 482); ctx.clip();
    if (kind === 0) {
      const x = 384, y = 416, radius = 190;
      for (let i = 0; i < 90; i++) {
        const angle = i * Math.PI * 2 / 90;
        const next = angle + Math.PI * 1.21;
        line(ctx, [[x + Math.cos(angle) * radius, y + Math.sin(angle) * radius],
          [x + Math.cos(next) * radius, y + Math.sin(next) * radius]],
        i % 2 ? '#ffc47635' : '#adf7ec32');
      }
      circle(ctx, x, y, radius, '#169c9d24', '#ffe4aa', 4);
      circle(ctx, x, y, radius + 17, null, '#efbc7790', 1.5);
      line(ctx, [[145, y], [623, y]], '#e7eeef8c');
      line(ctx, [[x, 190], [x, 642]], '#e7eeef8c');
      line(ctx, [[x, y], [x - radius, y]], '#ffdf84', 7);
      circle(ctx, x - radius, y, 9, '#fff0ba');
      ctx.font = 'italic 30px Georgia'; ctx.fillStyle = '#fff2ce';
      ctx.fillText('−1', x - radius - 34, y + 42); ctx.fillText('i', x + 22, y - radius - 12);
      ctx.fillText('1', x + radius + 25, y + 42);
    } else if (kind === 1) {
      const glow = ctx.createRadialGradient(384, 409, 20, 384, 409, 232);
      glow.addColorStop(0, '#fffadf'); glow.addColorStop(.19, '#ffd578');
      glow.addColorStop(.48, '#ef9954bb'); glow.addColorStop(1, '#dc795700');
      ctx.fillStyle = glow; ctx.fillRect(70, 173, 628, 482);
      for (let i = 0; i < 52; i++) {
        const a = i * Math.PI / 26;
        line(ctx, [[384 + Math.cos(a) * 113, 410 + Math.sin(a) * 113],
          [384 + Math.cos(a) * (195 + i % 3 * 18), 410 + Math.sin(a) * (195 + i % 3 * 18)]], '#ffe5a273', 2);
      }
      for (let i = 0; i < 5; i++) {
        ctx.save(); ctx.translate(384, 412); ctx.rotate(i * .62);
        ctx.beginPath(); ctx.ellipse(0, 0, 231, 78 + i * 9, 0, 0, Math.PI * 2);
        ctx.strokeStyle = i % 2 ? '#d9b6ffac' : '#ffe9b798'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();
      }
      circle(ctx, 384, 412, 24, '#fff5d4');
    } else if (kind === 2) {
      const A = [274, 479], B = [464, 479], C = [274, 289];
      polygon(ctx, [A, B, C], '#f9edc3');
      polygon(ctx, [[274, 479], [464, 479], [464, 669], [274, 669]], '#ec9b72');
      polygon(ctx, [[274, 479], [274, 289], [84, 289], [84, 479]], '#5dddd1');
      polygon(ctx, [[274, 289], [464, 479], [654, 289], [464, 99]], '#ae95f3');
      for (let row = 1; row < 6; row++) {
        const d = row * 190 / 6;
        line(ctx, [[274 + d, 479], [274 + d, 669]], '#fff4cb6b');
        line(ctx, [[274, 479 + d], [464, 479 + d]], '#fff4cb6b');
        line(ctx, [[84 + d, 289], [84 + d, 479]], '#fff4cb6b');
        line(ctx, [[84, 289 + d], [274, 289 + d]], '#fff4cb6b');
      }
      line(ctx, [[274, 450], [303, 450], [303, 479]], '#2c6680', 3);
      lettering(ctx, 'a', 594, 39); ctx.font = 'italic 39px Georgia';
      ctx.fillStyle = '#fff6dc'; ctx.fillText('b', 175, 400); ctx.fillText('c', 472, 292);
    } else {
      for (let row = 0; row < 12; row++) {
        ctx.beginPath();
        for (let x = 54; x < 716; x += 5) {
          const y = 230 + row * 30 + Math.sin(x * .012 + row * .22) * (20 + row * 3);
          if (x === 54) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = row % 3 ? '#fbe8bc6a' : '#9bf2e799'; ctx.lineWidth = 2; ctx.stroke();
      }
      const path = [[132, 516], [230, 484], [342, 424], [480, 334], [637, 227]];
      line(ctx, path, '#ffdb82', 5);
      path.forEach((point, index) => {
        circle(ctx, ...point, 17 + index * 3.5, '#ffe4a0', '#fff9dc', 3);
        circle(ctx, ...point, 25 + index * 4, null, '#ffd99688', 1);
      });
      polygon(ctx, [[637, 227], [603, 249], [617, 268]], '#ffdf95');
    }
    ctx.restore();
    line(ctx, [[116, 689], [652, 689]], '#ffe7a864');
    if (kind === 0) {
      ctx.fillStyle = '#fff8df'; ctx.textAlign = 'left';
      ctx.font = 'italic 114px Georgia'; ctx.fillText('e', 128, 824);
      ctx.font = 'italic 55px Georgia'; ctx.fillText('iπ', 181, 756);
      ctx.font = '103px Georgia'; ctx.fillText('+ 1 = 0', 260, 824);
    } else lettering(ctx, ['','E = mc²','a² + b² = c²','F = ma'][kind], 820, kind === 2 ? 88 : 112, '#fff8df');
    const captions = [
      ['A half-turn on the unit circle reaches −1.', 'Five fundamental constants. One identity.'],
      ['The rest energy of a body equals its mass', 'multiplied by the speed of light squared.'],
      ['For a right triangle, the square on its hypotenuse', 'equals the sum of the squares on its other sides.'],
      ['For constant mass, net force equals mass', 'multiplied by acceleration.']
    ];
    lettering(ctx, captions[kind][0], 905, 22); lettering(ctx, captions[kind][1], 938, 22);
    return finishTexture(canvas, ctx);
  }
  function architectureTexture(kind) {
    const specifications = [
      ['#338e9b', '#bf697c', 'A SYMMETRY OF LIGHT', 'An original illustration of the Taj Mahal'],
      ['#bf9860', '#767abd', 'THE INFINITE GALLERY', 'An original study inspired by Versailles'],
      ['#416cbc', '#9c59a6', 'STONE BECOMES LIGHT', 'An imagined Gothic cathedral'],
      ['#407bd0', '#d17496', 'WORLDS TO COME', 'An imagined city shaped by curiosity']
    ];
    const {canvas, ctx} = canvasPanel(...specifications[kind]);
    ctx.save(); ctx.beginPath(); ctx.rect(46, 176, W - 92, 693); ctx.clip();
    if (kind === 0) {
      const sky = ctx.createLinearGradient(0, 176, 0, 710);
      sky.addColorStop(0, '#7bdad0'); sky.addColorStop(.72, '#ffc8a8'); sky.addColorStop(1, '#f2a290');
      ctx.fillStyle = sky; ctx.fillRect(46, 176, 676, 693);
      circle(ctx, 543, 302, 91, '#fff0bc');
      for (let i = 0; i < 22; i++) line(ctx, [[48, 230 + i * 16], [721, 218 + i * 17]], '#fff7df13', 9);
      ctx.fillStyle = '#bdcfad'; ctx.fillRect(46, 641, 676, 228);
      polygon(ctx, [[318, 641], [450, 641], [602, 869], [166, 869]], '#4ca8b1');
      for (let i = 0; i < 17; i++) line(ctx, [[175 + i % 2 * 8, 674 + i * 12], [594 - i % 3 * 7, 674 + i * 12]], '#d1e5c759', 3);
      const facade = (reflected = false) => {
        ctx.save(); if (reflected) {ctx.translate(0, 1286); ctx.scale(1, -.78); ctx.globalAlpha = .28;}
        ctx.fillStyle = '#fff1d1'; ctx.fillRect(211, 478, 346, 158); ctx.fillRect(276, 443, 216, 193);
        ctx.fillStyle = '#e9d5ad'; ctx.fillRect(188, 631, 392, 11);
        // The central onion dome is hand-shaped; smaller chhatri domes echo it.
        ctx.beginPath(); ctx.moveTo(294, 443); ctx.bezierCurveTo(276, 383, 343, 350, 384, 287);
        ctx.bezierCurveTo(425, 350, 492, 383, 474, 443); ctx.closePath();
        ctx.fillStyle = '#fff5da'; ctx.fill(); ctx.strokeStyle = '#d4b97d'; ctx.lineWidth = 3; ctx.stroke();
        line(ctx, [[384, 287], [384, 260]], '#d4a755', 4); circle(ctx, 384, 263, 5, '#ddae52');
        arch(ctx, 333, 475, 102, 158, '#629baa', '#d2b684', 5);
        arch(ctx, 351, 501, 66, 132, '#417988', '#f8e1b1', 3);
        for (const x of [228, 488]) {arch(ctx, x, 510, 49, 104, '#80aab0'); arch(ctx, x - 7, 443, 64, 38, '#fff3d4');}
        for (const x of [132, 636]) {
          ctx.fillStyle = '#fff1d1'; ctx.fillRect(x - 12, 390, 24, 252);
          for (const y of [418, 480, 548, 620]) {ctx.fillStyle = '#d7bd89'; ctx.fillRect(x - 19, y, 38, 7);}
          arch(ctx, x - 20, 354, 40, 46, '#fff4d9'); line(ctx, [[x, 354], [x, 337]], '#e1b760', 3);
        }
        ctx.restore();
      };
      facade(true); facade();
      for (const side of [-1, 1]) for (let i = 0; i < 6; i++) {
        const x = 384 + side * (100 + i * 36), y = 667 + i * 36;
        ctx.fillStyle = '#397b6b'; ctx.beginPath(); ctx.ellipse(x, y, 13 + i, 33 + i * 3, 0, 0, Math.PI * 2); ctx.fill();
      }
    } else if (kind === 1) {
      ctx.fillStyle = '#f4dec0'; ctx.fillRect(46, 176, 676, 693);
      polygon(ctx, [[46, 176], [722, 176], [461, 465], [307, 465]], '#d6ad69');
      polygon(ctx, [[46, 869], [722, 869], [462, 604], [306, 604]], '#c89e79');
      polygon(ctx, [[46, 176], [306, 465], [306, 604], [46, 869]], '#efcd99');
      polygon(ctx, [[722, 176], [462, 465], [462, 604], [722, 869]], '#e8c289');
      for (let i = 0; i < 6; i++) {
        const t = i / 6, inverse = 1 - t, y = 194 + 272 * t;
        const left = 59 + t * 247, width = 84 * inverse + 11, height = 543 * inverse + 125;
        arch(ctx, left, y, width, height, i % 2 ? '#94bdc7' : '#d1e7db', '#bc8844', 7 * inverse + 2);
        arch(ctx, W - left - width, y, width, height, i % 2 ? '#c2c8ea' : '#90b7c4', '#bd8b48', 7 * inverse + 2);
        for (const x of [left - 8, W - left + 4]) {
          ctx.fillStyle = '#fff0d0'; ctx.fillRect(x, y + 10, 8 * inverse + 3, height);
        }
        const by = 202 + i * 45;
        ctx.beginPath(); ctx.moveTo(left, by); ctx.quadraticCurveTo(384, by - 110 * inverse, W - left, by);
        ctx.strokeStyle = '#fae6ac'; ctx.lineWidth = 5; ctx.stroke();
      }
      arch(ctx, 325, 463, 118, 146, '#bad8cc', '#bf9152', 6);
      for (let i = 0; i < 11; i++) line(ctx, [[46 + i * 67.6, 869], [384 + (i - 5) * 8, 599]], '#fff0d282', 2);
      for (let row = 0; row < 7; row++) {const y = 608 + Math.pow(row / 6, 1.75) * 261; line(ctx, [[46, y], [722, y]], '#fff0d286', 3);}
      for (let i = 0; i < 4; i++) {
        const y = 240 + i * 74, radius = 49 - i * 10;
        line(ctx, [[384, y - 75], [384, y]], '#9d6e39', 3);
        for (let j = 0; j < 7; j++) {
          const a = j * Math.PI * 2 / 7;
          circle(ctx, 384 + Math.cos(a) * radius, y + Math.sin(a) * radius * .32, 7 - i, '#fff7dc', '#c69850');
        }
      }
    } else if (kind === 2) {
      ctx.fillStyle = '#6578a8'; ctx.fillRect(46, 176, 676, 693);
      polygon(ctx, [[46, 176], [384, 244], [722, 176], [722, 869], [46, 869]], '#9398bd');
      for (let i = 0; i < 7; i++) {
        const d = i * 43, left = 64 + d, right = 704 - d, base = 852 - i * 38, apex = 208 + i * 47;
        ctx.beginPath(); ctx.moveTo(left, base); ctx.lineTo(left, apex + 212);
        ctx.quadraticCurveTo(left, apex + 84, 384, apex); ctx.quadraticCurveTo(right, apex + 84, right, apex + 212);
        ctx.lineTo(right, base); ctx.strokeStyle = i % 2 ? '#ffdf9d' : '#f5e5cb'; ctx.lineWidth = 15 - i * 1.3; ctx.stroke();
        line(ctx, [[left - 14, base], [left - 14, apex + 244]], '#786688', 5);
        line(ctx, [[right + 14, base], [right + 14, apex + 244]], '#786688', 5);
      }
      circle(ctx, 384, 475, 91, '#6b559b', '#ffe0a7', 6);
      const colors = ['#59c8d2', '#ea8295', '#c797e2', '#f6cd77', '#7ad0ab', '#8099e1'];
      for (let i = 0; i < 12; i++) {
        const a = i * Math.PI / 6;
        ctx.save(); ctx.translate(384 + Math.cos(a) * 55, 475 + Math.sin(a) * 55); ctx.rotate(a);
        ctx.beginPath(); ctx.ellipse(0, 0, 29, 15, 0, 0, Math.PI * 2);
        ctx.fillStyle = colors[i % colors.length]; ctx.fill(); ctx.strokeStyle = '#f6dcaa'; ctx.lineWidth = 3; ctx.stroke(); ctx.restore();
      }
      circle(ctx, 384, 475, 23, '#ffe6a4', '#fff1c9', 3);
      arch(ctx, 349, 594, 70, 134, '#94caca', '#ffe3b1', 5);
      for (const side of [-1, 1]) for (let i = 0; i < 5; i++) {
        const x = 384 + side * (120 + i * 47), y = 611 + i * 30;
        polygon(ctx, [[x - 19, y], [x + 9, y - 63], [x + 21, y], [x + 20, y + 145], [x - 20, y + 145]], colors[i % colors.length] + '9b');
      }
    } else {
      const sky = ctx.createLinearGradient(0, 180, 0, 869);
      sky.addColorStop(0, '#426ece'); sky.addColorStop(.53, '#bf8ace'); sky.addColorStop(1, '#ffbd9b');
      ctx.fillStyle = sky; ctx.fillRect(46, 176, 676, 693);
      circle(ctx, 486, 373, 119, '#ffdf97');
      for (let i = 0; i < 38; i++) circle(ctx, 66 + random() * 636, 191 + random() * 253, 1 + random() * 2, '#fff4dc');
      for (let layer = 0; layer < 3; layer++) for (let i = 0; i < 12; i++) {
        const x = 53 + i * 56 + layer * 11, y = 550 + layer * 71, height = 45 + random() * 210;
        const colors = [['#a5a4d9', '#bfa5de'], ['#75a9ba', '#75b9be'], ['#377f9e', '#5b91b3']][layer];
        ctx.fillStyle = colors[i % 2]; ctx.fillRect(x, y - height, 36, height + 134);
        polygon(ctx, [[x, y - height], [x + 18, y - height - 28], [x + 36, y - height]], '#e1c6dc');
        for (let floor = 0; floor < height / 17; floor++) line(ctx, [[x + 5, y - height + floor * 17 + 10], [x + 30, y - height + floor * 17 + 10]], '#ffddb485', 3);
      }
      for (let i = 0; i < 3; i++) {
        ctx.beginPath(); ctx.moveTo(46, 583 + i * 62); ctx.bezierCurveTo(263, 510 + i * 60, 487, 746 - i * 5, 722, 607 + i * 56);
        ctx.strokeStyle = i % 2 ? '#8de0cf' : '#ffe1a0'; ctx.lineWidth = 14 - i * 3; ctx.stroke();
      }
      polygon(ctx, [[46, 869], [46, 778], [384, 698], [722, 794], [722, 869]], '#a9c9b4');
      for (let i = 0; i < 8; i++) {
        const x = 76 + i * 90, y = 795 + Math.sin(i) * 18;
        line(ctx, [[x, y + 24], [x, y - 16]], '#6e8290', 4); circle(ctx, x, y - 20, 22, '#4ca59b');
      }
    }
    ctx.restore();
    const captions = ['Craft, proportion, and the reflection of a dream.', 'A thousand reflections. An invitation to wonder.',
      'What we can imagine, we learn to build.', 'The next chapter is ours to imagine.'];
    lettering(ctx, captions[kind], 927, 23);
    return finishTexture(canvas, ctx);
  }
  function addMural(side, index, texture, title, category) {
    const z = -254.8 - index * 4.12;
    const x = side * 8.73, y = 3.55, width = 3.57, height = 4.76;
    const rotation = side === -1 ? Math.PI / 2 : -Math.PI / 2;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(width, height),
      new THREE.MeshBasicMaterial({map: texture, toneMapped: false}));
    panel.position.set(x, y, z); panel.rotation.y = rotation; panel.name = title; group.add(panel);
    box([.14, height + .32, width + .32], [side * 8.84, y, z], reveal);
    for (const dy of [-height / 2 - .07, height / 2 + .07]) {
      box([.18, .13, width + .33], [side * 8.69, y + dy, z], gold);
      box([.07, .025, width + .08], [side * 8.59, y + dy - Math.sign(dy) * .1, z], ivory);
    }
    for (const dz of [-width / 2 - .07, width / 2 + .07]) {
      box([.18, height + .27, .13], [side * 8.69, y, z + dz], gold);
      box([.07, height + .03, .025], [side * 8.59, y, z + dz - Math.sign(dz) * .1], ivory);
    }
    // Picture lights are luminous meshes, avoiding additional per-pixel light costs.
    box([.24, .075, width * .64], [side * 8.38, y + height / 2 + .36, z], gold);
    box([.16, .025, width * .60], [side * 8.37, y + height / 2 + .315, z], lamp);
    murals.push({title, category, side, x, y, z, width, height});
  }
  ['Euler’s identity', 'Mass–energy equivalence', 'The Pythagorean theorem', 'Newton’s second law']
    .forEach((title, index) => addMural(-1, index, mathTexture(index), title, 'equation'));
  ['Taj Mahal', 'A gallery inspired by Versailles', 'An imagined Gothic cathedral', 'Worlds to come']
    .forEach((title, index) => addMural(1, index, architectureTexture(index), title, index === 3 ? 'future art' : 'architecture'));

  // A radial stained-glass mosaic provides a colorful ceiling without covering the vault.
  const {canvas: ceilingCanvas, ctx: ceiling} = painting(1024, 1024);
  const jewels = ['#57c8cb', '#8293e7', '#d784c4', '#efaa79', '#e3cd83', '#71c7a0'];
  circle(ceiling, 512, 512, 507, '#f4e0b6', '#d5a656', 10);
  for (let ring = 0; ring < 8; ring++) for (let petal = 0; petal < 32; petal++) {
    const r1 = 48 + ring * 56, r2 = r1 + 52, a1 = petal * Math.PI / 16, a2 = (petal + 1) * Math.PI / 16;
    ceiling.beginPath(); ceiling.arc(512, 512, r2, a1 + .008, a2 - .008);
    ceiling.arc(512, 512, r1, a2 - .008, a1 + .008, true); ceiling.closePath();
    ceiling.fillStyle = jewels[(petal + ring * 2) % jewels.length]; ceiling.fill();
    ceiling.strokeStyle = '#f8e7b9'; ceiling.lineWidth = 3; ceiling.stroke();
  }
  for (let i = 0; i < 16; i++) {
    const a = i * Math.PI / 8;
    line(ceiling, [[512 + Math.cos(a) * 45, 512 + Math.sin(a) * 45],
      [512 + Math.cos(a) * 498, 512 + Math.sin(a) * 498]], '#fff0c1', 5);
  }
  circle(ceiling, 512, 512, 45, '#fff1c4', '#d5ad5b', 6);
  const ceilingTexture = new THREE.CanvasTexture(ceilingCanvas); ceilingTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(ceilingTexture);
  const canopy = new THREE.Mesh(new THREE.CircleGeometry(4.15, 64),
    new THREE.MeshBasicMaterial({map: ceilingTexture, side: THREE.DoubleSide, toneMapped: false}));
  canopy.name = 'The rose of possibility — 256 glass tesserae';
  canopy.position.set(0, 11.25, -261); canopy.rotation.x = Math.PI / 2; group.add(canopy);

  // The rear oculus completes the room with a luminous jewel-colored rose window.
  const {canvas: roseCanvas, ctx: rose} = painting(1024, 1024);
  circle(rose, 512, 512, 510, '#536ca5', '#ffe2a0', 8);
  for (let band = 0; band < 3; band++) for (let tile = 0; tile < 64; tile++) {
    const inner = 397 + band * 35, outer = inner + 32;
    const a = tile * Math.PI / 32, b = (tile + 1) * Math.PI / 32;
    rose.beginPath(); rose.arc(512, 512, outer, a + .005, b - .005);
    rose.arc(512, 512, inner, b - .005, a + .005, true); rose.closePath();
    rose.fillStyle = jewels[(tile + band * 2) % jewels.length]; rose.fill();
    rose.strokeStyle = '#ffe2aa'; rose.lineWidth = 2.5; rose.stroke();
  }
  circle(rose, 512, 512, 391, '#7972b5', '#ffe9b6', 6);
  for (let petal = 0; petal < 16; petal++) {
    const a = petal * Math.PI / 8;
    rose.save(); rose.translate(512, 512); rose.rotate(a);
    rose.beginPath(); rose.moveTo(102, 0);
    rose.bezierCurveTo(173, -60, 301, -88, 381, 0);
    rose.bezierCurveTo(301, 88, 173, 60, 102, 0);
    rose.fillStyle = jewels[(petal + 2) % jewels.length]; rose.fill();
    rose.strokeStyle = '#ffe4a8'; rose.lineWidth = 5; rose.stroke();
    rose.beginPath(); rose.moveTo(146, 0); rose.lineTo(345, 0);
    rose.strokeStyle = '#fff0c69c'; rose.lineWidth = 2; rose.stroke();
    circle(rose, 281, 0, 20, '#fff0c46b', '#ffe8b0', 3); rose.restore();
  }
  circle(rose, 512, 512, 118, '#65c3c4', '#ffe5a7', 7);
  const star = [];
  for (let point = 0; point < 16; point++) {
    const a = point * Math.PI / 8, radius = point % 2 ? 45 : 97;
    star.push([512 + Math.cos(a) * radius, 512 + Math.sin(a) * radius]);
  }
  polygon(rose, star, '#fff0bf'); line(rose, star, '#e8bd6b', 3, true);
  circle(rose, 512, 512, 30, '#edb17d', '#fff6d7', 4);
  const roseTexture = new THREE.CanvasTexture(roseCanvas); roseTexture.colorSpace = THREE.SRGBColorSpace;
  textures.push(roseTexture);
  const rearWindow = new THREE.Mesh(new THREE.CircleGeometry(3.07, 96),
    new THREE.MeshBasicMaterial({map: roseTexture, toneMapped: false}));
  rearWindow.name = 'The future rose window'; rearWindow.position.set(0, 6.4, -269.68); group.add(rearWindow);

  const crystalGeometry = new THREE.OctahedronGeometry(1, 0);
  const beadGeometry = new THREE.SphereGeometry(1, 8, 6);
  const chandelierRing = new THREE.TorusGeometry(1, .025, 8, 64);
  const suspensionGeometry = new THREE.CylinderGeometry(.023, .023, 1, 5);
  const crystalMaterials = jewels.map(color => new THREE.MeshStandardMaterial({
    color, emissive: color, emissiveIntensity: .22, metalness: .3, roughness: .18
  }));
  let crystalCount = 0;
  for (let tier = 0; tier < 3; tier++) {
    const radius = 2.75 - tier * .78, y = 9.60 - tier * .90;
    instance(chandelierRing, gold, [0, y, -261], [radius, radius, radius], [Math.PI / 2, 0, 0]);
    const count = 32 - tier * 8;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count, x = Math.cos(angle) * radius, z = -261 + Math.sin(angle) * radius;
      box([.025, .39, .025], [x, y - .18, z], gold);
      instance(crystalGeometry, crystalMaterials[i % jewels.length], [x, y - .48, z], [.13, .31, .13], [0, angle, 0]);
      instance(beadGeometry, lamp, [x, y + .10, z], [.065, .09, .065]); crystalCount++;
    }
  }
  for (let i = 0; i < 8; i++) {
    const a = i * Math.PI / 4;
    const start = new THREE.Vector3(Math.cos(a) * 2.75, 9.6, -261 + Math.sin(a) * 2.75);
    const end = new THREE.Vector3(Math.cos(a) * .55, 11.2, -261 + Math.sin(a) * .55);
    const midpoint = start.clone().add(end).multiplyScalar(.5);
    const length = start.distanceTo(end);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize());
    const rotation = new THREE.Euler().setFromQuaternion(quaternion);
    instance(suspensionGeometry, gold, midpoint.toArray(), [1, length, 1], [rotation.x, rotation.y, rotation.z]);
  }
  instance(chandelierRing, gold, [0, 11.25, -261], [4.20, 4.20, 4.20], [Math.PI / 2, 0, 0]);
  // The floor echo is flat inlay; the central walking route remains unobstructed.
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI / 12;
    instance(cube, crystalMaterials[i % jewels.length], [Math.cos(a) * 3.8, .018, -261 + Math.sin(a) * 3.8],
      [.17, .015, .40], [0, -a, 0]);
  }
  let instances = 0;
  for (const {geometry, material, matrices} of buckets.values()) {
    const mesh = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    group.add(mesh); instances += matrices.length;
  }
  return {
    group,
    getState: () => ({
      muralCount: murals.length, equationCount: 4, architectureIllustrations: 3, futureArtCount: 1,
      crystalCount, ceilingTesserae: 256, textureCount: textures.length,
      rearWindow: true,
      drawObjects: group.children.filter(child => child.isMesh).length,
      decorativeInstances: instances, centerWalkwayClear: true,
      bounds: {minX: -9, maxX: 9, minZ: -270, maxZ: -252, minY: 0, maxY: 11.4},
      equations: ['e^(iπ) + 1 = 0', 'E = mc²', 'a² + b² = c²', 'F = ma'],
      murals: murals.map(mural => ({...mural}))
    })
  };
}
