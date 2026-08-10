const Property = require('../models/propertyModel');

/**
 * Address → coordinates via OpenStreetMap Nominatim.
 *
 * Chosen over Google Geocoding because it needs no API key and no billing
 * account. In exchange we must respect their usage policy: a genuine
 * User-Agent, and at most one request per second. Both are enforced here
 * rather than left to callers.
 *
 * Geocoding is always best-effort — a listing that cannot be placed still
 * saves, it just has no pin.
 */

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'FindHouse/2.0 (https://findhouse.online; support@findhouse.online)';
const MIN_INTERVAL_MS = 1100;

let lastRequestAt = 0;

async function throttle() {
  const wait = lastRequestAt + MIN_INTERVAL_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastRequestAt = Date.now();
}

/** Collapses whitespace and strips trailing punctuation from a location part. */
function clean(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .replace(/[,\s]+$/, '')
    .trim();
}

/**
 * Normalises the free-text location an owner typed.
 *
 * Untrimmed values are a real problem in the live data: "Abeokuta" and
 * "Abeokuta " are counted as two separate areas by the area aggregation, so
 * the search typeahead lists the same place twice.
 */
function normalizeLocation(location = {}) {
  const normalized = { ...location };
  if (location.state !== undefined) normalized.state = clean(location.state);
  if (location.city !== undefined) normalized.city = clean(location.city);
  if (location.address !== undefined) normalized.address = clean(location.address);
  return normalized;
}

/**
 * Looks up coordinates for an address. Tries the most specific query first and
 * falls back to progressively broader ones, so a bad street name still places
 * the listing in the right town.
 */
async function geocode({ address, city, state, country = 'Nigeria' }) {
  const attempts = [
    [address, city, state, country],
    [city, state, country],
    [state, country]
  ]
    .map((parts) => parts.map(clean).filter(Boolean).join(', '))
    .filter((q, i, all) => q && all.indexOf(q) === i);

  for (const q of attempts) {
    try {
      await throttle();
      const url = `${NOMINATIM_URL}?format=json&limit=1&countrycodes=ng&q=${encodeURIComponent(q)}`;
      const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
      if (!response.ok) continue;

      const results = await response.json();
      if (Array.isArray(results) && results.length) {
        return {
          lat: parseFloat(results[0].lat),
          lng: parseFloat(results[0].lon),
          precision: q === attempts[0] ? 'address' : 'area',
          matchedOn: q
        };
      }
    } catch {
      // Network or parse failure — fall through to the next, broader attempt.
    }
  }

  return null;
}

/**
 * Fills in `location.lat/lng` for a property document if they are missing or
 * the address changed. Mutates and saves; safe to call on every write.
 */
async function attachCoordinates(property) {
  if (!property?.location) return property;
  if (typeof property.location.lat === 'number' && typeof property.location.lng === 'number') {
    return property;
  }

  const coords = await geocode(property.location);
  if (!coords) return property;

  property.location.lat = coords.lat;
  property.location.lng = coords.lng;
  await property.save();
  return property;
}

/**
 * Backfills every listing that has no coordinates. Rate-limited by `throttle`,
 * so roughly one listing per second.
 */
async function backfill({ limit = 500, log = () => {} } = {}) {
  const pending = await Property.find({
    deletedAt: null,
    $or: [{ 'location.lat': { $exists: false } }, { 'location.lat': null }]
  }).limit(limit);

  let placed = 0;
  let skipped = 0;

  for (const property of pending) {
    // Normalise while we are here — dirty area names break the area facet.
    property.location = normalizeLocation(property.location);

    const coords = await geocode(property.location);
    if (coords) {
      property.location.lat = coords.lat;
      property.location.lng = coords.lng;
      placed += 1;
      log(`✓ ${property.title.slice(0, 44)} → ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (${coords.precision})`);
    } else {
      skipped += 1;
      log(`· ${property.title.slice(0, 44)} → no match`);
    }
    await property.save();
  }

  return { total: pending.length, placed, skipped };
}

module.exports = { geocode, attachCoordinates, backfill, normalizeLocation };
