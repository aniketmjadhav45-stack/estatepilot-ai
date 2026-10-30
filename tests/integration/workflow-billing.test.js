import test from 'node:test';
import assert from 'node:assert/strict';

const BILLING_PLANS = {
  STARTER: {
    maxSeats: 1,
    maxListings: 25,
    aiCredits: 500,
    price: 49,
  },
  PROFESSIONAL: {
    maxSeats: 3,
    maxListings: 100,
    aiCredits: 2000,
    price: 99,
  },
  AGENCY: {
    maxSeats: 15,
    maxListings: 500,
    aiCredits: 8000,
    price: 249,
  },
};

function checkTierLimit(plan, currentSeats, currentListings) {
  const planConfig = BILLING_PLANS[plan];
  if (!planConfig) {
    throw new Error('Invalid plan');
  }

  return {
    canAddSeat: currentSeats < planConfig.maxSeats,
    canAddListing: currentListings < planConfig.maxListings,
    aiCreditsAllocated: planConfig.aiCredits,
  };
}

test('Billing & Quotas: Solo Starter limits enforcement', () => {
  const check = checkTierLimit('STARTER', 1, 20);
  assert.equal(check.canAddSeat, false); // Starter only permits 1 seat
  assert.equal(check.canAddListing, true); // 20 < 25
  assert.equal(check.aiCreditsAllocated, 500);
});

test('Billing & Quotas: Boutique Agency multi-agent scaling', () => {
  const check = checkTierLimit('AGENCY', 8, 240);
  assert.equal(check.canAddSeat, true); // 8 < 15
  assert.equal(check.canAddListing, true); // 240 < 500
  assert.equal(check.aiCreditsAllocated, 8000);
});

test('Billing & Quotas: Hard cap triggers upgrade requirement', () => {
  const check = checkTierLimit('PROFESSIONAL', 3, 100);
  assert.equal(check.canAddSeat, false); // Max 3 seats reached
  assert.equal(check.canAddListing, false); // Max 100 listings reached
});
