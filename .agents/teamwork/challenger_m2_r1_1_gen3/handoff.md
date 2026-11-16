# Hard Handoff & Empirical Challenge Report — `challenger_m2_r1_1_gen3` (Milestone M2)

## Challenge Summary

- **Verdict**: **PASS (M2 Gate Approved — 0 Blocking Defects)**
- **Overall risk assessment**: **LOW** (1 **Medium** edge-case interaction with M3's `beacon_plating` Tech Upgrade and 1 **Low** visual/terminology note documented with exact M3 mitigations)
- **Constraints compliance**: Zero implementation files modified; `:5173` kept live (`HTTP 200 OK`); `/tmp/challenger_m2_1_gen3.mjs` deleted (`test ! -e /tmp/challenger_m2_1_gen3.mjs`); Chromium closed cleanly on every run.

---

## 1. Observation

All observations below were directly measured via white-box code inspection and live headless Chromium + SwiftShader WebGL2 Playwright execution against `http://127.0.0.1:5173` and the synced standalone HTML artifact:

1. **Multi-Stage & Endless Lifecycle + GPU Memory & Shared Texture Stress (`src/game/GameEngine.ts:390–431`, `src/render/BeaconAndPropsFactory.ts:23–58, 1507–1510`, `src/fx/VfxManager.ts:635–701`, `src/render/ToonMaterials.ts:236–252`)**:
   - Executed **2 full chaotic cycles** (`10` `loadStage()` transitions: `stage_01 -> stage_02 -> stage_03 -> stage_04 -> endless -> stage_01` × 2) while spawning all 3 tower types (`T1–T3`), active ghost tower hologram previews, `shield_skimmer` / `splitter_rover` / `repair_drone` / rotating stage Bosses, active mechanisms, in-flight `mortar` `THREE.Sprite` shells, 3D loot (`coins` + `crystals`), and 3D armor break debris right at the moment of stage switch:
     - Warmed Cycle 1 return to `stage_01`: `geometries: 211, textures: 13, programs: 14` (baseline before lazy `THREE.Sprite` quad, `VfxManager` particle buffers, `ringWave`, and `shadowBlob` first-render upload: `geometries: 209, textures: 11, programs: 14`).
     - Cycle 2 return to `stage_01`: **`geometries: 211, textures: 13, programs: 14`** (**exact `+0` geometry delta, `+0` texture delta, `+0` program delta**).
   - Verified all **`8/8` singleton `SharedToonTextures`** (`grad4Standard`, `grad4Metal`, `lunarDeck`, `haulRoad`, `softGlow`, `ringWave`, `hazardZone`, `shadowBlob`) retain live non-null `renderer.properties.get(tex).__webglTexture` GPU handles after 10 chaotic stage switches (`missingLabels: []`, `gl.getError() === 0`).
   - Traversed all 5 stage scenes and all 12 enemy rigs: **`openEndedLayer0Count === 0`** (all translucent rings, laser beams, shield domes, and skyBeam are isolated on Layer `1` or `vfxScene`).

2. **Multi-Lane Unequal-Length `remainingDist` Targeting & Speed-Rail Zones (`src/game/GameEngine.ts:1370–1378, 1600–1605, 2154–2171`, `src/config/campaignConfig.ts:679–682, 723–739`)**:
   - On `stage_04`: measured `compiledLanes[0].totalLength === 32.06m` (West Breach) and `compiledLanes[1].totalLength === 19.76m` (North Drop-Bay).
   - Adversarial targeting oracle at `s4_pad_10` `(6.0, 0, 4.0)` (`T2 autocannon`, `range = 5.8m`):
     - Spawned `enemy_85` (`drill`) FIRST on Lane 0 at `dist = 26.8m` (`remainingDist = 5.26m`, `progressRatio = 83.6%`, Euclidean dist to tower `= 3.20m`).
     - Spawned `enemy_86` (`drill`) SECOND on Lane 1 at `dist = 16.0m` (`remainingDist = 3.76m`, `progressRatio = 81.0%`, Euclidean dist to tower `= 3.51m`).
     - Observed: tower locked onto **`enemy_86`** (`lockedFirstId: "enemy_86"`, reducing `enemy_86.hp` `285 -> 253` while `enemy_85.hp` stayed `285`), proving ranking uses true `laneLen - e.distanceTraveled` rather than `progressRatio`, `distanceTraveled`, Euclidean distance, or spawn order. Upon lethal damage to `enemy_86`, `tower.targetEnemyId` cleared synchronously (`targetClearedImmediately: true`) and retargeted `enemy_85` within `0.15s`.
   - On `stage_03`: stepped `rover` (`baseSpeed = 2.25`) for `0.5s` outside speed zones (`dist = 10.0m`) vs inside `rail_s3_a` (`dist = 2.0m`) and `rail_s3_b` (`dist = 20.0m`): measured exact velocity multiplier **`1.42x`** (`ratioRailA: 1.42`, `ratioRailB: 1.42`), and **`0.9656x`** (`1.42 * 0.68`) when countered by `32%` Magnetic slow.

3. **4 Interactive 3D Mechanisms & Full 45-Pad / 12-Mechanism Viewport Audit (`src/game/GameEngine.ts:571–603, 792–885, 1143–1202, 2267–2332`)**:
   - **High-Ground Boost Bastion (`y = 0.68m`)**:
     - Real `page.mouse.click` on the southern lip of `pad_03` (`(-3.5, 0.83, 1.38)`, which drifts to `dist = 1.59m > 1.48m` on a flat `y = 0.15` plane) accurately selected `pad_03` (`selectedPadIsHighGround: true`, tray chip `▲高地 +18%射程/+15%伤害`).
     - Verified `+15%` DMG and `+18%` Range persist across all 4 upgrade tiers on `autocannon`: `T1 (18 DMG, 6.37m) -> T2 (30 DMG, 6.84m) -> T3 (47 DMG, 7.32m) -> T4 (78 DMG, 7.91m)`.
     - Live combat physics check at exact `6.00m` target distance (`> 5.4m` standard T1 range, `<= 6.37m` HG T1 range): High-Ground T1 `autocannon` acquired and hit `swarm` (`armor = 0`) for exact `18` DMG (`52 -> 34`), while Standard `pad_01` T1 `autocannon` did not fire (`52 -> 52`).
   - **Crystal Ore Vein (`vein_s1_1`)**: Real canvas click granted `+45` Gold (`260 -> 305`), `+1` in-run crystal, `+1` persistent crystal, shrunk crystal cluster scale to `0.35`, rejected immediate repeat click during `18s` cooldown, and regrew to scale `1.0` (`ready: true`) after `18.2s`.
   - **Lunar Capacitor Pylon (`pylon_s2_n`, `stage_02`)**: Real canvas click stripped `100%` of `shield_skimmer`'s `95` shield (`skShield: 0`, `skDomeVisible: false`) + dealt `95` true armor-piercing shock damage (`135 -> 40` on `shield_skimmer`, `285 -> 190` on `0.42`-armor `drill`), applied `slowRatio: 0.48` (`2.4s`) + `fluxTimer: 4.0`, left out-of-range `rover` untouched (`hp: 92`), and entered `20s` cooldown.
   - **Laser Containment Gate (`gate_s3_1`, `stage_03`)**: Real canvas click activated Layer-1 plasma barrier (`beamLayer1: true`) for `6.0s`, applied `slowRatio: 0.4` (`slowRingVis: true`) and `0.2s` thermal burn ticks (`drill.hp: 285 -> 235` in `1.0s`), then deactivated (`beamVisibleAfter6s: false`) into `22.0s` post-active cooldown (`cooldownRemAfter6s: 21.8`).
   - **All-Stage Viewport & HUD Occlusion Audit (`1440×900` desktop & `390×844` mobile portrait)**: Tested all `45` Build Pads and all `12` Mechanisms across `stage_01..stage_04` via `document.elementFromPoint(x, y)` and `handleCanvasTap(x, y)`: **`0` raycast misses, `0` HUD occlusions, `0` off-screen portals/beacons**, and adaptive portrait fog density scaled `0.008 -> 0.00316`.

4. **12-Enemy Roster, Boss Weak-Points & Non-Premature Victory (`src/game/GameEngine.ts:1432–1471, 1884–2140`)**:
   - `shield_skimmer`: absorbed `50` kinetic damage completely into shield (`hp: 135, shieldHp: 45, domeVis: true`), broke on `40` Magnetic damage (`40 * 1.35 = 54` shield DMG -> `shieldHp: 0, domeVis: false, hp: 129`), and recharged out of combat after `3.5s` delay (`shieldHp: 17.1, domeVis: true` at `4.5s`).
   - `splitter_rover`: spawned `2x mini_scout` on parent `laneIndex: 1` upon death; when killed as the sole wave enemy, `waveInProgress` stayed `true` until both `mini_scout` children were killed (`waveCompletedAfterChildrenDead: true`).
   - `repair_drone`: healed nearby `drill` `+30` (`100 -> 130`) and `boss_crawler` `+55` (`4000 -> 4055`).
   - **Non-Premature Victory**:
     - Stage 4 Wave 8 Sub-Boss (`boss_crawler`): killing `boss_crawler` kept `mode === 'playing'` and `waveInProgress === true`; clearing remaining Wave 8 escorts advanced cleanly to `waveNumber === 9` (`9/12`, `mode: "playing"`).
     - Endless Wave 25 Dual-Boss (`endlessBossCount === 2`): killing both rotating Bosses kept `mode === 'playing'`, and clearing all escorts + `splitter_rover` children advanced to `waveNumber === 26` (`bestEndlessWave: 25`).
     - Stage 4 Wave 12 Final Boss (`boss_ark_overlord`): verified `4` armor layers (`initialPlates: 4`), rear `weakPointCore` `1.25x` damage (`frontDmg: 50` vs `rearDmg: 63`), and transition to `victory_cinematic` with `0` non-boss stragglers remaining.

5. **Empirically Reproduced Edge Case — `beacon_plating` + Final Boss Leak Fallback (`src/game/GameEngine.ts:1616, 2134–2137`, `src/game/CinematicDirector.ts:824–890`)**:
   - Upgrading `beacon_plating` to `Lv.1` (`3💎` in `#sector-hub-modal -> 工程改装`) raises `stage_01` `maxBeaconHp` from `20` to `24`.
   - Allowing Wave 8 `boss_crawler` (`beaconDamage: 20`, `src/config/gameConfig.ts:498`) to leak into the Return Beacon reduced `beaconHp` to `4` (`> 0`). Killing the remaining escort `rover` triggered `checkWaveCompletion()` line `2136` (`this.mode = 'victory_panel'`).
   - Verbatim empirical output:
     ```json
     {
       "upgraded": true,
       "maxBeaconHp": 24,
       "hpAfterBossLeak": 4,
       "modeAtVictoryPanel": "victory_panel",
       "chestVisibleBeforeClaim": false,
       "skyBeamVisible": false,
       "chestVisibleDuringClaim": false
     }
     ```

6. **Standalone Bundle & Sandboxed `<agent-embed>` Audit**:
   - `dist/starforge_ark_cradle.html` and brain artifact `starforge_ark_cradle.html` (`881,591` bytes) match identically (`SHA-256` prefix `0b1ff64cdd95b100`), contain `0` external `<script>`/`<link>` tags, and booted inside `<iframe sandbox="allow-scripts" srcdoc="...">` at `580px` height (`appHeight: 580`, `isTopWindowClass: false`, `persistentStorage: false`, `0` console/page errors).

---

## 2. Logic Chain

1. **Why GPU Memory & Shared Textures Are Leak-Free (`Observation 1`)**:
   - `loadStage()` invokes `cinematics.cancelAll()`, `vfx.clearAll()`, `clearDynamicEntities()`, and `env.dispose()`. `disposeObject3DTree()` (`BeaconAndPropsFactory.ts:23–58`) and `disposeMortarShell()` (`VfxManager.ts:635–651`) dispose per-entity geometries and materials while explicitly skipping `THREE.Sprite.geometry` and shared `getToonTextures()` maps. Consequently, GPU memory stabilizes at `211` geometries / `13` textures across repeated multi-stage combat cycles with `8/8` shared textures intact.
2. **Why Multi-Lane & Multi-Boss Campaign Logic Holds (`Observation 2, 3, 4`)**:
   - Ranking targets by `laneLen - e.distanceTraveled` (`GameEngine.ts:2163`) guarantees towers prioritize enemies closest to breaching the Return Beacon even when shorter lanes (`19.76m` vs `32.06m`) have lower `distanceTraveled` and lower `progressRatio`.
   - Guarding `victory_cinematic` behind `!this.isEndlessMode() && this.waveIndex === this.currentStage.waves.length - 1 && !anyOtherBossAlive && !anyOtherBossPending` (`GameEngine.ts:2001–2010`) prevents premature victory on Stage 4 Wave 8 Sub-Bosses and Endless Boss waves.
3. **Why the Fallback `victory_panel` Invisible Chest Is Medium / Non-Blocking for M2 (`Observation 5`)**:
   - Without `beacon_plating` (an M3 `F28` Engineer Tech Tree upgrade), every Campaign Final Boss has `beaconDamage === stage.maxBeaconHp` (`20` on Ch.1–3, `25` on Ch.4), so a Final Boss leak always sets `beaconHp = 0 -> mode = 'defeat'` (`GameEngine.ts:1621–1627`), making line `2136` unreachable in base M2 play.
   - Even when triggered via `beacon_plating >= Lv.1`, `claimVictoryRewards()` still grants all rewards and unlocks the next stage without throwing or softlocking; only the 3D `supplyChest` (`visible === false`) and `beacon.skyBeam` (`visible === false`) visuals are skipped because `playBossDefeatAndBeaconVictory` was bypassed and `playOpenRewardChest` (`CinematicDirector.ts:828`) assumes `chest.group.visible` is already `true`.

---

## Challenges

### [Medium] Challenge 1 — Fallback `victory_panel` Leaves 3D Supply Chest & Beacon SkyBeam Invisible When `beacon_plating >= Lv.1` Survives a Final Boss Leak

- **Assumption challenged**: Either a Campaign Final Boss reaching the Return Beacon always causes `defeat` (`beaconDamage === base maxBeaconHp`), or `checkWaveCompletion()`'s fallback `this.mode = 'victory_panel'` (`src/game/GameEngine.ts:2135–2137`) presents a valid Stage 5A/5B 3D victory plaza.
- **Attack scenario**: Upgrade `信标装甲 (beacon_plating)` to `Lv.1+` (`+4..+16` Beacon HP -> `24..36` on Ch.1–3, `29..41` on Ch.4), let the Final Wave Boss (`beaconDamage = 20` or `25`) walk into the Return Beacon (`beaconHp` drops to `4 > 0`), then kill the remaining wave escorts.
- **Blast radius**: Non-crashing visual/UX defect on the victory screen: `#victory-screen` prompts the player to open the 3D Supply Chest, but `supplyChest.group.visible === false` and `beacon.skyBeam.visible === false` both before and during `claimVictoryRewards()` (3D chest tap on the plaza cannot see the chest, and lid-pop / clasp-arc animations play invisibly while 3D coins spawn out of empty floor space).
- **Mitigation (for Milestone M3 alongside `F28` Tech Tree & Stage 5B Climax Polish)**:
  1. Decide gameplay intent: if Final Campaign Bosses (`isFinalCampaignWave && e.isBoss`) must never be tanked by the Return Beacon, deal `Math.max(e.beaconDamage, this.maxBeaconHp)` on breach; **AND/OR**
  2. In `GameEngine.ts:2135–2137` (and defensively at the top of `CinematicDirector.playOpenRewardChest` at `CinematicDirector.ts:828`), ensure `chest.group.visible = true` (at `stageConfig.supplyChestPos`), `beacon.skyBeam.visible = true` (`opacity = 0.58`), and frame the Beacon Plaza camera.

### [Low] Challenge 2 — Capacitor Pylon Applies `48%` Heavy Slow + `4.0s` Magnetic Flux Rather Than Hard Immobilization Stun / Point-to-Point Chain Arcs

- **Assumption challenged**: `SCOPE.md:37` describes Capacitor Pylon as `"chain-lightning AoE shock/stun/shield-strip"`, whereas `src/game/GameEngine.ts:849–864` applies radial AoE (`4.6m`) `220` shield-strip + `95` `1.0`-pierce arc damage + `slowRatio = 0.48` (`0.28` on Bosses) for `2.4s` + `fluxTimer = 4.0` with ground shockwave rings.
- **Attack scenario**: Player activates Capacitor Pylon expecting fast unshielded runners to briefly halt (`0` speed) or show electric arcs jumping to struck targets.
- **Blast radius**: Purely cosmetic / feel nuance; combat effectiveness (`220` shield-strip + `95` true DMG + `48%` slow + `4s` M3 synergy flux prime) is strong and bug-free.
- **Mitigation (optional in M3)**: Optionally add short-lived Layer-1 jagged cyan arc `THREE.Line` / cylinder segments from the Pylon `arcCore` to each struck enemy in `VfxManager` or a brief `0.35s` micro-halt.

---

## Stress Test Results

- `2× full 5-stage chaotic loadStage() cycles (10 switches mid-combat/loot/ghost/VFX)` → `0 GPU geometry/texture leaks & 8/8 live SharedToonTextures` → `211 -> 211 geometries, 13 -> 13 textures, 14 -> 14 programs, 8/8 WebGLTexture handles live, glErr = 0` → **PASS**
- `Layer-0 openEnded manifold audit across all 5 stages & 12 enemy rigs` → `0 openEnded Layer-0 meshes` → `openEndedLayer0Count = 0` → **PASS**
- `Stage 4 unequal-lane targeting (Lane 0: 32.06m vs Lane 1: 19.76m)` → `Lock onto Enemy B (rem 3.76m, ratio 81%, dTower 3.51m) over Enemy A (rem 5.26m, ratio 83.6%, dTower 3.20m)` → `Locked enemy_86 first, then retargeted enemy_85 on death` → **PASS**
- `Stage 3 speed-rail zones (rail_s3_a & rail_s3_b)` → `1.42x speed boost & clean Magnetic slow composition` → `1.4200x in both zones, 0.9656x with 32% slow` → **PASS**
- `High-Ground pad southern-lip parallax tap + T1..T4 buffs + 6.0m live shot` → `Select pad_03, +18% range / +15% DMG across T1..T4, hit at 6.0m` → `pad_03 selected, T1..T4 = 18/30/47/78 DMG & 6.37/6.84/7.32/7.91m, 6.0m swarm 52->34 HP (std pad 52->52)` → **PASS**
- `Crystal Vein, Capacitor Pylon & Laser Gate real canvas clicks` → `+45G/+1💎/18s CD; -220 shield/95 pierce DMG/0.48 slow/20s CD; 6s Layer-1 burn+0.4 slow/22s CD` → `All exact values & cooldown transitions verified` → **PASS**
- `All 45 Build Pads & 12 Mechanisms raycast + HUD occlusion at 1440×900 & 390×844` → `0 misses, 0 HUD occlusions, adaptive portrait fog` → `misses: [], occludedByHud: [], fogDensity: 0.008 -> 0.00316` → **PASS**
- `shield_skimmer, splitter_rover -> 2x mini_scout, repair_drone, boss weakPointCore 1.25x` → `Exact shield/split/wave-hold/heal/weakpoint behavior` → `All verified (front 50 vs rear 63 DMG on Overlord)` → **PASS**
- `Stage 4 Wave 8 Sub-Boss & Endless Wave 25 Dual-Boss non-premature victory` → `Remain in 'playing' mode and advance wave` → `Stage 4 W8 -> W9 ('playing'); Endless W25 (2 bosses + splitters) -> W26 ('playing')` → **PASS**
- `Sandboxed <iframe sandbox="allow-scripts" srcdoc> standalone HTML parity` → `SHA-256 sync, 0 external refs, 580px height, 0 SecurityError` → `881,591B synced, appHeight = 580, sandboxErrors = []` → **PASS**
- `beacon_plating Lv.1 + Final Boss leak into Beacon + clear escorts` → `Visible 3D Supply Chest & skyBeam on victory_panel` → `supplyChest.group.visible === false & skyBeam.visible === false before & during claim` → **FAIL (Medium — Non-Blocking for M2; fix in M3)**

---

## 3. Caveats & Unchallenged Areas

- **Milestone M3 Features Out of Scope**: Commander Active Skills (`activateCommanderSkill` stub at `GameEngine.ts:887`), Cross-Tower Elemental Synergies, T3→T4 A/B Branch specializations, and `F7–F18` climax/audio polish (`simDt` Mortar doors, deferred tier color swap) are scheduled for Milestone M3 (`plan.md:37`) and were intentionally not flagged as M2 defects.
- **SwiftShader Headless Timing**: WebGL2 4-pass `1.5x` supersampled outline rendering runs on CPU SwiftShader in this headless VM; GPU resource counts (`renderer.info.memory`), `gl.getError()`, and simulation physics are identical to hardware WebGL2.

---

## 4. Conclusion

**Milestone M2 (`campaign-maps-mechanisms-and-preview-sync`) PASSES adversarial empirical verification.** Multi-stage & Endless lifecycle transitions are leak-free (`211 -> 211` geometries, `13 -> 13` textures, `8/8` live shared Toon textures), unequal-lane `remainingDist` targeting and `1.42x` speed zones are mathematically exact, all 4 interactive 3D mechanisms and all 12 enemy types behave accurately across both `1440×900` desktop and `390×844` portrait viewports, Stage 4 Sub-Boss / Endless Boss waves never prematurely trigger victory, and the synced standalone HTML artifact boots cleanly at `580px` inside a `sandbox="allow-scripts"` iframe. Fold the **Medium** `beacon_plating` + Final Boss leak `supplyChest` visibility fix (`GameEngine.ts:1616, 2135–2137` / `CinematicDirector.ts:828`) into **Milestone M3** alongside `F28` Engineer Tech Tree and Stage 5B Supply Chest polish.

---

## 5. Verification Method

1. **Automated Build & Existing E2E Suite**:
   - Run `npm run build` and `npm run test:e2e` in `/home/antigravity/GOD-OF-PPT/tdk` (while `:5173` is serving).
2. **Re-Verify Multi-Stage GPU Plateau & Fallback Supply Chest Edge Case**:
   - Inspect `src/game/GameEngine.ts:406–431` (`loadStage`), `src/game/GameEngine.ts:2154–2171` (`acquireBestTarget`), `src/game/GameEngine.ts:2001–2053` (Boss victory guard), and `src/game/GameEngine.ts:2134–2137` + `src/game/CinematicDirector.ts:824–890` (fallback `victory_panel` / `playOpenRewardChest` visibility).
   - In Playwright against `http://127.0.0.1:5173`, cycle `window.__LUNAR_BEACON_GAME__.loadStage(...)` across `stage_01..endless..stage_01` twice and confirm `renderer.info.memory.geometries` (`211`) and `textures` (`13`) remain constant; to reproduce Challenge 1, call `getProgression().addCrystals(10); getProgression().upgradeTech('beacon_plating'); loadStage('stage_01', false)` and let `boss_crawler` reach `lane.totalLength` on Wave 8 before killing the last escort.
