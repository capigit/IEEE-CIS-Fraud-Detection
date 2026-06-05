export const integerFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 0
});

export const compactFormatter = new Intl.NumberFormat("fr-FR", {
  notation: "compact",
  maximumFractionDigits: 1
});

export const decimalFormatter = new Intl.NumberFormat("fr-FR", {
  maximumFractionDigits: 2
});

export function formatInteger(value: number): string {
  return integerFormatter.format(value);
}

export function formatCompact(value: number): string {
  return compactFormatter.format(value);
}

export function formatDecimal(value: number, digits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function formatPercent(value: number, digits = 2): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  }).format(value);
}

export function formatGeneratedAt(value?: string): string {
  if (!value) return "non genere";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}
