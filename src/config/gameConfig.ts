import type {
  BuildPadConfig,
  CommanderSkillConfig,
  CommanderSkillId,
  CompiledLane,
  EnemyBlueprint,
  EnemyCodexMetaEntry,
  EnemyType,
  MechanismCodexEntry,
  PathSample,
  TierMeta,
  TowerBlueprint,
  TowerSynergyCodexEntry,
  TowerTier,
  TowerType,
  Vec3Like,
  WaveConfig,
} from '../types';

export const GAME_CONSTANTS = {
  INITIAL_GOLD: 260,
  INITIAL_CRYSTALS: 0,
  MAX_BEACON_HP: 20,
  SELL_REFUND_RATIO: 0.75,
  TOTAL_WAVES: 8,
  OUTLINE_HEX: 0x1a1033,
  PAD_HOP_INTERVAL: 4.2,
  VICTORY_CHEST_GOLD: 320,
  VICTORY_CHEST_CRYSTALS: 8,
} as const;

export const TIER_META: Record<TowerTier, TierMeta> = {
  1: {
    tier: 1,
    name: '临时装配',
    shortTag: 'T1 · 临时装配',
    hex: '#2ECC71',
    color: 0x2ecc71,
    rimColor: 0x4ade80,
    bgGlowHex: 'rgba(46, 204, 113, 0.25)',
  },
  2: {
    tier: 2,
    name: '标准战备',
    shortTag: 'T2 · 标准战备',
    hex: '#3B82F6',
    color: 0x3b82f6,
    rimColor: 0x60a5fa,
    bgGlowHex: 'rgba(59, 130, 246, 0.28)',
  },
  3: {
    tier: 3,
    name: '精英模块',
    shortTag: 'T3 · 精英模块',
    hex: '#A855F7',
    color: 0xa855f7,
    rimColor: 0xc084fc,
    bgGlowHex: 'rgba(168, 85, 247, 0.30)',
  },
  4: {
    tier: 4,
    name: '传说机甲',
    shortTag: 'T4 · 传说机甲',
    hex: '#F59E0B',
    color: 0xf59e0b,
    rimColor: 0xffd166,
    bgGlowHex: 'rgba(245, 158, 11, 0.38)',
  },
};

/**
 * Lunar Mining Station Haulage Road:
 * Enters from North-West Mine Shaft (-12.8, -3.2) -> sweeps across central excavation bay ->
 * reaches South-East Return Beacon Plaza (12.2, 2.2).
 */
export const RAW_ROAD_WAYPOINTS: Vec3Like[] = [
  { x: -13.0, y: 0, z: -3.2 },
  { x: -6.8, y: 0, z: -3.2 },
  { x: -6.8, y: 0, z: 3.6 },
  { x: -0.2, y: 0, z: 3.6 },
  { x: -0.2, y: 0, z: -3.6 },
  { x: 6.4, y: 0, z: -3.6 },
  { x: 6.4, y: 0, z: 2.4 },
  { x: 11.8, y: 0, z: 2.4 },
];

export function buildFilletedRoadSamples(waypoints: Vec3Like[], cornerRadius = 1.45): PathSample[] {
  const dense: Vec3Like[] = [];
  const pushUnique = (pt: Vec3Like) => {
    const prev = dense[dense.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.z - prev.z) > 0.02) {
      dense.push(pt);
    }
  };

  pushUnique(waypoints[0]);

  for (let i = 1; i < waypoints.length - 1; i++) {
    const prev = waypoints[i - 1];
    const curr = waypoints[i];
    const next = waypoints[i + 1];

    const v1x = prev.x - curr.x;
    const v1z = prev.z - curr.z;
    const len1 = Math.hypot(v1x, v1z);

    const v2x = next.x - curr.x;
    const v2z = next.z - curr.z;
    const len2 = Math.hypot(v2x, v2z);

    const r = Math.min(cornerRadius, len1 * 0.4, len2 * 0.4);
    const entry = { x: curr.x + (v1x / len1) * r, y: 0, z: curr.z + (v1z / len1) * r };
    const exit = { x: curr.x + (v2x / len2) * r, y: 0, z: curr.z + (v2z / len2) * r };

    const segStart = dense[dense.length - 1];
    const segLen = Math.hypot(entry.x - segStart.x, entry.z - segStart.z);
    const steps = Math.max(2, Math.ceil(segLen / 0.24));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      pushUnique({
        x: segStart.x + (entry.x - segStart.x) * t,
        y: 0,
        z: segStart.z + (entry.z - segStart.z) * t,
      });
    }

    const arcSteps = 14;
    for (let s = 1; s <= arcSteps; s++) {
      const t = s / arcSteps;
      const omt = 1 - t;
      pushUnique({
        x: omt * omt * entry.x + 2 * omt * t * curr.x + t * t * exit.x,
        y: 0,
        z: omt * omt * entry.z + 2 * omt * t * curr.z + t * t * exit.z,
      });
    }
  }

  const last = dense[dense.length - 1];
  const end = waypoints[waypoints.length - 1];
  const endLen = Math.hypot(end.x - last.x, end.z - last.z);
  const endSteps = Math.max(2, Math.ceil(endLen / 0.24));
  for (let s = 1; s <= endSteps; s++) {
    const t = s / endSteps;
    pushUnique({
      x: last.x + (end.x - last.x) * t,
      y: 0,
      z: last.z + (end.z - last.z) * t,
    });
  }

  const samples: PathSample[] = [];
  let acc = 0;
  for (let i = 0; i < dense.length; i++) {
    if (i > 0) {
      acc += Math.hypot(dense[i].x - dense[i - 1].x, dense[i].z - dense[i - 1].z);
    }
    const p0 = dense[Math.max(0, i - 1)];
    const p1 = dense[Math.min(dense.length - 1, i + 1)];
    const dx = p1.x - p0.x;
    const dz = p1.z - p0.z;
    const dLen = Math.hypot(dx, dz) || 1;
    samples.push({
      x: dense[i].x,
      y: 0,
      z: dense[i].z,
      tx: dx / dLen,
      tz: dz / dLen,
      dist: acc,
    });
  }
  return samples;
}

export const ROAD_SAMPLES: PathSample[] = buildFilletedRoadSamples(RAW_ROAD_WAYPOINTS, 1.42);
export const TOTAL_ROAD_LENGTH: number = ROAD_SAMPLES[ROAD_SAMPLES.length - 1].dist;

export function compileStageLanes(lanes: Vec3Like[][], cornerRadius = 1.42): CompiledLane[] {
  return lanes.map((waypoints, index) => {
    const samples = buildFilletedRoadSamples(waypoints, cornerRadius);
    const totalLength = samples.length > 0 ? samples[samples.length - 1].dist : 0;
    return { index, samples, totalLength };
  });
}

export function sampleLaneAtDistance(lane: CompiledLane, dist: number): PathSample {
  const { samples, totalLength } = lane;
  if (dist <= 0) return samples[0];
  if (dist >= totalLength) return samples[samples.length - 1];

  let lo = 0;
  let hi = samples.length - 1;
  while (lo + 1 < hi) {
    const mid = (lo + hi) >> 1;
    if (samples[mid].dist <= dist) lo = mid;
    else hi = mid;
  }
  const a = samples[lo];
  const b = samples[hi];
  const span = Math.max(0.0001, b.dist - a.dist);
  const t = (dist - a.dist) / span;
  const tx = a.tx + (b.tx - a.tx) * t;
  const tz = a.tz + (b.tz - a.tz) * t;
  const tLen = Math.hypot(tx, tz) || 1;

  return {
    x: a.x + (b.x - a.x) * t,
    y: 0,
    z: a.z + (b.z - a.z) * t,
    tx: tx / tLen,
    tz: tz / tLen,
    dist,
  };
}

export function sampleRoadAtDistance(dist: number): PathSample {
  return sampleLaneAtDistance(
    { index: 0, samples: ROAD_SAMPLES, totalLength: TOTAL_ROAD_LENGTH },
    dist
  );
}

/**
 * 10 Fixed Industrial Build Pads placed cleanly beside bends & straightaways,
 * with >= 2.9m clearance from road centerline so towers NEVER block or obscure enemies.
 * Includes 2 elevated High-Ground Boost Bastions (pad_03 & pad_06: +18% range, +15% DMG).
 */
export const BUILD_PADS: BuildPadConfig[] = [
  { id: 'pad_01', label: '1号检修基座', x: -9.8, y: 0, z: -0.2, padType: 'standard' },
  { id: 'pad_02', label: '2号前哨基座', x: -4.0, y: 0, z: -5.8, padType: 'standard' },
  { id: 'pad_03', label: '3号西湾高地台', x: -3.5, y: 0.68, z: 0.4, padType: 'high_ground' },
  { id: 'pad_04', label: '4号南廊外座', x: -6.8, y: 0, z: 6.5, padType: 'standard' },
  { id: 'pad_05', label: '5号南湾主座', x: -0.2, y: 0, z: 6.5, padType: 'standard' },
  { id: 'pad_06', label: '6号中枢高地台', x: 3.1, y: 0.68, z: -0.4, padType: 'high_ground' },
  { id: 'pad_07', label: '7号北脊基座', x: 3.1, y: 0, z: -6.5, padType: 'standard' },
  { id: 'pad_08', label: '8号东折内座', x: 9.3, y: 0, z: -0.8, padType: 'standard' },
  { id: 'pad_09', label: '9号信标南卫', x: 6.4, y: 0, z: 5.4, padType: 'standard' },
  { id: 'pad_10', label: '10号信标近卫', x: 10.2, y: 0, z: 5.4, padType: 'standard' },
];

export const TOWER_ORDER: TowerType[] = ['autocannon', 'mortar', 'magnetic'];

export const TOWER_BLUEPRINTS: Record<TowerType, TowerBlueprint> = {
  autocannon: {
    id: 'autocannon',
    name: '联装机炮',
    code: 'AC-01',
    roleSummary: '高频单体 · 克制巡检机与蜂群',
    weaponColorHex: '#FF9F1C',
    weaponColor: 0xff9f1c,
    tiers: [
      {
        tier: 1,
        cost: 90,
        damage: 16,
        fireInterval: 0.34,
        range: 5.4,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.05,
        partHeadline: '单层检修底座 + 临时双联短管机炮',
        upgradeNote: '高速交替点射，适合封锁蜂群与轻型敌机',
      },
      {
        tier: 2,
        cost: 110,
        damage: 26,
        fireInterval: 0.29,
        range: 5.8,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.12,
        partHeadline: '液压四角加固支撑 + 装甲炮塔罩',
        upgradeNote: '射速与单发动能显著提升',
      },
      {
        tier: 3,
        cost: 165,
        damage: 41,
        fireInterval: 0.24,
        range: 6.2,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.22,
        partHeadline: '双侧大容量弹鼓 + 顶部开合散热鳍片',
        upgradeNote: '穿甲弹芯撕裂中重型壳体',
      },
      {
        tier: 4,
        cost: 240,
        damage: 52,
        fireInterval: 0.18,
        range: 6.6,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.34,
        partHeadline: '双联三管旋转火神炮 + 重装肩甲散热翼',
        upgradeNote: '传说级火神机甲，旋管预热狂飙并叠至4层破甲裂隙',
      },
    ],
    branches: {
      A: {
        tier: 4,
        branch: 'A',
        name: '暴风火神机甲',
        shortTitle: '暴风火神',
        mechanicTag: '旋管狂飙 · 4层破甲',
        accentHex: '#FF9F1C',
        cost: 240,
        damage: 52,
        fireInterval: 0.18,
        range: 6.6,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.34,
        partHeadline: '双联三管旋转火神炮 + 重装肩甲散热翼',
        upgradeNote: '持续开火叠至+28%极速射速，并将破甲裂隙上限提升至4层(-32%护甲)',
      },
      B: {
        tier: 4,
        branch: 'B',
        name: '双联电磁轨炮',
        shortTitle: '电磁轨炮',
        mechanicTag: '超距贯通 · 弱点必暴',
        accentHex: '#38BDF8',
        cost: 255,
        damage: 158,
        fireInterval: 0.62,
        range: 8.6,
        splashRadius: 0,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.68,
        partHeadline: '加长双轨高斯导轨 + 背部电容散热翼',
        upgradeNote: '超远距高穿甲轨道狙击，对磁化/精英/Boss必触发1.55x弱点暴击并贯通后方目标',
      },
    },
  },

  mortar: {
    id: 'mortar',
    name: '脉冲迫击炮',
    code: 'PM-02',
    roleSummary: '抛物线群伤 · 克制密集敌群与重甲',
    weaponColorHex: '#22D3EE',
    weaponColor: 0x22d3ee,
    tiers: [
      {
        tier: 1,
        cost: 120,
        damage: 46,
        fireInterval: 1.75,
        range: 6.4,
        splashRadius: 2.05,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.35,
        partHeadline: '单层底座 + 粗口径工程臼炮与外露储能瓶',
        upgradeNote: '高抛脉冲榴弹，范围震击重甲钻探机',
      },
      {
        tier: 2,
        cost: 140,
        damage: 76,
        fireInterval: 1.58,
        range: 6.9,
        splashRadius: 2.35,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.45,
        partHeadline: '重型驻地支撑臂 + 加厚磁约束炮箍',
        upgradeNote: '冲击半径与破甲震荡力提升',
      },
      {
        tier: 3,
        cost: 200,
        damage: 122,
        fireInterval: 1.42,
        range: 7.4,
        splashRadius: 2.65,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.58,
        partHeadline: '双联侧翼脉冲电容仓 + 光学测距摇臂',
        upgradeNote: '大范围高能电浆震波横扫成群重甲',
      },
      {
        tier: 4,
        cost: 290,
        damage: 210,
        fireInterval: 1.32,
        range: 8.2,
        splashRadius: 3.25,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.74,
        partHeadline: '重炮胸甲 + 聚变磁约束三环炮罩',
        upgradeNote: '传说级天穹聚变巨炮，落点残留3秒高温电浆火海持续融甲',
      },
    ],
    branches: {
      A: {
        tier: 4,
        branch: 'A',
        name: '天穹聚变巨炮',
        shortTitle: '天穹聚变',
        mechanicTag: '3秒电浆火海 · 融甲',
        accentHex: '#06B6D4',
        cost: 290,
        damage: 210,
        fireInterval: 1.32,
        range: 8.2,
        splashRadius: 3.25,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.74,
        partHeadline: '重炮胸甲 + 聚变磁约束三环炮罩',
        upgradeNote: '超重型聚变炮弹轰击并在落点生成3秒电浆火海，持续灼烧融解重甲集群',
      },
      B: {
        tier: 4,
        branch: 'B',
        name: '集束火箭弹巢',
        shortTitle: '集束火箭',
        mechanicTag: '3连齐射 · 三重引爆',
        accentHex: '#FB923C',
        cost: 285,
        damage: 86,
        fireInterval: 1.38,
        range: 8.0,
        splashRadius: 2.15,
        slowRatio: 0,
        slowDuration: 0,
        armorPierce: 0.58,
        partHeadline: '双肩六联装火箭弹巢 + 顶部雷达罩',
        upgradeNote: '每轮齐射3枚集束火箭覆盖路径，可连续3次触发⚡磁暴共振连锁引爆',
      },
    },
  },

  magnetic: {
    id: 'magnetic',
    name: '磁场约束塔',
    code: 'MR-03',
    roleSummary: '范围减速控场 · 压制高速蜂群',
    weaponColorHex: '#C084FC',
    weaponColor: 0xc084fc,
    tiers: [
      {
        tier: 1,
        cost: 100,
        damage: 14,
        fireInterval: 1.35,
        range: 5.1,
        splashRadius: 0,
        slowRatio: 0.32,
        slowDuration: 2.5,
        armorPierce: 0.25,
        partHeadline: '单层底座 + 直立支架与单层旋转磁环',
        upgradeNote: '周期释放紫色约束场，令范围内敌机减速32%',
      },
      {
        tier: 2,
        cost: 115,
        damage: 24,
        fireInterval: 1.22,
        range: 5.5,
        splashRadius: 0,
        slowRatio: 0.41,
        slowDuration: 2.8,
        armorPierce: 0.35,
        partHeadline: '三角锚定支撑脚 + 加固线圈导轨',
        upgradeNote: '减速提升至41%，延长敌机在火力区停留时间',
      },
      {
        tier: 3,
        cost: 165,
        damage: 38,
        fireInterval: 1.08,
        range: 6.0,
        splashRadius: 0,
        slowRatio: 0.5,
        slowDuration: 3.1,
        armorPierce: 0.45,
        partHeadline: '双层反向旋转磁环 + 三向磁通增幅柱',
        upgradeNote: '强力50%减速力场，彻底锁死高速运输蜂群',
      },
      {
        tier: 4,
        cost: 245,
        damage: 68,
        fireInterval: 0.95,
        range: 6.7,
        splashRadius: 0,
        slowRatio: 0.6,
        slowDuration: 3.6,
        armorPierce: 0.62,
        partHeadline: '悬浮奇点球核 + 三轴金色陀螺磁环',
        upgradeNote: '传说级奇点引力中枢，60%深层迟滞并每3次脉冲沿路径强行回拽敌群',
      },
    ],
    branches: {
      A: {
        tier: 4,
        branch: 'A',
        name: '奇点引力中枢',
        shortTitle: '奇点引力',
        mechanicTag: '60%迟滞 · 周期回拽',
        accentHex: '#A855F7',
        cost: 245,
        damage: 68,
        fireInterval: 0.95,
        range: 6.7,
        splashRadius: 0,
        slowRatio: 0.6,
        slowDuration: 3.6,
        armorPierce: 0.62,
        partHeadline: '悬浮奇点球核 + 三轴金色陀螺磁环',
        upgradeNote: '施加60%极限引力迟滞，且每第3次脉冲触发奇点坍缩将范围内敌机沿轨道向后拖拽',
      },
      B: {
        tier: 4,
        branch: 'B',
        name: '高压电弧矩阵',
        shortTitle: '高压电弧',
        mechanicTag: '5目标破盾 · 邻塔加速',
        accentHex: '#38BDF8',
        cost: 250,
        damage: 82,
        fireInterval: 0.86,
        range: 6.5,
        splashRadius: 0,
        slowRatio: 0.45,
        slowDuration: 3.0,
        armorPierce: 0.7,
        partHeadline: '三柱高压特斯拉电弧塔 + 顶部导流环',
        upgradeNote: '为7m内友方机甲提供+15%攻速光环，脉冲释放5目标连锁高压电弧(2.5倍破盾+易伤)',
      },
    },
  },
};

export const COMMANDER_SKILL_ORDER: CommanderSkillId[] = [
  'orbital_strike',
  'emp_overdrive',
  'nano_repair',
];

export const COMMANDER_SKILLS: Record<CommanderSkillId, CommanderSkillConfig> = {
  orbital_strike: {
    id: 'orbital_strike',
    hotkey: '1',
    name: '轨道离子轰炸',
    shortName: '离子轰炸',
    targeting: 'ground',
    energyCost: 45,
    cooldownSec: 18,
    radius: 3.2,
    accentHex: '#38BDF8',
    summary: '0.55s锁定 · 260穿甲轰击+3层破甲+1.6s眩晕',
  },
  emp_overdrive: {
    id: 'emp_overdrive',
    hotkey: '2',
    name: '全域电磁超载',
    shortName: '电磁超载',
    targeting: 'instant',
    energyCost: 40,
    cooldownSec: 20,
    radius: 0,
    accentHex: '#C084FC',
    summary: '净除眩晕 · 全塔+45%攻速6s · 全场碎盾挂磁化',
  },
  nano_repair: {
    id: 'nano_repair',
    hotkey: '3',
    name: '纳米信标急修',
    shortName: '纳米急修',
    targeting: 'instant',
    energyCost: 35,
    cooldownSec: 24,
    radius: 0,
    accentHex: '#34D399',
    summary: '信标+4耐久修复 · 空投+75G应急金币',
  },
};

export const TACTICAL_ENERGY_CONFIG = {
  INITIAL_ENERGY: 50,
  BASE_MAX_ENERGY: 100,
  PASSIVE_REGEN_IN_WAVE_PER_SEC: 1.6,
  WAVE_CLEAR_BONUS: 12,
  BOSS_PLATE_BREAK_BONUS: 15,
  CRYSTAL_VEIN_HARVEST_BONUS: 15,
  KILL_ENERGY: {
    mini_scout: 1.0,
    swarm: 1.5,
    rover: 2.0,
    shield_skimmer: 2.8,
    splitter_rover: 3.0,
    repair_drone: 3.2,
    drill: 4.0,
    elite_drill: 12.0,
    boss_crawler: 25.0,
    boss_siege_driller: 28.0,
    boss_mag_dreadnought: 30.0,
    boss_ark_overlord: 35.0,
  } as Record<EnemyType, number>,
} as const;

export const ENEMY_BLUEPRINTS: Record<EnemyType, EnemyBlueprint> = {
  rover: {
    id: 'rover',
    name: '失控巡检机',
    maxHp: 92,
    speed: 2.25,
    armor: 0.08,
    goldReward: 16,
    crystalReward: 0,
    beaconDamage: 1,
    isFlying: false,
    isElite: false,
    isBoss: false,
    hitRadius: 0.52,
    scale: 1.0,
  },
  swarm: {
    id: 'swarm',
    name: '运输蜂群机',
    maxHp: 52,
    speed: 3.75,
    armor: 0,
    goldReward: 12,
    crystalReward: 0,
    beaconDamage: 1,
    isFlying: true,
    isElite: false,
    isBoss: false,
    hitRadius: 0.42,
    scale: 0.92,
  },
  drill: {
    id: 'drill',
    name: '重甲钻探机',
    maxHp: 285,
    speed: 1.32,
    armor: 0.42,
    goldReward: 32,
    crystalReward: 0,
    beaconDamage: 2,
    isFlying: false,
    isElite: false,
    isBoss: false,
    hitRadius: 0.72,
    scale: 1.12,
  },
  elite_drill: {
    id: 'elite_drill',
    name: '精英·裂岩重钻长机',
    maxHp: 1350,
    speed: 1.22,
    armor: 0.48,
    goldReward: 110,
    crystalReward: 2,
    beaconDamage: 4,
    isFlying: false,
    isElite: true,
    isBoss: false,
    hitRadius: 0.98,
    scale: 1.48,
  },
  boss_crawler: {
    id: 'boss_crawler',
    name: '最终Boss·巨颚号履带采掘母机',
    maxHp: 6400,
    speed: 0.88,
    armor: 0.45,
    goldReward: 260,
    crystalReward: 5,
    beaconDamage: 20,
    isFlying: false,
    isElite: true,
    isBoss: true,
    hitRadius: 1.55,
    scale: 1.0,
  },
  shield_skimmer: {
    id: 'shield_skimmer',
    name: '护盾掠袭艇',
    maxHp: 135,
    maxShield: 95,
    speed: 2.65,
    armor: 0.1,
    goldReward: 22,
    crystalReward: 0,
    beaconDamage: 1,
    isFlying: false,
    isElite: false,
    isBoss: false,
    hitRadius: 0.56,
    scale: 1.0,
  },
  splitter_rover: {
    id: 'splitter_rover',
    name: '裂殖母体车',
    maxHp: 240,
    speed: 1.58,
    armor: 0.25,
    goldReward: 26,
    crystalReward: 0,
    beaconDamage: 2,
    isFlying: false,
    isElite: false,
    isBoss: false,
    hitRadius: 0.68,
    scale: 1.0,
  },
  mini_scout: {
    id: 'mini_scout',
    name: '裂殖子机',
    maxHp: 48,
    speed: 3.35,
    armor: 0,
    goldReward: 7,
    crystalReward: 0,
    beaconDamage: 1,
    isFlying: false,
    isElite: false,
    isBoss: false,
    hitRadius: 0.38,
    scale: 0.68,
  },
  repair_drone: {
    id: 'repair_drone',
    name: '工程抢修无人机',
    maxHp: 145,
    speed: 2.05,
    armor: 0.12,
    goldReward: 28,
    crystalReward: 0,
    beaconDamage: 1,
    isFlying: true,
    isElite: false,
    isBoss: false,
    hitRadius: 0.52,
    scale: 0.96,
  },
  boss_siege_driller: {
    id: 'boss_siege_driller',
    name: '章节Boss·碎星号双联破城钻',
    maxHp: 6800,
    speed: 0.85,
    armor: 0.48,
    goldReward: 320,
    crystalReward: 6,
    beaconDamage: 20,
    isFlying: false,
    isElite: true,
    isBoss: true,
    hitRadius: 1.62,
    scale: 1.02,
  },
  boss_mag_dreadnought: {
    id: 'boss_mag_dreadnought',
    name: '章节Boss·苍穹轨霸磁浮无畏舰',
    maxHp: 7600,
    maxShield: 1200,
    speed: 0.92,
    armor: 0.42,
    goldReward: 360,
    crystalReward: 8,
    beaconDamage: 20,
    isFlying: false,
    isElite: true,
    isBoss: true,
    hitRadius: 1.68,
    scale: 1.05,
  },
  boss_ark_overlord: {
    id: 'boss_ark_overlord',
    name: '终末Boss·欧米茄方舟收割母舰',
    maxHp: 10500,
    speed: 0.82,
    armor: 0.5,
    goldReward: 480,
    crystalReward: 12,
    beaconDamage: 25,
    isFlying: false,
    isElite: true,
    isBoss: true,
    hitRadius: 1.82,
    scale: 1.12,
  },
};

export const ENEMY_CODEX_ORDER: EnemyType[] = [
  'rover',
  'swarm',
  'drill',
  'shield_skimmer',
  'splitter_rover',
  'mini_scout',
  'repair_drone',
  'elite_drill',
  'boss_crawler',
  'boss_siege_driller',
  'boss_mag_dreadnought',
  'boss_ark_overlord',
];

export const TOWER_SYNERGY_CODEX: Record<TowerType, TowerSynergyCodexEntry> = {
  autocannon: {
    id: 'autocannon',
    roleBadge: '破甲裂隙 · 🎯弱点暴击',
    synergySummary:
      '命中重甲叠加【破甲裂隙】(-8%护甲/层)；攻击【磁化标记】或外露核心目标触发1.35x~1.55x弱点暴击。',
  },
  mortar: {
    id: 'mortar',
    roleBadge: '⚡磁暴共振引爆',
    synergySummary:
      '榴弹或火箭命中【磁化标记】目标触发⚡磁暴共振，造成+35%电浆震波并跃迁2道高穿甲连锁闪电。',
  },
  magnetic: {
    id: 'magnetic',
    roleBadge: '磁化标记 · 聚怪控场',
    synergySummary:
      '脉冲力场施加高额减速与【磁化标记】，将高速蜂群与重甲编队压制在迫击炮与机炮连携火力网内。',
  },
};

export const ENEMY_CODEX_META: Record<EnemyType, EnemyCodexMetaEntry> = {
  rover: {
    id: 'rover',
    threatTag: '常规',
    threatHex: '#94A3B8',
    counterTip: '克制：联装机炮高频点射清理',
    description: '失控的四轮矿道巡检机器人，机动均衡、成批推进。',
  },
  swarm: {
    id: 'swarm',
    threatTag: '飞行',
    threatHex: '#38BDF8',
    counterTip: '克制：磁场约束塔减速 + 机炮/电弧拦截',
    description: '贴地疾掠的采矿运输无人机群，移速极快但壳体脆弱。',
  },
  drill: {
    id: 'drill',
    threatTag: '重甲',
    threatHex: '#FB923C',
    counterTip: '克制：机炮叠破甲裂隙 + 脉冲迫击炮轰击',
    description: '披挂厚重前甲的履带钻探车，普通弹药难以直接击穿。',
  },
  shield_skimmer: {
    id: 'shield_skimmer',
    threatTag: '护盾',
    threatHex: '#22D3EE',
    counterTip: '克制：磁场塔/高压电弧或全域电磁超载碎盾',
    description: '搭载可再生能量偏导盾的悬浮掠袭艇，脱战后会恢复护盾。',
  },
  splitter_rover: {
    id: 'splitter_rover',
    threatTag: '裂殖',
    threatHex: '#A3E635',
    counterTip: '克制：磁化标记 + 迫击炮磁暴共振群清子机',
    description: '内置两台高速侦察子机的母体运输车，被摧毁时释放裂殖子机。',
  },
  mini_scout: {
    id: 'mini_scout',
    threatTag: '迅捷',
    threatHex: '#FACC15',
    counterTip: '克制：磁场减速力场 + 暴风火神/集束火箭封锁',
    description: '从裂殖母体弹射出的微型冲锋车，体型小巧、冲刺极快。',
  },
  repair_drone: {
    id: 'repair_drone',
    threatTag: '维修',
    threatHex: '#34D399',
    counterTip: '克制：双联电磁轨炮超距狙杀优先断奶',
    description: '悬停伴飞的工程抢修无人机，周期为周围受损敌械恢复耐久。',
  },
  elite_drill: {
    id: 'elite_drill',
    threatTag: '精英',
    threatHex: '#C084FC',
    counterTip: '克制：磁场迟滞 + 破甲裂隙与弱点暴击集火',
    description: '强化合金装甲的重钻编队长机，突破防线将重创信标。',
  },
  boss_crawler: {
    id: 'boss_crawler',
    threatTag: '首领BOSS',
    threatHex: '#FF4757',
    counterTip: '克制：击碎分层护甲集火能源弱点；电磁超载解震地眩晕',
    description: '曙光检修站深层采掘母机，重锤震地会短暂震停邻近防御塔。',
  },
  boss_siege_driller: {
    id: 'boss_siege_driller',
    threatTag: '首领BOSS',
    threatHex: '#FF4757',
    counterTip: '克制：电磁超载/电容塔群破护卫盾，轨道轰炸断蓄力',
    description: '双生裂谷破城重钻母机，蓄力为周围护卫机械投射高额能量护盾。',
  },
  boss_mag_dreadnought: {
    id: 'boss_mag_dreadnought',
    threatTag: '首领BOSS',
    threatHex: '#FF4757',
    counterTip: '克制：高压电弧矩阵/电磁超载剥离1200磁盾后集火核心',
    description: '磁轨发射回廊重型磁浮无畏舰，覆有厚重磁能护盾并释放电磁脉冲。',
  },
  boss_ark_overlord: {
    id: 'boss_ark_overlord',
    threatTag: '终末BOSS',
    threatHex: '#F43F5E',
    counterTip: '克制：双轨T4传说协同 + 战场机关与轨道离子轰炸总攻',
    description: '终末方舟中枢失控收割母舰，兼具分层重甲、震荡瘫痪与军团增幅。',
  },
};

export const MECHANISM_CODEX_LIST: MechanismCodexEntry[] = [
  {
    id: 'high_ground',
    name: '高地增程基座',
    tag: '+18%射程 · +15%伤害',
    accentHex: '#FBBF24',
    summary: '抬升式重装战略炮位，部署其上的防御机甲永久获得射程扩展与动能增幅。',
  },
  {
    id: 'crystal_vein',
    name: '富集能源晶脉',
    tag: '点击 +45G / +1💎 / +15⚡',
    accentHex: '#22D3EE',
    summary: '裸露的高纯度月海能量晶簇，充能就绪后点击可即时开采金币、永久晶簇与战术能量。',
  },
  {
    id: 'capacitor_pylon',
    name: '月面电容塔',
    tag: '连锁闪电 · 破盾麻痹',
    accentHex: '#38BDF8',
    summary: '战地高压放电桩，激活后向周围敌群跃迁多道电弧，大幅削盾并造成短暂麻痹。',
  },
  {
    id: 'laser_gate',
    name: '激光封锁闸门',
    tag: '横贯光栅 · 减速灼烧',
    accentHex: '#F43F5E',
    summary: '横跨运输矿道的等离子光栅，开启期间持续切割灼烧穿行敌械并压制推进速度。',
  },
];

export const WAVE_CONFIGS: WaveConfig[] = [
  {
    waveNumber: 1,
    title: '第 1 波 · 矿道异动',
    subtitle: '失控巡检机沿运输轨道逼近返航信标',
    clearGoldBonus: 45,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [{ enemyType: 'rover', count: 7, interval: 1.25, delayBefore: 0.3 }],
  },
  {
    waveNumber: 2,
    title: '第 2 波 · 低空运输蜂群',
    subtitle: '高速运输蜂群来袭！建议配合联装机炮与磁场约束塔',
    clearGoldBonus: 55,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'rover', count: 5, interval: 1.1, delayBefore: 0.2 },
      { enemyType: 'swarm', count: 8, interval: 0.65, delayBefore: 1.5 },
    ],
  },
  {
    waveNumber: 3,
    title: '第 3 波 · 重甲掘进编队',
    subtitle: '重甲钻探机登场！脉冲迫击炮可有效击穿厚重前甲',
    clearGoldBonus: 65,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'drill', count: 3, interval: 2.4, delayBefore: 0.3 },
      { enemyType: 'rover', count: 7, interval: 0.95, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 4,
    title: '第 4 波 · 精英裂岩突袭',
    subtitle: '警报：精英【裂岩重钻长机】率领蜂群强攻防线！',
    clearGoldBonus: 85,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'rover', count: 6, interval: 0.9, delayBefore: 0.2 },
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 1.8 },
      { enemyType: 'swarm', count: 9, interval: 0.58, delayBefore: 1.2 },
    ],
  },
  {
    waveNumber: 5,
    title: '第 5 波 · 双线失控洪流',
    subtitle: '高速蜂群掩护重甲钻探机推进，及时升级核心火力',
    clearGoldBonus: 95,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'swarm', count: 12, interval: 0.52, delayBefore: 0.2 },
      { enemyType: 'drill', count: 5, interval: 1.9, delayBefore: 1.0 },
      { enemyType: 'rover', count: 8, interval: 0.8, delayBefore: 0.8 },
    ],
  },
  {
    waveNumber: 6,
    title: '第 6 波 · 矿区重装集群',
    subtitle: '密集重甲编队进入射程，精英模块与范围火力大显身手',
    clearGoldBonus: 115,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'drill', count: 7, interval: 1.65, delayBefore: 0.3 },
      { enemyType: 'swarm', count: 14, interval: 0.48, delayBefore: 1.2 },
    ],
  },
  {
    waveNumber: 7,
    title: '第 7 波 · 终末前夜狂潮',
    subtitle: '双精英重钻开路！抓紧晋升金色【传说机甲】迎接总攻',
    clearGoldBonus: 140,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'rover', count: 10, interval: 0.7, delayBefore: 0.2 },
      { enemyType: 'elite_drill', count: 2, interval: 4.2, delayBefore: 1.4 },
      { enemyType: 'swarm', count: 16, interval: 0.45, delayBefore: 1.0 },
      { enemyType: 'drill', count: 5, interval: 1.5, delayBefore: 0.8 },
    ],
  },
  {
    waveNumber: 8,
    title: '第 8 波 · 巨颚号深层采掘母机',
    subtitle: '最终决战！击穿采掘母机分层护甲与能源弱点，守护返航信标！',
    clearGoldBonus: 200,
    clearCrystalBonus: 4,
    hasElite: true,
    hasBoss: true,
    groups: [
      { enemyType: 'rover', count: 6, interval: 0.85, delayBefore: 0.2 },
      { enemyType: 'boss_crawler', count: 1, interval: 1.0, delayBefore: 1.2 },
      { enemyType: 'drill', count: 5, interval: 1.9, delayBefore: 2.8 },
      { enemyType: 'swarm', count: 14, interval: 0.55, delayBefore: 6.2 },
    ],
  },
];
