import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { installRankingMock } from './leaderboard.mjs';

export async function assertPlayerNameDialogUi(page) {
  const result = await page.evaluate(() => {
    const dialog = document.querySelector('.player-name-dialog');
    const title = dialog.querySelector('h2');
    const label = dialog.querySelector('label');
    const button = dialog.querySelector('#btn-save-player-name');
    const style = getComputedStyle(dialog);
    const rgba = value => value.match(/[\d.]+/g).map(Number);
    const luminance = rgb => rgb.slice(0, 3).map(n => {
      const s = n / 255;
      return s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4;
    }).reduce((sum, n, i) => sum + n * [.2126, .7152, .0722][i], 0);
    const background = rgba(style.backgroundColor);
    const panel = background[3] === 0 ? [25, 33, 56] : background;
    const contrast = element => {
      const a = luminance(rgba(getComputedStyle(element).color)), b = luminance(panel);
      return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
    };
    const rect = element => {
      const r = element.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    return {
      background: style.backgroundColor,
      opacity: background[3] ?? 1,
      titleColor: getComputedStyle(title).color,
      titleContrast: contrast(title),
      labelContrast: contrast(label),
      font: style.fontFamily,
      appFont: getComputedStyle(document.querySelector('#app')).fontFamily,
      buttonShadow: getComputedStyle(button).boxShadow,
      dialog: rect(dialog),
      app: rect(document.querySelector('#app')),
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
  assert.ok(result.titleContrast >= 4.5, `Registration title must be readable against the dark panel (contrast ${result.titleContrast})`);
  assert.ok(result.labelContrast >= 4.5, `Registration label must be readable against the dark panel (contrast ${result.labelContrast})`);
  assert.ok(result.opacity >= .94, `The dialog must cover the settlement beneath it (background ${result.background})`);
  assert.equal(result.font, result.appFont, 'Registration inherits the game font');
  assert.notEqual(result.buttonShadow, 'none', 'The registration button keeps its enamel bevel');
  assert.ok(result.dialog.left >= result.app.left && result.dialog.right <= result.app.right + 1,
    'Registration stays within the game horizontally');
  assert.ok(result.dialog.top >= result.app.top && result.dialog.bottom <= result.app.bottom + 1,
    'Registration stays within the game vertically');
  return result;
}

export async function verifyPlayerNameDialogUi(browser, baseUrl, shotDir) {
  await fs.mkdir(shotDir, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 591, height: 474 } });
  await context.addInitScript(() => localStorage.setItem('lunar_beacon_ranking_first_defeat_v1', '1'));
  await installRankingMock(context);
  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('#player-name-modal');
    await page.screenshot({ path: path.join(shotDir, 'registration-591x474.png') });
    await assertPlayerNameDialogUi(page);
    for (const viewport of [{ width: 390, height: 844 }, { width: 390, height: 360 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport);
      await assertPlayerNameDialogUi(page);
      await page.screenshot({ path: path.join(shotDir, `registration-${viewport.width}x${viewport.height}.png`) });
    }
    await page.setViewportSize({ width: 1000, height: 800 });
    await page.evaluate(() => {
      const app = document.querySelector('#app');
      Object.assign(app.style, { width: '591px', height: '474px', margin: '48px auto' });
    });
    await assertPlayerNameDialogUi(page);
    await page.screenshot({ path: path.join(shotDir, 'registration-embedded.png') });
    await page.evaluate(() => {
      const app = document.querySelector('#app');
      for (const property of ['width', 'height', 'margin']) app.style.removeProperty(property);
    });
    await page.fill('#player-name-input', '弹窗验收员');
    await page.locator('#btn-save-player-name').scrollIntoViewIfNeeded();
    await page.click('#btn-save-player-name');
    await page.waitForSelector('#player-name-modal', { state: 'detached' });
    assert.equal(await page.evaluate(() => localStorage.getItem('lunar_beacon_player_name_v1')), '弹窗验收员');
    await page.click('#btn-edit-player-name');
    await page.waitForSelector('#btn-cancel-player-name');
    await assertPlayerNameDialogUi(page);
    await page.click('#btn-cancel-player-name');
    await page.waitForSelector('#player-name-modal', { state: 'detached' });
  } finally {
    await context.close();
  }
  console.log('✓ Registration UI: dark-panel contrast, theme, compact/embedded layouts, save and cancel verified');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const browser = await chromium.launch({ headless: true, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--no-sandbox'] });
  try {
    await verifyPlayerNameDialogUi(browser, process.env.GAME_URL || 'http://127.0.0.1:5173',
      process.env.SHOT_DIR || '.git/player-name-ui');
  } finally {
    await browser.close();
  }
}
