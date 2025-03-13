const asyncHandler = require('express-async-handler');
const uploadService = require('../services/uploadService');

const uploadImages = asyncHandler(async (req, res) => {
  const imageUrls = await uploadService.uploadFiles(req.files);
  res.json({ images: imageUrls });
});

const deleteImage = asyncHandler(async (req, res) => {
  const result = await uploadService.deleteFile(req.params.imageUrl);
  res.json(result);
});

module.exports = {
  upload: uploadService.upload,
  uploadImages,
  deleteImage
};
