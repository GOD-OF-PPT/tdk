import assert from 'node:assert/strict';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { installRankingMock } from './leaderboard.mjs';

export async function verifyHtmlRenderingSecurity(browser, baseUrl) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installRankingMock(context);
  const remoteLoads = [];
  await context.route('https://blocked.invalid/**', route => {
    remoteLoads.push(route.request().url());
    return route.abort();
  });
  try {
    const page = await context.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__LUNAR_BEACON_GAME__?.getSnapshot().mode === 'playing');
    const safe = await page.evaluate(() => {
      const attack = `<img src="https://blocked.invalid/image" onerror="window.__htmlExecuted=true">
        <script>window.__htmlExecuted=true</script><iframe src="https://blocked.invalid/frame"></iframe>
        <svg onload="window.__htmlExecuted=true"><a xlink:href="javascript:window.__htmlExecuted=true">unsafe</a>
        <foreignObject><input autofocus onfocus="window.__htmlExecuted=true"></foreignObject></svg>
        <div style="background:url(https://blocked.invalid/style);color:#ffffff">safe text</div>`;
      window.__LUNAR_BEACON_GAME__.callbacks.onBanner(attack, 'Security test', '#38bdf8');
      const banner = document.querySelector('#banner-slot');
      for (const element of banner.querySelectorAll('*')) element.dispatchEvent(new Event('load'));
      return {
        executed: Boolean(window.__htmlExecuted),
        activeElements: banner.querySelectorAll('script,iframe,object,embed,img,foreignObject,a').length,
        unsafeAttributes: [...banner.querySelectorAll('*')].flatMap(element => [...element.attributes])
          .filter(attribute => /^(?:on|src$|href$|xlink:)/i.test(attribute.name)).map(attribute => attribute.name),
        style: banner.querySelector('.wave-banner-title div')?.getAttribute('style') ?? '',
        text: banner.textContent,
        iconSvg: document.querySelector('#btn-bgm svg')?.namespaceURI,
      };
    });
    assert.equal(safe.executed, false, 'Injected scripts and SVG handlers never execute');
    assert.equal(safe.activeElements, 0, 'Rendering excludes active embeds, linked SVG and external images');
    assert.deepEqual(safe.unsafeAttributes, []);
    assert.ok(safe.text.includes('safe text'), 'Sanitizing preserves safe content');
    assert.ok(!safe.style.includes('url('), 'Inline UI styles cannot load remote resources');
    assert.equal(safe.iconSvg, 'http://www.w3.org/2000/svg', 'Game icon SVG namespaces survive rendering');
    await page.click('#btn-open-hub');
    const gradient = await page.evaluate(() => ({
      count: document.querySelectorAll('.constellation-svg radialGradient').length,
      fill: document.querySelector('.constellation-svg rect[fill^="url("]')?.getAttribute('fill'),
    }));
    assert.equal(gradient.count, 2, 'The real star map keeps both SVG gradients');
    assert.equal(gradient.fill, 'url(#nebA)', 'Local SVG paint references remain usable');
    assert.deepEqual(remoteLoads, [], 'Sanitized HTML makes no remote image, style or iframe requests');

    // The inline delivery must still boot directly, without a development server.
    await page.close();
    const standalone = await context.newPage();
    await standalone.goto(pathToFileURL(path.resolve('starforge_ark_cradle.html')).href, { waitUntil: 'domcontentloaded' });
    await standalone.waitForFunction(() => window.__LUNAR_BEACON_GAME__?.getSnapshot().mode === 'playing');
    assert.ok(await standalone.locator('#btn-start-wave').isVisible());
  } finally {
    await context.close();
  }

  const broken = await browser.newContext();
  try {
    const message = '<img src="https://blocked.invalid/error" onerror="window.__htmlExecuted=true">';
    await broken.addInitScript(message => {
      HTMLCanvasElement.prototype.getContext = () => { throw new Error(message); };
    }, message);
    const page = await broken.newPage();
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('#ui-layer').textContent.includes('WebGL 3D 渲染初始化失败'));
    assert.ok((await page.locator('#ui-layer').textContent()).includes(message), 'Startup error details remain literal text');
    assert.equal(await page.locator('#ui-layer img').count(), 0, 'Startup errors cannot construct attacker HTML');
    assert.equal(await page.evaluate(() => Boolean(window.__htmlExecuted)), false);
  } finally {
    await broken.close();
  }
  console.log('✓ HTML security: script/SVG/style injection blocked, native icons and gradients preserved, standalone and error rendering verified');
}
