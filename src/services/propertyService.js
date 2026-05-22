const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');
const emailService = require('./emailService');
const { publicListingFilter } = require('../utils/propertyVisibility');
const { hasActiveProBilling } = require('./billingService');
const { PRO_MAX_FEATURED_LISTINGS } = require('../constants/billingConfig');

const viewNotificationCache = new Map();
const VIEW_NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000;

const GLOBAL_SEARCH_Q_MAX_LENGTH = 200;

function escapeRegex(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Free-text marketplace search: matches any word across title, description,
 * location (city/state/address), and feature tags (case-insensitive, substring-safe).
 */
function appendGlobalSearchClause(clauses, rawQ) {
  const q = String(rawQ ?? '')
    .trim()
    .slice(0, GLOBAL_SEARCH_Q_MAX_LENGTH);
  if (!q) return;

  const words = q
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2)
    .slice(0, 8);

  const buildOrForTerm = (term) => {
    const escaped = escapeRegex(term);
    const rx = new RegExp(escaped, 'i');
    return {
      $or: [
        { title: { $regex: rx } },
        { description: { $regex: rx } },
        { 'location.city': { $regex: rx } },
        { 'location.state': { $regex: rx } },
        { 'location.address': { $regex: rx } },
        { features: { $regex: rx } }
      ]
    };
  };

  if (words.length === 0) {
    clauses.push(buildOrForTerm(q));
    return;
  }

  clauses.push({ $and: words.map(buildOrForTerm) });
}

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewNotificationCache.entries()) {
    if (now - timestamp > VIEW_NOTIFICATION_COOLDOWN) {
      viewNotificationCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

/** Build Mongo sort from query.sort (frontend: newest | price-low | price-high). Featured first. */
function buildSort(sortParam) {
  /** Boolean false < true ascending; descending puts true first. */
  const featuredBoost = { featured: -1 };
  let base;
  switch (sortParam) {
    case 'price-low':
      base = { price: 1 };
      break;
    case 'price-high':
      base = { price: -1 };
      break;
    case 'newest':
    default:
      base = { createdAt: -1 };
  }
  return { ...featuredBoost, ...base };
}

/** Adds category constraints to $and clauses (supports OR across types). */
function appendCategoryClause(clauses, category) {
  if (!category) return;
  const labels = Array.isArray(category) ? category : [category];
  const parts = labels
    .map((c) => String(c).trim())
    .filter(Boolean);
  if (parts.length === 0) return;
  if (parts.length === 1) {
    clauses.push({
      category: { $regex: new RegExp(`^${parts[0]}$`, 'i') }
    });
    return;
  }
  clauses.push({
    $or: parts.map((p) => ({
      category: { $regex: new RegExp(`^${p}$`, 'i') }
    }))
  });
}

class PropertyService {
  async getProperties(query, page = 1, limit = 10, userId = null) {
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;

    const skip = (page - 1) * limit;
    const clauses = [publicListingFilter()];

    if (query.type) {
      clauses.push({ type: { $regex: new RegExp(`^${query.type}$`, 'i') } });
    }
    appendCategoryClause(clauses, query.category);
    if (query.featured) clauses.push({ featured: query.featured === 'true' });

    if (query.q) appendGlobalSearchClause(clauses, query.q);

    if (query.state) {
      const s = String(query.state).trim();
      if (s) {
        clauses.push({
          'location.state': { $regex: new RegExp(escapeRegex(s), 'i') }
        });
      }
    }
    if (query.city) {
      const c = String(query.city).trim();
      if (c) {
        clauses.push({
          'location.city': { $regex: new RegExp(escapeRegex(c), 'i') }
        });
      }
    }

    if (query.bedrooms) {
      const bedrooms = parseInt(query.bedrooms, 10);
      if (!isNaN(bedrooms)) clauses.push({ bedrooms: { $gte: bedrooms } });
    }

    if (query.bathrooms) {
      const bathrooms = parseInt(query.bathrooms, 10);
      if (!isNaN(bathrooms)) clauses.push({ bathrooms: { $gte: bathrooms } });
    }

    if (query.minPrice || query.maxPrice) {
      const price = {};
      if (query.minPrice) {
        const minPrice = parseFloat(query.minPrice);
        if (!isNaN(minPrice)) price.$gte = minPrice;
      }
      if (query.maxPrice) {
        const maxPrice = parseFloat(query.maxPrice);
        if (!isNaN(maxPrice)) price.$lte = maxPrice;
      }
      if (Object.keys(price).length > 0) clauses.push({ price });
    }

    const queryObj = clauses.length === 1 ? clauses[0] : { $and: clauses };

    const sortSpec = buildSort(query.sort);

    const [properties, total] = await Promise.all([
      Property.find(queryObj)
        .populate('owner', 'name email verification.status isVerified')
        .sort(sortSpec)
        .skip(skip)
        .limit(limit)
        .lean(),
      Property.countDocuments(queryObj)
    ]);

    const propertiesWithLikes = properties.map(property => ({
      ...property,
      isVerified:
        property.owner?.verification?.status === 'verified' ||
        property.owner?.isVerified ||
        false,
      hasLiked: userId
        ? property.likes?.some(likeId => likeId.toString() === userId.toString())
        : false
    }));

    return {
      properties: propertiesWithLikes,
      page,
      pages: Math.ceil(total / limit) || 1,
      total
    };
  }

  /**
   * All non-deleted properties for owner (includes hidden — dashboard).
   */
  async getMyProperties(ownerUserId) {
    return Property.find({
      owner: ownerUserId,
      deletedAt: null
    })
      .populate('owner', 'name email verification.status isVerified')
      .sort({ createdAt: -1 })
      .lean();
  }

  async getPropertyById(id, userId = null) {
    const property = await Property.findById(id)
      .populate('owner', 'name email phone verification.status isVerified')
      .populate('currentTenant', 'name email')
      .lean();

    if (!property) throw new Error('Property not found');

    const isOwner = userId && property.owner._id.toString() === userId.toString();

    if (property.deletedAt && !isOwner) {
      throw new Error('Property not found');
    }

    if (property.isHidden && !isOwner) {
      throw new Error('Property not found');
    }

    /** Detail-page views counted for listing insights (not owner self-views). */
    if (!property.deletedAt && !property.isHidden && !isOwner) {
      Property.updateOne({ _id: property._id }, { $inc: { viewCount: 1 } })
        .exec()
        .catch((e) =>
          console.error('viewCount increment failed:', e.message || e)
        );
    }

    if (
      userId &&
      property.owner._id.toString() !== userId.toString() &&
      !property.deletedAt
    ) {
      const cacheKey = `${property._id}-${userId}`;
      const lastNotification = viewNotificationCache.get(cacheKey);
      const now = Date.now();

      if (!lastNotification || (now - lastNotification) > VIEW_NOTIFICATION_COOLDOWN) {
        viewNotificationCache.set(cacheKey, now);

        User.findById(userId).select('name email phone').lean()
          .then(async (viewer) => {
            if (viewer && property.owner.email) {
              try {
                await emailService.sendPropertyViewNotification({
                  ownerEmail: property.owner.email,
                  ownerName: property.owner.name,
                  viewerName: viewer.name,
                  viewerEmail: viewer.email,
                  viewerPhone: viewer.phone,
                  propertyTitle: property.title,
                  propertyLocation: `${property.location?.address || ''}, ${property.location?.city || ''}, ${property.location?.state || ''}`.trim().replace(/^,\s*|,\s*$/g, ''),
                  propertyId: property._id
                });
              } catch (error) {
                console.error('Failed to send property view notification:', error.message);
                viewNotificationCache.delete(cacheKey);
              }
            }
          })
          .catch(error => {
            console.error('Error fetching viewer details:', error.message);
            viewNotificationCache.delete(cacheKey);
          });
      }
    }

    return {
      ...property,
      viewCount: property.viewCount ?? 0,
      isVerified:
        property.owner?.verification?.status === 'verified' ||
        property.owner?.isVerified ||
        false,
      hasLiked: userId
        ? property.likes?.some(likeId => likeId.toString() === userId.toString())
        : false
    };
  }

  /**
   * Owner toggles marketplace featured boost (Pro quota; admin/agent exempt from cap).
   */
  async setFeaturedStatus(propertyId, userIdString, featured) {
    const property = await Property.findById(propertyId);

    if (!property || property.deletedAt) {
      const err = new Error('Property not found');
      err.statusCode = 404;
      throw err;
    }

    if (property.owner.toString() !== userIdString.toString()) {
      const err = new Error('Not authorized');
      err.statusCode = 403;
      throw err;
    }

    const wantFeatured = !!featured;

    if (!wantFeatured) {
      property.featured = false;
      property.featuredUntil = null;
      await property.save();

      const leanProp = await Property.findById(propertyId)
        .populate('owner', 'name email verification.status isVerified')
        .lean();
      return leanProp;
    }

    if (property.isHidden) {
      const err = new Error(
        'Featured placement requires a visible listing. Unhide your property first.'
      );
      err.statusCode = 400;
      throw err;
    }

    const userLean = await User.findById(userIdString).select('billing role').lean();
    if (!userLean) {
      const err = new Error('User not found');
      err.statusCode = 404;
      throw err;
    }

    const privilegedRole =
      userLean.role === 'admin' || userLean.role === 'agent';

    if (!privilegedRole && !hasActiveProBilling(userLean.billing)) {
      const err = new Error(
        'FindHouse Pro is required to feature listings. Upgrade from your profile.'
      );
      err.statusCode = 403;
      err.code = 'PRO_REQUIRED_FEATURED';
      throw err;
    }

    const quota = privilegedRole
      ? Number.MAX_SAFE_INTEGER
      : PRO_MAX_FEATURED_LISTINGS;

    const featuredElsewhereCount = await Property.countDocuments({
      owner: userIdString,
      deletedAt: null,
      featured: true,
      _id: { $ne: property._id }
    });

    if (!property.featured && featuredElsewhereCount >= quota) {
      const err = new Error(
        `You've reached your concurrent featured limit (${PRO_MAX_FEATURED_LISTINGS} on Pro). Unfeature another listing or contact sales for higher limits.`
      );
      err.statusCode = 400;
      err.code = 'FEATURED_QUOTA_EXCEEDED';
      throw err;
    }

    property.featured = true;
    await property.save();

    return Property.findById(propertyId)
      .populate('owner', 'name email verification.status isVerified')
      .lean();
  }

  /** Owner-only roll-up for Insights / pricingtruth MVP */
  async getOwnerPropertyAnalytics(propertyId, ownerUserId) {
    const property = await Property.findOne({
      _id: propertyId,
      deletedAt: null,
      owner: ownerUserId
    }).lean();

    if (!property) {
      const err = new Error('Property not found');
      err.statusCode = 404;
      throw err;
    }

    const userLean = await User.findById(ownerUserId).select('billing role').lean();

    const privilegedRole =
      userLean?.role === 'admin' || userLean?.role === 'agent';
    const usedFeaturedSlots = await Property.countDocuments({
      owner: ownerUserId,
      deletedAt: null,
      featured: true
    });

    return {
      propertyId: String(property._id),
      title: property.title,
      viewCount: property.viewCount ?? 0,
      featured: !!property.featured,
      featuredUntil: property.featuredUntil ?? null,
      featuredQuotaCap: privilegedRole ? null : PRO_MAX_FEATURED_LISTINGS,
      usedFeaturedSlots
    };
  }

  async createProperty(propertyData, userId) {
    const property = new Property({
      ...propertyData,
      owner: userId
    });
    const savedProperty = await property.save();

    const loc = savedProperty.location;
    const location =
      loc && (loc.city || loc.state)
        ? [loc.city, loc.state].filter(Boolean).join(', ')
        : null;

    await Promise.all([
      Activity.logActivity('property_listed', userId, {
        propertyId: savedProperty._id,
        propertyTitle: savedProperty.title,
        property: savedProperty.title,
        location,
        type: savedProperty.type,
        category: savedProperty.category
      }),
      Analytics.incrementMetric('newProperties')
    ]);

    return savedProperty;
  }

  async updateProperty(id, propertyData, userId) {
    const property = await Property.findById(id);
    if (!property || property.deletedAt) throw new Error('Property not found');
    if (property.owner.toString() !== userId) throw new Error('Not authorized');

    return await Property.findByIdAndUpdate(id, propertyData, { new: true });
  }

  async searchProperties(searchQuery) {
    if (!searchQuery || !String(searchQuery).trim()) {
      return [];
    }
    const clauses = [publicListingFilter()];
    appendGlobalSearchClause(clauses, searchQuery);
    const queryObj = clauses.length === 1 ? clauses[0] : { $and: clauses };
    const sortSpec = buildSort('newest');
    return Property.find(queryObj)
      .sort(sortSpec)
      .populate('owner', 'name email verification.status isVerified')
      .limit(40)
      .lean();
  }

  /** Owner soft-delete */
  async softDeleteProperty(propertyId, userId) {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error('Property not found');
    if (property.owner.toString() !== userId.toString()) throw new Error('Not authorized');

    property.deletedAt = new Date();
    property.featured = false;
    property.featuredUntil = null;
    await property.save();

    await User.updateMany(
      { favoriteProperties: propertyId },
      { $pull: { favoriteProperties: propertyId } }
    );

    await Activity.logActivity('property_deleted', userId, {
      propertyId,
      soft: true
    });

    return { message: 'Property deleted successfully', id: propertyId };
  }

  async toggleLikeAndFavorite(propertyId, userId) {
    const [property, user] = await Promise.all([
      Property.findById(propertyId),
      User.findById(userId)
    ]);

    if (!property || property.deletedAt) throw new Error('Property not found');
    if (!user) throw new Error('User not found');

    const isOwner = property.owner.toString() === userId.toString();
    if (property.isHidden && !isOwner) throw new Error('Property not found');

    const propertyLikeIndex = property.likes.indexOf(userId);
    const userFavoriteIndex = user.favoriteProperties.indexOf(propertyId);

    if (propertyLikeIndex === -1) {
      property.likes.push(userId);
      user.favoriteProperties.push(propertyId);
    } else {
      property.likes.splice(propertyLikeIndex, 1);
      user.favoriteProperties.splice(userFavoriteIndex, 1);
    }

    await Promise.all([property.save(), user.save()]);
    return property;
  }

  async updatePropertyStatus(propertyId, userId, statusData) {
    const property = await Property.findById(propertyId);

    if (!property || property.deletedAt) throw new Error('Property not found');
    if (property.owner.toString() !== userId.toString()) {
      throw new Error('Not authorized to update this property status');
    }

    const { status, rentedUntil } = statusData;

    if (!['available', 'pending', 'rented'].includes(status)) {
      throw new Error('Invalid status value');
    }

    property.status = status;

    if (status === 'rented') {
      property.rentedAt = new Date();
      if (rentedUntil) {
        property.rentedUntil = new Date(rentedUntil);
      }
    } else if (status === 'available') {
      property.rentedAt = undefined;
      property.rentedUntil = undefined;
      property.currentTenant = undefined;
    }

    await property.save();
    return property;
  }

  async markPropertyAsRented(propertyId, tenantId) {
    return await Property.findOneAndUpdate(
      { _id: propertyId, deletedAt: null },
      {
        status: 'rented',
        rentedAt: new Date(),
        currentTenant: tenantId
      },
      { new: true }
    );
  }

  async markPropertyAsAvailable(propertyId) {
    return await Property.findOneAndUpdate(
      { _id: propertyId, deletedAt: null },
      {
        status: 'available',
        $unset: { rentedAt: 1, rentedUntil: 1, currentTenant: 1 }
      },
      { new: true }
    );
  }
}

module.exports = new PropertyService();
