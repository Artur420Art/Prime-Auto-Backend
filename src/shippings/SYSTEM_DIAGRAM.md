# Shippings System - Visual Diagram

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        SHIPPINGS API                             │
│                    (Role-Based Access)                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────┐                            ┌──────────────┐
│   ADMIN      │                            │    USER      │
│  Endpoints   │                            │  Endpoints   │
└──────────────┘                            └──────────────┘
        │                                           │
        │                                           │
        ▼                                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SHIPPINGS SERVICE                           │
│  - Base Price Management                                         │
│  - User Adjustment Management                                    │
│  - Effective Price Calculation                                   │
│  - History Tracking                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │
        ┌─────────────────────┴─────────────────────┐
        │                                           │
        ▼                                           ▼
┌──────────────────────┐              ┌──────────────────────────┐
│   CityPrice Model    │              │ UserCategoryAdjustment   │
│                      │              │        Model             │
│ - city               │              │ - user (ref)             │
│ - category           │              │ - category               │
│ - base_price         │              │ - adjustment_amount      │
│ - last_adjustment    │              │ - adjusted_by            │
│ - last_adj_date      │              │ - last_adjustment        │
└──────────────────────┘              │ - last_adj_date          │
                                      └──────────────────────────┘
```

## 📊 Data Flow

### Admin Creates Base Price
```
Admin → POST /shippings
        ↓
    Controller (Admin Guard)
        ↓
    Service.createCityPrice()
        ↓
    MongoDB (CityPrice)
        ↓
    Response: Created city price
```

### Admin Adjusts Base Price by Category
```
Admin → PATCH /shippings/adjust-base-price
        ↓
    Controller (Admin Guard)
        ↓
    Service.adjustBasePrice()
        ↓
    MongoDB: Update all cities in category
            - Increment base_price
            - Store last_adjustment_amount
            - Store last_adjustment_date
        ↓
    Response: Modified count
```

### User Views Effective Prices
```
User → GET /shippings/prices?category=copart
       ↓
   Controller (JWT Guard)
       ↓
   Service.getPrices()
       ↓
   MongoDB: 
       1. Fetch all city prices for category
       2. Fetch user's adjustments
       ↓
   Calculate: effective_price = base_price + user_adjustment
       ↓
   Response: Array of effective prices
```

### User Adjusts Own Price
```
User → PATCH /shippings/adjust-price
       ↓
   Controller (JWT Guard)
       ↓
   Service.adjustPrice()
       ↓
   MongoDB (UserCategoryAdjustment):
       - Upsert user's adjustment for category
       - Store adjusted_by: 'user'
       - Store last_adjustment_amount (history)
       - Store last_adjustment_date
       ↓
   Response: Updated adjustment
```

## 🔄 Price Calculation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    EFFECTIVE PRICE CALCULATION                   │
└─────────────────────────────────────────────────────────────────┘

Step 1: Get Base Price
┌──────────────────────────┐
│ CityPrice Collection     │
│ city: "Los Angeles"      │
│ category: "copart"       │
│ base_price: 600          │ ← Admin set this
└──────────────────────────┘
            │
            ▼
Step 2: Get User Adjustment
┌──────────────────────────┐
│ UserCategoryAdjustment   │
│ user: "user123"          │
│ category: "copart"       │
│ adjustment_amount: -30   │ ← User or admin set this
└──────────────────────────┘
            │
            ▼
Step 3: Calculate Effective Price
┌──────────────────────────┐
│ Effective Price          │
│ = 600 + (-30)            │
│ = 570                    │ ← What user sees
└──────────────────────────┘
```

## 🎯 Category-Based Adjustments

```
When admin adjusts "copart" by +100:

┌─────────────────────────────────────────────────────────────────┐
│                    BEFORE ADJUSTMENT                             │
├─────────────────────────────────────────────────────────────────┤
│ Los Angeles - copart: $500                                       │
│ New York - copart: $600                                          │
│ Chicago - copart: $550                                           │
│ Houston - copart: $480                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PATCH /shippings/adjust-base-price
                              │ { category: "copart", adjustment_amount: 100 }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     AFTER ADJUSTMENT                             │
├─────────────────────────────────────────────────────────────────┤
│ Los Angeles - copart: $600 (last_adjustment: +100)               │
│ New York - copart: $700 (last_adjustment: +100)                  │
│ Chicago - copart: $650 (last_adjustment: +100)                   │
│ Houston - copart: $580 (last_adjustment: +100)                   │
└─────────────────────────────────────────────────────────────────┘

All cities in "copart" category increased by $100
History tracked: last_adjustment_amount = 100
```

## 👥 User-Specific Adjustments

```
When user sets adjustment for "copart" to +50:

┌─────────────────────────────────────────────────────────────────┐
│                    BASE PRICES (Same for all users)              │
├─────────────────────────────────────────────────────────────────┤
│ Los Angeles - copart: $600                                       │
│ New York - copart: $700                                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ PATCH /shippings/adjust-price
                              │ { category: "copart", adjustment_amount: 50 }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  USER'S EFFECTIVE PRICES                         │
├─────────────────────────────────────────────────────────────────┤
│ Los Angeles - copart: $650 ($600 base + $50 adjustment)          │
│ New York - copart: $750 ($700 base + $50 adjustment)             │
└─────────────────────────────────────────────────────────────────┘

User's adjustment applies to ALL cities in "copart" category
Other users still see base prices ($600, $700)
```

## 🔐 Access Control Matrix

```
┌──────────────────────────┬───────────┬──────────┐
│ Endpoint                 │   Admin   │   User   │
├──────────────────────────┼───────────┼──────────┤
│ Create base price        │     ✅    │    ❌    │
│ Update base price        │     ✅    │    ❌    │
│ Delete base price        │     ✅    │    ❌    │
│ View all base prices     │     ✅    │    ❌    │
│ Adjust base price        │     ✅    │    ❌    │
│ Adjust any user's price  │     ✅    │    ❌    │
│ View any user's prices   │     ✅    │    ❌    │
├──────────────────────────┼───────────┼──────────┤
│ View own prices          │     ✅    │    ✅    │
│ Adjust own price         │     ✅    │    ✅    │
│ View own adjustments     │     ✅    │    ✅    │
└──────────────────────────┴───────────┴──────────┘
```

## 📦 Module Structure

```
ShippingsModule
    │
    ├── Imports
    │   └── MongooseModule.forFeature([
    │       CityPrice,
    │       UserCategoryAdjustment
    │   ])
    │
    ├── Controllers
    │   └── ShippingsController
    │       ├── Guards: JwtAuthGuard, RolesGuard
    │       ├── Admin Endpoints (13 methods)
    │       └── User Endpoints (6 methods)
    │
    ├── Providers
    │   └── ShippingsService
    │       ├── Base Price Management
    │       ├── User Adjustment Management
    │       ├── Effective Price Calculation
    │       └── History Tracking
    │
    └── Exports
        └── ShippingsService
```

## 🎭 Use Case Scenarios

### Scenario 1: New City Added
```
1. Admin creates base price
   POST /shippings
   { city: "Seattle", category: "copart", base_price: 520 }

2. All users immediately see Seattle with base price $520

3. Users can adjust their own Seattle price via category adjustment
```

### Scenario 2: Price Increase Across Category
```
1. Admin increases all IAAI prices by $75
   PATCH /shippings/adjust-base-price
   { category: "iaai", adjustment_amount: 75 }

2. All IAAI cities get +$75 added to base_price

3. History tracked: last_adjustment_amount = 75

4. User adjustments remain unchanged
   - If user had +$20 adjustment, they still have +$20
   - Their effective price increases by $75 (from base increase)
```

### Scenario 3: VIP User Discount
```
1. Admin gives VIP user $100 discount on Copart
   PATCH /shippings/adjust-price
   { userId: "vip123", category: "copart", adjustment_amount: -100 }

2. VIP user sees all Copart cities with -$100 discount

3. Other users unaffected

4. History tracked: adjusted_by = "admin"
```

### Scenario 4: User Custom Pricing
```
1. User increases their Manheim prices by $30
   PATCH /shippings/adjust-price
   { category: "manheim", adjustment_amount: 30 }

2. User sees all Manheim cities with +$30

3. Other users unaffected

4. History tracked: adjusted_by = "user"

5. User can change this anytime
   - New adjustment replaces old one
   - Old adjustment saved in last_adjustment_amount
```

## 🔄 History Tracking

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADJUSTMENT HISTORY                            │
└─────────────────────────────────────────────────────────────────┘

Base Price History (per city/category):
┌──────────────────────────┐
│ base_price: 700          │ ← Current price
│ last_adjustment: +100    │ ← Last admin adjustment
│ last_adj_date: 2026-01-10│ ← When it was adjusted
└──────────────────────────┘

User Adjustment History (per user/category):
┌──────────────────────────┐
│ adjustment_amount: 50    │ ← Current adjustment
│ last_adjustment: 30      │ ← Previous adjustment
│ last_adj_date: 2026-01-12│ ← When it was changed
│ adjusted_by: "user"      │ ← Who made the change
└──────────────────────────┘
```

## 🎯 Key Takeaways

1. **Three-Layer System**: Base → Adjustment → Effective
2. **Category-Based**: Adjustments apply to entire category
3. **Role-Based**: Admin has full control, users control their own
4. **History Tracked**: Every adjustment is recorded
5. **Flexible**: Admin can override user adjustments
6. **Scalable**: Add cities/categories easily
7. **Secure**: JWT + Role guards protect endpoints

## 📈 Scalability

```
Current: 3 categories × N cities = 3N base prices
         M users × 3 categories = 3M user adjustments

Example with 50 cities and 1000 users:
- Base Prices: 150 documents (3 × 50)
- User Adjustments: ~3000 documents (1000 × 3, if all users adjust)
- Total: ~3150 documents

Efficient queries with indexes:
- CityPrice: { city: 1, category: 1 } (unique)
- UserCategoryAdjustment: { user: 1, category: 1 } (unique)
```

## 🚀 Ready to Use!

The system is fully implemented and production-ready. See:
- **QUICK_START.md** for setup instructions
- **SHIPPINGS_API_DOCUMENTATION.md** for API reference
- **README.md** for module overview
