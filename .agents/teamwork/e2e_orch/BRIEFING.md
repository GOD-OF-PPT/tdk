# E2E Track Briefing (`e2e_orch`)

## Mission
Design `TEST_INFRA.md` & `TEST_READY.md` and implement the comprehensive 4-tier requirement-driven opaque-box Playwright + WebGL2 E2E test suite in `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` covering all 18 inventoried features (`F1`–`F18`) and atomic requirements (`REQ-001`–`REQ-069`).

## Authoritative Spec & Plan Inputs
- **Original User Request (MANDATORY FOR ALL SUBAGENTS)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/ORIGINAL_REQUEST.md`
- **Parent Plan & Feature Inventory (`F1`–`F18` + Contracts 1–4)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/orchestrator_r1/plan.md`
- **Requirement Traceability Matrix (`REQ-001`–`REQ-069`)**: `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/teamwork_preview_spec_miner_survey_3/analysis.md`

## Exclusive Write Ownership & Concurrency Safety
Implementation Track Milestones M1 & M2 are concurrently modifying `src/**`, `package.json`, and `tests/unit.test.mjs`.
- **EXCLUSIVE WRITE OWNERSHIP**:
  - `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_tiers.mjs` (and optional helpers under `/home/antigravity/GOD-OF-PPT/tdk/tests/e2e_helpers/` if needed)
  - Coordination metadata in `/home/antigravity/GOD-OF-PPT/tdk/.agents/teamwork/e2e_orch/`
- **STRICTLY PROHIBITED**:
  - DO NOT modify `src/**`, `package.json`, `README.md`, `tests/e2e.mjs`, or `dist/`.
  - DO NOT kill or restart the persistent `vite preview` server on port `5173`.
  - Support `process.env.E2E_URL` defaulting to `http://127.0.0.1:5173`, spawning a temporary static server on an ephemeral port against `dist/` ONLY if `127.0.0.1:5173` is unreachable, and tearing down ONLY its own temporary server on exit.
  - Write any temporary screenshots to `/tmp/tdk_e2e_tiers_shots` (never into the repo or conversation artifact directory).
