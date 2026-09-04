import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from '../domain/mixins/AuditFields.js';

/**
 * Unified payroll + tax-declaration + employer contribution rows.
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineDeductionModel(sequelize) {
  return sequelize.define(
    'Deduction',
    {
      deductionId: { type: DataTypes.STRING(50), primaryKey: true },
      userId: { type: DataTypes.STRING(50), allowNull: false },
      typeCode: { type: DataTypes.STRING(50), allowNull: false },
      scope: { type: DataTypes.STRING(20), allowNull: false },
      amountMinor: { type: DataTypes.BIGINT, allowNull: false },
      currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'INR' },
      payrollCycle: { type: DataTypes.STRING(7), allowNull: true },
      financialYear: { type: DataTypes.STRING(9), allowNull: false },
      startDate: { type: DataTypes.DATEONLY, allowNull: true },
      endDate: { type: DataTypes.DATEONLY, allowNull: true },
      declaredUnderRegime: { type: DataTypes.STRING(10), allowNull: false },
      isValidUnderPolicy: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      validationMessages: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      policyVersionAtCreation: { type: DataTypes.STRING(50), allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DECLARED' },
      proofDocumentId: { type: DataTypes.STRING(50), allowNull: true },
      source: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'EMPLOYEE' },
      notes: { type: DataTypes.TEXT, allowNull: true },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'deductions' }
  );
}
