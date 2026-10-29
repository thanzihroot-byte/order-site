"use client";

import Link from "next/link";
import { useCart } from "@/lib/cart-context";

/**
 * Global background-order status chip.
 *
 * While the background order worker is posting lines to Apps Script (the
 * sequential calls can take several seconds), the user can keep browsing —
 * this banner keeps them informed without blocking anything. It renders on
 * the menu page; the cart page has richer inline presentations.
 */
export function OrderStatusBanner() {
  const { orderSubmission, dismissSubmission } = useCart();
  if (!orderSubmission) return null;

  let content: React.ReactNode = null;

  switch (orderSubmission.phase) {
    case "sending":
      content = (
        <div className="flex items-center gap-3 rounded-xl border border-hairline bg-card p-4 shadow-[var(--shadow-popper)]">
          <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 animate-spin text-gold" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M12 3a9 9 0 1 0 9 9" />
          </svg>
          <div className="min-w-44">
            <span className="block text-xs font-semibold text-forest">
              Placing your order…
            </span>
            <span className="block text-[11px] text-muted">
              {orderSubmission.lines.length} {orderSubmission.lines.length === 1 ? "line" : "lines"} being sent to the kitchen — you can keep browsing
            </span>
          </div>
        </div>
      );
      break;

    case "success":
      content = (
        <div className="flex items-center gap-3 rounded-xl border border-eligreen/25 bg-card p-4 shadow-[var(--shadow-popper)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-gold">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-forest">Order confirmed</span>
            <Link href="/cart" className="text-[11px] font-semibold text-gold hover:text-forest">
              View receipt →
            </Link>
          </div>
          <button type="button" onClick={dismissSubmission} aria-label="Dismiss" className="rounded-full p-1 text-steel hover:bg-cream">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      );
      break;

    case "failed":
      content = (
        <div className="flex items-center gap-3 rounded-xl border border-bordeaux/25 bg-card p-4 shadow-[var(--shadow-popper)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bordeaux/10 text-bordeaux">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 9v4m0 4h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-bordeaux">Order issue</span>
            <Link href="/cart" className="text-[11px] font-semibold text-gold hover:text-forest">
              Review cart →
            </Link>
          </div>
          <button type="button" onClick={dismissSubmission} aria-label="Dismiss" className="rounded-full p-1 text-steel hover:bg-cream">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      );
      break;

    case "unknown":
      content = (
        <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-card p-4 shadow-[var(--shadow-popper)]">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-forest">Order status unknown</span>
            <Link href="/cart" className="text-[11px] font-semibold text-gold hover:text-forest">
              Details →
            </Link>
          </div>
          <button type="button" onClick={dismissSubmission} aria-label="Dismiss" className="rounded-full p-1 text-steel hover:bg-cream">
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
        </div>
      );
      break;
  }

  return (
    <div className="fixed right-4 top-24 z-40 w-72 sm:w-80" role="status" aria-live="polite">
      {content}
    </div>
  );
}
