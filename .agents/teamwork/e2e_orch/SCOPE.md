# E2E Track Scope (`e2e-test-suite`)

## Deliverables Checklist
- [ ] `TEST_INFRA.md` in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/`
- [ ] `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` supporting `--tier=1|2|3|4|all` CLI flags and `process.env.E2E_URL`
- [ ] **Tier 1 — Feature Coverage**: `>= 5` assertions/cases per feature area (`F1`–`F18`), `>= 90` total Tier 1 checks
- [ ] **Tier 2 — Boundary & Corner Cases**: `>= 5` assertions/cases per feature area (`F1`–`F18`), `>= 90` total Tier 2 checks
- [ ] **Tier 3 — Cross-Feature Pairwise Combinations**: `>= 20` pairwise interaction cases
- [ ] **Tier 4 — Real-World End-to-End Application Scenarios**: `>= 9` full E2E scenarios (including Scenario 4.1 Zero-Cheat 8-Wave Campaign + Stage 5 Loot + Play Again, Scenario 4.2 Single-Tower T4 AFK Balance Guard, Scenario 4.3 Defeat & Retry Recovery, Scenario 4.4 Mobile Portrait `390x844` Touch Playable Loop & Stage 5 Framing, Scenario 4.5 Offline `starforge_ark_cradle.html` Playable Loop, plus `>= 4` additional stress/iframe/replay scenarios)
- [ ] Execution budget `< 90s` across all tiers, structured per-tier console pass/fail summary, exit `0` when all pass and `1` when any game defect fails, zero harness crashes or flaky timing bugs
- [ ] `TEST_READY.md` in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/`
- [ ] Full 2B Gate (`GATE_STATUS.md`): 2 Reviewers (`APPROVE`) + 2 Challengers (`APPROVE`/`PASS`) + 1 Forensic Auditor (`CLEAN`)
- [ ] `handoff.md` written & completion sent to Parent Orchestrator (`7eca7555c91ebcd34fcee56ad7e156c8`)

## Feature Coverage Matrix (`F1`–`F18`)
- [ ] F1: Worldbuilding & Lunar Diorama
- [ ] F2: Chunky Cartoon Mech 3D Modeling & Faction Palette
- [ ] F3: 4-Tier Geometric Progression & Selective Tier Accents
- [ ] F4: Mechanical Articulation, Idle Life & Hover Shadows
- [ ] F5: 4-Step `MeshToonMaterial` & Soft Non-Overexposed Lighting
- [ ] F6: `#1A1033` Normal+Depth Post-Processing Outline & `1.5x` Supersampling
- [ ] F7: Three Distinct Defense Towers & Target-Death Safety
- [ ] F8: 8 Waves, Enemies, Wave 4 Elite & Wave 8 Final Boss
- [ ] F9: Economy, Sell Refund, Inter-Wave Prep, Speed/Pause & Numerical Balance
- [ ] F10: Stage 1 Presentation (Prep & Deployment)
- [ ] F11: Stage 2 Presentation (Build, Non-Pausing T2/T3 Upgrade & Simulation-Pausing T4 Hero Reveal)
- [ ] F12: Stage 3 Presentation (Boss Charge, Silence & Shockwave Entrance)
- [ ] F13: Stage 4 Presentation (Combat Climax & Boss Chain-Explosion Kill)
- [ ] F14: Stage 5 Presentation (Victory Sky-Beam, 3D Crate Drop & Interactive 3D Loot Fountain)
- [ ] F15: Action-Synced Web Audio & Mute Toggle
- [ ] F16: Desktop Widescreen & Mobile Portrait Camera & Tactile Enamel UI
- [ ] F17: Dual Preview Delivery (`starforge_ark_cradle.html` + Persistent `:5173` Vite Preview)
- [ ] F18: Buildable Project, Documentation, Unit Tests & Tier 1–5 E2E Verification
