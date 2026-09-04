# AI Financial Wellness Assistant

A secure, API-first prototype that helps employees understand salary components, payroll deductions, reimbursements, year-to-date values, uploaded payslips, and simplified tax-saving scenarios.

The application uses Express, Sequelize, and SQLite by default. Payroll and policy data are seeded for a demo employee. Uploaded documents use in-memory storage and deterministic mock OCR. The LLM is used only for grounded explanations; financial calculations are performed by backend services.

## Requirements

- Node.js 20 or later
- npm 10 or later
- An LLM wrapper endpoint and API key for assistant responses
- PostgreSQL only if the optional PostgreSQL configuration is used

## Install and run

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

The API listens on `http://localhost:3000` by default.

For a production-style start:

```powershell
npm start
```

The process initializes the database and seed data on startup. With the default SQLite `:memory:` database, all data is lost when the process stops or restarts.

## Environment configuration

Create `.env` in the project root. The application reads environment variables once during startup, so restart the process after changing `.env`.

### Minimal local configuration

```dotenv
NODE_ENV=development
PORT=3000
JWT_SECRET=replace-with-a-long-random-development-secret
LLM_BASE_URL=https://your-llm-wrapper.example.com
LLM_API_KEY=replace-with-your-llm-api-key
```

Never commit `.env` or put real secrets in source control. Use a secret manager in a deployed environment.

### Complete variable reference

| Variable | Default | Required | Effect |
|---|---|---:|---|
| `NODE_ENV` | `development` | No | Sets the runtime mode. `production` disables Sequelize SQL logging and changes error handling behavior. |
| `PORT` | `3000` | No | HTTP port used by `src/index.js`. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | No | Comma-separated browser origins allowed by CORS. Requests without an `Origin` header, such as curl, are allowed. |
| `JWT_SECRET` | empty | Yes for auth | Secret used to sign and verify access and refresh JWTs. Without it, token issuance fails with `CONFIG_ERROR`. |
| `JWT_ISSUER` | `local-idp` | No | JWT issuer claim and validation requirement. Change it only when all tokens are issued with the new value. |
| `JWT_AUDIENCE` | `financial-wellness-api` | No | JWT audience claim and validation requirement. |
| `JWT_ACCESS_EXPIRES` | `1h` | No | Access-token lifetime accepted by the `jsonwebtoken` library. |
| `JWT_REFRESH_EXPIRES` | `7d` | No | Refresh-token lifetime. |
| `DB_DIALECT` | `sqlite` | No | Use `sqlite` for the prototype or `postgres` for a PostgreSQL database. |
| `DB_STORAGE` | `:memory:` | No | SQLite storage location. Set a file path such as `./data/dev.sqlite` to preserve local SQLite data across restarts. |
| `DATABASE_URL` | empty | Required for PostgreSQL | PostgreSQL connection string. Required when `DB_DIALECT=postgres`. Install the `pg` driver before using PostgreSQL. |
| `RATE_LIMIT_WINDOW_MS` | `900000` | No | Rate-limit window in milliseconds; default is 15 minutes. |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | No | Default limit for protected routes that use the general limiter. |
| `RATE_LIMIT_ASSISTANT_MAX` | `20` | No | Assistant requests allowed per user in the configured window. |
| `RATE_LIMIT_UPLOAD_MAX` | `10` | No | Document uploads allowed per user in the configured window. |
| `RATE_LIMIT_AUTH_MAX` | `10` | No | Authentication requests allowed per IP in the configured window. |
| `MAX_FILE_SIZE_BYTES` | `5242880` | No | Maximum upload size. The default is 5 MiB. |
| `LLM_PROVIDER` | `gemini` | No | Provider label retained for adapter configuration and diagnostics. |
| `LLM_BASE_URL` | project wrapper URL | No | Base URL for the HTTP LLM wrapper. The client posts to `${LLM_BASE_URL}/llm/query`. |
| `LLM_API_KEY` | empty | Required for assistant | Bearer credential sent only from the backend to the configured LLM wrapper. Without it, assistant calls fail with `CONFIG_ERROR`. |
| `LLM_MODEL` | `gemini-1.5-pro` | No | Model label available to provider configuration. The current HTTP client sends the prompt to the wrapper, which decides how to use provider settings. |
| `LLM_TEMPERATURE` | `0.3` | No | Intended provider temperature setting. The current adapter does not add it to its request body. |
| `LLM_TIMEOUT_MS` | `30000` | No | Timeout for an LLM HTTP request. Timeout errors return `LLM_TIMEOUT`. |
| `LLM_JSON_LIMIT` | `8mb` | No | JSON body limit for `/api/v1/llm` routes, useful when base64 documents are supplied. |

Environment values that represent numbers are parsed with JavaScript `Number`. Use plain numeric values, without units or commas. `ALLOWED_ORIGINS` is the only comma-separated setting.

## Demo data and authentication

The first startup seeds one development employee:

- Email: `jane@company.com`
- Password: `demo`
- Employee ID: `emp_101`
- Tax regime: `OLD`
- Seeded payroll cycles: `2026-03` and `2026-04`
- Active financial year: `2026-2027`

Get a token pair:

```powershell
$body = @{ email = 'jane@company.com'; password = 'demo' } | ConvertTo-Json
$tokens = Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/auth/token -ContentType 'application/json' -Body $body
$accessToken = $tokens.data.accessToken
```

Use the access token on protected routes:

```powershell
$headers = @{ Authorization = "Bearer $accessToken" }
Invoke-RestMethod -Headers $headers http://localhost:3000/api/v1/payroll/2026-04/breakup
```

The token subject (`sub`) is the authorization scope. A `userId` supplied in a request body or query string does not change that scope.

## Main API flows

All successful responses use `{ "success": true, "data": ... }`. Errors use `{ "success": false, "error": { "message": ..., "code": ... } }`.

### Health and API documentation

- `GET /health`
- `GET /api-docs`

### Authentication

- `POST /api/v1/auth/token` with `{ "email", "password" }`
- `POST /api/v1/auth/refresh` with `{ "refreshToken" }`
- `GET /api/v1/auth/me`

### Documents and payslips

Upload a PDF, PNG, or JPEG as multipart field `file`:

```powershell
curl.exe -X POST http://localhost:3000/api/v1/documents/upload `
  -H "Authorization: Bearer $accessToken" `
  -F "file=@payslip.pdf" `
  -F "category=PAYSLIP" `
  -F "financialYear=2026-2027" `
  -F "payrollCycle=2026-04"
```

Allowed MIME types are `application/pdf`, `image/png`, and `image/jpeg`. The default maximum size is 5 MiB. Files stay in memory; only metadata and mock OCR output are persisted. Mock OCR is selected by document category and is defined in `src/fixtures/ocr/index.js`.

Document routes:

- `POST /api/v1/documents/upload`
- `GET /api/v1/documents`
- `GET /api/v1/documents/:id`
- `DELETE /api/v1/documents/:id`

### Payroll and deductions

- `GET /api/v1/payroll/cycles`
- `GET /api/v1/payroll/:cycle/breakup`
- `GET /api/v1/payroll/ytd?financialYear=2026-2027`
- `GET /api/v1/deductions`
- `POST /api/v1/deductions`
- `PATCH /api/v1/deductions/:id`
- `DELETE /api/v1/deductions/:id`
- `GET /api/v1/deductions/eligible`

Money is persisted internally as integer minor units (paise) and returned by the API as decimal strings such as `"118600.00"`.

### Reimbursements and policies

- `POST /api/v1/reimbursements`
- `POST /api/v1/reimbursements/:id/proof`
- `GET /api/v1/reimbursements`
- `GET /api/v1/reimbursements/eligible`
- `DELETE /api/v1/reimbursements/:id`
- `GET /api/v1/policy/deduction-types`
- `GET /api/v1/policy/reimbursement-types`

Catalog fixtures define eligibility, limits, applicable regimes/statuses, policy versions, and proof requirements. Update `src/fixtures/policy/deductionTypes.js` or `src/fixtures/policy/reimbursementTypes.js` and restart with a clean database when changing demo policy data.

### Grounded assistant

- `POST /api/v1/assistant/query`
- `GET /api/v1/assistant/checklist`
- `POST /api/v1/llm/query` for the lower-level authenticated wrapper flow

Example assistant request:

```powershell
$body = @{ query = 'How much HRA did I receive?' } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri http://localhost:3000/api/v1/assistant/query -Headers $headers -ContentType 'application/json' -Body $body
```

The assistant assembles only the authenticated employee's profile, payroll, deductions, reimbursements, and OCR-complete documents. For an 80C simulation, send `proposed80C` and optionally `financialYear`; the backend computes the deterministic result before the prompt is sent. The LLM is instructed to refuse missing facts and not perform independent tax or net-pay calculations.

The current checklist route is a placeholder and returns an empty `missingProofs` array. It must be connected to declaration and proof status data before it can provide a complete investment-proof checklist.

## Changing application behavior

### Add or change seeded users and payroll

Edit `src/db/seed.js`. The seed runs only when the users table is empty. With SQLite `:memory:`, restarting naturally reseeds. With file-backed SQLite or PostgreSQL, remove/reset the development database before expecting seed changes to apply.

### Change policy rules

Edit the policy fixture files under `src/fixtures/policy/`. Catalog values are stored when the database is seeded, so existing rows retain their policy version and do not automatically change when fixture files are edited.

### Change mock OCR output

Edit `src/fixtures/ocr/index.js`. The mock adapter returns data by category (`PAYSLIP`, `TAX_PROOF`, `REIMBURSEMENT_PROOF`, `PREVIOUS_EMPLOYER`, `DECLARATION`, or `OTHER`). This is not real OCR.

### Change security behavior

- JWT validation and the trusted user scope: `src/middleware/authGuard.js`
- Prompt-injection and markup filtering: `src/middleware/securityGuard.js`
- Upload MIME and size checks: `src/middleware/uploadGuard.js`
- CORS origins: `ALLOWED_ORIGINS` and `src/config/cors.js`
- Rate limits: environment variables and `src/config/rateLimit.js`
- Security headers: `helmet()` registration in `src/index.js`

### Change LLM behavior

Update `src/services/ai/PromptOrchestrator.js` for grounding rules, intent classification, and refusal rules. Update `src/services/ai/LlmClient.js` for provider request/response behavior. Keep salary, deduction, and tax calculations in deterministic services rather than moving them into prompts.

### Use PostgreSQL

Set:

```dotenv
DB_DIALECT=postgres
DATABASE_URL=postgres://user:password@host:5432/database
```

Install the PostgreSQL Sequelize driver with `npm install pg`. The current bootstrap calls `sequelize.sync()` and is suitable for a prototype; use migrations, managed secrets, TLS, object storage, and a production identity provider before deploying this application.

## Tests

Run all tests:

```powershell
npm test
```

The suite uses Node's built-in test runner. The test strategy and requirement traceability are documented in [docs/testing-strategy.md](docs/testing-strategy.md). Tests should stub the LLM and use isolated employee fixtures; they must not send salary or tax data to a live provider.

## Architecture and limitations

- Routes and middleware handle HTTP, authentication, validation, uploads, and response envelopes.
- Services own payroll, eligibility, tax, document, and AI orchestration logic.
- Repositories are the only persistence access layer.
- Sequelize uses SQLite `:memory:` by default.
- Authentication is a local JWT simulation, not production OIDC.
- OCR is mocked and documents are held in process memory.
- Tax calculations are simplified estimates, not tax or legal advice.
- The prototype is single-process and does not provide production encryption, durable document storage, full tax compliance, or multi-instance shared state.

See [docs/architecture.md](docs/architecture.md), [docs/hld.md](docs/hld.md), [docs/lld.md](docs/lld.md), and [docs/database.md](docs/database.md) for the detailed design.
