import './style.css';
import { GameEngine } from './game/GameEngine';
import { UIManager } from './ui/UIManager';

declare global {
  interface Window {
    __LUNAR_BEACON_GAME__?: GameEngine;
  }
}

function bootstrap(): void {
  let isTopWindow = false;
  try {
    isTopWindow = window.self === window.top;
  } catch {
    isTopWindow = false;
  }
  const isHttpOrigin =
    window.location.protocol === 'http:' || window.location.protocol === 'https:';
  const isHostSizedIframe = !isTopWindow && window.innerHeight >= 620;
  if (isTopWindow || isHttpOrigin || isHostSizedIframe) {
    document.documentElement.classList.add('is-top-window');
  }

  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  const uiRoot = document.getElementById('ui-layer');
  if (!canvas || !uiRoot) {
    throw new Error('Missing #game-canvas or #ui-layer container');
  }

  try {
    const ui = new UIManager(uiRoot);
    const engine = new GameEngine(canvas, {
      onStateChange: (snap) => ui.updateSnapshot(snap),
      onInsufficientGold: (missing) => ui.showInsufficientGoldFeedback(missing),
      onInsufficientEnergy: (missing) => ui.showInsufficientEnergyFeedback(missing),
      onComboCallout: (x, y, text, hex, comboCount) =>
        ui.showComboCallout(x, y, text, hex, comboCount),
      onUpgradeStamp: (title, hex, deltas, isLegendary) =>
        ui.showUpgradeStamp(title, hex, deltas, isLegendary),
      onBanner: (title, sub, hex) => ui.showBanner(title, sub, hex),
      onHideBanner: () => ui.hideBanner(),
    });

    ui.bindEngine(engine);
    engine.startLoop();

    window.__LUNAR_BEACON_GAME__ = engine;
  } catch (err) {
    console.error('Lunar Beacon bootstrap error:', err);
    uiRoot.style.pointerEvents = 'auto';
    uiRoot.innerHTML = `<div style="margin:auto;padding:20px;max-width:420px;background:#192138;border:2px solid #1a1033;border-radius:14px;color:#f3efe6;text-align:center;">
      <div style="font-weight:900;font-size:16px;margin-bottom:8px;">WebGL 3D 渲染初始化失败</div>
      <div style="font-size:13px;color:#cbd5e1;">请确认浏览器已开启硬件加速 / WebGL 支持（${String(err)}）</div>
    </div>`;
  }
}

bootstrap();
