import assert from 'node:assert/strict';

export async function verifyEndgameBalance(page) {
  const formations = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    const originalTowers = game.towers;
    try {
      const setFormation = levels => {
        game.towers = new Map(levels.map((level, i) => [String(i), {
          type: ['autocannon', 'mortar', 'magnetic'][i % 3],
          tier: 4,
          overclockLevel: level,
        }]));
        return game.computeFormationResonance();
      };
      const solo = setFormation([50]);
      const soloDamage = game.computeTowerStatsForTier('autocannon', 4, false, 'A', 50).damage;
      const unsynced = setFormation([10, 10, 10, 10, 10]);
      const mixed = setFormation([10, 10, 10, 10, 10, 0]);
      const synced = setFormation([10, 10, 10, 10, 10, 10]);
      const syncedDamage = game.computeTowerStatsForTier('autocannon', 4, false, 'A', 10).damage;
      const extra = setFormation([10, 10, 10, 10, 10, 10, 0]);
      return { solo, soloDamage, unsynced, mixed, synced, syncedDamage, extra,
        soloCost: game.computeOverclockStepCost(50), distributedCost: game.computeOverclockStepCost(10) };
    } finally {
      game.towers = originalTowers;
    }
  });
  assert.equal(formations.solo.mult, 1, 'A lone tower cannot earn formation resonance');
  assert.equal(formations.unsynced.gridSyncLevel, 0, 'Five towers cannot activate six-tower synchronization');
  assert.equal(formations.mixed.gridSyncLevel, 0, 'One neglected tower prevents a six-tower grid from synchronizing');
  assert.equal(formations.synced.gridSyncLevel, 10);
  assert.equal(formations.extra.gridSyncLevel, 10, 'An additional unupgraded tower does not undo an established grid');
  assert.ok(formations.syncedDamage > formations.soloDamage,
    'A synchronized mixed defense makes each +10 cannon stronger than an isolated +50 cannon');
  assert.ok(formations.soloCost > 6 * formations.distributedCost,
    'Concentrating further upgrades on a +50 tower costs more than upgrading the distributed defense');

  const waves = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    const result = {};
    for (const wave of [11, 12, 20, 60]) {
      game.startNewMission(false);
      game.waveIndex = wave - 1;
      if (!game.startNextWave()) throw Error(`Unable to prepare endless wave ${wave}`);
      result[wave] = game.endlessActiveWaveConfig.groups;
    }
    game.startNewMission(false);
    return result;
  });
  assert.ok(waves[12].some(group => group.enemyType === 'swarm' && group.laneIndex === 1),
    'Later waves attack the northern lane with a dedicated fast swarm');
  const bosses = wave => waves[wave].filter(group => group.enemyType.startsWith('boss_'));
  assert.ok(bosses(20).some(group => group.laneIndex === 0) && bosses(20).some(group => group.laneIndex === 1),
    'Wave 20 applies boss pressure on both entrances');
  assert.ok(bosses(60).reduce((sum, group) => sum + group.count, 0) >= 3,
    'Deep endless waves increase the simultaneous boss threat');
  console.log('✓ V6 balance: distributed overclock, six-tower resonance, dual-lane raids and multi-boss waves verified');
}
