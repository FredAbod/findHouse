const Booking = require('../models/bookingModel');
const Property = require('../models/propertyModel');

class BookingService {
  async createBooking(propertyId, userId, bookingData) {
    const property = await Property.findById(propertyId);
    if (!property) throw new Error('Property not found');

    const booking = await Booking.create({
      property: property._id,
      user: userId,
      owner: property.owner,
      requestedDate: bookingData.requestedDate,
      message: bookingData.message
    });

    // Return populated booking
    return await Booking.findById(booking._id)
      .populate('property', 'title location images price type category')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone');
  }

  async getUserBookings(userId) {
    console.log('=== getUserBookings Debug ===');
    console.log('Looking for bookings for userId:', userId);

    // First check raw bookings
    const rawBookings = await Booking.find({
      $or: [{ user: userId }, { owner: userId }]
    }).lean();
    console.log('Raw bookings found:', rawBookings.length);
    if (rawBookings.length > 0) {
      console.log('Sample raw booking:', JSON.stringify(rawBookings[0], null, 2));
    }

    const bookings = await Booking.find({
      $or: [{ user: userId }, { owner: userId }]
    })
      .populate('property', 'title location images price type category bedrooms bathrooms')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone')
      .sort({ createdAt: -1 });

    console.log('Populated bookings:', bookings.length);
    if (bookings.length > 0) {
      console.log('Sample populated booking:', JSON.stringify({
        _id: bookings[0]._id,
        property: bookings[0].property,
        user: bookings[0].user,
        owner: bookings[0].owner,
        status: bookings[0].status
      }, null, 2));
      
      // Check for null references
      const nullProperty = bookings.filter(b => b.property === null).length;
      const nullUser = bookings.filter(b => b.user === null).length;
      const nullOwner = bookings.filter(b => b.owner === null).length;
      console.log('Bookings with null property:', nullProperty);
      console.log('Bookings with null user:', nullUser);
      console.log('Bookings with null owner:', nullOwner);
    }
    console.log('=== End Debug ===');

    return bookings;
  }

  async updateBookingStatus(bookingId, status, userId) {
    const booking = await Booking.findById(bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.owner.toString() !== userId.toString()) throw new Error('Not authorized');

    booking.status = status;
    await booking.save();

    // Return populated booking
    return await Booking.findById(bookingId)
      .populate('property', 'title location images price type category')
      .populate('user', 'name email phone')
      .populate('owner', 'name email phone');
  }
}

module.exports = new BookingService();
