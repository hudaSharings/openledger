"use client";

import { Button } from "./ui/button";
import { getMonthlyReport } from "@/src/lib/actions/financial";

export function ExportButton({ monthYear }: { monthYear: string }) {
  async function handleExport() {
    const data = await getMonthlyReport(monthYear);
    
    const headers = ["Date", "Description", "Planned Amount", "Actual Amount", "Category", "Paid From Account", "Notes"];
    const csv = [
      headers.join(","),
      ...data.map((row) =>
        headers.map((header) => {
          const value = row[header as keyof typeof row];
          return typeof value === "string" && value.includes(",")
            ? `"${value.replace(/"/g, '""')}"`
            : value;
        }).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `openledger-${monthYear}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Button type="button" variant="outline" onClick={handleExport}>
      Export CSV
    </Button>
  );
}

