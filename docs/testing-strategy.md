# Testing Strategy

## Scope and priorities

The assistant handles sensitive salary and tax data, so tests prioritize authorization boundaries, grounded answers, deterministic money calculations, and safe failure behavior. Tests use seeded or factory data and never call a real LLM, OCR provider, identity provider, or external payroll system.

## Test levels

| Level | Purpose | Examples |
|---|---|---|
| Unit | Verify one rule or adapter quickly | money conversion, intent classification, tax cap, OCR fixture selection |
| Service/integration | Verify repository, service, and database contracts together | user-scoped context, eligibility plus persistence, document upload plus OCR |
| API/security | Verify HTTP status, auth, validation, headers, limits, and response envelopes | JWT access, upload MIME/size, cross-user IDs, prompt injection |
| Contract | Verify provider and persistence boundaries | LLM response extraction, base64 validation, model field mapping |
| E2E/demo | Verify the employee journey | login -> upload -> payroll query -> grounded answer -> simulation -> checklist |

## Requirement traceability

| ID | Scenario / expected result | Level |
|---|---|---|
| AUTH-01 | Missing bearer token returns 401 and uniform error envelope | API |
| AUTH-02 | Malformed, expired, wrong issuer, or wrong audience token returns 401 | API/security |
| AUTH-03 | Valid token sets scope from JWT `sub`; body/query `userId` cannot override it | API/security |
| AUTH-04 | Login rejects missing fields and invalid credentials without revealing which value failed | API |
| AUTH-05 | Valid refresh token issues a new pair; malformed, expired, or unknown-sub refresh token is rejected | API |
| ISO-01 | Employee A cannot list, read, update, delete, or attach proofs to Employee B documents | API/service |
| ISO-02 | Employee A cannot read B payroll cycles, deductions, reimbursements, or assistant context | API/service |
| ISO-03 | Prompt context contains only the authenticated employee ID and records | Service/security |
| ISO-04 | Document APIs never return raw file bytes or secrets | API |
| DOC-01 | PDF, PNG, and JPEG uploads are accepted and stored in memory with metadata | API/service |
| DOC-02 | Unsupported MIME/extension, missing file, empty file, and files over 5 MB are rejected | API |
| DOC-03 | Mock OCR produces deterministic fields for a payslip and marks status OCR_COMPLETE | Service |
| DOC-04 | Missing or inconsistent OCR fields do not create invented values; answer states unavailable data | Service/E2E |
| DOC-05 | Soft-deleted documents are absent from default lists and AI context | Service |
| PAY-01 | Monthly breakup returns basic, HRA, LTA, special allowance, gross, deductions, and net pay | API |
| PAY-02 | Payroll deductions are filtered by user, cycle, and PAYROLL scope | Repository/service |
| PAY-03 | YTD response aggregates the requested financial year only | API/service |
| PAY-04 | Invalid or unknown cycle returns 404; malformed cycle/FY input returns 4xx | API |
| PAY-05 | Net-pay explanation identifies known month-to-month changes and does not calculate independently in the LLM | Service/E2E |
| DED-01 | PF, TDS, and professional tax payroll rows are returned with correct decimal amounts | Service/API |
| DED-02 | Unknown/inactive type, wrong regime, status, rank, tenure, min/max amount, missing payroll cycle, and missing FY are rejected | Unit/service |
| DED-03 | 80C aggregate cap counts all types in the aggregate group and reports remaining headroom | Service |
| DED-04 | Payroll-imported or applied deductions cannot be deleted; employee declarations can be soft-deleted when allowed | Service |
| REIM-01 | Claim below/above limits, missing cycle, wrong status/rank/tenure, and FY cap overflow are rejected | Unit/service |
| REIM-02 | Approved or paid claims cannot be deleted; proof attachment requires an owned document | Service/API |
| TAX-01 | Old-regime additional 80C simulation is capped by headroom and uses the documented simplified rate | Unit |
| TAX-02 | New-regime simulation refuses unsupported 80C savings and returns zero estimated savings | Unit |
| TAX-03 | Zero, negative, decimal, very large, malformed, and missing proposed amounts are handled consistently | Unit/API |
| TAX-04 | Simulation output includes financial year, assumptions, disclaimer, and no claim of legal/compliance advice | Unit/API |
| AI-01 | Salary/component/deduction/document questions classify to the intended intent | Unit |
| AI-02 | Prompt includes scoped structured data, OCR text, precomputed tax data, and the exact user question | Unit |
| AI-03 | Prompt explicitly forbids hallucination, independent calculations, and cross-user disclosure | Unit |
| AI-04 | Missing facts produce the standard refusal text rather than a guessed number | Service/E2E |
| AI-05 | Manager salary, foreign tax law, prompt injection, and jailbreak requests are refused before the LLM call | Service/API |
| AI-06 | Provider failure, timeout, malformed response, and unconfigured provider return sanitized errors | Contract/API |
| AI-07 | PDF/image base64 validation rejects invalid encoding, both document types together, unsupported image media types, and non-object metadata | Contract |
| SEC-01 | Helmet headers are present; disallowed CORS origins are rejected | API/security |
| SEC-02 | Assistant, upload, and auth rate limits return 429 after configured thresholds | API/security |
| SEC-03 | HTML is stripped from query/prompt fields; injection patterns are rejected | Unit/API |
| SEC-04 | Unexpected errors expose a client-safe message and code, never stack traces, SQL, tokens, or provider keys | API/security |
| OPS-01 | Health endpoint returns UP and all success/error responses use the documented envelope | API |
| OPS-02 | Database bootstrap and seed are repeatable without duplicate active cycles/catalog rows | Integration |
| UX-01 | Employee-facing answers use simple language and identify source/assumptions where available | E2E/manual |
| UX-02 | Proof checklist includes missing documents based on declared deductions and proof status | Service/API |

## End-to-end acceptance journeys

1. Authenticate the seeded employee, list payroll cycles, view the latest breakup, and verify the displayed net pay equals the seeded record.
2. Upload a payslip, confirm OCR completion, ask “How much HRA did I receive?”, and verify the response is grounded in the uploaded or structured value.
3. Ask “What deductions were applied?” and verify PF, TDS, and professional tax are present with correct cycle values.
4. Ask why net pay changed between two cycles and verify the answer references available payroll facts and does not invent an explanation for missing data.
5. Run an additional 80C simulation with headroom, at the cap, beyond the cap, and under the new regime; verify assumptions and refusal behavior.
6. Create a tax declaration that requires proof, retrieve the checklist, upload/link proof, and verify the missing item is removed.
7. Authenticate as a second employee and attempt every Employee A resource ID; every cross-user read or mutation must fail without revealing existence or contents.
8. Submit prompt-injection text, unsupported tax-law questions, invalid uploads, malformed tokens, and provider failures; verify safe 4xx/5xx responses and no downstream LLM call where refusal is required.

## Fixtures and test isolation

- Use two employees with distinct payroll, deduction, reimbursement, and document values so accidental unscoped queries are observable.
- Use deterministic minor-unit amounts and assert API decimal strings, not floating-point arithmetic.
- Reset the SQLite database or transaction state between tests; do not depend on test order.
- Stub `llmClient.query` and assert both prompt content and call count. Never send confidential fixtures to a live provider.
- Include payslip fixtures with complete fields, missing HRA, conflicting gross/net totals, malformed OCR numbers, and unsupported categories.

## Exit criteria

The release candidate must pass all unit, service, API/security, and contract tests; all ISO, AI, TAX, and DOC cases must be covered; and the seven acceptance journeys must pass against a clean seeded database. Manual demo checks must confirm that explanations are understandable and that assumptions are visible.

## Known implementation gap to track

The current checklist route returns an empty list unconditionally. `UX-02` should remain red or pending until checklist generation is connected to declarations, catalog proof requirements, and linked document status.
