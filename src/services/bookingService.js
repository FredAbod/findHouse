const Booking = require('../models/bookingModel');
const Property = require('../models/propertyModel');
const Activity = require('../models/activityModel');
const Analytics = require('../models/analyticsModel');

class BookingService {
  async createBooking(propertyId, userId, bookingData) {
    const property = await Property.findById(propertyId);
    if (!property || property.deletedAt) throw new Error('Property not found');
    if (property.isHidden) throw new Error('Property not available for booking');

    // Check if property is available
    if (property.status === 'rented') {
      throw new Error('This property is already rented');
    }

    const booking = await Booking.create({
      property: property._id,
      user: userId,
      owner: property.owner,
      requestedDate: bookingData.requestedDate,
      message: bookingData.message
    });

    // Log activity and update analytics
    await Promise.all([
      Activity.logActivity('booking_created', userId, {
        bookingId: booking._id,
        propertyId: property._id,
        propertyTitle: property.title
      }),
      Analytics.incrementMetric('newBookings')
    ]);

    // Return populated booking
    return await Booking.findById(booking._id)
      .populate('property', 'title location images price type category')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone');
  }

  async getUserBookings(userId) {
    return Booking.find({
      $or: [{ user: userId }, { owner: userId }]
    })
      .populate('property', 'title location images price type category bedrooms bathrooms status')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });
  }

  async updateBookingStatus(bookingId, status, userId) {
    const booking = await Booking.findById(bookingId)
      .populate('property', 'title');
    
    if (!booking) throw new Error('Booking not found');
    if (booking.owner.toString() !== userId.toString()) throw new Error('Not authorized');

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // Auto-update property status when booking is completed
    if (status === 'completed' && previousStatus !== 'completed') {
      await Property.findByIdAndUpdate(booking.property._id, {
        status: 'rented',
        rentedAt: new Date(),
        currentTenant: booking.user
      });

      // Log activity and update analytics
      await Promise.all([
        Activity.logActivity('rental_completed', userId, {
          bookingId: booking._id,
          propertyId: booking.property._id,
          propertyTitle: booking.property.title,
          tenantId: booking.user
        }),
        Analytics.incrementMetric('completedRentals')
      ]);
    }

    // Log booking status change activity
    const activityType = status === 'approved' ? 'booking_approved' : 
                        status === 'rejected' ? 'booking_rejected' : null;
    
    if (activityType) {
      await Activity.logActivity(activityType, userId, {
        bookingId: booking._id,
        propertyId: booking.property._id
      });
    }

    // Return populated booking
    return await Booking.findById(bookingId)
      .populate('property', 'title location images price type category status')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone');
  }
}

module.exports = new BookingService();
