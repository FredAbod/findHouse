/**
 * Loads billing limits from env (configurable ops).
 */

function parseIntEnv(key, fallback) {
  const v = parseInt(process.env[key], 10);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
}

/**
 * Max new properties a free user may POST per UTC calendar day (not concurrent inventory cap).
 * Legacy env FREE_TIER_PROPERTY_LIMIT is still read as fallback when unset so deploys keep working.
 */
const dailyCreatesExplicit = parseIntEnv('FREE_TIER_DAILY_LISTING_CREATES', NaN);
module.exports.FREE_TIER_DAILY_LISTING_CREATES = Number.isFinite(dailyCreatesExplicit)
  ? dailyCreatesExplicit
  : parseIntEnv('FREE_TIER_PROPERTY_LIMIT', 3);

/** @deprecated Use FREE_TIER_DAILY_LISTING_CREATES — kept for docs/scripts referencing old name */
module.exports.FREE_TIER_PROPERTY_LIMIT = module.exports.FREE_TIER_DAILY_LISTING_CREATES;

/** Concurrent featured listings per Pro owner (agents/admins exempt in propertyService). */
module.exports.PRO_MAX_FEATURED_LISTINGS = parseIntEnv(
  'PRO_MAX_FEATURED_LISTINGS',
  2
);

module.exports.PAYSTACK_PRO_AMOUNT_NGN = parseIntEnv('PAYSTACK_PRO_AMOUNT_NGN', 5000);
