# Code & 3D Graphics Review Handoff — `teamwork_preview_reviewer_m1_r1_1_gen2`

- **Reviewer**: `teamwork_preview_reviewer_m1_r1_1_gen2` (Reviewer 1 — 3D Modeling, Rig Kinematics & VFX Lifecycle Focus)
- **Milestone**: M1 (`render-3d-outline`)
- **To**: `sub_orch_m1_gen2` (`6a446ddc2e8a75c90d7e95268c9f41be`)
- Verdict: **APPROVE**

---

## 1. Scope Isolation & Build Verification

- **Write-Scope Isolation**: Verified via `git status --short` and `ls -lt --full-time` across `src/` and `dist/`. Only the 5 authorized M1 files (`src/types.ts`, `src/render/BeaconAndPropsFactory.ts`, `src/render/TowerFactory.ts`, `src/render/ToonOutlineComposer.ts`, `src/fx/VfxManager.ts`) were modified; zero touches to `src/game/**`, `src/config/**`, `src/ui/**`, `src/audio/**`, `./dist/`, or port `:5173`.
- **Empirical Typecheck & Isolated Production Build**:
  - `npx tsc --noEmit` → exit `0` (zero errors/warnings under strict TypeScript 7 settings).
  - `npx vite build --outDir /tmp/tdk_m1_rev1_dist` → exit `0` (`✓ 22 modules transformed`, built in `284ms`; `/tmp/tdk_m1_rev1_dist` immediately deleted and verified absent).

---

## 2. Itemized Technical Audit & File/Line Citations

### M1.1 — Return Beacon Closed 3D Dish & Physical Mast Gantry (`src/render/BeaconAndPropsFactory.ts`)
- **Closed Manifold 3D Dish (`lines 307–486`)**: Replaced the detached open single-sided cone with a solid beveled 3D telemetry dish (`rearBoss`, `dishShell`, `dishRim`, `3 × rimClamp`, recessed dark `innerReflector`, `feedPedestal`, `feedMast`, `3 × fStrut`, `emitterHorn`, `emitterLens`) tilted skyward (`rotation.x = 0.78` at `z = +0.60`) and balanced on `-Z` (`z = -0.40`) by `transceiverPod`, `podStripe`, and twin `whip` + `whipTip` stubs. Every Layer-0 mesh uses closed primitives (`openEnded !== true`), eliminating backface culling from both the 3/4 battle view and Stage 5 victory camera; `skyBeam` (`lines 489–505`) stays strictly on Layer 1 (`skyBeam.layers.set(1)`).
- **Physical Structural Load Path & Clearances (`lines 230–306`)**:
  - `upperMastCollar` (`y = 1.70`, `r = 0.52..0.57`) + `coreSocketRing` (`y = 1.76`, inner bore `r = 0.312m >` breathing `coreMesh` radius `0.258m` at `y = 1.808`) bridge `mast` top (`y = 1.755`) into 3 stationary gantry legs (`legGroup` at `60°/180°/300°`, `lines 249–295`).
  - Gantry legs sit at exact `60°` midpoints between `signalFins` (`0°/120°/240°`, `~36cm` chord clearance even during Stage 5 fin flare) and clear the rotating `coreMesh` (`y = 1.98`, `r <= 0.38m`) by `~15cm` radially (`midKnuckle` inner face `x ≈ 0.53m`).
  - `azimuthRing` (`y = 2.50`, `TorusGeometry(0.35, 0.06)`) + `slewRing` (`y = 2.57`, `TorusGeometry(0.35, 0.052)`) provide an open central bore of `r = 0.29m > skyBeam` radius `0.249m` at `y = 2.50`, and the cantilevered `+Z` gimbal yoke (`z >= +0.326m`) keeps the vertical beam completely unobstructed across full `360°` dish rotation.
- **Interface Compatibility (`lines 14–21, 507`)**: `ReturnBeaconRig` (`{ group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam }`) is 100% preserved for `GameEngine.ts` and `CinematicDirector.ts`.

### M1.2 — `TowerRig` Contract 1, T3 Sub-Parts, Right-Handed Flap Hinges & Magnetic `weaponPitch` (`src/types.ts`, `src/render/TowerFactory.ts`)
- **`TowerRig` & `idleCore` (`src/types.ts:119-151`, `TowerFactory.ts:77-81, 234-237, 468-471, 702-706`)**: Added `FlapHingeAxis`, `HingedFlapUserData`, and `idleCore?: THREE.Object3D` while preserving all existing `TowerRig` fields. Populated `idleCore` (with `userData.restPos` and `userData.restScale`) for all 3 towers (`coreGem` on `autocannon`, `tierCore` on `mortar`, `coreMesh` on `magnetic`).
- **Promised T3 Secondary 3D Sub-Parts (`gameConfig.ts:265, 328, 391`)**:
  - **Autocannon T3 (`顶部开合散热鳍片`, `TowerFactory.ts:329-380`)**: `topRadiatorGrp` inside `t3Turret` with `tagArcFlyPart(topRadiatorGrp, 0, 1.75, -0.55)`, `#FF9F1C` `thermalCore`, and 2 hinged `louverPivot` assemblies.
  - **Mortar T3 (`光学测距摇臂`, `TowerFactory.ts:531-612`)**: `rangefinderArm` inside `t3Turret` at `(-0.8, 0.8, -0.06)` with `tagArcFlyPart(rangefinderArm, -1.65, 1.95, 0.45)`, articulated joint/boom, cream housing, tier brow trim, and `#22D3EE` `opticLens`.
  - **Magnetic T3 (`三向磁通增幅柱`, `TowerFactory.ts:733-796`)**: `3 × fluxPylon` inside `t3Turret` at `60°/180°/300°`, `r = 0.85m` with `tagArcFlyPart(...)`, inward `bridgeStrut`s bolted into `pedCore`, dual `#C084FC` / `tierTrimMat` induction coils, and octahedron tips.
- **Right-Handed Outward/Upward `hingedFlaps` Kinematics (`TowerFactory.ts:63-75, 376, 416, 635, 815`)**:
  - Verified right-hand rotation matrices for all 10 flaps across all 3 towers:
    - Autocannon (`2 × louverPivot` `minTier: 3`, `openAngle: -0.58`; `2 × flapPivot` `minTier: 4`, `openAngle: -0.55`, `hingeAxis: 'x'`): positive-`Z` slats rotate upward (`-z sin θ > 0`).
    - Mortar (`2 × doorHinge` `minTier: 4`, `hingeAxis: 'y'`, `openAngle: -sx * 0.58`): outer hinges (`x = sx * 0.36`, `z = -0.70`) with inward door bodies (`local x = -sx * 0.15`) swing rearward (`z' = -0.116 < -0.04`) cleanly away from the rear capacitor housing, matching `GameEngine.ts:1154`.
    - Magnetic (`4 × petalPivot` `minTier: 4`, `hingeAxis: 'z'`, `openAngle: -0.48`): radial pivots (`rotation.y = -pa`) with petals at `(+0.10, +0.14, 0)` flare radially outward (`x' = +0.153 > +0.10`).
- **Magnetic `weaponPitch` & Tier Visibility Helpers (`TowerFactory.ts:647-711, 860-893`)**:
  - `outerRingGrp`, `coreMesh`, and `muzzle` are parented under `weaponPitch` at `(0, 1.15, 0)` (`weaponPitch.children.length === 3`), preserving world rest height `0.34 + 1.15 = 1.49m` and enabling Stage 2A beat-3 snap (`CinematicDirector.ts:164-165, 192`).
  - Exported `setTowerTierVisibility(rig, tier)` and added optional `options?: { visibilityOnly?: boolean }` to `applyTowerTierVisuals(rig, tier, options)` with 100% backward compatibility for existing 2-argument callers (`CinematicDirector.ts:209, 303`).

### M1.3 — `1.5x` Supersampled Canvas & Exact `#1A1033` Outline (`src/render/ToonOutlineComposer.ts`)
- **`1.5x` Backing Buffer & CSS Preservation (`lines 138-145, 423-442, 468-486, 551-556`)**: Enforces `setPixelRatio(1)` (never stacking `devicePixelRatio`) and `setSize(w, h, false)` (`updateStyle = false`), keeping CSS layout at `100% × 100%` (`getBoundingClientRect()` raycast/projection in `GameEngine.ts:1469, 1620` stays 100% aligned) while rendering and blitting 1:1 at `1.5x`.
- **Silent `RGBA16F` MSAA Probe (`lines 163-175, 316-421`)**: Uses `renderer.extensions.has('EXT_color_buffer_float') && !renderer.extensions.has('WEBGL_multisampled_render_to_texture')` + scratch FBO completeness check (`verifyRgba16fMsaaCompleteness` restoring all GL bindings) with clean `UnsignedByteType` fallback and `resolveDepthBuffer: false`.
- **Closed-Form Inverse ACESFilmic + sRGB (`lines 5-96, 304-308`)**: Cross-checked row-major `ACES_INPUT_MAT_INV` & `ACES_OUTPUT_MAT_INV`, rational quadratic `RRTAndODTFit` inverse, and `0.41666` OETF inverse directly against `node_modules/three/src/renderers/shaders/ShaderChunk/tonemapping_pars_fragment.glsl.js` (`lines 35-74`), plus `vec4(texel.rgb, 1.0)` in Pass 5 `blitMaterial`. `grazing^3` slope compensation (`line 245`) and Pass-4 Layer-1 / `vfxScene` outline immunity (`lines 540-548`) are intact.

### M1.4 — Non-Bleaching Chest Celebration & Safe GPU Disposal (`src/fx/VfxManager.ts`)
- **Contract 2 `spawnChestOpenCelebration` (`lines 298-324`)**: Spawns 3 expanding gold/cyan ground rings + 18 radial outward rim sparkles + front clasp metallic sparks with zero vertical `AdditiveBlending` cylinder, while keeping `spawnClimaxBurst` (`lines 255-291`) untouched.
- **Safe GPU Resource Disposal (`lines 76-80, 635-714`)**:
  - Reuses shared `rustDebrisMat` and `greyDebrisMat` across `debris3D`.
  - `disposeMortarShell` (`lines 635-651`) disposes `THREE.Sprite.material` ONLY — never disposing Three.js's global singleton `Sprite.geometry` and never disposing shared `getToonTextures().softGlow`.
  - `disposePickupGroup` (`lines 653-668`) deduplicates shared intra-coin/intra-crystal geometries and materials via `Set` before calling `.dispose()`.
  - `clearAll()` (`lines 670-701`) and `dispose()` (`lines 703-713`) cleanly release all transient and instance-owned GPU resources without touching shared `ToonMaterials` textures.

---

## 3. Conclusion

All M1 deliverables (`M1.1`–`M1.4`) and Interface Contracts (`1`–`3`) are satisfied with clean mathematical precision, 100% backward compatibility with `GameEngine.ts` and `CinematicDirector.ts`, and zero workspace or preview side-effects. **APPROVE** for M1 gate completion.
