import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { TransactionLogPageClient } from "@/src/components/transaction-log-page-client";
import { Navbar } from "@/src/components/navbar";

export default async function LogTransactionPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <TransactionLogPageClient />
      </main>
    </div>
  );
}
