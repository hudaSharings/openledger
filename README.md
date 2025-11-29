# OpenLedger - Multi-Tenant Household Expense Tracking PWA

A Progressive Web App (PWA) for shared household expense tracking with multi-tenant SaaS functionality. Built with Next.js 14+, TypeScript, Tailwind CSS, and shadcn/ui.

## Features

- **Multi-Tenant Architecture**: Each household has isolated data with strict access control
- **User Management**: Admin and member roles with invite system
- **Financial Tracking**:
  - Monthly income setup and fund allocation
  - Budget planning by category
  - Transaction logging (planned and unplanned)
  - Dashboard with financial overview and charts
  - CSV export for monthly reports
- **PWA Support**: Installable on iOS/Android with offline capabilities
- **Modern UI**: Built with shadcn/ui components and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: shadcn/ui (Radix UI primitives)
- **Authentication**: NextAuth.js v5 (Credentials Provider)
- **Database**: Neon PostgreSQL (serverless)
- **ORM**: Drizzle ORM
- **Validation**: Zod + react-hook-form
- **Charts**: Recharts
- **PWA**: next-pwa
- **Date Handling**: date-fns

## Prerequisites

- Node.js 18+ and npm
- Neon PostgreSQL database (or any PostgreSQL database)
- Environment variables configured

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
# On Windows PowerShell
Copy-Item .env.example .env.local

# On Linux/Mac
cp .env.example .env.local
```

Then edit `.env.local` and set your values:

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# NextAuth
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32
NEXTAUTH_URL=http://localhost:3000
```

Generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

### 3. Set Up Database

Run database migrations:

```bash
npm run db:push
```

Or generate and run migrations:

```bash
npm run db:generate
npm run db:migrate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
openledger/
├── app/                    # Next.js app directory (legacy pages)
├── src/
│   ├── app/               # Next.js App Router pages
│   │   ├── api/           # API routes (NextAuth)
│   │   ├── login/         # Login page
│   │   ├── register/      # Registration page
│   │   ├── invite/        # Invite acceptance page
│   │   ├── setup/         # Income setup page
│   │   ├── budget/        # Budget planning page
│   │   ├── log/           # Transaction logging page
│   │   └── settings/      # Settings page (admin only)
│   ├── components/        # React components
│   │   ├── ui/           # shadcn/ui components
│   │   └── ...           # Feature components
│   ├── db/               # Database schema and connection
│   │   └── schema.ts     # Drizzle ORM schema
│   └── lib/              # Utilities and server actions
│       ├── actions/      # Server actions
│       ├── auth.ts       # NextAuth configuration
│       └── validations.ts # Zod schemas
├── public/               # Static assets
│   └── manifest.json     # PWA manifest
└── drizzle.config.ts     # Drizzle configuration
```

## Database Schema

The application uses the following main tables:

- `households` - Household information
- `users` - User accounts with roles (admin/member)
- `invite_tokens` - Invitation tokens for new members
- `payment_accounts` - Payment accounts (Primary Account, Shared Allocation)
- `income_entries` - Monthly income records
- `fund_allocations` - Income allocation to accounts
- `categories` - Expense categories (mandatory, periodic, ad_hoc)
- `budget_items` - Planned budget items
- `transactions` - Actual expense transactions

## Usage

### Registration

1. Navigate to `/register`
2. Enter email, password, and household name
3. You'll be created as the household admin
4. Default payment accounts are created automatically

### Inviting Members

1. As an admin, go to `/settings`
2. Enter the email of the person to invite
3. Share the generated invite link
4. The invited user sets their password and joins as a member

### Setting Up Monthly Income

1. Navigate to `/setup/[month]` (e.g., `/setup/2024-01`)
2. Enter total monthly income
3. Allocate funds to payment accounts
4. Total allocations must equal total income

### Budget Planning

1. Navigate to `/budget/[month]`
2. Add budget items with:
   - Description
   - Amount
   - Category
   - Allocated account

### Logging Transactions

1. Navigate to `/log`
2. Enter transaction details:
   - Date and time
   - Description
   - Amount
   - Category
   - Paid from account
   - Optional notes
3. Link to budget item (optional)

### Dashboard

The dashboard (`/`) shows:
- Total income, planned, and actual spending
- Net cash flow
- Account balances
- Top unplanned categories
- Planned vs Actual chart by category
- CSV export functionality

## Security Features

- **Household Isolation**: All queries filter by `household_id`
- **Role-Based Access**: Admin can invite members, members can view/log
- **Password Hashing**: bcrypt with salt rounds
- **Session Management**: JWT-based sessions with NextAuth
- **Input Validation**: Zod schemas for all user inputs

## PWA Features

- **Installable**: Add to home screen on mobile devices
- **Offline Support**: Cached static assets and critical data
- **Manifest**: Configured for iOS and Android
- **Service Worker**: Automatic caching via next-pwa

## Development

### Database Commands

```bash
# Generate migrations
npm run db:generate

# Push schema changes
npm run db:push

# Run migrations
npm run db:migrate

# Open Drizzle Studio
npm run db:studio
```

### Building for Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `NEXTAUTH_SECRET` | Secret for JWT signing | Yes |
| `NEXTAUTH_URL` | Base URL of the application | Yes |

## License

Private - All rights reserved

## Support

For issues or questions, please contact the development team.
