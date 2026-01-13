# Shippings API - JWT Token Changes

## ✅ Changes Made

### Summary
- **userId is now automatically extracted from JWT token** for all endpoints
- **Only ONE admin endpoint** (`adjustPrice`) allows passing `userId` in the body to adjust a specific user's price
- All other endpoints use the authenticated user's ID from the JWT token

---

## 📋 Updated Endpoints

### 1. ✅ `PATCH /shippings/adjust-price` (ONLY endpoint with userId parameter)

**Admin adjusting specific user:**
```json
POST /shippings/adjust-price
Authorization: Bearer ADMIN_JWT_TOKEN
{
  "userId": "user123",              // ← Admin can pass userId
  "category": "copart",
  "adjustment_amount": -30
}
```

**User adjusting own price:**
```json
POST /shippings/adjust-price
Authorization: Bearer USER_JWT_TOKEN
{
  "category": "iaai",               // ← No userId needed
  "adjustment_amount": 20            // ← Uses JWT token userId
}
```

---

### 2. ✅ `GET /shippings/adjustment` (userId from JWT)

**Before:**
```bash
GET /shippings/adjustment?category=copart&userId=user123
```

**After:**
```bash
GET /shippings/adjustment?category=copart
# userId automatically from JWT token
```

---

### 3. ✅ `GET /shippings/adjustments` (userId from JWT)

**Before:**
```bash
GET /shippings/adjustments?category=copart&userId=user123
```

**After:**
```bash
GET /shippings/adjustments?category=copart
# userId automatically from JWT token
```

---

### 4. ✅ `GET /shippings/prices` (userId from JWT)

**Before:**
```bash
GET /shippings/prices?category=copart&userId=user123
```

**After:**
```bash
GET /shippings/prices?category=copart
# userId automatically from JWT token
```

---

### 5. ✅ `GET /shippings/prices/paginated` (userId from JWT)

**Before:**
```bash
GET /shippings/prices/paginated?page=1&limit=10&userId=user123
```

**After:**
```bash
GET /shippings/prices/paginated?page=1&limit=10
# userId automatically from JWT token
```

---

### 6. ✅ `GET /shippings/price` (userId from JWT)

**Before:**
```bash
GET /shippings/price?city=Los Angeles&category=copart&userId=user123
```

**After:**
```bash
GET /shippings/price?city=Los Angeles&category=copart
# userId automatically from JWT token
```

---

## 🔐 Security Benefits

1. **Better Security**: Users cannot impersonate other users
2. **Simpler API**: No need to pass userId in most endpoints
3. **Automatic Authentication**: userId extracted from verified JWT token
4. **Admin Control**: Only admin can adjust specific user prices via `adjustPrice` endpoint

---

## 📖 Use Case Examples

### Use Case 1: User Views Their Own Prices

```bash
# User logs in
POST /auth/login
{ "email": "user@example.com", "password": "password" }
# Response: { "access_token": "USER_JWT_TOKEN" }

# User views their prices (userId automatic from JWT)
GET /shippings/prices
Authorization: Bearer USER_JWT_TOKEN
# Returns: User's effective prices
```

---

### Use Case 2: User Adjusts Their Own Price

```bash
# User adjusts their own price (userId from JWT token)
PATCH /shippings/adjust-price
Authorization: Bearer USER_JWT_TOKEN
{
  "category": "copart",
  "adjustment_amount": 50
}
# Result: All user's copart cities get +$50
```

---

### Use Case 3: Admin Adjusts Specific User's Price

```bash
# Admin adjusts specific user's price
PATCH /shippings/adjust-price
Authorization: Bearer ADMIN_JWT_TOKEN
{
  "userId": "64f5a1b2c3d4e5f6g7h8i9j0",  // ← Admin specifies userId
  "category": "copart",
  "adjustment_amount": -100
}
# Result: Specified user gets $100 discount on all copart cities
```

---

### Use Case 4: Admin Views Their Own Prices

```bash
# Admin views their own prices (not another user)
GET /shippings/prices
Authorization: Bearer ADMIN_JWT_TOKEN
# Returns: Admin's own effective prices
```

---

## 🔄 Migration Guide (If you have existing frontend code)

### Before (Old Code)
```typescript
// ❌ Old way - passing userId in query
const getPrices = async (userId: string) => {
  const response = await fetch(
    `/shippings/prices?userId=${userId}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.json();
};
```

### After (New Code)
```typescript
// ✅ New way - userId from JWT token
const getPrices = async () => {
  const response = await fetch(
    `/shippings/prices`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );
  return response.json();
};
```

### Admin Adjusting User Price
```typescript
// ✅ Admin can still pass userId in body for adjustPrice
const adjustUserPrice = async (userId: string, category: string, amount: number) => {
  const response = await fetch(
    `/shippings/adjust-price`,
    {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${adminToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId,        // ← Only in this endpoint
        category,
        adjustment_amount: amount
      })
    }
  );
  return response.json();
};
```

---

## 📊 Endpoint Summary

| Endpoint | Method | userId Parameter | Who Can Use |
|----------|--------|------------------|-------------|
| `/shippings/adjust-price` | PATCH | ✅ In body (admin only) | Admin + User |
| `/shippings/adjustment` | GET | ❌ From JWT | Admin + User |
| `/shippings/adjustments` | GET | ❌ From JWT | Admin + User |
| `/shippings/prices` | GET | ❌ From JWT | Admin + User |
| `/shippings/prices/paginated` | GET | ❌ From JWT | Admin + User |
| `/shippings/price` | GET | ❌ From JWT | Admin + User |

---

## ✅ Testing

### Test 1: User Views Own Prices
```bash
# Get user JWT token
export USER_TOKEN="your_user_jwt_token"

# View prices (no userId needed)
curl -X GET http://localhost:3000/shippings/prices \
  -H "Authorization: Bearer $USER_TOKEN"
```

### Test 2: User Adjusts Own Price
```bash
# Adjust own price (no userId needed)
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Authorization: Bearer $USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "copart",
    "adjustment_amount": 50
  }'
```

### Test 3: Admin Adjusts Specific User Price
```bash
# Get admin JWT token
export ADMIN_TOKEN="your_admin_jwt_token"

# Adjust specific user's price
curl -X PATCH http://localhost:3000/shippings/adjust-price \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID_HERE",
    "category": "copart",
    "adjustment_amount": -100
  }'
```

---

## 🎯 Key Points

1. ✅ **All endpoints use JWT token** for userId (except `adjustPrice` for admin)
2. ✅ **Only `adjustPrice` endpoint** allows admin to pass userId in body
3. ✅ **More secure**: Users cannot access other users' data
4. ✅ **Simpler API**: No need to pass userId in most requests
5. ✅ **Automatic**: userId extracted from authenticated JWT token

---

## 📞 Support

If you need help:
- See full API docs: [SHIPPINGS_API_DOCUMENTATION.md](./SHIPPINGS_API_DOCUMENTATION.md)
- Quick start guide: [QUICK_START.md](./QUICK_START.md)
- System diagram: [SYSTEM_DIAGRAM.md](./SYSTEM_DIAGRAM.md)
