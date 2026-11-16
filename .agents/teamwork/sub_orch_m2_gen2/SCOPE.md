# Milestone M2 Scope — `campaign-maps-mechanisms-and-preview-sync`

- **Sub-Orchestrator**: `sub_orch_m2_gen2` (`fc6059e272e6f3abacf9748117d59270`)
- **Parent Orchestrator**: `orchestrator_r1_gen2` (`0e463bcfabadd2a009d613505f7e2660`)
- **Original Request Reference**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`

## Deliverables & Acceptance Criteria

### M2.1 — Unified Types & Sandbox-Safe `src/game/ProgressionManager.ts`
- Extend `src/types.ts` while preserving 100% of M1's `FlapHingeAxis`, `HingedFlapUserData`, and `TowerRig.idleCore`:
  - `StageId` (`'stage_01' | 'stage_02' | 'stage_03' | 'stage_04' | 'endless'`), `StageConfig`, `CompiledLane`, `PortalConfig`, `StagePaletteConfig`, `MapMechanismConfig`, `MapMechanismInstance`, `SpeedZoneConfig`.
  - Expanded 12-unit `EnemyType` (`rover`, `swarm`, `drill`, `elite_drill`, `shield_skimmer`, `splitter_rover`, `mini_scout`, `repair_drone`, `boss_crawler`, `boss_siege_driller`, `boss_mag_dreadnought`, `boss_ark_overlord`).
  - Forward-compatible `TowerBranch` (`'A' | 'B'`), `TacticalSkillId` / `CommanderSkillId`, `TechUpgradeId`, and additive `UISnapshot` fields (preserving 100% of existing DOM IDs and `window.__LUNAR_BEACON_GAME__.getSnapshot()` fields).
- Create `src/game/ProgressionManager.ts`:
  - Wrap `window.localStorage` in `try/catch` with automatic in-memory `Map` fallback for `sandbox="allow-scripts"` `<agent-embed>` iframes (zero `SecurityError`).
  - Migrate legacy `lunar_beacon_td_muted_v2` & `lunar_beacon_commendations_v1` into versioned `lunar_beacon_save_v2`.
  - Track `totalCrystals`, `spentCrystals`, per-stage 1–3★ ratings & first-clear rewards, progressive stage unlock + `unlockAllSandbox` (`"全战区演练解锁"`) toggle, `bestEndlessWave`, 6 Tech Tree levels (`Lv.0–4`) + free respec, Codex discovery, and 9 Commendation badges.

### M2.2 — 4 Distinct 3D Campaign Stages + Endless Overdrive + 4 Interactive 3D Map Mechanisms
- Create `src/config/campaignConfig.ts` (imported cleanly into `src/config/gameConfig.ts`) implementing the 4 mathematically verified stages + `Endless Overdrive` wave generator (`compileStageLanes`, `sampleLaneAtDistance`, `generateEndlessWave`):
  1. **Ch.1 `曙光检修站 (Outpost Relay)`**: 1 winding canyon lane (`41.58m`), 10 pads (2 `y=0.68m` High-Ground Boost Pads), 2 Crystal Ore Veins, 8 waves, `boss_crawler`.
  2. **Ch.2 `双生裂谷矿井 (Twin-Rift Crater Shaft)`**: Dual-lane split/converge (`31.66m × 2`) around central energized crater shaft, 12 pads (2 High-Ground), 2 clickable Lunar Capacitor Pylons + 1 Crystal Vein, 10 waves, `shield_skimmer` + `splitter_rover`/`mini_scout` + `boss_siege_driller`.
  3. **Ch.3 `磁轨发射回廊 (Mag-Rail Launch Corridor)`**: Trench lane (`35.43m`) with 2 `1.42x` Speed-Boost Accelerator Rail Zones, 11 pads (2 High-Ground), 1 clickable Laser Containment Gate + 2 Crystal Veins, 10 waves, `repair_drone` + `boss_mag_dreadnought`.
  4. **Ch.4 `终末方舟中枢 (Ark Core Citadel)`**: 2 independent portals (`West Breach 32.06m` + `North Drop-Bay 19.76m`) converging on Central Ark Plaza, 12 pads (2 High-Ground), Capacitor Pylon + Laser Gate + 2 Crystal Veins, 12 waves, Wave 8 Sub-Boss + Wave 12 `boss_ark_overlord`.
  5. **EX `星区无尽超载 (Endless Overdrive)`**: Procedural `generateEndlessWave(w)` (`1.135^(w-1)` HP scaling, 5-wave Boss rotation, `bestEndlessWave` persistence).
- Refactor `src/render/BeaconAndPropsFactory.ts`:
  - **Preserve 100% of M1.1's closed manifold beveled 3D Return Beacon dish & 3-strut gantry (`0` `openEnded` Layer-0 meshes)**.
  - Build multi-stage dioramas, rotated multi-portal `entrances[]`, `y=0.68m` High-Ground bastions, 3D chunky-toon Layer-0 housings + Layer-1 non-outlined beams/halos for `Crystal Ore Veins`, `Lunar Capacitor Pylons`, and `Laser Containment Gates`, Stage 2 crater shaft & Stage 3 speed-rail chevrons, `env.vfxRoot`, and leak-free `dispose()` + `disposeObject3DTree()` (preserving shared `getToonTextures()` & `THREE.Sprite.geometry`).

### M2.3 — Expanded 12-Unit Hostile 3D Mech Roster, Multi-Lane Combat, Cinematics & Stage Switcher
- Extend `src/render/EnemyFactory.ts` with 3D chunky-toon Layer-0 + Layer-1 rigs for `shield_skimmer` (geodesic shield dome on Layer 1), `splitter_rover` + `mini_scout`, `repair_drone` (emerald-amber 3D cross-halo on Layer 1), and stage Bosses `boss_siege_driller`, `boss_mag_dreadnought`, `boss_ark_overlord`.
- Update `src/game/GameEngine.ts`, `src/game/CinematicDirector.ts`, `src/audio/AudioManager.ts`, `src/ui/UIManager.ts`, and `src/style.css`:
  - Leak-free `loadStage(stageId, playIntro)` + `cinematics.setEnvironment(env)`.
  - `localToWorld` portal Boss intros (`portal.yaw`), `~100ms` pre-slam Boss silence, 4-beat Boss chain explosion, animated Stage 5 `supplyChest.claspMesh` pop-open (resetting on restart) + M1's non-bleaching `vfx.spawnChestOpenCelebration(chestPos)`.
  - Desktop `1440×900` (`distScale ~ 1.07–1.10`) & mobile `390×844` (`distScale` cap `~3.25` + portrait Stage 5 camera) framing fixes.
  - Multi-lane spawning/movement (`sampleLaneAtDistance`), speed-rail zones, remaining-distance targeting (`lane.totalLength - e.distanceTraveled`), elevation-aware raycasting (`y = (pad.y ?? 0) + 0.15`), `mode === 'playing'` build guard.
  - Clickable/cooldown Interactive 3D Mechanisms (`High-Ground` `+18%` range / `+15%` DMG, `Crystal Vein` Gold + `💎` + 3D loot, `Capacitor Pylon` chain-lightning AoE shock/stun/shield-strip, `Laser Gate` slow/burn barrier).
  - Shield absorption (`shieldHp`), death-split (`splitter_rover -> 2x mini_scout`), ally repair pulse (`repair_drone`), interactive Boss `weakPointCore` (`1.25x` bonus damage), final-wave `+200G/+4💎` clear bonus & straggler cleanup, decoupling mid-run/Endless Boss kills from premature victory.
  - WebAudio SFX hooks: Beacon damage alarm, Defeat shutdown, Beam ignite, Boss sub-explosion, Mechanism activation SFX.
  - Remove hardcoded `BUILD_PADS` import in `UIManager.ts`, add `#btn-open-hub` stage selector modal/drawer (`#sector-hub-modal` with Chapters 1–4 + Endless + `"全战区演练解锁"` toggle + `"🚀 立即出击"` CTA) and `#btn-next-sector` `"▶ 下一战区"` on `#victory-screen`.

### M2.4 — Atomic Standalone Bundler & `:5173` Preview Daemon Sync #1
- Update `src/main.ts` at `bootstrap()` (`isTopWindow || protocol.startsWith('http') || window.innerHeight >= 620` -> `html.is-top-window` `100%` height, keeping `<agent-embed>` at `580px` zero-collapse + `740px` `.expanded-embed`).
- Create `scripts/bundle_standalone.mjs` (building IIFE into `/tmp/lunar_iife_dist`, writing `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/starforge_ark_cradle.html` & updating `.metadata.json`, asserting `0` external CDN `<script>`/`<link>`/`@import` URLs and `#app` `580px` rule; sync `scratch/bundle_standalone.mjs` forwarder) and set `"build": "tsc && vite build && node scripts/bundle_standalone.mjs"` in `package.json`.
- Run `npm run build` (`exit 0`) AND launch `npx vite preview --host 0.0.0.0 --port 5173` (`IsDaemon: true`), verifying `curl -sSfI http://localhost:5173` returns `200 OK`.
