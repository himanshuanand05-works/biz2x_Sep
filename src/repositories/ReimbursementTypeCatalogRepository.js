import { getModels } from '../models/index.js';
import { toPlain, asInt } from './serialize.js';

function mapCatalog(row) {
  if (!row) {
    return null;
  }
  const p = toPlain(row);
  return {
    ...p,
    minAmountMinor: asInt(p.minAmountMinor),
    maxAmountMinor: p.maxAmountMinor == null ? null : asInt(p.maxAmountMinor),
    maxPerFyMinor: p.maxPerFyMinor == null ? null : asInt(p.maxPerFyMinor),
    maxPerCycleMinor: p.maxPerCycleMinor == null ? null : asInt(p.maxPerCycleMinor)
  };
}

export class ReimbursementTypeCatalogRepository {
  get model() {
    return getModels().ReimbursementTypeCatalog;
  }

  async find(where = {}) {
    const rows = await this.model.findAll({ where });
    return rows.map(mapCatalog);
  }

  async findById(typeCode) {
    return mapCatalog(await this.model.findByPk(typeCode));
  }

  async findActive(typeCode) {
    return mapCatalog(await this.model.findOne({ where: { typeCode, isActive: true } }));
  }

  async findAllActive() {
    return this.find({ isActive: true });
  }

  async create(data) {
    return mapCatalog(await this.model.create(data));
  }

  async update(typeCode, data) {
    const row = await this.model.findByPk(typeCode);
    if (!row) {
      return null;
    }
    await row.update(data);
    return mapCatalog(row);
  }

  async delete(typeCode) {
    const count = await this.model.destroy({ where: { typeCode } });
    return count > 0;
  }
}

export const reimbursementTypeCatalogRepository = new ReimbursementTypeCatalogRepository();
