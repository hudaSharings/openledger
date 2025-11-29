import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { PlanningEntry } from "@/src/components/planning-entry";
import { Navbar } from "@/src/components/navbar";

export default async function BudgetMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const { month } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <PlanningEntry monthYear={month} />
      </main>
    </div>
  );
}

