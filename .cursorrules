# Project Context & AI Instructions

You are an expert software engineer specialized in Node.js, JavaScript, and secure backend systems. Always apply production-grade best practices and strict security constraints.

## Knowledge Sources
CRITICAL: Before writing any code, modifying features, or refactoring, you must read and align with the following local documentation:
- Architecture Overview: Reference `./docs/architecture.md`
- High-Level Design: Reference `./docs/hld.md`
- Low-Level Design: Reference `./docs/lld.md`
- Database Schema/Models: Reference `./docs/database.md` (if applicable)

If an instruction conflicts with these `.md` files, ask for clarification before writing code.

## Database & Data Isolation Rules
- Current State: Use an in-memory data store (e.g., JavaScript Maps, Arrays, or an in-memory database utility).
- Future State: This application will switch to PostgreSQL using an ORM/Query Builder (like Prisma or Knex).
- Repository Pattern Enforcements:
  - NEVER access the in-memory array/map directly inside controllers or services.
  - All data operations must go through a Repository class or module (e.g., `UserRepository`).
  - Repository methods must mimic real database operations and return JavaScript Promises (`async`/`await`), even if the underlying in-memory operation is synchronous.
  - Implement standard CRUD methods in the repository (`find`, `findById`, `create`, `update`, `delete`).

## Tech Stack & Language Guidelines
- Runtime: Node.js (Latest LTS)
- Language: Modern JavaScript (ES6+)
- Modules: Use ES Modules (`import`/`export`) instead of CommonJS (`require`).
- Asynchronous Code: Use strict `async/await` syntax. Avoid raw promises or callbacks.

## Project Structure & Architecture
- Follow the clean architecture or layered pattern defined in `./docs/architecture.md`.
- Separate concerns strictly: Route handlers -> Controllers -> Services -> Data Access Layer (Models).
- Keep functions small, modular, and single-purpose.

## Security Constraints
- Environment Variables: Never hardcode secrets, API keys, or database credentials. Use `process.env` managed by `dotenv`.
- Input Validation: Validate all incoming request data (`req.params`, `req.query`, `req.body`) using a validation library like `joi` or `zod` before it hits the controllers.
- OWASP Top 10 Protections:
  - Implement security headers using `helmet`.
  - Enable Cross-Origin Resource Sharing (`cors`) with strict origin whitelisting.
  - Implement rate limiting (`express-rate-limit`) on all API endpoints to prevent DoS attacks.
- SQL/NoSQL Injection: Always use parameterized queries, ORM/ODM built-in abstraction layers, or query builders. Never concatenate raw strings for database queries.
- Error Handling: Sanitise error messages. Never expose raw stack traces or internal server details to the client in production.

## Error Handling & Logging
- Wrap all asynchronous route handlers or middleware in a global error-catching wrapper (e.g., `express-async-handler`) or strict `try/catch` blocks.
- Centralize error handling in a dedicated Express error middleware.
- Use a structured logging library (like `winston` or `pino`) instead of `console.log`.

## API Design & Responses
- Return uniform, predictable JSON payloads:
  - Success: `{ "success": true, "data": ... }`
  - Error: `{ "success": false, "error": { "message": "User-friendly message", "code": "ERROR_CODE" } }`
- Always use correct HTTP status codes (200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error).
