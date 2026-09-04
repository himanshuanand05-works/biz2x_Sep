import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from '../domain/mixins/AuditFields.js';

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineDeductionTypeCatalogModel(sequelize) {
  return sequelize.define(
    'DeductionTypeCatalog',
    {
      typeCode: { type: DataTypes.STRING(50), primaryKey: true },
      displayName: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      scope: { type: DataTypes.STRING(20), allowNull: false },
      sectionCode: { type: DataTypes.STRING(20), allowNull: true },
      reducesNetPay: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      minAmountMinor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      maxAmountMinor: { type: DataTypes.BIGINT, allowNull: true },
      maxAggregateMinor: { type: DataTypes.BIGINT, allowNull: true },
      aggregateGroup: { type: DataTypes.STRING(30), allowNull: true },
      applicableRegimes: { type: DataTypes.JSON, allowNull: false, defaultValue: ['OLD'] },
      applicableStatuses: { type: DataTypes.JSON, allowNull: false, defaultValue: ['ACTIVE'] },
      applicableEmployeeTypes: { type: DataTypes.JSON, allowNull: false, defaultValue: ['FULL_TIME'] },
      applicableRanks: { type: DataTypes.JSON, allowNull: true },
      minTenureMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      requiresProof: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      proofDocumentCategory: { type: DataTypes.STRING(30), allowNull: true },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
      policyVersion: { type: DataTypes.STRING(50), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      sortOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'deduction_type_catalog' }
  );
}
