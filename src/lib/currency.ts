import type { InvoiceCurrency } from "@/types";

export function currencySymbol(currency: InvoiceCurrency): string {
  return currency === "ZWL" ? "ZWL$" : "$";
}

export function formatMoney(amount: number, currency: InvoiceCurrency): string {
  return `${currencySymbol(currency)}${amount.toFixed(2)}`;
}
