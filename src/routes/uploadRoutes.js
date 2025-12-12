const express = require('express');
const router = express.Router();
const { upload, videoUpload, uploadImages, deleteImage, uploadVideo, getVideoStatus } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/images', protect, upload.array('images', 5), uploadImages);
router.delete('/images/:imageUrl', protect, deleteImage);
router.post('/video/:propertyId', protect, videoUpload.single('video'), uploadVideo);
router.get('/video/status/:propertyId', protect, getVideoStatus);

module.exports = router;
