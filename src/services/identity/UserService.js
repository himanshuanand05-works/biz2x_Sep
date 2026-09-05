/** Employee identity and eligibility context. JWTs are never stored here. */
export class UserService {
  constructor(fields) {
    Object.assign(this, fields);
    this.employmentStartDate = fields.employmentStartDate ?? fields.dateOfJoining;
  }

  /** Derived tenure in complete months; used by eligibility rules. */
  getTenureMonths(asOfDate = new Date()) {
    const start = this.dateOfJoining ? new Date(this.dateOfJoining) : null;
    if (!start || Number.isNaN(start.getTime())) {
      return 0;
    }
    const months =
      (asOfDate.getFullYear() - start.getFullYear()) * 12 +
      (asOfDate.getMonth() - start.getMonth());
    return Math.max(0, months);
  }

  /** Summary fed to eligibility services and the AI user_profile_json block. */
  getEligibilityContext() {
    return {
      userId: this.userId,
      employmentStatus: this.employmentStatus,
      employeeType: this.employeeType,
      rank: this.rank,
      dateOfJoining: this.dateOfJoining,
      tenureMonths: this.getTenureMonths(),
      taxRegime: this.taxRegime,
      taxRegimeLocked: this.taxRegimeLocked,
      location: this.location
    };
  }
}