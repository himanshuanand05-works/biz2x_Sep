/**
 * User persistence. Isolation for other tables starts from userId loaded here.
 */
import { getModels } from '../models/index.js';
import { toPlain } from './serialize.js';

export class UserRepository {
  get model() {
    return getModels().User;
  }

  /** @param {object} [where] */
  async find(where = {}) {
    const rows = await this.model.findAll({ where });
    return rows.map(toPlain);
  }

  /** @param {string} userId */
  async findById(userId) {
    return toPlain(await this.model.findByPk(userId));
  }

  /** @param {string} email */
  async findByEmail(email) {
    return toPlain(await this.model.findOne({ where: { email } }));
  }

  /** @param {object} data */
  async create(data) {
    return toPlain(await this.model.create(data));
  }

  /** @param {string} userId @param {object} data */
  async update(userId, data) {
    const row = await this.model.findByPk(userId);
    if (!row) {
      return null;
    }
    await row.update(data);
    return toPlain(row);
  }

  /** Soft delete via paranoid. @param {string} userId */
  async delete(userId) {
    const count = await this.model.destroy({ where: { userId } });
    return count > 0;
  }
}

export const userRepository = new UserRepository();
