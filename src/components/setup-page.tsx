"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { incomeSchema } from "@/src/lib/validations";
import { createIncome, getPaymentAccounts, getIncomeForMonth, updateIncome } from "@/src/lib/actions/financial";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";

export function SetupPage({ monthYear }: { monthYear: string }) {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingIncomeId, setExistingIncomeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      monthYear,
      totalAmount: "",
      allocations: [{ accountId: "", amount: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "allocations",
  });

  const totalAmount = watch("totalAmount");
  const allocations = watch("allocations");

  useEffect(() => {
    let isMounted = true;
    
    async function loadData() {
      setLoading(true);
      try {
        const [accs, existingIncome] = await Promise.all([
          getPaymentAccounts(),
          getIncomeForMonth(monthYear),
        ]);
        
        if (!isMounted) return;
        
        setAccounts(accs);

        if (existingIncome) {
          setExistingIncomeId(existingIncome.income.id);
          // Pre-populate form with existing income
          reset({
            monthYear,
            totalAmount: existingIncome.income.totalAmount,
            allocations: existingIncome.allocations.map((alloc) => ({
              accountId: alloc.accountId,
              amount: alloc.allocatedAmount,
            })),
          });
        } else {
          setExistingIncomeId(null);
          // Reset to default if no existing income
          reset({
            monthYear,
            totalAmount: "",
            allocations: [{ accountId: "", amount: "" }],
          });
        }
      } catch (err) {
        console.error("Error loading data:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }
    loadData();
    
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthYear]);

  const totalAllocated = allocations.reduce(
    (sum, alloc) => sum + (parseFloat(alloc.amount) || 0),
    0
  );

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(false);
    try {
      let result;
      if (existingIncomeId) {
        result = await updateIncome(existingIncomeId, data);
      } else {
        result = await createIncome(data);
      }
      if ("error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        setSuccess(true);
        // Reload data to reflect changes and update form
        const existingIncome = await getIncomeForMonth(monthYear);
        if (existingIncome) {
          setExistingIncomeId(existingIncome.income.id);
          // Reset form with updated data
          reset({
            monthYear,
            totalAmount: existingIncome.income.totalAmount,
            allocations: existingIncome.allocations.map((alloc) => ({
              accountId: alloc.accountId,
              amount: alloc.allocatedAmount,
            })),
          });
        } else {
          setExistingIncomeId(result.incomeId || null);
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{existingIncomeId ? "Edit Income" : "Setup Income"}</h1>
        <p className="text-gray-600">{format(new Date(`${monthYear}-01`), "MMMM yyyy")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Income & Allocation</CardTitle>
          <CardDescription>
            Enter your total monthly income and allocate it to payment accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="totalAmount">Total Monthly Income</Label>
              <Input
                id="totalAmount"
                type="text"
                placeholder="0.00"
                {...register("totalAmount")}
              />
              {errors.totalAmount && (
                <p className="text-sm text-red-500">{errors.totalAmount.message as string}</p>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Fund Allocations</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ accountId: "", amount: "" })}
                >
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </div>

              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4">
                  <div className="flex-1">
                    <Select
                      value={watch(`allocations.${index}.accountId`)}
                      onValueChange={(value) => {
                        setValue(`allocations.${index}.accountId`, value, { shouldValidate: true });
                      }}
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
                    {errors.allocations?.[index]?.accountId && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.allocations[index]?.accountId?.message as string}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <Input
                      type="text"
                      placeholder="0.00"
                      {...register(`allocations.${index}.amount`)}
                    />
                    {errors.allocations?.[index]?.amount && (
                      <p className="mt-1 text-sm text-red-500">
                        {errors.allocations[index]?.amount?.message as string}
                      </p>
                    )}
                  </div>
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => remove(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <div className="flex justify-between">
                <span className="font-medium">Total Allocated:</span>
                <span className={`font-bold ${Math.abs(totalAllocated - (parseFloat(totalAmount) || 0)) < 0.01 ? "text-green-600" : "text-red-600"}`}>
                  ₹{totalAllocated.toFixed(2)}
                </span>
              </div>
              {Math.abs(totalAllocated - (parseFloat(totalAmount) || 0)) >= 0.01 && (
                <p className="mt-2 text-sm text-red-500">
                  Total allocations must equal total income
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Income setup completed successfully!</p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting || loading}>
              {isSubmitting ? "Saving..." : existingIncomeId ? "Update Income" : "Save Income Setup"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

