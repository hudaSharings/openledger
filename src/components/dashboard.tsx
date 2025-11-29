import { getDashboardData } from "@/src/lib/actions/financial";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { format } from "date-fns";
import { ExportButton } from "./export-button";
import { DashboardChart } from "./dashboard-chart";
import Link from "next/link";
import { Button } from "./ui/button";
import { Calendar, Plus } from "lucide-react";

export async function Dashboard({ monthYear }: { monthYear: string }) {
  const data = await getDashboardData(monthYear);

  const chartData = data.categoryData.map((item) => ({
    category: item.category,
    Planned: parseFloat(item.planned.toString()),
    Actual: parseFloat(item.actual.toString()),
  }));

  // Calculate net cash flow
  const netCashFlow = (data.income || 0) - data.totalActual;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600">{format(new Date(`${monthYear}-01`), "MMMM yyyy")}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full sm:w-auto">
          <Link href={`/budget/${monthYear}`} className="w-full sm:w-auto">
            <Button variant="default" className="gap-2 w-full sm:w-auto">
              <Plus className="h-4 w-4" />
              <span className="hidden xs:inline">Budget Planning</span>
              <span className="xs:hidden">Budget</span>
            </Button>
          </Link>
          <div className="w-full sm:w-auto">
            <ExportButton monthYear={monthYear} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(data.income || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Planned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(data.totalPlanned || 0).toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{(data.totalActual || 0).toFixed(2)}</div>
            <p className="text-xs text-gray-600">
              Planned: ₹{(data.totalPlannedActual || 0).toFixed(2)} | Unplanned: ₹{(data.totalUnplannedActual || 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netCashFlow >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₹{netCashFlow.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Account Balances</CardTitle>
            <CardDescription>Remaining balance per account</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.accountBalances && data.accountBalances.length > 0 ? (
                data.accountBalances.map((account) => (
                  <div key={account.accountId} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{account.accountName}</p>
                      <p className="text-sm text-gray-600">
                        Allocated: ₹{account.allocated.toFixed(2)} | Spent: ₹{account.spent.toFixed(2)}
                      </p>
                    </div>
                    <div className={`text-lg font-bold ${account.remaining >= 0 ? "text-green-600" : "text-red-600"}`}>
                      ₹{account.remaining.toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-gray-600">No account balances available</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Unplanned Categories</CardTitle>
            <CardDescription>Highest spending in unplanned categories</CardDescription>
          </CardHeader>
          <CardContent>
            {data.topUnplannedCategories.length > 0 ? (
              <div className="space-y-4">
                {data.topUnplannedCategories.map((cat, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-lg font-bold">₹{cat.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600">No unplanned expenses this month</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Planned vs Actual by Category</CardTitle>
          <CardDescription>Comparison of budgeted vs actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <DashboardChart data={chartData} />
        </CardContent>
      </Card>
    </div>
  );
}
