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
import { eq, and, gte, lte, sql, desc, inArray } from "drizzle-orm";
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
        description: validated.description || null,
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

export async function getIncomeForMonth(monthYear: string) {
  const householdId = await getHouseholdId();

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

  if (!income) {
    return null;
  }

  const allocations = await db
    .select({
      accountId: paymentAccounts.id,
      accountName: paymentAccounts.name,
      allocatedAmount: fundAllocations.allocatedAmount,
    })
    .from(fundAllocations)
    .innerJoin(paymentAccounts, eq(fundAllocations.accountId, paymentAccounts.id))
    .where(eq(fundAllocations.incomeId, income.id));

  return {
    income,
    allocations,
  };
}

// Get all income entries for a month (supports multiple entries)
export async function getAllIncomeForMonth(monthYear: string) {
  const householdId = await getHouseholdId();

  const incomeList = await db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.householdId, householdId),
        eq(incomeEntries.monthYear, monthYear)
      )
    )
    .orderBy(desc(incomeEntries.createdAt));

  if (incomeList.length === 0) {
    return [];
  }

  // Get allocations for all income entries
  const incomeIds = incomeList.map((income) => income.id);
  const allAllocations = incomeIds.length > 0
    ? await db
        .select({
          incomeId: fundAllocations.incomeId,
          accountId: paymentAccounts.id,
          accountName: paymentAccounts.name,
          allocatedAmount: fundAllocations.allocatedAmount,
        })
        .from(fundAllocations)
        .innerJoin(paymentAccounts, eq(fundAllocations.accountId, paymentAccounts.id))
        .where(inArray(fundAllocations.incomeId, incomeIds))
    : [];

  // Group allocations by income ID
  const allocationsByIncome = allAllocations.reduce(
    (acc, alloc) => {
      if (!acc[alloc.incomeId]) {
        acc[alloc.incomeId] = [];
      }
      acc[alloc.incomeId].push({
        accountId: alloc.accountId,
        accountName: alloc.accountName,
        allocatedAmount: alloc.allocatedAmount,
      });
      return acc;
    },
    {} as Record<string, Array<{ accountId: string; accountName: string; allocatedAmount: string }>>
  );

  return incomeList.map((income) => ({
    income,
    allocations: allocationsByIncome[income.id] || [],
  }));
}

export async function deleteIncome(incomeId: string) {
  const householdId = await getHouseholdId();

  // Verify the income belongs to the household
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.id, incomeId), eq(incomeEntries.householdId, householdId)))
    .limit(1);

  if (!existing) {
    return { error: "Income entry not found or unauthorized" };
  }

  // Delete will cascade to fund allocations
  await db.delete(incomeEntries).where(eq(incomeEntries.id, incomeId));

  return { success: true };
}

export async function updateIncome(incomeId: string, data: z.infer<typeof incomeSchema>) {
  const householdId = await getHouseholdId();
  const validated = incomeSchema.parse(data);

  const totalAllocated = validated.allocations.reduce(
    (sum, alloc) => sum + parseFloat(alloc.amount),
    0
  );

  if (Math.abs(totalAllocated - parseFloat(validated.totalAmount)) > 0.01) {
    return { error: "Total allocations must equal total income" };
  }

  // Verify the income belongs to the household
  const [existing] = await db
    .select()
    .from(incomeEntries)
    .where(and(eq(incomeEntries.id, incomeId), eq(incomeEntries.householdId, householdId)))
    .limit(1);

  if (!existing) {
    return { error: "Income entry not found" };
  }

  const result = await db.transaction(async (tx) => {
    // Update income
    const [income] = await tx
      .update(incomeEntries)
      .set({
        description: validated.description || null,
        totalAmount: validated.totalAmount,
      })
      .where(eq(incomeEntries.id, incomeId))
      .returning();

    // Delete old allocations
    await tx.delete(fundAllocations).where(eq(fundAllocations.incomeId, incomeId));

    // Insert new allocations
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

  // Get all income entries for the month (should be only one, but handle multiple)
  const incomeEntriesList = await db
    .select()
    .from(incomeEntries)
    .where(
      and(
        eq(incomeEntries.householdId, householdId),
        eq(incomeEntries.monthYear, monthYear)
      )
    );

  // Sum all income entries for the month (in case there are duplicates)
  const totalIncome = incomeEntriesList.reduce(
    (sum, entry) => sum + parseFloat(entry.totalAmount),
    0
  );

  // Get all income IDs for the month
  const incomeIds = incomeEntriesList.map((entry) => entry.id);

  // Get fund allocations for all income entries of this month
  const allocations = incomeIds.length > 0
    ? await db
        .select({
          accountId: paymentAccounts.id,
          accountName: paymentAccounts.name,
          allocatedAmount: fundAllocations.allocatedAmount,
        })
        .from(fundAllocations)
        .innerJoin(paymentAccounts, eq(fundAllocations.accountId, paymentAccounts.id))
        .where(inArray(fundAllocations.incomeId, incomeIds))
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
  // Group allocations by accountId to handle any duplicates and sum them
  const allocationsByAccount = allocations.reduce(
    (acc, alloc) => {
      const accountId = alloc.accountId;
      if (!acc[accountId]) {
        acc[accountId] = {
          accountId: alloc.accountId,
          accountName: alloc.accountName,
          allocated: 0,
        };
      }
      acc[accountId].allocated += parseFloat(alloc.allocatedAmount);
      return acc;
    },
    {} as Record<string, { accountId: string; accountName: string; allocated: number }>
  );

  const accountBalances = Object.values(allocationsByAccount).map((alloc) => {
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
      allocated: alloc.allocated,
      spent,
      remaining: alloc.allocated - spent,
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

  // Group budget items by category and calculate totals
  const budgetByCategory = budgetItemsList.reduce(
    (acc, item) => {
      const categoryName = item.categoryName;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: categoryName,
          categoryType: item.categoryType,
          categoryId: item.categoryId,
          planned: 0,
        };
      }
      acc[categoryName].planned += parseFloat(item.amount);
      return acc;
    },
    {} as Record<string, { category: string; categoryType: string; categoryId: string; planned: number }>
  );

  // Calculate actual spent per category (all transactions in that category)
  // Get all unique category IDs that have budget items
  const categoryIdsWithBudget = new Set(budgetItemsList.map(item => item.categoryId));
  const actualByCategory: Record<string, number> = {};
  
  // Sum all transactions for categories that have budget items
  transactionsList.forEach((t) => {
    if (categoryIdsWithBudget.has(t.categoryId)) {
      const categoryName = t.categoryName;
      if (!actualByCategory[categoryName]) {
        actualByCategory[categoryName] = 0;
      }
      actualByCategory[categoryName] += parseFloat(t.amount);
    }
  });

  // Convert to array for chart data
  const categoryData = Object.values(budgetByCategory).map((cat) => {
    const actual = actualByCategory[cat.category] || 0;
    return {
      category: cat.category,
      planned: cat.planned.toString(),
      actual: actual.toString(),
    };
  });

  // Budget by category summary (for the new section)
  const budgetByCategorySummary = Object.values(budgetByCategory).map((cat) => {
    const actual = actualByCategory[cat.category] || 0;
    return {
      categoryName: cat.category,
      categoryType: cat.categoryType,
      budgetAmount: cat.planned,
      actualSpent: actual,
      remaining: cat.planned - actual,
    };
  }).sort((a, b) => b.budgetAmount - a.budgetAmount);

  return {
    income: totalIncome,
    totalPlanned,
    totalActual,
    totalPlannedActual,
    totalUnplannedActual,
    accountBalances,
    topUnplannedCategories,
    categoryData,
    budgetByCategory: budgetByCategorySummary,
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

export async function getBudgetByCategory(monthYear: string) {
  const householdId = await getHouseholdId();

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

  // Group budget items by category and calculate totals
  const budgetByCategory = budgetItemsList.reduce(
    (acc, item) => {
      const categoryName = item.categoryName;
      if (!acc[categoryName]) {
        acc[categoryName] = {
          category: categoryName,
          categoryType: item.categoryType,
          categoryId: item.categoryId,
          planned: 0,
        };
      }
      acc[categoryName].planned += parseFloat(item.amount);
      return acc;
    },
    {} as Record<string, { category: string; categoryType: string; categoryId: string; planned: number }>
  );

  // Calculate actual spent per category (all transactions in that category)
  const categoryIdsWithBudget = new Set(budgetItemsList.map(item => item.categoryId));
  const actualByCategory: Record<string, number> = {};
  
  // Sum all transactions for categories that have budget items
  transactionsList.forEach((t) => {
    if (categoryIdsWithBudget.has(t.categoryId)) {
      const categoryName = t.categoryName;
      if (!actualByCategory[categoryName]) {
        actualByCategory[categoryName] = 0;
      }
      actualByCategory[categoryName] += parseFloat(t.amount);
    }
  });

  // Budget by category summary
  const budgetByCategorySummary = Object.values(budgetByCategory).map((cat) => {
    const actual = actualByCategory[cat.category] || 0;
    return {
      categoryName: cat.category,
      categoryType: cat.categoryType,
      budgetAmount: cat.planned,
      actualSpent: actual,
      remaining: cat.planned - actual,
    };
  }).sort((a, b) => b.budgetAmount - a.budgetAmount);

  return budgetByCategorySummary;
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
