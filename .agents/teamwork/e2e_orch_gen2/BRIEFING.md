# E2E Track Briefing (`e2e_orch_gen2`)

## Mission
Resume and complete the Dual-Track E2E Testing Milestone (`e2e-test-suite`) for *Lunar Beacon — Last Relay* (`starforge_ark_cradle`): implement `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` (and optional modular helpers under `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_helpers/*.mjs`) per the complete 4-Tier Specification in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/TEST_INFRA.md`, verify via full 2B Gate (2 Reviewers + 2 Challengers + 1 Forensic Auditor), publish `TEST_READY.md`, and hand off to Parent Orchestrator (`0e463bcfabadd2a009d613505f7e2660`).

## Authoritative Spec & Plan Inputs
1. `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md` — **MANDATORY FOR ALL SUBAGENTS**
2. `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1_gen2/plan.md` — Architecture, Feature Inventory (`F1`–`F18`), and Contracts 1–4
3. `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/TEST_INFRA.md` — Authoritative 45 KB 4-Tier Specification synthesized from `explorer_e2e_r1_1..3`
4. `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/explorer_e2e_r1_1/analysis.md`, `explorer_e2e_r1_2/analysis.md`, `explorer_e2e_r1_3/analysis.md` — Detailed Explorer schemas, probes, and empirical measurements

## Exclusive Write Ownership & Concurrency Safety
- **EXCLUSIVE WRITE OWNERSHIP**:
  - `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs`
  - `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_helpers/*.mjs` (optional modular helpers)
  - Coordination metadata inside `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch_gen2/` and fresh `_gen2` subagent directories
- **STRICTLY FORBIDDEN**:
  - NEVER modify `src/**`, `package.json`, `README.md`, `tests/e2e.mjs`, or `dist/`
  - NEVER kill or restart the persistent `vite preview` server on port `:5173`
  - Write temporary screenshots ONLY to `/tmp/tdk_e2e_tiers_shots`
