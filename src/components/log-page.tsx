"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema } from "@/src/lib/validations";
import { createTransaction, getCategories, getPaymentAccounts, getBudgetItems } from "@/src/lib/actions/financial";
import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";
import { Plus, Link as LinkIcon, X } from "lucide-react";

interface LogPageProps {
  onTransactionAdded?: () => void;
}

interface BudgetItem {
  id: string;
  description: string;
  amount: string;
  categoryId: string;
  accountId: string;
}

export function LogPage({ onTransactionAdded }: LogPageProps = {}) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [open, setOpen] = useState(false);

  const currentDate = new Date();
  const currentDateString = format(currentDate, "yyyy-MM-dd");

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: currentDate.toISOString(),
      description: "",
      amount: "",
      categoryId: "",
      paidFromAccountId: "",
      notes: "",
      budgetItemId: undefined,
    },
  });

  const categoryId = watch("categoryId");
  const accountId = watch("paidFromAccountId");
  const budgetItemId = watch("budgetItemId");
  const dateValue = watch("date");
  const currentMonth = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    async function loadData() {
      const [cats, accs, items] = await Promise.all([
        getCategories(),
        getPaymentAccounts(),
        getBudgetItems(currentMonth),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setBudgetItems(items);
    }
    if (open) {
      loadData();
      // Reset date to current date when dialog opens
      const today = new Date();
      setValue("date", today.toISOString());
    }
  }, [currentMonth, open, setValue]);

  // Auto-fill when budget item is selected
  useEffect(() => {
    if (budgetItemId && budgetItemId !== "none" && budgetItems.length > 0) {
      const selectedItem = budgetItems.find((item) => item.id === budgetItemId);
      if (selectedItem) {
        // Prepopulate all fields from budget item
        setValue("description", selectedItem.description);
        setValue("amount", selectedItem.amount);
        setValue("categoryId", selectedItem.categoryId);
        setValue("paidFromAccountId", selectedItem.accountId);
      }
    }
  }, [budgetItemId, budgetItems, setValue]);

  const onSubmit = async (data: z.infer<typeof transactionSchema>) => {
    setError(null);
    setSuccess(false);
    try {
      const result = await createTransaction(data);
      if (result && result.success) {
        setSuccess(true);
        reset({
          date: currentDate.toISOString(),
          description: "",
          amount: "",
          categoryId: "",
          paidFromAccountId: "",
          notes: "",
          budgetItemId: undefined,
        });
        // Close dialog after short delay
        setTimeout(() => {
          setOpen(false);
          setSuccess(false);
        }, 1500);
        // Notify parent to refresh transaction list
        if (onTransactionAdded) {
          onTransactionAdded();
        }
      }
    } catch (err: any) {
      setError(err.message || "An error occurred. Please try again.");
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      // Reset form when dialog closes
      reset({
        date: currentDate.toISOString(),
        description: "",
        amount: "",
        categoryId: "",
        paidFromAccountId: "",
        notes: "",
        budgetItemId: undefined,
      });
      setError(null);
      setSuccess(false);
    } else {
      // When opening, ensure date is set to current date in correct format
      const today = new Date();
      setValue("date", today.toISOString());
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Add New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Add New Transaction</DialogTitle>
          <DialogDescription>
            Record an expense transaction and optionally link it to a planned budget item
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Budget Item Link - Optional */}
          <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
            <Label htmlFor="budgetItemId" className="text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-green-600" />
              Link to Budget Item (Optional)
            </Label>
            <Select
              value={budgetItemId || ""}
              onValueChange={(value) => {
                if (value === "none") {
                  setValue("budgetItemId", undefined);
                  // Clear fields when "none" is selected
                  setValue("description", "");
                  setValue("amount", "");
                  setValue("categoryId", "");
                  setValue("paidFromAccountId", "");
                } else {
                  setValue("budgetItemId", value || undefined, { shouldValidate: false });
                }
              }}
            >
              <SelectTrigger className="h-10 bg-white">
                <SelectValue placeholder="Select a planned budget item (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Unplanned Expense)</SelectItem>
                {budgetItems.length === 0 ? (
                  <div className="px-2 py-1 text-sm text-gray-500">No budget items for this month</div>
                ) : (
                  budgetItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} - ₹{parseFloat(item.amount).toFixed(2)}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-600">
              {budgetItemId && budgetItemId !== "none"
                ? "All fields will be auto-filled from the selected budget item"
                : "Select a budget item to auto-fill all transaction details"}
            </p>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="date" className="text-sm font-medium">Date</Label>
              <Input
                id="date"
                type="date"
                {...register("date", {
                  setValueAs: (value) => {
                    if (!value) {
                      const today = new Date();
                      return today.toISOString();
                    }
                    return new Date(value).toISOString();
                  },
                })}
                value={dateValue ? format(new Date(dateValue), "yyyy-MM-dd") : currentDateString}
                className="h-10"
              />
              {errors.date && (
                <p className="text-sm text-red-500">{errors.date.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-sm font-medium">Amount (₹)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                {...register("amount")}
                className="h-10"
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g., Grocery shopping"
                className="h-10"
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId" className="text-sm font-medium">Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setValue("categoryId", value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name} ({category.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-red-500">{errors.categoryId.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="paidFromAccountId" className="text-sm font-medium">Paid From Account</Label>
              <Select
                value={accountId}
                onValueChange={(value) => setValue("paidFromAccountId", value)}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.paidFromAccountId && (
                <p className="text-sm text-red-500">{errors.paidFromAccountId.message as string}</p>
              )}
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="notes" className="text-sm font-medium">Notes (Optional)</Label>
              <Input
                id="notes"
                {...register("notes")}
                placeholder="Additional notes..."
                className="h-10"
              />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm text-green-600 font-medium">✓ Transaction added successfully!</p>
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Saving..." : "Add Transaction"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
