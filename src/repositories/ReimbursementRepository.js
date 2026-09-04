import { getModels } from '../models/index.js';
import { toPlain, asInt } from './serialize.js';

function mapRow(row) {
  if (!row) {
    return null;
  }
  const p = toPlain(row);
  return {
    ...p,
    amountMinor: asInt(p.amountMinor),
    approvedAmountMinor: p.approvedAmountMinor == null ? null : asInt(p.approvedAmountMinor)
  };
}

export class ReimbursementRepository {
  get model() {
    return getModels().Reimbursement;
  }

  async find(userId, where = {}) {
    const rows = await this.model.findAll({
      where: { userId, ...where },
      order: [['claimDate', 'DESC']]
    });
    return rows.map(mapRow);
  }

  async findById(reimbursementId) {
    return mapRow(await this.model.findByPk(reimbursementId));
  }

  /** Finds a reimbursement only inside the authenticated employee's tenant. */
  async findByUserAndId(userId, reimbursementId) {
    return mapRow(await this.model.findOne({ where: { userId, reimbursementId } }));
  }

  async create(data) {
    return mapRow(await this.model.create(data));
  }

  async update(userId, reimbursementId, data) {
    const row = await this.model.findOne({ where: { userId, reimbursementId } });
    if (!row) {
      return null;
    }
    await row.update(data);
    return mapRow(row);
  }

  async delete(userId, reimbursementId) {
    const count = await this.model.destroy({ where: { userId, reimbursementId } });
    return count > 0;
  }

  async sumByUserTypeFY(userId, typeCode, financialYear) {
    const rows = await this.find(userId, { typeCode, financialYear });
    return rows.reduce((s, r) => s + r.amountMinor, 0);
  }
}

export const reimbursementRepository = new ReimbursementRepository();
