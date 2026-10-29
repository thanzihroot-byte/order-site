/** Formats rupee amounts, e.g. ₹1,240. */
export function formatCurrency(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

/** Formats rupee amounts with two decimals, used in the cart summary. */
export function formatCurrencyExact(amount: number): string {
  return `₹${amount.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
