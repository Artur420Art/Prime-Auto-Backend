# Shipping Service Documentation

## Overview

The shipping service manages pricing for different cities and categories with a three-tier pricing system:
1. **Base Price** - System-wide default from CityPrice collection
2. **Default Price** - User-specific default (can be modified by admin)
3. **Current Price** - Final price after user adjustments

## Data Model

### CityPrice (Base Prices)
Global default prices for all users.

```typescript
{
  city: string;           // City name
  category: ShippingCategory; // copart, iaai, manheim
  base_price: number;     // Base price from PDF/system
}
```

### UserShipping (User-Specific Prices)
User-specific pricing with adjustment tracking.

```typescript
{
  user: ObjectId;                  // Reference to User
  city: string;                    // City name
  category: ShippingCategory;      // copart, iaai, manheim
  default_price: number;           // User's default (initially = base_price)
  price_adjustment: number;        // Current adjustment by user (+ or -)
  last_adjustment_amount: number;  // Previous adjustment (for history)
  last_adjustment_date: Date;      // When last adjustment was made
  current_price: number;           // Calculated: default_price + price_adjustment
}
```

## Price Calculation Logic

```
current_price = Math.max(0, default_price + price_adjustment)
```

The price source is determined as:
- `user_adjusted`: When `price_adjustment !== 0`
- `admin_default`: When `default_price !== base_price` and no user adjustment
- `base`: When using system default with no modifications

## User Roles & Permissions

### Admin
- ✅ Create/delete base city prices
- ✅ View all user shippings
- ✅ Update default_price for specific users
- ✅ Bulk update default_price for all/filtered users
- ❌ Cannot adjust user's price_adjustment (user-only)

### Client (Regular User)
- ✅ View their own shipping prices
- ✅ Adjust ALL their city prices by a fixed amount
- ✅ View effective price breakdown
- ❌ Cannot modify base prices
- ❌ Cannot modify their default_price (admin-only)

## API Endpoints

### Base City Prices (Admin Only)

#### Create Base City Price
```http
POST /shippings/city-prices
Authorization: Bearer {admin_token}

{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500
}
```

#### Get All City Prices
```http
GET /shippings/city-prices
GET /shippings/city-prices?city=Los%20Angeles
GET /shippings/city-prices?category=copart
GET /shippings/city-prices?city=Los%20Angeles&category=copart
```

#### Delete City Price
```http
DELETE /shippings/city-prices/:id
Authorization: Bearer {admin_token}
```

### User Shipping Prices

#### Get User Shippings
```http
# Get all (admin sees all users, client sees only their own)
GET /shippings/user-shippings

# Filter by city
GET /shippings/user-shippings/city/:city

# Filter by city and category
GET /shippings/user-shippings/city/:city/category/:category

# Get specific shipping
GET /shippings/user-shippings/:id
```

#### Admin: Update Default Price for User
```http
PATCH /shippings/admin/default-price
Authorization: Bearer {admin_token}

{
  "userId": "user_id_here",
  "city": "Los Angeles",
  "category": "copart",
  "default_price": 550
}
```

#### Admin: Bulk Update Default Price
```http
# Update for all users in a city
PATCH /shippings/admin/bulk-default-price
Authorization: Bearer {admin_token}

{
  "city": "Los Angeles",
  "default_price": 600
}

# Update for specific user (all cities)
PATCH /shippings/admin/bulk-default-price?userId=user_id
{
  "default_price": 600
}

# Update for all users in a category
PATCH /shippings/admin/bulk-default-price
{
  "category": "copart",
  "default_price": 600
}
```

#### Client: Adjust All Prices
```http
PATCH /shippings/user/adjust-prices
Authorization: Bearer {user_token}

{
  "adjustment_amount": 50  // Positive to increase, negative to decrease
}
```

**Note**: This adjusts ALL city/category combinations for the user by the same amount.

#### Get Effective Price Breakdown
```http
GET /shippings/effective-price/:city/:category
Authorization: Bearer {user_token}

Response:
{
  "base_price": 500,
  "default_price": 550,
  "price_adjustment": 50,
  "last_adjustment_amount": 0,
  "last_adjustment_date": "2026-01-10T12:00:00Z",
  "current_price": 600,
  "source": "user_adjusted"
}
```

## Use Cases

### 1. Initial Setup (Admin)
```typescript
// Admin creates base prices for all cities/categories
POST /shippings/city-prices
{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 500
}
```

### 2. User Views Their Prices
```typescript
// When user logs in and views prices
GET /shippings/user-shippings

// System auto-creates UserShipping records with:
// - default_price = base_price
// - price_adjustment = 0
// - current_price = base_price
```

### 3. Admin Sets Custom Default for User
```typescript
// Admin gives user a special default price
PATCH /shippings/admin/default-price
{
  "userId": "user123",
  "city": "Los Angeles",
  "category": "copart",
  "default_price": 450  // $50 discount from base
}

// Result:
// - default_price = 450
// - price_adjustment = 0 (preserved)
// - current_price = 450
```

### 4. User Adjusts All Their Prices
```typescript
// User wants to increase all prices by $100
PATCH /shippings/user/adjust-prices
{
  "adjustment_amount": 100
}

// Result for Los Angeles/Copart:
// - default_price = 450 (unchanged)
// - price_adjustment = 100 (updated)
// - last_adjustment_amount = 0 (previous value)
// - last_adjustment_date = now
// - current_price = 550
```

### 5. User Adjusts Again
```typescript
// User changes mind, wants only $50 increase
PATCH /shippings/user/adjust-prices
{
  "adjustment_amount": 50
}

// Result:
// - default_price = 450 (unchanged)
// - price_adjustment = 50 (updated)
// - last_adjustment_amount = 100 (previous value saved)
// - last_adjustment_date = now
// - current_price = 500
```

### 6. Admin Bulk Updates
```typescript
// Admin increases default for all users in LA
PATCH /shippings/admin/bulk-default-price
{
  "city": "Los Angeles",
  "default_price": 550
}

// Result for user:
// - default_price = 550 (updated)
// - price_adjustment = 50 (preserved)
// - current_price = 600
```

## Performance Optimizations

### Database Indexes
```typescript
// Compound unique index for user-city-category lookups
{ user: 1, city: 1, category: 1 } - unique

// Individual indexes for filtering
{ user: 1 }
{ city: 1 }
{ category: 1 }
```

### Query Optimization
- Uses `FilterQuery<T>` for type-safe queries
- Bulk operations for mass updates
- Lazy initialization of user shippings (created on first access)
- Efficient population of user references

### Code Organization
- **Utility Functions**: Centralized price calculation logic
- **Type Safety**: Proper TypeScript types throughout
- **Separation of Concerns**: DTOs, schemas, services, controllers
- **Reusable Logic**: DRY principle with helper functions

## Price Adjustment History

The system tracks:
- `price_adjustment`: Current adjustment
- `last_adjustment_amount`: Previous adjustment (for undo/history)
- `last_adjustment_date`: Timestamp of last change

This allows:
- Viewing adjustment history
- Implementing undo functionality
- Auditing price changes
- Analytics on user behavior

## Best Practices

1. **Always use the utility functions** for price calculations
2. **Never modify base_price** after creation (create new records instead)
3. **Admin changes default_price**, not price_adjustment
4. **Users change price_adjustment**, not default_price
5. **Use bulk operations** for mass updates
6. **Check source field** to understand price origin

## Migration Notes

If migrating from old schema with `final_price`:
1. Rename `final_price` → `current_price`
2. Add `last_adjustment_amount` field
3. Add `last_adjustment_date` field
4. Update all queries and calculations
5. Run data migration script if needed
