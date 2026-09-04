import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from '../domain/mixins/AuditFields.js';

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineUserModel(sequelize) {
  return sequelize.define(
    'User',
    {
      userId: { type: DataTypes.STRING(50), primaryKey: true, field: 'user_id' },
      name: { type: DataTypes.STRING(255), allowNull: false },
      email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
      employeeCode: { type: DataTypes.STRING(50), allowNull: false },
      department: { type: DataTypes.STRING(100), allowNull: true },
      designation: { type: DataTypes.STRING(100), allowNull: true },
      rank: { type: DataTypes.STRING(30), allowNull: true },
      employeeType: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'FULL_TIME' },
      location: { type: DataTypes.STRING(100), allowNull: true },
      managerId: { type: DataTypes.STRING(50), allowNull: true },
      dateOfJoining: { type: DataTypes.DATEONLY, allowNull: true },
      employmentStartDate: { type: DataTypes.DATEONLY, allowNull: true },
      probationEndDate: { type: DataTypes.DATEONLY, allowNull: true },
      employmentStatus: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'ACTIVE' },
      noticePeriodEndDate: { type: DataTypes.DATEONLY, allowNull: true },
      exitDate: { type: DataTypes.DATEONLY, allowNull: true },
      taxRegime: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'OLD' },
      taxRegimeDeclaredAt: { type: DataTypes.DATE, allowNull: true },
      taxRegimeLocked: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
      activeFinancialYear: { type: DataTypes.STRING(9), allowNull: true },
      demoPassword: { type: DataTypes.STRING(100), allowNull: true }, // mock IdP only; never expose in API
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'users' }
  );
}
