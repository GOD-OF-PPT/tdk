import type {
  EnemyType,
  StageConfig,
  StageId,
  WaveConfig,
  WaveSpawnGroup,
} from '../types';
import {
  BUILD_PADS,
  compileStageLanes,
  RAW_ROAD_WAYPOINTS,
  sampleLaneAtDistance,
  WAVE_CONFIGS,
} from './gameConfig';

export { compileStageLanes, sampleLaneAtDistance };

export const STAGE_ORDER: StageId[] = [
  'stage_01',
  'stage_02',
  'stage_03',
  'stage_04',
  'endless',
];

const STAGE_02_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    title: '第 1 波 · 裂谷双脉苏醒',
    subtitle: '失控巡检机沿南北双环矿道分流逼近返航信标',
    clearGoldBonus: 50,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [{ enemyType: 'rover', count: 10, interval: 1.05, delayBefore: 0.2, laneIndex: 'alternate' }],
  },
  {
    waveNumber: 2,
    title: '第 2 波 · 护盾掠袭编队',
    subtitle: '新敌情【护盾掠袭艇】登场！点击中央月面电容塔可瞬间击碎能量护盾',
    clearGoldBonus: 60,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'shield_skimmer', count: 4, interval: 1.5, delayBefore: 0.3, laneIndex: 0 },
      { enemyType: 'swarm', count: 10, interval: 0.62, delayBefore: 1.0, laneIndex: 1 },
    ],
  },
  {
    waveNumber: 3,
    title: '第 3 波 · 裂殖母体突进',
    subtitle: '注意：【裂殖母体车】被摧毁时会弹射出 2 台高速裂殖子机！',
    clearGoldBonus: 70,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 4, interval: 2.1, delayBefore: 0.3, laneIndex: 'alternate' },
      { enemyType: 'rover', count: 8, interval: 0.9, delayBefore: 1.2, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 4,
    title: '第 4 波 · 南北钳形合围',
    subtitle: '北脉重甲钻探机与南脉护盾掠袭艇同步推进',
    clearGoldBonus: 80,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'drill', count: 5, interval: 1.9, delayBefore: 0.2, laneIndex: 0 },
      { enemyType: 'shield_skimmer', count: 6, interval: 1.25, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'swarm', count: 10, interval: 0.55, delayBefore: 1.2, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 5,
    title: '第 5 波 · 裂谷精英强袭',
    subtitle: '精英【裂岩重钻长机】压阵，善用高地增程台与电容塔震击！',
    clearGoldBonus: 95,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 0.5, laneIndex: 0 },
      { enemyType: 'splitter_rover', count: 5, interval: 1.75, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'shield_skimmer', count: 6, interval: 1.15, delayBefore: 1.0, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 6,
    title: '第 6 波 · 双环狂蜂裂潮',
    subtitle: '大批低空蜂群携裂殖母体高速冲锋，范围火力与减速缺一不可',
    clearGoldBonus: 105,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'swarm', count: 18, interval: 0.45, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'splitter_rover', count: 6, interval: 1.55, delayBefore: 1.1, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 7,
    title: '第 7 波 · 重装护盾洪流',
    subtitle: '密集钻探编队与护盾艇交错突击，记得采集东崖富集晶脉',
    clearGoldBonus: 120,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'drill', count: 6, interval: 1.6, delayBefore: 0.3, laneIndex: 0 },
      { enemyType: 'shield_skimmer', count: 8, interval: 1.05, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'rover', count: 10, interval: 0.72, delayBefore: 0.9, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 8,
    title: '第 8 波 · 双脉重钻夹击',
    subtitle: '警报：南北矿道同时出现【精英裂岩重钻长机】！',
    clearGoldBonus: 135,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 0.4, laneIndex: 0 },
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 1.2, laneIndex: 1 },
      { enemyType: 'shield_skimmer', count: 8, interval: 0.95, delayBefore: 1.0, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 9,
    title: '第 9 波 · 矿井决战前夕',
    subtitle: '全线高压机械潮！抓紧在汇流防线晋升传说机甲',
    clearGoldBonus: 155,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 8, interval: 1.3, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'drill', count: 6, interval: 1.5, delayBefore: 0.9, laneIndex: 'alternate' },
      { enemyType: 'swarm', count: 16, interval: 0.42, delayBefore: 1.0, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 10,
    title: '第 10 波 · 碎星号双联破城钻',
    subtitle: '章节决战！【碎星号】具备双钻震击与护盾投射，全力轰击紫晶弱点！',
    clearGoldBonus: 220,
    clearCrystalBonus: 5,
    hasElite: true,
    hasBoss: true,
    groups: [
      { enemyType: 'shield_skimmer', count: 4, interval: 0.95, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'boss_siege_driller', count: 1, interval: 1.0, delayBefore: 1.2, laneIndex: 0 },
      { enemyType: 'splitter_rover', count: 6, interval: 1.6, delayBefore: 2.8, laneIndex: 1 },
      { enemyType: 'swarm', count: 12, interval: 0.55, delayBefore: 1.8, laneIndex: 'alternate' },
      { enemyType: 'shield_skimmer', count: 4, interval: 1.2, delayBefore: 1.4, laneIndex: 'alternate' },
    ],
  },
];

const STAGE_03_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    title: '第 1 波 · 加速导轨通电',
    subtitle: '注意：发光磁轨区会令敌机提速 +42%！强力减速可抵消磁轨推进',
    clearGoldBonus: 55,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'rover', count: 9, interval: 1.05, delayBefore: 0.2 },
      { enemyType: 'swarm', count: 6, interval: 0.7, delayBefore: 1.2 },
    ],
  },
  {
    waveNumber: 2,
    title: '第 2 波 · 磁轨护盾疾袭',
    subtitle: '护盾掠袭艇借磁轨高速冲关，适时激活【中枢激光封锁闸门】灼烧阻截！',
    clearGoldBonus: 65,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'shield_skimmer', count: 6, interval: 1.25, delayBefore: 0.3 },
      { enemyType: 'rover', count: 6, interval: 0.95, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 3,
    title: '第 3 波 · 工程抢修编队',
    subtitle: '新敌情【工程抢修无人机】会周期修复周围敌械，优先集火击落！',
    clearGoldBonus: 75,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'drill', count: 4, interval: 2.0, delayBefore: 0.3 },
      { enemyType: 'repair_drone', count: 3, interval: 2.3, delayBefore: 0.9 },
    ],
  },
  {
    waveNumber: 4,
    title: '第 4 波 · 抢修护航重钻',
    subtitle: '精英重钻在抢修无人机护卫下强闯中枢闸口！',
    clearGoldBonus: 90,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 0.4 },
      { enemyType: 'repair_drone', count: 3, interval: 1.8, delayBefore: 0.8 },
      { enemyType: 'swarm', count: 12, interval: 0.52, delayBefore: 1.2 },
    ],
  },
  {
    waveNumber: 5,
    title: '第 5 波 · 混成装甲突击',
    subtitle: '裂殖母体车、护盾艇与抢修机协同推进',
    clearGoldBonus: 100,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 6, interval: 1.55, delayBefore: 0.3 },
      { enemyType: 'shield_skimmer', count: 6, interval: 1.15, delayBefore: 0.9 },
      { enemyType: 'repair_drone', count: 2, interval: 2.2, delayBefore: 0.8 },
    ],
  },
  {
    waveNumber: 6,
    title: '第 6 波 · 超音速蜂群狂飙',
    subtitle: '高速蜂群与护盾艇借双段加速轨猛扑信标，把握激光闸开启时机！',
    clearGoldBonus: 115,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'swarm', count: 20, interval: 0.4, delayBefore: 0.2 },
      { enemyType: 'shield_skimmer', count: 8, interval: 0.95, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 7,
    title: '第 7 波 · 双精英装甲纵队',
    subtitle: '2 台精英重钻配属 4 架抢修无人机，范围高爆火力全力压制',
    clearGoldBonus: 130,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 2, interval: 3.8, delayBefore: 0.4 },
      { enemyType: 'repair_drone', count: 4, interval: 1.65, delayBefore: 0.9 },
      { enemyType: 'drill', count: 4, interval: 1.7, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 8,
    title: '第 8 波 · 裂殖抢修矩阵',
    subtitle: '高密度裂殖车队冲入回廊，俯瞰高地台火力全开',
    clearGoldBonus: 145,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 8, interval: 1.25, delayBefore: 0.2 },
      { enemyType: 'repair_drone', count: 4, interval: 1.7, delayBefore: 0.8 },
      { enemyType: 'shield_skimmer', count: 8, interval: 0.95, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 9,
    title: '第 9 波 · 磁轨极限负载',
    subtitle: '全频段敌械总冲锋！稳固东折防线迎接磁浮无畏舰',
    clearGoldBonus: 165,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 2, interval: 3.4, delayBefore: 0.3 },
      { enemyType: 'shield_skimmer', count: 10, interval: 0.85, delayBefore: 0.9 },
      { enemyType: 'repair_drone', count: 5, interval: 1.5, delayBefore: 0.8 },
      { enemyType: 'swarm', count: 16, interval: 0.42, delayBefore: 1.0 },
    ],
  },
  {
    waveNumber: 10,
    title: '第 10 波 · 苍穹轨霸磁浮无畏舰',
    subtitle: '章节决战！【磁浮无畏舰】拥有巨量资本舰护盾与群体提速脉冲！',
    clearGoldBonus: 240,
    clearCrystalBonus: 5,
    hasElite: true,
    hasBoss: true,
    groups: [
      { enemyType: 'shield_skimmer', count: 4, interval: 0.9, delayBefore: 0.2 },
      { enemyType: 'boss_mag_dreadnought', count: 1, interval: 1.0, delayBefore: 1.2 },
      { enemyType: 'repair_drone', count: 4, interval: 1.9, delayBefore: 2.6 },
      { enemyType: 'shield_skimmer', count: 4, interval: 1.1, delayBefore: 1.6 },
      { enemyType: 'drill', count: 4, interval: 1.8, delayBefore: 1.4 },
    ],
  },
];

const STAGE_04_WAVES: WaveConfig[] = [
  {
    waveNumber: 1,
    title: '第 1 波 · 双门警报拉响',
    subtitle: '西侧裂隙矿口与北侧空投竖井同时开启！注意北井捷径距离更短',
    clearGoldBonus: 60,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'rover', count: 8, interval: 1.0, delayBefore: 0.2, laneIndex: 0 },
      { enemyType: 'drill', count: 3, interval: 2.1, delayBefore: 1.0, laneIndex: 1 },
    ],
  },
  {
    waveNumber: 2,
    title: '第 2 波 · 空投护盾突袭',
    subtitle: '北侧竖井空投护盾掠袭艇，西侧涌入高速蜂群',
    clearGoldBonus: 70,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'swarm', count: 12, interval: 0.55, delayBefore: 0.2, laneIndex: 0 },
      { enemyType: 'shield_skimmer', count: 5, interval: 1.35, delayBefore: 0.8, laneIndex: 1 },
    ],
  },
  {
    waveNumber: 3,
    title: '第 3 波 · 双线裂殖抢修',
    subtitle: '中枢月面电容塔可同时震击西、北两条战线！',
    clearGoldBonus: 80,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 5, interval: 1.65, delayBefore: 0.3, laneIndex: 0 },
      { enemyType: 'repair_drone', count: 3, interval: 1.9, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'rover', count: 6, interval: 0.9, delayBefore: 0.9, laneIndex: 1 },
    ],
  },
  {
    waveNumber: 4,
    title: '第 4 波 · 北井精英强降',
    subtitle: '精英裂岩重钻从北侧短路径直扑方舟广场，启动终末激光闸阻截！',
    clearGoldBonus: 95,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 0.4, laneIndex: 1 },
      { enemyType: 'repair_drone', count: 3, interval: 1.7, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'shield_skimmer', count: 7, interval: 1.05, delayBefore: 0.9, laneIndex: 0 },
    ],
  },
  {
    waveNumber: 5,
    title: '第 5 波 · 钢铁钳形风暴',
    subtitle: '双门同步倾泻重甲与裂殖集群',
    clearGoldBonus: 110,
    clearCrystalBonus: 1,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 6, interval: 1.45, delayBefore: 0.2, laneIndex: 0 },
      { enemyType: 'drill', count: 5, interval: 1.65, delayBefore: 0.7, laneIndex: 1 },
      { enemyType: 'swarm', count: 14, interval: 0.48, delayBefore: 1.0, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 6,
    title: '第 6 波 · 护盾无人机阵列',
    subtitle: '大批护盾掠袭艇配属抢修无人机高速冲关',
    clearGoldBonus: 120,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'shield_skimmer', count: 10, interval: 0.95, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'repair_drone', count: 4, interval: 1.6, delayBefore: 0.9, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 7,
    title: '第 7 波 · 双口精英会师',
    subtitle: '西北双门各出一台精英重钻，充分利用两处高地台射程优势',
    clearGoldBonus: 135,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 0.3, laneIndex: 0 },
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 1.1, laneIndex: 1 },
      { enemyType: 'splitter_rover', count: 6, interval: 1.35, delayBefore: 1.0, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 8,
    title: '第 8 波 · 先锋首领巨颚强袭',
    subtitle: '高能警报：前哨首领【巨颚号】作为先锋重装突入西门，击溃它继续坚守！',
    clearGoldBonus: 175,
    clearCrystalBonus: 3,
    hasElite: true,
    hasBoss: true,
    groups: [
      { enemyType: 'boss_crawler', count: 1, interval: 1.0, delayBefore: 0.8, laneIndex: 0 },
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 2.4, laneIndex: 1 },
      { enemyType: 'repair_drone', count: 4, interval: 1.8, delayBefore: 1.5, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 9,
    title: '第 9 波 · 裂殖装甲狂潮',
    subtitle: '巨颚残部与裂殖母体车全速反扑',
    clearGoldBonus: 155,
    clearCrystalBonus: 2,
    hasElite: false,
    hasBoss: false,
    groups: [
      { enemyType: 'splitter_rover', count: 9, interval: 1.15, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'shield_skimmer', count: 9, interval: 0.9, delayBefore: 0.9, laneIndex: 'alternate' },
      { enemyType: 'drill', count: 6, interval: 1.5, delayBefore: 0.8, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 10,
    title: '第 10 波 · 北井重装空降群',
    subtitle: '北侧竖井连续投下双精英重钻与抢修护卫！',
    clearGoldBonus: 170,
    clearCrystalBonus: 2,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'elite_drill', count: 2, interval: 3.2, delayBefore: 0.3, laneIndex: 1 },
      { enemyType: 'repair_drone', count: 5, interval: 1.45, delayBefore: 0.8, laneIndex: 1 },
      { enemyType: 'splitter_rover', count: 7, interval: 1.3, delayBefore: 1.0, laneIndex: 0 },
    ],
  },
  {
    waveNumber: 11,
    title: '第 11 波 · 终末黎明前夜',
    subtitle: '全星区失控机群饱和冲击！调整传说机甲部署准备最终决战',
    clearGoldBonus: 190,
    clearCrystalBonus: 3,
    hasElite: true,
    hasBoss: false,
    groups: [
      { enemyType: 'swarm', count: 22, interval: 0.38, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'shield_skimmer', count: 10, interval: 0.85, delayBefore: 0.9, laneIndex: 'alternate' },
      { enemyType: 'elite_drill', count: 2, interval: 3.0, delayBefore: 1.1, laneIndex: 'alternate' },
      { enemyType: 'repair_drone', count: 5, interval: 1.4, delayBefore: 0.8, laneIndex: 'alternate' },
    ],
  },
  {
    waveNumber: 12,
    title: '第 12 波 · 欧米茄终末方舟母舰',
    subtitle: '战役最终决战！摧毁 4 层重甲与旋转方舟核心，守护人类最后返航信标！',
    clearGoldBonus: 300,
    clearCrystalBonus: 6,
    hasElite: true,
    hasBoss: true,
    groups: [
      { enemyType: 'shield_skimmer', count: 5, interval: 0.85, delayBefore: 0.2, laneIndex: 'alternate' },
      { enemyType: 'boss_ark_overlord', count: 1, interval: 1.0, delayBefore: 1.2, laneIndex: 0 },
      { enemyType: 'elite_drill', count: 1, interval: 1.0, delayBefore: 3.2, laneIndex: 1 },
      { enemyType: 'repair_drone', count: 4, interval: 1.8, delayBefore: 1.6, laneIndex: 'alternate' },
      { enemyType: 'splitter_rover', count: 5, interval: 1.6, delayBefore: 1.8, laneIndex: 'alternate' },
    ],
  },
];

export const STAGE_CONFIGS: Record<StageId, StageConfig> = {
  stage_01: {
    id: 'stage_01',
    chapterNumber: 1,
    name: '曙光检修站',
    codeName: 'CH.01',
    subtitle: 'S型蜿蜒峡谷矿道 · 高地增程台与富集晶簇矿脉',
    mechanicSummary: '高地增程 · 晶簇富矿',
    initialGold: 260,
    maxBeaconHp: 20,
    victoryBonusGold: 320,
    victoryBonusCrystals: 8,
    firstClearCrystals: 10,
    perStarCrystals: 2,
    camera: {
      lookX: -0.05,
      distScale: 1.07,
    },
    palette: {
      skyBgHex: 0x16192b,
      fogHex: 0x16192b,
      fogDensity: 0.0082,
      hemiSkyHex: 0xa5b4fc,
      hemiGroundHex: 0x26233a,
      hemiIntensity: 1.08,
      keyLightHex: 0xfff7ed,
      keyLightIntensity: 2.25,
      rimLightHex: 0x67e8f9,
      deckTintHex: 0xffffff,
      roadTintHex: 0xffffff,
      markerAccentHex: 0x4cc9e0,
    },
    lanes: [RAW_ROAD_WAYPOINTS],
    entrances: [{ id: 's1_ent_0', label: '西北矿井闸门', x: -13.65, z: -3.2, yaw: 0 }],
    beaconPos: { x: 12.95, y: 0, z: 2.4 },
    supplyChestPos: { x: 9.75, y: 0, z: 2.7 },
    buildPads: BUILD_PADS,
    mechanisms: [
      { id: 'vein_s1_1', type: 'crystal_vein', label: '西侧晶矿簇', x: -10.4, z: 3.8 },
      { id: 'vein_s1_2', type: 'crystal_vein', label: '东北晶矿簇', x: 9.8, z: -4.6 },
    ],
    speedZones: [],
    themeVariant: 'outpost_canyon',
    waves: WAVE_CONFIGS,
    bossBanner: {
      title: '高能震源警报 · 矿道坍塌',
      subtitle: '失控深层采掘母机【巨颚号】正在冲破封闭闸门！',
      entranceIndex: 0,
    },
  },

  stage_02: {
    id: 'stage_02',
    chapterNumber: 2,
    name: '双生裂谷矿井',
    codeName: 'CH.02',
    subtitle: '南北双环分流汇合 · 中央深渊竖井与月面电容震击塔',
    mechanicSummary: '双线汇流 · 月面电容塔',
    initialGold: 310,
    maxBeaconHp: 20,
    victoryBonusGold: 420,
    victoryBonusCrystals: 12,
    firstClearCrystals: 14,
    perStarCrystals: 3,
    camera: {
      lookX: -0.15,
      distScale: 1.07,
    },
    palette: {
      skyBgHex: 0x19132e,
      fogHex: 0x19132e,
      fogDensity: 0.0082,
      hemiSkyHex: 0xc4b5fd,
      hemiGroundHex: 0x2c1d3d,
      hemiIntensity: 1.1,
      keyLightHex: 0xfef3c7,
      keyLightIntensity: 2.22,
      rimLightHex: 0xc084fc,
      deckTintHex: 0xede6fa,
      roadTintHex: 0xf6edff,
      markerAccentHex: 0xc084fc,
    },
    lanes: [
      [
        { x: -12.8, y: 0, z: 0.0 },
        { x: -8.6, y: 0, z: 0.0 },
        { x: -8.6, y: 0, z: -4.8 },
        { x: 5.8, y: 0, z: -4.8 },
        { x: 5.8, y: 0, z: 0.0 },
        { x: 11.4, y: 0, z: 0.0 },
      ],
      [
        { x: -12.8, y: 0, z: 0.0 },
        { x: -8.6, y: 0, z: 0.0 },
        { x: -8.6, y: 0, z: 4.8 },
        { x: 5.8, y: 0, z: 4.8 },
        { x: 5.8, y: 0, z: 0.0 },
        { x: 11.4, y: 0, z: 0.0 },
      ],
    ],
    entrances: [{ id: 's2_ent_0', label: '裂谷主矿井口', x: -13.45, z: 0.0, yaw: 0 }],
    beaconPos: { x: 12.55, y: 0, z: 0.0 },
    supplyChestPos: { x: 10.8, y: 0, z: 2.8 },
    buildPads: [
      { id: 's2_pad_01', label: '1号分流北座', x: -11.6, y: 0, z: -3.2, padType: 'standard' },
      { id: 's2_pad_02', label: '2号分流南座', x: -11.6, y: 0, z: 3.2, padType: 'standard' },
      { id: 's2_pad_03', label: '3号裂谷西北高地', x: -5.4, y: 0.68, z: -1.6, padType: 'high_ground' },
      { id: 's2_pad_04', label: '4号裂谷西南内座', x: -5.4, y: 0, z: 1.6, padType: 'standard' },
      { id: 's2_pad_05', label: '5号北崖外座', x: -4.6, y: 0, z: -7.7, padType: 'standard' },
      { id: 's2_pad_06', label: '6号北脊外座', x: 2.2, y: 0, z: -7.7, padType: 'standard' },
      { id: 's2_pad_07', label: '7号南崖外座', x: -4.2, y: 0, z: 7.7, padType: 'standard' },
      { id: 's2_pad_08', label: '8号南脊外座', x: 2.2, y: 0, z: 7.7, padType: 'standard' },
      { id: 's2_pad_09', label: '9号裂谷东北高地', x: 2.6, y: 0.68, z: -1.6, padType: 'high_ground' },
      { id: 's2_pad_10', label: '10号裂谷东南内座', x: 2.6, y: 0, z: 1.6, padType: 'standard' },
      { id: 's2_pad_11', label: '11号汇流北卫', x: 8.8, y: 0, z: -3.2, padType: 'standard' },
      { id: 's2_pad_12', label: '12号汇流南卫', x: 8.8, y: 0, z: 3.2, padType: 'standard' },
    ],
    mechanisms: [
      { id: 'pylon_s2_n', type: 'capacitor_pylon', label: '北脉月面电容塔', x: -1.4, z: -2.35 },
      { id: 'pylon_s2_s', type: 'capacitor_pylon', label: '南脉月面电容塔', x: -1.4, z: 2.35 },
      { id: 'vein_s2_1', type: 'crystal_vein', label: '东崖富集晶脉', x: 9.2, z: -6.4 },
    ],
    speedZones: [],
    themeVariant: 'twin_rift_crater',
    waves: STAGE_02_WAVES,
    bossBanner: {
      title: '深渊裂谷震颤 · 双钻破城',
      subtitle: '重型攻城首领【碎星号双联破城钻】正从主矿井强行突入！',
      entranceIndex: 0,
    },
  },

  stage_03: {
    id: 'stage_03',
    chapterNumber: 3,
    name: '磁轨发射回廊',
    codeName: 'CH.03',
    subtitle: '双段电磁加速导轨 · 中枢激光阻断闸门与抢修敌机',
    mechanicSummary: '加速磁轨 · 激光阻断闸',
    initialGold: 320,
    maxBeaconHp: 20,
    victoryBonusGold: 480,
    victoryBonusCrystals: 15,
    firstClearCrystals: 18,
    perStarCrystals: 3,
    camera: {
      lookX: 0.25,
      distScale: 1.08,
    },
    palette: {
      skyBgHex: 0x0f1a2e,
      fogHex: 0x0f1a2e,
      fogDensity: 0.008,
      hemiSkyHex: 0x93c5fd,
      hemiGroundHex: 0x172542,
      hemiIntensity: 1.12,
      keyLightHex: 0xf0f9ff,
      keyLightIntensity: 2.28,
      rimLightHex: 0x38bdf8,
      deckTintHex: 0xe0edff,
      roadTintHex: 0xe6f4fe,
      markerAccentHex: 0x22d3ee,
    },
    lanes: [
      [
        { x: -11.2, y: 0, z: 4.2 },
        { x: -1.6, y: 0, z: 4.2 },
        { x: -1.6, y: 0, z: -4.2 },
        { x: 9.0, y: 0, z: -4.2 },
        { x: 9.0, y: 0, z: 2.2 },
        { x: 11.4, y: 0, z: 2.2 },
      ],
    ],
    entrances: [{ id: 's3_ent_0', label: '磁轨西发入口', x: -11.85, z: 4.2, yaw: 0 }],
    beaconPos: { x: 12.55, y: 0, z: 2.2 },
    supplyChestPos: { x: 11.4, y: 0, z: -1.2 },
    buildPads: [
      { id: 's3_pad_01', label: '1号南轨近卫', x: -9.8, y: 0, z: 1.2, padType: 'standard' },
      { id: 's3_pad_02', label: '2号西俯瞰高地', x: -5.8, y: 0.68, z: 1.1, padType: 'high_ground' },
      { id: 's3_pad_03', label: '3号南舷外座', x: -8.2, y: 0, z: 7.2, padType: 'standard' },
      { id: 's3_pad_04', label: '4号南湾截击座', x: -3.2, y: 0, z: 7.2, padType: 'standard' },
      { id: 's3_pad_05', label: '5号闸北控制座', x: -5.4, y: 0, z: -3.6, padType: 'standard' },
      { id: 's3_pad_06', label: '6号北脊西座', x: -1.6, y: 0, z: -7.2, padType: 'standard' },
      { id: 's3_pad_07', label: '7号北轨外座', x: 3.8, y: 0, z: -7.2, padType: 'standard' },
      { id: 's3_pad_08', label: '8号东俯瞰高地', x: 3.8, y: 0.68, z: -1.1, padType: 'high_ground' },
      { id: 's3_pad_09', label: '9号中庭支援座', x: 2.4, y: 0, z: 3.8, padType: 'standard' },
      { id: 's3_pad_10', label: '10号东折内座', x: 6.0, y: 0, z: 1.4, padType: 'standard' },
      { id: 's3_pad_11', label: '11号信标南卫', x: 9.8, y: 0, z: 5.2, padType: 'standard' },
    ],
    mechanisms: [
      {
        id: 'gate_s3_1',
        type: 'laser_gate',
        label: '中枢激光封锁闸门',
        x: -1.6,
        z: 0.0,
        yaw: 0,
        laneIndex: 0,
      },
      { id: 'vein_s3_1', type: 'crystal_vein', label: '西北储能晶簇', x: -9.8, z: -4.4 },
      { id: 'vein_s3_2', type: 'crystal_vein', label: '东北导轨晶簇', x: 9.2, z: -7.2 },
    ],
    speedZones: [
      { id: 'rail_s3_a', laneIndex: 0, startDist: 1.4, endDist: 8.0, speedMultiplier: 1.42 },
      { id: 'rail_s3_b', laneIndex: 0, startDist: 18.8, endDist: 26.4, speedMultiplier: 1.42 },
    ],
    themeVariant: 'mag_rail_corridor',
    waves: STAGE_03_WAVES,
    bossBanner: {
      title: '电磁导轨过载 · 旗舰压境',
      subtitle: '重装悬浮旗舰【苍穹轨霸·磁浮无畏舰】正沿发射轨全速逼近！',
      entranceIndex: 0,
    },
  },

  stage_04: {
    id: 'stage_04',
    chapterNumber: 4,
    name: '终末方舟中枢',
    codeName: 'CH.04',
    subtitle: '西北双门总攻 · 全域机关协同守护终末方舟信标',
    mechanicSummary: '双门总攻 · 全域机关',
    initialGold: 380,
    maxBeaconHp: 25,
    victoryBonusGold: 650,
    victoryBonusCrystals: 24,
    firstClearCrystals: 24,
    perStarCrystals: 5,
    camera: {
      lookX: 0.0,
      distScale: 1.09,
    },
    palette: {
      skyBgHex: 0x141229,
      fogHex: 0x141229,
      fogDensity: 0.008,
      hemiSkyHex: 0xfde68a,
      hemiGroundHex: 0x241e38,
      hemiIntensity: 1.06,
      keyLightHex: 0xfffbeb,
      keyLightIntensity: 2.3,
      rimLightHex: 0xffd166,
      deckTintHex: 0xf4efe4,
      roadTintHex: 0xe6ecf5,
      markerAccentHex: 0xf59e0b,
    },
    lanes: [
      [
        { x: -12.4, y: 0, z: -2.6 },
        { x: -7.4, y: 0, z: -2.6 },
        { x: -7.4, y: 0, z: 4.4 },
        { x: 2.6, y: 0, z: 4.4 },
        { x: 2.6, y: 0, z: 0.8 },
        { x: 11.2, y: 0, z: 0.8 },
      ],
      [
        { x: -2.2, y: 0, z: -7.0 },
        { x: -2.2, y: 0, z: -2.2 },
        { x: 6.0, y: 0, z: -2.2 },
        { x: 6.0, y: 0, z: 0.8 },
        { x: 11.2, y: 0, z: 0.8 },
      ],
    ],
    entrances: [
      { id: 's4_ent_0', label: '西侧裂隙矿口', x: -13.05, z: -2.6, yaw: 0 },
      { id: 's4_ent_1', label: '北侧空投竖井', x: -2.2, z: -7.65, yaw: -Math.PI / 2 },
    ],
    beaconPos: { x: 12.35, y: 0, z: 0.8 },
    supplyChestPos: { x: 11.4, y: 0, z: -2.0 },
    buildPads: [
      { id: 's4_pad_01', label: '1号西卫内座', x: -10.4, y: 0, z: 0.6, padType: 'standard' },
      { id: 's4_pad_02', label: '2号西北角座', x: -10.2, y: 0, z: -5.6, padType: 'standard' },
      { id: 's4_pad_03', label: '3号双口联防座', x: -5.2, y: 0, z: -5.8, padType: 'standard' },
      { id: 's4_pad_04', label: '4号西堡高地台', x: -4.2, y: 0.68, z: 1.3, padType: 'high_ground' },
      { id: 's4_pad_05', label: '5号南外环西座', x: -7.4, y: 0, z: 7.4, padType: 'standard' },
      { id: 's4_pad_06', label: '6号南外环中座', x: -1.8, y: 0, z: 7.4, padType: 'standard' },
      { id: 's4_pad_07', label: '7号北井东卫', x: 1.8, y: 0, z: -5.2, padType: 'standard' },
      { id: 's4_pad_08', label: '8号方舟高地台', x: 9.2, y: 0.68, z: -2.4, padType: 'high_ground' },
      { id: 's4_pad_09', label: '9号东北外座', x: 6.2, y: 0, z: -5.4, padType: 'standard' },
      { id: 's4_pad_10', label: '10号汇流南卫', x: 6.0, y: 0, z: 4.0, padType: 'standard' },
      { id: 's4_pad_11', label: '11号信标近卫', x: 9.8, y: 0, z: 4.0, padType: 'standard' },
      { id: 's4_pad_12', label: '12号南外环东座', x: 2.6, y: 0, z: 7.4, padType: 'standard' },
    ],
    mechanisms: [
      { id: 'pylon_s4_1', type: 'capacitor_pylon', label: '中枢月面电容塔', x: -0.2, z: 1.2 },
      {
        id: 'gate_s4_1',
        type: 'laser_gate',
        label: '方舟终末激光闸',
        x: 8.6,
        z: 0.8,
        yaw: Math.PI / 2,
      },
      { id: 'vein_s4_1', type: 'crystal_vein', label: '西南富集晶脉', x: -11.2, z: 5.2 },
      { id: 'vein_s4_2', type: 'crystal_vein', label: '东北富集晶脉', x: 10.6, z: -5.6 },
    ],
    speedZones: [],
    themeVariant: 'ark_citadel',
    waves: STAGE_04_WAVES,
    bossBanner: {
      title: '终末方舟警报 · 母舰降临',
      subtitle: '超重型收割母舰【欧米茄·终末方舟母舰】正在突破西侧封闭城门！',
      entranceIndex: 0,
    },
  },

  endless: {
    id: 'endless',
    chapterNumber: 5,
    name: '星区无尽超载',
    codeName: 'EX',
    subtitle: '动态指数级狂潮 · 每 5 波轮替首领强袭，挑战星区最高波次纪录！',
    mechanicSummary: '无限波次 · 五波首领轮替',
    initialGold: 420,
    maxBeaconHp: 25,
    victoryBonusGold: 0,
    victoryBonusCrystals: 0,
    firstClearCrystals: 0,
    perStarCrystals: 0,
    camera: {
      lookX: 0.0,
      distScale: 1.09,
    },
    palette: {
      skyBgHex: 0x120e29,
      fogHex: 0x120e29,
      fogDensity: 0.008,
      hemiSkyHex: 0xddd6fe,
      hemiGroundHex: 0x1e1638,
      hemiIntensity: 1.1,
      keyLightHex: 0xfff7ed,
      keyLightIntensity: 2.28,
      rimLightHex: 0x38bdf8,
      deckTintHex: 0xebe6f7,
      roadTintHex: 0xe2e8f0,
      markerAccentHex: 0x38bdf8,
    },
    lanes: [
      [
        { x: -12.4, y: 0, z: -2.6 },
        { x: -7.4, y: 0, z: -2.6 },
        { x: -7.4, y: 0, z: 4.4 },
        { x: 2.6, y: 0, z: 4.4 },
        { x: 2.6, y: 0, z: 0.8 },
        { x: 11.2, y: 0, z: 0.8 },
      ],
      [
        { x: -2.2, y: 0, z: -7.0 },
        { x: -2.2, y: 0, z: -2.2 },
        { x: 6.0, y: 0, z: -2.2 },
        { x: 6.0, y: 0, z: 0.8 },
        { x: 11.2, y: 0, z: 0.8 },
      ],
    ],
    entrances: [
      { id: 'ex_ent_0', label: '西侧超载裂口', x: -13.05, z: -2.6, yaw: 0 },
      { id: 'ex_ent_1', label: '北侧轨道空投口', x: -2.2, z: -7.65, yaw: -Math.PI / 2 },
    ],
    beaconPos: { x: 12.35, y: 0, z: 0.8 },
    supplyChestPos: { x: 11.4, y: 0, z: -2.0 },
    buildPads: [
      { id: 'ex_pad_01', label: '1号西卫内座', x: -10.4, y: 0, z: 0.6, padType: 'standard' },
      { id: 'ex_pad_02', label: '2号西北角座', x: -10.2, y: 0, z: -5.6, padType: 'standard' },
      { id: 'ex_pad_03', label: '3号双口联防座', x: -5.2, y: 0, z: -5.8, padType: 'standard' },
      { id: 'ex_pad_04', label: '4号西堡高地台', x: -4.2, y: 0.68, z: 1.3, padType: 'high_ground' },
      { id: 'ex_pad_05', label: '5号南外环西座', x: -7.4, y: 0, z: 7.4, padType: 'standard' },
      { id: 'ex_pad_06', label: '6号南外环中座', x: -1.8, y: 0, z: 7.4, padType: 'standard' },
      { id: 'ex_pad_07', label: '7号北井东卫', x: 1.8, y: 0, z: -5.2, padType: 'standard' },
      { id: 'ex_pad_08', label: '8号方舟高地台', x: 9.2, y: 0.68, z: -2.4, padType: 'high_ground' },
      { id: 'ex_pad_09', label: '9号东北外座', x: 6.2, y: 0, z: -5.4, padType: 'standard' },
      { id: 'ex_pad_10', label: '10号汇流南卫', x: 6.0, y: 0, z: 4.0, padType: 'standard' },
      { id: 'ex_pad_11', label: '11号信标近卫', x: 9.8, y: 0, z: 4.0, padType: 'standard' },
      { id: 'ex_pad_12', label: '12号南外环东座', x: 2.6, y: 0, z: 7.4, padType: 'standard' },
    ],
    mechanisms: [
      { id: 'pylon_ex_1', type: 'capacitor_pylon', label: '中枢月面电容塔', x: -0.2, z: 1.2 },
      {
        id: 'gate_ex_1',
        type: 'laser_gate',
        label: '方舟终末激光闸',
        x: 8.6,
        z: 0.8,
        yaw: Math.PI / 2,
      },
      { id: 'vein_ex_1', type: 'crystal_vein', label: '西南富集晶脉', x: -11.2, z: 5.2 },
      { id: 'vein_ex_2', type: 'crystal_vein', label: '东北富集晶脉', x: 10.6, z: -5.6 },
    ],
    speedZones: [],
    themeVariant: 'ark_citadel',
    waves: [],
    bossBanner: {
      title: '无尽超载警报 · 首领轮替降临',
      subtitle: '高能首领正突破外围防线，全力拦截并刷新星区坚守纪录！',
      entranceIndex: 0,
    },
  },
};

export interface EndlessWaveScale {
  hpMultiplier: number;
  speedMultiplier: number;
  goldRewardScale: number;
}

export function getEndlessScaling(waveNumber: number): EndlessWaveScale {
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
}

const ENDLESS_BOSS_ROTATION: EnemyType[] = [
  'boss_crawler',
  'boss_siege_driller',
  'boss_mag_dreadnought',
  'boss_ark_overlord',
];

export function generateEndlessWave(waveNumber: number, laneCount = 2): WaveConfig {
  const w = Math.max(1, waveNumber);
  const isBossWave = w % 5 === 0;
  const isEliteWave = isBossWave || (w >= 4 && w % 2 === 0);
  const altLane: number | 'alternate' = laneCount > 1 ? 'alternate' : 0;

  const groups: WaveSpawnGroup[] = [];
  const baseCount = 6 + Math.min(22, Math.floor(w * 1.4));

  // Core vanguard
  groups.push({
    enemyType: w % 3 === 0 ? 'shield_skimmer' : 'rover',
    count: Math.max(5, Math.round(baseCount * 0.65)),
    interval: Math.max(0.48, 1.02 - w * 0.02),
    delayBefore: 0.2,
    laneIndex: altLane,
  });

  if (w >= 2) {
    groups.push({
      enemyType: w % 2 === 0 ? 'swarm' : 'splitter_rover',
      count: w % 2 === 0 ? Math.min(26, 8 + w) : Math.min(12, 3 + Math.floor(w * 0.5)),
      interval: w % 2 === 0 ? Math.max(0.36, 0.58 - w * 0.008) : 1.35,
      delayBefore: 0.9,
      laneIndex: altLane,
    });
  }

  if (w >= 3) {
    groups.push({
      enemyType: 'drill',
      count: Math.min(12, 2 + Math.floor(w * 0.45)),
      interval: 1.55,
      delayBefore: 0.8,
      laneIndex: laneCount > 1 ? w % 2 : 0,
    });
    groups.push({
      enemyType: 'repair_drone',
      count: Math.min(7, 1 + Math.floor(w / 3)),
      interval: 1.75,
      delayBefore: 0.8,
      laneIndex: altLane,
    });
  }

  if (isEliteWave) {
    const eliteCount = Math.min(5, 1 + Math.floor(w / 4));
    groups.push({
      enemyType: 'elite_drill',
      count: eliteCount,
      interval: 2.8,
      delayBefore: 1.0,
      laneIndex: altLane,
    });
  }

  let bossTitle = '';
  if (isBossWave) {
    const rotIdx = (Math.floor(w / 5) - 1) % ENDLESS_BOSS_ROTATION.length;
    const bossType = ENDLESS_BOSS_ROTATION[rotIdx];
    bossTitle =
      bossType === 'boss_crawler'
        ? '巨颚号母机'
        : bossType === 'boss_siege_driller'
          ? '碎星号双联钻'
          : bossType === 'boss_mag_dreadnought'
            ? '苍穹磁浮无畏舰'
            : '欧米茄方舟母舰';

    groups.push({
      enemyType: bossType,
      count: 1,
      interval: 1.0,
      delayBefore: 1.1,
      laneIndex: 0,
    });

    if (w >= 25 && laneCount > 1) {
      const subBoss = ENDLESS_BOSS_ROTATION[(rotIdx + 1) % ENDLESS_BOSS_ROTATION.length];
      groups.push({
        enemyType: subBoss,
        count: 1,
        interval: 1.0,
        delayBefore: 3.4,
        laneIndex: 1,
      });
    }
  }

  const scale = getEndlessScaling(w);
  const clearGoldBonus = 80 + w * 18;
  const clearCrystalBonus = isBossWave ? 5 + Math.floor(w / 20) : isEliteWave ? 2 : 1;

  return {
    waveNumber: w,
    title: isBossWave
      ? `无尽第 ${w} 波 · 首领【${bossTitle}】降临`
      : `无尽第 ${w} 波 · 超载机械狂潮`,
    subtitle: isBossWave
      ? `首领强度 ×${scale.hpMultiplier.toFixed(1)}！击败首领赢取 +${clearCrystalBonus} 能源晶体与超频赏金！`
      : `敌械生命倍率 ×${scale.hpMultiplier.toFixed(2)} · 善用传说机甲【超频突破】与军工增幅推进战线`,
    clearGoldBonus,
    clearCrystalBonus,
    hasElite: isEliteWave,
    hasBoss: isBossWave,
    groups,
  };
}
