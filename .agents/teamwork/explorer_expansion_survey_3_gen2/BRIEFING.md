# BRIEFING — 2026-11-14T08:28:00Z

## Mission
Design an exact, line-referenced architectural blueprint for Track 3: Sector Campaign Hub UI (3 tabs), Meta-Progression Engineer Tech Tree, Field Codex/Achievements, Non-Overlapping Responsive In-Battle HUD (Desktop, 580px `<agent-embed>`, Mobile Portrait 360x800), Sandbox-Safe `ProgressionManager`, and Standalone HTML Bundler (`scripts/bundle_standalone.mjs`) + `:5173` sync.

## 🔒 My Identity
- Archetype: Explorer
- Roles: Technical Architecture Explorer, Synthesizer
- Working directory: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2`
- Original parent: `0e463bcfabadd2a009d613505f7e2660`
- Milestone: Expansion Survey (Track 3 — UI, Meta-Progression, Persistence & Bundler)

## 🔒 Key Constraints
- Read-only investigation — do NOT modify any source or repo files
- Write ONLY inside `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/`
- Preserve tactile industrial-enamel UI aesthetic (`#1A1033` outline, cream/deep-blue/amber palette, chunky legible plates, no small-font clutter)
- Guarantee zero HUD overlap on Desktop `1440x900`, `<agent-embed>` `580px`, and Mobile Portrait `360x800` / `390x844`
- Ensure `localStorage` SecurityError safety inside `sandbox="allow-scripts"` `<agent-embed>` iframes
- Keep `starforge_ark_cradle.html` classic inline IIFE with zero external CDN URLs and `#app` 580px zero-collapse while keeping `:5173` preview synced

## Current Parent
- Conversation ID: `0e463bcfabadd2a009d613505f7e2660`
- Updated: 2026-11-14T08:28:00Z

## Investigation State
- **Explored paths**: `ORIGINAL_REQUEST.md`, `package.json`, `index.html`, `vite.config.ts`, `src/main.ts`, `src/ui/UIManager.ts`, `src/style.css` (1-1029), `src/types.ts`, `src/config/gameConfig.ts`, `src/game/GameEngine.ts` (1-1651), `src/audio/AudioManager.ts`, `tests/e2e.mjs`, `scratch/bundle_standalone.mjs`, `starforge_ark_cradle.html`, `orchestrator_r1_gen2/plan.md`, `teamwork_preview_explorer_survey_2/handoff.md`, `teamwork_preview_spec_miner_survey_3/handoff.md`.
- **Key findings**:
  - `:5173` (`vite preview`) is NOT currently running in this VM session, and `dist/` (`05:40Z`) is newer than `starforge_ark_cradle.html` (`04:40Z`).
  - `#app { touch-action: none }` in `src/style.css:64` requires `touch-action: pan-y` on `.hub-body-scroll` / `.enamel-dialog` for mobile vertical touch scrolling.
  - `360px` mobile top bar has only `16px` horizontal slack; hiding `#pill-kills` `<440px` accommodates `#btn-open-hub` (`320px <= 344px`).
  - `GameEngine.previewOrBuildTower(..., true)` keeps `selectedPadId` active, and `tests/e2e.mjs:452-453` taps `#btn-start-wave` while `#tower-inspector` is open — so `.has-active-tray` must tuck `#skills-slot` while keeping `#btn-start-wave` visible.
  - Promoting `html.is-top-window` once at `bootstrap()` for `isTopWindow || http(s): || innerHeight >= 620` fixes `:5173` & `920px` side-pane height while preserving `<agent-embed>` `580px` zero-collapse and `.expanded-embed` (`740px`).
- **Unexplored areas**: None — all Track 3 files and cross-track interfaces fully analyzed.

## Key Decisions Made
- Non-blocking boot into active stage with 4 Hub entry points (`#btn-open-hub`, clickable `#pill-crystal`, Pause/Defeat modals, and `#victory-screen` + direct `#btn-next-sector`).
- Keep `id="btn-upgrade-tower"` on `T4-A` card (`upgradeSelectedTower(branch = 'A')`) alongside `#btn-upgrade-tower-b` (`T4-B`) inside a compact `114px–132px` `#tower-inspector` layout.
- Unify storage in `src/game/ProgressionManager.ts` (`lunar_beacon_save_v2`) with `try/catch` probe + in-memory `Map` fallback and v1 migration.
- Chain `node scripts/bundle_standalone.mjs` directly into `package.json` `"build"` with automated zero-CDN and `#app` `580px` self-assertions.

## Artifact Index
- `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/DISPATCH.md` — Dispatch message log
- `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/BRIEFING.md` — Persistent working memory
- `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/progress.md` — Liveness heartbeat
- `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/analysis.md` — Detailed Track 3 architectural blueprint & interface contracts
- `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/handoff.md` — 5-component Hard Handoff report
