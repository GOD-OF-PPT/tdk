# M1 Deliverable 3 Technical Analysis — `1.5x` Supersampling Canvas Buffer & Exact `#1A1033` Post-Processing Outline

- **Explorer**: `teamwork_preview_explorer_m1_r1_1` (Outline & WebGL2 Pipeline Architect)
- **Milestone**: `M1` (`render-3d-outline`)
- **Primary Target File**: `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts` (`lines 1-292`)
- **Inspected Read-Only Files**:
  - `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts` (`lines 1-346`)
  - `/home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts` (`lines 111-281, 690-740, 1453-1505, 1603-1650`)
  - `/home/antigravity/GOD-OF-PPT/tdk/src/main.ts` (`lines 1-54`)
  - `/home/antigravity/GOD-OF-PPT/tdk/src/style.css` (`lines 27-105`)
  - `/home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts` (`lines 80-457`)
  - `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e.mjs` (`lines 1-472`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/WebGLRenderer.js` (`v0.187.0`, `lines 313-341, 390-400, 642-886, 1744-1826, 2025-2041, 2397-2425, 2960-3127`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/webgl/WebGLTextures.js` (`v0.187.0`, `lines 9, 132-255, 725-734, 1734-1839, 2156-2191, 2339-2473`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/webgl/WebGLExtensions.js` (`v0.187.0`, `lines 25-56`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js` (`lines 35-74`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/shaders/ShaderChunk/colorspace_pars_fragment.glsl.js` (`lines 7-13`)
  - `/home/antigravity/GOD-OF-PPT/tdk/node_modules/three/src/renderers/shaders/ShaderLib/meshtoon.glsl.js` (`lines 81-118`)

---

## 1. Observation

### 1.1 Defect D3 — `1.5x -> 1.0x` Canvas Backing-Store Downsample Blur
1. In `src/render/ToonOutlineComposer.ts`:
   - `constructor(renderer, cssWidth, cssHeight)` (`lines 30-39`) sets `this.renderer.setPixelRatio(1)` (`line 33`) and computes `this.ssWidth = Math.max(2, Math.round(cssWidth * 1.5))` and `this.ssHeight = Math.max(2, Math.round(cssHeight * 1.5))` (`lines 37-38`), **without** clamping against `maxDim` (`3200`) or `maxTextureSize` and **without** sizing `this.renderer`.
   - `setSize(cssWidth, cssHeight)` (`lines 207-227`) executes:
     ```ts
     const safeW = Math.max(2, Math.round(cssWidth));
     const safeH = Math.max(2, Math.round(cssHeight));
     this.renderer.setPixelRatio(1);
     this.renderer.setSize(safeW, safeH, false);
     ```
     while allocating `normalDepthRT` and `msaaSceneRT` at `1.5x` dimensions `(w, h)` (`lines 214-226`).
2. Inside Three.js `0.187.0` (`WebGLRenderer.js:673-703`), `renderer.setSize(safeW, safeH, false)` sets:
   - `_width = safeW`, `_height = safeH`
   - `canvas.width = Math.floor(safeW * 1) = safeW` (`1.0x` CSS pixels)
   - `canvas.height = Math.floor(safeH * 1) = safeH` (`1.0x` CSS pixels)
   - `_viewport = (0, 0, safeW, safeH)` (`line 701`), while leaving `_scissor` at its constructor value `(0, 0, 300, 150)` (`line 339`).
3. In Pass 5 (`ToonOutlineComposer.ts:280-281`), `this.renderer.setRenderTarget(null)` binds the `1.0x` default framebuffer with `_currentViewport = (0, 0, safeW, safeH)` (`WebGLRenderer.js:3073`), downsampling the `1.5x` `msaaSceneRT` (`585 x 1266` on `390 x 844` mobile) into `390 x 844` (discarding $1 - (1/1.5)^2 = 55.6\%$ of rendered pixels). On `devicePixelRatio = 2` or `3` displays, the browser compositor then stretches `390 x 844` back up to `780 x 1688` or `1170 x 2532`, visibly blurring 3D geometry and diluting thin inner `#1A1033` seams via non-integer `1.5`-texel bilinear filtering.
4. Exhaustive caller audit across `src/**` and `tests/**`:
   - `renderer.getSize(...)`: **0 calls** anywhere in `src/` or `tests/`.
   - `renderer.getDrawingBufferSize(...)`: **0 calls** anywhere in `src/` or `tests/`.
   - `canvas.width` / `canvas.height`: **0 reads** anywhere in `src/` or `tests/`.
   - `GameEngine.getViewportSize()` (`src/game/GameEngine.ts:225-233`): reads `this.canvas.parentElement.clientWidth / clientHeight` (`#app` CSS layout size).
   - `ResizeObserver` (`src/game/GameEngine.ts:215-218`): observes `this.canvas.parentElement` (`#app`), NOT `this.canvas`.
   - `GameEngine.handleCanvasTap` (`src/game/GameEngine.ts:1468-1474`) and `GameEngine.projectWorldToScreen` (`src/game/GameEngine.ts:1617-1625`, called by `getPadScreenCoordinates`, `getBeaconScreenCoordinates`, `getEntranceScreenCoordinates` at `lines 1603-1615`): both read `this.canvas.getBoundingClientRect()` (`rect.left, rect.top, rect.width, rect.height` in CSS pixels).
   - `#game-canvas` CSS (`src/style.css:86-93`): `position: absolute; inset: 0; width: 100%; height: 100%; display: block;`.

### 1.2 Defect D4a — 8-Bit `UnsignedByteType` Clamping & `HalfFloatType` MSAA Requirements in Three.js `0.187.0`
1. `msaaSceneRT` (`ToonOutlineComposer.ts:59-65`) currently uses `type: THREE.UnsignedByteType` (`RGBA8`), which:
   - Clamps all HDR linear emissives $> 1.0$ (`beacon.coreMesh` `1.35`, `statusLampMats` `1.8`, Boss `weakPointCore` `2.1`) to `1.0` in Pass 2 prior to Pass 5 `ACESFilmicToneMapping`.
   - Quantizes dark linear colors near `#1A1033` into coarse $1/255$ linear steps (`~4` sRGB units per step).
   - Leaves `resolveDepthBuffer: true` by default (`RenderTarget.js:66`), causing `updateMultisampleRenderTarget` (`WebGLTextures.js:2384-2403`) to blit `DEPTH_BUFFER_BIT` alongside `COLOR_BUFFER_BIT` 4 times per frame even though `msaaSceneRT` has no `depthTexture` and Pass 5 only samples `msaaSceneRT.texture`.
2. In Three.js `0.187.0` (`WebGLTextures.js:236, 245-251`), when a render target uses `type: THREE.HalfFloatType` + `format: THREE.RGBAFormat`:
   - `glInternalFormat` resolves to `_gl.RGBA16F`.
   - Line `249` **unconditionally** executes `extensions.get('EXT_color_buffer_float')`.
   - In `WebGLExtensions.js:42-50`, `extensions.get(name)` calls `warnOnce('WebGLRenderer: ' + name + ' extension not supported.')` if `EXT_color_buffer_float` is `null` — **even if `EXT_color_buffer_half_float` is supported**!
   - Meanwhile, `renderer.extensions.has('EXT_color_buffer_float')` (`WebGLExtensions.js:25-28`) checks support silently with zero console warnings.
   - Note also `WebGLTextures.js:727`: linear texture filtering only checks `OES_texture_float_linear` for `FloatType`, NOT `HalfFloatType`, because `RGBA16F` is natively `TEXTURE_FILTERABLE` in core WebGL 2.0 / OpenGL ES 3.0.
   - Empirical probe on this VM's Headless Chromium SwiftShader (`--use-gl=angle --use-angle=swiftshader`): `EXT_color_buffer_float = true`, `WEBGL_multisampled_render_to_texture = false`, `MAX_SAMPLES = 4`, `gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES) = [4]`, `checkFramebufferStatus = 36053 (FRAMEBUFFER_COMPLETE)`, `gl.getError() = 0`.

### 1.3 Defect D4b — `ACESFilmicToneMapping` Toe-Crush on `#1A1033` & Pass-4 VFX Overlay Priority
1. Pass order in `ToonOutlineComposer.render()` (`lines 243-282`):
   - **Pass 1** (`normalDepthRT`, `samples: 0`): Renders `solidScene` **Layer 0** with `MeshNormalMaterial` (view-space normals in RGB, alpha `1.0` on solid geometry vs `0.0` void, hardware depth in `depthTexture`). Includes towers, enemies, Boss, Lunar Station slabs/props, Return Beacon solid body, 3D Supply Crate, 3D Gold Coins, 3D Energy Crystals, and 3D armor debris (`VfxManager.ts:302, 383`).
   - **Pass 2** (`msaaSceneRT`, `samples: 4`): Clears color+depth and renders lit `MeshToonMaterial` `solidScene` **Layer 0** in **un-tonemapped Linear-sRGB** (`WebGLRenderer.js:2405, 2414-2424` disables tone mapping and sRGB transfer whenever `_currentRenderTarget !== null`). Writes solid Layer-0 depth into `msaaSceneRT`'s 4x MSAA depth renderbuffer.
   - **Pass 3** (`msaaSceneRT`, `autoClear = false`): Alpha-blends `outlineScene` (`depthTest: false, depthWrite: false`) with `gl_FragColor = vec4(uOutlineColor, edge)`, where `rOuter = 1.75`, `grazing = 1.0 - abs(nCenter.z)`, `depthThreshold = minDepthRef * (0.075 + 0.36 * grazing^3)`, and `rInner = 0.88` (`innerSeam = smoothstep(0.30, 0.52, nDiff) * 0.78`). Preserves Pass 2's 4x MSAA depth buffer intact.
   - **Pass 4** (`msaaSceneRT`, `autoClear = false`):
     - Pass 4a (`camera.layers.set(1)`): Renders `solidScene` **Layer 1** (`shadowBlob`, `slowRing`, `hpBarGroup`, `ghost` tower preview, `skyBeam`, Boss ground fissures, chest `innerGlow`, pad `ring`, `selectRing`, `rangeRing`) depth-tested against Pass 2's solid depth buffer.
     - Pass 4b (`camera.layers.set(0)`): Renders `vfxScene` (`tracers`, `mortarShells`, `rings`, `sparks`, `bossWarningMesh`) depth-tested against Pass 2's solid depth buffer.
   - **Pass 5** (`setRenderTarget(null)`): `blitMaterial` (`toneMapped: true`) samples `msaaSceneRT.texture` and runs `#include <tonemapping_fragment>` (`ACESFilmicToneMapping` at `toneMappingExposure = 1.04`, `GameEngine.ts:129-130`) followed by `#include <colorspace_fragment>` (`sRGBTransferOETF`).
2. Currently (`ToonOutlineComposer.ts:71, 83`), `uOutlineColor` is initialized to `new THREE.Color(0x1a1033)` = `(0.010330, 0.005182, 0.033105)` Linear-sRGB **without** compensating for Pass 5's `ACESFilmicToneMapping`. In Pass 5, `RRTAndODTFit` (`v * (v + 0.0245786) - 0.000090537`) toe-crushes those dark linear values down to `rgb(8, 3, 32)` (`#080320`) in `HalfFloatType` and `rgb(9, 2, 31)` (`#09021f`) in `UnsignedByteType` (and `~#150628` where `1.5x -> 1.0x` bilinear downsampling mixed adjacent armor/slate texels into the crushed outline!).

---

## 2. Logic Chain & Exact Mathematical Derivations

### 2.1 Why `renderer.setSize(ssWidth, ssHeight, false)` with `setPixelRatio(1)` Preserves Layout & Input 100%
1. When `this.renderer.setPixelRatio(1)` and `this.renderer.setSize(this.ssWidth, this.ssHeight, false)` execute:
   - `canvas.width = this.ssWidth` ($\approx 1.5 \times \text{cssWidth}$), `canvas.height = this.ssHeight` ($\approx 1.5 \times \text{cssHeight}$), never multiplying `window.devicePixelRatio`.
   - Because `updateStyle === false`, `canvas.style.width` and `canvas.style.height` are never written; `#game-canvas` CSS (`width: 100%; height: 100%`) keeps `canvas.getBoundingClientRect()` strictly at `(cssWidth, cssHeight)`.
   - `GameEngine.handleCanvasTap` (`lines 1469-1473`) normalizes pointer `clientX, clientY` against `rect.width, rect.height` (`cssWidth, cssHeight`) into NDC $[-1, +1]^2$, which is resolution-independent and matches `this.camera.aspect = cssWidth / cssHeight`.
   - `GameEngine.projectWorldToScreen` (`lines 1617-1625`) maps NDC $[-1, +1]^2$ onto `rect.left + ((p.x + 1) * 0.5) * rect.width`, returning exact CSS client coordinates for Playwright mouse clicks and touch taps (`tests/e2e.mjs:78-81, 432-446`).
   - Pass 5 renders `msaaSceneRT` (`ssWidth x ssHeight`) 1:1 onto the default framebuffer (`ssWidth x ssHeight`) with zero `1.5x -> 1.0x` bilinear blur dilution!

### 2.2 Why Blending `#1A1033` in Pass 5 Is Forbidden vs Why Exact Inverse Tone-Mapping in Pass 3 Is Optimal
- **Rejected Approach (Pass 5 Post-Tonemap Outline Mix)**: If Pass 5 sampled `normalDepthRT` and mixed `#1A1033` *after* `#include <tonemapping_fragment>`, the outline would be drawn **on top of Pass 4** (`hpBarGroup`, `rangeRing`, `selectRing`, `mortarShells`, `rings`, `sparks`, `skyBeam`), slicing dark `#1A1033` lines right across enemy HP bars, shockwaves, and particles!
- **Rejected Approach (Extra Stencil / Extra RenderTarget)**: Adding a 3rd fullscreen `WebGLRenderTarget` for an outline mask or Pass-4 mask increases VRAM bandwidth by 33% at `1.5x` resolution for zero benefit when `ACESFilmicToneMapping` is strictly bijective and analytically invertible on $[0, 1]^3$!
- **Selected Optimal Architecture (Closed-Form Inverse Tone-Mapped `uOutlineColor` in Pass 3 + `HalfFloatType` `msaaSceneRT`)**:
  - Pass 3 continues to render *before* Pass 4 into `msaaSceneRT` (preserving 100% Pass 4 overlay priority AND 4x MSAA solid depth occlusion for behind-geometry VFX, plus smooth linear-light blending on `0.78`-alpha inner mechanical seams and `grazing^3` slope compensation).
  - Setting `uOutlineColor` to the exact closed-form inverse of Three.js `0.187.0`'s tone-mapping + sRGB OETF guarantees Pass 5 outputs **exact `rgb(26, 16, 51)` (`#1A1033`)** on full-strength silhouettes!

### 2.3 Closed-Form Inversion of Three.js `0.187.0` `sRGBTransferOETF` + `ACESFilmicToneMapping`

#### Step A — Exact Inverse of `sRGBTransferOETF` (`colorspace_pars_fragment.glsl.js:11-13`)
Three.js `0.187.0` defines:
$$\text{sRGBTransferOETF}(y) = \begin{cases} 12.92\, y & y \le 0.0031308 \\ 1.055\, y^{0.41666} - 0.055 & y > 0.0031308 \end{cases}$$
For target `#1A1033` bytes $(R, G, B) = (26, 16, 51)$, normalized target sRGB is:
$$\mathbf{S} = \left(\frac{26}{255},\; \frac{16}{255},\; \frac{51}{255}\right) = (0.1019607843,\; 0.0627450980,\; 0.2000000000)$$
Since each $S_i > 0.04045$, the exact inverse using Three.js's exponent $0.41666$ is:
$$y_i = \left(\frac{S_i + 0.055}{1.055}\right)^{\frac{1}{0.41666}}$$
Evaluating each channel:
$$\mathbf{y}_{\text{target}} = (0.0103290673,\; 0.0051810804,\; 0.0331029614)^T$$

#### Step B — Exact Closed-Form Inverse of `ACESFilmicToneMapping` (`tonemapping_pars_fragment.glsl.js:35-74`)
In Three.js `0.187.0` (noting GLSL `mat3` constructors are column-major, so row-major matrices are):
$$M_{\text{in}} = \begin{bmatrix} 0.59719 & 0.35458 & 0.04823 \\ 0.07600 & 0.90834 & 0.01566 \\ 0.02840 & 0.13383 & 0.83777 \end{bmatrix}, \qquad M_{\text{out}} = \begin{bmatrix} 1.60475 & -0.53108 & -0.07367 \\ -0.10208 & 1.10813 & -0.00605 \\ -0.00327 & -0.07276 & 1.07602 \end{bmatrix}$$
Forward `ACESFilmicToneMapping` with exposure $E = \text{toneMappingExposure}$ (`1.04` in `GameEngine.ts:130`) computes:
$$\mathbf{v} = \frac{E}{0.6} M_{\text{in}} \mathbf{x}, \qquad w_i = \frac{v_i(v_i + 0.0245786) - 0.000090537}{v_i(0.983729\, v_i + 0.4329510) + 0.238081}, \qquad \mathbf{y} = \text{saturate}(M_{\text{out}} \mathbf{w})$$
Inverting step-by-step:
1. **Unmix output matrix**:
   $$\mathbf{w} = M_{\text{out}}^{-1} \mathbf{y}_{\text{target}} = (0.0099923561,\; 0.0057685348,\; 0.0311859394)^T$$
2. **Invert scalar rational quadratic `RRTAndODTFit` per channel**:
   Rearranging $w_i (0.983729\, v_i^2 + 0.4329510\, v_i + 0.238081) = v_i^2 + 0.0245786\, v_i - 0.000090537$:
   $$(1 - 0.983729\, w_i)\, v_i^2 + (0.0245786 - 0.4329510\, w_i)\, v_i - (0.000090537 + 0.238081\, w_i) = 0$$
   With $A_i = 1 - 0.983729\, w_i > 0$, $B_i = 0.0245786 - 0.4329510\, w_i$, and $C_i = -(0.000090537 + 0.238081\, w_i) < 0$, the discriminant $B_i^2 - 4 A_i C_i$ is strictly positive on $w_i \in [0, 1)$, yielding the unique non-negative root:
   $$v_i = \frac{-B_i + \sqrt{B_i^2 - 4 A_i C_i}}{2 A_i}$$
   Numerically:
   $$\mathbf{v} = (0.0394058758,\; 0.0289260290,\; 0.0825909299)^T$$
3. **Unmix input matrix and exposure ($E = 1.04$)**:
   $$\mathbf{x}_{\text{exact}} = \frac{0.6}{1.04} M_{\text{in}}^{-1} \mathbf{v} = (0.0254562521,\; 0.0152193325,\; 0.0535311379)^T$$
   Notice all three components are strictly positive $(0.0255, 0.0152, 0.0535) \in (0, 1)^3$ — well inside the linear sRGB gamut!

#### Step C — Exact Output Byte Verification (`0..255`) in `HalfFloatType` vs `UnsignedByteType`

| Pipeline Mode | Stored RT Value (`msaaSceneRT`) | Post-ACES Linear $\mathbf{y}$ | Post-OETF Float $\times 255$ | Final `RGBA8` Canvas Bytes | Hex | Max Channel Error vs `(26, 16, 51)` |
|---|---|---|---|---|---|---|
| **Old Buggy Code** (`0x1a1033` in `UnsignedByteType`) | `(3/255, 1/255, 8/255)` | `(0.00072, 0.00015, 0.01371)` | `(9.30, 1.94, 31.02)` | `rgb(9, 2, 31)` | `#09021F` | **`20` bytes (FAIL)** |
| **New Fix (Primary: `HalfFloatType` `RGBA16F` + `xExact`)** | `(0.0254517, 0.0152130, 0.0535278)` (IEEE-754 binary16) | `(0.0103246, 0.0051768, 0.0330985)` | **`(25.994, 15.992, 50.997)`** | **`rgb(26, 16, 51)`** | **`#1A1033`** | **`0` bytes (`±0` EXACT!)** |
| **New Fix (Fallback: `UnsignedByteType` `RGBA8` + `xExact`)** | `(6/255, 4/255, 14/255)` | `(0.00912, 0.00553, 0.03425)` | `(24.063, 16.565, 52.063)` | `rgb(24, 17, 52)` | `#181134` | **`2` bytes (within `±4` contract)** |

---

## 3. Caveats & Edge Cases

1. **WebGL2 `EXT_color_buffer_float` vs `EXT_color_buffer_half_float` Warning Trap**:
   - In Three.js `0.187.0`, `WebGLTextures.js:249` calls `extensions.get('EXT_color_buffer_float')` whenever `type === THREE.HalfFloatType`. Never enable `HalfFloatType` unless `renderer.extensions.has('EXT_color_buffer_float') === true`, otherwise Three.js logs `WebGLRenderer: EXT_color_buffer_float extension not supported.` to console (which would fail zero-console-warning checks).
2. **`WEBGL_multisampled_render_to_texture` Multi-Pass Hazard**:
   - On mobile drivers exposing `WEBGL_multisampled_render_to_texture`, Three.js (`WebGLTextures.js:1763, 2471`) bypasses `__webglMultisampledFramebuffer` and calls `framebufferTexture2DMultisampleEXT` directly on `msaaSceneRT.texture`. Some mobile tile drivers reject `RGBA16F` on `framebufferTexture2DMultisampleEXT` or implicitly discard multisampled depth on mid-frame flushes between Pass 2, Pass 3, and Pass 4. Therefore, gate `HalfFloatType` MSAA on `!renderer.extensions.has('WEBGL_multisampled_render_to_texture')` AND verify both `gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES)` and a 1-time `2x2` scratch FBO `gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE` check before selecting `HalfFloatType`.
3. **Pass 5 Output Alpha in `RGBA16F`**:
   - Three.js `0.187.0` initializes the canvas WebGL2 context with `alpha: true, premultipliedAlpha: true` (`WebGLRenderer.js:391`). In `RGBA8`, Pass 4 `AdditiveBlending` clamped `msaaSceneRT.a` to `1.0`, whereas in `RGBA16F` `msaaSceneRT.a` can exceed `1.0` (e.g., `1.85`). `blitMaterial` MUST write `gl_FragColor = vec4(texel.rgb, 1.0);` before `#include <tonemapping_fragment>` so canvas alpha is strictly `1.0`.
4. **`msaaSceneRT` `resolveDepthBuffer: false` Optimization**:
   - Setting `resolveDepthBuffer: false` on `msaaSceneRT` avoids 4 redundant `DEPTH_BUFFER_BIT` MSAA resolves per frame (`WebGLTextures.js:2384`) while preserving `storeMultisampledDepthBuffer: true` so Pass 4 VFX/overlays continue to depth-test accurately against Pass 2 solid geometry.
5. **Redundant `canvas.width` Reset on No-Op `setSize` Calls & Redundant Pass-1 Shadow Render**:
   - Guard `renderer.setSize(w, h, false)` behind `if (canvas.width !== w || canvas.height !== h || this.ssWidth !== w || this.ssHeight !== h)` so spurious resize events do not clear the HTML5 canvas buffer.
   - Temporarily set `renderer.shadowMap.autoUpdate = false` during Pass 1 (`normalMaterial` does not use shadows) and restore it before Pass 2 (`MeshToonMaterial`), cutting shadow-map draw calls per frame in half.
   - Save and restore `camera.layers.mask`, and dispose `this.quadGeo` (`PlaneGeometry(2, 2)`) inside `ToonOutlineComposer.dispose()`.
6. **Zero Changes Required in `ToonMaterials.ts` or `GameEngine.ts` for Deliverable 3**:
   - `ToonMaterials.ts` (`grad4Standard`, `grad4Metal`, `makeToonMaterial` `#include <opaque_fragment>` hook) is 100% compatible with Three.js `0.187.0` and HDR `HalfFloatType`.
   - `GameEngine.ts` has zero calls to `renderer.getSize()`, `renderer.getDrawingBufferSize()`, or `canvas.width / height`; all input raycasting and `projectWorldToScreen` already use `canvas.getBoundingClientRect()`.

---

## 4. Conclusion

All three defects (`D3`, `D4a`, `D4b`) in Deliverable 3 are cleanly, completely, and self-containedly solved inside `/home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts` without breaking any caller in `GameEngine.ts` or `ToonMaterials.ts`:
1. **`1.5x` Canvas Backing Store (`D3`)**: `renderer.setPixelRatio(1)` + `renderer.setSize(this.ssWidth, this.ssHeight, false)` + `renderer.setScissor(0, 0, this.ssWidth, this.ssHeight)` + Pass 5 `setViewport(0, 0, this.ssWidth, this.ssHeight)` keeps `<canvas>` CSS layout at `100% x 100%` (`cssWidth x cssHeight`) while delivering full `1.5x` supersampled pixels (`ssWidth x ssHeight`) to the display compositor with 1:1 Pass 5 texel mapping.
2. **Rock-Solid `HalfFloatType` MSAA (`D4a`)**: `resolveSceneRenderTargetConfig` silently checks `EXT_color_buffer_float`, `!WEBGL_multisampled_render_to_texture`, `gl.getInternalformatParameter(gl.RENDERBUFFER, gl.RGBA16F, gl.SAMPLES)`, and a 1-time `2x2` FBO completeness probe (`resolveDepthBuffer: false`), falling back cleanly to `THREE.UnsignedByteType` with zero WebGL errors or warnings.
3. **Exact `#1A1033` (`rgb(26, 16, 51)`) Fidelity + Pass-4 VFX Immunity (`D4b`)**: Dynamic closed-form inverse `ACESFilmicToneMapping` + inverse `sRGBTransferOETF` pre-compensation on `uOutlineColor` in Pass 3 yields `rgb(26, 16, 51, 255)` (`±0` byte error in `HalfFloatType`, empirically verified via `gl.readPixels` in Headless Chromium SwiftShader) while keeping Pass 4 transparent VFX, rings, particles, and HP bars 100% un-outlined on top of Pass 3.

---

## 5. Verification Method

1. **Build & Typecheck**: Run `npm run build` (`tsc && vite build`) and confirm exit code `0`.
2. **Pixel & Buffer Verification (Playwright WebGL2 Headless Chromium SwiftShader)**:
   - On desktop (`1440x900`, `DPR=1`) and mobile portrait (`390x844`, `DPR=2` or `3`):
     - Assert `canvas.getBoundingClientRect()` equals `{ width: cssW, height: cssH }`.
     - Assert `canvas.width === Math.round(cssW * 1.5)` and `canvas.height === Math.round(cssH * 1.5)` (never multiplied by `devicePixelRatio`!).
     - Assert `gl.getError() === 0` and zero console warnings/errors (`EXT_color_buffer_float` warning never emitted).
     - Sample silhouette outline pixels via `gl.readPixels` on the default framebuffer and assert `R ∈ [25, 27], G ∈ [15, 17], B ∈ [50, 52], A === 255` (`#1A1033` `rgb(26, 16, 51)`).
     - Verify Pass 4 overlays (`rangeRing`, `selectRing`, `hpBarGroup`, `spawnGroundRing`) render cleanly over solid silhouettes without dark `#1A1033` outlines around or across them, and pointer clicks via `getPadScreenCoordinates` hit build pads accurately on both desktop and `DPR=2` mobile.
