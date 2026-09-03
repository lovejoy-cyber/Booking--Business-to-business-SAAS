"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, ApiError } from "@/lib/api-client";

export default function SignupPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", businessName: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function update(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await api.post("/api/auth/signup", form);
      await api.post("/api/analytics/events", { event: "signup" });
      router.push("/dashboard/onboarding");
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12 bg-paper">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display font-semibold text-lg">
          LeadForge
        </Link>
        <h1 className="font-display text-2xl font-semibold mt-6 mb-1">Start free</h1>
        <p className="text-sm text-slate mb-6">Reach your first quote in minutes.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input id="name" required className="input" value={form.name} onChange={update("name")} />
          </div>
          <div>
            <label className="label" htmlFor="businessName">
              Business name
            </label>
            <input
              id="businessName"
              required
              className="input"
              value={form.businessName}
              onChange={update("businessName")}
            />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="input"
              value={form.email}
              onChange={update("email")}
            />
          </div>
          <div>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="input"
              value={form.password}
              onChange={update("password")}
            />
            <p className="text-xs text-slate mt-1">At least 8 characters.</p>
          </div>

          {error && <p className="text-sm text-rust">{error}</p>}

          <button type="submit" disabled={loading} className="btn-accent w-full">
            {loading ? "Creating your account…" : "Create account"}
          </button>
        </form>

        <p className="text-sm text-slate mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-ink font-medium underline underline-offset-2">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
