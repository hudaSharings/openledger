import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";

export default async function BudgetPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Only admins can access budget pages
  if (session.user.role !== "admin") {
    redirect("/");
  }

  // Redirect to current month's budget page
  const currentMonth = new Date().toISOString().slice(0, 7);
  redirect(`/budget/${currentMonth}`);
}

