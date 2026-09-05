# AI Financial Wellness Assistant

Secure, API-first prototype for employee payroll explanations, payslip grounding, deductions, reimbursements, tax simulations, and proof-check workflows.

This repository is a single-service Express application with Sequelize and SQLite in-memory persistence for the prototype. The LLM is used to explain backend-grounded facts, not to calculate payroll or invent numbers. Every employee query is scoped to the authenticated JWT subject.

## Design documentation

The detailed design for this project lives in the docs folder:

- [docs/architecture.md](docs/architecture.md) — system architecture, boundaries, security model, and design principles
- [docs/hld.md](docs/hld.md) — high-level design, runtime flows, APIs, and product intent model
- [docs/lld.md](docs/lld.md) — class-level design, services, models, and implementation notes
- [docs/database.md](docs/database.md) — Sequelize schema, entity relationships, and persistence strategy
- [docs/testing-strategy.md](docs/testing-strategy.md) — validation and test expectations for the prototype

## Current implementation status

This project is a prototype, not a full payroll platform. The currently wired application surface is deliberately small and matches the implementation in the codebase:

- health and service metadata endpoints
- JWT-based mock authentication flow
- grounded assistant query endpoint with optional payslip upload
- seeded employee, payroll, document, and catalog data for demo work

Planned but not currently exposed as public routes are broader payroll, deduction, reimbursement, and document management APIs described in the design docs.

## System overview

```text
Client
  -> Express app and security middleware
     -> JWT auth, request validation, upload guard, security filter
     -> user-scoped AI orchestration
        -> ContextToolPlanner selects a minimal context set
        -> ContextAssembler reads only allowed employee data
        -> deterministic payroll/tax services compute facts
        -> PromptOrchestrator builds grounded prompts
        -> LlmClient calls the configured LLM wrapper
     -> Sequelize repositories -> SQLite :memory: (prototype)
```

### Architectural boundaries

- Controllers do not access Sequelize models directly.
- Repositories enforce `userId` filters for employee data.
- Uploaded file buffers and request-scoped OCR are kept in memory only for the current assistant request.
- The LLM receives only grounded, user-scoped context and never a raw database query.
- Financial calculations remain deterministic in backend services.

For the full architecture rationale and threat model, see [docs/architecture.md](docs/architecture.md) and [docs/hld.md](docs/hld.md).

## Setup

### Prerequisites

- Node.js 20 or later
- npm 10 or later
- An HTTP LLM wrapper and API key for assistant responses

### Install and run

```powershell
npm install
```

Create a `.env` file in the project root:

```dotenv
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:3000
JWT_SECRET=replace-with-a-long-random-development-secret
JWT_ISSUER=local-idp
JWT_AUDIENCE=financial-wellness-api
JWT_ACCESS_EXPIRES=1h
JWT_REFRESH_EXPIRES=7d
DB_DIALECT=sqlite
DB_STORAGE=:memory:
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_ASSISTANT_MAX=20
RATE_LIMIT_UPLOAD_MAX=10
RATE_LIMIT_AUTH_MAX=10
MAX_FILE_SIZE_BYTES=5242880
LLM_PROVIDER=gemini
LLM_BASE_URL=https://your-llm-wrapper.example.com
LLM_API_KEY=replace-with-your-llm-api-key
LLM_MODEL=gemini-1.5-pro
LLM_TEMPERATURE=0.3
LLM_TIMEOUT_MS=30000
```

Start the development server:

```powershell
npm run dev
```

Run a production-style local start:

```powershell
npm start
```

The API will be available at `http://localhost:3000` and Swagger documentation at `http://localhost:3000/api-docs`.

### Environment notes

The prototype defaults to SQLite in memory. A restart clears the database, and the app re-seeds the demo data on boot.

## Demo data and login

The seed data is deterministic and runs once when the database has no users. The primary demo employee is:

| Field | Value |
|---|---|
| Name | Jane Doe |
| Email | `jane@company.com` |
| Password | `demo` |
| Employee ID | `emp_101` |
| Tax regime | `OLD` |
| Financial year | `2026-2027` |
| Payroll cycles | `2026-03`, `2026-04`, `2026-05` |

Jane's seeded April 2026 records include:

- payroll earnings and deductions for April 2026
- a paid medical reimbursement and a submitted internet claim
- a tax declaration and proof-linked document
- a payslip document for the same cycle

The values are demo facts for the prototype and are not real employee data.

Obtain a demo token:

```powershell
$body = @{ email = 'jane@company.com'; password = 'demo' } | ConvertTo-Json
$tokens = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/token -ContentType 'application/json' -Body $body
$accessToken = $tokens.data.accessToken
$headers = @{ Authorization = "Bearer $accessToken" }
```

The JWT `sub` is the only employee authorization scope. A caller cannot select another employee by sending a `userId` in JSON or query parameters.

## API surface

There is no frontend bundle in this repository. Use curl, PowerShell, Swagger UI, or build your own client against the JSON API. Responses use a standard envelope:

- success: `{ "success": true, "data": ... }`
- error: `{ "success": false, "error": { "message": ..., "code": ... } }`

### Currently implemented routes

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service health. |
| `GET` | `/api-docs` | Swagger UI. |
| `POST` | `/api/v1/auth/token` | Issue demo access and refresh tokens. |
| `POST` | `/api/v1/auth/refresh` | Refresh tokens. |
| `GET` | `/api/v1/auth/me` | Current employee profile. |
| `POST` | `/api/v1/assistant/query` | Grounded employee Q&A; accepts JSON or multipart form data with an optional payslip upload. |

The design docs describe additional payroll, deduction, reimbursement, and document APIs that are planned or partially specified but not fully mounted in the current code.

## Assistant query flow

The main product flow is `POST /api/v1/assistant/query`:

- authenticates the user via bearer JWT
- optionally validates and processes a PDF, PNG, or JPEG upload
- uses the mocked OCR service for a payslip request when a file is supplied
- selects a minimal user-scoped context set based on the detected question intent
- computes deterministic facts before building the grounded prompt
- sends the sanitized, grounded prompt to the LLM and validates the response for factual alignment

This is the current design boundary and is the clearest example of the system's security and privacy model.

### Intent-based context selection

The backend planner in `src/services/ai/ContextToolPlanner.js` selects data before the prompt is built. The intent model is documented in [docs/hld.md](docs/hld.md) and the implementation details are described in [docs/lld.md](docs/lld.md).

| Question type | Selected data |
|---|---|
| salary / net pay / HRA questions | current and prior payroll context, deductions, reimbursements, relevant OCR |
| PF / TDS / professional tax / deduction questions | payroll, deductions, and relevant OCR |
| tax / 80C / investment simulation | employee tax profile, declarations, and YTD payroll when needed |
| document questions | current payroll plus relevant OCR context |

## Example request

This example uses the seeded Jane Doe account and uploads a mock payslip in the same request.

```powershell
Set-Content -Path .\jane-april-payslip.pdf -Value 'mock payslip upload'

curl.exe -X POST http://localhost:3000/api/v1/assistant/query `
  -H "Authorization: Bearer $accessToken" `
  -F "query=Why is my net salary lower than my gross pay, and what deductions were applied in April 2026?" `
  -F "file=@jane-april-payslip.pdf;type=application/pdf" `
  -F "financialYear=2026-2027" `
  -F "payrollCycle=2026-04"
```

Expected response shape:

```json
{
  "success": true,
  "data": {
    "answer": "...grounded employee-friendly explanation...",
    "intent": "SALARY_EXPLAIN",
    "sources": ["structured-db", "document-ocr"],
    "assumptions": [],
    "refusal": false
  }
}
```

## Data and persistence model

The persistence design is captured in [docs/database.md](docs/database.md). In the prototype:

- Sequelize is the only ORM
- SQLite in memory is the default database
- money is persisted as integer minor units (paise)
- soft-delete and audit metadata are modeled in the repository layer and models
- request-scoped uploaded OCR is not persisted after the assistant response

## Security and privacy model

The implementation deliberately enforces a narrow security boundary:

- JWT `sub` is the only employee authorization scope
- all repository reads are user-scoped
- prompt injection and unsafe input are filtered before AI execution
- upload size and type are constrained
- rate limits are applied for auth and assistant requests

See [docs/architecture.md](docs/architecture.md) and [docs/hld.md](docs/hld.md) for the full security model.

## Project structure

```text
src/
  api/
  config/
  db/
  fixtures/
  middleware/
  models/
  repositories/
  services/
  utils/

docs/
  architecture.md
  hld.md
  lld.md
  database.md
  testing-strategy.md
```

## Testing and validation

The project includes tests under the `test` folder. For expected testing boundaries and validation strategies, see [docs/testing-strategy.md](docs/testing-strategy.md).

```powershell
npm test
```

## Notes

- This repository is designed as a prototype for evaluating a grounded, employee-scoped AI payroll assistant.
- It is intentionally constrained to strong boundaries, seeded sample data, and deterministic backend math.
- It is not a full production payroll or tax engine.

### Basic edge-case verification requests

The seed includes two additional Jane Doe document fixtures: `doc_101_payslip_missing_05` has no HRA or net-pay OCR fields, and `doc_101_payslip_inconsistent_06` reports gross and net values that conflict with its components. These are persisted demonstration documents; newly uploaded OCR remains request-scoped.

```powershell
# Missing payslip fields: use the seeded May document context.
$body = @{ query = 'What HRA and net pay are shown on my May 2026 payslip?'; financialYear = '2026-2027'; payrollCycle = '2026-05' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/assistant/query -Headers $headers -ContentType 'application/json' -Body $body
# Expected: the answer says HRA and/or net pay are unavailable instead of inventing values.

# Inconsistent OCR: use the seeded June document context.
$body = @{ query = 'Does my June 2026 payslip reconcile its gross and net pay with the listed components?'; financialYear = '2026-2027'; payrollCycle = '2026-06' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/assistant/query -Headers $headers -ContentType 'application/json' -Body $body
# Expected: the conflicting OCR values are identified and are not silently corrected.

# Unauthorized/cross-user isolation: authenticate as a different seeded employee.
$otherBody = @{ email = 'arjun@company.com'; password = 'demo' } | ConvertTo-Json
$otherTokens = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/token -ContentType 'application/json' -Body $otherBody
$otherHeaders = @{ Authorization = "Bearer $($otherTokens.data.accessToken)" }
$body = @{ query = "What was Jane Doe's April 2026 salary and HRA?"; financialYear = '2026-2027'; payrollCycle = '2026-04' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/assistant/query -Headers $otherHeaders -ContentType 'application/json' -Body $body
# Expected: only Arjun's scoped context is available; Jane's records are not returned.

# New-regime tax assumption: authenticate as Meera and request unsupported 80C savings.
$newRegimeBody = @{ email = 'meera@company.com'; password = 'demo' } | ConvertTo-Json
$newRegimeTokens = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/token -ContentType 'application/json' -Body $newRegimeBody
$newRegimeHeaders = @{ Authorization = "Bearer $($newRegimeTokens.data.accessToken)" }
$body = @{ query = 'What would be the impact of an additional 80C investment?'; proposed80C = '20000.00'; financialYear = '2026-2027' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/assistant/query -Headers $newRegimeHeaders -ContentType 'application/json' -Body $body
# Expected: the simulation refuses unsupported 80C savings under the NEW regime and returns its assumptions.
```

### Mock OCR behavior

`src/services/documents/MockOcrService.js` returns deterministic fixtures from `src/fixtures/ocr/index.js` based on category. `PAYSLIP` includes basic salary, HRA, LTA, special allowance, reimbursements, PF, professional tax, TDS, gross pay, net pay, and YTD fields. The uploaded file bytes are not actually parsed. This is suitable for API and prompt-flow verification only.

## Changing demo behavior

- Seeded users, payroll, deductions, documents, and reimbursements: `src/db/seed.js`.
- Mock OCR fields and raw text: `src/fixtures/ocr/index.js`.
- Policy catalogs and proof requirements: `src/fixtures/policy/`.
- Company policy knowledge documents: `src/fixtures/policy/companyPolicies.js` and `src/services/policy/CompanyPolicyService.js`.
- Query planning and tool selection: `src/services/ai/ContextToolPlanner.js`.
- User-scoped context reads and formatting: `src/services/ai/ContextAssembler.js`.
- Grounding rules, refusal behavior, and final prompt: `src/services/ai/PromptOrchestrator.js`.
- Provider request/response adapter: `src/services/ai/LlmClient.js`.

Company policy documents are non-sensitive, versioned reference records covering salary components, payroll deductions, reimbursements, investment proofs, illustrative rank-wise pay bands, and simplified government-tax concepts. The assistant retrieves only policy records matching the question and labels them as `company-policy` sources. Policy text enriches explanations but does not override employee-specific payroll records or deterministic calculations.

With file-backed SQLite or PostgreSQL, seed changes apply only to a newly initialized database. Do not use real salary, tax, or identity data in the demo fixtures.

## Tests

```powershell
npm test
```

The suite uses Node's built-in test runner. It covers user scoping, security filtering, prompt safeguards, tax simulations, repositories, mock OCR, and query-specific context planning. Tests should stub the LLM and must not send financial data to a live provider.

### Basic edge-case scenarios

The following cases should be covered by automated tests or manual API checks:

| Scenario | Expected behavior |
|---|---|
| Missing payslip fields, such as HRA, TDS, or net pay | Use only fields that are present. The assistant must state that unavailable values are missing rather than inventing or calculating them. |
| Unauthorized access or cross-user document ID | Return the standard unauthorized/not-found response without exposing whether another employee's record exists. |
| Inconsistent OCR output, such as gross pay not matching its components or net pay | Preserve the OCR values as uploaded context, identify the inconsistency when relevant, and defer to structured payroll or clearly label the conflicting source. Do not silently reconcile or invent a corrected value. |
| Tax simulation with missing, zero, negative, malformed, or oversized proposed amounts | Validate the input, enforce the applicable 80C headroom/cap, and return the documented assumptions and disclaimer. Unsupported new-regime savings must be refused rather than estimated. |

Uploaded OCR is request-scoped and is discarded after the response, so a later request must upload the payslip again to test these OCR-specific cases.

## Known limitations

- OCR is deterministic mock data; PDF/image contents are not parsed.
- Context selection is controlled by backend tools. The configured wrapper receives one final grounded prompt containing the selected facts.
- LLM availability and response quality depend on the configured wrapper and API key.
- Tax savings use simplified assumptions, including a 20% marginal-rate estimate for eligible old-regime 80C simulations. This is not tax or legal advice.
- SQLite `:memory:` data disappears on restart and is not shared across processes.
- Uploaded bytes are held in process memory and are not durable object storage.
- Local JWT authentication is a development simulation, not production OIDC.
- The prototype does not provide production key management, field-level encryption, full tax-law coverage, audit-grade retention, or multi-instance consistency.
- The seed payslip fixture may intentionally differ from structured payroll deductions; source labels and refusal behavior are required when facts conflict or are unavailable.

See [docs/architecture.md](docs/architecture.md), [docs/hld.md](docs/hld.md), [docs/lld.md](docs/lld.md), [docs/database.md](docs/database.md), and [docs/testing-strategy.md](docs/testing-strategy.md) for deeper design and test details.
