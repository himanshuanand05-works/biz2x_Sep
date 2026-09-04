/**
 * Integer money wrapper. Persistence stores the minor-unit integer, not this class.
 */
import { fromMinorUnits, toMinorUnits } from '../../utils/money.js';

export class Money {
  /** @param {number} minorUnits */
  constructor(minorUnits) {
    this.minorUnits = Math.trunc(minorUnits);
  }

  /** @param {string|number} decimal */
  static fromDecimal(decimal) {
    return new Money(toMinorUnits(decimal));
  }

  /** @returns {string} */
  toDisplay() {
    return fromMinorUnits(this.minorUnits);
  }
}
