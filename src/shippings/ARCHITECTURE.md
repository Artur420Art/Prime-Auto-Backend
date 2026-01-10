# Shipping Service Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Shipping Service                          │
│                                                                   │
│  ┌──────────────┐      ┌──────────────┐      ┌──────────────┐  │
│  │   Admin      │      │    Client    │      │   System     │  │
│  │   Actions    │      │   Actions    │      │   Actions    │  │
│  └──────┬───────┘      └──────┬───────┘      └──────┬───────┘  │
│         │                     │                      │           │
│         ↓                     ↓                      ↓           │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ShippingsController                          │  │
│  │  - JWT Auth Guard                                         │  │
│  │  - Role-based Access Control                              │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              ShippingsService                             │  │
│  │  - Business Logic                                         │  │
│  │  - Price Calculations                                     │  │
│  │  - Data Validation                                        │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │           Price Calculator Utility                        │  │
│  │  - calculateCurrentPrice()                                │  │
│  │  - determinePriceSource()                                 │  │
│  └──────────────────────────┬───────────────────────────────┘  │
│                              │                                   │
│                              ↓                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │              MongoDB Collections                          │  │
│  │                                                            │  │
│  │  ┌──────────────┐              ┌──────────────┐          │  │
│  │  │  CityPrice   │              │UserShipping  │          │  │
│  │  │              │              │              │          │  │
│  │  │ - city       │              │ - user       │          │  │
│  │  │ - category   │              │ - city       │          │  │
│  │  │ - base_price │              │ - category   │          │  │
│  │  └──────────────┘              │ - default_p  │          │  │
│  │                                 │ - price_adj  │          │  │
│  │                                 │ - current_p  │          │  │
│  │                                 │ - last_adj_a │          │  │
│  │                                 │ - last_adj_d │          │  │
│  │                                 └──────────────┘          │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow Diagrams

### 1. User Views Prices (First Time)

```
┌────────┐                ┌──────────┐                ┌──────────┐
│ Client │                │ Service  │                │ Database │
└───┬────┘                └────┬─────┘                └────┬─────┘
    │                          │                           │
    │ GET /user-shippings      │                           │
    ├─────────────────────────→│                           │
    │                          │                           │
    │                          │ Check if records exist    │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ Count = 0                 │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ Get all CityPrices        │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ [CityPrice, ...]          │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ Create UserShippings      │
    │                          │ (default_price = base)    │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ Success                   │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ Get UserShippings         │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ [UserShipping, ...]       │
    │                          │←──────────────────────────┤
    │                          │                           │
    │ [UserShipping, ...]      │                           │
    │←─────────────────────────┤                           │
    │                          │                           │
```

### 2. Admin Updates Default Price

```
┌────────┐                ┌──────────┐                ┌──────────┐
│ Admin  │                │ Service  │                │ Database │
└───┬────┘                └────┬─────┘                └────┬─────┘
    │                          │                           │
    │ PATCH /admin/            │                           │
    │   default-price          │                           │
    ├─────────────────────────→│                           │
    │                          │                           │
    │                          │ Verify CityPrice exists   │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ CityPrice found           │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ Get existing UserShipping │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ UserShipping (if exists)  │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ Calculate new current_p   │
    │                          │ = default_p + price_adj   │
    │                          │                           │
    │                          │ Update/Upsert             │
    │                          │ - default_price = new     │
    │                          │ - current_price = calc    │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ Updated UserShipping      │
    │                          │←──────────────────────────┤
    │                          │                           │
    │ Updated UserShipping     │                           │
    │←─────────────────────────┤                           │
    │                          │                           │
```

### 3. User Adjusts Prices

```
┌────────┐                ┌──────────┐                ┌──────────┐
│ Client │                │ Service  │                │ Database │
└───┬────┘                └────┬─────┘                └────┬─────┘
    │                          │                           │
    │ PATCH /user/             │                           │
    │   adjust-prices          │                           │
    │ {adjustment_amount: 50}  │                           │
    ├─────────────────────────→│                           │
    │                          │                           │
    │                          │ Get all CityPrices        │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ [CityPrice, ...]          │
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │ For each CityPrice:       │
    │                          │   Get UserShipping        │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │   UserShipping (if exists)│
    │                          │←──────────────────────────┤
    │                          │                           │
    │                          │   Calculate:              │
    │                          │   - old_adj = current adj │
    │                          │   - new_adj = 50          │
    │                          │   - current_p = default+50│
    │                          │                           │
    │                          │ BulkWrite all updates     │
    │                          │ - price_adjustment = 50   │
    │                          │ - last_adj_amount = old   │
    │                          │ - last_adj_date = now     │
    │                          │ - current_price = calc    │
    │                          ├──────────────────────────→│
    │                          │                           │
    │                          │ {modifiedCount: N}        │
    │                          │←──────────────────────────┤
    │                          │                           │
    │ {modifiedCount: N}       │                           │
    │←─────────────────────────┤                           │
    │                          │                           │
```

## Component Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         DTOs                                 │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │CreateCityPriceDto│  │AdjustUserPricesDto│               │
│  └──────────────────┘  └──────────────────┘                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │UpdateDefaultDto  │  │BulkUpdateDto     │                │
│  └──────────────────┘  └──────────────────┘                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                      Controller                              │
│  - Route Handlers                                            │
│  - Auth Guards                                               │
│  - Role Checks                                               │
│  - Request Validation                                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ↓
┌─────────────────────────────────────────────────────────────┐
│                       Service                                │
│  - Business Logic                                            │
│  - Data Orchestration                                        │
│  - Error Handling                                            │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             ↓                           ↓
┌────────────────────────┐  ┌────────────────────────┐
│   Utility Functions    │  │      Schemas           │
│  - calculateCurrentP   │  │  - UserShipping        │
│  - determinePriceS     │  │  - CityPrice           │
└────────────────────────┘  └────────┬───────────────┘
                                     │
                                     ↓
                            ┌────────────────────────┐
                            │    MongoDB Models      │
                            │  - Indexes             │
                            │  - Validation          │
                            └────────────────────────┘
```

## Price Calculation Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    Price Calculation                          │
└──────────────────────────────────────────────────────────────┘

Input:
  default_price: 500
  price_adjustment: 50

     ↓

┌──────────────────────────────────────────────────────────────┐
│  calculateCurrentPrice({ defaultPrice, adjustment })          │
│                                                               │
│  1. Add: 500 + 50 = 550                                       │
│  2. Ensure non-negative: Math.max(0, 550) = 550              │
│                                                               │
└──────────────────────────────────────────────────────────────┘

     ↓

Output:
  current_price: 550

┌──────────────────────────────────────────────────────────────┐
│  determinePriceSource({ basePrice, defaultPrice, priceAdj }) │
│                                                               │
│  if (priceAdjustment !== 0)        → 'user_adjusted'         │
│  else if (defaultPrice !== base)   → 'admin_default'         │
│  else                               → 'base'                  │
│                                                               │
└──────────────────────────────────────────────────────────────┘

     ↓

Output:
  source: 'user_adjusted'
```

## Database Schema Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                      User Collection                          │
│  _id: ObjectId                                                │
│  email: string                                                │
│  firstName: string                                            │
│  lastName: string                                             │
│  role: enum ['admin', 'client']                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Referenced by
                         │
                         ↓
┌──────────────────────────────────────────────────────────────┐
│                  UserShipping Collection                      │
│  _id: ObjectId                                                │
│  user: ObjectId ────────────────────────────┐                │
│  city: string                                │                │
│  category: enum ['copart','iaai','manheim']  │                │
│  default_price: number                       │                │
│  price_adjustment: number                    │                │
│  last_adjustment_amount: number              │                │
│  last_adjustment_date: Date                  │                │
│  current_price: number                       │                │
│  createdAt: Date                             │                │
│  updatedAt: Date                             │                │
│                                              │                │
│  Indexes:                                    │                │
│  - { user, city, category } unique           │                │
│  - { user }                                  │                │
│  - { city }                                  │                │
│  - { category }                              │                │
└──────────────────────────────────────────────┘                │
                                                                 │
┌──────────────────────────────────────────────────────────────┐
│                   CityPrice Collection                        │
│  _id: ObjectId                                                │
│  city: string                                                 │
│  category: enum ['copart','iaai','manheim']                   │
│  base_price: number                                           │
│  createdAt: Date                                              │
│  updatedAt: Date                                              │
│                                                               │
│  Indexes:                                                     │
│  - { city, category } unique                                  │
└───────────────────────────────────────────────────────────────┘

Relationship:
- CityPrice provides base_price template
- UserShipping.default_price initially = CityPrice.base_price
- UserShipping.current_price = default_price + price_adjustment
```

## Access Control Matrix

```
┌─────────────────────┬─────────────┬─────────────┐
│      Action         │    Admin    │   Client    │
├─────────────────────┼─────────────┼─────────────┤
│ Create CityPrice    │      ✓      │      ✗      │
├─────────────────────┼─────────────┼─────────────┤
│ View CityPrices     │      ✓      │      ✓      │
├─────────────────────┼─────────────┼─────────────┤
│ Delete CityPrice    │      ✓      │      ✗      │
├─────────────────────┼─────────────┼─────────────┤
│ View All UserShip   │      ✓      │  Own Only   │
├─────────────────────┼─────────────┼─────────────┤
│ Update default_p    │      ✓      │      ✗      │
├─────────────────────┼─────────────┼─────────────┤
│ Bulk Update def_p   │      ✓      │      ✗      │
├─────────────────────┼─────────────┼─────────────┤
│ Adjust price_adj    │      ✗      │      ✓      │
├─────────────────────┼─────────────┼─────────────┤
│ View Effective P    │      ✓      │      ✓      │
└─────────────────────┴─────────────┴─────────────┘
```

## State Transitions

```
┌─────────────────────────────────────────────────────────────┐
│                  UserShipping State                          │
└─────────────────────────────────────────────────────────────┘

State 1: Initial (Base Price)
┌──────────────────────────────────────┐
│ default_price = base_price (500)     │
│ price_adjustment = 0                 │
│ current_price = 500                  │
│ source = 'base'                      │
└──────────────┬───────────────────────┘
               │
               │ Admin: Update default_price to 450
               ↓
State 2: Admin Modified
┌──────────────────────────────────────┐
│ default_price = 450                  │
│ price_adjustment = 0                 │
│ current_price = 450                  │
│ source = 'admin_default'             │
└──────────────┬───────────────────────┘
               │
               │ User: Adjust by +100
               ↓
State 3: User Adjusted
┌──────────────────────────────────────┐
│ default_price = 450                  │
│ price_adjustment = 100               │
│ last_adjustment_amount = 0           │
│ last_adjustment_date = 2026-01-10    │
│ current_price = 550                  │
│ source = 'user_adjusted'             │
└──────────────┬───────────────────────┘
               │
               │ User: Adjust by +50
               ↓
State 4: User Re-adjusted
┌──────────────────────────────────────┐
│ default_price = 450                  │
│ price_adjustment = 50                │
│ last_adjustment_amount = 100         │
│ last_adjustment_date = 2026-01-11    │
│ current_price = 500                  │
│ source = 'user_adjusted'             │
└──────────────────────────────────────┘
```

## Performance Characteristics

```
┌────────────────────────────────────────────────────────────┐
│                    Operation Complexity                     │
├────────────────────────────────────┬───────────────────────┤
│ Operation                          │ Time Complexity       │
├────────────────────────────────────┼───────────────────────┤
│ Get user shipping (indexed)        │ O(log n)              │
├────────────────────────────────────┼───────────────────────┤
│ Get all user shippings             │ O(m) where m = user's │
├────────────────────────────────────┼───────────────────────┤
│ Update single shipping             │ O(log n)              │
├────────────────────────────────────┼───────────────────────┤
│ Bulk update (k records)            │ O(k log n)            │
├────────────────────────────────────┼───────────────────────┤
│ User adjust all prices             │ O(c) where c = cities │
└────────────────────────────────────┴───────────────────────┘

Index Usage:
- Single user lookup: { user: 1, city: 1, category: 1 }
- City filter: { city: 1 }
- Category filter: { category: 1 }
- User filter: { user: 1 }
```

## Error Handling Flow

```
Request
  ↓
┌─────────────────────┐
│ Controller          │
│ - Validate DTO      │ → ValidationError (400)
│ - Check Auth        │ → UnauthorizedError (401)
│ - Check Role        │ → ForbiddenError (403)
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Service             │
│ - Check CityPrice   │ → NotFoundException (404)
│ - Check UserShip    │ → NotFoundException (404)
│ - Business Logic    │ → BadRequestException (400)
└──────┬──────────────┘
       ↓
┌─────────────────────┐
│ Database            │
│ - Unique Constraint │ → ConflictException (409)
│ - Connection Error  │ → InternalServerError (500)
└─────────────────────┘
```

This architecture provides a robust, scalable, and maintainable shipping pricing system with clear separation of concerns and well-defined data flows.
