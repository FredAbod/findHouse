const Property = require('../models/propertyModel');
const User = require('../models/userModel');

class PropertyService {
  async getProperties(query, page = 1, limit = 10, userId = null) {
    const skip = (page - 1) * limit;
    const queryObj = { isHidden: false }; // Exclude hidden properties
    
    if (query.type) queryObj.type = query.type;
    if (query.category) queryObj.category = query.category;
    if (query.state) queryObj['location.state'] = query.state;
    if (query.featured) queryObj.featured = query.featured === 'true';

    const properties = await Property.find(queryObj)
      .populate('owner', 'name email')
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Property.countDocuments(queryObj);

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
    return await property.save();
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
        isHidden: false // Exclude hidden properties from search
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
}

module.exports = new PropertyService();
