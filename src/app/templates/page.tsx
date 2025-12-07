import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { TemplatesPage } from "@/src/components/templates-page";
import { Navbar } from "@/src/components/navbar";
import { MainContentWrapper } from "@/src/components/main-content-wrapper";

export default async function TemplatesPageRoute() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  // Only admins can access recurring items
  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <MainContentWrapper>
        <TemplatesPage />
      </MainContentWrapper>
    </div>
  );
}

