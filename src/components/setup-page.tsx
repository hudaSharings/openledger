"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { incomeSchema } from "@/src/lib/validations";
import { createIncome, getPaymentAccounts, getAllIncomeForMonth, deleteIncome } from "@/src/lib/actions/financial";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { LoadingSpinner, LoadingOverlay } from "./ui/loading-spinner";

interface IncomeEntry {
  income: {
    id: string;
    description: string | null;
    totalAmount: string;
    createdAt: Date;
  };
  allocations: Array<{
    accountId: string;
    accountName: string;
    allocatedAmount: string;
  }>;
}

export function SetupPage({ monthYear }: { monthYear: string }) {
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);

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
      description: "",
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
        const [accs, allIncome] = await Promise.all([
          getPaymentAccounts(),
          getAllIncomeForMonth(monthYear),
        ]);
        
        if (!isMounted) return;
        
        setAccounts(accs);
        setIncomeEntries(allIncome);
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

  const totalIncome = incomeEntries.reduce(
    (sum, entry) => sum + parseFloat(entry.income.totalAmount),
    0
  );

  const onSubmit = async (data: any) => {
    setError(null);
    setSuccess(false);
    try {
      const result = await createIncome(data);
      if ("error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        setSuccess(true);
        // Reload income entries
        const allIncome = await getAllIncomeForMonth(monthYear);
        setIncomeEntries(allIncome);
        // Reset form
        reset({
          monthYear,
          description: "",
          totalAmount: "",
          allocations: [{ accountId: "", amount: "" }],
        });
        setShowAddForm(false);
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    }
  };

  const handleDelete = async (incomeId: string) => {
    if (!confirm("Are you sure you want to delete this income entry?")) {
      return;
    }

    try {
      const result = await deleteIncome(incomeId);
      if ("error" in result) {
        setError(typeof result.error === "string" ? result.error : "An error occurred");
      } else {
        // Reload income entries
        const allIncome = await getAllIncomeForMonth(monthYear);
        setIncomeEntries(allIncome);
      }
    } catch (err) {
      setError("Failed to delete income entry");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Income Management</h1>
          <p className="text-gray-600">{format(new Date(`${monthYear}-01`), "MMMM yyyy")}</p>
        </div>
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center gap-4">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600">Loading income data...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Income Management</h1>
        <p className="text-gray-600">{format(new Date(`${monthYear}-01`), "MMMM yyyy")}</p>
      </div>

      {/* Total Income Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Total Income for {format(new Date(`${monthYear}-01`), "MMMM yyyy")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-green-600">₹{totalIncome.toFixed(2)}</div>
          <p className="text-sm text-gray-600 mt-2">
            {incomeEntries.length} income {incomeEntries.length === 1 ? "entry" : "entries"}
          </p>
        </CardContent>
      </Card>

      {/* Existing Income Entries */}
      {incomeEntries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Income Entries</CardTitle>
            <CardDescription>All income entries for this month</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Allocations</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {incomeEntries.map((entry) => (
                    <TableRow key={entry.income.id}>
                      <TableCell className="font-medium">
                        {entry.income.description || "Income"}
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{parseFloat(entry.income.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-gray-600">
                          {entry.allocations.map((alloc, idx) => (
                            <div key={idx}>
                              {alloc.accountName}: ₹{parseFloat(alloc.allocatedAmount).toFixed(2)}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(entry.income.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add New Income Form */}
      {!showAddForm && (
        <div className="flex justify-center">
          <Button onClick={() => setShowAddForm(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Income Entry
          </Button>
        </div>
      )}

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Income Entry</CardTitle>
            <CardDescription>
              Add a new income source and allocate it to payment accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  type="text"
                  placeholder="e.g., Salary, Freelance, Bonus"
                  {...register("description")}
                />
                {errors.description && (
                  <p className="text-sm text-red-500">{errors.description.message as string}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="totalAmount">Income Amount</Label>
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
                  Total allocations must equal income amount
                </p>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && (
              <p className="text-sm text-green-600">Income entry added successfully!</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setShowAddForm(false);
                  reset({
                    monthYear,
                    description: "",
                    totalAmount: "",
                    allocations: [{ accountId: "", amount: "" }],
                  });
                  setError(null);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isSubmitting || loading}>
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" className="border-white" />
                    Adding...
                  </span>
                ) : (
                  "Add Income Entry"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
      )}
    </div>
  );
}

