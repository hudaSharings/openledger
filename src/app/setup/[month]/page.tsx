import { redirect } from "next/navigation";
import { getServerSession } from "@/src/lib/get-session";
import { SetupPage } from "@/src/components/setup-page";
import { Navbar } from "@/src/components/navbar";
import { MainContentWrapper } from "@/src/components/main-content-wrapper";

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
      <MainContentWrapper>
        <SetupPage monthYear={month} />
      </MainContentWrapper>
    </div>
  );
}

