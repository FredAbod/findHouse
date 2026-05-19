/**
 * Prevent shared caches from storing authenticated/dynamic JSON API responses.
 */
function apiCacheHeaders(req, res, next) {
  res.set('Cache-Control', 'private, no-store');
  next();
}

module.exports = apiCacheHeaders;
