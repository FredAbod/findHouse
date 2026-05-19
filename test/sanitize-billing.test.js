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
