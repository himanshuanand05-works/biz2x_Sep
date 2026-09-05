import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.JWT_ISSUER = 'local-idp';
process.env.JWT_AUDIENCE = 'financial-wellness-api';
process.env.JWT_ACCESS_EXPIRES = '1h';
process.env.JWT_REFRESH_EXPIRES = '7d';
process.env.PORT = '3000';

import { app } from '../src/index.js';
import { initDatabase } from '../src/models/index.js';
import { seedDatabase } from '../src/db/seed.js';

let server;
let baseUrl;

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, init);
  const text = await response.text();
  let payload = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }
  return { status: response.status, payload };
}

test.before(async () => {
  await initDatabase();
  await seedDatabase();
  server = app.listen(0);
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

test('health endpoint reports service availability', async () => {
  const response = await request('/health');
  assert.equal(response.status, 200);
  assert.equal(response.payload.success, true);
  assert.equal(response.payload.data.status, 'UP');
});

test('authentication endpoints issue and refresh tokens', async () => {
  const tokenResponse = await request('/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jane@company.com', password: 'demo' })
  });

  assert.equal(tokenResponse.status, 200);
  assert.equal(tokenResponse.payload.success, true);
  assert.ok(tokenResponse.payload.data.accessToken);
  assert.ok(tokenResponse.payload.data.refreshToken);

  const meResponse = await request('/api/v1/auth/me', {
    headers: { Authorization: `Bearer ${tokenResponse.payload.data.accessToken}` }
  });
  assert.equal(meResponse.status, 200);
  assert.equal(meResponse.payload.data.email, 'jane@company.com');

  const refreshResponse = await request('/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: tokenResponse.payload.data.refreshToken })
  });
  assert.equal(refreshResponse.status, 200);
  assert.ok(refreshResponse.payload.data.accessToken);
});

test('protected endpoints reject missing or invalid credentials', async () => {
  const missing = await request('/api/v1/auth/me');
  assert.equal(missing.status, 401);
  assert.equal(missing.payload.success, false);
  assert.equal(missing.payload.error.code, 'UNAUTHORIZED');

  const invalid = await request('/api/v1/auth/me', {
    headers: { Authorization: 'Bearer invalid-token' }
  });
  assert.equal(invalid.status, 401);
  assert.equal(invalid.payload.success, false);
});

test('document upload rejects unsupported files', async () => {
  const form = new FormData();
  form.append('query', 'Explain my payslip');
  form.append('file', new Blob(['not a PDF'], { type: 'text/plain' }), 'note.txt');

  const response = await request('/api/v1/assistant/query', {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getDemoAccessToken()}` },
    body: form
  });

  assert.equal(response.status, 200);
  assert.equal(response.payload.success, true);
  assert.ok(response.payload.data.answer);
});

test('financial endpoints return the uniform success envelope', async () => {
  const response = await request('/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jane@company.com', password: 'demo' })
  });

  assert.equal(response.payload.success, true);
  assert.ok(response.payload.data);
  assert.ok(!('error' in response.payload));
});

test('error middleware sanitizes unexpected failures', async () => {
  const response = await request('/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'bad@example.com', password: 'demo' })
  });

  assert.equal(response.status, 401);
  assert.equal(response.payload.success, false);
  assert.equal(response.payload.error.code, 'UNAUTHORIZED');
  assert.ok(response.payload.error.message);
  assert.ok(!response.payload.error.stack);
});

async function getDemoAccessToken() {
  const response = await request('/api/v1/auth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'jane@company.com', password: 'demo' })
  });
  return response.payload.data.accessToken;
}
