## 2026-11-14T08:17:32Z

You are `explorer_expansion_survey_3_gen2`, a read-only Technical Architecture Explorer surveying `/home/antigravity/GOD-OF-PPT/tdk` to design the **Campaign Hub UI, Meta-Progression Engineer Tech Tree, Field Codex/Achievements, Responsive HUD & Standalone Preview Bundler Pipeline** in response to the urgent user playtest feedback in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md` (`## Follow-up — 2026-11-14T08:12:48Z`).

### Rules & Paths
- **Read-Only**: Do NOT modify any source or repo files. Write ONLY your `progress.md`, `analysis.md`, and `handoff.md` inside `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_3_gen2/`.
- **Mandatory Spec**: Read `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md` FIRST (especially lines 113–129, tactile enamel UI rules, mobile portrait layout, and `<agent-embed>` / `:5173` preview rules).
- **Report Recipient**: When finished, send a concise summary via `send_message` to `0e463bcfabadd2a009d613505f7e2660`.

### Your Investigation Focus (Track 3: Sector Campaign Hub UI, Engineer Tech Tree, Codex, In-Game Tactical HUD, Persistence & Standalone Artifact Bundling)
Inspect `src/ui/UIManager.ts`, `src/style.css`, `src/main.ts`, `index.html`, `package.json`, and `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs` (plus check how `:5173` is currently running if visible via files). Produce an exact, line-referenced architectural blueprint covering:
1. **Tactile Enamel UI Expansion Without Clutter (`界面清楚、有材质感，避免堆积小字和装饰`)**:
   - **Sector Command Hub Overlay (`星区作战指挥台`)**: Clean, chunky industrial-enamel modal/drawer with 3 crisp tabs:
     1. **`星区战役 (Sector Campaign)`**: Interactive visual star-chart / lunar route connecting Chapters 1–4 + **Endless Overdrive Mode**, showing 1–3 ★ stars, wave count, stage mechanic badge, `💎` first-clear & star rewards, `"立即出击"` button, and a convenient `"全战区演练解锁"` toggle so players/testers can either progress naturally OR jump straight into any stage/Endless immediately! Also add `"下一战区"` button directly on `#victory-screen`!
     2. **`工程改装 (Engineer Tech Tree)`**: 6 permanent upgrade modules funded by earned Energy Crystals (`💎`), showing current level `Lv.0–4`, clear stat effect, crystal cost, instant upgrade button + SFX, and free `"重置晶簇"` respec button!
     3. **`战地档案 (Field Codex & Commendations)`**: Visual cards for Friendly Mechs (with T4-A/B branches), Hostile Mining Mechs & Bosses, Interactive Stage Mechanisms, and `8–10` unlockable Achievement Badges granting bonus `💎`!
   - **In-Battle HUD Additions (Desktop `1440x900`, `<agent-embed>` `580px`, AND Mobile Portrait `360x800` / `390x844`)**:
     - How to place the **3-Button Commander Tactical Skills Dock + Energy Gauge (`⚡`)**, **Sector/Stage indicator & Hub button**, **Combo/Wave callouts**, and **T3 -> T4 Dual-Branch Choice Cards** inside `#tower-inspector` so NOTHING overlaps `#build-tray`, `#btn-start-wave`, or build pads on `580px`-tall `<agent-embed>` or `360x800` narrow mobile portrait!
2. **`localStorage` Save Schema & Sandbox Safety**:
   - Unified versioned save manager (`src/game/ProgressionManager.ts` or similar) with graceful in-memory fallback when `localStorage` throws `SecurityError` inside `sandbox="allow-scripts"` `<agent-embed>` iframes!
3. **Standalone HTML Bundler (`bundle_standalone.mjs`) & `<agent-embed>` / `:5173` Preview Sync**:
   - Inspect `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs` and `src/main.ts` / `src/style.css`: verify how `starforge_ark_cradle.html` is bundled as a classic inline IIFE with zero external CDN URLs, how `<agent-embed>` `580px` zero-collapse vs `:5173` / side-pane `100%` height detection works, and how to bring a repeatable `scripts/bundle_standalone.mjs` (`npm run build:standalone`) into the repo so every milestone syncs both `dist/` (`:5173`) and `starforge_ark_cradle.html` seamlessly!
