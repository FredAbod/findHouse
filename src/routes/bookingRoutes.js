const express = require('express');
const router = express.Router();
const {
  createBooking,
  getBookings,
  updateBookingStatus
} = require('../controllers/bookingController');
const { protect } = require('../middleware/authMiddleware');

router.route('/')
  .post(protect, createBooking)
  .get(protect, getBookings);

router.put('/:id', protect, updateBookingStatus);

module.exports = router;
