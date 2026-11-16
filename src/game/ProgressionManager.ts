import type {
  AchievementConfig,
  AchievementId,
  CampaignSaveDataV2,
  ProgressionSnapshot,
  StageId,
  StageSaveEntry,
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

export const TECH_MODULES: Record<TechUpgradeId, TechModuleConfig> = {
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

function createDefaultTechLevels(): Record<TechUpgradeId, 0 | 1 | 2 | 3 | 4> {
  return {
    kinetic_core: 0,
    servo_drive: 0,
    requisition_pack: 0,
    beacon_plating: 0,
    tactical_reactor: 0,
    flux_resonator: 0,
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
              const lv = Math.max(0, Math.min(4, Math.floor(Number(parsed.techLevels[tid]) || 0))) as
                | 0
                | 1
                | 2
                | 3
                | 4;
              techLevels[tid] = lv;
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
              seenCodexIds: loadedSeen,
            counters: {
              synergyTriggers: Math.max(0, Number(parsed.counters?.synergyTriggers) || 0),
              skillsUsed: Math.max(0, Number(parsed.counters?.skillsUsed) || 0),
              mechanismsUsed: Math.max(0, Number(parsed.counters?.mechanismsUsed) || 0),
              dualBranchCleared: Boolean(parsed.counters?.dualBranchCleared),
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
      seenCodexIds: ['autocannon', 'mortar', 'magnetic', 'rover', 'swarm', 'drill', 'high_ground'],
      counters: {
        synergyTriggers: 0,
        skillsUsed: 0,
        mechanismsUsed: 0,
        dualBranchCleared: false,
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

  public getTechLevel(id: TechUpgradeId): 0 | 1 | 2 | 3 | 4 {
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
      seenCodexIds: [...this.data.seenCodexIds],
      claimedAchievementIds: [...this.data.claimedAchievementIds],
      counters: { ...this.data.counters },
    };
  }
}
