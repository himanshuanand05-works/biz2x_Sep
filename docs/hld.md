# High-Level Design: AI Financial Wellness Assistant

This document describes the current prototype. Detailed model fields and service contracts belong in `docs/lld.md`; persistence mapping belongs in `docs/database.md`; test scope belongs in `docs/testing-strategy.md`.

## 1. Scope

### Implemented

- Local password authentication with scrypt-backed `passwordHash` values.
- JWT access and refresh tokens.
- User-scoped assistant queries.
- Mock OCR for an uploaded PDF, PNG, or JPEG payslip.
- Seeded payroll, deduction, reimbursement, document, and policy data.
- Deterministic money conversion and simplified 80C simulation.
- Uniform JSON success and error envelopes.

### Planned or excluded

- Public payroll, deduction, reimbursement, policy, and document CRUD APIs.
- General deduction/reimbursement eligibility services.
- Persistent upload storage and real OCR.
- Production OIDC, PostgreSQL, multi-instance deployment, and full tax compliance.

## 2. System Context

```text
Employee client
    | HTTPS/REST, Bearer JWT
    v
Express API
    |-- Local identity service
    |-- Assistant orchestration
    |-- Sequelize repositories
    |       `-- SQLite :memory:
    `-- LLM provider adapter
```

The LLM explains scoped facts. It is not the source of payroll, deduction, reimbursement, or tax values. Policy data comes from local fixtures seeded into catalog tables.

## 3. Module Boundaries

```text
Routes
  -> controllers and middleware
    -> application/domain services
      -> repositories
        -> Sequelize models
```

### HTTP and middleware

- `authController`: delegates token, refresh, and current-user operations to `AuthenticationService`.
- `assistantController`: handles the assistant request, optional upload, orchestration, audit logging, and response projection.
- `authGuard`: validates access JWTs and sets `req.user` from JWT claims.
- `userContextLoader`: calls `UserContextService.load()` and sets the latest payroll context.
- `uploadGuard`: in-memory Multer upload handling, 5 MB limit, PDF/PNG/JPEG allowlist.
- `securityGuard`: rejects prompt-injection patterns and strips markup from query/prompt fields.
- `rateLimiter`: uses authenticated user ID when available, otherwise client IP.
- `errorHandler`: logs internal details and returns a sanitized error envelope.

### Services

- Identity: `AuthenticationService`, `UserContextService`, `UserService`, `LocalOAuth2Service`.
- Assistant: `PromptOrchestrator`, `ContextToolPlanner`, `ContextAssembler`, `LlmClient`.
- Documents: `UserDocumentService`, `MockOcrService`.
- Policy: `CompanyPolicyService`.
- Financial: `DeductionService`, `TaxCalculatorService`, `TaxSimulationResult`.

`DeductionEligibilityService`, `ReimbursementEligibilityService`, `ReimbursementService`, and `PayrollQueryService` are planned and are not current classes.

### Persistence

Repositories are the only application layer that accesses Sequelize models. Current repositories cover users, documents, payroll, deductions, reimbursements, and both catalog tables. Models use Sequelize timestamps, snake_case columns, and paranoid soft delete. Prototype relationships are logical ID links; database foreign keys and partial indexes are not configured.

## 4. Runtime Flows

### 4.1 Authentication

```text
POST /api/v1/auth/token
  -> validation
  -> AuthenticationService.issueToken(email, password)
  -> UserRepository lookup
  -> verify passwordHash
  -> LocalOAuth2Service.issueToken(userId, profile)
  -> accessToken + refreshToken
```

Refresh validation and user lookup are also owned by `AuthenticationService`. `LocalOAuth2Service` validates issuer, audience, expiry, and refresh-token type.

### 4.2 Assistant query

```text
POST /api/v1/assistant/query
  -> authGuard
  -> assistant rate limiter
  -> uploadGuard
  -> request validation
  -> securityGuard
  -> userContextLoader
  -> queryAssistant
       -> optional UserDocumentService.uploadDocument
       -> PromptOrchestrator.getRefusal
       -> ContextToolPlanner.plan
       -> ContextAssembler.assemble
       -> optional TaxCalculatorService.calculate80CSavings
       -> PromptOrchestrator.buildGroundedPrompt
       -> LlmClient.query
       -> assistantResponse
```

Uploaded OCR is request-scoped and discarded after the response. It is not created through `UserDocumentRepository`. Seeded documents can be read from persistence when their status is `OCR_COMPLETE`.

### 4.3 Context assembly

`ContextAssembler.assemble()` returns:

```text
employeeId
financialYear
userProfile
payroll
payrollComparison
deductions
reimbursements
ytd
companyPolicies
documents
```

All repository reads are scoped using the authenticated user ID. Monetary values are formatted for the prompt; the current formatter does not consistently include both raw minor units and display strings.

### 4.4 Refusal and audit behavior

Deterministic pre-context refusals currently cover manager salary questions and selected France/foreign tax-law questions. Missing records generally reach the grounded prompt as empty or null context and rely on the provider instructions to refuse.

Structured logs currently cover document upload, assistant refusal/query, payslip access, deduction access, reimbursement access, payroll access, and LLM requests.

## 5. Mounted API Surface

All responses use `{ success, data }` for success and `{ success: false, error }` for errors.

| Method | Path | Handler |
|---|---|---|
| GET | `/health` | inline health handler |
| GET | `/api-docs` | Swagger UI |
| POST | `/api/v1/auth/token` | `issueToken` |
| POST | `/api/v1/auth/refresh` | `refreshToken` |
| GET | `/api/v1/auth/me` | `getCurrentUser` |
| POST | `/api/v1/assistant/query` | `queryAssistant` |

Payroll, deduction, reimbursement, policy, document CRUD, and checklist routes are not mounted in the current application.

## 6. Data and Isolation Model

- `User` stores employee profile data and a persistence-only `passwordHash`.
- `PayrollRecord` stores earnings and cached totals in integer minor units.
- `Deduction` stores payroll, tax-declaration, and employer rows distinguished by `scope` and `typeCode`.
- `Reimbursement` and catalog rows are seeded and queryable through repositories, but have no public mutation API.
- `UserDocument` stores metadata and optional mock OCR payload. Uploaded assistant files are not persisted.
- `typeCode`, `proofDocumentId`, and document link fields are logical application identifiers.
- Sequelize paranoid queries omit soft-deleted rows by default; no public delete or admin restore flow is mounted.

## 7. Security and Privacy

- JWT `sub` is the authorization identity; request-supplied user IDs are not trusted.
- User-scoped repository methods receive the authenticated user ID.
- Passwords are never stored as plaintext; `passwordHash` contains a salt and scrypt-derived key.
- `passwordHash` is excluded by response projection.
- Helmet, CORS, body limits, upload limits, rate limits, input filtering, and centralized error handling are active.
- The local password login flow still requires a production restriction before deployment.

## 8. Deployment and Persistence

The prototype runs as one Node.js process. `src/index.js` initializes Express and `server.js` starts the application. Sequelize uses SQLite `:memory:` by default, so restart resets the database and seed data is loaded again. Configuration comes from environment variables, including JWT, CORS, rate-limit, LLM, and database settings.

The production direction is PostgreSQL with migrations, object storage for files, OIDC, real OCR, and optionally asynchronous AI/OCR workers. These are migration targets, not current runtime components.

## 9. Risks and Trade-offs

| Risk | Current mitigation or status |
|---|---|
| Database resets on restart | Accepted prototype limitation; PostgreSQL is the production target. |
| LLM hallucination | Grounded prompt, deterministic calculations, refusal instructions; post-response factual validation is not implemented. |
| Cross-user disclosure | JWT-scoped repository reads and user context assembly. |
| Upload abuse | MIME allowlist, 5 MB memory limit, and route rate limiting. |
| Catalog drift | Seed fixtures and policy versions; public catalog administration is planned. |
| Local authentication in production | Must be replaced or explicitly restricted by OIDC deployment. |
