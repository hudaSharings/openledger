import { pgTable, uuid, varchar, text, timestamp, decimal, pgEnum, boolean } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "member"]);
export const categoryTypeEnum = pgEnum("category_type", ["mandatory", "periodic", "ad_hoc"]);

// Households table
export const households = pgTable("households", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  createdBy: uuid("created_by"), // Nullable - will be set after user creation
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  role: userRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Invite tokens table
export const inviteTokens = pgTable("invite_tokens", {
  token: varchar("token", { length: 255 }).primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  used: boolean("used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Payment accounts table
export const paymentAccounts = pgTable("payment_accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Income entries table
export const incomeEntries = pgTable("income_entries", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  monthYear: varchar("month_year", { length: 7 }).notNull(), // Format: "YYYY-MM"
  totalAmount: decimal("total_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Fund allocations table
export const fundAllocations = pgTable("fund_allocations", {
  id: uuid("id").defaultRandom().primaryKey(),
  incomeId: uuid("income_id").references(() => incomeEntries.id, { onDelete: "cascade" }).notNull(),
  accountId: uuid("account_id").references(() => paymentAccounts.id, { onDelete: "cascade" }).notNull(),
  allocatedAmount: decimal("allocated_amount", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Budget items table
export const budgetItems = pgTable("budget_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  monthYear: varchar("month_year", { length: 7 }).notNull(), // Format: "YYYY-MM"
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  allocatedToAccountId: uuid("allocated_to_account_id").references(() => paymentAccounts.id, { onDelete: "restrict" }).notNull(),
  color: varchar("color", { length: 20 }).default("blue"), // Color for row highlighting: red, yellow, blue, green, purple, orange, pink, gray
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Transactions table
export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  date: timestamp("date").notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  paidFromAccountId: uuid("paid_from_account_id").references(() => paymentAccounts.id, { onDelete: "restrict" }).notNull(),
  notes: text("notes"),
  budgetItemId: uuid("budget_item_id").references(() => budgetItems.id, { onDelete: "set null" }), // Optional link to budget item
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Expense templates table (reusable expense items)
export const expenseTemplates = pgTable("expense_templates", {
  id: uuid("id").defaultRandom().primaryKey(),
  householdId: uuid("household_id").references(() => households.id, { onDelete: "cascade" }).notNull(),
  description: text("description").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  categoryId: uuid("category_id").references(() => categories.id, { onDelete: "restrict" }).notNull(),
  accountId: uuid("account_id").references(() => paymentAccounts.id, { onDelete: "restrict" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const householdsRelations = relations(households, ({ many }) => ({
  users: many(users),
  paymentAccounts: many(paymentAccounts),
  incomeEntries: many(incomeEntries),
  categories: many(categories),
  budgetItems: many(budgetItems),
  transactions: many(transactions),
  inviteTokens: many(inviteTokens),
  expenseTemplates: many(expenseTemplates),
}));

export const usersRelations = relations(users, ({ one }) => ({
  household: one(households, {
    fields: [users.householdId],
    references: [households.id],
  }),
}));

export const inviteTokensRelations = relations(inviteTokens, ({ one }) => ({
  household: one(households, {
    fields: [inviteTokens.householdId],
    references: [households.id],
  }),
}));

export const paymentAccountsRelations = relations(paymentAccounts, ({ one, many }) => ({
  household: one(households, {
    fields: [paymentAccounts.householdId],
    references: [households.id],
  }),
  fundAllocations: many(fundAllocations),
  budgetItems: many(budgetItems),
  transactions: many(transactions),
}));

export const incomeEntriesRelations = relations(incomeEntries, ({ one, many }) => ({
  household: one(households, {
    fields: [incomeEntries.householdId],
    references: [households.id],
  }),
  fundAllocations: many(fundAllocations),
}));

export const fundAllocationsRelations = relations(fundAllocations, ({ one }) => ({
  income: one(incomeEntries, {
    fields: [fundAllocations.incomeId],
    references: [incomeEntries.id],
  }),
  account: one(paymentAccounts, {
    fields: [fundAllocations.accountId],
    references: [paymentAccounts.id],
  }),
}));

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  household: one(households, {
    fields: [categories.householdId],
    references: [households.id],
  }),
  budgetItems: many(budgetItems),
  transactions: many(transactions),
}));

export const budgetItemsRelations = relations(budgetItems, ({ one, many }) => ({
  household: one(households, {
    fields: [budgetItems.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [budgetItems.categoryId],
    references: [categories.id],
  }),
  account: one(paymentAccounts, {
    fields: [budgetItems.allocatedToAccountId],
    references: [paymentAccounts.id],
  }),
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  household: one(households, {
    fields: [transactions.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [transactions.categoryId],
    references: [categories.id],
  }),
  paidFromAccount: one(paymentAccounts, {
    fields: [transactions.paidFromAccountId],
    references: [paymentAccounts.id],
  }),
  budgetItem: one(budgetItems, {
    fields: [transactions.budgetItemId],
    references: [budgetItems.id],
  }),
}));

export const expenseTemplatesRelations = relations(expenseTemplates, ({ one }) => ({
  household: one(households, {
    fields: [expenseTemplates.householdId],
    references: [households.id],
  }),
  category: one(categories, {
    fields: [expenseTemplates.categoryId],
    references: [categories.id],
  }),
  account: one(paymentAccounts, {
    fields: [expenseTemplates.accountId],
    references: [paymentAccounts.id],
  }),
}));

