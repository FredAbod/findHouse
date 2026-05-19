/**
 * Single source of truth for which property documents may appear on public surfaces
 * (marketplace feed, search, public profile listings, non-owner detail, favorites).
 *
 * Soft-deleted: deletedAt is set (Date).
 * Hidden: isHidden === true (owner moderation); treated as non-public for non-owners.
 */

function publicListingFilter() {
  return {
    isHidden: { $ne: true },
    deletedAt: null
  };
}

/**
 * Merge additional query criteria with public visibility (AND semantics).
 * @param {Record<string, unknown>} queryObj - existing Mongo filter
 */
function mergeWithPublicFilter(queryObj) {
  return { ...queryObj, ...publicListingFilter() };
}

/**
 * True if a lean/mongoose doc should be shown to non-owners.
 */
function isPubliclyVisibleDoc(doc) {
  if (!doc) return false;
  if (doc.deletedAt) return false;
  if (doc.isHidden === true) return false;
  return true;
}

module.exports = {
  publicListingFilter,
  mergeWithPublicFilter,
  isPubliclyVisibleDoc
};
