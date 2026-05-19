/**
 * Loads billing limits from env (configurable ops).
 */

function parseIntEnv(key, fallback) {
  const v = parseInt(process.env[key], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

module.exports.FREE_TIER_PROPERTY_LIMIT = parseIntEnv(
  'FREE_TIER_PROPERTY_LIMIT',
  3
);

module.exports.PAYSTACK_PRO_AMOUNT_NGN = parseIntEnv('PAYSTACK_PRO_AMOUNT_NGN', 5000);
