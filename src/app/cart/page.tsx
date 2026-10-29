"use client";

import Link from "next/link";
import { useMemo } from "react";
import {
  useCart,
  type SubmissionLine,
} from "@/lib/cart-context";
import { useProducts } from "@/lib/products-context";
import { formatCurrency } from "@/lib/format";
import type { CartLine, OrderLineResult } from "@/lib/types";
import { CartItem } from "@/components/CartItem";
import { CartSummary } from "@/components/CartSummary";
import { EmptyCart } from "@/components/EmptyCart";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { ProductImage } from "@/components/ProductImage";

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDLMMcwKzDD4YosG-lj7RLuAnLOcGnolI2Gcs2frNS2bT9BG8TPGZPVPq8ogdG4m4XtupqlauY-0yHZYKQBr-x1ebXi5_CV-I7tSPmcTLl7lsEl5XOaGrcjm2iEyuJTLKyu2RVabXCOhNgiz2tKZPVyzK6esRZ-2D5Hk3k__qhyNoXC6kMXxNPmH19188sF3s-_CtT2H8qSCkaW8vlzk_cAZHMUY8DBCyN140km6g";

export default function CartPage() {
  const {
    quantities,
    setQuantity,
    hydrated,
    orderSubmission,
    isSubmitting,
    submitOrder,
    dismissSubmission,
  } = useCart();
  // Product data (prices/stock) comes from the shared cache-aware provider —
  // instant from localStorage on repeat visits, silently revalidated in the
  // background. Stock clamping/pruning of stale lines also happens there.
  const { products, loading, error, refresh } = useProducts();

  // Merge stored quantities with live product data; clamp to stock.
  const lines = useMemo<CartLine[]>(() => {
    if (!products || !hydrated) return [];
    const result: CartLine[] = [];
    for (const product of products) {
      const qty = quantities[product.id] ?? 0;
      if (qty > 0) {
        const clamped = Math.min(qty, product.stock);
        if (clamped > 0) {
          result.push({
            product,
            quantity: clamped,
            lineTotal: product.price * clamped,
          });
        }
      }
    }
    return result;
  }, [products, hydrated, quantities]);

  const totals = useMemo(() => {
    return lines.reduce(
      (acc, line) => ({
        units: acc.units + line.quantity,
        subtotal: acc.subtotal + line.lineTotal,
      }),
      { units: 0, subtotal: 0 },
    );
  }, [lines]);

  // ── Start the background order worker and return to the UI immediately ──
  const startBackgroundOrder = () => {
    if (isSubmitting || lines.length === 0 || !hydrated) return;
    const snapshot: SubmissionLine[] = lines.map((l) => ({
      productId: l.product.id,
      name: l.product.name,
      quantity: l.quantity,
    }));
    const items = lines.map((l) => ({ productId: l.product.id, quantity: l.quantity }));
    void submitOrder(items, snapshot);
  };

  /* ── Success screen — only shown after the backend confirmed every line ── */
  if (orderSubmission?.phase === "success" && hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl px-4 py-16 md:px-8">
        <div className="flex flex-col items-center gap-5 rounded-2xl border border-hairline bg-card px-6 py-14 text-center shadow-[var(--shadow-card)]">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-forest text-gold">
            <svg viewBox="0 0 24 24" className="h-10 w-10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
          </div>
          <h1 className="font-display text-3xl font-semibold text-forest">
            Order Confirmed
          </h1>
          <p className="max-w-md text-sm text-muted">{orderSubmission.message}</p>
          <ul className="w-full max-w-md space-y-2 rounded-xl bg-cream p-4 text-left">
            {orderSubmission.results.map((r) => (
              <li key={r.productId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">
                  {r.quantity} × {r.productName}
                </span>
                <span className="text-xs text-steel">
                  {r.orderId ? `Ref ${r.orderId} · ` : ""}
                  {r.total !== undefined ? formatCurrency(r.total) : ""}
                </span>
              </li>
            ))}
          </ul>
          <Link
            href="/"
            onClick={dismissSubmission}
            className="mt-2 rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-forest-deep"
          >
            Order More Food
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-steel">
          Your order has been recorded in The Grand Stay&apos;s dining ledger.
          Estimated in-suite delivery: 25–35 minutes.
        </p>
      </main>
    );
  }

  return (
    <>
      {/* ── Cart hero ── */}
      <section className="relative w-full overflow-hidden bg-forest py-8 text-white md:py-10">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center opacity-20 mix-blend-luminosity"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/95 to-forest-soft/85" aria-hidden="true" />
        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col justify-between gap-6 px-4 md:flex-row md:items-end md:px-8">
          <div className="max-w-2xl space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1">
              <svg viewBox="0 0 24 24" className="h-4 w-4 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gold">
                Your Cart
              </span>
            </div>
          </div>
          <div className="flex items-center gap-4 rounded-xl bg-forest-soft/70 p-4 shadow-md">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
              </svg>
            </div>
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wide">
                In-Suite Delivery
              </span>
              <span className="block text-xs text-hairline/70">
                Estimated 25–35 Mins • Freshly Plated
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-10 pb-20 md:px-8">
        {loading && (
          <div className="mx-auto max-w-4xl">
            <LoadingState />
          </div>
        )}

        {!loading && products === null && error !== null && (
          <ErrorState
            title="We couldn't check the menu"
            message={error}
            onRetry={() => refresh()}
          />
        )}

        {products !== null && hydrated && lines.length === 0 && <EmptyCart />}

        {/* ── Background worker status panels ── */}
        {products !== null && hydrated && orderSubmission?.phase === "sending" && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-hairline bg-card p-4 shadow-[var(--shadow-card)]">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 animate-spin text-gold" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 3a9 9 0 1 0 9 9" />
            </svg>
            <div>
              <span className="block text-sm font-semibold text-forest">
                Placing your order in the background…
              </span>
              <span className="block text-xs text-muted">
                {orderSubmission.lines.length} {orderSubmission.lines.length === 1 ? "line is" : "lines are"} being sent to the kitchen. Feel free to keep browsing — you&apos;ll be notified here the moment it&apos;s confirmed. Please don&apos;t re-order the same items from another device meanwhile.
              </span>
            </div>
          </div>
        )}

        {products !== null && hydrated && orderSubmission?.phase === "failed" && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-bordeaux/25 bg-bordeaux/5 p-4">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-bordeaux" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-bordeaux">
                Your order could not be completed
              </span>
              <span className="block text-xs text-muted">{orderSubmission.message}</span>
            </div>
            <button
              type="button"
              onClick={dismissSubmission}
              className="rounded-full border border-hairline bg-card px-4 py-2 text-xs font-semibold text-forest transition-colors hover:bg-cream"
            >
              Clear Status
            </button>
          </div>
        )}

        {products !== null && hydrated && orderSubmission?.phase === "unknown" && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-gold/40 bg-gold/5 p-4">
            <svg viewBox="0 0 24 24" className="h-6 w-6 shrink-0 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
            </svg>
            <div className="min-w-0 flex-1">
              <span className="block text-sm font-semibold text-forest">
                Order status unknown
              </span>
              <span className="block text-xs text-muted">
                The page was refreshed while your order was still being placed. It may or may not have reached the kitchen — before re-ordering, check the items below or call the concierge.
              </span>
            </div>
            <button
              type="button"
              onClick={dismissSubmission}
              className="rounded-full border border-hairline bg-card px-4 py-2 text-xs font-semibold text-forest transition-colors hover:bg-cream"
            >
              Clear Status
            </button>
          </div>
        )}

        {/* Per-line result breakdown after a failed/partial background run */}
        {products !== null &&
          hydrated &&
          orderSubmission?.phase === "failed" &&
          orderSubmission.results.length > 0 && (
            <div className="mb-4 space-y-2 rounded-xl border border-hairline bg-card p-4 shadow-[var(--shadow-card)]">
              <span className="block text-xs font-bold uppercase tracking-[0.12em] text-muted">
                Kitchen response per item
              </span>
              <ul className="space-y-1.5">
                {orderSubmission.results.map((r) => (
                  <LineResultRow key={r.productId} result={r} />
                ))}
              </ul>
            </div>
          )}

        {products !== null && lines.length > 0 && hydrated && (
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* Left column: cart lines */}
            <div className="flex flex-col gap-4 lg:col-span-8">
              <div className="flex items-center justify-between pb-1">
                <div className="flex items-center gap-3">
                  <h2 className="font-display text-2xl font-semibold text-forest">
                    Your Cart
                  </h2>
                  <span className="rounded-full bg-hairline px-3 py-0.5 text-xs font-bold text-muted">
                    {totals.units} {totals.units === 1 ? "item" : "items"}
                  </span>
                </div>
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-gold transition-colors hover:text-forest group"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-hover:-translate-x-1" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M19 12H5m6-6-6 6 6 6" />
                  </svg>
                  Continue Browsing
                </Link>
              </div>

              <div className="flex flex-col gap-4">
                {lines.map((line) => (
                  <CartItem
                    key={line.product.id}
                    product={line.product}
                    quantity={line.quantity}
                    lineTotal={line.lineTotal}
                    onQuantityChange={setQuantity}
                    onRemove={(id) => setQuantity(id, 0)}
                  />
                ))}
              </div>
            </div>

            {/* Right column: sticky summary */}
            <aside className="sticky top-24 lg:col-span-4">
              <CartSummary
                subtotal={totals.subtotal}
                uniqueCount={lines.length}
                unitCount={totals.units}
                submitting={isSubmitting}
                error={
                  orderSubmission?.phase === "failed" && orderSubmission.results.length === 0
                    ? orderSubmission.message
                    : null
                }
                onPlaceOrder={startBackgroundOrder}
              />
              {/* Featured line mini-card for visual balance */}
              {lines[0] && (
                <div className="mt-4 hidden items-center gap-3 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] lg:flex">
                  <div className="h-12 w-12 overflow-hidden rounded-lg bg-cream">
                    <ProductImage
                      src={lines[0].product.imageUrl}
                      alt={lines[0].product.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="block text-[10px] font-bold uppercase tracking-[0.08em] text-gold">
                      In your tray
                    </span>
                    <span className="block truncate font-display text-sm font-semibold text-forest">
                      {lines[0].product.name}
                      {lines.length > 1 ? ` + ${lines.length - 1} more` : ""}
                    </span>
                  </div>
                </div>
              )}
            </aside>
          </div>
        )}
      </main>
    </>
  );
}

/** One row of the per-line backend response after a failed submission. */
function LineResultRow({ result }: { result: OrderLineResult }) {
  const icon =
    result.status === "created" ? (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-forest text-white">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="m4.5 12.5 5 5 10-11" />
        </svg>
      </span>
    ) : result.status === "rejected" ? (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bordeaux/10 text-bordeaux">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6 6 18" />
        </svg>
      </span>
    ) : (
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
          <path d="M12 9v4m0 4h.01" />
        </svg>
      </span>
    );

  return (
    <li className="flex items-start gap-2 text-sm">
      {icon}
      <span className="min-w-0 flex-1 text-ink">
        {result.quantity} × {result.productName}
        {result.status === "created" ? (
          <span className="block text-[11px] text-muted">
            Confirmed by the kitchen{result.orderId ? ` — Ref ${result.orderId}` : ""}
            {result.total !== undefined ? ` · ${formatCurrency(result.total)}` : ""}
          </span>
        ) : (
          <span className="block text-[11px] text-muted">{result.message}</span>
        )}
      </span>
    </li>
  );
}
