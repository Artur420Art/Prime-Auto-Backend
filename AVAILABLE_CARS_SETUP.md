# Available Cars Service Setup

This document provides information about the newly created Available Cars service.

## Overview

The Available Cars service manages a collection of cars available for sale with the following features:
- Create, read, update, and delete car listings
- Upload and manage multiple car photos stored in Railway S3-compatible bucket
- Search and paginate through car listings
- Find cars by VIN number

## Database Collection

Collection name: `availble_cars`

## Schema Properties

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| carModel | String | Yes | Car model name |
| carYear | Number | Yes | Manufacturing year |
| carVin | String | Yes | VIN number (unique, 17 characters) |
| carPrice | Number | Yes | Car price in USD |
| carCategory | Enum | Yes | AVAILABLE, ONROAD, or TRANSIT |
| carPhotos | String[] | No | Array of photo URLs |
| carDescription | String | No | Optional description (max 1000 chars) |
| engineType | Enum | Yes | GASOLINE, DIESEL, ELECTRIC, or HYBRID |
| engineHp | Number | Yes | Engine horsepower |
| engineSize | Number | Yes | Engine size in liters |
| boughtPlace | String | Yes | Place where the car was bought (max 200 chars) |
| transmission | Enum | Yes | AUTOMATIC, MECHANIC, VARIATOR, or ROBOT |

## Installation

1. Install the required AWS SDK package:
```bash
npm install @aws-sdk/client-s3
```

2. Set up environment variables in your `.env` file:
```env
S3_ENDPOINT=https://storage.railway.app
S3_REGION=auto
S3_BUCKET_NAME=arranged-knapsack-uqsv-2g
S3_ACCESS_KEY_ID=t1d_z1BnzYeZZjVYGeYMSlHRSFMqleoENLPu_OBtJrWzPTTSSILBUZ
S3_SECRET_ACCESS_KEY=tsec_LV21fyb0_wO0tu1-1AmnDFWJEa_boLVcifqAQ5nNPGw4_q7eQ0Ck8u-+610JigGyNDJMqs
```

## API Endpoints

All endpoints require JWT authentication.

### Create Available Car
```
POST /available-cars
Content-Type: multipart/form-data

Body:
- carModel: string
- carYear: number
- carVin: string (17 chars)
- carPrice: number
- carCategory: AVAILABLE | ONROAD | TRANSIT
- carDescription?: string
- engineType: GASOLINE | DIESEL | ELECTRIC | HYBRID
- engineHp: number
- engineSize: number (in liters)
- boughtPlace: string
- transmission: AUTOMATIC | MECHANIC | VARIATOR | ROBOT
- carPhotos: file[] (max 10 files, 5MB each, jpg/jpeg/png/webp/gif)
```

### Get All Available Cars
```
GET /available-cars
```

### Get Paginated Available Cars
```
GET /available-cars/paginated?page=1&limit=10&search=Toyota
```

### Get Available Car by ID
```
GET /available-cars/:id
```

### Get Available Car by VIN
```
GET /available-cars/vin/:vin
```

### Update Available Car
```
PATCH /available-cars/:id
Content-Type: multipart/form-data

Body: (all fields optional)
- carModel?: string
- carYear?: number
- carVin?: string
- carPrice?: number
- carCategory?: AVAILABLE | ONROAD | TRANSIT
- carDescription?: string
- engineType?: GASOLINE | DIESEL | ELECTRIC | HYBRID
- engineHp?: number
- engineSize?: number
- boughtPlace?: string
- transmission?: AUTOMATIC | MECHANIC | VARIATOR | ROBOT
- carPhotos?: file[] (appends to existing photos)
```

### Delete Available Car
```
DELETE /available-cars/:id
```

### Delete Photo from Car
```
DELETE /available-cars/:id/photos
Body:
- photoUrl: string
```

## Services Created

1. **S3Service** (`src/common/s3/s3.service.ts`)
   - Handles file uploads to Railway S3-compatible storage
   - Manages file deletion
   - Checks file existence

2. **AvailableCarsService** (`src/available-cars/available-cars.service.ts`)
   - CRUD operations for car listings
   - Photo upload and management
   - Search and pagination

## File Structure

```
src/
├── available-cars/
│   ├── available-cars.controller.ts
│   ├── available-cars.module.ts
│   ├── available-cars.service.ts
│   ├── dto/
│   │   ├── create-available-car.dto.ts
│   │   └── update-available-car.dto.ts
│   ├── enums/
│   │   ├── car-category.enum.ts
│   │   ├── engine-type.enum.ts
│   │   └── transmission.enum.ts
│   └── schemas/
│       └── available-car.schema.ts
└── common/
    └── s3/
        ├── s3.module.ts
        └── s3.service.ts
```

## Testing

You can test the API using Swagger UI at:
```
http://localhost:3000/api
```

## Notes

- All photo uploads are stored in the Railway S3 bucket under the path: `available-cars/{VIN}/{timestamp}-{filename}`
- When a car is deleted, all associated photos are automatically removed from S3
- The VIN number must be unique across all cars
- Photos are validated for type (jpg, jpeg, png, webp, gif) and size (max 5MB each)
- A maximum of 10 photos can be uploaded at once
