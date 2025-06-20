#!/bin/bash

# Email System Integration Validation Script
# This script helps validate that all email system components are properly integrated

echo "🔍 Email System Integration Validator"
echo "===================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if required files exist
echo "📁 Checking required files..."

files_to_check=(
  "app/api/check-order-completion/route.ts"
  "app/api/generate-zip/route.ts"
  "app/api/send-photo-links/route.ts"
  "lib/sendgrid.ts"
  "scripts/test-email-system.ts"
  "docs/email-system-deployment-qa-plan.md"
  "docs/email-deployment-checklist.md"
)

all_files_exist=true
for file in "${files_to_check[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "${RED}✗${NC} $file - MISSING"
    all_files_exist=false
  fi
done

echo ""

# Check environment variables
echo "🔐 Checking environment variables..."
if [ -f ".env.local" ]; then
  echo -e "${GREEN}✓${NC} .env.local file exists"
  
  # Check for required env vars
  env_vars=(
    "SENDGRID_API_KEY"
    "SENDGRID_ORDER_CONFIRMATION_TEMPLATE_ID"
    "SENDGRID_RESTORATION_COMPLETE_TEMPLATE_ID"
    "SENDGRID_FAMILY_SHARE_TEMPLATE_ID"
    "NEXT_PUBLIC_APP_URL"
    "NEXT_PUBLIC_SUPABASE_URL"
    "SUPABASE_SERVICE_ROLE_KEY"
  )
  
  for var in "${env_vars[@]}"; do
    if grep -q "^$var=" .env.local; then
      echo -e "${GREEN}✓${NC} $var is set"
    else
      echo -e "${RED}✗${NC} $var is NOT set"
    fi
  done
else
  echo -e "${RED}✗${NC} .env.local file not found"
fi

echo ""

# Check for TypeScript errors in new files
echo "🔧 Checking for TypeScript errors..."
npx tsc --noEmit app/api/check-order-completion/route.ts 2>&1 | grep -q "error"
if [ $? -eq 0 ]; then
  echo -e "${RED}✗${NC} TypeScript errors found in check-order-completion"
else
  echo -e "${GREEN}✓${NC} check-order-completion - No TypeScript errors"
fi

npx tsc --noEmit app/api/generate-zip/route.ts 2>&1 | grep -q "error"
if [ $? -eq 0 ]; then
  echo -e "${RED}✗${NC} TypeScript errors found in generate-zip"
else
  echo -e "${GREEN}✓${NC} generate-zip - No TypeScript errors"
fi

echo ""

# Check package.json for test script
echo "📦 Checking package.json scripts..."
if grep -q '"test-email"' package.json; then
  echo -e "${GREEN}✓${NC} test-email script is configured"
else
  echo -e "${RED}✗${NC} test-email script is NOT configured"
fi

echo ""

# Summary
echo "📊 Summary"
echo "=========="
if [ "$all_files_exist" = true ]; then
  echo -e "${GREEN}✓${NC} All required files are present"
else
  echo -e "${RED}✗${NC} Some files are missing - please check above"
fi

echo ""
echo "📝 Next Steps:"
echo "1. Run the database migration in Supabase"
echo "2. Ensure all environment variables are set"
echo "3. Test with: npm run test-email <order-id>"
echo "4. Follow the deployment checklist in docs/email-deployment-checklist.md"
echo ""
echo "💡 Tip: Use 'cat docs/email-deployment-checklist.md' to view the full deployment guide"
