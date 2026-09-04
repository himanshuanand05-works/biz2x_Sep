import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from '../domain/mixins/AuditFields.js';

/**
 * Earnings + cached totals. PF/TDS live in deductions (scope PAYROLL).
 * @param {import('sequelize').Sequelize} sequelize
 */
export function definePayrollRecordModel(sequelize) {
  return sequelize.define(
    'PayrollRecord',
    {
      recordId: { type: DataTypes.STRING(50), primaryKey: true },
      userId: { type: DataTypes.STRING(50), allowNull: false },
      payrollCycle: { type: DataTypes.STRING(7), allowNull: false },
      financialYear: { type: DataTypes.STRING(9), allowNull: false },
      basicMinor: { type: DataTypes.BIGINT, allowNull: false },
      hraMinor: { type: DataTypes.BIGINT, allowNull: false },
      ltaMinor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      specialAllowanceMinor: { type: DataTypes.BIGINT, allowNull: false, defaultValue: 0 },
      otherAllowances: { type: DataTypes.JSON, allowNull: false, defaultValue: {} },
      grossPayMinor: { type: DataTypes.BIGINT, allowNull: false },
      totalPayrollDeductionsMinor: { type: DataTypes.BIGINT, allowNull: false },
      netPayMinor: { type: DataTypes.BIGINT, allowNull: false },
      ytdSnapshot: { type: DataTypes.JSON, allowNull: false },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'payroll_records' }
  );
}
