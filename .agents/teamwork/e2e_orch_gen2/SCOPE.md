# E2E Track Scope (`e2e_orch_gen2` — `e2e-test-suite`)

## Deliverables Checklist
- [x] `TEST_INFRA.md` synthesized from 3 Explorers (`/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/TEST_INFRA.md`, indexed in `e2e_orch_gen2/TEST_INFRA.md`)
- [ ] `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` (plus optional `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_helpers/*.mjs`) supporting `--tier=1|2|3|4|all` (and `--tier <n>`) CLI flags, invalid `--tier=99` (`exit 2`), and `process.env.E2E_URL` with ephemeral `127.0.0.1:0` `dist/` fallback ONLY when unreachable
- [ ] **Tier 1 — Feature Coverage**: `>= 5` distinct genuine checks per feature area (`F1`–`F18`), `>= 90` total Tier 1 checks (target `96`)
- [ ] **Tier 2 — Boundary & Corner Cases**: `>= 5` distinct genuine checks per feature area (`F1`–`F18`), `>= 90` total Tier 2 checks (target `96`)
- [ ] **Tier 3 — Cross-Feature Pairwise Combinations**: All `22` pairwise interaction cases (`>= 20` required)
- [ ] **Tier 4 — Real-World End-to-End Application Scenarios**: All `10` full E2E scenarios (`>= 9` required), including strict zero-cheat Scenario 4.1 (8-wave natural economy campaign + Stage 5 loot + Play Again), Scenario 4.2 (Single-Tower T4 solo balance guard), Scenario 4.3 (Defeat & Retry), Scenario 4.4 (`390x844` mobile portrait touch & Stage 5 framing), Scenario 4.5 (offline `starforge_ark_cradle.html`), Scenario 4.6 (`<agent-embed>` `0px`-init `580px` sandboxed `srcdoc`), Scenario 4.7 (`1200x920` full-height `:5173` & standalone iframes), and Scenarios 4.8–4.10
- [ ] Execution budget `< 90s` across `--tier=all`, structured per-tier & per-feature console pass/fail summary, exit `0` when all pass and `1` when any game defect fails, zero harness crashes, zero test bugs / false positives
- [ ] Full 2B Gate (`GATE_STATUS.md`): 2 Reviewers (`APPROVE`) + 2 Challengers (`APPROVE`) + 1 Forensic Auditor (`CLEAN`)
- [ ] `TEST_READY.md` in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch_gen2/TEST_READY.md`
- [ ] `handoff.md` written & completion summary sent to Parent Orchestrator (`0e463bcfabadd2a009d613505f7e2660`)

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
