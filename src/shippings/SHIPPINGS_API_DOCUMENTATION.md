# Shippings API - Complete Documentation

## Overview

The Shippings API manages shipping prices with a flexible three-layer system:

1. **Base City Prices** - Admin sets base prices for each city/category combination
2. **User Category Adjustments** - Per-user price adjustments by category (applies to all cities)
3. **Effective Price** = Base Price + User Adjustment

### Categories
- `copart` - Copart auction shipping
- `iaai` - IAAI auction shipping
- `manheim` - Manheim auction shipping

### Key Features
- ✅ Admin can create/update base city prices
- ✅ Admin can adjust base prices by category (with history tracking)
- ✅ Admin can adjust specific user prices
- ✅ Users can adjust their own prices by category
- ✅ Role-based access control
- ✅ Complete adjustment history tracking
- ✅ Pagination support

---

## Authentication

All endpoints require JWT authentication:

```
Authorization: Bearer <jwt_token>
```

---

## Admin Endpoints

### 1. Create Base City Price

Creates a new base shipping price for a city/category combination.

**Endpoint:** `POST /shippings`  
**Role:** Admin only  
**Body:**
```json
{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500
}
```

**Response:**
```json
{
  "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500,
  "last_adjustment_amount": null,
  "last_adjustment_date": null,
  "createdAt": "2026-01-12T10:00:00.000Z",
  "updatedAt": "2026-01-12T10:00:00.000Z"
}
```

---

### 2. Get All Base City Prices

Retrieves all base city prices (admin view).

**Endpoint:** `GET /shippings/admin/city-prices`  
**Role:** Admin only

**Response:**
```json
[
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500,
    "last_adjustment_amount": null,
    "last_adjustment_date": null
  },
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j1",
    "city": "New York",
    "category": "iaai",
    "base_price": 600,
    "last_adjustment_amount": 50,
    "last_adjustment_date": "2026-01-10T15:30:00.000Z"
  }
]
```

---

### 3. Get Paginated Base City Prices

Retrieves paginated base city prices with search.

**Endpoint:** `GET /shippings/admin/city-prices/paginated`  
**Role:** Admin only  
**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `search` (optional) - Search by city or category

**Example:** `GET /shippings/admin/city-prices/paginated?page=1&limit=10&search=los`

**Response:**
```json
{
  "data": [
    {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "city": "Los Angeles",
      "category": "copart",
      "base_price": 500
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 4. Get Base City Prices by Filters

Filters base city prices by city and/or category.

**Endpoint:** `GET /shippings/admin/city-prices/filter`  
**Role:** Admin only  
**Query Parameters:**
- `city` (optional) - Filter by city name
- `category` (optional) - Filter by category

**Example:** `GET /shippings/admin/city-prices/filter?city=Los Angeles&category=copart`

**Response:**
```json
[
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500,
    "last_adjustment_amount": null,
    "last_adjustment_date": null
  }
]
```

---

### 5. Update Base City Price

Updates a base city price.

**Endpoint:** `PATCH /shippings/admin/city-prices`  
**Role:** Admin only  
**Query Parameters:**
- `city` (optional) - City to update
- `category` (optional) - Category to update

**Body:**
```json
{
  "base_price": 600
}
```

**Example:** `PATCH /shippings/admin/city-prices?city=Los Angeles&category=copart`

**Response:**
```json
{
  "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 600,
  "last_adjustment_amount": null,
  "last_adjustment_date": null
}
```

---

### 6. Delete Base City Price

Deletes a base city price by ID.

**Endpoint:** `DELETE /shippings/admin/city-prices/:id`  
**Role:** Admin only

**Example:** `DELETE /shippings/admin/city-prices/64f5a1b2c3d4e5f6g7h8i9j0`

**Response:** `204 No Content`

---

### 7. Adjust Base Prices by Category

Adjusts base prices for an entire category (or specific city within category).  
This **increments/decrements** existing prices and stores the adjustment history.

**Endpoint:** `PATCH /shippings/adjust-base-price`  
**Role:** Admin only

**Body (adjust all cities in category):**
```json
{
  "category": "copart",
  "adjustment_amount": 100
}
```

**Body (adjust specific city):**
```json
{
  "category": "copart",
  "city": "Los Angeles",
  "adjustment_amount": -50
}
```

**Response:**
```json
{
  "modifiedCount": 15,
  "category": "copart",
  "city": "all",
  "adjustment_amount": 100
}
```

**What happens:**
- All matching city prices get `adjustment_amount` added to their `base_price`
- `last_adjustment_amount` is set to the adjustment value
- `last_adjustment_date` is updated
- Admin can track what the last adjustment was

**Example:**
- LA copart was $500, after +100 adjustment becomes $600
- NY copart was $600, after +100 adjustment becomes $700
- History shows last adjustment was +100

---

## Role-Aware Endpoints (Admin & User)

### 8. Adjust User Price by Category

Sets a user's price adjustment for a category.  
The adjustment applies to **ALL cities** in that category for the user.

**Endpoint:** `PATCH /shippings/adjust-price`  
**Role:** Admin or User

**Admin adjusting a user's price:**
```json
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",
  "category": "copart",
  "adjustment_amount": -30
}
```

**User adjusting their own price:**
```json
{
  "category": "iaai",
  "adjustment_amount": 20
}
```

**Response:**
```json
{
  "_id": "64f5a1b2c3d4e5f6g7h8i9j2",
  "user": {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
    "firstName": "John",
    "lastName": "Doe",
    "email": "john@example.com"
  },
  "category": "copart",
  "adjustment_amount": -30,
  "adjusted_by": "admin",
  "last_adjustment_amount": 0,
  "last_adjustment_date": "2026-01-12T10:00:00.000Z"
}
```

**What happens:**
- Creates/updates a `UserCategoryAdjustment` record
- Stores who made the adjustment (`admin` or `user`)
- Tracks previous adjustment in `last_adjustment_amount`
- Applies to ALL cities in that category for that user

**Example:**
If user has `adjustment_amount: 50` for "copart":
- LA copart: $500 (base) + $50 = **$550 effective**
- NY copart: $600 (base) + $50 = **$650 effective**

---

### 9. Get User Adjustment

Gets a user's adjustment for a specific category.

**Endpoint:** `GET /shippings/adjustment`  
**Role:** Admin or User  
**Query Parameters:**
- `category` (optional) - Filter by category
- `userId` (optional, admin only) - View specific user's adjustment

**Example (User viewing own):** `GET /shippings/adjustment?category=copart`  
**Example (Admin viewing user):** `GET /shippings/adjustment?category=copart&userId=64f5a1b2c3d4e5f6g7h8i9j0`

**Response:**
```json
{
  "adjustment_amount": 50,
  "adjusted_by": "user",
  "last_adjustment_amount": 0,
  "last_adjustment_date": "2026-01-12T10:00:00.000Z"
}
```

**Response (no adjustment found):**
```json
{
  "adjustment_amount": 0,
  "adjusted_by": null,
  "last_adjustment_amount": null,
  "last_adjustment_date": null
}
```

---

### 10. Get All User Adjustments

Gets all adjustments for a user across all categories.

**Endpoint:** `GET /shippings/adjustments`  
**Role:** Admin or User  
**Query Parameters:**
- `category` (optional) - Filter by category
- `userId` (optional, admin only) - View specific user's adjustments

**Example (User viewing own):** `GET /shippings/adjustments`  
**Example (Admin viewing all):** `GET /shippings/adjustments`  
**Example (Admin viewing user):** `GET /shippings/adjustments?userId=64f5a1b2c3d4e5f6g7h8i9j0`

**Response:**
```json
[
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j2",
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "category": "copart",
    "adjustment_amount": 50,
    "adjusted_by": "user",
    "last_adjustment_amount": 0,
    "last_adjustment_date": "2026-01-12T10:00:00.000Z"
  },
  {
    "_id": "64f5a1b2c3d4e5f6g7h8i9j3",
    "user": {
      "_id": "64f5a1b2c3d4e5f6g7h8i9j0",
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com"
    },
    "category": "iaai",
    "adjustment_amount": -20,
    "adjusted_by": "admin",
    "last_adjustment_amount": 10,
    "last_adjustment_date": "2026-01-11T14:30:00.000Z"
  }
]
```

---

### 11. Get Effective Prices

Gets effective prices (base + user adjustment) for a user.

**Endpoint:** `GET /shippings/prices`  
**Role:** Admin or User  
**Query Parameters:**
- `category` (optional) - Filter by category
- `city` (optional) - Filter by city
- `userId` (optional, admin only) - View specific user's prices

**Example (User viewing own):** `GET /shippings/prices?category=copart`  
**Example (Admin viewing user):** `GET /shippings/prices?category=copart&userId=64f5a1b2c3d4e5f6g7h8i9j0`

**Response:**
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500,
    "base_last_adjustment_amount": 100,
    "base_last_adjustment_date": "2026-01-10T15:30:00.000Z",
    "user_adjustment_amount": 50,
    "adjusted_by": "user",
    "effective_price": 550
  },
  {
    "city": "New York",
    "category": "copart",
    "base_price": 600,
    "base_last_adjustment_amount": 100,
    "base_last_adjustment_date": "2026-01-10T15:30:00.000Z",
    "user_adjustment_amount": 50,
    "adjusted_by": "user",
    "effective_price": 650
  }
]
```

**Response Fields:**
- `base_price` - Current base price set by admin
- `base_last_adjustment_amount` - Last admin adjustment to base price
- `base_last_adjustment_date` - When base was last adjusted
- `user_adjustment_amount` - User's adjustment for this category
- `adjusted_by` - Who made the user adjustment (user or admin)
- `effective_price` - **base_price + user_adjustment_amount**

---

### 12. Get Paginated Effective Prices

Gets paginated effective prices for a user.

**Endpoint:** `GET /shippings/prices/paginated`  
**Role:** Admin or User  
**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `search` (optional) - Search by city or category
- `category` (optional) - Filter by category
- `userId` (optional, admin only) - View specific user's prices

**Example:** `GET /shippings/prices/paginated?page=1&limit=10&category=copart`

**Response:**
```json
{
  "data": [
    {
      "city": "Los Angeles",
      "category": "copart",
      "base_price": 500,
      "base_last_adjustment_amount": 100,
      "base_last_adjustment_date": "2026-01-10T15:30:00.000Z",
      "user_adjustment_amount": 50,
      "adjusted_by": "user",
      "effective_price": 550
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 45,
    "totalPages": 5,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 13. Get Effective Price for Specific City/Category

Gets the effective price for a specific city/category combination.

**Endpoint:** `GET /shippings/price`  
**Role:** Admin or User  
**Query Parameters:**
- `city` (required) - City name
- `category` (required) - Category
- `userId` (optional, admin only) - View specific user's price

**Example (User viewing own):** `GET /shippings/price?city=Los Angeles&category=copart`  
**Example (Admin viewing user):** `GET /shippings/price?city=Los Angeles&category=copart&userId=64f5a1b2c3d4e5f6g7h8i9j0`

**Response:**
```json
{
  "base_price": 500,
  "base_last_adjustment_amount": 100,
  "base_last_adjustment_date": "2026-01-10T15:30:00.000Z",
  "user_adjustment_amount": 50,
  "adjusted_by": "user",
  "user_last_adjustment_amount": 0,
  "user_last_adjustment_date": "2026-01-12T10:00:00.000Z",
  "effective_price": 550
}
```

---

## Complete Use Case Examples

### Use Case 1: Admin Sets Up Initial Prices

**Step 1:** Admin creates base prices for cities

```bash
POST /shippings
{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500
}

POST /shippings
{
  "city": "New York",
  "category": "copart",
  "base_price": 600
}

POST /shippings
{
  "city": "Los Angeles",
  "category": "iaai",
  "base_price": 450
}
```

**Result:** All users see these base prices initially.

---

### Use Case 2: Admin Increases All Copart Prices

**Step 2:** Admin increases all copart prices by $100

```bash
PATCH /shippings/adjust-base-price
{
  "category": "copart",
  "adjustment_amount": 100
}
```

**Result:**
- LA copart: $500 → $600
- NY copart: $600 → $700
- `last_adjustment_amount: 100` stored for history
- All users see the new prices

---

### Use Case 3: Admin Gives User a Discount

**Step 3:** Admin gives user a $30 discount on all copart cities

```bash
PATCH /shippings/adjust-price
{
  "userId": "user123",
  "category": "copart",
  "adjustment_amount": -30
}
```

**Result for user123:**
- LA copart: $600 (base) - $30 = **$570 effective**
- NY copart: $700 (base) - $30 = **$670 effective**
- Other users still see $600 and $700

---

### Use Case 4: User Adjusts Their Own Price

**Step 4:** User increases their iaai prices by $20

```bash
PATCH /shippings/adjust-price
{
  "category": "iaai",
  "adjustment_amount": 20
}
```

**Result for this user:**
- LA iaai: $450 (base) + $20 = **$470 effective**
- All other iaai cities also get +$20

---

### Use Case 5: User Views Their Prices

**Step 5:** User views their effective prices

```bash
GET /shippings/prices?category=copart
```

**Response:**
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 600,
    "user_adjustment_amount": -30,
    "effective_price": 570
  },
  {
    "city": "New York",
    "category": "copart",
    "base_price": 700,
    "user_adjustment_amount": -30,
    "effective_price": 670
  }
]
```

---

## Error Responses

### 400 Bad Request
```json
{
  "statusCode": 400,
  "message": ["Category must be one of: copart, iaai, manheim"],
  "error": "Bad Request"
}
```

### 401 Unauthorized
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

### 403 Forbidden
```json
{
  "statusCode": 403,
  "message": "Forbidden resource"
}
```

### 404 Not Found
```json
{
  "statusCode": 404,
  "message": "City price not found for city \"Los Angeles\" and category \"copart\"",
  "error": "Not Found"
}
```

---

## Data Models

### CityPrice Schema
```typescript
{
  _id: ObjectId,
  city: string,
  category: 'copart' | 'iaai' | 'manheim',
  base_price: number,
  last_adjustment_amount: number | null,
  last_adjustment_date: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

### UserCategoryAdjustment Schema
```typescript
{
  _id: ObjectId,
  user: ObjectId (ref: User),
  category: 'copart' | 'iaai' | 'manheim',
  adjustment_amount: number,
  adjusted_by: 'admin' | 'user',
  last_adjustment_amount: number | null,
  last_adjustment_date: Date | null,
  createdAt: Date,
  updatedAt: Date
}
```

---

## Summary

### Admin Capabilities
- ✅ Create/update/delete base city prices
- ✅ Adjust all prices for a category at once
- ✅ Adjust specific user prices
- ✅ View all users' prices and adjustments
- ✅ Track adjustment history

### User Capabilities
- ✅ View their own effective prices
- ✅ Adjust their own prices by category
- ✅ See adjustment history
- ✅ Cannot see or modify other users' prices

### Key Features
- ✅ Three categories: copart, iaai, manheim
- ✅ Category-based adjustments (applies to all cities)
- ✅ Complete adjustment history tracking
- ✅ Role-based access control
- ✅ Pagination support
- ✅ Search and filter capabilities
