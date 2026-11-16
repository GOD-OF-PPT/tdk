# E2E Explorer Track 3 (`explorer_e2e_r1_3`) — 3D Rendering, `#1A1033` `1.5x` Outline Pipeline, Camera Framing, Responsive HUD & Dual Preview Surfaces (`F1`–`F6`, `F16`–`F18`)

## 1. Executive Technical Map & Authoritative Source References

| Feature | Primary Source Modules & Exact Lines | M1 / M2 Remediation Contract (`plan.md`) | Opaque-Box E2E Verification Mechanism |
|---|---|---|---|
| **F1: Worldbuilding & Lunar Diorama** | `src/render/BeaconAndPropsFactory.ts:49-83` (road), `139-263` (Return Beacon), `265-353` (Mine Entrance), `416-510` (monorail/crates/platform/craters/boulders), `521-604` (3D slab + 10 pads) | **M1**: Replace detached open `ConeGeometry` dish (`lines 228-241`) with solid beveled 3D dish + mast support bracket | WebGL2 `addInitScript` draw/triangle telemetry + GPU `projectionMatrix`/`viewMatrix` projection of `(12.95, 2.55, 2.4)` dish pixel solidity & `0.8s` rotation diff |
| **F2: Chunky Cartoon Mech 3D & Faction Palette** | `src/render/TowerFactory.ts:10-41, 63-604`, `src/render/EnemyFactory.ts:15-324`, `src/render/BeaconAndPropsFactory.ts:88-137, 355-414`, `src/render/ToonMaterials.ts:320-345` | **M1**: Add promised T3 secondary 3D sub-parts (`autocannon` top radiator louvers, `mortar` optical rangefinder arm, `magnetic` 3 flux amplifier posts) | Zero `<svg>` inside `#game-canvas`; WebGL2 `drawElements`+`drawArrays` triangle audit; PNG crop palette classification (cream `#F3EFE6` / deep-blue `#223458` / amber `#FF9F1C` vs enemy dark-grey `#353844` / rust `#9B392D` / red `#FF2B3D`) |
| **F3: 4-Tier Geometric Progression & Selective Tier Accents** | `src/config/gameConfig.ts:26-63, 220-409`, `src/render/TowerFactory.ts:145-175, 269-352, 427-485, 554-603, 636-664`, `src/game/CinematicDirector.ts:209, 303` | **M1+M2**: Monotonic 3D part additions `T1 -> T2 -> T3 -> T4`; defer `applyTowerTierVisuals` color switch from `t=0` to `lockEnd`/`climaxAt` (**Contract 1**) | Strict monotonic WebGL triangle & draw-call growth `empty < T1 < T2 < T3 < T4` across all 3 tower types; T4 PNG crop proves cream armor stays dominant (`>1500 px`), weapon color (`#FF9F1C`/`#22D3EE`/`#C084FC`) persists, and deferred color switch doesn't tint core at `t=0.05s` |
| **F4: Mechanical Articulation, Idle Life & Hover Shadows** | `src/render/TowerFactory.ts:213, 335-341, 393, 468-476, 543-547, 582-593`, `src/game/GameEngine.ts:1017-1026, 1041-1120, 1153-1158`, `src/game/CinematicDirector.ts:421-423` | **M1+M2**: Expose `idleCore` + `hingedFlaps` `hingeAxis`/`openAngle` (**Contract 1**); animate idle core/fin breathing; replace Mortar `setTimeout(..., 240)` (`line 1155`) with sim-delta door timer | Stationary-camera idle `t=1.5s vs 2.1s` `modelViewMatrix` & pixel diff on `pad_03`; **Pause-safety test**: fire T4 Mortar -> `#btn-pause` -> wait `350ms` wall-clock -> assert zero matrix/pixel change while paused; `swarm` Layer-1 `shadowBlob` scale oscillation `[0.72, 1.15]` |
| **F5: 4-Step `MeshToonMaterial` & Non-Overexposed Lighting** | `src/render/ToonMaterials.ts:20-36, 239-242, 269-317`, `src/game/GameEngine.ts:129-130, 148-171`, `src/fx/VfxManager.ts:253-289`, `src/game/CinematicDirector.ts:781` | **M1+M2**: `VfxManager.spawnChestOpenCelebration` (**Contract 2**) replaces Stage 5B bleaching additive yellow cylinder; dispose transient VFX meshes/materials | WebGL2 `texStorage2D`/`texSubImage2D`/`texParameteri` verifies two `4×1` `NEAREST` (`9728`) toon ramps (`[102,158,222,255]` & `[78,136,198,255]`); Stage 5B chest-mouth luminance check (`brightLumPct < 45%` vs pre-fix `90.47%` bleached!) |
| **F6: `#1A1033` Normal+Depth Outline & `1.5x` Supersampling** | `src/render/ToonOutlineComposer.ts:30-291` | **M1**: `renderer.setPixelRatio(1)` + `renderer.setSize(ssWidth, ssHeight, false)` (**Contract 3**); `HalfFloatType` (with fallback) + post-tonemapping exact `#1A1033` (`rgb(26,16,51)` ± 4) | Canvas backing ratio `canvas.width / canvas.clientWidth ≈ 1.5` at BOTH `dpr=1` and `dpr=2` (capped `<= 3200`); `gl.readPixels` + open-playfield PNG scan verifies `rgb(26,16,51)` ± 4 (catches pre-M1 `rgb(9,2,31)` crush!); radial pixel scan across `rangeRing` verifies zero `#1A1033` outline on Layer-1/`vfxScene` |
| **F16: Desktop & Mobile Camera Framing & Tactile HUD** | `src/game/GameEngine.ts:271-305`, `src/game/CinematicDirector.ts:343-357, 682-696`, `src/style.css:121-236, 972-1028`, `src/ui/UIManager.ts:82-133` | **M2**: Desktop `distScale ~ 1.10`; mobile portrait `distScale` cap `~3.25`; portrait-adapted Stage 2C & Stage 5 cameras; `<=390px` `.hud-top-bar` fit | Outer-edge world projection (`Entrance` `(-14.85, 0.18, -3.2)` & `Beacon` `(14.75, 0.18, 2.4)`) inside margins on `1440×900`, `390×844`, `360×800`; Stage 5 mobile Chest & Beacon inside `[8, W-8]` and above `#victory-screen` card; `.hud-top-bar` zero overflow at `360×800` w/ 4-digit gold |
| **F17 & F18: Dual Preview Surfaces, Zero-CDN & E2E Infra** | `src/main.ts:11-21`, `src/style.css:11-77`, `vite.config.ts:1-20`, `.../scratch/bundle_standalone.mjs`, `tests/e2e.mjs` | **M2**: Promote `http(s):` & `innerHeight >= 600` iframes to `100%` height while keeping `0px`-init `<agent-embed>` at `580px`; sync `dist/` & `starforge_ark_cradle.html` | Host-page Playwright harness testing (1) `:5173` live server, (2) `0px`-init `sandbox="allow-scripts"` `<agent-embed>` (`scrollHeight === 580`, `0` network requests, `localStorage` `SecurityError` resilience, `740px` `#btn-fullscreen` fallback), (3) `1200×920` preview iframes (`appRect.height === 920`) |

---

## 2. Exact Runtime Surface of `window.__LUNAR_BEACON_GAME__` & DOM Selectors (Critical Contract Clarity)

### 2.1 What `window.__LUNAR_BEACON_GAME__` Actually Exposes (`src/main.ts:42`, `src/game/GameEngine.ts`)
- `src/main.ts:42` executes `window.__LUNAR_BEACON_GAME__ = engine;` (an instance of `GameEngine`).
- **CRITICAL API & SELECTOR CORRECTIONS vs `plan.md` Shorthand**:
  1. **State Snapshot Method Name**: The public method on `GameEngine` (`src/game/GameEngine.ts:1509`) is **`getSnapshot(): UISnapshot`** (NOT `getState()`!).
  2. **`projectWorldToScreen` Signature Trap**: `GameEngine.ts:1617` defines `private projectWorldToScreen(worldPt: THREE.Vector3)` which calls `worldPt.clone().project(this.camera)`. Passing a plain `{ x, y, z }` POJO from Playwright `page.evaluate()` throws `TypeError: worldPt.clone is not a function` because `THREE` is not global!
     - **Public Screen-Projection Methods Safe to Call Directly**:
       - `getPadScreenCoordinates(padId: string): { x: number; y: number } | null` (`'pad_01'`..`'pad_10'`)
       - `getBeaconScreenCoordinates(): { x: number; y: number }` (projects `(12.95, 1.2, 2.4)`)
       - `getEntranceScreenCoordinates(): { x: number; y: number }` (projects `(-13.65, 1.2, -3.2)`)
       - `computeBaseCameraPose(): { pos: THREE.Vector3; lookAt: THREE.Vector3 }`
     - **Arbitrary World-Point Screen Projection (`projectWorld(wx, wy, wz)`) in 100% Opaque-Box Fashion**:
       - Intercept `gl.getUniformLocation(prog, 'projectionMatrix' | 'viewMatrix')` and `gl.uniformMatrix4fv` inside `page.addInitScript` (empirically verified to match `getBeaconScreenCoordinates()` and `getEntranceScreenCoordinates()` to **`0.000008px`** across ALL camera modes including `opening`, `playing`, `legendary_reveal`, `boss_intro`, and `victory_panel`!).
       - Additionally, in base `playing` mode, `const v = g.computeBaseCameraPose().pos.clone().set(wx, wy, wz)` produces a genuine `THREE.Vector3` if ever needed, though the WebGL2 uniform matrix projector is 100% public-API-independent and works during `cameraOverride` cinematics too.
  3. **Authoritative DOM IDs & Classes in `src/ui/UIManager.ts` (Do NOT Use Non-Existent Shorthand IDs)**:
     - Top HUD values (`UIManager.ts:86-108`): `#hud-top-bar`, `#pill-beacon` / `#val-beacon`, `#pill-gold` / `#val-gold`, `#pill-crystal` / `#val-crystals`, `#pill-wave` / `#val-wave`, `#pill-kills` / `#val-kills` *(NOT `#hud-gold` or `#hud-hp`!)*.
     - Top HUD controls (`UIManager.ts:111-116`): `#btn-speed`, `#btn-mute`, `#btn-fullscreen`, `#btn-pause`.
     - Center alerts (`UIManager.ts:119-124, 163, 194, 211, 271`): `#boss-hud-bar`, `.boss-skill-warn`, `.wave-banner-card`, `#upgrade-stamp` (has class `.legendary` on Tier 4!), `#insufficient-toast`.
     - Bottom dock (`UIManager.ts:296, 316, 380, 480-509`): `#onboarding-guide`, `#btn-start-wave`, `#build-tray`, `.tower-mini-card[data-tower="autocannon"|"mortar"|"magnetic"]` (`#btn-card-autocannon`, `#btn-card-mortar`, `#btn-card-magnetic` — *NOT `.build-card`!*), `#btn-confirm-build`, `#btn-close-build`, `#tower-inspector` (*NOT `#tower-panel`!*), `#btn-upgrade-tower`, `#legendary-max-badge`, `#btn-sell-tower`, `#btn-close-sheet`.
     - Modals (`UIManager.ts:561, 581, 604`): `#pause-modal` (`#btn-resume`, `#btn-restart-pause`), `#defeat-modal` (*NOT `#defeat-screen`!*, `#btn-retry-defeat`), `#victory-screen` (`.victory-panel-card`, `#btn-claim-rewards`, `#btn-play-again`).
  4. **Opaque-Box Discipline**: Even though TypeScript `private` fields on `GameEngine` (`solidScene`, `towers`, `enemies`, `composer`) exist as runtime JS properties when compiled without `#`, **`tests/e2e_tiers.mjs` MUST NOT read or mutate any `private` `GameEngine` fields**. Stick strictly to public methods (`getSnapshot`, `getPadScreenCoordinates`, `getBeaconScreenCoordinates`, `getEntranceScreenCoordinates`, `computeBaseCameraPose`, `ghostPreviewActive`, `startNewMission`, `selectPadOrTower`, `previewOrBuildTower`, `upgradeSelectedTower`, `sellSelectedTower`, `startNextWave`, `toggleSpeed`, `togglePause`, `toggleMute`, `toggleFullscreen`, `claimVictoryRewards`, `debugStepSimulation`, and `debugAddGold` ONLY in isolated unit-like setup tests — NEVER in the Tier 4 zero-cheat campaign playthrough!), real Playwright pointer/touch input, WebGL2 `page.addInitScript` prototype hooks, and PNG/framebuffer pixel decoding.

---

## 3. Deep Investigation Findings & Empirical Pre-Fix vs Post-Fix Measurements

### 3.1 Opaque-Box WebGL2 Prototype Instrumentation (`page.addInitScript`) & Zero-Dependency PNG Decoder
Empirically verified in headless `/usr/bin/chromium` (`--use-gl=angle --use-angle=swiftshader --enable-webgl --ignore-gpu-blocklist --no-sandbox`) on **BOTH** `http://127.0.0.1:5173` (Vite ESM) and `file:///.../starforge_ark_cradle.html` (standalone IIFE) with **zero source changes**:

1. **Why Both `gl.drawElements` AND `gl.drawArrays` Must Be Hooked**:
   - In Three.js, `CylinderGeometry`, `SphereGeometry`, `TorusGeometry`, `ConeGeometry`, and `PlaneGeometry` are indexed geometries drawn via `gl.drawElements`.
   - However, `RoundedBoxGeometry` (`three/examples/jsm/geometries/RoundedBoxGeometry.js` — used for almost all chamfered mecha armor plates, struts, pauldrons, supply crate, and lintels!) and `OctahedronGeometry(r, 0)` / `DodecahedronGeometry` are **non-indexed** geometries drawn via **`gl.drawArrays`**!
   - Hooking both `drawElements` and `drawArrays` captures the true 3D triangle budget across all 4 tiers (measured empirically on `:5173`, `deltaTris` above empty station `baseTris`, rendered across shadow + normal/depth + solid toon passes):
     - **`autocannon`**: `T1 = +16,040` tris (`367` draws) → `T2 = +33,440` (`419` draws) → `T3 = +35,280+` (`435+` draws) → `T4 = +46,576+` (`486+` draws).
     - **`mortar`**: `T1 = +13,544` tris (`357` draws) → `T2 = +28,496` (`403` draws) → `T3 = +34,592+` (`419+` draws) → `T4 = +39,496+` (`462+` draws).
     - **`magnetic`**: `T1 = +16,176` tris (`369` draws) → `T2 = +31,776` (`421` draws) → `T3 = +33,056+` (`423+` draws) → `T4 = +36,288+` (`470+` draws).
2. **Why `gl.texStorage2D` + `gl.texSubImage2D` + `gl.texParameteri` Must Be Hooked for Toon Ramps (`F5`)**:
   - On WebGL2, Three.js uploads `THREE.DataTexture` (`ToonMaterials.ts:20-36`) using immutable `gl.texStorage2D(TEXTURE_2D, 1, RGBA8=32856, w=4, h=1)` followed by `gl.texSubImage2D` (NOT `gl.texImage2D`!).
   - Our `addInitScript` probe confirmed both `4×1` textures (`grad4Standard = [102,158,222,255]` and `grad4Metal = [78,136,198,255]`) with `TEXTURE_MAG_FILTER (10240) === NEAREST (9728)` and `TEXTURE_MIN_FILTER (10241) === NEAREST (9728)`.
3. **Synchronous `gl.readPixels` vs `page.screenshot()` PNG Decoding**:
   - `GameEngine` creates `WebGLRenderer` with default `preserveDrawingBuffer: false` (`GameEngine.ts:122-126`).
   - Inside a single `page.evaluate(() => { g.debugStepSimulation(0.05, true); gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(...); })` turn, WebGL guarantees the default drawingBuffer has **not yet been swapped/cleared by the compositor**, so `gl.readPixels` reads the **exact `1.5x` WebGL output with ZERO `#ui-layer` CSS border overlay**!
   - Meanwhile, `page.screenshot({ clip })` decoded in Node via `node:zlib`'s `inflateSync` (50 lines, zero external packages) verifies what the end-user browser compositor actually displays on screen (including CSS layout, DPR scaling, and UI transparency).
   - **CRITICAL ANTI-FALSE-POSITIVE TRAP DISCOVERED**: DOM HUD buttons (`#btn-start-wave`, `.stat-plate`, `.tactical-sheet`) use CSS `border: 2px solid #1a1033` (`rgb(26, 16, 51)`). If an E2E test scans a full-page screenshot for `rgb(26, 16, 51)`, CSS button borders at `y >= 760` or `y <= 56` will match `[26, 16, 51]` even when the 3D WebGL outline is broken! **Always sample `#1A1033` 3D outlines via (a) `gl.readPixels` on the WebGL default framebuffer AND (b) `page.screenshot({ clip })` strictly inside unobstructed 3D playfield coordinates (`x ∈ [300, 580], y ∈ [95, 210]` for north slab/monorail silhouettes against sky, and around `pad_03` `(526, 404)` with no tray open)!**

---

### 3.2 `#1A1033` Outline Color Crush, `1.5x` Supersampling & Layer-1/VFX Isolation (`F6`, Contract 3)
1. **Empirical Pre-M1 vs Post-M1 `#1A1033` Pixel Measurement**:
   - Target `#1A1033` in sRGB is **`rgb(26, 16, 51)`** (`Contract 3` tolerance: `± 4` per channel → `R ∈ [22, 30], G ∈ [12, 20], B ∈ [47, 55]`).
   - On current pre-M1 `ToonOutlineComposer.ts` (`lines 62, 71, 170, 196-198`), `THREE.Color(0x1a1033)` in linear (`0.0103, 0.0052, 0.0331`) is quantized into 8-bit `UnsignedByteType` `msaaSceneRT` (`3/255, 1/255, 8/255`) and then passed through `ACESFilmicToneMapping` (`exposure = 1.04`), which **crushes pure 3D silhouette pixels at `x = 360, cssY = 112, 113, 132, 160` down to `rgb(9, 2, 31)` (`#09021F`)**!
   - Therefore, sampling `gl.readPixels` (and `page.screenshot` clip) along vertical column `x_css = 360, y_css = 95..185` (crossing Broken Monorail girder top/bottom silhouettes and Lunar Slab north edge against `#16192B` sky `[6, 6, 23]`) **decisively fails pre-M1 (`rgb(9, 2, 31)`) and cleanly passes post-M1 (`rgb(26, 16, 51)` ± 4)**!
2. **`1.5x` Supersampling Without Stacking `devicePixelRatio` (`Contract 3`)**:
   - Pre-M1 `ToonOutlineComposer.setSize` (`line 211`) called `this.renderer.setSize(safeW, safeH, false)` (`1.0x`), yielding `canvas.width === 390` on `390×844` (`dpr = 2`), causing blurry upscaling.
   - Post-M1 (`Contract 3`): `renderer.setPixelRatio(1)` and `renderer.setSize(this.ssWidth, this.ssHeight, false)` where `ssWidth = round(cssWidth * 1.5)` (clamped so `max(ssWidth, ssHeight) <= 3200`).
   - **Exact E2E Assertions**:
     - At `1440×900` (`dpr = 1`): `canvas.clientWidth === 1440, canvas.clientHeight === 900`, `canvas.width === 2160, canvas.height === 1350` (`ratio = 1.50`).
     - At `390×844` (`dpr = 2`) and `1440×900` (`dpr = 2` or `dpr = 3`): `canvas.width` is STILL `round(clientWidth * 1.5)` (`585×1266` and `2160×1350`) — **NEVER `1440 * 2 * 1.5 = 4320`**, proving `1.5x` supersampling never stacks with `devicePixelRatio`!
     - At ultra-wide `2400×1200` (`2400 * 1.5 = 3600 > 3200`): `max(canvas.width, canvas.height) === 3200`, proving the `3200px` GPU safety cap!
     - WebGL2 MSAA: `renderbufferStorageMultisample` called with `samples === 4` (`> 0` and `<= 4`) at `(ssWidth, ssHeight)`.
     - Raycasting alignment (`Contract 3`): Clicking `(padPt.x, padPt.y)` returned by `getPadScreenCoordinates('pad_03')` when `canvas.width = 1.5 * canvas.clientWidth` accurately selects `'pad_03'` (proving pointer input uses CSS `getBoundingClientRect()`, not `canvas.width`).
3. **Zero Outline Pollution on Layer-1 / `vfxScene` Transparent Rings & Particles**:
   - Build a T1 tower on `pad_05` (`(-0.2, 0, 6.4)`) and keep it selected so `rangeRing` (`radius = 5.4m`, `T1` green `#2ECC71`) renders over open lunar deck along `+X` (`(-0.2 + 5.4 * mult, 0.11, 6.4)` for `mult ∈ [0.88, 1.12]`).
   - Empirical radial scan (`task-39`) shows lunar deck `[25, 38, 73]` smoothly transitioning into bright green ring `[70, 186, 120]` at `mult = 0.97..0.99` and straight back to `[25, 38, 73]` at `mult = 1.01`, with **0 pixels matching `#1A1033` (`rgb(26,16,51)` ± 6) on either side of the ring**. Repeat during active Mortar/Magnetic combat pulses to assert VFX rings/particles never generate dark `#1A1033` silhouettes.

---

### 3.3 Stage 5B Chest Open Non-Overexposure (`F5`, `F14`, Contract 2)
- Empirical measurement on pre-fix `09_stage5_3d_chest_open_loot_fountain.png` vs `08_stage5_victory_beacon_and_3d_chest.png` inside the projected 3D Supply Chest column (`world (9.75, 0.5..2.2, 2.7)` → `[xCenter - 50 .. xCenter + 50, yTop .. yCenter + 20]`):
  - Closed chest (`S08`): `meanLum = 122.0`, `brightLumPct (Y > 215) = 17.66%`, `nearWhitePct = 0%`.
  - Pre-fix open chest (`S09` with additive yellow cylinder): **`meanLum = 227.5`, `brightLumPct = 90.47%`**, bleaching coins and chest interior!
- **Exact E2E Assertion (`400ms–480ms` after `#btn-claim-rewards`)**:
  - Project chest mouth `(9.75, 0.5, 2.7)` and `(9.75, 2.0, 2.7)` via `window.__WEBGL_CAMERA__.projectWorld`.
  - Assert `meanLum < 180` AND `brightLumPct (Y > 215) < 50%` in that column (catching any vertical additive pillar overexposure), while asserting `> 20` gold coin pixels (`R > 200, G ∈ [130, 220], B < 100`) and `> 15` cyan crystal pixels (`B > 180, G > 135, R < 115`) exist in the fountain region!

---

### 3.4 Exact Camera Framing Math & Outer Bounding Extents (`F16`)
1. **Authoritative World Bounding Coordinates (`BeaconAndPropsFactory.ts` & `gameConfig.ts`)**:
   - **Mine Entrance (`BeaconAndPropsFactory.ts:267-289`)**:
     - Group center: `(-13.65, 0, -3.2)` (`ROAD_SAMPLES[0].x - 0.65`).
     - Portal lintel left face: `(-14.13, 1.2, -3.2)`; generous outer-left clearance point (`group.x - 1.2m` at base): **`(-14.85, 0.18, -3.2)`** (and `(-14.85, 1.2, -3.2)`).
   - **Return Beacon (`BeaconAndPropsFactory.ts:141-154`)**:
     - Group center: `(12.95, 0, 2.4)` (`ROAD_SAMPLES[last].x + 1.15`).
     - Outer octagonal foundation `base1` (`CylinderGeometry(1.52, 1.75, 0.36, 8)` at `y = 0.18`): outer right edge (`group.x + 1.8m` at foundation elevation `y = 0.18`) is **`(14.75, 0.18, 2.4)`**!
     - **IMPORTANT ELEVATION CAVEAT**: Always project the Beacon's `+1.8m` outer radius at its actual physical foundation elevation **`y = 0.18`** (`(14.75, 0.18, 2.4)`), NOT `y = 1.2`! At `y = 1.2` the mast is only `0.46m` wide; projecting `(14.75, 1.2, 2.4)` adds `+19.6px` of false perspective parallax (`1439.6px` vs true `1420.0px` at `distScale = 1.10`).
   - **10 Build Pads**: `pad_01`..`pad_10` (`gameConfig.ts:205-216`), socket radius `1.18m` at `y = 0.16`.
   - **Stage 5 3D Supply Chest**: Placed at `(beaconPos.x - 3.2, 0, beaconPos.z + 0.3) = (9.75, 0, 2.7)` during Stage 5 (`CinematicDirector.ts:728`), width `1.42m` (`x ∈ [9.04, 10.46]`, `y ∈ [0, 1.05]`).

2. **Empirical Projected Screen X Coordinates (Pre-M2 vs Post-M2)**:
   | Viewport | Camera `distScale` | Entrance Outer `(-14.85, 1.2, -3.2)` `x` | Beacon Outer Base `(14.75, 0.18, 2.4)` `x` | Target Margin Rule | Result |
   |---|---:|---:|---:|---|---|
   | Desktop `1440×900` | `1.00` *(pre-M2)* | `37.8px` | **`1493.6px`** (clips `+53.6px`!) | `[16, 1424]` | **FAILS** (catches bug!) |
   | Desktop `1440×900` | `1.10` *(post-M2)* | `96.5px` | **`1420.0px`** | `[16, 1424]` | **PASSES** |
   | Mobile `390×844` | `2.65` *(pre-M2)* | **`3.5px`** (`< 8px`) | **`397.4px`** (clips `+7.4px`!) | `[8, 382]` | **FAILS** (catches bug!) |
   | Mobile `390×844` | `3.15–3.25` *(post-M2)* | `33.0–37.8px` | `359.9–365.2px` | `[8, 382]` | **PASSES** |
   | Mobile `360×800` | `2.65` *(pre-M2)* | **`-1.5px`** (off-screen!) | **`371.9px`** (clips `+11.9px`!) | `[8, 352]` | **FAILS** (catches bug!) |
   | Mobile `360×800` | `3.15–3.25` *(post-M2)* | `26.5–31.0px` | `336.3–341.3px` | `[8, 352]` | **PASSES** |

3. **Stage 5 Victory Portrait Non-Occlusion (`390×844` & `360×800`)**:
   - Pre-M2 on `390×844`: Supply Chest projects to `(25.4, 535.7)` (covered by bottom `.victory-panel-card` whose `top ≈ 430px`!) and Return Beacon right base projects to `x = 421.6px > 390px`!
   - **Exact E2E Assertion in `mode === 'victory_panel'` on `390×844`**:
     - Query `cardRect = document.querySelector('#victory-screen .victory-panel-card').getBoundingClientRect()`.
     - Project Chest left/center `(9.05, 0.5, 2.7)` & `(9.75, 0.5, 2.7)` and Beacon center/right `(12.95, 1.2, 2.4)` & `(14.70, 0.18, 2.4)` via `window.__WEBGL_CAMERA__.projectWorld`.
     - Assert `chestLeft.x >= 8`, `beaconRight.x <= 382`, AND `chestCenter.y < cardRect.top - 8` & `beaconCenter.y < cardRect.top - 8` (both 3D subjects sit cleanly in the upper open viewport above the victory card, AND tapping `(chestCenter.x, chestCenter.y)` on `#game-canvas` triggers `claimVictoryRewards()`!).

4. **Narrow Mobile `.hud-top-bar` Fit (`360×800` & `390×844`)**:
   - With 4-digit gold (`debugAddGold(9000)` → `9260` after `350ms` counter roll) and `speedMultiplier = 2`:
     - Assert `topBar.scrollWidth <= topBar.clientWidth + 1`, `statsGroupRect.right <= ctrlGroupRect.left`, `pauseBtnRect.right <= window.innerWidth - 4`, and all 5 `.stat-num` font sizes `>= 11px`.

---

### 3.5 Dual Preview Surface, Zero-CDN & Sandboxed Iframe Matrix (`F17`, `F18`)
1. **Surface 1 — `<agent-embed>` Sandboxed `srcdoc` Iframe (`height: 0px` initial, `sandbox="allow-scripts"`)**:
   - Host HTML has `<iframe id="embed" sandbox="allow-scripts" style="width:960px;height:0px;border:0;display:block"></iframe>` (NO `allow-same-origin`, NO `allow-fullscreen`).
   - Load `starforge_ark_cradle.html` via `srcdoc`:
     - Assert `externalRequests.length === 0` (zero `http:`/`https:` requests).
     - Before resizing iframe: assert `frameDoc.documentElement.scrollHeight === 580` (`>= 560 && <= 620`) and `appRect.height === 580` (proving `#app` does NOT use `height: 100%`/`100vh` when `innerHeight === 0`!).
     - Resize `iframe.style.height = scrollHeight + 'px'` (simulating `<agent-embed>` ResizeObserver): assert `scrollHeight` stays `580` (zero runaway growth / zero collapse) and `canvas.clientWidth >= 950, canvas.clientHeight >= 574`.
     - Click `#btn-mute` twice & `#btn-fullscreen` once inside sandboxed frame: assert `0` `pageerror`/`console.error` despite `localStorage` throwing `SecurityError` on `null` origin, and `#app.expanded-embed` expands `#app` height to `740px` (`<= 800px` `<agent-embed>` ceiling)!
2. **Surface 2 — Side-Pane & `:5173` Bookmark Host-Sized Preview Iframes (`1200×920`)**:
   - Test **both** `<iframe src="http://127.0.0.1:5173" style="width:1200px;height:920px;border:0">` **AND** `<iframe src="file:///.../starforge_ark_cradle.html" style="width:1200px;height:920px;border:0">` (where `window.self !== window.top` AND initial `window.innerHeight === 920 >= 600`):
     - Pre-M2: `#app` was stuck at `580px` (`340px` blank gap below -> FAILS!).
     - Post-M2: Assert `Math.abs(appRect.height - 920) <= 2`, `Math.abs(canvasRect.height - 920) <= 2`, and `#hud-bottom-dock` sits cleanly near `y ≈ 920`!
3. **Static & Filesystem Artifact Integrity**:
   - Verify `starforge_ark_cradle.html` (`> 500 KB`, zero `<script src`, zero `<link rel="stylesheet"`, zero `https://fonts.`, inline `data:image/svg+xml;base64` favicon) + `.metadata.json` (`userFacing: true`).
   - Verify `Starforge Ark Cradle.url.json` (`url === "http://localhost:5173"`) + `.metadata.json` (`userFacing: true`).
   - Verify `http://127.0.0.1:5173/` responds `200 OK` and **NEVER terminate the persistent `:5173` server process**.

---

## 4. Concrete Tier 1–4 Test Blueprint for `tests/e2e_tiers.mjs` (Owned Domain: `F1`–`F6`, `F16`–`F18`)

### Shared Opaque-Box Harness Helpers to Include in `tests/e2e_tiers.mjs`
1. **`installWebGL2Probe(context)` (`context.addInitScript`)**:
   - Hooks `HTMLCanvasElement.prototype.getContext` (`webgl2`/`webgl`) once per context.
   - Records:
     - `isWebGL2`, context attributes;
     - `toonRamps4x1` (`texStorage2D` + `texSubImage2D` + `texParameteri` for `w === 4 && h === 1`: filter enums `9728` `NEAREST` and 4-band byte arrays);
     - `msaaConfigs` (`renderbufferStorageMultisample` sample counts & dimensions) and offscreen FBO texture types (`HalfFloatType` `36193`/`5131` or `RGBA8` `32856`);
     - Per-frame `lastFrame` stats (`draws`, `indexedTris`, `arrayTris`, `totalTris`, per-pass draw counts, and `modelViewMatrices` in Pass 2 + Layer-1 `shadowBlob` scales in Pass 4);
     - `window.__WEBGL_CAMERA__.projectWorld(wx, wy, wz)` from captured perspective `projectionMatrix` (`Math.abs(P[11] + 1) < 0.01`) and matching main-camera `viewMatrix`;
     - `window.__WEBGL_PROBE__.readCanvasPixels(cssX, cssY, cssW, cssH)` executing synchronous `gl.bindFramebuffer(gl.FRAMEBUFFER, null); gl.readPixels(...)` at `(canvas.width / canvas.clientWidth)` scale right after `debugStepSimulation(..., true)`.
2. **`decodePngBuffer(buf)`**: Pure Node `node:zlib` `inflateSync` PNG decoder (handles filter types `0..4` None/Sub/Up/Average/Paeth, RGB & RGBA) for fast pixel assertions on `await page.screenshot({ clip })` with zero npm dependencies.
3. **Server Connection Guard**: Check `http://127.0.0.1:5173` via `fetch`; if up, use it and **never kill it**; if down, start a temporary static/preview server on an ephemeral port (`0`) and close only that child server in `finally`.

### Tier 1 — Focused Feature Opaque-Box Checks (`>= 5` Checks per Feature Group)
- **Group A: 3D Diorama, Chunky Mechs, Tier Geometry & Articulation (`F1`–`F4`, 7 checks)**:
  - `T1-R01`: Zero `<svg>` inside `#game-canvas`; WebGL2 context active with `totalTris > 5,000` on empty lunar station diorama (thick slab, road, 10 pads, perimeter props).
  - `T1-R02`: Return Beacon 3D telemetry dish at `(12.95, 2.55, 2.4)` renders non-culled solid toon pixels + `#1A1033` seam pixels and produces non-zero pixel/matrix delta across `0.8s` ambient dish rotation.
  - `T1-R03`: Faction color separation on unobstructed crops — friendly towers (`pad_03`) exhibit cream-white (`#F3EFE6`), deep-blue (`#223458`), and hazard amber (`#FF9F1C`), while spawned enemies (`rover`/`drill`) exhibit dark charcoal (`#353844`), rust-red (`#9B392D`), and red optical sensor (`#FF2B3D`) pixels.
  - `T1-R04`: Strict monotonic 3D triangle & draw-call progression `empty < T1 < T2 < T3 < T4` verified independently for all 3 tower types (`autocannon`, `mortar`, `magnetic`), including T3 secondary sub-parts (`deltaTris(T3) - deltaTris(T2) >= 1,200`).
  - `T1-R05`: Selective tier color & stable weapon signature at T4 — upgrading `autocannon`, `mortar`, and `magnetic` to T4 preserves cream-white hull (`> 1,200` px, never whole-body dyed gold) AND preserves each tower's signature weapon pixels (`#FF9F1C` orange, `#22D3EE` cyan, `#C084FC` violet) alongside `#F59E0B` gold core/trim.
  - `T1-R06`: Deferred tier color ignition (`Contract 1`) — at `t = 0.05s` into `playNormalUpgrade` (`T1 -> T2`), new tier 3D parts are visible in flight while trim/core color has NOT prematurely snapped before `lockEnd`.
  - `T1-R07`: Stationary-camera idle life & hover shadows — idle T4 tower on `pad_03` with 0 enemies produces multi-part `modelViewMatrix` & pixel deltas over `0.6s` (`idleCore` + `specialGear` + `hingedFlaps`), and Wave 2 flying `swarm` drones modulate Layer-1 `shadowBlob` scale dynamically within `[0.72, 1.15]`.
- **Group B: 4-Step Toon Shading, Soft Exposure & `#1A1033` `1.5x` Outline Pipeline (`F5`–`F6`, 6 checks)**:
  - `T1-O01`: WebGL2 `texStorage2D`/`texSubImage2D`/`texParameteri` confirms two `4×1` discrete toon ramp textures (`[102,158,222,255]` and `[78,136,198,255]`) with `MIN_FILTER === NEAREST (9728)` and `MAG_FILTER === NEAREST (9728)`.
  - `T1-O02`: `1.5x` supersampled canvas backing buffer (`canvas.width === round(canvas.clientWidth * 1.5)`, `canvas.height === round(canvas.clientHeight * 1.5)`) + WebGL2 `4x` MSAA renderbuffer at `1440×900` (`2160×1350`).
  - `T1-O03`: Exact `#1A1033` sRGB silhouette verification (`rgb(26, 16, 51)` ± 4 per channel) via both `gl.readPixels` and open-playfield PNG scan at `x_css = 360, y_css = 95..185` and `pad_03` tower silhouette (rejecting ACESFilmic-crushed `rgb(9, 2, 31)` / `#150628`).
  - `T1-O04`: Grazing-angle slope compensation check — interior pixels of the tilted lunar deck slab (`x_css ∈ [460, 500], y_css ∈ [260, 310]`, open slab clear of pads/road) contain **zero** false `#1A1033` diagonal outline stripes.
  - `T1-O05`: Layer-1 / `vfxScene` non-outline isolation — radial scan across active `rangeRing` (`mult ∈ [0.88, 1.12]` from `pad_05`) and active Magnetic pulse ring contains **zero** `#1A1033` outline pixels bordering transparent VFX.
  - `T1-O06`: Stage 5B non-overexposed 3D Supply Chest open (`Contract 2`) — `450ms` after `#btn-claim-rewards`, chest-mouth column luminance satisfies `meanLum < 180` and `brightLumPct (Y > 215) < 50%` while displaying both 3D gold coins and 3D cyan crystals.
- **Group C: Desktop/Mobile Framing, Enamel HUD & Dual Preview Surfaces (`F16`–`F18`, 6 checks)**:
  - `T1-P01`: Desktop `1440×900` framing — Mine Entrance outer left `(-14.85, 1.2, -3.2)` `x >= 16`, Return Beacon outer base `(14.75, 0.18, 2.4)` `x <= 1424`, and all 10 build pads project inside unobstructed playfield `[80, 1360] × [90, 740]`.
  - `T1-P02`: Mobile Portrait `390×844` (`dpr=2, isMobile=true, hasTouch=true`) framing — Entrance outer left `x >= 8`, Beacon outer base `x <= 382`, and `touchscreen.tap` on projected `pad_03` opens `#build-tray` cleanly without covering road center.
  - `T1-P03`: Tactile Enamel HUD clarity — `.tower-mini-card` contains strictly SVG icon + name + cost (`<= 3` child elements, zero long description paragraphs), all visible HUD labels have computed `fontSize >= 11px`, and `#build-tray` / `#tower-inspector` are `opacity >= 0.95` inside viewport bounds.
  - `T1-P04`: Standalone `starforge_ark_cradle.html` zero-CDN verification — static HTML regex audit + Playwright request interceptor confirms `0` external `http(s):` requests and playable bootstrap over `file://`.
  - `T1-P05`: `<agent-embed>` `0px`-initial-height `sandbox="allow-scripts"` `srcdoc` iframe — `scrollHeight === 580` (`> 0`), zero collapse, `0` console/page errors.
  - `T1-P06`: Persistent `:5173` server HTTP `200 OK` + `Starforge Ark Cradle.url.json` (`http://localhost:5173`) & `starforge_ark_cradle.html.metadata.json` (`userFacing: true`) artifact parity check.

### Tier 2 — Boundary & Corner Cases (`>= 7` Checks)
- `T2-01`: **HiDPI `deviceScaleFactor: 2` & `3` Non-Stacking Supersampling**: Open `1440×900` at `dpr = 2` and `390×844` at `dpr = 3`; assert `canvas.width === round(canvas.clientWidth * 1.5)` (`2160` and `585`) — NEVER multiplied by `dpr`.
- `T2-02`: **Ultra-Wide `2400×1200` `3200px` RenderTarget Clamp**: Resize viewport to `2400×1200` (`2400 * 1.5 = 3600 > 3200`); assert `Math.max(canvas.width, canvas.height) === 3200` with zero WebGL framebuffer incomplete errors.
- `T2-03`: **Narrow `360×800` Portrait HUD Overflow Stress (4-Digit Gold + `2x` Active)**: Add gold to `9260`, toggle `2x`, wait `360ms` for counter roll; assert `#hud-top-bar` `scrollWidth <= clientWidth + 1`, `.hud-stats-group` right `<=` `.hud-ctrl-group` left, and `#btn-pause` right `<= 356`.
- `T2-04`: **Host-Sized `1200×920` Preview Iframe vs `0px` `<agent-embed>` Boundary**: Verify `height: 0px` `srcdoc` iframe resolves `#app` to `580px`, whereas `height: 920px` iframe (both `http://127.0.0.1:5173` and `starforge_ark_cradle.html`) promotes `#app` to `920px` (`Math.abs(appRect.height - 920) <= 2`).
- `T2-05`: **Sandboxed `null`-Origin `localStorage` `SecurityError` + Fullscreen Rejection Fallback**: Inside `sandbox="allow-scripts"` (no `allow-same-origin`, no `allow-fullscreen`), toggle `#btn-mute`, click `#btn-fullscreen` (assert `#app.expanded-embed` -> `740px` height), and verify `0` uncaught exceptions.
- `T2-06`: **Paused Simulation Freeze on T4 Mortar Hinged Bay Doors**: Fire T4 Mortar, immediately click `#btn-pause`, wait `350ms` wall-clock (`> 240ms` legacy `setTimeout`), and assert zero `modelViewMatrix` / pixel change on the Mortar rig until `#btn-resume` is clicked.
- `T2-07`: **Rapid Consecutive Upgrades (`T1 -> T2 -> T3 -> T4`) Timeline Cancellation**: Trigger `T1 -> T2 -> T3 -> T4` back-to-back within `120ms`; assert earlier `T2`/`T3` `lockEnd` callbacks do not clobber `#upgrade-stamp.legendary` (`传说·...`) or leave `turretYaw.position.y` offset after `legendary_reveal` completes.

### Tier 3 — Pairwise Feature Combinations (`>= 5` Checks)
- `T3-01`: **Mobile Portrait (`390×844`, `dpr=2`) × Stage 2C T4 Golden Hero Reveal**: Upgrade each tower type (or `magnetic` / `mortar` with non-`x` flap axes!) to T4 on `390×844`; verify hero tower + `#upgrade-stamp.legendary` fit inside `[12, 378]` horizontally without clipping, hinged flaps animate cleanly, and camera restores exact portrait `distScale` pose afterward.
- `T3-02`: **Mobile Portrait (`390×844`, `dpr=2`) × Stage 5 Victory Crate, Beacon & `#victory-screen` Card**: Trigger Wave 8 Boss victory on `390×844`; verify BOTH 3D Supply Chest `(9.75, 0.5, 2.7)` and Return Beacon `(14.70, 0.18, 2.4)` project within `x ∈ [8, 382]` AND `y < victoryCardRect.top - 8` (unoccluded above bottom card!), and touch-tapping the 3D Supply Chest directly on `#game-canvas` opens the clasp/lid and claims `+320G / +8💎`!
- `T3-03`: **HiDPI (`dpr=2`) × `1.5x` Supersampled Canvas × Pointer Raycasting & `#1A1033` Outline**: On `1280×800` at `dpr=2`, click all 10 build pads via `page.mouse.click(pt.x, pt.y)` (verifying CSS-vs-drawingBuffer raycast alignment across every pad quadrant) while verifying `#1A1033` (`rgb(26,16,51)` ± 4) outline and Layer-1 `selectRing`/`rangeRing` non-outline isolation.
- `T3-04`: **Sandboxed `<agent-embed>` Standalone HTML (`srcdoc`) × Interactive Build, Combat, T2 Upgrade & Restart**: Inside `sandbox="allow-scripts"` `580px` embed, tap `pad_03` -> preview ghost -> confirm build -> start Wave 1 -> clear Wave 1 -> upgrade T2 -> pause & restart, asserting `0` console/page errors and `0` external requests throughout.
- `T3-05`: **Viewport Orientation / Resize Mid-Combat (`1440×900` ↔ `390×844` ↔ `1200×920`) × Composer RenderTargets**: Resize dynamically during active Wave 2/3 combat with VFX shells & slow rings in flight; assert `composer` resizes `canvas.width/height` to `1.5x` new CSS dimensions, Entrance & Beacon stay framed at every aspect ratio, and WebGL `gl.getError() === gl.NO_ERROR (0)`.

### Tier 4 — End-to-End Visual, Readability & Dual-Artifact Parity Audit
- `T4-R1`: **Full Combat Readability & Exposure Audit Across Stages 1–5**: During heavy Wave 7–8 multi-tower + Boss combat and Stage 5 loot fountain, assert mean playfield luminance never blows out (`meanLum < 155`, full-screen `nearWhitePct < 6%`), `#1A1033` outlines remain intact, `gl.getError() === 0`, and `consoleErrors.length === 0 && pageErrors.length === 0`.
- `T4-R2`: **Cross-Surface Build & Standalone Bundle Parity**: Verify both `http://127.0.0.1:5173` (`dist/`) and `starforge_ark_cradle.html` initialize the same 8-wave campaign config, 10 pads, 4-step toon ramps, `1.5x` supersampling, `#1A1033` outline color, and `920px` vs `580px` iframe sizing rules.
