"use client";

import { useState, useTransition } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { updateCurrencyAction } from "@/lib/actions/settings";

const CURRENCIES = [
  { code: "USD", label: "US Dollar ($)" },
  { code: "EUR", label: "Euro (€)" },
  { code: "GBP", label: "British Pound (£)" },
  { code: "JPY", label: "Japanese Yen (¥)" },
  { code: "CAD", label: "Canadian Dollar (C$)" },
  { code: "AUD", label: "Australian Dollar (A$)" },
  { code: "CHF", label: "Swiss Franc (CHF)" },
  { code: "CNY", label: "Chinese Yuan (¥)" },
  { code: "INR", label: "Indian Rupee (₹)" },
  { code: "BRL", label: "Brazilian Real (R$)" },
  { code: "MXN", label: "Mexican Peso ($)" },
  { code: "KRW", label: "South Korean Won (₩)" },
  { code: "SGD", label: "Singapore Dollar (S$)" },
  { code: "HKD", label: "Hong Kong Dollar (HK$)" },
  { code: "SEK", label: "Swedish Krona (kr)" },
  { code: "NOK", label: "Norwegian Krone (kr)" },
  { code: "DKK", label: "Danish Krone (kr)" },
  { code: "PLN", label: "Polish Zloty (zł)" },
  { code: "CZK", label: "Czech Koruna (Kč)" },
  { code: "THB", label: "Thai Baht (฿)" },
  { code: "AED", label: "UAE Dirham (د.إ)" },
  { code: "SAR", label: "Saudi Riyal (﷼)" },
  { code: "ZAR", label: "South African Rand (R)" },
  { code: "NZD", label: "New Zealand Dollar (NZ$)" },
];

export function MultiCurrencyForm({ currentCurrency }: { currentCurrency: string }) {
  const [currency, setCurrency] = useState(currentCurrency);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function handleSelect(code: string) {
    setCurrency(code);
    setOpen(false);
    startTransition(async () => {
      const result = await updateCurrencyAction(code);
      if (result.ok) {
        toast("Currency updated.", "success");
      } else {
        toast(result.error ?? "Failed to update currency.", "error");
        setCurrency(currentCurrency);
      }
    });
  }

  const current = CURRENCIES.find((c) => c.code === currency);

  return (
    <div className="space-y-3">
      <div className="relative">
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between"
          onClick={() => setOpen(!open)}
          disabled={pending}
        >
          <span>{current?.label ?? currency}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {open && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-surface-border bg-surface-raised shadow-lg">
            {CURRENCIES.map((c) => (
              <button
                key={c.code}
                type="button"
                className={cn(
                  "flex w-full items-center px-3 py-2 text-sm text-left hover:bg-surface-subtle transition-colors",
                  currency === c.code && "bg-accent-subtle text-accent"
                )}
                onClick={() => handleSelect(c.code)}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    currency === c.code ? "opacity-100" : "opacity-0"
                  )}
                />
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-ink-muted">
        Used to format monetary values across invoices, proposals, and reports.
      </p>
    </div>
  );
}
