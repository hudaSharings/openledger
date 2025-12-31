"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { format, parse, getYear } from "date-fns";
import { getAllMonthsWithData, getMultiMonthReport } from "@/src/lib/actions/financial";
import { LoadingSpinner } from "./ui/loading-spinner";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";
import { TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface MonthlyData {
  monthYear: string;
  income: number;
  credits: number;
  totalInward: number;
  totalPlanned: number;
  totalActual: number;
  totalPlannedActual: number;
  totalUnplannedActual: number;
}

export function ReportsPage() {
  const [allAvailableMonths, setAllAvailableMonths] = useState<string[]>([]);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [availableMonths, setAvailableMonths] = useState<string[]>([]);
  const [selectedMonths, setSelectedMonths] = useState<string[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    async function loadMonths() {
      try {
        const months = await getAllMonthsWithData();
        setAllAvailableMonths(months);
        
        // Get unique years from available months
        const years = Array.from(new Set(months.map(m => getYear(parse(m, "yyyy-MM", new Date())).toString())))
          .sort((a, b) => parseInt(b) - parseInt(a));
        
        // Set default year to current year or most recent year
        const currentYear = new Date().getFullYear().toString();
        const defaultYear = years.includes(currentYear) ? currentYear : years[0] || "";
        setSelectedYear(defaultYear);
      } catch (err) {
        console.error("Error loading months:", err);
      } finally {
        setLoading(false);
      }
    }
    loadMonths();
  }, []);

  // Filter months based on selected year
  useEffect(() => {
    if (selectedYear && allAvailableMonths.length > 0) {
      const filtered = allAvailableMonths.filter(m => {
        const year = getYear(parse(m, "yyyy-MM", new Date())).toString();
        return year === selectedYear;
      });
      setAvailableMonths(filtered);
      // Select all months from the selected year by default
      setSelectedMonths(filtered);
    } else {
      setAvailableMonths([]);
      setSelectedMonths([]);
    }
  }, [selectedYear, allAvailableMonths]);

  useEffect(() => {
    async function loadData() {
      if (selectedMonths.length === 0) {
        setMonthlyData([]);
        return;
      }

      setLoadingData(true);
      try {
        const data = await getMultiMonthReport(selectedMonths);
        setMonthlyData(data);
      } catch (err) {
        console.error("Error loading report data:", err);
      } finally {
        setLoadingData(false);
      }
    }
    loadData();
  }, [selectedMonths]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Calculate summary statistics
  const totalIncome = monthlyData.reduce((sum, m) => sum + m.income, 0);
  const totalCredits = monthlyData.reduce((sum, m) => sum + m.credits, 0);
  const totalInward = monthlyData.reduce((sum, m) => sum + m.totalInward, 0);
  const totalPlanned = monthlyData.reduce((sum, m) => sum + m.totalPlanned, 0);
  const totalActual = monthlyData.reduce((sum, m) => sum + m.totalActual, 0);
  const avgNetCashFlow = monthlyData.length > 0
    ? monthlyData.reduce((sum, m) => sum + (m.totalInward - m.totalActual), 0) / monthlyData.length
    : 0;

  // Prepare chart data
  const chartData = monthlyData.map((m) => ({
    month: format(parse(m.monthYear, "yyyy-MM", new Date()), "MMM yyyy"),
    Income: m.income,
    Credits: m.credits,
    "Total Inward": m.totalInward,
    Planned: m.totalPlanned,
    Actual: m.totalActual,
    "Net Cash Flow": m.totalInward - m.totalActual,
  }));

  const cashFlowData = monthlyData.map((m) => ({
    month: format(parse(m.monthYear, "yyyy-MM", new Date()), "MMM yyyy"),
    "Net Cash Flow": m.totalInward - m.totalActual,
  }));

  // Calculate trends
  const incomeTrend = monthlyData.length >= 2
    ? monthlyData[0].income - monthlyData[monthlyData.length - 1].income
    : 0;
  const expenseTrend = monthlyData.length >= 2
    ? monthlyData[0].totalActual - monthlyData[monthlyData.length - 1].totalActual
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Reports & Analytics</h1>
        <p className="text-sm sm:text-base text-gray-600">Multi-month financial overview and trends</p>
      </div>

      {/* Year and Month Selection */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Select Year & Months</CardTitle>
              <CardDescription className="text-xs">Choose year and months to include in the report</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger className="w-32 h-9">
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from(new Set(allAvailableMonths.map(m => getYear(parse(m, "yyyy-MM", new Date())).toString())))
                    .sort((a, b) => parseInt(b) - parseInt(a))
                    .map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {availableMonths.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {availableMonths.map((month) => {
                  const isSelected = selectedMonths.includes(month);
                  return (
                    <button
                      key={month}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedMonths(selectedMonths.filter((m) => m !== month));
                        } else {
                          setSelectedMonths([...selectedMonths, month].sort().reverse());
                        }
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        isSelected
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title={format(parse(month, "yyyy-MM", new Date()), "MMMM yyyy")}
                    >
                      {isSelected ? (
                        <Check className="h-3.5 w-3.5" />
                      ) : (
                        <X className="h-3.5 w-3.5" />
                      )}
                      {format(parse(month, "yyyy-MM", new Date()), "MMM")}
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <button
                  onClick={() => setSelectedMonths(availableMonths)}
                  className="text-blue-600 hover:underline"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={() => setSelectedMonths([])}
                  className="text-blue-600 hover:underline"
                >
                  Clear All
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 py-2">No months available for the selected year</p>
          )}
        </CardContent>
      </Card>

      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : monthlyData.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <p className="text-center text-gray-600">Select months to view reports</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalIncome.toFixed(2)}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {incomeTrend >= 0 ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.abs(incomeTrend).toFixed(2)} increase
                    </span>
                  ) : (
                    <span className="text-red-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {Math.abs(incomeTrend).toFixed(2)} decrease
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalCredits.toFixed(2)}</div>
                <p className="text-xs text-gray-600 mt-1">Across {monthlyData.length} months</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                <Wallet className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalActual.toFixed(2)}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {expenseTrend >= 0 ? (
                    <span className="text-red-600 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {Math.abs(expenseTrend).toFixed(2)} increase
                    </span>
                  ) : (
                    <span className="text-green-600 flex items-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {Math.abs(expenseTrend).toFixed(2)} decrease
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Net Cash Flow</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${avgNetCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                  ₹{avgNetCashFlow.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600 mt-1">Per month average</p>
              </CardContent>
            </Card>
          </div>

          {/* Income vs Expenses Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Income vs Expenses</CardTitle>
              <CardDescription>Monthly comparison of income, credits, and expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Income" fill="#10b981" />
                  <Bar dataKey="Credits" fill="#3b82f6" />
                  <Bar dataKey="Actual" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Net Cash Flow Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Net Cash Flow Trend</CardTitle>
              <CardDescription>Monthly net cash flow (Income + Credits - Expenses)</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cashFlowData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Net Cash Flow"
                    stroke={avgNetCashFlow >= 0 ? "#10b981" : "#ef4444"}
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Planned vs Actual */}
          <Card>
            <CardHeader>
              <CardTitle>Planned vs Actual Expenses</CardTitle>
              <CardDescription>Comparison of budgeted vs actual spending</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: number) => `₹${value.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="Planned" fill="#6366f1" />
                  <Bar dataKey="Actual" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Monthly Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Monthly Breakdown</CardTitle>
              <CardDescription>Detailed statistics for each selected month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Month</th>
                      <th className="text-right p-2">Income</th>
                      <th className="text-right p-2">Credits</th>
                      <th className="text-right p-2">Total Inward</th>
                      <th className="text-right p-2">Planned</th>
                      <th className="text-right p-2">Actual</th>
                      <th className="text-right p-2">Net Cash Flow</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((month) => {
                      const netCashFlow = month.totalInward - month.totalActual;
                      return (
                        <tr key={month.monthYear} className="border-b hover:bg-gray-50">
                          <td className="p-2 font-medium">
                            {format(parse(month.monthYear, "yyyy-MM", new Date()), "MMMM yyyy")}
                          </td>
                          <td className="p-2 text-right">₹{month.income.toFixed(2)}</td>
                          <td className="p-2 text-right">₹{month.credits.toFixed(2)}</td>
                          <td className="p-2 text-right font-medium">₹{month.totalInward.toFixed(2)}</td>
                          <td className="p-2 text-right">₹{month.totalPlanned.toFixed(2)}</td>
                          <td className="p-2 text-right">₹{month.totalActual.toFixed(2)}</td>
                          <td className={`p-2 text-right font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
                            ₹{netCashFlow.toFixed(2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 font-bold">
                      <td className="p-2">Total</td>
                      <td className="p-2 text-right">₹{totalIncome.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{totalCredits.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{totalInward.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{totalPlanned.toFixed(2)}</td>
                      <td className="p-2 text-right">₹{totalActual.toFixed(2)}</td>
                      <td className={`p-2 text-right ${(totalInward - totalActual) >= 0 ? "text-green-600" : "text-red-600"}`}>
                        ₹{(totalInward - totalActual).toFixed(2)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

