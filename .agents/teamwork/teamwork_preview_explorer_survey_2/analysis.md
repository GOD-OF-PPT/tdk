# Survey Track 2: Exhaustive 3D Modeling, Toon Shading, Outline, Map/Camera & 5-Stage Presentation Audit

**Core Summary**: The codebase (`src/render/**`, `src/fx/VfxManager.ts`, `src/game/CinematicDirector.ts`, `src/game/GameEngine.ts`, `src/ui/UIManager.ts`, `src/audio/AudioManager.ts`) implements genuine procedural Three.js 3D models, 4-band `MeshToonMaterial` cel shading, a Layer-separated `1.5x` normal+depth `#1A1033` post-processing outline pass, and all 5 presentation stages with zero 2D/SVG model substitutes. However, line-by-line inspection and rendered frame verification uncovered **7 concrete `PARTIAL / DEFECTIVE` issues** (plus 3 minor polish items) spanning a backface-culled/floating Return Beacon dish, missing tower idle animations & wrong T4 flap rotation axes, HiDPI/mobile `1.5x -> 1.0x` canvas downsample blur, post-outline ACESFilmic color shift on `#1A1033`, portrait camera horizontal clipping (`distScale` capped at `2.65` and unadapted Stage 5 victory camera), overlapping rapid-upgrade timelines / empty Magnetic `weaponPitch`, and Stage 5B instant clasp disappearance + additive pillar overexposure over the 3D loot fountain.

---

## 1. Complete Audit Matrix Against `ORIGINAL_REQUEST.md`

| ID | Spec Area & Requirement (`ORIGINAL_REQUEST.md`) | Status | Evidence (File Paths & Line Numbers) |
|---|---|---|---|
| **1.1** | Genuine 3D geometry for towers, enemies, Boss, gold coins, energy crystals & victory supply crate (NO flat SVG/2D substitutes) | `COMPLETE & VERIFIED IN CODE` | `src/render/TowerFactory.ts:63-604`, `src/render/EnemyFactory.ts:15-323`, `src/render/BeaconAndPropsFactory.ts:88-137, 355-414`, `src/fx/VfxManager.ts:366-399` |
| **1.2** | Genuine 3D Return Beacon with credible mechanical structure | `PARTIAL / DEFECTIVE` | `src/render/BeaconAndPropsFactory.ts:139-263` — Foundation, lamps, core & fins are solid 3D, **but** `dishGroup` (`229-241`) floats detached at `y=2.58` above `mast` top (`y=1.755`) and uses `ConeGeometry(..., openEnded=true)` with single-sided `FrontSide` material tilted `Math.PI * 0.82`, causing backface-culling disappearance inside the victory beam |
| **1.3** | Chunky cartoon mech toy proportions: beveled armor (`RoundedBoxGeometry`), stubby barrels, heavy bases, exposed joints, rivets, trim, real 3D toothed gears, faceted crystals, geometric height steps | `COMPLETE & VERIFIED IN CODE` | `src/render/TowerFactory.ts:2, 10-55, 109-143, 198-215, 237-262, 348, 398-418, 479, 597`; `src/render/EnemyFactory.ts:154, 216, 247, 290, 298-322` |
| **1.4** | Color palette harmony: cream-white/deep-blue/hazard-orange player mechs; restrained blue-grey/purple-grey/cool-cyan lunar station; dark-grey/rust-red/red-sensor enemies; high saturation reserved for weapons/cores/CTAs/key VFX | `COMPLETE & VERIFIED IN CODE` | `src/render/ToonMaterials.ts:38-165, 320-345`, `src/render/TowerFactory.ts:76-95`, `src/render/EnemyFactory.ts:24-35`, `src/game/GameEngine.ts:133-134` |
| **2.1** | All 3 towers have 4 distinct geometric tiers (T1 single-layer base -> T2 reinforced struts & shields -> T3 expanded weapon modules -> T4 full mech armor & special gears/flaps) | `PARTIAL / DEFECTIVE` | `src/render/TowerFactory.ts:108-603` implements real 3D geometry at T1, T2, T3, and T4 for all 3 towers, **but** T3 `partHeadline` texts (`src/config/gameConfig.ts:265, 328, 391`) advertise T3 sub-parts (`顶部开合散热鳍片`, `光学测距摇臂`, `三向磁通增幅柱`) that were omitted from `t3Turret` (`TowerFactory.ts:287-305, 439-453, 566-573`) |
| **2.2** | Tier colors (`Green -> Blue -> Purple -> Gold`) apply selectively to core, trim, nameplate, rim light, upgrade VFX & T4 backdrop while keeping weapon signature colors (`#FF9F1C` / `#22D3EE` / `#C084FC`) & cream/deep-blue armor stable | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:26-63, 226, 289, 352`, `src/render/TowerFactory.ts:76-106, 636-654`, `src/render/BeaconAndPropsFactory.ts:670-684` |
| **2.3** | Tower combat & idle mechanical articulation around proper pivot axes (autocannon alternating recoil, mortar parabolic arc + shockwave, magnetic pre-fire charge + core spin + purple ground ring, idle breathing/core spin/fin opening-closing) | `PARTIAL / DEFECTIVE` | Combat recoil/yaw/parabolic mortar/magnetic clamps & rings work (`src/game/GameEngine.ts:1046-1209`), **but**: (1) Autocannon & Mortar cores (`TowerFactory.ts:213, 393`) never rotate/breathe; (2) No tower has idle breathing or idle heat-sink fin opening-closing (`ORIGINAL_REQUEST.md:98`), and Mortar's fire-door uses unpaused `setTimeout` (`GameEngine.ts:1155`); (3) T4 reveal animates `flap.rotation.x` (`CinematicDirector.ts:422`), which is the **wrong axis** for Mortar (`y` hinge) and Magnetic (`z` hinge) |
| **2.4** | Enemy locomotion (wheels, hover bob, tracks/drills), distinct death animations, on-demand HP bars, target drop on death, and hover-height-reactive soft contact shadows | `COMPLETE & VERIFIED IN CODE` | `src/game/GameEngine.ts:828, 871-894, 1012-1031, 1091-1095, 1226, 1265-1270`, `src/render/EnemyFactory.ts:326-384` |
| **3.1** | `THREE.MeshToonMaterial` with 4-step discrete `DataTexture` (`NearestFilter`), key + sky/hemisphere + rim + T4 hero light, non-mirror stepped metal look | `COMPLETE & VERIFIED IN CODE` | `src/render/ToonMaterials.ts:20-36, 239-242, 269-317`, `src/game/GameEngine.ts:148-171` |
| **3.2** | Post-processing normal+depth outline: thicker outer silhouette (`r=1.75`) + thinner inner seams (`r=0.88`), grazing-angle slope compensation (`grazing^3`) preventing tilted-surface striping, and Layer 1 + `vfxScene` protection for transparent VFX/particles/rings/UI | `COMPLETE & VERIFIED IN CODE` | `src/render/ToonOutlineComposer.ts:92-172, 243-278`, `src/render/BeaconAndPropsFactory.ts:259, 346, 390, 593, 639-684`, `src/render/EnemyFactory.ts:338, 355, 383`, `src/render/TowerFactory.ts:679` |
| **3.3** | Exact `#1A1033` outline color & `1.5x` supersampling without stacking `devicePixelRatio` + WebGL2 MSAA | `PARTIAL / DEFECTIVE` | `src/render/ToonOutlineComposer.ts:33, 56-84, 178-226, 280-281` — Offscreen RTs use `1.5x` CSS size (`setPixelRatio(1)`) + 4x MSAA, **but**: (1) `renderer.setSize(safeW, safeH, false)` downsamples `1.5x -> 1.0x` canvas backing store, causing `1.0x -> 2.0x` browser upscale blur on HiDPI/mobile; (2) 8-bit `UnsignedByteType` + post-outline `ACESFilmicToneMapping` shifts `#1A1033` to `#150628` and clamps HDR emissives prior to tone mapping |
| **4.1** | Slight top-down 3/4 view showing 3D lunar facility slab thickness; clear road vs buildable deck/pad distinction; non-occluding worldbuilding props (broken monorail, cargo crates, maintenance platform, warning lights, repair marks, craters, distant rocks) | `COMPLETE & VERIFIED IN CODE` | `src/render/BeaconAndPropsFactory.ts:49-83, 265-325, 416-614`, `src/render/ToonMaterials.ts:38-165`, `src/config/gameConfig.ts:70-216` |
| **4.2** | Stable default camera, major moves restricted to key cinematics, camera shake only on major events, and mobile portrait framing keeping Entrance, full Road, and Return Beacon completely legible | `PARTIAL / DEFECTIVE` | Default stability & shake discipline are clean (`GameEngine.ts:307-313`, `CinematicDirector.ts:45-61`), **but** mobile portrait (`390x844`, `aspect=0.462`) clips the Mine Entrance (left) and Return Beacon (right) because `computeBaseCameraPose()` clamps `distScale <= 2.65` (`GameEngine.ts:292`), and Stage 5 Victory camera (`CinematicDirector.ts:682-696`) uses fixed widescreen coordinates that clip both Chest and Beacon in portrait |
| **5.1** | **Stage 1 (Prep & Deployment)**: Lunar vista sweep into station, sequential 4-lamp Return Beacon boot with rising tones, periodic `4.2s` empty build pad hop, concise 3-step guide | `COMPLETE & VERIFIED IN CODE` | `src/game/CinematicDirector.ts:88-148`, `src/audio/AudioManager.ts:101-107`, `src/game/GameEngine.ts:755-771`, `src/ui/UIManager.ts:291-306` |
| **5.2** | **Stage 2 (Build & Upgrade)**: Base drop squash-rebound + dust puff -> turret/weapon mount; non-pausing T2/T3 lift + staggered curved arc part fly-in + char-by-char slam title + `▲+stat` deltas; simulation-pausing T4 golden hero reveal stage | `PARTIAL / DEFECTIVE` | Core choreography works (`CinematicDirector.ts:154-463`, `GameEngine.ts:533-552`, `UIManager.ts:173-207`), **but**: (1) Magnetic tower has an empty `weaponPitch` group (`TowerFactory.ts:488`), making build step 3 (`CinematicDirector.ts:192`) a no-op; (2) Rapid upgrades (`T1->T2->T3->T4`) do not cancel prior timelines on that tower, letting earlier `lockEnd` callbacks clobber `turretYaw.position` & `#upgrade-stamp`; (3) `applyTowerTierVisuals` switches tier color at `t=0` (`lines 209, 303`) before parts fly in; (4) T4 reveal rotates `flap.rotation.x` (`line 422`), clipping Mortar doors and twisting Magnetic petals |
| **5.3** | **Stage 3 (Boss Charge & Entrance + Skill)**: Entrance tremor, flaring hazard beacons, glowing ground fissures, inward suction particles + ~1s pitch climb -> sudden contraction & silence -> shockwave entrance; Boss hydraulic arm wind-up + crimson ground warning circle | `COMPLETE & VERIFIED IN CODE` | `src/game/CinematicDirector.ts:470-586`, `src/audio/AudioManager.ts:168-188`, `src/fx/VfxManager.ts:319-361`, `src/game/GameEngine.ts:922-979` *(Minor polish note: pure silence window between `1.46s` vacuum drop end and `1.49s` impact is ~30ms)* |
| **5.4** | **Stage 4 (Combat Climax & Burst)**: Normal hits use brief sparks + 85ms white flash + recoil tilt; slow-motion, climax energy burst & 3D armor debris strictly reserved for Elite kill, T4 Legendary upgrade, and Final Boss chain-explosion death | `COMPLETE & VERIFIED IN CODE` | `src/game/GameEngine.ts:896-908, 1016-1030, 1229-1253, 1272-1312`, `src/game/CinematicDirector.ts:409, 591-596, 630-679`, `src/fx/VfxManager.ts:236-314` *(Minor polish note: Boss death has 2 explosions at `0.18s` [silent] and `0.55s` [audible]; adding 3–4 audible sub-detonations would enrich chain-explosion feel)* |
| **5.5** | **Stage 5 (Victory Settlement & Reward Claim)**: Beacon sky evacuation beam, 3D supply crate drop onto plaza, clicking claim pops latch open, hinges lid open, fountains 3D gold coins + 3D faceted crystals, rolls totals & supports Play Again | `PARTIAL / DEFECTIVE` | `src/game/CinematicDirector.ts:681-804`, `src/game/GameEngine.ts:662-686, 1484-1491`, `src/ui/UIManager.ts:598-659` — Flow & accounting work, **but**: (1) `chest.claspMesh.visible = false` (`CinematicDirector.ts:778`) hides the clasp instantly instead of animating it popping open (`锁扣弹开`); (2) `spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false)` (`line 781`) places an additive yellow cylinder directly in front of the chest & loot in Pass 4, overexposing and washing out the 3D chest, coins, and crystals (`光效柔和，避免过曝`) |

*(Note: Zero mandatory spec items are completely `MISSING`; all shortfalls are `PARTIAL / DEFECTIVE` implementation defects in existing modules.)*

---

## 2. Detailed Root-Cause Analysis of All 7 `PARTIAL / DEFECTIVE` Items

### Defect D1 — Return Beacon Upper Telemetry Dish Detached & Backface-Culled
- **Location**: `src/render/BeaconAndPropsFactory.ts:181-185, 228-241`
- **Observation**:
  ```ts
  // Central tower mast (top reaches y = 1.18 + 1.15 / 2 = 1.755)
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 1.15, 8), deepBlueMat);
  mast.position.y = 1.18;
  ...
  // Rotating Upper Telemetry Dish (floating at y = 2.58 with no support arm!)
  const dishGroup = new THREE.Group();
  dishGroup.position.set(0, 2.58, 0);
  const dish = new THREE.Mesh(
    new THREE.ConeGeometry(0.58, 0.32, 12, 1, true),
    makeToonMaterial(PALETTE.CREAM_ARMOR, { metallicStep: true })
  );
  dish.rotation.x = Math.PI * 0.82;
  ```
- **Root Cause**:
  1. `ConeGeometry(..., openEnded = true)` has zero thickness and outward-only normals, while `makeToonMaterial()` defaults to `side: THREE.FrontSide`. Tilting the cone `Math.PI * 0.82` (~148°) points its open interior toward the elevated 3/4 camera, so WebGL backface culling discards almost the entire dish, leaving a paper-thin sliver + floating `needle` visibly suspended inside `skyBeam` in Stage 5 (`08_stage5_victory_beacon_and_3d_chest.png`).
  2. There is a `0.82m` vertical gap between `mast` (`y = 1.755`) and `dishGroup` (`y = 2.58`) occupied by the floating `coreMesh` (`y = 1.98`), with no curved support bracket/yoke connecting `dishGroup` to the mast collar.
- **Proposed Fix**: Replace the open single-sided cone with a closed beveled 3D dish (`CylinderGeometry(0.56, 0.18, 0.18, 12)` + recessed dark inner dish disc) mounted on an angled side yoke/bracket rising from the upper mast collar so it has real 3D thickness and credible mechanical support without intersecting `coreMesh`.

---

### Defect D2 — Tower Idle Life Gaps, Wrong T4 Flap Axes & T3 Sub-Part Mismatches
- **Location**:
  - `src/render/TowerFactory.ts:213-215, 286-305, 334-345, 393-395, 438-453, 467-477, 565-595`
  - `src/game/GameEngine.ts:1041-1120, 1153-1158`
  - `src/game/CinematicDirector.ts:420-423`
  - `src/config/gameConfig.ts:265, 328, 391`
- **Observation & Root Cause**:
  1. **Missing Idle Core Spin / Breathing / Vent Breathing** (`ORIGINAL_REQUEST.md:98`: `待机有呼吸/核心旋转/散热片开合/悬浮`):
     - `coreGem` on Autocannon (`TowerFactory.ts:213`) and `tierCore` on Mortar (`TowerFactory.ts:393`) are created as local variables and never exposed on `TowerRig`, so they never rotate or pulse in `updateTowers()`.
     - `hingedFlaps` on T1–T3 towers is empty `[]`; even at T4, `updateTowers()` never breathes/oscillates `hingedFlaps` in idle, and `fireMortar()` (`GameEngine.ts:1155-1157`) uses raw `setTimeout(() => { door.rotation.y = 0; }, 240)` which ignores pause/2x speed and snaps abruptly without easing.
  2. **Wrong Pivot Axis in T4 Hero Reveal (`CinematicDirector.ts:421-423`)**:
     ```ts
     for (const flap of rig.hingedFlaps) {
       tl.to(flap.rotation, { x: -0.55, duration: 0.24, yoyo: true, repeat: 1 }, climaxAt + 0.12);
     }
     ```
     - Autocannon pauldron vents (`TowerFactory.ts:335-341`) hinge around `x` (correct).
     - Mortar rear bay doors (`TowerFactory.ts:468-476`) are vertical doors hinging around **`y`** (`door.position.set(-sx * 0.15, 0, -0.04)`), so animating `rotation.x = -0.55` tilts them through the capacitor housing!
     - Magnetic T4 crown petals (`TowerFactory.ts:582-593`) sit in radial planes (`petalPivot.rotation.y = -pa`, `petal.position.set(0.1, 0.14, 0)`), so their outward flare axis is **`z`**, not `x`!
  3. **T3 `partHeadline` vs Geometry Mismatch**:
     - `gameConfig.ts:265` (`双侧大容量弹鼓 + 顶部开合散热鳍片`), `328` (`双联侧翼脉冲电容仓 + 光学测距摇臂`), and `391` (`双层反向旋转磁环 + 三向磁通增幅柱`) name secondary T3 components that were not added to `t3Turret` in `TowerFactory.ts`. Adding hinged top radiator louvers on Autocannon T3 (and storing each flap's `hingeAxis: 'x' | 'y' | 'z'` + `openAngle` in `flap.userData`), an optical rangefinder arm on Mortar T3, and 3 flux amplifier posts on Magnetic T3 resolves both the T3 text/model discrepancy AND enables genuine idle heat-sink fin breathing from T3+ (or T1+ if starter vents also hinge)!

---

### Defect D3 — HiDPI / Mobile `1.5x -> 1.0x` Canvas Backing-Store Downsample Blur
- **Location**: `src/render/ToonOutlineComposer.ts:32-38, 207-226, 280-281`
- **Observation**:
  ```ts
  public setSize(cssWidth: number, cssHeight: number): void {
    const safeW = Math.max(2, Math.round(cssWidth));
    const safeH = Math.max(2, Math.round(cssHeight));
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(safeW, safeH, false);
    ...
    let w = Math.max(2, Math.round(cssWidth * this.supersampleScale));
    let h = Math.max(2, Math.round(cssHeight * this.supersampleScale));
  ```
- **Root Cause**:
  - `normalDepthRT` and `msaaSceneRT` correctly render at `1.5x` CSS dimensions (`w, h`) without multiplying `devicePixelRatio` (`ORIGINAL_REQUEST.md:100`).
  - However, `this.renderer.setSize(safeW, safeH, false)` sets the `<canvas>` drawing buffer (`canvas.width`, `canvas.height`) to `1.0x` CSS pixels (`390 x 844` on mobile). In Pass 5 (`lines 280-281`), the `1.5x` `msaaSceneRT` (`585 x 1266`) is downsampled to `390 x 844` (throwing away 56% of rendered pixels), and on `devicePixelRatio = 2` or `3` screens the browser compositor then stretches `390 x 844` back up to `780 x 1688`, producing visibly blurry 3D edges beneath sharp Retina UI text (`11_mobile_portrait_station.png`).
- **Proposed Fix**: Set `this.renderer.setSize(w, h, false)` (keeping `this.renderer.setPixelRatio(1)` and CSS `#game-canvas { width: 100%; height: 100%; }`). That keeps GPU rendering strictly at `1.5x` CSS resolution (never multiplying `devicePixelRatio`!), delivers full `1.5x` crispness directly to the compositor on HiDPI/mobile displays, and lets desktop `1x` viewports smoothly downsample `1.5x -> 1.0x`.

---

### Defect D4 — Post-Outline `ACESFilmicToneMapping` Color Shift on `#1A1033` & 8-Bit Clamping
- **Location**: `src/render/ToonOutlineComposer.ts:59-65, 70-84, 178-201`, `src/game/GameEngine.ts:129-130`
- **Observation & Root Cause**:
  1. `msaaSceneRT` uses `type: THREE.UnsignedByteType` (`line 62`), clamping linear emissive values `> 1.0` (`coreMaterial` `1.35`, `weakPointCore` `2.1`, `statusLampMats` `1.8`) to `1.0` before Pass 5 tone mapping, and quantizing dark linear `THREE.Color(0x1a1033)` (`0.0103, 0.0052, 0.0331`) to `8-bit` integers (`3/255, 1/255, 8/255`).
  2. Pass 3 composites `uOutlineColor` into `msaaSceneRT`, and Pass 5 (`blitMaterial`, `lines 181, 197-198`) runs `#include <tonemapping_fragment>` (`ACESFilmicToneMapping` at `exposure = 1.04`) over the outline pixels as well. `ACESFilmic` toe-compresses `(0.0103, 0.0052, 0.0331)` down to `(0.0068, 0.0018, 0.0210)` linear, outputting sRGB **`#150628`** instead of exact **`#1A1033`**.
- **Proposed Fix**: Use `THREE.HalfFloatType` on `msaaSceneRT` (when WebGL2 `EXT_color_buffer_float` / `HalfFloatType` MSAA is supported, with `UnsignedByteType` fallback), and either apply the `#1A1033` outline blend inside `blitMaterial` *after* `#include <tonemapping_fragment>` (in exact sRGB `#1A1033` = `vec3(0.10196, 0.06275, 0.2)`) or pre-compensate `uOutlineColor` for the active tone-mapping curve.

---

### Defect D5 — Mobile Portrait Camera Horizontal Clipping (Base Gameplay & Stage 5 Victory)
- **Location**: `src/game/GameEngine.ts:274-276, 286-305`, `src/game/CinematicDirector.ts:343-357, 682-696`, `src/style.css:1019-1023`
- **Observation & Mathematical Proof**:
  - In `GameEngine.ts:275, 291-293`:
    ```ts
    this.camera.fov = aspect < 0.85 ? 48 : 38;
    ...
    if (aspect < 1.38) {
      distScale = THREE.MathUtils.clamp(1.38 / Math.max(0.44, aspect), 1.0, 2.65);
    }
    ```
  - On `390x844` mobile portrait (`aspect = 0.462`), `1.38 / 0.462 = 2.987`, **but `clamp(..., 1.0, 2.65)` caps `distScale` at `2.65`!**
  - With `fov = 48°` and `aspect = 0.462`, `tan(hFov / 2) = 0.462 * tan(24°) = 0.2057` (`hFov = 23.2°`). At `distScale = 2.65`, camera-to-beacon-row distance (`z = 2.4`) is `66.5m`, giving a horizontal half-span of only `66.5 * 0.2057 = 13.68m` centered at `x = -0.15` (`x ∈ [-13.83, +13.53]`). Because the Mine Entrance reaches `x = -14.13` and the Return Beacon octagonal base reaches `x = +14.70`, **both the Mine Entrance (left) and Return Beacon (right) are visibly cut off by the portrait screen edges** (`11_mobile_portrait_station.png`).
  - Furthermore, in Stage 5 Victory (`CinematicDirector.ts:682-696`), the camera moves to fixed widescreen coordinates (`px = beaconPos.x - 4.2, py = 6.4, pz = beaconPos.z + 8.6`, distance `10.4m`). On `390x844`, horizontal half-span at `10.4m` is only `2.14m`, clipping BOTH the 3D Supply Chest (`2.7m` left of lookAt) and the Return Beacon (`2.95m` right of lookAt), while `#victory-screen` covers the lower half of the viewport!
- **Proposed Fix**:
  1. Raise the upper clamp in `computeBaseCameraPose()` from `2.65` to `3.25` (e.g., `clamp(1.46 / Math.max(0.42, aspect), 1.0, 3.25)`) so `x ∈ [-15.2, +15.2]` fits with clean breathing room on `390x844` and `360x800` phones.
  2. Scale camera pull-back distance by `aspect < 1 ? 1 / Math.max(0.45, aspect) * 0.78 : 1` (and shift `lookAt.y` slightly downward on portrait so 3D subjects sit in the upper open viewport above the bottom `#victory-screen` card) in `playBossDefeatAndBeaconVictory()` and `playLegendaryUpgradeReveal()`.

---

### Defect D6 — Stage 2 Build & Upgrade Animation Edge Cases
- **Location**: `src/render/TowerFactory.ts:488-552`, `src/game/CinematicDirector.ts:192, 199-287, 292-463`
- **Observation & Root Cause**:
  1. **Empty `weaponPitch` on Magnetic Tower (`TowerFactory.ts:488`, `CinematicDirector.ts:192`)**: Autocannon and Mortar mount their barrels inside `weaponPitch`, so Stage 2A's 3rd beat (`tl.to(weaponPitch.position, { z: restWeaponZ, ... })`) snaps the weapon assembly into place after the turret rises. Magnetic Tower adds `weaponPitch` as an empty group (`0` children) and attaches `magRingOuter` and `magInnerCore` directly to `turretYaw`, so beat 3 does nothing on Magnetic builds.
  2. **Overlapping Upgrade Timelines on Same Tower (`CinematicDirector.ts:199-287, 292-463`)**: `CinematicDirector` stores timelines in a flat `activeTimelines` array without tracking per-tower timelines. Rapidly upgrading `T1 -> T2 -> T3` or `T3 -> T4` leaves the previous upgrade timeline running; when the earlier timeline hits `lockEnd`, it slams `rig.turretYaw.position` down early and calls `onUpgradeStampUI` with stale tier text during the newer upgrade (or mid-`legendary_reveal`!).
  3. **Premature Tier Color Switch (`CinematicDirector.ts:209, 303`)**: Calling `applyTowerTierVisuals(rig, newTier)` at `t = 0` switches core/trim/rim colors before the 3D parts fly in, contradicting the intended sequence (`Tower lifts -> parts fly in -> core ignites & switches tier color`).
- **Proposed Fix**:
  1. Parent `magRingOuter` and `magInnerCore` (or an upper emitter assembly group) under `weaponPitch` on Magnetic towers (or animate `magRingOuter` + `magInnerCore` snapping down into the 3 gantry clamps in beat 3 of `playTowerBuildAssembly`).
  2. Track `towerTimelines = new Map<string, gsap.core.Timeline>()` on `CinematicDirector`; before starting any build/upgrade on `tower.id`, kill and finalize any active timeline on `tower.id` (restoring `restPos`/`restScale` on all tier parts).
  3. At `t = 0` of `playNormalUpgrade` / `playLegendaryUpgradeReveal`, only set `tierGroups` visibility (`t2/t3/t4.visible = true`) so parts can fly in, and defer color/emissive/rim transition in `applyTowerTierVisuals(rig, newTier)` until `lockEnd` / `climaxAt` when the parts lock!

---

### Defect D7 — Stage 5B Supply Chest Clasp Instant-Hide & Additive Pillar Overexposure
- **Location**: `src/game/CinematicDirector.ts:775-801`, `src/fx/VfxManager.ts:253-273`
- **Observation**:
  ```ts
  // CinematicDirector.ts:776-782
  tl.call(
    () => {
      chest.claspMesh.visible = false;
      this.deps.audio.playChestOpenFanfare();
      this.addCameraShake(0.2);
      this.deps.vfx.spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false);
  ```
- **Root Cause**:
  1. `ORIGINAL_REQUEST.md:107` explicitly requires `点击领取奖励触发锁扣弹开、铰链开盖并喷涌真实 3D 金币与 3D 切面能源晶体`. Setting `chest.claspMesh.visible = false` deletes the lock clasp in 1 frame with zero pop-off trajectory.
  2. `spawnClimaxBurst` (`VfxManager.ts:259-272`) spawns a wide `0.82`-opacity `AdditiveBlending` yellow cylinder (`radius 0.405..0.675`, `height 4.95`) in `vfxScene` right at `chestPos`. Because `vfxScene` renders *after* the `#1A1033` outline pass (`ToonOutlineComposer.ts:275`), the bright additive yellow cylinder sits in front of the open chest, `0.92` `innerGlow`, 8 gold coins, and 8 blue crystals, bleaching all of them into a flat yellow-white glare during the fountain peak (`09_stage5_3d_chest_open_loot_fountain.png`) and violating `ORIGINAL_REQUEST.md:21` (`光效柔和，有明暗层次，避免频繁整屏过曝`).
- **Proposed Fix**:
  1. Keep `chest.claspMesh.visible = true` at `t = 0.19s` and animate `chest.claspMesh.position` flying forward/upward along a short parabolic arc (`z: 0.51 -> 1.45`, `y: 0.66 -> 1.1 -> 0.12`) while spinning `chest.claspMesh.rotation.x += 5.2` over `0.38s` before hiding/settling!
  2. Replace `spawnClimaxBurst(chestPos, ...)` on chest open with expanding ground rings (`spawnGroundRing`) + outward celebratory sparks + restrained `innerGlow` (`opacity: 0.55`) — omitting the vertical additive pillar in front of the chest so the 3D beveled coins and 3D faceted blue crystals remain 100% crisp, cel-shaded, and `#1A1033`-outlined as they fountain out!

---

## 3. Synthesis Summary (Unified Assessment)

### Consensus (Verified Strengths)
- **Authentic 3D Industrial Mecha Art**: Every gameplay entity (`TowerFactory.ts`, `EnemyFactory.ts`, `BeaconAndPropsFactory.ts`) is constructed from beveled 3D primitives (`RoundedBoxGeometry`, `OctahedronGeometry`, `TorusGeometry`, `ConeGeometry`, `createGearMesh` extruded teeth) with strict faction color separation and stable weapon recognition colors across T1–T4.
- **Clean Layer-Isolated Toon + Outline Architecture**: `ToonMaterials.ts` (`4-step` `NearestFilter` `DataTexture` + custom Fresnel rim shader) paired with `ToonOutlineComposer.ts` (Layer 0 solid toon + `#1A1033` depth/normal edge pass with `grazing^3` slope compensation, followed by Layer 1 & `vfxScene` overlays) completely eliminates slope striping and prevents dark outline pollution on shadows, HP bars, range rings, particles, and UI.
- **Complete 5-Stage Playable Loop**: All 5 stages exist as live interactive runtime states (`opening`, `playing`, `legendary_reveal`, `boss_intro`, `victory_cinematic`, `victory_panel`, `reward_claiming`, `reward_claimed`) rather than static pre-rendered cutscenes.

### Nuances & Caveats
- **Camera Move Policy vs T4 Hero Stage**: `ORIGINAL_REQUEST.md:95` states large camera moves are only for opening, Boss entrance, and victory, while `ORIGINAL_REQUEST.md:104` requires T4 Legendary upgrades to pause combat simulation and enter a dedicated golden hero reveal stage (`CinematicDirector.ts:343-357`). Because simulation is paused during `legendary_reveal`, the hero zoom does not disrupt active combat readability and directly fulfills line 104.
- **Minor Polish Opportunities**:
  1. Widening the acoustic silence gap before the `t = 1.49s` Boss entrance slam (`AudioManager.ts:174-177`) from `~30ms` to `~100ms` would accentuate "骤然收缩静默".
  2. Expanding Final Boss death (`CinematicDirector.ts:648-679`) from 2 bursts (`0.18s` silent + `0.55s` audible) to 3–4 staggered audible sub-explosions across its tracks/drill/core would heighten "连环爆炸击杀".
  3. Disposing transient geometries/materials in `VfxManager.ts` (`mortarShells` at `499`, `debris3D` mats at `554`, `pickups3D` at `592`, and `clearAll()` at `600-631`) prevents minor GPU memory growth across repeated replays.
