import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logoDataUri, LOGO_WIDTH, LOGO_HEIGHT } from "@/assets/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Sign in to your U.S. Bank loan account" },
      {
        name: "description",
        content:
          "Log in from any device to view your loan disbursement status, checking and savings balances, and send money with Zelle or to other banks.",
      },
      { property: "og:title", content: "Sign in to your U.S. Bank loan account" },
      {
        property: "og:description",
        content:
          "Access your loan account, disbursements and transfers from any device.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function routeByRole(userId: string) {
    const { data: isOfficer } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "officer",
    });
    navigate({ to: isOfficer ? "/officer" : "/account", replace: true });
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeByRole(data.session.user.id);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setBusy(false);
    if (error || !data.user) {
      toast.error("Sign in failed", { description: error?.message });
      return;
    }
    await routeByRole(data.user.id);
  }

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/">
            <img
              src={logoDataUri}
              alt="U.S. Bank"
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              className="h-7 w-auto"
            />
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 items-center px-4 py-10">
        <form
          onSubmit={onSubmit}
          className="w-full rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]"
        >
        <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stay signed in on any device — your session is remembered.
          </p>

          <div className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <Button type="submit" className="mt-6 w-full" disabled={busy}>
            {busy ? "Please wait…" : "Sign in"}
          </Button>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No account yet?{" "}
            <Link to="/" className="font-medium text-primary hover:underline">
              Apply for a loan
            </Link>
          </p>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            Loan officer?{" "}
            <Link
              to="/officer"
              className="font-medium text-primary hover:underline"
            >
              Open the officer portal
            </Link>
          </p>
        </form>
      </main>
    </div>
  );
}
