# Demo Data Troubleshooting Guide

## Why Demo Records Might Not Be Showing

### Issue 1: Wrong Account
**Most Common Issue**: You're logged in with a different account than the demo account.

**Solution**: 
1. Sign out of your current account
2. Log in with: **admin@demo.com** / **demo123**
3. The demo data is ONLY in the "Demo Household" created by the seed script

### Issue 2: New Account Created
If you registered a new account, it creates a NEW household with NO data. Demo data is only in the "Demo Household".

**Solution**: Use the demo account (admin@demo.com) instead of creating a new account.

### Issue 3: Month Mismatch
The seed creates data for the CURRENT month (format: YYYY-MM). If you're viewing a different month, you won't see the data.

**Solution**: The dashboard shows the current month by default. Make sure you're viewing the correct month.

## How to Verify Demo Data Exists

1. **Check Debug Page**: Navigate to `/debug` (added to navbar) to see all your household data
2. **Verify Login**: Make sure you're logged in as `admin@demo.com`
3. **Check Month**: Ensure you're viewing the current month (YYYY-MM format)

## Re-seeding Data

If you need to re-seed the data:

```bash
npm run db:seed
```

The seed script is now idempotent - it will:
- Use existing demo household if it exists
- Use existing users if they exist
- Create missing financial data (income, budgets, transactions)
- Skip data that already exists

## What Demo Data Includes

- **Household**: "Demo Household"
- **Users**: 
  - admin@demo.com (admin role)
  - member@demo.com (member role)
- **Payment Accounts**: Primary Account, Shared Allocation
- **Categories**: Groceries, Rent, Utilities, Transport, Entertainment, Healthcare
- **Income**: $5000 for current month
- **Fund Allocations**: $3000 to Primary Account, $2000 to Shared Allocation
- **Budget Items**: 4 items totaling $2800
- **Transactions**: 6 sample transactions

## Quick Fix

1. **Sign out** of your current account
2. **Log in** with: admin@demo.com / demo123
3. **Check** the dashboard - you should see all demo data
4. **Visit** `/debug` to verify your household ID matches the demo household

## Still Not Working?

1. Visit `/debug` page to see what data exists for your account
2. Check the browser console for any errors
3. Verify you're using the demo account (admin@demo.com)
4. Make sure the current month matches the seed data month

