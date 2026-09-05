# Testing Strategy

This strategy describes the current test suite and the verification work still required for the planned product. Tests use Node's built-in test runner, seeded SQLite data, and local stubs. They do not call a real LLM, OCR provider, identity provider, or external payroll system.

## 1. Current Test Inventory

| File | Current coverage |
|---|---|
| `test/api.test.js` | Health, login/refresh, protected routes, unsupported upload behavior, request validation, response envelope, and sanitized errors. |
| `test/repositories.test.js` | User-scoped reads, repository CRUD, soft delete, and payroll persistence/update behavior. |
| `test/requirements.test.js` | Security guard, LLM text extraction, grounded prompt content, intent/tool planning, refusal before provider calls, 80C simulation, and audit logging. |
| `test/services.test.js` | Deduction aggregation, seeded reimbursement reads, mock OCR upload behavior, and JWT service behavior. |
| `test/utils.test.js` | Money conversion/summing and API success/error envelopes. |

The current suite contains 24 tests and validates the implemented prototype. It does not cover every capability described in the broader product design.

## 2. Test Levels

| Level | Purpose | Current examples |
|---|---|---|
| Unit | Verify deterministic functions in isolation. | Money utilities, security filtering, intent planning, provider text extraction, tax simulation. |
| Repository/integration | Verify Sequelize models, seed data, repository scope, and persistence behavior. | User-scoped queries, CRUD, soft delete, payroll updates. |
| API/security | Verify routes, status codes, auth, validation, response envelopes, and upload handling. | Login, refresh, `/me`, missing bearer token, unsupported upload, required `financialYear`. |
| Service integration | Verify orchestration across repositories and services. | Context assembly, mock OCR metadata, audit events, deterministic simulation. |
| E2E/demo | Verify a complete employee workflow against a clean seeded database. | Mostly planned; the current suite covers only portions of the journey. |

## 3. Implemented Requirements

The current suite verifies these behaviors:

- Health returns `UP` in the standard success envelope.
- Valid seeded credentials issue access and refresh JWTs.
- Refresh tokens issue a new token pair.
- Missing and invalid access credentials return `401` with a sanitized error envelope.
- Password verification uses the stored `passwordHash` flow.
- Repository reads are user-scoped for covered repository methods.
- Repository create, update, and paranoid delete behavior works for covered models.
- Assistant requests require `financialYear`.
- Unsupported upload MIME input is rejected safely by the assistant flow.
- Security middleware strips HTML and rejects prompt-injection patterns.
- The prompt includes scoped facts, refusal instructions, and the exact question.
- Unsupported manager-salary questions are refused before context assembly and LLM calls.
- Context planning selects relevant tools for HRA, deductions, and proof queries.
- Old-regime 80C simulation is capped and uses the simplified rate.
- New-regime 80C simulation returns refusal and zero estimated savings.
- Mock OCR produces request-scoped metadata and fields.
- Audit events are emitted for upload, assistant, payroll, deduction, reimbursement, payslip, and LLM access paths.
- Money utilities reject malformed amounts and preserve integer minor-unit behavior.

## 4. Planned Coverage Gaps

The following requirements belong to planned APIs or services and should remain pending until those components exist:

| Area | Required future coverage |
|---|---|
| Authorization isolation | Cross-user document, payroll, deduction, reimbursement, and mutation attempts. |
| Documents | Persisted document CRUD, linking, proof ownership, soft-delete visibility, and raw-byte exclusion. |
| Payroll | Public cycles, monthly breakup, YTD, unknown-cycle errors, and payroll deduction filtering. |
| Deductions | Create/update/delete, catalog validation, regime/status/rank/tenure rules, and 80C headroom. |
| Reimbursements | Claim limits, caps, eligibility, proof attachment, approval/deletion rules, and catalog validation. |
| Policy APIs | Active catalog listing and user-context filtering. |
| Provider contract | Timeout/failure handling, malformed provider responses, base64 document validation, and metadata validation. |
| Security hardening | Helmet/CORS assertions, rate-limit `429` behavior, production local-login restriction, and secret leakage checks. |
| AI grounding | Missing-data refusal, provider call counts, OCR conflict handling, and post-response numeric validation. |
| E2E | Login, assistant upload, payroll explanation, deduction breakdown, simulation, and proof workflow. |

## 5. Focused Test Scenarios

### Authentication

- Missing, malformed, expired, wrong-issuer, wrong-audience, and refresh-token-as-access-token requests return `401`.
- Missing login fields and invalid credentials return the same generic authentication failure.
- A valid refresh token with an unknown subject is rejected.
- `GET /api/v1/auth/me` returns only the public user projection and never `passwordHash`.

### Assistant and privacy

- The prompt contains only the authenticated employee's records.
- Body/query user IDs cannot change the JWT-derived scope.
- Manager salary and unsupported foreign-tax questions do not call the LLM.
- Prompt-injection and jailbreak patterns are rejected before provider calls.
- Provider failures and unknown errors return sanitized error codes without tokens, SQL, keys, or stack traces.

### Upload and OCR

- PDF, PNG, and JPEG uploads are accepted within the 5 MB limit.
- Missing, empty, unsupported, and oversized files are rejected.
- Mock OCR is deterministic and remains request-scoped.
- Missing or conflicting OCR values are not silently invented.

### Deterministic money and tax

- Decimal strings convert to integer minor units and malformed values fail.
- 80C simulation is tested below the cap, at the cap, above the cap, with zero/negative values, malformed input, and both tax regimes.
- Simulation results include assumptions, disclaimer, financial year, refusal, and reason fields where applicable.

## 6. Fixtures and Isolation

- Initialize and seed SQLite in a controlled test setup.
- Use distinct employee IDs and values when testing user isolation.
- Assert decimal strings at API boundaries and integer minor units internally.
- Stub `llmClient.query`; assert prompt content and call count; never contact a live provider.
- Use complete, missing-field, conflicting, malformed, and unsupported upload fixtures.
- Avoid test-order dependencies. Reset or recreate database state for tests that mutate shared data.

## 7. Exit Criteria

For the current prototype, `npm test` must pass all existing tests with zero failures, and focused source diagnostics must be clean.

For a future production candidate, all planned isolation, API, provider-contract, AI-grounding, and E2E scenarios must be implemented before claiming full requirement coverage. Checklist behavior remains pending because no checklist route is mounted and declaration/proof mutation APIs are not implemented.
