import type * as THREE from 'three';

export type TowerType = 'autocannon' | 'mortar' | 'magnetic';

/**
 * 1: 临时装配 (Green)
 * 2: 标准战备 (Blue)
 * 3: 精英模块 (Purple)
 * 4: 传说机甲 (Gold)
 */
export type TowerTier = 1 | 2 | 3 | 4;

export type TowerBranch = 'A' | 'B';
export type TargetPriority = 'first' | 'strongest' | 'weakest' | 'shielded';

export type EnemyType =
  | 'rover'
  | 'swarm'
  | 'drill'
  | 'elite_drill'
  | 'shield_skimmer'
  | 'splitter_rover'
  | 'mini_scout'
  | 'repair_drone'
  | 'boss_crawler'
  | 'boss_siege_driller'
  | 'boss_mag_dreadnought'
  | 'boss_ark_overlord';

export type StageId = 'stage_01' | 'stage_02' | 'stage_03' | 'stage_04' | 'endless';

export type MechanismType = 'crystal_vein' | 'capacitor_pylon' | 'laser_gate';

export type TacticalSkillId = 'orbital_strike' | 'emp_overdrive' | 'nano_repair';
export type CommanderSkillId = TacticalSkillId;

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

export type GameMode =
  | 'opening'
  | 'playing'
  | 'paused'
  | 'legendary_reveal'
  | 'boss_intro'
  | 'victory_cinematic'
  | 'victory_panel'
  | 'reward_claiming'
  | 'reward_claimed'
  | 'defeat';

export type OnboardingStep = 'select_pad' | 'build_tower' | 'start_wave' | 'done';

export interface Vec3Like {
  x: number;
  y: number;
  z: number;
}

export interface PathSample {
  x: number;
  y: number;
  z: number;
  tx: number;
  tz: number;
  dist: number;
}

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
  yaw?: number;
  laneIndex?: number;
}

export interface MapMechanismInstance {
  config: MapMechanismConfig;
  group: THREE.Group;
  vfxGroup: THREE.Group;
  readyRingMat: THREE.MeshBasicMaterial;
  activeVisuals: THREE.Object3D[];
  cooldownRemaining: number;
  cooldownTotal: number;
  activeRemaining: number;
  activeDuration: number;
}

export interface MapMechanismSnapshot {
  id: string;
  type: MechanismType;
  label: string;
  ready: boolean;
  active: boolean;
  cooldownRemaining: number;
  cooldownTotal: number;
  activeRemaining: number;
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

export interface TierMeta {
  tier: TowerTier;
  name: string;
  shortTag: string;
  hex: string;
  color: number;
  rimColor: number;
  bgGlowHex: string;
}

export interface TowerTierStats {
  tier: TowerTier;
  cost: number;
  damage: number;
  fireInterval: number;
  range: number;
  splashRadius: number;
  slowRatio: number; // 0..0.65 (non-stacking, takes highest active slow)
  slowDuration: number;
  armorPierce: number; // 0..1 reduces enemy armor effectiveness
  partHeadline: string;
  upgradeNote: string;
}

export interface TowerBranchStats extends TowerTierStats {
  branch: TowerBranch;
  name: string;
  shortTitle: string;
  mechanicTag: string;
  accentHex?: string;
}

export interface TowerBlueprint {
  id: TowerType;
  name: string;
  code: string;
  roleSummary: string;
  weaponColorHex: string;
  weaponColor: number;
  tiers: [TowerTierStats, TowerTierStats, TowerTierStats, TowerTierStats];
  branches: {
    A: TowerBranchStats;
    B: TowerBranchStats;
  };
}

export interface EnemyBlueprint {
  id: EnemyType;
  name: string;
  maxHp: number;
  maxShield?: number;
  speed: number;
  armor: number; // flat damage reduction ratio 0..0.65
  goldReward: number;
  crystalReward: number;
  beaconDamage: number;
  isFlying: boolean;
  isElite: boolean;
  isBoss: boolean;
  hitRadius: number;
  scale: number;
}

export interface WaveSpawnGroup {
  enemyType: EnemyType;
  count: number;
  interval: number;
  delayBefore: number;
  laneIndex?: number | 'alternate';
}

export interface WaveConfig {
  waveNumber: number;
  title: string;
  subtitle: string;
  clearGoldBonus: number;
  clearCrystalBonus: number;
  hasElite: boolean;
  hasBoss: boolean;
  groups: WaveSpawnGroup[];
}

export type FlapHingeAxis = 'x' | 'y' | 'z';

export interface HingedFlapUserData {
  hingeAxis: FlapHingeAxis;
  restAngle: number;
  openAngle: number;
  minTier: TowerTier;
  branchTag?: TowerBranch;
}

export interface TowerRig {
  root: THREE.Group;
  baseGroup: THREE.Group;
  turretYaw: THREE.Group;
  weaponPitch: THREE.Group;
  barrelL: THREE.Object3D | null;
  barrelR: THREE.Object3D | null;
  mortarTube: THREE.Object3D | null;
  magInnerCore: THREE.Object3D | null;
  magRingOuter: THREE.Object3D | null;
  magRingInner: THREE.Object3D | null;
  magClamps: THREE.Object3D[];
  specialGear: THREE.Object3D | null;
  idleCore?: THREE.Object3D;
  hingedFlaps: THREE.Object3D[];
  muzzlePoints: THREE.Object3D[];
  rotaryBarrels?: THREE.Object3D[];
  branchBarrelOverlayA?: THREE.Object3D[];
  branchBarrelOverlayB?: THREE.Object3D[];
  tierGroups: {
    t2: THREE.Group;
    t3: THREE.Group;
    t4: THREE.Group;
    t4A: THREE.Group;
    t4B: THREE.Group;
  };
  tierAccentMaterials: THREE.MeshToonMaterial[];
  coreMaterial: THREE.MeshStandardMaterial;
}

export interface TowerInstance {
  id: string;
  padId: string;
  type: TowerType;
  tier: TowerTier;
  isHighGround?: boolean;
  branch?: TowerBranch | null;
  targetPriority?: TargetPriority;
  overdriveTimer?: number;
  auraHasteBonus?: number;
  spinUpStacks?: number;
  spinUpDecayTimer?: number;
  pullPulseCounter?: number;
  flapCloseTimer?: number;
  totalInvestedGold: number;
  cooldown: number;
  shotToggle: number;
  targetEnemyId: string | null;
  stunTimer: number;
  upgradingTimer: number;
  rig: TowerRig;
  worldPos: THREE.Vector3;
  kills: number;
  totalDamage: number;
}

export interface EnemyRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheelsOrRotors: THREE.Object3D[];
  drillHead: THREE.Object3D | null;
  secondaryDrillHead?: THREE.Object3D | null;
  hydraulicArm: THREE.Group | null;
  forearm: THREE.Group | null;
  weakPointCore: THREE.Mesh | null;
  armorPlates: THREE.Object3D[];
  shieldDome?: THREE.Mesh | null;
  shieldFillMesh?: THREE.Mesh | null;
  supportHalo?: THREE.Object3D | null;
  fluxRingGroup?: THREE.Group;
  shredBadgeGroup?: THREE.Group;
  slowRing: THREE.Mesh;
  shadowBlob: THREE.Mesh;
  hpBarGroup: THREE.Group;
  hpFillMesh: THREE.Mesh;
  hitFlashMaterials: THREE.Material[];
}

export interface EnemyInstance {
  id: string;
  type: EnemyType;
  name: string;
  hp: number;
  maxHp: number;
  shieldHp: number;
  maxShieldHp: number;
  shieldRegenDelay: number;
  baseSpeed: number;
  armor: number;
  goldReward: number;
  crystalReward: number;
  beaconDamage: number;
  isFlying: boolean;
  isElite: boolean;
  isBoss: boolean;
  laneIndex: number;
  distanceTraveled: number;
  lateralOffset: number;
  slowRatio: number;
  slowTimer: number;
  supportCooldown: number;
  fluxTimer: number;
  skillCastCount?: number;
  speedBoostTimer?: number;
  armorShredStacks?: number;
  armorShredTimer?: number;
  vulnMultiplier?: number;
  vulnTimer?: number;
  stunTimer?: number;
  comboIcdTimer?: number;
  hitFlashTimer: number;
  hitRecoil: number;
  walkPhase: number;
  dead: boolean;
  dyingTimer: number;
  // Boss skill state
  skillCooldown: number;
  skillTelegraphTimer: number;
  armorLayersRemaining: number;
  worldPos: THREE.Vector3;
  rig: EnemyRig;
}

export interface StatDeltaPopup {
  label: string;
  deltaText: string;
}

export interface CommanderSkillConfig {
  id: CommanderSkillId;
  hotkey: '1' | '2' | '3';
  name: string;
  shortName: string;
  targeting: 'ground' | 'instant';
  energyCost: number;
  cooldownSec: number;
  radius: number;
  accentHex: string;
  summary: string;
}

export interface CommanderSkillSnapshot {
  id: CommanderSkillId;
  hotkey?: '1' | '2' | '3';
  name: string;
  shortName?: string;
  accentHex?: string;
  summary?: string;
  energyCost: number;
  cooldownRemaining: number;
  cooldownTotal: number;
  ready: boolean;
  activeTargeting: boolean;
}

export interface T4BranchOptionSnapshot {
  branch: TowerBranch;
  name: string;
  shortTitle: string;
  mechanicTag: string;
  cost: number;
  affordable: boolean;
  damage?: number;
  fireInterval?: number;
  range?: number;
  partHeadline?: string;
}

export interface TowerSynergyCodexEntry {
  id: TowerType;
  roleBadge: string;
  synergySummary: string;
}

export interface EnemyCodexMetaEntry {
  id: EnemyType;
  threatTag: string;
  threatHex: string;
  counterTip: string;
  description: string;
}

export interface MechanismCodexEntry {
  id: 'high_ground' | MechanismType;
  name: string;
  tag: string;
  accentHex: string;
  summary: string;
}

export interface StageSaveEntry {
  unlocked: boolean;
  cleared: boolean;
  bestStars: 0 | 1 | 2 | 3;
  bestWave: number;
}

export interface CampaignSaveDataV2 {
  version: 2;
  totalCrystals: number;
  spentCrystals: number;
  totalCommendations: number;
  muted: boolean;
  unlockAllSandbox: boolean;
  activeStageId: StageId;
  stages: Record<StageId, StageSaveEntry>;
  techLevels: Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4>;
  seenCodexIds: string[];
  counters: {
    synergyTriggers: number;
    skillsUsed: number;
    mechanismsUsed: number;
    dualBranchCleared: boolean;
  };
  claimedAchievementIds: string[];
}

export interface TechModuleConfig {
  id: TechUpgradeId;
  name: string;
  summary: string;
  costs: [number, number, number, number];
  levelDescriptions: [string, string, string, string, string];
}

export interface AchievementConfig {
  id: AchievementId;
  name: string;
  description: string;
  rewardCrystals: number;
}

export interface ProgressionSnapshot {
  totalCrystals: number;
  spentCrystals: number;
  totalStars: number;
  bestEndlessWave: number;
  unlockAllSandbox: boolean;
  stages: Record<StageId, StageSaveEntry>;
  techLevels: Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4>;
  seenCodexIds: string[];
  claimedAchievementIds: string[];
  counters: CampaignSaveDataV2['counters'];
}

export interface UISnapshot {
  mode: GameMode;
  stageId: StageId;
  stageCode: string;
  stageName: string;
  isEndless: boolean;
  bestEndlessWave: number;
  nextStageId: StageId | null;
  nextStageName: string | null;
  beaconHp: number;
  maxBeaconHp: number;
  gold: number;
  crystals: number;
  persistentCrystals: number;
  hasHubAlert: boolean;
  waveNumber: number;
  totalWaves: number;
  waveInProgress: boolean;
  autoBattleEnabled: boolean;
  kills: number;
  speedMultiplier: 1 | 2;
  muted: boolean;
  bgmEnabled?: boolean;
  bgmVolume?: number;
  sfxVolume?: number;
  bgmOverrideMode?: string;
  bgmTrackLabel?: string;
  bgmModeTag?: string;
  onboardingStep: OnboardingStep;
  selectedPadId: string | null;
  selectedPadLabel: string | null;
  selectedPadIsHighGround: boolean;
  previewTowerType: TowerType | null;
  mechanisms: MapMechanismSnapshot[];
  tacticalEnergy: number;
  maxTacticalEnergy: number;
  armedSkillId: CommanderSkillId | null;
  skills: CommanderSkillSnapshot[];
  activeComboCount: number;
  nextWaveIntel?: { summary: string; tags: string[]; hasBoss: boolean; hasElite: boolean } | null;
  mvpTowerSummary?: string | null;
  selectedTowerBranchOptions: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;
  progression: ProgressionSnapshot;
  selectedTower: {
    id: string;
    padId: string;
    type: TowerType;
    name: string;
    tier: TowerTier;
    tierName: string;
    tierHex: string;
    isHighGround?: boolean;
    branch?: TowerBranch | null;
    damage: number;
    fireInterval: number;
    range: number;
    splashRadius: number;
    slowRatio: number;
    slowDuration: number;
    sellRefund: number;
    canUpgrade: boolean;
    upgradeCost: number | null;
    nextTierName: string | null;
    nextTierHex: string | null;
    nextDamage: number | null;
    nextFireInterval: number | null;
    nextRange: number | null;
    nextSpecialDelta: string | null;
    partHeadline: string | null;
    isStunned: boolean;
    branchName?: string | null;
    mechanicTag?: string | null;
    overdriven?: boolean;
    auraBoosted?: boolean;
    targetPriority?: TargetPriority;
    kills?: number;
    totalDamage?: number;
    t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;
  } | null;
  bossStatus: {
    name: string;
    hp: number;
    maxHp: number;
    telegraphing: boolean;
  } | null;
  rewardSummary: {
    stars: 1 | 2 | 3;
    bonusGold: number;
    bonusCrystals: number;
    firstClearBonusCrystals?: number;
    starBonusCrystals?: number;
    claimed: boolean;
    totalCommendations: number;
  };
}
