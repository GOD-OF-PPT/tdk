import assert from 'node:assert/strict';

export const RANKING_BASE = 'https://ranking-api-production-a8ed42bc.up.railway.app';
const IDENTITY_KEY = `ranking:v1:${RANKING_BASE}:tdk`;
const PENDING_KEY = 'lunar_beacon_ranking_pending_v1:tdk:endless';

export async function completePlayerSetup(page, name = '自动验收指挥官') {
  await page.waitForFunction(() => document.querySelector('#player-name-modal') || window.__LUNAR_BEACON_GAME__);
  if (await page.locator('#player-name-modal').count()) {
    await page.fill('#player-name-input', name);
    await page.click('#btn-save-player-name');
  }
  await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
}

export async function installRankingMock(context, { entries = [] } = {}) {
  const state = { sessions: 0, submissions: [], reads: [], entry: null, failScores: false, failTop: false, rateLimit: false, topDelay: 0, sessionGate: null, scoreGate: null };
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
  await context.route(`${RANKING_BASE}/**`, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const send = (status, body) => route.fulfill({ status, headers: cors, contentType: 'application/json', body: JSON.stringify(body) });
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
    if (url.pathname.endsWith('/sessions')) {
      state.sessions++;
      if (state.sessionGate) await state.sessionGate;
      return send(201, { playerId: 'guest-test-player', token: 'test-token', expiresAt: Math.floor(Date.now() / 1000) + 86400 });
    }
    if (url.pathname.endsWith('/scores')) {
      const payload = request.postDataJSON();
      state.submissions.push(payload);
      assert.equal(request.headers().authorization, 'Bearer test-token');
      assert.equal(typeof payload.username, 'string');
      for (const field of ['score', 'kills', 'duration']) assert.ok(Number.isFinite(payload.metrics[field]));
      assert.equal('playerId' in payload, false);
      if (state.scoreGate) await state.scoreGate;
      if (state.failScores) return send(state.rateLimit ? 429 : 503, { code: 'TEST_UNAVAILABLE', message: '暂时无法连接排行榜' });
      const old = state.entry?.metrics, next = payload.metrics;
      const accepted = !old || next.score > old.score || (next.score === old.score && (next.kills > old.kills || (next.kills === old.kills && next.duration < old.duration)));
      if (accepted) state.entry = { ...payload, rank: entries.length ? 21 : 1, playerId: 'guest-test-player', achievedAt: new Date().toISOString() };
      return send(200, { accepted, playerId: 'guest-test-player', message: accepted ? '成绩已记录' : '保留最好成绩' });
    }
    if (url.pathname.includes('/players/')) return state.entry ? send(200, { entry: state.entry }) : send(404, { code: 'PLAYER_NOT_RANKED', message: '尚未上榜' });
    if (url.pathname.endsWith('/boards/endless')) {
      state.reads.push(Number(url.searchParams.get('offset') || 0));
      if (state.topDelay) await new Promise(resolve => setTimeout(resolve, state.topDelay));
      if (state.failTop) return send(state.rateLimit ? 429 : 503, { code: 'TEST_UNAVAILABLE', message: '暂时无法连接排行榜' });
      const rows = entries.length ? entries : state.entry ? [state.entry] : [];
      const offset = Number(url.searchParams.get('offset') || 0);
      return send(200, { entries: rows.slice(offset, offset + 20), total: rows.length, limit: 20, offset });
    }
    return send(404, { code: 'NOT_FOUND', message: 'Unexpected test URL' });
  });
  return state;
}

export async function verifyLeaderboard(browser, baseUrl, shotDir) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const rows = Array.from({ length: 21 }, (_, index) => ({
    rank: index === 1 ? 1 : index + 1, playerId: `guest-fixture-${index}`,
    username: index === 2 ? '<img src=x onerror="window.__rankingXss=1">' : `指挥官 ${index + 1}`,
    metrics: { score: index < 2 ? 100 : 100 - index, kills: 200, duration: 120 }, achievedAt: '2026-11-17T00:00:00.000Z',
  }));
  const mock = await installRankingMock(context, { entries: rows });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
    assert.equal(await page.locator('#player-name-modal').count(), 0, 'First-time players can play without registration');
    await page.evaluate(() => window.__LUNAR_BEACON_GAME__.startNewMission(false));
    await page.click('#btn-open-hub');
    await page.click('#hub-tab-btn-ranking');
    assert.ok((await page.locator('#hub-panel-ranking').innerText()).includes('待解锁'));
    assert.equal(await page.locator('.ranking-table').count(), 0);
    assert.equal(mock.reads.length, 0);
    assert.equal(mock.sessions, 0);
    await page.click('#btn-close-hub');
    mock.failScores = true;
    const failure = await page.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.launchStage('endless', false);
      game.toggleAutoBattle();
      for (let i = 0; i < 240 && game.getSnapshot().mode === 'playing'; i++) game.debugStepSimulation(1, false);
      return game.getSnapshot();
    });
    assert.equal(failure.mode, 'defeat');
    await page.waitForSelector('#player-name-input');
    await page.screenshot({ path: `${shotDir}/18_player_registration.png` });
    assert.equal(mock.sessions, 0, 'The first defeat waits for a name before requesting a remote identity');
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForSelector('#player-name-input');
    assert.equal(mock.sessions, 0, 'Registration survives refresh without sending an unnamed result');
    await page.fill('#player-name-input', '   ');
    await page.click('#btn-save-player-name');
    await page.waitForFunction(() => document.querySelector('#player-name-error').textContent.length > 0);
    await completePlayerSetup(page, '  星海指挥官  ');
    await page.waitForSelector('#hub-panel-ranking');
    await page.waitForSelector('#btn-retry-ranking:not([disabled])');
    assert.equal(await page.evaluate(() => localStorage.getItem('lunar_beacon_player_name_v1')), '星海指挥官');
    assert.equal(mock.sessions, 1);
    assert.equal(mock.submissions[0].metrics.score, failure.waveNumber - 1, 'Only completed waves are submitted');
    assert.ok(await page.evaluate(key => localStorage.getItem(key), PENDING_KEY));
    mock.failScores = false;
    await page.click('#btn-retry-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('成绩已记录'));
    assert.equal(await page.evaluate(key => localStorage.getItem(key), PENDING_KEY), null);
    assert.ok((await page.locator('#ranking-my-entry').innerText()).includes('21'));
    const identity = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).playerId, IDENTITY_KEY);
    await page.waitForFunction(() => !document.querySelector('#btn-refresh-ranking').disabled);
    assert.equal(await page.locator('.ranking-table tbody tr').count(), 20);
    assert.deepEqual(await page.locator('.ranking-rank').allTextContents().then(values => values.slice(0, 3)), ['1', '1', '3']);
    assert.equal(await page.locator('.ranking-table img').count(), 0);
    assert.equal(await page.evaluate(() => window.__rankingXss), undefined);
    await page.click('#btn-ranking-next');
    await page.waitForFunction(() => document.querySelector('.ranking-rank')?.textContent === '21');
    assert.ok(mock.reads.includes(20));
    await page.click('#btn-ranking-prev');
    await page.waitForFunction(() => document.querySelector('.ranking-rank')?.textContent === '1');
    await page.screenshot({ path: `${shotDir}/16_leaderboard_desktop.png` });
    mock.topDelay = 250;
    await page.click('#btn-refresh-ranking');
    await page.click('#btn-close-hub');
    await page.waitForTimeout(350);
    assert.equal(await page.locator('#sector-hub-modal').count(), 0, 'Late responses do not reopen a closed hub');
    mock.topDelay = 0;
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
    assert.equal(await page.locator('#player-name-modal').count(), 0, 'Returning registered players are not prompted again');
    assert.equal(await page.evaluate(key => JSON.parse(localStorage.getItem(key)).playerId, IDENTITY_KEY), identity);
    await page.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.launchStage('endless', false); game.startNextWave(); game.debugStepSimulation(1, false); game.startNewMission(false);
    });
    await page.click('#btn-open-hub');
    await page.click('#hub-tab-btn-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('保留历史最好'));
    assert.equal(mock.sessions, 1);
    await page.click('#btn-edit-player-name');
    await page.fill('#player-name-input', '<b>新指挥官</b>');
    await page.click('#btn-save-player-name');
    assert.equal(await page.locator('#ranking-player-name').innerText(), '<b>新指挥官</b>');
    assert.equal(await page.locator('#ranking-player-name b').count(), 0);
    mock.failTop = true; mock.rateLimit = true;
    await page.click('#btn-refresh-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-error')?.textContent.includes('频繁'));
    await page.click('#btn-close-hub');
    assert.equal((await page.evaluate(() => window.__LUNAR_BEACON_GAME__.getSnapshot())).mode, 'playing');
    mock.failTop = false; mock.rateLimit = false;
    await page.setViewportSize({ width: 390, height: 844 });
    await page.click('#btn-open-hub');
    await page.click('#hub-tab-btn-ranking');
    await page.waitForFunction(() => !document.querySelector('#btn-refresh-ranking').disabled);
    const bounds = await page.locator('#hub-panel-ranking').boundingBox();
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390);
    assert.ok(await page.locator('#btn-close-hub').isVisible());
    await page.screenshot({ path: `${shotDir}/17_leaderboard_mobile.png` });
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({ path: `${shotDir}/leaderboard-failure.png` }).catch(() => {});
    throw error;
  } finally { await context.close(); }
}

export async function verifyRankingClientResilience(browser, baseUrl) {
  const context = await browser.newContext();
  const mock = await installRankingMock(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  try {
    let releaseSession;
    mock.sessionGate = new Promise(resolve => { releaseSession = resolve; });
    await context.addInitScript(() => {
      localStorage.setItem('lunar_beacon_player_name_v1', '缓存指挥官');
      localStorage.setItem('lunar_beacon_ranking_first_defeat_v1', '1');
      localStorage.setItem('ranking:v1:https://ranking-api-production-a8ed42bc.up.railway.app:tdk', '{damaged-json');
      localStorage.setItem('lunar_beacon_ranking_pending_v1', JSON.stringify({ username: '缓存指挥官', run: {
        runId: 'cached-run', completedWaves: 0, kills: 0, duration: 10,
        maxOverclock: 0, arsenalLevel: 0, crystalProtocolLevel: 0,
      } }));
    });
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
    await page.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.launchStage('endless', false); game.startNextWave(); game.debugStepSimulation(.5, false); game.startNewMission(false);
    });
    await page.waitForFunction(() => localStorage.getItem('lunar_beacon_ranking_pending_v1:tdk:endless'));
    assert.equal(mock.sessions, 1, 'A cached score and a new result share one in-flight identity request');
    assert.equal(mock.submissions.length, 0);
    releaseSession();
    await page.click('#btn-open-hub');
    await page.click('#hub-tab-btn-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('成绩已记录') && !document.querySelector('#btn-retry-ranking'));
    assert.equal(mock.sessions, 1);
    assert.equal(mock.submissions.length, 2);
    assert.equal(mock.submissions.at(-1).metrics.duration, .5, 'The better result queued during upload is not lost');
    assert.equal(await page.evaluate(() => localStorage.getItem('lunar_beacon_ranking_pending_v1')), null);
    await page.click('#btn-close-hub');

    const scoresUrl = `${RANKING_BASE}/api/v1/games/tdk/boards/endless/scores`;
    const headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
    await context.route(scoresUrl, route => route.request().method() === 'OPTIONS'
      ? route.fulfill({ status: 204, headers })
      : route.fulfill({ status: 401, contentType: 'application/json', headers, body: JSON.stringify({ code: 'UNAUTHORIZED', message: '身份失效' }) }));
    await page.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.startNextWave(); game.debugStepSimulation(.25, false); game.startNewMission(false);
    });
    await page.click('#btn-open-hub');
    await page.click('#hub-tab-btn-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('身份'));
    assert.ok(await page.evaluate(() => localStorage.getItem('lunar_beacon_ranking_pending_v1:tdk:endless')));
    assert.equal(mock.sessions, 1, '401 does not silently replace a valid cached player identity');
    await context.unroute(scoresUrl);
    await page.click('#btn-retry-ranking');
    await page.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('成绩已记录'));
    assert.equal(mock.sessions, 1);
    assert.deepEqual(errors, []);
  } finally { await context.close(); }

  const progressive = await browser.newContext();
  await progressive.addInitScript(() => {
    localStorage.setItem('lunar_beacon_player_name_v1', '并发指挥官');
    localStorage.setItem('lunar_beacon_ranking_first_defeat_v1', '1');
  });
  const progressiveMock = await installRankingMock(progressive);
  let releaseScore;
  progressiveMock.scoreGate = new Promise(resolve => { releaseScore = resolve; });
  const progressivePage = await progressive.newPage();
  try {
    await progressivePage.goto(baseUrl, { waitUntil: 'networkidle' });
    await progressivePage.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
    const firstRunId = await progressivePage.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.launchStage('endless', false); game.debugAddGold(5000);
      game.selectPadOrTower('ex_pad_01'); game.previewOrBuildTower('autocannon', true);
      game.upgradeSelectedTower(); game.upgradeSelectedTower(); game.selectPadOrTower(null);
      game.startNextWave(); game.debugStepSimulation(.05, false);
      const id = game.getEndlessRunResult().runId;
      window.dispatchEvent(new Event('pagehide'));
      return id;
    });
    for (let i = 0; i < 100 && progressiveMock.submissions.length < 1; i++) await progressivePage.waitForTimeout(10);
    assert.equal(progressiveMock.submissions.length, 1);
    const improved = await progressivePage.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      for (let i = 0; i < 80 && game.getSnapshot().kills < 1; i++) game.debugStepSimulation(.25, false);
      const result = game.getEndlessRunResult();
      window.dispatchEvent(new Event('pagehide'));
      return result;
    });
    assert.equal(improved.runId, firstRunId);
    assert.ok(improved.kills > progressiveMock.submissions[0].metrics.kills);
    releaseScore();
    await progressivePage.click('#btn-open-hub');
    await progressivePage.click('#hub-tab-btn-ranking');
    await progressivePage.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('成绩已记录') && !document.querySelector('#btn-retry-ranking'));
    assert.equal(progressiveMock.submissions.length, 2, 'A better snapshot of the same run survives the older request completing');
    assert.equal(progressiveMock.entry.metrics.kills, improved.kills);
    await progressivePage.click('#hub-tab-btn-campaign');
    await progressivePage.click('#stage-node-stage_01');
    await progressivePage.click('#btn-launch-stage');
    await progressivePage.waitForFunction(() => !localStorage.getItem('lunar_beacon_ranking_pending_v1:tdk:endless'));
  } finally { await progressive.close(); }

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Blocked', 'SecurityError'); } }));
  const fallbackMock = await installRankingMock(blocked);
  const fallbackPage = await blocked.newPage();
  try {
    await fallbackPage.goto(baseUrl, { waitUntil: 'networkidle' });
    await fallbackPage.waitForFunction(() => window.__LUNAR_BEACON_GAME__);
    await fallbackPage.evaluate(() => {
      const game = window.__LUNAR_BEACON_GAME__;
      game.launchStage('endless', false); game.toggleAutoBattle();
      for (let i = 0; i < 240 && game.getSnapshot().mode === 'playing'; i++) game.debugStepSimulation(1, false);
    });
    await completePlayerSetup(fallbackPage, '内存指挥官');
    await fallbackPage.waitForSelector('#hub-panel-ranking');
    await fallbackPage.waitForFunction(() => document.querySelector('#ranking-submission-status').textContent.includes('成绩已记录'));
    assert.ok((await fallbackPage.locator('#hub-panel-ranking').innerText()).includes('仅在本次打开期间'));
    assert.equal(fallbackMock.sessions, 1);
  } finally { await blocked.close(); }
}
