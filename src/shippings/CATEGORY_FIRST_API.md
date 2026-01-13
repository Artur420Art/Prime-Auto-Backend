# Shippings API - Category-First Approach

## 📋 API Design Philosophy

All endpoints follow a **category-first** approach:
1. **Category is the primary filter** (most useful)
2. **City is secondary/optional** (narrows down within category)
3. **All parameters are query strings** (no path params)
4. **userId comes from JWT token** (except admin adjusting specific user)

---

## 🎯 All Endpoints Use Query Parameters

### ✅ Typical Usage Pattern

```bash
# Step 1: Filter by category (most common)
GET /shippings/prices?category=copart

# Step 2: Optionally narrow down by city
GET /shippings/prices?category=copart&city=Los Angeles
```

---

## 📚 Complete Endpoint Reference

### 1. Get Prices (Non-Paginated)

**Endpoint:** `GET /shippings/prices`

**Query Parameters:**
- `category` (optional) - Filter by auction category
- `city` (optional) - Filter by city within category

**Examples:**
```bash
# All categories, all cities
GET /shippings/prices

# All copart cities (most common use case)
GET /shippings/prices?category=copart

# Copart in Los Angeles (specific)
GET /shippings/prices?category=copart&city=Los Angeles

# All IAAI cities
GET /shippings/prices?category=iaai
```

**Response:**
```json
[
  {
    "city": "Los Angeles",
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

---

### 2. Get Prices (Paginated)

**Endpoint:** `GET /shippings/prices/paginated`

**Query Parameters:**
- `page` (optional, default: 1) - Page number
- `limit` (optional, default: 10) - Items per page
- `category` (optional) - Filter by auction category
- `search` (optional) - Search in city/category names

**Examples:**
```bash
# Paginated copart cities (most common)
GET /shippings/prices/paginated?category=copart&page=1&limit=10

# All categories, paginated
GET /shippings/prices/paginated?page=1&limit=20

# Search within copart
GET /shippings/prices/paginated?category=copart&search=angeles&page=1&limit=10

# Search all categories
GET /shippings/prices/paginated?search=new&page=1&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "city": "Los Angeles",
      "category": "copart",
      "base_price": 600,
      "user_adjustment_amount": 50,
      "effective_price": 650
    }
  ],
  "meta": {
    "currentPage": 1,
    "itemsPerPage": 10,
    "totalItems": 15,
    "totalPages": 2,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

---

### 3. Get Single Price

**Endpoint:** `GET /shippings/price`

**Query Parameters:**
- `category` (required) - Auction category
- `city` (optional) - Specific city (returns first city if not provided)

**Examples:**
```bash
# Specific city in category (most common)
GET /shippings/price?category=copart&city=Los Angeles

# First city found in category
GET /shippings/price?category=copart
```

**Response:**
```json
{
  "city": "Los Angeles",
  "category": "copart",
  "base_price": 600,
  "base_last_adjustment_amount": 100,
  "base_last_adjustment_date": "2026-01-10T15:30:00.000Z",
  "user_adjustment_amount": 50,
  "adjusted_by": "user",
  "user_last_adjustment_amount": 0,
  "user_last_adjustment_date": "2026-01-12T10:00:00.000Z",
  "effective_price": 650
}
```

---

### 4. Adjust User Price (Category-Based)

**Endpoint:** `PATCH /shippings/adjust-price`

**Body:**
- `category` (required) - Auction category
- `adjustment_amount` (required) - Amount to adjust (+/-)
- `userId` (optional, admin only) - Specific user to adjust

**Examples:**
```bash
# User adjusts own copart prices
PATCH /shippings/adjust-price
Authorization: Bearer USER_JWT_TOKEN
{
  "category": "copart",
  "adjustment_amount": 50
}

# Admin adjusts specific user's copart prices
PATCH /shippings/adjust-price
Authorization: Bearer ADMIN_JWT_TOKEN
{
  "userId": "user123",
  "category": "copart",
  "adjustment_amount": -100
}
```

---

### 5. Get User Adjustments

**Endpoint:** `GET /shippings/adjustments`

**Query Parameters:**
- `category` (optional) - Filter by category

**Examples:**
```bash
# Get all user's adjustments
GET /shippings/adjustments

# Get user's copart adjustment only
GET /shippings/adjustments?category=copart
```

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
  }
]
```

---

### 6. Get Single User Adjustment

**Endpoint:** `GET /shippings/adjustment`

**Query Parameters:**
- `category` (optional) - Specific category

**Examples:**
```bash
# Get user's copart adjustment
GET /shippings/adjustment?category=copart

# Get user's first adjustment (any category)
GET /shippings/adjustment
```

---

## 🎯 Use Case Examples

### Use Case 1: User Views Copart Prices (Most Common)

```bash
# Step 1: User selects "Copart" category
GET /shippings/prices?category=copart
Authorization: Bearer USER_JWT_TOKEN

# Response: All copart cities with user's effective prices
```

---

### Use Case 2: User Views Specific City in Category

```bash
# User selects "Copart" then searches for "Los Angeles"
GET /shippings/prices?category=copart&city=Los Angeles
Authorization: Bearer USER_JWT_TOKEN

# Response: Los Angeles copart price
```

---

### Use Case 3: User Adjusts Copart Prices

```bash
# User increases all copart cities by $50
PATCH /shippings/adjust-price
Authorization: Bearer USER_JWT_TOKEN
{
  "category": "copart",
  "adjustment_amount": 50
}

# Response: Updated adjustment
# Effect: ALL copart cities now have +$50 for this user
```

---

### Use Case 4: Admin Views Category Prices

```bash
# Admin views all IAAI prices (with pagination)
GET /shippings/prices/paginated?category=iaai&page=1&limit=20
Authorization: Bearer ADMIN_JWT_TOKEN

# Response: Paginated IAAI cities with admin's effective prices
```

---

### Use Case 5: Admin Adjusts Specific User's Prices

```bash
# Admin gives user $100 discount on all Copart cities
PATCH /shippings/adjust-price
Authorization: Bearer ADMIN_JWT_TOKEN
{
  "userId": "user123",
  "category": "copart",
  "adjustment_amount": -100
}

# Response: Updated adjustment for user123
# Effect: user123 gets $100 discount on ALL copart cities
```

---

## 📊 Query Parameter Priority

```
1. category (primary filter)
   ↓
2. city (secondary filter within category)
   ↓
3. Result: Filtered prices
```

**Why category-first?**
- ✅ Users typically work with one auction type at a time
- ✅ Category adjustments apply to all cities
- ✅ More logical workflow: "Show me Copart prices"
- ✅ City alone is not useful without knowing the category

---

## 🔍 Frontend Integration Examples

### Example 1: Category Dropdown + City Filter

```typescript
// User selects category from dropdown
const [selectedCategory, setSelectedCategory] = useState('copart');
const [selectedCity, setSelectedCity] = useState('');

// Fetch prices based on category (and optionally city)
const fetchPrices = async () => {
  let url = `/shippings/prices?category=${selectedCategory}`;
  if (selectedCity) {
    url += `&city=${selectedCity}`;
  }
  
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return response.json();
};

// Usage:
// 1. User selects "Copart" → Show all copart cities
// 2. User types "Los Angeles" in search → Show only LA copart
```

---

### Example 2: Paginated List with Category Filter

```typescript
const CategoryPriceList = () => {
  const [category, setCategory] = useState('copart');
  const [page, setPage] = useState(1);
  
  const { data, meta } = await fetch(
    `/shippings/prices/paginated?category=${category}&page=${page}&limit=20`,
    { headers: { Authorization: `Bearer ${token}` } }
  ).then(r => r.json());
  
  return (
    <div>
      {/* Category selector */}
      <select value={category} onChange={(e) => setCategory(e.target.value)}>
        <option value="copart">Copart</option>
        <option value="iaai">IAAI</option>
        <option value="manheim">Manheim</option>
      </select>
      
      {/* Price list */}
      {data.map(price => (
        <div key={`${price.city}-${price.category}`}>
          {price.city}: ${price.effective_price}
        </div>
      ))}
      
      {/* Pagination */}
      <Pagination currentPage={page} totalPages={meta.totalPages} />
    </div>
  );
};
```

---

### Example 3: Adjust Category Prices

```typescript
const adjustCategoryPrice = async (category: string, amount: number) => {
  const response = await fetch('/shippings/adjust-price', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      category,
      adjustment_amount: amount
    })
  });
  
  return response.json();
};

// User clicks "Increase Copart by $50"
await adjustCategoryPrice('copart', 50);
// All copart cities now have +$50 for this user
```

---

## ✅ Summary

### All Endpoints:
- ✅ Use **query parameters only** (no path params)
- ✅ **Category-first** approach (primary filter)
- ✅ **City is optional** (secondary filter)
- ✅ **userId from JWT token** (automatic)
- ✅ **Admin can pass userId** in adjust-price only

### Typical Flow:
1. Select category (copart, iaai, manheim)
2. Optionally filter by city
3. View/adjust prices
4. Changes apply to all cities in category

---

## 🧪 Quick Test Commands

```bash
# Set JWT token
export JWT_TOKEN="your_jwt_token_here"

# 1. View all copart prices
curl -X GET "http://localhost:3000/shippings/prices?category=copart" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 2. View specific city in category
curl -X GET "http://localhost:3000/shippings/prices?category=copart&city=Los%20Angeles" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 3. Adjust copart prices
curl -X PATCH "http://localhost:3000/shippings/adjust-price" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"category":"copart","adjustment_amount":50}'

# 4. View adjustments
curl -X GET "http://localhost:3000/shippings/adjustments?category=copart" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

The API is optimized for a **category-first workflow** which matches real-world usage patterns! 🚀
