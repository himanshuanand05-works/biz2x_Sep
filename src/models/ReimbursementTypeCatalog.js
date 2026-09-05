import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from './AuditFields.js';

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineReimbursementTypeCatalogModel(sequelize) {
  return sequelize.define(
    'ReimbursementTypeCatalog',
    {
      typeCode: { type: DataTypes.STRING(50), primaryKey: true },
      displayName: { type: DataTypes.STRING(150), allowNull: false },
      description: { type: DataTypes.TEXT, allowNull: true },
      minAmountMinor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      maxAmountMinor: { type: DataTypes.BIGINT, allowNull: true },
      maxPerFyMinor: { type: DataTypes.BIGINT, allowNull: true },
      maxPerCycleMinor: { type: DataTypes.BIGINT, allowNull: true },
      applicableStatuses: { type: DataTypes.JSON, allowNull: false, defaultValue: ['ACTIVE'] },
      applicableRanks: { type: DataTypes.JSON, allowNull: true },
      minTenureMonths: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
      requiresProof: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      proofDocumentCategory: {
        type: DataTypes.STRING(30),
        allowNull: false,
        defaultValue: 'REIMBURSEMENT_PROOF'
      },
      effectiveFrom: { type: DataTypes.DATEONLY, allowNull: false },
      effectiveTo: { type: DataTypes.DATEONLY, allowNull: true },
      policyVersion: { type: DataTypes.STRING(50), allowNull: false },
      isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'reimbursement_type_catalog' }
  );
}
