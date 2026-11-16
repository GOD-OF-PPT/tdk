import * as THREE from 'three';

export interface SharedToonTextures {
  grad4Standard: THREE.DataTexture;
  grad4Metal: THREE.DataTexture;
  lunarDeck: THREE.CanvasTexture;
  haulRoad: THREE.CanvasTexture;
  softGlow: THREE.CanvasTexture;
  ringWave: THREE.CanvasTexture;
  hazardZone: THREE.CanvasTexture;
  shadowBlob: THREE.CanvasTexture;
}

let cachedTextures: SharedToonTextures | null = null;

/**
 * Creates a crisp 4-band stepped gradient map for THREE.MeshToonMaterial.
 * NearestFilter + generateMipmaps=false ensures clean cel-shaded steps without muddy gradients.
 */
function createSteppedGradientTexture(bands: number[]): THREE.DataTexture {
  const width = bands.length;
  const data = new Uint8Array(width * 4);
  for (let i = 0; i < width; i++) {
    const v = Math.max(0, Math.min(255, Math.round(bands[i])));
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, width, 1, THREE.RGBAFormat);
  tex.minFilter = THREE.NearestFilter;
  tex.magFilter = THREE.NearestFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function makeLunarDeckTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;

  // Restrained blue-grey / purple-grey lunar station concrete & regolith dust
  ctx.fillStyle = '#2b3347';
  ctx.fillRect(0, 0, 512, 512);

  // Subtle industrial slab variations
  const patches = [
    [0, 0, 256, 256, '#2e374d'],
    [256, 256, 256, 256, '#283044'],
    [256, 0, 256, 256, '#302e46'],
    [0, 256, 256, 256, '#293246'],
  ] as const;
  for (const [x, y, w, h, col] of patches) {
    ctx.fillStyle = col;
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  }

  // Subtle lunar regolith speckles (low contrast so units pop cleanly)
  for (let i = 0; i < 420; i++) {
    const x = (i * 97) % 512;
    const y = (i * 151) % 512;
    const r = 1 + (i % 3);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.025)' : 'rgba(12,14,24,0.08)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Modular industrial plate seams (subtle dark & highlight bevel)
  ctx.strokeStyle = 'rgba(18, 20, 34, 0.52)';
  ctx.lineWidth = 4;
  for (let p = 0; p <= 512; p += 128) {
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, 512);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(512, p);
    ctx.stroke();
  }

  // Corner rivet dots & muted maintenance tick marks
  ctx.fillStyle = 'rgba(148, 168, 202, 0.16)';
  for (let x = 0; x < 512; x += 128) {
    for (let y = 0; y < 512; y += 128) {
      ctx.fillRect(x + 10, y + 10, 5, 5);
      ctx.fillRect(x + 113, y + 10, 5, 5);
      ctx.fillRect(x + 10, y + 113, 5, 5);
      ctx.fillRect(x + 113, y + 113, 5, 5);
    }
  }

  // Muted industrial maintenance markings on occasional tiles
  ctx.fillStyle = 'rgba(245, 158, 11, 0.16)';
  ctx.fillRect(142, 18, 36, 6);
  ctx.fillStyle = 'rgba(76, 201, 224, 0.14)';
  ctx.fillRect(398, 274, 28, 5);

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(6.5, 4.2);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeHaulRoadTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  // Dark purple-slate recessed haulage track
  ctx.fillStyle = '#1e2233';
  ctx.fillRect(0, 0, 256, 256);

  // Heavy crawler wheel ruts
  ctx.fillStyle = '#181b2a';
  ctx.fillRect(0, 42, 256, 42);
  ctx.fillRect(0, 172, 256, 42);

  // Industrial hazard curb stripes along top & bottom edges
  ctx.fillStyle = '#2d354c';
  ctx.fillRect(0, 0, 256, 22);
  ctx.fillRect(0, 234, 256, 22);

  ctx.fillStyle = 'rgba(245, 158, 11, 0.52)';
  for (let x = -32; x < 288; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 22, 0);
    ctx.lineTo(x + 10, 16);
    ctx.lineTo(x - 12, 16);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(x, 256);
    ctx.lineTo(x + 22, 256);
    ctx.lineTo(x + 10, 240);
    ctx.lineTo(x - 12, 240);
    ctx.closePath();
    ctx.fill();
  }

  // Subtle directional guide chevron down center
  ctx.strokeStyle = 'rgba(94, 206, 232, 0.28)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(96, 86);
  ctx.lineTo(148, 128);
  ctx.lineTo(96, 170);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeSoftGlowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.32, 'rgba(255,255,255,0.62)');
  g.addColorStop(0.7, 'rgba(255,255,255,0.14)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

function makeRingWaveTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(128, 128, 68, 128, 128, 124);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.55, 'rgba(255,255,255,0.22)');
  g.addColorStop(0.84, 'rgba(255,255,255,0.95)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

function makeHazardZoneTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const ctx = c.getContext('2d')!;

  const g = ctx.createRadialGradient(128, 128, 18, 128, 128, 122);
  g.addColorStop(0, 'rgba(255, 56, 68, 0.14)');
  g.addColorStop(0.75, 'rgba(255, 56, 68, 0.28)');
  g.addColorStop(0.93, 'rgba(255, 75, 58, 0.92)');
  g.addColorStop(1, 'rgba(255, 56, 68, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 256);

  // Dashed inner warning ring
  ctx.strokeStyle = 'rgba(255, 190, 92, 0.85)';
  ctx.lineWidth = 5;
  ctx.setLineDash([16, 12]);
  ctx.beginPath();
  ctx.arc(128, 128, 86, 0, Math.PI * 2);
  ctx.stroke();

  return new THREE.CanvasTexture(c);
}

function makeShadowBlobTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
  g.addColorStop(0, 'rgba(12, 10, 26, 0.62)');
  g.addColorStop(0.6, 'rgba(12, 10, 26, 0.30)');
  g.addColorStop(1, 'rgba(12, 10, 26, 0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(c);
}

export function getToonTextures(): SharedToonTextures {
  if (!cachedTextures) {
    cachedTextures = {
      // 4-step soft toy-enamel cel ramp (shadow -> mid-dark -> lit -> crisp bevel highlight)
      grad4Standard: createSteppedGradientTexture([88, 128, 172, 212, 240, 255]),
      // 4-step non-mirror brushed industrial metal cel ramp (distinct dark/light steps + crisp top band)
      grad4Metal: createSteppedGradientTexture([64, 108, 154, 202, 236, 255]),
      lunarDeck: makeLunarDeckTexture(),
      haulRoad: makeHaulRoadTexture(),
      softGlow: makeSoftGlowTexture(),
      ringWave: makeRingWaveTexture(),
      hazardZone: makeHazardZoneTexture(),
      shadowBlob: makeShadowBlobTexture(),
    };
  }
  return cachedTextures;
}

export interface ToonMatOptions {
  metallicStep?: boolean;
  emissive?: number;
  emissiveIntensity?: number;
  rimColor?: number;
  rimStrength?: number;
  map?: THREE.Texture;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Creates a stylized THREE.MeshToonMaterial with 4-step gradient map and optional
 * stepped Fresnel rim light (used for Tier-colored silhouette accents!).
 */
export function makeToonMaterial(colorHex: number, opts: ToonMatOptions = {}): THREE.MeshToonMaterial {
  const tex = getToonTextures();
  const mat = new THREE.MeshToonMaterial({
    color: colorHex,
    gradientMap: opts.metallicStep ? tex.grad4Metal : tex.grad4Standard,
    map: opts.map ?? null,
    emissive: opts.emissive !== undefined ? new THREE.Color(opts.emissive) : new THREE.Color(0x000000),
    emissiveIntensity: opts.emissiveIntensity ?? 0,
    transparent: opts.transparent ?? false,
    opacity: opts.opacity ?? 1,
  });

  if (true) {
    const hasRim = opts.rimColor !== undefined || Boolean(opts.rimStrength && opts.rimStrength > 0);
    const rimUniform = { value: new THREE.Color(opts.rimColor ?? 0x67e8f9) };
    const strengthUniform = { value: hasRim ? (opts.rimStrength ?? 0.34) : 0.09 };
    mat.userData.rimColorUniform = rimUniform;
    mat.userData.rimStrengthUniform = strengthUniform;

    mat.customProgramCacheKey = () => 'toon-tier-rim-v2';
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTierRimColor = rimUniform;
      shader.uniforms.uTierRimStrength = strengthUniform;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `#include <common>
        uniform vec3 uTierRimColor;
        uniform float uTierRimStrength;`
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <opaque_fragment>',
        `float rimNdotV = clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0);
        float steppedRim = smoothstep(0.60, 0.84, 1.0 - rimNdotV) + smoothstep(0.86, 0.97, 1.0 - rimNdotV) * 0.42;
        vec3 halfV = normalize(normalize(vViewPosition) + vec3(0.28, 0.88, 0.38));
        float celSpec = smoothstep(0.94, 0.98, clamp(dot(normalize(normal), halfV), 0.0, 1.0));
        outgoingLight += uTierRimColor * steppedRim * uTierRimStrength + vec3(0.96, 0.98, 1.0) * celSpec * 0.05;
        #include <opaque_fragment>`
      );
    };
  }

  return mat;
}

export function setMaterialRimColor(mat: THREE.MeshToonMaterial, rimHex: number, strength = 0.36): void {
  if (mat.userData.rimColorUniform) {
    (mat.userData.rimColorUniform.value as THREE.Color).setHex(rimHex);
  }
  if (mat.userData.rimStrengthUniform) {
    mat.userData.rimStrengthUniform.value = strength;
  }
}

// Unified palette constants for strict faction & world harmony
export const PALETTE = {
  // Player Mecha Towers
  CREAM_ARMOR: 0xf3efe6,
  CREAM_SHADOW: 0xdcd5c7,
  DEEP_BLUE_FRAME: 0x223458,
  DEEP_BLUE_DARK: 0x17243f,
  HAZard_ORANGE: 0xf59e0b,
  JOINT_STEEL: 0x384664,
  RIVET_LIGHT: 0xcbd5e1,

  // Enemies (Dark grey, rust-red, red optical sensors)
  ENEMY_DARK_GREY: 0x353844,
  ENEMY_CHASSIS: 0x262833,
  ENEMY_RUST_RED: 0x9b392d,
  ENEMY_RUST_BRIGHT: 0xbe4837,
  ENEMY_SENSOR_RED: 0xff2b3d,

  // Lunar Station Environment
  LUNAR_SLATE: 0x2b3347,
  LUNAR_PURPLE_GREY: 0x332f48,
  LUNAR_ROCK_DARK: 0x232436,
  LUNAR_COOL_CYAN: 0x4cc9e0,

  // Unified Outline
  OUTLINE_DARK: 0x1a1033,
} as const;
