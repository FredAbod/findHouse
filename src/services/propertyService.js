const Property = require('../models/propertyModel');

class PropertyService {
  async getProperties(query, page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const queryObj = {};
    
    if (query.type) queryObj.type = query.type;
    if (query.category) queryObj.category = query.category;
    if (query.state) queryObj['location.state'] = query.state;

    const properties = await Property.find(queryObj)
      .populate('owner', 'name email')
      .skip(skip)
      .limit(limit);

    const total = await Property.countDocuments(queryObj);

    return {
      properties,
      page,
      pages: Math.ceil(total / limit),
      total
    };
  }

  async getPropertyById(id) {
    const property = await Property.findById(id).populate('owner', 'name email');
    if (!property) throw new Error('Property not found');
    return property;
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
      { $text: { $search: searchQuery } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .populate('owner', 'name email');
  }
}

module.exports = new PropertyService();
