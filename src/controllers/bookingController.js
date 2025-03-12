const asyncHandler = require('express-async-handler');
const bookingService = require('../services/bookingService');

const createBooking = asyncHandler(async (req, res) => {
  const booking = await bookingService.createBooking(
    req.body.propertyId,
    req.user._id,
    {
      requestedDate: req.body.requestedDate,
      message: req.body.message
    }
  );
  res.status(201).json(booking);
});

const getBookings = asyncHandler(async (req, res) => {
  const bookings = await bookingService.getUserBookings(req.user._id);
  res.json(bookings);
});

const updateBookingStatus = asyncHandler(async (req, res) => {
  const booking = await bookingService.updateBookingStatus(
    req.params.id,
    req.body.status,
    req.user._id
  );
  res.json(booking);
});

module.exports = {
  createBooking,
  getBookings,
  updateBookingStatus
};
