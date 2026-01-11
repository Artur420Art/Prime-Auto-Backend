# S3 Service Setup Guide for Railway

## Overview

This guide explains how to set up and use the S3 service with Railway's S3-compatible storage for the Available Cars module.

## Current S3 Service Implementation

The S3 service (`src/common/s3/s3.service.ts`) provides:
- ✅ File upload to Railway S3 bucket
- ✅ File deletion from S3
- ✅ File existence check
- ✅ URL key extraction
- ✅ Proper error handling
- ✅ Configuration validation
- ✅ TypeScript type safety

## Environment Variables Required

Add these to your `.env` file:

```env
# Railway S3-Compatible Storage
S3_ENDPOINT=https://storage.railway.app
S3_REGION=auto
S3_BUCKET_NAME=arranged-knapsack-uqsv-2g
S3_ACCESS_KEY_ID=t1d_z1BnzYeZZjVYGeYMSlHRSFMqleoENLPu_OBtJrWzPTTSSILBUZ
S3_SECRET_ACCESS_KEY=tsec_LV21fyb0_wO0tu1-1AmnDFWJEa_boLVcifqAQ5nNPGw4_q7eQ0Ck8u-+610JigGyNDJMqs
```

## Installation

Install the required AWS SDK package:

```bash
npm install @aws-sdk/client-s3
```

## S3Service Methods

### 1. Upload File

```typescript
await s3Service.upload({
  key: 'path/to/file.jpg',
  file: buffer, // Buffer from Express.Multer.File
  contentType: 'image/jpeg',
});

// Returns: { url: string, key: string }
```

**Example URL returned:**
```
https://storage.railway.app/arranged-knapsack-uqsv-2g/available-cars/VIN123/1704067200000-car.jpg
```

### 2. Delete File

```typescript
await s3Service.delete('path/to/file.jpg');
```

### 3. Check File Existence

```typescript
const exists = await s3Service.exists('path/to/file.jpg');
// Returns: boolean
```

### 4. Extract Key from URL

```typescript
const key = s3Service.extractKeyFromUrl(
  'https://storage.railway.app/arranged-knapsack-uqsv-2g/available-cars/VIN123/file.jpg'
);
// Returns: 'available-cars/VIN123/file.jpg'
```

## Usage in Available Cars Service
  
### Creating a Car with Photos

```typescript
const photoUrls: string[] = [];

for (const photo of photos) {
  const key = `available-cars/${vin}/${Date.now()}-${photo.originalname}`;
  const { url } = await this.s3Service.upload({
    key,
    file: photo.buffer,
    contentType: photo.mimetype,
  });
  photoUrls.push(url);
}
```

### Deleting Photos

```typescript
// Extract key from URL
const key = this.s3Service.extractKeyFromUrl(photoUrl);

// Delete from S3
await this.s3Service.delete(key);
```

## Error Handling

The S3 service includes comprehensive error handling:

```typescript
try {
  await s3Service.upload({ key, file, contentType });
} catch (error) {
  // Error is logged automatically
  // Error message includes details for debugging
}
```

## File Organization

Photos are stored with the following structure:

```
bucket-name/
  └── available-cars/
      ├── VIN1234567890ABCDEF/
      │   ├── 1704067200000-front.jpg
      │   ├── 1704067201000-rear.jpg
      │   └── 1704067202000-interior.jpg
      └── VIN0987654321FEDCBA/
          ├── 1704067300000-side.jpg
          └── 1704067301000-engine.jpg
```

## Configuration Validation

The S3 service validates all required configuration on initialization:

- ✅ `S3_BUCKET_NAME` must be set
- ✅ `S3_ENDPOINT` must be set
- ✅ `S3_ACCESS_KEY_ID` must be set
- ✅ `S3_SECRET_ACCESS_KEY` must be set

If any are missing, the service throws an error on startup.

## Railway-Specific Settings

The service is configured for Railway's S3-compatible storage:

```typescript
{
  endpoint: process.env.S3_ENDPOINT,
  region: 'auto', // Railway uses 'auto' region
  forcePathStyle: true, // Required for S3-compatible storage
}
```

## Testing the Service

### Test Upload

```bash
# Start your server
npm run start:dev

# Use Swagger UI at http://localhost:3000/docs
# Or use curl:

curl -X POST "http://localhost:3000/available-cars" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: multipart/form-data" \
  -F "carModel=Toyota Camry" \
  -F "carYear=2022" \
  -F "carVin=1HGBH41JXMN109186" \
  -F "carPrice=25000" \
  -F "carCategory=AVAILABLE" \
  -F "carPhotos=@/path/to/photo1.jpg" \
  -F "carPhotos=@/path/to/photo2.jpg"
```

## Common Issues & Solutions

### Issue: "S3 configuration is missing"
**Solution:** Ensure all S3 environment variables are set in your `.env` file.

### Issue: Upload fails with 403 Forbidden
**Solution:** Verify your S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY are correct.

### Issue: Files not accessible after upload
**Solution:** The files are stored in Railway's private bucket. URLs are generated and should be accessed through the API.

### Issue: Delete operation fails silently
**Solution:** Check the logs - the service logs all errors but doesn't throw to prevent blocking other operations.

## Production Considerations

1. **Backup Strategy**: Implement regular backups of your S3 bucket
2. **Access Control**: Keep your S3 credentials secure and never commit them to git
3. **File Size Limits**: Current limit is 5MB per file (configurable in controller)
4. **Supported Formats**: jpg, jpeg, png, webp, gif (configurable in controller validators)
5. **Cleanup**: Photos are automatically deleted when a car is removed

## Monitoring

The service logs all operations:

```
[S3Service] Uploading file to S3: available-cars/VIN123/file.jpg
[S3Service] Successfully uploaded file: https://...
[S3Service] Deleting file from S3: available-cars/VIN123/file.jpg
[S3Service] Upload failed: Access Denied
```

Monitor these logs in production to track S3 operations and catch issues early.

## Security Best Practices

1. ✅ Environment variables are used for credentials (never hardcoded)
2. ✅ File types are validated before upload
3. ✅ File sizes are limited
4. ✅ Bucket name is validated on service initialization
5. ✅ Error messages don't expose sensitive information

## Further Customization

To modify upload behavior, edit:
- **File size limit**: `available-cars.controller.ts` (FilesInterceptor config)
- **Allowed file types**: `available-cars.controller.ts` (FileTypeValidator)
- **Folder structure**: `available-cars.service.ts` (key generation)
- **S3 client config**: `s3.service.ts` (constructor)
