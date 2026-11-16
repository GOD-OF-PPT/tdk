# Post-M2 Delta Blueprint — Explorer 3: 3-Tab Sector Hub Audit, Tactical HUD Dock, Dual T4 Cards, Responsive Polish & `README.md`

**Core Summary**: Post-M2 `UIManager.ts` (`1,180` lines) and `style.css` (`1,570` lines) already deliver ~85% of `#sector-hub-modal` (Tab 1 `星区战役` 5-node constellation + Briefing, Tab 2 `工程改装` 6 `Lv.0–4` cards + respec + SFX, and partial Tab 3 Achievements + Enemy chips), while `src/types.ts` already defines `CommanderSkillSnapshot` (`lines 413–421`) and `T4BranchOptionSnapshot` (`lines 423–430`). To reach 100% M3 completion without regressions, `UIManager.ts` and `style.css` need: **(1)** Tab 3's 4-subtab Field Codex (`防御机甲` w/ 6 T4-A/B branches, `失控敌械` 12 units w/ counter tags, `战场机关` 4 mechanisms, `守护勋章` 9 claimable badges w/ progress counters) + minor Hub polish, **(2)** `#commander-skills-dock` inside `.hud-action-bar`, side-by-side `T3→T4` inspector cards (`<=132px`), `#combo-float-layer` (`max 4`), and Challenger 2's `360×800` Endless `.stat-plate { white-space: nowrap }` + `W${snap.waveNumber}·∞` fix, and **(3)** a v2.0 `README.md` rewrite + `<20s` final WebGL2 smoke check.

---

## 1. Post-M2 Audit of `#sector-hub-modal` (`UIManager.ts:778–1179`, `style.css:943–1450`)

### 1.1 Exact Implementation Status Matrix

| Hub Area | Post-M2 Status (`UIManager.ts` / `style.css`) | Exact M3 Delta Needed (`100%` Completion) |
|---|---|---|
| **4 Entry Points & Lifecycle** | **95% Done** (`lines 97–122, 129–133, 641–651, 672–683, 742–775`): `#btn-open-hub` plaque + `#hub-alert-pip`, `#btn-hub-from-modal` (Pause/Defeat), `#btn-next-sector` (`▶ 下一战区`) + `#btn-hub-victory` (Victory), and `setOverlayPause(true/false)`. | 1. **`UIManager.ts:98`**: Change `this.elCrystalPill` click from `this.openHub('campaign')` → `this.openHub('tech')` (direct jump to Engineer Tech Tree; update `title` at `line 144`).<br>2. **`UIManager.ts:95–104`**: Add `keydown` listener for `Escape` (closes Hub if `this.hubOpen`, else calls `this.engine.cancelSkillTargeting?.()`) and `Digit1`–`Digit3` skill hotkeys.<br>3. **`UIManager.ts:795, 815–837`**: Include `prog.counters` + `this.codexSubTab` in `hubSig` so counter-unlocked achievements re-render immediately, and render `.hub-tab-pip.amber` on `#hub-tab-btn-tech` (when any tech is affordable) and `.hub-tab-pip.green` on `#hub-tab-btn-codex` (when any badge is claimable). |
| **Tab 1: `星区战役`** | **95% Done** (`lines 871–1007`, `style.css:1090–1318`): Toolbar (`★ ${prog.totalStars}/12`, `∞ W${prog.bestEndlessWave}`, `#btn-toggle-unlock-all`), `<svg class="constellation-svg">` + 5 `#stage-node-*` cards (`1–3★`, `首通 +X💎`, `驻守中`, `🔒`), and `#stage-brief-card` w/ `#btn-launch-stage`. | 1. **`UIManager.ts:950–964`**: Replace static `<polyline>` with 4 per-segment `<line>` elements (`stage_01→02→03→04→endless`) that light up solid `#38BDF8` (`opacity="0.9"`) when the destination node is unlocked vs dashed `#475569` when locked, plus an active gold selection ring `<circle r="8" fill="none" stroke="#FDE047" stroke-width="2"/>` on the selected node.<br>2. **`UIManager.ts:971–974`**: Add inline star/record badge (`★★★` or `最高 W${selectedSave.bestWave}`) in `#stage-brief-card` header row. |
| **Tab 2: `工程改装`** | **92% Done** (`lines 1009–1059, 1141–1164`, `style.css:1319–1375`): Renders all 6 `TECH_MODULES` (`Lv.0–4`), `[data-tech-upgrade]` calling `progMgr.upgradeTech(tid)` + `playTechUpgrade(lv)` (`AudioManager.ts:254`), and `#btn-respec-tech` calling `progMgr.respecTech()` + `playTechRespec()` (`AudioManager.ts:261`). | 1. **`UIManager.ts:1017–1038`**: Add stable `id="btn-upgrade-tech-${tid}"` on each upgrade button, render 4 illuminated level pips (`▮▮▯▯`), and show `当前 → 下一级` stat transition (`${mod.levelDescriptions[lv]} → <strong>${mod.levelDescriptions[lv + 1]}</strong>` when `lv < 4`).<br>2. **`style.css:1319–1323`**: Set `.tech-grid` to `grid-template-columns: repeat(3, 1fr)` on `>= 740px` (`repeat(2, 1fr)` on `481–739px`, `1fr` on `<= 480px`) so all 6 cards fit inside `760×580` `<agent-embed>` with zero vertical scroll. |
| **Tab 3: `战地档案`** | **45% Done** (`lines 1061–1105, 1166–1177`, `style.css:1377–1450`): Has 9 claimable `ACHIEVEMENT_CONFIGS` (`[data-claim-ach]` + `playAchievementClaim()`) and basic `ENEMY_BLUEPRINTS` HP/Armor chips. **Missing**: Sub-tab filter, Friendly Towers + 6 T4-A/B branches, 4 Battlefield Mechanisms, enemy counter tags, and achievement progress bars/counters. | **Complete Tab 3 in `UIManager.ts:1061–1105` (`private codexSubTab: 'towers' | 'enemies' | 'mechanisms' | 'badges' = 'towers'`)**:<br>• **4-Pill Sub-Nav (`.codex-subnav`)**: `#codex-sub-towers` (`🛡 防御机甲`) · `#codex-sub-enemies` (`🤖 失控敌械`) · `#codex-sub-mechanisms` (`⚙ 战场机关`) · `#codex-sub-badges` (`🏅 守护勋章` + claimable pip).<br>• **`towers` View**: 3 rich enamel cards (`TOWER_ORDER`) showing `towerSvgIcon(tId)`, weapon color swatch, synergy role badge (`[破甲裂隙 · 🎯弱点暴击]`, `[⚡磁暴共振引爆]`, `[磁化标记 · 聚怪控场]`), and **both Golden T4 Branch plaques (`T4-A` & `T4-B`)** read from `TOWER_BLUEPRINTS[tId].branches` (with fallback defaults if `branches` is populated by sibling worker).<br>• **`enemies` View (12 Hostiles/Bosses)**: All 12 `ENEMY_BLUEPRINTS` (`rover`, `swarm`, `drill`, `shield_skimmer`, `splitter_rover`, `mini_scout`, `repair_drone`, `elite_drill`, `boss_crawler`, `boss_siege_driller`, `boss_mag_dreadnought`, `boss_ark_overlord`) with **Threat Chip** (`首领BOSS` / `精英` / `护盾` / `飞行` / `维修` / `裂殖`), `HP / 护盾 / 护甲`, and **1-Line Counter Tag**.<br>• **`mechanisms` View (4 Mechanisms)**: 4 cards (`高地增程基座`: `+18%射程/+15%伤害`; `富集能源晶脉`: `点击+45G/+1💎/+15⚡`; `月面电容塔`: `连锁闪电破盾麻痹`; `激光封锁闸门`: `横贯光栅减速灼烧`) with crisp `#1A1033`-stroked inline SVGs.<br>• **`badges` View (9 Commendations)**: Add `id="btn-claim-ach-${ach.id}"` + live progress tag (`${prog.counters.synergyTriggers}/25`, `${prog.counters.skillsUsed}/12`, `${prog.counters.mechanismsUsed}/15`, `${prog.totalStars}/10`, `W${prog.bestEndlessWave}/15`) alongside existing `[data-claim-ach]` handler. |

---

## 2. Tactical Combat HUD Additions & Responsive Fixes (`UIManager.ts` & `style.css`)

### 2.1 M2 Challenger 2 Responsive Fix (`360×800` Endless Single-Row `#hud-top-bar`)
- **Problem (`challenger_m2_r1_2_gen3/handoff.md:20–24`)**: On `360×800` (`clientWidth: 344`), `"W1 · ∞"` (`UIManager.ts:317`) wraps onto 2 lines inside `#pill-wave`, pushing `#hud-top-bar.offsetHeight` from `31px` to `50px`.
- **Exact 2-Line Fix**:
  1. **`src/style.css:139–148` (`.stat-plate`)**: Add `white-space: nowrap;` at line `148`.
  2. **`src/ui/UIManager.ts:316–318` & `375–376`**: Format compact Endless wave strings without spaces around `·`:
     ```ts
     this.elWave.textContent = snap.isEndless
       ? `W${snap.waveNumber}·∞`
       : `${snap.waveNumber}/${snap.totalWaves}`;
     ```
     and in `#btn-start-wave` (`line 376`): `` `▶ 开始下一波 (W${snap.waveNumber}·∞)` ``.
  - **Result**: `#pill-wave` saves `~14px` width and never wraps; `#hud-top-bar` stays strictly **`31px` single-row** across `stage_01..stage_04` AND `endless` on `360×800`.

### 2.2 `#commander-skills-dock` Inside `.hud-action-bar` (`UIManager.ts:167–182, 367–391`, `style.css:412–495`)
- **Contract Alignment (`src/types.ts:413–421, 514–518`)**:
  - `UISnapshot` already provides `tacticalEnergy`, `maxTacticalEnergy`, `armedSkillId`, and `skills: CommanderSkillSnapshot[]` (`id`: `'orbital_strike' | 'emp_overdrive' | 'nano_repair'`, `name`, `energyCost`, `cooldownRemaining`, `cooldownTotal`, `ready`, `activeTargeting`).
  - `GameEngine` exposes `activateCommanderSkill(id: CommanderSkillId): boolean` (or alias `activateOrArmSkill`) and `cancelSkillTargeting(): void`.
- **Static Skeleton Update (`UIManager.ts:167–182`)**:
  ```html
  <div class="hud-center-Overlay" id="hud-alerts">
    <div id="boss-bar-slot"></div>
    <div id="targeting-slot"></div>
    <div id="banner-slot"></div>
    <div id="stamp-slot"></div>
    <div id="toast-slot"></div>
  </div>

  <div class="combo-float-layer" id="combo-float-layer" aria-hidden="true"></div>

  <footer class="hud-bottom-dock" id="hud-bottom-dock">
    <div id="onboarding-slot"></div>
    <div class="hud-action-bar" id="hud-action-bar">
      <div id="skills-slot" class="skills-slot"></div>
      <div id="next-wave-slot" class="next-wave-slot"></div>
    </div>
    <div id="tray-slot" class="tray-slot"></div>
  </footer>
  ```
- **DOM Mounting & Non-Destructive `~7Hz` Update Strategy (`renderCommanderSkills(snap)`)**:
  - Toggle `this.bottomDock.classList.toggle('has-active-tray', snap.mode === 'playing' && Boolean(snap.selectedPadId))` on every snapshot.
  - **Mount `#commander-skills-dock` once** inside `#skills-slot` when `snap.mode === 'playing' && snap.skills.length > 0` (using `skillsMountKey = snap.skills.map(s => s.id).join('|')`), then update child `textContent` / `style.width` / `style.height` / classes in-place so pointer clicks are **never** lost to `innerHTML` rebuilds:
    - `#tactical-energy-pill`: `⚡ <strong id="val-tac-energy">${Math.floor(snap.tacticalEnergy)}</strong><small>/${snap.maxTacticalEnergy}</small>` + `.tac-energy-bar > #tac-energy-fill` (`width: ${pct}%`).
    - 3 Skill Buttons (`id="btn-skill-${s.id}"`, i.e. `#btn-skill-orbital_strike`, `#btn-skill-emp_overdrive`, `#btn-skill-nano_repair`):
      - Keycap badge `.skill-key-hint` (`1` / `2` / `3`, hidden on `<=720px` mobile) + compact short label (`离子轰炸` / `电磁超载` / `纳米急修`) + cost chip `⚡${s.energyCost}`.
      - Cooldown sweep overlay `.skill-cd-overlay` (`height: ${(cdRem / cdTot * 100).toFixed(1)}%`) + centered timer `.skill-cd-text` (`${s.cooldownRemaining.toFixed(1)}s` when `s.cooldownRemaining > 0.05`).
      - `.is-armed` class (`border-color: #fde047; box-shadow: 0 0 12px rgba(253,224,71,0.55)`) when `s.activeTargeting || snap.armedSkillId === s.id`; `.unready` (`opacity: 0.65`) when `!s.ready && !s.activeTargeting` (keep button clickable so clicking with low energy triggers crisp toast feedback `⚡ 战术能量不足` rather than silent dead-click).
  - **Armed-Reticle Targeting Banner (`#targeting-slot` inside `#hud-alerts`)**:
    - When `snap.mode === 'playing' && snap.armedSkillId`: render `#skill-targeting-banner` (`🎯 点选或拖拽地面释放【轨道离子轰炸】` + `<button id="btn-cancel-skill" type="button">取消 [Esc]</button>` with `pointer-events: auto` on the cancel button). Clear `#targeting-slot` as soon as `snap.armedSkillId === null`.
- **Strict Viewport Coexistence & E2E Invariant Math**:
  - **Active Tray Rule**: `.hud-bottom-dock.has-active-tray #skills-slot, .hud-bottom-dock.has-active-tray #onboarding-slot { display: none !important; }` hides ONLY `#skills-slot` and `#onboarding-slot` when `selectedPadId !== null`. **`#next-wave-slot` (`#btn-start-wave`) stays visible and clickable**, preserving `tests/e2e.mjs:452–453`!
  - **`760×580` `<agent-embed>` (`@media (max-height: 640px)`)**: `.hud-action-bar` is `display: flex; flex-direction: row; align-items: center; justify-content: center; gap: 8px;`. `#commander-skills-dock` is **`42px` tall** (`padding: 3px 8px`), skill buttons are `34px` tall, `#btn-start-wave` is `40px` tall (`padding: 0 14px; font-size: 13.5px`). Total bottom height in combat / pre-wave = **`42px`** (`>130px` clearance below southernmost pads).
  - **`1440×900` Desktop**: Horizontal row, `#commander-skills-dock` `46px` tall + `#btn-start-wave` `46px` tall.
  - **`390×844` & `360×800` Mobile Portrait (`@media (max-width: 720px)`)**: `.hud-action-bar` stacks `#next-wave-slot` (`36px` tall `#btn-start-wave`) above full-width `#commander-skills-dock` (`42px` tall, `344px` wide: compact `⚡50` gauge + 3 equal `1fr` touch buttons). Total bottom height = `84px` (`y = 708..792px`, `>215px` below southernmost pads).

### 2.3 Side-by-Side `T3→T4` Dual Specialization Cards in `#tower-inspector` (`UIManager.ts:414–527`, `style.css:646–773`)
- **Trigger Condition**: `const branchOpts = tw.tier === 3 ? (tw.t4BranchOptions ?? snap.selectedTowerBranchOptions) : null;`
- **Dirty-Signature Update (`UIManager.ts:417`)**:
  - Append `:br_${tw.branch ?? '0'}:bOpt_${branchOpts ? `${branchOpts[0].affordable ? 1 : 0}${branchOpts[1].affordable ? 1 : 0}_${branchOpts[0].cost}_${branchOpts[1].cost}` : 'na'}` to `sig` so T4-A and T4-B buttons immediately unlock as gold crosses `240G`/`255G`/`285G`/`290G`.
- **Compact `<= 132px` Dual-Card Layout When `tw.tier === 3 && branchOpts`**:
  ```html
  <section class="tactical-sheet t3-branch-mode ${wasHidden ? 'sheet-enter' : ''}" id="tower-inspector">
    <div class="sheet-head compact-t3-head">
      <div class="sheet-title-row">
        <span class="tier-pill" style="background:${tw.tierHex}; color:#120d22">${tw.tierName}</span>
        <strong class="sheet-tower-name">${tw.name}</strong>
        <span class="inline-stats-pill">⚔<b id="ins-dmg">${tw.damage}</b> · ⚡${rateVal}/s · ◎${tw.range.toFixed(1)}m</span>
        ${tw.isHighGround ? `<span class="highground-chip">▲高地</span>` : ''}
        ${tw.isStunned ? `<span class="stun-chip">停机</span>` : ''}
      </div>
      <div class="sheet-head-actions">
        <button class="enamel-sell-btn compact-sell-pill" id="btn-sell-tower" type="button">
          <span>出售</span><strong>+${tw.sellRefund}</strong>
        </button>
        <button class="sheet-close-btn" id="btn-close-sheet" type="button" aria-label="关闭面板">✕</button>
      </div>
    </div>

    <div class="t4-specialization-row">
      <button
        class="enamel-t4-card branch-a ${optA.affordable ? '' : 'locked'}"
        id="btn-upgrade-tower"
        data-branch="A"
        data-affordable="${optA.affordable ? '1' : '0'}"
        type="button"
      >
        <div class="t4-card-top">
          <span class="t4-branch-badge">A · ${optA.shortTitle || optA.name}</span>
          <span class="cost-badge">● ${optA.cost}</span>
        </div>
        <div class="t4-card-tag">${optA.mechanicTag}</div>
      </button>

      <button
        class="enamel-t4-card branch-b ${optB.affordable ? '' : 'locked'}"
        id="btn-upgrade-tower-b"
        data-branch="B"
        data-affordable="${optB.affordable ? '1' : '0'}"
        type="button"
      >
        <div class="t4-card-top">
          <span class="t4-branch-badge">B · ${optB.shortTitle || optB.name}</span>
          <span class="cost-badge">● ${optB.cost}</span>
        </div>
        <div class="t4-card-tag">${optB.mechanicTag}</div>
      </button>
    </div>
  </section>
  ```
- **Why Placing Compact `#btn-sell-tower` in `.sheet-head-actions` at Tier 3 Is Optimal**:
  - Preserves exact `#btn-sell-tower` ID + `+${tw.sellRefund}` text (`tests/e2e.mjs:129–131`) AND exact `#btn-upgrade-tower` ID on `T4-A` (`tests/e2e.mjs:200` → `upgradeSelectedTower('A')`) + `#btn-upgrade-tower-b` on `T4-B` (`upgradeSelectedTower('B')`).
  - Gives `T4-A` and `T4-B` full symmetrical `50% / 50%` width (`160px` each even on `360×800` narrow portrait, `306px` each on desktop/embed) with zero 3-column squeeze!
  - Measured vertical height budget: `18px` padding (`9px×2`) + `28px` `.compact-t3-head` + `6px` gap + `58px` `.t4-specialization-row` + `5px` border = **`115px` total (`<= 132px` on `1440×900`, `760×580`, `390×844`, and `360×800`!)**.
- **Tier 4 Max Plaque Enhancement (`UIManager.ts:485–487`)**:
  - When `tw.tier === 4`, display branch-specific title in `#legendary-max-badge`: `★ 传说专精【${tw.name}】已完全解锁` (using branch name when `tw.branch` is `'A'` or `'B'`).

### 2.4 Rate-Limited Floating Combo Tags (`#combo-float-layer`)
- **API Hook (`GameEngine.ts:50–61`, `src/main.ts:33–40`, `UIManager.ts`)**:
  - Add optional `onComboCallout?: (screenX: number, screenY: number, text: string, accentHex: string) => void;` to `EngineUICallbacks` (`GameEngine.ts:61`), wired in `src/main.ts:40` to `ui.showComboCallout(x, y, text, hex)`.
- **Rate-Limiting & Bounds Guard in `UIManager.showComboCallout`**:
  - Cap concurrent pills strictly at **`4`** (`if (this.comboFloatLayer.childElementCount >= 4) this.comboFloatLayer.firstElementChild?.remove();`).
  - Throttle per-tag label by **`280ms`** (`lastComboAt[text]`) so rapid Gatling crits or cluster-rocket multi-hits never spam overlapping text.
  - Convert viewport `(screenX, screenY)` from `engine.projectWorldToScreen(worldPos)` (`GameEngine.ts:2513–2521`) to `#ui-layer`-local `(x, y)` via `const r = this.host.getBoundingClientRect();`, clamped to `[46, r.width - 46] × [52, r.height - 96]`.
  - Render `<div class="combo-float-tag" style="left:${x}px;top:${y}px;color:${accentHex}">${text}</div>` (`⚡磁暴共振`, `破甲裂隙`, `🎯弱点暴击`), `font-size: 12.5px`, `font-family: var(--font-heavy)`, `-webkit-text-stroke: 1.2px #1a1033`, `pointer-events: none`, `680ms` rise+fade animation (`translate(-50%, -22px)`), auto-removed after `700ms`.

---

## 3. `README.md` Rewrite & Concise Final Smoke Check Blueprint

### 3.1 Audit of Current `README.md` (`lines 1–60`) & Required v2.0 Sections
Current `README.md` only documents the M1 single-stage 8-wave build (`终末检修站`). Rewrite `README.md` (`~140` crisp, scannable lines) with these 7 exact sections:
1. **Project Title & Overview**: `《月海信标 · 星区中继战役》LUNAR BEACON: SECTOR RELAY CAMPAIGN` — 3D Toon-Mech TD built with `Three.js`, `1.5x` MSAA Normal+Depth `#1A1033` `ToonOutlineComposer`, `GSAP` 5-stage choreography, procedural `WebAudio`, and sandbox-safe `ProgressionManager`.
2. **Dependencies, Quick Start & Build/Bundle Commands**:
   - Runtime & Dev Dependencies: Node.js `>= 20`, `three ^0.187.0`, `gsap ^3.15.1`, `typescript ~7.0.2`, `vite ^8.3.6`, `playwright-core ^1.65.1`.
   - `npm install` (install dependencies), `npm run dev` (local Vite HMR dev server), `npm run build` (`tsc && vite build && node scripts/bundle_standalone.mjs` — builds `dist/` AND zero-CDN single-file IIFE HTML `dist/starforge_ark_cradle.html` + synced playable artifact), `npm run preview` (serves production build on `http://0.0.0.0:5173` / `http://localhost:5173`).
3. **4-Chapter Sector Campaign + Endless Overdrive**:
   - Summary table of `CH.01 曙光检修站` (8W, 1 lane), `CH.02 双生裂谷矿井` (10W, split/converge dual lanes), `CH.03 磁轨发射回廊` (10W, `1.42x` speed-rails + Laser Gate), `CH.04 终末方舟中枢` (12W, dual portals + full mechanisms), and `EX 星区无尽超载` (`∞` wave scaling + 5-wave Boss rotation), plus 1–3★ ratings, `💎` first-clear/star rewards, and `"全战区演练解锁"` toggle.
4. **3 Mecha Towers, 6 Legendary `T4-A / T4-B` Specializations & Cross-Tower Combos**:
   - `联装机炮 AC-01` (`T4-A 暴风火神机甲` / `T4-B 双联电磁轨炮`), `脉冲迫击炮 PM-02` (`T4-A 天穹聚变巨炮` / `T4-B 集束火箭弹巢`), `磁场约束塔 MR-03` (`T4-A 奇点引力中枢` / `T4-B 高压电弧矩阵`), and the 3-tower synergy loop (`[磁化标记]` → `⚡磁暴共振` + `破甲裂隙` + `🎯弱点暴击`).
5. **3 Active Commander Tactical Skills (`⚡`) & 4 Interactive 3D Battlefield Mechanisms**:
   - `轨道离子轰炸` (`45⚡`, reticle sky-beam AoE + stun + armor shred), `全域电磁超载` (`40⚡`, stun cleanse + `+45%` tower haste + shield strip + global Flux mark), `纳米信标急修` (`35⚡`, `+4` Beacon HP + `+75G` 3D coins); plus High-Ground Bastions, 3D Crystal Ore Veins, Lunar Capacitor Pylons, and Laser Containment Gates.
6. **6-Module Engineer Tech Tree (`💎`) & Field Codex / 9 Commendation Badges**:
   - `超导弹芯`, `液压伺服`, `战前整备`, `信标装甲`, `战术反应堆`, `磁暴谐振器` (`Lv.0–4` + 100% lossless free `"↺ 重置晶簇"`), 4-subtab Field Codex, and 9 claimable `💎` Commendation Badges persisted in `lunar_beacon_save_v2` (with automatic in-memory fallback in sandboxed iframes).
7. **5-Stage Cinematics, Desktop/Mobile/`<agent-embed>` Framing & Verification Summary**:
   - Document verified closed-loop gameplay, multi-viewport adaptation (`1440×900`, `760×580` `<agent-embed>`, `390×844` & `360×800` portrait), mute/speed/pause/restart controls, and remaining hardware note (WebGL2 GPU acceleration recommended; headless CPU SwiftShader supported).

### 3.2 Concise `<25s` Final Smoke Check Blueprint (Lowest-Priority Testing Guardrail)
Per `ORIGINAL_REQUEST.md:123` (*"仅在功能实现后做必要的冒烟验证，不要把算力和时间耗费在庞大的测试基建上"*), do **NOT** build a sprawling test suite. Run one concise post-build verification pass (`<25s` total):
1. `npm run build` → exits `0`, `sha256sum` matches between `dist/starforge_ark_cradle.html` and brain artifact `starforge_ark_cradle.html`, `0` external `http(s)://` URLs, `curl -sSfI http://127.0.0.1:5173` → `200 OK`.
2. Single fast Playwright WebGL2 smoke check verifying:
   - `<iframe sandbox="allow-scripts" srcdoc="...">` (`0px` initial parent → `580px` `#app`, `#btn-fullscreen` `580→740→580` with `0` console/Permissions-Policy/`SecurityError` errors).
   - `#sector-hub-modal` Tabs 1–3 (`#btn-toggle-unlock-all`, Tech upgrade + `#btn-respec-tech`, Codex 4 sub-tabs `towers`/`enemies`/`mechanisms`/`badges`, badge `💎` claim, stage launch).
   - Tactical HUD & Responsive (`1440×900`, `760×580`, `390×844`, `360×800`): Endless `#hud-top-bar` `offsetHeight <= 34` single-row (`W1·∞`), `#commander-skills-dock` `42px` side-by-side on `760×580` & hidden when `selectedPadId !== null` while `#btn-start-wave` stays visible/clickable, all 3 skills castable, `#combo-float-layer` `<= 4` tags, and T3 `#tower-inspector` (`<= 132px`) upgrading both `#btn-upgrade-tower` (`T4-A`) and `#btn-upgrade-tower-b` (`T4-B`) into `legendary_reveal`.
