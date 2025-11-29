"use server";

import { db } from "@/src/db";
import { expenseTemplates, categories, paymentAccounts, budgetItems } from "@/src/db/schema";
import { eq, and, like, or } from "drizzle-orm";
import { getServerSession } from "@/src/lib/get-session";
import { z } from "zod";

const templateSchema = z.object({
  description: z.string().min(1),
  amount: z.string(),
  categoryId: z.string().uuid(),
  accountId: z.string().uuid(),
});

async function getHouseholdId() {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }
  return session.user.householdId;
}

export async function getExpenseTemplates(search?: string) {
  const householdId = await getHouseholdId();

  let query = db
    .select({
      id: expenseTemplates.id,
      description: expenseTemplates.description,
      amount: expenseTemplates.amount,
      categoryId: expenseTemplates.categoryId,
      categoryName: categories.name,
      categoryType: categories.type,
      accountId: expenseTemplates.accountId,
      accountName: paymentAccounts.name,
    })
    .from(expenseTemplates)
    .innerJoin(categories, eq(expenseTemplates.categoryId, categories.id))
    .innerJoin(paymentAccounts, eq(expenseTemplates.accountId, paymentAccounts.id))
    .where(eq(expenseTemplates.householdId, householdId));

  if (search) {
    query = query.where(
      and(
        eq(expenseTemplates.householdId, householdId),
        like(expenseTemplates.description, `%${search}%`)
      )
    ) as any;
  }

  return await query.orderBy(expenseTemplates.description);
}

export async function createExpenseTemplate(data: z.infer<typeof templateSchema>) {
  const householdId = await getHouseholdId();
  const validated = templateSchema.parse(data);

  const [template] = await db
    .insert(expenseTemplates)
    .values({
      householdId,
      description: validated.description,
      amount: validated.amount,
      categoryId: validated.categoryId,
      accountId: validated.accountId,
    })
    .returning();

  return { success: true, templateId: template.id };
}

export async function deleteExpenseTemplate(templateId: string) {
  const householdId = await getHouseholdId();

  await db
    .delete(expenseTemplates)
    .where(and(eq(expenseTemplates.id, templateId), eq(expenseTemplates.householdId, householdId)));

  return { success: true };
}

export async function copyBudgetFromMonth(sourceMonth: string, targetMonth: string) {
  const householdId = await getHouseholdId();

  // Get budget items from source month
  const sourceItems = await db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.householdId, householdId), eq(budgetItems.monthYear, sourceMonth)));

  if (sourceItems.length === 0) {
    return { success: false, error: "No budget items found in source month" };
  }

  // Check if target month already has items
  const existingItems = await db
    .select()
    .from(budgetItems)
    .where(and(eq(budgetItems.householdId, householdId), eq(budgetItems.monthYear, targetMonth)))
    .limit(1);

  if (existingItems.length > 0) {
    return { success: false, error: "Target month already has budget items" };
  }

  // Copy items to target month
  const newItems = sourceItems.map((item) => ({
    householdId: item.householdId,
    monthYear: targetMonth,
    description: item.description,
    amount: item.amount,
    categoryId: item.categoryId,
    allocatedToAccountId: item.allocatedToAccountId,
  }));

  await db.insert(budgetItems).values(newItems);

  return { success: true, count: newItems.length };
}

