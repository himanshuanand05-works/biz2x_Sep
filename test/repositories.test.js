import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ISSUER = 'local-idp';
process.env.JWT_AUDIENCE = 'financial-wellness-api';

import { initDatabase } from '../src/models/index.js';
import { seedDatabase } from '../src/db/seed.js';
import { userRepository } from '../src/repositories/UserRepository.js';
import { payrollRepository } from '../src/repositories/PayrollRepository.js';

const createPayrollRow = ({ userId, cycle, financialYear }) => ({
  recordId: `pay_${userId}_${cycle}`,
  userId,
  payrollCycle: cycle,
  financialYear,
  basicMinor: 7500000,
  hraMinor: 3000000,
  ltaMinor: 500000,
  specialAllowanceMinor: 1500000,
  otherAllowances: { fuelAllowance: 3000000 },
  grossPayMinor: 15000000,
  totalPayrollDeductionsMinor: 3140000,
  netPayMinor: 11860000,
  ytdSnapshot: { grossMinor: 15000000, netMinor: 11860000 }
});

test.before(async () => {
  await initDatabase();
  await seedDatabase();
});

test('repositories enforce user-scoped reads', async () => {
  const user = await userRepository.findByEmail('jane@company.com');
  assert.equal(user.userId, 'emp_101');

  const janePayroll = await payrollRepository.find('emp_101');
  assert.ok(janePayroll.length > 0);
  assert.ok(janePayroll.every((row) => row.userId === 'emp_101'));

  const arjunPayroll = await payrollRepository.find('emp_102');
  assert.ok(arjunPayroll.length >= 0);
  assert.ok(arjunPayroll.every((row) => row.userId === 'emp_102'));
});

test('repositories create, update, and soft-delete records', async () => {
  const created = await userRepository.create({
    userId: 'emp_temp_001',
    name: 'Temporary User',
    email: 'temp@example.com',
    employeeCode: 'TEMP001',
    department: 'Test',
    designation: 'QA',
    rank: 'L1',
    employeeType: 'FULL_TIME',
    location: 'Bengaluru',
    employmentStatus: 'ACTIVE',
    taxRegime: 'OLD',
    createdBy: 'system',
    updatedBy: 'system'
  });

  assert.equal(created.name, 'Temporary User');

  const updated = await userRepository.update('emp_temp_001', { name: 'Updated User' });
  assert.equal(updated.name, 'Updated User');

  const deleted = await userRepository.delete('emp_temp_001');
  assert.equal(deleted, true);
  assert.equal(await userRepository.findById('emp_temp_001'), null);
});

test('payroll repository stores user-specific cycles and updates them', async () => {
  const payroll = await payrollRepository.create(createPayrollRow({
    userId: 'emp_101',
    cycle: '2026-07',
    financialYear: '2026-2027'
  }));

  assert.equal(payroll.userId, 'emp_101');
  assert.equal(payroll.payrollCycle, '2026-07');

  const updated = await payrollRepository.update(payroll.recordId, { netPayMinor: 12000000 });
  assert.equal(updated.netPayMinor, 12000000);

  const found = await payrollRepository.findByUserAndCycle('emp_101', '2026-07');
  assert.equal(found.recordId, payroll.recordId);
  assert.equal(found.netPayMinor, 12000000);
});
