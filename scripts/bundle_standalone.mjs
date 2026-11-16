import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const tempOutDir = '/tmp/lunar_iife_dist';
const pubFavicon = path.join(projectRoot, 'public/favicon.svg');
const distOutHtml = path.join(projectRoot, 'dist/starforge_ark_cradle.html');

const brainDir =
  '/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7';
const artifactOutHtml = path.join(brainDir, 'starforge_ark_cradle.html');
const artifactMetaPath = path.join(brainDir, 'starforge_ark_cradle.html.metadata.json');

await build({
  root: projectRoot,
  configFile: false,
  publicDir: false,
  base: './',
  build: {
    outDir: tempOutDir,
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    chunkSizeWarningLimit: 1400,
    rollupOptions: {
      output: {
        format: 'iife',
        name: 'LunarBeaconBundle',
      },
    },
  },
});

const assetsDir = path.join(tempOutDir, 'assets');
const files = fs.readdirSync(assetsDir);
const cssFile = files.find((f) => f.endsWith('.css'));
const jsFile = files.find((f) => f.endsWith('.js'));

if (!cssFile || !jsFile) {
  throw new Error(`Missing CSS or JS in ${assetsDir}: ${files.join(', ')}`);
}

const css = fs.readFileSync(path.join(assetsDir, cssFile), 'utf8');
const js = fs
  .readFileSync(path.join(assetsDir, jsFile), 'utf8')
  .replace(/<\/script>/gi, '<\\/script>');
const svgB64 = fs.readFileSync(pubFavicon).toString('base64');

assert.ok(
  /height:\s*580px/.test(css),
  'Expected #app explicit 580px height rule in bundled CSS for auto-sized artifact iframe safety'
);
assert.ok(
  !/url\(\s*['"]?https?:\/\//i.test(css),
  'Expected 0 external http(s):// asset URLs in bundled CSS'
);

const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml;base64,${svgB64}" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
    />
    <title>月海信标 · 星区中继战役 | 3D太空机甲塔防</title>
    <style>
${css}
    </style>
  </head>
  <body>
    <div id="app">
      <canvas id="game-canvas" aria-label="月面采矿站3D机甲塔防战场"></canvas>
      <div id="ui-layer"></div>
    </div>
    <script>
${js}
    </script>
  </body>
</html>
`;

assert.ok(
  !/<(?:script|link|img)\b[^>]*(?:src|href)=\s*['"]https?:\/\//i.test(html),
  'Expected 0 external http(s):// script/link/img tags in standalone HTML'
);

fs.mkdirSync(path.dirname(distOutHtml), { recursive: true });
fs.writeFileSync(distOutHtml, html, 'utf8');
console.log(
  `Bundled IIFE standalone HTML -> ${distOutHtml} (${(html.length / 1024).toFixed(1)} KB)`
);

if (fs.existsSync(brainDir)) {
  fs.writeFileSync(artifactOutHtml, html, 'utf8');
  const meta = {
    summary:
      '《月海信标 · 星区中继战役》LUNAR BEACON: SECTOR CAMPAIGN 独立单文件可玩版（IIFE 内联构建，含 4 大特色战区关卡 + 星区无尽超载、全战区演练解锁开关、工程科技改装与战地档案，无需本地端口即可直接游玩）。',
    updatedAt: new Date().toISOString(),
    userFacing: true,
  };
  fs.writeFileSync(artifactMetaPath, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
  console.log(
    `Synced standalone HTML artifact -> ${artifactOutHtml} (${(html.length / 1024).toFixed(1)} KB)`
  );
}
