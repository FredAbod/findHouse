const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const {
  getUserProfile,
  updateUserProfile,
  getUserProperties,
  getUserFavorites,
  changePassword,
  requestVerification,
  submitVerification,
  getVerificationStatus,
  uploadProfilePicture,
  checkNicknameAvailability,
  getPublicProfile,
  sendEmailVerification,
  verifyEmail
} = require('../controllers/userController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer storage for profile pictures
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'profile-pictures',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
  }
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 2 * 1024 * 1024 } // 2MB limit
});

// Multer storage for verification documents
const verificationDocStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'verification-documents',
    allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
    resource_type: 'auto'
  }
});

const verificationDocUpload = multer({
  storage: verificationDocStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Public routes (no auth required)
router.get('/nickname/check', optionalAuth, checkNicknameAvailability);
router.get('/public/:nickname', getPublicProfile);

// Email verification routes
router.post('/email/send-verification', protect, sendEmailVerification);
router.post('/email/verify', verifyEmail);

// Profile picture upload
router.post('/profile-picture', protect, profilePictureUpload.single('profilePicture'), uploadProfilePicture);

// Verification routes (must be before /:id routes)
router.post('/request-verification', protect, requestVerification);
router.post('/verification/submit', protect, verificationDocUpload.single('documentFile'), submitVerification);
router.get('/verification/status', protect, getVerificationStatus);

// User routes
router.route('/:id')
  .get(getUserProfile)
  .put(protect, updateUserProfile);

router.get('/:id/properties', getUserProperties);
router.get('/:id/favorites', protect, getUserFavorites);

// Password change route
router.put('/:id/change-password', protect, changePassword);

module.exports = router;
