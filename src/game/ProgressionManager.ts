import type {
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
} from '../types';

const SAVE_STORAGE_KEY = 'lunar_beacon_save_v2';
const LEGACY_MUTE_KEY = 'lunar_beacon_td_muted_v2';
const LEGACY_COMMEND_KEY = 'lunar_beacon_commendations_v1';

export const STAGE_SEQUENCE: StageId[] = [
  'stage_01',
  'stage_02',
  'stage_03',
  'stage_04',
  'endless',
];

export const TECH_ORDER: TechUpgradeId[] = [
  'kinetic_core',
  'servo_drive',
  'requisition_pack',
  'beacon_plating',
  'tactical_reactor',
  'flux_resonator',
];

export const MAX_CORE_TECH_LEVEL = 8;

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
      return `总伤 +${pct}% · 巨兽斩杀 +${giant}%最大生命`;
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
      return `金币 +${goldPct}% · 穿甲 +${pierce}% · 首领 +${extraCrys}💎`;
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
      return `耐久 +${hp} · 能量 +${en}⚡ · 冷却 -${cdr}%`;
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
}

interface SafeKVStore {
  readonly persistent: boolean;
  getItem(key: string): string | null;
  setItem(key: string, val: string): void;
}

function createSandboxSafeStore(): SafeKVStore {
  const mem = new Map<string, string>();
  try {
    const ls = window.localStorage;
    const probe = '__lunar_beacon_probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      persistent: true,
      getItem: (k: string) => {
        try {
          return ls.getItem(k) ?? mem.get(k) ?? null;
        } catch {
          return mem.get(k) ?? null;
        }
      },
      setItem: (k: string, v: string) => {
        mem.set(k, v);
        try {
          ls.setItem(k, v);
        } catch {
          // QuotaExceededError or runtime storage restriction: in-memory fallback stays consistent
        }
      },
    };
  } catch {
    return {
      persistent: false,
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => {
        mem.set(k, v);
      },
    };
  }
}

function createDefaultStages(): Record<StageId, StageSaveEntry> {
  return {
    stage_01: { unlocked: true, cleared: false, bestStars: 0, bestWave: 0 },
    stage_02: { unlocked: false, cleared: false, bestStars: 0, bestWave: 0 },
    stage_03: { unlocked: false, cleared: false, bestStars: 0, bestWave: 0 },
    stage_04: { unlocked: false, cleared: false, bestStars: 0, bestWave: 0 },
    endless: { unlocked: false, cleared: false, bestStars: 0, bestWave: 0 },
  };
}

function createDefaultTechLevels(): Record<TechUpgradeId, TechLevel> {
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
}

export class ProgressionManager {
  private store: SafeKVStore;
  private data: CampaignSaveDataV2;

  constructor() {
    this.store = createSandboxSafeStore();
    this.data = this.loadOrMigrate();
  }

  public isPersistentStorageAvailable(): boolean {
    return this.store.persistent;
  }

  private loadOrMigrate(): CampaignSaveDataV2 {
    const raw = this.store.getItem(SAVE_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<CampaignSaveDataV2>;
        if (parsed && parsed.version === 2) {
          const stages = createDefaultStages();
          if (parsed.stages) {
            for (const sid of STAGE_SEQUENCE) {
              const s = parsed.stages[sid];
              if (s) {
                stages[sid] = {
                  unlocked: sid === 'stage_01' ? true : Boolean(s.unlocked),
                  cleared: Boolean(s.cleared),
                  bestStars: (Math.max(0, Math.min(3, Number(s.bestStars) || 0)) as 0 | 1 | 2 | 3),
                  bestWave: Math.max(0, Math.floor(Number(s.bestWave) || 0)),
                };
              }
            }
          }
          const techLevels = createDefaultTechLevels();
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
          }
            const loadedSeen = Array.isArray(parsed.seenCodexIds)
              ? parsed.seenCodexIds.map(String)
              : [];
            if (!loadedSeen.includes('high_ground')) {
              loadedSeen.push('high_ground');
            }
            return {
              version: 2,
              totalCrystals: Math.max(0, Math.floor(Number(parsed.totalCrystals) || 0)),
              spentCrystals: Math.max(0, Math.floor(Number(parsed.spentCrystals) || 0)),
              totalCommendations: Math.max(0, Math.floor(Number(parsed.totalCommendations) || 0)),
              muted: Boolean(parsed.muted),
              unlockAllSandbox: Boolean(parsed.unlockAllSandbox),
              activeStageId:
                parsed.activeStageId && STAGE_SEQUENCE.includes(parsed.activeStageId)
                  ? parsed.activeStageId
                  : 'stage_01',
              stages,
              techLevels,
              apexLevels,
              seenCodexIds: loadedSeen,
            counters: {
              synergyTriggers: Math.max(0, Number(parsed.counters?.synergyTriggers) || 0),
              skillsUsed: Math.max(0, Number(parsed.counters?.skillsUsed) || 0),
              mechanismsUsed: Math.max(0, Number(parsed.counters?.mechanismsUsed) || 0),
              dualBranchCleared: Boolean(parsed.counters?.dualBranchCleared),
              maxOverclockReached: Math.max(0, Math.floor(Number(parsed.counters?.maxOverclockReached) || 0)),
            },
            claimedAchievementIds: Array.isArray(parsed.claimedAchievementIds)
              ? parsed.claimedAchievementIds.map(String)
              : [],
          };
        }
      } catch {
        // Fall through to clean migration
      }
    }

    // Legacy v1 migration
    const legacyMuted = this.store.getItem(LEGACY_MUTE_KEY) === '1';
    const legacyCommend = Math.max(
      0,
      Math.floor(Number(this.store.getItem(LEGACY_COMMEND_KEY) || '0') || 0)
    );
    const stages = createDefaultStages();
    if (legacyCommend > 0) {
      stages.stage_01.cleared = true;
      stages.stage_01.bestStars = 2;
      stages.stage_01.bestWave = 8;
      stages.stage_02.unlocked = true;
    }

    const migrated: CampaignSaveDataV2 = {
      version: 2,
      totalCrystals: legacyCommend * 8,
      spentCrystals: 0,
      totalCommendations: legacyCommend,
      muted: legacyMuted,
      unlockAllSandbox: false,
      activeStageId: 'stage_01',
      stages,
      techLevels: createDefaultTechLevels(),
      apexLevels: createDefaultApexLevels(),
      seenCodexIds: ['autocannon', 'mortar', 'magnetic', 'rover', 'swarm', 'drill', 'high_ground'],
      counters: {
        synergyTriggers: 0,
        skillsUsed: 0,
        mechanismsUsed: 0,
        dualBranchCleared: false,
        maxOverclockReached: 0,
      },
      claimedAchievementIds: [],
    };
    this.persist(migrated);
    return migrated;
  }

  private persist(target: CampaignSaveDataV2 = this.data): void {
    this.store.setItem(SAVE_STORAGE_KEY, JSON.stringify(target));
  }

  public isMuted(): boolean {
    return this.data.muted;
  }

  public setMuted(muted: boolean): void {
    this.data.muted = muted;
    this.store.setItem(LEGACY_MUTE_KEY, muted ? '1' : '0');
    this.persist();
  }

  public getTotalCrystals(): number {
    return this.data.totalCrystals;
  }

  public getSpentCrystals(): number {
    return this.data.spentCrystals;
  }

  public getTotalCommendations(): number {
    return this.data.totalCommendations;
  }

  public addCrystals(amount: number): void {
    if (amount <= 0) return;
    this.data.totalCrystals += Math.floor(amount);
    this.persist();
  }

  public isUnlockAllSandbox(): boolean {
    return this.data.unlockAllSandbox;
  }

  public setUnlockAllSandbox(enabled: boolean): void {
    this.data.unlockAllSandbox = enabled;
    this.persist();
  }

  public isStageUnlocked(stageId: StageId): boolean {
    if (stageId === 'stage_01' || this.data.unlockAllSandbox) return true;
    return this.data.stages[stageId]?.unlocked ?? false;
  }

  public setActiveStageId(stageId: StageId): void {
    this.data.activeStageId = stageId;
    this.persist();
  }

  public getActiveStageId(): StageId {
    return this.data.activeStageId;
  }

  public static computeStars(beaconHp: number, maxBeaconHp: number): 1 | 2 | 3 {
    if (maxBeaconHp <= 0) return 1;
    const ratio = beaconHp / maxBeaconHp;
    if (beaconHp >= maxBeaconHp || ratio >= 0.999) return 3;
    if (ratio >= 0.6) return 2;
    return 1;
  }

  public getTotalStars(): number {
    return (
      this.data.stages.stage_01.bestStars +
      this.data.stages.stage_02.bestStars +
      this.data.stages.stage_03.bestStars +
      this.data.stages.stage_04.bestStars
    );
  }

  public getBestEndlessWave(): number {
    return this.data.stages.endless.bestWave;
  }

  public recordWaveReached(stageId: StageId, waveNumber: number): void {
    const entry = this.data.stages[stageId];
    if (!entry) return;
    if (waveNumber > entry.bestWave) {
      entry.bestWave = waveNumber;
      this.persist();
    }
  }

  public recordStageVictory(
    stageId: StageId,
    beaconHp: number,
    maxBeaconHp: number,
    waveReached: number,
    firstClearBonus: number,
    perStarBonus: number
  ): {
    stars: 1 | 2 | 3;
    firstClearCrystals: number;
    newStarCrystals: number;
    totalBonusCrystals: number;
  } {
    const stars = ProgressionManager.computeStars(beaconHp, maxBeaconHp);
    const entry = this.data.stages[stageId];

    let firstClearCrystals = 0;
    if (!entry.cleared) {
      entry.cleared = true;
      firstClearCrystals = firstClearBonus;
    }

    const prevStars = entry.bestStars;
    const starDelta = Math.max(0, stars - prevStars);
    const newStarCrystals = starDelta * perStarBonus;
    if (stars > entry.bestStars) {
      entry.bestStars = stars;
    }
    if (waveReached > entry.bestWave) {
      entry.bestWave = waveReached;
    }

    // Unlock the next stage in campaign progression
    const idx = STAGE_SEQUENCE.indexOf(stageId);
    if (idx >= 0 && idx + 1 < STAGE_SEQUENCE.length) {
      const nextStage = STAGE_SEQUENCE[idx + 1];
      this.data.stages[nextStage].unlocked = true;
    }

    this.data.totalCommendations += 1;
    this.store.setItem(LEGACY_COMMEND_KEY, String(this.data.totalCommendations));

    const totalBonusCrystals = firstClearCrystals + newStarCrystals;
    if (totalBonusCrystals > 0) {
      this.data.totalCrystals += totalBonusCrystals;
    }
    this.persist();

    return {
      stars,
      firstClearCrystals,
      newStarCrystals,
      totalBonusCrystals,
    };
  }

  // ==================== ENGINEER TECH TREE ====================

  public getTechLevel(id: TechUpgradeId): TechLevel {
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
  }

  // ==================== CODEX & COMMENDATION ACHIEVEMENTS ====================

  public discoverCodex(id: string): void {
    if (!this.data.seenCodexIds.includes(id)) {
      this.data.seenCodexIds.push(id);
      this.persist();
    }
  }

  public incrementCounter(
    key: 'synergyTriggers' | 'skillsUsed' | 'mechanismsUsed',
    delta = 1
  ): void {
    this.data.counters[key] += delta;
    this.persist();
  }

  public markDualBranchCleared(): void {
    if (!this.data.counters.dualBranchCleared) {
      this.data.counters.dualBranchCleared = true;
      this.persist();
    }
  }

  public isAchievementUnlocked(id: AchievementId): boolean {
    const s = this.data.stages;
    switch (id) {
      case 'ach_ch1_clear':
        return s.stage_01.cleared;
      case 'ach_flawless_3star':
        return (
          s.stage_01.bestStars >= 3 ||
          s.stage_02.bestStars >= 3 ||
          s.stage_03.bestStars >= 3 ||
          s.stage_04.bestStars >= 3
        );
      case 'ach_dual_t4':
        return this.data.counters.dualBranchCleared;
      case 'ach_synergy_25':
        return this.data.counters.synergyTriggers >= 25;
      case 'ach_skill_12':
        return this.data.counters.skillsUsed >= 12;
      case 'ach_mech_15':
        return this.data.counters.mechanismsUsed >= 15;
      case 'ach_all_sectors':
        return (
          s.stage_01.cleared &&
          s.stage_02.cleared &&
          s.stage_03.cleared &&
          s.stage_04.cleared
        );
      case 'ach_10_stars':
        return this.getTotalStars() >= 10;
      case 'ach_endless_15':
        return s.endless.bestWave >= 15;
      case 'ach_overclock_10':
        return (this.data.counters.maxOverclockReached ?? 0) >= 10;
      case 'ach_endless_40':
        return s.endless.bestWave >= 40;
      case 'ach_endless_70':
        return s.endless.bestWave >= 70;
    }
  }

  public isAchievementClaimed(id: AchievementId): boolean {
    return this.data.claimedAchievementIds.includes(id);
  }

  public claimAchievement(id: AchievementId): number {
    if (!this.isAchievementUnlocked(id) || this.isAchievementClaimed(id)) {
      return 0;
    }
    const cfg = ACHIEVEMENT_CONFIGS.find((a) => a.id === id);
    if (!cfg) return 0;
    this.data.claimedAchievementIds.push(id);
    this.data.totalCrystals += cfg.rewardCrystals;
    this.persist();
    return cfg.rewardCrystals;
  }

  public hasHubAlert(): boolean {
    for (const tid of TECH_ORDER) {
      if (this.canUpgradeTech(tid)) return true;
    }
    for (const aid of APEX_ORDER) {
      if (this.canUpgradeApex(aid, 1)) return true;
    }
    for (const ach of ACHIEVEMENT_CONFIGS) {
      if (this.isAchievementUnlocked(ach.id) && !this.isAchievementClaimed(ach.id)) {
        return true;
      }
    }
    return false;
  }

  public getSnapshot(): ProgressionSnapshot {
    return {
      totalCrystals: this.data.totalCrystals,
      spentCrystals: this.data.spentCrystals,
      totalStars: this.getTotalStars(),
      bestEndlessWave: this.getBestEndlessWave(),
      unlockAllSandbox: this.data.unlockAllSandbox,
      stages: {
        stage_01: { ...this.data.stages.stage_01 },
        stage_02: { ...this.data.stages.stage_02 },
        stage_03: { ...this.data.stages.stage_03 },
        stage_04: { ...this.data.stages.stage_04 },
        endless: { ...this.data.stages.endless },
      },
      techLevels: { ...this.data.techLevels },
      apexLevels: { ...(this.data.apexLevels ?? createDefaultApexLevels()) },
      seenCodexIds: [...this.data.seenCodexIds],
      claimedAchievementIds: [...this.data.claimedAchievementIds],
      counters: { ...this.data.counters },
    };
  }
}
