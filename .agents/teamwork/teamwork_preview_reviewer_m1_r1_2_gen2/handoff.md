# Milestone M1 (`render-3d-outline`) Code & Graphics Review — `teamwork_preview_reviewer_m1_r1_2_gen2`

- **Reviewer**: `teamwork_preview_reviewer_m1_r1_2_gen2` (WebGL2 Pipeline, Shader Math & TypeScript Strictness Focus)
- **Target**: `teamwork_preview_worker_m1_r1_1_gen2` (Milestone M1)
- **To**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- **Verdict: **APPROVE****

---

## 1. Scope & Non-Interference Audit

- Inspected `git status --short` and `ls -la --full-time` across `src/` and `dist/`:
  - Only the 5 authorized M1 files (`src/types.ts`, `src/render/BeaconAndPropsFactory.ts`, `src/render/TowerFactory.ts`, `src/render/ToonOutlineComposer.ts`, `src/fx/VfxManager.ts`) carry M1 changes.
  - Zero modifications to `src/game/*`, `src/config/*`, `src/audio/*`, `src/ui/*`, `src/main.ts`, `src/style.css`, `package.json`, or `tests/**`.
  - `./dist/` (`2026-11-14 05:40:50 UTC`) and port `:5173` remain 100% untouched.

---

## 2. Detailed Technical Verification

### A. M1.3 / Contract 3 — WebGL2 Pipeline & `#1A1033` Shader Math (`src/render/ToonOutlineComposer.ts`)
1. **`1.5x` Canvas Backing Store & Zero DPR Stacking**:
   - `constructor` (`ToonOutlineComposer.ts:138-145`) and `setSize` (`ToonOutlineComposer.ts:468-486`) enforce `this.renderer.setPixelRatio(1)` and `this.renderer.setSize(w, h, false)` (`updateStyle = false`), where `(w, h)` come from `computeSupersampledSize` (`ToonOutlineComposer.ts:423-442`, `supersampleScale = 1.5`, capped proportionally at `Math.min(3200, maxTexSize, maxRbSize)`, never multiplying `window.devicePixelRatio`).
   - CSS layout dimensions remain `100% x 100%` (`cssWidth x cssHeight`), preserving `1:1` alignment with `this.canvas.getBoundingClientRect()` in `GameEngine.ts:1469` (`handleCanvasTap` raycasting) and `GameEngine.ts:1620` (`projectWorldToScreen`).
   - Pass 5 (`ToonOutlineComposer.ts:551-556`) resolves to `null` with `setViewport(0, 0, this.ssWidth, this.ssHeight)` and `setScissor(0, 0, this.ssWidth, this.ssHeight)` (`1:1` with the `1.5x` drawing buffer).
2. **Silent `RGBA16F` MSAA / Single-Sample FBO Probe & GL Binding Restoration**:
   - `resolveSceneRenderTargetConfig` (`ToonOutlineComposer.ts:368-421`) checks `renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('WEBGL_multisampled_render_to_texture')` via `extensions.has()` (which invokes `gl.getExtension` without triggering `WebGLExtensions.get()`'s `warnOnce` on unsupported devices), queries `gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES)`, and verifies actual FBO attachment completeness via `verifyRgba16fMsaaCompleteness` (`ToonOutlineComposer.ts:316-366`) for both `samples > 0` (`renderbufferStorageMultisample`) and `samples === 0` (`texStorage2D`).
   - Prior `READ_FRAMEBUFFER_BINDING`, `DRAW_FRAMEBUFFER_BINDING`, `RENDERBUFFER_BINDING`, and `TEXTURE_BINDING_2D` bindings are saved and restored before deleting temporary probe handles (`ToonOutlineComposer.ts:320-365`), with clean fallback to `{ type: THREE.UnsignedByteType, samples: desiredSamples }` and `resolveDepthBuffer: false` (`ToonOutlineComposer.ts:172`).
3. **Closed-Form Inverse `ACESFilmicToneMapping` + `sRGBTransferOETF` `#1A1033` Math**:
   - Cross-checked `ACES_INPUT_MAT_INV` & `ACES_OUTPUT_MAT_INV` (`ToonOutlineComposer.ts:5-19`), quadratic `invertRrtOdt` (`ToonOutlineComposer.ts:64-71`), exposure scale `0.6 / exposure` (`ToonOutlineComposer.ts:78`), and `inverseThreeSRGBTransferOETF` (`ToonOutlineComposer.ts:27-30`, matching Three.js `0.187.0` `colorspace_pars_fragment.glsl.js:12` exponent `0.41666`) against `node_modules/three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js:35-74`.
   - Independent forward-shader + `Float16Array` (`RGBA16F`) quantization check at `exposure = 1.04` produced `uOutline = [0.025456, 0.015219, 0.053531]` -> exact `outBytes = [26, 16, 51]` (`#1A1033`, `±0` byte error).
   - Pass 5 `blitMaterial` (`ToonOutlineComposer.ts:286-310`) sets `toneMapped: true` and `gl_FragColor = vec4(texel.rgb, 1.0);` (`line 305`) before `#include <tonemapping_fragment>` and `#include <colorspace_fragment>`, preventing canvas alpha-compositing darkening.
4. **Slope Compensation & Pass-4 VFX Outline Immunity**:
   - `grazing = 1.0 - abs(nCenter.z)` cubic slope compensation `minDepthRef * (0.075 + 0.36 * grazing * grazing * grazing)` (`ToonOutlineComposer.ts:243-246`), `rOuter = 1.75` (`line 229`), and `rInner = 0.88` (`line 262`) are intact.
   - Pass 3 (`lines 535-538`) renders with `depthTest: false, depthWrite: false`, preserving `msaaSceneRT` hardware depth for Pass 4 (`lines 540-549`) where Layer 1 overlays and `vfxScene` render completely after edge detection.

### B. M1.1 — Solid 3D Return Beacon Dish & Gantry (`src/render/BeaconAndPropsFactory.ts`)
- Replaced the single-sided open cone with closed manifold 3D solids (`BeaconAndPropsFactory.ts:228-486`): `upperMastCollar` (`y = 1.70`), `coreSocketRing` (`y = 1.76`), 3-strut gantry cage at `60°/180°/300°` (clearing rotating `coreMesh` `r <= 0.38m` at `y = 1.98` and `0°/120°/240°` `signalFins`), open-bore `azimuthRing` (`y = 2.50`, inner bore `r = 0.29m > skyBeam r = 0.249m`), beveled `dishShell` + `dishRim` + `innerReflector` + `emitterHorn` + `emitterLens`, and `-Z` `transceiverPod` counterweight.
- Zero `openEnded === true` geometries on Layer 0 (`skyBeam` at `line 489` is strictly `layers.set(1)` at `line 504`). `ReturnBeaconRig` interface (`lines 14-21, 507`) is 100% preserved.

### C. M1.2 / Contract 1 — `TowerRig`, T3 Sub-Parts, Flap Hinges & TypeScript Strictness (`src/types.ts`, `src/render/TowerFactory.ts`)
- `tsconfig.json` strictness (`verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`): `import type` used cleanly in `src/types.ts:1`, `BeaconAndPropsFactory.ts:4`, and `TowerFactory.ts:4`; zero enums or parameter properties.
- `FlapHingeAxis`, `HingedFlapUserData`, and `idleCore?: THREE.Object3D` added cleanly in `src/types.ts:119-151` without altering existing `TowerRig` fields; `idleCore` populated with `restPos`/`restScale` (`tagIdleCore`, `TowerFactory.ts:77-81`) on all 3 towers (`lines 237, 471, 706`).
- All 3 promised T3 secondary 3D sub-parts added inside `t3Turret` with `tagArcFlyPart`: Autocannon `topRadiatorGrp` (`lines 330-380`), Mortar `rangefinderArm` (`lines 532-612`), and Magnetic `3 × fluxPylon` (`lines 734-796`).
- Right-hand-rule outward/upward `openAngle` signs verified on all 10 `hingedFlaps`: Autocannon `'x'` (`-0.58` T3 louvers `line 376`, `-0.55` T4 flaps `line 416`), Mortar `'y'` (`-sx * 0.58` outward rear bay doors `line 635`), Magnetic `'z'` (`-0.48` outward radial crown petals `line 815`).
- Magnetic upper emitter (`outerRingGrp`, `coreMesh`, `muzzle`) parented under `weaponPitch` at `(0, 1.15, 0)` (`lines 647-710`, world rest `y = 1.49` preserved, `weaponPitch.children.length === 3`).
- `setTowerTierVisibility(rig, tier)` (`lines 860-869`) and `applyTowerTierVisuals(rig, tier, options?)` (`lines 871-893`) exported cleanly.

### D. M1.4 / Contract 2 — Non-Bleaching Chest VFX & GPU Resource Disposal (`src/fx/VfxManager.ts`)
- `spawnChestOpenCelebration(worldPos)` (`VfxManager.ts:298-324`) spawns 3 expanding gold/cyan ground rings + 18 rim sparkles + front clasp sparks with **zero** vertical `AdditiveBlending` cylinder; `spawnClimaxBurst` (`lines 255-291`) remains untouched.
- GPU memory lifecycle verified leak-free and corruption-free:
  - `rustDebrisMat` & `greyDebrisMat` (`lines 79-80`) shared across `debris3D` and disposed only in `VfxManager.dispose()` (`lines 711-712`).
  - `disposeMortarShell` (`lines 635-651`) disposes `Sprite.material` without touching `THREE.Sprite.geometry` (global singleton) or shared `getToonTextures().softGlow`.
  - `disposePickupGroup` (`lines 653-668`) deduplicates intra-coin/crystal shared materials (`rimMat`, `gemMat`) via `Set` before `.dispose()`, leaving shared `getToonTextures()` gradient maps intact.
  - `clearAll()` (`lines 670-701`) and `dispose()` (`lines 703-713`) cleanly release all transient and instance-owned GPU resources without double-dispose.

---

## 3. Empirical Build & Compiler Verification

- `npx tsc --noEmit` -> **exit `0`** (zero errors).
- `npx vite build --outDir /tmp/tdk_m1_rev2_dist` -> **exit `0`** (`22 modules transformed`, built in `473ms`).
- `rm -rf /tmp/tdk_m1_rev2_dist && test ! -e /tmp/tdk_m1_rev2_dist` -> **`TMP_CLEAN`**.
