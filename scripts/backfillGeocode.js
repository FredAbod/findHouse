/**
 * One-off: give every existing listing coordinates, and clean up the
 * whitespace in area names while we are there.
 *
 *   node scripts/backfillGeocode.js
 *
 * Rate-limited to roughly one listing per second by the geocoding service, in
 * line with Nominatim's usage policy — expect ~1 second per listing.
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const geocodingService = require('../src/services/geocodingService');

(async () => {
  try {
    await connectDB();
    console.log('Backfilling coordinates…\n');

    const result = await geocodingService.backfill({ log: (line) => console.log(line) });

    console.log(
      `\nDone. ${result.placed} placed, ${result.skipped} without a match, ${result.total} processed.`
    );
    process.exit(0);
  } catch (error) {
    console.error('Backfill failed:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close().catch(() => {});
  }
})();
