const asyncHandler = require('express-async-handler');
const uploadService = require('../services/uploadService');

const uploadImages = asyncHandler(async (req, res) => {
  const uploadedFiles = await uploadService.uploadFiles(req.files);
  res.json(uploadedFiles);
});

const deleteImage = asyncHandler(async (req, res) => {
  const result = await uploadService.deleteFile(req.params.public_id);
  res.json(result);
});

module.exports = {
  upload: uploadService.upload,
  uploadImages,
  deleteImage
};
