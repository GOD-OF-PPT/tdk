# M2 Post-M1 Delta Inspection Analysis — `explorer_m2_r1_1_gen2`

## 1. Exact Post-M1 Line Audit of [`src/types.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L1-L277) (`277` lines)

| Symbol | Exact Post-M1 Lines | Exact Current Signature / Notes | M2 + Forward-Compatible M3/M4 Integration Hook |
|---|---|---|---|
| [`TowerType`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L3) | `3` | `'autocannon' \| 'mortar' \| 'magnetic'` | Unchanged. |
| [`TowerTier`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L11) | `11` | `1 \| 2 \| 3 \| 4` | Unchanged; add `export type TowerBranch = 'A' \| 'B';`. |
| [`EnemyType`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L13) | `13` | `'rover' \| 'swarm' \| 'drill' \| 'elite_drill' \| 'boss_crawler'` | Expand to **12** exact IDs: `'rover' \| 'swarm' \| 'drill' \| 'elite_drill' \| 'boss_crawler' \| 'shield_skimmer' \| 'splitter_rover' \| 'mini_scout' \| 'repair_drone' \| 'boss_siege_driller' \| 'boss_mag_dreadnought' \| 'boss_ark_overlord'`. |
| [`GameMode`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L15-L25) | `15–25` | 10 union states (`'opening'`..`'defeat'`) | Unchanged (`ProgressionManager` / Hub overlay uses `overlayPaused` boolean without altering `GameMode`). |
| [`BuildPadConfig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L44-L49) | `44–49` | `{ id: string; label: string; x: number; z: number; }` | Add optional `y?: number; padType?: 'standard' \| 'high_ground';` (optional keeps `BUILD_PADS` in `gameConfig.ts` valid). |
| [`TowerBlueprint`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L75-L83) | `75–83` | Fixed 4-tuple `tiers: [TowerTierStats, ...]` (`line 82`) | Keep `tiers` unchanged; add optional `branches?: { A: TowerBranchStats; B: TowerBranchStats };` so M2 compiles cleanly before M3 populates `branches`. |
| [`EnemyBlueprint`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L85-L99) | `85–99` | 13 fields (`id`, `name`, `maxHp`, `speed`, `armor`, ...) | Add optional `maxShield?: number;` (for `shield_skimmer` & `boss_mag_dreadnought`). |
| [`WaveSpawnGroup`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L101-L106) | `101–106` | `{ enemyType, count, interval, delayBefore }` | Add optional `laneIndex?: number \| 'alternate';` (defaults to `0`). |
| [`FlapHingeAxis`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L119) | `119` | `export type FlapHingeAxis = 'x' \| 'y' \| 'z';` (**M1.2**) | **Preserve 100% untouched.** |
| [`HingedFlapUserData`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L121-L126) | `121–126` | `{ hingeAxis: FlapHingeAxis; restAngle: number; openAngle: number; minTier: TowerTier; }` (**M1.2**) | **Preserve 100% untouched.** |
| [`TowerRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L128-L151) | `128–151` | Includes M1.2 `idleCore?: THREE.Object3D;` at **`line 141`** and `tierGroups: { t2, t3, t4 }` at **`lines 144–148`** | Preserve `idleCore?: THREE.Object3D`; extend `tierGroups` with optional `t4A?: THREE.Group; t4B?: THREE.Group;` plus optional `rotaryBarrels?: THREE.Object3D[]; branchBarrelOverlayA?: THREE.Object3D[]; branchBarrelOverlayB?: THREE.Object3D[];` so M1's `TowerFactory.ts` compiles with zero edits in M2. |
| [`TowerInstance`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L153-L168) | `153–168` | Runtime tower fields (`id`, `padId`, `type`, `tier`, `stunTimer`, `upgradingTimer`, ...) | Add `isHighGround?: boolean;` + optional M3 fields `branch?: TowerBranch \| null; overdriveTimer?: number; auraHasteBonus?: number; spinUpStacks?: number; spinUpDecayTimer?: number; pullPulseCounter?: number;`. |
| [`EnemyRig`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L170-L184) | `170–184` | `root`, `bodyGroup`, `wheelsOrRotors`, `drillHead`, `hydraulicArm`, `forearm`, `weakPointCore` (`177`), `armorPlates` (`178`), `slowRing` (`179`), `shadowBlob` (`180`), `hpBarGroup` (`181`), `hpFillMesh` (`182`), `hitFlashMaterials` (`183`) | Add optional `shieldDome?: THREE.Mesh \| null; secondaryDrillHead?: THREE.Object3D \| null; fluxRingGroup?: THREE.Group; shredBadgeGroup?: THREE.Group;`. |
| [`EnemyInstance`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L186-L215) | `186–215` | `id`, `type`, `hp`, `maxHp`, `distanceTraveled` (`200`), `lateralOffset` (`201`), `slowRatio` (`202`), `slowTimer` (`203`), `skillCooldown` (`210`), `skillTelegraphTimer` (`211`), `armorLayersRemaining` (`212`), `worldPos` (`213`), `rig` (`214`) | Add `laneIndex: number; shieldHp: number; maxShieldHp: number; shieldRegenDelay: number; supportCooldown: number; fluxTimer: number;` + optional `skillCastCount?: number; speedBoostTimer?: number; armorShredStacks?: number; armorShredTimer?: number; vulnMultiplier?: number; vulnTimer?: number; stunTimer?: number; comboIcdTimer?: number;`. |
| [`UISnapshot`](file:///home/antigravity/GOD-OF-PPT/tdk/src/types.ts#L222-L276) | `222–276` | `mode`, `beaconHp`, `maxBeaconHp`, `gold`, `crystals`, `waveNumber`, `totalWaves`, `selectedPadId`, `selectedTower` (`237–262`), `bossStatus` (`263–268`), `rewardSummary` (`269–275`) | Keep all existing required properties intact; add forward-compatible optional fields (`stageId?`, `stageCode?`, `stageName?`, `isEndless?`, `bestEndlessWave?`, `nextStageId?`, `nextStageName?`, `selectedPadLabel?`, `selectedPadIsHighGround?`, `persistentCrystals?`, `hasHubAlert?`, `tacticalEnergy?`, `maxTacticalEnergy?`, `armedSkillId?`, `tacticalSkills?`, `activeComboCount?`, `overdriveActiveTimer?`, plus optional `selectedTower` & `rewardSummary` subfields). |
| Environment Rig Types | [`BeaconAndPropsFactory.ts:7-47`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L7-L47) | `PadVisual` (`7–12`), `ReturnBeaconRig` (`14–21`), `MineEntranceRig` (`23–29`), `SupplyChestRig` (`31–36`), `LunarStationEnvironment` (`38–47`) currently live in `BeaconAndPropsFactory.ts`, NOT `src/types.ts`! | Either keep in `BeaconAndPropsFactory.ts` (and re-export in `src/types.ts`) or move to `src/types.ts` and `export type { ... }` from `BeaconAndPropsFactory.ts` so `GameEngine.ts:17` and `CinematicDirector.ts` imports never break. |

### Exact New Types to Add in `src/types.ts` for M2 + M3/M4 Zero-Conflict Contract

```ts
export type StageId = 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04' | 'endless';
export type MechanismType = 'crystal_vein' | 'capacitor_pylon' | 'laser_gate';
export type TowerBranch = 'A' | 'B';
export type TacticalSkillId = 'orbital_strike' | 'emp_overdrive' | 'nano_repair';
export type CommanderSkillId = TacticalSkillId; // Alias bridging Track 2 & Track 3 specs
export type TechUpgradeId =
  | 'kinetic_core'
  | 'servo_drive'
  | 'requisition_pack'
  | 'beacon_plating'
  | 'tactical_reactor'
  | 'flux_resonator';
export type AchievementId =
  | 'ach_ch1_clear'
  | 'ach_flawless_3star'
  | 'ach_dual_t4'
  | 'ach_synergy_25'
  | 'ach_skill_12'
  | 'ach_mech_15'
  | 'ach_all_sectors'
  | 'ach_10_stars'
  | 'ach_endless_15';

export interface PortalConfig {
  id: string;
  label: string;
  x: number;
  z: number;
  yaw: number; // 0 = faces +X (East), -Math.PI/2 = faces +Z (South from North wall)
}

export interface MapMechanismConfig {
  id: string;
  type: MechanismType;
  label: string;
  x: number;
  z: number;
  yaw?: number;
  laneIndex?: number;
}

export interface MapMechanismInstance {
  config: MapMechanismConfig;
  group: THREE.Group;
  vfxGroup: THREE.Group;         // Parented under env.vfxRoot (no #1A1033 outline!)
  readyRingMat: THREE.MeshBasicMaterial;
  activeVisuals: THREE.Object3D[]; // e.g. laser_gate beam bars / crystal prisms / pylon core
  cooldownRemaining: number;
  cooldownTotal: number;
  activeRemaining: number;
  activeDuration: number;
}

export interface SpeedZoneConfig {
  id: string;
  laneIndex: number;
  startDist: number;
  endDist: number;
  speedMultiplier: number;
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
  firstClearCrystals: number;
  perStarCrystals: number;
  camera: {
    lookX: number;
    distScale: number;
  };
  palette: StagePaletteConfig;
  lanes: Vec3Like[][];
  entrances: PortalConfig[];
  beaconPos: Vec3Like;
  supplyChestPos: Vec3Like;
  buildPads: BuildPadConfig[];
  mechanisms: MapMechanismConfig[];
  speedZones: SpeedZoneConfig[];
  themeVariant: 'outpost_canyon' | 'twin_rift_crater' | 'mag_rail_corridor' | 'ark_citadel';
  waves: WaveConfig[];
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

## 2. Exact Post-M1 Line Audit of [`src/config/gameConfig.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L1-L598) (`598` lines)

### 2.1 Existing Exports & Callers Across `src/`
- [`GAME_CONSTANTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L14-L24) (`lines 14–24`) — imported by `GameEngine.ts:7`.
- [`TIER_META`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L26-L63) (`lines 26–63`) — imported by `TowerFactory.ts:3`, `CinematicDirector.ts:4`, `GameEngine.ts:9`.
- [`RAW_ROAD_WAYPOINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L70-L79) (`lines 70–79`) — Stage 1's 8 S-canyon waypoints.
- [`buildFilletedRoadSamples`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L81-L167) (`lines 81–167`) — **currently module-private `function buildFilletedRoadSamples(waypoints: Vec3Like[], cornerRadius = 1.45): PathSample[]`!** Must add `export` + add `export function compileStageLanes(lanes: Vec3Like[][], cornerRadius = 1.42): CompiledLane[]` and `export function sampleLaneAtDistance(lane: CompiledLane, dist: number): PathSample`.
- [`ROAD_SAMPLES`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L169) & [`TOTAL_ROAD_LENGTH`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L170) (`lines 169–170`) — imported by `BeaconAndPropsFactory.ts:3` and `GameEngine.ts:10`. Keep exported as Stage 1 default fallback!
- [`sampleRoadAtDistance`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L172-L199) (`lines 172–199`) — imported by `GameEngine.ts:8`. Keep exported; `sampleLaneAtDistance(lane, dist)` uses the exact same binary-search + tangent lerp (`lines 173–198`) over `lane.samples` and `lane.totalLength`!
- [`BUILD_PADS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L205-L216) (`lines 205–216`) — imported by `BeaconAndPropsFactory.ts:3`, `GameEngine.ts:5`, `UIManager.ts:1`.
  - **CRITICAL BACKWARD-COMPATIBILITY FINDING (`tests/e2e.mjs` Pad IDs)**:
    - [`tests/e2e.mjs`](file:///home/antigravity/GOD-OF-PPT/tdk/tests/e2e.mjs#L79-L445) (`lines 79, 107, 117, 222, 235, 239, 244, 249, 379, 437`) explicitly calls `getPadScreenCoordinates('pad_03')`, `getPadScreenCoordinates('pad_06')`, `getPadScreenCoordinates('pad_01')`, and `selectPadOrTower('pad_01' / 'pad_03' / 'pad_05' / 'pad_06' / 'pad_08' / 'pad_09')`!
    - Therefore, in `STAGE_CONFIGS.stage_01.buildPads` (and `BUILD_PADS`), **keep Stage 1 pad IDs as `'pad_01' .. 'pad_10'`** (do NOT rename Stage 1 pads to `'s1_pad_01'`), upgrading `pad_03` (`x: -3.5, y: 0.68, z: 0.4, padType: 'high_ground'`) and `pad_06` (`x: 3.1, y: 0.68, z: -0.4, padType: 'high_ground'`)! Stages 2–4 use `'s2_pad_01'..`, `'s3_pad_01'..`, `'s4_pad_01'..`.
- [`TOWER_ORDER`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L218) (`line 218`) & [`TOWER_BLUEPRINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L220-L409) (`lines 220–409`) — imported by `TowerFactory.ts:3`, `CinematicDirector.ts:4`, `GameEngine.ts:11`, `UIManager.ts:1`.
- [`ENEMY_BLUEPRINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L411-L487) (`lines 411–487`) — imported by `EnemyFactory.ts:3`, `GameEngine.ts:6`. Because it is typed `Record<EnemyType, EnemyBlueprint>`, adding the 7 new `EnemyType` members to `src/types.ts` requires adding all 7 new `EnemyBlueprint` definitions (`shield_skimmer`, `splitter_rover`, `mini_scout`, `repair_drone`, `boss_siege_driller`, `boss_mag_dreadnought`, `boss_ark_overlord`) directly into `ENEMY_BLUEPRINTS` in `src/config/gameConfig.ts`.
- [`WAVE_CONFIGS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L489-L597) (`lines 489–597`) — Stage 1's 8 waves.

### 2.2 Clean One-Way Module Dependency (`gameConfig.ts` <- `campaignConfig.ts`)
- `src/config/gameConfig.ts` imports ONLY from `../types` (zero circular imports).
- `src/config/campaignConfig.ts` imports `{ BUILD_PADS, compileStageLanes, RAW_ROAD_WAYPOINTS, sampleLaneAtDistance, WAVE_CONFIGS }` from `./gameConfig` and exports `STAGE_ORDER`, `STAGE_CONFIGS: Record<StageId, StageConfig>`, `ENDLESS_STAGE_CONFIG`, `generateEndlessWave(waveNumber, laneCount)`, `compileStageLanes`, and `sampleLaneAtDistance`.

---

## 3. Exact Post-M1 Line Audit of [`src/render/BeaconAndPropsFactory.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L1-L948), [`ToonMaterials.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts#L1-L346) & [`VfxManager.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L1-L715)

### 3.1 M1.1 Return Beacon Preservation Contract (`lines 139–508` — SACRED!)
- `buildReturnBeacon()` spans [`lines 139–508`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L139-L508):
  - **Positioning (`lines 139–143`)**:
    ```ts
    function buildReturnBeacon(beaconPos?: Vec3Like): ReturnBeaconRig {
      const group = new THREE.Group();
      const endSample = ROAD_SAMPLES[ROAD_SAMPLES.length - 1];
      const bx = beaconPos ? beaconPos.x : endSample.x + 1.15;
      const by = beaconPos?.y ?? 0;
      const bz = beaconPos ? beaconPos.z : endSample.z;
      group.position.set(bx, by, bz);
    ```
  - **M1.1 Closed Manifold 3D Dish & 3-Strut Gantry (`lines 228–507`)**:
    - `lines 144–226`: Octagonal foundation (`base1`, `base2`), 4 `statusLampMats`, `mast`, `collar`, `coreMesh`, 3 `signalFins`.
    - `lines 228–305`: `darkReflectorMat`, `upperMastCollar` (`y = 1.70`), `coreSocketRing` (`y = 1.76`), stationary 3-strut gantry cage (`60°/180°/300°` bays clearing `coreMesh` & `signalFins`), open-bore `azimuthRing` (`y = 2.50`, inner bore `r = 0.29m > skyBeam r = 0.24m`).
    - `lines 308–486`: `dishGroup` (`y = 2.58`) with `slewRing`, `4 × clamp`, `gimbalBoom`, `2 × cheek`, `trunnionPin`, `dishAssembly` (`rearBoss`, `dishShell`, `dishRim`, `3 × rimClamp`, `innerReflector`, `feedPedestal`, `feedMast`, `3 × fStrut`, `emitterHorn`, `emitterLens`), and `-Z` counterweight (`transceiverPod`, `podStripe`, `2 × whip + whipTip`).
    - `lines 489–507`: Layer-1 `skyBeam` (`y = 2.0`) and `return { group, dishGroup, coreMesh, statusLampMats, signalFins, skyBeam }`.
  - **Rule**: **Do NOT modify a single line inside `lines 144–508`!** Only parameterize `group.position.set(...)` at `lines 139–143`.

### 3.2 `MineEntranceRig` & Multi-Portal `entrances[]` (`lines 23–29`, `510–598`, `854–855`)
- Currently `buildMineEntrance()` ([`lines 510–598`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L510-L598)) sets `group.position.set(start.x - 0.65, 0, start.z)` at `lines 512–513`.
- All child meshes are authored in right-handed local space facing **`+X`**:
  - Twin pillars & stripes at `(0, y, ±1.42)` (`lines 520–529`)
  - Lintel at `(0, 2.52, 0)` (`lines 531–534`)
  - Recessed shaft void at `(-0.18, 1.1, 0)` (`lines 537–542`)
  - Twin hazard domes & `hazardRotors` at `(0.1, 3.1, ±1.25)` (`lines 546–569`)
  - `fissureGroup` (4 Layer-1 glowing cracks) in front of portal at `(1.15, 0.055, 0)` (`lines 572–595`)
- **Parameterization**:
  - Change signature to `function buildMineEntrance(portal?: PortalConfig): MineEntranceRig`:
    ```ts
    const start = ROAD_SAMPLES[0];
    const px = portal ? portal.x : start.x - 0.65;
    const pz = portal ? portal.z : start.z;
    group.position.set(px, 0, pz);
    group.rotation.y = portal?.yaw ?? 0;
    ```
  - Verification of `yaw = -Math.PI / 2` (Stage 4 North Portal `s4_ent_1` at `(-2.2, -7.65)` facing South `+Z`): Three.js `rotation.y = -π/2` maps local `(+1.15, 0, 0)` to world `(0, 0, +1.15)` -> `(-2.2, 0.055, -6.50)` directly over North lane origin `(-2.2, 0, -7.0)`, and maps `darkVoid (-0.18, 1.1, 0)` to `z = -7.83` (into North wall). Furthermore, `ent.group.localToWorld(new THREE.Vector3(1.2, 0, 0))` in `CinematicDirector.playBossEntranceSequence` automatically resolves to the exact front-of-portal world point for ANY `yaw`!
  - On `LunarStationEnvironment` (`lines 38–47`): keep `entrance: MineEntranceRig` (`= entrances[0]`) AND add `entrances: MineEntranceRig[]`. Note `GameEngine.ts:750` loops `this.env.entrance.hazardRotors` — updating it to loop `for (const ent of this.env.entrances) for (const r of ent.hazardRotors)` spins beacons on all portals!

### 3.3 `SupplyChestRig` Parameterization (`lines 31–36`, `600–659`, `932–935`)
- `buildSupplyChestRig()` ([`lines 600–659`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L600-L659)) builds:
  - `group` (`visible = false` initially, `line 602`)
  - `innerGlow` (`PlaneGeometry(1.12, 0.72)` on Layer 1 at `y = 0.69`, `lines 623–636`)
  - `lidPivot` (`Group` at `(0, 0.68, -0.46)`, `lines 639–651`)
  - `claspMesh` (`Mesh` at `(0, 0.66, 0.51)`, `lines 654–656`)
- Placement at [`lines 932–935`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L932-L935) currently hardcodes `supplyChest.group.position.set(9.4, 0, 2.4)` and `rotation.y = -0.38`.
- Parameterize via `const chestPos = stage?.supplyChestPos ?? { x: 9.4, y: 0, z: 2.4 }; supplyChest.group.position.set(chestPos.x, chestPos.y ?? 0, chestPos.z);`.
- Note: `CinematicDirector.playBossDefeatAndBeaconVictory` (`line 710`) also repositions `supplyChest.group.position` when dropping from sky (`y = 5.5 -> 0`) — it should drop to `stage.supplyChestPos` (`(chestPos.x, chestPos.y ?? 0, chestPos.z)`) instead of hardcoded `(beaconPos.x - 3.2, ..., beaconPos.z + 0.3)` so Stage 2's converged `z = 0` road is never blocked!

### 3.4 `buildPads` Loop & `y = 0.68m` High-Ground Bastion (`lines 7–12`, `806–848` + `GameEngine.ts:755–772`)
- Currently [`lines 810–848`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L810-L848) creates `group` at `(cfg.x, 0, cfg.z)` with `socket` (`y = 0.075`), 4 `clamp`s (`y = 0.12`), and Layer-1 `ring` (`y = 0.16`), storing `{ config: cfg, group, ringMat, hopPhaseOffset }` in `pads`.
- **CRITICAL INTERACTION WITH `GameEngine.ts:755–766` (Idle Pad Hop)**:
  - `GameEngine.ts:757, 763, 765` writes `padVis.group.position.y = 0` (when occupied or between hops) and `padVis.group.position.y = Math.sin(u * Math.PI) * 0.14` (during hop)!
  - **Clean Architecture**:
    1. Add `baseY: number;` to `PadVisual` (`lines 7–12`, `baseY = cfg.y ?? 0`).
    2. When `cfg.padType === 'high_ground'` (`baseY = 0.68`):
       - Build a **stationary** `bastionGroup` added directly to `root` at `(cfg.x, 0, cfg.z)` (NOT inside `padVis.group`, so the heavy cliff plinth never hops off the floor!):
         - Lower stepped armored plinth: `RoundedBoxGeometry(2.68, 0.38, 2.68, 3, 0.08)` in `DEEP_BLUE_FRAME` (`0x223458`, `metallicStep: true`) at `y = 0.19`.
         - Upper octagonal bastion deck collar: `CylinderGeometry(1.42, 1.58, 0.30, 8)` in `CREAM_ARMOR` (`0xf3efe6`) at `y = 0.53`.
         - 4 angled `HAZard_ORANGE` (`0xf59e0b`) buttress gussets at `45°/135°/225°/315°` (`r = 1.38`, `y = 0.36`).
         - Layer-1 non-outlined gold-cyan range-boost chevron/halo ring (`RingGeometry(1.18, 1.30, 24)`, `color: 0xfbbf24`, `layers.set(1)`) at `y = 0.69`.
       - Initialize `padVis.group.position.set(cfg.x, baseY, cfg.z)` (and color `ringMat` `0xfbbf24` / `0x38bdf8` accent) so the standard `socket` + `4 × clamp` + `ring` sit cleanly on top of the `0.68m` bastion, and in `GameEngine.ts:757,763,765` use `padVis.baseY` (`padVis.group.position.y = padVis.baseY + ...`)!

### 3.5 Multi-Lane Road Ribbon Z-Offset (`lines 49–83`, `800–803`)
- Currently `buildRoadRibbonGeometry(halfWidth: number)` ([`lines 49–83`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L49-L83)) reads global `ROAD_SAMPLES` (`lines 55–56, 70`) and hardcodes vertex height `0.032` at [`line 65`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L65):
  `positions.push(lx, 0.032, lz, rx, 0.032, rz);`
- Change signature to `buildRoadRibbonGeometry(samples: PathSample[], halfWidth: number, yHeight = 0.032): THREE.BufferGeometry`, pushing `(lx, yHeight, lz, rx, yHeight, rz)`.
- At [`lines 800–803`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L800-L803):
  - Tint road material via `makeToonMaterial(stage?.palette.roadTintHex ?? 0xffffff, { map: tex.haulRoad })` (and deck at `line 767` via `stage?.palette.deckTintHex ?? 0xffffff`).
  - Loop `compiledLanes.forEach((lane, laneIdx) => ...)` building each `roadMesh` with `yHeight = 0.032 + laneIdx * 0.002`. On Stage 2 (shared split `(-12.8.. -8.6)` & converged `(5.8..11.4)`) and Stage 4 (converged `(6.0..11.2)`), the `2mm` Y separation completely prevents coplanar depth/normal z-fighting in `ToonOutlineComposer`!

### 3.6 `vfxRoot` Grouping in `vfxScene` (`lines 861–930`) & Zero-Leak `dispose()` + `disposeObject3DTree()`
- Currently [`lines 884, 899, 913, 929`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/BeaconAndPropsFactory.ts#L884-L929) call `vfxScene.add(stars)`, `vfxScene.add(rangeRing)`, `vfxScene.add(selectRing)`, and `vfxScene.add(legendaryBackdrop)` directly on `vfxScene` with no parent container!
- Refactor:
  1. Create `const vfxRoot = new THREE.Group(); vfxScene.add(vfxRoot);` and parent `stars`, `rangeRing`, `selectRing`, `legendaryBackdrop`, Stage 3 `speedZones` induction chevrons, and all `MapMechanismInstance.vfxGroup` children under `vfxRoot`.
  2. Export `disposeObject3DTree(rootObj: THREE.Object3D): void` in `BeaconAndPropsFactory.ts` following the exact M1.4 safety pattern verified in [`VfxManager.ts:635–668`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L635-L668) and [`ToonMaterials.ts:236–252`](file:///home/antigravity/GOD-OF-PPT/tdk/src/render/ToonMaterials.ts#L236-L252):
     ```ts
     export function disposeObject3DTree(rootObj: THREE.Object3D): void {
       if (rootObj.parent) {
         rootObj.parent.remove(rootObj);
       }
       const geos = new Set<THREE.BufferGeometry>();
       const mats = new Set<THREE.Material>();
       rootObj.traverse((obj) => {
         if (obj instanceof THREE.Sprite) {
           // NEVER dispose THREE.Sprite.geometry (Three.js global singleton BufferGeometry!)
           if (obj.material && !obj.material.userData?.shared) {
             mats.add(obj.material);
           }
         } else if (obj instanceof THREE.Mesh || obj instanceof THREE.Points || obj instanceof THREE.Line) {
           if (obj.geometry && !obj.geometry.userData?.shared) {
             geos.add(obj.geometry);
           }
           const matList = Array.isArray(obj.material) ? obj.material : [obj.material];
           for (const m of matList) {
             if (m && !m.userData?.shared) {
               mats.add(m);
             }
           }
         }
       });
       for (const g of geos) g.dispose();
       // NEVER dispose m.map or m.gradientMap — all 8 textures come from singleton getToonTextures()!
       for (const m of mats) m.dispose();
     }
     ```
     *(Note: handling `THREE.Points` in `disposeObject3DTree` ensures `stars` (`THREE.Points` at `line 872`) has both `starGeo` and `PointsMaterial` disposed while keeping `tex.softGlow` intact!)*
  3. Add `vfxRoot: THREE.Group`, `mechanisms: Map<string, MapMechanismInstance>`, and `dispose: () => void` (`disposeObject3DTree(root); disposeObject3DTree(vfxRoot);`) onto `LunarStationEnvironment`.
