const Setting = require('../models/settingModel');

/**
 * Platform settings with a three-level fallback: the database value an admin
 * set, then the environment variable, then a hard-coded default. That way a
 * fresh deployment works with no admin action, ops can override per
 * environment, and an admin can change it live without a redeploy.
 */

const DEFINITIONS = {
  referralBonus: {
    env: 'REFERRAL_BONUS',
    fallback: 5000,
    type: 'number',
    label: 'Referral bonus (₦)',
    help: 'Paid to the referrer once their invitee qualifies. Shown in the app’s share sheet.'
  },
  referralQualifyOn: {
    env: 'REFERRAL_QUALIFY_ON',
    fallback: 'listing_or_pro',
    type: 'enum',
    options: ['signup', 'listing_or_pro'],
    label: 'Referral qualifies on',
    help: '"signup" pays on registration; "listing_or_pro" waits until the invitee publishes a listing or subscribes to Pro.'
  },
  proMonthlyPrice: {
    env: 'PRO_MONTHLY_PRICE',
    fallback: 5000,
    type: 'number',
    label: 'FindHouse Pro — monthly (₦)'
  },
  proYearlyPrice: {
    env: 'PRO_YEARLY_PRICE',
    fallback: 45000,
    type: 'number',
    label: 'FindHouse Pro — yearly (₦)'
  }
};

/** Short-lived cache; settings are read on nearly every referral request. */
const cache = new Map();
const CACHE_MS = 60_000;

function coerce(definition, raw) {
  if (raw === undefined || raw === null || raw === '') return undefined;
  if (definition.type === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
  }
  if (definition.type === 'enum') {
    return definition.options.includes(String(raw)) ? String(raw) : undefined;
  }
  return raw;
}

async function get(key) {
  const definition = DEFINITIONS[key];
  if (!definition) throw Object.assign(new Error(`Unknown setting: ${key}`), { statusCode: 400 });

  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) return cached.value;

  let value;
  const stored = await Setting.findOne({ key }).lean();
  if (stored) value = coerce(definition, stored.value);
  if (value === undefined) value = coerce(definition, process.env[definition.env]);
  if (value === undefined) value = definition.fallback;

  cache.set(key, { value, expires: Date.now() + CACHE_MS });
  return value;
}

/** Every setting plus where its current value came from — shown in admin. */
async function all() {
  const stored = await Setting.find().lean();
  const byKey = Object.fromEntries(stored.map((s) => [s.key, s]));

  const entries = await Promise.all(
    Object.entries(DEFINITIONS).map(async ([key, definition]) => {
      const value = await get(key);
      const source = byKey[key]
        ? 'admin'
        : process.env[definition.env] !== undefined
          ? 'environment'
          : 'default';
      return [
        key,
        {
          value,
          source,
          label: definition.label,
          help: definition.help,
          type: definition.type,
          options: definition.options
        }
      ];
    })
  );

  return Object.fromEntries(entries);
}

async function set(key, rawValue, adminUserId) {
  const definition = DEFINITIONS[key];
  if (!definition) throw Object.assign(new Error(`Unknown setting: ${key}`), { statusCode: 400 });

  const value = coerce(definition, rawValue);
  if (value === undefined) {
    throw Object.assign(new Error(`Invalid value for ${key}`), { statusCode: 400 });
  }
  if (definition.type === 'number' && value < 0) {
    throw Object.assign(new Error(`${key} cannot be negative`), { statusCode: 400 });
  }

  await Setting.findOneAndUpdate(
    { key },
    { value, updatedBy: adminUserId || null },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  cache.delete(key);

  return { key, value };
}

module.exports = { get, all, set, DEFINITIONS };
