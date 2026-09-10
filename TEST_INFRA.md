# Automated Vendor Outreach Engine — E2E Test Infrastructure

## 1. Overview & Philosophy

The E2E Test Suite for the **Automated Vendor Outreach Engine** is an **opaque-box, requirement-driven testing architecture** designed to validate the end-to-end lifecycle of B2B vendor outreach, email dispatching, webhook event tracking, and database state transitions.

The test suite treats the system as a black box over HTTP APIs and asserts ground truth directly in the Neon PostgreSQL database via Drizzle ORM.

### Key Guarantees
- **Opaque-Box Verification**: Endpoints (`POST /api-v2/admin/leads/send`, `POST /api-v2/webhooks/resend`, `GET /api-v2/leads/progress`, `POST /api-v2/auth/sync`) are invoked over standard HTTP requests exactly as external callers (Admin UI, Resend webhook servers, vendor browsers) do.
- **Strict Data Isolation**: All seeded test leads use uniquely namespaced emails (`test_e2e_<timestamp>_<rand>@hatake-test.shop`). An automated fixture tracks created records and cleans them up after each test tier and upon suite termination.
- **Zero-External-Framework Footprint**: Implemented in TypeScript using native Node.js runtime and `tsx`, requiring no bulky third-party runners while providing clear color-coded terminal reporting, execution timings, and accurate exit codes.
- **Single-Command Execution**: The full multi-tier suite runs via `npx tsx tests/e2e/run_all.ts`.

---

## 2. Directory & Component Layout

```
tests/e2e/
├── test_helpers.ts              # Core harness, DB fixture, HTTP client, assertions, payload generator
├── tier1_feature_coverage.test.ts # Tier 1: Batch dispatch, webhook receipt, metrics
├── tier2_boundary_corner.test.ts  # Tier 2: Empty batches, unknown leads, idempotency, out-of-order, malformed JSON
├── tier3_cross_feature.test.ts    # Tier 3: 5-stage lifecycle, monotonicity invariants, 3-tier fallback resolution
├── tier4_real_world.test.ts       # Tier 4: 10-vendor cohort simulation, burst traffic concurrency
└── run_all.ts                   # Master runner orchestrating all tiers sequentially
```

### Component Details

| File | Purpose | Key Responsibilities |
|---|---|---|
| `test_helpers.ts` | Shared Test Utility Harness | Manages Neon Postgres pool via Drizzle ORM, creates isolated test leads, constructs simulated Resend webhook payloads (`email.delivered`, `email.opened`, `email.clicked`), handles HTTP requests, and provides rich assertion utilities. |
| `tier1_feature_coverage.test.ts` | Tier 1: Feature Coverage | Verifies dispatch authentication guards, `POST /api-v2/admin/leads/send` execution (`sent`, `sentAt`, `inviteTokenHash`), webhook handling for `email.delivered`, `email.opened` (sets `openedAt`), `email.clicked` (sets `clickedAt`), and `/api-v2/leads/progress` calculation. |
| `tier2_boundary_corner.test.ts` | Tier 2: Boundary & Corner Cases | Tests zero-limit batches, non-existent lead IDs / ghost emails, duplicate webhook delivery idempotency, out-of-order webhook sequencing (`clicked` before `opened`), malformed JSON payloads, and boundary limits. |
| `tier3_cross_feature.test.ts` | Tier 3: Cross-Feature Combinations | Exercises full 5-stage funnel progression (`pending` → `sent` → `opened` → `clicked` → `recruited`), comprehensive forward-only monotonicity protection matrix, and 3-tier webhook lead identification fallback (`tags.lead_id` → `email_id` → `to[0]`). |
| `tier4_real_world.test.ts` | Tier 4: Real-World Scenarios | Simulates realistic 10-vendor cohort outreach with network jitter, asynchronous webhook arrival, conversion into different funnel stages, and burst traffic under high concurrency (15 interleaved requests). |
| `run_all.ts` | Master Execution Entry Point | Performs pre-flight health checks (database connectivity, server availability), runs Tiers 1–4 sequentially, outputs aggregated metrics, cleans up fixtures, and exits with standard exit codes (0 = pass, 1 = fail). |

---

## 3. Detailed Test Tier Specifications

### Tier 1: Core Feature Coverage
1. **T1.1: Authentication Guard**: Verifies `POST /api-v2/admin/leads/send` rejects unauthenticated requests and non-admin tokens with HTTP 401/403.
2. **T1.2: Batch Outreach Dispatch**: Dispatches pending test leads, asserts HTTP 200 `{ success: true, sent: N }`, and checks Postgres for `status = 'sent'`, non-null `sentAt`, and hashed `inviteTokenHash`.
3. **T1.3: Webhook Delivery Event**: Verifies `POST /api-v2/webhooks/resend` handles `email.delivered` gracefully with HTTP 200 without degrading lead state.
4. **T1.4: Webhook Open Event**: Verifies `email.opened` updates lead status to `'opened'` and populates `opened_at` timestamp.
5. **T1.5: Webhook Click Event**: Verifies `email.clicked` updates lead status to `'clicked'` and populates `clicked_at` timestamp.
6. **T1.6: Funnel Progress Metrics**: Verifies `GET /api-v2/leads/progress` counts all contacted leads (`status != 'pending'`).

### Tier 2: Boundary & Corner Cases
1. **T2.1: Empty Batch**: Validates dispatch behavior when 0 pending leads exist or `limit: 0`, ensuring graceful `{ success: true, sent: 0 }`.
2. **T2.2: Unknown Lead Webhook**: Submits webhooks targeting non-existent `tags.lead_id` and unknown email addresses; ensures the server responds safely without throwing uncaught 500 errors.
3. **T2.3: Duplicate Delivery Idempotency**: Fires duplicate `email.opened` and `email.clicked` webhooks; ensures idempotency, preserving timestamps and status without duplicate row creation or errors.
4. **T2.4: Out-of-Order Webhooks**: Simulates `email.clicked` arriving before `email.opened`. Confirms transition to `clicked`, and asserts that a late-arriving `email.opened` never downgrades the lead.
5. **T2.5: Malformed JSON / Missing Fields**: Tests payloads with missing `type`, missing `data`, empty JSON objects, and corrupted data types.
6. **T2.6: Boundary Batch Limits**: Tests negative numbers and non-numeric limits for graceful input handling.

### Tier 3: Cross-Feature Combinations & Monotonicity
1. **T3.1: Full Funnel Progression**: Follows a lead through every stage:
   - `pending` (initial)
   - `sent` (via batch dispatch)
   - `opened` (via Resend webhook)
   - `clicked` (via Resend webhook)
   - `recruited` (via `/api-v2/auth/sync` redemption)
2. **T3.2: Comprehensive Monotonic Protection Matrix**:
   - On `recruited`: rejects downgrades from `opened`, `clicked`, or `delivered`.
   - On `clicked`: rejects downgrades from `opened` or `delivered`.
   - On `opened`: rejects downgrades from `delivered`.
3. **T3.3: 3-Tier Webhook Lead Identification Fallback**:
   - Tier A: Identified by `data.tags.lead_id`.
   - Tier B: Identified by `data.email_id` matching `leads.resend_email_id`.
   - Tier C: Identified by `data.to[0]` matching `leads.email`.

### Tier 4: Real-World Application Scenarios
1. **T4.1: 10-Vendor Cohort Simulation**:
   - Seeds 10 realistic TCG vendor records.
   - Triggers batch dispatch.
   - Dispatches randomized, asynchronous webhooks mimicking realistic conversion (3 sent-only, 3 opened-only, 2 clicked-only, 2 recruited).
   - Validates the entire cohort's database state.
2. **T4.2: High-Concurrency Burst Webhook Traffic**:
   - Sends 15 concurrent interleaved webhooks to 5 active leads.
   - Verifies database connection pool stability and race condition resilience.

---

## 4. How to Run the Tests

### Single Command (All Tiers)
```bash
npx tsx tests/e2e/run_all.ts
```

### Running Individual Tiers
```bash
# Tier 1 only
npx tsx tests/e2e/tier1_feature_coverage.test.ts

# Tier 2 only
npx tsx tests/e2e/tier2_boundary_corner.test.ts

# Tier 3 only
npx tsx tests/e2e/tier3_cross_feature.test.ts

# Tier 4 only
npx tsx tests/e2e/tier4_real_world.test.ts
```

### Configuration Environment Variables
| Variable | Description | Default |
|---|---|---|
| `TEST_BASE_URL` | Base URL of the running Hatake backend server | `http://localhost:3000` |
| `DATABASE_URL` | PostgreSQL connection string (Neon Postgres) | Loaded from `.env` |
| `TEST_ADMIN_TOKEN` | Admin bearer token for dispatch requests | `custom-token-ernst-uid` |

---

## 5. Test Isolation & Data Lifecycle

1. **Namespace Isolation**: All test leads use `test_e2e_${Date.now()}_${random}@hatake-test.shop`. Real vendor data is never modified or deleted.
2. **Pre-Flight Column Verification**: `ensureDatabaseColumns()` verifies `clicked_at` and `resend_email_id` exist, applying backward-compatible `ADD COLUMN IF NOT EXISTS` if needed.
3. **Per-Test Cleanup**: Each test file maintains an array of created lead IDs and cleans them up in a `finally` block.
4. **Suite-Level Cleanup**: `cleanupAllTestLeads()` runs before and after the test run to prune any orphaned `test_e2e_%` leads.
5. **Connection Termination**: `closeDbPool()` closes all active PostgreSQL pool clients to ensure clean process termination.
