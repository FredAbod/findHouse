const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');
const emailService = require('./emailService');
const { mergeWithPublicFilter, publicListingFilter } = require('../utils/propertyVisibility');

const viewNotificationCache = new Map();
const VIEW_NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000;

setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of viewNotificationCache.entries()) {
    if (now - timestamp > VIEW_NOTIFICATION_COOLDOWN) {
      viewNotificationCache.delete(key);
    }
  }
}, 60 * 60 * 1000);

/** Build Mongo sort from query.sort (frontend: newest | price-low | price-high). */
function buildSort(sortParam) {
  switch (sortParam) {
    case 'price-low':
      return { price: 1 };
    case 'price-high':
      return { price: -1 };
    case 'newest':
    default:
      return { createdAt: -1 };
  }
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

    if (query.state) {
      clauses.push({
        'location.state': { $regex: new RegExp(`^${query.state}$`, 'i') }
      });
    }
    if (query.city) {
      clauses.push({
        'location.city': { $regex: new RegExp(`^${query.city}$`, 'i') }
      });
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
      isVerified:
        property.owner?.verification?.status === 'verified' ||
        property.owner?.isVerified ||
        false,
      hasLiked: userId
        ? property.likes?.some(likeId => likeId.toString() === userId.toString())
        : false
    };
  }

  async createProperty(propertyData, userId) {
    const property = new Property({
      ...propertyData,
      owner: userId
    });
    const savedProperty = await property.save();

    await Promise.all([
      Activity.logActivity('property_listed', userId, {
        propertyId: savedProperty._id,
        propertyTitle: savedProperty.title,
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
    return await Property.find(
      mergeWithPublicFilter({
        $text: { $search: searchQuery }
      }),
      { score: { $meta: 'textScore' } }
    )
      .sort({ score: { $meta: 'textScore' } })
      .populate('owner', 'name email')
      .lean();
  }

  /** Owner soft-delete */
  async softDeleteProperty(propertyId, userId) {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error('Property not found');
    if (property.owner.toString() !== userId.toString()) throw new Error('Not authorized');

    property.deletedAt = new Date();
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
