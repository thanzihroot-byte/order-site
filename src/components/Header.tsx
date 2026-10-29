"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart-context";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Dining", href: "/#menu" },
  { label: "Order Food", href: "/" },
] as const;

export function Header() {
  const pathname = usePathname();
  const { count, hydrated } = useCart();
  const badge = hydrated ? count : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-linen/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 md:px-8 lg:px-8">
        {/* Brand */}
        <Link href="/" className="flex items-baseline gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest rounded-sm">
          <span className="font-display text-xl font-semibold text-forest md:text-2xl">
            The Grand Stay
          </span>
        </Link>

        {/* Primary nav */}
        <nav aria-label="Main" className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname.startsWith("/#menu") ? false : false;
            return (
              <Link
                key={link.label}
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={`rounded-sm px-0.5 pb-1 text-sm font-semibold transition-colors hover:text-forest focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest ${
                  active ? "text-forest" : "text-muted hover:text-forest"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        {/* Tray (cart) access */}
        <Link
          href="/cart"
          aria-label={`Open your cart — ${badge} item${badge === 1 ? "" : "s"} selected`}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-forest transition-colors hover:bg-cream focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
        >
          <svg viewBox="0 0 24 24" className="h-5.5 w-5.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M6 8h12l-1 12H7L6 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          {badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4.5 min-w-4.5 items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-forest-deep">
              {badge}
            </span>
          )}
        </Link>
      </div>

      {/* Mobile nav row */}
      <nav aria-label="Main mobile" className="flex items-center justify-center gap-6 border-t border-hairline px-4 py-2 md:hidden">
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            className={`text-xs font-semibold transition-colors ${
              pathname === link.href.split("#")[0]
                ? "text-forest"
                : "text-muted"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
