import { DataTypes } from 'sequelize';
import { sequelizeAuditAttributes, sequelizeModelOptions } from '../domain/mixins/AuditFields.js';

/**
 * @param {import('sequelize').Sequelize} sequelize
 */
export function defineUserDocumentModel(sequelize) {
  return sequelize.define(
    'UserDocument',
    {
      documentId: { type: DataTypes.STRING(50), primaryKey: true },
      userId: { type: DataTypes.STRING(50), allowNull: false },
      category: { type: DataTypes.STRING(30), allowNull: false },
      fileName: { type: DataTypes.STRING(255), allowNull: false },
      mimeType: { type: DataTypes.STRING(100), allowNull: false },
      fileSizeBytes: { type: DataTypes.INTEGER, allowNull: false },
      status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'UPLOADED' },
      mockOcrPayload: { type: DataTypes.JSON, allowNull: true },
      linkedEntityType: { type: DataTypes.STRING(30), allowNull: true },
      linkedEntityId: { type: DataTypes.STRING(50), allowNull: true },
      financialYear: { type: DataTypes.STRING(9), allowNull: true },
      payrollCycle: { type: DataTypes.STRING(7), allowNull: true },
      ...sequelizeAuditAttributes(DataTypes)
    },
    { ...sequelizeModelOptions, tableName: 'user_documents' }
  );
}
