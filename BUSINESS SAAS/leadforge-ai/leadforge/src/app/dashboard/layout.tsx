import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/DashboardShell";
import { ToastProvider } from "@/components/Toast";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.userId },
    include: { business: true },
    orderBy: { createdAt: "asc" }
  });
  if (!membership) redirect("/login");

  return (
    <ToastProvider>
      <DashboardShell businessName={membership.business.name}>{children}</DashboardShell>
    </ToastProvider>
  );
}
