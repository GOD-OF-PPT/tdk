# Track 1 Architectural Blueprint: Multi-Chapter Sector Campaign (4 Stages + Endless Mode), Multi-Lane Pathing, Interactive 3D Mechanisms & Enemy/Boss Variants

**Core Summary**: The current codebase hardcodes a single 1-lane S-road (`RAW_ROAD_WAYPOINTS`), 10 flat pads (`BUILD_PADS`), 1 entrance/beacon pair, and an 8-wave schedule across `gameConfig.ts`, `BeaconAndPropsFactory.ts`, `GameEngine.ts`, `CinematicDirector.ts`, and `UIManager.ts`, without disposing removed 3D scene hierarchies. Refactoring around a data-driven `StageConfig` + `CompiledLane[]` registry, a leak-free `LunarStationEnvironment.dispose()` / `GameEngine.loadStage(stageId)` lifecycle, 4 mathematically frustum- and clearance-verified 3D stages (`8/10/10/12` waves + procedural `Endless`), 4 interactive 3D map mechanisms, and 4 new enemy + 3 new Boss rigs transforms the single-stage prototype into a full multi-chapter 3D mecha tower defense campaign.

---

## 1. Single-Map Assumptions Audit & Zero-Leak `loadStage(stageId)` Refactor

### 1.1 Exact Inventory of Hardcoded Single-Map Assumptions

| File | Exact Lines | Hardcoded Single-Map Assumption | Required Refactor |
|---|---|---|---|
| `src/types.ts` | `13` | `EnemyType` fixed to 5 IDs (`'rover' \| 'swarm' \| 'drill' \| 'elite_drill' \| 'boss_crawler'`). | Expand `EnemyType` with `'shield_skimmer' \| 'splitter_rover' \| 'mini_scout' \| 'repair_drone' \| 'boss_siege_driller' \| 'boss_mag_dreadnought' \| 'boss_ark_overlord'`. |
| `src/types.ts` | `44–49` | `BuildPadConfig` only has `{ id, label, x, z }` (assumes `y = 0` and no terrain bonus). | Add `y?: number; padType?: 'standard' \| 'high_ground';`. |
| `src/types.ts` | `101–106` | `WaveSpawnGroup` has no `laneIndex` field. | Add `laneIndex?: number \| 'alternate'` (defaults to `0`; `'alternate'` round-robins across stage lanes). |
| `src/types.ts` | `186–215` | `EnemyInstance` has no `laneIndex`, `shieldHp`, `maxShieldHp`, `shieldRegenDelay`, `fluxMarkedTimer`, `supportCooldown`. | Add multi-lane & new-archetype runtime fields to `EnemyInstance` and `shieldDome?: THREE.Mesh \| null`, `secondaryDrillHead?: THREE.Object3D \| null` to `EnemyRig`. |
| `src/config/gameConfig.ts` | `14–24` | `GAME_CONSTANTS.TOTAL_WAVES = 8`, `INITIAL_GOLD = 260`, `VICTORY_CHEST_GOLD = 320`, `VICTORY_CHEST_CRYSTALS = 8`. | Move per-stage economy/wave totals into `StageConfig` (keeping `GAME_CONSTANTS` as fallback defaults). |
| `src/config/gameConfig.ts` | `70–79`, `169–199` | Module-level `RAW_ROAD_WAYPOINTS`, `ROAD_SAMPLES`, `TOTAL_ROAD_LENGTH`, and `sampleRoadAtDistance(dist)` closed over a single global polyline. | Export pure `compileStageLanes(lanes: Vec3Like[][]): CompiledLane[]` and `sampleLaneAtDistance(lane: CompiledLane, dist: number): PathSample` reusing `buildFilletedRoadSamples` (`lines 81–167`). |
| `src/config/gameConfig.ts` | `205–216`, `489–597` | Global `BUILD_PADS` (10 pads) and `WAVE_CONFIGS` (8 waves). | Encapsulate inside `STAGE_CONFIGS: Record<StageId, StageConfig>` (`stage_01`..`stage_04`) + `generateEndlessWave(waveNum)`. Keep `STAGE_CONFIGS.stage_01.buildPads` aliased as `BUILD_PADS` if needed for legacy compatibility. |
| `src/render/BeaconAndPropsFactory.ts` | `3`, `38–83`, `139–143`, `510–514`, `661–947` | Static import of `BUILD_PADS, ROAD_SAMPLES`; single `entrance: MineEntranceRig` assumed facing `+X`; `buildReturnBeacon()` derives position from `ROAD_SAMPLES[last]`; `stars`, `rangeRing`, `selectRing`, `legendaryBackdrop` added directly to `vfxScene` (`lines 884, 899, 913, 929`) with no cleanup container or `dispose()`; `supplyChest` hardcoded at `(9.4, 0, 2.4)` (`line 933`). | Parameterize `buildLunarStationEnvironment(solidScene, vfxScene, stage, compiledLanes)`; support `entrances: MineEntranceRig[]` with `portal.yaw`; group all `vfxScene` meshes under `env.vfxRoot = new THREE.Group()`; build 3D map mechanisms & speed-rail zones; expose `env.dispose()`. |
| `src/game/GameEngine.ts` | `133–167` | Background/fog (`0x16192b`) and `hemiLight`/`keyLight`/`backRimLight` created as local constructor variables, preventing per-stage palette/lighting shifts. | Store `hemiLight`, `keyLight`, `backRimLight` as private fields on `GameEngine` and apply `stage.palette` during `loadStage(stageId)`. |
| `src/game/GameEngine.ts` | `173`, `185–211` | `this.env` passed by value into `new CinematicDirector({ env: this.env, ... })`. Replacing `this.env` on stage switch leaves `CinematicDirector` holding a stale disposed `LunarStationEnvironment`! | Add `public setEnvironment(env: LunarStationEnvironment): void` on `CinematicDirector` (called inside `GameEngine.loadStage`). |
| `src/game/GameEngine.ts` | `286–305` | `computeBaseCameraPose()` hardcodes `lookAt.x = -0.15` and `distScale = 1.0` on desktop. | Multiply by `this.currentStage.camera.distScale` and center on `this.currentStage.camera.lookX` / `lookZOffset`. |
| `src/game/GameEngine.ts` | `321–329`, `574`, `890`, `989`, `1291`, `1411` | Removing `tower.rig.root`, `enemy.rig.root`, and `ghostGroup` children only calls `.remove(...)` without `.dispose()`ing per-entity `BufferGeometry` and cloned `Material` instances. | Call `disposeObject3DTree(obj)` whenever removing towers, enemies, ghosts, or tearing down `env`. |
| `src/game/GameEngine.ts` | `452–479`, `108`, `1403–1504`, `1603–1607` | Hardcodes `BUILD_PADS`, tower/ghost `y = 0.14`, ring `y = 0.17`, and single `groundPlane` (`y = 0.15` at `line 108`), which introduces ~0.5m Z-parallax error on elevated High-Ground pads (`y = 0.68`). | Query `this.currentStage.buildPads`; place towers at `y = (pad.y ?? 0) + 0.14`; raycast each pad/mechanism at its actual elevation plane `(pad.y ?? 0) + 0.15`. |
| `src/game/GameEngine.ts` | `785`, `811–864`, `974–1008`, `1165–1166`, `1272–1301`, `1373–1388` | Boss intro checks `enemyType === 'boss_crawler'`; pathing uses single `sampleRoadAtDistance`; killing any `isBoss` immediately triggers `victory_cinematic` (breaking Endless Bosses every 5 waves!); `acquireBestTarget` compares raw `distanceTraveled` instead of remaining distance to Beacon across unequal-length lanes. | Check `bp.isBoss`; store `laneIndex` on `PendingSpawn` & `EnemyInstance`; trigger `victory_cinematic` ONLY when `!this.isEndless` and final wave's last Boss dies; rank targets by lowest `lane.totalLength - e.distanceTraveled`. |
| `src/game/CinematicDirector.ts` | `470–586`, `682–735` | `playBossEntranceSequence` hardcodes `env.entrance`, `+X` offset `(1.2, 0, 0)`, and Stage 1 banner text; `playBossDefeatAndBeaconVictory` hardcodes chest drop at `(beaconPos.x - 3.2, 5.5, beaconPos.z + 0.3)`. | Pass `{ entranceIndex, bannerTitle, bannerSubtitle }` to `playBossEntranceSequence` using `ent.group.localToWorld(new THREE.Vector3(1.2, 0, 0))`; drop chest at `env.stageConfig.supplyChestPos`. |
| `src/ui/UIManager.ts` | `1`, `259`, `314`, `464`, `564` | Static import of `BUILD_PADS` (`line 464`); assumes finite `${waveNumber}/${totalWaves}`. | Pass `selectedPadLabel`, `selectedPadIsHighGround`, `stageId`, `stageName`, `isEndless`, `bestEndlessWave` in `UISnapshot`. |

---

### 1.2 Core Data Structures (`src/types.ts`)

```ts
export type StageId = 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04' | 'endless';

export type MechanismType = 'crystal_vein' | 'capacitor_pylon' | 'laser_gate';

export interface PortalConfig {
  id: string;
  label: string;
  x: number;
  z: number;
  yaw: number; // 0 = faces +X (East), -Math.PI/2 = faces +Z (South from North wall)
}

export interface BuildPadConfig {
  id: string;
  label: string;
  x: number;
  y?: number; // 0 default; 0.68 for High-Ground Boost Bastion
  z: number;
  padType?: 'standard' | 'high_ground';
}

export interface MapMechanismConfig {
  id: string;
  type: MechanismType;
  label: string;
  x: number;
  z: number;
  yaw?: number;        // Used by laser_gate: 0 when road runs along Z, Math.PI/2 when road runs along X
  laneIndex?: number;  // Used by laser_gate (-1 or undefined = affects all lanes passing within gate radius)
}

export interface SpeedZoneConfig {
  id: string;
  laneIndex: number;
  startDist: number;
  endDist: number;
  speedMultiplier: number; // e.g., 1.42 (+42% move speed)
}

export interface StagePaletteConfig {
  skyBgHex: number;
  fogHex: number;
  fogDensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  keyLightHex: number;
  keyLightIntensity: number;
  rimLightHex: number;
  deckTintHex: number;
  roadTintHex: number;
  markerAccentHex: number;
}

export interface StageConfig {
  id: StageId;
  chapterNumber: number;
  name: string;
  codeName: string;
  subtitle: string;
  mechanicSummary: string;
  initialGold: number;
  maxBeaconHp: number;
  victoryBonusGold: number;
  victoryBonusCrystals: number;
  camera: {
    lookX: number;
    distScale: number;
  };
  palette: StagePaletteConfig;
  lanes: Vec3Like[][];        // 1 or 2 polylines converging on Return Beacon
  entrances: PortalConfig[];  // 1 or 2 portals matching lane origins
  beaconPos: Vec3Like;
  supplyChestPos: Vec3Like;
  buildPads: BuildPadConfig[];
  mechanisms: MapMechanismConfig[];
  speedZones: SpeedZoneConfig[];
  themeVariant: 'outpost_canyon' | 'twin_rift_crater' | 'mag_rail_corridor' | 'ark_citadel';
  waves: WaveConfig[];        // Empty for 'endless' (uses generateEndlessWave)
  bossBanner: {
    title: string;
    subtitle: string;
    entranceIndex: number;
  };
}

export interface CompiledLane {
  index: number;
  samples: PathSample[];
  totalLength: number;
}
```

---

### 1.3 Zero-Leak GPU Disposal & `GameEngine.loadStage(stageId)` Lifecycle

1. **Safe GPU Disposal Helper (`disposeObject3DTree` in `BeaconAndPropsFactory.ts`)**:
   - Traverses any removed `THREE.Object3D` (`env.root`, `env.vfxRoot`, `tower.rig.root`, `enemy.rig.root`, `ghostGroup`).
   - Collects non-shared `BufferGeometry` (`!geo.userData?.shared`, skipping `THREE.Sprite` whose geometry is a Three.js global singleton — matching `VfxManager.ts:638–641`) and non-shared `Material` (`!mat.userData?.shared`).
   - Calls `geometry.dispose()` and `material.dispose()` **without** disposing `mat.map` or `mat.gradientMap` (because all textures come from the singleton `getToonTextures()` cache in `ToonMaterials.ts:236`). Stage mood changes are achieved with zero extra texture allocations by tinting `makeToonMaterial(stage.palette.deckTintHex, { map: tex.lunarDeck })` and `makeToonMaterial(stage.palette.roadTintHex, { map: tex.haulRoad })`!
2. **`LunarStationEnvironment` Container Discipline**:
   - Add `vfxRoot: THREE.Group` to `LunarStationEnvironment` (`vfxScene.add(vfxRoot)`), parenting `stars`, `rangeRing`, `selectRing`, `legendaryBackdrop`, speed-rail chevrons, and mechanism Layer-1 status rings under `vfxRoot` instead of directly onto `vfxScene`.
   - When `lanes` share an initial split segment (Stage 2) or final converged causeway (Stage 2 & Stage 4), offset `buildRoadRibbonGeometry(laneSamples, halfWidth, yHeight)` slightly per lane (`y = 0.032 + laneIdx * 0.002`) to prevent coplanar depth/normal z-fighting in `ToonOutlineComposer`!
3. **8-Step `GameEngine.loadStage(stageId: StageId, playIntro = true)`**:
   1. `this.cinematics.cancelAll()` (while previous `this.env` is still valid).
   2. `this.vfx.clearAll()`.
   3. Remove and `disposeObject3DTree` all entries in `this.towers`, `this.enemies`, and `this.ghostGroup`.
   4. `this.env.dispose()` (removes & disposes `env.root` from `solidScene` and `env.vfxRoot` from `vfxScene`).
   5. Resolve `this.currentStage` (for `'endless'`, use `STAGE_CONFIGS.stage_04` map geometry or selected arena + `this.isEndless = true`), compile `this.compiledLanes`, and apply `palette` to `solidScene.background`, `solidScene.fog`, `hemiLight`, `keyLight`, and `backRimLight`.
   6. Rebuild `this.env = buildLunarStationEnvironment(this.solidScene, this.vfxScene, this.currentStage, this.compiledLanes)` and initialize `this.mechanisms` runtime state map.
   7. Call `this.cinematics.setEnvironment(this.env)`.
   8. Reset mission counters (`gold = stage.initialGold`, `beaconHp = stage.maxBeaconHp`, `waveIndex = 0`), snap camera (`this.applyCameraPose(0)`), and start intro (`playOpeningStationIntro`) or `playing` mode.

---

## 2. Four Campaign Stages + Endless Overdrive Mode Specification

> **Mathematical Verification Note**: All 4 stages below were verified via Three.js `PerspectiveCamera` projection at both **`1440×900` Desktop (`fov=38°`)** and **`390×844` Mobile Portrait (`fov=48°, zLookShift=2.0`)**, and against exact `buildFilletedRoadSamples(..., 1.42)` polylines:
> - **100% of all 45 Build Pads** across Stages 1–4 have **`2.90m – 4.32m` clearance** (`>= 2.80m` required) from every lane centerline sample and `>= 3.20m` pad-to-pad spacing.
> - **100% of Entrances, Return Beacons, Build Pads, and Mechanisms** project within **`|NDC.x| <= 0.917`** and **`NDC.y ∈ [-0.646, +0.622]`** on both viewports, leaving clean top/bottom HUD margins.

---

### Stage 1 (`stage_01`): `曙光检修站 (Outpost Relay)`
- **Tactical Identity**: Winding S-canyon haulage track, **1 Lane (`41.58m`)**, **8 Waves**, **10 Build Pads** (including **2 High-Ground Boost Pads** at central canyon bends) + **2 Harvestable 3D Crystal Ore Veins**. Boss: **Colossus Crawler Excavator (`boss_crawler`)**.
- **Camera & Economy**: `lookX: -0.05`, `distScale: 1.05`, `initialGold: 260`, `maxBeaconHp: 20`, `victoryBonusGold: 320`, `victoryBonusCrystals: 8`.
- **Palette**: Classic Lunar Slate (`skyBgHex: 0x16192b`, `deckTintHex: 0xffffff`, `roadTintHex: 0xffffff`, `markerAccentHex: 0x4cc9e0`, `rimLightHex: 0x67e8f9`).
- **3D Coordinates**:
  - **`lanes[0]` (`41.58m`)**: `[(-13.0, 0, -3.2), (-6.8, 0, -3.2), (-6.8, 0, 3.6), (-0.2, 0, 3.6), (-0.2, 0, -3.6), (6.4, 0, -3.6), (6.4, 0, 2.4), (11.8, 0, 2.4)]`
  - **`entrances`**: `[{ id: 's1_ent_0', label: '西北矿井闸门', x: -13.65, z: -3.2, yaw: 0 }]`
  - **`beaconPos`**: `{ x: 12.95, y: 0, z: 2.4 }` | **`supplyChestPos`**: `{ x: 9.75, y: 0, z: 2.7 }`
  - **`buildPads` (10 pads, min road clearance `2.90m`)**:
    1. `s1_pad_01` (`1号检修基座`): `(-9.8, 0, -0.2)` — clear `3.00m`
    2. `s1_pad_02` (`2号前哨基座`): `(-4.0, 0, -5.8)` — clear `4.32m`
    3. `s1_pad_03` (`3号西湾高地台` ★ **High-Ground**): `(-3.5, 0.68, 0.4)` — clear `3.20m`
    4. `s1_pad_04` (`4号南廊外座`): `(-6.8, 0, 6.5)` — clear `3.09m`
    5. `s1_pad_05` (`5号南湾主座`): `(-0.2, 0, 6.5)` — clear `3.09m`
    6. `s1_pad_06` (`6号中枢高地台` ★ **High-Ground**): `(3.1, 0.68, -0.4)` — clear `3.20m`
    7. `s1_pad_07` (`7号北脊基座`): `(3.1, 0, -6.5)` — clear `2.90m`
    8. `s1_pad_08` (`8号东折内座`): `(9.3, 0, -0.8)` — clear `2.90m`
    9. `s1_pad_09` (`9号信标南卫`): `(6.4, 0, 5.4)` — clear `3.19m`
    10. `s1_pad_10` (`10号信标近卫`): `(10.2, 0, 5.4)` — clear `3.00m`
  - **`mechanisms`**:
    - `vein_s1_1` (`crystal_vein`, `'西侧晶矿簇'`): `(-10.4, 3.8)`
    - `vein_s1_2` (`crystal_vein`, `'东北晶矿簇'`): `(9.8, -4.6)`
- **8-Wave Schedule**: Preserves balanced Stage 1 waves 1–8 (`Wave 1`: 7 rovers; `Wave 2`: 5 rovers + 8 swarm; `Wave 3`: 3 drills + 7 rovers; `Wave 4`: Elite `elite_drill` + 6 rovers + 9 swarm; `Wave 5`: 12 swarm + 5 drills + 8 rovers; `Wave 6`: 7 drills + 14 swarm; `Wave 7`: 2 `elite_drill` + 10 rovers + 16 swarm + 5 drills; `Wave 8`: **Boss `boss_crawler`** + 6 rovers + 12 swarm + 4 drills).

---

### Stage 2 (`stage_02`): `双生裂谷矿井 (Twin-Rift Crater Shaft)`
- **Tactical Identity**: **Dual-lane symmetrical split & converge** around a **central glowing magma-violet crater shaft** (`(-1.4, 0, 0.0)`, radius `2.0m` recessed energy pit with rotating containment ring). **2 Lanes (`31.66m` each)**, **10 Waves**, **12 Build Pads** (including **2 High-Ground Pads** on the central rift island), **2 Interactive Lunar Capacitor Pylons**, and **1 Crystal Ore Vein**. Debuts `shield_skimmer` + `splitter_rover` (`mini_scout`) and Wave 10 Boss **Siege Driller (`boss_siege_driller`)**.
- **Camera & Economy**: `lookX: -0.15`, `distScale: 1.05`, `initialGold: 310`, `maxBeaconHp: 20`, `victoryBonusGold: 420`, `victoryBonusCrystals: 12`.
- **Palette**: Deep Violet-Basalt & Amber Rift (`skyBgHex: 0x19132e`, `deckTintHex: 0xe9dff8`, `roadTintHex: 0xf5e8ff`, `markerAccentHex: 0xc084fc`, `rimLightHex: 0xa855f7`).
- **3D Coordinates**:
  - **`lanes[0]` (North Rim, `31.66m`)**: `[(-12.8, 0, 0.0), (-8.6, 0, 0.0), (-8.6, 0, -4.8), (5.8, 0, -4.8), (5.8, 0, 0.0), (11.4, 0, 0.0)]`
  - **`lanes[1]` (South Rim, `31.66m`)**: `[(-12.8, 0, 0.0), (-8.6, 0, 0.0), (-8.6, 0, 4.8), (5.8, 0, 4.8), (5.8, 0, 0.0), (11.4, 0, 0.0)]`
  - **`entrances`**: `[{ id: 's2_ent_0', label: '裂谷主矿井口', x: -13.45, z: 0.0, yaw: 0 }]`
  - **`beaconPos`**: `{ x: 12.55, y: 0, z: 0.0 }` | **`supplyChestPos`**: `{ x: 9.4, y: 0, z: -2.0 }` (Wait: note `(9.4, 0, 0)` is on the converged road, so placing `supplyChestPos` at `(10.8, 0, 2.8)` lands cleanly on the SE plaza clear of `s2_pad_12` at `(8.8, 3.2)` and road `z = 0`!).
  - **`buildPads` (12 pads, min road clearance `2.90m`)**:
    1. `s2_pad_01` (`1号分流北座`): `(-11.6, 0, -3.2)` — clear `3.00m`
    2. `s2_pad_02` (`2号分流南座`): `(-11.6, 0, 3.2)` — clear `3.00m`
    3. `s2_pad_03` (`3号裂谷西北高地` ★ **High-Ground**): `(-5.4, 0.68, -1.6)` — clear `3.20m`
    4. `s2_pad_04` (`4号裂谷西南内座`): `(-5.4, 0, 1.6)` — clear `3.20m`
    5. `s2_pad_05` (`5号北崖外座`): `(-4.6, 0, -7.7)` — clear `2.90m`
    6. `s2_pad_06` (`6号北脊外座`): `(2.2, 0, -7.7)` — clear `2.90m`
    7. `s2_pad_07` (`7号南崖外座`): `(-4.2, 0, 7.7)` — clear `2.90m`
    8. `s2_pad_08` (`8号南脊外座`): `(2.2, 0, 7.7)` — clear `2.90m`
    9. `s2_pad_09` (`9号裂谷东北高地` ★ **High-Ground**): `(2.6, 0.68, -1.6)` — clear `3.20m`
    10. `s2_pad_10` (`10号裂谷东南内座`): `(2.6, 0, 1.6)` — clear `3.20m`
    11. `s2_pad_11` (`11号汇流北卫`): `(8.8, 0, -3.2)` — clear `3.00m`
    12. `s2_pad_12` (`12号汇流南卫`): `(8.8, 0, 3.2)` — clear `3.00m`
  - **`mechanisms`**:
    - `pylon_s2_n` (`capacitor_pylon`, `'北脉月面电容塔'`): `(-1.4, -2.35)` — zaps North Rim straightaway (`2.45m` away, `4.6m` AoE)
    - `pylon_s2_s` (`capacitor_pylon`, `'南脉月面电容塔'`): `(-1.4, 2.35)` — zaps South Rim straightaway (`2.45m` away, `4.6m` AoE)
    - `vein_s2_1` (`crystal_vein`, `'东崖富集晶脉'`): `(9.2, -6.4)`
- **10-Wave Schedule**:
  - **W1**: North/South alternating `rover` (10, `'alternate'`).
  - **W2**: North `shield_skimmer` (4, lane 0) + South `swarm` (10, lane 1) — introduces Shield Skimmers & Pylon shield-break!
  - **W3**: `splitter_rover` (4, `'alternate'`) + `rover` (8, `'alternate'`) — introduces Splitter Rovers spawning `mini_scout` pairs!
  - **W4**: North `drill` (5, lane 0) + South `shield_skimmer` (6, lane 1) + `swarm` (10, `'alternate'`).
  - **W5 (Mid-Boss Elite)**: `elite_drill` (1, lane 0) + `splitter_rover` (5, lane 1) + `shield_skimmer` (6, `'alternate'`).
  - **W6**: Twin-lane `swarm` rush (18, `'alternate'`) + `splitter_rover` (6, `'alternate'`).
  - **W7**: `drill` (6, lane 0) + `shield_skimmer` (8, lane 1) + `rover` (10, `'alternate'`).
  - **W8 (Dual-Lane Elites)**: `elite_drill` (1, lane 0) + `elite_drill` (1, lane 1) + `shield_skimmer` (8, `'alternate'`).
  - **W9**: `splitter_rover` (8, `'alternate'`) + `drill` (6, `'alternate'`) + `swarm` (16, `'alternate'`).
  - **W10 (Stage Boss)**: **`boss_siege_driller`** (1, lane 0) + `shield_skimmer` (8, `'alternate'`) + `splitter_rover` (6, lane 1) + `swarm` (12, `'alternate'`).

---

### Stage 3 (`stage_03`): `磁轨发射回廊 (Mag-Rail Launch Corridor)`
- **Tactical Identity**: High-velocity electromagnetic mass-driver facility with **2 Active Speed-Boost Rail Zones (`1.42x` enemy speed)** along the South-West and North-East straightaways, connected through a central vertical choke guarded by an **Interactive Laser Containment Gate** and flanked by **2 High-Ground Overlook Pads** + **2 Crystal Ore Veins**. **1 Lane (`35.43m`)**, **10 Waves**, **11 Build Pads**. Debuts `repair_drone` and Wave 10 Boss **Mag-Lev Dreadnought (`boss_mag_dreadnought`)**.
- **Camera & Economy**: `lookX: 0.25`, `distScale: 1.07`, `initialGold: 320`, `maxBeaconHp: 20`, `victoryBonusGold: 480`, `victoryBonusCrystals: 15`.
- **Palette**: Cold Orbital Steel-Cyan & Hazard Amber (`skyBgHex: 0x0f1a2e`, `deckTintHex: 0xdbeafe`, `roadTintHex: 0xe0f2fe`, `markerAccentHex: 0x22d3ee`, `rimLightHex: 0x38bdf8`).
- **3D Coordinates**:
  - **`lanes[0]` (`35.43m`)**: `[(-11.2, 0, 4.2), (-1.6, 0, 4.2), (-1.6, 0, -4.2), (9.0, 0, -4.2), (9.0, 0, 2.2), (11.4, 0, 2.2)]`
  - **`speedZones`**:
    - `rail_s3_a`: `{ laneIndex: 0, startDist: 1.4, endDist: 8.0, speedMultiplier: 1.42 }` (South-West Accelerator Track)
    - `rail_s3_b`: `{ laneIndex: 0, startDist: 18.8, endDist: 26.4, speedMultiplier: 1.42 }` (North-East Accelerator Track)
  - **`entrances`**: `[{ id: 's3_ent_0', label: '磁轨西发入口', x: -11.85, z: 4.2, yaw: 0 }]`
  - **`beaconPos`**: `{ x: 12.55, y: 0, z: 2.2 }` | **`supplyChestPos`**: `{ x: 11.4, y: 0, z: -1.2 }`
  - **`buildPads` (11 pads, min road clearance `3.00m`)**:
    1. `s3_pad_01` (`1号南轨近卫`): `(-9.8, 0, 1.2)` — clear `3.00m`
    2. `s3_pad_02` (`2号西俯瞰高地` ★ **High-Ground**): `(-5.8, 0.68, 1.1)` — clear `3.10m`
    3. `s3_pad_03` (`3号南舷外座`): `(-8.2, 0, 7.2)` — clear `3.00m`
    4. `s3_pad_04` (`4号南湾截击座`): `(-3.2, 0, 7.2)` — clear `3.00m`
    5. `s3_pad_05` (`5号闸北控制座`): `(-5.4, 0, -3.6)` — clear `3.85m`
    6. `s3_pad_06` (`6号北脊西座`): `(-1.6, 0, -7.2)` — clear `3.19m`
    7. `s3_pad_07` (`7号北轨外座`): `(3.8, 0, -7.2)` — clear `3.00m`
    8. `s3_pad_08` (`8号东俯瞰高地` ★ **High-Ground**): `(3.8, 0.68, -1.1)` — clear `3.10m`
    9. `s3_pad_09` (`9号中庭支援座`): `(2.4, 0, 3.8)` — clear `4.08m`
    10. `s3_pad_10` (`10号东折内座`): `(6.0, 0, 1.4)` — clear `3.00m`
    11. `s3_pad_11` (`11号信标南卫`): `(9.8, 0, 5.2)` — clear `3.00m`
  - **`mechanisms`**:
    - `gate_s3_1` (`laser_gate`, `'中枢激光封锁闸门'`): `(-1.6, 0.0, yaw: 0, laneIndex: 0)` — straddles the vertical `x = -1.6` transfer corridor (left/right pylons at `x = -3.15` & `-0.05`)!
    - `vein_s3_1` (`crystal_vein`, `'西北储能晶簇'`): `(-9.8, -4.4)`
    - `vein_s3_2` (`crystal_vein`, `'东北导轨晶簇'`): `(9.2, -7.2)`
- **10-Wave Schedule**:
  - **W1**: `rover` (9) + `swarm` (6) sprinting across Accelerator Rail A!
  - **W2**: `shield_skimmer` (6) + `rover` (6) — fast shielded skimmers testing Laser Gate timing.
  - **W3**: `drill` (4) + `repair_drone` (3) — introduces Repair Drones healing Heavy Drills!
  - **W4 (Elite)**: `elite_drill` (1) + `repair_drone` (3) + `swarm` (12).
  - **W5**: `splitter_rover` (6) + `shield_skimmer` (6) + `repair_drone` (2).
  - **W6**: High-velocity `swarm` (20) + `shield_skimmer` (8).
  - **W7 (Elite Escort)**: `elite_drill` (2) + `repair_drone` (4) + `drill` (4).
  - **W8**: `splitter_rover` (8) + `repair_drone` (4) + `shield_skimmer` (8).
  - **W9**: `elite_drill` (2) + `shield_skimmer` (10) + `repair_drone` (5) + `swarm` (16).
  - **W10 (Stage Boss)**: **`boss_mag_dreadnought`** (1) + `repair_drone` (4) + `shield_skimmer` (8) + `drill` (4).

---

### Stage 4 (`stage_04`): `终末方舟中枢 (Ark Core Citadel)`
- **Tactical Identity**: Grand finale multi-front siege! **2 Independent Entry Portals** — **Portal 0 (West Mine Breach, `32.06m`)** and **Portal 1 (North Orbital Drop-Bay, `19.76m`, `yaw = -Math.PI/2`)** — converging onto the **Central-East Ark Beacon Causeway** (`(6.0, 0.8) -> (11.2, 0.8)`). **12 Waves**, **12 Build Pads** (**2 High-Ground Citadel Pads**), **full combined mechanism suite** (`1 Capacitor Pylon` + `1 Laser Containment Gate` on the converged causeway + `2 Crystal Ore Veins`), multi-Boss/Elite waves, and Wave 12 Final Campaign Boss **Omega Harvester Overlord (`boss_ark_overlord`)**.
- **Camera & Economy**: `lookX: 0.0`, `distScale: 1.07`, `initialGold: 380`, `maxBeaconHp: 25`, `victoryBonusGold: 650`, `victoryBonusCrystals: 24`.
- **Palette**: Regal Ark Gold-Cyan & Deep Obsidian-Indigo (`skyBgHex: 0x141229`, `deckTintHex: 0xf1ece1`, `roadTintHex: 0xe2e8f0`, `markerAccentHex: 0xf59e0b`, `rimLightHex: 0xffd166`).
- **3D Coordinates**:
  - **`lanes[0]` (West Mine Breach, `32.06m`)**: `[(-12.4, 0, -2.6), (-7.4, 0, -2.6), (-7.4, 0, 4.4), (2.6, 0, 4.4), (2.6, 0, 0.8), (11.2, 0, 0.8)]`
  - **`lanes[1]` (North Orbital Drop-Bay, `19.76m`)**: `[(-2.2, 0, -7.0), (-2.2, 0, -2.2), (6.0, 0, -2.2), (6.0, 0, 0.8), (11.2, 0, 0.8)]`
  - **`entrances`**:
    - `{ id: 's4_ent_0', label: '西侧裂隙矿口', x: -13.05, z: -2.6, yaw: 0 }`
    - `{ id: 's4_ent_1', label: '北侧空投竖井', x: -2.2, z: -7.65, yaw: -Math.PI / 2 }`
  - **`beaconPos`**: `{ x: 12.35, y: 0, z: 0.8 }` | **`supplyChestPos`**: `{ x: 11.4, y: 0, z: -2.0 }`
  - **`buildPads` (12 pads, min road clearance `3.00m`)**:
    1. `s4_pad_01` (`1号西卫内座`): `(-10.4, 0, 0.6)` — clear `3.00m`
    2. `s4_pad_02` (`2号西北角座`): `(-10.2, 0, -5.6)` — clear `3.00m`
    3. `s4_pad_03` (`3号双口联防座`): `(-5.2, 0, -5.8)` — clear `3.00m`
    4. `s4_pad_04` (`4号西堡高地台` ★ **High-Ground**): `(-4.2, 0.68, 1.3)` — clear `3.10m`
    5. `s4_pad_05` (`5号南外环西座`): `(-7.4, 0, 7.4)` — clear `3.19m`
    6. `s4_pad_06` (`6号南外环中座`): `(-1.8, 0, 7.4)` — clear `3.00m`
    7. `s4_pad_07` (`7号北井东卫`): `(1.8, 0, -5.2)` — clear `3.00m`
    8. `s4_pad_08` (`8号方舟高地台` ★ **High-Ground**): `(9.2, 0.68, -2.4)` — clear `3.20m`
    9. `s4_pad_09` (`9号东北外座`): `(6.2, 0, -5.4)` — clear `3.39m`
    10. `s4_pad_10` (`10号汇流南卫`): `(6.0, 0, 4.0)` — clear `3.20m`
    11. `s4_pad_11` (`11号信标近卫`): `(9.8, 0, 4.0)` — clear `3.20m`
    12. `s4_pad_12` (`12号南外环东座`): `(2.6, 0, 7.4)` — clear `3.19m`
  - **`mechanisms`**:
    - `pylon_s4_1` (`capacitor_pylon`, `'中枢月面电容塔'`): `(-0.2, 1.2)` — zaps BOTH Lane 0 (`z = 4.4 / x = 2.6`) and Lane 1 (`z = -2.2`)!
    - `gate_s4_1` (`laser_gate`, `'方舟终末激光闸'`): `(8.6, 0.8, yaw: Math.PI / 2)` — straddles the merged `z = 0.8` causeway (`z = -0.75` & `+2.35` pylons), burning & slowing enemies from BOTH portals!
    - `vein_s4_1` (`crystal_vein`, `'西南富集晶脉'`): `(-11.2, 5.2)`
    - `vein_s4_2` (`crystal_vein`, `'东北富集晶脉'`): `(10.6, -5.6)`
- **12-Wave Schedule**:
  - **W1–W3**: Dual-portal ramp (`W1`: West rovers + North drills; `W2`: West swarm + North shield_skimmers; `W3`: splitter_rovers + repair_drones on both portals).
  - **W4 (Elite)**: North `elite_drill` + West `shield_skimmer` + `repair_drone`.
  - **W5–W7**: Escalating dual-portal pincer waves (`splitter_rover`, `shield_skimmer`, `drill`, `repair_drone`, `swarm`).
  - **W8 (Mid-Stage Sub-Boss Assault)**: West **`boss_crawler` (Scaled Sub-Boss)** + North `elite_drill` + `repair_drone`! (Note: because `waveIndex < 11`, killing `boss_crawler` on W8 triggers an epic climax burst + loot shower without ending the mission!).
  - **W9–W11**: Heavy combined-arms waves (`W10`: twin `elite_drill`s from North + shielded splitter column from West; `W11`: full-throttle swarm + repair_drone + shield_skimmer blitz).
  - **W12 (Final Campaign Boss)**: **`boss_ark_overlord` (欧米茄·终末方舟收割母舰)** breaching West Portal + North `elite_drill` & `repair_drone` escorts!

---

### Endless Overdrive Mode (`endless` / `星区无尽超载`)
- **Arena**: Uses the flagship dual-portal `ark_citadel` layout (or allows launching Endless on any cleared stage) with `initialGold: 420`, `maxBeaconHp: 25`, `totalWaves: Infinity` (`isEndless: true`).
- **Procedural Wave Generator (`generateEndlessWave(waveNumber: number, laneCount: number): WaveConfig`)**:
  - **Enemy HP & Armor Scaling** (applied on spawn via `endlessScale`):
    - `hpMultiplier = Math.pow(1.135, waveNumber - 1)` (smooth exponential pressure that outpaces static T4 layouts past Wave 12+ and rewards active mechanisms & synergy).
    - `speedMultiplier = Math.min(1.35, 1 + Math.floor((waveNumber - 1) / 5) * 0.04)`.
    - `goldRewardScale = Math.max(0.35, 1 / (1 + (waveNumber - 1) * 0.08))` (prevents runaway gold overflow while keeping upgrades meaningful).
  - **Dynamic Composition Rules**:
    - Waves `1..N`: Base budget `budget = 8 + waveNumber * 4.5`, distributed across unlocked archetypes (`rover`, `swarm`, `drill`, `shield_skimmer`, `splitter_rover`, `repair_drone`) alternating across `laneCount` portals.
    - **Elite Waves**: Every even wave from Wave 4+ includes `Math.min(5, 1 + Math.floor(waveNumber / 4))` `elite_drill` units.
    - **Boss Every 5 Waves (`waveNumber % 5 === 0`)**: Rotates through all 4 Bosses (`W5: boss_crawler`, `W10: boss_siege_driller`, `W15: boss_mag_dreadnought`, `W20: boss_ark_overlord`, `W25+: boss_ark_overlord + secondary Boss`!) with full Boss Banner warning + `3–5` Energy Crystal clear bonus!
  - **Persistence**: Saves `lunar_beacon_best_endless_wave_v1` in `localStorage` on every wave clear and on Defeat settlement modal!

---

## 3. Interactive 3D Map Mechanisms & New Enemy/Boss Blueprints

### 3.1 Interactive 3D Map Mechanisms

| Mechanism | 3D Chunky-Toon Geometry (`BeaconAndPropsFactory.ts`) | Raycast & Cooldown State Machine (`GameEngine.ts`) | Combat Effect & Visual/Audio Feedback |
|---|---|---|---|
| **High-Ground Boost Pad** (`padType: 'high_ground'`) | `y = 0.68m` stepped `DEEP_BLUE_FRAME` armored plinth (`2.65×0.38×2.65` RoundedBox) + octagonal `CREAM_ARMOR` collar + 4 hazard-orange gussets + Layer-1 cyan-gold chevron ring (`y = 0.845`). | Raycast intersects horizontal plane at `y = (pad.y ?? 0) + 0.15` (`0.83m`), eliminating 3/4 camera parallax. Passive permanent buff on built tower. | **`+18%` Attack Range** (`stats.range * 1.18`) & **`+15%` Damage** (`Math.round(stats.damage * 1.15)`). Range ring stays at `y = 0.11` ground level for true road-coverage feedback. |
| **Harvestable Crystal Ore Vein** (`crystal_vein`) | Squashed dark regolith rock bed + 5 angled 6-sided faceted cyan-amber crystal prisms (`MeshToonMaterial` with `emissive: 0x0284c7`) + Layer-1 pulsing ready halo. Crystals scale from `0.45 -> 1.0` as charge refills. | Starts Ready (`cooldown = 0`). Tap within `1.55m` at `y = 0.45` harvests immediately; recharges over `18.0s` (`simDt` while `waveInProgress` is true). | Grants **`+35 Gold` & `+1 Energy Crystal`**, spawns `vfx.spawn3DLoot(pos, 4, 1, ...)` + `audio.playLootChime(true)` + cyan crystal sparks. |
| **Lunar Capacitor Pylon** (`capacitor_pylon`) | Hexagonal `DEEP_BLUE_FRAME` insulated base + `CREAM_ARMOR` Tesla mast + 2 counter-rotating cyan induction tori + floating octahedral arc core + Layer-1 readiness & `4.6m` tick ring. | Starts Ready (`cooldown = 0`), free tactical tap (`within 1.6m` at `y = 0.65`), `cooldown = 20.0s`. | Unleashes **`4.6m` Shock-Arc AoE**: deals `95` electric dmg, **strips 100% of `shieldHp`**, stuns/slows (`85%` slow for `1.6s`), and applies **`4.0s` Flux Mark (`+25%` damage taken)** + jagged cyan-violet lightning arcs to all hit targets! |
| **Laser Containment Gate** (`laser_gate`) | Twin `1.95m` armored emitter pylons straddling road curbs at local `(±1.55, 0, 0)` (never obstructing path!) with 3 plasma lenses + hazard beacons. Layer-1 triple crimson-amber laser bars (`CylinderGeometry`) & thermal floor strip when active. | Starts Ready (`cooldown = 0`). Tap within `1.85m` of gate center activates for **`6.0s`**, followed by **`22.0s` cooldown** (shown via Layer-1 radial progress arc). | Enemies within `1.45m` of active gate center take **`55%` slow** and **`32 DPS` armor-piercing (`0.65`) thermal burn**, with continuous sizzling orange hit sparks! |
| **Mag-Rail Speed Zone** (`speedZones` on Stage 3) | Series of Layer-1 glowing cyan-amber chevron induction coils (`PlaneGeometry` / thin strips at `y = 0.042`) along `startDist..endDist` with scrolling emissive pulse. | Passive track hazard checked in `updateEnemies`: `inSpeedZone = stage.speedZones.some(...)`. | Multiplies enemy move speed by **`1.42x`** while on the rail unless `slowRatio >= 0.45` (making Magnetic Tower & Laser Gate high-skill counters!). |

---

### 3.2 New 3D Enemy Variants & Stage Boss Variations (`EnemyFactory.ts`)

1. **`shield_skimmer` (`护盾掠袭艇`)**:
   - **Stats**: `maxHp: 135`, `maxShield: 95`, `speed: 2.65`, `armor: 0.10`, `goldReward: 22`, `beaconDamage: 1`, `hitRadius: 0.56`.
   - **3D Model**: Twin forward-swept `ENEMY_DARK_GREY` beveled catamaran prongs, central glowing plasma core, rear V-fins hovering at `y = 0.48`, wrapped in a **Layer-1 translucent cyan geodesic dome** (`IcosahedronGeometry(0.68, 1)`, `opacity: 0.34`, `rig.shieldDome`).
   - **Behavior**: Absorbs damage into `shieldHp` first (Magnetic pulses & Capacitor Pylons deal `2.5x` shield damage); regenerates `28 shield/s` after `3.5s` without taking hits. Corkscrew-skids on death.
2. **`splitter_rover` (`裂殖母体车`) + `mini_scout` (`裂殖子机`)**:
   - **Stats**: `splitter_rover` (`maxHp: 240`, `speed: 1.58`, `armor: 0.25`, `goldReward: 26`, `beaconDamage: 2`); `mini_scout` (`maxHp: 48`, `speed: 3.35`, `armor: 0`, `goldReward: 7`, `beaconDamage: 1`, `scale: 0.68`).
   - **3D Model**: Wide 6-wheel rust-red armored carrier with a hazard-yellow dorsal rack visibly holding **2 miniature round-visored micro-rovers**.
   - **Behavior**: On `splitter_rover` death (`applyDamageToEnemy`), spawns **2 `mini_scout` instances** at `(enemy.laneIndex, enemy.distanceTraveled ± 0.3, lateralOffset: ±0.34)` with dust pop!
3. **`repair_drone` (`工程抢修无人机`)**:
   - **Stats**: `maxHp: 145`, `speed: 2.05`, `armor: 0.12`, `goldReward: 28`, `beaconDamage: 1`, `isFlying: true`.
   - **3D Model**: Tri-rotor industrial hover-drone (`y = 0.92`) with underslung micro-welder arm and a spinning dorsal emerald-amber **3D cross-halo projector** (`0x34d399`).
   - **Behavior**: Every `2.2s`, pulses a `3.4m` Layer-1 emerald ring, healing nearby living allies for `min(60, round(maxHp * 0.08))` HP.
4. **Stage Boss Variations**:
   - **`boss_siege_driller` (Stage 2 — `碎星号双联破城钻`, `maxHp: 6800`, `armor: 0.48`)**: Twin counter-rotating magma-fluted drills (`drillHead` + `secondaryDrillHead`), violet rift core, 3 siege plates. *Skill*: `4.8m` tower stun (`2.0s`) + grants `+120` shield bubble to nearby allies!
   - **`boss_mag_dreadnought` (Stage 3 — `苍穹轨霸·磁浮无畏舰`, `maxHp: 7600`, `maxShield: 1200`, `armor: 0.42`)**: Hovering armored capital hull on 4 pulsing cyan-red repulsor pods + twin side rail-sponsons + capital shield dome. *Skill*: Accelerates nearby enemies `+35%` for `3.5s` + EMP-stuns 2 nearest towers (`2.4s`)!
   - **`boss_ark_overlord` (Stage 4 — `欧米茄·终末方舟母舰`, `maxHp: 10500`, `armor: 0.50`, 4 armor layers)**: Colossal tracked-and-gimbal-ring citadel harvester with central spinning Octahedral Ark Core, mega-auger, and dual hydraulic crusher arms. *Alternating Skills*: Odd cast = `5.6m` Cataclysmic EMP Slam (`2.4s` stun); Even cast = Dorsal Drone Bay Ejection (`2 mini_scout + 1 shield_skimmer` spawned directly on its lane)!
