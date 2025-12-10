# Backend Updates - New Features

This document describes the newly implemented backend features.

## 1. Video Upload with Watermarking

### Endpoint
- **URL**: `POST /api/upload/video`
- **Auth**: Required (JWT token)
- **Content-Type**: `multipart/form-data`
- **Field Name**: `video`
- **Supported Formats**: mp4, mov, avi, quicktime
- **Max File Size**: 100MB

### How It Works
1. Receives video file upload
2. Adds company logo watermark (from `public/logo.png`) at bottom-right corner with 50% opacity
3. Uploads processed video to Google Drive
4. Returns Google Drive public URL

### Response Example
```json
{
  "url": "https://drive.google.com/file/d/..."
}
```

### Setup Requirements
1. Place your company logo as `public/logo.png`
2. Install ffmpeg on your server:
   - **Ubuntu/Debian**: `sudo apt-get install ffmpeg`
   - **MacOS**: `brew install ffmpeg`
   - **Windows**: Download from [ffmpeg.org](https://ffmpeg.org/download.html)
3. Configure Google Drive API credentials in `.env` file

## 2. User Verification System

### Database Schema Updates (User Model)
Two new fields added:
- `isVerified`: Boolean (default: false) - Indicates if user is verified
- `verificationStatus`: String enum ['none', 'pending', 'verified', 'rejected'] (default: 'none')

### Endpoint: Request Verification
- **URL**: `POST /api/users/request-verification`
- **Auth**: Required (JWT token)

### How It Works
1. Checks if user is already verified or has pending request
2. Sets `verificationStatus` to 'pending'
3. Returns updated user object (TODO: Add admin notification)

### Response Example
```json
{
  "_id": "user_id",
  "name": "John Doe",
  "email": "john@example.com",
  "verificationStatus": "pending",
  "isVerified": false
}
```

### Admin Workflow (To Be Implemented)
Admins will need an interface to:
1. View users with `verificationStatus: 'pending'`
2. Set `isVerified: true` and `verificationStatus: 'verified'` for approved users
3. Set `verificationStatus: 'rejected'` for rejected requests

## 3. Property Video Links

### Database Schema Updates (Property Model)
New field added:
- `videoUrl`: String (optional) - Stores Google Drive video URL

### Updated Endpoints
The following property endpoints now accept and save `videoUrl`:
- `POST /api/properties` - Create property with optional videoUrl
- `PUT /api/properties/:id` - Update property with optional videoUrl

### Usage Example
```json
{
  "title": "Beautiful Apartment",
  "description": "...",
  "price": 250000,
  "videoUrl": "https://drive.google.com/file/d/..."
}
```

## Google Drive Setup Guide

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google Drive API:
   - Navigate to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"
4. Create Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in details and create
5. Generate Key:
   - Click on created service account
   - Go to "Keys" tab
   - Click "Add Key" > "Create New Key"
   - Choose JSON format
   - Download the key file
6. Extract credentials from JSON file and add to `.env`:
   - `client_email` → `GOOGLE_DRIVE_CLIENT_EMAIL`
   - `private_key` → `GOOGLE_DRIVE_PRIVATE_KEY`
   - `client_id` → `GOOGLE_DRIVE_CLIENT_ID`

## Dependencies Installed

```json
{
  "fluent-ffmpeg": "^2.1.3",
  "googleapis": "^latest"
}
```

## Testing the Video Upload

### Using Postman/Thunder Client:
1. Set method to POST
2. URL: `http://localhost:5000/api/upload/video`
3. Headers: `Authorization: Bearer YOUR_JWT_TOKEN`
4. Body: Select `form-data`
5. Add field: Key = `video`, Type = File, Value = Select your video file
6. Send request

### Using cURL:
```bash
curl -X POST http://localhost:5000/api/upload/video \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "video=@/path/to/your/video.mp4"
```

## Important Notes

1. **Logo File**: Ensure `public/logo.png` exists before testing video upload
2. **ffmpeg Installation**: Server must have ffmpeg installed for video processing
3. **Google Drive Permissions**: Service account needs proper permissions to upload files
4. **File Cleanup**: Temporary files are automatically cleaned up after processing
5. **Error Handling**: All endpoints include proper error handling and cleanup on failure

## Next Steps

- [ ] Implement admin panel for user verification management
- [ ] Add email notifications for verification status changes
- [ ] Add webhook support for admin notifications
- [ ] Implement video thumbnail generation
- [ ] Add video duration validation
- [ ] Consider adding video transcoding for multiple formats
