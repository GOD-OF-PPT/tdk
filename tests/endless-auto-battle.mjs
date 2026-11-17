import assert from 'node:assert/strict';

export async function verifyEndlessAutoBattle(page, { mobile = false, screenshotPath } = {}) {
  const snapshot = () => page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
  const click = selector => mobile ? page.tap(selector) : page.click(selector);

  assert.equal(await page.locator('#btn-auto-battle').count(), 0, 'Campaigns keep manual wave controls');
  await click('#btn-open-hub');
  if (!(await snapshot()).progression.unlockAllSandbox) await click('#btn-toggle-unlock-all');
  await click('#stage-node-endless');
  await click('#btn-launch-stage');
  await page.waitForSelector('#btn-auto-battle');
  let state = await snapshot();
  assert.equal(state.isEndless, true);
  assert.equal(state.autoBattleEnabled, false, 'New endless missions start with auto battle off');
  assert.equal(state.waveInProgress, false);
  assert.equal(await page.locator('#btn-auto-battle').getAttribute('aria-pressed'), 'false');

  if (mobile) {
    for (const selector of ['#btn-auto-battle', '#btn-start-wave']) {
      const rect = await page.locator(selector).boundingBox();
      const viewport = page.viewportSize();
      assert.ok(rect && rect.x >= 0 && rect.y >= 0 && rect.x + rect.width <= viewport.width && rect.y + rect.height <= viewport.height,
        `${selector} stays inside the mobile viewport`);
    }
  } else {
    // Existing resource/debug APIs prepare defenses; wave spawning and combat stay real.
    await page.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.debugAddGold(30000);
      const types = ['autocannon', 'mortar', 'autocannon', 'mortar', 'magnetic', 'mortar',
        'autocannon', 'mortar', 'magnetic', 'mortar', 'autocannon', 'mortar'];
      types.forEach((type, index) => {
        game.selectPadOrTower(`ex_pad_${String(index + 1).padStart(2, '0')}`);
        game.previewOrBuildTower(type, true);
        game.upgradeSelectedTower();
        game.upgradeSelectedTower();
      });
      game.selectPadOrTower(null);
    });
  }

  const speedBeforeToggle = state.speedMultiplier;
  if (mobile) {
    await click('#btn-auto-battle');
  } else {
    await page.focus('#btn-auto-battle');
    await page.keyboard.press('Space');
  }
  await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__.getSnapshot().waveInProgress);
  state = await snapshot();
  assert.equal(state.autoBattleEnabled, true);
  assert.equal(state.waveNumber, 1);
  assert.equal(await page.locator('#btn-auto-battle').getAttribute('aria-pressed'), 'true');
  if (!mobile) {
    assert.equal(await page.evaluate(() => document.activeElement?.id), 'btn-auto-battle',
      'Auto wave start preserves keyboard focus on the toggle');
  }
  if (screenshotPath) await page.screenshot({ path: screenshotPath });
  if (mobile) await click('#btn-auto-battle');
  else await page.keyboard.press('Space');
  state = await snapshot();
  assert.equal(state.autoBattleEnabled, false);
  assert.equal(state.speedMultiplier, speedBeforeToggle, 'Space activates the button without triggering the global speed shortcut');
  assert.equal(state.waveInProgress, true, 'Turning auto off does not interrupt the current wave');

  if (mobile) return;

  state = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    for (let i = 0; i < 240 && game.getSnapshot().waveInProgress; i++) game.debugStepSimulation(.5, false);
    game.debugStepSimulation(1, false);
    return game.getSnapshot();
  });
  assert.equal(state.mode, 'playing');
  assert.equal(state.waveNumber, 2);
  assert.equal(state.waveInProgress, false, 'Auto off leaves the next wave waiting');

  await click('#btn-auto-battle');
  state = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    for (let i = 0; i < 480 && game.getSnapshot().waveNumber < 4 && game.getSnapshot().mode === 'playing'; i++) {
      game.debugStepSimulation(.5, false);
    }
    return game.getSnapshot();
  });
  assert.equal(state.mode, 'playing');
  assert.equal(state.waveNumber, 4, 'Auto battle advances consecutive waves without another click');
  assert.equal(state.autoBattleEnabled, true);

  await click('#btn-pause');
  await click('#btn-restart-pause');
  state = await snapshot();
  assert.equal(state.autoBattleEnabled, false, 'Restart cancels the previous auto battle session');
  assert.equal(state.waveInProgress, false);
  assert.equal(state.waveNumber, 1);

  state = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    game.togglePause();
    game.toggleAutoBattle();
    game.debugStepSimulation(2, false);
    return game.getSnapshot();
  });
  assert.equal(state.mode, 'paused');
  assert.equal(state.autoBattleEnabled, true);
  assert.equal(state.waveInProgress, false, 'Auto battle waits while paused');
  await click('#btn-resume');
  await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__.getSnapshot().waveInProgress);

  await page.evaluate(() => window.__LUNAR_BEACON_GAME__.startNewMission(false));
  await click('#btn-open-hub');
  const hub = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    game.toggleAutoBattle();
    const manualStart = game.startNextWave();
    game.debugStepSimulation(2, false);
    return { manualStart, state: game.getSnapshot() };
  });
  assert.equal(hub.manualStart, false, 'Opening the hub blocks all wave-start commands');
  assert.equal(hub.state.autoBattleEnabled, true);
  assert.equal(hub.state.waveInProgress, false, 'Auto battle waits behind the hub overlay');
  await click('#btn-close-hub');
  await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__.getSnapshot().waveInProgress);

  state = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    for (let i = 0; i < 240 && game.getSnapshot().mode === 'playing'; i++) game.debugStepSimulation(1, false);
    game.debugStepSimulation(1, false);
    return game.getSnapshot();
  });
  assert.equal(state.mode, 'defeat', 'Undefended endless combat reaches the actual defeat flow');
  assert.equal(state.autoBattleEnabled, false, 'Defeat turns auto battle off');
  assert.equal(state.waveInProgress, false);
  await click('#btn-retry-defeat');
  state = await snapshot();
  assert.equal(state.autoBattleEnabled, false);
  assert.equal(state.waveInProgress, false, 'Retry waits for a fresh player command');

  await click('#btn-auto-battle');
  await click('#btn-open-hub');
  await click('#stage-node-stage_01');
  await click('#btn-launch-stage');
  state = await page.evaluate(() => {
    const game = window.__LUNAR_BEACON_GAME__;
    const enabled = game.toggleAutoBattle();
    game.debugStepSimulation(.2, false);
    return { enabled, state: game.getSnapshot() };
  });
  assert.equal(state.enabled, false, 'Campaigns reject enabling auto battle');
  assert.equal(state.state.autoBattleEnabled, false);
  assert.equal(state.state.waveInProgress, false, 'Switching stages cannot carry over an auto start');
  assert.equal(await page.locator('#btn-auto-battle').count(), 0);
}
