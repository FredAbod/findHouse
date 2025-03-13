const express = require('express');
const router = express.Router();
const { upload, uploadImages, deleteImage } = require('../controllers/uploadController');
const { protect } = require('../middleware/authMiddleware');

router.post('/images', protect, upload.array('images', 5), uploadImages);
router.delete('/images/:imageUrl', protect, deleteImage);

module.exports = router;
