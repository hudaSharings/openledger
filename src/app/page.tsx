import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { Dashboard } from "@/src/components/dashboard";
import { Navbar } from "@/src/components/navbar";

export default async function HomePage() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <Dashboard monthYear={currentMonth} />
      </main>
    </div>
  );
}

