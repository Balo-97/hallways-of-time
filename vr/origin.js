/** A self-contained, softly expanding origin installation. All distances are metres. */
export function createOriginEffect(THREE) {
  // Twice the matter of the first version, reaching a metre further, so the
  // expansion fills the chamber rather than hanging in the middle of it. The
  // native build draws the same cloud from the same seed (MuseumOrigin.cs), so
  // these numbers are mirrored there.
  const PARTICLE_COUNT = 4800;
  const MAX_RADIUS = 5.6;
  const CYCLE_SECONDS = 16;
  const group = new THREE.Group();
  group.name = 'The First Light — Big Bang';
  group.userData.originEffect = true;
  group.userData.maxRadius = MAX_RADIUS;

  // A seeded distribution keeps the composition stable across reloads and tests.
  let seed = 1927;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const positions = new Float32Array(PARTICLE_COUNT * 3);
  const directions = new Float32Array(PARTICLE_COUNT * 3);
  const colors = new Float32Array(PARTICLE_COUNT * 3);
  const parameters = new Float32Array(PARTICLE_COUNT * 3);
  const palette = ['#fff9df', '#ffe1a4', '#ffb960', '#f17b45', '#af8eff'];
  const color = new THREE.Color();
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const vertical = random() * 2 - 1;
    const azimuth = random() * Math.PI * 2;
    const radial = Math.sqrt(1 - vertical * vertical);
    directions.set([Math.cos(azimuth) * radial, vertical, Math.sin(azimuth) * radial], i * 3);
    // Most motes occupy the outward wave; a smaller population fills its interior.
    const reach = random() < .72 ? .72 + random() * .28 : .12 + random() * .68;
    parameters.set([reach, random(), .52 + Math.pow(random(), 3) * 1.6], i * 3);
    color.set(palette[Math.floor(random() * palette.length)]);
    colors.set([color.r, color.g, color.b], i * 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aDirection', new THREE.BufferAttribute(directions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aParameters', new THREE.BufferAttribute(parameters, 3));
  // Positions are displaced in the shader, so supply explicit culling bounds.
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), MAX_RADIUS);
  const particleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
    uniforms: {
      uTime: {value: 0},
      uPhase: {value: .14},
      uStill: {value: 0},
      uFlash: {value: 0}
    },
    vertexShader: `
      attribute vec3 aDirection;
      attribute vec3 aColor;
      attribute vec3 aParameters;
      uniform float uTime;
      uniform float uPhase;
      uniform float uStill;
      uniform float uFlash;
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        float phase = mix(uPhase, .70, uStill);
        float expansion = 1.0 - pow(1.0 - phase, 2.15);
        float radius = .12 + 5.2 * expansion * aParameters.x;
        float drift = sin(uTime * .23 + aParameters.y * 6.283) * .035 * (1.0 - uStill);
        vec3 displaced = aDirection * (radius + drift);
        vec4 mvPosition = modelViewMatrix * vec4(displaced, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = clamp(aParameters.z * 110.0 / max(1.0, -mvPosition.z), 1.0, 30.0);
        float birth = smoothstep(0.0, .12, phase);
        float fade = 1.0 - smoothstep(.69, 1.0, phase);
        // A twinkle, stronger than the first version's shimmer.
        float shimmer = .82 + .18 * sin(uTime * 1.7 + aParameters.y * 40.0);
        vOpacity = birth * fade * mix(shimmer, 1.0, uStill) * (1.0 + 2.0 * uFlash);
        // Matter is born white-hot and cools as it spreads: its own colour
        // arrives within the first third of the cycle, and some of it reddens
        // to embers before the next beginning.
        vec3 hot = vec3(1.0, .97, .88), ember = vec3(.95, .38, .22);
        vec3 tint = mix(hot, aColor, smoothstep(.02, .30, phase));
        vColor = mix(tint, ember, smoothstep(.55, .95, phase) * .55 * aParameters.y);
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vOpacity;
      void main() {
        vec2 point = gl_PointCoord - .5;
        float r = length(point) * 2.0;
        if (r > 1.0) discard;
        float halo = exp(-r * r * 6.0) * (1.0 - smoothstep(.65, 1.0, r));
        float core = exp(-r * r * 28.0);
        gl_FragColor = vec4(mix(vColor, vec3(1.0, .98, .87), core * .65),
          (halo * .75 + core * .55) * vOpacity);
      }
    `
  });
  const particles = new THREE.Points(geometry, particleMaterial);
  particles.name = 'Expanding matter · 2400 luminous motes';
  group.add(particles);

  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const context = canvas.getContext('2d');
  const gradient = context.createRadialGradient(128, 128, 0, 128, 128, 128);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(.055, 'rgba(255,250,223,.98)');
  gradient.addColorStop(.15, 'rgba(255,224,168,.67)');
  gradient.addColorStop(.36, 'rgba(255,171,84,.22)');
  gradient.addColorStop(.68, 'rgba(201,129,127,.055)');
  gradient.addColorStop(1, 'rgba(145,110,190,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 256);
  const glowMap = new THREE.CanvasTexture(canvas);
  glowMap.colorSpace = THREE.SRGBColorSpace;
  const makeGlow = (size, tint, opacity) => {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowMap, color: tint, opacity, transparent: true,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false
    }));
    sprite.scale.set(size, size, 1);
    group.add(sprite);
    return sprite;
  };
  const horizon = makeGlow(15, '#8f7ad8', .2);
  horizon.name = 'Cosmic horizon';
  const aura = makeGlow(9, '#ffd39d', .62);
  aura.name = 'Soft origin halo';
  const corona = makeGlow(4, '#ffdda5', .95);
  corona.name = 'Incandescent corona';
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(.19, 24, 16),
    new THREE.MeshBasicMaterial({color: '#fff7dd', toneMapped: false})
  );
  core.name = 'First light';
  group.add(core);
  const originLight = new THREE.PointLight('#ffc477', 10, 13, 2);
  originLight.name = 'Warm light from the origin';
  group.add(originLight);

  // Offset, tilted circles read as spherical shock fronts from either eye.
  const waves = [];
  const ringGeometry = new THREE.TorusGeometry(1, .006, 5, 160);
  const WAVES = 8;
  for (let i = 0; i < WAVES; i++) {
    const material = new THREE.MeshBasicMaterial({
      color: ['#ffd39b', '#ad8af2', '#ffb08a'][i % 3],
      transparent: true, opacity: .2, blending: THREE.AdditiveBlending,
      depthWrite: false, toneMapped: false
    });
    const wave = new THREE.Mesh(ringGeometry, material);
    wave.name = `Expansion wave ${i + 1}`;
    wave.rotation.set(.28 + i * .51, -.45 + i * .34, i * .37);
    group.add(wave);
    waves.push(wave);
    // The native build expands these itself: the ring is exported at radius 1,
    // in the pose it was authored in, and scaled and faded from the same
    // numbers as below (see scripts/export-native.mjs and MuseumOrigin.cs).
    wave.userData.nativePart = {kind: 'wave', name: wave.name, piece: 'The First Light', index: i,
      cycle: CYCLE_SECONDS, tint: ['#ffd39b', '#ad8af2', '#ffb08a'][i % 3],
      base: {position: wave.position.toArray(), quaternion: wave.quaternion.toArray(), scale: [1, 1, 1]}};
  }

  let lastElapsed = 0;
  let epoch = 0;
  let restartCount = 0;
  let still = false;
  let localElapsed = 0;
  let phase = .14;
  function update(elapsed, reducedMotion = false) {
    lastElapsed = Number.isFinite(elapsed) ? Math.max(0, elapsed) : lastElapsed;
    localElapsed = Math.max(0, lastElapsed - epoch);
    still = Boolean(reducedMotion);
    // Begin slightly into the first expansion so the arrival is already luminous.
    phase = ((localElapsed / CYCLE_SECONDS + .14) % 1 + 1) % 1;
    const visualTime = still ? 0 : localElapsed;
    particleMaterial.uniforms.uTime.value = visualTime;
    particleMaterial.uniforms.uPhase.value = phase;
    particleMaterial.uniforms.uStill.value = still ? 1 : 0;
    const breath = still ? 1 : 1 + Math.sin(visualTime * .39) * .055;
    // The bang: every cycle begins with a flash that fills the chamber and
    // falls away in about a second, which is what makes the beginning read as
    // a beginning. Held still, there is no flash.
    const flash = still ? 0 : Math.exp(-phase * 26);
    particleMaterial.uniforms.uFlash.value = flash;
    const expansion = 1 - Math.pow(1 - (still ? .7 : phase), 2.15);
    corona.scale.setScalar(4 * breath * (1 + 2.6 * flash));
    corona.scale.z = 1;
    aura.scale.setScalar(9 * (.85 + .3 * expansion) * (1 + .5 * flash));
    aura.scale.z = 1;
    horizon.scale.setScalar(15 * (.8 + .35 * expansion));
    horizon.scale.z = 1;
    core.scale.setScalar(breath * (1 + 1.4 * flash));
    originLight.intensity = 10 * breath * (1 + 4 * flash);
    particles.rotation.y = still ? 0 : visualTime * .02;
    waves.forEach((wave, i) => {
      const wavePhase = still ? .2 + i * .09 : (phase + i / WAVES) % 1;
      const radius = .16 + wavePhase * 5.1;
      wave.scale.setScalar(radius);
      wave.material.opacity = Math.sin(wavePhase * Math.PI) * (i % 2 ? .3 : .42);
      wave.rotation.z = i * .37 + visualTime * (i % 2 ? -.014 : .011);
    });
  }
  function restart() {
    epoch = lastElapsed;
    restartCount++;
    update(lastElapsed, still);
  }
  function getState() {
    return {
      particleCount: PARTICLE_COUNT, maxRadius: MAX_RADIUS,
      cycleSeconds: CYCLE_SECONDS, elapsed: localElapsed,
      phase: still ? .70 : phase, reducedMotion: still,
      restartCount, waveCount: waves.length
    };
  }
  update(0);
  return {group, update, restart, getState};
}
