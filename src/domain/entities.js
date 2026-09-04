/** Thin domain typedefs so services can document shapes without importing Sequelize. */

export class PayrollRecord {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

export class Deduction {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

export class DeductionTypeCatalog {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

export class Reimbursement {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

export class ReimbursementTypeCatalog {
  constructor(fields) {
    Object.assign(this, fields);
  }
}

export class UserDocument {
  constructor(fields) {
    Object.assign(this, fields);
  }
}
