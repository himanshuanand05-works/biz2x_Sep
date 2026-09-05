import assert from 'node:assert/strict';
import test from 'node:test';

import { toMinorUnits, fromMinorUnits, sumMinor } from '../src/utils/money.js';
import { sendSuccess, sendError } from '../src/utils/apiResponse.js';

test('money utilities convert decimal strings to minor units', () => {
  assert.equal(toMinorUnits('1250.50'), 125050);
  assert.equal(toMinorUnits(12.34), 1234);
  assert.equal(fromMinorUnits(125050), '1250.50');
  assert.equal(sumMinor([100, 250, 50]), 400);
  assert.throws(() => toMinorUnits('abc'), /Invalid money amount/);
});

test('API response helpers produce success and error envelopes', () => {
  const successRes = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  const successPayload = sendSuccess(successRes, { ok: true });
  assert.equal(successPayload.statusCode, 200);
  assert.deepEqual(successPayload.payload, { success: true, data: { ok: true } });

  const errorRes = {
    statusCode: 0,
    payload: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.payload = payload;
      return this;
    }
  };

  const errorPayload = sendError(errorRes, { message: 'Something failed', code: 'VALIDATION_ERROR', details: ['field'] }, 422);
  assert.equal(errorPayload.statusCode, 422);
  assert.deepEqual(errorPayload.payload, {
    success: false,
    error: {
      message: 'Something failed',
      code: 'VALIDATION_ERROR',
      details: ['field']
    }
  });
});
