"use client";

/**
 * Compact pill quantity selector `[- qty +]` from the Stitch design.
 * - Never lets the quantity go below zero; at zero the item is deselected.
 * - Never exceeds `max` (product stock), unless max is 0 → fully disabled.
 * - Minus is disabled at 0 (matches the Stitch reference card behavior).
 */
export function QuantitySelector({
  productId,
  value,
  max,
  onChange,
  small = false,
}: {
  productId: string;
  value: number;
  max: number;
  onChange: (productId: string, next: number) => void;
  /** Compact size used inside menu cards. */
  small?: boolean;
}) {
  const disabled = max <= 0;
  const canDecrement = !disabled && value > 0;
  const canIncrement = !disabled && value < max;

  const btnBase =
    "flex items-center justify-center rounded-full transition-colors disabled:opacity-30 disabled:pointer-events-none";

  if (small) {
    return (
      <div
        className="flex items-center rounded-full bg-cream p-1 shadow-inner"
        role="group"
        aria-label={`Quantity for ${productId}`}
      >
        <button
          type="button"
          aria-label={`Decrease quantity (currently ${value})`}
          disabled={!canDecrement}
          onClick={() => onChange(productId, value - 1)}
          className={`${btnBase} h-7 w-7 text-muted hover:text-forest disabled:opacity-30`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M5 12h14" />
          </svg>
        </button>
        <span
          aria-live="polite"
          className="w-7 select-none text-center text-sm font-semibold text-forest [font-variant-numeric:tabular-nums]"
        >
          {value}
        </span>
        <button
          type="button"
          aria-label={`Increase quantity (currently ${value})`}
          disabled={!canIncrement}
          onClick={() => onChange(productId, value + 1)}
          className={`${btnBase} h-7 w-7 bg-forest text-white hover:bg-forest-deep shadow-sm`}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      </div>
    );
  }

  // Cart page variant: both buttons outlined, larger.
  return (
    <div
      className="flex items-center gap-2 rounded-full bg-cream p-1 shadow-inner"
      role="group"
      aria-label={`Quantity for ${productId}`}
    >
      <button
        type="button"
        aria-label={`Decrease quantity (currently ${value})`}
        disabled={!canDecrement}
        onClick={() => onChange(productId, value - 1)}
        className={`${btnBase} h-8 w-8 bg-card text-forest shadow-sm hover:bg-hairline/60`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M5 12h14" />
        </svg>
      </button>
      <span
        aria-live="polite"
        className="w-6 select-none text-center text-base font-semibold text-forest [font-variant-numeric:tabular-nums]"
      >
        {value}
      </span>
      <button
        type="button"
        aria-label={`Increase quantity (currently ${value})`}
        disabled={!canIncrement}
        onClick={() => onChange(productId, value + 1)}
        className={`${btnBase} h-8 w-8 bg-card text-forest shadow-sm hover:bg-hairline/60`}
      >
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}
