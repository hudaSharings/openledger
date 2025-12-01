"use server";

import { db } from "@/src/db";
import { users, households, paymentAccounts, inviteTokens } from "@/src/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { registerSchema, inviteSchema } from "@/src/lib/validations";
import { z } from "zod";
import { randomBytes } from "crypto";
import { getServerSession } from "@/src/lib/get-session";

export async function registerUser(data: z.infer<typeof registerSchema>) {
  try {
    const validated = registerSchema.parse(data);

    // Normalize email to lowercase
    const normalizedEmail = validated.email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return { error: "User with this email already exists" };
    }

    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Create household and user in a transaction
    const result = await db.transaction(async (tx) => {
      // Create household (createdBy will be set after user creation)
      const [household] = await tx
        .insert(households)
        .values({
          name: validated.householdName.trim(),
          createdBy: null, // Will be updated after user creation
        })
        .returning();

      if (!household) {
        throw new Error("Failed to create household");
      }

      // Create user
      const [user] = await tx
        .insert(users)
        .values({
          email: normalizedEmail,
          passwordHash,
          householdId: household.id,
          role: "admin",
        })
        .returning();

      if (!user) {
        throw new Error("Failed to create user");
      }

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
  } catch (error) {
    console.error("Registration error:", error);
    
    // Log full error details for debugging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
      
      // Check for specific database errors
      const errorMessage = error.message.toLowerCase();
      
      if (error instanceof z.ZodError) {
        return { error: "Invalid form data. Please check your inputs." };
      }
      
      // Foreign key constraint errors
      if (errorMessage.includes("foreign key") || errorMessage.includes("violates foreign key constraint")) {
        return { error: "Database constraint error. Please try again or contact support." };
      }
      
      // Unique constraint errors
      if (errorMessage.includes("unique") || errorMessage.includes("duplicate key")) {
        return { error: "A user with this email already exists." };
      }
      
      // Not null constraint errors
      if (errorMessage.includes("not null") || errorMessage.includes("null value")) {
        return { error: "Database error. Please ensure all required fields are provided." };
      }
      
      // Connection errors
      if (errorMessage.includes("connection") || errorMessage.includes("timeout") || errorMessage.includes("connect")) {
        return { error: "Database connection error. Please try again." };
      }
      
      // Return the actual error message for debugging (in production, you might want to hide this)
      return { error: error.message || "An error occurred during registration" };
    }
    
    return { error: "An unexpected error occurred. Please try again." };
  }
}

export async function createInviteToken(householdId: string, email: string) {
  // Check if user is admin
  const session = await getServerSession();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Unauthorized: Only admins can create invites" };
  }

  if (session.user.householdId !== householdId) {
    return { error: "Unauthorized: Cannot invite to different household" };
  }

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

export async function getHouseholdMembers() {
  const session = await getServerSession();
  if (!session?.user?.householdId) {
    throw new Error("Unauthorized");
  }

  const members = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.householdId, session.user.householdId))
    .orderBy(users.createdAt);

  return members;
}

export async function updateUserRole(userId: string, newRole: "admin" | "member") {
  const session = await getServerSession();
  if (!session?.user?.householdId || session.user.role !== "admin") {
    return { error: "Unauthorized: Only admins can update roles" };
  }

  // Prevent admin from removing their own admin role
  if (userId === session.user.id && newRole === "member") {
    return { error: "You cannot remove your own admin role" };
  }

  // Verify user belongs to same household
  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), eq(users.householdId, session.user.householdId)))
    .limit(1);

  if (!user) {
    return { error: "User not found or unauthorized" };
  }

  await db.update(users).set({ role: newRole }).where(eq(users.id, userId));

  return { success: true };
}

