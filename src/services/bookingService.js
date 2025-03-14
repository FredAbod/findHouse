const Booking = require('../models/bookingModel');
const Property = require('../models/propertyModel');

class BookingService {
  async createBooking(propertyId, userId, bookingData) {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error('Property not found');

    return await Booking.create({
      property: property._id,
      user: userId,
      owner: property.owner,
      requestedDate: bookingData.requestedDate,
      message: bookingData.message
    });
  }

  async getUserBookings(userId) {
    return await Booking.find({
      $or: [{ user: userId }, { owner: userId }]
    })
      .populate('property')
      .populate('user', 'name email')
      .populate('owner', 'name email');
  }

  async updateBookingStatus(bookingId, status, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.owner.toString() !== userId.toString()) throw new Error('Not authorized');

    booking.status = status;
    return await booking.save();
  }
}

module.exports = new BookingService();
