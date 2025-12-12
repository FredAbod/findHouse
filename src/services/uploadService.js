const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const googleDriveService = require('../config/googleDrive');

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
    
    // Video upload configuration
    this.videoUpload = multer({
      storage: storage,
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only video files are allowed.'));
        }
      },
      limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
      }
    });
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

  async uploadVideoWithWatermark(videoFile, propertyId) {
    const Property = require('../models/propertyModel');
    
    return new Promise(async (resolve, reject) => {
      // Set a timeout to prevent endless loading (5 minutes for video processing)
      const timeout = setTimeout(() => {
        if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
        reject(new Error('Video processing timeout - file may be too large or processing failed'));
      }, 5 * 60 * 1000);
      
      try {
        // Verify property exists
        const property = await Property.findById(propertyId);
        if (!property) {
          clearTimeout(timeout);
          if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
          throw new Error('Property not found');
        }

        const inputPath = videoFile.path;
        const outputPath = path.join('/tmp', `watermarked-${Date.now()}.mp4`);
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');

        // Check if logo exists
        if (!fs.existsSync(logoPath)) {
          console.warn('Logo file not found, uploading video without watermark');
          // Upload without watermark if logo doesn't exist
          const fileName = `property-video-${propertyId}-${Date.now()}.mp4`;
          const driveUrl = await googleDriveService.uploadFile(inputPath, fileName);
          
          // Update property with video URL
          property.videoUrl = driveUrl;
          await property.save();
          
          // Clean up
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          clearTimeout(timeout);
          resolve(driveUrl);
          return;
        }

        // Add watermark using ffmpeg
        ffmpeg(inputPath)
          .input(logoPath)
          .complexFilter([
            // Position watermark at bottom-right with 50% opacity
            '[1:v]format=rgba,colorchannelmixer=aa=0.5[logo]',
            '[0:v][logo]overlay=W-w-10:H-h-10'
          ])
          .output(outputPath)
          .on('progress', (progress) => {
            console.log(`Processing: ${progress.percent}% done`);
          })
          .on('end', async () => {
            try {
              // Upload watermarked video to Google Drive
              const fileName = `property-video-${propertyId}-${Date.now()}.mp4`;
              const driveUrl = await googleDriveService.uploadFile(outputPath, fileName);

              // Update property with video URL
              property.videoUrl = driveUrl;
              await property.save();

              // Clean up temporary files
              fs.unlinkSync(inputPath);
              fs.unlinkSync(outputPath);

              clearTimeout(timeout);
              resolve(driveUrl);
            } catch (uploadError) {
              // Clean up files on error
              if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
              if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
              clearTimeout(timeout);
              reject(uploadError);
            }
          })
          .on('error', (err) => {
            // Clean up files on error
            if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
            clearTimeout(timeout);
            reject(err);
          })
          .run();
      } catch (error) {
        // Clean up input file on error
        if (fs.existsSync(videoFile.path)) fs.unlinkSync(videoFile.path);
        clearTimeout(timeout);
        reject(error);
      }
    });
  }
}

module.exports = new UploadService();
