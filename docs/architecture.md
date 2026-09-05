# Architecture Specification: AI Financial Wellness Assistant

## 1. Executive Summary & Design Philosophy

This system provides employees with document-grounded explanations of their salary structure, deductions, reimbursements, and tax-saving opportunities.

Source of truth for class-level contracts, eligibility algorithms, and prompt templates is `docs/lld.md`. This document describes **system-level** decisions. API surfaces and module boundaries are in `docs/hld.md`. Persistence and Sequelize mapping are in `docs/database.md`.

### Core Architectural Decisions

* **Separation of deterministic logic and generative AI:** Financial math (tax limits, net pay, aggregates, eligibility) is handled in JavaScript services. The LLM is used only for natural-language explanation and document-context grounding. It never invents numbers.
* **Lean single-service design:** One Express.js application with strict layering (routes → controllers → validators/services → repositories → Sequelize models) so modules can be extracted later without renaming packages.
* **Explicit HTTP boundary:** Route modules register endpoints, controllers coordinate request handling, validator middleware checks input, and response-contract functions project public payloads. The application bootstrap registers infrastructure and mounts routes only.
* **ORM from day one, database later:** Data access uses **Sequelize** (not TypeORM, Prisma, or Knex). For the prototype, Sequelize targets **SQLite in-memory** (`storage: ':memory:'`). Production target remains **PostgreSQL** by changing dialect and connection env vars—repositories and model definitions stay the same.
* **Repository pattern:** Controllers and services never import Sequelize models or raw SQL. All persistence goes through repository classes that return Promises and expose CRUD-shaped methods (`find`, `findById`, `create`, `update`, `delete` / soft-delete).
* **Dependency direction:** Controllers and middleware call application/domain services only. Services may call repositories or other services; repositories are never imported by HTTP handlers or middleware.
* **Policy-driven catalogs:** Deduction and reimbursement types, limits, and applicability live in catalog tables, not hardcoded enums in business services.
* **Strict privacy first:** Data access is bound to authenticated session identity (`req.user.userId` from JWT). Context fed to the AI is scoped exclusively to the active user.
* **Grounded prompt boundary:** User questions are never sent directly to the LLM. The backend fetches scoped payroll and OCR data, runs deterministic tax calculations, and injects read-only context into the provider prompt.

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
│   │ Local OAuth2 │  │ Payroll, tax,    │  │ PromptOrchestrator,     │  │
│   │ JWT issue /  │  │ deductions,      │  │ ContextAssembler,       │  │
│   │ validate     │  │ reimbursements,  │  │ LlmClient               │  │
│   │              │  │ documents,       │  │                         │  │
│   │              │  │ policy catalogs  │  │ ContextToolPlanner      │  │
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

## 2. Project Structure

Maintain a layered layout that separates concerns and allows future extraction into microservices without renaming modules.

```
src/
├── api/                          # UI/API layer
│   ├── routes/
│   │   ├── auth.routes.js        # /api/v1/auth/* (token exchange, mock login)
│   │   ├── documents.routes.js   # /api/v1/documents/*
│   │   ├── payroll.routes.js     # /api/v1/payroll/*
│   │   ├── reimbursements.routes.js
│   │   ├── deductions.routes.js
│   │   └── assistant.routes.js   # /api/v1/assistant/*
│   ├── controllers/              # Thin handlers: validate → service → respond
│   └── validators/               # Custom request validation middleware per route
│
├── middleware/                   # Security & access control
│   ├── authGuard.js              # JWT validation + req.user injection
│   ├── userContextLoader.js      # Loads profile, FY, payroll cycle context
│   ├── corsPolicy.js             # Strict origin whitelist
│   ├── rateLimiter.js            # Per-user (JWT sub) rate limiting
│   ├── uploadGuard.js            # Multer + MIME/size checks
│   ├── securityGuard.js          # XSS strip + prompt-injection filter
│   ├── errorHandler.js
│   └── requestLogger.js
│
├── repositories/                 # Data access (in-memory now; PostgreSQL later)
│   ├── UserRepository.js
│   ├── PayrollRepository.js
│   ├── DeductionRepository.js
│   ├── DeductionTypeCatalogRepository.js
│   ├── ReimbursementRepository.js
│   ├── ReimbursementTypeCatalogRepository.js
│   └── UserDocumentRepository.js
│
├── services/
│   ├── identity/
│   │   ├── LocalOAuth2Service.js # Mock IdP: issue + validate JWT
│   │   └── UserService.js        # Employee eligibility context
│   ├── documents/
│   │   ├── UserDocumentService.js
│   │   └── MockOcrService.js     # Returns canned structured OCR payloads
│   ├── payroll/
│   │   ├── PayrollQueryService.js
│   │   └── SalaryBreakupService.js
│   ├── tax/
│   │   ├── TaxCalculatorService.js
│   │   └── TaxSimulationResult.js
│   ├── deductions/
│   │   └── DeductionService.js
│   ├── reimbursements/                    # Repository-backed seeded context
│   ├── policy/
│   │   └── CompanyPolicyService.js
│   └── ai/
│       ├── queryIntent.js        # Assistant intent values
│       ├── ContextToolPlanner.js # Incremental pattern-based intent planning
│       ├── PromptOrchestrator.js # Orchestrates grounded Q&A
│       ├── ContextAssembler.js   # Builds JSON context blocks
│       └── LlmClient.js          # Provider adapter (Gemini/OpenAI)
│
├── utils/
│   ├── money.js                  # toMinorUnits, fromMinorUnits, add, subtract
│   └── apiResponse.js            # { success, data } / { success, error }
│
└── config/
    ├── env.js
    ├── cors.js
    └── rateLimit.js

public/                             # Static UI
server.js                           # App bootstrap, middleware registration
```

| Layer | Responsibility | Must NOT |
|---|---|---|
| **Routes / Controllers** | HTTP mapping, input validation, response shaping | Access repositories directly; perform business math |
| **Services** | Business rules, orchestration, AI context assembly | Parse raw HTTP; store files without document service |
| **Repositories** | CRUD against in-memory store (future ORM) | Enforce auth; call LLM |
| **Middleware** | Cross-cutting security and context | Contain domain calculations |
| **Domain** | Entity shape and invariants | I/O or framework dependencies |

---

## 3. Layered Module Map

| Layer | Location | Responsibility | Must not |
|---|---|---|---|
| **HTTP** | `src/api/routes`, `src/api/controllers`, `src/api/asyncRoute.js` | Register endpoints, coordinate HTTP handlers, forward async failures | Touch Sequelize, compute tax, call LLM |
| **Request validation** | `src/api/validators/requestValidators.js` | Validate required fields, primitive types, and request formats; normalize selected input | Access repositories, perform business eligibility, call LLM |
| **Response contracts** | `src/api/responseContracts.js`, `src/utils/apiResponse.js` | Project public endpoint payloads and wrap them as `{ success, data }` / `{ success, error }` | Expose persistence-only fields or shape domain behavior |
| **Middleware** | `src/middleware` | Auth, CORS, rate limits, uploads, XSS/prompt filters, errors | Domain math or persistence |
| **Services** | `src/services` | Business rules, eligibility, AI orchestration, OCR adapter | Parse `req`, import models |
| **Repositories** | `src/repositories` | User-scoped CRUD via Sequelize | Enforce JWT; call LLM |
| **Persistence** | `src/models` (Sequelize) | Schema, associations, hooks (audit timestamps) | Business policy beyond DB constraints |
| **Feature services** | `src/services` | Identity context, business rules, AI orchestration, OCR, and tax calculations | Parse `req`, import Sequelize models |

The current implementation uses dedicated custom validator middleware rather than Joi or Zod. This keeps the prototype dependency-light while preserving a stable validation boundary. A schema library can replace the validator implementations later without changing routes or controllers.

