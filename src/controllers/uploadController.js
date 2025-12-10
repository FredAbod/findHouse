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

const uploadVideo = asyncHandler(async (req, res) => {
  if (!req.file) {
    res.status(400);
    throw new Error('No video file uploaded');
  }

  const videoUrl = await uploadService.uploadVideoWithWatermark(req.file);
  res.json({ url: videoUrl });
});

module.exports = {
  upload: uploadService.upload,
  videoUpload: uploadService.videoUpload,
  uploadImages,
  deleteImage,
  uploadVideo
};
