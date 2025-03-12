const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    this.storage = new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: 'findhouse',
        allowed_formats: ['jpg', 'jpeg', 'png']
      }
    });

    this.upload = multer({ storage: this.storage });
  }

  async uploadFiles(files) {
    if (!files || files.length === 0) {
      throw new Error('No files uploaded');
    }

    return files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));
  }

  async deleteFile(publicId) {
    await cloudinary.uploader.destroy(publicId);
    return { message: 'Image deleted' };
  }
}

module.exports = new UploadService();
