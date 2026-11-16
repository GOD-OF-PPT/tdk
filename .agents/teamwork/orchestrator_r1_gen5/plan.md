# Project: Lunar Beacon — Sector Relay Campaign (`starforge_ark_cradle` 2.0) — Consolidated M3 Execution Plan (`orchestrator_r1_gen5`)

> **User Priority & Delivery Directives (`ORIGINAL_REQUEST.md` `04:42Z`–`23:01Z`)**:
> 1. **M1 (`render-3d-outline`) & M2 (`campaign-maps-mechanisms-and-preview-sync`)**: **100% DONE & Gate-Passed** (`Auditor=CLEAN`, `2x Reviewer=APPROVE`, `2x Challenger=APPROVE`).
> 2. **Post-M2 M3 Delta Explorers (`explorer_m3_r1_1..3_gen3`)**: **100% DONE on disk** with line-referenced blueprints.
> 3. **Mission (`orchestrator_r1_gen5`)**: Directly complete, verify, and ship **Consolidated Milestone M3 (`combat-depth-hub-techtree-codex-and-final-delivery`)**, building cleanly on `worker_m3a_r1_1_gen3`'s partial edits (`src/types.ts`, `src/config/gameConfig.ts`, `src/game/ProgressionManager.ts`, `src/render/BeaconAndPropsFactory.ts`).
> 4. **Testing Priority Override (`"测试相关任务最低优先级执行"`)**: Keep automated testing concise, fast (`<30s` Playwright WebGL2 smoke check + `npm run test:e2e`), and zero sprawling harnesses, while running a complete, non-skippable Step 2B Gate (`2x Reviewer`, `2x Challenger`, `1x Forensic Auditor`).

---

## Architecture & Authoritative Blueprints
- **Original User Request Record**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`
- **M3 Delta Blueprint 1 (6 `T4-A/B` 3D Rigs, VFX, Cinematics, `fissureMat`, 12 WebAudio SFX)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m3_r1_1_gen3/analysis.md` & `handoff.md`
- **M3 Delta Blueprint 2 (3 Commander Skills `⚡`, Combo Triangle, 6 T4 Mechanics, Tech Modifiers, Enemy Overlays, Anti-AFK Balance, M2 Gate Fixes)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m3_r1_2_gen3/analysis.md` & `handoff.md`
- **M3 Delta Blueprint 3 (Tactical HUD, Dual T4 Inspector Cards, `#combo-float-layer`, Full 3-Tab `#sector-hub-modal`, Responsive `360×800`/`580px`/`1440×900`, `README.md`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_m3_r1_3_gen3/analysis.md` & `handoff.md`
- **Predecessor Plan & Gate Record**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1_gen3/plan.md` & `GATE_STATUS.md`

---

## Feature Inventory (Complete Cross-Check)
| # | Feature | Description | Milestone | Status |
|---|---------|-------------|-----------|--------|
| **F1–F6** | **3D Cartoon Mechs, Closed Manifold Return Beacon, T3 Sub-Parts, Idle Life, 4-Step Toon & `1.5x` `#1A1033` Outline** | Closed 3D Beacon dish & 3-strut gantry, `idleCore`, `hingedFlaps`, Magnetic `weaponPitch`, `1.5x` `#1A1033` Layer-0 outline, leak-free `.dispose()`. | M1 | `DONE` |
| **F19–F21** | **4-Chapter Sector Campaign + Endless Overdrive, 12 Hostile Mechs/Bosses, 4 Interactive 3D Mechanisms** | `stage_01`..`stage_04` (`8/10/10/12W`) + `endless`, multi-lane pathing, High-Ground Pads, Crystal Ore Veins, Lunar Capacitor Pylons, Laser Containment Gates. | M2 | `DONE` |
| **F22** | **3 Active Commander Tactical Skills (`⚡` Energy)** | In-wave `⚡` energy + `#commander-skills-dock`: `轨道离子轰炸` (`45⚡, 18s CD`, desktop hover-click & mobile drag-release reticle -> `0.55s` lock -> sky ion beam `260` AoE + `3` shred + `1.6s` stun), `全域电磁超载` (`40⚡, 20s CD`, clears stuns, `+45%` haste `6s`, strips shields, map-wide `5.5s` `[Flux-Marked]`), `纳米信标急修` (`35⚡, 24s CD`, `+4` Beacon HP + `+75G` 3D coins). | M3 | `IN_PROGRESS` |
| **F23** | **Cross-Tower Combo Triangle + `#combo-float-layer` & 6 `T3→T4` Dual Specialization Branches** | Magnetic `[Flux-Marked]` -> Mortar `⚡磁暴共振` (`+35%` AoE + `28%` 2-target chain arc, `1.25s` mark consumption) + Autocannon `[破甲裂隙]` (`-24%/-32%` armor) & `🎯弱点暴击` (`1.35x–1.55x`) + `#combo-float-layer`. 6 `T4-A/B` 3D rigs (`暴风火神机甲` vs `双联电磁轨炮`, `天穹聚变巨炮` vs `集束火箭弹巢`, `奇点引力中枢` vs `高压电弧矩阵`), Stage 2C Golden Hero Reveal for A & B, side-by-side inspector cards (`#btn-upgrade-tower` / `#btn-upgrade-tower-b`). | M3 | `IN_PROGRESS` |
| **F24** | **Full 3-Tab Sector Command Hub (`#sector-hub-modal`), 6-Module `💎` Tech Tree & Field Codex / 9 Commendations** | Tab 1 `星区战役` (5-node SVG+Enamel star-chart, dynamic unlocked segments, 1–3★, `💎` bounties, `"全战区演练解锁"`, `"▶ 下一战区"`), Tab 2 `工程改装` (6 `Lv.0–4` `💎` upgrades wired live + free `"↺ 重置晶簇"`), Tab 3 `战地档案` (4 sub-tabs: Towers w/ T4-A/B, 12 Enemies/Bosses w/ counter tags, 4 Mechanisms, 9 claimable `💎` Commendation Badges w/ live counters). | M3 | `IN_PROGRESS` |
| **F7–F18** | **M2 Gate Polish Carry-Forward, 12 Procedural WebAudio SFX + Mute Persistence, Anti-AFK Balance, Docs & Dual Preview Sync** | Deferred tier color switch, per-flap hinge axes + `branchTag`, pause-safe `simDt` Mortar doors, `fissureMat` `fog: false` + `lagSmoothing(500, 33)`, Final Boss breach / `supplyChest` visibility, `fullscreenEnabled` guard, unconditional `shieldFillMesh`, `.stat-plate` `nowrap`, 12 WebAudio SFX + sandbox-safe mute persistence, Wave 8 anti-AFK tuning, `360×800`/`580px`/`1440×900` layout polish, `README.md`, `npm run build` (`dist/` + `starforge_ark_cradle.html` + `.metadata.json`), and live `:5173` daemon. | M3 | `IN_PROGRESS` |

---

## Consolidated M3 Sequential Worker Partition & Exclusive Write Ownership
1. **Part A (`worker_m3a_r1_1_gen5`)** — Inspects `worker_m3a_r1_1_gen3`'s partial edits on disk (`git status` / `git diff`) and completes exclusive write ownership of:
   - `src/types.ts`, `src/config/gameConfig.ts`, `src/game/ProgressionManager.ts`, `src/render/TowerFactory.ts`, `src/render/EnemyFactory.ts`, `src/render/BeaconAndPropsFactory.ts` (`line 645` `fissureMat` `fog: false` ONLY), `src/fx/VfxManager.ts`, `src/game/CinematicDirector.ts`, `src/audio/AudioManager.ts`.
   - Must exit `0` on `npx tsc --noEmit` across the entire repo before Part B begins.
2. **Part B1 (`worker_m3b1_r1_1_gen5`)** — Reads `worker_m3a_r1_1_gen5/handoff.md` and completes exclusive write ownership of `src/game/GameEngine.ts` (3 Commander Skills `⚡`, Combo Triangle, 6 `T4-A/B` combat mechanics, live Tech modifiers, M2 gate polish + `npx tsc --noEmit` exit 0).
3. **Part B2 (`worker_m3b2_r1_1_gen5`)** — Reads `worker_m3b1_r1_1_gen5/handoff.md` and completes exclusive write ownership of:
   - `src/ui/UIManager.ts`, `src/style.css`, `src/main.ts` (if needed), `README.md`.
   - Runs `npm run build` (`tsc && vite build && node scripts/bundle_standalone.mjs`) syncing `dist/` and `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` (+ `.metadata.json`, `0` external CDN URLs), starts `npx vite preview --host 0.0.0.0 --port 5173` daemon, and runs a concise `<30s` Playwright WebGL2 smoke + E2E check.
4. **Step 2B Gate (`reviewer_m3_r1_1..2_gen5`, `challenger_m3_r1_1..2_gen5`, `auditor_m3_r1_1_gen5`)**:
   - Strict AND gate: `Auditor == CLEAN` (binary veto), both `Reviewers == APPROVE`, both `Challengers == APPROVE`, build & previews verified.

---

## Interface Contracts & Invariants
- **C1 (Layer-0 Solid Outline vs Layer-1/`vfxScene`)**: Solid 3D hulls/T4 modules on `solidScene` Layer `0` (`openEnded = false`, opaque toon materials); translucent enemy overlays (`shieldFillMesh`, `fluxRingGroup`, `shredBadgeGroup`) on `solidScene` Layer `1`; VFX (`vfxScene`) strictly on Layer `0`; `.dispose()` preserves `THREE.Sprite.geometry` & `getToonTextures()`.
- **C2 (Sandbox-Safe Persistence & Mute)**: `ProgressionManager` + `AudioManager` wrap `localStorage` in `try/catch` with in-memory fallback (`0` `SecurityError` inside `<iframe sandbox="allow-scripts">`).
- **C3 (Backward-Compatible DOM & `UISnapshot`)**: Preserve `#btn-upgrade-tower` (default `T4-A`), add `#btn-upgrade-tower-b` (`T4-B`), keep `#btn-start-wave` visible when `selectedPadId !== null`, `#hud-top-bar` single-row (`<=36px`) on `360×800` Endless, `#tower-inspector` `<=132px` at Tier 3.
- **C4 (Dual Preview Sync)**: Identical SHA-256 between `dist/starforge_ark_cradle.html` and artifact `starforge_ark_cradle.html`, `0` external `http(s)://` URLs, non-zero `#app` height (`580px` `<agent-embed>`, `100%` `:5173`), and live HTTP 200 on `http://127.0.0.1:5173`.
