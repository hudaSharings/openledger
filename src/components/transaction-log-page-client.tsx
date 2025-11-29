"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogPage } from "./log-page";
import { TransactionLogView } from "./transaction-log-view";
import { Button } from "./ui/button";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { format, subMonths, addMonths, parse } from "date-fns";

export function TransactionLogPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Get month from URL or use current month
  const monthParam = searchParams.get("month");
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(monthParam || currentMonth);

  // Navigation functions
  const currentDate = parse(selectedMonth, "yyyy-MM", new Date());
  const previousMonth = format(subMonths(currentDate, 1), "yyyy-MM");
  const nextMonth = format(addMonths(currentDate, 1), "yyyy-MM");
  const isCurrentMonth = selectedMonth === currentMonth;

  const navigateToMonth = (newMonth: string) => {
    setSelectedMonth(newMonth);
    router.push(`/transaction-log?month=${newMonth}`);
  };

  const resetToCurrentMonth = () => {
    setSelectedMonth(currentMonth);
    router.push("/transaction-log");
  };

  // Update selectedMonth when URL changes
  useEffect(() => {
    const month = searchParams.get("month");
    if (month) {
      setSelectedMonth(month);
    } else {
      setSelectedMonth(currentMonth);
    }
  }, [searchParams, currentMonth]);

  const handleTransactionAdded = () => {
    // Trigger refresh of transaction list
    setRefreshKey((prev) => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Month Navigation Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateToMonth(previousMonth)}
            className="h-10 w-10"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {format(currentDate, "MMMM yyyy")}
            </h1>
            <p className="text-sm text-gray-600">Transaction History</p>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigateToMonth(nextMonth)}
            className="h-10 w-10"
            aria-label="Next month"
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          {!isCurrentMonth && (
            <Button
              variant="outline"
              size="sm"
              onClick={resetToCurrentMonth}
              className="gap-2"
              aria-label="Reset to current month"
            >
              <RotateCcw className="h-4 w-4" />
              Current Month
            </Button>
          )}
        </div>
        <LogPage onTransactionAdded={handleTransactionAdded} />
      </div>
      <TransactionLogView monthYear={selectedMonth} refreshKey={refreshKey} />
    </div>
  );
}
