/** Sequelize column map reused by every paranoid model. */
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