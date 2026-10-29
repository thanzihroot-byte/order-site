"use client";

/**
 * Sticky order-summary card for the cart page.
 * Totals are computed ONLY from backend-verified product prices — the cart
 * stores quantities, never prices.
 *
 * Tax note: the existing Apps Script backend has no tax configuration, so no
 * tax line is shown (per spec: "tax only if applicable and configured").
 */
export function CartSummary({
  subtotal,
  uniqueCount,
  unitCount,
  submitting,
  error,
  onPlaceOrder,
}: {
  subtotal: number;
  uniqueCount: number;
  unitCount: number;
  submitting: boolean;
  error: string | null;
  onPlaceOrder: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-6 rounded-2xl bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="space-y-1">
          <h2 className="font-display text-2xl font-semibold text-forest">
            Order Summary
          </h2>
          <p className="text-xs text-muted">
            Review bill details before confirmation.
          </p>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted">
              Subtotal ({uniqueCount} {uniqueCount === 1 ? "item" : "items"},{" "}
              {unitCount} {unitCount === 1 ? "unit" : "units"})
            </span>
            <span className="text-base font-bold text-forest">
              ₹{subtotal.toLocaleString("en-IN")}.00
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-muted">In-Suite Delivery</span>
            <span className="rounded bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
              Free
            </span>
          </div>

          <div className="flex items-baseline justify-between border-t border-hairline pt-4">
            <div>
              <span className="font-display text-lg font-semibold text-forest">
                Total Amount
              </span>
              <span className="block text-xs text-muted/70">
                Pay at checkout — no service charge added
              </span>
            </div>
            <span className="font-display text-2xl font-bold text-gold">
              ₹{subtotal.toLocaleString("en-IN")}.00
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="rounded-lg border border-bordeaux/20 bg-bordeaux/5 px-4 py-3 text-xs text-bordeaux"
          >
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={onPlaceOrder}
          disabled={submitting || unitCount === 0}
          className="group flex w-full items-center justify-center gap-2 rounded-full bg-forest px-6 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (
            <>
              <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
              Placing Your Order…
            </>
          ) : (
            <>
              Place Order
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14m-6-6 6 6-6 6" />
              </svg>
            </>
          )}
        </button>
      </div>

      {/* Reassurance card */}
      <div className="flex items-start gap-3 rounded-xl bg-cream p-4">
        <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
        <div className="space-y-0.5">
          <span className="block text-xs font-semibold text-forest">
            Swift In-Room Delivery
          </span>
          <p className="text-xs text-muted">
            Complimentary tray delivery within 25–35 minutes of placement.
          </p>
        </div>
      </div>
    </div>
  );
}
