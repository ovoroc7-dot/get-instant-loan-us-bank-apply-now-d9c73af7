import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";

const MIN = 10000;
const MAX = 100000000;

export function RateChecker({
  onApply,
}: {
  onApply: (amount: number, apr: number, term: number) => void;
}) {
  const [amount, setAmount] = useState(25000);
  const [rate, setRate] = useState<number | null>(null);

  const term = 60;
  const apr = 8.99;
  const monthly =
    (amount * (apr / 100 / 12)) / (1 - Math.pow(1 + apr / 100 / 12, -term));

  return (
    <div className="rounded-xl border bg-card p-6 shadow-[var(--shadow-card)] sm:p-8">
      <h3 className="text-xl font-bold text-foreground">Check your rate</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Select an amount between $10,000 and $100,000,000. Checking your rate won't affect
        your credit score.
      </p>

      <div className="mt-6">
        <div className="flex items-end justify-between">
          <span className="text-sm font-medium text-muted-foreground">Loan amount</span>
          <span className="text-3xl font-bold text-primary">
            ${amount.toLocaleString()}
          </span>
        </div>
        <Slider
          className="mt-4"
          min={MIN}
          max={MAX}
          step={10000}
          value={[amount]}
          onValueChange={(v) => {
            setAmount(v[0]);
            setRate(null);
          }}
        />
        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
          <span>$10,000</span>
          <span>$100,000,000</span>
        </div>
      </div>

      {rate !== null && (
        <div className="mt-6 rounded-lg bg-surface p-4">
          <p className="text-sm font-semibold text-foreground">
            You're pre-qualified for ${amount.toLocaleString()}
          </p>
          <div className="mt-3 flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated APR</span>
            <span className="font-semibold text-foreground">{apr}%</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Term</span>
            <span className="font-semibold text-foreground">{term} months</span>
          </div>
          <div className="mt-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Estimated monthly payment</span>
            <span className="font-semibold text-foreground">
              ${monthly.toFixed(2)}
            </span>
          </div>
          <Button className="mt-4 w-full" onClick={() => onApply(amount, apr, term)}>
            Apply with this rate
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Continue to your application — it only takes a few minutes.
          </p>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={() => setRate(apr)}>
          {rate !== null ? "Recheck your rate" : "Check your rate"}
        </Button>
        <Button className="flex-1" onClick={() => onApply(amount, apr, term)}>
          Apply Now
        </Button>
      </div>
    </div>
  );
}
