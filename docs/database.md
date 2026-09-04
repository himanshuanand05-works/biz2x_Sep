# Database Design: AI Financial Wellness Assistant

This document defines persistence for the prototype and the intended production mapping. **ORM is Sequelize** (not TypeORM, Prisma, or Knex). **The database remains in-memory for now.**

Class-level field semantics and eligibility rules: `docs/lld.md`. Architecture and HLD: `docs/architecture.md`, `docs/hld.md`.

---

## 1. Strategy

| Item | Decision |
|---|---|
| **ORM** | Sequelize (ESM), models in `src/models`, initialized from `src/config/database.js` |
| **Prototype store** | SQLite **in-memory**: `dialect: 'sqlite'`, `storage: ':memory:'` |
| **Durability** | None across process restart. Seed catalogs, users, and sample payroll on boot. |
| **Production store** | PostgreSQL: same models, `dialect: 'postgres'`, credentials from `process.env` |
| **Access path** | Controllers/services → **Repository** → Sequelize model. No `Model.findAll` in services. |
| **Money** | `BIGINT` minor units (paise). Never `FLOAT`/`DECIMAL` for computed payroll math. |
| **JSON** | Sequelize `DataTypes.JSON` (SQLite) / `JSONB` (PostgreSQL) for arrays and snapshots |
| **Deletes** | Soft delete via `deletedAt`. Repositories default `where: { deletedAt: null }` (or Sequelize `paranoid: true`) |
| **IDs** | Application-generated string PKs (`VARCHAR(50)`) for portability across SQLite and PostgreSQL |

### 1.1 Sequelize connection (prototype)

```javascript
// Conceptual — env-driven. Do not hardcode secrets.
import { Sequelize } from 'sequelize';

export function createSequelize() {
  const dialect = process.env.DB_DIALECT ?? 'sqlite';

  if (dialect === 'sqlite') {
    return new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE ?? ':memory:',
      logging: false
    });
  }

  return new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false
  });
}
```

- `DB_STORAGE=:memory:` — default prototype (non-durable).
- Optional file SQLite (`./data/dev.sqlite`) if a developer needs data to survive nodemon restarts **without** PostgreSQL; still not the production path.
- Prototype schema: `await sequelize.sync()` after model registration, then run seeders.
- Production: Sequelize migrations; do not rely on `sync({ alter: true })`.

### 1.2 Shared audit mixin

All employee and catalog tables (except ephemeral value objects) include:

| Column | Type | Notes |
|---|---|---|
| `created_at` | TIMESTAMP | Sequelize `timestamps` + `createdAt` |
| `updated_at` | TIMESTAMP | Auto on update |
| `deleted_at` | TIMESTAMP NULL | Soft delete; NULL = active |
| `created_by` | VARCHAR(50) NULL | `userId` or `'system'` |
| `updated_by` | VARCHAR(50) NULL | Last actor |

`paranoid: true` on models so default finds omit soft-deleted rows.

---

## 2. Entity Relationship (logical)

```
users 1 ─── * user_documents
users 1 ─── * payroll_records          UNIQUE (user_id, payroll_cycle) among active rows
users 1 ─── * deductions
users 1 ─── * reimbursements

deduction_type_catalog 1 ─── * deductions          (type_code)
reimbursement_type_catalog 1 ─── * reimbursements  (type_code)

deductions.proof_document_id      → user_documents (optional)
reimbursements.proof_document_id  → user_documents (optional)

user_documents.linked_entity_type + linked_entity_id
  → logical link to DEDUCTION | REIMBURSEMENT | USER_PROFILE | PAYROLL_CYCLE
  (validated in UserDocumentService; not a polymorphic DB FK)

payroll_records ── (logical, by user_id + payroll_cycle)
  → deductions WHERE scope = 'PAYROLL'
```

---

## 3. Enumerations (persisted as VARCHAR)

Stored as strings; validated in services / Sequelize `ENUM` only if both dialects support the same set. Prefer VARCHAR + application validation for SQLite/PostgreSQL parity.

| Enum | Values |
|---|---|
| `DocumentCategory` | `PAYSLIP`, `TAX_PROOF`, `REIMBURSEMENT_PROOF`, `PREVIOUS_EMPLOYER`, `DECLARATION`, `OTHER` |
| `DocumentStatus` | `UPLOADED`, `OCR_PENDING`, `OCR_COMPLETE`, `OCR_FAILED`, `ARCHIVED` |
| `LinkedEntityType` | `DEDUCTION`, `REIMBURSEMENT`, `USER_PROFILE`, `PAYROLL_CYCLE` |
| `EmploymentStatus` | `ACTIVE`, `PROBATION`, `NOTICE_PERIOD`, `ON_LEAVE`, `EXITED` |
| `EmployeeType` | `FULL_TIME`, `CONTRACT`, `INTERN` |
| `TaxRegime` | `OLD`, `NEW` |
| `DeductionScope` | `PAYROLL`, `TAX_DECLARATION`, `EMPLOYER` |
| `DeductionStatus` | `DECLARED`, `APPLIED`, `PROOF_SUBMITTED`, `VERIFIED`, `REJECTED`, `CANCELLED` |
| `ReimbursementStatus` | `DRAFT`, `SUBMITTED`, `UNDER_REVIEW`, `APPROVED`, `REJECTED`, `PAID`, `CANCELLED` |
| `Deduction.source` | `EMPLOYEE`, `PAYROLL_IMPORT`, `HR`, `SYSTEM` |

Deduction/reimbursement **kinds** are catalog `type_code` strings (`PF_EMPLOYEE`, `80C_ELSS`, `MEDICAL`, …), not code enums.

---

## 4. Tables

Column names below are **snake_case** in the database (`underscored: true` in Sequelize). JavaScript models use camelCase.

### 4.1 `users`

| Column | Type | Constraints |
|---|---|---|
| `user_id` | VARCHAR(50) | PK |
| `name` | VARCHAR(255) | NOT NULL |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE |
| `employee_code` | VARCHAR(50) | NOT NULL |
| `department` | VARCHAR(100) | NULL |
| `designation` | VARCHAR(100) | NULL |
| `rank` | VARCHAR(30) | NULL |
| `employee_type` | VARCHAR(20) | DEFAULT `FULL_TIME` |
| `location` | VARCHAR(100) | NULL |
| `manager_id` | VARCHAR(50) | NULL, FK `users.user_id` |
| `date_of_joining` | DATE | NULL |
| `employment_start_date` | DATE | NULL |
| `probation_end_date` | DATE | NULL |
| `employment_status` | VARCHAR(20) | DEFAULT `ACTIVE` |
| `notice_period_end_date` | DATE | NULL |
| `exit_date` | DATE | NULL |
| `tax_regime` | VARCHAR(10) | DEFAULT `OLD` |
| `tax_regime_declared_at` | TIMESTAMP | NULL |
| `tax_regime_locked` | BOOLEAN | DEFAULT FALSE |
| `active_financial_year` | VARCHAR(9) | NULL |
| audit columns | | as §1.2 |

**Indexes:** `(employment_status, rank)` among active rows.

Do **not** store JWTs on `users`.

### 4.2 `user_documents`

| Column | Type | Constraints |
|---|---|---|
| `document_id` | VARCHAR(50) | PK |
| `user_id` | VARCHAR(50) | NOT NULL, FK `users` |
| `category` | VARCHAR(30) | NOT NULL |
| `file_name` | VARCHAR(255) | NOT NULL |
| `mime_type` | VARCHAR(100) | NOT NULL |
| `file_size_bytes` | INTEGER | NOT NULL |
| `status` | VARCHAR(20) | DEFAULT `UPLOADED` |
| `mock_ocr_payload` | JSON | NULL |
| `linked_entity_type` | VARCHAR(30) | NULL |
| `linked_entity_id` | VARCHAR(50) | NULL |
| `financial_year` | VARCHAR(9) | NULL |
| `payroll_cycle` | VARCHAR(7) | NULL |
| audit | | |

**Indexes:** `(user_id, category)`; `(linked_entity_type, linked_entity_id)` among active rows.

File bytes are **not** a DB column in the prototype (held in process memory if needed). Production may add `storage_key` for S3.

### 4.3 `deduction_type_catalog`

| Column | Type | Constraints |
|---|---|---|
| `type_code` | VARCHAR(50) | PK |
| `display_name` | VARCHAR(150) | NOT NULL |
| `description` | TEXT | NULL |
| `scope` | VARCHAR(20) | NOT NULL |
| `section_code` | VARCHAR(20) | NULL |
| `reduces_net_pay` | BOOLEAN | DEFAULT TRUE |
| `min_amount_minor` | BIGINT | DEFAULT 0 |
| `max_amount_minor` | BIGINT | NULL |
| `max_aggregate_minor` | BIGINT | NULL |
| `aggregate_group` | VARCHAR(30) | NULL |
| `applicable_regimes` | JSON | NOT NULL, default `["OLD"]` |
| `applicable_statuses` | JSON | NOT NULL |
| `applicable_employee_types` | JSON | NOT NULL |
| `applicable_ranks` | JSON | NULL = all ranks |
| `min_tenure_months` | INTEGER | DEFAULT 0 |
| `requires_proof` | BOOLEAN | DEFAULT FALSE |
| `proof_document_category` | VARCHAR(30) | NULL |
| `effective_from` | DATE | NOT NULL |
| `effective_to` | DATE | NULL |
| `policy_version` | VARCHAR(50) | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| `sort_order` | INTEGER | DEFAULT 0 |
| audit | | `created_by` / `updated_by` optional for catalogs |

Illustrative seed rows: `PF_EMPLOYEE`, `TDS`, `PROFESSIONAL_TAX`, `80C_ELSS`, `80C_PPF`, `80D_SELF`, `80CCD1B_NPS`, `PF_EMPLOYER` (see LLD §4.4.1). Amounts in paise (e.g. ₹1,50,000 → `15000000`).

### 4.4 `reimbursement_type_catalog`

| Column | Type | Constraints |
|---|---|---|
| `type_code` | VARCHAR(50) | PK |
| `display_name` | VARCHAR(150) | NOT NULL |
| `description` | TEXT | NULL |
| `min_amount_minor` | BIGINT | DEFAULT 0 |
| `max_amount_minor` | BIGINT | NULL |
| `max_per_fy_minor` | BIGINT | NULL |
| `max_per_cycle_minor` | BIGINT | NULL |
| `applicable_statuses` | JSON | NOT NULL |
| `applicable_ranks` | JSON | NULL |
| `min_tenure_months` | INTEGER | DEFAULT 0 |
| `requires_proof` | BOOLEAN | DEFAULT TRUE |
| `proof_document_category` | VARCHAR(30) | DEFAULT `REIMBURSEMENT_PROOF` |
| `effective_from` / `effective_to` | DATE | |
| `policy_version` | VARCHAR(50) | NOT NULL |
| `is_active` | BOOLEAN | DEFAULT TRUE |
| audit | | |

### 4.5 `deductions`

| Column | Type | Constraints |
|---|---|---|
| `deduction_id` | VARCHAR(50) | PK |
| `user_id` | VARCHAR(50) | NOT NULL, FK `users` |
| `type_code` | VARCHAR(50) | NOT NULL, FK catalog |
| `scope` | VARCHAR(20) | NOT NULL (denormalized from catalog) |
| `amount_minor` | BIGINT | NOT NULL |
| `currency` | CHAR(3) | DEFAULT `INR` |
| `payroll_cycle` | VARCHAR(7) | NULL; **required when `scope = PAYROLL`** (enforce in repository/service; SQLite CHECK optional) |
| `financial_year` | VARCHAR(9) | NOT NULL |
| `start_date` / `end_date` | DATE | NULL |
| `declared_under_regime` | VARCHAR(10) | NOT NULL |
| `is_valid_under_policy` | BOOLEAN | DEFAULT FALSE |
| `validation_messages` | JSON | DEFAULT `[]` |
| `policy_version_at_creation` | VARCHAR(50) | NOT NULL |
| `status` | VARCHAR(20) | DEFAULT `DECLARED` |
| `proof_document_id` | VARCHAR(50) | NULL, FK `user_documents` |
| `source` | VARCHAR(20) | DEFAULT `EMPLOYEE` |
| `notes` | TEXT | NULL |
| audit | | |

**Indexes:** `(user_id, payroll_cycle)`; `(user_id, financial_year, scope)`; `(user_id, type_code, financial_year)` among active rows.

### 4.6 `reimbursements`

| Column | Type | Constraints |
|---|---|---|
| `reimbursement_id` | VARCHAR(50) | PK |
| `user_id` | VARCHAR(50) | NOT NULL, FK `users` |
| `type_code` | VARCHAR(50) | NOT NULL, FK catalog |
| `claim_date` | DATE | NOT NULL |
| `payroll_cycle` | VARCHAR(7) | NOT NULL |
| `financial_year` | VARCHAR(9) | NOT NULL |
| `amount_minor` | BIGINT | NOT NULL |
| `currency` | CHAR(3) | DEFAULT `INR` |
| `description` | TEXT | NULL |
| `is_eligible` | BOOLEAN | DEFAULT FALSE |
| `is_valid_under_policy` | BOOLEAN | DEFAULT FALSE |
| `validation_messages` | JSON | DEFAULT `[]` |
| `policy_version_at_creation` | VARCHAR(50) | NOT NULL |
| `is_approved` | BOOLEAN | DEFAULT FALSE |
| `status` | VARCHAR(20) | DEFAULT `DRAFT` |
| `proof_document_id` | VARCHAR(50) | NULL, FK `user_documents` |
| `approved_amount_minor` | BIGINT | NULL |
| `approved_by` | VARCHAR(50) | NULL |
| `approved_at` | TIMESTAMP | NULL |
| `rejection_reason` | TEXT | NULL |
| `paid_at` | TIMESTAMP | NULL |
| audit | | |

**Indexes:** `(user_id, payroll_cycle)`; `(user_id, status)`; `(user_id, financial_year)` among active rows.

### 4.7 `payroll_records`

Earnings and cached totals only. PF/TDS/PT live in `deductions`.

| Column | Type | Constraints |
|---|---|---|
| `record_id` | VARCHAR(50) | PK |
| `user_id` | VARCHAR(50) | NOT NULL, FK `users` |
| `payroll_cycle` | VARCHAR(7) | NOT NULL |
| `financial_year` | VARCHAR(9) | NOT NULL |
| `basic_minor` | BIGINT | NOT NULL |
| `hra_minor` | BIGINT | NOT NULL |
| `lta_minor` | BIGINT | DEFAULT 0 |
| `special_allowance_minor` | BIGINT | DEFAULT 0 |
| `other_allowances` | JSON | DEFAULT `{}` |
| `gross_pay_minor` | BIGINT | NOT NULL |
| `total_payroll_deductions_minor` | BIGINT | NOT NULL |
| `net_pay_minor` | BIGINT | NOT NULL |
| `ytd_snapshot` | JSON | NOT NULL |
| audit | | |

**Uniqueness:** one active row per `(user_id, payroll_cycle)`. On PostgreSQL use a **partial unique index** `WHERE deleted_at IS NULL`. On SQLite in-memory, enforce in `PayrollRepository.create` if partial indexes are unavailable.

`net_pay_minor` = `gross_pay_minor` − sum of PAYROLL deductions with `reduces_net_pay` (cached in `total_payroll_deductions_minor`).

---

## 5. Sequelize associations (conceptual)

```javascript
User.hasMany(UserDocument, { foreignKey: 'userId' });
User.hasMany(PayrollRecord, { foreignKey: 'userId' });
User.hasMany(Deduction, { foreignKey: 'userId' });
User.hasMany(Reimbursement, { foreignKey: 'userId' });
User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

DeductionTypeCatalog.hasMany(Deduction, { foreignKey: 'typeCode', sourceKey: 'typeCode' });
ReimbursementTypeCatalog.hasMany(Reimbursement, { foreignKey: 'typeCode', sourceKey: 'typeCode' });

Deduction.belongsTo(UserDocument, { as: 'proof', foreignKey: 'proofDocumentId' });
Reimbursement.belongsTo(UserDocument, { as: 'proof', foreignKey: 'proofDocumentId' });
```

---

## 6. Repository contracts

Every repository:

- Accepts `userId` as the isolation key for user-owned tables (catalogs are global read).
- Returns Promises; methods: `find`, `findById`, `create`, `update`, `delete` (soft).
- Never called from controllers; services pass `req.user.userId`.

| Repository | Notes |
|---|---|
| `UserRepository` | `findById`, `findByEmail` for mock login |
| `UserDocumentRepository` | Filter by category/FY; exclude deleted |
| `PayrollRepository` | `findByUserAndCycle`; unique cycle |
| `DeductionRepository` | Filter by cycle/FY/scope/`aggregateGroup` |
| `DeductionTypeCatalogRepository` | `findActive`, `findByAggregateGroup` |
| `ReimbursementRepository` | `sumByUserTypeFY` for headroom |
| `ReimbursementTypeCatalogRepository` | Active types |

---

## 7. SQLite vs PostgreSQL differences (prototype)

| Topic | In-memory SQLite | PostgreSQL (later) |
|---|---|---|
| JSON | `JSON` stored as text | `JSONB` |
| Partial unique indexes | May be missing; enforce in repo | `UNIQUE (...) WHERE deleted_at IS NULL` |
| CHECK (`scope` vs `payroll_cycle`) | Optional | Enforce in DB |
| `BIGINT` | Number in JS if within `MAX_SAFE_INTEGER` | Same |
| Concurrency | Single process | Connection pool |

---

## 8. Seed and lifecycle

On application start (prototype):

1. `sequelize.authenticate()`
2. `sequelize.sync()`
3. Seed `deduction_type_catalog` and `reimbursement_type_catalog` from `src/fixtures/policy/`
4. Seed demo `users`, `payroll_records`, PAYROLL `deductions`

No backup/restore requirement for `:memory:`.

---

## 9. Out of scope for this schema

- Storing access/refresh tokens
- Storing raw file blobs as BYTEA
- Multi-tenant `org_id` (single employer prototype)
- Event/audit log table beyond row-level `created_by` / `updated_by`
