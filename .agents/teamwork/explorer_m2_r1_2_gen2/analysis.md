# Post-M1 Delta Inspection & Integration Blueprint (`explorer_m2_r1_2_gen2`)

## Scope Inspected (Post-M1 Working Tree)
- [`src/render/EnemyFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/EnemyFactory.ts) (`lines 1–402`)
- [`src/game/GameEngine.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts) (`lines 1–1651`)
- [`src/game/CinematicDirector.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts) (`lines 1–806`)
- [`src/audio/AudioManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/audio/AudioManager.ts) (`lines 1–219`)
- Cross-verified post-M1 contracts in [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts), [`src/render/ToonOutlineComposer.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonOutlineComposer.ts), [`src/fx/VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts), and [`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts).

---

## 1. `src/render/EnemyFactory.ts` (`lines 1–402`)

### 1.1 Existing Helpers, Materials & Layer-0 vs Layer-1 Setup
- **Imports & Helper (`lines 1–13`)**:
  - Imports `RoundedBoxGeometry` (`line 2`), `ENEMY_BLUEPRINTS` (`line 3`), `EnemyRig, EnemyType` (`line 4`), `createGearMesh` from `./TowerFactory` (`line 5`), and `getToonTextures, makeToonMaterial, PALETTE` from `./ToonMaterials` (`line 6`).
  - `setLayerRecursive(obj: THREE.Object3D, layer: number): void` (`lines 8–13`): recursively assigns `obj.layers.set(layer)`.
- **Factory Signature & Per-Entity Cloneable Materials (`lines 15–44`)**:
  - `export function createEnemyRig(type: EnemyType): EnemyRig` (`line 15`).
  - Hierarchy: `root = new THREE.Group()` (`line 19`) -> `bodyGroup = new THREE.Group()` (`line 20`, added at `line 21`).
  - Per-instance non-shared Layer-0 materials (`lines 24–37`): `darkGreyMat`, `chassisMat`, `rustMat`, `hazardYellowMat`, `sensorMat`, with `hitFlashMaterials: THREE.Material[] = [darkGreyMat, rustMat]` (`line 37`).
    - *Important*: Any new primary hull `MeshToonMaterial` created for new rigs should be pushed onto `hitFlashMaterials` so hit-flash (`GameEngine.ts:900–904`, which sets `tm.emissive` and `tm.emissiveIntensity`) flashes the whole hull cleanly without affecting glowing `sensorMat` / `weakCoreMat`.
  - Articulation refs initialized at `lines 38–43`: `wheelsOrRotors: THREE.Object3D[]`, `drillHead: THREE.Object3D | null`, `hydraulicArm: THREE.Group | null`, `forearm: THREE.Group | null`, `weakPointCore: THREE.Mesh | null`, `armorPlates: THREE.Object3D[]`.
    - Add optional fields on `EnemyRig` (`src/types.ts:170–184`) and local vars at `line 43`: `shieldDome: THREE.Mesh | null = null`, `shieldFillMesh: THREE.Mesh | null = null`, `secondaryDrillHead: THREE.Object3D | null = null`, `supportHalo: THREE.Object3D | null = null`.
- **Existing Branch Map (`lines 45–323`)**:
  - `if (type === 'rover')` (`lines 45–89`)
  - `else if (type === 'swarm')` (`lines 89–123`, `bodyGroup.position.y = 0.86` at `line 91`)
  - `else if (type === 'drill' || type === 'elite_drill')` (`lines 123–198`, pushes 2 side `shield` plates to `armorPlates` at `line 145`, sets `drillHead` at `line 185`)
  - `else` (`lines 198–323` — currently unconditional catch-all for `boss_crawler`! **Must** change `line 198` to `else if (type === 'boss_crawler')` so the 7 new rigs get explicit `else if` branches at `line 323`!).
- **`weakPointCore` & `armorPlates` on `boss_crawler` (`lines 240–274`)**:
  - `weakPointCore` (`lines 241–250`): `OctahedronGeometry(0.42, 1)` with `MeshStandardMaterial({ color: 0xff4d2a, emissive: 0xff2a1a, emissiveIntensity: 2.1 })` at `(0, 1.48, -0.46)` inside `bodyGroup`.
  - `armorPlates` (`lines 258–273`): `[plateL, plateR, dorsalShield]` (`3` plates; `dorsalShield` at `(0, 1.88, -0.46)` directly shields the reactor bay from above).
- **Layer-1 Non-Outlined Attachments (`lines 325–385`)**:
  - Added to `root` (NOT `bodyGroup`, so death roll/pitch on `bodyGroup` never tilts ground rings or floating HP bars) and tagged via `setLayerRecursive(..., 1)` so `ToonOutlineComposer` skips them in Passes 1–3 and renders them un-outlined in Pass 4A (`ToonOutlineComposer.ts:541–544`):
    1. `shadowBlob` (`lines 326–339`): `baseRadius = bp.isBoss ? 1.85 : bp.hitRadius * 1.65`, `PlaneGeometry(baseRadius * 2, baseRadius * 2)`, `opacity: bp.isFlying ? 0.38 : 0.62`, `y = 0.025`, `depthWrite: false`.
    2. `slowRing` (`lines 341–356`): `RingGeometry(baseRadius * 0.72, baseRadius * 0.94, 24)`, `color: 0xc084fc`, `y = 0.06`, `visible = false`, `depthWrite: false`.
    3. `hpBarGroup` (`lines 359–384`): `barW = bp.isBoss ? 2.1 : bp.isElite ? 1.35 : 0.86`, `barH = bp.isBoss ? 0.15 : 0.1`, `y = bp.isBoss ? 2.45 : bp.isFlying ? 1.42 : bp.isElite ? 1.75 : 0.98`, `visible = false`, left-aligned `hpFillMesh` (`fillGeo.translate(barW / 2, 0, 0)`, `position.set(-barW / 2, 0, 0.005)`).
       - *Shielded Units Hook (`lines 381–383`)*: When `(bp.maxShield ?? 0) > 0` (`shield_skimmer`, `boss_mag_dreadnought`), append a thin cyan `shieldFillMesh` (`0x38bdf8`, `height = barH * 0.55`) at `y = barH * 0.9` inside `hpBarGroup`.

### 1.2 Exact Insertion Points for the 7 New Rigs (`EnemyFactory.ts:323`)
Change `else {` at `line 198` to `else if (type === 'boss_crawler') {`, then insert the 7 explicit `else if` branches at `line 323` before Layer-1 attachments (`line 325`):
1. **`shield_skimmer`**: `bodyGroup.position.y = 0.48`; twin forward-swept beveled catamaran prongs (`darkGreyMat`), central cyan plasma core (`0x38bdf8`), rear V-fins (`rustMat` / `hazardYellowMat`), wrapped in a **Layer-1** translucent cyan geodesic `shieldDome` (`IcosahedronGeometry(0.68, 1)`, `MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.32, wireframe: false, depthWrite: false })`, `setLayerRecursive(shieldDome, 1)`, parented to `bodyGroup` so it hovers/banks with the hull while Pass 4A renders it without `#1A1033` outline pollution!).
2. **`splitter_rover`**: Wide 6-wheel (`wheelsOrRotors` × 6) `rustMat` armored carrier (`0.84 × 0.44 × 0.98` `RoundedBoxGeometry`) with a `hazardYellowMat` dorsal clamp rack visibly carrying **2 miniature round-visored micro-rover pods** on its back.
3. **`mini_scout`**: Compact `bodyGroup.scale.setScalar(bp.scale)` (`0.68`) 4-wheel high-cadence micro-rover with oversized cyclops red sensor and twin stubby sprint fins.
4. **`repair_drone`**: `bodyGroup.position.y = 0.92`; tri-rotor (`wheelsOrRotors` × 3 at `0°/120°/240°`) industrial hover-frame, underslung micro-welder arm, and dorsal spinning emerald-amber **3D cross-halo projector** (`supportHalo`, `0x34d399` + `hazardYellowMat` gimbal ring).
5. **`boss_siege_driller` (Stage 2 Boss)**: Twin heavy crawler tracks (`wheelsOrRotors` × 6), violet-iron siege hull, **twin counter-rotating magma-fluted bore drills** (`drillHead` at `x = -0.44` and `secondaryDrillHead` at `x = +0.44`), violet-crimson `weakPointCore` (`0xc084fc` / `0xff2a6d`) at `(0, 1.52, -0.48)`, `3` breakaway `armorPlates`, and overhead `hydraulicArm` + `forearm` siege ram.
6. **`boss_mag_dreadnought` (Stage 3 Boss)**: `bodyGroup.position.y = 0.52` hovering armored capital hull supported by 4 pulsing cyan-red repulsor pods (`wheelsOrRotors` × 4), twin side rail-sponsons, `hydraulicArm`/`forearm` ventral arc-emitter assembly, exposed aft `weakPointCore`, `3` breakaway `armorPlates`, and a **Layer-1** capital `shieldDome` (`IcosahedronGeometry(1.75, 1)`, `setLayerRecursive(shieldDome, 1)`).
7. **`boss_ark_overlord` (Stage 4 Final Boss)**: Colossal citadel harvester (`scale ~ 1.12`) with wide armored tracks (`wheelsOrRotors` × 6), rotating dorsal gimbal containment ring (`secondaryDrillHead` or `wheelsOrRotors`), central mega-auger (`drillHead`), dual/heavy `hydraulicArm` + `forearm`, prominent spinning Octahedral Ark `weakPointCore` (`0xffb703` / `0xff2a1a`) at `(0, 1.72, -0.42)`, and **`4` layered breakaway `armorPlates`** (port, starboard, upper brow, dorsal reactor cap).

---

## 2. `src/game/GameEngine.ts` (`lines 1–1651`)

### 2.1 Constructor Scene/Light Setup, Camera Math & `startNewMission` vs `loadStage`
- **Constructor (`lines 111–221`)**:
  - `solidScene.background` (`line 133`) & `solidScene.fog = new THREE.FogExp2(0x16192b, 0.0085)` (`line 134`).
  - `hemiLight` (`line 148`), `keyLight` (`lines 151–162`), `backRimLight` (`lines 164–166`) are currently **local `const` variables** inside `constructor` (`heroLight` at `line 65` / `168` is already a field). Promote `hemiLight`, `keyLight`, `backRimLight` to private fields on `GameEngine` so `loadStage(stageId)` can apply `stage.palette` dynamically without re-creating shadow maps.
  - `this.env = buildLunarStationEnvironment(this.solidScene, this.vfxScene)` (`line 173`) is passed by value to `new CinematicDirector({ env: this.env, ... })` (`lines 185–211`).
  - `dispose()` (`lines 264–269`) currently only calls `this.composer.dispose()` — extend to also call `this.cinematics.cancelAll()`, `this.vfx.dispose()`, `this.env.dispose()`, and dispose `towers`/`enemies`/`ghostGroup`.
- **`computeBaseCameraPose()` (`lines 286–305`) & `handleResize` (`lines 271–280`)**:
  - Current code (`lines 286–305`): `aspect < 1.38` clamps `1.38 / Math.max(0.44, aspect)` to `[1.0, 2.65]`, `zLookShift = aspect < 0.85 ? 2.0 : 0.65`, `lookAt = (-0.15, -0.15, zLookShift)`, `pos = (-0.15, 19.6 * distScale, zLookShift + 17.8 * distScale)`.
  - **Empirical Frustum & Fog Findings**:
    1. **Desktop `1440×900` (`aspect = 1.60`, `fov = 38°`)**: `distScale = 1.0` gives only `11.97m` horizontal half-width at `z = +7.4`, tight against outer build pads and `-14.1m` portal frames. Multiplying by `stageCam.distScale` (`1.07–1.10`) yields `distScale = 1.07–1.10` (`distance ≈ 28.3–29.1m`, horizontal half-width `15.6–16.0m` at center), framing all 4 stages cleanly.
    2. **Mobile Portrait `390×844` (`aspect = 0.4621`, `fov = 48°`)**: Current `2.65` cap restricts horizontal half-width to `14.43m` (`NDC.x = -0.97` at `x = -14.15m`, nearly clipping!). Updating to:
       ```ts
       const stageScale = this.currentStage.camera.distScale; // ~1.07–1.10
       const aspectFactor = aspect < 1.42
         ? THREE.MathUtils.clamp(1.42 / Math.max(0.42, aspect), 1.0, 3.04)
         : 1.0;
       const distScale = Math.min(3.25, stageScale * aspectFactor);
       const zLookShift = aspect < 0.85 ? 2.0 : 0.65;
       const lookX = this.currentStage.camera.lookX;
       ```
       gives `distScale = 3.25` on `390×844` (`distance = 86.0m`, horizontal half-width `17.7m`, keeping all portals/beacons/pads inside `|NDC.x| <= 0.84`).
    3. **Mobile `FogExp2` Compensation Caveat**: At `distScale = 3.25` (`vFogDepth ≈ 86m`), Three.js `FogExp2` with fixed `density = 0.0085` computes `1 - exp(-(0.0085 * 86)^2) = 41.4%` fog washout (vs `5.7%` on desktop)! Scale `fog.density = this.currentStage.palette.fogDensity / Math.max(1, distScale * 0.78)` inside `applyCameraPose` / `handleResize` so mobile portrait retains crisp toon contrast!
- **`startNewMission(playIntro)` (`lines 317–374`) vs `loadStage(stageId, playIntro)`**:
  - `loadStage(stageId: StageId, playIntro = true)`:
    1. `this.cinematics.cancelAll()` & `this.vfx.clearAll()`.
    2. Remove + `disposeObject3DTree(...)` all `this.towers`, `this.enemies`, and `this.ghostGroup` children (`lines 321–331` currently leak per-entity geometries/materials on restart!).
    3. `this.env.dispose()`.
    4. Set `this.currentStageId = stageId`, `this.isEndless = stageId === 'endless'`, `this.currentStage = STAGE_CONFIGS[stageId]`, `this.compiledLanes = compileStageLanes(this.currentStage.lanes)`.
    5. Apply `this.currentStage.palette` to `solidScene.background`, `solidScene.fog`, `hemiLight`, `keyLight`, `backRimLight`.
    6. Rebuild `this.env = buildLunarStationEnvironment(this.solidScene, this.vfxScene, this.currentStage, this.compiledLanes)`, initialize `this.mechanisms` state map, and call `this.cinematics.setEnvironment(this.env)`.
    7. Call `this.startNewMission(playIntro)` (which resets `gold = this.currentStage.initialGold`, `beaconHp = this.currentStage.maxBeaconHp`, `mechanisms` cooldowns, `supplyChest` lid/clasp/glow state, and **also resets `this.env.beacon.signalFins` `fin.rotation.z = 0`**, which `startNewMission` currently forgets to reset after victory!).

### 2.2 `previewOrBuildTower`, High-Ground Buffs & Elevation-Aware Raycasting
- **`previewOrBuildTower(type, confirmImmediately = false)` (`lines 424–490`)**:
  - **Missing Mode Guard Bug (`line 425`)**: Currently only checks `if (!this.selectedPadId || this.towers.has(this.selectedPadId)) return false;` with **no `this.mode` check**! Add `if (this.mode !== 'playing') return false;` (matching `upgradeSelectedTower` at `line 493`; note `selectPadOrTower` at `lines 384–389` already transitions `'opening' -> 'playing'` on first tap).
  - **Pad Lookup & Elevation (`lines 452, 460, 475`)**: Replace `BUILD_PADS` with `this.currentStage.buildPads`; compute `const towerY = (padCfg.y ?? 0) + 0.14;` and set `rig.root.position.set(padCfg.x, towerY, padCfg.z)` and `worldPos: new THREE.Vector3(padCfg.x, towerY, padCfg.z)`.
  - **High-Ground `+18%` Range / `+15%` DMG**:
    - Store `isHighGround: padCfg.padType === 'high_ground'` on `TowerInstance` and expose a single helper `private getEffectiveTowerStats(type: TowerType, tier: TowerTier, isHighGround: boolean): TowerTierStats` returning `{ ...base, range: +(base.range * (isHighGround ? 1.18 : 1)).toFixed(2), damage: Math.round(base.damage * (isHighGround ? 1.15 : 1)) }`.
    - Call `getEffectiveTowerStats` in all 6 stat consumers so UI, range ring, and combat math never drift:
      1. `upgradeSelectedTower` (`lines 498–531`)
      2. `updateTowers` (`lines 1038, 1069, 1083, 1091, 1093`)
      3. `fireAutocannon` (`line 1124`)
      4. `fireMortar` (`line 1147`)
      5. `fireMagneticTower` (`line 1190`)
      6. `syncSelectionRings` (`lines 1433, 1441` — keep `rangeRing.position.y = 0.11` on road plane for true ground coverage, while `selectRing.position.y = (pad.y ?? 0) + 0.17` at `line 1428`) and `getSnapshot` (`lines 1515–1558`).
- **`showGhostPreview` / `clearGhostPreview` (`lines 1401–1416`) & `handleCanvasTap` (`lines 1468–1505`)**:
  - `showGhostPreview` (`line 1406`): set `ghost.position.set(pad.x, (pad.y ?? 0) + 0.14, pad.z)` using `this.currentStage.buildPads`, and in `clearGhostPreview` (`line 1413`) call `disposeObject3DTree`.
  - `handleCanvasTap` (`lines 1468–1505`):
    - Currently intersects a single `this.groundPlane` (`y = 0.15`, `line 108`), causing `~0.62m` Z-parallax error on `y = 0.68` High-Ground pads!
    - Replace with a reusable `scratchPlane = new THREE.Plane()` helper `intersectHorizontalPlane(y: number, out: THREE.Vector3): boolean`:
      1. **Supply Chest Tap (`lines 1485–1491`)**: when `this.mode === 'victory_panel' && !this.rewardClaimed`, intersect at `y = 0.35`, check `hypot <= 2.1`.
      2. **Interactive 3D Mechanism Tap** (when `this.mode === 'playing'`): iterate `this.mechanisms.values()`, intersect at mechanism elevation (`y = 0.45` for `crystal_vein`, `y = 0.65` for `capacitor_pylon`, `y = 0.85` for `laser_gate`), check radius (`1.55m` / `1.60m` / `1.85m`), trigger `this.activateMechanism(mech.id)` (or play cooldown feedback tick if recharging) and `return`.
      3. **Elevation-Aware Build Pad Tap (`lines 1493–1504`)**: iterate `this.currentStage.buildPads`, intersect at `y = (pad.y ?? 0) + 0.15`, pick closest pad within `1.48m`!
    - Also update `getPadScreenCoordinates` (`lines 1603–1607`) to use `(pad.y ?? 0) + 0.16` and `this.currentStage.buildPads`.

### 2.3 Spawner, Multi-Lane Pathing, Enemy/Boss Mechanics, Combat & M1 Hooks
- **`startNextWave` (`lines 582–628`) & `updateWaveSpawner` (`lines 779–809`)**:
  - Extend `PendingSpawn` (`lines 50–54`) with `laneIndex: number`.
  - In `startNextWave`: use `generateEndlessWave(this.waveIndex + 1, this.compiledLanes.length)` when `this.isEndless`, else `this.currentStage.waves[this.waveIndex]`. Map `grp.laneIndex === 'alternate' ? i % laneCount : (grp.laneIndex ?? 0)`.
  - In `updateWaveSpawner` (`line 785`): replace `item.enemyType === 'boss_crawler'` with `ENEMY_BLUEPRINTS[item.enemyType].isBoss`, passing `{ entranceIndex: item.laneIndex, bannerTitle, bannerSubtitle }` to `playBossEntranceSequence` and spawning via `this.spawnEnemy(item.enemyType, item.laneIndex)`.
- **`updateEnemies` (`lines 866–1033`)**:
  - **Death animations (`lines 871–894`)**: add distinct branches for `shield_skimmer` (corkscrew skid), `repair_drone` (rotor-stall spiral drop), `splitter_rover` / `mini_scout` (tumble/splay), and call `disposeObject3DTree(e.rig.root)` at `line 890`.
  - **Support & Shield Systems**:
    - `shield_skimmer`: after `shieldRegenDelay <= 0` (`3.5s` since last hit), regenerate `28 * dt` `shieldHp` up to `maxShieldHp`, toggling `rig.shieldDome.visible = e.shieldHp > 0`.
    - `repair_drone`: every `2.2s` (`supportCooldown`), pulse `3.4m` emerald `spawnGroundRing(..., 0x34d399, ...)` and heal living allies within `3.4m` by `Math.min(60, Math.round(ally.maxHp * 0.08))`.
    - Speed-rail zones (`Stage 3`): multiply speed by `zone.speedMultiplier` (`1.42x`) when `e.distanceTraveled ∈ [zone.startDist, zone.endDist]` and `e.slowRatio < 0.45`.
  - **All 4 Boss Active Skills (`lines 923–979`)**:
    - Fix `line 974` road-end guard from `TOTAL_ROAD_LENGTH - 4.0` to `lane.totalLength - 4.0`!
    - Dispatch on `e.type` when `skillTelegraphTimer <= 0`:
      - `boss_crawler`: `5.2m` EMP Ground-Slam (`2.2s` tower stun, `cd = 8.8s`).
      - `boss_siege_driller`: counter-spin `secondaryDrillHead`; `4.8m` Seismic Slam (`2.0s` tower stun) + grants `+120` shield HP bubble to allies within `4.8m` (`cd = 8.5s`).
      - `boss_mag_dreadnought`: `5.4m` Overdrive Surge — buffs allies within `5.5m` with `+35%` speed (`3.5s`) + EMP-stuns 2 nearest towers for `2.4s` (`cd = 9.0s`).
      - `boss_ark_overlord`: alternates via `skillCastCount` — odd cast: `5.6m` Cataclysmic EMP Slam (`2.4s` stun); even cast: Dorsal Drone Bay Ejection (`2 × mini_scout` + `1 × shield_skimmer` spawned at `e.distanceTraveled + 0.8` on `e.laneIndex`, `cd = 8.2s`).
  - **Multi-lane sampling & Beacon breach (`lines 986–1011`)**:
    - Replace `TOTAL_ROAD_LENGTH` (`line 986`) and `sampleRoadAtDistance` (`line 1005`) with `const lane = this.compiledLanes[e.laneIndex];` and `sampleLaneAtDistance(lane, e.distanceTraveled)`.
    - On breach (`lines 992–1000`): dispose `e.rig.root`, call `this.audio.playBeaconDamageAlarm()`, and if `beaconHp <= 0`, call `this.audio.playDefeatShutdown()` (persisting `bestEndlessWave` if `this.isEndless`).
- **`acquireBestTarget` (`lines 1373–1388`) & `fireMortar` (`lines 1146–1187`)**:
  - `acquireBestTarget`: rank in-range targets by **minimum remaining distance** `this.compiledLanes[e.laneIndex].totalLength - e.distanceTraveled` instead of largest `e.distanceTraveled` (`line 1381`), fixing dual-lane unequal-length priority on Stage 4!
  - `fireMortar` (`lines 1165–1166`): compute lead on `const lane = this.compiledLanes[target.laneIndex]; sampleLaneAtDistance(lane, Math.min(lane.totalLength, ...))`. Also at `lines 1153–1158`, respect `door.userData` (`HingedFlapUserData` from M1) so flaps open outward cleanly.
- **`applyDamageToEnemy` (`lines 1211–1317`) — Critical Bug Fixes & New Mechanics**:
  - Change `sourceTower: TowerInstance` to `sourceTower: TowerInstance | null = null` + `opts?: { isElectric?: boolean }` so `capacitor_pylon` and `laser_gate` share the exact single-settlement pipeline.
  - **`shieldHp` Absorption**: reset `enemy.shieldRegenDelay = 3.5`; apply `1.25x` Flux Mark multiplier if `enemy.fluxMarkedTimer > 0`; absorb into `enemy.shieldHp` first (`2.5x` efficiency for Magnetic pulses & Capacitor Pylon electric shocks), hiding `rig.shieldDome` + playing spark shatter when depleted.
  - **Boss `weakPointCore` `1.25x` Bonus Damage**: when `enemy.isBoss` and either rear/flank reactor exposure (`dot(bossForward, toSource) < 0.15`) or armor layers breached (`enemy.armorLayersRemaining < enemy.rig.armorPlates.length`), multiply hull damage by **`1.25x`** and flash `weakPointCore`! Also generalize `line 1245` `const plateIdx = enemy.rig.armorPlates.length - enemy.armorLayersRemaining;` (supports `4` plates on `boss_ark_overlord` vs `3` on other Bosses!).
  - **`splitter_rover -> 2x mini_scout`**: on `enemy.hp <= 0` when `enemy.type === 'splitter_rover'`, call `this.spawnEnemy('mini_scout', enemy.laneIndex, enemy.distanceTraveled ± 0.25, ±0.34)` twice + dust burst.
  - **Decoupling Mid-Run/Endless Boss Kills + Fixing Straggler Freeze & Missing Final-Wave `+200G/+4💎` Bonus (`lines 1272–1301`)**:
    - *Forensic Defect Found in Existing Code*: Setting `this.waveInProgress = false` (`line 1275`) and `this.mode = 'victory_cinematic'` (`line 1283`) on Boss death **skipped** `WAVE_CONFIGS[7]`'s `+200G / +4💎` clear bonus AND froze dying stragglers (`other.dyingTimer = 0.25`) mid-air because `updateEnemies` stops running outside `mode === 'playing'` (`line 705`)!
    - *Exact Fix*: Compute `isFinalCampaignVictory = !this.isEndless && this.waveIndex >= this.currentStage.waves.length - 1 && !otherBossAliveOrPending`.
      - If `false` (Stage 4 Wave 8 Sub-Boss or Endless Boss every 5 waves): play `playClimaxKillBurst(true)` + `spawnClimaxBurst` + `spawn3DLoot(..., 8, enemy.crystalReward, ...)`, keep `mode = 'playing'`, set `enemy.dyingTimer = 0.45`, and continue combat!
      - If `true`: immediately award `currWave.clearGoldBonus` (`+200G` on Stage 1) & `currWave.clearCrystalBonus` (`+4💎` on Stage 1), mark all `pendingSpawns` spawned, **immediately remove & `disposeObject3DTree` all non-Boss stragglers** from `enemyGroup` & `this.enemies` with shockwave puffs, then start `victory_cinematic`!
- **M1 Hooks in `updateTowers` (`lines 1041–1077`)**:
  - After `else if (tower.type === 'mortar')` (`line 1063`), add `else { rig.weaponPitch.rotation.x = THREE.MathUtils.lerp(rig.weaponPitch.rotation.x, 0, dt * 8); }` so Magnetic's `weaponPitch` recovers from `0.22` EMP stun droop.
  - At `line 1045`, animate `rig.idleCore` breathing scale (`restScale * (1 + Math.sin(this.elapsedStationTime * 3.2 + tower.worldPos.x) * 0.06)`), guarding generic Y-spin with `if (tower.type !== 'magnetic')` so Magnetic's `-2.5 / -14 rad/s` spin at `lines 1073–1076` stays intact.

---

## 3. `src/game/CinematicDirector.ts` (`lines 1–806`) & `src/audio/AudioManager.ts` (`lines 1–219`)

### 3.1 `CinematicDirector.ts` Exact Lines & Hooks
- **`setEnvironment(env: LunarStationEnvironment): void` (`insert at line 45`)**:
  - Updates `this.deps.env = env;`. Also update `cancelAll()` (`line 71`) to iterate `this.deps.env.entrances ?? [this.deps.env.entrance]` when hiding `fissureGroup` and resetting `hazardLampMats`.
- **M1 Tower Upgrade Visual Hooks (`lines 209, 274, 303, 407, 421–423`)**:
  - Use `applyTowerTierVisuals(rig, newTier, { visibilityOnly: true })` at `t = 0` (`lines 209, 303`) and full `applyTowerTierVisuals(rig, newTier)` at `lockEnd` / `climaxAt` (`lines 274, 407`).
  - At `lines 421–423`, replace hardcoded `flap.rotation.x = -0.55` with `const ud = flap.userData as HingedFlapUserData; if (tower.tier >= ud.minTier) tl.to(flap.rotation, { [ud.hingeAxis]: ud.openAngle, duration: 0.24, yoyo: true, repeat: 1 }, climaxAt + 0.12);`.
- **`playBossEntranceSequence` (`lines 470–586`)**:
  - Extend signature (`line 470`) with `options?: { entranceIndex?: number; bannerTitle?: string; bannerSubtitle?: string }`.
  - Portal world offset & `portal.yaw` (`lines 472–473`): select `const ent = this.deps.env.entrances?.[options?.entranceIndex ?? 0] ?? this.deps.env.entrance; ent.group.updateMatrixWorld(true); const entranceWorld = ent.group.localToWorld(new THREE.Vector3(1.2, 0, 0));` (handles Stage 4 North Portal `yaw = -Math.PI / 2` where local `+X` maps to world `+Z`).
  - **`~100ms` Pre-Slam Silence (`lines 521, 541–558`)**: contract `fissureGroup.scale` to `0.18` over `1.29s -> 1.38s` (`duration: 0.09`), cut `shakeIntensity = 0` at `1.38s`, hold **`110ms` (`1.38s -> 1.49s`) of complete visual/audio dead silence**, then erupt at `1.49s`!
- **`playBossDefeatAndBeaconVictory` (`lines 601–756`)**:
  - **4-Beat Boss Chain Explosion (`lines 648–679`)**: expand the current 2-beat sequence (`0.18s`, `0.55s`) into 4 escalating beats at `0.14s`, `0.30s`, `0.46s` (calling `this.deps.audio.playBossSubExplosion(0..2)` + `spawnClimaxBurst` + `spawnArmorBreakDebris` on offsets around `bossPos`) and Final Core Detonation at `0.66s` (`playClimaxKillBurst(true)` + `onBossRemoved()`).
  - **Sky Beam Audio (`line 700`)**: call `this.deps.audio.playBeaconBeamIgnite()` at `t = 1.55s` (or `1.62s` after 4-beat shift) when `beacon.skyBeam.visible = true`.
  - **Stage-Specific `supplyChestPos` (`line 728`)**: replace `beaconPos.x - 3.2, 5.5, beaconPos.z + 0.3` with `const chestPos = this.deps.env.stageConfig?.supplyChestPos ?? { x: beaconPos.x - 3.2, y: 0, z: beaconPos.z + 0.3 }; chest.group.position.set(chestPos.x, 5.5, chestPos.z);`, dropping to `y: chestPos.y ?? 0` at `line 735`.
  - **Portrait Stage 5 Camera Framing (`lines 682–696`)**: compute midpoint `midX = (beaconPos.x + chestPos.x) * 0.5`, `midZ = (beaconPos.z + chestPos.z) * 0.5`. When `this.deps.camera.aspect < 0.85`, pull camera back (`py: 9.8, pz: midZ + 13.4, lx: midX, ly: 0.65, lz: midZ + 1.1`) so both the Beacon sky-beam and Supply Chest stay fully visible above the portrait Victory Modal!
- **`playOpenRewardChest` (`lines 762–804`)**:
  - **Clasp Pop-Open Animation (`line 778`)**: instead of `chest.claspMesh.visible = false;` instantaneously, tween `chest.claspMesh.position` (`(0, 0.66, 0.51)` -> arc peak `(0.12, 1.28, 0.92)` -> ground `(0.22, 0.14, 1.25)`) and `chest.claspMesh.rotation.x` (`0 -> 4.4`) over `0.19s..0.52s`, then hide/settle; reset `claspMesh.visible = true`, `position.set(0, 0.66, 0.51)`, `rotation.set(0, 0, 0)`, and `lidPivot.rotation.set(0, 0, 0)` in both `playBossDefeatAndBeaconVictory` (`line 725`) and `GameEngine.startNewMission` (`line 351`).
  - **M1 Celebration VFX Hook (`line 781`)**: replace `this.deps.vfx.spawnClimaxBurst(chestPos, 0xfbbf24, 0.9, false)` with `this.deps.vfx.spawnChestOpenCelebration(chestPos)`!

### 3.2 `AudioManager.ts` Exact Lines & New SFX Hooks (`lines 1–219`)
- **Mute Storage (`lines 3, 11–34`)**: `MUTE_STORAGE_KEY = 'lunar_beacon_td_muted_v2'` (`line 3`), `isMuted()` (`lines 19–21`), `toggleMute()` (`lines 23–34`, sets `masterGain.gain` to `0` vs `0.42`).
- **Pre-Slam Silence Adjustment in `playBossChargeAndSlam()` (`lines 168–178`)**:
  - Change rising whine duration from `0.98` to `0.93` (`delay = 0`), contraction sweep to `delay = 0.94, duration = 0.09` (ends at `1.03s`), leaving **`110ms` (`1.03s..1.14s`) of pure silence** before the `delay = 1.14` Boss arrival slam (`0.35 + 1.14 = 1.49s` exact sync with `CinematicDirector.ts:557`!).
- **5 New SFX Methods to Append at `line 218` (before class closing `}`)**:
  1. `playBeaconDamageAlarm()`: rate-limited (`'bcn_hit'`, `180ms`) warning klaxon (`620->340Hz` square + `140->45Hz` sawtooth) -> hook at `GameEngine.ts:993`.
  2. `playDefeatShutdown()`: power-grid collapse sweep (`440->52Hz` sawtooth `0.75s` + `261.6->82Hz` triangle `0.85s`) -> hook at `GameEngine.ts:997`.
  3. `playBeaconBeamIgnite()`: skyward orbital lock chord (`220->880Hz` sine `0.55s` + staggered `[440, 659.25, 880, 1318.5]` triangle shimmer) -> hook at `CinematicDirector.ts:700`.
  4. `playBossSubExplosion(stepIndex: number)`: punchy chain-explosion thud (`(195 + stepIndex * 35)->40Hz` sawtooth `0.24s` + `420->125Hz` square `0.11s`) -> hook at Beats 1–3 in `CinematicDirector.ts:648–660`.
  5. `playMechanismActivate(kind: 'crystal_vein' | 'capacitor_pylon' | 'laser_gate')`: distinct tactile SFX for crystal harvest chime, high-voltage Tesla arc snap, and plasma laser gate ignition -> hook in `GameEngine.activateMechanism()`.
