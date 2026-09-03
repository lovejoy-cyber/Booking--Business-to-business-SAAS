"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api-client";

const NAV = [
  { href: "/dashboard", label: "Dashboard", exact: true },
  { href: "/dashboard/leads", label: "Leads" },
  { href: "/dashboard/quotes", label: "Quotes" },
  { href: "/dashboard/customers", label: "Customers" },
  { href: "/dashboard/jobs", label: "Jobs" },
  { href: "/dashboard/invoices", label: "Invoices" },
  { href: "/dashboard/settings", label: "Settings" }
];

export function DashboardShell({
  businessName,
  children
}: {
  businessName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await api.post("/api/auth/logout");
    router.push("/");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex bg-paper">
      <aside className="w-60 shrink-0 border-r border-slate-light bg-white hidden md:flex md:flex-col">
        <div className="px-5 py-5 border-b border-slate-light">
          <Link href="/dashboard" className="font-display font-semibold text-lg">
            LeadForge
          </Link>
          <p className="text-xs text-slate mt-0.5 truncate">{businessName}</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "bg-ink text-paper" : "text-charcoal/70 hover:bg-slate-light/60"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-slate-light">
          <button onClick={handleSignOut} className="btn-ghost w-full justify-start text-sm">
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden border-b border-slate-light bg-white px-4 py-3 flex items-center justify-between">
          <Link href="/dashboard" className="font-display font-semibold">
            LeadForge
          </Link>
          <button onClick={handleSignOut} className="text-sm text-slate">
            Sign out
          </button>
        </header>
        <nav className="md:hidden flex overflow-x-auto gap-1 px-4 py-2 border-b border-slate-light bg-white">
          {NAV.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium ${
                  active ? "bg-ink text-paper" : "bg-slate-light/60 text-charcoal/70"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 px-4 sm:px-8 py-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
