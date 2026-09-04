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
    maxAggregateMinor: p.maxAggregateMinor == null ? null : asInt(p.maxAggregateMinor)
  };
}

export class DeductionTypeCatalogRepository {
  get model() {
    return getModels().DeductionTypeCatalog;
  }

  async find(where = {}) {
    const rows = await this.model.findAll({ where, order: [['sortOrder', 'ASC']] });
    return rows.map(mapCatalog);
  }

  async findById(typeCode) {
    return this.findByCode(typeCode);
  }

  async findByCode(typeCode) {
    return mapCatalog(await this.model.findByPk(typeCode));
  }

  async findActive(typeCode) {
    const row = await this.model.findOne({ where: { typeCode, isActive: true } });
    return mapCatalog(row);
  }

  async findAllActive(extra = {}) {
    return this.find({ isActive: true, ...extra });
  }

  async findByAggregateGroup(aggregateGroup) {
    const row = await this.model.findOne({
      where: { aggregateGroup, isActive: true }
    });
    return mapCatalog(row);
  }

  async findDistinctAggregateGroups() {
    const rows = await this.model.findAll({
      where: { isActive: true },
      attributes: ['aggregateGroup'],
      group: ['aggregateGroup']
    });
    return rows.map((r) => r.aggregateGroup).filter(Boolean);
  }

  async findTypeCodesByAggregateGroup(aggregateGroup) {
    const rows = await this.find({ aggregateGroup, isActive: true });
    return rows.map((r) => r.typeCode);
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

export const deductionTypeCatalogRepository = new DeductionTypeCatalogRepository();
