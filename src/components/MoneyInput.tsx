import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { dollarsToMinor, minorToDollarInput } from "@/lib/paymentReport";

export function MoneyInput({
  valueMinor,
  ariaLabel,
  onCommit,
  className,
}: {
  valueMinor: number;
  ariaLabel: string;
  onCommit: (amountMinor: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(minorToDollarInput(valueMinor));

  useEffect(() => {
    setDraft(minorToDollarInput(valueMinor));
  }, [valueMinor]);

  return (
    <label
      className="block min-w-0"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
    >
      <Input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        className={className ?? "h-10 text-right tabular-nums"}
        aria-label={ariaLabel}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => {
          try {
            const next = dollarsToMinor(draft);
            setDraft(minorToDollarInput(next));
            if (next !== valueMinor) onCommit(next);
          } catch {
            setDraft(minorToDollarInput(valueMinor));
          }
        }}
      />
    </label>
  );
}
