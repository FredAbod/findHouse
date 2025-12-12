const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

class GoogleDriveService {
  constructor() {
    this.auth = null;
    this.drive = null;
  }

  async initialize() {
    try {
      // Create OAuth2 client with credentials from environment variables
      this.auth = new google.auth.GoogleAuth({
        credentials: {
          client_email: process.env.GOOGLE_DRIVE_CLIENT_EMAIL,
          private_key: process.env.GOOGLE_DRIVE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          client_id: process.env.GOOGLE_DRIVE_CLIENT_ID,
        },
        scopes: ['https://www.googleapis.com/auth/drive.file'],
      });

      this.drive = google.drive({ version: 'v3', auth: this.auth });
      console.log('Google Drive API initialized successfully');
    } catch (error) {
      console.error('Error initializing Google Drive API:', error);
      throw error;
    }
  }

  async uploadFile(filePath, fileName) {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      const fileMetadata = {
        name: fileName,
        // Use shared drive if GOOGLE_DRIVE_FOLDER_ID is provided
        ...(process.env.GOOGLE_DRIVE_FOLDER_ID && { parents: [process.env.GOOGLE_DRIVE_FOLDER_ID] })
      };

      const media = {
        mimeType: 'video/mp4',
        body: fs.createReadStream(filePath),
      };

      const file = await this.drive.files.create({
        requestBody: fileMetadata,
        media: media,
        fields: 'id',
        supportsAllDrives: true,
      });

      // Make the file publicly accessible
      await this.drive.permissions.create({
        fileId: file.data.id,
        requestBody: {
          role: 'reader',
          type: 'anyone',
        },
        supportsAllDrives: true,
      });

      // Get the web view link
      const fileData = await this.drive.files.get({
        fileId: file.data.id,
        fields: 'webViewLink, webContentLink',
        supportsAllDrives: true,
      });

      return fileData.data.webViewLink;
    } catch (error) {
      console.error('Error uploading file to Google Drive:', error);
      throw error;
    }
  }

  async deleteFile(fileId) {
    if (!this.drive) {
      await this.initialize();
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
      });
      return { message: 'File deleted successfully' };
    } catch (error) {
      console.error('Error deleting file from Google Drive:', error);
      throw error;
    }
  }
}

module.exports = new GoogleDriveService();
