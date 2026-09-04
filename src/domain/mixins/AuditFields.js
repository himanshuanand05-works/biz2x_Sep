/**
 * Shared audit field names mixed into persistent entities.
 * Soft-delete: deletedAt NULL means the row is active.
 */
export const AuditFields = {
  createdAt: null,
  updatedAt: null,
  deletedAt: null,
  createdBy: null,
  updatedBy: null
};

/**
 * Sequelize column map reused by every paranoid model.
 * @param {import('sequelize').DataTypes} DataTypes
 */
export function sequelizeAuditAttributes(DataTypes) {
  return {
    createdBy: { type: DataTypes.STRING(50), allowNull: true },
    updatedBy: { type: DataTypes.STRING(50), allowNull: true }
  };
}

/** Default model options: snake_case columns, timestamps, paranoid soft-delete. */
export const sequelizeModelOptions = {
  underscored: true,
  timestamps: true,
  paranoid: true
};
