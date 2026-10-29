"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-context";
import { useProducts } from "@/lib/products-context";
import { FoodCard } from "@/components/FoodCard";
import { FoodCategoryFilters } from "@/components/FoodCategoryFilters";
import { LoadingState } from "@/components/LoadingState";
import { ErrorState } from "@/components/ErrorState";
import { OrderStatusBanner } from "@/components/OrderStatusBanner";

const HERO_BG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDM7uYi5W4O4DJRvx5k9mRumABxrLr0iAXLv6tjfeb6aaAVeEqAcNdSiD0dO5qwFHD6iVGeN2dzMO4Uj8SKOWh076Po2mXHVpvAUt3dgjMr8-s1oSb4PdyOTs91ydbzQenLYnpZboKqmGrP90WhxHXlP13s4xgdcqMTn-Km5xJP7eulcaoQY4359BsSm-suSdst2uZbdiSJz9O-w_qOAYNDm6diwQNNbLcwXJH_nA";

export default function MenuPage() {
  const { quantities, setQuantity, hydrated } = useCart();
  // Cached snapshot renders instantly; background revalidation keeps it fresh.
  const { products, loading, error, refresh } = useProducts();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  // Categories derived from actual data (never a hardcoded list).
  const categories = useMemo(() => {
    if (!products) return [];
    const counts = new Map<string, number>();
    for (const p of products) {
      counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [products]);

  const filtered = useMemo(() => {
    if (!products) return [];
    const query = search.trim().toLowerCase();
    return products.filter((p) => {
      const inCategory = category === "All" || p.category === category;
      const inSearch =
        !query ||
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query);
      return inCategory && inSearch;
    });
  }, [products, search, category]);

  const trayUnits = useMemo(
    () => (hydrated ? Object.values(quantities).reduce((a, b) => a + b, 0) : 0),
    [quantities, hydrated],
  );

  return (
    <>
      <OrderStatusBanner />

      {/* ── Immersive editorial hero ── */}
      <section className="relative w-full overflow-hidden bg-forest">
        <div
          className="absolute inset-0 scale-105 bg-cover bg-center opacity-40 mix-blend-luminosity"
          style={{ backgroundImage: `url('${HERO_BG}')` }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-forest via-forest/80 to-transparent" aria-hidden="true" />
        <div className="absolute inset-0 bg-gradient-to-t from-forest/90 via-transparent to-forest/40" aria-hidden="true" />

        <div className="relative mx-auto flex w-full max-w-7xl items-center px-4 py-8 md:px-8 md:py-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gold/15 px-3 py-1">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" aria-hidden="true" />
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-gold">
              Food &amp; Dining Concierge
            </span>
          </div>
        </div>
      </section>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 md:px-8 md:py-10">
        {/* ── Search + category filter bar ── */}
        <div className="flex w-full flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <FoodCategoryFilters
            categories={categories}
            selected={category}
            onSelect={setCategory}
            resultLabel={`${filtered.length} offering${filtered.length === 1 ? "" : "s"} available`}
          />
          <label className="relative flex max-w-full w-full items-center sm:w-72">
            <span className="sr-only">Search food items by name</span>
            <svg viewBox="0 0 24 24" className="absolute left-3.5 h-4 w-4 text-steel" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search the menu…"
              className="w-full rounded-full border border-hairline bg-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-steel focus:border-forest focus:outline-none"
            />
          </label>
        </div>

        {/* ── Menu states ── */}
        {loading && <LoadingState />}

        {!loading && products === null && error !== null && (
          <ErrorState message={error} onRetry={() => refresh()} />
        )}

        {products !== null && products.length === 0 && (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-hairline bg-card px-8 py-14 text-center shadow-[var(--shadow-card)]">
            <h2 className="font-display text-2xl font-semibold text-forest">
              The menu is still being plated
            </h2>
            <p className="text-sm text-muted">
              No dishes are published in the kitchen sheet yet — please check
              back shortly.
            </p>
          </div>
        )}

        {products !== null && products.length > 0 && filtered.length === 0 && (
          <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-xl border border-hairline bg-card px-8 py-14 text-center shadow-[var(--shadow-card)]">
            <h2 className="font-display text-2xl font-semibold text-forest">
              Nothing matches that search
            </h2>
            <p className="text-sm text-muted">
              Try another dish name or category filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="rounded-full bg-forest px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-forest-deep"
            >
              Reset Filters
            </button>
          </div>
        )}

        {products !== null && filtered.length > 0 && (
          <div className="grid grid-cols-1 gap-6 pt-2 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((product) => (
              <FoodCard
                key={product.id}
                product={product}
                quantity={hydrated ? (quantities[product.id] ?? 0) : 0}
                onQuantityChange={setQuantity}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Floating sticky tray bar ── */}
      <aside
        aria-label="Order tray summary"
        className={`fixed bottom-6 left-1/2 z-40 w-[92%] max-w-2xl -translate-x-1/2 transition-all duration-500 ${
          trayUnits > 0
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-32 opacity-0"
        }`}
      >
        <div className="flex items-center justify-between gap-4 rounded-full border border-gold/30 bg-forest p-3 text-white shadow-[var(--shadow-popper)]">
          <div className="flex items-center gap-4 pl-3">
            <div className="relative flex h-10 w-10 items-center justify-center rounded-full bg-gold/20 text-gold">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" />
              </svg>
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-forest-deep">
                {trayUnits}
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white">
                Tray Subtotal
              </span>
              <div className="flex items-baseline gap-2">
                <span className="text-sm text-white/90">
                  {trayUnits} {trayUnits === 1 ? "item" : "items"}
                </span>
                <span className="text-white/50">·</span>
                <span className="font-display text-lg font-bold text-white">
                  {formatTraySubtotal(quantities, products)}
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/cart"
            className="flex items-center gap-1.5 rounded-full bg-gold px-6 py-2.5 text-sm font-bold tracking-wide text-forest-deep transition-colors hover:bg-champagne focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold"
          >
            View Order
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" />
            </svg>
          </Link>
        </div>
      </aside>
    </>
  );
}

/** Tray subtotal computed strictly from product data (never stored locally). */
function formatTraySubtotal(
  quantities: Record<string, number>,
  products: { id: string; price: number }[] | null,
): string {
  if (!products) return "₹0";
  let subtotal = 0;
  for (const [id, qty] of Object.entries(quantities)) {
    const p = products.find((x) => x.id === id);
    if (p && qty > 0) subtotal += p.price * qty;
  }
  return `₹${subtotal.toLocaleString("en-IN")}`;
}
