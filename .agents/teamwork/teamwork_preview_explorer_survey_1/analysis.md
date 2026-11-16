# Survey Track 1 — Comprehensive Code Audit (`analysis.md`)

**Core Summary**: `/home/antigravity/GOD-OF-PPT/tdk` (*《月海信标 · 终末检修站》LUNAR BEACON: LAST RELAY*) implements a well-structured, clean-compiling (`npx tsc --noEmit` 0 errors) Three.js + GSAP + WebAudio 3D mecha tower defense game with genuine playable closed-loop mechanics across all 5 cinematic stages, 3 towers, 5 enemy archetypes, 8 waves, responsive desktop/mobile HUD, and standalone HTML bundling. However, deep code inspection and deterministic combat simulation uncovered **6 concrete gameplay/balance/audio/test defects** — most critically that **a single upgraded Tier-4 Autocannon placed on `pad_03` or `pad_06` solos all 8 waves including the Final Boss** (violating `"不能一座塔自动打完"`), and **killing the Wave 8 Boss skips Wave 8's clear bonus while freezing living straggler enemies mid-road with visible HP bars/slow rings throughout the Victory scene**.

---

## Master Audit Status Matrix

| # | Audit Item | Status | Evidence Reference |
|---|---|---|---|
| 1.1 | Repository Layout, Configs (`package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`, `README.md`) & Module Boundaries | `COMPLETE & VERIFIED IN CODE` | `package.json:1-22`, `tsconfig.json:1-24`, `vite.config.ts:1-20`, `src/**` |
| 1.2 | Git Repository Commit History (`.git/` initialized on `main`, 0 commits) & External `scratch/bundle_standalone.mjs` Location | `PARTIAL / DEFECTIVE` | `.git/` (uncommitted working tree); bundle script lives in artifact dir `.../scratch/bundle_standalone.mjs:1-74`, not inside repo |
| 2.1 | Full Closed Loop: Opening -> Deploy -> Preview/Build -> Combat -> Upgrade (T1–T4) -> Wave 4 Elite -> Wave 8 Boss -> Victory -> 3D Crate Claim -> Play Again | `COMPLETE & VERIFIED IN CODE` | `src/game/GameEngine.ts:77, 317-686, 1272-1359`, `src/ui/UIManager.ts:598-660` |
| 2.2 | Defeat Condition (`beaconHp <= 0`), Pause / Resume, `1x` / `2x` Speed, Restart | `COMPLETE & VERIFIED IN CODE` | `src/game/GameEngine.ts:317-374, 630-651, 992-1001`, `src/ui/UIManager.ts:559-596` |
| 2.3 | 8-Wave Structure, Inter-Wave Deployment Phase & "Start Next Wave" Control | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:489-597`, `src/game/GameEngine.ts:582-628`, `src/ui/UIManager.ts:308-327` |
| 2.4 | Wave 8 Boss Kill Cleanup & Wave 8 Clear Bonus Settlement | `PARTIAL / DEFECTIVE` | `src/game/GameEngine.ts:705-720, 1272-1301, 1319-1359` — Wave 8 `+200G / +4 Crystals` skipped; stragglers freeze on road with HP bars/slow rings |
| 2.5 | Economy & HUD Stats (Gold, Energy Crystals, Beacon HP, Wave, Kills) & Tower Sell (`75%` Explicit Refund Before Selling) | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:14-24`, `src/game/GameEngine.ts:557-580, 1547`, `src/ui/UIManager.ts:85-109, 424-427` (Note: Crystals are collectible/stat-only with no spend sink) |
| 3.1 | Twin Autocannon (`autocannon`): Single-Target, High Fire Rate, Turret Yaw Tracking, Alternating Barrel Recoil, Hitscan Armor-Pierce Damage | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:221-282`, `src/game/GameEngine.ts:1103-1144`, `src/render/TowerFactory.ts:188-352` |
| 3.2 | Pulse Mortar (`mortar`): Low Fire Rate, Predictive Ground Coordinate Target, Parabolic Flight, True AoE Splash (`100%` inner / `78%` outer) | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:284-345`, `src/game/GameEngine.ts:1146-1187`, `src/fx/VfxManager.ts:130-194, 490-506` |
| 3.3 | Magnetic Confinement Tower (`magnetic`): Pre-Fire Ring/Clamp/Core Wind-up, Purple Field Pulse, Slow Duration & Visual Ring, Non-Infinite Stacking | `PARTIAL / DEFECTIVE` | `src/game/GameEngine.ts:910-920, 1068-1088, 1189-1209, 1395` — Non-stacking cap (`<=60%`) works, **but** Boss trigger range (`+0.65m`) > hit range (`+0.60m`) causes whiffed pulses, and T1 (`32%`) refreshes T4 (`60%`) indefinitely |
| 3.4 | Target Death Handling (Immediate Retargeting, Zero Corpse Chasing, Zero Double Kill/Gold Settlement) | `COMPLETE & VERIFIED IN CODE` | `src/game/GameEngine.ts:1090-1095, 1178, 1197, 1217, 1256-1270, 1361-1388` |
| 4.1 | Enemy Archetypes (`rover`, low-flying `swarm` w/ dynamic altitude shadow, armored `drill` w/ metallic sparks & clank, Wave 4/7 `elite_drill`) | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:411-471`, `src/game/GameEngine.ts:870-894, 1012-1031, 1233-1237`, `src/render/EnemyFactory.ts:45-197` |
| 4.2 | Wave 8 Final Boss (`boss_crawler`): Tracked Excavator, 3 Breakaway Armor Plates, Telegraphed Ground-Slam Stun Skill + Red Warning Circle, Energy Weakpoint | `PARTIAL / DEFECTIVE` | `src/render/EnemyFactory.ts:199-323`, `src/game/GameEngine.ts:922-979, 1240-1253` — Model, 3 breakaway plates (`-0.10` armor each), & telegraphed stun slam are complete; `weakPointCore` is purely visual (rotates only, no exposed-core bonus/crit mechanic despite Wave 8 subtitle) |
| 4.3 | Path Following (`>=2.80m` Pad Clearance, Non-Blocking Road), Beacon Exit Damage, On-Demand Health Bar Visibility | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:70-216`, `src/game/GameEngine.ts:827-828, 981-1010, 1226, 1258`, `src/render/EnemyFactory.ts:358-384` |
| 5.1 | Numerical Balance: Wave 1 Not Auto-Lose & Multi-Tower Strategy Clears Wave 8 Boss Without Cheats | `COMPLETE & VERIFIED IN CODE` | `src/config/gameConfig.ts:15-17, 489-597` — Wave 1 leaks max `7/20` HP with 0 towers; balanced zero-cheat build clears W8 at `20/20` HP |
| 5.2 | Numerical Balance: "1 Single Tower Cannot Solo All 8 Waves (`不能一座塔自动打完`)" | `PARTIAL / DEFECTIVE` | `src/config/gameConfig.ts:269-280, 472-486` — 1 un-upgraded T1 tower loses at W2–W5, **BUT** 1 single `Autocannon` upgraded to T4 on `pad_03` (`8/20` HP) or `pad_06` (`16/20` HP) **solos all 8 waves + Final Boss** |
| 6.1 | Web Audio Synthesis, Synchronization & Mute Toggle | `PARTIAL / DEFECTIVE` | `src/audio/AudioManager.ts:1-218` — Mute toggle & 15 synth SFX work cleanly; **missing** Beacon damage/Defeat SFX (`GameEngine.ts:986-1001`), missing Beacon beam / Elite spawn SFX, and `playTowerBuildLand()` fires `0.16s` before base impact (`CinematicDirector.ts:156`) |
| 6.2 | UI/HUD Material Clarity, Zero Text Clutter, 3-Step Onboarding, Desktop/Iframe & Mobile Portrait Responsiveness | `COMPLETE & VERIFIED IN CODE` | `src/ui/UIManager.ts:1-662`, `src/style.css:1-1029`, `src/game/GameEngine.ts:271-305` (Minor note: `.hud-top-bar` `nowrap` is tight at `<=360px` width) |
| 7.1 | Test Suite Coverage (`tests/e2e.mjs` & `package.json` scripts) | `PARTIAL / DEFECTIVE` | `tests/e2e.mjs:1-472`, `package.json:6-11` — Zero unit tests; E2E injects `+2850G` cheat gold (`debugAddGold`), never tests legit economy clear, misses T4 single-tower solo exploit, and hardcodes external `SHOT_DIR` + external server |

---

## 1. Repository & Architecture Map

### 1.1 Complete File Tree
```text
/home/antigravity/GOD-OF-PPT/tdk/
├── .agents/teamwork/                 # Teamwork orchestration & survey metadata
├── .git/                             # Initialized git repo on branch `main` (0 commits yet; all files untracked)
├── .gitignore                        # Standard Vite/Node ignores (node_modules, dist, logs)
├── index.html                        # Entry HTML (#app > canvas#game-canvas + div#ui-layer, /src/main.ts)
├── package.json                      # lunar-beacon-last-relay v2.0.0 (three ^0.187.0, gsap ^3.15.1, vite ^8.3.6, typescript ~7.0.2, playwright-core ^1.65.1)
├── package-lock.json                 # Locked npm dependencies
├── README.md                         # Project documentation, 5-stage spec overview & CLI commands
├── tsconfig.json                     # Strict ES2023 + DOM bundler config (noUnusedLocals, noUnusedParameters, noEmit)
├── vite.config.ts                    # base: './', server & preview bound to 0.0.0.0:5173 (strictPort, allowedHosts: true)
├── public/
│   └── favicon.svg                   # Custom #1A1033-outlined mecha beacon SVG icon
├── dist/                             # Production Vite build output
│   ├── index.html
│   ├── favicon.svg
│   └── assets/
│       ├── index-7MgS_FIK.css
│       └── index-CjsPOqzO.js
├── src/
│   ├── main.ts                       # (54 lines) Bootstrap, iframe vs top-window detection, error fallback, window.__LUNAR_BEACON_GAME__
│   ├── types.ts                      # (267 lines) Domain types: GameMode, TowerBlueprint, EnemyBlueprint, Rigs, UISnapshot
│   ├── style.css                     # (1029 lines) Enamel/metallic HUD styling, 580px embed height, animations, <=640pxh & <=720pxw media queries
│   ├── config/
│   │   └── gameConfig.ts             # (598 lines) Constants, 4 tiers, filleted Bezier road sampler, 10 build pads, 3 towers x 4 tiers, 5 enemies, 8 waves
│   ├── game/
│   │   ├── GameEngine.ts             # (1651 lines) Core simulation loop, state machine, spawning, targeting, combat, raycast input, test hooks
│   │   └── CinematicDirector.ts      # (806 lines) GSAP 5-stage choreography (opening, build/T2-T3/T4 reveal, boss entrance, elite/boss kill, chest drop & open)
│   ├── render/
│   │   ├── ToonMaterials.ts          # (346 lines) 4-step DataTexture cel ramps, procedural CanvasTextures, MeshToonMaterial + Fresnel rim shader
│   │   ├── ToonOutlineComposer.ts    # (292 lines) 5-pass 1.5x supersampled + WebGL2 MSAA Normal/Depth #1A1033 outline composer + Layer 1/vfxScene isolation
│   │   ├── TowerFactory.ts           # (689 lines) 3D procedural rigs for 3 towers across T1–T4 modular geometry + 3D hologram ghost preview
│   │   ├── EnemyFactory.ts           # (402 lines) 3D procedural rigs for 5 enemy types + Layer 1 shadowBlob, slowRing, on-demand hpBarGroup
│   │   └── BeaconAndPropsFactory.ts  # (703 lines) Thick 3D lunar slab, haulage road mesh, 10 pads, Return Beacon, Mine Entrance, 3D Supply Chest, 3D Coin/Crystal
│   ├── fx/
│   │   └── VfxManager.ts             # (633 lines) Muzzle tracers, parabolic mortar shells, ground rings, dust/sparks/suction, 3D armor debris, 3D loot physics
│   ├── audio/
│   │   └── AudioManager.ts           # (219 lines) Zero-asset WebAudio procedural synth + DynamicsCompressor + rate limiting + localStorage mute
│   └── ui/
│       └── UIManager.ts              # (662 lines) Signature-diffed DOM HUD, rolling counters, 3-step onboarding, build tray, inspector, modals
└── tests/
    └── e2e.mjs                       # (472 lines) Playwright + SwiftShader desktop 5-stage & mobile 390x844 E2E suite
```

### 1.2 External Artifact & Bundler Scripts (`ORIGINAL_REQUEST.md:10-13, 34`)
- `/home/antigravity/scratch` does **not** exist; instead, the standalone bundler script referenced in `ORIGINAL_REQUEST.md:12` is located inside the conversation artifact directory at:
  - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/scratch/bundle_standalone.mjs` (`lines 1-74`), which runs Vite programmatically in IIFE mode (`inline` CSS + JS + base64 `favicon.svg`, zero external CDN links) to generate `starforge_ark_cradle.html` (`767,910` bytes).
  - `/home/antigravity/.gemini/jetski/brain/v1/default/jetski_remote_agents_3p/f6fabcef-a753-4205-80c4-c51780e14bd7/Starforge Ark Cradle.url.json` points to `http://localhost:5173` (currently active and listening on `0.0.0.0:5173`).
- **Architectural Gap**: `bundle_standalone.mjs` is not checked into `/home/antigravity/GOD-OF-PPT/tdk/scripts/` or wired into `package.json` scripts, meaning if source code in `src/` is updated during bug-fixing, `npm run build` will update `dist/` without automatically regenerating `starforge_ark_cradle.html` unless `node .../scratch/bundle_standalone.mjs` is also run.

### 1.3 Module Boundaries, State Management & Game Loop Architecture
- **Unidirectional State Flow**:
  - `GameEngine` owns all authoritative mutable simulation state (`mode`, `beaconHp`, `gold`, `crystals`, `kills`, `waveIndex`, `towers`, `enemies`, `selectedPadId`, `previewTowerType`).
  - State changes and a `0.14s` periodic sync (`GameEngine.ts:731-735`) call `emitSnapshot()` (`GameEngine.ts:1599-1601`) -> `UIManager.updateSnapshot(snap: UISnapshot)` (`UIManager.ts:238-334`).
  - `UIManager` uses string signatures (`lastTraySig`, `lastModalSig`, `nextWaveWrap.dataset.sig`, `UIManager.ts:59-60, 310, 351, 470, 551`) so periodic `0.14s` snapshots never thrash DOM buttons or destroy active click handlers mid-tap.
- **Dual-Clock Simulation Loop (`GameEngine.ts:254-262, 690-740`)**:
  - Driven by `gsap.ticker.add(this.onTickerFrame)` with `rawDt = Math.min(0.05, this.clock.getDelta())`.
  - When `mode === 'paused'`, `stepFrame` freezes both `simDt = 0` and `realDt = 0` while still rendering (`GameEngine.ts:691-698`).
  - When `mode === 'playing'`, `simDt = rawDt * this.speedMultiplier * activeScale` (where `activeScale = Math.min(this.simTimeScale, this.hitStopScale)` handles Elite `0.24x` hit-stop and Boss `0.2x` slow-mo), driving `updateWaveSpawner(simDt)`, `updateEnemies(simDt)`, `updateTowers(simDt)`, `checkWaveCompletion()`, and `vfx.update(simDt, rawDt)`.
  - During `opening`, `legendary_reveal`, `boss_intro`, `victory_cinematic`, `victory_panel`, `reward_claiming`, and `reward_claimed`, combat simulation pauses automatically (`updateEnemies`/`updateTowers` skipped) while `vfx.update(0, rawDt)` continues animating 3D coins, crystals, rings, and particles (`GameEngine.ts:717-720`).

---

## 2. Complete Playable Loop & Mechanics

### 2.1 Full Closed-Loop State Machine (`COMPLETE & VERIFIED IN CODE`)
All 10 `GameMode` states in `src/types.ts:15-25` are wired end-to-end:
1. **`opening`** (`GameEngine.ts:359-367`, `CinematicDirector.ts:88-148`): `1.75s` lunar fly-in + sequential ignition of 4 Return Beacon status lamps (`0.28s, 0.52s, 0.76s, 1.00s`), gracefully skippable if player taps a pad (`GameEngine.ts:384-389`) or clicks Start Wave (`GameEngine.ts:583-587`).
2. **Inter-Wave Deployment & Preview/Build (`playing`, `waveInProgress === false`)**:
   - Tapping any of the 10 build pads via 3D ground-plane raycast (`GameEngine.ts:1468-1505`, generous `1.48m` tap radius) opens `#build-tray` with 3 compact cards (`UIManager.ts:474-515`).
   - First click on a tower card sets `previewTowerType`, spawns a translucent 3D hologram model (`createGhostTowerPreview` on Layer 1, `TowerFactory.ts:669-688`), displays the weapon-colored `rangeRing` (`GameEngine.ts:1440-1447`), and enables `#btn-confirm-build` (or disables it + triggers `#insufficient-toast` shake if `gold < cost`, `GameEngine.ts:436-439`, `UIManager.ts:503-506`).
   - Confirming build deducts gold, constructs the Tier-1 3D rig, and plays Stage 2A squash-and-dust assembly (`GameEngine.ts:455-489`, `CinematicDirector.ts:154-193`).
3. **Combat & Upgrades (`T1 -> T2 -> T3 -> T4`)**:
   - `T1 临时装配` (`#2ECC71`) -> `T2 标准战备` (`#3B82F6`) -> `T3 精英模块` (`#A855F7`): `upgradeSelectedTower()` (`GameEngine.ts:546-552`) keeps `mode = 'playing'` (non-blocking!), lifts the turret, flies new 3D geometry modules along parabolic arcs (`CinematicDirector.ts:199-287`), updates core/trim/nameplate/rim colors without dyeing main armor (`TowerFactory.ts:636-654`), and slams character-by-character title + `▲+数值` chips (`UIManager.ts:173-207`).
   - `T4 传说机甲` (`#F59E0B`): Enters `mode = 'legendary_reveal'` (`GameEngine.ts:533-545`), clears stray combat flashes (`vfx.clearCombatTransients()`), pauses combat simulation, zooms Hero Camera + golden spotlight + radial backdrop onto the protagonist tower, flies in heavy T4 armor/gears/hinged flaps, slams `传说·<塔名>`, orbits briefly, and returns to battle (`CinematicDirector.ts:292-463`).
4. **Wave 4 Elite & Wave 8 Boss**:
   - Wave 4 spawns `elite_drill` (`WAVE_CONFIGS[3]`, `gameConfig.ts:536`); Wave 7 spawns `2x elite_drill` (`gameConfig.ts:577`). Killing an Elite triggers Stage 4A `0.22s` hit-stop (`0.24x` scale), orange energy burst, 3D armor debris, and 3D coins + crystals (`GameEngine.ts:1304-1309`, `CinematicDirector.ts:591-596`).
   - Wave 8 triggers `mode = 'boss_intro'` (`GameEngine.ts:785-802`), playing Stage 3 entrance tremor, rapid hazard beacons, glowing ground fissures, inward suction particles, `~1.0s` rising turbine pitch -> `0.12s` sudden contraction -> shockwave spawn of `boss_crawler` (`CinematicDirector.ts:470-586`).
5. **Victory Settlement & Interactive 3D Supply Crate Claim (`victory_cinematic -> victory_panel -> reward_claiming -> reward_claimed`)**:
   - Killing `boss_crawler` triggers `playBossDefeatAndBeaconVictory` (`GameEngine.ts:1283-1299`, `CinematicDirector.ts:601-756`): `0.2x` slow-mo chain explosions on Boss -> camera pans to Return Beacon -> skyward evacuation beam ignites -> 3D armored `supplyChest` drops onto Beacon Plaza with squash/rebound & lunar dust -> `mode = 'victory_panel'` shows 1–3 stars and `#btn-claim-rewards`.
   - Player can either click `#btn-claim-rewards` (`UIManager.ts:652-655`) **or** tap the 3D Supply Chest directly on the canvas (`GameEngine.ts:1485-1491`), entering `reward_claiming` -> popping front clasp, swinging hinged `lidPivot` open (`-2.05 rad`), fountaining 8 real 3D Gold Coins + 8 real 3D Faceted Energy Crystals (`CinematicDirector.ts:762-804`), crediting `+320` Gold, `+8` Crystals, `+1` persistent commendation (`GameEngine.ts:669-678`), and transitioning to `reward_claimed` with `#btn-play-again` (`完成领奖 · 再次挑战`).
6. **Defeat & Restart / Speed / Pause**:
   - When `beaconHp` reaches `0` (`GameEngine.ts:996-1001`), `mode = 'defeat'` opens `#defeat-modal` with `#btn-retry-defeat` -> `startNewMission(false)`.
   - `#btn-pause` toggles `playing <-> paused` (`GameEngine.ts:637-651`) with `#btn-resume` and `#btn-restart-pause`.
   - `#btn-speed` toggles `speedMultiplier` between `1` and `2` (`GameEngine.ts:630-635`).

### 2.2 Economy, Selling & Controls (`COMPLETE & VERIFIED IN CODE`)
- **HUD Stats**: Beacon HP (`20/20`), Gold (`260` initial), Energy Crystals (`0` initial), Wave (`1/8`), Kills (`0`) all render live in `.hud-top-bar` (`UIManager.ts:85-109, 240-260`) with `320ms` cubic ease-out number rolling (`rollNumber`, `UIManager.ts:222-236`).
- **Explicit Sell Refund**: `sellRefund = Math.round(tw.totalInvestedGold * 0.75)` (`GameEngine.ts:562, 1547`) is rendered **directly on `#btn-sell-tower`** as `出售 +${tw.sellRefund}` (`UIManager.ts:424-427`) before clicking, and spawns 3D coin visual feedback on sale (`GameEngine.ts:566-572`).
- **Design Note on Energy Crystals**: Energy Crystals (`crystals`) are earned from Elite kills (`+2`), Boss kill (`+5`), Wave clears (`+1..+4`), and the Victory Supply Chest (`+8`), and rendered as 3D faceted gems + HUD/Victory counters. `ORIGINAL_REQUEST.md:74-75` specifies `"包含金币、能源晶体、信标耐久、波次和击杀统计。击杀获得金币，金币用于建造和升级。"`, so having Gold as the sole build/upgrade currency matches the literal prompt, though Energy Crystals currently have no spend sink.

### 2.3 Defects Found in Loop & Wave 8 Settlement (`PARTIAL / DEFECTIVE`)
1. **DEFECT A — Wave 8 Clear Bonus Never Awarded & Straggler Enemies Freeze Forever on Boss Kill (`src/game/GameEngine.ts:705-720, 1272-1301, 1319-1359`)**:
   - In `applyDamageToEnemy()` (`GameEngine.ts:1272-1286`), when `enemy.isBoss` dies:
     ```ts
     this.waveInProgress = false;
     // Clear any straggler minor enemies cleanly in the shockwave
     for (const other of this.enemies) {
       if (other.id !== enemy.id && !other.dead) {
         other.dead = true;
         other.dyingTimer = 0.25;
       }
     }
     this.mode = 'victory_cinematic';
     ```
   - **Bug 1 (Skipped Bonus)**: Because `this.waveInProgress = false` and `this.mode = 'victory_cinematic'` are set immediately, `checkWaveCompletion()` (`GameEngine.ts:1320`: `if (!this.waveInProgress || this.mode !== 'playing') return;`) immediately exits. Thus `WAVE_CONFIGS[7]`'s `clearGoldBonus: 200` and `clearCrystalBonus: 4` (`src/config/gameConfig.ts:586-587`) are **never granted** when winning via Boss kill!
   - **Bug 2 (Frozen Stragglers & Visible HP Bars/Slow Rings)**: Setting `other.dead = true; other.dyingTimer = 0.25;` relies on `updateEnemies(simDt)` (`GameEngine.ts:871-894`) to animate their collapse and remove `other.rig.root` from `this.enemyGroup`. **However**, `updateEnemies(simDt)` is ONLY called inside `if (this.mode === 'playing')` (`GameEngine.ts:705-713`)! Once `this.mode` enters `'victory_cinematic' -> 'victory_panel' -> 'reward_claiming' -> 'reward_claimed'`, `updateEnemies` **never runs again**, AND `other.rig.hpBarGroup.visible` / `other.rig.slowRing.visible` were not set to `false`! Any Wave 8 `swarm` or `drill` still alive on the road when the Boss dies remains permanently frozen mid-road with floating HP bars/slow rings during the entire Victory cinematic and Supply Chest scene!
2. **DEFECT B — Missing Mode Guard in `previewOrBuildTower` (`src/game/GameEngine.ts:424-426`)**:
   - Unlike `upgradeSelectedTower()` (`if (this.mode !== 'playing' || !this.selectedPadId) return false;` at `line 493`), `previewOrBuildTower()` does not check `this.mode === 'playing'`. While UI hides `#build-tray` outside `'playing'`, programmatic calls can build towers during `paused`, `boss_intro`, or `victory_panel`.
3. **DEFECT C — Minor Restart Visual/Timer Residue (`src/game/GameEngine.ts:317-374, 622-624, 1350-1352`)**:
   - `startNewMission()` does not reset `this.env.beacon.signalFins` rotation (`z = -0.35` back to `-0.22` after victory, `BeaconAndPropsFactory.ts:215` vs `CinematicDirector.ts:717`) or `this.env.entrance.hazardLampMats` (`emissiveIntensity: 3.2` back to `0.45` if interrupted mid `boss_intro`), nor clear pending `window.setTimeout` banner auto-hide timers (`lines 622, 1350`).

---

## 3. Three Defense Towers (Real Behavior & Edge Cases)

### 3.1 Twin Autocannon (`联装机炮`, `autocannon`) — `COMPLETE & VERIFIED IN CODE`
- **3D Structure & Tier Evolution (`src/render/TowerFactory.ts:188-352`)**: Low, wide cream-white housing over deep-blue base, side ammo boxes + hazard stripes, rear radiator grilles, orange-amber muzzle brakes (`#FF9F1C`). Evolves through T2 cheek shields + rangefinder + 4 outriggers -> T3 twin rotary drum magazines -> T4 full mecha pauldrons, horned visor helm, hinged vent flaps, and spinning 10-tooth rear feed gear (`specialGear`).
- **Combat Mechanics (`src/game/GameEngine.ts:1103-1144`)**:
  - Acquires farthest-along-road living enemy in range (`acquireBestTarget`, `lines 1373-1388`), yaws `turretYaw.rotation.y` smoothly toward `atan2(dx, dz)` (`line 1110`), and fires when `cooldown <= 0 && Math.abs(diff) < 0.38`.
  - Alternates left/right barrels via `shotToggle % 2` (`lines 1128-1133`), snapping active barrel from `z = 0.36` back to `0.14` and lerping back (`lines 1047-1048`).
  - Spawns short `0.085s` orange-yellow flash + `<=2.2m` streak (`VfxManager.ts:101-125`) and applies instant hitscan damage with `armorPierce` (`0.05 -> 0.36`).

### 3.2 Pulse Mortar (`脉冲迫击炮`, `mortar`) — `COMPLETE & VERIFIED IN CODE`
- **3D Structure & Tier Evolution (`src/render/TowerFactory.ts:353-485`)**: Tall twin A-frame stanchions, elevated heavy mortar tube (`weaponPitch.rotation.x = -0.58`), rear cyan energy cell (`#22D3EE`). Evolves through T2 front blast apron + outriggers -> T3 lateral cyan plasma accumulator pods -> T4 siege crown, hinged rear capacitor bay doors (which swing open `+-0.45 rad` on fire, `GameEngine.ts:1153-1158`), and 12-tooth elevation gear.
- **Combat Mechanics (`src/game/GameEngine.ts:1146-1187`, `src/fx/VfxManager.ts:130-194, 490-506`)**:
  - Leads target along the haulage road by `0.35s` (`leadDist = Math.min(TOTAL_ROAD_LENGTH, target.distanceTraveled + target.baseSpeed * (1 - target.slowRatio) * 0.35)`, `line 1165`) and launches a cyan parabolic shell (`y += 4 * arcHeight * u * (1 - u)`, `duration = 0.44s..0.68s`) to ground coordinate `(predSample.x, predSample.z)`.
  - On impact, damages **all living enemies** within `splashRadius + (e.isBoss ? 0.8 : 0.25)` (`100%` damage within `0.55 * splashRadius`, `78%` damage in outer splash ring, `lines 1180-1182`). Because shells target ground coordinates rather than enemy references, shells never chase dead corpses.

### 3.3 Magnetic Confinement Tower (`磁场约束塔`, `magnetic`) — `PARTIAL / DEFECTIVE`
- **3D Structure & Anticipation (`src/render/TowerFactory.ts:486-603`, `src/game/GameEngine.ts:1068-1088`)**: Upright 3-pylon gantry, suspended purple torus ring (`#C084FC`), faceted tier-colored octahedron core, and 3 hinged emitter clamps. During `0.36s` pre-fire wind-up (`isCharging`), ring spin accelerates `2.1 -> 9.5 rad/s`, core spin accelerates `2.5 -> 14 rad/s`, and clamps expand outward to `0.36 rad` before snapping inward (`-0.15 rad`) on pulse. Evolves through T2 coil cowls -> T3 counter-rotating tilted outer torus -> T4 spire crown with 4 hinged petals + 14-tooth lower drive gear.
- **Non-Stacking Slow Verification (`src/game/GameEngine.ts:910-920, 982, 1200-1205`)**:
  - Applies `effectiveSlow = e.isBoss ? stats.slowRatio * 0.55 : stats.slowRatio` via `e.slowRatio = Math.max(e.slowRatio, effectiveSlow)` and `e.slowTimer = Math.max(e.slowTimer, stats.slowDuration)`.
  - **Verified**: Multiple Magnetic Towers **cannot** stack slow additively or multiplicatively above `60%` (`33%` on Boss), and enemies can **never** be permanently frozen (`effSpeed >= 0.40 * baseSpeed`), while `e.rig.slowRing` clearly rotates beneath slowed enemies until `slowTimer <= 0`.
- **Two Subtle Edge-Case Bugs Found**:
  1. **Boss Trigger Range vs Hit Range Mismatch (`src/game/GameEngine.ts:1395` vs `1199`)**:
     - `hasLivingEnemyInRange()` (`line 1395`) checks `<= range + (e.isBoss ? 0.65 : 0.15)`.
     - `fireMagneticTower()` (`line 1199`) checks `<= stats.range + (e.isBoss ? 0.6 : 0.15)`.
     - When `boss_crawler` is between `stats.range + 0.60m` and `stats.range + 0.65m`, the Magnetic Tower fires, consumes its cooldown, plays pulse VFX/audio, and **deals 0 damage / 0 slow** to the Boss!
  2. **Sticky Higher-Tier Slow Ratio Refreshed by Lower-Tier Tower (`src/game/GameEngine.ts:1202-1203`)**:
     - Because `e.slowRatio = Math.max(e.slowRatio, effectiveSlow)` never decays until `e.slowTimer <= 0`, if an enemy leaves a T4 Magnetic Tower (`60%` slow, `3.5s`) and enters a cheap T1 Magnetic Tower (`32%` slow, pulses every `1.35s` with `2.5s` duration) before `slowTimer` reaches `0`, the T1 tower perpetually refreshes the **60%** slow ratio!
  3. **Unused Timer Field (`src/game/GameEngine.ts:473, 548, 1051-1053`)**: `tower.upgradingTimer` is set on build (`0.45`) and T2/T3 upgrade (`0.52`) and decremented in `updateTowers`, but has zero effect on tower firing or animation.

### 3.4 Target Death Handling — `COMPLETE & VERIFIED IN CODE`
- `applyDamageToEnemy()` (`GameEngine.ts:1217`): Immediately returns if `enemy.dead || enemy.hp <= 0` — **impossible to double-settle kills, gold, or crystals**, even when hit by simultaneous Mortar/Magnetic AoE pulses in the same tick.
- Upon `enemy.hp <= 0` (`GameEngine.ts:1256-1270`): Sets `enemy.dead = true`, hides `hpBarGroup` and `slowRing`, credits `kills` / `gold` / `crystals` once, and loops over `this.towers.values()` to clear `tw.targetEnemyId = null` immediately (`lines 1266-1270`).
- `findValidTarget()` (`GameEngine.ts:1368`) and `acquireBestTarget()` (`line 1378`) both reject `e.dead || e.hp <= 0`, so towers retarget on the very next frame while the dying enemy finishes its `0.34s` collapse animation.

---

## 4. Enemies & Boss Mechanics

### 4.1 Enemy Archetypes, Silhouettes, Locomotion & Death (`COMPLETE & VERIFIED IN CODE`)
| ID | Name | HP | Speed | Armor | Reward | Beacon Dmg | Distinct 3D Rig, Locomotion & Death (`EnemyFactory.ts` / `GameEngine.ts`) |
|---|---|---|---|---|---|---|---|
| `rover` | 失控巡检机 | `92` | `2.25` | `8%` | `16G` | `1` | Compact rust-red rover, cyclops red eye, 4 rolling wheels (`wheels.rotation.x`), chassis bounce; **nose-down collapse & splay** (`GameEngine.ts:879-883`). |
| `swarm` | 运输蜂群机 | `52` | `3.75` | `0%` | `12G` | `1` | Low-altitude flying pod (`y = 0.86m +- 0.11m`), underslung ore canister, twin ducted spinning rotors (`rotors.rotation.y`), **dynamic height-reactive shadow** (`GameEngine.ts:1023-1025`); **spiral crash** (`lines 874-878`). |
| `drill` | 重甲钻探机 | `285` | `1.32` | `42%` | `32G` | `2` | Heavy armored hull, side shield plates, caterpillar tracks + 4 gear sprockets, spinning conical auger (`drillHead.rotation.z`), **bright yellow metallic hit sparks + clank SFX** (`lines 1233-1237`); **sideways hull fracture** (`lines 884-887`). |
| `elite_drill` | 精英·裂岩重钻长机 | `1180` | `1.22` | `48%` | `110G + 2💎` | `4` | `1.48x` scale bright-rust carapace, twin rear smokestacks + crimson octahedron command beacon (`EnemyFactory.ts:187-197`); **Stage 4A slow-mo hit-stop + energy pillar + 3D armor debris** on kill (`GameEngine.ts:1304-1309`). |
| `boss_crawler` | 最终Boss·巨颚号履带采掘母机 | `5200` | `0.88` | `45%` | `260G + 5💎` | `20` | Twin crawler pontoons + 6 gear wheels, command bridge, giant front bore drill, 2-joint hydraulic crusher arm, 3 breakaway armor plates, glowing rear `weakPointCore`; **Stage 4B chain explosions** (`CinematicDirector.ts:601-680`). |

### 4.2 Wave 8 Final Boss Mechanics (`PARTIAL / DEFECTIVE` on Energy Weakpoint Gameplay)
- **Active Skill + Mechanical Wind-Up + Crimson Ground Warning (`COMPLETE & VERIFIED IN CODE`)**:
  - `GameEngine.ts:929-978` & `VfxManager.ts:353-361`: Every `8.8s` (initial `6.5s`, when `4.0 < distanceTraveled < TOTAL_ROAD_LENGTH - 4.0`), Boss halts movement (`effSpeed = 0`) for `1.25s` (`skillTelegraphTimer`), plays warning alarm (`playBossSkillWarning`), raises its 2-joint hydraulic crusher arm (`hydraulicArm.rotation.x = -prog * 0.95`, `forearm.rotation.x = -prog * 0.65`), spins its front drill at `24 rad/s`, displays a pulsing/rotating crimson dashed ground warning circle (`radius = 5.2m`), and shows HUD alert `"⚠ 液压重锤蓄力中 · 注意地面红圈范围震击！"` (`UIManager.ts:280-282`).
  - At `skillTelegraphTimer <= 0`, the arm slams down (`+0.32 / +0.25 rad`), shakes camera (`0.24`), spawns shockwave + dust ring, and **stuns all towers within `5.2m` for `2.2s`** (`tw.stunTimer = 2.2`, drooping `weaponPitch.rotation.x = 0.22` and showing `"震荡停机中"` badge in Inspector).
- **Layered Breakaway Armor (`COMPLETE & VERIFIED IN CODE`)**:
  - `EnemyFactory.ts:257-273` & `GameEngine.ts:1240-1253`: 3 distinct 3D plates (`plateL`, `plateR`, `dorsalShield`) shatter sequentially at `75%`, `50%`, and `25%` HP, spawning 6 cel-shaded 3D armor debris chunks (`spawnArmorBreakDebris`), shaking camera, and reducing Boss `armor` from `0.45 -> 0.35 -> 0.25 -> 0.15`.
- **Energy Weakpoint Mechanic (`PARTIAL / COSMETIC ONLY`)**:
  - `EnemyFactory.ts:240-255` builds a prominent glowing red-orange `OctahedronGeometry` `weakPointCore` inside a yellow cage at `(0, 1.48, -0.46)` beneath `dorsalShield`, and `WAVE_CONFIGS[7].subtitle` (`gameConfig.ts:585`) instructs the player: `"击穿采掘母机分层护甲与能源弱点，守护返航信标！"`.
  - However, in `GameEngine.ts:925-927`, `weakPointCore` **only rotates** (`weakPointCore.rotation.y += dt * 2.6`). There is no weakpoint gameplay mechanic (e.g., no bonus/critical damage multiplier when `dorsalShield` breaks at `25%` HP to expose the core, or during/after the ground-slam recovery window, or from rear-positioned towers, nor any emissive flare/visual state change on `weakPointCore` when exposed). Note that `ORIGINAL_REQUEST.md:91` states `"最终 Boss：大型履带采掘机，具有钻头、机械臂、分层护甲和显眼的能源弱点"`, so visually modeling the weakpoint satisfies the art prompt, while adding an exposed-weakpoint vulnerability multiplier/visual flare when ` armorLayersRemaining === 0` or post-slam would align gameplay 100% with the Wave 8 subtitle.

### 4.3 Path Following, Road Clearance & Health Bar Visibility (`COMPLETE & VERIFIED IN CODE`)
- **Road Geometry & Pad Clearance (`src/config/gameConfig.ts:70-216`, `BeaconAndPropsFactory.ts:555-581`)**:
  - Total road length is `41.58m` with smooth quadratic Bezier fillets (`cornerRadius = 1.42m`) and binary-search distance sampling (`sampleRoadAtDistance`).
  - Road half-width is `1.18m`, pad socket radius is `1.18m` (`sum = 2.36m`), and measured minimum centerline distance across all 10 pads is **`2.80m`** (`pad_07: 2.80m`, `pad_08: 2.90m`, `pad_01/04/05/10: 3.00m`, `pad_09: 3.19m`, `pad_03/06: 3.20m`, `pad_02: 4.32m`). Towers **never** touch or block the road.
- **Health Bar Visibility (`src/game/GameEngine.ts:828, 1226, 1258`, `EnemyFactory.ts:358-384`)**:
  - `rig.hpBarGroup.visible = bp.isElite || bp.isBoss;` at spawn — undamaged normal enemies (`rover`, `swarm`, `drill`) keep the battlefield completely uncluttered, revealing their floating HP bar **only once damaged** (`line 1226`), billboarded cleanly to `camera.quaternion` (`lines 725-729`), plus a top HUD Boss bar during Wave 8 (`UIManager.ts:268-288`).

---

## 5. Numerical Balance Audit

### 5.1 Tower Cost & Effective DPS Table (`src/config/gameConfig.ts:220-409`)
Damage formula (`GameEngine.ts:1219-1220`):
`effectiveArmor = Math.max(0, enemy.armor * (1 - armorPierce))`
`finalDamage = Math.max(2, Math.round(rawDamage * (1 - effectiveArmor)))`

| Tower | Tier | Step Cost | Cum. Cost | Raw Dmg | Interval | Range | Raw DPS | Eff. DPS vs Rover (`8%` A) | Eff. DPS vs Drill (`42%` A) | Eff. DPS vs Boss (`45%` A) | DPS / 100G (Raw) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Autocannon** | T1 | `90G` | `90G` | `16` | `0.34s` | `5.4m` | `47.1` | `44.1` | `29.4` | `26.5` | `52.3` |
| **Autocannon** | T2 | `110G` | `200G` | `26` | `0.29s` | `5.8m` | `89.7` | `82.8` | `55.2` | `55.2` | `44.8` |
| **Autocannon** | T3 | `165G` | `365G` | `41` | `0.24s` | `6.2m` | `170.8` | `158.3` | `116.7` | `112.5` | `46.8` |
| **Autocannon** | T4 | `240G` | **`605G`** | `68` | `0.19s` | `6.7m` | **`357.9`** | **`342.1`** | **`263.2`** | **`252.6`** | **`59.2`** |
| **Mortar** (AoE) | T1 | `120G` | `120G` | `46` | `1.75s` | `6.4m` | `26.3` | `25.1` | `18.9` | `18.9` | `21.9` |
| **Mortar** (AoE) | T2 | `140G` | `260G` | `76` | `1.58s` | `6.9m` | `48.1` | `46.2` | `36.7` | `36.1` | `18.5` |
| **Mortar** (AoE) | T3 | `200G` | `460G` | `122` | `1.42s` | `7.4m` | `85.9` | `83.1` | `70.4` | `69.7` | `18.7` |
| **Mortar** (AoE) | T4 | `290G` | `750G` | `198` | `1.25s` | `8.0m` | `158.4` | `155.2` | `140.0` | `138.4` | `21.1` |
| **Magnetic** (AoE+Slow) | T1 | `100G` | `100G` | `14` | `1.35s` | `5.1m` | `10.4` | `9.6` | `7.4` | `6.7` | `10.4` (`32%` slow) |
| **Magnetic** (AoE+Slow) | T2 | `115G` | `215G` | `24` | `1.22s` | `5.5m` | `19.7` | `18.9` | `13.9` | `13.9` | `9.2` (`41%` slow) |
| **Magnetic** (AoE+Slow) | T3 | `165G` | `380G` | `38` | `1.08s` | `6.0m` | `35.2` | `33.3` | `26.9` | `26.9` | `9.3` (`50%` slow) |
| **Magnetic** (AoE+Slow) | T4 | `245G` | `625G` | `64` | `0.94s` | `6.6m` | `68.1` | `66.0` | `56.4` | `55.3` | `10.9` (`60%` slow) |

### 5.2 Wave Composition, EHP & Cumulative Economy (`src/config/gameConfig.ts:489-597`)
Initial Gold = **`260G`**, Max Beacon HP = **`20`**.

| Wave | Composition | Units | Total Raw HP | Base EHP (0% Pierce) | Max Leak Beacon Dmg | Kill Gold + Clear Bonus | Cumulative Gold After Wave |
|---|---|---|---|---|---|---|---|
| **W1** | `7x rover` | `7` | `644` | `700` | `7` (`<20`!) | `112G + 45G = 157G` | `417G` |
| **W2** | `5x rover, 8x swarm` | `13` | `876` | `916` | `13` | `176G + 55G = 231G` | `648G` |
| **W3** | `3x drill, 7x rover` | `10` | `1,499` | `2,174` | `13` | `208G + 65G = 273G` | `921G` |
| **W4** (Elite) | `6x rover, 1x elite_drill, 9x swarm` | `16` | `2,200` | `3,337` | `19` | `314G + 85G = 399G` | `1,320G` |
| **W5** | `12x swarm, 5x drill, 8x rover` | `25` | `2,785` | `3,881` | `30` | `432G + 95G = 527G` | `1,847G` |
| **W6** | `7x drill, 14x swarm` | `21` | `2,723` | `4,168` | `28` | `392G + 115G = 507G` | `2,354G` |
| **W7** (2x Elite) | `10x rover, 2x elite_drill, 16x swarm, 5x drill` | `33` | `5,537` | `8,827` | `44` | `732G + 140G = 872G` | `3,226G` |
| **W8** (Boss) | `6x rover, 1x boss_crawler, 12x swarm, 4x drill` | `23` | `7,516` | `12,644` | `46` (Boss=`20`) | `628G + 200G* = 828G` | `4,054G` (`3,854G` before W8 bonus) |

### 5.3 Deterministic Simulation Findings across All 3 Balance Rules
We simulated the exact `GameEngine` combat loop (with `dt = 0.05s`, road sampling, turret yaw tracking + `0.38 rad` firing cone, parabolic mortar delay + splash falloff, magnetic slow, Boss `1.25s` telegraph + `5.2m` `2.2s` tower stun, and Boss `75%/50%/25%` armor plate breaks):

1. **Rule 1 — Wave 1 Is Never Auto-Lose (`COMPLETE & VERIFIED`)**:
   - Wave 1's 7 Rovers deal at most `7` Beacon damage total vs `20` Max Beacon HP, so even building **zero** towers survives Wave 1 at `13/20` HP. Any 1 T1 tower (`90G–120G` out of `260G`) survives Wave 1 easily; a sensible 2-tower opening clears Wave 1 with `20/20` HP.
2. **Rule 2 — Sensible Multi-Tower + Upgrade Strategy Reliably Clears Wave 8 Boss (`COMPLETE & VERIFIED`)**:
   - With zero cheat gold (`INITIAL_GOLD = 260`), building and upgrading a mixed defense (`Autocannon` on `pad_03`, `Mortar` on `pad_06`, `Magnetic` on `pad_05`, plus secondary `Autocannon`s on `pad_08` & `pad_09`, progressively upgrading to T3/T4 using real wave earnings of `3,226G` entering Wave 8) **clears all 8 waves + Final Boss with `20/20` Beacon HP and `600G` spare gold**.
3. **Rule 3 — CRITICAL BALANCE DEFECT: 1 Single Upgraded Tower (`Autocannon T4`) Solos All 8 Waves (`PARTIAL / DEFECTIVE`)**:
   - **Un-upgraded T1 Solo Matrix (All 10 Pads)**:
     - `1x T1 autocannon`: Defeated on Wave 3–4 across all 10 pads.
     - `1x T1 mortar`: Defeated on Wave 3–4 across all 10 pads.
     - `1x T1 magnetic`: Defeated on Wave 2–5 across all 10 pads.
   - **Upgraded Single-Tower (T1 -> T4) Solo Matrix (All 10 Pads, Building ONLY 1 Tower All Game)**:
     - `1x T4 mortar`: Defeated on Wave 8 across all 10 pads.
     - `1x T4 magnetic`: Defeated on Wave 4–8 across all 10 pads.
     - **`1x T4 autocannon`**:
       - `pad_03` (`-3.5, 0.4`): **`SOLO VICTORY` (`8/20` Beacon HP remaining, `2,977G` unspent gold!)**
       - `pad_06` (`3.1, -0.4`): **`SOLO VICTORY` (`16/20` Beacon HP remaining, `3,121G` unspent gold!)**
   - **Exact Root Cause**:
     1. `Autocannon T4` (`src/config/gameConfig.ts:269-280`) jumps from `170.8` raw DPS at T3 to **`357.9` raw DPS** at T4 (`damage: 68, fireInterval: 0.19s, range: 6.7m, armorPierce: 0.36`) for only `605G` cumulative cost (affordable by Wave 2–3!). Notice from Table 5.1 that `Autocannon T4` actually has *higher* DPS-per-gold (`59.2` DPS/100G) than T1 (`52.3`), T2 (`44.8`), and T3 (`46.8`), and **2.26x** the single-target DPS of `Mortar T4`!
     2. `pad_03` and `pad_06` sit inside the central U-bends where a `6.7m` radius covers **3 parallel road segments (~24m out of 41.58m = 58% of the entire map)**, giving a single `Autocannon T4` `~27s` of firing time on `boss_crawler` (`>6,800` effective damage vs `5,200` Boss HP, even accounting for Boss's `2.2s` stun!).
     3. Consequently, a player can build **1 single Autocannon on `pad_06`**, upgrade it 3 times by Wave 3, and click "Start Next Wave" AFK through Wave 8 to win with 3-almost-2 stars (`16/20` HP) and `>3,100G` unspent — violating `ORIGINAL_REQUEST.md:79` (`"不能一座塔自动打完"`).

---

## 6. Audio, UI/HUD & Mobile/Desktop Layout

### 6.1 Web Audio Synthesis & Action Synchronization (`PARTIAL / DEFECTIVE` — Minor Missing Cues)
- **Architecture (`src/audio/AudioManager.ts:1-218`)**: Pure WebAudio oscillator synthesis (`sine`, `triangle`, `sawtooth`, `square`) routed through `masterGain` (`0.42` when unmuted, `0` when muted) -> `DynamicsCompressorNode` (`threshold -16dB, ratio 6:1`), with per-channel rate limiting (`canPlayRateLimited`) to prevent clipping during rapid T4 fire or multi-coin pickups, and `localStorage` persistence (`lunar_beacon_td_muted_v2`).
- **Verified Synchronized Actions**:
  - Mute toggle (`#btn-mute` -> `toggleMute()`, `AudioManager.ts:23-34`) — **COMPLETE & VERIFIED**.
  - UI clicks / insufficient gold buzz (`playUiClick`, `playInsufficientGold`).
  - Stage 1 Beacon sequential lamp boot (`playBeaconLampBoot`, `CinematicDirector.ts:134` — silent on initial load only if browser blocks AudioContext prior to first pointer gesture).
  - Normal & Legendary upgrades: per-part snap lock (`playPartSnapLock` inside each arc's `onComplete`, `CinematicDirector.ts:254, 394`) + Tier ignition chord (`playTierIgnite`, including 5-note golden arpeggio on T4, `AudioManager.ts:122-135`).
  - Combat weapons & hits: `playAutocannonShot` (`55ms` limit), `playMortarLaunch` + `playMortarImpact` (called inside shell `onImpact`, `GameEngine.ts:1175`), `playMagneticPulse`, `playMetallicArmorHit` (on `drill`, `elite_drill`, `boss_crawler`), `playLootChime` (distinct coin vs crystal pitch on 3D pickup arrival).
  - Boss entrance & skills: `playBossChargeAndSlam()` (`AudioManager.ts:168-178`) aligns to the millisecond with `CinematicDirector.ts:521-557` (`0.35s + 1.00s = 1.35s` fissure contraction; `0.35s + 1.14s = 1.49s` Boss shockwave spawn!), plus `playBossSkillWarning()` + `playBossSkillSlam()`, `playClimaxKillBurst(isBoss)`, and `playChestOpenFanfare()`.
- **Concrete Audio Gaps Found**:
  1. **Silent Beacon Damage & Silent Defeat (`src/game/GameEngine.ts:986-1001`)**: When an enemy breaches the exit and damages the Return Beacon (`line 992`) or triggers `mode = 'defeat'` (`line 997`), camera shake and red climax VFX trigger, **but zero audio method is called**!
  2. **Early Build Land Sound (`src/game/CinematicDirector.ts:156` vs `171-177`)**: `playTowerBuildAssembly()` calls `playTowerBuildLand()` at `t = 0.00s` while `baseGroup` is still elevated at `y = 1.65`, `160ms` before `baseGroup` actually slams onto the pad and spawns dust at `t = 0.16s`.
  3. **No Dedicated Audio on Return Beacon Victory Sky-Beam Ignition (`CinematicDirector.ts:698-718`) or Wave 4/7 Elite Spawn (`GameEngine.ts:806`)**.

### 6.2 UI/HUD Clarity, Material Feel & Desktop/Mobile Layout (`COMPLETE & VERIFIED IN CODE`)
- **Industrial Enamel Materiality (`src/style.css:27-53, 139-236, 500-773`)**: Consistent `#1A1033` 2–3px outlines, brushed dark-blue bevel plates (`--bevel-plate`), tactile `:active` 2–3px press states, smooth rolling counters, character-by-character slam upgrade titles (`.stamp-char`), and zero paragraph clutter on build cards (strictly SVG icon + tower name + gold cost, `UIManager.ts:474-491`).
- **3-Step Non-Blocking Onboarding (`UIManager.ts:290-306`)**: Compact pill strip (`① 选择基座 › ② 建造防御塔 › ③ 开始防守`) advances automatically through `select_pad -> build_tower -> start_wave -> done` without modal interruption.
- **Iframe Embed & Fullscreen Safety (`src/main.ts:12-20`, `src/style.css:20-76`)**: Explicitly sets `#app { height: 580px; }` inside `<agent-embed>` / sandboxed iframes (`window.self !== window.top`) so `scrollHeight` never collapses to `0px`, while using `height: 100%` in top-level browser tabs (`html.is-top-window`).
- **Mobile Portrait Framing & Touch (`src/game/GameEngine.ts:271-305`, `src/style.css:972-1028`)**:
  - When `aspect < 0.85`, `computeBaseCameraPose()` widens `camera.fov` to `48`, pulls camera distance scale up to `2.65x`, and shifts `zLookShift` to `2.0` so Mine Entrance, all 10 Pads, and Return Beacon fit cleanly above the bottom dock in `390x844` portrait viewports (verified in `tests/e2e.mjs:431-456`).
  - **Minor Narrow-Viewport Note (`<=360px` width)**: At `max-width: 720px` (`src/style.css:982-986`), `.hud-stats-group` (5 pills) and `.hud-ctrl-group` (3 buttons) enforce `flex-wrap: nowrap`. On `390px` viewports this fits cleanly (`~365px`), but on `320px–360px` viewports with 4-digit gold (`1000+`) and 3-digit kills (`100+`), total top-bar width reaches `~370-382px` and may slightly clip or crowd the rightmost pause button unless padding/font-size is tightened for `max-width: 380px`.

---

## 7. Existing Test Suite Audit (`PARTIAL / DEFECTIVE`)

### 7.1 What Exists (`tests/e2e.mjs`, `package.json:10`)
- Single script: `"test:e2e": "node tests/e2e.mjs"` using `playwright-core` + `/usr/bin/chromium` with SwiftShader WebGL flags (`--use-gl=angle --use-angle=swiftshader`).
- **Covered Scenarios**:
  1. Desktop `1440x900`: Stage 1 opening -> `#onboarding-guide` -> Mute / `1x`/`2x` Speed / Pause & Resume -> Empty pad click -> 3D ghost preview & `#build-tray` viewport/opacity check -> Mortar + Magnetic build -> Insufficient gold toast & disabled button -> Sell tower (`+75` refund) -> Blank ground deselect -> Wave 1 clear (`7` kills, `>=1` crystal) -> Combat T2/T3 non-pausing upgrades + `#upgrade-stamp` -> Stage 2C T4 `legendary_reveal` simulation pause -> Waves 2–7 + Wave 4 Elite -> Stage 3 Wave 8 `boss_intro` -> Boss active skill `telegraphing` check -> Boss defeat -> Stage 5 `victory_panel` -> `#btn-claim-rewards` (`+320G`, `+8` crystals) -> `#btn-play-again` -> 1x T1 Autocannon defeat & retry -> `0` console/page errors.
  2. Mobile Portrait `390x844` (`isMobile: true, hasTouch: true`): Verifies Mine Entrance (`x >= 2`) and Return Beacon (`x <= 388`) screen bounds, plus touch-tap build & combat.

### 7.2 Critical Test Suite Gaps
1. **Cheat Gold Masks Campaign Economy & Balance (`tests/e2e.mjs:164, 221`)**: Injects `debugAddGold(650)` and `debugAddGold(2200)` (`+2,850G` free gold) during its main campaign run — **there is zero automated test proving a legitimate player without `debugAddGold` can beat Waves 1–8**!
2. **Incomplete Single-Tower Solo Assertion (`tests/e2e.mjs:377-400`)**: Only tests 1 *un-upgraded T1* Autocannon on `pad_01`, failing to catch that **1 upgraded T4 Autocannon on `pad_03` or `pad_06` solos the entire 8-wave campaign + Boss**.
3. **No Unit / Deterministic Logic Tests**: No unit tests exist for `gameConfig` balance invariants, `Magnetic` non-stacking slow (`slowRatio` cap & decay), `Magnetic` Boss hit range (`0.65` vs `0.60` bug), target death retargeting / single-settlement, or Wave 8 Boss kill clear-bonus / straggler cleanup (`GameEngine.ts:1272-1301`).
4. **External Environment Coupling (`tests/e2e.mjs:6-10`)**: Assumes `http://127.0.0.1:5173` is already running externally (fails with `ERR_CONNECTION_REFUSED` if run standalone after `npm install && npm run build`) and hardcodes `SHOT_DIR` to the session-specific `/home/antigravity/.gemini/jetski/brain/...` path rather than a configurable/project-local temp artifact path, nor does it test the standalone single-file HTML bundle (`starforge_ark_cradle.html`) for offline/iframe rendering (`scrollHeight > 0`).

---

## 8. Concrete Remediation Proposals (For Downstream Implementers)

| # | Defect | Target File & Lines | Proposed Fix |
|---|---|---|---|
| **P1** | **Single T4 Autocannon on `pad_03`/`pad_06` solos all 8 waves + Boss** | `src/config/gameConfig.ts:269-280, 457-486, 548-596` | Re-tune `autocannon` T4 DPS/cost (e.g. `cost: 280`, `damage: 50` or `fireInterval: 0.23`, `armorPierce: 0.28` => `~217` raw DPS instead of `357.9`) and/or moderately buff Wave 6–8 heavy/Boss durability (`boss_crawler.maxHp: 6800–7200`, `armor` floor `0.20`) so 1 maxed T4 tower on `pad_03`/`pad_06` reliably fails by Wave 6–8 while a 4–6 tower mixed strategy still clears Wave 8 cleanly without cheat gold. |
| **P2** | **Wave 8 Boss kill skips Wave 8 clear bonus & freezes straggler enemies on road** | `src/game/GameEngine.ts:1272-1301` | When `enemy.isBoss` dies: (a) credit `WAVE_CONFIGS[this.waveIndex].clearGoldBonus` (`+200G`) and `clearCrystalBonus` (`+4`), and (b) for every straggler `other` in `this.enemies`, hide `other.rig.hpBarGroup.visible = false; other.rig.slowRing.visible = false;`, spawn a small burst, and remove `other.rig.root` from `this.enemyGroup` (either immediately or inside `onBossRemoved` at `t=0.55s`), clearing `this.enemies` cleanly. |
| **P3** | **Magnetic Tower Boss range mismatch (`0.65` vs `0.60`) & sticky T4->T1 slow refresh** | `src/game/GameEngine.ts:1199, 1201-1204, 1395` | Align `fireMagneticTower` Boss radius bonus from `0.6` to `0.65` (`line 1199`) to match `hasLivingEnemyInRange` (`line 1395`). For slow refresh (`lines 1202-1203`), only overwrite `slowTimer` when `effectiveSlow >= e.slowRatio` (or track `(slowRatio, slowTimer)` cleanly so a weaker tower only applies its lower `effectiveSlow` once the stronger slow expires). |
| **P4** | ** Boss Energy Weakpoint lacks gameplay reaction** | `src/game/GameEngine.ts:942-967, 1240-1253` | When `armorLayersRemaining` hits `0` (dorsal shield breaks at `<=25%` HP) or for `2.0s` after Boss Ground-Slam, boost `weakPointCore` emissive intensity (`2.1 -> 4.2`) + scale pulse and apply a crisp `1.25x` exposed-core damage bonus with spark feedback. |
| **P5** | **Silent Beacon hit/Defeat + `0.16s` early build land SFX** | `src/audio/AudioManager.ts`, `src/game/GameEngine.ts:992-1000`, `src/game/CinematicDirector.ts:156, 172, 700` | Add `playBeaconDamageAlarm()` and `playDefeatShutdown()` in `AudioManager.ts` and call them in `GameEngine.ts:992-998`; move `playTowerBuildLand()` inside the `t = 0.16` impact callback in `CinematicDirector.ts:173`; add a resonant beam ignition tone at `CinematicDirector.ts:700`. |
| **P6** | **E2E cheat-gold gap, standalone server/bundle check & `<=360px` HUD fit** | `tests/e2e.mjs`, `package.json`, `src/style.css:973-1015` | Auto-start Vite server in `tests/e2e.mjs` if port 5173 isn't open; add a zero-cheat 8-wave campaign victory test + `1x T4 Autocannon on pad_06` solo-must-fail balance test + Magnetic non-stacking assertion; tighten `.hud-top-bar` `@media (max-width: 380px)` padding/font-size; integrate `bundle_standalone.mjs` into repo scripts so `starforge_ark_cradle.html` stays synced with `dist/`. |
