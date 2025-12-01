import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";

export default async function BudgetPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // All users can access budget pages (read-only for members)
  // Redirect to current month's budget page
  const currentMonth = new Date().toISOString().slice(0, 7);
  redirect(`/budget/${currentMonth}`);
}

