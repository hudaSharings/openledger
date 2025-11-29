# Database Seeding Instructions

## Step 1: Set Up Environment Variables

Make sure you have a `.env.local` file with your database connection:

```env
DATABASE_URL=your_neon_database_url_here
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Step 2: Push Database Schema

```bash
npm run db:push
```

This will create all the tables in your Neon database.

## Step 3: Seed Demo Data

```bash
npm run db:seed
```

This will create:
- Demo household: "Demo Household"
- Admin user: admin@demo.com (password: demo123)
- Member user: member@demo.com (password: demo123)
- Payment accounts: "Primary Account" and "Shared Allocation"
- Categories: Groceries, Rent, Utilities, Transport, Entertainment, Healthcare
- Income entry for current month: $5000
- Fund allocations: $3000 to Primary Account, $2000 to Shared Allocation
- Budget items for current month
- Sample transactions

## Step 4: Run the Application

```bash
npm run dev
```

Then visit http://localhost:3000 and log in with:
- Email: admin@demo.com
- Password: demo123

## Troubleshooting

If you get connection errors:
1. Verify your DATABASE_URL is correct in `.env.local`
2. Make sure your Neon database is accessible
3. Check that the database URL includes SSL mode if required

