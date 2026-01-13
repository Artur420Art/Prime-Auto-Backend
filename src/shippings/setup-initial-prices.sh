#!/bin/bash

# Setup Initial Shipping Prices
# This script creates initial base city prices for all three categories
# Run this after getting your JWT token

# USAGE:
# 1. Get admin JWT token from login
# 2. Replace YOUR_JWT_TOKEN below with your actual token
# 3. Run: chmod +x setup-initial-prices.sh
# 4. Run: ./setup-initial-prices.sh

JWT_TOKEN="YOUR_JWT_TOKEN"
API_URL="http://localhost:3000/shippings"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Setting up initial shipping prices..."
echo ""

# Copart Cities
echo "📦 Creating Copart shipping prices..."

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Los Angeles",
    "category": "copart",
    "base_price": 500
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "New York",
    "category": "copart",
    "base_price": 600
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Chicago",
    "category": "copart",
    "base_price": 550
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Houston",
    "category": "copart",
    "base_price": 480
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Miami",
    "category": "copart",
    "base_price": 520
  }'

echo ""
echo "✅ Copart prices created"
echo ""

# IAAI Cities
echo "📦 Creating IAAI shipping prices..."

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Los Angeles",
    "category": "iaai",
    "base_price": 450
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "New York",
    "category": "iaai",
    "base_price": 550
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Chicago",
    "category": "iaai",
    "base_price": 500
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Houston",
    "category": "iaai",
    "base_price": 430
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Miami",
    "category": "iaai",
    "base_price": 470
  }'

echo ""
echo "✅ IAAI prices created"
echo ""

# Manheim Cities
echo "📦 Creating Manheim shipping prices..."

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Los Angeles",
    "category": "manheim",
    "base_price": 480
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "New York",
    "category": "manheim",
    "base_price": 580
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Chicago",
    "category": "manheim",
    "base_price": 530
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Houston",
    "category": "manheim",
    "base_price": 460
  }'

curl -X POST "$API_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "city": "Miami",
    "category": "manheim",
    "base_price": 500
  }'

echo ""
echo "✅ Manheim prices created"
echo ""
echo "🎉 Initial shipping prices setup complete!"
echo ""
echo "To verify, run:"
echo "curl -X GET \"$API_URL/admin/city-prices\" -H \"Authorization: Bearer $JWT_TOKEN\""
