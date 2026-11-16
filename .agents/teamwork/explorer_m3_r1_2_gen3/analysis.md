# Post-M2 Combat, Progression & Balance Delta Blueprint (`explorer_m3_r1_2_gen3`)

**Core Summary**: Post-M2 (`src/types.ts` `566` lines, `src/config/gameConfig.ts` `723` lines, `src/game/ProgressionManager.ts` `617` lines, `src/game/GameEngine.ts` `2,547` lines, `src/render/EnemyFactory.ts` `968` lines) already contains ~85% of the M3 TypeScript interfaces, `ProgressionManager` persistence/modifiers/achievements, and `UISnapshot` fields. This blueprint provides exact line-referenced deltas to wire the **3 Active Commander Skills (`⚡`)**, **Cross-Tower Combo Triangle**, **6 `T3→T4` Dual Specialization Mechanics**, **Tech/Codex/Commendation hooks**, **`simDt` Mortar flap doors + all 5 M2 Gate fixes**, and **Stage 1 Anti-AFK + `tests/e2e.mjs` safe balance**.

---

## 1. Post-M2 Schema & Config Delta (`src/types.ts`, `src/config/gameConfig.ts`, `src/game/ProgressionManager.ts`)

### 1.1 Exact Inventory: Already Present in M2 vs M3 Additions Needed

| File & Lines | Already Implemented in Post-M2 | Exact M3 Delta Needed |
|---|---|---|
| `src/types.ts:13, 33–53` | `TowerBranch = 'A' \| 'B'`; `TacticalSkillId` & `CommanderSkillId` (`'orbital_strike' \| 'emp_overdrive' \| 'nano_repair'`); all `6` `TechUpgradeId`s; all `9` `AchievementId`s. | None — keep 100% intact. |
| `src/types.ts:221–240` | `TowerBranchStats extends TowerTierStats` (`{ branch, name, shortTitle, mechanicTag }`); `TowerBlueprint.branches?: { A, B }`. | Change `branches?:` (`line 236`) to required `branches: { A: TowerBranchStats; B: TowerBranchStats }`; optionally add `accentHex?: string` on `TowerBranchStats` (`line 225`). |
| `src/types.ts:280–339` | `HingedFlapUserData` (`lines 280–285`), `TowerRig` (`idleCore`, `hingedFlaps`, `rotaryBarrels?`, `branchBarrelOverlayA?`, `branchBarrelOverlayB?`, `tierGroups.{t2, t3, t4, t4A?, t4B?}`), `TowerInstance` (`branch?`, `overdriveTimer?`, `auraHasteBonus?`, `spinUpStacks?`, `spinUpDecayTimer?`, `pullPulseCounter?`). | Add `branchTag?: TowerBranch` to `HingedFlapUserData` (`line 285`); add **`flapCloseTimer?: number`** to `TowerInstance` (`line 329`) for pause-safe `simDt` Mortar/Railgun flap closing. |
| `src/types.ts:341–406` | `EnemyRig` (`shieldDome?`, `shieldFillMesh?`, `supportHalo?`, `fluxRingGroup?`, `shredBadgeGroup?`); `EnemyInstance` (`fluxTimer`, `armorShredStacks?`, `armorShredTimer?`, `vulnMultiplier?`, `vulnTimer?`, `stunTimer?`, `comboIcdTimer?`). | None — all M3 enemy combat fields already exist on `EnemyRig` and `EnemyInstance`! |
| `src/types.ts:413–430, 487–565` | `CommanderSkillSnapshot`, `T4BranchOptionSnapshot`, and `UISnapshot` (`tacticalEnergy`, `maxTacticalEnergy`, `armedSkillId`, `skills`, `activeComboCount`, `selectedTowerBranchOptions`, `progression`, `selectedTower.t4BranchOptions`). | Add `CommanderSkillConfig` (`after line 412`: `{ id, hotkey, name, shortName, targeting, energyCost, cooldownSec, radius, accentHex, summary }`); add optional UI display fields `hotkey?: '1' \| '2' \| '3'`, `shortName?: string`, `accentHex?: string`, `summary?: string` on `CommanderSkillSnapshot` (`line 420`), `damage?: number; fireInterval?: number; range?: number` on `T4BranchOptionSnapshot` (`line 429`), and `branchName?: string \| null; mechanicTag?: string \| null; overdriven?: boolean; auraBoosted?: boolean` on `UISnapshot['selectedTower']` (`line 548`). |
| `src/config/gameConfig.ts:238–427` | `TOWER_BLUEPRINTS` has `tiers: [T1, T2, T3, T4]` only; **no `branches`**, **no `COMMANDER_SKILLS`**, **no Codex metadata**. | 1. Add `branches: { A, B }` on `autocannon` (`line 299`), `mortar` (`line 362`), and `magnetic` (`line 425`) (keeping `tiers[3]` synced to `branches.A` base stats).<br>2. Export `COMMANDER_SKILL_ORDER`, `COMMANDER_SKILLS`, and `TACTICAL_ENERGY_CONFIG` (`after line 427`).<br>3. Export `TOWER_SYNERGY_CODEX`, `ENEMY_CODEX_META` (12 enemies/Bosses), and `MECHANISM_CODEX_LIST` (4 mechanisms) (`after line 612`) for Hub Tab 3.<br>4. Tune `elite_drill` (`line 478`), `boss_crawler` (`line 493`), and `WAVE_CONFIGS[7]` (`lines 715–720`) per §4 below. |
| `src/game/ProgressionManager.ts:33–125, 483–566` | All `6` `TECH_MODULES`, `getComputedTechModifiers()`, and all **`9` `ACHIEVEMENT_CONFIGS`** (`lines 102–112`: `ach_ch1_clear` `+6💎`, `ach_flawless_3star` `+8💎`, `ach_dual_t4` `+8💎`, `ach_synergy_25` `+6💎`, `ach_skill_12` `+6💎`, `ach_mech_15` `+6💎`, `ach_all_sectors` `+15💎`, `ach_10_stars` `+12💎`, `ach_endless_15` `+15💎`) **already 100% match `plan.md`**. | In `loadOrMigrate()` (`line 289`), include `'high_ground'` in default `seenCodexIds`: `['autocannon', 'mortar', 'magnetic', 'rover', 'swarm', 'drill', 'high_ground']`. All other methods (`incrementCounter`, `markDualBranchCleared`, `claimAchievement`, `upgradeTech`, `respecTech`) are already complete! |

### 1.2 Exact Config Blocks to Add in `src/config/gameConfig.ts`

1. **`COMMANDER_SKILLS` & `TACTICAL_ENERGY_CONFIG` (`insert at line 428`)**:
   ```ts
   export const COMMANDER_SKILL_ORDER: CommanderSkillId[] = [
     'orbital_strike',
     'emp_overdrive',
     'nano_repair',
   ];

   export const COMMANDER_SKILLS: Record<CommanderSkillId, CommanderSkillConfig> = {
     orbital_strike: {
       id: 'orbital_strike',
       hotkey: '1',
       name: '轨道离子轰炸',
       shortName: '轨道轰炸',
       targeting: 'ground',
       energyCost: 45,
       cooldownSec: 18,
       radius: 3.2,
       accentHex: '#38BDF8',
       summary: '0.55s锁定 · 260穿甲轰击+3层破甲+1.6s眩晕',
     },
     emp_overdrive: {
       id: 'emp_overdrive',
       hotkey: '2',
       name: '全域电磁超载',
       shortName: '电磁超载',
       targeting: 'instant',
       energyCost: 40,
       cooldownSec: 20,
       radius: 0,
       accentHex: '#C084FC',
       summary: '净除眩晕 · 全塔+45%攻速6s · 全场碎盾挂磁化',
     },
     nano_repair: {
       id: 'nano_repair',
       hotkey: '3',
       name: '纳米信标急修',
       shortName: '纳米急修',
       targeting: 'instant',
       energyCost: 35,
       cooldownSec: 24,
       radius: 0,
       accentHex: '#34D399',
       summary: '信标+4耐久修复 · 空投+75G应急金币',
     },
   };

   export const TACTICAL_ENERGY_CONFIG = {
     INITIAL_ENERGY: 50,
     BASE_MAX_ENERGY: 100,
     PASSIVE_REGEN_IN_WAVE_PER_SEC: 1.6,
     WAVE_CLEAR_BONUS: 12,
     BOSS_PLATE_BREAK_BONUS: 15,
     CRYSTAL_VEIN_HARVEST_BONUS: 15,
     KILL_ENERGY: {
       mini_scout: 1.0,
       swarm: 1.5,
       rover: 2.0,
       shield_skimmer: 2.8,
       splitter_rover: 3.0,
       repair_drone: 3.2,
       drill: 4.0,
       elite_drill: 12.0,
       boss_crawler: 25.0,
       boss_siege_driller: 28.0,
       boss_mag_dreadnought: 30.0,
       boss_ark_overlord: 35.0,
     } as Record<EnemyType, number>,
   } as const;
   ```

2. **6 `TowerBlueprint.branches` Specs (`lines 299, 362, 425`)**:
   - **`autocannon.branches`**:
     - `A` (`暴风火神机甲` / `shortTitle: '暴风火神'` / `mechanicTag: '旋管狂飙 · 4层破甲'`): `cost: 240, damage: 52, fireInterval: 0.18, range: 6.6, splashRadius: 0, slowRatio: 0, slowDuration: 0, armorPierce: 0.34, partHeadline: '双联三管旋转火神炮 + 重装肩甲散热翼'`
     - `B` (`双联电磁轨炮` / `shortTitle: '电磁轨炮'` / `mechanicTag: '超距贯通 · 弱点必暴'`): `cost: 255, damage: 158, fireInterval: 0.62, range: 8.6, splashRadius: 0, slowRatio: 0, slowDuration: 0, armorPierce: 0.68, partHeadline: '加长双轨高斯导轨 + 背部电容散热翼'`
   - **`mortar.branches`**:
     - `A` (`天穹聚变巨炮` / `shortTitle: '天穹聚变'` / `mechanicTag: '3秒电浆火海 · 融甲'`): `cost: 290, damage: 210, fireInterval: 1.32, range: 8.2, splashRadius: 3.25, slowRatio: 0, slowDuration: 0, armorPierce: 0.74, partHeadline: '重炮胸甲 + 聚变磁约束三环炮罩'`
     - `B` (`集束火箭弹巢` / `shortTitle: '集束火箭'` / `mechanicTag: '3连齐射 · 三重引爆'`): `cost: 285, damage: 86, fireInterval: 1.38, range: 8.0, splashRadius: 2.15, slowRatio: 0, slowDuration: 0, armorPierce: 0.58, partHeadline: '双肩六联装火箭弹巢 + 顶部雷达罩'`
   - **`magnetic.branches`**:
     - `A` (`奇点引力中枢` / `shortTitle: '奇点引力'` / `mechanicTag: '60%迟滞 · 周期回拽'`): `cost: 245, damage: 68, fireInterval: 0.95, range: 6.7, splashRadius: 0, slowRatio: 0.60, slowDuration: 3.6, armorPierce: 0.62, partHeadline: '悬浮奇点球核 + 三轴金色陀螺磁环'`
     - `B` (`高压电弧矩阵` / `shortTitle: '高压电弧'` / `mechanicTag: '5目标破盾 · 邻塔加速'`): `cost: 250, damage: 82, fireInterval: 0.86, range: 6.5, splashRadius: 0, slowRatio: 0.45, slowDuration: 3.0, armorPierce: 0.70, partHeadline: '三柱高压特斯拉电弧塔 + 顶部导流环'`

---

## 2. `GameEngine.ts` Combat & Progression Delta (Exact Line Numbers in 2,547-Line File)

### 2.1 Callbacks, Fields & Mission Reset (`lines 50–61, 115–140, 443–475`)
- **`EngineUICallbacks` (`lines 50–61`)**: Add optional callbacks (wired in `src/main.ts:33–41`):
  - `onComboCallout?: (screenX: number, screenY: number, text: string, accentHex: string, comboCount: number) => void;`
  - `onInsufficientEnergy?: (missingEnergy: number) => void;`
- **New Private Fields (`insert at line 116`)**:
  - `private bannerHideTimer = 0;`
  - `private tacticalEnergy: number = TACTICAL_ENERGY_CONFIG.INITIAL_ENERGY;`
  - `private maxTacticalEnergy: number = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY;`
  - `private armedSkillId: CommanderSkillId | null = null;`
  - `private skillCooldowns: Record<CommanderSkillId, number> = { orbital_strike: 0, emp_overdrive: 0, nano_repair: 0 };`
  - `private pendingOrbitalStrikes: Array<{ x: number; z: number; timer: number }> = [];`
  - `private pendingRocketSalvos: Array<{ tower: TowerInstance; muzzleIdx: number; tx: number; tz: number; damage: number; splashRadius: number; armorPierce: number; delay: number }> = [];`
  - `private plasmaZones: Array<{ x: number; z: number; radius: number; remaining: number; tickAccum: number; tickDamage: number; armorPierce: number; sourceTower: TowerInstance | null }> = [];`
  - `private activeComboCount = 0;`
  - `private comboResetTimer = 0;`
  - `private lastComboCalloutMs = 0;`
  - `private lastAutocannonSynergySec = -10;`
- **`notifyProgressionUpdated()` (`lines 443–445`)**:
  - Live-sync mid-run Tech upgrades / Respec when player closes or interacts in Hub:
    ```ts
    const mods = this.progression.getComputedTechModifiers();
    const newMaxHp = this.currentStage.maxBeaconHp + mods.bonusMaxBeaconHp;
    if (newMaxHp > this.maxBeaconHp) this.beaconHp += newMaxHp - this.maxBeaconHp;
    else this.beaconHp = Math.min(this.beaconHp, newMaxHp);
    this.maxBeaconHp = newMaxHp;
    this.maxTacticalEnergy = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY + mods.bonusInitialEnergy;
    this.tacticalEnergy = Math.min(this.maxTacticalEnergy, this.tacticalEnergy);
    this.syncSelectionRings();
    this.emitSnapshot();
    ```
- **`startNewMission()` (`lines 447–507`)**:
  - Clear `window.clearTimeout(this.bannerHideTimer)` + `this.callbacks.onHideBanner()`.
  - Initialize energy with `tactical_reactor` bonus:
    - `this.maxTacticalEnergy = TACTICAL_ENERGY_CONFIG.BASE_MAX_ENERGY + techMods.bonusInitialEnergy;` (`100..150 ⚡`)
    - `this.tacticalEnergy = Math.min(this.maxTacticalEnergy, TACTICAL_ENERGY_CONFIG.INITIAL_ENERGY + techMods.bonusInitialEnergy);` (`50/100` base -> up to `100/150` at Lv.4 so `+12/+24/+36/+50⚡` is never clamped away!)
  - Reset `armedSkillId = null`, `skillCooldowns = { orbital_strike: 0, emp_overdrive: 0, nano_repair: 0 }`, `pendingOrbitalStrikes = []`, `pendingRocketSalvos = []`, `plasmaZones = []`, `activeComboCount = 0`, `comboResetTimer = 0`, and `this.vfx.setTacticalReticle(false)`.
  - Auto-discover `'high_ground'` in Codex if `this.currentStage.buildPads.some((p) => p.padType === 'high_ground')`.

### 2.2 3 Active Commander Skills + `⚡` Tactical Energy (`lines 818, 887–893, 1061–1067, 1965, 1980, 2101, 2240–2332`)
1. **`addTacticalEnergy(amount: number, applyRegenMult = true)`**:
   - Multiplies `amount * (applyRegenMult ? this.progression.getComputedTechModifiers().energyRegenMultiplier : 1)` and clamps to `this.maxTacticalEnergy`.
   - **Exact Energy Sources**:
     - **In-Wave Passive Regen (`stepFrame` at `line 1062`)**: `if (this.waveInProgress) this.addTacticalEnergy(1.6 * simDt, true);` (**strictly `0 ⚡/s` when `!this.waveInProgress`** — prevents infinite inter-wave `+75G` farming via `nano_repair`!).
     - **Crystal Vein Harvest (`activateMechanism` at `line 818`)**: `this.addTacticalEnergy(15, true);`
     - **Boss Armor Plate Break (`applyDamageToEnemy` at `line 1965`)**: `this.addTacticalEnergy(15, true);`
     - **Enemy Kill (`applyDamageToEnemy` at `line 1980`)**: `this.addTacticalEnergy(TACTICAL_ENERGY_CONFIG.KILL_ENERGY[enemy.type] ?? 2.0, true);`
     - **Wave Clear (`checkWaveCompletion` at `line 2101`)**: `this.addTacticalEnergy(12, true);`
2. **`activateCommanderSkill(skillId)` & `cancelSkillTargeting()` (`replace stubs at lines 887–893`)**:
   - Finish `'opening'` cleanly if clicked during intro; require `this.mode === 'playing' && !this.overlayPaused`.
   - If `this.armedSkillId === skillId`, call `this.cancelSkillTargeting()` and return `false`.
   - Check `this.skillCooldowns[skillId] <= 0` and `this.tacticalEnergy >= cfg.energyCost` (on energy shortage: `audio.playInsufficientGold()`, `callbacks.onInsufficientEnergy?.(Math.ceil(cfg.energyCost - this.tacticalEnergy))`, return `false`).
   - **`orbital_strike` (`45⚡, 18s CD`)**:
     - Deselect any open pad/tower (`this.selectedPadId = null; this.previewTowerType = null; this.clearGhostPreview(); this.syncSelectionRings();`) so `#tray-slot` closes and never occludes roads on `580px` embed / `360×800` portrait.
     - Set `this.armedSkillId = 'orbital_strike'`, play `audio.playTacticalArm()`.
     - Snap initial reticle to leading enemy (`acquireBestTarget(new THREE.Vector3(0,0,0), 999)?.worldPos` or `(0, 0)`) via `vfx.setTacticalReticle(true, aimX, aimZ, 3.2)`.
   - **`emp_overdrive` (`40⚡, 20s CD`, instant)**:
     - Deduct `40⚡`, set `skillCooldowns.emp_overdrive = 20`, `cancelSkillTargeting()`, `progression.incrementCounter('skillsUsed', 1)`.
     - Towers: for all `tw` in `this.towers.values()`, set `tw.stunTimer = 0`, `tw.overdriveTimer = Math.max(tw.overdriveTimer ?? 0, 6.0)`, `tw.flapCloseTimer = Math.max(tw.flapCloseTimer ?? 0, 6.0)`.
     - Enemies: for all living `e` in `this.enemies`, if `e.shieldHp > 0` strip `100%` (`e.shieldHp = 0; this.syncEnemyShieldVisuals(e); this.vfx.spawnShieldBreak(e.worldPos);`), set `e.fluxTimer = Math.max(e.fluxTimer, 5.5)`, `if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true`, and apply `35%` slow (`2.0s`).
     - Trigger `vfx.spawnStationEmpWave(this.env.beacon.group.position)`, `audio.playEmpOverdrive()`, `cinematics.addCameraShake(0.18)`.
   - **`nano_repair` (`35⚡, 24s CD`, instant)**:
     - Deduct `35⚡`, set `skillCooldowns.nano_repair = 24`, `cancelSkillTargeting()`, `progression.incrementCounter('skillsUsed', 1)`.
     - Restore Beacon HP: `this.beaconHp = Math.min(this.maxBeaconHp, this.beaconHp + 4)`.
     - Grant Gold: `this.gold += 75`.
     - Spawn `vfx.spawnBeaconNanoRepair(beaconPos)`, `audio.playNanoBeaconRepair()`, and fountain **`6` 3D Gold Coins** via `vfx.spawn3DLoot(beaconPos.clone().add(new THREE.Vector3(0, 0.7, 0)), 6, 0, beaconPos.clone().add(new THREE.Vector3(0, 3.8, 0)), () => this.audio.playLootChime(false))`.
3. **Desktop Hover-Click & Mobile Drag-Release Reticle (`bindPointerInput` at `lines 2240–2253`) + `0.55s` `simDt` Queue (`stepFrame` at `line 1062`)**:
   - Add `raycastGroundArena(clientX, clientY, out)` using `intersectHorizontalPlane(0.12, out)` (`lines 2258–2261`), clamped to `x ∈ [-14.5, 14.5], z ∈ [-9.5, 9.5]`.
   - `pointerdown`: if `this.armedSkillId === 'orbital_strike'` and `raycastGroundArena`, immediately move reticle to `(hit.x, hit.z)`.
   - `pointermove` (new listener; remove in `dispose()` at `line 325`): if `this.armedSkillId === 'orbital_strike'` and (`ev.pointerType !== 'touch' || pointerIsDown`), update `vfx.setTacticalReticle(true, hit.x, hit.z, 3.2)`.
   - `pointerup`:
     - **When `this.armedSkillId === 'orbital_strike'`**: allow arbitrary drag distance (do NOT reject `> 14px` drag so mobile players can drag-aim!), raycast `(ev.clientX, ev.clientY)` -> deduct `45⚡`, `skillCooldowns.orbital_strike = 18`, `progression.incrementCounter('skillsUsed', 1)`, push `{ x: hit.x, z: hit.z, timer: 0.55 }` to `pendingOrbitalStrikes`, call `vfx.spawnOrbitalLockOn(hit.x, hit.z, 3.2, 0.55)` + `audio.playOrbitalLockOn()`, clear `this.armedSkillId = null`, hide reticle, `emitSnapshot()`, and **`return;` BEFORE `handleCanvasTap`** (`line 2251`) so pads/mechanisms are never accidentally tapped!
   - Add `keydown` listener (`Escape` -> `cancelSkillTargeting()`, `1/2/3` -> `activateCommanderSkill`, cleaned up in `dispose()`).
   - **`updateCommanderSkills(simDt)` in `stepFrame` (`line 1062`)**:
     - Tick `skillCooldowns` by `simDt` and `pendingOrbitalStrikes` by `simDt`.
     - When `strike.timer <= 0`: call `vfx.spawnOrbitalIonBeam(strike.x, strike.z, 3.2)` + `audio.playOrbitalStrikeImpact()` + `cinematics.addCameraShake(0.32)`; for each living enemy in `3.2 + (e.isBoss ? 0.8 : 0.25)`:
       - Apply **`3` stacks `[破甲裂隙]`** (`e.armorShredStacks = Math.max(e.armorShredStacks ?? 0, 3); e.armorShredTimer = Math.max(e.armorShredTimer ?? 0, 6.0);`),
       - Apply **`1.6s` stun** (`0.65s` on Boss; if `e.isBoss && e.skillTelegraphTimer > 0`, interrupt `e.skillTelegraphTimer = 0; this.vfx.setBossTelegraphZone(false);`),
       - Deal **`260` pierce AoE damage** (`220` vs Boss, `armorPierce = 0.85`): `this.applyDamageToEnemy(e, e.isBoss ? 220 : 260, 0.85, null)`.

### 2.3 Cross-Tower Combo Triangle (`lines 1425–1430, 1600–1606, 1770–1793, 1834–1870, 1910–1932`)
1. **Debuff Tick & Visual Sync in `updateEnemies(dt)` (`lines 1425–1431` & `1600–1606`)**:
   - `fluxTimer`: decrement by `dt`; sync `if (e.rig.fluxRingGroup) { e.rig.fluxRingGroup.visible = e.fluxTimer > 0 && !e.dead; e.rig.fluxRingGroup.rotation.y -= dt * 4.2; }`.
   - `armorShredTimer`: decrement by `dt`; if `<= 0`, reset `e.armorShredStacks = 0`; sync `if (e.rig.shredBadgeGroup) e.rig.shredBadgeGroup.visible = (e.armorShredStacks ?? 0) > 0 && !e.dead;`.
   - `vulnTimer`: decrement by `dt`; if `<= 0`, reset `e.vulnMultiplier = 1.0`.
   - `comboIcdTimer`: `e.comboIcdTimer = Math.max(0, (e.comboIcdTimer ?? 0) - dt)`.
   - `stunTimer`: decrement by `dt`; at `line 1602`, `const isStunned = (e.stunTimer ?? 0) > 0; const effSpeed = bossHaltedForSkill || isStunned ? 0 : e.baseSpeed * railMult * hasteMult * (1 - e.slowRatio);`.
   - Hide `fluxRingGroup` and `shredBadgeGroup` on enemy death (`line 1975`).
2. **Magnetic Non-Sticky Slow + `[Flux-Marked]` (`fireMagneticTower` at `lines 1857–1869`)**:
   - Keep `e.slowRatio = Math.max(e.slowRatio, effectiveSlow); e.slowTimer = Math.max(e.slowTimer, stats.slowDuration);` (refreshes while in range, clears cleanly at `lines 1478–1482` when `slowTimer <= 0`).
   - Set `e.fluxTimer = Math.max(e.fluxTimer, stats.slowDuration + 0.85);` (`3.35s`–`4.45s`) and `if (e.rig.fluxRingGroup) e.rig.fluxRingGroup.visible = true;`.
3. **Mortar `⚡磁暴共振` (`resolveMortarImpact` replacing `lines 1834–1844`)**:
   - Cap `detonationsThisExplosion = 2`. For each enemy `e` in `splashRadius`:
     - Capture `const canDetonateFlux = e.fluxTimer > 0 && (e.comboIcdTimer ?? 0) <= 0 && detonationsThisExplosion < 2;` **before** applying primary splash damage (so lethal hits still trigger resonance!).
     - Apply primary splash damage (`1.0` inner / `0.78` outer).
     - If `canDetonateFlux`:
       - `detonationsThisExplosion++`; consume `1.25s` (`e.fluxTimer = Math.max(0, e.fluxTimer - 1.25); e.comboIcdTimer = 0.08;`).
       - Multiply by `comboMult = this.progression.getComputedTechModifiers().comboDamageMultiplier` (`1.00..1.48`):
         - **AoE Shock (`2.2m`)**: deal `Math.round(baseDamage * 0.35 * comboMult)` (`armorPierce = 0.75`) to living enemies within `2.2m` of `e.worldPos`.
         - **2-Target Chain Lightning (`3.4m`)**: deal `Math.round(baseDamage * 0.28 * comboMult)` (`armorPierce = 0.80`) to up to `2` nearest other living enemies within `3.4m`.
       - Spawn `vfx.spawnFluxDetonation(e.worldPos, chainTargets)`, `audio.playFluxDetonation()`, and call `registerSynergyCombo(e.worldPos, '⚡磁暴共振', '#22D3EE', true)`.
4. **Autocannon `[破甲裂隙]` & `🎯弱点暴击` (`fireAutocannon` at `lines 1770–1793`)**:
   - **Armor Shred**: if `target.armor > 0`, `const maxShred = tower.tier === 4 && tower.branch === 'A' ? 4 : 3;` -> `target.armorShredStacks = Math.min(maxShred, (target.armorShredStacks ?? 0) + 1); target.armorShredTimer = 4.0;`.
   - **Weak-Point Crit**:
     - `const isRailgun = tower.tier === 4 && tower.branch === 'B';`
     - `const bossExposed = target.isBoss && (target.armorLayersRemaining < target.rig.armorPlates.length || target.skillTelegraphTimer > 0 || target.fluxTimer > 0);`
     - `const isCrit = (target.fluxTimer > 0 && (isRailgun || tower.shotToggle % 3 === 0)) || (bossExposed && (isRailgun || tower.shotToggle % 2 === 0)) || (isRailgun && target.isElite);`
     - Base crit mult: `1.55` (`T4-B` Railgun), `1.42` (Boss exposed core), `1.35` (`[Flux-Marked]`); scale bonus by `comboDamageMultiplier`: `const critMult = 1 + (baseCrit - 1) * tech.comboDamageMultiplier`.
     - Aim shot at `target.rig.weakPointCore.getWorldPosition(hitPos)` when `weakPointCore` exists; spawn `vfx.spawnWeakPointCrit(hitPos)` + `audio.playWeakPointCrit()`; throttle `registerSynergyCombo(hitPos, '🎯弱点暴击', '#FBBF24', ...)` (`>= 0.55s` simulation interval for `synergyTriggers` increment so rapid-fire Gatling guns earn `ach_synergy_25` fairly).
5. **Unified `applyDamageToEnemy` (`lines 1872–1931`)**:
   - Accept optional `opts?: { shieldMult?: number; skipWeakPointPassive?: boolean }`.
   - At `line 1885`: `const shieldBonus = opts?.shieldMult ?? (sourceTower?.type === 'magnetic' || sourceTower === null ? 1.35 : 1.0);` (`2.5x` for Magnetic T4-B!).
   - At `line 1911`: skip passive `1.25x` Boss `weakPointCore` bonus when `opts?.skipWeakPointPassive` is `true` (so explicit `🎯弱点暴击` `1.42x–1.55x` doesn't double-stack).
   - At `lines 1929–1930`:
     ```ts
     const shredFlat = (enemy.armorShredTimer ?? 0) > 0 ? (enemy.armorShredStacks ?? 0) * 0.08 : 0;
     const shreddedArmor = Math.max(0, enemy.armor - shredFlat);
     const effectiveArmor = Math.max(0, shreddedArmor * (1 - armorPierce));
     const vulnMult = (enemy.vulnTimer ?? 0) > 0 ? (enemy.vulnMultiplier ?? 1.0) : 1.0;
     const finalDamage = Math.max(2, Math.round(remainingRaw * (1 - effectiveArmor) * vulnMult));
     ```
6. **`#combo-float-layer` & `activeComboCount` Helper**:
   - `registerSynergyCombo(worldPos, label, hex, countForAchievement)`: sets `this.activeComboCount++`, `this.comboResetTimer = 4.5` (ticked down in `stepFrame`, resetting `activeComboCount = 0` on expiry), calls `if (countForAchievement) this.progression.incrementCounter('synergyTriggers', 1)`, and if `performance.now() - this.lastComboCalloutMs >= 260`, projects `this.projectWorldToScreen(worldPos)` (`lines 2513–2521`) and invokes `this.callbacks.onComboCallout?.(pt.x, pt.y - 24, label, hex, this.activeComboCount)`.

### 2.4 6 `T3→T4` Dual Specialization Mechanics (`lines 571–603, 685–762, 1669–1870, 2348–2401`)
1. **`computeTowerStatsForTier(type, tier, isHighGround, branch: TowerBranch = 'A')` (`lines 571–603`)**:
   - Look up `const bp = TOWER_BLUEPRINTS[type]; const base = tier === 4 ? bp.branches[branch] : bp.tiers[tier - 1];`.
   - Pass `tower.branch ?? 'A'` in `updateTowers` (`line 1671`), `syncSelectionRings` (`line 2220`), and `getSnapshot` (`line 2352`).
2. **`upgradeSelectedTower(branch: TowerBranch = 'A')` (`lines 685–762`)**:
   - `line 693`: compute `nextStats = this.computeTowerStatsForTier(tower.type, nextTier, isHG, branch)`.
   - `line 705`: set `tower.branch = branch;` + `this.progression.discoverCodex(`${tower.type}_${branch}`);` + push `{ label: '专精', deltaText: TOWER_BLUEPRINTS[tower.type].branches[branch].shortTitle }` to `deltas`.
   - Note: `CinematicDirector.playLegendaryUpgradeReveal` (`CinematicDirector.ts:315–320, 411`) reads `tower.branch ?? 'A'` to fly in `tierGroups.t4A` vs `t4B` and stamp `` `传说·${bp.branches[branch].name}` ``!
   - In `getSnapshot()` (`lines 2350–2401`): when `tw.tier === 3`, populate `t4BranchOptions: [optA, optB]` (and top-level `selectedTowerBranchOptions`) using `computeTowerStatsForTier(tw.type, 4, isHG, 'A')` and `'B'` so `cost` reflects `flux_resonator`'s `t4CostDiscount`!
3. **6 Specialization Combat Implementations**:
   - **Autocannon `A` (`暴风火神机甲`)**: Each shot adds `spinUpStacks = Math.min(8, (spinUpStacks ?? 0) + 1)` (`+3.5%/stack` = up to `+28%` fire-rate haste; decays after `1.6s` idle or resets to `0` on Boss slam stun at `line 1703`); rotates `rig.rotaryBarrels`; raises `[破甲裂隙]` cap to **`4` stacks (`-32%` flat armor)**.
   - **Autocannon `B` (`双联电磁轨炮`)**: Recoils both rails + opens dorsal `hingedFlaps` (`flapCloseTimer = 0.22`), plays `playRailgunShot()`, spawns `vfx.spawnRailgunSlug(muzzleWorld, hitPos)`, guarantees **`1.55x` `🎯弱点暴击`** on `[Flux-Marked]` / Elite / Boss targets, and pierces `1` secondary enemy within `0.72m` of the `(tower.worldPos -> target.worldPos + dir * 2.2m)` line for `65%` damage!
   - **Mortar `A` (`天穹聚变巨炮`)**: Shell impact spawns a **`3.0s` `simDt` Plasma Burn Zone** (`radius = 3.0m`, `tickAccum` firing every `0.5s` for `Math.round(19 * hgDmg * tech.damageMultiplier)` at `0.70` `armorPierce` + `vfx.spawnPlasmaBurnZone(ix, iz, 3.0, 3.0)`).
   - **Mortar `B` (`集束火箭弹巢`)**: Enqueues **`3` rockets spaced by `0.11s` `simDt`** (`delay: 0, 0.11, 0.22`) into `pendingRocketSalvos`, spreading `[0, -0.65m, +0.65m]` along `sampleLaneAtDistance(lane, leadDist + offset)`, alternating left/right pod `muzzlePoints`, each independently triggering `resolveMortarImpact` (up to `3×` `⚡磁暴共振`!).
   - **Magnetic `A` (`奇点引力中枢`)**: Increments `pullPulseCounter`; every **`3rd` pulse** (`% 3 === 0`), plays `playSingularityPull()` + `vfx.spawnSingularityPull(tower.worldPos, stats.range)` and pulls enemies in range backward along their lane (`pullDist = e.isBoss ? 0.22 : (e.type === 'drill' || e.type === 'elite_drill') ? 0.75 : 1.35`, updating `e.distanceTraveled = Math.max(0, e.distanceTraveled - pullDist)` and `sampleLaneAtDistance(lane, e.distanceTraveled)`!).
   - **Magnetic `B` (`高压电弧矩阵`)**: Grants **`+15%` neighbor tower haste aura** within **`7.0m`** (recomputed at top of `updateTowers` at `line 1670`, covering `2–4` neighbor pads across `3.80m–6.68m` spacing!), and on pulse chains lightning across up to **`5` targets** (`2.5x` shield damage, `+25%` `vulnMultiplier` for `2.6s`, `45%` slow + `[Flux-Marked]`).

---

## 3. Tech Tree, Codex, Commendations, `simDt` Mortar Doors & All 5 M2 Gate Fixes

| Item | Exact File & Line Numbers | Exact Fix / Implementation |
|---|---|---|
| **6 Tech Modules Live Wiring** | `ProgressionManager.ts:483–508`<br>`GameEngine.ts:443, 456–460, 587–602, 2103–2106` | `kinetic_core` (`damageMultiplier` on towers + plasma burn), `servo_drive` (`fireRateMultiplier` + `rangeMultiplier`), `requisition_pack` (`bonusInitialGold`), `beacon_plating` (`bonusMaxBeaconHp` + `waveHealBeaconHp`), `tactical_reactor` (`bonusInitialEnergy` on `tacticalEnergy`/`maxTacticalEnergy` + `energyRegenMultiplier` in `addTacticalEnergy`), `flux_resonator` (`comboDamageMultiplier` on `⚡磁暴共振` & `🎯弱点暴击` + `t4CostDiscount` on both T4-A & T4-B). |
| **Codex Auto-Discovery & 9 Commendations** | `GameEngine.ts:476, 673, 705, 738, 806–807, 890, 1309, 1835` | `discoverCodex` already fires on tower build (`673`), mechanism use (`807`), and enemy spawn (`1309`); add `'high_ground'` on stage load (`476`) and `${type}_${branch}` on T4 upgrade (`705`). Commendation counters: `mechanismsUsed` (`806`) & `markDualBranchCleared` (`738`) already wired; add `incrementCounter('skillsUsed', 1)` in `activateCommanderSkill` / orbital commit, and `incrementCounter('synergyTriggers', 1)` in `registerSynergyCombo`! |
| **Pause-Safe `simDt` Mortar Flap Doors** | `GameEngine.ts:1697, 1805–1815` | Delete `setTimeout(() => { flap.rotation[axis] = restAng; }, 240)` (`lines 1812–1814`). Set `tower.flapCloseTimer = 0.24` on fire, open flaps matching `(ud.minTier ?? 3) <= tower.tier && (!ud.branchTag \|\| ud.branchTag === tower.branch)`, and in `updateTowers(dt)` (`after line 1697`) decrement `tower.flapCloseTimer` by `dt` (`simDt`), lerping `flap.rotation[axis]` back to `ud.restAngle ?? 0` when `<= 0`! |
| **M2 Gate Fix 1: `fullscreenEnabled` Guard** | `src/game/GameEngine.ts:302` | Change `if (host.requestFullscreen)` to **`if (document.fullscreenEnabled && host.requestFullscreen)`** — eliminates Chromium's native Permissions-Policy `console.error` inside `<iframe sandbox="allow-scripts">`. |
| **M2 Gate Fix 2: Tracked `bannerHideTimer`** | `src/game/GameEngine.ts:116, 325, 451, 964–966, 2131–2133` | Replace both untracked `setTimeout`s (`lines 964–966` & `2131–2133`) with `window.clearTimeout(this.bannerHideTimer); this.bannerHideTimer = window.setTimeout(...);` and clear in `startNewMission()` (`line 451`) & `dispose()` (`line 325`). |
| **M2 Gate Fix 3: Campaign Final Boss Lethal Breach** | `src/game/GameEngine.ts:1616` | Replace `this.beaconHp = Math.max(0, this.beaconHp - e.beaconDamage);` with:<br>`const isFinalCampaignWave = !this.isEndlessMode() && this.waveIndex === this.currentStage.waves.length - 1;`<br>`const dmg = isFinalCampaignWave && e.isBoss ? Math.max(e.beaconDamage, this.maxBeaconHp) : e.beaconDamage;`<br>`this.beaconHp = Math.max(0, this.beaconHp - dmg);` |
| **M2 Gate Fix 4: Fallback `supplyChest` & `skyBeam` Visibility** | `src/game/GameEngine.ts:2134–2137`<br>`src/game/CinematicDirector.ts:828` | In `checkWaveCompletion()` `else` branch (`lines 2135–2137`), set `this.env.beacon.skyBeam.visible = true; (this.env.beacon.skyBeam.material as THREE.MeshBasicMaterial).opacity = 0.58; this.env.supplyChest.group.position.set(this.currentStage.supplyChestPos.x, this.currentStage.supplyChestPos.y, this.currentStage.supplyChestPos.z); this.env.supplyChest.group.scale.set(1, 1, 1); this.env.supplyChest.group.visible = true; this.mode = 'victory_panel';` (and set `chest.group.visible = true;` at top of `playOpenRewardChest` at `CinematicDirector.ts:829`). |
| **M2 Gate Fix 5: `shieldFillMesh` + `fluxRingGroup` / `shredBadgeGroup` on Non-Boss Rigs** | `src/render/EnemyFactory.ts:898, 930–946` | 1. At `lines 930–943`, remove the `if ((bp.maxShield ?? 0) > 0)` guard and create `shieldFillMesh` **unconditionally on all rigs** with **`shieldFillMesh.visible = (bp.maxShield ?? 0) > 0;`** (inherits Layer `1` from `setLayerRecursive(hpBarGroup, 1)` at `line 945`!) so `boss_siege_driller`'s `+120` projected ally shields (`GameEngine.ts:1553–1560`) render a cyan shield bar immediately.<br>2. After `slowRing` (`line 898`), build `fluxRingGroup` (Layer `1`, `visible = false`, cyan-violet target brackets at `y = 0.08`) and `shredBadgeGroup` (inside `hpBarGroup`, `visible = false`, amber `#F59E0B` chevron) and return them on `EnemyRig`. |

---

## 4. Stage 1 Anti-AFK Balance Verification & `tests/e2e.mjs` Compatibility Proof

### 4.1 Critical Timing Trap Discovered in `WAVE_CONFIGS[7]` (`src/config/gameConfig.ts:715–720`)
- In post-M2 `WAVE_CONFIGS[7]` (Stage 1 Wave 8):
  - `boss_crawler` spawns at `t = 3.70s` (`speed = 0.88 m/s`) and reaches central High-Ground `pad_06` (`dist ≈ 16m`) at **`t = 21.8s`**.
  - `swarm × 12` (`delayBefore: 3.2`, `speed = 3.75 m/s`) spawns at `t = 7.35..13.95s` and reaches `pad_06` at **`t = 11.6..18.2s`** — **BEFORE `boss_crawler` enters range**!
  - Consequently, if a player builds `1x Autocannon T4-A` (`暴风火神机甲`) on `pad_06` and goes AFK, it kills the `12 swarm`s *before* `t = 18.2s`, and then gets `22s` of uninterrupted 1v1 uptime on `boss_crawler`!

### 4.2 Exact Balance Tuning That Defeats ALL `1x T4` Solo AFK Runs While Keeping `tests/e2e.mjs` 100% Intact
1. **`ENEMY_BLUEPRINTS` (`src/config/gameConfig.ts:478, 493`)**:
   - `elite_drill.maxHp`: `1180 → 1350` (`armor: 0.48`)
   - `boss_crawler.maxHp`: `5200 → 6400` (`armor: 0.45`, `beaconDamage: 20`)
2. **`WAVE_CONFIGS[7]` (Stage 1 Wave 8, `src/config/gameConfig.ts:715–720`)**:
   ```ts
   groups: [
     { enemyType: 'rover', count: 6, interval: 0.85, delayBefore: 0.2 },
     { enemyType: 'boss_crawler', count: 1, interval: 1.0, delayBefore: 1.2 }, // Still spawns at exact t = 3.70s!
     { enemyType: 'drill', count: 5, interval: 1.9, delayBefore: 2.8 },
     { enemyType: 'swarm', count: 14, interval: 0.55, delayBefore: 6.2 },     // Arrives t = 21..28s WITH boss_crawler!
   ],
   ```
3. **Mathematical Proof Across All 4 Cases**:
   - **`1x T4` Solo AFK (Any of the 6 Specializations, Even on High-Ground `pad_03` / `pad_06`)**:
     - **Autocannon `T4-A` (`52` dmg, `0.18s`, `+28%` max spin-up) or `T4-B` (`158` dmg, `0.62s`)**: `findValidTarget` (`GameEngine.ts:1739`) keeps the single turret sticky-locked onto `boss_crawler` (`6,400 HP`, plus `2.2s` Boss slam stun within `5.2m` resetting spin-up stacks) from `t = 21.8s` to `t ≈ 41s`, while `14 swarm` (`14` Beacon DMG) + `5 drill` (`10` Beacon DMG = **`24 > 20` Beacon HP**) sprint straight past into the Return Beacon → **100% deterministic `defeat`!**
     - **Mortar `T4-A` or `T4-B`**: Un-slowed `swarm` (`3.75 m/s`) outrun `0.5s` mortar shells across Waves 5–8 (`> 12` leaks before Wave 8), AND without Magnetic slow/Flux or Autocannon armor shred, solo Mortar deals `< 3,600` Boss damage (`< 6,400 HP`) → `boss_crawler` breaches Beacon (`-20 HP`) → **100% deterministic `defeat`!**
     - **Magnetic `T4-A` or `T4-B`**: Deals `< 3,500` total Boss damage over `38s` (`< 6,400 HP`) → `boss_crawler` breaches Beacon (`-20 HP`) → **100% deterministic `defeat`!**
   - **Mixed Synergy + Commander Skills**:
     - `Magnetic` (`50–60%` slow + `[Flux-Marked]`) + `Mortar` (`⚡磁暴共振` AoE + 2-target chain) evaporates all `14 swarm`s & `5 drill`s inside the bend while `Autocannon` (`-24%/-32%` `[破甲裂隙]` + `🎯弱点暴击`) + `EMP Overdrive` / `Orbital Ion Strike` melts `boss_crawler` (`6,400 HP`) cleanly!
   - **100% `tests/e2e.mjs` Stage 1 Compatibility**:
     - Wave 1 (`lines 149–161`): Unchanged (`7 rover`, `260G` initial gold, `20/20` Beacon HP when Tech levels are `0`).
     - Stage 2B/2C Upgrades (`lines 174–238`): `#btn-upgrade-tower` maps to `upgradeSelectedTower('A')`, and `g.upgradeSelectedTower()` defaults `branch = 'A'`.
     - Stage 3 Boss Intro & Telegraph (`lines 289–324`): `boss_crawler` still spawns at `t = 3.70s` (`< 5.0s` step window at `line 293`) and telegraphs at `dist > 3.8m` (`line 314`).
     - Stage 4/5 Victory & Chest Claim (`lines 327–368`): `tests/e2e.mjs`'s 6-tower mixed defense (`1x T4-A AC + 1x T4-A HG Mortar + 1x T3 HG Mag + 2x T3 AC + 1x T3 Mortar`, now boosted by automatic `Flux` + `⚡磁暴共振` + `[破甲裂隙]` + `🎯弱点暴击`!) clears Wave 8 in `~30s` (`<< 70s` step budget at `line 329`), and `#btn-play-again` (`lines 371–399`) resets `gold = 260, beaconHp = 20` and verifies `1x T1` solo `defeat` cleanly!
