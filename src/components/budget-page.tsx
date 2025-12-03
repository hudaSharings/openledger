"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { budgetItemSchema } from "@/src/lib/validations";
import { createBudgetItem, getCategories, getPaymentAccounts } from "@/src/lib/actions/financial";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { LoadingSpinner } from "./ui/loading-spinner";
import { format } from "date-fns";

export function BudgetPage({ monthYear }: { monthYear: string }) {
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      monthYear,
      description: "",
      amount: "",
      categoryId: "",
      allocatedToAccountId: "",
    },
  });

  const categoryId = watch("categoryId");
  const accountId = watch("allocatedToAccountId");

  useEffect(() => {
    async function loadData() {
      const [cats, accs] = await Promise.all([
        getCategories(),
        getPaymentAccounts(),
      ]);
      setCategories(cats);
      setAccounts(accs);
    }
    loadData();
  }, []);

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(false);
    try {
      const result = await createBudgetItem(data);
      if ("error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        setSuccess(true);
        reset();
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Budget Planning</h1>
        <p className="text-gray-600">{format(new Date(`${monthYear}-01`), "MMMM yyyy")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Add Budget Item</CardTitle>
          <CardDescription>Plan your monthly expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                {...register("description")}
                placeholder="e.g., Groceries"
              />
              {errors.description && (
                <p className="text-sm text-red-500">{errors.description.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="text"
                placeholder="0.00"
                {...register("amount")}
              />
              {errors.amount && (
                <p className="text-sm text-red-500">{errors.amount.message as string}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="categoryId">Category</Label>
              <Select
                value={categoryId}
                onValueChange={(value) => setValue("categoryId", value)}
              >
                <SelectTrigger>
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
              <Label htmlFor="allocatedToAccountId">Allocated To Account</Label>
              <Select
                value={accountId}
                onValueChange={(value) => setValue("allocatedToAccountId", value)}
              >
                <SelectTrigger>
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
              {errors.allocatedToAccountId && (
                <p className="text-sm text-red-500">{errors.allocatedToAccountId.message as string}</p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Budget item added successfully!</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="sm" className="border-white" />
                  Adding...
                </span>
              ) : (
                "Add Budget Item"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

