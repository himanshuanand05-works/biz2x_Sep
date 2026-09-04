import { getModels } from '../models/index.js';
import { toPlain } from './serialize.js';

export class UserDocumentRepository {
  get model() {
    return getModels().UserDocument;
  }

  async find(userId, where = {}) {
    const rows = await this.model.findAll({
      where: { userId, ...where },
      order: [['createdAt', 'DESC']]
    });
    return rows.map(toPlain);
  }

  async findById(documentId) {
    return toPlain(await this.model.findByPk(documentId));
  }

  async create(data) {
    return toPlain(await this.model.create(data));
  }

  async update(documentId, data) {
    const row = await this.model.findByPk(documentId);
    if (!row) {
      return null;
    }
    await row.update(data);
    return toPlain(row);
  }

  async delete(documentId) {
    const count = await this.model.destroy({ where: { documentId } });
    return count > 0;
  }
}

export const userDocumentRepository = new UserDocumentRepository();
