"use client";

import { useState, useEffect } from "react";
import { getTransactionsByDate, updateTransaction } from "@/src/lib/actions/transactions";
import { getCategories, getPaymentAccounts, getBudgetItems } from "@/src/lib/actions/financial";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format } from "date-fns";
import { Calendar, Receipt, TrendingUp, Clock, IndianRupee, Pencil } from "lucide-react";
import { LoadingSpinner } from "./ui/loading-spinner";
import { formatCurrency } from "@/src/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionSchema } from "@/src/lib/validations";
import { z } from "zod";
import { Link as LinkIcon } from "lucide-react";

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: string;
  categoryId: string;
  paidFromAccountId: string;
  budgetItemId: string | null;
  categoryName: string;
  accountName: string;
  notes: string | null;
  budgetItemDescription: string | null;
  time: string;
}

interface GroupedTransaction {
  date: string;
  transactions: Transaction[];
}

export function TransactionLogView({
  monthYear,
  refreshKey,
  isAdmin = false,
  onTransactionUpdated,
}: {
  monthYear?: string;
  refreshKey?: number;
  isAdmin?: boolean;
  onTransactionUpdated?: () => void;
}) {
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; type: string }>>([]);
  const [accounts, setAccounts] = useState<Array<{ id: string; name: string }>>([]);
  const [budgetItems, setBudgetItems] = useState<Array<{ id: string; description: string; amount: string; categoryId: string; accountId: string }>>([]);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSuccess, setEditSuccess] = useState(false);
  const currentMonth = monthYear || new Date().toISOString().slice(0, 7);

  const editForm = useForm<z.infer<typeof transactionSchema>>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      date: new Date().toISOString(),
      time: format(new Date(), "HH:mm"),
      description: "",
      amount: "",
      categoryId: "",
      paidFromAccountId: "",
      notes: "",
      budgetItemId: undefined,
    },
  });

  useEffect(() => {
    if (editOpen && editingTransaction) {
      const d = new Date(editingTransaction.date);
      editForm.reset({
        date: d.toISOString(),
        time: format(d, "HH:mm"),
        description: editingTransaction.description,
        amount: editingTransaction.amount,
        categoryId: editingTransaction.categoryId,
        paidFromAccountId: editingTransaction.paidFromAccountId,
        notes: editingTransaction.notes ?? "",
        budgetItemId: editingTransaction.budgetItemId ?? undefined,
      });
      setEditError(null);
      setEditSuccess(false);
    }
  }, [editOpen, editingTransaction]);

  useEffect(() => {
    async function loadTransactions() {
      try {
        setLoading(true);
        setError(null);
        const data = await getTransactionsByDate(monthYear);
        setGroupedTransactions(data);
      } catch (err) {
        setError("Failed to load transactions");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadTransactions();
  }, [monthYear, refreshKey]);

  useEffect(() => {
    async function loadEditData() {
      if (!editOpen || !editingTransaction) return;
      const [cats, accs, items] = await Promise.all([
        getCategories(),
        getPaymentAccounts(),
        getBudgetItems(currentMonth),
      ]);
      setCategories(cats);
      setAccounts(accs);
      setBudgetItems(items);
    }
    loadEditData();
  }, [editOpen, editingTransaction, currentMonth]);

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12">
          <div className="flex flex-col items-center gap-4">
            <LoadingSpinner size="lg" />
            <p className="text-gray-600">Loading transactions...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-sm border-red-200">
        <CardContent className="py-8">
          <div className="text-center text-red-600">{error}</div>
        </CardContent>
      </Card>
    );
  }

  if (groupedTransactions.length === 0) {
    return (
      <Card className="shadow-sm">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-blue-600" />
            Transaction History
          </CardTitle>
          <CardDescription>All your expense transactions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Receipt className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-lg">No transactions found for this period.</p>
            <p className="text-gray-500 text-sm mt-2">Start by adding your first transaction above.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalAmount = groupedTransactions.reduce(
    (sum, group) =>
      sum +
      group.transactions.reduce(
        (groupSum, t) => groupSum + parseFloat(t.amount),
        0
      ),
    0
  );

  const totalTransactions = groupedTransactions.reduce(
    (sum, group) => sum + group.transactions.length,
    0
  );

  const plannedCount = groupedTransactions.reduce(
    (sum, group) =>
      sum + group.transactions.filter((t) => t.budgetItemDescription).length,
    0
  );

  const unplannedCount = totalTransactions - plannedCount;

  return (
    <>
    <Card className="shadow-lg border-gray-200">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Receipt className="h-6 w-6 text-blue-600" />
              Transaction History
            </CardTitle>
            <CardDescription className="mt-1">
              {monthYear ? format(new Date(`${monthYear}-01`), "MMMM yyyy") : "Current Month"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-4 sm:gap-6">
            <div className="text-center sm:text-right">
              <div className="flex items-center gap-1 text-gray-500 text-xs sm:text-sm mb-1">
                <IndianRupee className="h-4 w-4" />
                Total Expenses
              </div>
              <div className="font-bold text-xl sm:text-2xl text-red-600">
                ₹{formatCurrency(totalAmount)}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Total Transactions</div>
              <div className="font-bold text-lg text-gray-900">
                {totalTransactions}
              </div>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Planned</div>
              <div className="font-bold text-lg text-green-600">{plannedCount}</div>
            </div>
            <div className="text-center sm:text-right">
              <div className="text-gray-500 text-xs sm:text-sm mb-1">Unplanned</div>
              <div className="font-bold text-lg text-orange-600">{unplannedCount}</div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-8">
          {groupedTransactions.map((group) => {
            const dayTotal = group.transactions.reduce(
              (sum, t) => sum + parseFloat(t.amount),
              0
            );
            const date = new Date(group.date + "T00:00:00");
            const dayPlanned = group.transactions.filter((t) => t.budgetItemDescription).length;

            return (
              <div key={group.date} className="border rounded-lg overflow-hidden bg-white shadow-sm">
                {/* Date Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 sm:px-6 py-3 sm:py-4 border-b-2 border-gray-200">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                        <span className="font-bold text-base sm:text-lg text-gray-900">
                          {format(date, "dd MMMM yyyy")}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm text-gray-600 font-medium">
                        {format(date, "EEEE")}
                      </span>
                      {dayPlanned > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 sm:px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <TrendingUp className="h-3 w-3" />
                          {dayPlanned} Planned
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Day Total</div>
                      <div className="text-xl sm:text-2xl font-bold text-red-600">
                        ₹{formatCurrency(dayTotal)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions - Desktop Table / Mobile Cards */}
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[120px]">
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4 text-gray-500" />
                            Time
                          </div>
                        </TableHead>
                        <TableHead className="min-w-[200px]">Description</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        {isAdmin && (
                          <TableHead className="w-[80px] text-right">Actions</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.transactions.map((transaction) => (
                        <TableRow 
                          key={transaction.id} 
                          className="hover:bg-blue-50/50 transition-colors"
                        >
                          <TableCell className="text-gray-600 font-mono text-sm">
                            {transaction.time}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-gray-900">{transaction.description}</div>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                                {transaction.categoryName}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                                {transaction.accountName}
                              </span>
                            </div>
                            {transaction.notes && (
                              <div className="text-xs text-gray-500 mt-2 italic">
                                {transaction.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className="font-bold text-red-600 text-lg">
                                ₹{formatCurrency(transaction.amount)}
                              </span>
                              {transaction.budgetItemDescription ? (
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {transaction.budgetItemDescription}
                                </span>
                              ) : (
                                <span className="text-xs text-gray-400 italic">Unplanned</span>
                              )}
                            </div>
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-600 hover:text-blue-600"
                                aria-label="Edit transaction"
                                onClick={() => {
                                  setEditingTransaction(transaction);
                                  setEditOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden divide-y divide-gray-200">
                  {group.transactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className="p-4 hover:bg-blue-50/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                            <span className="text-xs text-gray-500 font-mono">{transaction.time}</span>
                          </div>
                          <div className="font-semibold text-gray-900 mb-1 break-words">
                            {transaction.description}
                          </div>
                          {transaction.notes && (
                            <div className="text-xs text-gray-500 mt-1 italic break-words">
                              {transaction.notes}
                            </div>
                          )}
                        </div>
                        <div className="text-right flex-shrink-0 flex flex-col items-end gap-1">
                          <div className="font-bold text-red-600 text-lg">
                            ₹{formatCurrency(transaction.amount)}
                          </div>
                          {isAdmin && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 text-gray-600 hover:text-blue-600"
                              onClick={() => {
                                setEditingTransaction(transaction);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                          {transaction.categoryName}
                        </span>
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                          {transaction.accountName}
                        </span>
                        {transaction.budgetItemDescription ? (
                          <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            {transaction.budgetItemDescription}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unplanned</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>

    {/* Edit Transaction Dialog (Admin only) */}
    <Dialog
      open={editOpen}
      onOpenChange={(open) => {
        setEditOpen(open);
        if (!open) setEditingTransaction(null);
      }}
    >
      <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Edit Transaction</DialogTitle>
          <DialogDescription>
            Update the transaction with the correct values. Only admins can edit.
          </DialogDescription>
        </DialogHeader>
        {editingTransaction && (
          <form
            onSubmit={editForm.handleSubmit(async (data) => {
              setEditError(null);
              const dateValue = editForm.watch("date");
              const timeValue = editForm.watch("time") || format(new Date(), "HH:mm");
              let dateObj: Date;
              if (typeof dateValue === "string" && dateValue.includes("T")) {
                dateObj = new Date(dateValue);
              } else {
                const dateStr = dateValue ? format(new Date(dateValue), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
                const [hours, minutes] = timeValue.split(":");
                dateObj = new Date(`${dateStr}T${hours}:${minutes}:00`);
              }
              const result = await updateTransaction(editingTransaction.id, {
                ...data,
                date: dateObj.toISOString(),
              });
              if (result?.error) {
                setEditError(result.error);
                return;
              }
              setEditSuccess(true);
              setTimeout(() => {
                setEditOpen(false);
                setEditingTransaction(null);
                onTransactionUpdated?.();
              }, 1000);
            })}
            className="space-y-4 mt-4"
          >
            <div className="space-y-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <Label className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-green-600" />
                Link to Budget Item (Optional)
              </Label>
              <Select
                value={editForm.watch("budgetItemId") || "none"}
                onValueChange={(value) =>
                  editForm.setValue("budgetItemId", value === "none" ? undefined : value)
                }
              >
                <SelectTrigger className="h-10 bg-white">
                  <SelectValue placeholder="Select (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (Unplanned)</SelectItem>
                  {budgetItems.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.description} - ₹{parseFloat(item.amount).toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={
                    editForm.watch("date")
                      ? format(new Date(editForm.watch("date")), "yyyy-MM-dd")
                      : ""
                  }
                  onChange={(e) => {
                    const timeValue = editForm.watch("time") || "00:00";
                    const [hours, minutes] = timeValue.split(":");
                    const d = new Date(e.target.value + `T${hours}:${minutes}:00`);
                    editForm.setValue("date", d.toISOString());
                  }}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Time</Label>
                <Input
                  type="time"
                  {...editForm.register("time")}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...editForm.register("amount")}
                  className="h-10"
                />
                {editForm.formState.errors.amount && (
                  <p className="text-sm text-red-500">{editForm.formState.errors.amount.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  {...editForm.register("description")}
                  placeholder="Description"
                  className="h-10"
                />
                {editForm.formState.errors.description && (
                  <p className="text-sm text-red-500">{editForm.formState.errors.description.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={editForm.watch("categoryId")}
                  onValueChange={(v) => editForm.setValue("categoryId", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} ({c.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Paid From Account</Label>
                <Select
                  value={editForm.watch("paidFromAccountId")}
                  onValueChange={(v) => editForm.setValue("paidFromAccountId", v)}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Notes (Optional)</Label>
                <Input {...editForm.register("notes")} className="h-10" />
              </div>
            </div>
            {editError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{editError}</p>
              </div>
            )}
            {editSuccess && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600 font-medium">✓ Transaction updated successfully!</p>
              </div>
            )}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setEditOpen(false);
                  setEditingTransaction(null);
                }}
                disabled={editForm.formState.isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={editForm.formState.isSubmitting}
              >
                {editForm.formState.isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <LoadingSpinner size="sm" className="border-white" />
                    Saving...
                  </span>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
}
