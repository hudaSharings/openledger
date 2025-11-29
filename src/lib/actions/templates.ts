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

  const baseConditions = [eq(expenseTemplates.householdId, householdId)];
  
  if (search) {
    baseConditions.push(like(expenseTemplates.description, `%${search}%`));
  }

  const templates = await db
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
    .where(and(...baseConditions))
    .orderBy(expenseTemplates.description);

  // Check which templates are in use
  const templatesWithUsage = await Promise.all(
    templates.map(async (template) => {
      const matchingBudgetItems = await db
        .select()
        .from(budgetItems)
        .where(
          and(
            eq(budgetItems.householdId, householdId),
            eq(budgetItems.description, template.description),
            eq(budgetItems.amount, template.amount),
            eq(budgetItems.categoryId, template.categoryId),
            eq(budgetItems.allocatedToAccountId, template.accountId)
          )
        )
        .limit(1);

      return {
        ...template,
        inUse: matchingBudgetItems.length > 0,
      };
    })
  );

  return templatesWithUsage;
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

  // Check if template exists and belongs to household
  const [template] = await db
    .select()
    .from(expenseTemplates)
    .where(and(eq(expenseTemplates.id, templateId), eq(expenseTemplates.householdId, householdId)))
    .limit(1);

  if (!template) {
    return { error: "Template not found or unauthorized" };
  }

  // Check if template is being used in any budget items
  // Note: Templates are not directly linked to budget items, but we can check by matching
  // description, amount, categoryId, and accountId
  const matchingBudgetItems = await db
    .select()
    .from(budgetItems)
    .where(
      and(
        eq(budgetItems.householdId, householdId),
        eq(budgetItems.description, template.description),
        eq(budgetItems.amount, template.amount),
        eq(budgetItems.categoryId, template.categoryId),
        eq(budgetItems.allocatedToAccountId, template.accountId)
      )
    )
    .limit(1);

  if (matchingBudgetItems.length > 0) {
    return { error: "Cannot delete template: It is being used in budget items" };
  }

  await db
    .delete(expenseTemplates)
    .where(and(eq(expenseTemplates.id, templateId), eq(expenseTemplates.householdId, householdId)));

  return { success: true };
}

export async function updateExpenseTemplate(
  templateId: string,
  data: z.infer<typeof templateSchema>
) {
  try {
    const householdId = await getHouseholdId();
    const validated = templateSchema.parse(data);

    // Check if template exists and belongs to household
    const [template] = await db
      .select()
      .from(expenseTemplates)
      .where(and(eq(expenseTemplates.id, templateId), eq(expenseTemplates.householdId, householdId)))
      .limit(1);

    if (!template) {
      return { error: "Template not found or unauthorized" };
    }

    // Check if template is being used in any budget items
    const matchingBudgetItems = await db
      .select()
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.householdId, householdId),
          eq(budgetItems.description, template.description),
          eq(budgetItems.amount, template.amount),
          eq(budgetItems.categoryId, template.categoryId),
          eq(budgetItems.allocatedToAccountId, template.accountId)
        )
      )
      .limit(1);

    if (matchingBudgetItems.length > 0) {
      return { error: "Cannot edit template: It is being used in budget items" };
    }

    await db
      .update(expenseTemplates)
      .set({
        description: validated.description,
        amount: validated.amount,
        categoryId: validated.categoryId,
        accountId: validated.accountId,
      })
      .where(eq(expenseTemplates.id, templateId));

    return { success: true };
  } catch (error: any) {
    console.error("Error updating template:", error);
    return { error: error.message || "Failed to update template" };
  }
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

