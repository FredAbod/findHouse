const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const ffmpeg = require('fluent-ffmpeg');
const path = require('path');
const fs = require('fs');
const os = require('os');
const googleDriveService = require('../config/googleDrive');

class UploadService {
  constructor() {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    // Set ffmpeg path if provided in environment variables
    if (process.env.FFMPEG_PATH) {
      ffmpeg.setFfmpegPath(process.env.FFMPEG_PATH);
    }
    if (process.env.FFPROBE_PATH) {
      ffmpeg.setFfprobePath(process.env.FFPROBE_PATH);
    }

    // Configure multer for temporary storage with OS-appropriate temp directory
    const tempDir = os.platform() === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp';
    
    const storage = multer.diskStorage({
      destination: function (req, file, cb) {
        // Ensure temp directory exists
        if (!fs.existsSync(tempDir)) {
          fs.mkdirSync(tempDir, { recursive: true });
        }
        cb(null, tempDir);
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
        const tempDir = os.platform() === 'win32' ? process.env.TEMP || 'C:\\temp' : '/tmp';
        const outputPath = path.join(tempDir, `watermarked-${Date.now()}.mp4`);
        const logoPath = path.join(process.cwd(), 'public', 'logo.png');

        // Check if ffmpeg is available
        const ffmpegAvailable = await this.checkFfmpegAvailable();
        
        // Upload without watermark if ffmpeg is not available or logo doesn't exist
        if (!ffmpegAvailable || !fs.existsSync(logoPath)) {
          if (!ffmpegAvailable) {
            console.warn('FFmpeg not found. Uploading video without watermark. To enable watermarks, install FFmpeg and set FFMPEG_PATH in .env');
          } else {
            console.warn('Logo file not found. Uploading video without watermark.');
          }
          
          // Upload directly to Cloudinary
          console.log('Uploading video to Cloudinary...');
          const result = await cloudinary.uploader.upload(inputPath, {
            resource_type: 'video',
            folder: 'property-videos',
            public_id: `property-${propertyId}-${Date.now()}`,
            chunk_size: 6000000, // 6MB chunks for better upload stability
          });
          const videoUrl = result.secure_url;
          console.log('Video uploaded to Cloudinary successfully');
          
          // Update property with video URL (bypass validation since we're only updating videoUrl)
          await Property.findByIdAndUpdate(
            propertyId,
            { videoUrl: videoUrl },
            { runValidators: false }
          );
          
          // Clean up
          if (fs.existsSync(inputPath)) fs.unlinkSync(inputPath);
          clearTimeout(timeout);
          resolve(videoUrl);
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
              // Upload watermarked video directly to Cloudinary
              console.log('Uploading watermarked video to Cloudinary...');
              const result = await cloudinary.uploader.upload(outputPath, {
                resource_type: 'video',
                folder: 'property-videos',
                public_id: `property-${propertyId}-${Date.now()}`,
                chunk_size: 6000000, // 6MB chunks for better upload stability
              });
              const videoUrl = result.secure_url;
              console.log('Watermarked video uploaded to Cloudinary successfully');

              // Update property with video URL (bypass validation since we're only updating videoUrl)
              await Property.findByIdAndUpdate(
                propertyId,
                { videoUrl: videoUrl },
                { runValidators: false }
              );

              // Clean up temporary files
              fs.unlinkSync(inputPath);
              fs.unlinkSync(outputPath);

              clearTimeout(timeout);
              resolve(videoUrl);
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

  async checkFfmpegAvailable() {
    return new Promise((resolve) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }
}

module.exports = new UploadService();
