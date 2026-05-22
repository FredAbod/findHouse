const { test } = require('node:test');
const assert = require('node:assert/strict');
const billingService = require('../src/services/billingService');

test('sanitizeBillingPublic: active Pro', () => {
  const future = new Date(Date.now() + 7 * 86400000);
  const out = billingService.sanitizeBillingPublic({
    billing: {
      plan: 'pro',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: future
    }
  });
  assert.equal(out.isProActive, true);
  assert.equal(out.plan, 'pro');
  assert.equal(typeof out.proMaxFeaturedListings, 'number');
  assert.ok(out.proMaxFeaturedListings >= 0);
  assert.equal(typeof out.freeTierDailyListingCreates, 'number');
  assert.ok(out.freeTierDailyListingCreates >= 0);
  assert.equal(out.listingLimitFree, out.freeTierDailyListingCreates);
});

test('sanitizeBillingPublic: expired Pro downgrades display', () => {
  const past = new Date(Date.now() - 86400000);
  const out = billingService.sanitizeBillingPublic({
    billing: {
      plan: 'pro',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: past
    }
  });
  assert.equal(out.isProActive, false);
});
