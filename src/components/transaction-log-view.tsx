"use client";

import { useState, useEffect } from "react";
import { getTransactionsByDate } from "@/src/lib/actions/transactions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { format } from "date-fns";
import { Calendar, Receipt, TrendingUp, Clock, DollarSign } from "lucide-react";

interface Transaction {
  id: string;
  date: Date;
  description: string;
  amount: string;
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

export function TransactionLogView({ monthYear, refreshKey }: { monthYear?: string; refreshKey?: number }) {
  const [groupedTransactions, setGroupedTransactions] = useState<GroupedTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <Card className="shadow-sm">
        <CardContent className="py-12">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-4 text-gray-600">Loading transactions...</p>
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
                <DollarSign className="h-4 w-4" />
                Total Expenses
              </div>
              <div className="font-bold text-xl sm:text-2xl text-red-600">
                ₹{totalAmount.toFixed(2)}
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
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b-2 border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-blue-600" />
                        <span className="font-bold text-lg text-gray-900">
                          {format(date, "dd MMMM yyyy")}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 font-medium">
                        {format(date, "EEEE")}
                      </span>
                      {dayPlanned > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          <TrendingUp className="h-3 w-3" />
                          {dayPlanned} Planned
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-500 uppercase tracking-wide">Day Total</div>
                      <div className="text-2xl font-bold text-red-600">
                        ₹{dayTotal.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Transactions Table */}
                <div className="overflow-x-auto">
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
                        <TableHead>Category</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[200px]">Budget Link</TableHead>
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
                            {transaction.notes && (
                              <div className="text-xs text-gray-500 mt-1 italic">
                                {transaction.notes}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                              {transaction.categoryName}
                            </span>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {transaction.accountName}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-red-600 text-lg">
                              ₹{parseFloat(transaction.amount).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            {transaction.budgetItemDescription ? (
                              <div className="flex items-center gap-1">
                                <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  {transaction.budgetItemDescription}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unplanned</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
