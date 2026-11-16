# Hard Handoff Report — Track 2: Deep Core TD Combat Systems (`explorer_expansion_survey_2_gen2`)

**Core Summary**: Surveyed the entire 3D Toon-Mech TD combat, rendering, VFX, UI, and WebAudio pipeline in `/home/antigravity/GOD-OF-PPT/tdk` and produced a complete, line-referenced architectural blueprint (`analysis.md`) for **Active Commander Tactical Skills (`3` skills + `⚡` Energy)**, **Cross-Tower Elemental/Mechanical Combos (`三塔协同连携`)**, **T3→T4 Dual Specialization Branches (`6` Legendary Mechs)**, **Procedural WebAudio SFX**, and **Anti-AFK Economy/DPS Balance**.

---

## 1. Observation

1. **User Priority & Quality Baselines (`.agents/teamwork/ORIGINAL_REQUEST.md`)**:
   - `lines 118-128`: User playtest feedback prioritizes fixing *"1. 游戏不够完整只有1场战役8个波次; 2. 游戏的可玩/趣味性不够，导致更像一个demo"* above automated test expansion, specifically calling out active tactical skills/overdrive, cross-tower combos (magnetic clustering + mortar detonation + armor shred), T3→T4 specialization branches, and preserving rounded heavy toy-mech aesthetics (`#1A1033` outline, 5-stage highlight choreography, desktop/mobile parity, standalone HTML rebuild).
   - `lines 20-21, 54-67, 85, 100, 104`: VFX must never long-term obscure roads/enemies or cause full-screen whiteout; cream-white `#F3EFE6` hulls and weapon identity colors stay constant while tier colors (`Green/Blue/Purple/Gold`) apply only to core/trim/nameplate/rim; Magnetic slow must not stack infinitely; transparent VFX/rings/UI must be excluded from `#1A1033` outlines; T4 upgrade pauses combat for a dedicated Golden Hero Reveal (`Stage 2C`).

2. **Type System & Blueprints (`src/types.ts` & `src/config/gameConfig.ts`)**:
   - `src/types.ts:82`: `TowerBlueprint.tiers` is a fixed 4-tuple `[TowerTierStats, TowerTierStats, TowerTierStats, TowerTierStats]` with no branch support.
   - `src/types.ts:144-148`: `TowerRig.tierGroups` has `{ t2: THREE.Group; t3: THREE.Group; t4: THREE.Group }`.
   - `src/types.ts:177-179, 202-203, 212`: `EnemyRig` already provides `weakPointCore: THREE.Mesh | null`, `armorPlates: THREE.Object3D[]`, and `slowRing: THREE.Mesh`; `EnemyInstance` tracks `slowRatio`, `slowTimer`, and `armorLayersRemaining`.
   - `src/config/gameConfig.ts:205-216`: Exact Euclidean distances between neighboring `BUILD_PADS` (`pad_01..pad_10`) measure **`3.80m` to `6.68m`** (e.g., `pad_09↔pad_10 = 3.80m`, `pad_06↔pad_07 = 6.00m`, `pad_06↔pad_08 = 6.21m`, `pad_03↔pad_02 = 6.22m`, `pad_03↔pad_06 = 6.65m`, `pad_06↔pad_09 = 6.67m`).
   - `src/config/gameConfig.ts:14-24, 220-597`: Stage 1 awards `260` initial gold + `~1,587` kill gold + `600` Wave 1–7 clear gold (`~2,447G` entering Wave 8); T1→T4 cumulative tower costs are `605G` (`autocannon`), `750G` (`mortar`), and `625G` (`magnetic`).

3. **Combat Loop, Pointer Raycasting & Upgrade Flow (`src/game/GameEngine.ts` & `src/game/CinematicDirector.ts`)**:
   - `GameEngine.ts:107-108, 1453-1505`: `raycaster` intersects `groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15)`; `bindPointerInput()` only listens to `pointerdown`/`pointerup` (rejecting drags `> 14px` at `line 1463`) and `handleCanvasTap` immediately selects pads within `1.48m` (`lines 1494-1504`). There is no `pointermove` listener or armed-skill intercept yet.
   - `GameEngine.ts:492-555`: `upgradeSelectedTower()` takes zero parameters; when `nextTier === 4` (`lines 533-545`), it sets `this.mode = 'legendary_reveal'` and calls `cinematics.playLegendaryUpgradeReveal(tower, deltas, onComplete)`.
   - `CinematicDirector.ts:292-463`: `playLegendaryUpgradeReveal` calls `getTierPartObjects(rig, 4)` (`line 300`) and `applyTowerTierVisuals(rig, 4)` (`line 303`), flies each child part along a parabolic arc using `part.userData.restPos/restScale/flyOffset` (`lines 365-399`), and stamps `` `传说·${bp.name}` `` (`line 411`).
   - `GameEngine.ts:711-716`: `stepFrame` computes `simDt = rawDt * this.speedMultiplier * activeScale` when `this.mode === 'playing'` and passes `(0, rawDt)` to `vfx.update` during reveals (`line 719`).
   - `GameEngine.ts:960-965`: Boss hydraulic ground-slam stuns towers within `5.2m` for `2.2s` (`tw.stunTimer = Math.max(tw.stunTimer, 2.2)`).
   - `GameEngine.ts:1123-1253`: `fireAutocannon`, `fireMortar`, `fireMagneticTower`, and `applyDamageToEnemy` (`effectiveArmor = Math.max(0, enemy.armor * (1 - armorPierce))` at `line 1219`) are cleanly modularized.

4. **3D Toon Outlines, VFX & Audio (`TowerFactory.ts`, `EnemyFactory.ts`, `ToonOutlineComposer.ts`, `VfxManager.ts`, `AudioManager.ts`)**:
   - `ToonOutlineComposer.ts:512-550`: Pass 1–3 apply `#1A1033` Normal+Depth outlines only to `solidScene` Layer `0`; Pass 4 (`lines 540-548`) renders `solidScene` Layer `1` (`shadows, slowRing, hpBarGroup` from `EnemyFactory.ts:338-383`) and `vfxScene` Layer `0` **after** the outline pass, guaranteeing zero outline pollution on transparent VFX/reticles/auras.
   - `VfxManager.ts:401-434, 638-641`: `spawn3DLoot` already fountains real 3D Gold Coins and Faceted Energy Crystals; `disposeMortarShell` notes never to dispose `THREE.Sprite.geometry` or shared `getToonTextures()`.
   - `AudioManager.ts:43-49, 56-88`: Uses a `DynamicsCompressorNode` (`-16dB`, `ratio 6`) after `masterGain (0.42)` with `canPlayRateLimited` and `tone()`.

---

## 2. Logic Chain

1. **Desktop + Mobile Touch Tactical Aiming (`Observation 3` → `Skill 1 Orbital Ion Strike`)**:
   - Because `bindPointerInput` (`GameEngine.ts:1453-1505`) lacks `pointermove` and rejects `> 14px` drags on `pointerup`, a naive click-only targeter would feel clunky on mobile touch (no cursor hover) and collide with `1.48m` pad taps (`line 1496`).
   - Adding `armedSkillId: TacticalSkillId | null` that (a) auto-closes `#tray-slot` upon arming, (b) snaps the initial `vfxScene` reticle to the leading enemy, (c) updates reticle position on `pointermove` (both desktop hover and mobile touch-drag), and (d) commits `commitOrbitalStrike(hit.x, hit.z)` on `pointerup` **before** `handleCanvasTap`'s pad check (`line 1493`) achieves seamless one-click desktop hover-aim AND mobile tap-or-drag-release aiming without ever mis-clicking build pads.

2. **Anti-Exploit Tactical Energy (`⚡`) & Skill Synergy (`Observations 1, 2, 3`)**:
   - Ticking passive energy regen (`+1.6 ⚡/s`) **only when `waveInProgress === true`** (`GameEngine.ts:712`) prevents players from stalling between waves to farm infinite `+75G` from Skill 3 (`纳米信标急修`), while yielding `~709 ⚡` (`16–18` casts) across an 8-wave mission.
   - Skill 2 (`全域电磁超载`) directly counters the Boss's `2.2s` tower stun (`GameEngine.ts:960-965`), strips enemy shields (Track 1 synergy), and applies `5.5s` `[Flux-Marked]` map-wide to prime instant combo bursts.

3. **Multi-Detonating Cross-Tower Combos (`Observations 1, 2, 3`)**:
   - Having Magnetic Confinement apply `3.35s–4.35s` `[Flux-Marked]` alongside non-stacking slow (`GameEngine.ts:1201-1204`), and having Mortar `⚡ 磁暴共振` consume **`1.25s`** of `fluxTimer` (with a `0.08s` per-enemy ICD rather than wiping `fluxTimer` to `0`), allows standard Mortar shells to detonate once per Magnetic pulse while enabling Mortar **T4-B `集束火箭弹巢`**'s 3-rocket staggered salvo (`0.00s, 0.11s, 0.22s` via `simDt` queue) to naturally triple-detonate `⚡ 磁暴共振`!
   - Having Autocannon apply stacking `[破甲裂隙]` (`-8%` flat armor × `3` stacks = `-24%`, or `4` stacks = `-32%` on `T4-A`) before `armorPierce` in `applyDamageToEnemy` (`line 1219`), plus `1.35x–1.55x` `🎯 弱点暴击` aimed directly at `enemy.rig.weakPointCore` (`EnemyFactory.ts:248`), makes all three tower types mutually multiplicative.

4. **Zero-Regression Dual T4 Branches & Aura Radius (`Observations 2, 3, 4`)**:
   - Keeping `TowerBlueprint.tiers[3] = branches.A` and defaulting `upgradeSelectedTower(branch: TowerBranch = 'A')` preserves backward compatibility while letting `TowerFactory` populate `tierGroups.t4A` and `tierGroups.t4B` with `tagArcFlyPart`-annotated 3D `RoundedBoxGeometry` modules. Passing `branch` to `getTierPartObjects(rig, 4, branch)` and `applyTowerTierVisuals(rig, 4, { branch })` preserves the full Stage 2C Golden Hero Reveal (`CinematicDirector.ts:292-463`) for all `6` Legendary Mechs!
   - Because neighboring `BUILD_PADS` (`gameConfig.ts:205-216`) are `3.80m–6.68m` apart, setting Magnetic **T4-B `高压电弧矩阵`**'s `+15%` tower haste aura radius to **`7.0m`** guarantees `2–4` adjacent build pads receive the buff on Stage 1 (and future stages) without covering the whole map.

---

## 3. Caveats

1. **Multi-Lane Path Sampling Dependency (Track 1 Coordination)**:
   - Currently `fireMortar` (`GameEngine.ts:1165-1166`) and enemy movement (`line 1005`) call module-global `sampleRoadAtDistance` / `TOTAL_ROAD_LENGTH`. When implementing Mortar target-leading and Magnetic **T4-A `奇点引力中枢`** pull-back (`e.distanceTraveled - pullDist`), workers must route through the enemy's lane sampler (`sampleLaneAtDistance(e.laneIndex ?? 0, dist)`) introduced by Track 1 so multi-lane stages work seamlessly.
2. **`setTimeout` Replacement in Combat Animations**:
   - Existing `fireMortar` (`GameEngine.ts:1155-1157`) uses `setTimeout(..., 240)` to close hinged doors. New staggered mechanics (Orbital Ion Strike `0.55s` lock-on, Cluster Rocket `0.11s` 3-salvo, Plasma Burn `3.0s` zone) MUST use `simDt`-driven queues inside `GameEngine.stepFrame` (`line 711`), NEVER `setTimeout`, so Pause, `2x` speed, Stage 2C `legendary_reveal`, and `debugStepSimulation` remain 100% deterministic.

---

## 4. Conclusion

Implement Track 2 across `src/types.ts`, `src/config/gameConfig.ts`, `src/render/TowerFactory.ts`, `src/render/EnemyFactory.ts`, `src/fx/VfxManager.ts`, `src/audio/AudioManager.ts`, `src/game/CinematicDirector.ts`, and `src/game/GameEngine.ts` following `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_expansion_survey_2_gen2/analysis.md`:
1. **Commander Tactical Skills (`orbital_strike`, `emp_overdrive`, `nano_repair`)** + `50/100 ⚡` Tactical Energy (in-wave regen + kill/plate/wave/crystal bonuses) + unified desktop hover-click & mobile tap/drag-release targeting in `vfxScene`.
2. **3-Tower Combo Triangle**: Magnetic `[Flux-Marked]` → Mortar `⚡ 磁暴共振` (AoE shock + 2-target chain lightning) + Autocannon stacking `[破甲裂隙]` (`-24%/-32%` armor) & `🎯 弱点暴击` (`1.35x–1.55x` on Flux / Boss `weakPointCore`).
3. **6 T4 Legendary Specializations (`upgradeSelectedTower(branch?: 'A' | 'B')`)**: `暴风火神机甲` vs `双联电磁轨炮`, `天穹聚变巨炮` vs `集束火箭弹巢`, and `奇点引力中枢` vs `高压电弧矩阵` (`7.0m` neighbor haste aura), all with distinct cream-white toy-mech 3D geometry, `#1A1033` outlines, and Stage 2C Golden Hero Reveal.
4. **12 Procedural WebAudio SFX + Tuned Wave 4–8 Scaling** (`elite_drill: 1350 HP`, `boss_crawler: 6400 HP`) so single-tower AFK fails while mixed combos + skills shine.

---

## 5. Verification Method

1. **Typecheck & Production Build**:
   - Run `npm run build` in `/home/antigravity/GOD-OF-PPT/tdk` (verifies `tsc --noEmit` + Vite bundle with zero errors).
   - Rebuild standalone preview artifact (`node scripts/bundle_standalone.mjs` / `scratch/bundle_standalone.mjs`) and verify `starforge_ark_cradle.html` loads cleanly.
2. **Deterministic Simulation & Gameplay Checks (`window.__LUNAR_BEACON_GAME__`)**:
   - **Skills**: Verify `activateOrArmSkill('orbital_strike')` + canvas pointer tap/drag spawns `0.55s` telegraph then deals `260` AoE + `1.6s` stun + `3` shred stacks after `debugStepSimulation(0.6)`; verify `emp_overdrive` clears `tower.stunTimer`, sets `overdriveTimer = 6.0`, strips `enemy.shieldHp`, and sets `enemy.fluxTimer = 5.5`; verify `nano_repair` heals `+4` Beacon HP (capped at max) + adds `+75G` + spawns 3D coins; verify `debugStepSimulation(10)` while `!waveInProgress` grants `0 ⚡` passive energy.
   - **Combos**: Build `magnetic` + `mortar` + `autocannon`, run Wave 3/4 via `debugStepSimulation`, confirm `fluxTimer > 0`, `armorShredStacks > 0`, `activeComboCount > 0`, and non-stacking `slowRatio <= 0.60`.
   - **T4 Dual Branches**: Upgrade each of the 3 tower types to T3 and test both `upgradeSelectedTower('A')` and `upgradeSelectedTower('B')` (`6` total cases): confirm `mode === 'legendary_reveal'` triggers Stage 2C Golden Hero Reveal, `tierGroups.t4A.visible` vs `t4B.visible` toggles mutually exclusively, Mortar `T4-B` fires 3 staggered rockets, Magnetic `T4-A` pulls enemies backward every 3rd pulse, and Magnetic `T4-B` grants `auraHasteBonus = 0.15` to towers on neighboring pads within `7.0m`.
   - **Outline Exclusion**: Confirm all new reticles, plasma zones, Flux rings, and lightning arcs reside on `vfxScene` or `solidScene` Layer `1` (`ToonOutlineComposer.ts:540-548`) with zero dark `#1A1033` outline artifacts around transparent quads.
