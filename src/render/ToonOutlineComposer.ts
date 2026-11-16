import * as THREE from 'three';

// Row-major equivalents of Three.js 0.187.0 column-major GLSL ACES matrices
// (see node_modules/three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js)
const ACES_INPUT_MAT_INV = new THREE.Matrix3()
  .set(
    0.59719, 0.35458, 0.04823,
    0.07600, 0.90834, 0.01566,
    0.02840, 0.13383, 0.83777
  )
  .invert();

const ACES_OUTPUT_MAT_INV = new THREE.Matrix3()
  .set(
     1.60475, -0.53108, -0.07367,
    -0.10208,  1.10813, -0.00605,
    -0.00327, -0.07276,  1.07602
  )
  .invert();

// Target sRGB bytes for #1A1033: R = 26, G = 16, B = 51
const OUTLINE_SRGB_TARGET: readonly [number, number, number] = [26 / 255, 16 / 255, 51 / 255];

/**
 * Exact inverse of Three.js 0.187.0 GLSL `sRGBTransferOETF` (uses exponent 0.41666).
 */
function inverseThreeSRGBTransferOETF(srgbChannel: number): number {
  const s = THREE.MathUtils.clamp(srgbChannel, 0, 1);
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 1.0 / 0.41666);
}

/**
 * Computes the exact pre-tonemapped Linear-sRGB color so that after Pass 5's
 * `#include <tonemapping_fragment>` + `#include <colorspace_fragment>`, full-strength
 * silhouette edges output exact sRGB `#1A1033` (`rgb(26, 16, 51)`).
 */
function computePreToneMappedOutlineLinear(
  srgb01: readonly [number, number, number],
  toneMapping: THREE.ToneMapping,
  exposureRaw: number,
  outputColorSpace: THREE.WebGLRenderer['outputColorSpace'],
  target: THREE.Vector3
): THREE.Vector3 {
  const exposure = Math.max(1e-4, exposureRaw);
  const yR =
    outputColorSpace === THREE.SRGBColorSpace
      ? inverseThreeSRGBTransferOETF(srgb01[0])
      : srgb01[0];
  const yG =
    outputColorSpace === THREE.SRGBColorSpace
      ? inverseThreeSRGBTransferOETF(srgb01[1])
      : srgb01[1];
  const yB =
    outputColorSpace === THREE.SRGBColorSpace
      ? inverseThreeSRGBTransferOETF(srgb01[2])
      : srgb01[2];

  if (toneMapping === THREE.ACESFilmicToneMapping) {
    // 1. Invert ACESOutputMat: w = ACESOutputMat^-1 * y
    const w = target.set(yR, yG, yB).applyMatrix3(ACES_OUTPUT_MAT_INV);

    // 2. Invert RRTAndODTFit rational quadratic per channel:
    // w * (0.983729 v^2 + 0.4329510 v + 0.238081) = v^2 + 0.0245786 v - 0.000090537
    const invertRrtOdt = (wi: number): number => {
      const wc = THREE.MathUtils.clamp(wi, 0, 0.999);
      const a = 1.0 - 0.983729 * wc;
      const b = 0.0245786 - 0.432951 * wc;
      const c = -(0.000090537 + 0.238081 * wc);
      const disc = Math.max(0, b * b - 4.0 * a * c);
      return Math.max(0, (-b + Math.sqrt(disc)) / (2.0 * a));
    };

    const vR = invertRrtOdt(w.x);
    const vG = invertRrtOdt(w.y);
    const vB = invertRrtOdt(w.z);

    // 3. Invert ACESInputMat and exposure / 0.6 scale
    target.set(vR, vG, vB).applyMatrix3(ACES_INPUT_MAT_INV).multiplyScalar(0.6 / exposure);
    target.set(Math.max(0, target.x), Math.max(0, target.y), Math.max(0, target.z));
    return target;
  }

  if (toneMapping === THREE.LinearToneMapping) {
    return target.set(yR / exposure, yG / exposure, yB / exposure);
  }

  if (toneMapping === THREE.ReinhardToneMapping) {
    return target.set(
      yR / (exposure * Math.max(1e-5, 1.0 - yR)),
      yG / (exposure * Math.max(1e-5, 1.0 - yG)),
      yB / (exposure * Math.max(1e-5, 1.0 - yB))
    );
  }

  return target.set(yR, yG, yB);
}

/**
 * Post-Processing Toon Edge Outline Composer (#1A1033):
 * - Sizes the WebGL2 canvas drawing buffer to 1.5x CSS dimensions (pixelRatio = 1, never stacking DPR)
 *   while keeping CSS layout dimensions strictly at 100% x 100% (cssWidth x cssHeight).
 * - Renders solid 3D geometry normals + depth into a 1.5x single-sample buffer.
 * - Renders opaque lit Toon scene into a 1.5x HalfFloatType (RGBA16F) MSAA buffer (with clean UnsignedByteType fallback).
 * - Applies Normal + Depth edge-detection overlay with pre-compensated linear #1A1033 so ACESFilmic + sRGB outputs exact #1A1033:
 *   - Bold outer silhouette (~1.75px in 1.5x space) via linearized depth jump + grazing-angle view-normal slope compensation.
 *   - Fine inner mechanical part seams (~0.88px in 1.5x space) via view-space normal discontinuity.
 * - Renders Layer-1 non-outlined overlays and transparent VFX AFTER the outline pass into the same depth-preserving MSAA buffer,
 *   guaranteeing zero outline pollution on transparent light effects, particles, shockwaves, range rings, or HP bars!
 */
export class ToonOutlineComposer {
  private renderer: THREE.WebGLRenderer;
  private normalMaterial: THREE.MeshNormalMaterial;
  private normalDepthRT: THREE.WebGLRenderTarget;
  private msaaSceneRT: THREE.WebGLRenderTarget;

  private fsCamera: THREE.OrthographicCamera;
  private quadGeo: THREE.PlaneGeometry;
  private outlineScene: THREE.Scene;
  private outlineMaterial: THREE.ShaderMaterial;
  private blitScene: THREE.Scene;
  private blitMaterial: THREE.ShaderMaterial;
  private prevClearColorScratch = new THREE.Color();

  private ssWidth = 2;
  private ssHeight = 2;
  private readonly supersampleScale = 1.5;
  private readonly sceneRtType: THREE.TextureDataType;
  private readonly msaaSamples: number;

  private cachedToneMapping: THREE.ToneMapping | null = null;
  private cachedExposure = Number.NaN;
  private cachedOutputColorSpace: THREE.WebGLRenderer['outputColorSpace'] | null = null;

  constructor(renderer: THREE.WebGLRenderer, cssWidth: number, cssHeight: number) {
    this.renderer = renderer;
    this.normalMaterial = new THREE.MeshNormalMaterial();

    const initialSS = this.computeSupersampledSize(cssWidth, cssHeight);
    this.ssWidth = initialSS.width;
    this.ssHeight = initialSS.height;

    // Prevent supersampling from stacking on top of devicePixelRatio and size backing store to 1.5x CSS!
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(this.ssWidth, this.ssHeight, false);
    this.renderer.setScissor(0, 0, this.ssWidth, this.ssHeight);

    const depthTexture = new THREE.DepthTexture(this.ssWidth, this.ssHeight);
    if (renderer.capabilities.isWebGL2) {
      depthTexture.type = THREE.UnsignedIntType;
    }
    depthTexture.minFilter = THREE.NearestFilter;
    depthTexture.magFilter = THREE.NearestFilter;

    this.normalDepthRT = new THREE.WebGLRenderTarget(this.ssWidth, this.ssHeight, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      type: THREE.UnsignedByteType,
      depthBuffer: true,
      depthTexture,
      samples: 0, // Single-sample required for direct DepthTexture sampling
    });

    const rtConfig = ToonOutlineComposer.resolveSceneRenderTargetConfig(renderer);
    this.sceneRtType = rtConfig.type;
    this.msaaSamples = rtConfig.samples;

    this.msaaSceneRT = new THREE.WebGLRenderTarget(this.ssWidth, this.ssHeight, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: this.sceneRtType,
      depthBuffer: true,
      resolveDepthBuffer: false,
      samples: this.msaaSamples,
    });

    this.fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);

    const outlineVec = new THREE.Vector3();
    this.outlineMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: false,
      depthWrite: false,
      uniforms: {
        tNormal: { value: this.normalDepthRT.texture },
        tDepth: { value: this.normalDepthRT.depthTexture },
        uResolution: { value: new THREE.Vector2(this.ssWidth, this.ssHeight) },
        uCameraNear: { value: 0.5 },
        uCameraFar: { value: 180.0 },
        uOutlineColor: { value: outlineVec },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        #include <packing>
        uniform sampler2D tNormal;
        uniform sampler2D tDepth;
        uniform vec2 uResolution;
        uniform float uCameraNear;
        uniform float uCameraFar;
        uniform vec3 uOutlineColor;
        varying vec2 vUv;

        float getLinearEyeDepth(vec2 uv) {
          float fragCoordZ = texture2D(tDepth, uv).x;
          float viewZ = perspectiveDepthToViewZ(fragCoordZ, uCameraNear, uCameraFar);
          return -viewZ;
        }

        vec3 getViewNormal(vec2 uv) {
          vec4 raw = texture2D(tNormal, uv);
          if (raw.a < 0.1) return vec3(0.0, 0.0, 1.0);
          return normalize(raw.xyz * 2.0 - 1.0);
        }

        void main() {
          vec2 texel = 1.0 / uResolution;
          vec4 centerRaw = texture2D(tNormal, vUv);
          float dCenter = getLinearEyeDepth(vUv);
          vec3 nCenter = centerRaw.a > 0.1 ? normalize(centerRaw.xyz * 2.0 - 1.0) : vec3(0.0, 0.0, 1.0);

          // 1. BOLD OUTER SILHOUETTE (~1.75px radius in 1.5x buffer):
          // Relaxed relative depth threshold + strong grazing-angle compensation prevents slope stripes!
          float rOuter = 1.75;
          float dN = getLinearEyeDepth(vUv + vec2(0.0, rOuter) * texel);
          float dS = getLinearEyeDepth(vUv + vec2(0.0, -rOuter) * texel);
          float dE = getLinearEyeDepth(vUv + vec2(rOuter, 0.0) * texel);
          float dW = getLinearEyeDepth(vUv + vec2(-rOuter, 0.0) * texel);
          float dNE = getLinearEyeDepth(vUv + vec2(rOuter * 0.72, rOuter * 0.72) * texel);
          float dSW = getLinearEyeDepth(vUv + vec2(-rOuter * 0.72, -rOuter * 0.72) * texel);

          float maxDepthJump = max(
            max(abs(dN - dCenter), abs(dS - dCenter)),
            max(max(abs(dE - dCenter), abs(dW - dCenter)), max(abs(dNE - dCenter), abs(dSW - dCenter)))
          );

          float minDepthRef = min(dCenter, min(min(dN, dS), min(dE, dW)));
          float grazing = 1.0 - abs(nCenter.z);
          // Relaxed depth threshold so tilted ground/armor planes never produce false diagonal bands
          float depthThreshold = minDepthRef * (0.075 + 0.36 * grazing * grazing * grazing);
          float outerSilhouette = smoothstep(depthThreshold, depthThreshold * 1.42, maxDepthJump);

          // Sky/void alpha silhouette backup
          float aMin = min(
            min(texture2D(tNormal, vUv + vec2(0.0, rOuter) * texel).a, texture2D(tNormal, vUv + vec2(0.0, -rOuter) * texel).a),
            min(texture2D(tNormal, vUv + vec2(rOuter, 0.0) * texel).a, texture2D(tNormal, vUv + vec2(-rOuter, 0.0) * texel).a)
          );
          float aMax = max(
            centerRaw.a,
            max(texture2D(tNormal, vUv + vec2(0.0, rOuter) * texel).a, texture2D(tNormal, vUv + vec2(rOuter, 0.0) * texel).a)
          );
          outerSilhouette = max(outerSilhouette, step(0.5, aMax - aMin));

          // 2. FINE INNER MECHANICAL SEAMS (~0.88px radius, driven strictly by view-normal difference):
          float innerSeam = 0.0;
          if (centerRaw.a > 0.5) {
            float rInner = 0.88;
            vec3 n1 = getViewNormal(vUv + vec2(0.0, rInner) * texel);
            vec3 n2 = getViewNormal(vUv + vec2(0.0, -rInner) * texel);
            vec3 n3 = getViewNormal(vUv + vec2(rInner, 0.0) * texel);
            vec3 n4 = getViewNormal(vUv + vec2(-rInner, 0.0) * texel);

            float nDiff = max(
              max(1.0 - dot(nCenter, n1), 1.0 - dot(nCenter, n2)),
              max(1.0 - dot(nCenter, n3), 1.0 - dot(nCenter, n4))
            );
            innerSeam = smoothstep(0.30, 0.52, nDiff) * 0.78;
          }

          float edge = clamp(max(outerSilhouette, innerSeam), 0.0, 1.0);
          if (edge < 0.02) discard;
          gl_FragColor = vec4(uOutlineColor, edge);
        }
      `,
    });
    this.syncOutlineColorUniform();

    this.outlineScene = new THREE.Scene();
    this.outlineScene.add(new THREE.Mesh(this.quadGeo, this.outlineMaterial));

    this.blitMaterial = new THREE.ShaderMaterial({
      depthTest: false,
      depthWrite: false,
      toneMapped: true,
      uniforms: {
        tDiffuse: { value: this.msaaSceneRT.texture },
        uResolution: { value: new THREE.Vector2(this.ssWidth, this.ssHeight) },
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: /* glsl */ `
        uniform sampler2D tDiffuse;
        uniform vec2 uResolution;
        varying vec2 vUv;
        vec3 extractHalo(vec3 c){ float p=max(c.r,max(c.g,c.b)); return min(c*smoothstep(0.88,1.45,p),vec3(3.0)); }
        void main() {
          vec2 ts = 1.0 / uResolution;
          vec4 texel = texture2D(tDiffuse, vUv);
          vec3 bl = (extractHalo(texture2D(tDiffuse,vUv+vec2(2.6,0.0)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-2.6,0.0)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(0.0,2.6)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(0.0,-2.6)*ts).rgb))*0.16 + (extractHalo(texture2D(tDiffuse,vUv+vec2(4.2,4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-4.2,4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(4.2,-4.2)*ts).rgb)+extractHalo(texture2D(tDiffuse,vUv+vec2(-4.2,-4.2)*ts).rgb))*0.09;
          vec2 cv = (vUv - 0.5) * vec2(1.08, 0.96);
          float vig = clamp(1.015 - 0.075 * dot(cv, cv), 0.93, 1.015);
          gl_FragColor = vec4(texel.rgb * vig + bl * 0.25, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }
      `,
    });

    this.blitScene = new THREE.Scene();
    this.blitScene.add(new THREE.Mesh(this.quadGeo, this.blitMaterial));
  }

  private static verifyRgba16fMsaaCompleteness(
    gl: WebGL2RenderingContext,
    samples: number
  ): boolean {
    const prevReadFbo = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevDrawFbo = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING) as WebGLFramebuffer | null;
    const prevRbo = gl.getParameter(gl.RENDERBUFFER_BINDING) as WebGLRenderbuffer | null;
    const prevTex2d = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;

    // Drain any prior GL error flag before probing
    gl.getError();

    const fbo = gl.createFramebuffer();
    let ok = false;

    if (fbo) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
      if (samples > 0) {
        const rbo = gl.createRenderbuffer();
        if (rbo) {
          gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
          gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.RGBA16F, 2, 2);
          gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, rbo);
          const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
          const err = gl.getError();
          ok = status === gl.FRAMEBUFFER_COMPLETE && err === gl.NO_ERROR;
          gl.bindRenderbuffer(gl.RENDERBUFFER, prevRbo);
          gl.deleteRenderbuffer(rbo);
        }
      } else {
        const tex = gl.createTexture();
        if (tex) {
          gl.bindTexture(gl.TEXTURE_2D, tex);
          gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA16F, 2, 2);
          gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
          const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
          const err = gl.getError();
          ok = status === gl.FRAMEBUFFER_COMPLETE && err === gl.NO_ERROR;
          gl.bindTexture(gl.TEXTURE_2D, prevTex2d);
          gl.deleteTexture(tex);
        }
      }
    }

    gl.bindRenderbuffer(gl.RENDERBUFFER, prevRbo);
    gl.bindTexture(gl.TEXTURE_2D, prevTex2d);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevReadFbo);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDrawFbo);
    if (fbo) gl.deleteFramebuffer(fbo);
    return ok;
  }

  private static resolveSceneRenderTargetConfig(renderer: THREE.WebGLRenderer): {
    type: THREE.TextureDataType;
    samples: number;
  } {
    if (!renderer.capabilities.isWebGL2) {
      return { type: THREE.UnsignedByteType, samples: 0 };
    }

    const gl = renderer.getContext() as WebGL2RenderingContext;
    const maxSamples = Math.max(0, renderer.capabilities.maxSamples ?? 0);
    const desiredSamples = maxSamples > 0 ? Math.min(4, maxSamples) : 0;

    // Three.js 0.187.0 WebGLTextures.getInternalFormat() calls extensions.get('EXT_color_buffer_float')
    // whenever HalfFloatType (RGBA16F) is used, emitting a console warning if absent.
    // Check silently with extensions.has() and avoid mobile WEBGL_multisampled_render_to_texture float quirks.
    const hasColorBufferFloat = renderer.extensions.has('EXT_color_buffer_float');
    const hasMultisampledRTT = renderer.extensions.has('WEBGL_multisampled_render_to_texture');

    if (hasColorBufferFloat && !hasMultisampledRTT) {
      if (desiredSamples === 0) {
        if (ToonOutlineComposer.verifyRgba16fMsaaCompleteness(gl, 0)) {
          return { type: THREE.HalfFloatType, samples: 0 };
        }
        return { type: THREE.UnsignedByteType, samples: 0 };
      }

      const supportedSamples = gl.getInternalformatParameter(
        gl.RENDERBUFFER,
        gl.RGBA16F,
        gl.SAMPLES
      ) as Int32Array | null;

      if (supportedSamples && supportedSamples.length > 0) {
        let chosen = 0;
        for (let i = 0; i < supportedSamples.length; i++) {
          const s = supportedSamples[i];
          if (s <= 4 && s > chosen) {
            chosen = s;
          }
        }
        if (chosen === 0 && supportedSamples[supportedSamples.length - 1] > 0) {
          chosen = supportedSamples[supportedSamples.length - 1];
        }
        if (chosen > 0 && ToonOutlineComposer.verifyRgba16fMsaaCompleteness(gl, chosen)) {
          return { type: THREE.HalfFloatType, samples: chosen };
        }
      }
    }

    return {
      type: THREE.UnsignedByteType,
      samples: desiredSamples,
    };
  }

  private computeSupersampledSize(
    cssWidth: number,
    cssHeight: number
  ): { width: number; height: number } {
    const safeCssW = Math.max(2, cssWidth);
    const safeCssH = Math.max(2, cssHeight);
    const gl = this.renderer.getContext();
    const maxRbSize = (gl.getParameter(gl.MAX_RENDERBUFFER_SIZE) as number) || 4096;
    const maxTexSize = this.renderer.capabilities.maxTextureSize || 4096;
    const maxDim = Math.min(3200, maxTexSize, maxRbSize);

    let w = Math.max(2, Math.round(safeCssW * this.supersampleScale));
    let h = Math.max(2, Math.round(safeCssH * this.supersampleScale));
    if (Math.max(w, h) > maxDim) {
      const ratio = maxDim / Math.max(w, h);
      w = Math.max(2, Math.round(w * ratio));
      h = Math.max(2, Math.round(h * ratio));
    }
    return { width: w, height: h };
  }

  private syncOutlineColorUniform(): void {
    const tm = this.renderer.toneMapping;
    const exp = this.renderer.toneMappingExposure;
    const cs = this.renderer.outputColorSpace;
    if (
      tm === this.cachedToneMapping &&
      exp === this.cachedExposure &&
      cs === this.cachedOutputColorSpace
    ) {
      return;
    }
    this.cachedToneMapping = tm;
    this.cachedExposure = exp;
    this.cachedOutputColorSpace = cs;

    computePreToneMappedOutlineLinear(
      OUTLINE_SRGB_TARGET,
      tm,
      exp,
      cs,
      this.outlineMaterial.uniforms.uOutlineColor.value as THREE.Vector3
    );
  }

  public setSize(cssWidth: number, cssHeight: number): void {
    const { width: w, height: h } = this.computeSupersampledSize(cssWidth, cssHeight);

    if (this.renderer.getPixelRatio() !== 1) {
      this.renderer.setPixelRatio(1);
    }

    const canvas = this.renderer.domElement;
    if (canvas.width !== w || canvas.height !== h || this.ssWidth !== w || this.ssHeight !== h) {
      this.renderer.setSize(w, h, false);
      this.renderer.setScissor(0, 0, w, h);
    }

    this.ssWidth = w;
    this.ssHeight = h;
    this.normalDepthRT.setSize(w, h);
    this.msaaSceneRT.setSize(w, h);
    (this.outlineMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);
    (this.blitMaterial.uniforms.uResolution.value as THREE.Vector2).set(w, h);
  }

  public getSupersampledSize(): { width: number; height: number } {
    return { width: this.ssWidth, height: this.ssHeight };
  }

  public getSceneRenderTargetInfo(): { type: THREE.TextureDataType; samples: number } {
    return { type: this.sceneRtType, samples: this.msaaSamples };
  }

  public render(
    solidScene: THREE.Scene,
    vfxScene: THREE.Scene,
    camera: THREE.PerspectiveCamera
  ): void {
    this.syncOutlineColorUniform();
    this.outlineMaterial.uniforms.uCameraNear.value = camera.near;
    this.outlineMaterial.uniforms.uCameraFar.value = camera.far;

    const prevBackground = solidScene.background;
    const prevFog = solidScene.fog;
    const prevLayerMask = camera.layers.mask;
    const prevShadowAutoUpdate = this.renderer.shadowMap.autoUpdate;
    this.renderer.getClearColor(this.prevClearColorScratch);
    const prevClearAlpha = this.renderer.getClearAlpha();

    // Pass 1: Solid Geometry Normal + Depth Buffer on Layer 0 only (1.5x supersampled; skip redundant shadow pass)
    this.renderer.shadowMap.autoUpdate = false;
    camera.layers.set(0);
    solidScene.overrideMaterial = this.normalMaterial;
    solidScene.background = null;
    solidScene.fog = null;
    this.renderer.setRenderTarget(this.normalDepthRT);
    this.renderer.setClearColor(0x000000, 0.0);
    this.renderer.clear(true, true, false);
    this.renderer.render(solidScene, camera);

    // Restore scene & shadow settings for lit pass
    solidScene.overrideMaterial = null;
    solidScene.background = prevBackground;
    solidScene.fog = prevFog;
    this.renderer.shadowMap.autoUpdate = prevShadowAutoUpdate;

    // Pass 2: Lit MeshToonMaterial Solid Scene (Layer 0) into 1.5x HalfFloat MSAA RenderTarget
    this.renderer.setRenderTarget(this.msaaSceneRT);
    this.renderer.setClearColor(this.prevClearColorScratch, prevClearAlpha);
    this.renderer.clear(true, true, false);
    this.renderer.render(solidScene, camera);

    // Pass 3: Post-Process Normal+Depth Edge Outline (#1A1033) without modifying MSAA depth buffer!
    const prevAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.renderer.render(this.outlineScene, this.fsCamera);

    // Pass 4: Non-outlined Layer 1 overlays (shadows, slow rings, HP bars, previews) + Transparent VFX!
    camera.layers.set(1);
    solidScene.background = null;
    this.renderer.render(solidScene, camera);
    solidScene.background = prevBackground;

    camera.layers.set(0);
    this.renderer.render(vfxScene, camera);
    camera.layers.mask = prevLayerMask;
    this.renderer.autoClear = prevAutoClear;

    // Pass 5: 1:1 Resolve to 1.5x Supersampled Screen Buffer with ACESFilmic ToneMapping + sRGB
    this.renderer.setRenderTarget(null);
    this.renderer.setViewport(0, 0, this.ssWidth, this.ssHeight);
    this.renderer.setScissor(0, 0, this.ssWidth, this.ssHeight);
    this.renderer.setScissorTest(false);
    this.renderer.render(this.blitScene, this.fsCamera);
  }

  public dispose(): void {
    this.normalDepthRT.depthTexture?.dispose();
    this.normalDepthRT.dispose();
    this.msaaSceneRT.dispose();
    this.quadGeo.dispose();
    this.normalMaterial.dispose();
    this.outlineMaterial.dispose();
    this.blitMaterial.dispose();
  }
}
