"use client";

import Link from "next/link";

/** Empty-cart screen following the Stitch cart reference. */
export function EmptyCart() {
  return (
    <div
      className="mx-auto flex max-w-xl flex-col items-center justify-center px-4 py-16 text-center md:py-24"
      role="status"
    >
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-hairline text-gold shadow-inner md:h-32 md:w-32">
        <svg viewBox="0 0 24 24" className="h-12 w-12" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 8h12l-1 12H7L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      </div>
      <h2 className="mb-2 font-display text-3xl font-semibold text-forest">
        Your Cart is Empty
      </h2>
      <p className="mb-8 text-base text-muted">
        Discover something exquisite from our kitchen&apos;s curated in-room
        dining collection.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-forest-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h10" />
        </svg>
        Browse Food Menu
      </Link>
    </div>
  );
}
