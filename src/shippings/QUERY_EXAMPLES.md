# Shippings API - Query Parameter Examples

## ✅ `/shippings/prices` - Optional Query Parameters

Both `category` and `city` parameters are **completely optional**. Here are all the combinations:

---

### 1. Get ALL Cities and ALL Categories
```bash
GET /shippings/prices
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:**
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 600,
    "user_adjustment_amount": 50,
    "effective_price": 650
  },
  {
    "city": "Los Angeles",
    "category": "iaai",
    "base_price": 450,
    "user_adjustment_amount": 0,
    "effective_price": 450
  },
  {
    "city": "New York",
    "category": "copart",
    "base_price": 700,
    "user_adjustment_amount": 50,
    "effective_price": 750
  }
  // ... all cities and categories
]
```

---

### 2. Get ALL Cities for Specific Category
```bash
GET /shippings/prices?category=copart
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** All cities in "copart" category only
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 600,
    "user_adjustment_amount": 50,
    "effective_price": 650
  },
  {
    "city": "New York",
    "category": "copart",
    "base_price": 700,
    "user_adjustment_amount": 50,
    "effective_price": 750
  },
  {
    "city": "Chicago",
    "category": "copart",
    "base_price": 650,
    "user_adjustment_amount": 50,
    "effective_price": 700
  }
  // ... all copart cities
]
```

---

### 3. Get ALL Categories for Specific City
```bash
GET /shippings/prices?city=Los Angeles
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** All categories in "Los Angeles" city only
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 600,
    "user_adjustment_amount": 50,
    "effective_price": 650
  },
  {
    "city": "Los Angeles",
    "category": "iaai",
    "base_price": 450,
    "user_adjustment_amount": 20,
    "effective_price": 470
  },
  {
    "city": "Los Angeles",
    "category": "manheim",
    "base_price": 480,
    "user_adjustment_amount": 0,
    "effective_price": 480
  }
]
```

---

### 4. Get Specific City/Category Combination
```bash
GET /shippings/prices?category=copart&city=Los Angeles
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** Only Los Angeles + copart combination
```json
[
  {
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 600,
    "user_adjustment_amount": 50,
    "effective_price": 650
  }
]
```

---

## ✅ `/shippings/prices/paginated` - With Pagination

Same optional parameters with pagination support:

### 1. Get ALL (Paginated)
```bash
GET /shippings/prices/paginated?page=1&limit=10
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:**
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
    // ... up to 10 items
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

### 2. Get Specific Category (Paginated)
```bash
GET /shippings/prices/paginated?page=1&limit=10&category=copart
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** Only copart cities, paginated

---

### 3. Search by City or Category Name
```bash
GET /shippings/prices/paginated?page=1&limit=10&search=los
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** All cities/categories matching "los" (Los Angeles, etc.)

---

### 4. Combine Category + Search
```bash
GET /shippings/prices/paginated?page=1&limit=10&category=copart&search=new
Authorization: Bearer YOUR_JWT_TOKEN
```

**Returns:** Only copart cities matching "new" (New York, New Jersey, etc.)

---

## 🧪 Testing Examples

### curl Examples

```bash
# Set your JWT token
export JWT_TOKEN="your_jwt_token_here"

# 1. Get all prices
curl -X GET "http://localhost:3000/shippings/prices" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 2. Get all copart prices
curl -X GET "http://localhost:3000/shippings/prices?category=copart" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 3. Get all Los Angeles prices
curl -X GET "http://localhost:3000/shippings/prices?city=Los%20Angeles" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 4. Get specific price
curl -X GET "http://localhost:3000/shippings/prices?category=copart&city=Los%20Angeles" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 5. Get paginated (all)
curl -X GET "http://localhost:3000/shippings/prices/paginated?page=1&limit=10" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 6. Get paginated (category only)
curl -X GET "http://localhost:3000/shippings/prices/paginated?page=1&limit=10&category=iaai" \
  -H "Authorization: Bearer $JWT_TOKEN"

# 7. Search
curl -X GET "http://localhost:3000/shippings/prices/paginated?page=1&limit=10&search=angeles" \
  -H "Authorization: Bearer $JWT_TOKEN"
```

---

## 📋 Query Parameters Summary

### `/shippings/prices`
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `category` | string | ❌ No | Filter by category (copart, iaai, manheim) |
| `city` | string | ❌ No | Filter by city name (case-insensitive) |

**Behavior:**
- No parameters: Returns ALL cities and categories
- Only `category`: Returns all cities for that category
- Only `city`: Returns all categories for that city
- Both: Returns specific city/category combination

---

### `/shippings/prices/paginated`
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `page` | number | ❌ No | Page number (default: 1) |
| `limit` | number | ❌ No | Items per page (default: 10) |
| `category` | string | ❌ No | Filter by category |
| `search` | string | ❌ No | Search by city or category name |

**Behavior:**
- Same as `/shippings/prices` but with pagination
- `search` parameter searches in both city and category fields

---

## 💡 Pro Tips

### 1. Get Overview of All Prices
```bash
# See all your prices across all cities and categories
GET /shippings/prices
```

### 2. Focus on One Auction Type
```bash
# See only copart prices
GET /shippings/prices?category=copart
```

### 3. Check Prices for Specific Location
```bash
# See all auction types in Los Angeles
GET /shippings/prices?city=Los Angeles
```

### 4. Quick Price Check
```bash
# Check specific city/category combination
GET /shippings/prices?category=copart&city=Los Angeles
```

### 5. Use Pagination for Large Datasets
```bash
# If you have many cities, use pagination
GET /shippings/prices/paginated?page=1&limit=20&category=copart
```

---

## 🎯 Use Cases

### Use Case 1: Dashboard - Show All User Prices
```javascript
// Frontend: Display all prices in a table
const response = await fetch('/shippings/prices', {
  headers: { Authorization: `Bearer ${token}` }
});
const allPrices = await response.json();
// Display in table grouped by category
```

---

### Use Case 2: Category Filter - Show Copart Only
```javascript
// User selects "Copart" from dropdown
const response = await fetch('/shippings/prices?category=copart', {
  headers: { Authorization: `Bearer ${token}` }
});
const copartPrices = await response.json();
// Display copart cities
```

---

### Use Case 3: City Search - Find Los Angeles
```javascript
// User searches for "Los Angeles"
const response = await fetch('/shippings/prices?city=Los Angeles', {
  headers: { Authorization: `Bearer ${token}` }
});
const laPrices = await response.json();
// Display all categories for LA
```

---

### Use Case 4: Paginated List with Search
```javascript
// Large list with search functionality
const response = await fetch(
  '/shippings/prices/paginated?page=1&limit=20&search=new',
  { headers: { Authorization: `Bearer ${token}` } }
);
const result = await response.json();
// result.data = prices matching "new"
// result.meta = pagination info
```

---

## ✅ Summary

- ✅ **Both `category` and `city` are optional**
- ✅ **No parameters = Get all prices**
- ✅ **Filter by category, city, or both**
- ✅ **Pagination available with search**
- ✅ **Always uses JWT token for user authentication**

The API is flexible and handles all combinations! 🚀
