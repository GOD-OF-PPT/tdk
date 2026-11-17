import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();

function replaceExact(content, target, replacement, label) {
  if (!content.includes(target)) {
    throw new Error(`[upgrade_v5_endgame] Anchor not found for: ${label}`);
  }
  return content.replace(target, replacement);
}

// ============================================================================
// 1. Patch src/types.ts
// ============================================================================
const typesPath = path.join(root, 'src/types.ts');
let typesSrc = fs.readFileSync(typesPath, 'utf8');
if (!typesSrc.includes('ApexTechId')) {
  typesSrc = replaceExact(
    typesSrc,
    `export type TechUpgradeId =
  | 'kinetic_core'
  | 'servo_drive'
  | 'requisition_pack'
  | 'beacon_plating'
  | 'tactical_reactor'
  | 'flux_resonator';`,
    `export type TechUpgradeId =
  | 'kinetic_core'
  | 'servo_drive'
  | 'requisition_pack'
  | 'beacon_plating'
  | 'tactical_reactor'
  | 'flux_resonator';

export type TechLevel = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export type ApexTechId = 'apex_firepower' | 'apex_bounty' | 'apex_bastion';`,
    'types.ts TechLevel & ApexTechId'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  | 'ach_10_stars'
  | 'ach_endless_15';`,
    `  | 'ach_10_stars'
  | 'ach_endless_15'
  | 'ach_endless_40'
  | 'ach_endless_70'
  | 'ach_overclock_10';`,
    'types.ts new AchievementIds'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  tierAccentMaterials: THREE.MeshToonMaterial[];
  coreMaterial: THREE.MeshStandardMaterial;
}`,
    `  tierAccentMaterials: THREE.MeshToonMaterial[];
  coreMaterial: THREE.MeshStandardMaterial;
  overclockHalo?: THREE.Group | null;
}`,
    'types.ts TowerRig overclockHalo'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  isHighGround?: boolean;
  branch?: TowerBranch | null;`,
    `  isHighGround?: boolean;
  branch?: TowerBranch | null;
  overclockLevel?: number;`,
    'types.ts TowerInstance overclockLevel'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  techLevels: Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4>;
  seenCodexIds: string[];
  counters: {
    synergyTriggers: number;
    skillsUsed: number;
    mechanismsUsed: number;
    dualBranchCleared: boolean;
  };`,
    `  techLevels: Record<TechUpgradeId, TechLevel>;
  apexLevels?: Record<ApexTechId, number>;
  seenCodexIds: string[];
  counters: {
    synergyTriggers: number;
    skillsUsed: number;
    mechanismsUsed: number;
    dualBranchCleared: boolean;
    maxOverclockReached?: number;
  };`,
    'types.ts CampaignSaveDataV2 techLevels & apexLevels'
  );

  typesSrc = replaceExact(
    typesSrc,
    `export interface TechModuleConfig {
  id: TechUpgradeId;
  name: string;
  summary: string;
  costs: [number, number, number, number];
  levelDescriptions: [string, string, string, string, string];
}`,
    `export interface TechModuleConfig {
  id: TechUpgradeId;
  name: string;
  summary: string;
  costs: readonly number[];
  levelDescriptions: readonly string[];
}

export interface ApexTechConfig {
  id: ApexTechId;
  name: string;
  summary: string;
  baseCost: number;
  costStep: number;
  formatEffect: (lv: number) => string;
}`,
    'types.ts TechModuleConfig & ApexTechConfig'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  stages: Record<StageId, StageSaveEntry>;
  techLevels: Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4>;
  seenCodexIds: string[];`,
    `  stages: Record<StageId, StageSaveEntry>;
  techLevels: Record<TechUpgradeId, TechLevel>;
  apexLevels: Record<ApexTechId, number>;
  seenCodexIds: string[];`,
    'types.ts ProgressionSnapshot techLevels & apexLevels'
  );

  typesSrc = replaceExact(
    typesSrc,
    `  activeComboCount: number;`,
    `  activeComboCount: number;
  runArsenalLevel?: number;
  runCrystalProtocolLevel?: number;
  nextArsenalCost?: number;
  crystalProtocolCost?: number;`,
    'types.ts UISnapshot supply protocol fields'
  );

  typesSrc = replaceExact(
    typesSrc,
    `    kills?: number;
    totalDamage?: number;
    t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;`,
    `    kills?: number;
    totalDamage?: number;
    overclockLevel?: number;
    overclockCost?: number | null;
    nextOverclockDamage?: number | null;
    maxBulkOverclockCount?: number;
    bulkOverclockCost?: number;
    t4BranchOptions?: [T4BranchOptionSnapshot, T4BranchOptionSnapshot] | null;`,
    'types.ts UISnapshot selectedTower overclock fields'
  );

  fs.writeFileSync(typesPath, typesSrc, 'utf8');
}

// ============================================================================
// 2. Patch src/game/ProgressionManager.ts (Lv.8 Core Tech + Infinite Apex Tech)
// ============================================================================
const progPath = path.join(root, 'src/game/ProgressionManager.ts');
let progSrc = fs.readFileSync(progPath, 'utf8');
if (!progSrc.includes('APEX_MODULES')) {
  progSrc = replaceExact(
    progSrc,
    `import type {
  AchievementConfig,
  AchievementId,
  CampaignSaveDataV2,
  ProgressionSnapshot,
  StageId,
  StageSaveEntry,
  TechModuleConfig,
  TechUpgradeId,
} from '../types';`,
    `import type {
  AchievementConfig,
  AchievementId,
  ApexTechConfig,
  ApexTechId,
  CampaignSaveDataV2,
  ProgressionSnapshot,
  StageId,
  StageSaveEntry,
  TechLevel,
  TechModuleConfig,
  TechUpgradeId,
} from '../types';`,
    'ProgressionManager imports'
  );

  // Replace TECH_MODULES, ACHIEVEMENT_CONFIGS, ComputedTechModifiers
  progSrc = replaceExact(
    progSrc,
    `export const TECH_MODULES: Record<TechUpgradeId, TechModuleConfig> = {
  kinetic_core: {
    id: 'kinetic_core',
    name: '超导弹芯',
    summary: '全塔基础伤害提升',
    costs: [4, 7, 11, 16],
    levelDescriptions: ['+0% 伤害', '+6% 伤害', '+12% 伤害', '+18% 伤害', '+25% 伤害'],
  },
  servo_drive: {
    id: 'servo_drive',
    name: '液压伺服',
    summary: '全塔攻速与射程同步强化',
    costs: [4, 7, 11, 16],
    levelDescriptions: [
      '+0% 攻速 / 射程',
      '+5% 攻速 · +4% 射程',
      '+10% 攻速 · +8% 射程',
      '+15% 攻速 · +12% 射程',
      '+20% 攻速 · +16% 射程',
    ],
  },
  requisition_pack: {
    id: 'requisition_pack',
    name: '战前整备',
    summary: '提高所有战区开局初始金币',
    costs: [3, 6, 9, 14],
    levelDescriptions: ['+0 初始金币', '+40 初始金币', '+80 初始金币', '+125 初始金币', '+175 初始金币'],
  },
  beacon_plating: {
    id: 'beacon_plating',
    name: '信标装甲',
    summary: '提升信标耐久上限（Lv.3+每波回1血）',
    costs: [3, 6, 9, 14],
    levelDescriptions: [
      '+0 耐久上限',
      '+4 耐久上限',
      '+8 耐久上限',
      '+12 耐久 · 每波+1修复',
      '+16 耐久 · 每波+1修复',
    ],
  },
  tactical_reactor: {
    id: 'tactical_reactor',
    name: '战术反应堆',
    summary: '提高初始战术能量与充能效率',
    costs: [4, 8, 12, 17],
    levelDescriptions: [
      '+0⚡ · +0%充能',
      '+12⚡ · +10%充能',
      '+24⚡ · +20%充能',
      '+36⚡ · +30%充能',
      '+50⚡ · +40%充能',
    ],
  },
  flux_resonator: {
    id: 'flux_resonator',
    name: '磁暴谐振器',
    summary: '提升连携伤害并降低T4晋升费用',
    costs: [5, 8, 12, 18],
    levelDescriptions: [
      '+0%连携 · -0%晋升费',
      '+12%连携 · -5%晋升费',
      '+24%连携 · -10%晋升费',
      '+36%连携 · -15%晋升费',
      '+48%连携 · -20%晋升费',
    ],
  },
};

export const ACHIEVEMENT_CONFIGS: AchievementConfig[] = [
  { id: 'ach_ch1_clear', name: '初阵告捷', description: '通关第 1 战区【曙光检修站】', rewardCrystals: 6 },
  { id: 'ach_flawless_3star', name: '毫发无伤', description: '任意战区达成 3★ 满状态守护', rewardCrystals: 8 },
  { id: 'ach_dual_t4', name: '双轨传说', description: '单局同时部署 T4-A 与 T4-B 传说机甲', rewardCrystals: 8 },
  { id: 'ach_synergy_25', name: '磁暴交响', description: '累计触发 25 次跨塔战术连携', rewardCrystals: 6 },
  { id: 'ach_skill_12', name: '轨道火力官', description: '累计释放 12 次指挥官战术技能', rewardCrystals: 6 },
  { id: 'ach_mech_15', name: '战地工程学', description: '采集晶脉或激活战场机关 15 次', rewardCrystals: 6 },
  { id: 'ach_all_sectors', name: '月海守望者', description: '通关全部 4 个星区战役章节', rewardCrystals: 15 },
  { id: 'ach_10_stars', name: '璀璨信标', description: '累计摘取 10 颗战役星章', rewardCrystals: 12 },
  { id: 'ach_endless_15', name: '超载不灭', description: '星区无尽超载坚守至第 15 波', rewardCrystals: 15 },
];

export interface ComputedTechModifiers {
  damageMultiplier: number;
  fireRateMultiplier: number;
  rangeMultiplier: number;
  bonusInitialGold: number;
  bonusMaxBeaconHp: number;
  waveHealBeaconHp: number;
  bonusInitialEnergy: number;
  energyRegenMultiplier: number;
  comboDamageMultiplier: number;
  t4CostDiscount: number;
}`,
    `export const MAX_CORE_TECH_LEVEL = 8;

export const TECH_MODULES: Record<TechUpgradeId, TechModuleConfig> = {
  kinetic_core: {
    id: 'kinetic_core',
    name: '超导弹芯',
    summary: '全塔与战术技能伤害倍增（Lv.5-8 深空二阶突破）',
    costs: [4, 7, 11, 16, 24, 35, 50, 70],
    levelDescriptions: [
      '+0% 伤害',
      '+6% 伤害',
      '+12% 伤害',
      '+18% 伤害',
      '+25% 伤害',
      '+36% 伤害',
      '+50% 伤害',
      '+68% 伤害',
      '+90% 伤害',
    ],
  },
  servo_drive: {
    id: 'servo_drive',
    name: '液压伺服',
    summary: '全塔攻速与射程同步强化（Lv.5-8 宗师伺服阵列）',
    costs: [4, 7, 11, 16, 24, 35, 50, 70],
    levelDescriptions: [
      '+0% 攻速 / 射程',
      '+5% 攻速 · +4% 射程',
      '+10% 攻速 · +8% 射程',
      '+15% 攻速 · +12% 射程',
      '+20% 攻速 · +16% 射程',
      '+27% 攻速 · +20% 射程',
      '+34% 攻速 · +24% 射程',
      '+42% 攻速 · +28% 射程',
      '+50% 攻速 · +32% 射程',
    ],
  },
  requisition_pack: {
    id: 'requisition_pack',
    name: '战前整备',
    summary: '提高开局初始金币（Lv.5+ 额外提高击杀与波次金币赏金）',
    costs: [3, 6, 9, 14, 20, 30, 44, 62],
    levelDescriptions: [
      '+0 初始金币',
      '+40 初始金币',
      '+80 初始金币',
      '+125 初始金币',
      '+175 初始金币',
      '+240G · 赏金+8%',
      '+320G · 赏金+16%',
      '+420G · 赏金+24%',
      '+550G · 赏金+32%',
    ],
  },
  beacon_plating: {
    id: 'beacon_plating',
    name: '信标装甲',
    summary: '提升信标耐久上限与每波纳米自愈（Lv.8 每波+4修复）',
    costs: [3, 6, 9, 14, 20, 30, 44, 62],
    levelDescriptions: [
      '+0 耐久上限',
      '+4 耐久上限',
      '+8 耐久上限',
      '+12 耐久 · 每波+1修复',
      '+16 耐久 · 每波+1修复',
      '+22 耐久 · 每波+2修复',
      '+30 耐久 · 每波+2修复',
      '+40 耐久 · 每波+3修复',
      '+52 耐久 · 每波+4修复',
    ],
  },
  tactical_reactor: {
    id: 'tactical_reactor',
    name: '战术反应堆',
    summary: '提高初始战术能量与能量上限、充能速率',
    costs: [4, 8, 12, 17, 24, 36, 52, 72],
    levelDescriptions: [
      '+0⚡ · +0%充能',
      '+12⚡ · +10%充能',
      '+24⚡ · +20%充能',
      '+36⚡ · +30%充能',
      '+50⚡ · +40%充能',
      '+68⚡ · +65%充能',
      '+88⚡ · +90%充能',
      '+112⚡ · +120%充能',
      '+140⚡ · +150%充能',
    ],
  },
  flux_resonator: {
    id: 'flux_resonator',
    name: '磁暴谐振器',
    summary: '提升跨塔连携伤害，并降低 T4 晋升与无限超频费用',
    costs: [5, 8, 12, 18, 26, 38, 55, 76],
    levelDescriptions: [
      '+0%连携 · -0%费用',
      '+12%连携 · -5%费用',
      '+24%连携 · -10%费用',
      '+36%连携 · -15%费用',
      '+48%连携 · -20%费用',
      '+68%连携 · -24%费用',
      '+92%连携 · -28%费用',
      '+120%连携 · -32%费用',
      '+155%连携 · -36%费用',
    ],
  },
};

export const APEX_ORDER: ApexTechId[] = ['apex_firepower', 'apex_bounty', 'apex_bastion'];

export const APEX_MODULES: Record<ApexTechId, ApexTechConfig> = {
  apex_firepower: {
    id: 'apex_firepower',
    name: '♾ 奇点武备谐振',
    summary: '无限等级：每级全塔与技能总伤 +8%，每5级附加 +0.4% 最大生命破甲斩杀',
    baseCost: 14,
    costStep: 4,
    formatEffect: (lv: number) => {
      const pct = lv * 8;
      const giant = (Math.min(20, Math.floor(lv / 5)) * 0.4).toFixed(1);
      return \`总伤 +\${pct}% · 巨兽斩杀 +\${giant}%最大生命\`;
    },
  },
  apex_bounty: {
    id: 'apex_bounty',
    name: '♾ 星海晶矿精炼',
    summary: '无限等级：每级金币赏金 +6%、全塔穿甲 +1%，每5级无尽首领额外 +1💎',
    baseCost: 12,
    costStep: 4,
    formatEffect: (lv: number) => {
      const goldPct = lv * 6;
      const pierce = Math.min(35, lv);
      const extraCrys = Math.floor(lv / 5);
      return \`金币 +\${goldPct}% · 穿甲 +\${pierce}% · 首领 +\${extraCrys}💎\`;
    },
  },
  apex_bastion: {
    id: 'apex_bastion',
    name: '♾ 方舟永恒力场',
    summary: '无限等级：每级信标耐久 +4、能量上限 +8⚡、技能冷却缩减 +1.5%（上限40%）',
    baseCost: 12,
    costStep: 4,
    formatEffect: (lv: number) => {
      const hp = lv * 4;
      const en = lv * 8;
      const cdr = Math.min(40, lv * 1.5).toFixed(1);
      return \`耐久 +\${hp} · 能量 +\${en}⚡ · 冷却 -\${cdr}%\`;
    },
  },
};

export const ACHIEVEMENT_CONFIGS: AchievementConfig[] = [
  { id: 'ach_ch1_clear', name: '初阵告捷', description: '通关第 1 战区【曙光检修站】', rewardCrystals: 6 },
  { id: 'ach_flawless_3star', name: '毫发无伤', description: '任意战区达成 3★ 满状态守护', rewardCrystals: 8 },
  { id: 'ach_dual_t4', name: '双轨传说', description: '单局同时部署 T4-A 与 T4-B 传说机甲', rewardCrystals: 8 },
  { id: 'ach_synergy_25', name: '磁暴交响', description: '累计触发 25 次跨塔战术连携', rewardCrystals: 6 },
  { id: 'ach_skill_12', name: '轨道火力官', description: '累计释放 12 次指挥官战术技能', rewardCrystals: 6 },
  { id: 'ach_mech_15', name: '战地工程学', description: '采集晶脉或激活战场机关 15 次', rewardCrystals: 6 },
  { id: 'ach_all_sectors', name: '月海守望者', description: '通关全部 4 个星区战役章节', rewardCrystals: 15 },
  { id: 'ach_10_stars', name: '璀璨信标', description: '累计摘取 10 颗战役星章', rewardCrystals: 12 },
  { id: 'ach_endless_15', name: '超载不灭', description: '星区无尽超载坚守至第 15 波', rewardCrystals: 15 },
  { id: 'ach_overclock_10', name: '极限超频工程', description: '单座传说机甲达成 超频突破 +10', rewardCrystals: 20 },
  { id: 'ach_endless_40', name: '深空破壁者', description: '星区无尽超载突破第 40 波防线', rewardCrystals: 25 },
  { id: 'ach_endless_70', name: '终末方舟统帅', description: '星区无尽超载坚守至第 70 波', rewardCrystals: 40 },
];

export interface ComputedTechModifiers {
  damageMultiplier: number;
  fireRateMultiplier: number;
  rangeMultiplier: number;
  bonusInitialGold: number;
  bonusMaxBeaconHp: number;
  waveHealBeaconHp: number;
  bonusInitialEnergy: number;
  energyRegenMultiplier: number;
  comboDamageMultiplier: number;
  t4CostDiscount: number;
  goldBountyMultiplier: number;
  bonusArmorPierce: number;
  maxHpBonusRatio: number;
  skillCooldownScale: number;
  extraBossCrystals: number;
}`,
    'ProgressionManager expanded modules & achievements'
  );

  progSrc = replaceExact(
    progSrc,
    `function createDefaultTechLevels(): Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4> {
  return {
    kinetic_core: 0,
    servo_drive: 0,
    requisition_pack: 0,
    beacon_plating: 0,
    tactical_reactor: 0,
    flux_resonator: 0,
  };
}`,
    `function createDefaultTechLevels(): Record<TechUpgradeId, TechLevel> {
  return {
    kinetic_core: 0,
    servo_drive: 0,
    requisition_pack: 0,
    beacon_plating: 0,
    tactical_reactor: 0,
    flux_resonator: 0,
  };
}

function createDefaultApexLevels(): Record<ApexTechId, number> {
  return {
    apex_firepower: 0,
    apex_bounty: 0,
    apex_bastion: 0,
  };
}`,
    'ProgressionManager default levels helpers'
  );

  progSrc = replaceExact(
    progSrc,
    `          const techLevels = createDefaultTechLevels();
          if (parsed.techLevels) {
            for (const tid of TECH_ORDER) {
              const lv = Math.max(0, Math.min(4, Math.floor(Number(parsed.techLevels[tid]) || 0))) as
                | 0
                | 1
                | 2
                | 3
                | 4;
              techLevels[tid] = lv;
            }
          }`,
    `          const techLevels = createDefaultTechLevels();
          if (parsed.techLevels) {
            for (const tid of TECH_ORDER) {
              const lv = Math.max(
                0,
                Math.min(MAX_CORE_TECH_LEVEL, Math.floor(Number(parsed.techLevels[tid]) || 0))
              ) as TechLevel;
              techLevels[tid] = lv;
            }
          }
          const apexLevels = createDefaultApexLevels();
          if (parsed.apexLevels) {
            for (const aid of APEX_ORDER) {
              apexLevels[aid] = Math.max(0, Math.floor(Number(parsed.apexLevels[aid]) || 0));
            }
          }`,
    'ProgressionManager load techLevels & apexLevels'
  );

  progSrc = replaceExact(
    progSrc,
    `              stages,
              techLevels,
              seenCodexIds: loadedSeen,
            counters: {
              synergyTriggers: Math.max(0, Number(parsed.counters?.synergyTriggers) || 0),
              skillsUsed: Math.max(0, Number(parsed.counters?.skillsUsed) || 0),
              mechanismsUsed: Math.max(0, Number(parsed.counters?.mechanismsUsed) || 0),
              dualBranchCleared: Boolean(parsed.counters?.dualBranchCleared),
            },`,
    `              stages,
              techLevels,
              apexLevels,
              seenCodexIds: loadedSeen,
            counters: {
              synergyTriggers: Math.max(0, Number(parsed.counters?.synergyTriggers) || 0),
              skillsUsed: Math.max(0, Number(parsed.counters?.skillsUsed) || 0),
              mechanismsUsed: Math.max(0, Number(parsed.counters?.mechanismsUsed) || 0),
              dualBranchCleared: Boolean(parsed.counters?.dualBranchCleared),
              maxOverclockReached: Math.max(0, Math.floor(Number(parsed.counters?.maxOverclockReached) || 0)),
            },`,
    'ProgressionManager parsed return object'
  );

  progSrc = replaceExact(
    progSrc,
    `      stages,
      techLevels: createDefaultTechLevels(),
      seenCodexIds: ['autocannon', 'mortar', 'magnetic', 'rover', 'swarm', 'drill', 'high_ground'],
      counters: {
        synergyTriggers: 0,
        skillsUsed: 0,
        mechanismsUsed: 0,
        dualBranchCleared: false,
      },`,
    `      stages,
      techLevels: createDefaultTechLevels(),
      apexLevels: createDefaultApexLevels(),
      seenCodexIds: ['autocannon', 'mortar', 'magnetic', 'rover', 'swarm', 'drill', 'high_ground'],
      counters: {
        synergyTriggers: 0,
        skillsUsed: 0,
        mechanismsUsed: 0,
        dualBranchCleared: false,
        maxOverclockReached: 0,
      },`,
    'ProgressionManager migrated object'
  );

  progSrc = replaceExact(
    progSrc,
    `  public getTechLevel(id: TechUpgradeId): 0 | 1 | 2 | 3 | 4 {
    return this.data.techLevels[id] ?? 0;
  }

  public getNextTechCost(id: TechUpgradeId): number | null {
    const lv = this.getTechLevel(id);
    if (lv === 4) return null;
    return TECH_MODULES[id].costs[lv];
  }

  public canUpgradeTech(id: TechUpgradeId): boolean {
    const cost = this.getNextTechCost(id);
    return cost !== null && this.data.totalCrystals >= cost;
  }

  public upgradeTech(id: TechUpgradeId): boolean {
    const lv = this.getTechLevel(id);
    if (lv === 4) return false;
    const cost = TECH_MODULES[id].costs[lv];
    if (this.data.totalCrystals < cost) return false;

    this.data.totalCrystals -= cost;
    this.data.spentCrystals += cost;
    this.data.techLevels[id] = (lv + 1) as 1 | 2 | 3 | 4;
    this.persist();
    return true;
  }

  public respecTech(): number {
    const refunded = this.data.spentCrystals;
    if (refunded <= 0) return 0;
    this.data.totalCrystals += refunded;
    this.data.spentCrystals = 0;
    this.data.techLevels = createDefaultTechLevels();
    this.persist();
    return refunded;
  }

  public getComputedTechModifiers(): ComputedTechModifiers {
    const kc = this.data.techLevels.kinetic_core;
    const sd = this.data.techLevels.servo_drive;
    const rp = this.data.techLevels.requisition_pack;
    const bp = this.data.techLevels.beacon_plating;
    const tr = this.data.techLevels.tactical_reactor;
    const fr = this.data.techLevels.flux_resonator;

    const dmgSteps = [1, 1.06, 1.12, 1.18, 1.25];
    const goldSteps = [0, 40, 80, 125, 175];
    const hpSteps = [0, 4, 8, 12, 16];
    const energySteps = [0, 12, 24, 36, 50];

    return {
      damageMultiplier: dmgSteps[kc],
      fireRateMultiplier: 1 + sd * 0.05,
      rangeMultiplier: 1 + sd * 0.04,
      bonusInitialGold: goldSteps[rp],
      bonusMaxBeaconHp: hpSteps[bp],
      waveHealBeaconHp: bp >= 3 ? 1 : 0,
      bonusInitialEnergy: energySteps[tr],
      energyRegenMultiplier: 1 + tr * 0.1,
      comboDamageMultiplier: 1 + fr * 0.12,
      t4CostDiscount: fr * 0.05,
    };
  }`,
    `  public getTechLevel(id: TechUpgradeId): TechLevel {
    return this.data.techLevels[id] ?? 0;
  }

  public getNextTechCost(id: TechUpgradeId): number | null {
    const lv = this.getTechLevel(id);
    if (lv >= MAX_CORE_TECH_LEVEL) return null;
    return TECH_MODULES[id].costs[lv] ?? null;
  }

  public canUpgradeTech(id: TechUpgradeId): boolean {
    const cost = this.getNextTechCost(id);
    return cost !== null && this.data.totalCrystals >= cost;
  }

  public upgradeTech(id: TechUpgradeId): boolean {
    const lv = this.getTechLevel(id);
    if (lv >= MAX_CORE_TECH_LEVEL) return false;
    const cost = TECH_MODULES[id].costs[lv];
    if (cost === undefined || this.data.totalCrystals < cost) return false;

    this.data.totalCrystals -= cost;
    this.data.spentCrystals += cost;
    this.data.techLevels[id] = (lv + 1) as TechLevel;
    this.persist();
    return true;
  }

  public getApexLevel(id: ApexTechId): number {
    if (!this.data.apexLevels) this.data.apexLevels = createDefaultApexLevels();
    return this.data.apexLevels[id] ?? 0;
  }

  public getApexCost(id: ApexTechId, count = 1): number {
    const cfg = APEX_MODULES[id];
    const startLv = this.getApexLevel(id);
    let sum = 0;
    for (let i = 0; i < count; i++) {
      sum += cfg.baseCost + (startLv + i) * cfg.costStep;
    }
    return sum;
  }

  public canUpgradeApex(id: ApexTechId, count = 1): boolean {
    return this.data.totalCrystals >= this.getApexCost(id, count);
  }

  public upgradeApexTech(id: ApexTechId, maxCount = 1): number {
    if (!this.data.apexLevels) this.data.apexLevels = createDefaultApexLevels();
    let upgraded = 0;
    for (let i = 0; i < maxCount; i++) {
      const nextCost = this.getApexCost(id, 1);
      if (this.data.totalCrystals < nextCost) break;
      this.data.totalCrystals -= nextCost;
      this.data.spentCrystals += nextCost;
      this.data.apexLevels[id] = (this.data.apexLevels[id] ?? 0) + 1;
      upgraded++;
    }
    if (upgraded > 0) this.persist();
    return upgraded;
  }

  public spendCrystalsInBattle(cost: number): boolean {
    const c = Math.max(1, Math.floor(cost));
    if (this.data.totalCrystals < c) return false;
    this.data.totalCrystals -= c;
    this.persist();
    return true;
  }

  public recordMaxOverclock(level: number): void {
    const prev = this.data.counters.maxOverclockReached ?? 0;
    if (level > prev) {
      this.data.counters.maxOverclockReached = level;
      this.persist();
    }
  }

  public respecTech(): number {
    const refunded = this.data.spentCrystals;
    if (refunded <= 0) return 0;
    this.data.totalCrystals += refunded;
    this.data.spentCrystals = 0;
    this.data.techLevels = createDefaultTechLevels();
    this.data.apexLevels = createDefaultApexLevels();
    this.persist();
    return refunded;
  }

  public getComputedTechModifiers(): ComputedTechModifiers {
    const kc = this.data.techLevels.kinetic_core;
    const sd = this.data.techLevels.servo_drive;
    const rp = this.data.techLevels.requisition_pack;
    const bp = this.data.techLevels.beacon_plating;
    const tr = this.data.techLevels.tactical_reactor;
    const fr = this.data.techLevels.flux_resonator;

    const apexFp = this.getApexLevel('apex_firepower');
    const apexBn = this.getApexLevel('apex_bounty');
    const apexBs = this.getApexLevel('apex_bastion');

    const dmgSteps = [1, 1.06, 1.12, 1.18, 1.25, 1.36, 1.5, 1.68, 1.9];
    const rateSteps = [1, 1.05, 1.1, 1.15, 1.2, 1.27, 1.34, 1.42, 1.5];
    const rngSteps = [1, 1.04, 1.08, 1.12, 1.16, 1.2, 1.24, 1.28, 1.32];
    const goldSteps = [0, 40, 80, 125, 175, 240, 320, 420, 550];
    const hpSteps = [0, 4, 8, 12, 16, 22, 30, 40, 52];
    const healSteps = [0, 0, 0, 1, 1, 2, 2, 3, 4];
    const energySteps = [0, 12, 24, 36, 50, 68, 88, 112, 140];
    const regenSteps = [1, 1.1, 1.2, 1.3, 1.4, 1.65, 1.9, 2.2, 2.5];
    const comboSteps = [1, 1.12, 1.24, 1.36, 1.48, 1.68, 1.92, 2.2, 2.55];
    const discSteps = [0, 0.05, 0.1, 0.15, 0.2, 0.24, 0.28, 0.32, 0.36];

    return {
      damageMultiplier: (dmgSteps[kc] ?? 1) * (1 + apexFp * 0.08),
      fireRateMultiplier: rateSteps[sd] ?? 1,
      rangeMultiplier: rngSteps[sd] ?? 1,
      bonusInitialGold: goldSteps[rp] ?? 0,
      bonusMaxBeaconHp: (hpSteps[bp] ?? 0) + apexBs * 4,
      waveHealBeaconHp: healSteps[bp] ?? 0,
      bonusInitialEnergy: (energySteps[tr] ?? 0) + apexBs * 8,
      energyRegenMultiplier: regenSteps[tr] ?? 1,
      comboDamageMultiplier: comboSteps[fr] ?? 1,
      t4CostDiscount: discSteps[fr] ?? 0,
      goldBountyMultiplier: (1 + Math.max(0, rp - 4) * 0.08) * (1 + apexBn * 0.06),
      bonusArmorPierce: Math.min(0.35, apexBn * 0.01),
      maxHpBonusRatio: Math.min(0.08, Math.floor(apexFp / 5) * 0.004),
      skillCooldownScale: Math.max(0.6, 1 - apexBs * 0.015),
      extraBossCrystals: Math.floor(apexBn / 5),
    };
  }`,
    'ProgressionManager expanded tech & apex methods'
  );

  progSrc = replaceExact(
    progSrc,
    `      case 'ach_endless_15':
        return s.endless.bestWave >= 15;
    }`,
    `      case 'ach_endless_15':
        return s.endless.bestWave >= 15;
      case 'ach_overclock_10':
        return (this.data.counters.maxOverclockReached ?? 0) >= 10;
      case 'ach_endless_40':
        return s.endless.bestWave >= 40;
      case 'ach_endless_70':
        return s.endless.bestWave >= 70;
    }`,
    'ProgressionManager new achievement unlock checks'
  );

  progSrc = replaceExact(
    progSrc,
    `    for (const tid of TECH_ORDER) {
      if (this.canUpgradeTech(tid)) return true;
    }`,
    `    for (const tid of TECH_ORDER) {
      if (this.canUpgradeTech(tid)) return true;
    }
    for (const aid of APEX_ORDER) {
      if (this.canUpgradeApex(aid, 1)) return true;
    }`,
    'ProgressionManager hasHubAlert includes Apex tech'
  );

  progSrc = replaceExact(
    progSrc,
    `      techLevels: { ...this.data.techLevels },
      seenCodexIds: [...this.data.seenCodexIds],`,
    `      techLevels: { ...this.data.techLevels },
      apexLevels: { ...(this.data.apexLevels ?? createDefaultApexLevels()) },
      seenCodexIds: [...this.data.seenCodexIds],`,
    'ProgressionManager getSnapshot apexLevels'
  );

  fs.writeFileSync(progPath, progSrc, 'utf8');
}

// ============================================================================
// 3. Patch src/config/campaignConfig.ts (Smooth 3-Stage Endless Curve & Bounties)
// ============================================================================
const campPath = path.join(root, 'src/config/campaignConfig.ts');
let campSrc = fs.readFileSync(campPath, 'utf8');
if (campSrc.includes('Math.pow(1.135, w - 1)')) {
  campSrc = replaceExact(
    campSrc,
    `export function getEndlessScaling(waveNumber: number): EndlessWaveScale {
  const w = Math.max(1, waveNumber);
  return {
    hpMultiplier: Math.pow(1.135, w - 1),
    speedMultiplier: Math.min(1.35, 1 + Math.floor((w - 1) / 5) * 0.04),
    goldRewardScale: Math.max(0.35, 1 / (1 + (w - 1) * 0.08)),
  };
}`,
    `export function getEndlessScaling(waveNumber: number): EndlessWaveScale {
  const w = Math.max(1, waveNumber);
  // Smooth 3-phase endless HP curve tuned for Lv.8 Tech + T4 Infinite Overclock + Apex Research (W1 -> W100+)
  let hpMultiplier = 1;
  if (w <= 20) {
    hpMultiplier = Math.pow(1.115, w - 1);
  } else if (w <= 50) {
    hpMultiplier = Math.pow(1.115, 19) * Math.pow(1.084, w - 20);
  } else {
    hpMultiplier = Math.pow(1.115, 19) * Math.pow(1.084, 30) * Math.pow(1.064, w - 50);
  }
  const goldRewardScale =
    w <= 15
      ? Math.max(0.48, 1 / (1 + (w - 1) * 0.055))
      : Number((0.56 + (w - 15) * 0.032).toFixed(3));
  return {
    hpMultiplier,
    speedMultiplier: Math.min(1.42, 1 + Math.floor((w - 1) / 6) * 0.035),
    goldRewardScale,
  };
}`,
    'campaignConfig getEndlessScaling smooth curve'
  );

  campSrc = replaceExact(
    campSrc,
    `  const clearGoldBonus = Math.min(260, 75 + w * 10);
  const clearCrystalBonus = isBossWave ? 5 : isEliteWave ? 2 : 1;

  return {
    waveNumber: w,
    title: isBossWave
      ? \`无尽第 \${w} 波 · 首领【\${bossTitle}】降临\`
      : \`无尽第 \${w} 波 · 超载机械狂潮\`,
    subtitle: isBossWave
      ? \`首领强度 \${(Math.pow(1.135, w - 1) * 100).toFixed(0)}%！击败首领赢取 +5 能源晶体补给！\`
      : \`敌械生命倍率 ×\${Math.pow(1.135, w - 1).toFixed(2)} · 巧用电容塔与激光闸稳固防线\`,`,
    `  const scale = getEndlessScaling(w);
  const clearGoldBonus = 80 + w * 18;
  const clearCrystalBonus = isBossWave ? 5 + Math.floor(w / 20) : isEliteWave ? 2 : 1;

  return {
    waveNumber: w,
    title: isBossWave
      ? \`无尽第 \${w} 波 · 首领【\${bossTitle}】降临\`
      : \`无尽第 \${w} 波 · 超载机械狂潮\`,
    subtitle: isBossWave
      ? \`首领强度 ×\${scale.hpMultiplier.toFixed(1)}！击败首领赢取 +\${clearCrystalBonus} 能源晶体与超频赏金！\`
      : \`敌械生命倍率 ×\${scale.hpMultiplier.toFixed(2)} · 善用传说机甲【超频突破】与军工增幅推进战线\`,`,
    'campaignConfig generateEndlessWave uncapped bounty & subtitle'
  );

  fs.writeFileSync(campPath, campSrc, 'utf8');
}

// ============================================================================
// 4. Patch src/render/TowerFactory.ts (3D Overclock Ascension Plasma Halo)
// ============================================================================
const tfPath = path.join(root, 'src/render/TowerFactory.ts');
let tfSrc = fs.readFileSync(tfPath, 'utf8');
if (!tfSrc.includes('overclockHalo')) {
  tfSrc = replaceExact(
    tfSrc,
    `  const rig: TowerRig = {
    root,`,
    `  // V5 3D Overclock Ascension Halo (Layer 1 bloom rings, activated when overclockLevel >= 1)
  const overclockHalo = new THREE.Group();
  overclockHalo.position.set(0, 0.22, 0);
  overclockHalo.visible = false;
  const ocInnerMat = new THREE.MeshBasicMaterial({
    color: 0x38bdf8,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const ocInnerRing = new THREE.Mesh(new THREE.RingGeometry(1.06, 1.18, 28), ocInnerMat);
  ocInnerRing.rotation.x = -Math.PI / 2;
  ocInnerRing.layers.set(1);
  overclockHalo.add(ocInnerRing);

  const ocOuterMat = new THREE.MeshBasicMaterial({
    color: 0xfbbf24,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const ocOuterRing = new THREE.Mesh(new THREE.TorusGeometry(1.24, 0.026, 6, 24), ocOuterMat);
  ocOuterRing.rotation.x = Math.PI / 2;
  ocOuterRing.position.y = 0.12;
  ocOuterRing.visible = false;
  ocOuterRing.layers.set(1);
  overclockHalo.add(ocOuterRing);
  root.add(overclockHalo);

  const rig: TowerRig = {
    root,
    overclockHalo,`,
    'TowerFactory overclockHalo creation'
  );
  fs.writeFileSync(tfPath, tfSrc, 'utf8');
}

// ============================================================================
// 5. Patch src/game/GameEngine.ts (Overclocking, Supply Protocols, Endgame Scaling)
// ============================================================================
const engPath = path.join(root, 'src/game/GameEngine.ts');
let engSrc = fs.readFileSync(engPath, 'utf8');
if (!engSrc.includes('overclockSelectedTower')) {
  engSrc = replaceExact(
    engSrc,
    '  private activeComboCount = 0;',
    `  private activeComboCount = 0;
  private runArsenalLevel = 0;
  private runCrystalProtocolLevel = 0;`,
    'GameEngine runArsenalLevel & runCrystalProtocolLevel fields'
  );

  engSrc = replaceExact(
    engSrc,
    `    this.activeComboCount = 0;
    this.comboResetTimer = 0;`,
    `    this.activeComboCount = 0;
    this.runArsenalLevel = 0;
    this.runCrystalProtocolLevel = 0;
    this.comboResetTimer = 0;`,
    'GameEngine reset run supply levels on new mission'
  );

  // Upgrade computeTowerStatsForTier to include overclockLevel, bonusArmorPierce & runGlobalDamageMultiplier
  engSrc = replaceExact(
    engSrc,
    `  private computeTowerStatsForTier(
    type: TowerType,
    tier: TowerTier,
    isHighGround: boolean,
    branch: TowerBranch = 'A'
  ): {
    damage: number;
    fireInterval: number;
    range: number;
    splashRadius: number;
    slowRatio: number;
    slowDuration: number;
    armorPierce: number;
    cost: number;
    partHeadline: string;
  } {
    const bp = TOWER_BLUEPRINTS[type];
    const base = tier === 4 ? bp.branches[branch] : bp.tiers[tier - 1];
    const tech = this.progression.getComputedTechModifiers();
    const hgDmg = isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
    const hgRng = isHighGround ? HIGH_GROUND_RANGE_MULT : 1.0;
    const costDiscount = tier === 4 ? tech.t4CostDiscount : 0;

    return {
      damage: Math.round(base.damage * hgDmg * tech.damageMultiplier),
      fireInterval: Number((base.fireInterval / tech.fireRateMultiplier).toFixed(3)),
      range: Number((base.range * hgRng * tech.rangeMultiplier).toFixed(2)),
      splashRadius: base.splashRadius,
      slowRatio: base.slowRatio,
      slowDuration: base.slowDuration,
      armorPierce: base.armorPierce,
      cost: Math.max(10, Math.round(base.cost * (1 - costDiscount))),
      partHeadline: base.partHeadline,
    };
  }`,
    `  private getRunGlobalDamageMultiplier(): number {
    return (1 + this.runArsenalLevel * 0.12) * (1 + this.runCrystalProtocolLevel * 0.15);
  }

  public getNextArsenalCost(): number {
    return 360 + this.runArsenalLevel * 140;
  }

  public computeOverclockStepCost(currentOverclockLv: number): number {
    const tech = this.progression.getComputedTechModifiers();
    const raw = 220 + currentOverclockLv * 75 + currentOverclockLv * currentOverclockLv * 12;
    return Math.max(80, Math.round(raw * (1 - tech.t4CostDiscount)));
  }

  private computeTowerStatsForTier(
    type: TowerType,
    tier: TowerTier,
    isHighGround: boolean,
    branch: TowerBranch = 'A',
    overclockLevel = 0
  ): {
    damage: number;
    fireInterval: number;
    range: number;
    splashRadius: number;
    slowRatio: number;
    slowDuration: number;
    armorPierce: number;
    cost: number;
    partHeadline: string;
  } {
    const bp = TOWER_BLUEPRINTS[type];
    const base = tier === 4 ? bp.branches[branch] : bp.tiers[tier - 1];
    const tech = this.progression.getComputedTechModifiers();
    const hgDmg = isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
    const hgRng = isHighGround ? HIGH_GROUND_RANGE_MULT : 1.0;
    const costDiscount = tier === 4 ? tech.t4CostDiscount : 0;

    const oc = tier === 4 ? Math.max(0, overclockLevel) : 0;
    const ocDmgMult = oc > 0 ? Math.pow(1.145, oc) : 1.0;
    const ocRateMult = oc > 0 ? 1 + Math.min(0.7, oc * 0.035) : 1.0;
    const ocRangeAdd = oc > 0 ? Math.min(1.6, oc * 0.08) : 0;
    const ocSplashAdd = oc > 0 && base.splashRadius > 0 ? Math.min(0.85, oc * 0.04) : 0;
    const ocSlowAdd = oc > 0 && base.slowRatio > 0 ? Math.min(0.18, oc * 0.012) : 0;
    const ocPierceAdd = oc * 0.012;
    const runMult = this.getRunGlobalDamageMultiplier();

    return {
      damage: Math.max(
        1,
        Math.round(base.damage * hgDmg * tech.damageMultiplier * ocDmgMult * runMult)
      ),
      fireInterval: Number(
        Math.max(0.065, base.fireInterval / (tech.fireRateMultiplier * ocRateMult)).toFixed(3)
      ),
      range: Number((base.range * hgRng * tech.rangeMultiplier + ocRangeAdd).toFixed(2)),
      splashRadius: Number((base.splashRadius + ocSplashAdd).toFixed(2)),
      slowRatio: Math.min(0.78, Number((base.slowRatio + ocSlowAdd).toFixed(2))),
      slowDuration: base.slowDuration,
      armorPierce: Math.min(0.95, base.armorPierce + tech.bonusArmorPierce + ocPierceAdd),
      cost: Math.max(10, Math.round(base.cost * (1 - costDiscount))),
      partHeadline: base.partHeadline,
    };
  }`,
    'GameEngine computeTowerStatsForTier with Overclock & Run multipliers'
  );

  // Initialize overclockLevel: 0 on build
  engSrc = replaceExact(
    engSrc,
    `      kills: 0,
      totalDamage: 0,
    };`,
    `      overclockLevel: 0,
      kills: 0,
      totalDamage: 0,
    };`,
    'GameEngine init overclockLevel on TowerInstance'
  );

  // Route T4 upgradeSelectedTower into overclockSelectedTower(1) + add bulk overclock & field supply protocols!
  engSrc = replaceExact(
    engSrc,
    `  public upgradeSelectedTower(branch: TowerBranch = 'A'): boolean {
    if (this.mode !== 'playing' || !this.selectedPadId) return false;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower || tower.tier >= 4) return false;`,
    `  private syncTowerOverclockVisuals(tower: TowerInstance): void {
    const lv = tower.overclockLevel ?? 0;
    const halo = tower.rig.overclockHalo;
    if (!halo) return;
    halo.visible = tower.tier === 4 && lv >= 1;
    if (!halo.visible) return;
    const inner = halo.children[0] as THREE.Mesh | undefined;
    const outer = halo.children[1] as THREE.Mesh | undefined;
    if (inner) {
      const mat = inner.material as THREE.MeshBasicMaterial;
      mat.color.setHex(lv >= 10 ? 0xe879f9 : lv >= 5 ? 0xfbbf24 : 0x38bdf8);
    }
    if (outer) {
      outer.visible = lv >= 5;
      const mat = outer.material as THREE.MeshBasicMaterial;
      mat.color.setHex(lv >= 10 ? 0x38bdf8 : 0xfb7185);
    }
    tower.rig.coreMaterial.emissiveIntensity = Math.min(3.2, 1.35 + lv * 0.12);
  }

  public overclockSelectedTower(maxSteps = 1): number {
    if (this.mode !== 'playing' || !this.selectedPadId) return 0;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower || tower.tier < 4) return 0;

    this.audio.unlock();
    const isHG = Boolean(tower.isHighGround);
    const br = tower.branch ?? 'A';
    const startLv = tower.overclockLevel ?? 0;
    const beforeStats = this.computeTowerStatsForTier(tower.type, 4, isHG, br, startLv);

    const firstCost = this.computeOverclockStepCost(startLv);
    if (this.gold < firstCost) {
      this.audio.playInsufficientGold();
      this.callbacks.onInsufficientGold(firstCost - this.gold);
      return 0;
    }

    let stepsDone = 0;
    const cap = Math.max(1, Math.min(10, maxSteps));
    while (stepsDone < cap) {
      const curLv = (tower.overclockLevel ?? 0);
      const stepCost = this.computeOverclockStepCost(curLv);
      if (this.gold < stepCost) break;
      this.gold -= stepCost;
      tower.totalInvestedGold += stepCost;
      tower.overclockLevel = curLv + 1;
      stepsDone++;
    }

    if (stepsDone <= 0) return 0;
    const newLv = tower.overclockLevel ?? 0;
    this.progression.recordMaxOverclock(newLv);
    this.syncTowerOverclockVisuals(tower);
    tower.upgradingTimer = 0.28;
    tower.flapCloseTimer = 0.35;
    this.openTowerHingedFlaps(tower);

    const afterStats = this.computeTowerStatsForTier(tower.type, 4, isHG, br, newLv);
    this.audio.playTierIgnite(3);
    this.vfx.spawnGroundRing(
      new THREE.Vector3(tower.worldPos.x, 0.095, tower.worldPos.z),
      newLv >= 10 ? 0xe879f9 : 0x38bdf8,
      0.45,
      3.1,
      0.38
    );
    const deltas: StatDeltaPopup[] = [
      { label: '伤害', deltaText: \`▲+\${afterStats.damage - beforeStats.damage}\` },
    ];
    if (afterStats.range > beforeStats.range) {
      deltas.push({ label: '射程', deltaText: \`▲+\${(afterStats.range - beforeStats.range).toFixed(2)}m\` });
    }
    this.callbacks.onUpgradeStamp(\`⚡超频 +\${newLv}\`, '#38BDF8', deltas, false);
    this.syncSelectionRings();
    this.emitSnapshot();
    return stepsDone;
  }

  public activateArsenalBoost(): boolean {
    if (this.mode !== 'playing' || this.overlayPaused) return false;
    this.audio.unlock();
    const cost = this.getNextArsenalCost();
    if (this.gold < cost) {
      this.audio.playInsufficientGold();
      this.callbacks.onInsufficientGold(cost - this.gold);
      return false;
    }
    this.gold -= cost;
    this.runArsenalLevel++;
    for (const tw of this.towers.values()) {
      tw.overdriveTimer = Math.max(tw.overdriveTimer ?? 0, 4.5);
      tw.flapCloseTimer = 0.35;
      this.openTowerHingedFlaps(tw);
    }
    this.audio.playTierIgnite(3);
    this.vfx.spawnClimaxBurst(this.env.beacon.group.position, 0xfbbf24, 0.85, false);
    const pt = this.getBeaconScreenCoordinates();
    this.callbacks.onComboCallout?.(
      pt.x,
      pt.y - 24,
      \`💰全军增幅 Lv.\${this.runArsenalLevel} (+12%伤害)\`,
      '#FBBF24',
      1
    );
    this.emitSnapshot();
    return true;
  }

  public activateCrystalOvercharge(): boolean {
    if (this.mode !== 'playing' || this.overlayPaused) return false;
    this.audio.unlock();
    const crystalCost = 5;
    if (!this.progression.spendCrystalsInBattle(crystalCost)) {
      this.audio.playInsufficientGold();
      this.callbacks.onComboCallout?.(
        window.innerWidth * 0.5,
        window.innerHeight * 0.68,
        \`💎 星区储备晶体不足（需 \${crystalCost}💎）\`,
        '#FF5A67',
        1
      );
      return false;
    }
    this.runCrystalProtocolLevel++;
    this.tacticalEnergy = this.maxTacticalEnergy;
    this.skillCooldowns.orbital_strike = 0;
    this.skillCooldowns.emp_overdrive = 0;
    this.skillCooldowns.nano_repair = 0;
    const healAmt = Math.max(5, Math.round(this.maxBeaconHp * 0.2));
    this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + healAmt);
    for (const tw of this.towers.values()) {
      tw.stunTimer = 0;
      tw.overdriveTimer = Math.max(tw.overdriveTimer ?? 0, 6.0);
    }
    this.audio.playEmpOverdrive();
    this.vfx.spawnBeaconNanoRepair(this.env.beacon.group.position);
    const pt = this.getBeaconScreenCoordinates();
    this.callbacks.onComboCallout?.(
      pt.x,
      pt.y - 28,
      \`💎晶簇裂变 Lv.\${this.runCrystalProtocolLevel} (+15%总伤·满能刷新)\`,
      '#38BDF8',
      1
    );
    this.emitSnapshot();
    return true;
  }

  public upgradeSelectedTower(branch: TowerBranch = 'A'): boolean {
    if (this.mode !== 'playing' || !this.selectedPadId) return false;
    const tower = this.towers.get(this.selectedPadId);
    if (!tower) return false;
    if (tower.tier >= 4) {
      return this.overclockSelectedTower(1) > 0;
    }`,
    'GameEngine overclockSelectedTower & supply protocols'
  );

  // Scale Capacitor Pylon & Laser Gate & Commander Skills & Cooldowns for Endless Endgame
  engSrc = replaceExact(
    engSrc,
    `          if (e.shieldHp > 0) {
            e.shieldHp = Math.max(0, e.shieldHp - 220);
            if (e.shieldHp === 0) {
              this.vfx.spawnShieldBreak(e.worldPos);
              brokeAnyShield = true;
            }
            this.syncEnemyShieldVisuals(e);
          }
          const slowAmt = e.isBoss ? 0.28 : 0.48;
          e.slowRatio = Math.max(e.slowRatio, slowAmt);
          e.slowTimer = Math.max(e.slowTimer, 2.4);
          e.fluxTimer = Math.max(e.fluxTimer, 4.0);
          e.rig.slowRing.visible = true;
          if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;
          this.applyDamageToEnemy(e, 95, 1.0, null);`,
    `          if (e.shieldHp > 0) {
            const shieldShatter = Math.max(220, Math.round(e.maxShieldHp * 0.42));
            e.shieldHp = Math.max(0, e.shieldHp - shieldShatter);
            if (e.shieldHp === 0) {
              this.vfx.spawnShieldBreak(e.worldPos);
              brokeAnyShield = true;
            }
            this.syncEnemyShieldVisuals(e);
          }
          const slowAmt = e.isBoss ? 0.28 : 0.48;
          e.slowRatio = Math.max(e.slowRatio, slowAmt);
          e.slowTimer = Math.max(e.slowTimer, 2.4);
          e.fluxTimer = Math.max(e.fluxTimer, 4.0);
          e.rig.slowRing.visible = true;
          if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;
          const pylonTech = this.progression.getComputedTechModifiers();
          const pylonDmg = Math.round(
            95 * pylonTech.damageMultiplier * this.getRunGlobalDamageMultiplier() +
              e.maxHp * (e.isBoss ? 0.028 : 0.065)
          );
          this.applyDamageToEnemy(e, pylonDmg, 1.0, null);`,
    'GameEngine Capacitor Pylon % MaxHP & tech scaling'
  );

  engSrc = replaceExact(
    engSrc,
    `      this.skillCooldowns.emp_overdrive = cfg.cooldownSec;`,
    `      this.skillCooldowns.emp_overdrive = Number(
        (cfg.cooldownSec * this.progression.getComputedTechModifiers().skillCooldownScale).toFixed(2)
      );`,
    'GameEngine EMP skill cooldown scale'
  );

  engSrc = replaceExact(
    engSrc,
    `      this.skillCooldowns.nano_repair = cfg.cooldownSec;
      if (this.armedSkillId !== null) {
        this.armedSkillId = null;
        this.vfx.setTacticalReticle(false);
      }
      this.progression.incrementCounter('skillsUsed', 1);

      this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + 4);
      this.gold += 75;`,
    `      const nanoTech = this.progression.getComputedTechModifiers();
      this.skillCooldowns.nano_repair = Number(
        (cfg.cooldownSec * nanoTech.skillCooldownScale).toFixed(2)
      );
      if (this.armedSkillId !== null) {
        this.armedSkillId = null;
        this.vfx.setTacticalReticle(false);
      }
      this.progression.incrementCounter('skillsUsed', 1);

      const nanoHeal = Math.max(4, 3 + Math.round(this.maxBeaconHp * 0.14));
      const nanoGold = Math.round((75 + (this.isEndlessMode() ? this.waveIndex * 12 : 0)) * nanoTech.goldBountyMultiplier);
      this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + nanoHeal);
      this.gold += nanoGold;`,
    'GameEngine Nano Repair proportional scaling'
  );

  engSrc = replaceExact(
    engSrc,
    `    this.skillCooldowns.orbital_strike = cfg.cooldownSec;`,
    `    this.skillCooldowns.orbital_strike = Number(
      (cfg.cooldownSec * this.progression.getComputedTechModifiers().skillCooldownScale).toFixed(2)
    );`,
    'GameEngine Orbital Strike cooldown scale'
  );

  engSrc = replaceExact(
    engSrc,
    `        for (const e of [...this.enemies]) {
          if (e.dead || e.hp <= 0) continue;
          const d = Math.hypot(e.worldPos.x - strike.x, e.worldPos.z - strike.z);
          if (d <= radius + (e.isBoss ? 0.8 : 0.25)) {
            e.armorShredStacks = Math.max(e.armorShredStacks ?? 0, 3);
            e.armorShredTimer = Math.max(e.armorShredTimer ?? 0, 6.0);
            if (e.rig.shredBadgeGroup) e.rig.shredBadgeGroup.visible = true;
            e.rig.hpBarGroup.visible = true;

            const stunDur = e.isBoss ? 0.65 : 1.6;
            e.stunTimer = Math.max(e.stunTimer ?? 0, stunDur);
            if (e.isBoss && e.skillTelegraphTimer > 0) {
              e.skillTelegraphTimer = 0;
              this.vfx.setBossTelegraphZone(false);
            }

            this.applyDamageToEnemy(e, e.isBoss ? 220 : 260, 0.85, null);
          }
        }`,
    `        const orbTech = this.progression.getComputedTechModifiers();
        const orbMult = orbTech.damageMultiplier * this.getRunGlobalDamageMultiplier();
        for (const e of [...this.enemies]) {
          if (e.dead || e.hp <= 0) continue;
          const d = Math.hypot(e.worldPos.x - strike.x, e.worldPos.z - strike.z);
          if (d <= radius + (e.isBoss ? 0.8 : 0.25)) {
            e.armorShredStacks = Math.max(e.armorShredStacks ?? 0, 3);
            e.armorShredTimer = Math.max(e.armorShredTimer ?? 0, 6.0);
            if (e.rig.shredBadgeGroup) e.rig.shredBadgeGroup.visible = true;
            e.rig.hpBarGroup.visible = true;

            const stunDur = e.isBoss ? 0.65 : 1.6;
            e.stunTimer = Math.max(e.stunTimer ?? 0, stunDur);
            if (e.isBoss && e.skillTelegraphTimer > 0) {
              e.skillTelegraphTimer = 0;
              this.vfx.setBossTelegraphZone(false);
            }
            const orbDmg = Math.round(
              (e.isBoss ? 240 : 280) * orbMult + e.maxHp * (e.isBoss ? 0.068 : 0.15)
            );
            this.applyDamageToEnemy(e, orbDmg, 0.88, null);
          }
        }`,
    'GameEngine Orbital Strike % MaxHP & tech scaling'
  );

  // Laser gate scaling
  engSrc = replaceExact(
    engSrc,
    `                this.applyDamageToEnemy(e, 11, 0.7, null);`,
    `                const gateDmg = Math.round(
                  11 * this.progression.getComputedTechModifiers().damageMultiplier * this.getRunGlobalDamageMultiplier() +
                    e.maxHp * (e.isBoss ? 0.004 : 0.011)
                );
                this.applyDamageToEnemy(e, gateDmg, 0.75, null);`,
    'GameEngine Laser Gate scaling'
  );

  // Animate 3D overclockHalo in updateTowers + pass overclockLevel into computeTowerStatsForTier!
  engSrc = replaceExact(
    engSrc,
    `    for (const tower of this.towers.values()) {
      const activeBranch = tower.branch ?? 'A';
      const stats = this.computeTowerStatsForTier(
        tower.type,
        tower.tier,
        Boolean(tower.isHighGround),
        activeBranch
      );`,
    `    for (const tower of this.towers.values()) {
      const activeBranch = tower.branch ?? 'A';
      const ocLv = tower.overclockLevel ?? 0;
      const stats = this.computeTowerStatsForTier(
        tower.type,
        tower.tier,
        Boolean(tower.isHighGround),
        activeBranch,
        ocLv
      );
      if (tower.rig.overclockHalo && tower.rig.overclockHalo.visible) {
        tower.rig.overclockHalo.rotation.y += dt * (1.8 + Math.min(4.0, ocLv * 0.25));
        const outer = tower.rig.overclockHalo.children[1];
        if (outer && outer.visible) {
          outer.rotation.z -= dt * 2.6;
        }
      }`,
    'GameEngine updateTowers overclock stats & 3D halo spin'
  );

  // Add Giant-Slayer % MaxHP bonus on Fusion Burn, Railgun Crit & Apex Firepower
  engSrc = replaceExact(
    engSrc,
    `      const tech = this.progression.getComputedTechModifiers();
      const hgDmg = tower?.isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
      const tickDmg = Math.max(8, Math.round(22 * hgDmg * tech.damageMultiplier));`,
    `      const tech = this.progression.getComputedTechModifiers();
      const hgDmg = tower?.isHighGround ? HIGH_GROUND_DAMAGE_MULT : 1.0;
      const ocMult = tower ? Math.pow(1.145, tower.overclockLevel ?? 0) : 1.0;
      const tickDmg = Math.max(
        8,
        Math.round(22 * hgDmg * tech.damageMultiplier * ocMult * this.getRunGlobalDamageMultiplier())
      );`,
    'GameEngine Fusion Mortar burn zone overclock scaling'
  );

  // Apply Apex Giant-Slayer & goldBountyMultiplier in applyDamageToEnemy & checkWaveCompletion
  engSrc = replaceExact(
    engSrc,
    `    const finalDamage = Math.max(2, Math.round(remainingRaw * (1 - effectiveArmor) * vulnMult));`,
    `    const techMods = this.progression.getComputedTechModifiers();
    const giantBonus =
      techMods.maxHpBonusRatio > 0 && sourceTower
        ? Math.round(
            enemy.maxHp *
              techMods.maxHpBonusRatio *
              (enemy.isBoss ? 0.35 : 0.85) *
              (sourceTower.type === 'autocannon' ? 0.42 : 1.0)
          )
        : 0;
    const finalDamage = Math.max(
      2,
      Math.round((remainingRaw + giantBonus) * (1 - effectiveArmor) * vulnMult)
    );`,
    'GameEngine Apex Giant-Slayer bonus damage'
  );

  engSrc = replaceExact(
    engSrc,
    `      this.kills++;
      this.gold += enemy.goldReward;`,
    `      this.kills++;
      this.gold += Math.max(1, Math.round(enemy.goldReward * techMods.goldBountyMultiplier));`,
    'GameEngine enemy kill goldBountyMultiplier'
  );

  engSrc = replaceExact(
    engSrc,
    `    this.waveInProgress = false;
    this.gold += cfg.clearGoldBonus;
    this.crystals += cfg.clearCrystalBonus;
    this.progression.addCrystals(cfg.clearCrystalBonus);`,
    `    this.waveInProgress = false;
    const clearTech = this.progression.getComputedTechModifiers();
    const waveGold =
      this.isEndlessMode() || clearTech.goldBountyMultiplier > 1.001
        ? Math.round(cfg.clearGoldBonus * clearTech.goldBountyMultiplier)
        : cfg.clearGoldBonus;
    const waveCrystals =
      cfg.clearCrystalBonus + (this.isEndlessMode() && cfg.hasBoss ? clearTech.extraBossCrystals : 0);
    this.gold += waveGold;
    this.crystals += waveCrystals;
    this.progression.addCrystals(waveCrystals);`,
    'GameEngine wave clear gold & extra boss crystal scaling'
  );

  // Pass overclockLevel into syncSelectionRings & getSnapshot
  engSrc = replaceExact(
    engSrc,
    `      const stats = this.computeTowerStatsForTier(
        existing.type,
        existing.tier,
        isHG,
        existing.branch ?? 'A'
      );`,
    `      const stats = this.computeTowerStatsForTier(
        existing.type,
        existing.tier,
        isHG,
        existing.branch ?? 'A',
        existing.overclockLevel ?? 0
      );`,
    'GameEngine syncSelectionRings overclock range'
  );

  engSrc = replaceExact(
    engSrc,
    `        const curr = this.computeTowerStatsForTier(tw.type, tw.tier, isHG, activeBr);`,
    `        const ocLv = tw.overclockLevel ?? 0;
        const curr = this.computeTowerStatsForTier(tw.type, tw.tier, isHG, activeBr, ocLv);`,
    'GameEngine getSnapshot curr stats with overclock'
  );

  engSrc = replaceExact(
    engSrc,
    `        const t4BranchCfg = tw.tier === 4 ? bp.branches[activeBr] : null;

        selectedTower = {`,
    `        const t4BranchCfg = tw.tier === 4 ? bp.branches[activeBr] : null;
        const ocNextCost = tw.tier === 4 ? this.computeOverclockStepCost(ocLv) : null;
        const ocNextStats =
          tw.tier === 4 ? this.computeTowerStatsForTier(tw.type, 4, isHG, activeBr, ocLv + 1) : null;
        let maxBulkOc = 0;
        let bulkOcSum = 0;
        if (tw.tier === 4) {
          for (let s = 0; s < 5; s++) {
            const c = this.computeOverclockStepCost(ocLv + s);
            if (this.gold >= bulkOcSum + c) {
              bulkOcSum += c;
              maxBulkOc++;
            } else {
              break;
            }
          }
        }

        selectedTower = {`,
    'GameEngine getSnapshot compute overclock preview & bulk counts'
  );

  engSrc = replaceExact(
    engSrc,
    `          kills: tw.kills,
          totalDamage: tw.totalDamage,
          t4BranchOptions: selectedTowerBranchOptions,`,
    `          kills: tw.kills,
          totalDamage: tw.totalDamage,
          overclockLevel: ocLv,
          overclockCost: ocNextCost,
          nextOverclockDamage: ocNextStats ? ocNextStats.damage : null,
          maxBulkOverclockCount: maxBulkOc,
          bulkOverclockCost: bulkOcSum,
          t4BranchOptions: selectedTowerBranchOptions,`,
    'GameEngine getSnapshot selectedTower overclock props'
  );

  engSrc = replaceExact(
    engSrc,
    `      activeComboCount: this.activeComboCount,`,
    `      activeComboCount: this.activeComboCount,
      runArsenalLevel: this.runArsenalLevel,
      runCrystalProtocolLevel: this.runCrystalProtocolLevel,
      nextArsenalCost: this.getNextArsenalCost(),
      crystalProtocolCost: 5,`,
    'GameEngine getSnapshot supply protocol props'
  );

  fs.writeFileSync(engPath, engSrc, 'utf8');
}

// ============================================================================
// 6. Patch src/ui/UIManager.ts & src/style.css
// ============================================================================
const uiPath = path.join(root, 'src/ui/UIManager.ts');
let uiSrc = fs.readFileSync(uiPath, 'utf8');
if (!uiSrc.includes('APEX_ORDER')) {
  uiSrc = replaceExact(
    uiSrc,
    `import {
  ACHIEVEMENT_CONFIGS,
  TECH_MODULES,
  TECH_ORDER,
} from '../game/ProgressionManager';`,
    `import {
  ACHIEVEMENT_CONFIGS,
  APEX_MODULES,
  APEX_ORDER,
  MAX_CORE_TECH_LEVEL,
  TECH_MODULES,
  TECH_ORDER,
} from '../game/ProgressionManager';`,
    'UIManager imports APEX_MODULES & MAX_CORE_TECH_LEVEL'
  );

  uiSrc = replaceExact(
    uiSrc,
    '  AchievementId,\n  CommanderSkillId,',
    '  AchievementId,\n  ApexTechId,\n  CommanderSkillId,',
    'UIManager import ApexTechId'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    case 'ach_endless_15':
      return \`W\${Math.min(15, prog.bestEndlessWave)}/15\`;
  }`,
    `    case 'ach_endless_15':
      return \`W\${Math.min(15, prog.bestEndlessWave)}/15\`;
    case 'ach_overclock_10':
      return \`+\${Math.min(10, prog.counters.maxOverclockReached ?? 0)}/10\`;
    case 'ach_endless_40':
      return \`W\${Math.min(40, prog.bestEndlessWave)}/40\`;
    case 'ach_endless_70':
      return \`W\${Math.min(70, prog.bestEndlessWave)}/70\`;
  }`,
    'UIManager formatAchievementProgress new cases'
  );

  // Hotkeys 4 and 5 for Arsenal Boost & Crystal Overcharge
  uiSrc = replaceExact(
    uiSrc,
    `    } else if (k === '3' || k === 'e') {
      this.engine.activateCommanderSkill('nano_repair');`,
    `    } else if (k === '3' || k === 'e') {
      this.engine.activateCommanderSkill('nano_repair');
    } else if (k === '4') {
      this.engine.activateArsenalBoost();
    } else if (k === '5') {
      this.engine.activateCrystalOvercharge();`,
    'UIManager hotkeys 4 & 5'
  );

  // Commander dock supply buttons (shown once onboardingStep === 'done', hidden on ultra-narrow xs portrait)
  uiSrc = replaceExact(
    uiSrc,
    `    const mountKey = snap.skills.map((s) => s.id).join('|');`,
    `    const showSupply = snap.onboardingStep === 'done';
    const mountKey = \`\${snap.skills.map((s) => s.id).join('|')}_sup\${showSupply ? 1 : 0}\`;`,
    'UIManager commander dock mountKey with supply'
  );

  uiSrc = replaceExact(
    uiSrc,
    `          <div class="skills-btn-row">
            \${btnsHtml}
          </div>
          <span class="combo-live-pill" id="combo-live-pill" title="跨塔战术连携计数" hidden></span>
        </div>
      \`;

      this.skillsSlotHost.querySelectorAll<HTMLButtonElement>('[data-skill-id]').forEach((btn) => {`,
    `          <div class="skills-btn-row">
            \${btnsHtml}
          </div>
          \${
            showSupply
              ? \`<div class="supply-protocol-pair hide-xs" id="supply-protocol-group">
                  <button class="supply-dock-btn gold-sup" id="btn-supply-gold" type="button" title="战地军工增幅 [4]：消耗工程金币，全军机甲永久 +12% 伤害并触发 4.5s 超载狂飙">
                    <span class="skill-key-hint">4</span>
                    <strong id="lbl-supply-gold">💰军工</strong>
                    <em id="cost-supply-gold">●360</em>
                  </button>
                  <button class="supply-dock-btn crys-sup" id="btn-supply-crystal" type="button" title="晶簇裂变协议 [5]：消耗 5💎 储备能源晶体，全军永久 +15% 伤害 + 满战术能量 + 刷新全部技能冷却 + 修复信标">
                    <span class="skill-key-hint">5</span>
                    <strong id="lbl-supply-crys">💎裂变</strong>
                    <em id="cost-supply-crys">5💎</em>
                  </button>
                </div>\`
              : ''
          }
          <span class="combo-live-pill" id="combo-live-pill" title="跨塔战术连携计数" hidden></span>
        </div>
      \`;

      this.skillsSlotHost
        .querySelector('#btn-supply-gold')
        ?.addEventListener('click', () => this.engine.activateArsenalBoost());
      this.skillsSlotHost
        .querySelector('#btn-supply-crystal')
        ?.addEventListener('click', () => this.engine.activateCrystalOvercharge());

      this.skillsSlotHost.querySelectorAll<HTMLButtonElement>('[data-skill-id]').forEach((btn) => {`,
    'UIManager commander dock supply buttons HTML & listeners'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    const comboPill = this.skillsSlotHost.querySelector<HTMLElement>('#combo-live-pill');`,
    `    const supGoldBtn = this.skillsSlotHost.querySelector<HTMLButtonElement>('#btn-supply-gold');
    if (supGoldBtn) {
      const gCost = snap.nextArsenalCost ?? 360;
      const gLv = snap.runArsenalLevel ?? 0;
      const gAfford = snap.gold >= gCost;
      supGoldBtn.classList.toggle('unready', !gAfford);
      const lbl = supGoldBtn.querySelector('#lbl-supply-gold');
      const cst = supGoldBtn.querySelector('#cost-supply-gold');
      if (lbl) lbl.textContent = gLv > 0 ? \`💰军工+\${gLv}\` : '💰军工';
      if (cst) cst.textContent = \`●\${gCost}\`;
    }

    const supCrysBtn = this.skillsSlotHost.querySelector<HTMLButtonElement>('#btn-supply-crystal');
    if (supCrysBtn) {
      const cCost = snap.crystalProtocolCost ?? 5;
      const cLv = snap.runCrystalProtocolLevel ?? 0;
      const cAfford = snap.persistentCrystals >= cCost;
      supCrysBtn.classList.toggle('unready', !cAfford);
      const lbl = supCrysBtn.querySelector('#lbl-supply-crys');
      if (lbl) lbl.textContent = cLv > 0 ? \`💎裂变+\${cLv}\` : '💎裂变';
    }

    const comboPill = this.skillsSlotHost.querySelector<HTMLElement>('#combo-live-pill');`,
    'UIManager commander dock live supply button state sync'
  );

  // Update T4 Inspector dirty signature & replace static max-tier plaque with Infinite Overclock buttons!
  uiSrc = replaceExact(
    uiSrc,
    `      const sig = \`inspect:\${tw.id}:t\${tw.tier}:br\${tw.branch ?? '0'}:pr\${prioKey}:k\${kCount}:d\${Math.floor(dTotal / 25)}:dmg\${tw.damage}:rng\${tw.range.toFixed(1)}:hg\${Boolean(tw.isHighGround)}:afford\${canAffordUpgrade}:cost\${tw.upgradeCost}:brAf\${brAffordKey}:stun\${tw.isStunned}:od\${Boolean(tw.overdriven)}:au\${Boolean(tw.auraBoosted)}\`;`,
    `      const ocLv = tw.overclockLevel ?? 0;
      const ocCost = tw.overclockCost ?? null;
      const canAffordOc = tw.tier === 4 && ocCost !== null && snap.gold >= ocCost;
      const bulkOcN = tw.maxBulkOverclockCount ?? 0;
      const sig = \`inspect:\${tw.id}:t\${tw.tier}:oc\${ocLv}:br\${tw.branch ?? '0'}:pr\${prioKey}:k\${kCount}:d\${Math.floor(dTotal / 25)}:dmg\${tw.damage}:rng\${tw.range.toFixed(1)}:hg\${Boolean(tw.isHighGround)}:afford\${canAffordUpgrade}:ocAf\${canAffordOc}:ocBulk\${bulkOcN}:cost\${tw.upgradeCost}:brAf\${brAffordKey}:stun\${tw.isStunned}:od\${Boolean(tw.overdriven)}:au\${Boolean(tw.auraBoosted)}\`;`,
    'UIManager inspector dirty signature with overclock'
  );

  uiSrc = replaceExact(
    uiSrc,
    `      } else {
        const resolvedName = tw.branchName || tw.name;
        upgradeActionHtml = \`
          <div class="max-tier-plaque" id="legendary-max-badge">
            ★ \${tw.branch ? \`T4-\${tw.branch} \` : ''}传说专精【\${resolvedName}】已完全解锁
          </div>
        \`;
      }`,
    `      } else {
        const nextOc = ocLv + 1;
        const costVal = ocCost ?? 220;
        const dmgGain = Math.max(1, (tw.nextOverclockDamage ?? tw.damage) - tw.damage);
        const bulkHtml =
          bulkOcN >= 2
            ? \`<button
                class="enamel-overclock-bulk-btn"
                id="btn-overclock-bulk"
                type="button"
                title="一键连续超频 +\${bulkOcN} 级（共消耗 \${tw.bulkOverclockCost ?? 0} 金币）"
              >
                <span>⚡×\${bulkOcN}</span>
                <strong>●\${tw.bulkOverclockCost ?? 0}</strong>
              </button>\`
            : '';
        upgradeActionHtml = \`
          <button
            class="enamel-upgrade-btn overclock-mode \${canAffordOc ? '' : 'locked'}"
            id="btn-upgrade-tower"
            type="button"
            data-affordable="\${canAffordOc ? '1' : '0'}"
            title="无限超频突破 [快捷键 U]：指数级强化伤害，同步提高攻速、射程与护甲穿透"
          >
            <div class="up-btn-top">
              <span id="legendary-max-badge">⚡ 超频突破 +\${nextOc}</span>
              <span class="cost-badge">● \${costVal}</span>
            </div>
            <div class="up-btn-gain">
              伤害 +\${dmgGain} (×1.145) · 攻速/射程/穿甲持续突破
            </div>
          </button>
          \${bulkHtml}
        \`;
      }`,
    'UIManager T4 Infinite Overclock buttons'
  );

  uiSrc = replaceExact(
    uiSrc,
    `              <span class="tier-pill" style="background:\${tw.tierHex}; color:#120d22">\${tw.branch ? \`\${tw.tierName}·\${tw.branch}\` : tw.tierName}</span>`,
    `              <span class="tier-pill" style="background:\${tw.tierHex}; color:#120d22">\${tw.branch ? \`\${tw.tierName}·\${tw.branch}\` : tw.tierName}\${ocLv > 0 ? \` +\${ocLv}\` : ''}</span>`,
    'UIManager tier-pill overclock badge'
  );

  uiSrc = replaceExact(
    uiSrc,
    `      const upBtn = this.trayHost.querySelector('#btn-upgrade-tower');
      if (upBtn) {
        upBtn.addEventListener('click', () => {
          this.engine.upgradeSelectedTower('A');
        });
      }`,
    `      const upBtn = this.trayHost.querySelector('#btn-upgrade-tower');
      if (upBtn) {
        upBtn.addEventListener('click', () => {
          this.engine.upgradeSelectedTower('A');
        });
      }
      const bulkOcBtn = this.trayHost.querySelector('#btn-overclock-bulk');
      if (bulkOcBtn) {
        bulkOcBtn.addEventListener('click', () => {
          this.engine.overclockSelectedTower(5);
        });
      }`,
    'UIManager bind btn-overclock-bulk'
  );

  // Update Hub dirty signature & renderHubTechTab for Lv.8 + Apex Infinite Research
  uiSrc = replaceExact(
    uiSrc,
    `    const techSig = TECH_ORDER.map((tid) => prog.techLevels[tid]).join('');
    const countersSig = \`\${prog.counters.synergyTriggers}_\${prog.counters.skillsUsed}_\${prog.counters.mechanismsUsed}_\${prog.counters.dualBranchCleared ? 1 : 0}\`;
    const hubSig = \`\${this.hubTab}:\${this.codexFilter}:\${this.selectedHubStageId}:\${snap.stageId}:\${prog.totalCrystals}:\${prog.spentCrystals}:\${prog.unlockAllSandbox ? 1 : 0}:\${stagesSig}:\${techSig}:\${countersSig}:\${prog.claimedAchievementIds.length}:\${prog.seenCodexIds.length}\`;

    if (this.lastHubSig === hubSig) return;
    this.lastHubSig = hubSig;

    const hasAffordableTech = TECH_ORDER.some((tid) => progMgr.canUpgradeTech(tid));`,
    `    const techSig = TECH_ORDER.map((tid) => prog.techLevels[tid]).join('');
    const apexSig = APEX_ORDER.map((aid) => prog.apexLevels?.[aid] ?? 0).join('_');
    const countersSig = \`\${prog.counters.synergyTriggers}_\${prog.counters.skillsUsed}_\${prog.counters.mechanismsUsed}_\${prog.counters.dualBranchCleared ? 1 : 0}_\${prog.counters.maxOverclockReached ?? 0}\`;
    const hubSig = \`\${this.hubTab}:\${this.codexFilter}:\${this.selectedHubStageId}:\${snap.stageId}:\${prog.totalCrystals}:\${prog.spentCrystals}:\${prog.unlockAllSandbox ? 1 : 0}:\${stagesSig}:\${techSig}:\${apexSig}:\${countersSig}:\${prog.claimedAchievementIds.length}:\${prog.seenCodexIds.length}\`;

    if (this.lastHubSig === hubSig) return;
    this.lastHubSig = hubSig;

    const hasAffordableTech =
      TECH_ORDER.some((tid) => progMgr.canUpgradeTech(tid)) ||
      APEX_ORDER.some((aid) => progMgr.canUpgradeApex(aid, 1));`,
    'UIManager hubSig & hasAffordableTech with Apex'
  );

  uiSrc = replaceExact(
    uiSrc,
    `  private renderHubTechTab(snap: UISnapshot): string {
    const prog = snap.progression;
    const cards = TECH_ORDER.map((tid) => {
      const mod = TECH_MODULES[tid];
      const lv = prog.techLevels[tid];
      const nextCost = lv === 4 ? null : mod.costs[lv];
      const canAfford = nextCost !== null && prog.totalCrystals >= nextCost;
      const pipsHtml = [0, 1, 2, 3]
        .map((idx) => \`<span class="tech-pip \${idx < lv ? 'lit' : ''}">\${idx < lv ? '▮' : '▯'}</span>\`)
        .join('');
      const transitionText =
        lv < 4
          ? \`<span class="tech-cur-dim">\${mod.levelDescriptions[lv]}</span> <span class="tech-arrow">→</span> <strong>\${mod.levelDescriptions[lv + 1]}</strong>\`
          : \`<strong>\${mod.levelDescriptions[4]}（满级）</strong>\`;

      return \`
        <div class="tech-card">
          <div class="tech-card-head">
            <strong>\${mod.name}</strong>
            <div class="tech-lv-group">
              <span class="tech-pips" aria-label="等级 \${lv}/4">\${pipsHtml}</span>
              <span class="tech-lv-pill">Lv.\${lv}/4</span>
            </div>
          </div>
          <div class="tech-summary">\${mod.summary}</div>
          <div class="tech-cur-effect">\${transitionText}</div>
          \${
            nextCost !== null
              ? \`<button
                  class="enamel-cta-btn tech-up-btn \${canAfford ? 'primary' : 'secondary'}"
                  id="btn-upgrade-tech-\${tid}"
                  data-tech-upgrade="\${tid}"
                  type="button"
                  \${canAfford ? '' : 'disabled'}
                >
                  升级 Lv.\${lv + 1} · 💎 \${nextCost}
                </button>\`
              : \`<div class="tech-max-tag">★ 已满级强化</div>\`
          }
        </div>
      \`;
    }).join('');

    return \`
      <div class="hub-tech-wrap" id="hub-panel-tech">
        <div class="hub-campaign-toolbar">
          <span class="hub-stat-chip">已投入能源晶体 <strong>💎 \${prog.spentCrystals}</strong></span>
          <button
            class="sandbox-unlock-btn"
            id="btn-respec-tech"
            type="button"
            \${prog.spentCrystals > 0 ? '' : 'disabled'}
          >
            ↺ 重置晶簇（100%免费返还）
          </button>
        </div>
        <div class="tech-grid">
          \${cards}
        </div>
      </div>
    \`;
  }`,
    `  private renderHubTechTab(snap: UISnapshot): string {
    const prog = snap.progression;
    const progMgr = this.engine.getProgression();
    const cards = TECH_ORDER.map((tid) => {
      const mod = TECH_MODULES[tid];
      const lv = prog.techLevels[tid];
      const nextCost = lv >= MAX_CORE_TECH_LEVEL ? null : (mod.costs[lv] ?? null);
      const canAfford = nextCost !== null && prog.totalCrystals >= nextCost;
      const pipsHtml = Array.from({ length: MAX_CORE_TECH_LEVEL }, (_, idx) => {
        const litClass = idx < lv ? (idx >= 4 ? 'lit master-pip' : 'lit') : '';
        return \`<span class="tech-pip \${litClass}">\${idx < lv ? '▮' : '▯'}</span>\`;
      }).join('');
      const transitionText =
        lv < MAX_CORE_TECH_LEVEL
          ? \`<span class="tech-cur-dim">\${mod.levelDescriptions[lv]}</span> <span class="tech-arrow">→</span> <strong>\${mod.levelDescriptions[lv + 1]}</strong>\`
          : \`<strong>\${mod.levelDescriptions[MAX_CORE_TECH_LEVEL]}（宗师满级）</strong>\`;

      return \`
        <div class="tech-card \${lv >= 5 ? 'master-tier' : ''}">
          <div class="tech-card-head">
            <strong>\${mod.name}</strong>
            <div class="tech-lv-group">
              <span class="tech-pips" aria-label="等级 \${lv}/\${MAX_CORE_TECH_LEVEL}">\${pipsHtml}</span>
              <span class="tech-lv-pill">\${lv >= 5 ? '★' : ''}Lv.\${lv}/\${MAX_CORE_TECH_LEVEL}</span>
            </div>
          </div>
          <div class="tech-summary">\${mod.summary}</div>
          <div class="tech-cur-effect">\${transitionText}</div>
          \${
            nextCost !== null
              ? \`<button
                  class="enamel-cta-btn tech-up-btn \${canAfford ? 'primary' : 'secondary'}"
                  id="btn-upgrade-tech-\${tid}"
                  data-tech-upgrade="\${tid}"
                  type="button"
                  \${canAfford ? '' : 'disabled'}
                >
                  \${lv >= 4 ? '宗师突破' : '升级'} Lv.\${lv + 1} · 💎 \${nextCost}
                </button>\`
              : \`<div class="tech-max-tag">★ 宗师满级 (Lv.8)</div>\`
          }
        </div>
      \`;
    }).join('');

    const apexCards = APEX_ORDER.map((aid) => {
      const cfg = APEX_MODULES[aid];
      const lv = prog.apexLevels?.[aid] ?? 0;
      const cost1 = progMgr.getApexCost(aid, 1);
      const cost5 = progMgr.getApexCost(aid, 5);
      const afford1 = prog.totalCrystals >= cost1;
      const afford5 = prog.totalCrystals >= cost5;
      return \`
        <div class="tech-card apex-infinite-card" id="apex-card-\${aid}">
          <div class="tech-card-head">
            <strong>\${cfg.name}</strong>
            <span class="apex-lv-badge">♾ Lv.\${lv}</span>
          </div>
          <div class="tech-summary">\${cfg.summary}</div>
          <div class="tech-cur-effect"><strong>\${cfg.formatEffect(lv)}</strong></div>
          <div class="apex-btn-row">
            <button
              class="enamel-cta-btn tech-up-btn \${afford1 ? 'primary' : 'secondary'}"
              id="btn-apex-\${aid}-1"
              data-apex-upgrade="\${aid}"
              data-apex-count="1"
              type="button"
              \${afford1 ? '' : 'disabled'}
            >
              +1 谐振 · 💎 \${cost1}
            </button>
            <button
              class="enamel-cta-btn tech-up-btn apex-bulk-btn \${afford5 ? 'primary' : 'secondary'}"
              id="btn-apex-\${aid}-5"
              data-apex-upgrade="\${aid}"
              data-apex-count="5"
              type="button"
              \${afford5 ? '' : 'disabled'}
            >
              ×5 连升 · 💎 \${cost5}
            </button>
          </div>
        </div>
      \`;
    }).join('');

    return \`
      <div class="hub-tech-wrap" id="hub-panel-tech">
        <div class="hub-campaign-toolbar">
          <span class="hub-stat-chip">已投入能源晶体 <strong>💎 \${prog.spentCrystals}</strong> · 战地快捷键 <strong>[4]军工 [5]裂变</strong></span>
          <button
            class="sandbox-unlock-btn"
            id="btn-respec-tech"
            type="button"
            \${prog.spentCrystals > 0 ? '' : 'disabled'}
          >
            ↺ 重置全部改装与巅峰晶簇（100%返还）
          </button>
        </div>
        <div class="tech-grid">
          \${cards}
        </div>
        <div class="apex-section-divider">
          <span>♾ 终末方舟 · 无限巅峰晶簇协议（无等级上限 · 突破无尽深层防线）</span>
        </div>
        <div class="tech-grid apex-grid">
          \${apexCards}
        </div>
      </div>
    \`;
  }`,
    'UIManager renderHubTechTab Lv.8 + Apex Infinite Grid'
  );

  uiSrc = replaceExact(
    uiSrc,
    `    const respecBtn = this.hubHost.querySelector('#btn-respec-tech');`,
    `    this.hubHost.querySelectorAll<HTMLElement>('[data-apex-upgrade]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const aid = btn.dataset.apexUpgrade as ApexTechId | undefined;
        const cnt = Math.max(1, Number(btn.dataset.apexCount) || 1);
        if (!aid) return;
        const progMgr = this.engine.getProgression();
        const gained = progMgr.upgradeApexTech(aid, cnt);
        if (gained > 0) {
          this.engine.getAudio().playTechUpgrade(Math.min(8, progMgr.getApexLevel(aid)));
          this.lastHubSig = '';
          this.engine.notifyProgressionUpdated();
        }
      });
    });

    const respecBtn = this.hubHost.querySelector('#btn-respec-tech');`,
    'UIManager bind data-apex-upgrade buttons'
  );

  fs.writeFileSync(uiPath, uiSrc, 'utf8');
}

// ============================================================================
// 7. Append V5 Overclock, Supply Dock & Apex Infinite styles to src/style.css
// ============================================================================
const cssPath = path.join(root, 'src/style.css');
let cssSrc = fs.readFileSync(cssPath, 'utf8');
if (!cssSrc.includes('.apex-infinite-card')) {
  cssSrc += `

/* ==================== V5 INFINITE OVERCLOCK, SUPPLY PROTOCOLS & APEX TECH ==================== */
.enamel-upgrade-btn.overclock-mode {
  background: linear-gradient(175deg, #0ea5e9 0%, #6366f1 100%);
  border-color: #1a1033;
  box-shadow: 0 3px 0 #1a1033, 0 0 12px rgba(56, 189, 248, 0.28);
}

.enamel-upgrade-btn.overclock-mode.locked {
  background: linear-gradient(175deg, #334155 0%, #1e293b 100%);
  box-shadow: var(--bevel-btn);
}

.enamel-overclock-bulk-btn {
  padding: 6px 10px;
  border-radius: 12px;
  background: linear-gradient(175deg, #f59e0b 0%, #d97706 100%);
  border: 2.5px solid var(--outline-dark);
  box-shadow: var(--bevel-btn);
  color: #120d22;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-weight: 900;
  cursor: pointer;
  min-width: 68px;
}

.enamel-overclock-bulk-btn span {
  font-size: 12.5px;
}

.enamel-overclock-bulk-btn strong {
  font-size: 11px;
  background: rgba(18, 13, 34, 0.16);
  padding: 1px 6px;
  border-radius: 999px;
}

.supply-protocol-pair {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 5px;
  padding-left: 7px;
  border-left: 1.5px solid rgba(255, 255, 255, 0.14);
}

.supply-dock-btn {
  position: relative;
  flex: 0 0 auto;
  height: 34px;
  padding: 2px 8px 2px 26px;
  border-radius: 10px;
  border: 2px solid #1a1033;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: center;
  line-height: 1.05;
  white-space: nowrap;
  cursor: pointer;
  color: #f8fafc;
}

.supply-dock-btn > .skill-key-hint {
  position: absolute;
  left: 4px;
  top: 50%;
  transform: translateY(-50%);
}

.supply-dock-btn.gold-sup {
  background: linear-gradient(175deg, rgba(217, 119, 6, 0.88), rgba(146, 64, 14, 0.92));
}

.supply-dock-btn.crys-sup {
  background: linear-gradient(175deg, rgba(14, 116, 144, 0.9), rgba(49, 46, 129, 0.92));
}

.supply-dock-btn.unready {
  opacity: 0.5;
  filter: grayscale(0.45);
}

.supply-dock-btn strong {
  font-size: 10.5px;
  font-weight: 900;
}

.supply-dock-btn em {
  font-style: normal;
  font-size: 10px;
  color: #fde047;
  font-weight: 800;
}

@media (max-width: 720px) {
  .supply-dock-btn {
    padding-left: 8px;
  }
}

.tech-pip.master-pip {
  color: #fbbf24;
  text-shadow: 0 0 6px rgba(251, 191, 36, 0.55);
}

.tech-card.master-tier {
  border-color: rgba(251, 191, 36, 0.55);
}

.apex-section-divider {
  margin: 12px 0 8px;
  padding: 6px 12px;
  border-radius: 10px;
  background: linear-gradient(90deg, rgba(14, 116, 144, 0.35), rgba(109, 40, 217, 0.32));
  border: 1.5px solid rgba(56, 189, 248, 0.42);
  font-size: 12px;
  font-weight: 900;
  color: #67e8f9;
  letter-spacing: 0.02em;
}

.tech-card.apex-infinite-card {
  background: linear-gradient(180deg, rgba(22, 32, 58, 0.96), rgba(15, 20, 38, 0.98));
  border-color: rgba(56, 189, 248, 0.5);
}

.apex-lv-badge {
  font-size: 11.5px;
  font-weight: 900;
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(14, 165, 233, 0.22);
  border: 1px solid #38bdf8;
  color: #fde047;
}

.apex-btn-row {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px;
}

.apex-bulk-btn {
  padding-left: 10px !important;
  padding-right: 10px !important;
  white-space: nowrap;
}

@media (max-width: 640px) {
  .supply-protocol-pair.hide-xs {
    display: none;
  }
}
`;
  fs.writeFileSync(cssPath, cssSrc, 'utf8');
}

// ============================================================================
// 8. Update .github/workflows/build-standalone.yml to run upgrade_v5_endgame.mjs
// ============================================================================
const wfPath = path.join(root, '.github/workflows/build-standalone.yml');
if (fs.existsSync(wfPath)) {
  let wfSrc = fs.readFileSync(wfPath, 'utf8');
  if (!wfSrc.includes('upgrade_v5_endgame.mjs') && wfSrc.includes('upgrade_v4_bgm.mjs')) {
    wfSrc = wfSrc.replace(
      'node scripts/upgrade_v4_bgm.mjs',
      'node scripts/upgrade_v4_bgm.mjs\n      - run: node scripts/upgrade_v5_endgame.mjs'
    );
    fs.writeFileSync(wfPath, wfSrc, 'utf8');
  }
}

console.log('[upgrade_v5_endgame] All V5 Endgame Overclock, Supply Protocols, Lv.8 Tech & Infinite Apex Systems applied cleanly!');
