/**
 * Sequelize factory. Prototype uses SQLite :memory:; production switches dialect via env.
 */
import { Sequelize } from 'sequelize';
import { env } from './env.js';
import { logger } from './logger.js';

/**
 * Builds a Sequelize instance. Call once at boot.
 * @returns {Sequelize}
 */
export function createSequelize() {
  if (env.dbDialect === 'postgres') {
    if (!env.databaseUrl) {
      throw new Error('DATABASE_URL is required when DB_DIALECT=postgres');
    }
    return new Sequelize(env.databaseUrl, {
      dialect: 'postgres',
      logging: (msg) => logger.debug(msg)
    });
  }

  // In-memory SQLite is the prototype default (non-durable across restarts).
  return new Sequelize({
    dialect: 'sqlite',
    storage: env.dbStorage,
    logging: env.isProduction ? false : (msg) => logger.debug(msg)
  });
}
