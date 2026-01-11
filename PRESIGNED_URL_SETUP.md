# Presigned URLs Setup for Railway S3

## The Problem

Railway S3 buckets are **PRIVATE by default** and don't support public access. Direct URLs return "Access Denied".

## The Solution: Presigned URLs ✅

Presigned URLs are temporary, secure URLs that grant access to private S3 objects.

## Installation Steps

### 1. Stop your server

```bash
# Press Ctrl+C in your terminal
```

### 2. Install the presigner package

```bash
cd /Users/arthurgasparyan/Desktop/primeAutoBackend/Prime-Auto-Backend
npm install @aws-sdk/s3-request-presigner
```

### 3. Restart your server

```bash
npm run start
```

## How It Works

### Before (Not Working ❌)

```
https://customizable-saddlebag-d41yat.storage.railway.app/available-cars/VIN/file.jpeg
→ Access Denied
```

### After (Working ✅)

```
https://customizable-saddlebag-d41yat.storage.railway.app/available-cars/VIN/file.jpeg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=...&X-Amz-Signature=...
→ File loads successfully!
```

## Code Changes Made

### 1. Updated S3 Service

- Added `getPresignedUrl()` method
- Modified `upload()` to return presigned URLs
- URLs are valid for **7 days** (604800 seconds)

### 2. How to use presigned URLs

```typescript
// Upload returns a presigned URL automatically
const { url, key } = await s3Service.upload({
  key: 'path/to/file.jpg',
  file: buffer,
  contentType: 'image/jpeg',
});

// url is now a presigned URL valid for 7 days
console.log(url); // https://...?X-Amz-Algorithm=...
```

### 3. Regenerate presigned URL if expired

```typescript
// If a URL expires, regenerate it
const newUrl = await s3Service.getPresignedUrl(key, 604800);
```

## Expiration Times

| Duration | Seconds | Use Case                          |
| -------- | ------- | --------------------------------- |
| 1 hour   | 3600    | Temporary downloads               |
| 1 day    | 86400   | Daily access                      |
| 7 days   | 604800  | **Default - Good for most cases** |
| 30 days  | 2592000 | Long-term sharing                 |

## Important Notes

1. **URLs expire**: After 7 days, you'll need to regenerate them
2. **Automatic**: All new uploads get presigned URLs automatically
3. **Existing files**: Old URLs in database won't work, need to regenerate
4. **No Railway config needed**: Works with private buckets!

## Optional: Regenerate URLs for Existing Files

If you have existing cars with old URLs, you can create a migration script:

```typescript
// Example migration script
async function migrateUrls() {
  const cars = await availableCarModel.find({});

  for (const car of cars) {
    const newPhotos = await Promise.all(
      car.carPhotos.map(async (oldUrl) => {
        const key = s3Service.extractKeyFromUrl(oldUrl);
        return await s3Service.getPresignedUrl(key);
      }),
    );

    await availableCarModel.findByIdAndUpdate(car._id, {
      carPhotos: newPhotos,
    });
  }
}
```

## Testing

After installation, try:

1. Upload a new car with photos
2. Get the car details from API
3. Copy the photo URL
4. Open it in browser - it should work! ✅

## Troubleshooting

### Error: Cannot find module '@aws-sdk/s3-request-presigner'

**Solution**: Run `npm install @aws-sdk/s3-request-presigner`

### URL still gives Access Denied

**Solution**:

- Make sure you restarted the server
- Check if the file exists: `await s3Service.exists(key)`
- Verify AWS credentials are correct

### URL expires too quickly

**Solution**: Increase the expiration time in `s3.service.ts`:

```typescript
const url = await this.getPresignedUrl(key, 2592000); // 30 days
```

## Advantages

✅ No Railway configuration needed  
✅ Works with private buckets (more secure)  
✅ Fine-grained access control  
✅ Configurable expiration times  
✅ No additional proxy service needed

## Alternative: Railway Public Bucket Proxy

If you prefer permanent URLs, Railway offers a [public bucket proxy template](https://railway.com/deploy/public-bucket-urls) that you can deploy separately. However, presigned URLs are simpler and don't require an extra service.
