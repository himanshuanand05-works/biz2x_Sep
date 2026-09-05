/**
 * Registers Sequelize models and associations. Services must not import this for queries —
 * go through repositories after initDatabase().
 */
import { createSequelize } from '../config/database.js';
import { defineUserModel } from './User.js';
import { defineUserDocumentModel } from './UserDocument.js';
import { defineDeductionTypeCatalogModel } from './DeductionTypeCatalog.js';
import { defineReimbursementTypeCatalogModel } from './ReimbursementTypeCatalog.js';
import { defineDeductionModel } from './Deduction.js';
import { defineReimbursementModel } from './Reimbursement.js';
import { definePayrollRecordModel } from './PayrollRecord.js';

/** @type {import('sequelize').Sequelize | null} */
let sequelize = null;

/** @type {object | null} */
let models = null;

/**
 * @returns {object}
 */
export function getModels() {
  if (!models) {
    throw new Error('Database models are not initialized');
  }
  return models;
}

/**
 * Defines models, associations, and syncs schema (prototype). Call once at boot.
 * @returns {Promise<{ sequelize: import('sequelize').Sequelize, models: object }>}
 */
export async function initDatabase() {
  sequelize = createSequelize();

  const User = defineUserModel(sequelize);
  const UserDocument = defineUserDocumentModel(sequelize);
  const DeductionTypeCatalog = defineDeductionTypeCatalogModel(sequelize);
  const ReimbursementTypeCatalog = defineReimbursementTypeCatalogModel(sequelize);
  const Deduction = defineDeductionModel(sequelize);
  const Reimbursement = defineReimbursementModel(sequelize);
  const PayrollRecord = definePayrollRecordModel(sequelize);

  User.hasMany(UserDocument, { foreignKey: 'userId' });
  User.hasMany(PayrollRecord, { foreignKey: 'userId' });
  User.hasMany(Deduction, { foreignKey: 'userId' });
  User.hasMany(Reimbursement, { foreignKey: 'userId' });
  User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

  DeductionTypeCatalog.hasMany(Deduction, { foreignKey: 'typeCode', sourceKey: 'typeCode' });
  Deduction.belongsTo(DeductionTypeCatalog, { foreignKey: 'typeCode', targetKey: 'typeCode' });

  ReimbursementTypeCatalog.hasMany(Reimbursement, { foreignKey: 'typeCode', sourceKey: 'typeCode' });
  Reimbursement.belongsTo(ReimbursementTypeCatalog, { foreignKey: 'typeCode', targetKey: 'typeCode' });

  Deduction.belongsTo(UserDocument, { as: 'proof', foreignKey: 'proofDocumentId' });
  Reimbursement.belongsTo(UserDocument, { as: 'proof', foreignKey: 'proofDocumentId' });

  models = {
    User,
    UserDocument,
    DeductionTypeCatalog,
    ReimbursementTypeCatalog,
    Deduction,
    Reimbursement,
    PayrollRecord
  };

  await sequelize.sync();
  return { sequelize, models };
}
