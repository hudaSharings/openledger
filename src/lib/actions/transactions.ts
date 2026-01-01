"use server";

import { db } from "@/src/db";
import { transactions, categories, paymentAccounts, budgetItems } from "@/src/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { getServerSession } from "@/src/lib/get-session";

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
