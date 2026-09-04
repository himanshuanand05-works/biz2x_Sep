import { randomUUID } from 'node:crypto';

/**
 * Stable application primary keys (portable across SQLite and PostgreSQL).
 * @param {string} prefix
 * @returns {string}
 */
export function createId(prefix) {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
}
