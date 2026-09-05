import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${derivedKey}`;
}

export function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;

  const [salt, expectedKey] = storedHash.split(':');
  if (!salt || !expectedKey) return false;

  const actualKey = scryptSync(password, salt, KEY_LENGTH);
  const expectedKeyBuffer = Buffer.from(expectedKey, 'hex');
  return expectedKeyBuffer.length === actualKey.length && timingSafeEqual(actualKey, expectedKeyBuffer);
}
