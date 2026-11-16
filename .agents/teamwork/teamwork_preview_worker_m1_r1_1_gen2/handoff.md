# Milestone M1 (`render-3d-outline`) Implementation Handoff — `teamwork_preview_worker_m1_r1_1_gen2`

- **From**: `teamwork_preview_worker_m1_r1_1_gen2`
- **To**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- **Status**: **COMPLETE — 100% Verified (`tsc`, isolated Vite build, headless Chromium WebGL2 pixel & GPU memory verification)**

---

## 1. Authorized M1 Files Audited, Hardened & Verified

Strictly limited to the M1 exclusive write ownership scope (zero touches to `src/game/*`, `src/config/*`, `src/ui/*`, `src/audio/*`, `tests/**`, `package.json`, `./dist/`, or `:5173`):

1. [`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L228-L487) (**M1.1**)
   - Replaced the detached open single-sided `ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded = true`) with a 100% closed manifold beveled 3D telemetry dish assembly (`rearBoss`, `dishShell`, `dishRim`, `3 × rimClamp`, recessed `innerReflector`, `feedPedestal`, `feedMast`, `3 × fStrut`, `emitterHorn`, `emitterLens`) balanced on `-Z` by `transceiverPod`, `podStripe`, and twin `whip` + `whipTip` antennas.
   - Connected `dishGroup` (`y = 2.58`) physically to `mast` (`top y = 1.755`) via `upperMastCollar` (`y = 1.70`), `coreSocketRing` (`y = 1.76`), a stationary 3-strut structural gantry cage (`60°/180°/300°` inter-fin bays clearing `coreMesh` by `+15.3cm` and `signalFins` by `+35.5cm`), and an open-bore `azimuthRing` (`y = 2.50`, inner bore `r = 0.29m > skyBeam r = 0.249m`).
   - Preserved `ReturnBeaconRig` (`{ group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam }`) 100% unchanged.

2. [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119-L151) & [`src/render/TowerFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/TowerFactory.ts#L63-L893) (**M1.2 / Contract 1**)
   - Added `FlapHingeAxis = 'x' | 'y' | 'z'`, `HingedFlapUserData`, and `TowerRig.idleCore?: THREE.Object3D` while preserving 100% of existing `TowerRig` properties.
   - Populated `rig.idleCore` (with `userData.restPos` & `userData.restScale`) on all 3 towers (`coreGem` on `autocannon`, `tierCore` on `mortar`, `coreMesh` on `magnetic`).
   - Added all 3 promised T3 secondary 3D sub-assemblies inside `t3Turret` with `tagArcFlyPart(...)`:
     - **Autocannon T3 (`顶部开合散热鳍片`)**: `topRadiatorGrp` on rear-top cowl (`(0, 0.325, -0.42)` in `weaponPitch`) with `#FF9F1C` thermal core + 2 hinged louver pivots registered in `rig.hingedFlaps` (`hingeAxis: 'x'`, `restAngle: -0.08`, `openAngle: -0.58`, `minTier: 3`).
     - **Mortar T3 (`光学测距摇臂`)**: `rangefinderArm` mounted on left T3 pod shoulder (`(-0.8, 0.8, -0.06)` in `t3Turret`) with swivel joint, angled boom, beveled cream sensor pod, tier brow trim, and glowing `#22D3EE` optical lens.
     - **Magnetic T3 (`三向磁通增幅柱`)**: `3 × fluxPylon` at `60°/180°/300°`, `r = 0.85m` with lower bridge struts bolted into `pedCore`, beveled cream base shoes, deep-blue rods, dual `#C084FC` / `tierTrimMat` induction coil rings, and octahedron tips.
   - Registered right-handed outward/upward metadata (`hingeAxis`, `restAngle`, `openAngle`, `minTier`) on every object in `rig.hingedFlaps` across all 3 towers (`4` on `autocannon`, `2` on `mortar` with `-sx * 0.58`, `4` on `magnetic` with `-0.48`).
   - Parented Magnetic Tower's upper emitter (`outerRingGrp`, `coreMesh`, `muzzle`) under `rig.weaponPitch` at `(0, 1.15, 0)` (`weaponPitch.children.length === 3`, `magRingOuter` world rest `y = 1.49` preserved).
   - Exported `setTowerTierVisibility(rig, tier)` and added `options?: { visibilityOnly?: boolean }` on `applyTowerTierVisuals(rig, tier, options)`.

3. [`src/render/ToonOutlineComposer.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts#L1-L568) (**M1.3 / Contract 3**)
   - Enforced `this.renderer.setPixelRatio(1)` (never multiplying `window.devicePixelRatio`) and `this.renderer.setSize(this.ssWidth, this.ssHeight, false)` (`updateStyle = false`) in both `constructor` and `setSize`, keeping CSS layout strictly `100% x 100%` (`cssWidth x cssHeight`) while backing the canvas with the full `1.5x` supersampled drawing buffer (`1:1` Pass 5 blit).
   - Implemented silent zero-warning `THREE.HalfFloatType` (`RGBA16F`) probe (`renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('WEBGL_multisampled_render_to_texture')`) + scratch FBO completeness verification for both MSAA (`samples > 0`) and single-sample (`samples === 0`), with clean `THREE.UnsignedByteType` fallback and `resolveDepthBuffer: false`.
   - Computed exact closed-form pre-tonemapped linear `uOutlineColor` inverting Three.js `0.187.0`'s `sRGBTransferOETF` (`0.41666`) + `ACESFilmicToneMapping` (`exposure = 1.04`) and forced `gl_FragColor = vec4(texel.rgb, 1.0);` in Pass 5 `blitMaterial`.
   - Preserved `grazing^3` slope compensation (`rOuter = 1.75`, `rInner = 0.88`) and Pass-4 Layer-1 / `vfxScene` transparent outline immunity.

4. [`src/fx/VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L76-L714) (**M1.4 / Contract 2**)
   - Added `public spawnChestOpenCelebration(worldPos: THREE.Vector3): void` spawning 3 expanding warm-gold & crystal-cyan ground rings + 18 radial outward sparkles + 5 clasp sparks with **zero** vertical `AdditiveBlending` cylinder, while keeping `spawnClimaxBurst` 100% unchanged.
   - Shared `rustDebrisMat` & `greyDebrisMat` across `debris3D`, added safe `disposeMortarShell` (never disposing `THREE.Sprite.geometry` singleton or shared `softGlow` texture) and `Set`-deduplicated `disposePickupGroup` in both `update()` and `clearAll()`, and added `public dispose(): void`.

---

## 2. Empirical Verification Results

1. **TypeScript & Isolated Vite Production Build**:
   - `npx tsc --noEmit` -> exit `0` (strict `verbatimModuleSyntax`, `erasableSyntaxOnly`, `noUnusedLocals`, `noUnusedParameters`).
   - `npx vite build --outDir /tmp/tdk_m1_dist_worker` -> exit `0` (`22 modules transformed`, `764ms`).
2. **Headless Chromium WebGL2 Verification (`127.0.0.1:0` ephemeral servers)**:
   - **Desktop (`1440x900`, `DPR=1`)**: `css = 1440x900`, `canvas = 2160x1350` (`1.5x`); pad click + build raycast accurate (`gold: 260 -> 170`).
   - **Mobile Portrait (`390x844`, `DPR=2`)**: `css = 390x844`, `canvas = 585x1266` (`1.5x`, zero DPR stacking); touch tap raycast selected `pad_05`.
   - **WebGL2 RenderTarget & `#1A1033` Pixel Readback**: `rtInfo = { type: HalfFloatType (1016), samples: 4 }`, `gl.getError() === 0` across all passes; `2165` silhouette pixels read back at exact `[26, 16, 51, 255]` (`#1A1033`, `±0` byte error); `darkPixelsNearVfx === 0`; `falseDeckOutlinePixels === 0`.
   - **Return Beacon 3D Dish**: `66` Layer-0 meshes, `0` `openEnded` meshes on Layer 0, `skyBeam` strictly Layer 1 (`mask = 2`), upper dish rendered `[391, 540, 507, 536]` lit solid pixels across `[0, π/2, π, 3π/2]` from Stage 5 camera.
   - **`TowerRig` Contracts**: All 3 towers verified (`idleCore` Octahedron + `restPos`/`restScale`, `t3Count = 3/3/4`, `flapCount = 4/2/4` with `opensOutwardOrUpward === true` on all 10 flaps, Magnetic `weaponPitch.children.length === 3` & `magRingOuter` world `y = 1.49`, `setTowerTierVisibility(rig, 3)` preserves T1 `0x2ecc71` colors while revealing `t2`/`t3`).
   - **VFX Celebration & GPU Disposal**: `spawnChestOpenCelebration` spawned `0` vertical cylinders (`chestBleachRatio = 0.0000`); GPU `renderer.info.memory.geometries` rose `232 -> 272` under heavy multi-type spawn, returned to exact `232` on natural `update()` expiry AND on `clearAll()`, dropped to `228` (`232 - 4`) on `dispose()`, while shared textures stayed `11 -> 11` and post-clear `THREE.Sprite` rendering had `gl.getError() === 0`.
3. **Cleanup & Git Status**:
   - Deleted `/tmp/verify_m1_worker.mjs` and `/tmp/tdk_m1_dist_worker` (`TMP_CLEAN`).
   - `./dist/` and `:5173` completely untouched; zero console errors or WebGL warnings.

---

## 3. Downstream Notes for M2 (`GameEngine.ts` & `CinematicDirector.ts`)

- In `CinematicDirector.ts`:
  - Stage 2B (`playNormalUpgrade`) & Stage 2C (`playLegendaryUpgradeReveal`) can call `setTowerTierVisibility(rig, newTier)` (or `applyTowerTierVisuals(rig, newTier, { visibilityOnly: true })`) at `t = 0` and defer full `applyTowerTierVisuals(rig, newTier)` to `lockEnd` / `climaxAt`.
  - Stage 2C flap flare (`line 421`) can animate `flap.rotation[flap.userData.hingeAxis]` from `flap.userData.restAngle` to `flap.userData.openAngle`.
  - Stage 5B (`playOpenRewardChest`, `line 781`) can call `this.deps.vfx.spawnChestOpenCelebration(chestPos)` instead of `spawnClimaxBurst`.
- In `GameEngine.ts`:
  - Add `else { rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8); }` after `tower.type === 'mortar'` (`line 1063`) so Magnetic's `weaponPitch` recovers smoothly from Boss EMP stun.
  - Guard generic `rig.idleCore.rotation.y` spin with `if (tower.type !== 'magnetic')` so Magnetic's `-2.5 / -14 rad/s` spin is preserved while applying `idleCore` scale breathing across all 3 towers.
