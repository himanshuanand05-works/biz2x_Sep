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

  /** Finds a document only inside the authenticated employee's tenant. */
  async findByUserAndId(userId, documentId) {
    return toPlain(await this.model.findOne({ where: { userId, documentId } }));
  }

  async create(data) {
    return toPlain(await this.model.create(data));
  }

  async update(userId, documentId, data) {
    const row = await this.model.findOne({ where: { userId, documentId } });
    if (!row) {
      return null;
    }
    await row.update(data);
    return toPlain(row);
  }

  async delete(userId, documentId) {
    const count = await this.model.destroy({ where: { userId, documentId } });
    return count > 0;
  }
}

export const userDocumentRepository = new UserDocumentRepository();
