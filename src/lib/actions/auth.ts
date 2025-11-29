"use server";

import { db } from "@/src/db";
import { users, households, paymentAccounts, inviteTokens } from "@/src/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { registerSchema, inviteSchema } from "@/src/lib/validations";
import { z } from "zod";
import { randomBytes } from "crypto";

export async function registerUser(data: z.infer<typeof registerSchema>) {
  const validated = registerSchema.parse(data);

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: "User with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(validated.password, 10);

  // Create household and user in a transaction
  const result = await db.transaction(async (tx) => {
    // Create household
    const [household] = await tx
      .insert(households)
      .values({
        name: validated.householdName,
        createdBy: "", // Will be updated after user creation
      })
      .returning();

    // Create user
    const [user] = await tx
      .insert(users)
      .values({
        email: validated.email,
        passwordHash,
        householdId: household.id,
        role: "admin",
      })
      .returning();

    // Update household createdBy
    await tx
      .update(households)
      .set({ createdBy: user.id })
      .where(eq(households.id, household.id));

    // Create default payment accounts
    await tx.insert(paymentAccounts).values([
      {
        householdId: household.id,
        name: "Primary Account",
      },
      {
        householdId: household.id,
        name: "Shared Allocation",
      },
    ]);

    return { user, household };
  });

  return { success: true, userId: result.user.id };
}

export async function createInviteToken(householdId: string, email: string) {
  const validated = inviteSchema.parse({ email });

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, validated.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: "User with this email already exists" };
  }

  // Check if there's already a valid invite for this email
  const existingInvite = await db
    .select()
    .from(inviteTokens)
    .where(
      and(
        eq(inviteTokens.email, validated.email),
        eq(inviteTokens.householdId, householdId),
        eq(inviteTokens.used, false),
        gt(inviteTokens.expiresAt, new Date())
      )
    )
    .limit(1);

  if (existingInvite.length > 0) {
    return { error: "An active invite already exists for this email" };
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

  await db.insert(inviteTokens).values({
    token,
    householdId,
    email: validated.email,
    expiresAt,
    used: false,
  });

  return { success: true, token };
}

export async function validateInviteToken(token: string) {
  const invite = await db
    .select()
    .from(inviteTokens)
    .where(eq(inviteTokens.token, token))
    .limit(1);

  if (invite.length === 0) {
    return { error: "Invalid invite token" };
  }

  const [inviteData] = invite;

  if (inviteData.used) {
    return { error: "This invite has already been used" };
  }

  if (new Date() > inviteData.expiresAt) {
    return { error: "This invite has expired" };
  }

  return { success: true, invite: inviteData };
}

export async function acceptInvite(token: string, password: string) {
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters" };
  }

  const tokenValidation = await validateInviteToken(token);
  if ("error" in tokenValidation) {
    return tokenValidation;
  }

  const { invite } = tokenValidation;

  // Check if user already exists
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.email, invite.email))
    .limit(1);

  if (existingUser.length > 0) {
    return { error: "User with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await db.transaction(async (tx) => {
    // Create user
    await tx.insert(users).values({
      email: invite.email,
      passwordHash,
      householdId: invite.householdId,
      role: "member",
    });

    // Mark invite as used
    await tx
      .update(inviteTokens)
      .set({ used: true })
      .where(eq(inviteTokens.token, token));
  });

  return { success: true };
}

