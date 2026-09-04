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

  async create(data) {
    return mapRow(await this.model.create(data));
  }

  async update(reimbursementId, data) {
    const row = await this.model.findByPk(reimbursementId);
    if (!row) {
      return null;
    }
    await row.update(data);
    return mapRow(row);
  }

  async delete(reimbursementId) {
    const count = await this.model.destroy({ where: { reimbursementId } });
    return count > 0;
  }

  async sumByUserTypeFY(userId, typeCode, financialYear) {
    const rows = await this.find(userId, { typeCode, financialYear });
    return rows.reduce((s, r) => s + r.amountMinor, 0);
  }
}

export const reimbursementRepository = new ReimbursementRepository();
