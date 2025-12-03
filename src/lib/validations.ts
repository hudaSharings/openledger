import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  householdName: z.string().min(1, "Household name is required"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const inviteSchema = z.object({
  email: z.string().email("Invalid email address"),
});

// Schema for a single income entry
export const incomeEntrySchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  allocations: z.array(
    z.object({
      accountId: z.string().uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
    })
  ).min(1, "At least one allocation is required"),
});

// Schema for a single income entry (supports multiple entries per month)
export const incomeSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)"),
  description: z.string().optional(), // Optional description (e.g., "Salary", "Freelance", etc.)
  totalAmount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  allocations: z.array(
    z.object({
      accountId: z.string().uuid(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
    })
  ).min(1, "At least one allocation is required"),
});

export const budgetItemSchema = z.object({
  monthYear: z.string().regex(/^\d{4}-\d{2}$/, "Invalid month format (YYYY-MM)"),
  description: z.string().min(1, "Description is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  categoryId: z.string().uuid(),
  allocatedToAccountId: z.string().uuid(),
  color: z.enum(["red", "yellow", "blue", "green", "purple", "orange", "pink", "gray"]).optional().default("blue"),
});

export const transactionSchema = z.object({
  date: z.string().datetime(),
  time: z.string().optional(), // Time field for UI, will be combined with date
  description: z.string().min(1, "Description is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Invalid amount"),
  categoryId: z.string().uuid(),
  paidFromAccountId: z.string().uuid(),
  notes: z.string().optional(),
  budgetItemId: z.string().uuid().optional(),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  type: z.enum(["mandatory", "periodic", "ad_hoc"]),
});

