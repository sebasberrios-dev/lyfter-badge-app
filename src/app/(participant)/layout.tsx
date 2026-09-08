import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { BottomTabBar } from "@/components/participant/bottom-tab-bar";

export default async function ParticipantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session || session.role !== "PARTICIPANT") {
    redirect("/login");
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <main className="flex-1 pb-20">{children}</main>
      <BottomTabBar />
    </div>
  );
}
