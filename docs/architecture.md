# Architecture Specification: AI Financial Wellness Assistant

## 1. Executive Summary & Design Philosophy
This system provides employees with document-grounded explanations of their salary structure, deductions, and tax-saving opportunities. 

### Core Architectural Decisions:
* **Separation of Deterministic Logic & Generative AI:** Financial math (tax limits, net pay breakdowns) is handled purely by deterministic JavaScript logic to eliminate mathematical hallucinations. The LLM is used strictly for natural-language explanations and document context grounding.
* **Lean Single-Service Design:** Built as a single Express.js application to minimize operational complexity while maintaining clear modular separation for future microservice extraction.
* **Strict Privacy First:** Data access is hard-bound to authenticated session identities. Context fed to the AI is scoped exclusively to the active user.

---

## 2. High-Level System Architecture

```
[ Client Browser (HTML5 / JS / UI) ]
                │
                │ HTTP POST / Upload & Query (Bearer Token)
                ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        Express.js Server Layer                         │
│                                                                        │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Middleware & Security                      │   │
│   │  • Auth Guard (Tenant Isolation via req.user)                  │   │
│   │  • Upload Guard (5MB Limit, PDF/PNG/JPEG MIME Validation)       │   │
│   │  • Input Guard (HTML Stripping & Prompt Injection Filter)      │   │
│   └────────────────────────────────────────────────────────────────┘   │
│                                │                                       │
│          ┌─────────────────────┴─────────────────────┐                 │
│          ▼                                           ▼                 │
│  ┌───────────────┐                           ┌───────────────┐         │
│  │  Services     │                           │  AI Engine    │         │
│  │ (Tax Engine,  │                           │ (Grounded     │         │
│  │  Payroll DB)  │                           │  Prompting)   │         │
│  └───────┬───────┘                           └───────┬───────┘         │
└──────────┼───────────────────────────────────────────┼─────────────────┘
           │                                           │
           ▼                                           ▼
┌──────────────────────┐                   ┌──────────────────────┐
│ User-Scoped Data Store│                   │      LLM API         │
│ (Mock / PostgreSQL)  │                   │ (Gemini / OpenAI)    │
└──────────────────────┘                   └──────────────────────┘
```

---

## 3. Core Modules & Data Flow

### A. Security & Input Sanitization (`/src/middleware/`)
1. **Tenant Isolation (`authGuard.js`):** Intercepts requests, validates Bearer tokens, and injects `req.user.userId`. Database/Payroll lookups **must** use `req.user.userId` as a primary key.
2. **File Guard (`uploadGuard.js`):** Enforces a strict 5MB limit and filters by MIME type (`application/pdf`, `image/png`, `image/jpeg`). Prevents arbitrary file execution or disk exhaustion.
3. **Input Guard (`securityGuard.js`):** Strips HTML/script tags to prevent XSS attacks and scans user queries against a regex blocklist for common LLM jailbreak attempts (e.g., `"ignore previous instructions"`).

### B. Deterministic Financial Engine (`/src/services/taxCalculator.js`)
* Executes Section 80C deductions, marginal slab estimates, and net pay calculations using static JavaScript functions.
* The output is fed into the LLM as immutable JSON facts rather than allowing the model to compute numbers independently.

### C. Grounded AI Orchestrator (`/src/ai/promptOrchestrator.js`)
* Assembles system instructions, structured payroll JSON, and OCR document text into a bounded prompt context.
* Instructs the model to issue an explicit refusal statement whenever requested information is absent from the provided context.

---

## 4. Security & Privacy Model

| Attack Vector / Risk | Architectural Safeguard |
|---|---|
| **Cross-Tenant Data Leakage** | All API routes enforce user-scoped queries using `req.user.userId` extracted from validated tokens. |
| **Prompt Injection / Jailbreak** | Input sanitization regex blocks system manipulation keywords; strict prompt framing forces context-only answers. |
| **Unbounded Upload Abuse** | In-memory `multer` buffer capping uploads at 5MB with strict file extension and MIME checks. |
| **Hallucinated Financial Calculations** | Financial values are calculated deterministically in code before being passed to the LLM as read-only context. |

---

## 5. Scalability Strategy & Trade-Offs

### Current Prototype State vs. Production Scaling Path

```
Current Prototype                         Production Target
─────────────────                         ─────────────────
In-memory Multer Storage    ───────────►  Direct-to-S3 / Cloud Storage Signed URLs
Mock Payroll JSON File      ───────────►  PostgreSQL / MongoDB with Row-Level Security
In-memory Session Tokens    ───────────►  OAuth2 / OIDC + JWT Identity Provider
Direct SDK Call             ───────────►  Queue Worker (BullMQ/Redis) for Async OCR Parsing
```

### Architectural Trade-offs Made:
1. **In-Memory File Processing vs. Disk Storage:** In-memory buffer storage was selected for speed and zero disk-cleanup overhead during evaluation.
2. **Simplified Tax Logic vs. Full Compliance Engine:** Implemented standard Old/New regime slab estimates to demonstrate system integration without overwhelming the prototype with edge-case compliance logic.