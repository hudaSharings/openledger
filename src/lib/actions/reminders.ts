"use server";

import { db } from "@/src/db";
import { paymentReminders, pushSubscriptions, budgetItems, users } from "@/src/db/schema";
import { eq, and, lte, gte, sql, inArray } from "drizzle-orm";
import { getServerSession } from "@/src/lib/get-session";
import { reminderSchema } from "@/src/lib/validations";
import { z } from "zod";

async function getHouseholdId() {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized: No household ID");
  }
  return session.user.householdId;
}

async function getUserId() {
  const session = await getServerSession();
  if (!session?.user?.id) {
    throw new Error("Unauthorized: No user ID");
  }
  return session.user.id;
}

export async function createReminder(data: z.infer<typeof reminderSchema>) {
  const householdId = await getHouseholdId();

  // If budgetItemId is provided, verify it belongs to the household
  if (data.budgetItemId) {
    const [budgetItem] = await db
      .select()
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.id, data.budgetItemId),
          eq(budgetItems.householdId, householdId)
        )
      )
      .limit(1);

    if (!budgetItem) {
      return { error: "Budget item not found or unauthorized" };
    }
  }

  const [reminder] = await db
    .insert(paymentReminders)
    .values({
      householdId,
      budgetItemId: data.budgetItemId || null,
      description: data.description,
      amount: data.amount,
      reminderDate: new Date(data.reminderDate),
      daysBeforeDueDate: data.daysBeforeDueDate?.toString() || "7",
      reminderIntervalDays: data.reminderIntervalDays?.toString() || "1",
      isRecurring: data.isRecurring,
      recurringPattern: data.recurringPattern || null,
      isActive: data.isActive,
      notified: false,
      lastNotifiedDate: null,
    })
    .returning();

  return { success: true, reminderId: reminder.id };
}

export async function getReminders() {
  const householdId = await getHouseholdId();

  const reminders = await db
    .select({
      id: paymentReminders.id,
      budgetItemId: paymentReminders.budgetItemId,
      description: paymentReminders.description,
      amount: paymentReminders.amount,
      reminderDate: paymentReminders.reminderDate,
      daysBeforeDueDate: paymentReminders.daysBeforeDueDate,
      reminderIntervalDays: paymentReminders.reminderIntervalDays,
      isRecurring: paymentReminders.isRecurring,
      recurringPattern: paymentReminders.recurringPattern,
      isActive: paymentReminders.isActive,
      notified: paymentReminders.notified,
      lastNotifiedDate: paymentReminders.lastNotifiedDate,
      createdAt: paymentReminders.createdAt,
      updatedAt: paymentReminders.updatedAt,
    })
    .from(paymentReminders)
    .where(eq(paymentReminders.householdId, householdId))
    .orderBy(paymentReminders.reminderDate);

  return reminders;
}

export async function getActiveReminders() {
  const householdId = await getHouseholdId();

  const now = new Date();
  
  // Get all active reminders for the household
  const allReminders = await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.householdId, householdId),
        eq(paymentReminders.isActive, true)
      )
    )
    .orderBy(paymentReminders.reminderDate);

  // Filter reminders that should be notified based on new logic:
  // 1. Due date must be in the future or today (don't notify after due date)
  // 2. Current date must be within the "daysBeforeDueDate" window
  // 3. Enough time must have passed since last notification (based on reminderIntervalDays)
  const remindersToNotify = allReminders.filter((reminder) => {
    const dueDate = new Date(reminder.reminderDate);
    const daysBefore = parseInt(reminder.daysBeforeDueDate || "7");
    const intervalDays = parseInt(reminder.reminderIntervalDays || "1");
    
    // Calculate the start date (daysBeforeDueDate before due date)
    const startDate = new Date(dueDate);
    startDate.setDate(startDate.getDate() - daysBefore);
    
    // Don't notify if:
    // - Due date has passed
    // - Current date is before the start date
    if (now > dueDate || now < startDate) {
      return false;
    }
    
    // Check if enough time has passed since last notification
    if (reminder.lastNotifiedDate) {
      const lastNotified = new Date(reminder.lastNotifiedDate);
      const daysSinceLastNotification = Math.floor((now.getTime() - lastNotified.getTime()) / (1000 * 60 * 60 * 24));
      
      // If not enough days have passed, skip
      if (daysSinceLastNotification < intervalDays) {
        return false;
      }
    }
    
    // If never notified, check if we're within the window
    if (!reminder.lastNotifiedDate && now >= startDate) {
      return true;
    }
    
    // If last notified and enough time has passed, notify
    return true;
  });

  return remindersToNotify;
}

export async function updateReminder(
  reminderId: string,
  data: Partial<z.infer<typeof reminderSchema>>
) {
  const householdId = await getHouseholdId();

  // Verify the reminder belongs to the household
  const [existing] = await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.id, reminderId),
        eq(paymentReminders.householdId, householdId)
      )
    )
    .limit(1);

  if (!existing) {
    return { error: "Reminder not found or unauthorized" };
  }

  // If budgetItemId is provided, verify it belongs to the household
  if (data.budgetItemId) {
    const [budgetItem] = await db
      .select()
      .from(budgetItems)
      .where(
        and(
          eq(budgetItems.id, data.budgetItemId),
          eq(budgetItems.householdId, householdId)
        )
      )
      .limit(1);

    if (!budgetItem) {
      return { error: "Budget item not found or unauthorized" };
    }
  }

  const updateData: any = {
    updatedAt: new Date(),
  };

  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.reminderDate !== undefined) updateData.reminderDate = new Date(data.reminderDate);
  if (data.daysBeforeDueDate !== undefined) updateData.daysBeforeDueDate = data.daysBeforeDueDate.toString();
  if (data.reminderIntervalDays !== undefined) updateData.reminderIntervalDays = data.reminderIntervalDays.toString();
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
  if (data.recurringPattern !== undefined) updateData.recurringPattern = data.recurringPattern;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;
  if (data.budgetItemId !== undefined) updateData.budgetItemId = data.budgetItemId || null;

  await db
    .update(paymentReminders)
    .set(updateData)
    .where(eq(paymentReminders.id, reminderId));

  return { success: true };
}

export async function deleteReminder(reminderId: string) {
  const householdId = await getHouseholdId();

  // Verify the reminder belongs to the household
  const [existing] = await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.id, reminderId),
        eq(paymentReminders.householdId, householdId)
      )
    )
    .limit(1);

  if (!existing) {
    return { error: "Reminder not found or unauthorized" };
  }

  await db.delete(paymentReminders).where(eq(paymentReminders.id, reminderId));

  return { success: true };
}

export async function markReminderAsNotified(reminderId: string) {
  const householdId = await getHouseholdId();

  // Verify the reminder belongs to the household
  const [existing] = await db
    .select()
    .from(paymentReminders)
    .where(
      and(
        eq(paymentReminders.id, reminderId),
        eq(paymentReminders.householdId, householdId)
      )
    )
    .limit(1);

  if (!existing) {
    return { error: "Reminder not found or unauthorized" };
  }

  await db
    .update(paymentReminders)
    .set({ 
      notified: true, 
      lastNotifiedDate: new Date(),
      updatedAt: new Date() 
    })
    .where(eq(paymentReminders.id, reminderId));

  return { success: true };
}

// Push subscription management
export async function savePushSubscription(
  endpoint: string,
  p256dh: string,
  auth: string
) {
  const userId = await getUserId();

  // Check if subscription already exists
  const [existing] = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.endpoint, endpoint))
    .limit(1);

  if (existing) {
    // Update existing subscription
    await db
      .update(pushSubscriptions)
      .set({
        p256dh,
        auth,
      })
      .where(eq(pushSubscriptions.id, existing.id));
    return { success: true, subscriptionId: existing.id };
  }

  // Create new subscription
  const [subscription] = await db
    .insert(pushSubscriptions)
    .values({
      userId,
      endpoint,
      p256dh,
      auth,
    })
    .returning();

  return { success: true, subscriptionId: subscription.id };
}

export async function getPushSubscriptions() {
  const userId = await getUserId();

  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));

  return subscriptions;
}

// Get all push subscriptions for all users in the household
export async function getHouseholdPushSubscriptions() {
  const householdId = await getHouseholdId();

  // Get all users in the household
  const householdUsers = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.householdId, householdId));

  if (householdUsers.length === 0) {
    return [];
  }

  // Get all push subscriptions for all household users
  const userIds = householdUsers.map((u) => u.id);
  const subscriptions = await db
    .select()
    .from(pushSubscriptions)
    .where(inArray(pushSubscriptions.userId, userIds));

  return subscriptions;
}

export async function deletePushSubscription(subscriptionId: string) {
  const userId = await getUserId();

  // Verify the subscription belongs to the user
  const [existing] = await db
    .select()
    .from(pushSubscriptions)
    .where(
      and(
        eq(pushSubscriptions.id, subscriptionId),
        eq(pushSubscriptions.userId, userId)
      )
    )
    .limit(1);

  if (!existing) {
    return { error: "Subscription not found or unauthorized" };
  }

  await db.delete(pushSubscriptions).where(eq(pushSubscriptions.id, subscriptionId));

  return { success: true };
}

