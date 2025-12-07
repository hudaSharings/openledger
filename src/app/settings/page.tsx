import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { SettingsPage } from "@/src/components/settings-page";
import { Navbar } from "@/src/components/navbar";
import { MainContentWrapper } from "@/src/components/main-content-wrapper";

export default async function SettingsPageRoute() {
  const session = await getServerSession();

  if (!session) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <MainContentWrapper>
        <SettingsPage />
      </MainContentWrapper>
    </div>
  );
}

