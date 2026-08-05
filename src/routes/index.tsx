import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { logoDataUri, LOGO_WIDTH, LOGO_HEIGHT } from "@/assets/logo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { RateChecker } from "@/components/RateChecker";
import { SignInDialog } from "@/components/SignInDialog";
import { LoanApplication } from "@/components/LoanApplication";
import { ContactSupportCards, SUPPORT_PHONE, SUPPORT_EMAIL } from "@/components/ContactSupport";
import { ShieldCheck, Clock, BadgeDollarSign, UserRound } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "U.S. Bank Personal Loans | Check Your Rate & Apply" },
      {
        name: "description",
        content:
          "Apply for a U.S. Bank personal loan from $10,000 to $100,000,000. Check your rate, complete your application online, and get loan officer approval under 24 hours.",
      },
      { property: "og:title", content: "U.S. Bank Personal Loans | Check Your Rate & Apply" },
      {
        property: "og:description",
        content:
          "Personal loans from $10,000 to $100,000,000. Check your rate and apply online with approval under 24 hours.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const [signInOpen, setSignInOpen] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [amount, setAmount] = useState(25000);
  const [apr, setApr] = useState(8.99);
  const [term, setTerm] = useState(60);
  const applyRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(!!data.session);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") setSignedIn(true);
      if (event === "SIGNED_OUT") setSignedIn(false);
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const scrollTo = (el: HTMLElement | null) =>
    el?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="min-h-screen bg-background">
      <Toaster />
      <SignInDialog open={signInOpen} onOpenChange={setSignInOpen} />

      <header className="sticky top-0 z-40 border-b bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <img
            src={logoDataUri}
            alt="U.S. Bank"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="h-7 w-auto sm:h-8"
          />
          <div className="flex items-center gap-2">
            {signedIn ? (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/account">
                  <UserRound className="mr-2 h-4 w-4" /> My account
                </Link>
              </Button>
            ) : (
              <Button variant="ghost" size="sm" onClick={() => setSignInOpen(true)}>
                Sign in
              </Button>
            )}
            <Button size="sm" onClick={() => scrollTo(applyRef.current)}>
              Apply Now
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="bg-[image:var(--gradient-hero)] text-primary-foreground">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-2 lg:items-center">
            <div>
              <h1 className="text-4xl font-bold leading-tight sm:text-5xl">
                Banking that moves with you.
              </h1>
              <p className="mt-4 max-w-lg text-lg text-primary-foreground/85">
                Check your rate for a personal loan, open checking & savings, and send
                money instantly with Zelle, Cash App, or to any U.S. bank.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button
                  size="lg"
                  variant="secondary"
                  onClick={() => scrollTo(applyRef.current)}
                >
                  Check your rate
                </Button>
                <Button
                  size="lg"
                  className="bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => scrollTo(applyRef.current)}
                >
                  Apply Now
                </Button>
              </div>
            </div>

            <div ref={applyRef} className="scroll-mt-20 text-foreground">
              <RateChecker
                onApply={(a, r, t) => {
                  setAmount(a);
                  setApr(r);
                  setTerm(t);
                  scrollTo(formRef.current);
                }}
              />
            </div>

          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 sm:grid-cols-3">
            <Feature
              icon={<BadgeDollarSign className="h-6 w-6 text-accent" />}
              title="$10,000 – $100,000,000"
              text="Borrow the amount that fits your plans, with fixed monthly payments."
            />
            <Feature
              icon={<Clock className="h-6 w-6 text-accent" />}
              title="Under 24 hours"
              text="Every loan request is reviewed and approved by a loan officer within 24 hours."
            />
            <Feature
              icon={<ShieldCheck className="h-6 w-6 text-accent" />}
              title="Secure application"
              text="Your SSN, contact details and signature are protected end to end."
            />
          </div>
        </section>

        <section className="bg-surface py-14">
          <div ref={formRef} className="mx-auto max-w-3xl scroll-mt-20 px-4">
            <h2 className="text-center text-3xl font-bold text-foreground">
              Complete your loan application
            </h2>
            <p className="mt-2 text-center text-muted-foreground">
              Provide your full information, agree to the loan agreement and sign.
            </p>
            <div className="mt-8">
              <LoanApplication initialAmount={amount} apr={apr} termMonths={term} />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t bg-card">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center">
          <img
            src={logoDataUri}
            alt="U.S. Bank"
            width={LOGO_WIDTH}
            height={LOGO_HEIGHT}
            className="h-6 w-auto"
          />
          <p className="text-xs text-muted-foreground">
            Loan approval is subject to credit review. Member FDIC. Equal Housing Lender.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <a
              href={`tel:${SUPPORT_PHONE.replace(/[^\d+]/g, "")}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Support: {SUPPORT_PHONE}
            </a>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>

          <div className="w-full max-w-xl">
            <ContactSupportCards />
          </div>

          <Link
            to="/officer"
            className="text-xs font-medium text-primary underline-offset-4 hover:underline"
          >
            Loan officer portal
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Feature({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)]">
      {icon}
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
