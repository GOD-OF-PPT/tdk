# Handoff Report — Survey Track 2: 3D Modeling, Toon Shading, Outline, Map/Camera & 5-Stage Presentation Audit

**Executive Summary**: Every 3D gameplay entity, 4-step `MeshToonMaterial` shader, Layer-separated `#1A1033` normal+depth post-processing outline pass, lunar map, and 5-stage presentation beat in `/home/antigravity/GOD-OF-PPT/tdk/src/**` is implemented in real procedural Three.js (0 `MISSING` features, 0 flat SVG 3D substitutes), **but 7 concrete `PARTIAL / DEFECTIVE` bugs** (plus 3 minor polish gaps) degrade visual fidelity, mechanical credibility, and mobile portrait framing and should be fixed before final delivery.

---

## 1. Observation

All observations were verified directly via line-by-line inspection of `/home/antigravity/GOD-OF-PPT/tdk/src/**` against `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md` and cross-checked against rendered WebGL frames in `scratch/lunar_shots/*.png` (full breakdown in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_explorer_survey_2/analysis.md`).

### Complete Categorization by Spec Requirement

#### Track 1: Authentic 3D Modeling & Art Direction
- **[COMPLETE & VERIFIED IN CODE] 3D Geometry for Towers, Enemies, Boss, Gold Coins, Energy Crystals & Victory Supply Crate (No Flat SVG Substitutes)**:
  - Towers (`src/render/TowerFactory.ts:63-604`), Enemies & Boss (`src/render/EnemyFactory.ts:15-323`), 3D Beveled Gold Coins (`src/render/BeaconAndPropsFactory.ts:88-109` — `CylinderGeometry` disc + `TorusGeometry` rim + `RoundedBoxGeometry` center ingot bar), 3D Faceted Energy Crystals (`BeaconAndPropsFactory.ts:114-137` — 6-sided prism + upper/lower hexagonal cones), and 3D Supply Crate (`BeaconAndPropsFactory.ts:355-414` — armored tub, rear `lidPivot`, `claspMesh`) are all real 3D meshes in `solidScene`. (2D `<svg>` in `src/ui/UIManager.ts:5-26` is used strictly inside HUD build-card buttons while `createGhostTowerPreview` at `TowerFactory.ts:669-688` renders a real 3D mesh preview on the pad.)
- **[PARTIAL / DEFECTIVE] Return Beacon Upper Telemetry Dish Detached & Backface-Culled**:
  - `src/render/BeaconAndPropsFactory.ts:181-185, 228-241`: `mast` top ends at `y = 1.18 + 1.15/2 = 1.755` (`coreMesh` is at `y = 1.98`), while `dishGroup` sits at `y = 2.58` with **no physical support bracket/strut** connecting it to the beacon body. Furthermore, `dish` uses `new THREE.ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded = true`) with single-sided `makeToonMaterial` (`THREE.FrontSide`) rotated `dish.rotation.x = Math.PI * 0.82`. From the 3/4 camera, the open interior is backface-culled, leaving a jagged paper-thin crescent sliver and floating `needle` rod inside `skyBeam` (visible in `08_stage5_victory_beacon_and_3d_chest.png`).
- **[COMPLETE & VERIFIED IN CODE] Chunky Cartoon Mech Toy Proportions & Mechanical Details**:
  - `RoundedBoxGeometry` beveled armor plates, stubby barrels (`TowerFactory.ts:237-262, 398-418`), stepped bases (`109-120`), exposed trunnions/joints (`116, 376`, `EnemyFactory.ts:298-322`), base rivets (`TowerFactory.ts:43-55, 134-143`), real 3D extruded-tooth gears (`createGearMesh` at `TowerFactory.ts:10-41`), faceted `OctahedronGeometry` cores, and physical panel height steps.
- **[COMPLETE & VERIFIED IN CODE] Faction & World Color Palette Harmony**:
  - `src/render/ToonMaterials.ts:320-345`: Cream-white (`0xf3efe6`), deep-blue (`0x223458`), hazard-orange (`0xf59e0b`) player towers; restrained blue-grey/purple-grey/cool-cyan (`#2b3347`, `0x332f48`, `0x4cc9e0`) lunar station with `#16192b` fog; dark-grey (`0x353844`), rust-red (`0x9b392d`/`0xbe4837`), red-sensor (`0xff2b3d`) enemies; high saturation reserved strictly for weapons, cores, CTAs, and key VFX.

#### Track 2: Tier Progression (T1 -> T2 -> T3 -> T4) & Weapon Identity
- **[PARTIAL / DEFECTIVE] 4-Tier Geometric Progression vs T3 `partHeadline` Sub-Parts**:
  - `src/render/TowerFactory.ts:108-603` builds distinct 3D geometry across all 4 tiers for all 3 towers (T1 single pedestal + starter turret -> T2 4 hydraulic outrigger struts + shields/apron/cowls -> T3 twin drums / plasma pods / counter-ring -> T4 visor crest, pauldrons, crown arch, halo petals & 3D `specialGear`).
  - **Defect**: `src/config/gameConfig.ts:265, 328, 391` (`partHeadline`) and comments in `TowerFactory.ts:286, 438` promise secondary T3 mechanical parts (`顶部开合散热鳍片` on Autocannon T3, `光学测距摇臂` on Mortar T3, `三向磁通增幅柱` on Magnetic T3) that are absent from `t3Turret` (`TowerFactory.ts:287-305, 439-453, 566-573`).
- **[COMPLETE & VERIFIED IN CODE] Selective Tier Coloring (`Green -> Blue -> Purple -> Gold`) & Stable Weapon Recognition Color**:
  - `src/render/TowerFactory.ts:76-106, 636-654`: `applyTowerTierVisuals` updates only `coreMaterial`, `tierTrimMat` (nameplate, collar, trim caps, T4 gear/crest), and `setMaterialRimColor` while keeping `creamMat`, `deepBlueMat`, and each weapon's signature `weaponAccentMat` (`#FF9F1C` autocannon, `#22D3EE` mortar, `#C084FC` magnetic) invariant across T1–T4.
- **[PARTIAL / DEFECTIVE] Mechanical Articulation & Idle Animations (`ORIGINAL_REQUEST.md:83-85, 98`)**:
  - Verified working: Autocannon yaw + alternating L/R barrel Z-recoil (`src/game/GameEngine.ts:1123-1144`), Mortar high-elevation tube recoil + parabolic ground-targeted shell + cyan shockwave (`GameEngine.ts:1146-1187`, `src/fx/VfxManager.ts:130-194`), Magnetic continuous dual-ring & core spin accelerating (`2.1->9.5`, `2.5->14`) + clamps expanding (`0->0.36 rad`) during `0.36s` pre-attack window + purple ground pulse & non-stacking refreshable slow ring (`GameEngine.ts:911-920, 1068-1088, 1189-1209`).
  - **Defects**:
    1. Autocannon `coreGem` (`TowerFactory.ts:213`) and Mortar `tierCore` (`393`) are not stored on `TowerRig` and never rotate or breathe in idle; no tower performs idle breathing or idle heat-sink fin opening/closing (`待机有呼吸/核心旋转/散热片开合`, `ORIGINAL_REQUEST.md:98`).
    2. Mortar's rear bay doors in `fireMortar()` (`GameEngine.ts:1153-1158`) snap open and reset via raw `setTimeout(() => { door.rotation.y = 0; }, 240)` (ignoring pause / 2x speed, with no tween).
    3. `src/game/CinematicDirector.ts:421-423` (`tl.to(flap.rotation, { x: -0.55, ... })`) rotates around **`x`** for all 3 towers, which hinges Autocannon's horizontal flaps properly (`TowerFactory.ts:335`) **but clips Mortar's vertical rear doors into the hull** (their hinge axis is **`y`**, `TowerFactory.ts:469`) and **twists Magnetic's radial crown petals sideways** (their radial flare axis is **`z`**, `TowerFactory.ts:585`).
- **[COMPLETE & VERIFIED IN CODE] Enemy Locomotion, Distinct Deaths, On-Demand HP Bars, Target Cancellation & Hover Contact Shadows**:
  - `src/game/GameEngine.ts:828, 871-894, 1012-1031, 1091-1095, 1226, 1265-1270`: Rolling wheels (`rover`), low-altitude hover bob + spinning ducted rotors + dynamic `shadowBlob` scale/opacity scaling with `hoverY` (`swarm`, `lines 1019-1025`), spinning sprockets + 3D auger (`drill`/`elite_drill`/`boss_crawler`), 3 distinct non-boss death animations + Boss chain-explosion death, HP bars hidden until damaged (except Elite/Boss), and immediate target lock clearing upon death.

#### Track 3: Toon Shading & `#1A1033` Normal+Depth Post-Processing Outline
- **[COMPLETE & VERIFIED IN CODE] 4-Step `MeshToonMaterial` + Stepped Rim Light + Balanced Scene Lighting**:
  - `src/render/ToonMaterials.ts:20-36, 239-242, 269-317` + `src/game/GameEngine.ts:148-171`: 4-band `NearestFilter` `DataTexture` ramps (`grad4Standard`, `grad4Metal` non-mirror stepped metal), `onBeforeCompile` stepped Fresnel tier rim light, and Hemisphere + Directional key + cool back-rim lighting.
- **[COMPLETE & VERIFIED IN CODE] Normal+Depth Silhouette/Inner Seam Hierarchy, Slope Compensation & Transparent VFX/UI Protection**:
  - `src/render/ToonOutlineComposer.ts:92-172, 243-278`: Outer depth silhouette (`rOuter = 1.75` texels) vs inner view-normal seams (`rInner = 0.88` texels, `0.78` weight); `depthThreshold = minDepthRef * (0.075 + 0.36 * grazing^3)` (`line 138`) completely prevents diagonal striping on tilted ground/armor planes; Layer 1 overlays (`shadowBlob`, `slowRing`, `hpBarGroup`, `ghostTowerPreview`, pad `ring`, `skyBeam`, `fissureGroup`, `innerGlow`) and `vfxScene` (`rangeRing`, `selectRing`, `stars`, `tracers`, `sparks`, `rings`, `bossWarningMesh`) render in Pass 4 *after* Pass 3 outline with zero outline contamination.
- **[PARTIAL / DEFECTIVE] `1.5x` Supersampling Canvas Backing-Store Sizing & `#1A1033` Post-Outline ToneMapping**:
  - **Defect A (HiDPI/Mobile Blur)**: `src/render/ToonOutlineComposer.ts:33, 210-225, 280-281` correctly avoids multiplying `devicePixelRatio` (`setPixelRatio(1)`) and sizes `normalDepthRT` + 4x-MSAA `msaaSceneRT` to `1.5x` CSS dimensions (`w, h`), **but** `this.renderer.setSize(safeW, safeH, false)` (`line 211`) sets the screen `<canvas>` buffer to `1.0x` CSS pixels (`390x844` on mobile), downsampling `1.5x -> 1.0x` before the browser stretches `1.0x -> 2.0x/3.0x` (`11_mobile_portrait_station.png`).
  - **Defect B (`#1A1033` Color Shift & 8-Bit Clamp)**: `msaaSceneRT` (`line 62`) is `THREE.UnsignedByteType` (clamping HDR emissives `>1.0` and quantizing linear `0x1a1033`), and Pass 5 (`blitMaterial`, `lines 181, 197-198`) runs `ACESFilmicToneMapping` (`exposure = 1.04`) *after* Pass 3 composites `uOutlineColor`, toe-crushing `#1A1033` (`rgb(26,16,51)`) to `#150628` (`rgb(21,6,40)`).

#### Track 4: Map, Worldbuilding Props & Camera
- **[COMPLETE & VERIFIED IN CODE] 3D Lunar Facility Slab Thickness, Road vs Buildable Deck Distinction & Non-Occluding Props**:
  - `src/render/BeaconAndPropsFactory.ts:416-614`: Multi-layered 3D diorama slab (`upperSlab` + `trimSkirt` + `regolithBase` + front cyan markers), recessed-look `haulRoad` ribbon with hazard curbs & directional chevrons vs gridded `lunarDeck` + 10 raised octagonal `BUILD_PADS` (`>=2.8m` off road centerline), and perimeter broken monorail (`z=-8.35`), cargo crates, west maintenance platform, rotating portal warning lights, subtle deck repair marks, craters, and distant boulders with zero road/pad occlusion.
- **[PARTIAL / DEFECTIVE] Camera Stability, Shake Discipline & Mobile Portrait Framing**:
  - Default camera stability and major-event-only camera shake (`GameEngine.ts:307-313, 950, 993, 1251`, `CinematicDirector.ts:408, 532, 551, 593, 656, 673, 739, 780`) are clean.
  - **Defect**: In `GameEngine.ts:292`, `distScale = THREE.MathUtils.clamp(1.38 / Math.max(0.44, aspect), 1.0, 2.65)` caps `distScale` at `2.65`. On `390x844` portrait (`aspect = 0.462`, `hFov = 23.2°`), horizontal half-span at the beacon row is `13.68m` (`x ∈ [-13.83, +13.53]`), clipping both the Mine Entrance (`x = -14.13`) on the left and the Return Beacon (`x = +14.70`) on the right (`11_mobile_portrait_station.png`). Likewise, Stage 5 Victory camera (`CinematicDirector.ts:682-696`) uses fixed widescreen coordinates (`dist = 10.4m`, portrait half-span `2.14m`), clipping both Chest (`x = 9.75`) and Beacon (`x = 12.95`) in portrait.

#### Track 5: All 5 Mandatory Presentation Stages
- **[COMPLETE & VERIFIED IN CODE] Stage 1 (Prep & Deployment)**:
  - `CinematicDirector.ts:88-148`, `GameEngine.ts:755-771`, `UIManager.ts:291-306`: `1.75s` lunar vista camera sweep into station, sequential 4-lamp Return Beacon ignition (`0.28s..1.00s`) with ascending boot tones (`AudioManager.ts:101-107`), periodic `4.2s` gentle hop on empty build pads, and concise 3-step `#onboarding-guide`.
- **[PARTIAL / DEFECTIVE] Stage 2 (Build & Upgrade)**:
  - Base squash-rebound + dust puff, non-pausing T2/T3 lift + staggered curved arc fly-in + char-by-char slam title + `▲+stat` deltas, and simulation-pausing (`mode = 'legendary_reveal'`) T4 golden hero reveal stage (`CinematicDirector.ts:154-463`, `GameEngine.ts:533-552`, `UIManager.ts:173-207`) are implemented.
  - **Defects**: (1) Magnetic tower leaves `weaponPitch` empty (`TowerFactory.ts:488`), making Stage 2A's 3rd mount beat (`CinematicDirector.ts:192`) a no-op; (2) Rapid consecutive upgrades (`T1->T2->T3->T4`) do not cancel previous timelines for that tower, allowing earlier `lockEnd` callbacks to overwrite `turretYaw.position` and `#upgrade-stamp` mid-animation; (3) `applyTowerTierVisuals` switches tier color at `t = 0` (`CinematicDirector.ts:209, 303`) prior to part lock-in; (4) T4 reveal animates `flap.rotation.x` (`line 422`), mis-rotating Mortar (`y`) and Magnetic (`z`) flaps.
- **[COMPLETE & VERIFIED IN CODE] Stage 3 (Boss Charge & Entrance + Active Skill)**:
  - `CinematicDirector.ts:470-586`, `AudioManager.ts:168-188`, `GameEngine.ts:922-979`: Escalating entrance tremor, flaring portal warning lights (`emissiveIntensity: 3.2`, rotor speed `14.0`), glowing orange-red ground fissures, 45 inward suction particles + `~1.0s` rising turbine pitch -> abrupt `0.12s` contraction (`fissureGroup.scale -> 0.22`, `shakeIntensity = 0`) -> `1.49s` shockwave eruption & Boss spawn; Boss active skill halts for `1.25s`, raises 2-joint hydraulic arm (`-0.95/-0.65 rad`), projects pulsing crimson `hazardZone` ground warning circle (`r = 5.2m`), and slams to stun nearby towers for `2.2s`.
- **[COMPLETE & VERIFIED IN CODE] Stage 4 (Combat Climax & Burst)**:
  - `GameEngine.ts:896-908, 1229-1253, 1272-1312`, `CinematicDirector.ts:409, 591-596, 630-679`: Normal hits trigger brief sparks + `85ms` per-instance white flash + backward recoil tilt; slow-motion (`triggerHitStop` / `setSimTimeScale(0.2)` / `legendary_reveal`), climax energy pillars, and 3D `spawnArmorBreakDebris` are strictly reserved for Wave 4/7 Elite kills, T4 Legendary upgrades, and Wave 8 Final Boss armor-break/death.
- **[PARTIAL / DEFECTIVE] Stage 5 (Victory Settlement & Reward Claim)**:
  - `CinematicDirector.ts:681-804`, `GameEngine.ts:662-686, 1484-1491`, `UIManager.ts:598-659`: Beacon ignites `18m` skyward evacuation beam, 3D Supply Chest drops onto plaza with squash-rebound + dust ring, clicking `#btn-claim-rewards` (or tapping the 3D chest) swings open `lidPivot` (`rotation.x -> -2.05`), fountains 8 3D Gold Coins + 8 3D Faceted Energy Crystals, rolls `+320` gold & `+8` crystals into totals, and enables `#btn-play-again`.
  - **Defects**: (1) `chest.claspMesh.visible = false` (`CinematicDirector.ts:778`) hides the front lock clasp instantaneously instead of animating it popping open (`触发锁扣弹开`); (2) `spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false)` (`line 781`) renders an `AdditiveBlending` yellow cylinder in Pass 4 directly in front of the open chest and fountaining loot, locally overexposing and bleaching the 3D chest, coins, and blue crystals (`09_stage5_3d_chest_open_loot_fountain.png`).

---

## 2. Logic Chain

1. **From Geometry & Shader Inspection (`TowerFactory.ts`, `EnemyFactory.ts`, `BeaconAndPropsFactory.ts`) -> Defects D1 & D2**:
   - Inspecting `BeaconAndPropsFactory.ts:232` shows `ConeGeometry(0.58, 0.32, 12, 1, true)` (`openEnded`) paired with `makeToonMaterial` (`FrontSide`) inverted at `rotation.x = Math.PI * 0.82` and placed `0.82m` above `mast` top (`182, 230`), mathematically guaranteeing backface culling of the interior surface and physical detachment — directly confirmed by the floating sliver in `08_stage5_victory_beacon_and_3d_chest.png`.
   - Tracing `hingedFlaps` local transforms in `TowerFactory.ts:335, 469, 585` against `CinematicDirector.ts:422` (`flap.rotation.x = -0.55`) and `GameEngine.ts:1035-1121` proves that Mortar (`y`-hinge) and Magnetic (`z`-hinge) rotate on wrong axes during T4 reveal, while idle core/vent animations and T3 secondary `partHeadline` parts are absent.
2. **From Render Pipeline Trace (`ToonOutlineComposer.ts`, `GameEngine.ts`) -> Defects D3 & D4**:
   - Tracing Pass 1 -> Pass 5 (`ToonOutlineComposer.ts:207-282`) proves Layer 0/1 + `vfxScene` ordering completely protects transparent VFX/rings/UI from outlines, **while** `renderer.setSize(safeW, safeH, false)` (`line 211`) forces a `1.5x -> 1.0x` downsample prior to HiDPI browser upscaling (`11_mobile_portrait_station.png`), and Pass 5 `ACESFilmicToneMapping` (`line 197`) over 8-bit `msaaSceneRT` (`line 62`) shifts `#1A1033` to `#150628`.
3. **From Perspective Frustum Math (`GameEngine.ts:275, 286-305`, `CinematicDirector.ts:682-696`) -> Defect D5**:
   - At `390x844` (`aspect = 0.462`, `fov = 48°`), `tan(hFov/2) = 0.2057`. Because `distScale` is clamped to `2.65` (`GameEngine.ts:292`), horizontal frustum half-width at `z = 2.4` is `13.68m` (`x_max = +13.53m < +14.70m` beacon outer radius; `x_min = -13.83m > -14.13m` portal outer edge), explaining why `tests/e2e.mjs:441` passed center-point projection (`x ≈ 12px` and `376px`) while both outer meshes were clipped (`11_mobile_portrait_station.png`).
4. **From GSAP Timeline Lifecycle (`CinematicDirector.ts:154-463, 762-804`) -> Defects D6 & D7**:
   - `Magnetic` `weaponPitch` (`TowerFactory.ts:488`) has `0` children (`CinematicDirector.ts:192` no-op); `CinematicDirector` never cancels active per-tower timelines on rapid re-upgrade; `chest.claspMesh.visible = false` (`line 778`) skips clasp pop physics; and `spawnClimaxBurst` (`line 781`) places a Pass 4 additive pillar over `chestPos` (`09_stage5_3d_chest_open_loot_fountain.png`).

---

## 3. Caveats

1. **Camera Move Policy vs T4 Hero Reveal**: `ORIGINAL_REQUEST.md:95` states large camera moves are only for opening, Boss entrance, and victory, whereas `ORIGINAL_REQUEST.md:104` mandates a dedicated golden hero reveal stage (`暂停战斗模拟并进入专属金色英雄揭晓舞台`) for T4 Legendary upgrades (`CinematicDirector.ts:343-357`). Because simulation is paused during `legendary_reveal`, this zoom fulfills line 104 without disturbing active combat camera stability; only portrait framing adaptation is needed.
2. **Out-of-Scope Track Boundary**: Gameplay numerical balance, standalone HTML bundling (`scratch/bundle_standalone.mjs` / `starforge_ark_cradle.html`), and preview server daemon status belong to sibling survey tracks and were not duplicated here beyond verifying `style.css:57` (`#app { height: 580px }`) and `ResizeObserver` (`GameEngine.ts:215-218`) canvas sizing.
3. **Minor Polish Notes (Non-Blocking)**:
   - Stage 3 pure acoustic silence between vacuum contraction end (`1.46s`) and Boss slam (`1.49s`) in `AudioManager.ts:174-177` is `~30ms` (widening to `~90–120ms` sharpens `骤然收缩静默`).
   - Stage 4B Boss chain explosion (`CinematicDirector.ts:648-679`) triggers 2 bursts (`0.18s` silent + `0.55s` audible); adding 3–4 staggered audible sub-explosions improves `连环爆炸击杀`.
   - `VfxManager.ts` removes mortar shells (`499`), debris materials (`554`), and 3D loot meshes (`592`) without `.dispose()`.

---

## 4. Conclusion

The 3D rendering, cel-shading, `#1A1033` outline pipeline, industrial lunar diorama, and 5-stage presentation architecture in `src/**` are structurally sound and authentic, requiring targeted surgical fixes to **7 `PARTIAL / DEFECTIVE` items** (detailed with exact fix designs in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_explorer_survey_2/analysis.md`):
1. **`src/render/BeaconAndPropsFactory.ts:228-241`**: Replace open backface-culled telemetry dish cone with a solid beveled 3D dish + support bracket connected to the mast.
2. **`src/render/TowerFactory.ts` + `src/game/GameEngine.ts` + `src/game/CinematicDirector.ts:421`**: Expose Autocannon/Mortar cores for idle spin/breathing, add T3 sub-parts matching `partHeadline` (including hinged vents), animate idle vent breathing + delta-timed Mortar door recoil, and drive each flap along its true local hinge axis (`x` / `y` / `z`).
3. **`src/render/ToonOutlineComposer.ts:210-225`**: Size `<canvas>` drawing buffer to `(this.ssWidth, this.ssHeight, false)` with `setPixelRatio(1)` so `1.5x` supersampling is preserved on HiDPI/mobile without DPR stacking.
4. **`src/render/ToonOutlineComposer.ts:59-84, 178-201`**: Use `HalfFloatType` (with fallback) on `msaaSceneRT` and apply `#1A1033` outline color without post-outline `ACESFilmic` toe-crushing.
5. **`src/game/GameEngine.ts:286-305` + `src/game/CinematicDirector.ts:343-357, 682-696`**: Raise mobile portrait `distScale` cap from `2.65` to `~3.25` so Mine Entrance and Return Beacon outer bounds fit with margin, and adapt Stage 5 Victory & Stage 2C T4 Hero camera poses for portrait aspect ratios.
6. **`src/render/TowerFactory.ts:488` + `src/game/CinematicDirector.ts:192, 199-463`**: Parent Magnetic upper emitter/ring under `weaponPitch` for Stage 2A build snap, cancel prior per-tower timelines on rapid upgrades, and defer tier color ignition to `lockEnd`/`climaxAt`.
7. **`src/game/CinematicDirector.ts:778-782`**: Animate `chest.claspMesh` popping/tumbling off on reward claim, and replace the chest-occluding additive climax pillar with ground rings + outward sparks + soft `innerGlow` so the 3D coins & crystals fountain without overexposure.

---

## 5. Verification Method

1. **Static Build & Type Check**:
   ```bash
   npm run build
   ```
   *(Run in `/home/antigravity/GOD-OF-PPT/tdk`; must exit `0` with zero TypeScript or Vite errors.)*
2. **Code Inspection Targets**:
   - Inspect `src/render/ToonOutlineComposer.ts:59-227` to verify `renderer.setPixelRatio(1)`, `renderer.setSize(w, h, false)`, and `#1A1033` sRGB output fidelity.
   - Inspect `src/render/BeaconAndPropsFactory.ts:228-245` to confirm closed 3D dish geometry and physical mast attachment.
   - Inspect `src/render/TowerFactory.ts` & `src/game/CinematicDirector.ts` to confirm per-tower timeline cancellation, Magnetic `weaponPitch` children `> 0`, and per-flap hinge axis metadata.
3. **Automated E2E + Visual Frame Verification**:
   ```bash
   npm run test:e2e
   ```
   - Strengthen `tests/e2e.mjs:440-443` to project outer bounding coordinates (`entrance.x - 1.2m >= 8px` and `beacon.x + 1.8m <= width - 8px`) on `390x844` portrait, plus verify Stage 5 Victory portrait framing (`supplyChest` and `beacon` both visible above `#victory-screen`), `08_stage5_victory_beacon_and_3d_chest.png` (solid supported beacon dish), and `09_stage5_3d_chest_open_loot_fountain.png` (popping clasp + crisp `#1A1033`-outlined 3D coins & crystals with zero bleached pillar glare).
   - **Invalidation Conditions**: Any flat 2D/SVG texture replacing a 3D entity, `devicePixelRatio` multiplied on top of `1.5x` RT sizing, dark outlines appearing on transparent rings/particles, or any Stage 1–5 sequence stalling or throwing console/WebGL errors invalidates completion.
