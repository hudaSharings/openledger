import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { SetupPage } from "@/src/components/setup-page";
import { Navbar } from "@/src/components/navbar";

export default async function SetupMonthPage({
  params,
}: {
  params: Promise<{ month: string }>;
}) {
  const { month } = await params;
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <SetupPage monthYear={month} />
      </main>
    </div>
  );
}

