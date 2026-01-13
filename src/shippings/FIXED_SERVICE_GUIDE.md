# Shipping Service - Complete Guide

## Overview

The shipping service has been fixed and optimized. It manages shipping prices with a flexible two-layer system:

1. **Base City Prices** - Set by admin for each city/category combination
2. **User Category Adjustments** - Per-user price adjustments by category
3. **Effective Price** = Base Price + User Adjustment

---

## How It Works

### 1. Admin Creates Base City Prices

Admin creates base prices for each city and category:

```typescript
POST /shippings
{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500
}
```

This sets the baseline price that all users will see initially.

---

### 2. Admin Adjusts Base Prices by Category

Admin can adjust all prices for a category at once. The adjustment **increments/decrements** the existing prices and **stores the history**:

```typescript
PATCH /shippings/adjust-base-price
{
  "category": "copart",
  "adjustment_amount": 50,  // Adds $50 to all copart cities
  "city": "optional"  // If provided, only adjusts that city
}
```

**What happens:**

- All cities in "copart" category get +50 added to their `base_price`
- `last_adjustment_amount: 50` is stored
- `last_adjustment_date` is updated
- Admin can see what the last adjustment was

**Example:**

- LA copart was $500, after adjustment becomes $550
- NY copart was $600, after adjustment becomes $650
- History shows last adjustment was +50

---

### 3. Admin Changes Specific User's Price

Admin can set a custom adjustment for a specific user:

```typescript
PATCH /shippings/adjust-price
{
  "userId": "user123",  // Admin specifies which user
  "category": "copart",
  "adjustment_amount": -30  // User gets $30 discount on all copart cities
}
```

**What happens:**

- Creates/updates a `UserCategoryAdjustment` record
- `adjusted_by: "admin"` is stored
- Previous adjustment is saved in `last_adjustment_amount`
- Applies to ALL cities in that category for that user

**Example:**

- User's LA copart: $550 (base) - $30 = **$520 effective**
- User's NY copart: $650 (base) - $30 = **$620 effective**

---

### 4. User Adjusts Their Own Price

Users can set their own adjustment by category:

```typescript
PATCH /shippings/adjust-price
{
  // No userId needed - adjusts own price
  "category": "copart",
  "adjustment_amount": 25  // User adds $25 to all copart cities
}
```

**What happens:**

- Creates/updates a `UserCategoryAdjustment` record
- `adjusted_by: "user"` is stored
- Previous adjustment is saved in `last_adjustment_amount`
- Applies to ALL cities in that category for that user

**Note:** If admin already set an adjustment for this user, the user's new adjustment **replaces** it (but history is kept).

---

### 5. Getting Prices (One Endpoint for Everyone)

The `GET /shippings/prices` endpoint is **role-aware**:

**For regular users:**

```typescript
GET /shippings/prices?category=copart
// Returns user's own effective prices
```

**For admins:**

```typescript
GET /shippings/prices?userId=user123&category=copart
// Returns specified user's effective prices
```

**Response includes:**

```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 550,
    "base_last_adjustment_amount": 50,
    "base_last_adjustment_date": "2024-01-10T10:00:00Z",
    "user_adjustment_amount": -30,
    "adjusted_by": "admin",
    "effective_price": 520
  }
]
```

---

## Complete API Endpoints

### Base City Price Management (Admin Only)

| Method | Endpoint                       | Description                        |
| ------ | ------------------------------ | ---------------------------------- |
| POST   | `/shippings`                   | Create new city price              |
| GET    | `/shippings`                   | Get all city prices (with filters) |
| GET    | `/shippings/paginated`         | Get paginated city prices          |
| PATCH  | `/shippings?city=X&category=Y` | Update specific city price         |
| DELETE | `/shippings/:id`               | Delete city price                  |

### Base Price Adjustment (Admin Only)

| Method | Endpoint                       | Description                    |
| ------ | ------------------------------ | ------------------------------ |
| PATCH  | `/shippings/adjust-base-price` | Adjust base prices by category |

**Body:**

```json
{
  "category": "copart",
  "city": "optional",
  "adjustment_amount": 50 // + or -
}
```

### User Price Adjustment (Role-Aware)

| Method | Endpoint                  | Description                                |
| ------ | ------------------------- | ------------------------------------------ |
| PATCH  | `/shippings/adjust-price` | Adjust price (admin: any user, user: self) |
| GET    | `/shippings/adjustment`   | Get adjustment (role-aware)                |
| GET    | `/shippings/adjustments`  | Get all adjustments (role-aware)           |

**Adjust Price Body:**

```json
{
  "category": "copart",
  "adjustment_amount": 25,
  "userId": "optional - admin only"
}
```

### Get Prices (Role-Aware)

| Method | Endpoint                            | Description                    |
| ------ | ----------------------------------- | ------------------------------ |
| GET    | `/shippings/prices`                 | Get effective prices           |
| GET    | `/shippings/prices/paginated`       | Get paginated effective prices |
| GET    | `/shippings/prices/:city/:category` | Get specific price             |

**Query Parameters:**

- `category` - Filter by category
- `city` - Filter by city
- `userId` - Admin only: view specific user's prices
- `page`, `limit`, `search` - For pagination

---

## Key Features

### ✅ History Tracking

Both base price adjustments and user adjustments track history:

- `last_adjustment_amount` - Previous adjustment value
- `last_adjustment_date` - When it was last changed

This allows admin to see what changes were made.

### ✅ Role-Aware Endpoints

The same endpoints work for both admin and regular users:

- Admin provides `userId` to view/modify any user
- Regular user automatically uses their own ID
- Responses include `adjusted_by` to show who made changes

### ✅ Category-Wide Adjustments

User adjustments apply to ALL cities in a category:

- Set once, applies everywhere
- Efficient and easy to manage
- User doesn't need to adjust each city individually

### ✅ Effective Price Calculation

The response always includes:

- Base price (set by admin)
- User adjustment (set by admin or user)
- Effective price (base + adjustment)
- History of both base and user adjustments

---

## Example Workflow

1. **Admin creates cities:**
   - LA copart: $500
   - NY copart: $600

2. **Admin adjusts category:**
   - Adjusts copart +50
   - LA: $550, NY: $650
   - History: last_adjustment_amount = 50

3. **Admin sets user discount:**
   - User123 copart: -30
   - User123 sees: LA $520, NY $620

4. **User adjusts their own:**
   - User123 changes adjustment to +25
   - User123 now sees: LA $575, NY $675
   - History: last_adjustment_amount = -30

5. **Getting prices:**
   - User calls `/shippings/prices?category=copart`
   - Sees effective prices: LA $575, NY $675
   - Admin can call `/shippings/prices?category=copart&userId=user123`
   - Sees same prices with full history

---

## Code Organization

The service now includes helper methods for better organization:

### Helper Methods

1. **`buildCityPriceQuery()`** - Builds filter queries for city prices
2. **`createAdjustmentMap()`** - Creates efficient lookup map for adjustments
3. **`calculateEffectivePrice()`** - Calculates effective price with all details

These helpers reduce code duplication and make the service more maintainable.

---

## Summary

Your shipping service is now fully functional with:

✅ Admin can create cities with category and price  
✅ Admin can adjust all prices by category (stores history)  
✅ Admin can change specific user's price  
✅ User can change their own price by category (applies to all cities)  
✅ One endpoint for users and admin to get prices (role-aware)  
✅ Complete history tracking  
✅ Well-documented and organized code  
✅ No linter errors (only minor warnings)

The service is ready to use!
