# Shippings API - Quick Start Guide

## Overview

This guide will help you quickly set up and test the Shippings API.

## Prerequisites

- Backend server running on `http://localhost:3000`
- Admin JWT token (get from login endpoint)
- MongoDB connected

## Step 1: Get Admin JWT Token

Login as admin to get your JWT token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "your_password"
  }'
```

Save the `access_token` from the response.

## Step 2: Set Up Initial Prices (Option A - Manual)

### Create Base City Prices

```bash
# Set your token
export JWT_TOKEN="your_jwt_token_here"

# Create Los Angeles Copart price
curl -X POST http://localhost:3000/shippings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500
  }'

# Create New York Copart price
curl -X POST http://localhost:3000/shippings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "New York",
    "category": "copart",
    "base_price": 600
  }'

# Create Los Angeles IAAI price
curl -X POST http://localhost:3000/shippings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Los Angeles",
    "category": "iaai",
    "base_price": 450
  }'
```

## Step 2: Set Up Initial Prices (Option B - Script)

Use the provided setup script:

```bash
# 1. Edit the script and replace YOUR_JWT_TOKEN with your actual token
nano setup-initial-prices.sh

# 2. Make it executable
chmod +x setup-initial-prices.sh

# 3. Run it
./setup-initial-prices.sh
```

This will create base prices for:
- 5 cities × 3 categories = 15 base prices

## Step 3: Verify Setup

View all base prices:

```bash
curl -X GET http://localhost:3000/shippings/admin/city-prices \
  -H "Authorization: Bearer $JWT_TOKEN"
```

## Step 4: Test Admin Features

### Adjust All Copart Prices by $100

```bash
curl -X PATCH http://localhost:3000/shippings/adjust-base-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "category": "copart",
    "adjustment_amount": 100
  }'
```

**Result:** All copart cities get +$100 added to their base price.

### Give a User a $30 Discount on Copart

```bash
# Replace USER_ID with actual user ID
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userId": "USER_ID",
    "category": "copart",
    "adjustment_amount": -30
  }'
```

**Result:** User gets $30 discount on all copart cities.

## Step 5: Test User Features

### User Views Their Prices

```bash
# Login as regular user first to get their token
export USER_TOKEN="user_jwt_token_here"

# View all prices
curl -X GET http://localhost:3000/shippings/prices \
  -H "Authorization: Bearer $USER_TOKEN"

# View only copart prices
curl -X GET "http://localhost:3000/shippings/prices?category=copart" \
  -H "Authorization: Bearer $USER_TOKEN"
```

### User Adjusts Their Own Price

```bash
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "category": "iaai",
    "adjustment_amount": 20
  }'
```

**Result:** User adds $20 to all their iaai city prices.

## Step 6: Test Pagination

```bash
curl -X GET "http://localhost:3000/shippings/prices/paginated?page=1&limit=5&category=copart" \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Common Use Cases

### Use Case 1: Admin Increases All Prices for a Category

```bash
# Increase all IAAI prices by $50
curl -X PATCH http://localhost:3000/shippings/adjust-base-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "category": "iaai",
    "adjustment_amount": 50
  }'
```

### Use Case 2: Admin Decreases Price for Specific City

```bash
# Decrease Los Angeles Manheim by $30
curl -X PATCH http://localhost:3000/shippings/adjust-base-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "category": "manheim",
    "city": "Los Angeles",
    "adjustment_amount": -30
  }'
```

### Use Case 3: Admin Gives VIP User Discount

```bash
# Give user $100 discount on all Copart cities
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "userId": "VIP_USER_ID",
    "category": "copart",
    "adjustment_amount": -100
  }'
```

### Use Case 4: User Increases Their Own Prices

```bash
# User adds $25 to all their Manheim prices
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{
    "category": "manheim",
    "adjustment_amount": 25
  }'
```

### Use Case 5: Get Specific Price

```bash
# Get effective price for Los Angeles Copart
curl -X GET "http://localhost:3000/shippings/price?city=Los Angeles&category=copart" \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Testing Checklist

- [ ] Admin can create base city prices
- [ ] Admin can view all base prices
- [ ] Admin can adjust all prices for a category
- [ ] Admin can adjust specific city price
- [ ] Admin can adjust specific user's price
- [ ] User can view their own prices
- [ ] User can adjust their own price by category
- [ ] User cannot view other users' prices
- [ ] User cannot adjust other users' prices
- [ ] Effective price = base_price + user_adjustment
- [ ] Adjustment history is tracked
- [ ] Pagination works correctly
- [ ] Search and filters work

## Troubleshooting

### Error: "Unauthorized"
- Make sure you're including the JWT token in the Authorization header
- Check that your token hasn't expired

### Error: "Forbidden resource"
- You're trying to access an admin endpoint as a regular user
- Make sure you're using an admin token for admin endpoints

### Error: "City price not found"
- The city/category combination doesn't exist in the database
- Create it first using the POST /shippings endpoint

### Error: "Category must be one of: copart, iaai, manheim"
- Check your category spelling
- Only these three categories are supported

## Next Steps

1. Read the full [API Documentation](./SHIPPINGS_API_DOCUMENTATION.md)
2. Read the [Service Guide](./FIXED_SERVICE_GUIDE.md)
3. Integrate with your frontend
4. Set up production data

## Support

For more detailed information, see:
- `SHIPPINGS_API_DOCUMENTATION.md` - Complete API reference
- `FIXED_SERVICE_GUIDE.md` - Service architecture and implementation details
