import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { TransactionLogPageClient } from "@/src/components/transaction-log-page-client";
import { Navbar } from "@/src/components/navbar";
import { MainContentWrapper } from "@/src/components/main-content-wrapper";

export default async function LogTransactionPage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const isAdmin = session.user?.role === "admin";

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <MainContentWrapper>
        <TransactionLogPageClient isAdmin={isAdmin} />
      </MainContentWrapper>
    </div>
  );
}
