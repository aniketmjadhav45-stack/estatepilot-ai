import test from 'node:test';
import assert from 'node:assert/strict';

// Validation logic for Phase 0 domain schemas
function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateSlug(slug) {
  // Lowercase letters, numbers, and hyphens only
  const re = /^[a-z0-9-]+$/;
  return typeof slug === 'string' && slug.length >= 2 && slug.length <= 60 && re.test(slug);
}

function validatePassword(password) {
  // Min 8 chars, uppercase, lowercase, number
  const hasMinLen = typeof password === 'string' && password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNum = /[0-9]/.test(password);
  return hasMinLen && hasUpper && hasLower && hasNum;
}

function validatePropertyInput(input) {
  if (!input.title || input.title.length < 5) return { valid: false, error: 'Title too short' };
  if (!input.price || input.price <= 0) return { valid: false, error: 'Price must be positive' };
  if (!input.currency || input.currency.length !== 3) return { valid: false, error: 'Invalid currency' };
  return { valid: true };
}

test('Validation: Email format verification', () => {
  assert.equal(validateEmail('alex@brokerage.com'), true);
  assert.equal(validateEmail('invalid-email'), false);
  assert.equal(validateEmail('@domain.com'), false);
});

test('Validation: Workspace Slug rules', () => {
  assert.equal(validateSlug('apex-realty'), true);
  assert.equal(validateSlug('metro-properties-2026'), true);
  assert.equal(validateSlug('Invalid Slug!'), false); // Uppercase and spaces forbidden
  assert.equal(validateSlug('a'), false); // Too short
});

test('Validation: Strong Password verification', () => {
  assert.equal(validatePassword('SuperPass123!'), true);
  assert.equal(validatePassword('weak'), false);
  assert.equal(validatePassword('alllowercase123'), false);
  assert.equal(validatePassword('ALLUPPERCASE123'), false);
  assert.equal(validatePassword('NoNumbersHere!'), false);
});

test('Validation: Property listing input validation', () => {
  assert.deepEqual(
    validatePropertyInput({ title: 'Skyline Penthouse', price: 1500000, currency: 'USD' }),
    { valid: true }
  );

  assert.equal(
    validatePropertyInput({ title: 'Tiny', price: 1500000, currency: 'USD' }).valid,
    false
  );

  assert.equal(
    validatePropertyInput({ title: 'Skyline Penthouse', price: -500, currency: 'USD' }).valid,
    false
  );
});
