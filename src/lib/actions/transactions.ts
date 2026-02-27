"use server";

import { db } from "@/src/db";
import { transactions, categories, paymentAccounts, budgetItems } from "@/src/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getServerSession } from "@/src/lib/get-session";
import { transactionSchema } from "@/src/lib/validations";
import { z } from "zod";

export async function getTransactionsByDate(monthYear?: string) {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }

  const householdId = session.user.householdId;

  let startDate: Date;
  let endDate: Date;

  if (monthYear) {
    // Create dates in UTC to match database storage
    const [year, month] = monthYear.split("-").map(Number);
    startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)); // First day of month in UTC
    endDate = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)); // Last day of month in UTC
  } else {
    // Get current month in UTC
    const now = new Date();
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();
    startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // First day of current month in UTC
    endDate = new Date(Date.UTC(year, month + 1, 0, 23, 59, 59, 999)); // Last day of current month in UTC
  }

  const transactionsList = await db
    .select({
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      amount: transactions.amount,
      categoryId: transactions.categoryId,
      paidFromAccountId: transactions.paidFromAccountId,
      budgetItemId: transactions.budgetItemId,
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
    .orderBy(desc(transactions.date));

  // Group by date
  const grouped: Record<string, typeof transactionsList> = {};

  transactionsList.forEach((transaction) => {
    const dateKey = transaction.date.toISOString().split("T")[0]; // YYYY-MM-DD
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    grouped[dateKey].push(transaction);
  });

  // Convert to array and sort by date (newest first)
  return Object.entries(grouped)
    .sort(([dateA], [dateB]) => dateB.localeCompare(dateA))
    .map(([date, items]) => ({
      date,
      transactions: items
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .map((item) => ({
          ...item,
          time: new Date(item.date).toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
        })),
    }));
}

export async function updateTransaction(
  transactionId: string,
  data: z.infer<typeof transactionSchema>
) {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    return { error: "Unauthorized" };
  }
  if (session.user.role !== "admin") {
    return { error: "Only admins can edit transactions" };
  }

  const validated = transactionSchema.safeParse(data);
  if (!validated.success) {
    return { error: "Invalid transaction data" };
  }

  const [existing] = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.id, transactionId),
        eq(transactions.householdId, session.user.householdId)
      )
    )
    .limit(1);

  if (!existing) {
    return { error: "Transaction not found" };
  }

  await db
    .update(transactions)
    .set({
      date: new Date(validated.data.date),
      description: validated.data.description,
      amount: validated.data.amount,
      categoryId: validated.data.categoryId,
      paidFromAccountId: validated.data.paidFromAccountId,
      notes: validated.data.notes ?? null,
      budgetItemId: validated.data.budgetItemId ?? null,
    })
    .where(eq(transactions.id, transactionId));

  return { success: true };
}
