const cloudinary = require('cloudinary').v2;
const multer = require('multer');

class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Configure multer for temporary storage
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        cb(null, '/tmp');  // Temporary storage
      },
      filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
      }
    });

    this.upload = multer({ storage: storage });
  }

  async uploadFiles(files) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    const uploadPromises = files.map(file => 
      cloudinary.uploader.upload(file.path)
    );

    const results = await Promise.all(uploadPromises);
    return results.map(result => result.secure_url);
  }

  async deleteFile(imageUrl) {
    // Extract public_id from URL if needed for deletion
    const publicId = imageUrl.split('/').slice(-1)[0].split('.')[0];
    await cloudinary.uploader.destroy(publicId);
    return { message: 'Image deleted' };
  }
}

module.exports = new UploadService();
