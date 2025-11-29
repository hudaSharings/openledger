// Load environment variables FIRST before any other imports
import * as dotenv from "dotenv";

// Load .env.local first (highest priority), then .env
dotenv.config({ path: ".env.local" });
dotenv.config();

// Check if DATABASE_URL is set
if (!process.env.DATABASE_URL) {
  console.error("❌ ERROR: DATABASE_URL is not set!");
  console.error("Please create a .env.local file with your Neon database URL.");
  console.error("See CREATE_ENV.md for instructions.");
  process.exit(1);
}

// Import schema types (these don't need DB connection)
import {
  households,
  users,
  paymentAccounts,
  categories,
  incomeEntries,
  fundAllocations,
  budgetItems,
  transactions,
} from "./schema";
import { eq, and, gte, lte } from "drizzle-orm";
import bcrypt from "bcryptjs";

async function seed() {
  // Dynamically import db after env vars are loaded
  const { db } = await import("./index");
  
  console.log("🌱 Starting database seed...");

  try {
    // Check if demo household already exists
    const existingHousehold = await db
      .select()
      .from(households)
      .where(eq(households.name, "Demo Household"))
      .limit(1);

    let household;
    if (existingHousehold.length > 0) {
      console.log("⚠️  Demo household already exists, using existing one...");
      household = existingHousehold[0];
    } else {
      // Create a temporary UUID for createdBy (will be updated after user creation)
      const { randomUUID } = await import("crypto");
      const tempUserId = randomUUID();
      
      // Create demo household
      const [newHousehold] = await db
        .insert(households)
        .values({
          name: "Demo Household",
          createdBy: tempUserId, // Will be updated after user creation
        })
        .returning();
      household = newHousehold;
    }

    if (!existingHousehold || existingHousehold.length === 0) {
      console.log("✅ Created household:", household.id);
    }

    // Check if admin user exists
    const existingAdmin = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@demo.com"))
      .limit(1);

    let adminUser;
    if (existingAdmin.length > 0) {
      console.log("⚠️  Admin user already exists, using existing one");
      adminUser = existingAdmin[0];
    } else {
      // Create demo admin user (password: demo123)
      const passwordHash = await bcrypt.hash("demo123", 10);
      const [newAdminUser] = await db
        .insert(users)
        .values({
          email: "admin@demo.com",
          passwordHash,
          householdId: household.id,
          role: "admin",
        })
        .returning();
      adminUser = newAdminUser;

      // Update household createdBy
      await db
        .update(households)
        .set({ createdBy: adminUser.id })
        .where(eq(households.id, household.id));

      console.log("✅ Created admin user: admin@demo.com (password: demo123)");
    }

    // Check if member user exists
    const existingMember = await db
      .select()
      .from(users)
      .where(eq(users.email, "member@demo.com"))
      .limit(1);

    if (existingMember.length === 0) {
      // Create demo member user (password: demo123)
      const memberPasswordHash = await bcrypt.hash("demo123", 10);
      await db
        .insert(users)
        .values({
          email: "member@demo.com",
          passwordHash: memberPasswordHash,
          householdId: household.id,
          role: "member",
        })
        .returning();

      console.log("✅ Created member user: member@demo.com (password: demo123)");
    } else {
      console.log("⚠️  Member user already exists");
    }

    // Create default payment accounts
    const [primaryAccount, sharedAccount] = await db
      .insert(paymentAccounts)
      .values([
        {
          householdId: household.id,
          name: "Primary Account",
        },
        {
          householdId: household.id,
          name: "Shared Allocation",
        },
      ])
      .returning();

    console.log("✅ Created payment accounts");

    // Check if categories exist
    const existingCategories = await db
      .select()
      .from(categories)
      .where(eq(categories.householdId, household.id));

    let groceries, rent, utilities, transport, entertainment, healthcare;
    
    if (existingCategories.length >= 6) {
      groceries = existingCategories.find(c => c.name === "Groceries")!;
      rent = existingCategories.find(c => c.name === "Rent")!;
      utilities = existingCategories.find(c => c.name === "Utilities")!;
      transport = existingCategories.find(c => c.name === "Transport")!;
      entertainment = existingCategories.find(c => c.name === "Entertainment")!;
      healthcare = existingCategories.find(c => c.name === "Healthcare")!;
      console.log("⚠️  Categories already exist, using existing ones");
    } else {
      // Create categories
      const [newGroceries, newRent, newUtilities, newTransport, newEntertainment, newHealthcare] = await db
        .insert(categories)
        .values([
          {
            householdId: household.id,
            name: "Groceries",
            type: "mandatory",
          },
          {
            householdId: household.id,
            name: "Rent",
            type: "mandatory",
          },
          {
            householdId: household.id,
            name: "Utilities",
            type: "periodic",
          },
          {
            householdId: household.id,
            name: "Transport",
            type: "periodic",
          },
          {
            householdId: household.id,
            name: "Entertainment",
            type: "ad_hoc",
          },
          {
            householdId: household.id,
            name: "Healthcare",
            type: "ad_hoc",
          },
        ])
        .returning();
      groceries = newGroceries;
      rent = newRent;
      utilities = newUtilities;
      transport = newTransport;
      entertainment = newEntertainment;
      healthcare = newHealthcare;
      console.log("✅ Created categories");
    }

    // Create income for current month
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    // Check if income already exists for this month
    const existingIncome = await db
      .select()
      .from(incomeEntries)
      .where(
        and(
          eq(incomeEntries.householdId, household.id),
          eq(incomeEntries.monthYear, currentMonth)
        )
      )
      .limit(1);

    let income;
    if (existingIncome.length > 0) {
      income = existingIncome[0];
      console.log("⚠️  Income for", currentMonth, "already exists, using existing");
    } else {
      const [newIncome] = await db
        .insert(incomeEntries)
        .values({
          householdId: household.id,
          monthYear: currentMonth,
          totalAmount: "5000.00",
        })
        .returning();
      income = newIncome;
    }

    // Allocate funds
    await db.insert(fundAllocations).values([
      {
        incomeId: income.id,
        accountId: primaryAccount.id,
        allocatedAmount: "3000.00",
      },
      {
        incomeId: income.id,
        accountId: sharedAccount.id,
        allocatedAmount: "2000.00",
      },
    ]);

    console.log("✅ Created income entry for", currentMonth);

    // Check if budget items exist for this month
    const existingBudgets = await db
      .select()
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.householdId, household.id),
          eq(budgetItems.monthYear, currentMonth)
        )
      );

    let budget1, budget2, budget3, budget4;
    if (existingBudgets.length >= 4) {
      budget1 = existingBudgets.find(b => b.description === "Monthly Rent")!;
      budget2 = existingBudgets.find(b => b.description === "Groceries")!;
      budget3 = existingBudgets.find(b => b.description === "Utilities")!;
      budget4 = existingBudgets.find(b => b.description === "Transport")!;
      console.log("⚠️  Budget items for", currentMonth, "already exist, using existing");
    } else {
      // Create budget items
      const [newBudget1, newBudget2, newBudget3, newBudget4] = await db
        .insert(budgetItems)
        .values([
          {
            householdId: household.id,
            monthYear: currentMonth,
            description: "Monthly Rent",
            amount: "1500.00",
            categoryId: rent.id,
            allocatedToAccountId: primaryAccount.id,
          },
          {
            householdId: household.id,
            monthYear: currentMonth,
            description: "Groceries",
            amount: "800.00",
            categoryId: groceries.id,
            allocatedToAccountId: primaryAccount.id,
          },
          {
            householdId: household.id,
            monthYear: currentMonth,
            description: "Utilities",
            amount: "200.00",
            categoryId: utilities.id,
            allocatedToAccountId: sharedAccount.id,
          },
          {
            householdId: household.id,
            monthYear: currentMonth,
            description: "Transport",
            amount: "300.00",
            categoryId: transport.id,
            allocatedToAccountId: sharedAccount.id,
          },
        ])
        .returning();
      budget1 = newBudget1;
      budget2 = newBudget2;
      budget3 = newBudget3;
      budget4 = newBudget4;
      console.log("✅ Created budget items");
    }

    // Check if transactions exist for this month
    const startDate = new Date(`${currentMonth}-01`);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    const existingTransactions = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.householdId, household.id),
          gte(transactions.date, startDate),
          lte(transactions.date, endDate)
        )
      );

    if (existingTransactions.length === 0) {
      // Create transactions
      const now = new Date();
      await db.insert(transactions).values([
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 1),
        description: "Rent Payment",
        amount: "1500.00",
        categoryId: rent.id,
        paidFromAccountId: primaryAccount.id,
        budgetItemId: budget1.id,
        notes: "Monthly rent payment",
      },
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 5),
        description: "Grocery Shopping",
        amount: "250.00",
        categoryId: groceries.id,
        paidFromAccountId: primaryAccount.id,
        budgetItemId: budget2.id,
        notes: "Weekly groceries",
      },
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 10),
        description: "Electricity Bill",
        amount: "180.00",
        categoryId: utilities.id,
        paidFromAccountId: sharedAccount.id,
        budgetItemId: budget3.id,
        notes: "Monthly electricity",
      },
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 15),
        description: "Uber Rides",
        amount: "120.00",
        categoryId: transport.id,
        paidFromAccountId: sharedAccount.id,
        budgetItemId: budget4.id,
        notes: "Transportation expenses",
      },
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 20),
        description: "Movie Tickets",
        amount: "50.00",
        categoryId: entertainment.id,
        paidFromAccountId: sharedAccount.id,
        notes: "Unplanned entertainment",
      },
      {
        householdId: household.id,
        date: new Date(now.getFullYear(), now.getMonth(), 25),
        description: "Doctor Visit",
        amount: "150.00",
        categoryId: healthcare.id,
        paidFromAccountId: primaryAccount.id,
        notes: "Unplanned healthcare expense",
      },
      ]);

      console.log("✅ Created transactions");
    } else {
      console.log("⚠️  Transactions for", currentMonth, "already exist");
    }

    console.log("\n🎉 Seed completed successfully!");
    console.log("\n📝 Demo Credentials:");
    console.log("   Admin: admin@demo.com / demo123");
    console.log("   Member: member@demo.com / demo123");
    console.log("\n💡 IMPORTANT: Log in with admin@demo.com to see the demo data!");
    console.log("   If you created a new account, it won't have demo data.");
    console.log("   Demo data is only in the 'Demo Household'.");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}


// Run seed if this file is executed directly
if (require.main === module) {
  seed()
    .then(() => {
      console.log("✅ Seed script completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("❌ Seed script failed:", error);
      process.exit(1);
    });
}

export default seed;

