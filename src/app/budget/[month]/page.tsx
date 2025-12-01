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

  // All users can access budget pages (read-only for members, handled in component)
  const { month } = await params;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <PlanningEntry monthYear={month} />
      </main>
    </div>
  );
}

