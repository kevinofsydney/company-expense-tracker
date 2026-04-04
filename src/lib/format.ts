export function formatCurrencyFromCents(amountCents: number) {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amountCents / 100);
}

export function formatDateLabel(date: string) {
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T00:00:00`));
}

export function compactNumber(value: number) {
  return new Intl.NumberFormat("en-AU").format(value);
}
