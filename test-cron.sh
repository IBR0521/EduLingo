#!/bin/bash

# Test script for cron job endpoint
# Usage: ./test-cron.sh YOUR_VERCEL_URL YOUR_CRON_SECRET

VERCEL_URL=$1
CRON_SECRET=$2

if [ -z "$VERCEL_URL" ] || [ -z "$CRON_SECRET" ]; then
  echo "Usage: ./test-cron.sh YOUR_VERCEL_URL YOUR_CRON_SECRET"
  echo "Example: ./test-cron.sh https://edu-lingo.vercel.app my-secret-key"
  exit 1
fi

echo "Testing cron endpoint: $VERCEL_URL/api/cron/class-reports"
echo ""

# Test with POST and Authorization header
response=$(curl -s -w "\nHTTP_CODE:%{http_code}" -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  -H "Content-Type: application/json" \
  "$VERCEL_URL/api/cron/class-reports")

# Extract HTTP code
http_code=$(echo "$response" | grep "HTTP_CODE" | cut -d: -f2)
body=$(echo "$response" | sed '/HTTP_CODE/d')

echo "HTTP Status Code: $http_code"
echo ""
echo "Response Body:"
echo "$body" | jq . 2>/dev/null || echo "$body"
echo ""

if [ "$http_code" = "200" ]; then
  echo "✅ SUCCESS: Endpoint is working!"
elif [ "$http_code" = "401" ]; then
  echo "❌ ERROR: Unauthorized - Check your CRON_SECRET"
elif [ "$http_code" = "404" ]; then
  echo "❌ ERROR: Not Found - Check your Vercel URL"
elif [ "$http_code" = "500" ]; then
  echo "❌ ERROR: Server Error - Check Vercel logs"
else
  echo "❌ ERROR: Unexpected response code"
fi

