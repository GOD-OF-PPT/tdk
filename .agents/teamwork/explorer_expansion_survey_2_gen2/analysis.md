# Track 2 Architectural Blueprint: Deep Core TD Combat Systems
**Active Commander Tactical Skills · Cross-Tower Mechanical/Elemental Combos · T3→T4 Dual Specialization Branches · WebAudio & Balance**

> **Core Summary**: To resolve the user's top-priority playtest feedback (`ORIGINAL_REQUEST.md:118-128` — *"可玩/趣味性不够，导致更像一个demo"*), this blueprint transforms combat from passive single-path tower stat-checks into an active, high-synergy tactical loop: **3 Active Commander Tactical Skills** powered by combat-generated Tactical Energy (`⚡`), a **3-Tower Elemental/Mechanical Combo Triangle** (`[Flux-Marked]` → `⚡ 磁暴共振` + `[破甲裂隙]` & `🎯 弱点暴击`), and **6 Distinct T4 Legendary Mechs (`A/B` Dual Specializations per archetype)** with real 3D `RoundedBoxGeometry` modules, `#1A1033` Toon outlines, Stage 2C Golden Hero Reveals, procedural WebAudio SFX, and verified anti-AFK DPS/economy math.

---

## 1. Unified Type & Data Model Extensions (`src/types.ts` & `src/config/gameConfig.ts`)

### 1.1 Current State Observations
- `src/types.ts:3-11`: Defines `TowerType = 'autocannon' | 'mortar' | 'magnetic'` and `TowerTier = 1 | 2 | 3 | 4`, with no branch type or tactical skill types.
- `src/types.ts:61-83`: `TowerBlueprint.tiers` is a fixed 4-tuple `[TowerTierStats, TowerTierStats, TowerTierStats, TowerTierStats]` (`line 82`), allowing only a single T4 upgrade path.
- `src/types.ts:128-168`: `TowerRig.tierGroups` (`lines 144-148`) holds `{ t2, t3, t4 }`; `TowerInstance` (`lines 153-168`) has `stunTimer` (`line 162`) and `upgradingTimer` (`line 163`), with no `branch`, `overdriveTimer`, `spinUpStacks`, or `auraHasteBonus`.
- `src/types.ts:170-215`: `EnemyRig` (`lines 170-184`) already exposes `weakPointCore: THREE.Mesh | null` (`line 177`), `armorPlates: THREE.Object3D[]` (`line 178`), and `slowRing: THREE.Mesh` (`line 179`). `EnemyInstance` (`lines 186-215`) tracks `slowRatio`/`slowTimer` (`lines 202-203`) and `armorLayersRemaining` (`line 212`), ready for `[Flux-Marked]`, `[Armor Shred]`, `[Shield]`, and `[Vulnerability]` extensions.
- `src/types.ts:222-276`: `UISnapshot` has no tactical skill state, combo counter, or T3→T4 dual-branch preview fields.

### 1.2 Proposed Type Additions (`src/types.ts`)

```ts
// --- T4 Dual Specialization Branches ---
export type TowerBranch = 'A' | 'B';

export interface TowerBranchStats extends TowerTierStats {
  branch: TowerBranch;
  branchName: string;        // e.g. '暴风火神机甲' | '双联电磁轨炮'
  branchCode: string;        // e.g. 'AC-04A' | 'AC-04B'
  branchTagline: string;     // Compact UI card badge, e.g. '旋管狂飙 · 叠层碎甲'
  mechanicSummary: string;   // Inspector trait line
  accentColorHex: string;    // Secondary weapon/trim highlight
  accentColor: number;
}

// Extend TowerBlueprint (src/types.ts:75-83):
// Keep tiers[3] = branches.A for 100% backward compatibility!
export interface TowerBlueprint {
  id: TowerType;
  name: string;
  code: string;
  roleSummary: string;
  weaponColorHex: string;
  weaponColor: number;
  tiers: [TowerTierStats, TowerTierStats, TowerTierStats, TowerTierStats];
  branches: {
    A: TowerBranchStats;
    B: TowerBranchStats;
  };
}

// --- Active Commander Tactical Skills ---
export type TacticalSkillId = 'orbital_strike' | 'emp_overdrive' | 'nano_repair';

export interface TacticalSkillBlueprint {
  id: TacticalSkillId;
  hotkey: '1' | '2' | '3';
  name: string;
  shortName: string;
  targeting: 'ground' | 'instant';
  energyCost: number;
  cooldownSec: number;
  radius: number;            // 3.2m for orbital_strike, 0 for global/beacon instant skills
  accentHex: string;
  summary: string;
}

export interface TacticalSkillSnapshot {
  id: TacticalSkillId;
  hotkey: '1' | '2' | '3';
  name: string;
  shortName: string;
  targeting: 'ground' | 'instant';
  energyCost: number;
  cooldownRemaining: number;
  cooldownTotal: number;
  ready: boolean;
  armed: boolean;            // true when ground reticle is active for orbital_strike
  accentHex: string;
  summary: string;
}

export interface T4BranchChoiceSnapshot {
  branch: TowerBranch;
  branchName: string;
  branchTagline: string;
  cost: number;
  affordable: boolean;
  damage: number;
  fireInterval: number;
  range: number;
  accentHex: string;
  mechanicSummary: string;
}
```

**Entity & Rig Field Extensions (`src/types.ts`)**:
- **`TowerRig` (`lines 128-151`)**:
  - `tierGroups`: `{ t2: THREE.Group; t3: THREE.Group; t4: THREE.Group; t4A: THREE.Group; t4B: THREE.Group; }`
  - `rotaryBarrels?: THREE.Object3D[];` (for Autocannon T4-A spinning Gatling clusters)
  - `branchBarrelOverlayA?: THREE.Object3D[];` / `branchBarrelOverlayB?: THREE.Object3D[];` (for branch-specific muzzle/rail/pod attachments on `barrelL`/`barrelR`/`mortarTube`)
- **`TowerInstance` (`lines 153-168`)**:
  - `branch: TowerBranch | null;`
  - `overdriveTimer: number;` (`+45%` fire rate for `6.0s` from Commander Skill 2)
  - `auraHasteBonus: number;` (`0.15` when within `7.0m` of a friendly Magnetic T4-B `高压电弧矩阵`)
  - `spinUpStacks: number;` (`0..12` stacks for Autocannon T4-A `暴风火神机甲`)
  - `spinUpDecayTimer: number;` (`1.6s` decay window)
  - `pullPulseCounter: number;` (counts pulses for Magnetic T4-A `奇点引力中枢` pull-back every 3rd pulse)
- **`EnemyRig` (`lines 170-184`)**:
  - `fluxRingGroup: THREE.Group;` (Layer 1 cyan-violet rotating diamond brackets for `[Flux-Marked]`)
  - `shredBadgeGroup: THREE.Group;` (Layer 1 amber broken-armor chevron beside HP bar)
  - `shieldDomeMesh?: THREE.Mesh | null;` (Layer 1 / `vfxScene`-compatible translucent shield for Track 1 shielded variants)
- **`EnemyInstance` (`lines 186-215`)**:
  - `laneIndex?: number;` (cross-track compatibility with Track 1 multi-lane pathing; defaults to `0`)
  - `fluxTimer: number;` (`[磁化标记]` remaining duration)
  - `armorShredStacks: number;` (`0..4`, `-8%` flat armor per stack)
  - `armorShredTimer: number;` (`4.0s` duration)
  - `vulnMultiplier: number;` (`1.0` base, `1.25` from Magnetic T4-B)
  - `vulnTimer: number;`
  - `stunTimer: number;` (hard immobilization from Skill 1 `轨道离子轰炸`)
  - `shieldHp: number;` & `maxShieldHp: number;` (stripped instantly by Skill 2 `EMP Overdrive` and shredded `2.5x` by Magnetic T4-B)
  - `comboIcdTimer: number;` (`0.08s` per-enemy guard preventing same-frame duplicate arc spam)
- **`UISnapshot` (`lines 222-276`)**:
  - `tacticalEnergy: number;` (`0..100`)
  - `maxTacticalEnergy: number;` (`100`)
  - `armedSkillId: TacticalSkillId | null;`
  - `tacticalSkills: [TacticalSkillSnapshot, TacticalSkillSnapshot, TacticalSkillSnapshot];`
  - `activeComboCount: number;`
  - `overdriveActiveTimer: number;` (`> 0` while station-wide Overdrive is active)
  - Inside `selectedTower`: add `branch: TowerBranch | null`, `branchName: string | null`, `overdriven: boolean`, `auraBoosted: boolean`, and `t4Branches: [T4BranchChoiceSnapshot, T4BranchChoiceSnapshot] | null` (non-null when `tier === 3`).
- **`EngineUICallbacks` (`src/game/GameEngine.ts:37-48`)**:
  - Add optional `onFloatingCallout?: (screenX: number, screenY: number, text: string, colorHex: string, comboCount?: number) => void;` (using `projectWorldToScreen` at `GameEngine.ts:1617-1625`!).

---

## 2. Active Commander Tactical Skills System (`3` Skills + `⚡` Energy + Desktop/Mobile Input)

### 2.1 Pointer & Raycasting Architecture (`src/game/GameEngine.ts:107-108`, `1453-1505`)

**Current Input Flow Observation**:
- `GameEngine.ts:108` defines `this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.15)`.
- `bindPointerInput()` (`lines 1453-1466`) records `downX, downY` on `pointerdown`, ignores `pointerup` if drag distance `> 14px` (`line 1463`), and calls `handleCanvasTap(ev.clientX, ev.clientY)` (`line 1464`).
- `handleCanvasTap` (`lines 1468-1505`) raycasts onto `this.groundPlane`, checks Victory Chest (`lines 1485-1491`), checks `BUILD_PADS` within `1.48m` (`lines 1494-1502`), and calls `selectPadOrTower(closestPad)` (`line 1504`).

**Clean Desktop + Mobile Touch Ground-Targeting State Machine**:
1. **Arming / Instant Trigger Public API**:
   - `public activateOrArmSkill(skillId: TacticalSkillId): boolean`
   - Validates `this.mode === 'playing'` (if `this.mode === 'opening'`, finishes intro cleanly just like `selectPadOrTower` at `lines 384-389`).
   - If `this.armedSkillId === skillId`: toggles off (`this.cancelTacticalAim()`, plays `playUiClick()`, returns `false`).
   - Checks cooldown (`this.skillCooldowns[skillId] <= 0`) and energy (`this.tacticalEnergy >= cfg.energyCost`). If insufficient energy, triggers `onInsufficientEnergy` toast (`⚡ 战术能量不足 · 还差 ${missing}`) + `audio.playInsufficientGold()`.
   - **Instant Skills (`emp_overdrive`, `nano_repair`)**: Deducts `cfg.energyCost`, sets `this.skillCooldowns[skillId] = cfg.cooldownSec * techCooldownMult`, cancels any armed reticle, executes immediately, calls `emitSnapshot()`, returns `true`.
   - **Ground-Targeted Skill (`orbital_strike`)**:
     - Calls `this.selectPadOrTower(null)` silently so `#build-tray` / `#tower-inspector` closes and frees vertical screen space on `580px` `<agent-embed>` and `360x800` mobile portrait!
     - Sets `this.armedSkillId = 'orbital_strike'`, plays `audio.playTacticalArm()`.
     - Snaps initial reticle coordinates `(aimX, aimZ)` to the furthest-progressed living enemy's `(worldPos.x, worldPos.z)` (or road midpoint `(0, 0)` if pre-wave), and calls `this.vfx.setTacticalReticle(true, aimX, aimZ, 3.2)` so mobile players immediately see the reticle on-screen!

2. **Unified Desktop Hover-Click + Mobile Tap/Drag-Release in `bindPointerInput()` (`lines 1453-1505`)**:
   - **Helper `raycastGround(clientX, clientY, outVec3): boolean`**: Uses `this.raycaster.setFromCamera(ndc, this.camera)` and `this.raycaster.ray.intersectPlane(this.groundPlane, outVec3)` (`lines 1469-1482`), clamping `x ∈ [-13.5, 13.0]`, `z ∈ [-8.0, 8.0]` (or current stage bounds from Track 1).
   - **`pointerdown` on `this.canvas`**:
     - Record `downX = ev.clientX`, `downY = ev.clientY`, `isDraggingAim = false`.
     - If `this.armedSkillId === 'orbital_strike'`, immediately raycast and move the 3D reticle to `(hit.x, hit.z)` so touch-down gives instant visual feedback under the finger!
   - **`pointermove` on `this.canvas` (NEW)**:
     - If `this.armedSkillId === 'orbital_strike'`:
       - On mouse (`ev.pointerType !== 'touch'`) OR active touch drag (`ev.buttons > 0 || ev.pointerType === 'touch'`): raycast `raycastGround(ev.clientX, ev.clientY, hit)` and update `this.vfx.setTacticalReticle(true, hit.x, hit.z, 3.2)`.
       - If `Math.hypot(ev.clientX - downX, ev.clientY - downY) > 14`, set `isDraggingAim = true`.
   - **`pointerup` on `this.canvas`**:
     - **Case 1 (`this.armedSkillId === 'orbital_strike'`)**: Even if `isDraggingAim === true` (player dragged finger on mobile to lead fast `swarm` drones!), raycast `(ev.clientX, ev.clientY)` -> if valid on canvas, call `this.commitOrbitalStrike(hit.x, hit.z)`, clear `this.armedSkillId = null`, hide reticle `this.vfx.setTacticalReticle(false)`, `this.emitSnapshot()`, and **`return;` BEFORE `handleCanvasTap` (`line 1493`)** so pads near the road are never accidentally selected!
     - **Case 2 (`this.armedSkillId === null`)**: Preserve exact existing `> 14px` drag rejection (`line 1463`) and call `this.handleCanvasTap(ev.clientX, ev.clientY)`.
   - **Cancel Hooks**: `window.addEventListener('keydown', ...)` (`Escape` cancels aim; `Digit1`/`Digit2`/`Digit3` trigger/arm skills 1/2/3; `Space` toggles pause), plus `canvas.addEventListener('contextmenu', (e) => { if (this.armedSkillId) { e.preventDefault(); this.cancelTacticalAim(); } })`.

### 2.2 Exact Specification of the 3 Skills

| Skill ID | Name | Targeting | Cost | Cooldown | Exact Simulation & Visual Behavior |
|---|---|---|---|---|---|
| `orbital_strike` | **轨道离子轰炸**<br>*(Orbital Ion Strike)* | Ground Reticle (`r = 3.2m`) | `45 ⚡` | `18.0s` | **`0.55s` Lock-On Telegraph** (`pendingOrbitalStrikes` ticked by `simDt` in `stepFrame` at `line 714`): converging cyan-gold target rings + `playOrbitalLockOn()`. At `0.55s`: sky-to-ground ion pillar (`r=0.42m, h=22m, life=0.38s`, opacity `0.84` non-bleaching) + crater shockwave (`0.5m→6.8m`) + `addCameraShake(0.34)` + `playOrbitalStrikeImpact()`. Deals **`260` Ion AoE Damage** (`armorPierce: 0.85`, `220` cap vs Boss), applies **`3` stacks `[破甲裂隙]` (`-24%` armor for `6s`)**, and **Stuns for `1.6s`** (`0.65s` vs Boss, interrupting Boss `skillTelegraphTimer`!). |
| `emp_overdrive` | **全域电磁超载**<br>*(EMP & Mech Overdrive)* | Instant (Station-wide) | `40 ⚡` | `20.0s` | **Friendly Towers**: Clears all `tw.stunTimer = 0` immediately (direct counter to Boss `5.2m` ground-slam stun at `GameEngine.ts:960-965`!), sets `tw.overdriveTimer = 6.0` (**`+45%` fire rate**: `effectiveInterval = baseInterval / 1.45`), opens hinged radiator flaps, spawns golden-cyan base halo.<br>**Hostile Enemies**: Expanding station-wide EMP ring (`vfxScene`), **strips `100%` of `e.shieldHp`** (with `spawnShieldBreak`), applies **`[Flux-Marked]` (`e.fluxTimer = 5.5s`)** + `35%` slow (`2.0s`) to all living enemies! |
| `nano_repair` | **纳米信标急修**<br>*(Beacon Nano-Matrix)* | Instant (Return Beacon) | `35 ⚡` | `24.0s` | Restores **`+4` Beacon HP** (`Math.min(maxBeaconHp, beaconHp + 4)` — can rescue 3-star `>= 18 HP` threshold at `line 1563`!) AND drops celebratory emergency supply **`+75G`** (`this.gold += 75`)! Spawns rising emerald-cyan hexagonal repair rings around `env.beacon.group.position` + fountains **`6` real 3D Gold Coins** via `vfx.spawn3DLoot` (`line 1335`) + `playNanoBeaconRepair()`. |

### 2.3 Tactical Energy (`⚡`) Economy & Anti-Exploit Pacing

```ts
export const TACTICAL_ENERGY_CONFIG = {
  INITIAL_ENERGY: 50,
  MAX_ENERGY: 100,
  PASSIVE_REGEN_IN_WAVE_PER_SEC: 1.6, // Strictly 0 when !waveInProgress (prevents inter-wave AFK gold farming!)
  WAVE_CLEAR_BONUS: 12,
  BOSS_PLATE_BREAK_BONUS: 15,         // Triggered at 75% / 50% / 25% Boss HP (GameEngine.ts:1248)
  CRYSTAL_VEIN_HARVEST_BONUS: 15,     // Cross-track hook for Track 1 interactive Crystal Ore Veins
  KILL_ENERGY: {
    swarm: 1.5,
    rover: 2.0,
    drill: 4.0,
    elite_drill: 12.0,
    boss_crawler: 25.0,
  } as Record<string, number>,        // Default fallback 2.5 for new Track 1 enemy types
} as const;
```

- **8-Wave Energy Budget Verification**:
  - Starting `50 ⚡` + Passive during combat (`~175s × 1.6 = 280 ⚡`) + Kills (`~250 ⚡`) + 3 Boss armor plates (`45 ⚡`) + 7 Wave Clear transitions (`84 ⚡`) = **`~709 ⚡` total** across 8 waves.
  - Yields **`16–18` active skill casts per 8-wave mission** (~`2` casts per wave!).
  - **Anti-Exploit Guarantee**: Because `PASSIVE_REGEN` only ticks when `this.waveInProgress === true` (inside `stepFrame` at `line 712`), idling between waves generates `0 ⚡`, making infinite `+75G` farming via `nano_repair` mathematically impossible.

---

## 3. Cross-Tower Mechanical/Elemental Combo System (`三塔协同连携`)

### 3.1 The 3-Tower Synergy Triangle

```
        [3. 磁场约束塔 Magnetic]
         Applies non-stacking Slow
       + [磁化标记 Flux-Marked] (3.3s–4.4s)
             /                    \
            ▼                      ▼
[2. 脉冲迫击炮 Mortar]        [1. 联装机炮 Autocannon]
Hits [Flux-Marked] target:    Hits Armored / [Flux-Marked] / Boss Core:
⚡ 磁暴共振 (Flux Detonation)  • Stacking [破甲裂隙 Armor Shred] (-8%×3 = -24%)
• +35% AoE Resonance Shock     • 🎯 弱点暴击 (1.35x–1.55x Crit vs Flux/Boss Core)
• Chains 28% electric arc        Amplifies ALL physical & Mortar splash damage!
  to 2 nearby enemies (3.4m)
```

### 3.2 Exact Hook Locations in `src/game/GameEngine.ts`

1. **Debuff Tick & Visual Sync in `updateEnemies(dt)` (`GameEngine.ts:910-921`)**:
   - Right beside `e.slowTimer` (`lines 911-920`), tick:
     - `e.stunTimer`: if `> 0`, decrement by `dt`; while `stunTimer > 0`, `effSpeed = 0` (`line 982`).
     - `e.fluxTimer`: if `> 0`, decrement by `dt`, set `e.rig.fluxRingGroup.visible = true`, rotate `e.rig.fluxRingGroup.rotation.y -= dt * 4.2`; when `<= 0`, hide `fluxRingGroup`.
     - `e.armorShredTimer`: if `> 0`, decrement by `dt`, set `e.rig.shredBadgeGroup.visible = e.armorShredStacks > 0`; when `<= 0`, reset `e.armorShredStacks = 0` and hide `shredBadgeGroup`.
     - `e.vulnTimer`: if `> 0`, decrement by `dt`; when `<= 0`, reset `e.vulnMultiplier = 1.0`.
     - `e.comboIcdTimer`: `Math.max(0, e.comboIcdTimer - dt)`.

2. **Primer Hook in `fireMagneticTower(tower)` (`GameEngine.ts:1189-1209`)**:
   - Inside the range loop (`lines 1199-1207`), preserve non-stacking slow (`e.slowRatio = Math.max(e.slowRatio, effectiveSlow)`), and apply:
     ```ts
     const fluxDur = stats.slowDuration + 0.85; // 3.35s (T1) -> 4.35s (T4)
     e.fluxTimer = Math.max(e.fluxTimer, fluxDur);
     e.rig.fluxRingGroup.visible = true;
     ```

3. **Detonator Hook in `fireMortar(tower, target)` (`GameEngine.ts:1174-1185`)**:
   - Inside `launchMortarShell` `onImpact(ix, iz)` callback (`line 1174`):
     - Track `let detonationsThisShell = 0;` (cap at `2` per shell for crisp visual readability and zero frame-time spikes).
     - When hitting enemy `e` inside `splashRadius`:
       ```ts
       if (e.fluxTimer > 0 && e.comboIcdTimer <= 0 && detonationsThisShell < 2) {
         detonationsThisShell++;
         // Consume 1.25s of Flux (instead of wiping to 0) so Mortar T4-B's 3-rocket staggered salvo
         // (0.00s, 0.11s, 0.22s) naturally multi-detonates 3x on a 3.8s Flux-Marked target!
         e.fluxTimer = Math.max(0, e.fluxTimer - 1.25);
         e.comboIcdTimer = 0.08;
         if (e.fluxTimer <= 0) e.rig.fluxRingGroup.visible = false;

         this.triggerFluxDetonation(e, stats.damage, tower);
       }
       ```
   - **`triggerFluxDetonation(primaryEnemy, baseMortarDamage, mortarTower)`**:
     - Bonus resonance shockwave around `primaryEnemy.worldPos` (`radius = 2.2m`): deals `Math.round(baseMortarDamage * 0.35)` (`armorPierce: 0.75`) to enemies in `2.2m`.
     - Finds up to `2` nearest living other enemies within `3.4m` of `primaryEnemy.worldPos`; deals `Math.round(baseMortarDamage * 0.28)` (`armorPierce: 0.80`) to each.
     - Calls `this.vfx.spawnFluxDetonation(primaryEnemy.worldPos, chainPositions)`, `this.audio.playFluxDetonation()`, increments `this.comboCount++` (`comboResetTimer = 4.5s`), and emits throttled callout `⚡ 磁暴共振!`.

4. **Shred & Weak-Point Crit Hook in `fireAutocannon(tower, target)` (`GameEngine.ts:1123-1144`)**:
   - **Stacking `[破甲裂隙 Armor Shred]`**:
     - If `target.armor > 0`:
       ```ts
       const maxShredStacks = tower.tier === 4 && tower.branch === 'A' ? 4 : 3; // -32% on T4-A Vulcan, -24% standard
       target.armorShredStacks = Math.min(maxShredStacks, target.armorShredStacks + 1);
       target.armorShredTimer = 4.0;
       target.rig.shredBadgeGroup.visible = true;
       ```
   - **`🎯 弱点暴击 (Weak-Point Crit)`**:
     - Determine crit eligibility:
       - `const isRailgunT4B = tower.tier === 4 && tower.branch === 'B';`
       - `const bossCoreExposed = target.isBoss && (target.armorLayersRemaining < 3 || target.skillTelegraphTimer > 0 || target.fluxTimer > 0);`
       - `const fluxCrit = target.fluxTimer > 0 && (isRailgunT4B || tower.shotToggle % 3 === 0);`
       - `const bossCoreCrit = bossCoreExposed && (isRailgunT4B || tower.shotToggle % 2 === 0);`
     - If `fluxCrit || bossCoreCrit`:
       - Aim `hitPos` directly at `target.rig.weakPointCore.getWorldPosition(tmpVec)` when `target.rig.weakPointCore` exists (`EnemyFactory.ts:248`)!
       - Apply crit multiplier: `1.55x` for `T4-B 双联电磁轨炮`, `1.40x` for Boss exposed `weakPointCore`, `1.35x` for `[Flux-Marked]` regular targets.
       - Spawn `this.vfx.spawnWeakPointCrit(hitPos)`, play `this.audio.playWeakPointCrit()`, emit throttled callout `🎯 弱点暴击!`.

5. **Unified Damage Pipeline in `applyDamageToEnemy` (`GameEngine.ts:1211-1238`)**:
   ```ts
   // 1. Absorb into Enemy Energy Shield first (if shielded variant from Track 1):
   if (enemy.shieldHp > 0) {
     const shieldMult = options?.shieldBreakerMult ?? 1.0; // 2.5x from Magnetic T4-B!
     const shieldDmg = Math.round(rawDamage * shieldMult);
     if (shieldDmg >= enemy.shieldHp) {
       const overflowRatio = (shieldDmg - enemy.shieldHp) / Math.max(1, shieldDmg);
       enemy.shieldHp = 0;
       if (enemy.rig.shieldDomeMesh) enemy.rig.shieldDomeMesh.visible = false;
       this.vfx.spawnShieldBreak(enemy.worldPos);
       this.audio.playShieldBreak();
       rawDamage = Math.round(rawDamage * overflowRatio);
     } else {
       enemy.shieldHp -= shieldDmg;
       this.vfx.spawnHitSparks(enemy.worldPos.clone().setY(0.7), false);
       return;
     }
   }

   // 2. Apply Armor Shred (-8% flat armor per stack) + Armor Pierce + Vulnerability Aura!
   const shreddedArmor = Math.max(0, enemy.armor - enemy.armorShredStacks * 0.08);
   const effectiveArmor = Math.max(0, shreddedArmor * (1 - armorPierce));
   const vulnMult = enemy.vulnTimer > 0 ? enemy.vulnMultiplier : 1.0;
   const finalDamage = Math.max(2, Math.round(rawDamage * (1 - effectiveArmor) * vulnMult));
   ```

---

## 4. T3 → T4 Dual Specialization Branches (`6` Legendary Mechs!)

### 4.1 Critical Spatial Discovery on `BUILD_PADS` (`src/config/gameConfig.ts:205-216`)
Inspecting the exact pad coordinates in `gameConfig.ts:205-216`:
- `pad_09 (6.4, 5.4)` ↔ `pad_10 (10.2, 5.4)` = **`3.80m`**
- `pad_06 (3.1, -0.4)` ↔ `pad_07 (3.1, -6.4)` = **`6.00m`**
- `pad_06 (3.1, -0.4)` ↔ `pad_08 (9.3, -0.8)` = **`6.21m`**
- `pad_03 (-3.5, 0.4)` ↔ `pad_02 (-4.0, -5.8)` = **`6.22m`**
- `pad_08 (9.3, -0.8)` ↔ `pad_10 (10.2, 5.4)` = **`6.26m`**
- `pad_03 (-3.5, 0.4)` ↔ `pad_01 (-9.8, -0.2)` = **`6.33m`**
- `pad_05 (-0.2, 6.4)` ↔ `pad_04 (-6.8, 6.4)` = **`6.60m`**
- `pad_03 (-3.5, 0.4)` ↔ `pad_06 (3.1, -0.4)` = **`6.65m`**
- `pad_06 (3.1, -0.4)` ↔ `pad_09 (6.4, 5.4)` = **`6.67m`**

> **Architectural Consequence**: Neighboring build pads on the Lunar Station are **`3.80m–6.68m`** apart! Therefore, Magnetic **T4-B `高压电弧矩阵`**'s `+15%` adjacent tower haste aura MUST use **`AURA_RADIUS = 7.0m`** (NOT `4.0–5.0m`), which cleanly links `2–4` immediate neighbor pads while never reaching across the `24m` station!

### 4.2 Complete Specification of the `6` Legendary Specializations

| Archetype | Branch ID & Name | Cost | Core Stats (`Dmg / Interval / Range / Pierce`) | 3D Toy-Mech Geometry (`TowerFactory.ts`, Cream `#F3EFE6` + `#1A1033` Outline + Gold `#F59E0B` Trim) | Unique Combat Mechanic (`GameEngine.ts`) |
|---|---|---|---|---|---|
| **联装机炮**<br>`autocannon` | **T4-A**<br>**`暴风火神机甲`**<br>*(Tempest Vulcan)* | `240G` | `54` dmg<br>`0.17s` (`5.9/s`)<br>`6.6m` range<br>`34%` pierce | Heavy beveled cream pauldrons + hinged hazard vents, horned gold-trimmed brow visor, rear spur gear (`lines 382-427`), **PLUS twin 3-barrel rotary Gatling clusters** (`CylinderGeometry` × 3 + gold barrel clamp ring) spinning on `barrelL`/`barrelR`. | **Ramping Gatling Haste + Max Shred**: Each shot adds `+1` `spinUpStacks` (max `12` = **`+42%` fire rate** → `8.33/s`, decays after `1.6s` idle). Raises `[破甲裂隙]` cap to **`4` stacks (`-32%` armor)**! |
| **联装机炮**<br>`autocannon` | **T4-B**<br>**`双联电磁轨炮`**<br>*(Twin Gauss Rail)* | `255G` | `158` dmg<br>`0.62s` (`1.6/s`)<br>**`8.6m` range**<br>**`68%` pierce** | Angular-beveled cream sniper visor cowl + dual optic pods, **elongated `+0.52m` twin parallel Gauss rail blades** with 3 glowing `#38BDF8`/`#FF9F1C` induction coils & real air-gap slot, plus twin dorsal capacitor fins (`hingedFlaps` flaring on fire). | **Guaranteed Weak-Point Rail Crit + Pierce**: Always triggers **`1.55x` `🎯 弱点暴击` (`245` raw dmg)** vs `[Flux-Marked]`, Elites, or Bosses! Slug pierces `1` secondary enemy within `0.65m` of beam line (`65%` dmg). |
| **脉冲迫击炮**<br>`mortar` | **T4-A**<br>**`天穹聚变巨炮`**<br>*(Firmament Fusion)* | `290G` | `210` dmg<br>`1.32s` (`0.76/s`)<br>`8.2m` range<br>`3.25m` splash<br>`74%` pierce | Wide cream siege crown arch, hinged rear fusion bay doors, elevation spur gear (`lines 614-644`), **PLUS oversized fusion muzzle shroud & 3 cyan-gold plasma containment toroids** around `mortarTube`. | **Lingering 3s Plasma Burn Zone**: Impact leaves a `3.0s` `3.0m`-radius plasma hazard ring on road (`opacity <= 0.42` in `vfxScene`), dealing **`38` True Plasma DPS** (`19` dmg / `0.5s`, `70%` pierce) to enemies inside! |
| **脉冲迫击炮**<br>`mortar` | **T4-B**<br>**`集束火箭弹巢`**<br>*(Cluster Rocket Pod)* | `285G` | `86 × 3` (`258`)<br>`1.38s` salvo<br>`8.0m` range<br>`2.15m` splash<br>`58%` pierce | **Twin shoulder-mounted 6-cell beveled cream MLRS rocket pods** (`RoundedBoxGeometry` pods + dark recessed launch tubes + coral-amber `#FB923C` warhead tips + hinged top reload hatches) + central radar dome; hides single `mortarTube` at T4-B! | **3-Rocket Staggered Salvo Multi-Combo**: Launches `3` rockets spaced by `0.11s` (`pendingRocketSalvos` ticked by `simDt`) spreading `[0, -0.65m, +0.65m]` along road. Each rocket independently detonates `⚡ 磁暴共振` (`-1.25s` Flux)! |
| **磁场约束塔**<br>`magnetic` | **T4-A**<br>**`奇点引力中枢`**<br>*(Singularity Core)* | `245G` | `68` dmg<br>`0.95s` (`1.05/s`)<br>`6.7m` range<br>**`60%` slow** (`3.6s`)<br>`62%` pierce | Spire crown halo with 4 hinged golden petals + lower drive gear (`lines 798-826`), **PLUS dark-violet singularity sphere & 3-axis golden gyroscope rings** inside `weaponPitch`. | **Periodic Gravitational Pull-Back**: `60%` slow + every **`3rd` pulse** (~`2.85s`) pulls enemies in range backward along their lane (`-1.35m` light, `-0.75m` heavy drill, `-0.22m` Boss), clustering waves into a tight ball! |
| **磁场约束塔**<br>`magnetic` | **T4-B**<br>**`高压电弧矩阵`**<br>*(Tesla Arc Matrix)* | `250G` | `82` dmg<br>`0.86s` (`1.16/s`)<br>`6.5m` range<br>`45%` slow (`3.0s`)<br>`70%` pierce | **3 tall cream-and-gold Tesla transformer spires** (`y = 1.85`) with `#38BDF8` ceramic insulator discs, brass corona spheres, and top triangular conductor halo + hinged arc capacitor flaps. | **Shield-Breaker Chain + Dual Aura**: Bounces lightning across `5` targets (**`2.5x` dmg to Shields**), applies **`+25%` Vulnerability (`2.6s`)** to hit enemies, AND grants **`+15%` Fire Rate Aura** to friendly towers within **`7.0m`**! |

### 4.3 `TowerFactory.ts` & `CinematicDirector.ts` Integration (`Stage 2C` Preservation)
1. **`TowerFactory.ts` (`lines 169, 382-427, 614-644, 798-826, 860-903`)**:
   - Create both `const t4ATurret = new THREE.Group()` and `const t4BTurret = new THREE.Group()` inside `turretYaw`, tagging every sub-module in both groups with `tagArcFlyPart(part, ox, oy, oz)` (`lines 57-61`) and registering flaps with `branchTag: 'A' | 'B'` in `flap.userData`.
   - Update `setTowerTierVisibility(rig, tier, branch: TowerBranch = 'A')` (`lines 860-869`):
     - `rig.tierGroups.t4A.visible = tier === 4 && branch === 'A';`
     - `rig.tierGroups.t4B.visible = tier === 4 && branch === 'B';`
     - For Mortar `T4-B` (`集束火箭弹巢`): set `rig.mortarTube.visible = !(tier === 4 && branch === 'B')` so the twin 6-cell MLRS rocket pods cleanly replace the single mortar tube without geometry intersection, while `muzzlePoints` switches to pod left/right launch points!
     - For Autocannon `T4-A` vs `T4-B`: toggle `branchBarrelOverlayA` (tri-barrel Gatling cluster on `barrelL`/`barrelR`) vs `branchBarrelOverlayB` (`+0.52m` Gauss rail extensions on `barrelL`/`barrelR`).
   - Update `getTierPartObjects(rig, tier, branch: TowerBranch = 'A')` (`lines 895-903`):
     - When `tier === 4`, return `[...(branch === 'B' ? rig.tierGroups.t4B : rig.tierGroups.t4A).children]`.
2. **`CinematicDirector.playLegendaryUpgradeReveal` (`src/game/CinematicDirector.ts:292-463`)**:
   - At `lines 300-303`, pass `tower.branch ?? 'A'` into `getTierPartObjects(rig, 4, branch)` and `applyTowerTierVisuals(rig, 4, { branch })`.
   - At `line 411`, look up `const branchMeta = bp.branches[tower.branch ?? 'A'];` and stamp `` `传说·${branchMeta.branchName}` `` with `goldMeta.hex` (`#F59E0B`), pausing combat simulation (`mode = 'legendary_reveal'`), lighting `heroLight` + `legendaryBackdrop`, flying in the branch's exact 3D modules along parabolic arcs, flexing only active branch `hingedFlaps` (`flap.visible` check at `line 421`), and returning smoothly to battle camera!
3. **`GameEngine.upgradeSelectedTower(branch?: TowerBranch)` (`src/game/GameEngine.ts:492-555`)**:
   - Defaults `const chosenBranch: TowerBranch = branch ?? 'A';` when `nextTier === 4`.
   - Uses `const nextStats = nextTier === 4 ? bp.branches[chosenBranch] : bp.tiers[nextTier - 1];`.
   - Computes `StatDeltaPopup[]` (`lines 512-531`) plus a special branch chip `{ label: '专精', deltaText: nextStats.branchTagline }` on T4!
   - Also replace the two `setTimeout` flap resets in `fireMortar` (`lines 1155-1157`) and banner hides (`lines 622-624`, `1350-1352`) or keep flap animations driven by `simDt` so pausing mid-shot never mutates transforms asynchronously.

---

## 5. 3D VFX Extensions (`src/fx/VfxManager.ts`) & Outline Safety

### 5.1 Outline Exclusion Guarantee (`src/render/ToonOutlineComposer.ts:512-550`)
- Pass 1–3 (`lines 513-539`) compute `#1A1033` Normal+Depth outlines **strictly on `solidScene` Layer `0`**.
- Pass 4 (`lines 540-548`) renders `solidScene` Layer `1` (`camera.layers.set(1)`) followed by `vfxScene` (`camera.layers.set(0)`) **after** the outline pass, before Pass 5 ACESFilmic resolve.
- **Rule**: Every new reticle, ground zone, lightning polyline, overdrive halo, Flux bracket, and Armor Shred badge MUST be added to `vfxScene` OR `solidScene` Layer `1` (`setLayerRecursive(obj, 1)`), with `depthWrite: false` and restrained opacity (`<= 0.85` for transient flashes, `<= 0.42` for persistent 3s plasma zones) so `ORIGINAL_REQUEST.md:20-21, 100` (*"特效不能长期遮挡敌人、道路和操作；避免频繁整屏过曝；透明特效不受描边污染"*) is 100% preserved!
- **Memory Disposal Rule (`VfxManager.ts:638-641`)**: Never call `.geometry.dispose()` on `THREE.Sprite` or shared geometries (`this.sparkGeo`), and never dispose shared `getToonTextures()` maps!

### 5.2 Exact New Methods in `VfxManager.ts`
1. `setTacticalReticle(visible: boolean, x?: number, z?: number, radius?: number)`: Persistent reusable `THREE.Group` in `vfxScene` (`y = 0.085`) with outer `RingGeometry(0.95, 1.0, 48)` scaled by `radius`, inner rotating crosshair ring (`#38BDF8` + `#FBBF24`), rotated smoothly in `update(dt, realDt)`.
2. `spawnOrbitalLockOn(x: number, z: number, radius: number, duration = 0.55)`: Shrinking target ring (`radius * 2.1 -> radius * 0.35` over `0.55s`) + 4 converging tick planes.
3. `spawnOrbitalIonBeam(x: number, z: number, radius: number)`: Dual-layer cylinder (`inner white-cyan r=0.26m`, `outer #38BDF8 r=0.58m`, `h=20m`, `maxLife=0.38s`) + `spawnGroundRing` (`#38BDF8` & `#FBBF24`, `endScale = radius * 2.15`) + `spawnLunarDustRing`.
4. `spawnStationEmpWave(origin: THREE.Vector3)`: Wide fast ring (`0.8m -> 28m` over `0.62s`, `#38BDF8` + `#C084FC`, `opacity: 0.55` max so zero screen whiteout!).
5. `spawnBeaconNanoRepair(beaconPos: THREE.Vector3)`: 3 staggered rising emerald-cyan (`#34D399` + `#38BDF8`) horizontal rings (`y: 0.3 -> 2.4` over `0.65s`) + 14 upward repair sparks.
6. `spawnFluxDetonation(center: THREE.Vector3, chainTargets: THREE.Vector3[])`: Snappy `#22D3EE` + `#C084FC` ground ring (`0.4 -> 4.4m`, `0.28s`) + 3-segment jagged `THREE.Line` / thin `CylinderGeometry` lightning bolts jumping from `center` (`y=0.6`) to each target in `chainTargets` (`maxLife = 0.16s`).
7. `spawnWeakPointCrit(pos: THREE.Vector3)`: Crisp `#FDE047` 2-crossed diamond burst (`scale 0.55`, `maxLife 0.14s`) + 6 fast gold sparks.
8. `spawnRailgunSlug(from: THREE.Vector3, to: THREE.Vector3)`: Full-distance instant `#38BDF8` core beam + `#FBBF24` muzzle shock-ring (`maxLife = 0.14s`).
9. `launchClusterRocket(from: THREE.Vector3, tx: number, tz: number, splashRadius: number, onImpact)`: Reuses `mortarShells` pool (`VfxManager.ts:168-177`, `526-541`) with a sleeker `#FB923C` / `#F3EFE6` 3D mini-missile mesh (`ConeGeometry` + `CylinderGeometry` + cyan tail glow) and `duration = 0.36s`!
10. `spawnPlasmaBurnZone(x: number, z: number, radius: number, duration = 3.0)`: Pulsing `#06B6D4` ground ring-decal in `vfxScene` (`opacity: 0.36`, outer crisp border + sparse rising cyan embers) ticked by `dt` (pauses cleanly when game pauses!).
11. `spawnSingularityPull(center: THREE.Vector3, range: number)`: Reverse `ExpandingRing` (`startScale = range * 1.9 -> endScale = 0.35` over `0.38s`, `#A855F7`) + 10 inward suction particles (`inwardTarget = center`, reusing `sparks` logic at `VfxManager.ts:570-571`!).
12. `spawnTeslaChainArc(origin: THREE.Vector3, targets: THREE.Vector3[])` & `spawnShieldBreak(pos: THREE.Vector3)`: Multi-hop `#38BDF8` electric chain + 8 cyan-glass shard sparks when a shield shatters.

---

## 6. Procedural WebAudio Synthesizer Additions (`src/audio/AudioManager.ts`)

All new SFX route through the existing `masterGain` (`0.42`) → `DynamicsCompressorNode` (`threshold: -16dB, ratio: 6` at `AudioManager.ts:43-49`) and respect `this.muted` + `canPlayRateLimited`:

```ts
// Add cached 0.4s noise buffer in AudioManager (initialized lazily in unlock() at line 50)
private noiseBuffer: AudioBuffer | null = null;

private noiseBurst(
  duration: number,
  filterFreqStart: number,
  filterFreqEnd: number,
  filterType: BiquadFilterType,
  volume: number,
  delay = 0
): void {
  if (this.muted || !this.ctx || !this.masterGain || !this.noiseBuffer) return;
  const t0 = this.ctx.currentTime + delay;
  const src = this.ctx.createBufferSource();
  src.buffer = this.noiseBuffer;
  const filter = this.ctx.createBiquadFilter();
  filter.type = filterType;
  filter.frequency.setValueAtTime(filterFreqStart, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterFreqEnd), t0 + duration);
  const gain = this.ctx.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  src.connect(filter);
  filter.connect(gain);
  gain.connect(this.masterGain);
  src.start(t0);
  src.stop(t0 + duration + 0.02);
}

// 1. Tactical Aim & Skills
public playTacticalArm(): void {
  this.unlock();
  this.tone(540, 820, 0.06, 'triangle', 0.16);
  this.tone(1080, 1320, 0.05, 'sine', 0.12, 0.04);
}
public playOrbitalLockOn(): void {
  this.unlock();
  this.tone(420, 1280, 0.52, 'sine', 0.15, 0);
  [0, 0.17, 0.34].forEach((d, i) => this.tone(920 + i * 240, 960 + i * 240, 0.06, 'square', 0.12, d));
}
public playOrbitalStrikeImpact(): void {
  this.unlock();
  this.tone(195, 28, 0.54, 'sawtooth', 0.38);
  this.tone(92, 26, 0.58, 'triangle', 0.36);
  this.tone(1680, 280, 0.18, 'sine', 0.22);
  this.noiseBurst(0.42, 1600, 180, 'bandpass', 0.26);
}
public playEmpOverdrive(): void {
  this.unlock();
  this.tone(110, 840, 0.28, 'sine', 0.22);
  this.tone(1480, 220, 0.16, 'sawtooth', 0.18, 0.04);
  [523.25, 659.25, 783.99, 1046.5].forEach((n, i) =>
    this.tone(n, n * 1.02, 0.32, 'triangle', 0.18, 0.08 + i * 0.045)
  );
}
public playNanoBeaconRepair(): void {
  this.unlock();
  [392, 493.88, 587.33, 783.99, 1046.5].forEach((n, i) =>
    this.tone(n, n * 1.01, 0.36, 'sine', 0.18, i * 0.055)
  );
}

// 2. Combos & T4 Branch Weapons
public playFluxDetonation(): void {
  if (!this.canPlayRateLimited('flux', 85)) return;
  this.tone(960, 175, 0.15, 'sawtooth', 0.22);
  this.tone(1420, 580, 0.11, 'square', 0.13, 0.02);
}
public playWeakPointCrit(): void {
  if (!this.canPlayRateLimited('crit', 130)) return;
  this.tone(1440, 2160, 0.075, 'triangle', 0.18);
  this.tone(720, 320, 0.06, 'square', 0.11);
}
public playRailgunShot(): void {
  if (!this.canPlayRateLimited('rail', 150)) return;
  this.tone(1650, 180, 0.14, 'sawtooth', 0.24);
  this.tone(105, 38, 0.18, 'triangle', 0.26);
}
public playClusterRocketLaunch(): void {
  if (!this.canPlayRateLimited('rkt', 68)) return;
  this.tone(260, 520, 0.085, 'triangle', 0.18);
  this.noiseBurst(0.11, 2200, 900, 'highpass', 0.14);
}
public playSingularityPull(): void {
  if (!this.canPlayRateLimited('grav', 320)) return;
  this.tone(310, 62, 0.34, 'sine', 0.24);
  this.tone(155, 44, 0.34, 'triangle', 0.2, 0.03);
}
public playTeslaArc(): void {
  if (!this.canPlayRateLimited('tesla', 90)) return;
  this.tone(1580, 420, 0.085, 'square', 0.13);
  this.tone(880, 1320, 0.07, 'sine', 0.12);
}
public playShieldBreak(): void {
  if (!this.canPlayRateLimited('shbrk', 120)) return;
  this.tone(1780, 290, 0.18, 'sawtooth', 0.2);
  this.tone(1180, 460, 0.14, 'triangle', 0.16, 0.03);
}
```

---

## 7. Economy & DPS Balance Model (Anti-AFK Proof + Synergy Payoff)

### 7.1 T1–T4 Cost & Effective DPS Comparison Table

| Tower & Tier / Branch | Build / Upgrade Cost | Cumulative Gold | Raw Base DPS | Effective DPS vs `drill` (`42%` Armor, Solo) | Effective DPS vs `drill` **WITH Full 3-Tower Synergy** (`-24%` Shred + `Flux` + `Overdrive`/`Aura`) |
|---|---|---|---|---|---|
| **Autocannon T1→T3** | `90 → +110 → +165` | `365G` | `47 → 90 → 171` | `28 → 57 → 115` | `156` (T3 w/ `-24%` shred + `1.35x` Flux every 3rd) |
| **Autocannon T4-A `暴风火神`** | `+240G` | `605G` | `318` (`451` spun-up!) | `258` (`367` spun-up) | **`420–560` Single-Target Shredder** (`-32%` shred + `8.33/s`!) |
| **Autocannon T4-B `电磁轨炮`** | `+255G` | `620G` | `255` (`+65%` 2nd pierce) | `223` | **`385` Primary + `250` Pierce** (`1.55x` guaranteed Flux/Boss crit!) |
| **Mortar T1→T3** | `120 → +140 → +200` | `460G` | `26 → 48 → 86` (× AoE) | `20 → 37 → 65` (× AoE) | `128` per target + `⚡ 磁暴共振` (`+43` shock + `2×34` chains!) |
| **Mortar T4-A `天穹聚变`** | `+290G` | `750G` | `159` + `38` Burn DPS | `142` + `33` Burn (× AoE) | **`265+` per clustered enemy** (`60%` slow keeps wave in `3s` plasma!) |
| **Mortar T4-B `集束火箭`** | `+285G` | `745G` | `187` (`3×86` / `1.38s`) | `143` (× 3-splash) | **`310+` Combo Detonator** (triple `⚡ 磁暴共振` per salvo!) |
| **Magnetic T1→T3** | `100 → +115 → +165` | `380G` | `10 → 20 → 35` (All-in-range) | `7 → 15 → 27` | Primers `3.3–4.1s` `[Flux-Marked]` + `32–50%` Slow across entire bend! |
| **Magnetic T4-A `奇点引力`** | `+245G` | `625G` | `72` (All-in-range) | `58` (All-in-range) | **`60%` Slow + `-1.35m` Pull-Back every `2.85s`** → doubles Mortar AoE hits! |
| **Magnetic T4-B `高压电弧`** | `+250G` | `630G` | `95` (5-target chain, `2.5x` vs Shield) | `83` (5-target) | **Strips Shields + `+25%` Vuln on 5 enemies + `+15%` Haste to `2–4` neighbor towers!** |

### 7.2 Why Single-Tower AFK Still Loses & Mixed Synergy Wins (`ORIGINAL_REQUEST.md:79`)
1. **Gold Budget Pacing (Stage 1, 8 Waves)**:
   - Total Gold across 8 waves = `260` initial + `~1,587` kills + `600` (Waves 1–7 clear bonuses) = **`~2,447G`** entering Wave 8 (plus up to `150–225G` if player spends Tactical Energy on `nano_repair` instead of `orbital_strike`).
   - Enough to field **1–2 T4 Legendary Specialization Mechs** (`605–750G` each) supported by **3–4 T2/T3 Synergy Towers** (`200–460G` each), forcing meaningful choices between `T4-A` vs `T4-B` depending on stage mechanics!
2. **Enemy Scaling Tuning for Waves 4–8 (`src/config/gameConfig.ts:457-486`)**:
   - Keep Waves 1–3 (`rover: 92 HP`, `swarm: 52 HP`, `drill: 285 HP`) unchanged so onboarding is smooth.
   - Tune `elite_drill.maxHp`: `1180 → 1350` (`armor: 0.48`) and `boss_crawler.maxHp`: `5200 → 6400` (`armor: 0.45`), and in Waves 6–8 add `1–2` extra `drill` / `swarm` escorts:
     - **Single-Archetype AFK Test**:
       - *Autocannon-only AFK*: Zero splash & zero slow → Wave 6–7 `14–16` `swarm` (`3.75 m/s`) sprint past while Autocannons shoot `42%`-armored `drill` tanks → Beacon leaks `20` HP.
       - *Mortar-only AFK*: `1.25–1.75s` reload + `0.5s` shell flight → un-slowed `3.75 m/s` `swarm` outrun shells & exit `T4-A` plasma zones in `0.8s` (`< 35` dmg vs `52` HP) → Beacon leaks `20` HP.
       - *Magnetic-only AFK*: Insufficient single-target DPS vs `6,400 HP` Boss (`0.88 m/s` × `55%` slow resistance = reaches Beacon in `~62s` requiring `> 103` post-armor Boss DPS, whereas 3 Magnetic towers deal `< 45` Boss DPS).
     - **Mixed Synergy + Active Skills**: Combining Magnetic (`Flux` + Slow/Pull/Vuln) + Mortar (`⚡ 磁暴共振` / Plasma / Cluster Rockets) + Autocannon (`-24%~-32%` Shred + `🎯 弱点暴击`) + `EMP Overdrive` (cleansing Boss slam stuns!) melts Wave 8 Boss with thrilling visual & audio feedback!

---

## 8. Cross-Track Integration Contracts (Tracks 1 & 3 Alignment)

1. **With Track 1 (Multi-Stage Maps, Multi-Lane Pathing & Stage Mechanisms)**:
   - `Magnetic T4-A` pull-back (`e.distanceTraveled = Math.max(0, e.distanceTraveled - pullDist)`) and `Mortar` target leading (`GameEngine.ts:1165-1166`) MUST sample `this.sampleEnemyLane(e.laneIndex ?? 0, dist)` rather than hardcoded module-level `sampleRoadAtDistance` / `TOTAL_ROAD_LENGTH`, ensuring 100% compatibility with dual-lane Stage 2/3/4 maps!
   - `GameEngine.addTacticalEnergy(amount: number)` exposes a clean hook for Track 1's interactive **Crystal Ore Veins** (`+15 ⚡`).
   - `EnemyInstance.shieldHp` / `maxShieldHp` integrates Track 1's **Shielded Mining Drones/Drills** directly with Track 2's `EMP Overdrive` (instant shield strip) and `Magnetic T4-B` (`2.5x` shield breaker).
   - High-Ground Boost Pads (`pad.rangeMult`, `pad.damageMult`) multiply cleanly atop `getTowerEffectiveStats(tower.type, tower.tier, tower.branch)`.

2. **With Track 3 (HUD Tactical Dock, `#tower-inspector` Dual-Branch Cards & Tech Tree)**:
   - **Engineer Tech Tree (`TechModifiers`)**: `GameEngine.setTechModifiers(mods)` applies multiplicative bonuses cleanly without mutating static `TOWER_BLUEPRINTS`:
     - `towerDamageMult` (`1.00 .. 1.20`), `towerFireRateMult` (`1.00 .. 1.16`), `startingGoldBonus` (`+0 .. +80G`), `maxBeaconHpBonus` (`+0 .. +8`), `tacticalSkillCooldownMult` (`1.00 .. 0.80` + `+25` starting `⚡`), `sellRefundAndWaveBonus` (`0.75 -> 0.90` refund + `+15%` wave clear gold).
   - **Compact Non-Overlapping HUD (`580px` `<agent-embed>` & `360x800` Mobile Portrait)**:
     - The **3-Button Tactical Skills Pill + `⚡` Energy Bar** sits compactly in `#hud-bottom-dock` right beside `#btn-start-wave` (or tucked as a slim `42px` horizontal pill above `#tray-slot`, automatically collapsing labels to crisp icons + `⚡cost` on `max-width: 720px` and hiding when `mode !== 'playing'`), and arming `orbital_strike` auto-closes `#tray-slot` so `0px` of road is covered while aiming!
     - Inside `#tower-inspector` (`UIManager.ts:398-423`), when `tw.tier === 3` (`tw.t4Branches !== null`), replace the single `#btn-upgrade-tower` with **two compact side-by-side gold-accented Enamel Specialization Cards (`#btn-upgrade-branch-A`, `#btn-upgrade-branch-B`)** calling `this.engine.upgradeSelectedTower('A')` and `this.engine.upgradeSelectedTower('B')`!
