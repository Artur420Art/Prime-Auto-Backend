# Shipping Service - Quick Reference

## Data Flow

```
┌─────────────────┐
│   CityPrice     │  Base prices (admin creates)
│  (base_price)   │  Same for all users
└────────┬────────┘
         │
         ↓ (copied on first access)
┌─────────────────┐
│  UserShipping   │  User-specific prices
│                 │
│  default_price  │  ← Admin can modify
│  +              │
│  price_adjust   │  ← User can modify
│  =              │
│  current_price  │  → Final price
└─────────────────┘
```

## Quick Commands

### Admin Tasks

```bash
# Create base price
curl -X POST /shippings/city-prices \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"city":"LA","category":"copart","base_price":500}'

# Update user's default price
curl -X PATCH /shippings/admin/default-price \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"userId":"123","city":"LA","category":"copart","default_price":450}'

# Bulk update all users in LA
curl -X PATCH /shippings/admin/bulk-default-price \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"city":"LA","default_price":600}'
```

### User Tasks

```bash
# View my prices
curl /shippings/user-shippings \
  -H "Authorization: Bearer $USER_TOKEN"

# Adjust all my prices by +$50
curl -X PATCH /shippings/user/adjust-prices \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"adjustment_amount":50}'

# Get price breakdown
curl /shippings/effective-price/LA/copart \
  -H "Authorization: Bearer $USER_TOKEN"
```

## Price Calculation

```typescript
current_price = Math.max(0, default_price + price_adjustment)

source = 
  price_adjustment !== 0 ? 'user_adjusted' :
  default_price !== base_price ? 'admin_default' :
  'base'
```

## Common Scenarios

### Scenario 1: New User
```
1. User logs in
2. Views /user-shippings
3. System auto-creates records:
   - default_price = base_price
   - price_adjustment = 0
   - current_price = base_price
```

### Scenario 2: Admin Discount
```
1. Admin: PATCH /admin/default-price
   { userId: "123", city: "LA", category: "copart", default_price: 450 }
2. Result:
   - default_price = 450 (was 500)
   - price_adjustment = 0 (unchanged)
   - current_price = 450
```

### Scenario 3: User Increases Prices
```
1. User: PATCH /user/adjust-prices { adjustment_amount: 100 }
2. Result for ALL cities:
   - default_price = 450 (unchanged)
   - price_adjustment = 100 (was 0)
   - last_adjustment_amount = 0 (saved)
   - current_price = 550
```

### Scenario 4: User Changes Mind
```
1. User: PATCH /user/adjust-prices { adjustment_amount: 50 }
2. Result:
   - default_price = 450 (unchanged)
   - price_adjustment = 50 (was 100)
   - last_adjustment_amount = 100 (saved)
   - current_price = 500
```

## Database Queries

### Find user's price for specific city/category
```typescript
await userShippingModel.findOne({
  user: userId,
  city: 'Los Angeles',
  category: 'copart'
});
// Uses compound index: { user: 1, city: 1, category: 1 }
```

### Find all prices for a city (admin view)
```typescript
await userShippingModel.find({
  city: new RegExp('^Los Angeles$', 'i')
}).populate('user');
// Uses index: { city: 1 }
```

### Bulk update all users in a city
```typescript
await userShippingModel.bulkWrite([
  {
    updateMany: {
      filter: { city: 'Los Angeles' },
      update: { $set: { default_price: 600 } }
    }
  }
]);
```

## Field Reference

| Field | Type | Who Modifies | Purpose |
|-------|------|--------------|---------|
| `base_price` | number | Admin (CityPrice) | System default |
| `default_price` | number | Admin (UserShipping) | User's default |
| `price_adjustment` | number | User | Current adjustment |
| `last_adjustment_amount` | number | System | Previous adjustment |
| `last_adjustment_date` | Date | System | When adjusted |
| `current_price` | number | Calculated | Final price |

## Indexes

```typescript
// Primary lookup (unique)
{ user: 1, city: 1, category: 1 }

// Filter by user
{ user: 1 }

// Filter by city
{ city: 1 }

// Filter by category
{ category: 1 }
```

## Error Handling

```typescript
// City price not found
throw new NotFoundException(
  `Base city price not found for city ${city} and category ${category}`
);

// User shipping not found
throw new NotFoundException(
  `User shipping with ID "${id}" not found`
);
```

## Best Practices

✅ **DO**
- Use bulk operations for mass updates
- Check `source` field to understand price origin
- Use utility functions for calculations
- Populate user data when needed

❌ **DON'T**
- Modify `base_price` after creation
- Let users modify `default_price`
- Let admins modify `price_adjustment`
- Calculate prices manually (use utility)

## Troubleshooting

### User sees no prices
→ Records are auto-created on first access
→ Check if CityPrice records exist

### Prices don't match
→ Check `source` field in effective-price endpoint
→ Verify `default_price` vs `base_price`
→ Check `price_adjustment` value

### Bulk update didn't work
→ Verify filters match existing records
→ Check if CityPrice exists for filters
→ Review modifiedCount in response

### Migration issues
→ Run migration script
→ Check for `final_price` vs `current_price`
→ Verify new fields exist

## Testing

```bash
# Run tests
npm test -- shippings

# Check linting
npm run lint -- src/shippings

# Build
npm run build
```

## Monitoring

Key metrics to track:
- Query response times
- Bulk operation durations
- Index usage statistics
- Price adjustment frequency
- Admin override frequency

## Support

For issues or questions:
1. Check README.md for detailed documentation
2. Review OPTIMIZATION_SUMMARY.md for changes
3. Check migration script for data issues
4. Review API responses for error messages
