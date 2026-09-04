import { Op } from 'sequelize';
import { getModels } from '../models/index.js';
import { toPlain, asInt } from './serialize.js';

function mapPayroll(row) {
  if (!row) {
    return null;
  }
  const p = toPlain(row);
  return {
    ...p,
    basicMinor: asInt(p.basicMinor),
    hraMinor: asInt(p.hraMinor),
    ltaMinor: asInt(p.ltaMinor),
    specialAllowanceMinor: asInt(p.specialAllowanceMinor),
    grossPayMinor: asInt(p.grossPayMinor),
    totalPayrollDeductionsMinor: asInt(p.totalPayrollDeductionsMinor),
    netPayMinor: asInt(p.netPayMinor)
  };
}

export class PayrollRepository {
  get model() {
    return getModels().PayrollRecord;
  }

  /** @param {string} userId @param {object} [where] */
  async find(userId, where = {}) {
    const rows = await this.model.findAll({
      where: { userId, ...where },
      order: [['payrollCycle', 'ASC']]
    });
    return rows.map(mapPayroll);
  }

  /** @param {string} recordId */
  async findById(recordId) {
    return mapPayroll(await this.model.findByPk(recordId));
  }

  /** @param {string} userId @param {string} payrollCycle */
  async findByUserAndCycle(userId, payrollCycle) {
    return mapPayroll(await this.model.findOne({ where: { userId, payrollCycle } }));
  }

  async create(data) {
    return mapPayroll(await this.model.create(data));
  }

  async update(recordId, data) {
    const row = await this.model.findByPk(recordId);
    if (!row) {
      return null;
    }
    await row.update(data);
    return mapPayroll(row);
  }

  async delete(recordId) {
    const count = await this.model.destroy({ where: { recordId } });
    return count > 0;
  }

  /** Latest cycle for the user (string max works for YYYY-MM). */
  async findLatestCycle(userId) {
    const row = await this.model.findOne({
      where: { userId },
      order: [['payrollCycle', 'DESC']]
    });
    return mapPayroll(row);
  }

  async findByUserAndFy(userId, financialYear) {
    const rows = await this.model.findAll({
      where: { userId, financialYear, payrollCycle: { [Op.ne]: null } }
    });
    return rows.map(mapPayroll);
  }
}

export const payrollRepository = new PayrollRepository();
