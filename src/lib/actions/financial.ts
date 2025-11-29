"use server";

import { db } from "@/src/db";
import {
  incomeEntries,
  fundAllocations,
  budgetItems,
  transactions,
  categories,
  paymentAccounts,
} from "@/src/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { incomeSchema, budgetItemSchema, transactionSchema } from "@/src/lib/validations";
import { z } from "zod";
import { getServerSession } from "@/src/lib/get-session";

async function getHouseholdId() {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }
  return session.user.householdId;
}

export async function createIncome(data: z.infer<typeof incomeSchema>) {
  const householdId = await getHouseholdId();
  const validated = incomeSchema.parse(data);

  const totalAllocated = validated.allocations.reduce(
    (sum, alloc) => sum + parseFloat(alloc.amount),
    0
  );

  if (Math.abs(totalAllocated - parseFloat(validated.totalAmount)) > 0.01) {
    return { error: "Total allocations must equal total income" };
  }

  const result = await db.transaction(async (tx) => {
    const [income] = await tx
      .insert(incomeEntries)
      .values({
        householdId,
        monthYear: validated.monthYear,
        totalAmount: validated.totalAmount,
      })
      .returning();

    await tx.insert(fundAllocations).values(
      validated.allocations.map((alloc) => ({
        incomeId: income.id,
        accountId: alloc.accountId,
        allocatedAmount: alloc.amount,
      }))
    );

    return income;
  });

  return { success: true, incomeId: result.id };
}

export async function createBudgetItem(data: z.infer<typeof budgetItemSchema>) {
  const householdId = await getHouseholdId();
  const validated = budgetItemSchema.parse(data);

  const [budgetItem] = await db
    .insert(budgetItems)
    .values({
      householdId,
      monthYear: validated.monthYear,
      description: validated.description,
      amount: validated.amount,
      categoryId: validated.categoryId,
      allocatedToAccountId: validated.allocatedToAccountId,
      color: validated.color || "blue",
    })
    .returning();

  return { success: true, budgetItemId: budgetItem.id };
}

export async function updateBudgetItem(
  budgetItemId: string,
  data: Omit<z.infer<typeof budgetItemSchema>, "monthYear">
) {
  try {
    const householdId = await getHouseholdId();
    
    // Create a schema without monthYear for validation
    const updateSchema = budgetItemSchema.omit({ monthYear: true });
    const validated = updateSchema.parse(data);

    // Verify the budget item belongs to the household
    const [existing] = await db
      .select()
      .from(budgetItems)
      .where(and(eq(budgetItems.id, budgetItemId), eq(budgetItems.householdId, householdId)))
      .limit(1);

    if (!existing) {
      return { error: "Budget item not found or unauthorized" };
    }

    await db
      .update(budgetItems)
      .set({
        description: validated.description,
        amount: validated.amount,
        categoryId: validated.categoryId,
        allocatedToAccountId: validated.allocatedToAccountId,
        color: validated.color || "blue",
      })
      .where(eq(budgetItems.id, budgetItemId));

    return { success: true };
  } catch (error: any) {
    console.error("Error updating budget item:", error);
    return { error: error.message || "Failed to update budget item" };
  }
}

export async function deleteBudgetItem(budgetItemId: string) {
  const householdId = await getHouseholdId();

  // Verify the budget item belongs to the household
  const [existing] = await db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.id, budgetItemId), eq(budgetItems.householdId, householdId)))
    .limit(1);

  if (!existing) {
    return { error: "Budget item not found or unauthorized" };
  }

  await db.delete(budgetItems).where(eq(budgetItems.id, budgetItemId));

  return { success: true };
}

export async function createTransaction(data: z.infer<typeof transactionSchema>) {
  const householdId = await getHouseholdId();
  const validated = transactionSchema.parse(data);

  const [transaction] = await db
    .insert(transactions)
    .values({
      householdId,
      date: new Date(validated.date),
      description: validated.description,
      amount: validated.amount,
      categoryId: validated.categoryId,
      paidFromAccountId: validated.paidFromAccountId,
      notes: validated.notes,
      budgetItemId: validated.budgetItemId || null,
    })
    .returning();

  return { success: true, transactionId: transaction.id };
}

export async function getDashboardData(monthYear: string) {
  const householdId = await getHouseholdId();

  // Get income for the month
  const [income] = await db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.householdId, householdId),
        eq(incomeEntries.monthYear, monthYear)
      )
    )
    .limit(1);

  // Get fund allocations
  const allocations = income
    ? await db
        .select({
          accountId: paymentAccounts.id,
          accountName: paymentAccounts.name,
          allocatedAmount: fundAllocations.allocatedAmount,
        })
        .from(fundAllocations)
        .innerJoin(incomeEntries, eq(fundAllocations.incomeId, income.id))
        .innerJoin(paymentAccounts, eq(fundAllocations.accountId, paymentAccounts.id))
    : [];

  // Get budget items
  const budgetItemsList = await db
    .select({
      id: budgetItems.id,
      description: budgetItems.description,
      amount: budgetItems.amount,
      categoryId: budgetItems.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      accountId: budgetItems.allocatedToAccountId,
    })
    .from(budgetItems)
    .innerJoin(categories, eq(budgetItems.categoryId, categories.id))
    .where(
      and(
        eq(budgetItems.householdId, householdId),
        eq(budgetItems.monthYear, monthYear)
      )
    );

  // Get transactions for the month
  const startDate = new Date(`${monthYear}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const transactionsList = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      paidFromAccountId: transactions.paidFromAccountId,
      notes: transactions.notes,
      budgetItemId: transactions.budgetItemId,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .orderBy(desc(transactions.date));

  // Calculate totals
  const totalPlanned = budgetItemsList.reduce(
    (sum, item) => sum + parseFloat(item.amount),
    0
  );

  const plannedTransactions = transactionsList.filter((t) => t.budgetItemId);
  const unplannedTransactions = transactionsList.filter((t) => !t.budgetItemId);

  const totalPlannedActual = plannedTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0
  );

  const totalUnplannedActual = unplannedTransactions.reduce(
    (sum, t) => sum + parseFloat(t.amount),
    0
  );

  const totalActual = totalPlannedActual + totalUnplannedActual;

  // Calculate remaining balance per account
  const accountBalances = allocations.map((alloc) => {
    const accountTransactions = transactionsList.filter(
      (t) => t.paidFromAccountId === alloc.accountId
    );
    const spent = accountTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );
    return {
      accountId: alloc.accountId,
      accountName: alloc.accountName,
      allocated: parseFloat(alloc.allocatedAmount),
      spent,
      remaining: parseFloat(alloc.allocatedAmount) - spent,
    };
  });

  // Get top 3 unplanned categories
  const unplannedByCategory = unplannedTransactions.reduce(
    (acc, t) => {
      const key = t.categoryName;
      if (!acc[key]) {
        acc[key] = { name: key, amount: 0, type: t.categoryType };
      }
      acc[key].amount += parseFloat(t.amount);
      return acc;
    },
    {} as Record<string, { name: string; amount: number; type: string }>
  );

  const topUnplannedCategories = Object.values(unplannedByCategory)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3);

  // Category data for chart
  const categoryData = budgetItemsList.map((item) => {
    const categoryTransactions = transactionsList.filter(
      (t) => t.categoryId === item.categoryId
    );
    const actual = categoryTransactions.reduce(
      (sum, t) => sum + parseFloat(t.amount),
      0
    );
    return {
      category: item.categoryName,
      planned: item.amount,
      actual: actual.toString(),
    };
  });

  return {
    income: income ? parseFloat(income.totalAmount) : 0,
    totalPlanned,
    totalActual,
    totalPlannedActual,
    totalUnplannedActual,
    accountBalances,
    topUnplannedCategories,
    categoryData,
  };
}

export async function getCategories() {
  const householdId = await getHouseholdId();

  const categoriesList = await db
    .select()
    .from(categories)
    .where(eq(categories.householdId, householdId))
    .orderBy(categories.name);

  return categoriesList;
}

export async function getPaymentAccounts() {
  const householdId = await getHouseholdId();

  const accounts = await db
    .select()
    .from(paymentAccounts)
    .where(eq(paymentAccounts.householdId, householdId))
    .orderBy(paymentAccounts.name);

  return accounts;
}

export async function getBudgetItems(monthYear: string) {
  const householdId = await getHouseholdId();

  // Get budget items
  const items = await db
    .select({
      id: budgetItems.id,
      description: budgetItems.description,
      amount: budgetItems.amount,
      categoryId: budgetItems.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      accountId: budgetItems.allocatedToAccountId,
      accountName: paymentAccounts.name,
      color: budgetItems.color,
    })
    .from(budgetItems)
    .innerJoin(categories, eq(budgetItems.categoryId, categories.id))
    .innerJoin(paymentAccounts, eq(budgetItems.allocatedToAccountId, paymentAccounts.id))
    .where(
      and(
        eq(budgetItems.householdId, householdId),
        eq(budgetItems.monthYear, monthYear)
      )
    )
    .orderBy(budgetItems.description);

  // Get start and end dates for the month
  const startDate = new Date(`${monthYear}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  // Get all transactions for this month, grouped by budgetItemId
  const transactionsList = await db
    .select({
      budgetItemId: transactions.budgetItemId,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    );

  // Calculate actual spent per budget item
  const spentByBudgetItem: Record<string, number> = {};
  transactionsList.forEach((t) => {
    if (t.budgetItemId) {
      const budgetId = t.budgetItemId;
      if (!spentByBudgetItem[budgetId]) {
        spentByBudgetItem[budgetId] = 0;
      }
      spentByBudgetItem[budgetId] += parseFloat(t.amount);
    }
  });

  // Map items with actual spent amounts
  return items.map((item) => ({
    ...item,
    categoryType: item.categoryType || "ad_hoc",
    actualSpent: spentByBudgetItem[item.id] || 0,
  }));
}

export async function createCategory(name: string, type: "mandatory" | "periodic" | "ad_hoc") {
  const householdId = await getHouseholdId();

  const [category] = await db
    .insert(categories)
    .values({
      householdId,
      name,
      type,
    })
    .returning();

  return { success: true, categoryId: category.id };
}

export async function getMonthlyReport(monthYear: string) {
  const householdId = await getHouseholdId();

  const startDate = new Date(`${monthYear}-01`);
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  const transactionsList = await db
    .select({
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryName: categories.name,
      accountName: paymentAccounts.name,
      notes: transactions.notes,
      budgetItemDescription: budgetItems.description,
    })
    .from(transactions)
    .innerJoin(categories, eq(transactions.categoryId, categories.id))
    .innerJoin(paymentAccounts, eq(transactions.paidFromAccountId, paymentAccounts.id))
    .leftJoin(budgetItems, eq(transactions.budgetItemId, budgetItems.id))
    .where(
      and(
        eq(transactions.householdId, householdId),
        gte(transactions.date, startDate),
        lte(transactions.date, endDate)
      )
    )
    .orderBy(transactions.date);

  return transactionsList;
}
