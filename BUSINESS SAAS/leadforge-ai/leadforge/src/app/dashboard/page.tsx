import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { formatCents } from "@/lib/money";
import { StatusBadge } from "@/components/StatusBadge";
import { EmptyState } from "@/components/EmptyState";

export default async function DashboardHome() {
  const session = await getSession();
  if (!session) redirect("/login");

  const membership = await prisma.businessMember.findFirst({
    where: { userId: session.userId },
    include: { business: true }
  });
  if (!membership) redirect("/login");
  const { business } = membership;

  if (business.onboardingStep < 2) redirect("/dashboard/onboarding");

  const [newLeads, activeLeads, pendingQuotes, acceptedQuotes, allQuotesCount, upcomingJobs, outstandingInvoices, paidInvoices, recentLeads] =
    await Promise.all([
      prisma.lead.count({ where: { businessId: business.id, status: "NEW" } }),
      prisma.lead.count({
        where: { businessId: business.id, status: { in: ["CONTACTED", "QUALIFIED", "QUOTE_SENT"] } }
      }),
      prisma.quote.count({ where: { businessId: business.id, status: { in: ["SENT", "VIEWED"] } } }),
      prisma.quote.count({ where: { businessId: business.id, status: "ACCEPTED" } }),
      prisma.quote.count({ where: { businessId: business.id, status: { not: "DRAFT" } } }),
      prisma.job.count({ where: { businessId: business.id, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } }),
      prisma.invoice.aggregate({
        where: { businessId: business.id, status: { in: ["SENT", "OVERDUE"] } },
        _sum: { totalCents: true },
        _count: true
      }),
      prisma.invoice.aggregate({
        where: { businessId: business.id, status: "PAID" },
        _sum: { totalCents: true }
      }),
      prisma.lead.findMany({
        where: { businessId: business.id },
        orderBy: { createdAt: "desc" },
        take: 5
      })
    ]);

  const acceptanceRate = allQuotesCount > 0 ? Math.round((acceptedQuotes / allQuotesCount) * 100) : null;
  const totalLeadsEver = await prisma.lead.count({ where: { businessId: business.id } });
  const conversionRate =
    totalLeadsEver > 0
      ? Math.round(
          ((await prisma.lead.count({ where: { businessId: business.id, status: "CONVERTED" } })) /
            totalLeadsEver) *
            100
        )
      : null;

  const stats = [
    { label: "New leads", value: newLeads, href: "/dashboard/leads?status=NEW" },
    { label: "Active leads", value: activeLeads, href: "/dashboard/leads" },
    { label: "Pending quotes", value: pendingQuotes, href: "/dashboard/quotes?status=SENT" },
    { label: "Accepted quotes", value: acceptedQuotes, href: "/dashboard/quotes?status=ACCEPTED" },
    { label: "Upcoming jobs", value: upcomingJobs, href: "/dashboard/jobs" },
    {
      label: "Outstanding invoices",
      value: formatCents(outstandingInvoices._sum.totalCents ?? 0, business.currency),
      sub: `${outstandingInvoices._count} unpaid`,
      href: "/dashboard/invoices?status=SENT"
    },
    {
      label: "Revenue (paid)",
      value: formatCents(paidInvoices._sum.totalCents ?? 0, business.currency),
      href: "/dashboard/invoices?status=PAID"
    },
    {
      label: "Quote acceptance rate",
      value: acceptanceRate !== null ? `${acceptanceRate}%` : "—",
      href: "/dashboard/quotes"
    }
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-slate mt-1">Here's what needs attention today.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/leads/new" className="btn-secondary">
            New Lead
          </Link>
          <Link href="/dashboard/quotes/new" className="btn-accent">
            Create Quote
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-ink transition-colors">
            <p className="text-xs text-slate">{s.label}</p>
            <p className="font-display text-2xl font-semibold mt-1">{s.value}</p>
            {s.sub ? <p className="text-xs text-slate mt-0.5">{s.sub}</p> : null}
          </Link>
        ))}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-semibold">Recent leads</h2>
        <Link href="/dashboard/leads" className="text-sm text-ink underline underline-offset-2">
          View all
        </Link>
      </div>

      {recentLeads.length === 0 ? (
        <EmptyState
          title="No leads yet"
          description="Log your first customer inquiry to see it appear here."
          action={
            <Link href="/dashboard/leads/new" className="btn-accent">
              New Lead
            </Link>
          }
        />
      ) : (
        <div className="card divide-y divide-slate-light">
          {recentLeads.map((lead) => (
            <Link
              key={lead.id}
              href={`/dashboard/leads/${lead.id}`}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-light/30 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{lead.customerName}</p>
                <p className="text-xs text-slate truncate max-w-md">{lead.inquiryText}</p>
              </div>
              <StatusBadge status={lead.status} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
