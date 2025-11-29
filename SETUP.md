# Quick Setup Guide

## 1. Install Dependencies

```bash
npm install
```

## 2. Set Up Environment Variables

Create `.env.local`:

```env
DATABASE_URL=postgresql://user:password@host:5432/database
NEXTAUTH_SECRET=generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

## 3. Initialize Database

```bash
# Push schema to database
npm run db:push

# Or generate and run migrations
npm run db:generate
npm run db:migrate
```

## 4. Run Development Server

```bash
npm run dev
```

## 5. First Steps After Registration

1. **Create Categories**: Go to Settings → Categories
   - Add categories like "Groceries", "Rent", "Utilities", etc.
   - Choose type: mandatory, periodic, or ad_hoc

2. **Set Up Monthly Income**: Navigate to `/setup/YYYY-MM`
   - Enter total monthly income
   - Allocate funds to "Primary Account" and "Shared Allocation"

3. **Plan Budget**: Navigate to `/budget/YYYY-MM`
   - Add budget items for planned expenses

4. **Log Transactions**: Navigate to `/log`
   - Record actual expenses as they occur

5. **View Dashboard**: Navigate to `/`
   - See financial overview, charts, and account balances

## Database Schema Notes

- All tables use UUID primary keys
- All financial data is scoped by `household_id`
- Default payment accounts are created on household creation
- Invite tokens expire after 7 days

## Troubleshooting

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Ensure database is accessible
- Check network/firewall settings

### Authentication Issues
- Verify `NEXTAUTH_SECRET` is set
- Check `NEXTAUTH_URL` matches your app URL
- Clear browser cookies and try again

### PWA Not Installing
- Ensure HTTPS in production (required for PWA)
- Check `manifest.json` is accessible
- Verify service worker is registered

