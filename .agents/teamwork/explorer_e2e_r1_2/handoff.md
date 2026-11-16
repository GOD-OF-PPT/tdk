# Explorer Handoff — Gameplay, Balance, Economy, Combat & Cinematics (`explorer_e2e_r1_2`)

## Observation
- **Authoritative Economy & Blueprint Totals** ([`src/config/gameConfig.ts`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L14-L597)):
  - Starting resources: `260` Gold, `0` Energy Crystals, `20/20` Beacon HP, `75%` sell refund (`Math.round(cumCost * 0.75)`), `+320` Gold & `+8` Crystals from Stage 5 Supply Crate (`+1` persistent commendation in `localStorage['lunar_beacon_commendations_v1']`).
  - Road geometry: `41.5826m` total filleted road (`cornerRadius = 1.42m`); all 10 fixed build pads (`pad_01`..`pad_10`) maintain **`>= 2.800m` clearance** (`pad_07 = 2.800m` min, `pad_03` & `pad_06 = 3.200m`). `pad_03` (`-3.5, 0.4`) and `pad_06` (`3.1, -0.4`) sit inside the West and Central-East U-bends, covering **`19.3m–26.3m` (`46%–63%`)** of the entire road across 3 parallel segments.
  - Cumulative natural gold before Wave 8 (zero leaks, zero `debugAddGold`): **`3,226G`** (`417G -> 648G -> 921G -> 1,320G -> 1,847G -> 2,354G -> 3,226G`), plus `16` Crystals entering Wave 8 (`25` post-Wave-8 once M2 `F8` credits Wave 8's `+200G / +4💎` bonus -> `33` post-Crate).
- **Dual-Clock Architecture** ([`GameEngine.ts:690-740, 1630-1640`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L690-L740), [`CinematicDirector.ts:88-804`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L88-L804)):
  - `debugStepSimulation(seconds, renderFinal)` steps fixed `0.05s` ticks (`stepFrame(0.05, false)`) ONLY when `mode === 'playing'`.
  - GSAP timelines (`opening` `1.75s`, Stage 2B `#upgrade-stamp` `~0.56–0.85s`, Stage 2C `legendary_reveal` `~3.2–3.7s`, Stage 3 `boss_intro` at `waveElapsed >= 3.695s` spawning `boss_crawler` at `1.49s` and ending at `2.77s`, Stage 4B+5A `victory_cinematic -> victory_panel` `2.45s`, Stage 5B `reward_claiming -> reward_claimed` `1.15s`) run strictly on browser wall-clock `requestAnimationFrame` and are NOT advanced by `debugStepSimulation`.

## Logic Chain
1. **Adaptive Zero-Cheat 8-Wave Strategy (`Scenario 4.1`)**:
   - Because natural Waves 1–7 yield `3,226G`, a 17-step priority queue (`pad_03` Mortar → T4 Legendary `750G`, `pad_06` Autocannon → T4 Legendary `605G`, `pad_01` Magnetic → T2 `215G`, `pad_08` Autocannon → T3 `365G`, `pad_05` Magnetic → T3 `380G`, `pad_07` Mortar → T3 `460G`; total `2,775G`) leaves **`451G+` spare margin** before Wave 8.
   - Reading live `snap.gold` and live DOM costs (`.mini-card-cost`, `#btn-upgrade-tower .cost-badge`) before each click makes the queue 100% resilient even if M2 (`F9`) nerfs `autocannon` by `38%`, raises T3/T4 costs by `+60G`, and buffs `boss_crawler` to `7,800` HP / `50%` armor.
   - Empirically verified in live headless Chromium against `:5173`: cleared all 8 waves at **`20/20` Beacon HP (`3 Stars`)**, `17/17` UI steps executed, `preClaimGold: 983 -> postClaimGold: 1303 (+320G)`, `preClaimCrys: 21 -> postClaimCrys: 29 (+8💎)`.
2. **Single-Tower Solo Balance Guard (`Scenario 4.2`)**:
   - Empirically verified in headless Chromium (`task-70`) that against pre-M2 `dist/`, `1x Autocannon` built on `pad_06` and upgraded naturally to `T4` **currently solos Wave 8 (`mode: 'victory_cinematic'`, `hp: 16/20`, `gold: 3,121`)**.
   - Asserting `snap.mode === 'defeat'` for `1x T4 Autocannon` on both `pad_06` and `pad_03` (while asserting `waveNumber >= 2` on Wave 1) directly enforces `REQ-045` (`不能一座塔自动打完，也不能第一波就必败`) as an authentic red-to-green defect detector.
3. **Complete Tier 1–4 Coverage (`F7`–`F15`)**:
   - Mapped `54` Tier 1 assertions (`6` per feature `F7`–`F15`), `54` Tier 2 boundary/corner assertions (`6` per feature, explicitly targeting every M2 regression: `T4->T1` non-sticky slow, Magnetic `+0.65m` Boss radius, `previewOrBuildTower` mode guard, Boss `1.25x` weakpoint & Wave 8 `+200G/+4💎` + straggler cleanup, rapid re-upgrade timeline cancel, flap hinge axes `'x'/'y'/'z'`, `~100ms` Boss silence, 3–4 Boss sub-explosions, animated clasp pop-open, non-bleaching chest VFX, `0.16s` build land SFX, Beacon hit/Defeat/Beam SFX), `16` Tier 3 pairwise combinations, and `9` Tier 4 E2E scenarios (`4.1`–`4.9`).

## Caveats
1. **Stale Camera Matrix Immediately After `startNewMission(false)`**: Clicking `#btn-play-again`, `#btn-retry-defeat`, or `#btn-restart-pause` calls `cinematics.cancelAll()` (`cameraOverride = null`) without calling `applyCameraPose(0)`. E2E helpers **MUST** run `debugStepSimulation(0.05, false)` (or 1 RAF) after any restart before calling `getPadScreenCoordinates(padId)`, otherwise world-to-screen projection uses the stale Victory Plaza camera pose!
2. **Bottom-Dock `#btn-start-wave` Overlap Over `pad_05` `(717, 686)` on `1440x900`**: When `#build-tray` or `#tower-inspector` is closed, all 10 pads hit `#game-canvas`. When a bottom sheet IS open, `#btn-start-wave` rises to `y = 663..709` directly over `pad_05` `(717, 686)`. Always close any open sheet (`#btn-close-sheet` / `#btn-close-build`) before clicking a different pad!
3. **SwiftShader CPU Fill-Rate Budget (`< 90s` Suite Limit)**: At `1440x900` (`2160x1350` `1.5x` 4x MSAA), SwiftShader CPU takes `~350ms`/frame. Reuse 1 Chromium instance (`startNewMission(false)` resets), pass `renderFinal = false` inside `debugStepSimulation(0.25, false)` loops, and run pure mechanics/balance/audio tests (`F7`–`F9`, `F15`, `Scenario 4.2/4.3/4.7/4.8`) in a `640x420` context (~`25ms`/frame) while reserving `1440x900` and `390x844` for framing/outline/Stage-showcase tests (`Scenario 4.1`, `4.4`, `4.6`).
4. **Concurrent M2 Rebalance**: Never hardcode `autocannon` T3/T4 `cost`/`damage`/`fireInterval` or `boss_crawler.maxHp`; always read live values from DOM/snapshot and assert mathematical invariants.

## Conclusion
`analysis.md` delivers a complete, empirically validated blueprint for `TEST_INFRA.md` and `tests/e2e_tiers.mjs` across `F7`–`F15` and `Scenarios 4.1`–`4.9`: proven zero-cheat 8-wave winning strategy (`20/20` HP under both current and harsh M2 rebalance), proven pre-M2 solo-exploit detector (`Scenario 4.2`), exact GSAP vs `stepFrame` synchronization rules, WebAudio `addInitScript` spy, and three critical harness safeguards preventing timeout flakes.

## Verification Method
1. Read-only Node TypeScript evaluation (`node --experimental-strip-types`) against `src/config/gameConfig.ts` verified exact `TOTAL_ROAD_LENGTH = 41.5826m`, pad clearances (`2.800m–4.323m`), road coverage, `75%` sell refunds, wave spawn windows, and deterministic combat balance under both current and harsh M2-rebalanced configs.
2. Read-only headless Playwright + SwiftShader WebGL2 verification against live `http://127.0.0.1:5173` confirmed:
   - Desktop `1440x900` & Mobile `390x844` `elementFromPoint` hit-testing across all 10 pads (`pad_05` sheet-open overlap identified and solved).
   - Full 8-wave Zero-Cheat UI playthrough (`Scenario 4.1`) reaching `reward_claimed` at `20/20` HP (`3 Stars`), `1,303G`, `29💎`, `0` errors.
   - Pre-M2 `1x T4 Autocannon` on `pad_06` solo defect (`Scenario 4.2` returning `victory_cinematic` at `16/20` HP).
3. `git status --short` verified zero project source/test files were modified outside `.agents/teamwork/explorer_e2e_r1_2/`, and port `5173` remains untouched and active.
