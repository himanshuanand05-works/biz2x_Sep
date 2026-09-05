import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from './AuditFields.js';

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineReimbursementModel(sequelize) {
  return sequelize.define(
    'Reimbursement',
    {
      reimbursementId: { type: DataTypes.STRING(50), primaryKey: true },
      userId: { type: DataTypes.STRING(50), allowNull: false },
      typeCode: { type: DataTypes.STRING(50), allowNull: false },
      claimDate: { type: DataTypes.DATEONLY, allowNull: false },
      payrollCycle: { type: DataTypes.STRING(7), allowNull: false },
      financialYear: { type: DataTypes.STRING(9), allowNull: false },
      amountMinor: { type: DataTypes.BIGINT, allowNull: false },
      currency: { type: DataTypes.CHAR(3), allowNull: false, defaultValue: 'INR' },
      description: { type: DataTypes.TEXT, allowNull: true },
      isEligible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      isValidUnderPolicy: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      validationMessages: { type: DataTypes.JSON, allowNull: false, defaultValue: [] },
      policyVersionAtCreation: { type: DataTypes.STRING(50), allowNull: false },
      isApproved: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'DRAFT' },
      proofDocumentId: { type: DataTypes.STRING(50), allowNull: true },
      approvedAmountMinor: { type: DataTypes.BIGINT, allowNull: true },
      approvedBy: { type: DataTypes.STRING(50), allowNull: true },
      approvedAt: { type: DataTypes.DATE, allowNull: true },
      rejectionReason: { type: DataTypes.TEXT, allowNull: true },
      paidAt: { type: DataTypes.DATE, allowNull: true },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'reimbursements' }
  );
}
