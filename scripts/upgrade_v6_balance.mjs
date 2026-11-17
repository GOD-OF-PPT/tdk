import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();

function replaceExact(content, target, replacement, label) {
  if (!content.includes(target)) {
    throw new Error(`[upgrade_v6_balance] Anchor not found for: ${label}`);
  }
  return content.replace(target, replacement);
}

// ============================================================================
// 1. Patch src/types.ts (Formation Resonance & Dynamic Crystal Cost telemetry)
// ============================================================================
const typesPath = path.join(root, 'src/types.ts');
let typesSrc = fs.readFileSync(typesPath, 'utf8').replace(/\r\n/g, '\n');
if (!typesSrc.includes('formationBonusPct')) {
  typesSrc = replaceExact(
    typesSrc,
    `    maxBulkOverclockCount?: number;
    bulkOverclockCost?: number;`,
    `    maxBulkOverclockCount?: number;
    bulkOverclockCost?: number;
    formationBonusPct?: number;
    gridSyncLevel?: number;
    deployedTowerCount?: number;`,
    'types.ts selectedTower formation resonance fields'
  );
  fs.writeFileSync(typesPath, typesSrc, 'utf8');
}

// ============================================================================
// 2. Patch src/game/ProgressionManager.ts (Update Apex Firepower description)
// ============================================================================
const progPath = path.join(root, 'src/game/ProgressionManager.ts');
let progSrc = fs.readFileSync(progPath, 'utf8').replace(/\r\n/g, '\n');
if (progSrc.includes('每5级附加 +0.4% 最大生命破甲斩杀')) {
  progSrc = replaceExact(
    progSrc,
    `  apex_firepower: {
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
  },`,
    `  apex_firepower: {
    id: 'apex_firepower',
    name: '♾ 奇点武备谐振',
    summary: '无限等级：每级全塔总伤 +7%，并提高对精英/首领的重型克制增幅（需配合多塔阵列）',
    baseCost: 16,
    costStep: 5,
    formatEffect: (lv: number) => {
      const pct = lv * 7;
      const giantCap = Math.min(95, Math.floor(lv / 3) * 8);
      return \`总伤 +\${pct}% · 精英/首领克制上限 +\${giantCap}%\`;
    },
  },`,
    'ProgressionManager apex_firepower balanced description'
  );

  progSrc = replaceExact(
    progSrc,
    `      damageMultiplier: (dmgSteps[kc] ?? 1) * (1 + apexFp * 0.08),`,
    `      damageMultiplier: (dmgSteps[kc] ?? 1) * (1 + Math.min(20, apexFp) * 0.07 + Math.max(0, apexFp - 20) * 0.035),`,
    'ProgressionManager apex_firepower controlled scaling'
  );

  fs.writeFileSync(progPath, progSrc, 'utf8');
}

// ============================================================================
// 3. Patch src/config/campaignConfig.ts (4-Phase Steep Endgame + Dual-Lane Pincer)
// ============================================================================
const campPath = path.join(root, 'src/config/campaignConfig.ts');
let campSrc = fs.readFileSync(campPath, 'utf8').replace(/\r\n/g, '\n');
if (!campSrc.includes('Math.pow(1.098, w - 80)')) {
  campSrc = replaceExact(
    campSrc,
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
    `export function getEndlessScaling(waveNumber: number): EndlessWaveScale {
  const w = Math.max(1, waveNumber);
  // 4-phase Endless curve calibrated for 12-tower combined-arms formations (anti-solo, W1 -> W100+):
  // W20=8.6x, W40=54x, W50=135x, W70=731x, W80=1700x, W99=10035x
  let hpMultiplier = 1;
  if (w <= 20) {
    hpMultiplier = Math.pow(1.12, w - 1);
  } else if (w <= 50) {
    hpMultiplier = Math.pow(1.12, 19) * Math.pow(1.096, w - 20);
  } else if (w <= 80) {
    hpMultiplier = Math.pow(1.12, 19) * Math.pow(1.096, 30) * Math.pow(1.088, w - 50);
  } else {
    hpMultiplier =
      Math.pow(1.12, 19) *
      Math.pow(1.096, 30) *
      Math.pow(1.088, 30) *
      Math.pow(1.098, w - 80);
  }
  // Controlled bounty curve: avoids runaway late-game gold inflation while funding balanced 12-tower upgrades
  const goldRewardScale =
    w <= 15
      ? Math.max(0.48, 1 / (1 + (w - 1) * 0.055))
      : Math.min(1.15, Number((0.52 + (w - 15) * 0.011).toFixed(3)));
  return {
    hpMultiplier,
    speedMultiplier: Math.min(1.48, 1 + Math.floor((w - 1) / 5) * 0.038),
    goldRewardScale,
  };
}`,
    'campaignConfig 4-phase steep endless curve'
  );

  // Add dual-lane pincer fast swarm/skimmer assault from Wave 12+ and Twin/Tri Boss pressure!
  campSrc = replaceExact(
    campSrc,
    `  if (isEliteWave) {
    const eliteCount = Math.min(5, 1 + Math.floor(w / 4));
    groups.push({
      enemyType: 'elite_drill',
      count: eliteCount,
      interval: 2.8,
      delayBefore: 1.0,
      laneIndex: altLane,
    });
  }`,
    `  // From Wave 12+, launch dedicated North-Shaft fast pincer raids so a single turret cannot cover both lanes!
  if (w >= 12 && laneCount > 1) {
    groups.push({
      enemyType: 'swarm',
      count: Math.min(34, 10 + Math.floor(w * 0.45)),
      interval: Math.max(0.24, 0.44 - w * 0.002),
      delayBefore: 0.35,
      laneIndex: 1,
    });
    groups.push({
      enemyType: 'shield_skimmer',
      count: Math.min(18, 4 + Math.floor(w * 0.25)),
      interval: Math.max(0.55, 0.92 - w * 0.004),
      delayBefore: 0.6,
      laneIndex: 0,
    });
  }

  if (isEliteWave) {
    const eliteCount = Math.min(8, 1 + Math.floor(w / 5));
    groups.push({
      enemyType: 'elite_drill',
      count: eliteCount,
      interval: Math.max(1.8, 2.8 - w * 0.01),
      delayBefore: 1.0,
      laneIndex: altLane,
    });
  }`,
    'campaignConfig dual-lane pincer waves'
  );

  campSrc = replaceExact(
    campSrc,
    `    if (w >= 25 && laneCount > 1) {
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
  const clearGoldBonus = 80 + w * 18;`,
    `    if (w >= 20 && laneCount > 1) {
      const subBoss = ENDLESS_BOSS_ROTATION[(rotIdx + 1) % ENDLESS_BOSS_ROTATION.length];
      groups.push({
        enemyType: subBoss,
        count: w >= 60 ? 2 : 1,
        interval: 4.2,
        delayBefore: 2.2,
        laneIndex: 1,
      });
    }
  }

  const scale = getEndlessScaling(w);
  const clearGoldBonus = 80 + Math.round(w * 14);`,
    'campaignConfig multi-boss & controlled clearGoldBonus'
  );

  fs.writeFileSync(campPath, campSrc, 'utf8');
}

// ============================================================================
// 4. Patch src/game/GameEngine.ts (Diminishing Single-Tower OC + Formation Resonance)
// ============================================================================
const engPath = path.join(root, 'src/game/GameEngine.ts');
let engSrc = fs.readFileSync(engPath, 'utf8').replace(/\r\n/g, '\n');
if (!engSrc.includes('computeFormationResonance')) {
  engSrc = replaceExact(
    engSrc,
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
    `  private getRunGlobalDamageMultiplier(): number {
    const arsMult =
      1 +
      Math.min(12, this.runArsenalLevel) * 0.09 +
      Math.max(0, this.runArsenalLevel - 12) * 0.035;
    const crysMult =
      1 +
      Math.min(10, this.runCrystalProtocolLevel) * 0.1 +
      Math.max(0, this.runCrystalProtocolLevel - 10) * 0.04;
    return arsMult * crysMult;
  }

  public getNextArsenalCost(): number {
    return Math.round(380 * Math.pow(1.26, this.runArsenalLevel));
  }

  public getNextCrystalProtocolCost(): number {
    return 5 + this.runCrystalProtocolLevel * 3;
  }

  public computeOverclockStepCost(currentOverclockLv: number): number {
    const tech = this.progression.getComputedTechModifiers();
    // Exponential single-tower thermal tax: discourages dumping all gold into 1 lone +50 turret!
    const raw = Math.round(240 * Math.pow(1.22, currentOverclockLv) + currentOverclockLv * 65);
    return Math.max(90, Math.round(raw * (1 - tech.t4CostDiscount)));
  }

  public computeSingleTowerOverclockMult(ocLv: number): number {
    const oc = Math.max(0, ocLv);
    if (oc <= 0) return 1.0;
    if (oc <= 10) return 1 + oc * 0.14; // +10 -> 2.40x
    if (oc <= 25) return 2.4 + (oc - 10) * 0.08; // +25 -> 3.60x
    return 3.6 + Math.pow(oc - 25, 0.72) * 0.08; // +50 -> 4.41x (severe solo thermal diminishing returns!)
  }

  public computeFormationResonance(): {
    mult: number;
    gridSyncLevel: number;
    deployedCount: number;
  } {
    const deployedCount = this.towers.size;
    if (deployedCount < 3) {
      return { mult: 1.0, gridSyncLevel: 0, deployedCount };
    }
    const types = new Set<TowerType>();
    let t4Count = 0;
    const t4Ocs: number[] = [];
    for (const tw of this.towers.values()) {
      types.add(tw.type);
      if (tw.tier === 4) {
        t4Count++;
        t4Ocs.push(tw.overclockLevel ?? 0);
      }
    }
    t4Ocs.sort((a, b) => b - a);
    // Grid Sync Level = 6th highest T4 tower's overclock level (rewards upgrading ≥6 towers evenly!)
    const gridSyncLevel = t4Ocs.length >= 6 ? t4Ocs[5] : 0;
    const triadAdd = types.size >= 3 ? 0.3 : types.size === 2 ? 0.1 : 0;
    const networkAdd = t4Count >= 3 ? Math.min(12, t4Count) * 0.06 : 0;
    const syncMult =
      1 + Math.min(15, gridSyncLevel) * 0.16 + Math.max(0, gridSyncLevel - 15) * 0.07;
    return {
      mult: (1 + triadAdd + networkAdd) * syncMult,
      gridSyncLevel,
      deployedCount,
    };
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
    const ocDmgMult = this.computeSingleTowerOverclockMult(oc);
    const formationMult = tier >= 3 ? this.computeFormationResonance().mult : 1.0;
    const ocRateMult = oc > 0 ? 1 + Math.min(0.32, oc * 0.02) : 1.0;
    const ocRangeAdd = oc > 0 ? Math.min(0.65, oc * 0.04) : 0;
    const ocSplashAdd = oc > 0 && base.splashRadius > 0 ? Math.min(0.45, oc * 0.025) : 0;
    const ocSlowAdd = oc > 0 && base.slowRatio > 0 ? Math.min(0.12, oc * 0.008) : 0;
    const ocPierceAdd = Math.min(0.12, oc * 0.008);
    const runMult = this.getRunGlobalDamageMultiplier();

    return {
      damage: Math.max(
        1,
        Math.round(base.damage * hgDmg * tech.damageMultiplier * ocDmgMult * formationMult * runMult)
      ),
      fireInterval: Number(
        Math.max(0.11, base.fireInterval / (tech.fireRateMultiplier * ocRateMult)).toFixed(3)
      ),
      range: Number((base.range * hgRng * tech.rangeMultiplier + ocRangeAdd).toFixed(2)),
      splashRadius: Number((base.splashRadius + ocSplashAdd).toFixed(2)),
      slowRatio: Math.min(0.72, Number((base.slowRatio + ocSlowAdd).toFixed(2))),
      slowDuration: base.slowDuration,
      armorPierce: Math.min(0.8, base.armorPierce + tech.bonusArmorPierce + ocPierceAdd),
      cost: Math.max(10, Math.round(base.cost * (1 - costDiscount))),
      partHeadline: base.partHeadline,
    };
  }`,
    'GameEngine diminishing single-tower OC + Formation Resonance'
  );

  // Update activateCrystalOvercharge to use escalating getNextCrystalProtocolCost()
  engSrc = replaceExact(
    engSrc,
    `  public activateCrystalOvercharge(): boolean {
    if (this.mode !== 'playing' || this.overlayPaused) return false;
    this.audio.unlock();
    const crystalCost = 5;`,
    `  public activateCrystalOvercharge(): boolean {
    if (this.mode !== 'playing' || this.overlayPaused) return false;
    this.audio.unlock();
    const crystalCost = this.getNextCrystalProtocolCost();`,
    'GameEngine escalating crystal protocol cost'
  );

  // Update Capacitor Pylon & Orbital Strike & Laser Gate % Max-HP wave damping so they don't cheese W99 solo
  engSrc = replaceExact(
    engSrc,
    `          const pylonDmg = Math.round(
            95 * pylonTech.damageMultiplier * this.getRunGlobalDamageMultiplier() +
              e.maxHp * (e.isBoss ? 0.028 : 0.065)
          );`,
    `          const wDamp = 1 / (1 + Math.max(0, this.waveIndex - 25) * 0.045);
          const pylonDmg = Math.round(
            95 * pylonTech.damageMultiplier * this.getRunGlobalDamageMultiplier() +
              e.maxHp * (e.isBoss ? 0.022 : 0.05) * wDamp
          );`,
    'GameEngine pylon wave-damped % MaxHP'
  );

  engSrc = replaceExact(
    engSrc,
    `            const orbDmg = Math.round(
              (e.isBoss ? 240 : 280) * orbMult + e.maxHp * (e.isBoss ? 0.068 : 0.15)
            );`,
    `            const orbDamp = 1 / (1 + Math.max(0, this.waveIndex - 25) * 0.04);
            const orbDmg = Math.round(
              (e.isBoss ? 260 : 300) * orbMult * this.computeFormationResonance().mult +
                e.maxHp * (e.isBoss ? 0.045 : 0.1) * orbDamp
            );`,
    'GameEngine orbital strike wave-damped % MaxHP'
  );

  engSrc = replaceExact(
    engSrc,
    `                const gateDmg = Math.round(
                  11 * this.progression.getComputedTechModifiers().damageMultiplier * this.getRunGlobalDamageMultiplier() +
                    e.maxHp * (e.isBoss ? 0.004 : 0.011)
                );`,
    `                const gateDamp = 1 / (1 + Math.max(0, this.waveIndex - 25) * 0.05);
                const gateDmg = Math.round(
                  12 * this.progression.getComputedTechModifiers().damageMultiplier * this.getRunGlobalDamageMultiplier() +
                    e.maxHp * (e.isBoss ? 0.003 : 0.008) * gateDamp
                );`,
    'GameEngine laser gate wave-damped % MaxHP'
  );

  // Update spawnEnemy in Endless Mode: Phase Shields & Progressive Armor on deep waves so 1 tower type gets countered!
  engSrc = replaceExact(
    engSrc,
    `    if (this.isEndlessMode()) {
      const sc = getEndlessScaling(this.waveIndex + 1);
      maxHp = Math.round(maxHp * sc.hpMultiplier);
      maxShieldHp = Math.round(maxShieldHp * sc.hpMultiplier);
      baseSpeed = Number((baseSpeed * sc.speedMultiplier).toFixed(2));
      goldReward = Math.max(2, Math.round(goldReward * sc.goldRewardScale));
    }`,
    `    let endlessExtraArmor = 0;
    if (this.isEndlessMode()) {
      const wNum = this.waveIndex + 1;
      const sc = getEndlessScaling(wNum);
      maxHp = Math.round(maxHp * sc.hpMultiplier);
      maxShieldHp = Math.round(maxShieldHp * sc.hpMultiplier);
      // Deep Endless Combined-Arms Mechanics: Elites & Bosses deploy Phase Shields (requiring Magnetic/EMP!) & Reinforced Plating (requiring Armor Shred!)
      if (wNum >= 16 && bp.isBoss) {
        maxShieldHp = Math.max(maxShieldHp, Math.round(maxHp * 0.28));
      } else if (wNum >= 20 && bp.isElite) {
        maxShieldHp = Math.max(maxShieldHp, Math.round(maxHp * 0.22));
      }
      if (wNum >= 25 && (bp.armor > 0 || bp.isBoss || bp.isElite)) {
        endlessExtraArmor = Math.min(0.24, Math.floor((wNum - 20) / 10) * 0.04);
      }
      baseSpeed = Number((baseSpeed * sc.speedMultiplier).toFixed(2));
      goldReward = Math.max(2, Math.round(goldReward * sc.goldRewardScale));
    }`,
    'GameEngine Endless Phase Shields & progressive armor'
  );

  engSrc = replaceExact(
    engSrc,
    `      baseSpeed,
      armor: bp.armor,`,
    `      baseSpeed,
      armor: Math.min(0.76, bp.armor + endlessExtraArmor),`,
    'GameEngine apply endlessExtraArmor'
  );

  // Update Fusion Mortar burn zone to use computeSingleTowerOverclockMult + Formation Resonance
  engSrc = replaceExact(
    engSrc,
    `      const ocMult = tower ? Math.pow(1.145, tower.overclockLevel ?? 0) : 1.0;
      const tickDmg = Math.max(
        8,
        Math.round(22 * hgDmg * tech.damageMultiplier * ocMult * this.getRunGlobalDamageMultiplier())
      );`,
    `      const ocMult = tower ? this.computeSingleTowerOverclockMult(tower.overclockLevel ?? 0) : 1.0;
      const formMult = this.computeFormationResonance().mult;
      const tickDmg = Math.max(
        8,
        Math.round(22 * hgDmg * tech.damageMultiplier * ocMult * formMult * this.getRunGlobalDamageMultiplier())
      );`,
    'GameEngine Fusion Mortar burn zone controlled OC'
  );

  // Update applyDamageToEnemy: Kinetic shield deflection (unless Magnetized!) + CAPPED Giant-Slayer!
  engSrc = replaceExact(
    engSrc,
    `      const shieldBonus =
        opts?.shieldMult ?? (sourceTower?.type === 'magnetic' || sourceTower === null ? 1.35 : 1.0);`,
    `      // Un-magnetized Phase Shields deflect 38% of pure kinetic shots, rewarding Magnetic Tower / EMP / Pylon synergy!
      const isMagnetized = enemy.fluxTimer > 0;
      const defaultShieldMult =
        sourceTower?.type === 'magnetic'
          ? 1.65
          : sourceTower === null
            ? 1.35
            : isMagnetized
              ? 1.15
              : this.isEndlessMode() && this.waveIndex >= 14
                ? 0.62
                : 1.0;
      const shieldBonus = opts?.shieldMult ?? defaultShieldMult;`,
    'GameEngine Phase Shield kinetic deflection vs Magnetic synergy'
  );

  engSrc = replaceExact(
    engSrc,
    `    const techMods = this.progression.getComputedTechModifiers();
    const giantBonus =
      techMods.maxHpBonusRatio > 0 && sourceTower
        ? Math.round(
            enemy.maxHp *
              techMods.maxHpBonusRatio *
              (enemy.isBoss ? 0.35 : 0.85) *
              (sourceTower.type === 'autocannon' ? 0.42 : 1.0)
          )
        : 0;`,
    `    const techMods = this.progression.getComputedTechModifiers();
    // Bounded Giant-Slayer bonus: amplifies tower damage up to +95% against Elites/Bosses, NEVER uncapped wave-ignoring %MaxHP!
    const rawGiant =
      techMods.maxHpBonusRatio > 0 && sourceTower && (enemy.isElite || enemy.isBoss)
        ? Math.round(
            enemy.maxHp *
              techMods.maxHpBonusRatio *
              (enemy.isBoss ? 0.12 : 0.3) *
              (sourceTower.type === 'autocannon' ? 0.35 : 1.0)
          )
        : 0;
    const maxGiantCap = Math.round(
      remainingRaw * Math.min(0.95, techMods.maxHpBonusRatio * 12)
    );
    const giantBonus = Math.min(maxGiantCap, rawGiant);`,
    'GameEngine bounded Giant-Slayer cap'
  );

  // Expose Formation Resonance & dynamic crystalProtocolCost in getSnapshot
  engSrc = replaceExact(
    engSrc,
    `          maxBulkOverclockCount: maxBulkOc,
          bulkOverclockCost: bulkOcSum,`,
    `          maxBulkOverclockCount: maxBulkOc,
          bulkOverclockCost: bulkOcSum,
          formationBonusPct: Math.max(0, Math.round((this.computeFormationResonance().mult - 1) * 100)),
          gridSyncLevel: this.computeFormationResonance().gridSyncLevel,
          deployedTowerCount: this.towers.size,`,
    'GameEngine getSnapshot formationBonusPct'
  );

  engSrc = replaceExact(
    engSrc,
    `      crystalProtocolCost: 5,`,
    `      crystalProtocolCost: this.getNextCrystalProtocolCost(),`,
    'GameEngine getSnapshot dynamic crystalProtocolCost'
  );

  fs.writeFileSync(engPath, engSrc, 'utf8');
}

// ============================================================================
// 5. Patch src/ui/UIManager.ts (Formation Resonance Badge & Thermal Cap Hint)
// ============================================================================
const uiPath = path.join(root, 'src/ui/UIManager.ts');
let uiSrc = fs.readFileSync(uiPath, 'utf8').replace(/\r\n/g, '\n');
if (!uiSrc.includes('formationBonusPct')) {
  uiSrc = replaceExact(
    uiSrc,
    `      if (lbl) lbl.textContent = cLv > 0 ? \`💎裂变+\${cLv}\` : '💎裂变';
    }`,
    `      const cst = supCrysBtn.querySelector('#cost-supply-crys');
      if (lbl) lbl.textContent = cLv > 0 ? \`💎裂变+\${cLv}\` : '💎裂变';
      if (cst) cst.textContent = \`\${cCost}💎\`;
    }`,
    'UIManager dynamic crystal protocol cost label'
  );

  uiSrc = replaceExact(
    uiSrc,
    `      const sig = \`inspect:\${tw.id}:t\${tw.tier}:oc\${ocLv}:br\${tw.branch ?? '0'}:pr\${prioKey}:k\${kCount}:d\${Math.floor(dTotal / 25)}:dmg\${tw.damage}:rng\${tw.range.toFixed(1)}:hg\${Boolean(tw.isHighGround)}:afford\${canAffordUpgrade}:ocAf\${canAffordOc}:ocBulk\${bulkOcN}:cost\${tw.upgradeCost}:brAf\${brAffordKey}:stun\${tw.isStunned}:od\${Boolean(tw.overdriven)}:au\${Boolean(tw.auraBoosted)}\`;`,
    `      const formPct = tw.formationBonusPct ?? 0;
      const syncLv = tw.gridSyncLevel ?? 0;
      const depCnt = tw.deployedTowerCount ?? 1;
      const sig = \`inspect:\${tw.id}:t\${tw.tier}:oc\${ocLv}:fm\${formPct}:sy\${syncLv}:dp\${depCnt}:br\${tw.branch ?? '0'}:pr\${prioKey}:k\${kCount}:d\${Math.floor(dTotal / 25)}:dmg\${tw.damage}:rng\${tw.range.toFixed(1)}:hg\${Boolean(tw.isHighGround)}:afford\${canAffordUpgrade}:ocAf\${canAffordOc}:ocBulk\${bulkOcN}:cost\${tw.upgradeCost}:brAf\${brAffordKey}:stun\${tw.isStunned}:od\${Boolean(tw.overdriven)}:au\${Boolean(tw.auraBoosted)}\`;`,
    'UIManager inspector signature with formationBonusPct'
  );

  uiSrc = replaceExact(
    uiSrc,
    `            <div class="up-btn-gain">
              伤害 +\${dmgGain} (×1.145) · 攻速/射程/穿甲持续突破
            </div>`,
    `            <div class="up-btn-gain">
              \${
                depCnt < 4 && ocLv >= 6
                  ? \`伤害 +\${dmgGain} · ⚠单塔过热衰减（部署三系6塔同步超频可激活阵列谐振）\`
                  : \`伤害 +\${dmgGain} · 6塔同步 Lv.\${syncLv}（阵列谐振 +\${formPct}%）\`
              }
            </div>`,
    'UIManager overclock button gain & anti-solo thermal hint'
  );

  uiSrc = replaceExact(
    uiSrc,
    `              \${tw.auraBoosted ? \`<span class="aura-chip">◈矩阵+15%攻速</span>\` : ''}`,
    `              \${tw.auraBoosted ? \`<span class="aura-chip">◈矩阵+15%攻速</span>\` : ''}
              \${formPct > 0 ? \`<span class="aura-chip" title="三系协同与多塔同步超频谐振加成">◈阵列谐振+\${formPct}%</span>\` : ''}`,
    'UIManager inspector header formation resonance chip'
  );

  fs.writeFileSync(uiPath, uiSrc, 'utf8');
}

// ============================================================================
// 6. Update .github/workflows/build-standalone.yml to run upgrade_v6_balance.mjs
// ============================================================================
const wfPath = path.join(root, '.github/workflows/build-standalone.yml');
if (fs.existsSync(wfPath)) {
  let wfSrc = fs.readFileSync(wfPath, 'utf8').replace(/\r\n/g, '\n');
  if (!wfSrc.includes('upgrade_v6_balance.mjs') && wfSrc.includes('upgrade_v5_endgame.mjs')) {
    wfSrc = wfSrc.replace(
      'node scripts/upgrade_v5_endgame.mjs',
      'node scripts/upgrade_v5_endgame.mjs\n      - run: node scripts/upgrade_v6_balance.mjs'
    );
    fs.writeFileSync(wfPath, wfSrc, 'utf8');
  }
}

console.log('[upgrade_v6_balance] All V6 Anti-Solo Overclock, Formation Resonance & Deep Endless Balance patches applied cleanly!');
