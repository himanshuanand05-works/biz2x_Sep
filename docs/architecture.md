# Architecture Specification: AI Financial Wellness Assistant

## 1. Executive Summary & Design Philosophy

This system provides employees with document-grounded explanations of their salary structure, deductions, reimbursements, and tax-saving opportunities.

Source of truth for class-level contracts, eligibility algorithms, and prompt templates is `docs/lld.md`. This document describes **system-level** decisions. API surfaces and module boundaries are in `docs/hld.md`. Persistence and Sequelize mapping are in `docs/database.md`.

### Core Architectural Decisions

* **Separation of deterministic logic and generative AI:** Financial math (tax limits, net pay, aggregates, eligibility) is handled in JavaScript services. The LLM is used only for natural-language explanation and document-context grounding. It never invents numbers.
* **Lean single-service design:** One Express.js application with strict layering (routes → controllers → services → repositories → Sequelize models) so modules can be extracted later without renaming packages.
* **ORM from day one, database later:** Data access uses **Sequelize** (not TypeORM, Prisma, or Knex). For the prototype, Sequelize targets **SQLite in-memory** (`storage: ':memory:'`). Production target remains **PostgreSQL** by changing dialect and connection env vars—repositories and model definitions stay the same.
* **Repository pattern:** Controllers and services never import Sequelize models or raw SQL. All persistence goes through repository classes that return Promises and expose CRUD-shaped methods (`find`, `findById`, `create`, `update`, `delete` / soft-delete).
* **Policy-driven catalogs:** Deduction and reimbursement types, limits, and applicability live in catalog tables, not hardcoded enums in business services.
* **Strict privacy first:** Data access is bound to authenticated session identity (`req.user.userId` from JWT). Context fed to the AI is scoped exclusively to the active user.

---

## 2. High-Level System Architecture

```
[ Client Browser (HTML5 / JS / UI) ]
                │
                │ HTTPS + Bearer JWT
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                     Express.js Application (single process)            │
│                                                                        │
│   Middleware: Helmet, CORS whitelist, rate limit, JWT auth,            │
│               user-context loader, upload guard, input/prompt guard    │
│                                                                        │
│   ┌──────────────┐  ┌──────────────────┐  ┌─────────────────────────┐  │
│   │ Identity     │  │ Domain services  │  │ AI engine               │  │
│   │ Local OAuth2 │  │ Payroll, tax,    │  │ PromptingService,       │  │
│   │ JWT issue /  │  │ deductions,      │  │ ContextAssembler,       │  │
│   │ validate     │  │ reimbursements,  │  │ LlmClient               │  │
│   │              │  │ documents,       │  │                         │  │
│   │              │  │ eligibility,     │  │                         │  │
│   │              │  │ policy catalogs  │  │                         │  │
│   └──────────────┘  └────────┬─────────┘  └────────────┬────────────┘  │
│                              │                         │               │
│                     ┌────────▼─────────┐               │               │
│                     │ Repositories     │               │               │
│                     │ (user-scoped)    │               │               │
│                     └────────┬─────────┘               │               │
│                              │                         │               │
│                     ┌────────▼─────────┐               │               │
│                     │ Sequelize        │               │               │
│                     │ models + hooks   │               │               │
│                     └────────┬─────────┘               │               │
└──────────────────────────────┼─────────────────────────┼───────────────┘
                               │                         │
                               ▼                         ▼
                    ┌────────────────────┐     ┌────────────────────┐
                    │ SQLite :memory:    │     │ LLM API            │
                    │ (prototype)        │     │ (Gemini / OpenAI)  │
                    │ → PostgreSQL later │     └────────────────────┘
                    └────────────────────┘
```

---

## 3. Layered Module Map

| Layer | Location | Responsibility | Must not |
|---|---|---|---|
| **HTTP** | `src/api/routes`, `controllers`, `validators` | Map HTTP, validate (Joi/Zod), shape `{ success, data }` / `{ success, error }` | Touch Sequelize, compute tax, call LLM |
| **Middleware** | `src/middleware` | Auth, CORS, rate limits, uploads, XSS/prompt filters, errors | Domain math or persistence |
| **Services** | `src/services` | Business rules, eligibility, AI orchestration, OCR adapter | Parse `req`, import models |
| **Repositories** | `src/repositories` | User-scoped CRUD via Sequelize | Enforce JWT; call LLM |
| **Persistence** | `src/models` (Sequelize) | Schema, associations, hooks (audit timestamps) | Business policy beyond DB constraints |
| **Domain** | `src/domain` | Entity shapes, enums, `Money` value object | I/O |

### 3.1 Security & input (`src/middleware/`)

1. **Auth (`authGuard.js`):** Validate Bearer JWT via `LocalOAuth2Service`. Inject `req.user.userId` from `sub`. Never trust `userId` from body or query.
2. **User context (`userContextLoader.js`):** Load profile, active FY, latest payroll cycle, and eligible catalog types for the assistant.
3. **Upload (`uploadGuard.js`):** In-memory Multer, 5 MB cap, MIME allowlist (`application/pdf`, `image/png`, `image/jpeg`).
4. **Input (`securityGuard.js`):** Strip HTML; block prompt-injection patterns on query/text fields.

### 3.2 Domain services (summary)

| Service cluster | Role |
|---|---|
| **Identity** | Mock OAuth2: issue/validate JWT (production: real OIDC). |
| **Policy catalogs** | Versioned deduction/reimbursement types, limits, regime/status filters. |
| **Payroll** | Earnings from `payroll_records`; PAYROLL-scope deductions joined from `deductions`. |
| **Tax** | Deterministic simulations (e.g. 80C headroom) using catalog caps. |
| **Deductions / reimbursements** | CRUD with eligibility services; soft-delete; proof document links. |
| **Documents** | Upload metadata, mock OCR, link to deduction/reimbursement/payslip. |
| **AI** | Intent routing, context assembly, grounded prompt, post-validate numbers. |

### 3.3 Grounded AI orchestrator

Assembles system instructions, structured JSON facts (payroll, deductions, catalogs, OCR excerpts, simulations), and the sanitized user query. Instructs the model to refuse when facts are missing. Numeric answers must match precomputed display strings.

---

## 4. Data & Isolation Model

* **Tenancy:** Every repository query filters by `userId` from the JWT. Catalog tables are global (policy), not tenant-row data.
* **Soft delete + audit:** Persistent entities carry `createdAt`, `updatedAt`, `deletedAt`, `createdBy`, `updatedBy`. Default finds exclude `deletedAt IS NOT NULL`.
* **Money:** Persist and compute in integer minor units (paise). Convert at API and AI-context boundaries only.
* **Documents:** Prototype keeps file **buffers in memory** (Multer). Metadata and mock OCR JSON persist in Sequelize. Production: object storage (S3) + same metadata tables.
* **Unified deductions:** PF, TDS, professional tax, and Section 80C/80D-style declarations share one `deductions` table, distinguished by `scope` and `typeCode` FK to the catalog.

---

## 5. Security & Privacy Model

| Attack vector / risk | Architectural safeguard |
|---|---|
| **Cross-user data leakage** | JWT `sub` is the only authorization scope; repositories require `userId`. |
| **Prompt injection / jailbreak** | Input regex blocklist; system prompt forbids following user-embedded instructions; context-only answers. |
| **Unbounded upload abuse** | In-memory Multer, 5 MB, MIME/extension checks, per-user rate limits. |
| **Hallucinated financial math** | Tax/payroll/eligibility computed in services; LLM receives read-only JSON. |
| **Secrets in source** | `JWT_SECRET`, LLM keys, DB URLs via `process.env` / dotenv. |
| **DoS / abuse** | Helmet, CORS whitelist, `express-rate-limit` keyed by user (IP on `/auth/token`). |
| **Error leakage** | Central error middleware; no stack traces in production. |

---

## 6. Persistence Strategy (Sequelize)

| Phase | Engine | How |
|---|---|---|
| **Now (prototype)** | SQLite in-memory | `sequelize` + `sqlite3`, `dialect: 'sqlite'`, `storage: ':memory:'`. Schema via `sequelize.sync()` (or migrations against a file-backed SQLite if tests need durability across restarts). Process restart wipes data; seed fixtures on boot. |
| **Later (production)** | PostgreSQL | Same models; `dialect: 'postgres'`, connection from env. Prefer migrations over `sync()`. Optional row-level security as a DB-side complement to app-level `userId` filters. |

Sequelize is the **only** ORM. Do not introduce TypeORM, Prisma, or Knex for this codebase.

---

## 7. Scalability Strategy & Trade-Offs

```
Current prototype                         Production target
─────────────────                         ─────────────────
SQLite :memory: via Sequelize  ─────────►  PostgreSQL + Sequelize (same models)
In-memory Multer buffers       ─────────►  Direct-to-S3 / signed URLs
Local JWT IdP                  ─────────►  OAuth2 / OIDC + JWT
Synchronous mock OCR           ─────────►  Queue worker (BullMQ/Redis) + real OCR
Direct LLM SDK call            ─────────►  Optional async jobs for long prompts
```

**Trade-offs:**

1. **In-memory SQLite:** Fast, zero ops, matches “DB remains in-memory for now.” Data is not durable; acceptable for evaluation.
2. **In-memory files:** No disk cleanup; lost on restart; size capped at 5 MB.
3. **Simplified tax logic:** Old/New regime slab estimates and catalog caps—not a full compliance engine.
4. **Single process:** No horizontal session stickiness needed while tokens are JWTs; in-memory DB does **not** share across instances (scale-out requires PostgreSQL).

---

## 8. Out of Scope (Architecture)

* Real OCR / document-understanding pipeline
* Production OIDC (Auth0, Azure AD, etc.)
* Full Indian income-tax engine (all sections, surcharge, rebate edge cases)
* Persistent object storage
* Multi-instance shared database until PostgreSQL cutover
