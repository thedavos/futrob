export function formatSignedNumber(value: number, numberFormat: Intl.NumberFormat): string {
  const formatted = numberFormat.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `−${formatted}`;
  return formatted;
}
