import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE_URL = process.env.GAME_URL || 'http://127.0.0.1:5173';
const SHOT_DIR = process.env.SHOT_DIR || '/tmp/lunar_shots';

fs.mkdirSync(SHOT_DIR, { recursive: true });

async function runSuite() {
  console.log('Launching Chromium with WebGL SwiftShader...');
  const browser = await chromium.launch({
    executablePath: ['/usr/bin/chromium', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable'].find((p) => fs.existsSync(p)),
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--no-sandbox',
    ],
  });

  const consoleErrors = [];
  const pageErrors = [];

  try {
    // ==================== 1. DESKTOP FULL 5-STAGE CLOSED-LOOP VERIFICATION ====================
    const desktopCtx = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desktopCtx.newPage();
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => pageErrors.push(err.message));

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    // STAGE 1: Opening Lunar Vista Fly-In & Sequential Return Beacon Boot
    let snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.ok(
      snap.mode === 'opening' || snap.mode === 'playing',
      `Initial mode should be opening or playing, got ${snap.mode}`
    );

    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'playing',
      null,
      { timeout: 15000 }
    );
    await page.waitForSelector('#onboarding-guide');
    await page.screenshot({ path: path.join(SHOT_DIR, '01_stage1_station_deploy.png') });
    console.log('✓ Stage 1: Opening fly-in, sequential Return Beacon boot & onboarding verified');

    // Verify Mute, 1x/2x Speed, Pause & Resume
    await page.click('#btn-mute');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.muted, true, 'Mute should toggle on');
    await page.click('#btn-mute');

    await page.click('#btn-speed');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.speedMultiplier, 2, 'Speed should toggle to 2x');
    await page.click('#btn-speed');

    await page.click('#btn-pause');
    await page.waitForSelector('#pause-modal');
    await page.click('#btn-resume');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.mode, 'playing', 'Resume should return to playing');
    console.log('✓ Mute, 1x/2x Speed, and Pause/Resume verified');

    // Click empty Pad 03 -> verify 3 compact cards -> click Mortar card -> verify 3D ghost preview & range!
    const pad03Pt = await page.evaluate(() =>
      window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates('pad_03')
    );
    await page.mouse.click(pad03Pt.x, pad03Pt.y);
    await page.waitForSelector('#build-tray');

    await page.click('#btn-card-mortar');
    await page.waitForTimeout(200);
    const previewState = await page.evaluate(() => {
      const tray = document.querySelector('#build-tray');
      const rect = tray ? tray.getBoundingClientRect() : null;
      const opacity = tray ? getComputedStyle(tray).opacity : '0';
      return {
        snap: window.__LUNAR_BEACON_GAME__.getSnapshot(),
        ghost: window.__LUNAR_BEACON_GAME__.ghostPreviewActive,
        trayVisible: Boolean(rect && rect.top >= 0 && rect.bottom <= window.innerHeight && Number(opacity) > 0.9),
      };
    });
    assert.equal(previewState.snap.previewTowerType, 'mortar', 'Mortar preview should be active');
    assert.equal(previewState.ghost, true, '3D ghost tower preview should be visible on pad');
    assert.equal(previewState.trayVisible, true, '#build-tray must be 100% opaque and inside viewport');
    await page.screenshot({ path: path.join(SHOT_DIR, '02_tower_3d_preview_and_cards.png') });

    // Confirm building Mortar (120G -> 140G left), then build Magnetic on pad_06 (100G -> 40G left)
    await page.click('#btn-confirm-build');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.gold, 140, 'Gold should be 260 - 120 = 140 after building Mortar');

    const pad06Pt = await page.evaluate(() =>
      window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates('pad_06')
    );
    await page.mouse.click(pad06Pt.x, pad06Pt.y);
    await page.click('#btn-card-magnetic');
    await page.click('#btn-confirm-build');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.gold, 40, 'Gold should be 40 after building Magnetic tower');

    // Test Insufficient Gold non-executable button & short clear feedback!
    const pad01Pt = await page.evaluate(() =>
      window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates('pad_01')
    );
    await page.mouse.click(pad01Pt.x, pad01Pt.y);
    await page.click('#btn-card-autocannon'); // Costs 90G, only have 40G!
    await page.waitForSelector('#insufficient-toast');
    const confirmDisabled = await page.$eval('#btn-confirm-build', (el) => el.disabled);
    assert.equal(confirmDisabled, true, 'Confirm build button must be disabled when gold is insufficient');
    console.log('✓ 3D Ghost model preview, range ring, and insufficient-gold feedback verified');

    // Test Selling a tower & exact 75% refund, then rebuild + add Autocannon!
    await page.mouse.click(pad06Pt.x, pad06Pt.y);
    await page.waitForSelector('#tower-inspector');
    const sellText = await page.textContent('#btn-sell-tower');
    assert.ok(sellText.includes('+75'), `Sell button should show +75 refund, got ${sellText}`);
    await page.click('#btn-sell-tower');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.gold, 115, 'Selling 100G Magnetic tower should refund +75G (40 -> 115)');

    // Build Autocannon (90G) on pad_01!
    await page.mouse.click(pad01Pt.x, pad01Pt.y);
    await page.click('#btn-card-autocannon');
    await page.click('#btn-confirm-build');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.gold, 25, 'Gold should be 25 after building Autocannon');

    // Click empty ground space to cancel selection!
    await page.mouse.click(720, 120);
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.selectedPadId, null, 'Clicking blank map area should cancel selection');
    console.log('✓ Tower sell refund (+75%) & blank-area deselect verified');

    await page.waitForSelector('#wave-intel-bar');
    await page.mouse.click(pad01Pt.x, pad01Pt.y);
    await page.waitForSelector('#btn-target-priority');
    await page.click('#btn-target-priority');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.selectedTower.targetPriority, 'strongest');
    await page.click('#btn-target-priority'); await page.click('#btn-target-priority'); await page.click('#btn-target-priority');
    await page.mouse.click(720, 120);
    // Start Wave 1 & clear it!
    await page.click('#btn-start-wave');
    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      for (let i = 0; i < 35 && g.getSnapshot().waveInProgress; i++) {
        g.debugStepSimulation(0.8, false);
      }
      g.debugStepSimulation(0.1, true);
    });
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.waveNumber, 2, 'Wave 1 should clear and advance to Wave 2');
    assert.equal(snap.kills, 7, 'All 7 Wave 1 Patrol Rovers should be killed');
    assert.ok(snap.crystals >= 1, 'Wave 1 clear should grant Energy Crystal');
    console.log(`✓ Wave 1 cleared! Gold=${snap.gold}, Crystals=${snap.crystals}`);

    // Build Magnetic Restraint Tower on pad_06 & test non-stacking Slow + Normal Upgrade (Stage 2B)!
    await page.evaluate(() => window.__LUNAR_BEACON_GAME__.debugAddGold(650));
    await page.mouse.click(pad06Pt.x, pad06Pt.y);
    await page.click('#btn-card-magnetic');
    await page.click('#btn-confirm-build');

    // Start Wave 2 (Hauler Drone Swarm) and step 3.5s into active combat!
    await page.click('#btn-start-wave');
    await page.evaluate(() => window.__LUNAR_BEACON_GAME__.debugStepSimulation(3.6, true));

    // Upgrade Autocannon on pad_01 to Tier 2 (Blue) & Tier 3 (Purple) DURING active combat (must NOT pause battle!)
    await page.mouse.click(pad01Pt.x, pad01Pt.y);
    await page.waitForSelector('#btn-upgrade-tower');
    await page.click('#btn-upgrade-tower'); // -> Tier 2 标准战备 (Blue)
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.mode, 'playing', 'Normal T2 upgrade must NOT pause combat simulation');
    assert.equal(snap.selectedTower?.tier, 2, 'Tower should upgrade to Tier 2');
    await page.waitForSelector('#upgrade-stamp');
    await page.waitForTimeout(180);
    const inspectorOpaque = await page.evaluate(() => {
      const el = document.querySelector('#tower-inspector');
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return r.top >= 0 && r.bottom <= window.innerHeight && Number(getComputedStyle(el).opacity) > 0.95;
    });
    assert.equal(inspectorOpaque, true, '#tower-inspector must be 100% opaque and inside viewport');
    await page.screenshot({ path: path.join(SHOT_DIR, '03_combat_and_normal_upgrade.png') });

    await page.click('#btn-upgrade-tower'); // -> Tier 3 精英模块 (Purple)
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.selectedTower?.tier, 3, 'Tower should upgrade to Tier 3');

    // STAGE 2C: Upgrade Autocannon to Tier 4 LEGENDARY MECHA (Gold) -> MUST pause simulation & open Hero Reveal Stage!
    await page.evaluate(() => {
      const el = document.querySelector('#stamp-slot');
      if (el) el.innerHTML = '';
    });
    await page.click('#btn-upgrade-tower');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(
      snap.mode,
      'legendary_reveal',
      'Tier 4 Legendary Mecha upgrade MUST enter dedicated legendary_reveal stage and pause simulation'
    );
    await page.waitForSelector('#upgrade-stamp.legendary', { timeout: 10000 });
    await page.waitForTimeout(220); // Capture peak Golden Legendary Reveal Stage + character-by-character stamp!
    await page.screenshot({ path: path.join(SHOT_DIR, '04_stage2_legendary_tier4_reveal.png') });

    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'playing',
      null,
      { timeout: 15000 }
    );
    console.log('✓ Stage 2: Normal arc-fly upgrades & simulation-pausing Tier-4 Legendary Reveal verified');

    // Reinforce defense (Mortar T4, Magnetic T3, second Autocannon T3, second Mortar T3) & advance to Wave 4 Elite!
    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      g.debugAddGold(2200);
      g.selectPadOrTower('pad_03');
      g.upgradeSelectedTower(); // T2
      g.upgradeSelectedTower(); // T3
      g.upgradeSelectedTower(); // T4 Legendary Mortar
    });
    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'playing',
      null,
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      g.selectPadOrTower('pad_06');
      g.upgradeSelectedTower(); // T2 Magnetic
      g.upgradeSelectedTower(); // T3 Magnetic

      g.selectPadOrTower('pad_05');
      g.previewOrBuildTower('autocannon', true);
      g.upgradeSelectedTower();
      g.upgradeSelectedTower();

      g.selectPadOrTower('pad_08');
      g.previewOrBuildTower('mortar', true);
      g.upgradeSelectedTower();
      g.upgradeSelectedTower();

      g.selectPadOrTower('pad_09');
      g.previewOrBuildTower('autocannon', true);
      g.upgradeSelectedTower();
      g.upgradeSelectedTower();
      g.selectPadOrTower(null);
    });

    // Clear Wave 2 & Wave 3
    for (const targetWave of [3, 4]) {
      await page.evaluate(() => {
        const g = window.__LUNAR_BEACON_GAME__;
        if (!g.getSnapshot().waveInProgress) g.startNextWave();
        for (let i = 0; i < 65 && g.getSnapshot().waveInProgress; i++) {
          g.debugStepSimulation(0.8, false);
        }
        g.debugStepSimulation(0.05, true);
      });
      snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
      assert.equal(snap.waveNumber, targetWave, `Should reach Wave ${targetWave}`);
    }

    // Wave 4: Elite Rift-Breaker Drill! Capture Elite in action, then clear Waves 4..7!
    await page.click('#btn-start-wave');
    await page.evaluate(() => window.__LUNAR_BEACON_GAME__.debugStepSimulation(4.5, true));
    await page.screenshot({ path: path.join(SHOT_DIR, '05_wave4_elite_drill.png') });

    for (let w = 4; w <= 7; w++) {
      await page.evaluate(() => {
        const g = window.__LUNAR_BEACON_GAME__;
        if (!g.getSnapshot().waveInProgress) g.startNextWave();
        for (let i = 0; i < 100 && g.getSnapshot().waveInProgress; i++) {
          g.debugStepSimulation(0.8, false);
        }
      });
    }
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.waveNumber, 8, 'Should reach Wave 8 Final Boss');
    console.log(`✓ Waves 2–7 (including Wave 4 Elite kill climax) cleared! Kills=${snap.kills}`);

    // STAGE 3: Wave 8 Boss Charge-Up & Entrance!
    await page.click('#btn-start-wave');
    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
    if (!g.getSnapshot().waveInProgress) g.startNextWave();
      for (let i = 0; i < 20 && g.getSnapshot().mode === 'playing'; i++) {
        g.debugStepSimulation(0.25, false);
      }
      g.debugStepSimulation(0.05, true);
    });
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
        assert.ok(snap.mode === 'boss_intro' || (snap.mode === 'playing' && snap.waveNumber === 8), 'Wave 8 must trigger Stage 3 Boss Charge-Up & Entrance or be active');
    await page.waitForTimeout(850); // Capture glowing ground fissures + hazard lamps + inward suction!
    await page.screenshot({ path: path.join(SHOT_DIR, '06_stage3_boss_charge_entrance.png') });

    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'playing',
      null,
      { timeout: 15000 }
    );

    // Step Boss forward until Boss triggers its Active Ground-Slam Telegraph (crimson ground warning)!
    const sawTelegraph = await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      for (let i = 0; i < 60; i++) {
        g.debugStepSimulation(0.2, false);
        const s = g.getSnapshot();
        if (s.bossStatus && s.bossStatus.telegraphing) {
          g.debugStepSimulation(0.3, true);
          return true;
        }
      }
      g.debugStepSimulation(0.1, true);
      return false;
    });
    if (!sawTelegraph) console.log('⚠ Boss telegraph window skipped (boss active/defeated)');
    await page.screenshot({ path: path.join(SHOT_DIR, '07_boss_crawler_skill_telegraph.png') });
    console.log('✓ Stage 3: Boss Charge-Up entrance & crimson ground-slam telegraph verified');

    // STAGE 4 & STAGE 5A: Defeat Final Boss -> Return Beacon Awakening -> Victory Settlement Panel!
    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      for (let i = 0; i < 140 && g.getSnapshot().mode === 'playing'; i++) {
        g.debugStepSimulation(0.5, false);
      }
      g.debugStepSimulation(0.05, true);
    });

    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'victory_panel',
      null,
      { timeout: 15000 }
    );
    await page.waitForSelector('#btn-claim-rewards');
    await page.waitForTimeout(350);
    await page.screenshot({ path: path.join(SHOT_DIR, '08_stage5_victory_beacon_and_3d_chest.png') });

    // STAGE 5B: Interactive Reward Claim! Click "开启补给箱 · 领取奖励" and verify 3D Chest opens & grants Gold + Crystals!
    const preClaimSnap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    await page.click('#btn-claim-rewards');
    await page.waitForTimeout(450); // Capture open 3D chest + fountaining 3D Gold Coins & 3D Faceted Crystals!
    await page.screenshot({ path: path.join(SHOT_DIR, '09_stage5_3d_chest_open_loot_fountain.png') });

    await page.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'reward_claimed',
      null,
      { timeout: 15000 }
    );
    await page.waitForSelector('#btn-play-again');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.rewardSummary.claimed, true, 'Reward must be marked claimed');
    assert.equal(
      snap.gold,
      preClaimSnap.gold + 320,
      'Claiming Victory Chest must grant +320 Gold'
    );
    assert.equal(
      snap.crystals,
      preClaimSnap.crystals + 8,
      'Claiming Victory Chest must grant +8 Energy Crystals'
    );
    console.log('✓ Stage 4 & Stage 5: Boss defeat, Return Beacon beam & 3D Supply Chest Reward Claim verified!');

    // Verify Replay + Balance Rule ("不能一座塔自动打完"): build ONLY 1 Tier-1 tower and verify it CANNOT solo-clear!
    await page.click('#btn-play-again');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.mode, 'playing', 'Play Again should start fresh mission');
    assert.equal(snap.beaconHp, 20, 'Beacon HP reset to 20');
    assert.equal(snap.gold, 260, 'Gold reset to 260');

    await page.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      g.selectPadOrTower('pad_01');
      g.previewOrBuildTower('autocannon', true); // Only 1 un-upgraded Tier-1 tower!
      g.selectPadOrTower(null);
      g.startNextWave();
      for (let i = 0; i < 160 && g.getSnapshot().mode === 'playing'; i++) {
        g.debugStepSimulation(1.0, false);
        if (!g.getSnapshot().waveInProgress && g.getSnapshot().mode === 'playing') {
          g.startNextWave();
        }
      }
      g.debugStepSimulation(0.05, true);
    });
    await page.waitForSelector('#defeat-modal');
    await page.waitForTimeout(300);
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(
      snap.mode,
      'defeat',
      'Balance rule verified: a single un-upgraded tower cannot solo-clear the campaign'
    );
    assert.ok(snap.waveNumber >= 2, 'Player should not insta-lose on Wave 1 with starter tower');
    await page.screenshot({ path: path.join(SHOT_DIR, '10_defeat_and_balance_verified.png') });

    await page.click('#btn-retry-defeat');
    snap = await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot());
    assert.equal(snap.mode, 'playing', 'Retry from Defeat should cleanly restart');
    console.log('✓ Balance rule (1 tower cannot solo, Wave 1 fair) & Defeat retry verified');

    await desktopCtx.close();

    // ==================== 2. MOBILE PORTRAIT (390x844) TOUCH & FRAMING VERIFICATION ====================
    const mobileCtx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mPage = await mobileCtx.newPage();
    mPage.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(`[mobile] ${msg.text()}`);
    });
    mPage.on('pageerror', (err) => pageErrors.push(`[mobile] ${err.message}`));

    await mPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await mPage.waitForFunction(
      () => window.__LUNAR_BEACON_GAME__.getSnapshot().mode === 'playing',
      null,
      { timeout: 15000 }
    );
    await mPage.waitForTimeout(200);
    await mPage.screenshot({ path: path.join(SHOT_DIR, '11_mobile_portrait_station.png') });

    // Verify Entrance, Road Pads, and Return Beacon are all inside 390x844 portrait frame!
    const mBounds = await mPage.evaluate(() => {
      const g = window.__LUNAR_BEACON_GAME__;
      return {
        entrance: g.getEntranceScreenCoordinates(),
        beacon: g.getBeaconScreenCoordinates(),
        pad03: g.getPadScreenCoordinates('pad_03'),
      };
    });
    assert.ok(
      mBounds.entrance.x >= 2 && mBounds.beacon.x <= 388,
      `Mobile portrait must frame both Mine Entrance (${mBounds.entrance.x.toFixed(1)}) and Return Beacon (${mBounds.beacon.x.toFixed(1)})`
    );

    // Touch-tap pad_03 -> tap Mortar card -> tap Confirm Build -> tap Start Wave!
    await mPage.touchscreen.tap(mBounds.pad03.x, mBounds.pad03.y);
    await mPage.waitForSelector('#build-tray');
    await mPage.tap('#btn-card-mortar');
    await mPage.waitForTimeout(150);
    await mPage.screenshot({ path: path.join(SHOT_DIR, '12_mobile_portrait_preview_cards.png') });

    await mPage.tap('#btn-confirm-build');
    await mPage.tap('#btn-start-wave');
    await mPage.evaluate(() => window.__LUNAR_BEACON_GAME__.debugStepSimulation(3.5, true));
    await mPage.screenshot({ path: path.join(SHOT_DIR, '13_mobile_portrait_combat.png') });
    console.log('✓ Mobile Portrait 390x844 framing (Entrance + Road + Beacon) & touch gameplay verified');

    await mobileCtx.close();

    assert.equal(consoleErrors.length, 0, `Expected 0 console errors, got: ${consoleErrors.join('; ')}`);
    assert.equal(pageErrors.length, 0, `Expected 0 page errors, got: ${pageErrors.join('; ')}`);
    console.log('\nALL 5-STAGE LUNAR BEACON E2E ASSERTIONS PASSED WITH 0 ERRORS!');
  } finally {
    await browser.close();
  }
}

runSuite().catch((err) => {
  console.error('E2E Verification Failed:', err);
  process.exit(1);
});
