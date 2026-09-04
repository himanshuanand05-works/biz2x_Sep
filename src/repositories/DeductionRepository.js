import { getModels } from '../models/index.js';
import { toPlain, asInt } from './serialize.js';

function mapDeduction(row) {
  if (!row) {
    return null;
  }
  const p = toPlain(row);
  return { ...p, amountMinor: asInt(p.amountMinor) };
}

export class DeductionRepository {
  get model() {
    return getModels().Deduction;
  }

  /** Always scoped by userId for tenant isolation. */
  async find(userId, where = {}) {
    const rows = await this.model.findAll({
      where: { userId, ...where },
      order: [['createdAt', 'ASC']]
    });
    return rows.map(mapDeduction);
  }

  async findById(deductionId) {
    return mapDeduction(await this.model.findByPk(deductionId));
  }

  /** Finds a deduction only inside the authenticated employee's tenant. */
  async findByUserAndId(userId, deductionId) {
    return mapDeduction(await this.model.findOne({ where: { userId, deductionId } }));
  }

  async findByUserAndCycle(userId, payrollCycle, extra = {}) {
    return this.find(userId, { payrollCycle, ...extra });
  }

  async findByUserAndFY(userId, financialYear, extra = {}) {
    return this.find(userId, { financialYear, ...extra });
  }

  async create(data) {
    return mapDeduction(await this.model.create(data));
  }

  async update(userId, deductionId, data) {
    const row = await this.model.findOne({ where: { userId, deductionId } });
    if (!row) {
      return null;
    }
    await row.update(data);
    return mapDeduction(row);
  }

  async delete(userId, deductionId) {
    const count = await this.model.destroy({ where: { userId, deductionId } });
    return count > 0;
  }

  async findByAggregateGroup(userId, financialYear, typeCodes) {
    const rows = await this.model.findAll({
      where: { userId, financialYear, typeCode: typeCodes }
    });
    return rows.map(mapDeduction);
  }
}

export const deductionRepository = new DeductionRepository();
