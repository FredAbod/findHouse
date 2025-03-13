const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  type: {
    type: String,
    enum: ['sale', 'rent'],
    required: true
  },
  category: {
    type: String,
    enum: ['apartment', 'house', 'land', 'commercial'],
    required: true
  },
  location: {
    state: String,
    city: String,
    address: String
  },
  features: [{
    type: String
  }],
  images: [{
    type: String  // Store only the cloudinary URL
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

propertySchema.index({ title: 'text', description: 'text' });

const Property = mongoose.model('Property', propertySchema);
module.exports = Property;
