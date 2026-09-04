/**
 * Shared helpers for repositories. Controllers/services never import Sequelize models.
 */

/** @param {import('sequelize').Model|null} instance */
export function toPlain(instance) {
  if (!instance) {
    return null;
  }
  return instance.get({ plain: true });
}

/** Coerce SQLite BIGINT strings to numbers for money fields. */
export function asInt(value) {
  if (value === null || value === undefined) {
    return value;
  }
  return Number(value);
}
