# High-Level Design: AI Financial Wellness Assistant

This HLD describes system context, module boundaries, major flows, and API surfaces. Class internals, eligibility algorithms, and prompt text live in `docs/lld.md`. Persistence mapping lives in `docs/database.md`. Architectural principles live in `docs/architecture.md`.

**Persistence assumption:** Sequelize is the ORM. The database remains **in-memory** (SQLite `:memory:`) for this phase. Switching to PostgreSQL is a configuration change, not a rewrite of services.

---

## 1. Goals and Non-Goals

### Goals

- Authenticated employees can inspect payroll breakups, YTD tax, declared deductions, and reimbursements.
- Employees can upload proofs (payslips, tax proofs, reimbursement bills); the system stores metadata and **mock** OCR for AI grounding.
- Employees can add/update/cancel tax declarations and reimbursement claims subject to **policy catalogs** and eligibility services.
- A grounded assistant answers natural-language questions using only user-scoped structured data and document excerpts.
- All money math is deterministic in services; the LLM explains precomputed facts.

### Non-Goals (this phase)

- Real OCR, S3, production IdP, multi-instance shared DB, full tax compliance engine.

---

## 2. System Context

```
┌─────────────┐     JWT + REST      ┌──────────────────────────┐
│ Employee UI │ ──────────────────► │ Financial Wellness API   │
│ (static /   │ ◄────────────────── │ Express + Sequelize      │
│  SPA)       │     JSON envelopes  │ SQLite :memory:          │
└─────────────┘                     └────────────┬─────────────┘
                                                 │
                         ┌───────────────────────┼───────────────────────┐
                         ▼                       ▼                       ▼
                ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
                │ Local OAuth2    │    │ LLM provider    │    │ Policy fixtures │
                │ (JWT_SECRET)    │    │ Gemini / OpenAI │    │ JSON seed on    │
                │                 │    │ API key in env  │    │ boot            │
                └─────────────────┘    └─────────────────┘    └─────────────────┘
```

Actors: **employee** (end user), **system/HR seed** (fixture payroll and catalogs), **LLM provider** (explanation only).

---

## 3. Logical View (Modules)

```
                    ┌──────────── API (v1) ────────────┐
                    │ auth, documents, payroll, policy,│
                    │ deductions, reimbursements,      │
                    │ assistant                        │
                    └───────────────┬──────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌─────────────────┐      ┌─────────────────────┐    ┌─────────────────────┐
│ Identity        │      │ Domain              │    │ AI                  │
│ LocalOAuth2     │      │ PayrollQuery        │    │ PromptingService    │
│                 │      │ SalaryBreakup       │    │ ContextAssembler    │
│                 │      │ TaxCalculator       │    │ PromptTemplates     │
│                 │      │ Deduction + Elig.   │    │ LlmClient           │
│                 │      │ Reimbursement + Elig│    │                     │
│                 │      │ PolicyCatalog       │    │                     │
│                 │      │ UserDocument        │    │                     │
│                 │      │ MockOcr             │    │                     │
└────────┬────────┘      └──────────┬──────────┘    └──────────┬──────────┘
         │                          │                          │
         └──────────────────────────┼──────────────────────────┘
                                    ▼
                         Repositories (userId-scoped)
                                    ▼
                         Sequelize models
                                    ▼
                         SQLite memory / later PostgreSQL
```

Cross-cutting: Helmet, CORS whitelist, JSON body limit, request logging, per-user rate limits, global error handler, uniform JSON envelope.

---

## 4. Runtime View — Key Flows

### 4.1 Authentication

```
POST /api/v1/auth/token  (rate-limit by IP)
  → lookup user in UserRepository
  → LocalOAuth2Service.issueToken
  → { accessToken, refreshToken }

Subsequent APIs:
  Authorization: Bearer <access>
  → authGuard → req.user.userId = JWT.sub
  → (optional) userContextLoader
```

### 4.2 Document upload

```
POST /api/v1/documents/upload
  → auth, rateLimit, uploadGuard (5 MB, pdf/png/jpeg)
  → UserDocumentService.uploadDocument
      → UserDocumentRepository.create (metadata)
      → MockOcrService.extract (canned payload by category)
      → update status OCR_COMPLETE + mockOcrPayload
  → 201 { documentId, status, category }
```

Buffers are not written to disk in the prototype. API responses never include raw file bytes.

### 4.3 Create tax deduction / reimbursement

```
POST /api/v1/deductions  (or reimbursements)
  → auth, validate body
  → *EligibilityService.validate*
  → if invalid under policy: 422 with messages (or documented warning path)
  → Repository.create with policyVersionAtCreation, isValidUnderPolicy
  → hint to upload proof when catalog.requiresProof
```

Payroll-imported rows (`source = PAYROLL_IMPORT`, `scope = PAYROLL`) are not employee-deletable after lock (eligibility `validateRemove`).

### 4.4 Assistant query

```
POST /api/v1/assistant/query
  → auth, stricter rate limit, securityGuard, userContextLoader
  → PromptingService.answerGroundedQuery
      → classify intent
      → ContextAssembler: user, payroll, deductions, reimbursements, documents
      → TaxCalculatorService if TAX_SIMULATION
      → PromptOrchestrator.buildGroundedPrompt(userQuery, scopedContext, simulationResult)
      → LlmClient.query(grounded prompt)
      → validateAndFormatResponse (numbers must appear in context)
  → { answer, intent, sources, assumptions, refusal }
```

The grounded prompt engine always fetches data with `userId` from the validated bearer token. It injects structured payroll, OCR excerpts, and deterministic tax facts into the provider prompt; a raw user question is never sent to the LLM. Unsupported questions such as a manager's salary or foreign tax law are refused before the provider call.

---

## 5. API Surface (v1)

All success: `{ "success": true, "data": ... }`.  
All errors: `{ "success": false, "error": { "message": "...", "code": "..." } }`.

| Method | Path | Auth | Notes |
|---|---|---|---|
| `POST` | `/api/v1/auth/token` | No | Mock login; IP rate limit |
| `POST` | `/api/v1/auth/refresh` | No | Refresh JWT |
| `GET` | `/api/v1/auth/me` | Yes | Claims + profile snapshot |
| `POST` | `/api/v1/documents/upload` | Yes | Multipart; 5 MB |
| `GET` | `/api/v1/documents` | Yes | Filter by category, FY, status |
| `GET` | `/api/v1/documents/:id` | Yes | User-scoped |
| `DELETE` | `/api/v1/documents/:id` | Yes | Soft delete |
| `GET` | `/api/v1/payroll/cycles` | Yes | List cycles for user |
| `GET` | `/api/v1/payroll/:cycle/breakup` | Yes | Earnings + PAYROLL deductions |
| `GET` | `/api/v1/payroll/ytd` | Yes | FY aggregates |
| `GET` | `/api/v1/policy/deduction-types` | Yes | Active catalog (filtered by user context where applicable) |
| `GET` | `/api/v1/policy/reimbursement-types` | Yes | Same |
| `GET` | `/api/v1/deductions` | Yes | List; exclude soft-deleted |
| `POST` | `/api/v1/deductions` | Yes | Eligibility gated |
| `PATCH` | `/api/v1/deductions/:id` | Yes | Re-validate |
| `DELETE` | `/api/v1/deductions/:id` | Yes | Soft delete if allowed |
| `GET` | `/api/v1/deductions/eligible` | Yes | Types user can declare now |
| `POST` | `/api/v1/reimbursements` | Yes | Eligibility gated |
| `POST` | `/api/v1/reimbursements/:id/proof` | Yes | Link document |
| `GET` | `/api/v1/reimbursements` | Yes | List |
| `GET` | `/api/v1/reimbursements/eligible` | Yes | Claimable types |
| `DELETE` | `/api/v1/reimbursements/:id` | Yes | Soft delete if allowed |
| `POST` | `/api/v1/assistant/query` | Yes | Grounded Q&A |
| `GET` | `/api/v1/assistant/checklist` | Yes | Missing proofs (deterministic + optional LLM prose) |

Suggested rate limits: assistant 20/15 min/user; upload 10/15 min/user; token 10/15 min/IP.

---

## 6. Domain Concepts (HLD)

| Concept | Meaning |
|---|---|
| **User** | Employee identity, tenure, rank, employment status, tax regime for the active FY. |
| **PayrollRecord** | Earnings and cached totals for one `payrollCycle` (`YYYY-MM`). Deductions are **not** duplicated as columns. |
| **Deduction** | Unified row: PAYROLL (PF, TDS, PT), TAX_DECLARATION (80C/80D/…), or EMPLOYER (informational). |
| **DeductionTypeCatalog** | Policy: limits, `aggregateGroup`, regimes, who may use the type. |
| **Reimbursement** | Claim against a catalog type; statuses DRAFT → … → PAID. |
| **UserDocument** | File metadata + mock OCR; optional `linkedEntityType` / `linkedEntityId`. |
| **TaxSimulationResult** | Value object: precomputed savings + explicit assumptions for the LLM. |

Money in APIs is decimal **strings** (`"12500.00"`). Internally: integer paise.

---

## 7. Assistant Intents (Product)

| Intent | Example | Primary sources |
|---|---|---|
| `SALARY_EXPLAIN` | Why is net lower this month? | Cycle compare, reimbursements |
| `COMPONENT_LOOKUP` | How much HRA? | PayrollRecord |
| `DEDUCTION_BREAKDOWN` | What was deducted? | `deductions` scope PAYROLL |
| `YTD_SUMMARY` | Tax paid YTD? | PAYROLL deductions by type across FY |
| `TAX_SIMULATION` | Extra ₹50k in 80C? | TaxCalculator + catalog headroom |
| `COMPONENT_EDUCATION` | Explain PF | Catalog description + user row |
| `PROOF_CHECKLIST` | Missing proofs? | TAX_DECLARATION vs proof links |
| `ELIGIBILITY_OPTIONS` | What can I claim? | Eligibility `getAvailableTypes` |
| `DOCUMENT_GROUNDED` | What does Form 16 show? | `mockOcrPayload` |

---

## 8. Deployment View (Prototype)

- **Process:** Single Node.js LTS process (`server.js` / `src/index.js`).
- **Config:** `dotenv` — `JWT_SECRET`, `ALLOWED_ORIGINS`, rate-limit env, LLM keys, `DB_DIALECT=sqlite` (implied).
- **State:** Sequelize SQLite memory + Multer buffers. Restart = empty DB; boot seed from `src/fixtures/`.
- **UI:** Static files under `public/` or same origin; CORS whitelist for other origins.

Production HLD delta: PostgreSQL, object storage, OIDC, OCR worker queue, possibly split AI worker.

---

## 9. Quality Attributes

| Attribute | Approach |
|---|---|
| **Security** | JWT, Helmet, CORS, rate limits, upload MIME/size, prompt filters, sanitized errors |
| **Privacy** | User-scoped repositories; AI context never includes other employees |
| **Correctness** | Integer money; eligibility before persist; LLM post-check for stray amounts |
| **Maintainability** | Layers + repositories; catalogs instead of hardcoded type enums |
| **Evolvability** | Same Sequelize models for SQLite memory and PostgreSQL |
| **Observability** | Structured logger (pino/winston); request IDs in middleware (implementation) |

---

## 10. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| In-memory DB lost / not shared across instances | Document as prototype-only; PostgreSQL before any multi-instance deploy |
| LLM hallucinates figures | Precompute + post-validate; low temperature; refusal when data missing |
| Catalog vs code drift | Seed fixtures + `policyVersion` stamped on employee rows |
| Soft-delete unique keys | Partial unique indexes (PostgreSQL); prototype SQLite approximates in repository |
