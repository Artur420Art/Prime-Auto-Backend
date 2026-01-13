# Shippings Module - Complete Implementation

## 📋 Overview

The Shippings module provides a comprehensive shipping price management system with three-layer pricing:

1. **Base City Prices** - Admin sets base prices for each city/category
2. **User Category Adjustments** - Per-user adjustments by category (applies to all cities)
3. **Effective Price** = Base Price + User Adjustment

## 🎯 Key Features

✅ **Three Categories**: copart, iaai, manheim  
✅ **Admin Controls**: Create/update/delete base prices, adjust by category  
✅ **User Controls**: View and adjust their own prices  
✅ **History Tracking**: Stores last adjustment amount and date  
✅ **Role-Based Access**: Admin and user endpoints with proper guards  
✅ **Pagination**: All list endpoints support pagination  
✅ **Search & Filters**: Filter by city, category, user  

## 📁 File Structure

```
shippings/
├── schemas/
│   ├── city-price.schema.ts              # Base city price schema
│   └── user-category-adjustment.schema.ts # User adjustment schema
├── dto/
│   ├── create-shipping.dto.ts            # Create city price DTO
│   ├── update-city-price.dto.ts          # Update city price DTO
│   ├── adjust-base-price.dto.ts          # Adjust base price DTO
│   └── adjust-user-price.dto.ts          # Adjust user price DTO
├── shippings.controller.ts               # API endpoints
├── shippings.service.ts                  # Business logic
├── shippings.module.ts                   # Module definition
├── setup-initial-prices.sh               # Setup script
├── SHIPPINGS_API_DOCUMENTATION.md        # Complete API docs
├── QUICK_START.md                        # Quick start guide
├── FIXED_SERVICE_GUIDE.md                # Service guide (existing)
└── README.md                             # This file
```

## 🚀 Quick Start

### 1. The module is already registered in `app.module.ts`

### 2. Set up initial prices

```bash
# Option A: Use the setup script
cd src/shippings
chmod +x setup-initial-prices.sh
# Edit the script to add your JWT token
./setup-initial-prices.sh

# Option B: Manual setup
curl -X POST http://localhost:3000/shippings \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500
  }'
```

### 3. Test the endpoints

See [QUICK_START.md](./QUICK_START.md) for detailed testing instructions.

## 📚 Documentation

- **[SHIPPINGS_API_DOCUMENTATION.md](./SHIPPINGS_API_DOCUMENTATION.md)** - Complete API reference with all endpoints, request/response examples, and use cases
- **[QUICK_START.md](./QUICK_START.md)** - Step-by-step guide to set up and test the API
- **[FIXED_SERVICE_GUIDE.md](./FIXED_SERVICE_GUIDE.md)** - Service architecture and implementation details

## 🔑 Key Concepts

### Base Price Adjustment

Admin can adjust all prices for a category at once:

```bash
PATCH /shippings/adjust-base-price
{
  "category": "copart",
  "adjustment_amount": 100  # Adds $100 to all copart cities
}
```

**Result:**
- LA copart: $500 → $600
- NY copart: $600 → $700
- History: `last_adjustment_amount: 100`

### User Category Adjustment

Users (or admin) can adjust prices by category, which applies to ALL cities:

```bash
PATCH /shippings/adjust-price
{
  "category": "copart",
  "adjustment_amount": 50  # Adds $50 to all copart cities for this user
}
```

**Result for this user:**
- LA copart: $600 (base) + $50 = **$650 effective**
- NY copart: $700 (base) + $50 = **$750 effective**

### Effective Price Calculation

```
Effective Price = Base Price + User Adjustment
```

Example:
- Base Price: $500 (set by admin)
- User Adjustment: +$50 (set by user or admin)
- **Effective Price: $550** (what user sees)

## 🔐 Security & Permissions

### Admin Endpoints
- Create/update/delete base city prices
- Adjust base prices by category
- Adjust any user's prices
- View all users' prices and adjustments

### User Endpoints
- View their own effective prices
- Adjust their own prices by category
- View their own adjustments
- **Cannot** view or modify other users' prices

### Guards
- `JwtAuthGuard` - Requires authentication
- `RolesGuard` - Checks user role
- `@Roles(Role.ADMIN)` - Admin only endpoints

## 📊 Database Schemas

### CityPrice
```typescript
{
  city: string,                      // "Los Angeles"
  category: 'copart' | 'iaai' | 'manheim',
  base_price: number,                // 500
  last_adjustment_amount: number,    // 100 (last admin adjustment)
  last_adjustment_date: Date,        // When last adjusted
}
```

### UserCategoryAdjustment
```typescript
{
  user: ObjectId,                    // Reference to User
  category: 'copart' | 'iaai' | 'manheim',
  adjustment_amount: number,         // 50 (user's adjustment)
  adjusted_by: 'admin' | 'user',     // Who made the adjustment
  last_adjustment_amount: number,    // Previous adjustment (history)
  last_adjustment_date: Date,        // When last adjusted
}
```

## 🎯 Use Cases

### Use Case 1: Admin Sets Up Prices
```bash
# Create base prices for cities
POST /shippings { city: "LA", category: "copart", base_price: 500 }
POST /shippings { city: "NY", category: "copart", base_price: 600 }
```

### Use Case 2: Admin Increases All Copart Prices
```bash
# Increase all copart by $100
PATCH /shippings/adjust-base-price
{ category: "copart", adjustment_amount: 100 }
```

### Use Case 3: Admin Gives User Discount
```bash
# Give user $30 discount on all copart
PATCH /shippings/adjust-price
{ userId: "user123", category: "copart", adjustment_amount: -30 }
```

### Use Case 4: User Adjusts Own Price
```bash
# User adds $20 to all iaai
PATCH /shippings/adjust-price
{ category: "iaai", adjustment_amount: 20 }
```

### Use Case 5: User Views Prices
```bash
# User views their effective prices
GET /shippings/prices?category=copart
```

## 🧪 Testing

### Manual Testing
See [QUICK_START.md](./QUICK_START.md) for curl commands.

### Testing Checklist
- [ ] Admin can create base prices
- [ ] Admin can adjust base prices by category
- [ ] Admin can adjust user prices
- [ ] User can view their own prices
- [ ] User can adjust their own prices
- [ ] User cannot view other users' prices
- [ ] Effective price = base + user adjustment
- [ ] History tracking works
- [ ] Pagination works
- [ ] Search and filters work

## 🔧 API Endpoints Summary

### Admin Only
- `POST /shippings` - Create base city price
- `GET /shippings/admin/city-prices` - Get all base prices
- `GET /shippings/admin/city-prices/paginated` - Get paginated base prices
- `GET /shippings/admin/city-prices/filter` - Filter base prices
- `PATCH /shippings/admin/city-prices` - Update base price
- `DELETE /shippings/admin/city-prices/:id` - Delete base price
- `PATCH /shippings/adjust-base-price` - Adjust base prices by category

### Admin & User (Role-Aware)
- `PATCH /shippings/adjust-price` - Adjust user price
- `GET /shippings/adjustment` - Get user adjustment
- `GET /shippings/adjustments` - Get all user adjustments
- `GET /shippings/prices` - Get effective prices
- `GET /shippings/prices/paginated` - Get paginated effective prices
- `GET /shippings/price` - Get specific effective price

## 💡 Tips

1. **Category-Based Adjustments**: Adjustments apply to ALL cities in a category
2. **History Tracking**: Both base and user adjustments track history
3. **Admin Override**: Admin can adjust any user's prices
4. **User Self-Service**: Users can adjust their own prices
5. **Effective Price**: Always calculated as base + user adjustment

## 🐛 Troubleshooting

### "Unauthorized"
- Include JWT token in Authorization header
- Check token hasn't expired

### "Forbidden resource"
- Using user token on admin endpoint
- Use admin token for admin endpoints

### "City price not found"
- City/category combination doesn't exist
- Create it first using POST /shippings

### "Category must be one of: copart, iaai, manheim"
- Check category spelling
- Only these three categories are supported

## 📞 Support

For detailed information:
- API Reference: [SHIPPINGS_API_DOCUMENTATION.md](./SHIPPINGS_API_DOCUMENTATION.md)
- Quick Start: [QUICK_START.md](./QUICK_START.md)
- Service Guide: [FIXED_SERVICE_GUIDE.md](./FIXED_SERVICE_GUIDE.md)

## ✅ Implementation Status

- [x] Schemas created (CityPrice, UserCategoryAdjustment)
- [x] DTOs created (Create, Update, Adjust)
- [x] Service implemented with all methods
- [x] Controller implemented with role-based guards
- [x] Module configured and registered
- [x] Documentation completed
- [x] Setup scripts created
- [x] Quick start guide created

## 🎉 Ready to Use!

The Shippings API is fully implemented and ready to use. Follow the [QUICK_START.md](./QUICK_START.md) guide to begin testing.
