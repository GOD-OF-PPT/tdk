# Milestone M1 (`render-3d-outline`) Empirical QA Challenge Handoff — `teamwork_preview_challenger_m1_r1_1_gen2`

Verdict: **APPROVE**

- **Challenger**: `teamwork_preview_challenger_m1_r1_1_gen2` (Challenger 1 — WebGL2 `1.5x` Sizing, `#1A1033` Pixel & Return Beacon Smoke Check)
- **Target Worker**: `teamwork_preview_worker_m1_r1_1_gen2`
- **Caller Sub-Orchestrator**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- **Isolated Verification Target**: `/tmp/tdk_m1_chal1_dist` (`npx vite build --outDir /tmp/tdk_m1_chal1_dist`, `276ms`, exit `0`) served on `127.0.0.1:0` ephemeral port (`:37445`). Zero repository edits; `./dist/` and `:5173` untouched; `/tmp/chal1_smoke.mjs` and `/tmp/tdk_m1_chal1_dist` deleted post-run.

---

## 1. Raw Empirical WebGL2 Measurements (Headless Chromium + ANGLE SwiftShader)

### A. `1.5x` Supersampling Canvas Sizing, Zero DPR Stacking & Dynamic Resize Raycast ([`ToonOutlineComposer.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts#L134-L175), [`GameEngine.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L271-L280))
- **Desktop (`1440x900`, `deviceScaleFactor: 1`)**:
  - `window.devicePixelRatio === 1`, `renderer.getPixelRatio() === 1`
  - CSS layout: `rect = 1440 x 900`, `getComputedStyle = "1440px" x "900px"`, `canvas.style.width === ""`, `canvas.style.height === ""` (`updateStyle = false`)
  - Backing buffer: `canvas.width === 2160`, `canvas.height === 1350`, `gl.drawingBufferWidth === 2160`, `gl.drawingBufferHeight === 1350` (exact `1.5x`)
  - Scene RenderTarget config: `type = 1016` (`THREE.HalfFloatType` / `RGBA16F`), `samples = 4`, `msaaSceneRT.resolveDepthBuffer === false`, `gl.getError() === 0`, zero `EXT_color_buffer_float` warnings.
- **Desktop Rapid Dynamic Resize + Raycast Stress**:
  - `1024x768` -> CSS `1024x768`, `canvas = 1536x1152`, `msaaSceneRT = 1536x1152`, `normalDepthRT = 1536x1152`, `glErr = 0`.
  - `1280x720` -> CSS `1280x720`, `canvas = 1920x1080`, `glErr = 0`; real `page.mouse.click` hit `pad_02` (`selectedPadId === "pad_02"`).
  - `2400x1350` (`maxDim = 3200` clamp stress) -> CSS `2400x1350`, `canvas = 3200x1800`, `glErr = 0`; real `page.mouse.click` still hit `pad_02` accurately.
  - Restored `1440x900` -> CSS `1440x900`, `canvas = 2160x1350`; real `page.mouse.click` hit `pad_01` (`selectedPadId === "pad_01"`) and built all 3 towers (`autocannon`, `mortar`, `magnetic`).
- **Mobile Portrait HiDPI (`390x844`, `deviceScaleFactor: 2`, `isMobile: true`, `hasTouch: true`)**:
  - `window.devicePixelRatio === 2`, `renderer.getPixelRatio() === 1`
  - CSS layout: `rect = 390 x 844`
  - Backing buffer: `canvas.width === 585`, `canvas.height === 1266`, `gl.drawingBufferWidth === 585`, `gl.drawingBufferHeight === 1266` (exact `1.5x`, **zero** DPR `2x` stacking!)
  - Dynamic resize `412x915` -> CSS `412x915`, `canvas = 618x1373` -> restored `390x844` -> CSS `390x844`, `canvas = 585x1266`.
  - Real `page.touchscreen.tap(194.29, 465.14)` after HiDPI dynamic resize accurately raycast `pad_05` (`selectedPadId === "pad_05"`) and built Magnetic tower (`goldAfter = 160`).

### B. `#1A1033` `gl.readPixels` Silhouette Accuracy, Alpha Integrity & Pass-4 VFX Immunity ([`ToonOutlineComposer.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts#L21-L96))
- **Rendered Scene Readback (`1500x950` center window of `2160x1350` default framebuffer)**:
  - Exact byte match `[26, 16, 51, 255]` (`#1A1033`, `L1 = 0`): **`6,848` pixels**
  - Within `±3` per channel (`rgb(26±3, 16±3, 51±3)`, `alpha === 255`): **`9,704` pixels**
  - Framebuffer alpha across all `1,425,000` sampled pixels: `minAlpha === 255`, `maxAlpha === 255` (`vec4(texel.rgb, 1.0)` in Pass 5 `blitMaterial`).
- **Pass-4 Layer-1 Overlays & Transparent VFX Outline Immunity**:
  - Isolated sky test (`240x240` patch over `#16192b` linear-tonemapped sky `[6, 8, 24]`) with active Layer-1 `rangeRing` + `vfx.spawnChestOpenCelebration`:
  - `litOverlayVfxPixels = 968` (rings & sparkles visibly rendered), **`pollutedOutlinePixels = 0`** (zero dark `#1A1033` fringes around transparent overlays or VFX).
- **Grazing-Angle Slope Compensation**:
  - Interior flat lunar deck `24x24` readback at 3/4 grazing angle: **`falseSlopeOutline = 0`**.

### C. Return Beacon Scene Graph & Multi-Angle Solid Dish Readback ([`BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L228-L487))
- **Manifold & Layer Inspection**:
  - `layer0Meshes = 66`, `layer1Meshes = 1` (`skyBeam.layers.mask === 2`)
  - **`layer0OpenEnded = 0`** (`0` `openEnded === true` cones/cylinders on Layer 0)
  - `dishGroup` (`y = 2.58`): `dishMeshes = 29`, **`dishOpenEnded = 0`**, `dishDoubleSideCount = 0`, `invalidNormalsOrPositions = 0`, connected physically via 3-strut gantry cage + open-bore `azimuthRing` (`y = 2.50`, inner bore `0.29m > skyBeam 0.24m`).
- **Stage-5 Low-Angle Hero Camera `360°` Rotation Readback (`[0, π/2, π, 3π/2]`)**:
  - Solid lit dish pixels: **`[12778, 5808, 23046, 6912]`**
  - `#1A1033` dish silhouette pixels: **`[2704, 998, 2779, 1321]`**
  - Zero backface disappearance at any azimuth angle.

### D. Chest Celebration Non-Bleach & VFX GPU Memory Stress ([`VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L298-L324))
- `spawnChestOpenCelebration`: **`tallAdditiveCylinders = 0`**.
- `6` full multi-type spawn/render/`clearAll()` cycles (`spawnChestOpenCelebration` + `launchMortarShell` + `spawn3DLoot` + `spawnArmorBreakDebris`):
  - `postWarmupGeo = 238` -> `peakGeo = 263` -> `afterGeo = 238` (**`0` geometry leak**)
  - `postWarmupTex = 12` -> `afterTex = 12` (**`0` texture leak**), `gl.getError() === 0`.
- **Console / Page / WebGL Errors**: `consoleErrors = []`, `pageErrors = []`, `gl.getError() === 0`.
