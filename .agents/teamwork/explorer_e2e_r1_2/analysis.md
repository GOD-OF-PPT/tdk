# E2E Gameplay, Balance, Economy, Combat & Cinematics Test Architecture (`explorer_e2e_r1_2`)

**Scope**: Authoritative Blueprint & Economy Map, Adaptive Zero-Cheat 8-Wave Strategy (`Scenario 4.1`), Single-Tower Solo Balance Guard (`Scenario 4.2`), Dual-Clock Simulation vs GSAP Cinematics Synchronization, and Concrete Tier 1–4 Opaque-Box Test Specifications for Features `F7`–`F15`.

---

## 1. Complete Blueprint, Road Geometry & Economy Map

### 1.1 Global Constants & Storage Keys
- **Authoritative Constants** ([`GAME_CONSTANTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L14-L24)):
  - `INITIAL_GOLD`: **`260`**
  - `INITIAL_CRYSTALS`: **`0`**
  - `MAX_BEACON_HP`: **`20`**
  - `SELL_REFUND_RATIO`: **`0.75`** (`sellRefund = Math.round(totalInvestedGold * 0.75)`, [`GameEngine.ts:562`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L562))
  - `TOTAL_WAVES`: **`8`**
  - `OUTLINE_HEX`: **`0x1a1033`** (`#1A1033`)
  - `PAD_HOP_INTERVAL`: **`4.2s`** (hop duration `0.38s`, peak `y = 0.14m`, [`GameEngine.ts:760-764`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L760-L764))
  - `VICTORY_CHEST_GOLD`: **`+320`** Gold (`Stage 5B` Supply Crate claim)
  - `VICTORY_CHEST_CRYSTALS`: **`+8`** Energy Crystals (`Stage 5B` Supply Crate claim)
- **Persistent `localStorage` Keys**:
  - Mute state: `'lunar_beacon_td_muted_v2'` (`'1'` muted, `'0'` unmuted, [`AudioManager.ts:3`](file:///home/antigravity/GOD-OF-PPT/tdk/src/audio/AudioManager.ts#L3))
  - Victory commendations: `'lunar_beacon_commendations_v1'` (integer string incremented `+1` on Stage 5B claim, [`GameEngine.ts:35, 672-675`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L672-L675))
- **Victory Star Thresholds** ([`GameEngine.ts:1563`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1563)):
  - `beaconHp >= 18` → **3 Stars (`★★★`)**
  - `10 <= beaconHp <= 17` → **2 Stars (`★★☆`)**
  - `1 <= beaconHp <= 9` → **1 Star (`★☆☆`)**

### 1.2 Four Named Tower Tiers ([`TIER_META`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L26-L63))
| Tier | Name (`tierName`) | Tag (`shortTag`) | Accent Hex | Three.js Color | Rim Color |
|---:|---|---|---|---|---|
| **T1** | `临时装配` | `T1 · 临时装配` | `#2ECC71` | `0x2ecc71` | `0x4ade80` |
| **T2** | `标准战备` | `T2 · 标准战备` | `#3B82F6` | `0x3b82f6` | `0x60a5fa` |
| **T3** | `精英模块` | `T3 · 精英模块` | `#A855F7` | `0xa855f7` | `0xc084fc` |
| **T4** | `传说机甲` | `T4 · 传说机甲` | `#F59E0B` | `0xf59e0b` | `0xffd166` |

### 1.3 Haulage Road Geometry & All 10 Build Pads ([`RAW_ROAD_WAYPOINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L70-L79), [`BUILD_PADS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L205-L216))
- **8 Waypoints**: `(-13.0, 0, -3.2)` → `(-6.8, 0, -3.2)` → `(-6.8, 0, 3.6)` → `(-0.2, 0, 3.6)` → `(-0.2, 0, -3.6)` → `(6.4, 0, -3.6)` → `(6.4, 0, 2.4)` → `(11.8, 0, 2.4)`.
- **Quadratic Bezier Fillets**: `cornerRadius = 1.42m`; **`TOTAL_ROAD_LENGTH = 41.5826m`**.
- **Physical Clearance Invariant**: Road half-width (`1.18m`) + Pad socket radius (`1.18m`) = `2.36m`. Every pad maintains **`>= 2.800m`** centerline clearance (minimum physical gap `>= 0.44m` between curb and pad rim), guaranteeing towers never block or obscure the haulage road.

| Pad ID | Label | World `(x, z)` | Min Road Clearance | Nearest Road `s` | Road Coverage (`5.1m` / `5.4m` / `6.4m` / `6.7m` / `8.0m`) | Desktop `1440x900` `(x, y)` | Mobile `390x844` `(x, y)` | Tactical Role & UI Caveats |
|---|---|---|---:|---:|---|---|---|---|
| `pad_01` | `1号检修基座` | `(-9.8, -0.2)` | `3.000m` | `8.7m` | `12.64 / 12.97 / 14.29 / 14.52 / 16.17m` | `(252, 409)` | `(67, 398)` | **West Entry Corner**: Ideal early `Magnetic` slow feeding `pad_03` Mortar killzone. |
| `pad_02` | `2号前哨基座` | `(-4.0, -5.8)` | `4.323m` | `5.9m` | `4.76 / 6.29 / 10.69 / 12.33 / 18.18m` | `(556, 237)` | `(147, 347)` | **North-West Outer Flank**: Long-range Mortar only (`4.32m` standoff). |
| `pad_03` | `3号西湾内座` | `(-3.5, 0.4)` | **`3.200m`** | `15.2m` | **`19.58 / 20.21 / 22.48 / 23.43 / 26.27m`** | `(555, 431)` | `(150, 403)` | **Crown Jewel #1 (West U-Bend)**: Covers **3 parallel legs (`47%–63%` of entire road)**! Top `Mortar` pad. |
| `pad_04` | `4号南廊外座` | `(-6.8, 6.4)` | `2.996m` | `12.8m` | `6.29 / 6.99 / 9.10 / 9.63 / 12.79m` | `(334, 686)` | `(101, 465)` | **South-West Turn Outer**: Secondary flank. |
| `pad_05` | `5号南湾主座` | `(-0.2, 6.4)` | `2.996m` | `17.7m` | `6.28 / 6.97 / 9.07 / 9.60 / 12.73m` | `(717, 686)` | `(194, 465)` | **South Bend Bridge**: Bridges `pad_03` & `pad_06`. **E2E CAVEAT**: On `1440x900`, when `#build-tray` or `#tower-inspector` is open, `#btn-start-wave` rises to `y=663..709` right over `(717, 686)`! Close open sheet (`#btn-close-sheet` / `#btn-close-build`) BEFORE clicking `pad_05`! |
| `pad_06` | `6号中枢内座` | `(3.1, -0.4)` | **`3.200m`** | `28.0m` | **`19.29 / 19.79 / 22.14 / 23.07 / 25.89m`** | `(877, 402)` | `(238, 396)` | **Crown Jewel #2 (Central-East U-Bend)**: Covers **3 parallel legs (`46%–62%` of entire road)**! Primary DPS & `Scenario 4.2` solo test pad. |
| `pad_07` | `7号北脊基座` | `(3.1, -6.4)` | **`2.800m`** | `28.0m` | `7.98 / 8.82 / 11.10 / 12.01 / 14.74m` | `(857, 221)` | `(236, 341)` | **North Ridge Anchor**: Exact minimum `2.800m` road clearance; immune to early West Boss slam. |
| `pad_08` | `8号东折内座` | `(9.3, -0.8)` | `2.900m` | `33.5m` | `11.98 / 12.22 / 13.39 / 13.63 / 15.04m` | `(1172, 389)` | `(320, 392)` | **East Exit Inner Bend**: Strong 2-leg finisher (`29%–36%` road) guarding Return Beacon. |
| `pad_09` | `9号信标南卫` | `(6.4, 5.4)` | `3.188m` | `37.1m` | `6.02 / 6.71 / 8.32 / 8.77 / 13.90m` | `(1089, 637)` | `(287, 454)` | **Beacon South Guard**: Final turn cleanup. |
| `pad_10` | `10号信标近卫` | `(10.2, 5.4)` | `3.000m` | `39.9m` | `5.57 / 5.91 / 7.19 / 7.64 / 8.99m` | `(1304, 637)` | `(340, 454)` | **Beacon Last-Stand**: Final `5.9m–9.0m` before terminus. |

*(Note: M2 [`plan.md` F16] adjusts desktop `distScale` `~1.0 -> 1.10` and mobile portrait `distScale` cap `2.65 -> ~3.25`, which shifts projected `(x, y)` coordinates slightly inward. E2E tests MUST ALWAYS query live `window.__LUNAR_BEACON_GAME__.getPadScreenCoordinates(padId)` dynamically rather than hardcoding pixel coordinates!)*

### 1.4 Tower Blueprints × 4 Tiers, Combat Math & Sell Refund ([`TOWER_BLUEPRINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L220-L409))
- **Damage Formula** ([`GameEngine.ts:1219-1220`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1219-L1220)):
  $$\text{effectiveArmor} = \max\bigl(0,\; \text{enemy.armor} \times (1 - \text{armorPierce})\bigr), \qquad \text{finalDamage} = \max\bigl(2,\; \text{round}(\text{rawDamage} \times (1 - \text{effectiveArmor}))\bigr)$$
- **Target Acquisition & Range Bonus** ([`GameEngine.ts:1370, 1380, 1395`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1370-L1396)):
  - Picks living enemy with **largest `distanceTraveled`** (farthest along road) within `stats.range + (e.isBoss ? 0.65 : 0.15)`.
  - `autocannon` & `mortar` yaw toward target (`rig.turretYaw.rotation.y += diff * Math.min(1, dt * 14)`) and fire when `cooldown <= 0 && Math.abs(diff) < 0.38`.
  - **Pre-M2 Bug (Fixed in M2 `F7`)**: `fireMagneticTower` ([`GameEngine.ts:1199`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1199)) used `+ 0.6` instead of `+ 0.65` for Boss hit radius, whiffing pulses when Boss stood at `range + (0.60..0.65)m`.
- **Mortar Parabolic Flight & Splash Falloff** ([`GameEngine.ts:1165-1186`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1165-L1186), [`VfxManager.ts:163-165`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L163-L165)):
  - Leads target along road by `0.35s` (`leadDist = min(TOTAL_ROAD_LENGTH, dist + baseSpeed * (1 - slowRatio) * 0.35)`).
  - Shell flight duration: `clamp(0.42 + horizDist * 0.028, 0.44, 0.68)` seconds (advanced ONLY by combat `simDt`, frozen when `paused` or in cinematics!).
  - Impact splash hits all living enemies within `splashRadius + (e.isBoss ? 0.8 : 0.25)`: **`100%` rawDamage** inside `<= 0.55 * splashRadius`, **`78%` rawDamage** in outer ring (`0.55..1.0+`).
- **Magnetic Pre-Charge & Non-Stacking Slow** ([`GameEngine.ts:1068-1087, 1189-1208`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1068-L1087)):
  - `0.36s` pre-fire wind-up (`cooldown < 0.36` with enemy in range): outer/inner rings accelerate `2.1 -> 9.5 rad/s`, inner core `2.5 -> 14 rad/s`, clamps flare to `0.36 rad`, then snap to `-0.15 rad` on pulse.
  - `effectiveSlow = e.isBoss ? stats.slowRatio * 0.55 : stats.slowRatio`.
  - **Cap**: Never exceeds `60%` (`0.60`) on normal/Elite enemies or `33%` (`0.33`) on Boss (`effSpeed = baseSpeed * (1 - slowRatio) >= 0.40 * baseSpeed`).
  - **Pre-M2 Bug (Fixed in M2 `F7`)**: `e.slowTimer = Math.max(e.slowTimer, stats.slowDuration)` refreshed `slowTimer` even when a weaker `T1` (`32%`) tower hit an enemy carrying `T4` (`60%`) slow, keeping `60%` slow forever. Post-M2, weaker slow cannot extend a stronger slow's duration past its natural expiry!

| Tower (`weaponColorHex`) | Tier | Step Cost | Cum. Cost | `75%` Sell Refund | Damage | Interval | Raw DPS | Range | Armor Pierce | Splash / Slow |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---|
| **联装机炮 `autocannon`** (`#FF9F1C`) | T1 | `90G` | `90G` | **`68G`** | `16` | `0.34s` | `47.1` | `5.4m` | `5%` | Single-target hitscan |
| *(Note: M2 `F9` rebalances T3/T4 DPS & cost!)* | T2 | `110G` | `200G` | **`150G`** | `26` | `0.29s` | `89.7` | `5.8m` | `12%` | Alternating dual recoil |
| | T3 | `165G`* | `365G`* | **`274G`**\* | `41`* | `0.24s`* | `170.8`* | `6.2m` | `22%`* | Rotary drum + top louvers |
| | T4 | `240G`* | `605G`* | **`454G`**\* | `68`* | `0.19s`* | `357.9`* | `6.7m` | `36%`* | Heavy mecha + rear gear |
| **脉冲迫击炮 `mortar`** (`#22D3EE`) | T1 | `120G` | `120G` | **`90G`** | `46` | `1.75s` | `26.3` | `6.4m` | `35%` | `2.05m` AoE (`0.44–0.68s` flight) |
| | T2 | `140G` | `260G` | **`195G`** | `76` | `1.58s` | `48.1` | `6.9m` | `45%` | `2.35m` AoE |
| | T3 | `200G` | `460G` | **`345G`** | `122` | `1.42s` | `85.9` | `7.4m` | `58%` | `2.65m` AoE + rangefinder |
| | T4 | `290G` | `750G` | **`563G`** | `198` | `1.25s` | `158.4` | `8.0m` | `72%` | `3.05m` AoE + bay doors + gear |
| **磁场约束塔 `magnetic`** (`#C084FC`) | T1 | `100G` | `100G` | **`75G`** | `14` | `1.35s` | `10.4` | `5.1m` | `25%` | `32%` slow for `2.5s` |
| | T2 | `115G` | `215G` | **`161G`** | `24` | `1.22s` | `19.7` | `5.5m` | `35%` | `41%` slow for `2.8s` |
| | T3 | `165G` | `380G` | **`285G`** | `38` | `1.08s` | `35.2` | `6.0m` | `45%` | `50%` slow for `3.1s` |
| | T4 | `245G` | `625G` | **`469G`** | `64` | `0.94s` | `68.1` | `6.6m` | `60%` | **`60%` slow** (`33%` Boss) for `3.5s` |

*\*M2 Rebalance Resilience Rule*: Because M2 (`plan.md` F9) concurrently tunes `autocannon` T3/T4 (and Wave 6–8 heavy/Boss HP/armor), **E2E tests MUST NOT hardcode `autocannon` T3/T4 `cost`/`damage`/`fireInterval` or `boss_crawler.maxHp`**. Always read live costs/stats from DOM (`.mini-card-cost`, `#btn-upgrade-tower .cost-badge`, `#ins-dmg`, `#btn-sell-tower`) and `getSnapshot()`, asserting exact mathematical invariants (`sellRefund === Math.round(cumInvested * 0.75)`, `goldAfter === goldBefore - liveCost`, `damage(T4) > damage(T3) > damage(T2) > damage(T1)`).

### 1.5 Five Enemy Blueprints ([`ENEMY_BLUEPRINTS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L411-L487))
| Type | Name | Max HP | Speed | Armor | Kill Reward | Beacon Dmg | Flags & Special Mechanics |
|---|---|---:|---:|---:|---|---:|---|
| `rover` | `失控巡检机` | `92` | `2.25` | `8%` | `16G` | `1` | Ground wheeled gait; HP bar hidden until hit; nose-down splay death (`0.34s`). |
| `swarm` | `运输蜂群机` | `52` | `3.75` | `0%` | `12G` | `1` | `isFlying: true` (`y = 0.86 ± 0.11m`); height-reactive `shadowBlob` (`scale 0.72..1.15`); HP bar hidden until hit; spiral crash death. |
| `drill` | `重甲钻探机` | `285`* | `1.32` | `42%` | `32G` | `2` | Heavy armor (`playMetallicArmorHit` + yellow sparks); HP bar hidden until hit; sideways hull fracture death. |
| `elite_drill` | `精英·裂岩重钻长机` | `1180`* | `1.22` | `48%` | `110G + 2💎` | `4` | `isElite: true` (`1.48x` scale); HP bar visible at spawn; Stage 4A `0.22s` (`0.24x`) hit-stop + climax burst + 3D debris + 5 coins + 2 crystals on kill. |
| `boss_crawler` | `最终Boss·巨颚号履带采掘母机` | `5200`* | `0.88` | `45%`* | `260G + 5💎` | **`20`** | `isBoss: true`, `isElite: true`; top `#boss-hud-bar` + floating HP bar visible at spawn; **3 breakaway armor plates** at `75% / 50% / 25%` HP (`-0.10` armor per break + 6 3D debris chunks); **Ground-Slam active skill** (`initial 6.5s`, repeat `8.8s` when `4.0 < dist < 37.58m`: halts `1.25s` wind-up + red `5.2m` warning zone + `.boss-skill-warn` -> slams & **stuns towers within `5.2m` for `2.2s`**); **M2 `F8` Weakpoint**: `weakPointCore` flares & grants **`1.25x` bonus vulnerability** when dorsal armor breaks (`<=25%` HP) / post-slam overheat! |

### 1.6 Eight-Wave Compositions, Spawn Windows & Cumulative Natural Economy ([`WAVE_CONFIGS`](file:///home/antigravity/GOD-OF-PPT/tdk/src/config/gameConfig.ts#L489-L597))
Spawn scheduler formula ([`GameEngine.ts:608-619`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L608-L619)): `cursorTime += grp.delayBefore`; unit `i` spawns at `cursorTime + i * grp.interval`; then `cursorTime += grp.count * grp.interval * 0.45` (intentional overlapping multi-group pressure!).

| Wave | Title | Spawn Groups & Exact `waveElapsed` Windows | Units | Cum. Kills | Kill Gold | Clear Bonus | Wave Total | **Cum. Natural Gold** (`Start=260G`) | Cum. Crystals | Max Beacon Threat |
|---:|---|---|---:|---:|---:|---|---:|---:|---:|---:|
| **W1** | `矿道异动` | `7x rover [0.30s..7.80s]` | `7` | `7` | `112G` | `+45G, +1💎` | `+157G` | **`417G`** | `1💎` | `7` (`<20`, never auto-lose!) |
| **W2** | `低空运输蜂群` | `5x rover [0.20s..4.60s]` \| `8x swarm [4.18s..8.73s]` | `13` | `20` | `176G` | `+55G, +1💎` | `+231G` | **`648G`** | `2💎` | `13` |
| **W3** | `重甲掘进编队` | `3x drill [0.30s..5.10s]` \| `7x rover [4.54s..10.24s]` | `10` | `30` | `208G` | `+65G, +1💎` | `+273G` | **`921G`** | `3💎` | `13` |
| **W4** | `精英裂岩突袭` | `6x rover [0.20s..4.70s]` \| **`1x elite_drill [4.43s]`** \| `9x swarm [6.08s..10.72s]` | `16` | `46` | `314G` (`+2💎`) | `+85G, +2💎` | `+399G` | **`1,320G`** | `7💎` | `19` |
| **W5** | `双线失控洪流` | `12x swarm [0.20s..5.92s]` \| `5x drill [4.01s..11.61s]` \| `8x rover [9.08s..14.68s]` | `25` | `71` | `432G` | `+95G, +1💎` | `+527G` | **`1,847G`** | `8💎` | `30` |
| **W6** | `矿区重装集群` | `7x drill [0.30s..10.20s]` \| `14x swarm [6.70s..12.94s]` | `21` | `92` | `392G` | `+115G, +2💎` | `+507G` | **`2,354G`** | `10💎` | `28` |
| **W7** | `终末前夜狂潮` | `10x rover [0.20s..6.50s]` \| **`2x elite_drill [4.75s, 8.95s]`** \| `16x swarm [9.53s..16.28s]` \| `5x drill [13.57s..19.57s]` | `33` | `125` | `732G` (`+4💎`) | `+140G, +2💎` | `+872G` | **`3,226G`** | `16💎` | `44` |
| **W8** | `巨颚号深层采掘母机` | `6x rover [0.20s..4.45s]` \| **`1x boss_crawler [3.695s]`** \| `12x swarm [7.35s..13.95s]` \| `4x drill [12.59s..18.59s]` | `23` | `145–148` | `Up to 628G` (`+5💎` Boss) | **`+200G, +4💎`** *(M2 `F8` fix!)* | `Up to +828G` | **`3,800–4,054G`** *(+`320G` Crate = **`4,120–4,374G`**)* | **`25💎`** post-M2 (`21💎` pre-M2) -> **`33💎`** post-Crate (`29💎` pre-M2) | `46` (Boss=`20`) |

---

## 2. Concrete Zero-Cheat 8-Wave Strategy (`Scenario 4.1`) & Anti-Solo Guard (`Scenario 4.2`)

### 2.1 `Scenario 4.1`: Adaptive Zero-Cheat Natural-Economy Playthrough (Empirically Proven!)
- **Affordability Proof**: Entering Wave 8, a zero-leak player has earned **`3,226G` in 100% natural gold** (`260G` initial + `2,966G` across Waves 1–7) — **zero `debugAddGold` calls**.
- **17-Step Priority Queue (`2,775G` total cost -> `451G+` spare margin before Wave 8!)**:
  1. **Wave 1 Prep (`260G` -> `50G` left)**:
     - Build `mortar` (`120G`) on **`pad_03`** (West U-bend 3-leg AoE anchor).
     - Build `autocannon` (`90G`) on **`pad_06`** (Central-East U-bend 3-leg rapid DPS).
  2. **Wave 2 Prep (`207G` -> `17G` left)**:
     - Build `magnetic` (`100G`) on **`pad_01`** (West entry corner slow feeding `pad_03` Mortar).
     - Build `autocannon` (`90G`) on **`pad_08`** (East exit bend finisher).
  3. **Wave 3 Prep (`248G` -> `108G` left)**:
     - Upgrade **`pad_03` Mortar -> `T2 标准战备`** (`140G`, `45%` armor pierce vs Wave 3 Heavy Drills).
  4. **Wave 4 Prep (`381G` -> `56G` left)**:
     - Upgrade **`pad_06` Autocannon -> `T2 标准战备`** (`110G`).
     - Upgrade **`pad_01` Magnetic -> `T2 标准战备`** (`115G`, `41%` slow).
     - Build `magnetic` (`100G`) on **`pad_05`** (Central South bridge slow).
  5. **Wave 5 Prep (`455G` -> `90G` left)**:
     - Upgrade **`pad_03` Mortar -> `T3 精英模块`** (`200G`, `122` dmg / `58%` pierce).
     - Upgrade **`pad_06` Autocannon -> `T3 精英模块`** (`165G`).
  6. **Wave 6 Prep (`617G` -> `217G` left)**:
     - Upgrade **`pad_03` Mortar -> `T4 传说机甲`** (`290G` — triggers **Stage 2C Golden Hero Reveal**!).
     - Upgrade **`pad_08` Autocannon -> `T2 标准战备`** (`110G`).
  7. **Wave 7 Prep (`609G` -> `89G` left)**:
     - Upgrade **`pad_05` Magnetic -> `T2` -> `T3 精英模块`** (`115G + 165G = 280G`, `50%` central slow).
     - Upgrade **`pad_06` Autocannon -> `T4 传说机甲`** (`240G` — 2nd **Stage 2C Golden Hero Reveal**!).
  8. **Wave 8 Prep (`911G` -> `286G` left)**:
     - Upgrade **`pad_08` Autocannon -> `T3 精英模块`** (`165G`).
     - Build `mortar` (`120G`) on **`pad_07`** and upgrade **`pad_07` Mortar -> `T2` -> `T3`** (`140G + 200G = 340G`, North Ridge stun-immune Boss breaker).
- **Resilience to M2 Rebalancing (`±40–60G` cost & `38%` AC nerf)**:
  - The runner uses a stateful `cursor` over `planSteps`: before each click, it reads live `snap.gold` AND the live DOM button cost (`.mini-card-cost` / `#btn-upgrade-tower .cost-badge`). If `snap.gold < liveCost` (e.g., if M2 raises `autocannon` T3/T4 by `+40G`), it simply closes the sheet (`#btn-close-sheet` / `#btn-close-build`), runs the current wave with its already-overpowered defense, and executes that upgrade on the next inter-wave prep!
  - **Empirically verified**:
    1. Live Chromium run against `http://127.0.0.1:5173`: **Cleared Waves 1–8 at `20/20` Beacon HP (`3 Stars`), `17/17` steps completed, `preClaimGold: 983 -> postClaimGold: 1303 (+320G)`, `preClaimCrys: 21 -> postClaimCrys: 29 (+8💎)`** (`25 -> 33💎` post-M2 Wave 8 bonus fix!).
    2. Deterministic M2-stress simulation (`autocannon` nerfed `38%`, T3/T4 costs `+60G`, `drill`/`elite_drill` `+25%` HP, `boss_crawler` buffed `5,200 -> 7,800` HP & `50%` armor): **Still clears Wave 8 at `20/20` Beacon HP with `719G` spare gold!**

### 2.2 `Scenario 4.2`: Single-Tower AFK / Solo Balance Guard (Confirmed Pre-M2 Defect Detector!)
- **Requirement** ([`ORIGINAL_REQUEST.md:79`](file:///home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md#L79), `REQ-045`, `plan.md` F9): *"数值需要经过基本平衡：合理选择塔型和升级能够通关，不能一座塔自动打完，也不能第一波就必败。"*
- **Two Mandatory Sub-Checks**:
  1. **Sub-Check 4.2A (Wave 1 Fair Survival + Un-upgraded T1 Solo Failure)**:
     - Build `1x T1 autocannon` (`90G`) on `pad_01` via UI click, start Wave 1, step to completion → assert `snap.waveNumber === 2` and `snap.beaconHp === 20` (never insta-fails Wave 1; in fact even `0` towers survives Wave 1 at `13/20` HP since `7x rover` deals max `7` Beacon damage).
     - Continue launching waves without building/upgrading → assert `snap.mode === 'defeat'` (`snap.beaconHp === 0`, `#defeat-modal` visible by Wave 3–4).
  2. **Sub-Check 4.2B (Upgraded Single-Tower T1→T4 Solo Must Fail on Both U-Bend Crown Pads `pad_06` & `pad_03`)**:
     - Start fresh mission (`startNewMission(false)` + 1 `debugStepSimulation(0.05, false)` camera sync tick).
     - Build **ONLY 1 tower** (`autocannon` on `pad_06`, and repeat on `pad_03`). Between waves (and mid-wave if needed), spend natural gold ONLY to upgrade that single tower `T1 → T2 → T3 → T4` (waiting for `legendary_reveal -> playing` on `T4` and `boss_intro -> playing` on Wave 8), building **zero** additional towers.
     - Assert **`snap.mode === 'defeat'`** (`snap.beaconHp === 0`, `#defeat-modal` visible)!
- **Empirical Confirmation Against Pre-M2 `dist/`**:
  - Live Chromium test (`task-70`) confirmed that against current pre-M2 `dist/`, `1x Autocannon` upgraded naturally to `T4` on `pad_06` **currently solos all 8 waves + Final Boss (`mode: 'victory_cinematic'`, `beaconHp: 16/20`, `gold: 3121`)**!
  - Thus `Sub-Check 4.2B` is a **100% genuine red-to-green defect detector**: it WILL fail (`AssertionError: expected 'victory_cinematic' to equal 'defeat'`) against pre-M2 `dist/` and WILL pass once M2 lands the `gameConfig.ts` rebalance (`plan.md` F9)!

---

## 3. Dual-Clock Architecture: `debugStepSimulation(dt)` vs GSAP Cinematics Timing

### 3.1 How the Two Clocks Interact
1. **Combat Simulation Clock (`GameEngine.stepFrame`, [`GameEngine.ts:690-740`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L690-L740))**:
   - `debugStepSimulation(seconds, renderFinal)` ([`GameEngine.ts:1630-1640`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1630-L1640)) subdivides `seconds` into fixed **`step = 0.05s`** ticks (`count = Math.max(1, Math.ceil(seconds / 0.05))`) and runs `this.stepFrame(0.05, false)`.
   - Inside `stepFrame(rawDt)`:
     - Only when **`this.mode === 'playing'`** does it compute `simDt = rawDt * this.speedMultiplier * activeScale` and advance `updateWaveSpawner(simDt)`, `updateEnemies(simDt)`, `updateTowers(simDt)`, `checkWaveCompletion()`, and `vfx.update(simDt, rawDt)` (including parabolic `mortarShells`, which ONLY move when `simDt > 0`, [`VfxManager.ts:491`](file:///home/antigravity/GOD-OF-PPT/tdk/src/fx/VfxManager.ts#L491)!).
     - **Speed Multiplier Rule**: Keep `speedMultiplier === 1` during fast-forward loops so every internal sub-step uses exact `simDt = 0.05s` (`<= 0.05s`), preserving full projectile flight, `0.38 rad` turret yaw tracking, Mortar `0.35s` road-lead splash, Magnetic `0.36s` wind-up & slow timers, Boss `1.25s` telegraph & `2.2s` stun, and `75%/50%/25%` armor breaks without coarse tunneling!
2. **GSAP Presentation Clock (`gsap.timeline()`, [`CinematicDirector.ts:88-804`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/CinematicDirector.ts#L88-L804))**:
   - `gsap.timeline()` runs on **browser wall-clock `requestAnimationFrame`**, completely independent of `debugStepSimulation`!
   - Calling `debugStepSimulation(10)` during `opening`, `legendary_reveal`, `boss_intro`, `victory_cinematic`, or `reward_claiming` advances **zero** GSAP tweens and **zero** combat ticks!

### 3.2 Exact Stage-by-Stage Synchronization Protocol
| Stage / Event | Mode Transition | Wall-Clock GSAP Timeline Milestones | Safe E2E Stepping / Waiting Pattern |
|---|---|---|---|
| **Stage 1: Opening Fly-In** (`playOpeningStationIntro`) | `'opening'` → `'playing'` | `0.28s, 0.52s, 0.76s, 1.00s`: 4 Beacon lamps ignite; `1.15s`: Beacon core ignites; **`1.75s`**: `onComplete` → `mode = 'playing'`. | Either wait real-time `page.waitForFunction(() => snap.mode === 'playing')` (~`1.85s`) to test Stage 1, OR call `startNewMission(false)` / tap pad to skip cleanly into `'playing'`. |
| **Stage 2A: Tower Build** (`playTowerBuildAssembly`) | Stays `'playing'` | `0.00–0.16s`: base drops from `y=1.65 -> 0`; **`0.16s`**: lunar dust + squash (`playTowerBuildLand` synced here in M2 `F15`); `0.20–0.38s`: turret rises; `0.34–0.50s`: `weaponPitch` snaps forward. | Non-blocking for combat, but wait `200ms` wall-clock if asserting 3D build squash/dust or `turretYaw.scale` settle (`0.50s`). |
| **Stage 2B: T2 / T3 Upgrade** (`playNormalUpgrade`) | **Stays `'playing'`** (MUST NOT pause!) | `0.00–0.16s`: turret lifts `+0.30m`; `0.08 + idx*0.075s` (`0.24s` arc): 3D modules fly in; **`lockEnd = 0.34 + parts.length * 0.075` (`~0.56–0.85s`)**: tier color ignites (M2 `F3`), `#upgrade-stamp` + `.delta-chip` slam into DOM! Auto-clears after `1.55s`. | Step `debugStepSimulation(0.25, false)` immediately after click to prove enemies move (`distanceTraveled` increases) while upgrading; use `page.waitForSelector('#upgrade-stamp')` (~`0.7s` wall-clock) to assert UI stamp! |
| **Stage 2C: T4 Hero Reveal** (`playLegendaryUpgradeReveal`) | `'playing'` → **`'legendary_reveal'`** → `'playing'` | `0.00–0.42s`: Hero camera zoom + `heroLight=4.8` + golden `legendaryBackdrop`; `0.34 + idx*0.13s`: T4 heavy parts arc in; **`climaxAt = 0.66 + parts.length * 0.13` (`~1.2–1.7s`)**: golden burst + `#upgrade-stamp.legendary` + `hingedFlaps` open/close; **`climaxAt + 2.00s` (`~3.2–3.7s`)**: returns to `'playing'`. | Assert `snap.mode === 'legendary_reveal'`, step `debugStepSimulation(0.5, false)` and verify enemy `distanceTraveled` is **frozen (`Δ === 0`)**, `waitForSelector('#upgrade-stamp.legendary')`, then **MUST** `waitForFunction(() => snap.mode === 'playing')` before resuming wave stepping! |
| **Stage 3: Boss Entrance** (`playBossEntranceSequence`) | `'playing'` → **`'boss_intro'`** (at `waveElapsed >= 3.695s` on W8) → `'playing'` | `0.00–0.45s`: camera pans to Mine Entrance + `#banner-slot`; `0.35s`: `playBossChargeAndSlam` ~`1.0s` rising pitch + fissures + 5 suction bursts; `1.35–1.47s`: **sudden contraction & `~100ms` silence** (M2 `F12`); **`1.49s`**: shockwave spawns `boss_crawler`; **`2.77s`**: returns to `'playing'`. | Step Wave 8 in `0.25s` increments until `snap.mode === 'boss_intro'`; **MUST** `waitForFunction(() => snap.mode === 'playing')` (~`2.8s` wall-clock) so `onSpawnBoss()` fires at `1.49s` before stepping Boss combat! |
| **Stage 4A: Elite Kill** (`playEliteKillClimax`) | Stays `'playing'` (`hitStopTimer = 0.22s`, `0.24x`) | Pure `stepFrame` timer (`hitStopTimer` decrements via `rawDt = 0.05s`). | Zero wall-clock wait needed; `5` ticks (`0.25s`) of `debugStepSimulation` naturally clear `hitStopTimer` back to `0`! |
| **Stage 4B + 5A: Boss Death & Crate Drop** (`playBossDefeatAndBeaconVictory`) | `'playing'` → **`'victory_cinematic'`** → **`'victory_panel'`** | `0.00–0.55s+`: `simTimeScale=0.2`, Boss chain sub-explosions (3–4 beats in M2 `F13`) + `onBossRemoved` + 8 coins / 5 crystals; `1.55s`: `skyBeam` ignites + `signalFins` unfold; `1.78–2.06s`: 3D `supplyChest` drops & squashes; **`2.45s`**: `mode = 'victory_panel'` (`#victory-screen` + `#btn-claim-rewards`). | Once `snap.mode === 'victory_cinematic'`, stop `debugStepSimulation` and `waitForFunction(() => snap.mode === 'victory_panel')` (~`2.5s` wall-clock). |
| **Stage 5B: Reward Claim** (`playOpenRewardChest`) | `'victory_panel'` → `'reward_claiming'` → **`'reward_claimed'`** | `0.00–0.18s`: crate squash; **`0.19s`**: clasp pops off along arc (M2 `F14`), `lidPivot.rotation.x -> -2.05`, 8 3D coins + 8 3D faceted crystals fountain out, `+320G / +8💎` credited (`rollNumber` animates HUD for `320ms`); **`1.15s`**: `mode = 'reward_claimed'` (`#btn-play-again`). | Click `#btn-claim-rewards` (or canvas-tap 3D chest!), optionally sample mid-fountain at `+350ms`, then `waitForFunction(() => snap.mode === 'reward_claimed')` (~`1.2s` wall-clock). |

### 3.3 Three Critical Harness Pitfalls Discovered Empirically (Must Include in `TEST_INFRA.md` & Helpers!)
1. **Stale Camera Matrix Immediately After `startNewMission(false)`** (`#btn-play-again`, `#btn-retry-defeat`, `#btn-restart-pause`):
   - `startNewMission(false)` ([`GameEngine.ts:318, 368-373`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L318-L373)) calls `cinematics.cancelAll()` (`cameraOverride = null`) **without** calling `applyCameraPose(0)`. Until 1 tick runs, `camera.position` still holds the Stage 5 Victory Plaza zoom pose, causing immediate `getPadScreenCoordinates(...)` calls to return off-screen coordinates!
   - **Rule**: Always execute `await page.evaluate(() => window.__LUNAR_BEACON_GAME__.debugStepSimulation(0.05, false))` right after any Restart / Play Again / Retry click before querying `getPadScreenCoordinates`!
2. **Bottom-Dock `#btn-start-wave` Overlap Over `pad_05` on `1440x900` When a Sheet Is Open**:
   - When `#build-tray` or `#tower-inspector` is closed, all 10 pads (`pad_01`..`pad_10`) hit `#game-canvas` cleanly. When a bottom sheet IS open (`height: 174px`), `#btn-start-wave` shifts upward to `y = 663..709`, directly covering `pad_05` `(717, 686)`!
   - **Rule**: Helper `selectPadViaCanvasClick(page, padId)` MUST close `#btn-close-sheet` / `#btn-close-build` first whenever switching to a different pad!
3. **SwiftShader CPU Rasterization Budget (`< 90s` Total Suite Target)**:
   - At `1440x900`, `1.5x` 4x MSAA (`2160x1350`) takes `~350ms`/frame on SwiftShader CPU, making 50 sequential Playwright clicks take `>150s`.
   - **Rule**:
     - Reuse 1 Chromium instance and reset state via `startNewMission(false)` across functional cases.
     - Run pure combat/economy/audio/mechanics tests (Tiers 1–3 `F7`–`F9`, `F15`, `Scenario 4.2`, `4.3`, `4.7`, `4.8`, `4.9`) in a **`640x420` context** (~`25ms`/frame, **5x faster**!) while running Desktop Framing/Outline/Cinematics (`Scenario 4.1`, `F6`, `F10`–`F14`, `F16`) at **`1440x900`** and Mobile Portrait (`Scenario 4.4`, `F16`) at **`390x844`**!
     - Always pass `renderFinal = false` inside `debugStepSimulation(0.25, false)` loops, calling `renderFinal = true` only once at assertion/screenshot checkpoints.

---

## 4. Concrete Tier 1, Tier 2, Tier 3 & Tier 4 Test Specifications (`F7`–`F15`)

### 4.1 WebAudio Opaque-Box Spy Pattern (Zero Source Modification)
Inject via `context.addInitScript()` before `page.goto()` to verify `F12`, `F13`, `F15` deterministically:
```js
window.__AUDIO_SPY__ = { oscStarts: [], gainSets: [], contexts: [] };
const OrigAudioCtx = window.AudioContext || window.webkitAudioContext;
if (OrigAudioCtx) {
  const origCreateOsc = OrigAudioCtx.prototype.createOscillator;
  OrigAudioCtx.prototype.createOscillator = function () {
    if (!window.__AUDIO_SPY__.contexts.includes(this)) window.__AUDIO_SPY__.contexts.push(this);
    const osc = origCreateOsc.call(this);
    const origStart = osc.start.bind(osc);
    osc.start = function (when = 0) {
      window.__AUDIO_SPY__.oscStarts.push({
        type: osc.type,
        freq: osc.frequency.value,
        when,
        ctxTime: this.context.currentTime,
        wallMs: performance.now(),
      });
      return origStart(when);
    };
    return osc;
  };
}
```

---

### 4.2 Tier 1 — Feature Coverage Specifications (`>= 6` Cases per Feature `F7`–`F15` = `54` Assertions)

#### `F7`: Three Distinct Defense Towers & Target-Death Safety (`REQ-013`, `REQ-046`–`REQ-049`, `REQ-056`)
- **T1-F7-01 (`autocannon` rapid single-target hitscan & alternating recoil)**: Build `autocannon` on `pad_01`, spawn Wave 1, step `1.5s` (`0.05s` ticks). Assert exactly 1 enemy (`rover` farthest along road) takes damage per shot matching `max(2, round(damage * (1 - 0.08 * (1 - armorPierce))))`, `shotToggle >= 3`, and `barrelL`/`barrelR` alternate recoil offsets.
- **T1-F7-02 (`autocannon` turntable yaw tracking)**: Observe `autocannon` on `pad_03` as Wave 1 `rover` rounds the West U-bend (`s = 8m -> 20m`); assert `turretYaw.rotation.y` changes continuously to track `atan2(dx, dz)` within `0.38 rad` when firing.
- **T1-F7-03 (`mortar` parabolic flight & AoE splash damage)**: Build `mortar` on `pad_03`, step Wave 2 until `swarm` cluster enters range and Mortar fires (`mortarShells.length > 0`). Assert shell rises along parabolic `y > from.y + 1.5` before `t = duration/2` and on impact damages **`>= 2` clustered enemies** simultaneously (`100%` inner / `78%` outer splash).
- **T1-F7-04 (`mortar` armor-pierce superiority vs Heavy Drill)**: Compare single-hit HP loss on Wave 3 `drill` (`42%` armor) from `T1 mortar` (`46` dmg, `35%` pierce → `round(46 * (1 - 0.273)) = 33` dmg) vs `T1 autocannon` (`16` dmg, `5%` pierce → `round(16 * (1 - 0.399)) = 10` dmg).
- **T1-F7-05 (`magnetic` pre-pulse charge & timed slow application)**: Build `magnetic` on `pad_01`, step Wave 1 until `cooldown < 0.36` with `rover` in range (verify clamps flare `> 0.1 rad`), then step across pulse: assert `rover.slowRatio === 0.32`, `rover.slowTimer > 2.0`, `slowRing.visible === true`, and `rover` road progress over `1.0s` equals `2.25 * (1 - 0.32) * 1.0 = 1.53m` (`±0.08m`), recovering to `2.25 m/s` & `slowRing.visible === false` after `2.6s` out of range.
- **T1-F7-06 (Immediate target cancellation & single atomic kill payout)**: When a `rover` (`16G`) is killed by `autocannon` on `pad_01` while `pad_02`/`pad_03` also had range, assert `kills` increments by `+1` (never `+2`), `gold` increases by exact `+16G` (never `+32G`), and `targetEnemyId` on all towers immediately clears (`!== deadEnemy.id`) while the `0.34s` death collapse plays.

#### `F8`: 8 Waves, Enemies, Wave 4 Elite & Wave 8 Final Boss (`REQ-039`, `REQ-050`–`REQ-055`)
- **T1-F8-01 (8-wave campaign structure & titles)**: Verify `getSnapshot().totalWaves === 8`, Wave 1 starts at `1/8`, Wave 4 spawns `elite_drill` (`裂岩重钻长机`), Wave 7 spawns `2x elite_drill`, and Wave 8 spawns `boss_crawler` (`巨颚号`).
- **T1-F8-02 (Distinct locomotion & flying hover shadow)**: Spawn Wave 2 (`rover` + `swarm`) and Wave 3 (`drill`): assert `swarm` flies at `bodyGroup.position.y > 0.70` with height-modulated `shadowBlob.scale.x ∈ [0.72, 1.15]`, while `rover` (`y < 0.08`) rolls wheels and `drill` spins `drillHead.rotation.z`.
- **T1-F8-03 (Conditional enemy HP bars)**: On fresh spawn, assert undamaged `rover`, `swarm`, and `drill` have `rig.hpBarGroup.visible === false`; once damaged (`hp < maxHp`), `hpBarGroup.visible === true` and `hpFillMesh.scale.x` matches `hp / maxHp`; upon `hp === 0`, `hpBarGroup.visible === false`; meanwhile `elite_drill` and `boss_crawler` have `hpBarGroup.visible === true` immediately at spawn!
- **T1-F8-04 (Boss top HUD bar, Ground-Slam red telegraph & `2.2s` tower stun)**: Advance to Wave 8 Boss (`mode === 'playing'` after `boss_intro`), step until `snap.bossStatus.telegraphing === true`: assert `#boss-hud-bar` and `.boss-skill-warn` are visible in DOM, Boss speed halts (`ΔdistanceTraveled === 0` during `telegraphing`), and upon slam completion (`telegraphing -> false`), towers within `5.2m` have `stunTimer > 1.8s` (`selectedTower.isStunned === true`, `.stun-chip` `"震荡停机中"` rendered in `#tower-inspector`).
- **T1-F8-05 (Boss 3-stage breakaway armor plates)**: As Boss HP crosses `75%`, `50%`, and `25%`, assert `armorPlates[0]`, `[1]`, `[2]` sequentially set `visible === false` and Boss `armor` drops at each threshold.
- **T1-F8-06 (Boss interactive `weakPointCore` `1.25x` vulnerability & Wave 8 `+200G/+4💎` clear settlement — M2 `F8`)**: Verify Boss takes `>= 1.20x` bonus damage when dorsal armor breaks (`<=25%` HP) or during post-slam overheat window (`weakPointCore` emissive flare), AND when Boss dies on Wave 8, player receives BOTH Boss kill reward (`+260G / +5💎`) AND Wave 8 clear bonus (`+200G / +4💎`), while all straggler enemies on the road are cleanly removed (`hpBarGroup.visible === false`, `enemyGroup.children.length <= 1`).

#### `F9`: Economy, Sell Refund, Inter-Wave Prep, Speed/Pause & Numerical Balance (`REQ-012`, `REQ-041`–`REQ-045`)
- **T1-F9-01 (Initial HUD stats & live rolling counters)**: Fresh load displays `#val-beacon` `20/20`, `#val-gold` `260`, `#val-crystals` `0`, `#val-wave` `1/8`, `#val-kills` `0`.
- **T1-F9-02 (Build deduction & explicit `75%` sell refund across all 3 towers)**: Build `mortar` (`120G` -> `140G`), select it, verify `#btn-sell-tower` text explicitly contains `+90`, click `#btn-sell-tower`, verify `gold === 230` (`140 + 90`) and `pad_03` is free to rebuild immediately.
- **T1-F9-03 (Inter-wave prep & manual `#btn-start-wave` gate)**: After Wave 1 clears (`7` kills, `+45G`, `+1💎`), verify `waveInProgress === false`, zero Wave 2 enemies spawn even after `debugStepSimulation(10.0, false)`, and `#btn-start-wave` (`▶ 开始下一波 (2/8)`) is visible and clickable.
- **T1-F9-04 (`1x` vs `2x` simulation speed toggle)**: Click `#btn-speed` → text becomes `2x` (`snap.speedMultiplier === 2`, `.active-toggle` class). Measure `rover` road distance traveled in `1.0s` of `stepFrame` at `2x` (`4.50m`) vs `1x` (`2.25m`) — exact `2.0x` ratio!
- **T1-F9-05 (Pause modal freezes simulation & Resume restores seamlessly)**: Mid-Wave 1, click `#btn-pause` → `#pause-modal` appears (`snap.mode === 'paused'`). Record enemy `distanceTraveled` and tower `cooldown`, run `debugStepSimulation(3.0, false)`, assert `ΔdistanceTraveled === 0` and `Δcooldown === 0`. Click `#btn-resume` → `#pause-modal` closes (`mode === 'playing'`) and combat advances.
- **T1-F9-06 (Restart from Pause & Defeat cleanly resets all state)**: Mid-wave with towers built and Beacon damaged, click `#btn-pause` → `#btn-restart-pause`: assert `gold === 260`, `crystals === 0`, `beaconHp === 20`, `waveNumber === 1`, `kills === 0`, `towers.size === 0`, `enemies.length === 0`.

#### `F10`: Stage 1 Presentation — Prep & Deployment (`REQ-064`)
- **T1-F10-01 (Opening camera sweep from vista to base pose)**: On fresh load (`playIntro = true`), verify `snap.mode === 'opening'` initially, `camera.position` starts offset from `computeBaseCameraPose().pos` (`distance > 12m`), and converges smoothly to `computeBaseCameraPose().pos` (`distance < 0.05m`) when `mode === 'playing'` at `~1.75s`.
- **T1-F10-02 (Sequential 4-lamp Return Beacon ignition)**: Sample `env.beacon.statusLampMats[0..3].emissiveIntensity` during `opening`: starts at `0.05` and ignites sequentially (`lamp[0]` before `lamp[3]`) to `1.8`, with `coreMesh` reaching `1.35`.
- **T1-F10-03 (Periodic `4.2s` empty build pad hop)**: Step `elapsedStationTime` across a `4.2s` window in `0.1s` steps with empty pads; assert empty pads exhibit `group.position.y > 0.05` during their `0.38s` hop phase and return to `0`, while occupied pads stay strictly at `y === 0`.
- **T1-F10-04 (Concise 3-step onboarding progression)**: Verify `#onboarding-guide` starts with step 1 `.active` (`① 选择基座`), clicking `pad_03` advances to step 2 `.active` (`② 建造防御塔`), confirming build advances to step 3 `.active` (`③ 开始防守`), and clicking `#btn-start-wave` hides `#onboarding-guide` (`onboardingStep === 'done'`).
- **T1-F10-05 (3D ghost hologram preview & weapon-colored range ring)**: Click empty `pad_03`, click `#btn-card-mortar` once → assert `ghostPreviewActive === true`, `env.rangeRing.visible === true`, `env.rangeRing.scale.x === 6.4`, and `#btn-confirm-build` shows `建造 脉冲迫击炮 (-120)`.
- **T1-F10-06 (Eager tap during `opening` gracefully skips to `playing`)**: Reload page and immediately click `#btn-start-wave` (or call `selectPadOrTower('pad_03')`) while `mode === 'opening'`: assert `mode` transitions immediately to `'playing'`, all 4 Beacon status lamps snap to `emissiveIntensity === 1.8`, and `cameraOverride === null`.

#### `F11`: Stage 2 Presentation — Build, Non-Pausing T2/T3 & Pausing T4 Hero Reveal (`REQ-021`, `REQ-065`, `REQ-066`)
- **T1-F11-01 (Stage 2A 3-beat base-first build assembly on all 3 tower types including Magnetic)**: Build `autocannon`, `mortar`, and `magnetic`; verify at `t < 0.1s` `baseGroup.position.y > 0.5` & `turretYaw.scale.x < 0.5`, at `t ≈ 0.2s` dust ring spawns & `baseGroup` squashes (`scale.y < 0.9`), and by `t = 0.55s` `baseGroup.position.y === 0`, `turretYaw.scale.x === 1`, and `weaponPitch.children.length > 0` (verifying M1/M2 `F11` Magnetic emitter parenting!).
- **T1-F11-02 (Stage 2B T2 & T3 normal upgrades DO NOT pause active combat)**: During active Wave 2 combat, upgrade `pad_06` `autocannon` `T1 → T2` and `T2 → T3`: assert `snap.mode === 'playing'` throughout, and stepping `debugStepSimulation(0.3, false)` immediately advances living enemies (`ΔdistanceTraveled > 0.5m`).
- **T1-F11-03 (Stage 2B curved arc part fly-in, deferred tier color ignition & `#upgrade-stamp`)**: On `T1 → T2` upgrade, verify `tierGroups.t2.visible === true`, tier color ignition defers until `lockEnd` (`~0.6s` wall-clock, M2 `F3`), and `#upgrade-stamp` renders character-by-character `.stamp-char` (`标准战备` in `#3B82F6`) + `.delta-chip` (`▲+` stat deltas).
- **T1-F11-04 (Stage 2C T4 Legendary Reveal PAUSES combat simulation)**: During active combat with living enemies on road, upgrade a `T3` tower to `T4`: assert `snap.mode === 'legendary_reveal'`, and stepping `debugStepSimulation(1.0, false)` produces **`ΔdistanceTraveled === 0`** on all enemies and **`ΔbeaconHp === 0`**.
- **T1-F11-05 (Stage 2C Hero Spotlight, Golden Backdrop, Stamp & Camera Restore)**: During `legendary_reveal`, verify `env.legendaryBackdrop.visible === true`, `heroLight.intensity > 3.0`, `#upgrade-stamp.legendary` displays `传说·<塔名>` in `#F59E0B`, and upon completion (`~3.5s`), `mode === 'playing'`, `legendaryBackdrop.visible === false`, `heroLight.intensity === 0`, and `camera.position` returns cleanly to `computeBaseCameraPose().pos`.
- **T1-F11-06 (T4 max-tier plaque prevents T5 upgrade)**: Select a `T4` tower → verify `#legendary-max-badge` (`★ 传说机甲形态已完全解锁`) replaces `#btn-upgrade-tower`, `selectedTower.canUpgrade === false`, and `upgradeSelectedTower()` returns `false` without deducting gold.

#### `F12`: Stage 3 Presentation — Boss Charge, Silence & Shockwave Entrance (`REQ-067`)
- **T1-F12-01 (Wave 8 triggers `boss_intro` at Boss spawn threshold)**: Start Wave 8 and step `3.75s` → assert `snap.mode === 'boss_intro'` and `#banner-slot` shows `'高能震源警报 · 矿道坍塌'`.
- **T1-F12-02 (Mine Entrance camera pan, glowing fissures & rapid hazard rotors)**: During `boss_intro` (`t ≈ 0.6s`), verify `env.entrance.fissureGroup.visible === true`, `fissureMat.opacity > 0.2`, `hazardLampMats[0].emissiveIntensity >= 3.0`, and combat simulation is paused (`rover` escorts freeze during `boss_intro`).
- **T1-F12-03 (Inward suction particles & escalating tremor -> contraction at `1.35s`)**: Verify inward suction sparks (`inwardTarget !== null`) spawn during `0.38s..1.15s`, followed by fissure scale contraction (`fissureGroup.scale.x < 0.5`) around `1.35s–1.47s`.
- **T1-F12-04 (Rising ~1s pitch -> `~100ms` silence window -> `1.49s` shockwave slam audio — M2 `F12`)**: Inspect `window.__AUDIO_SPY__.oscStarts` during `boss_intro`: verify rising turbine oscillators (`85->640Hz`, `130->880Hz`) start at `~0.35s`, silence gap of **`>= 80ms`** precedes the heavy arrival slam (`110->28Hz` / `72->26Hz`), and `boss_crawler` spawns at `~1.49s`.
- **T1-F12-05 (`boss_intro` cleanly restores battle camera & `playing` mode)**: After `boss_intro` finishes (`~2.8s`), verify `mode === 'playing'`, `fissureGroup.visible === false`, `hazardLampMats[0].emissiveIntensity <= 0.7`, `#banner-slot` cleared, and `snap.bossStatus !== null`.
- **T1-F12-06 (Boss active skill hydraulic arm wind-up + crimson ground circle)**: During Boss ground-slam telegraph (`skillTelegraphTimer > 0`), verify `hydraulicArm.rotation.x < -0.2`, `vfx.bossWarningMesh.visible === true` (`scale.x === 10.4` for `5.2m` radius), and upon slam `bossWarningMesh.visible === false`.

#### `F13`: Stage 4 Presentation — Combat Climax & Boss Chain-Explosion Kill (`REQ-068`)
- **T1-F13-01 (Normal enemy hits use short flash/recoil/sparks WITHOUT slow-mo or energy pillars)**: Hit Wave 1 `rover` with `autocannon`: assert `hitFlashTimer <= 0.09s`, `hitRecoil > 0`, `hitStopTimer === 0`, `simTimeScale === 1.0`, and zero vertical pillar meshes (`CylinderGeometry` height `> 3m`) in `vfxScene`.
- **T1-F13-02 (Normal `rover`/`swarm` kills DO NOT trigger hit-stop or climax pillars)**: Kill all 7 Wave 1 `rover`s while sampling `hitStopTimer` every `0.05s`: assert `hitStopTimer === 0` throughout Wave 1.
- **T1-F13-03 (Wave 4 / Wave 7 Elite kill triggers `0.22s` hit-stop, climax burst & 3D armor debris)**: Step Wave 4 up to the tick `elite_drill` dies: assert `hitStopTimer > 0` (`<= 0.22s`), `hitStopScale === 0.24`, `debris3D.length >= 4` in `solidScene`, and `pickups3D` spawns both 3D coins and 3D crystals.
- **T1-F13-04 (Hit-stop recovers reliably to `1.0x`)**: Step `0.30s` (`6` ticks) after `elite_drill` death: assert `hitStopTimer === 0` and normal enemy speed resumes `100%`.
- **T1-F13-05 (Stage 4B Final Boss `0.2x` slow-mo & 3–4 staggered audible chain sub-explosions — M2 `F13` & `F15`)**: Upon reducing `boss_crawler` HP to `0`, assert `mode === 'victory_cinematic'`, `simTimeScale === 0.2` initially, and `window.__AUDIO_SPY__.oscStarts` records **`>= 3` staggered explosion bursts** across the Boss hull before final removal & `simTimeScale` restoration to `1.0`!
- **T1-F13-06 (Boss death spawns 8 3D Gold Coins + 5 3D Energy Crystals)**: Verify `pickups3D` spawns `>= 12` 3D loot meshes (`isCrystal: true` and `false`) upon Boss detonation.

#### `F14`: Stage 5 Presentation — Victory Sky-Beam, 3D Crate Drop & Interactive 3D Loot Fountain (`REQ-020`, `REQ-021`, `REQ-069`)
- **T1-F14-01 (Return Beacon skyward evacuation beam & fin unfold)**: During `victory_cinematic -> victory_panel`, assert `env.beacon.skyBeam.visible === true`, `skyBeam.material.opacity > 0.4`, and `signalFins[0].rotation.z < -0.30`.
- **T1-F14-02 (3D Armored Supply Crate drop, squash & plaza landing)**: Assert `env.supplyChest.group.visible === true`, `supplyChest.group.position.y === 0` by `victory_panel`, `#victory-screen` displays star rating (`★`), HP, kills, gold, crystals, and `#btn-claim-rewards` is enabled.
- **T1-F14-03 (Animated clasp pop-open trajectory + hinged lid swing — M2 `F14`)**: Click `#btn-claim-rewards`, sample `supplyChest` at `+120ms..+350ms`: assert `claspMesh` animates along an open pop trajectory (`claspMesh.position.z > 0.55` or `rotation.x !== 0` before settling, NOT instant frame-0 `visible=false`!) AND `lidPivot.rotation.x < -1.5` rad!
- **T1-F14-04 (Non-bleaching celebration VFX + real 3D Coins & Faceted Crystals fountain — M1/M2 `F5` & `F14`)**: At `+300ms` into `reward_claiming`, assert `pickups3D.length >= 12` (`8` 3D coins + `8` 3D crystals in `solidScene`), AND zero tall additive yellow cylinder (`tracers` with `CylinderGeometry` at `chestPos`) bleaches the chest!
- **T1-F14-05 (Exact `+320G / +8💎` reward settlement & persistent commendation)**: Once `mode === 'reward_claimed'`, assert `snap.gold === preClaimGold + 320`, `snap.crystals === preClaimCrystals + 8`, `#val-gold` text equals `String(snap.gold)`, `snap.rewardSummary.claimed === true`, and `Number(localStorage.getItem('lunar_beacon_commendations_v1')) >= 1`.
- **T1-F14-06 (`#btn-play-again` restarts full playable loop cleanly)**: Click `#btn-play-again`, step `0.05s` → assert `mode === 'playing'`, `skyBeam.visible === false`, `supplyChest.group.visible === false`, `claspMesh` & `lidPivot` reset (`lidPivot.rotation.x === 0`), `signalFins[0].rotation.z` reset (`-0.22`), `gold === 260`, `beaconHp === 20`, `waveNumber === 1`.

#### `F15`: Action-Synced Web Audio & Mute Toggle (`REQ-011`, `REQ-024`)
- **T1-F15-01 (`AudioContext` unlock & UI click / insufficient-gold SFX)**: Click empty pad (`__AUDIO_SPY__.contexts.length === 1`, oscillator fired); trigger insufficient gold (`40G` vs `90G` card) and verify dual low-frequency buzz (`210->145Hz` sawtooth + `165->118Hz` square).
- **T1-F15-02 (Stage 2A `playTowerBuildLand` synced to `t ≈ 0.16s` pad impact — M2 `F15`)**: Record `tClick = performance.now()`, click `#btn-confirm-build`, wait `250ms`: verify `playTowerBuildLand` (`145->44Hz` triangle) fires at **`tClick + 130ms..230ms`** (synced with `0.16s` base impact, NOT prematurely at `0ms`!).
- **T1-F15-03 (Distinct weapon & metallic armor hit SFX rate-limiting)**: Verify `autocannon` (`310->95Hz` sawtooth, `>=55ms` spacing), `mortar` launch (`165->62Hz`) + delayed impact (`128->36Hz` on shell arrival!), `magnetic` pulse (`260->520Hz` sine), and `drill` metallic clank (`1180->720Hz` triangle) all fire without throwing or exceeding rate limits.
- **T1-F15-04 (Beacon breach alarm & Defeat shutdown SFX — M2 `F15`)**: Let enemies breach the Return Beacon (`beaconHp: 20 -> 19` and `-> 0` Defeat): assert `__AUDIO_SPY__.oscStarts` increases BOTH on non-lethal Beacon damage (`playBeaconDamageAlarm`) AND on `mode = 'defeat'` (`playDefeatShutdown`), catching pre-M2's silent breach/defeat defect!
- **T1-F15-05 (Victory sky-beam ignition & Crate fanfare + loot chimes — M2 `F15`)**: During Stage 5A (`t ≈ 1.55s` beam ignition) and Stage 5B (`#btn-claim-rewards`), assert oscillators fire for beam ignition (`playVictoryBeamIgnite`), chest fanfare (`523..1046Hz` arpeggio), and distinct coin (`740->987Hz`) vs crystal (`880->1318Hz`) arrival chimes.
- **T1-F15-06 (HUD `#btn-mute` silences `masterGain` & suppresses new oscillators immediately)**: Toggle `#btn-mute` ON (`snap.muted === true`, `.muted-toggle` class, `VOLUME_OFF_SVG`): record `oscCount = __AUDIO_SPY__.oscStarts.length`, click pads / build tower / step combat, and assert `__AUDIO_SPY__.oscStarts.length === oscCount` (**zero** oscillators scheduled while muted!).

---

### 4.3 Tier 2 — Boundary & Corner Case Specifications (`>= 6` Cases per Feature `F7`–`F15` = `54` Assertions)

#### `F7` Corner Cases (Towers, Slow Cap, Sticky Refresh & Corpse Safety)
- **T2-F7-01 (4-Tower Magnetic overlap cap `<= 60%` — never freezes enemies)**: Build 4 `magnetic` towers (`pad_01`, `pad_03`, `pad_04`, `pad_05`) upgraded to `T4` (`60%` slow each), run Wave 3: assert for every enemy on every tick `enemy.slowRatio <= 0.6001` (`<= 0.3301` on Boss) and `distanceTraveled` strictly increases on every tick (`effSpeed >= 0.40 * baseSpeed`).
- **T2-F7-02 (Weaker T1 Magnetic MUST NOT perpetually extend stronger T4 `60%` slow — M2 `F7` regression test!)**: Build `T4 magnetic` (`60%` slow, `3.5s`) on `pad_01` and `T1 magnetic` (`32%` slow, `2.5s`, pulses every `1.35s`) on `pad_06`. Once a Wave 3 `drill` leaves `pad_01`'s `6.6m` range and enters `pad_06`'s `5.1m` range while still carrying `60%` slow, step `4.0s` (`> 3.5s`): assert `drill.slowRatio` decays from `0.60` down to **`0.32`** (NOT stuck at `0.60`!).
- **T2-F7-03 (Magnetic Boss boundary ring `[range + 0.60m, range + 0.65m]` — M2 `F7` regression test!)**: Position `magnetic` tower on `pad_02` (`4.32m` from road) or test `boss_crawler` right as it enters `stats.range + 0.64m`: when `fireMagneticTower` triggers (`cooldown` resets to `fireInterval`), assert `boss_crawler` actually receives damage and `slowRatio > 0` (zero whiffed pulses!).
- **T2-F7-04 (Mortar shell in-flight when primary target is killed by Autocannon)**: `mortar` launches `0.55s` parabolic shell at lead point of `rover_1`; `0.15s` later `autocannon` kills `rover_1` while `rover_2` trails `1.2m` behind. Assert shell does NOT vanish or veer back to `rover_1`'s corpse, lands cleanly at predicted ground `(x, z)`, damages living `rover_2`, and does NOT double-credit `rover_1`'s `16G`!
- **T2-F7-05 (Simultaneous multi-tower lethal hit on 1-HP enemy in same tick)**: Set up 2 `magnetic` towers pulsing on the exact same `0.05s` tick against a low-HP `swarm` (`hp <= 10`): assert `kills` increases by `+1` and `gold` increases by `+12G` (strictly atomic once).
- **T2-F7-06 (`previewOrBuildTower` mode guard outside `'playing'` — M2 `F7` regression test!)**: Pause game (`mode = 'paused'`) or enter `victory_panel` / `defeat` with an empty pad selected, and call `window.__LUNAR_BEACON_GAME__.previewOrBuildTower('autocannon', true)`: assert it returns `false` and `gold` / `towers.size` remain unchanged!

#### `F8` Corner Cases (Waves, Boss Stun, Armor Thresholds & Straggler Cleanup)
- **T2-F8-01 (One-shot multi-threshold Boss armor skip `>75% -> <20%` HP)**: Deal massive burst damage to `boss_crawler` crossing multiple `75% / 50% / 25%` thresholds rapidly; assert all crossed `armorPlates` hide cleanly without negative array index or `NaN` armor (`armor >= 0.12`).
- **T2-F8-02 (Boss killed MID-Ground-Slam `1.25s` telegraph wind-up)**: Focus heavy T4 fire to kill `boss_crawler` while `bossStatus.telegraphing === true` (`skillTelegraphTimer > 0`): assert `bossWarningMesh.visible` immediately resets to `false`, zero towers get stunned post-mortem, and `#boss-hud-bar` / `.boss-skill-warn` disappear cleanly!
- **T2-F8-03 (Boss Ground-Slam `2.2s` stun hits ALL 3 tower types & recovers cleanly)**: Place `autocannon` (`pad_01`), `mortar` (`pad_03`), and `magnetic` (`pad_04`) within `5.2m` of Boss's first slam (`s ≈ 5.5m`): assert ALL 3 tower types receive `stunTimer === 2.2`, cease firing for `2.2s` (`weaponPitch.rotation.x === 0.22`), and all 3 resume firing automatically once `2.25s` of combat passes!
- **T2-F8-04 (Wave 8 Boss killed while `swarm` & `drill` stragglers are still alive mid-road — M2 `F8` regression test!)**: Kill `boss_crawler` at `waveElapsed ≈ 14s` while Wave 8 `swarm`/`drill` units are mid-road with damaged HP bars & purple slow rings: once `victory_panel` appears, assert **`0` straggler HP bars or slow rings remain visible** and `enemies.length === 0`!
- **T2-F8-05 (Boss reaching Return Beacon deals `20` Beacon damage = instant Defeat from full HP)**: Spawn Wave 8 with `0` towers (`beaconHp = 20`), let `boss_crawler` reach `TOTAL_ROAD_LENGTH`: assert single breach reduces `beaconHp` from `20` (or remaining HP) to `0`, immediately triggering `mode === 'defeat'` without continuing to process trailing enemies.
- **T2-F8-06 (Minimum `2` damage floor against high-armor Elite/Boss)**: Hit `elite_drill` (`48%` armor) or `boss_crawler` with lowest-damage `T1 magnetic` (`14` dmg) even under artificial high armor: assert `finalDamage >= 2` (`hp` always strictly decreases on every hit).

#### `F9` Corner Cases (Exact Zero Gold, Insufficient Gold, Sell Rounding & Rapid Speed/Pause)
- **T2-F9-01 (Exact `0G` balance boundary)**: From `260G`, build `mortar` (`120G`) + `mortar` (`120G`) = `20G`, sell one (`+90G` -> `110G`), upgrade the other (`-140G` blocked -> instead from `260G` build `mortar` `120G` + `Upgrade T2` `140G` = **exact `0G`**!). Assert `snap.gold === 0`, `#val-gold` displays `'0'`, and all 3 build cards on an empty pad have class `.unaffordable`.
- **T2-F9-02 (Insufficient gold off-by-few-gold toast & disabled confirm)**: With `40G` (`260 - 120 - 100`), click empty `pad_01` → click `#btn-card-autocannon` (`90G`): assert `#btn-confirm-build` has `disabled === true`, `#insufficient-toast` displays exact deficit (`还差 50`), `#pill-gold` gets `.shake-warn`, and clicking `#btn-confirm-build` via `dispatchEvent` does NOT deduct gold or build.
- **T2-F9-03 (Cumulative `75%` sell refund `Math.round` precision on odd totals)**: Build `autocannon` (`90G`, `90 * 0.75 = 67.5 -> 68G`) and `magnetic` T2 (`215G`, `215 * 0.75 = 161.25 -> 161G`): assert `#btn-sell-tower` text (`+68` / `+161`) matches actual credited `gold` to the exact integer (`0` rounding drift!).
- **T2-F9-04 (Selling a tower mid-wave & immediately rebuilding a different tower type on the SAME pad)**: During active Wave 2 on `pad_06`, sell `autocannon`, immediately re-select `pad_06`, preview & build `mortar`: assert old 3D rig is removed from `towerGroup`, new `mortar` rig spawns at `(3.1, 0.14, -0.4)` with `tier === 1`, and acquires targets immediately!
- **T2-F9-05 (Spam-clicking `#btn-start-wave` during active wave or after Wave 8)**: While `waveInProgress === true`, verify `#btn-start-wave` is absent from DOM AND calling `startNextWave()` programmatically returns `false` without resetting `waveElapsed` or duplicating spawns.
- **T2-F9-06 (Rapid `1x <-> 2x` speed & `Pause <-> Resume` toggling 10x in a row)**: Rapidly click `#btn-speed` 10 times and `#btn-pause` / `#btn-resume` 5 cycles mid-wave: assert zero console errors, `speedMultiplier === 1` after even clicks, and simulation state remains consistent.

#### `F10` Corner Cases (Selection Deselect, Ghost Switching & Opening Interrupts)
- **T2-F10-01 (Switching ghost preview `autocannon -> mortar -> magnetic` on same pad without building)**: Click `pad_03`, click all 3 `.tower-mini-card` buttons sequentially: assert `ghostGroup.children.length === 1` (never leaks stacked ghost meshes!), `rangeRing.scale.x` updates `5.4 -> 6.4 -> 5.1`, and `gold` remains `260`.
- **T2-F10-02 (Switching directly from empty pad preview `pad_03` to occupied tower `pad_06`)**: Preview `mortar` on `pad_03` (`ghostPreviewActive === true`), close tray, click built tower on `pad_06`: assert `ghostPreviewActive === false`, `#build-tray` switches cleanly to `#tower-inspector`, and `rangeRing` moves to `pad_06`.
- **T2-F10-03 (Blank-sky canvas tap `(720, 120)` deselects both empty pad and built tower)**: Assert `selectedPadId === null`, `previewTowerType === null`, `ghostPreviewActive === false`, `selectRing.visible === false`, `rangeRing.visible === false`, and `#tray-slot` is empty.
- **T2-F10-04 (Pointer drag `> 14px` on canvas is ignored as pan/cancel, NOT accidental pad tap)**: `mouse.move(pt.x - 10, pt.y)` → `mouse.down()` → `mouse.move(pt.x + 12, pt.y)` (`hypot = 22 > 14`) → `mouse.up()`: assert `selectedPadId === null` ([`GameEngine.ts:1463`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1463)).
- **T2-F10-05 (`#onboarding-guide` stays `'done'` across Restart / Play Again in same session)**: Complete onboarding (`startNextWave` → `onboardingStep === 'done'`), then Restart via Pause menu: assert `#onboarding-guide` does NOT Nag-reappear (`onboardingStep === 'done'`, [`GameEngine.ts:355`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L355)).
- **T2-F10-06 (`selectPadOrTower` ignored during locked cinematics `legendary_reveal`, `boss_intro`, `victory_cinematic`)**: Trigger `boss_intro` (or `legendary_reveal`), attempt canvas click on `pad_03`: assert `selectedPadId === null` and `#build-tray` stays hidden.

#### `F11` Corner Cases (Rapid Re-Upgrades, Flap Hinge Axes & Mid-Reveal Interrupts)
- **T2-F11-01 (Rapid consecutive upgrades `T1 -> T2 -> T3 -> T4` on the SAME tower within `<150ms` — M2 `F11` regression test!)**: With sufficient natural wave gold (e.g., Wave 7 inter-wave `900G`), build `autocannon` and rapidly click `#btn-upgrade-tower` 3 times (`T1->T2->T3->T4`): assert earlier `T2`/`T3` timelines are canceled cleanly without clobbering `turretYaw.position.y`, `#upgrade-stamp.legendary` shows `传说·联装机炮` (NOT overwritten by stale `标准战备`/`精英模块`!), and final `root.scale` settles to `(1, 1, 1)`.
- **T2-F11-02 (T4 Hero Reveal `hingedFlaps` rotate on their true mechanical axis `'x'` / `'y'` / `'z'` — M1/M2 `F4` & `F11` regression test!)**: Inspect `rig.hingedFlaps` on T4 `autocannon` (`hingeAxis === 'x'`), T4 `mortar` (`hingeAxis === 'y'`), and T4 `magnetic` (`hingeAxis === 'z'`): during Stage 2C reveal (`climaxAt + 0.2s`), assert Mortar doors rotate around `y` (`rotation.x === 0`) and Magnetic petals rotate around `z` (`rotation.x === 0`), never clipping through the chassis!
- **T2-F11-03 (Upgrading an unaffordable `locked` `#btn-upgrade-tower` button)**: Select `T1 mortar` when `gold < 140`: assert `#btn-upgrade-tower` has `.locked` and `data-affordable="0"`, and clicking it triggers `#insufficient-toast` (`还差 ...`) while keeping `tier === 1` and `gold` unchanged.
- **T2-F11-04 (`#btn-pause` clicked DURING `legendary_reveal` is safely ignored)**: During `mode === 'legendary_reveal'`, click `#btn-pause`: assert `mode` stays `'legendary_reveal'` (does NOT corrupt reveal timeline into stuck `'paused'` camera override!) and cleanly finishes into `'playing'`.
- **T2-F11-05 (Selling a tower immediately while its Stage 2B `T2` arc-upgrade animation is mid-flight)**: Click `#btn-upgrade-tower` (`T1 -> T2`) and `100ms` later click `#btn-sell-tower`: assert zero uncaught GSAP errors, tower mesh is removed from `towerGroup`, and `75%` of `T1 + T2` cumulative cost (`195G` on Mortar) is refunded!
- **T2-F11-06 (`startNewMission(false)` mid-`legendary_reveal` resets spotlight, backdrop & camera)**: Trigger `T4` upgrade (`heroLight.intensity > 0`, `legendaryBackdrop.visible === true`), call `startNewMission(false)` + `debugStepSimulation(0.05, false)`: assert `heroLight.intensity === 0`, `legendaryBackdrop.visible === false`, `cameraOverride === null`, and `mode === 'playing'`.

#### `F12` Corner Cases (Boss Entrance Interrupts, Edge Boundaries & Single-Trigger Guard)
- **T2-F12-01 (`boss_intro` plays AT MOST ONCE on Wave 8)**: Verify `bossIntroPlayedForWave` prevents re-triggering `boss_intro` on subsequent Wave 8 ticks after `mode` returns to `'playing'`.
- **T2-F12-02 (`#btn-pause` clicked DURING `boss_intro` is ignored safely)**: Click `#btn-pause` while `mode === 'boss_intro'`: assert `mode` stays `'boss_intro'` and transitions cleanly to `'playing'` at `~2.8s`.
- **T2-F12-03 (`startNewMission(false)` mid-`boss_intro` resets hazard lamps & fissures — Survey Defect C check!)**: Trigger `boss_intro`, wait `0.6s` (`fissureGroup.visible === true`, `hazardLampMats[0].emissiveIntensity >= 3.0`), then call `startNewMission(false)`: assert `fissureGroup.visible === false`, `hazardLampMats[0].emissiveIntensity <= 0.7`, `#banner-slot` is empty, and `boss_crawler` does NOT spawn into the new Wave 1 mission!
- **T2-F12-04 (Boss Ground-Slam boundary guard near spawn `< 4.0m` & near Beacon `> TOTAL_ROAD_LENGTH - 4.0m`)**: Verify Boss never starts `skillTelegraphTimer` when `distanceTraveled <= 4.0` or `>= 37.58m` ([`GameEngine.ts:974`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L974)).
- **T2-F12-05 (Wave 8 early Rovers paused cleanly during `boss_intro`)**: Wave 8 spawns `rover`s at `0.20s, 1.05s, 1.90s, 2.75s, 3.60s` before `boss_intro` at `3.695s`. Record those `rover`s' `distanceTraveled` upon entering `boss_intro`, step `debugStepSimulation(1.0, false)` during `boss_intro`, and assert `ΔdistanceTraveled === 0` until `boss_intro` completes!
- **T2-F12-06 (Towers just outside `5.2m` Boss slam radius `[> 5.25m]` are NOT stunned)**: Verify towers at `hypot(dx, dz) > 5.25m` from Boss slam coordinate retain `stunTimer === 0` and continue firing uninterrupted while inner towers (`<= 5.2m`) are stunned.

#### `F13` Corner Cases (Double-Elite Wave 7 Hit-Stop, `2x` Speed Climax & Transient Cleanup)
- **T2-F13-01 (Wave 7 dual `elite_drill` consecutive kills)**: Kill both Wave 7 Elites in quick succession: verify `hitStopTimer` clamps via `Math.max(hitStopTimer, 0.22)` without sticking below `1.0x` once `0.25s` passes after the 2nd Elite dies.
- **T2-F13-02 (T4 upgrade immediately after Elite kill clears stray flashes)**: Kill an Elite (`tracers`/`sparks` active) and trigger `T4` upgrade: verify `clearCombatTransients()` empties `vfx.tracers` and `vfx.sparks` before opening the clean Hero Reveal stage ([`GameEngine.ts:535`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L535)).
- **T2-F13-03 (Boss killed while `speedMultiplier === 2`)**: Defeat `boss_crawler` with `2x` speed active: assert Stage 4B chain-explosion timeline still runs at smooth `1.0x` wall-clock cadence (`victory_panel` reached at `~2.45s`), `simTimeScale` resets to `1.0`, and `0` errors occur.
- **T2-F13-04 (`debris3D` & `sparks` disposal after climax)**: Step `1.0s` `realDt` after an Elite kill climax burst: assert `vfx.debris3D.length === 0`, `vfx.tracers.length === 0`, and `vfx.rings.length === 0` (zero lingering geometry obscuring the road, `REQ-007`!).
- **T2-F13-05 (Enemy killed by DoT/AoE Mortar shell after Mortar tower was sold mid-flight)**: Launch Mortar shell at low-HP `rover`, immediately sell the Mortar tower (`pad_03` deleted from `towers`), then step `0.7s` for shell impact: assert `rover` still dies cleanly, grants `+16G` & `+1` kill without throwing on detached `sourceTower`!
- **T2-F13-06 (Camera shake decays strictly to exact `(0, 0, 0)`)**: After Boss death shake (`0.42`), step `0.5s` after `victory_panel` settles and assert `cinematics.shakeIntensity === 0`.

#### `F14` Corner Cases (Double-Claim Prevention, Direct 3D Chest Tap, Star Boundaries & Replay)
- **T2-F14-01 (Prevent double-claiming Stage 5 Supply Crate)**: Click `#btn-claim-rewards` AND immediately invoke `claimVictoryRewards()` 3 more times during `reward_claiming` and `reward_claimed`: assert `gold` increases by **exact `+320G` once** (never `+640G`!) and `crystals` by **exact `+8💎` once**!
- **T2-F14-02 (Direct 3D canvas tap on the Supply Chest opens rewards without clicking `#btn-claim-rewards`!)**: On `victory_panel`, project `env.supplyChest.group.position` to screen coordinates and click the `<canvas>` directly (avoiding `#victory-screen` card): assert `mode` transitions `victory_panel -> reward_claiming -> reward_claimed` and grants `+320G / +8💎` ([`GameEngine.ts:1485-1491`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L1485-L1491))!
- **T2-F14-03 (Star rating boundary values `20`, `18`, `17`, `10`, `9`, `1` HP)**: Verify `getSnapshot().rewardSummary.stars` equals `3` at `18..20` HP, `2` at `10..17` HP, and `1` at `1..9` HP (`#victory-screen .victory-stars` renders `★★★`, `★★☆`, `★☆☆`).
- **T2-F14-04 (`#btn-claim-rewards` disabled state during `reward_claiming`)**: At `+100ms` after clicking `#btn-claim-rewards`, assert `snap.mode === 'reward_claiming'` and `#btn-claim-rewards` has `disabled === true` (`正在开启3D补给箱...`).
- **T2-F14-05 (Multi-run commendation counter increments persistently `1 -> 2`)**: Seed `localStorage.setItem('lunar_beacon_commendations_v1', '2')`, reload page, complete Stage 5B reward claim, and assert `.commendation-note` displays `3 枚` and `localStorage` stores `'3'`.
- **T2-F14-06 (Stage 5 replay resets `claspMesh` visibility/transform & `innerGlow` opacity)**: After claiming chest (`lidPivot.rotation.x = -2.05`, `innerGlow` lit) and clicking `#btn-play-again`, win a 2nd time to `victory_panel`: assert `supplyChest.claspMesh.visible === true` and `lidPivot.rotation.x === 0` before claiming the 2nd crate!

#### `F15` Corner Cases (Mute Persistence Across All Restarts/Reloads & Sandbox Storage Safety)
- **T2-F15-01 (Mute persists across Pause -> Restart, Defeat -> Retry, and Victory -> Play Again)**: Enable Mute (`#btn-mute` -> `muted === true`), trigger Pause -> `#btn-restart-pause`, verify `snap.muted === true` & `.muted-toggle` active; trigger Defeat -> `#btn-retry-defeat`, verify `snap.muted === true`.
- **T2-F15-02 (Mute persists across full browser `page.reload()`)**: With `muted === true` (`localStorage['lunar_beacon_td_muted_v2'] === '1'`), call `await page.reload({ waitUntil: 'networkidle' })`: assert initial `getSnapshot().muted === true`, `#btn-mute` shows `VOLUME_OFF_SVG`, and Stage 1 `playBeaconLampBoot` fires `0` oscillators!
- **T2-F15-03 (Unmuting mid-combat immediately restores WebAudio SFX without page reload)**: Start muted (`0` oscillators during Wave 1 start), click `#btn-mute` (`muted === false`), step `0.5s` of Autocannon combat: assert `__AUDIO_SPY__.oscStarts.length > 0` immediately!
- **T2-F15-04 (Rate-limiter anti-clipping under extreme multi-tower fire)**: Build 5 `autocannon` towers firing simultaneously in the same `0.05s` tick (`< 55ms` wall-clock): assert `canPlayRateLimited('ac', 55)` caps `playAutocannonShot` to `1` oscillator burst per `55ms` window (zero audio distortion/clipping).
- **T2-F15-05 (Sandboxed null-origin `localStorage` SecurityError graceful fallback)**: In a `sandbox="allow-scripts"` iframe (where `localStorage.getItem`/`setItem` throws `SecurityError`), click `#btn-mute` twice: assert zero uncaught exceptions, `snap.muted` toggles `false -> true -> false` cleanly in memory!
- **T2-F15-06 (Mortar audio silent if mission restarts BEFORE in-flight shell lands)**: Launch Mortar shell (`0.6s` flight), immediately call `startNewMission(false)` (`vfx.clearAll()`), step `1.0s`: assert `playMortarImpact` (`128->36Hz`) does NOT fire for the cleared shell!

---

### 4.4 Tier 3 — Cross-Feature Pairwise Interaction Cases (`16` Gameplay/Combat/Cinematics/Audio Pairwise Specs)
1. **PW-01 (`F7 Mortar Parabolic Shell` × `F9 Pause/Resume`)**: Launch Mortar shell (`mortarShells.length === 1`, `u ≈ 0.4`), click `#btn-pause`, step `debugStepSimulation(2.0, false)` → assert shell remains frozen mid-air (`mortarShells.length === 1`, zero impact damage while paused); click `#btn-resume`, step `0.5s` → assert shell completes parabola and deals AoE splash damage!
2. **PW-02 (`F7 Mortar Parabolic Shell` × `F11 Stage 2C T4 Legendary Reveal`)**: Launch Mortar shell mid-Wave 6, immediately upgrade another tower to `T4` (`mode = 'legendary_reveal'`): assert in-flight Mortar shell pauses (`dt = 0` in `vfx.update(0, rawDt)`) throughout the golden reveal and lands cleanly once `mode` returns to `'playing'`!
3. **PW-03 (`F7 Magnetic Slow` × `F7 Mortar Predictive Road Lead`)**: Slow a fast `swarm` (`3.75 m/s` -> `1.875 m/s` at `50%` T3 Magnetic slow) before `mortar` fires: verify `mortar`'s `0.35s` road-lead (`baseSpeed * (1 - slowRatio) * 0.35`) lands squarely on the slowed `swarm` and scores a `100%` inner-radius hit!
4. **PW-04 (`F8 Boss Ground-Slam 2.2s Stun` × `F11 Inspector UI & Upgrade`)**: While a `T2` tower on `pad_03` is stunned (`isStunned === true`, `.stun-chip` visible in `#tower-inspector`), upgrade it to `T3` via `#btn-upgrade-tower`: assert upgrade succeeds (`tier === 3`), `.stun-chip` remains accurate until `stunTimer` expires, and once `stunTimer === 0` it fires with `T3` stats!
5. **PW-05 (`F8 Boss Dorsal Armor Break + Weakpoint` × `F7 High-Pierce Mortar vs Low-Pierce Autocannon`)**: Compare effective damage escalation on `boss_crawler` from `100%` HP (`45%` armor) down to `<25%` HP (`15%` armor + M2 `1.25x` `weakPointCore` vulnerability): verify `autocannon` damage jumps dramatically as plates shatter and weakpoint exposes!
6. **PW-06 (`F9 2x Speed Toggle` × `F11 Stage 2B Non-Pausing T2/T3 Upgrade`)**: Enable `2x` speed during active Wave 3, trigger `T2` upgrade on `pad_03`: assert combat runs at `2x` without pausing while GSAP arc assembly & `#upgrade-stamp` complete cleanly with zero visual/state desync.
7. **PW-07 (`F9 Sell & Rebuild Mid-Wave` × `F8 Active Target Retargeting`)**: Sell the primary tower currently locking onto `elite_drill` mid-Wave 4 (`#btn-sell-tower`), immediately build a different archetype on the same pad using the `+75%` refund: assert zero orphaned lasers/shells and immediate lock acquisition on `elite_drill`.
8. **PW-08 (`F15 Mute Toggle` × `F11 Stage 2C T4 Reveal` & `F12 Stage 3 Boss Intro`)**: Enable `#btn-mute` (`muted === true`), trigger a `T4` Legendary Reveal AND Wave 8 `boss_intro`: assert all visual choreography (`legendaryBackdrop`, `fissureGroup`, `#upgrade-stamp.legendary`, `#boss-hud-bar`) completes 100% identically while `__AUDIO_SPY__` records `0` oscillators.
9. **PW-09 (`F8 Wave 4 Elite Kill Hit-Stop` × `F9 Pause/Resume Mid-Hit-Stop`)**: Pause the game during the `0.22s` `hitStopTimer` window right after `elite_drill` dies, then Resume and step `0.3s`: assert `hitStopTimer` finishes decaying to `0` and simulation does NOT get stuck at `0.24x` slow-mo!
10. **PW-10 (`F10 Ghost Preview + Range Ring` × `F9 Wave Start Auto-Deselect`)**: Open `#build-tray` and preview `mortar` (`ghostPreviewActive === true`, `rangeRing.visible === true`) on empty `pad_02`, then click `#btn-start-wave` directly: assert `startNextWave()` auto-clears the empty-pad ghost preview & `#build-tray` ([`GameEngine.ts:596-600`](file:///home/antigravity/GOD-OF-PPT/tdk/src/game/GameEngine.ts#L596-L600)) while keeping built-tower selections intact if a built tower was selected!
11. **PW-11 (`F14 Stage 5 Victory Panel` × `F16 Mobile Portrait 390x844 Camera & Card Fit` — M2 `F14`/`F16`)**: Reach `victory_panel` on `390x844` portrait viewport: assert BOTH `getBeaconScreenCoordinates()` and projected `supplyChest` sit inside horizontal bounds `[8, 382]` above `#victory-screen` (catching pre-M2 Defect D5 portrait Stage 5 clipping!), and `#btn-claim-rewards` is clickable via `mPage.tap()`.
12. **PW-12 (`F11 Stage 2C T4 Hero Reveal` × `F16 Mobile Portrait 390x844 Framing` — M2 `F11`)**: Trigger `T4` upgrade on `pad_01` (leftmost pad) on `390x844` portrait: assert protagonist tower projects cleanly inside `[20, 370] × [80, 760]` during `legendary_reveal` without horizontal clipping.
13. **PW-13 (`F6 #1A1033 Outline Layer Isolation` × `F7 Combat VFX Rings/Shells` & `F8 HP Bars/Slow Rings`)**: During active combat with purple `slowRing`, cyan Mortar `rings`, and damaged enemy `hpBarGroup` visible, verify Layer-1 / `vfxScene` meshes are excluded from Pass-1 normal/depth outline target (`layers === 1` or parented in `vfxScene`).
14. **PW-14 (`F9 4-Digit Gold & 3-Digit Kills` × `F16 Narrow Mobile <=360px Top-Bar Fit` — M2 `F16`)**: On `360x800` viewport at Wave 8 (`gold >= 1000`, `kills >= 125`), assert `#hud-top-bar` has zero horizontal overflow (`scrollWidth <= 360`) and `#btn-pause` right edge `<= 360`!
15. **PW-15 (`F17 Sandboxed <agent-embed> Iframe` × `F9/F15 Full Interactive Build + Mute + Combat`)**: Inside `<iframe sandbox="allow-scripts" style="width:100%;height:0px" srcdoc="...">` (`starforge_ark_cradle.html`), verify `#app` auto-expands to `580px`, click `#btn-fullscreen` fallback (`expanded-embed` -> `740px`), toggle `#btn-mute`, build a tower via canvas click, and clear Wave 1 with `0` network requests and `0` errors!
16. **PW-16 (`F4 Pause-Safe Mortar Bay Doors & Idle Breathing` × `F9 Pause` — M1/M2 `F4`)**: Fire T4 `mortar` (opening rear capacitor bay doors) and immediately click `#btn-pause`; wait `350ms` wall-clock while paused: assert Mortar bay doors stay frozen at their paused angle (NOT snapped shut by an unpaused `setTimeout`, catching pre-M2 Defect D2!) and ease shut cleanly once Resumed!

---

### 4.5 Tier 4 — Real-World End-to-End Scenarios (`Scenarios 4.1` – `4.9`)
| Scenario ID | Title | Viewport / Surface | Full Closed-Loop Steps & Key Opaque-Box Assertions |
|---|---|---|---|
| **Scenario 4.1** | **Zero-Cheat 8-Wave Natural-Economy Campaign + All 5 Stages + Replay** | Desktop `1440x900` (`:5173`) | Full Stage 1 opening → 3-step onboarding → 17-step adaptive build/upgrade queue (`mortar` + `autocannon` + `magnetic`, T1→T2→T3→2x T4 Legendary Reveals, **ZERO `debugAddGold`**) → Wave 4 & 7 Elite kills → Wave 8 Stage 3 `boss_intro` → Boss Ground-Slam stun & weakpoint break → Stage 4B chain-explosion kill + Wave 8 `+200G/+4💎` bonus + 0 frozen stragglers → Stage 5A Beacon sky-beam + 3D Crate drop → Stage 5B `#btn-claim-rewards` clasp pop + 3D coin/crystal fountain (`+320G / +8💎`) → `#btn-play-again` clean reset (`0` console/page errors). |
| **Scenario 4.2** | **Single-Tower AFK & Maxed-T4 Solo Balance Guard** | `640x420` fast sim (`:5173`) | **(A)** `1x T1 autocannon` on `pad_01` clears Wave 1 (`waveNumber === 2`, `beaconHp === 20`) and fails by Wave 3–4 (`mode === 'defeat'`). **(B)** Fresh run building ONLY `1x autocannon` on `pad_06` (and repeated on `pad_03`) upgraded naturally to `T4` MUST fail before clearing Wave 8 (`mode === 'defeat'`, `#defeat-modal` visible — catches pre-M2 solo exploit!). |
| **Scenario 4.3** | **Defeat Breach, Alarm Audio & Full Retry Recovery** | `640x420` (`:5173`) | Start Wave 1 -> let Rovers damage Beacon (`playBeaconDamageAlarm` fires, `#val-beacon` updates) -> continue until `beaconHp === 0` (`mode === 'defeat'`, `playDefeatShutdown` fires, `#defeat-modal` shows wave & kills) -> click `#btn-retry-defeat` -> step `0.05s` -> build `mortar` + `autocannon` and clear Wave 1 cleanly (`20/20` HP). |
| **Scenario 4.4** | **Mobile Portrait `390x844` Touch Playable Loop & Stage 5 Portrait Framing** | `390x844` (`isMobile: true, hasTouch: true, dpr: 2`) | Verify Entrance & Return Beacon both fit inside `[8, 382]` (`M2 F16`) -> `touchscreen.tap` `pad_03` -> `tap('#btn-card-mortar')` -> `tap('#btn-confirm-build')` -> `tap('#btn-start-wave')` -> clear Wave 1 -> verify Stage 2C T4 reveal & Stage 5 Victory camera frame both 3D Crate & Return Beacon cleanly above `#victory-screen` on portrait! |
| **Scenario 4.5** | **Standalone Offline `starforge_ark_cradle.html` `<agent-embed>` (`0px`-Init) Playable Loop** | Null-origin `sandbox="allow-scripts"` iframe (`height: 0px` init) | Load `starforge_ark_cradle.html` via `srcdoc` with all external network requests blocked/monitored (`0` external requests): assert `scrollHeight === 580` (`> 0px`, zero collapse!), `#btn-fullscreen` expands to `740px`, build towers, toggle mute (`localStorage` fallback safe), clear Wave 1! |
| **Scenario 4.6** | **IDE Side-Pane / `:5173` Bookmark Host-Sized Iframe (`1200x920`) Full-Height Verification** | `<iframe style="width:1200px;height:920px">` (`M2 F17`) | Mount `:5173` AND `starforge_ark_cradle.html` inside a `1200x920` host-sized preview iframe: assert `#app` fills the full `920px` pane height (`rect.height >= 900`, NOT clamped at `580px` — catches pre-M2 Defect EC-02!), and canvas raycasting clicks pads accurately! |
| **Scenario 4.7** | **Tactical Mid-Wave Sell, Redeploy, Pause-Mid-Shell & `2x` Combat Stress** | `640x420` (`:5173`) | Build on `pad_02` & `pad_04`, start Wave 3 at `2x` speed, pause while Mortar shell is mid-flight, resume, sell both towers mid-wave (`+75%` refund), redeploy onto `pad_03` + `pad_06`, upgrade mid-combat (`Stage 2B`), and clear Wave 3 with `0` leaks! |
| **Scenario 4.8** | **Multi-Magnetic Slow Matrix + Boss Ground-Slam Stun & Weakpoint Showdown** | `640x420` (`:5173`) | Deploy `T4 magnetic` (`pad_01`) + `T1 magnetic` (`pad_06`) + `T4 mortar` (`pad_03`) + `T4 autocannon` (`pad_08`): verify `<=60%` slow cap, T4→T1 slow decay (`60% -> 32%`), Boss `5.2m` `2.2s` stun + recovery, 3 armor breaks, `1.25x` weakpoint vulnerability, and direct 3D canvas tap on the Supply Chest to claim rewards! |
| **Scenario 4.9** | **Multi-Mission Persistence, Memory/VFX Cleanliness & Narrow `360x800` HUD Audit** | `360x800` -> `960x600` resize (`:5173`) | Toggle Mute ON → complete Wave 1 → Pause Restart → verify Mute persisted (`muted === true`) & `towerGroup.children.length === 0` / `enemyGroup.children.length === 0` → resize `360x800 <-> 1440x900` mid-wave checking `.hud-top-bar` zero-overflow (`scrollWidth <= clientWidth`) and `1.5x` supersampled `<canvas>` buffer (`canvas.width === Math.round(clientWidth * 1.5)`, M1 `Contract 3`). |
