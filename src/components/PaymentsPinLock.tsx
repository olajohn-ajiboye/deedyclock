import { useState } from "react";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isPaymentsUnlocked, tryUnlockPayments } from "@/lib/paymentPin";

export function PaymentsPinLock({ children }: { children: React.ReactNode }) {
  const [unlocked, setUnlocked] = useState(() => isPaymentsUnlocked());
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (unlocked) return children;

  return (
    <div className="max-w-md mx-auto mt-8 rounded-[2rem] bg-card border border-border shadow-[var(--shadow-elevated)] p-8">
      <div
        className="w-12 h-12 rounded-2xl grid place-items-center text-primary-foreground mb-5"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Lock className="w-5 h-5" />
      </div>
      <p className="uppercase tracking-[0.2em] text-xs text-muted-foreground">Payments</p>
      <h2 className="font-display text-3xl font-semibold mt-1">Enter PIN</h2>
      <p className="text-sm text-muted-foreground mt-2 mb-6">
        This page is for salon owners. Unlock stays until you close this tab or sign out.
      </p>
      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (tryUnlockPayments(pin)) {
            setError(null);
            setUnlocked(true);
            return;
          }
          setError("That PIN is not correct.");
        }}
      >
        <Input
          type="password"
          inputMode="numeric"
          autoComplete="off"
          value={pin}
          onChange={(event) => {
            setPin(event.target.value);
            setError(null);
          }}
          aria-label="Payments PIN"
          className="h-12 rounded-xl"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full h-12 rounded-xl">
          Unlock
        </Button>
      </form>
    </div>
  );
}
