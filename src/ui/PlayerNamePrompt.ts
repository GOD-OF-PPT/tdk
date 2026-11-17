import { setSanitizedHtml } from './safeHtml';
import type { LeaderboardService } from '../ranking/LeaderboardService';

export function promptPlayerName(leaderboard: LeaderboardService): Promise<void> {
  return new Promise(resolve => {
    const editing = Boolean(leaderboard.getUsername());
    const mask = document.createElement('div');
    mask.className = 'player-name-mask';
    mask.id = 'player-name-modal';
    setSanitizedHtml(mask, `
      <form class="player-name-dialog" role="dialog" aria-modal="true" aria-labelledby="player-name-title">
        <div class="dialog-kicker">LUNAR BEACON · 指挥官登记</div>
        <h2 id="player-name-title">${editing ? '修改指挥官名字' : '挑战结束，登记战绩'}</h2>
        <p>${editing ? '名字用于之后提交的战绩。' : '为这次无尽挑战填写名字，保存后解锁排行榜并上传本局战绩。'}名字保存在当前浏览器，下次无需重复输入。</p>
        <label for="player-name-input">指挥官名字</label>
        <input id="player-name-input" name="username" maxlength="80" autocomplete="nickname" required />
        <p class="player-name-error" id="player-name-error" role="alert"></p>
        <button class="enamel-cta-btn primary" id="btn-save-player-name" type="submit">${editing ? '保存名字' : '登记并解锁排行榜'}</button>
        ${editing ? '<button class="enamel-cta-btn secondary" id="btn-cancel-player-name" type="button">取消</button>' : ''}
      </form>`);
    const input = mask.querySelector<HTMLInputElement>('#player-name-input')!;
    input.value = leaderboard.getUsername();
    const close = () => { mask.remove(); resolve(); };
    mask.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape' && editing) close();
    });
    mask.querySelector('#btn-cancel-player-name')?.addEventListener('click', close);
    mask.querySelector('form')!.addEventListener('submit', event => {
      event.preventDefault();
      try {
        leaderboard.setUsername(input.value);
        close();
      } catch (error) {
        mask.querySelector('#player-name-error')!.textContent = error instanceof Error ? error.message : '请输入有效的名字。';
        input.focus();
      }
    });
    document.body.append(mask);
    input.focus();
  });
}
