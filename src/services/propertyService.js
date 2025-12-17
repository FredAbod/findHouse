const Property = require('../models/propertyModel');
const User = require('../models/userModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');

class PropertyService {
  async getProperties(query, page = 1, limit = 10, userId = null) {
    // Ensure page and limit are valid numbers
    page = isNaN(page) || page < 1 ? 1 : page;
    limit = isNaN(limit) || limit < 1 ? 10 : limit;
    
    const skip = (page - 1) * limit;
    const queryObj = { isHidden: { $ne: true } }; // Exclude hidden properties (includes docs without isHidden field)
    
    // Basic filters (case-insensitive for string fields)
    if (query.type) queryObj.type = { $regex: new RegExp(`^${query.type}$`, 'i') };
    if (query.category) queryObj.category = { $regex: new RegExp(`^${query.category}$`, 'i') };
    if (query.featured) queryObj.featured = query.featured === 'true';
    
    // Location filters (case-insensitive)
    if (query.state) queryObj['location.state'] = { $regex: new RegExp(`^${query.state}$`, 'i') };
    if (query.city) queryObj['location.city'] = { $regex: new RegExp(`^${query.city}$`, 'i') };
    
    // Bedroom filter (minimum bedrooms)
    if (query.bedrooms) {
      const bedrooms = parseInt(query.bedrooms);
      if (!isNaN(bedrooms)) queryObj.bedrooms = { $gte: bedrooms };
    }
    
    // Bathroom filter (minimum bathrooms)
    if (query.bathrooms) {
      const bathrooms = parseInt(query.bathrooms);
      if (!isNaN(bathrooms)) queryObj.bathrooms = { $gte: bathrooms };
    }
    
    // Price range filters
    if (query.minPrice || query.maxPrice) {
      queryObj.price = {};
      if (query.minPrice) {
        const minPrice = parseFloat(query.minPrice);
        if (!isNaN(minPrice)) queryObj.price.$gte = minPrice;
      }
      if (query.maxPrice) {
        const maxPrice = parseFloat(query.maxPrice);
        if (!isNaN(maxPrice)) queryObj.price.$lte = maxPrice;
      }
      // Remove empty price object if neither value was valid
      if (Object.keys(queryObj.price).length === 0) delete queryObj.price;
    }

    // Debug logging
    console.log('=== getProperties Debug ===');
    console.log('Query params received:', JSON.stringify(query, null, 2));
    console.log('Final MongoDB queryObj:', JSON.stringify(queryObj, null, 2));
    console.log('Page:', page, 'Limit:', limit, 'Skip:', skip);

    // Step-by-step filter debugging
    const totalInCollection = await Property.countDocuments({});
    console.log('1. Total documents in Property collection:', totalInCollection);

    const afterHiddenFilter = await Property.countDocuments({ isHidden: { $ne: true } });
    console.log('2. After isHidden filter:', afterHiddenFilter);

    // Log sample of actual data in DB for debugging
    const sampleProperty = await Property.findOne({}).lean();
    if (sampleProperty) {
      console.log('3. Sample property from DB:', JSON.stringify({
        type: sampleProperty.type,
        category: sampleProperty.category,
        location: sampleProperty.location,
        price: sampleProperty.price,
        bedrooms: sampleProperty.bedrooms,
        bathrooms: sampleProperty.bathrooms,
        isHidden: sampleProperty.isHidden
      }, null, 2));
    }

    // Get unique values in DB for comparison
    const uniqueStates = await Property.distinct('location.state');
    const uniqueCategories = await Property.distinct('category');
    const uniqueTypes = await Property.distinct('type');
    console.log('4. Unique states in DB:', uniqueStates);
    console.log('5. Unique categories in DB:', uniqueCategories);
    console.log('6. Unique types in DB:', uniqueTypes);

    const properties = await Property.find(queryObj)
      .populate('owner', 'name email')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Property.countDocuments(queryObj);
    
    console.log('7. Properties found with full query:', properties.length);
    console.log('8. Total matching full query:', total);
    if (properties.length === 0 && totalInCollection > 0) {
      console.log('⚠️  WARNING: Properties exist but none match query filters!');
      console.log('   Check if frontend params match DB values (case, spelling, field names)');
    }
    console.log('=== End Debug ===');

    const propertiesWithLikes = properties.map(property => ({
      ...property,
      hasLiked: userId ? property.likes.some(likeId => likeId.toString() === userId.toString()) : false
    }));

    return {
      properties: propertiesWithLikes,
      page,
      pages: Math.ceil(total / limit),
      total
    };
  }

  async getPropertyById(id, userId = null) {
    const property = await Property.findById(id)
      .populate('owner', 'name email')
      .lean();
      
    if (!property) throw new Error('Property not found');
    
    // If property is hidden, only owner can view it
    if (property.isHidden && (!userId || property.owner._id.toString() !== userId.toString())) {
      throw new Error('Property not found');
    }
    
    return {
      ...property,
      hasLiked: userId ? property.likes.some(likeId => likeId.toString() === userId.toString()) : false
    };
  }

  async createProperty(propertyData, userId) {
    const property = new Property({
      ...propertyData,
      owner: userId
    });
    const savedProperty = await property.save();

    // Log activity and update analytics
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
    if (!property) throw new Error('Property not found');
    if (property.owner.toString() !== userId) throw new Error('Not authorized');
    
    return await Property.findByIdAndUpdate(id, propertyData, { new: true });
  }

  async searchProperties(searchQuery) {
    return await Property.find(
      { 
        $text: { $search: searchQuery },
        isHidden: { $ne: true } // Exclude hidden properties from search
      },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate('owner', 'name email');
  }

  async toggleLikeAndFavorite(propertyId, userId) {
    const [property, user] = await Promise.all([
      Property.findById(propertyId),
      User.findById(userId)
    ]);

    if (!property) throw new Error('Property not found');
    if (!user) throw new Error('User not found');

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

  // Update property rental status
  async updatePropertyStatus(propertyId, userId, statusData) {
    const property = await Property.findById(propertyId);
    
    if (!property) throw new Error('Property not found');
    if (property.owner.toString() !== userId.toString()) {
      throw new Error('Not authorized to update this property status');
    }

    const { status, rentedUntil } = statusData;

    // Validate status
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
      // Clear rental info when marked available
      property.rentedAt = undefined;
      property.rentedUntil = undefined;
      property.currentTenant = undefined;
    }

    await property.save();
    return property;
  }

  // Mark property as rented (called when booking is completed)
  async markPropertyAsRented(propertyId, tenantId) {
    return await Property.findByIdAndUpdate(
      propertyId,
      {
        status: 'rented',
        rentedAt: new Date(),
        currentTenant: tenantId
      },
      { new: true }
    );
  }

  // Mark property as available (called when rental period ends or manually)
  async markPropertyAsAvailable(propertyId) {
    return await Property.findByIdAndUpdate(
      propertyId,
      {
        status: 'available',
        $unset: { rentedAt: 1, rentedUntil: 1, currentTenant: 1 }
      },
      { new: true }
    );
  }
}

module.exports = new PropertyService();
