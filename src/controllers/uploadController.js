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
  const { propertyId } = req.params;
  
  if (!propertyId) {
    res.status(400);
    throw new Error('Property ID is required');
  }

  if (!req.file) {
    res.status(400);
    throw new Error('No video file uploaded');
  }

  // Return immediately with accepted status
  res.status(202).json({ 
    success: true,
    message: 'Video upload started. Processing in background.',
    propertyId: propertyId,
    status: 'processing'
  });

  // Process upload in background (don't await)
  uploadService.uploadVideoWithWatermark(req.file, propertyId)
    .then(videoUrl => {
      console.log(`Video uploaded successfully for property ${propertyId}: ${videoUrl}`);
    })
    .catch(error => {
      console.error(`Video upload failed for property ${propertyId}:`, error.message);
    });
});

const getVideoStatus = asyncHandler(async (req, res) => {
  const { propertyId } = req.params;
  const Property = require('../models/propertyModel');
  
  const property = await Property.findById(propertyId).select('videoUrl videoUploadStatus');
  
  if (!property) {
    res.status(404);
    throw new Error('Property not found');
  }

  res.json({
    propertyId,
    status: property.videoUploadStatus,
    videoUrl: property.videoUrl || null,
    hasVideo: !!property.videoUrl
  });
});

module.exports = {
  upload: uploadService.upload,
  videoUpload: uploadService.videoUpload,
  uploadImages,
  deleteImage,
  uploadVideo,
  getVideoStatus
};
