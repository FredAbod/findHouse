/**
 * Fields clients may PATCH on PUT /api/properties/:id (owner-only).
 * Excludes ownership, moderation, aggregates, deletion, billing, likes.
 */
module.exports.PROPERTY_OWNER_UPDATE_FIELDS = [
  'title',
  'description',
  'price',
  'type',
  'category',
  'bedrooms',
  'bathrooms',
  'location',
  'features',
  'images',
  'videoUrl'
];
