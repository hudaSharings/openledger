import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { TemplatesPage } from "@/src/components/templates-page";
import { Navbar } from "@/src/components/navbar";

export default async function TemplatesPageRoute() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Only admins can access templates
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-8">
        <TemplatesPage />
      </main>
    </div>
  );
}

