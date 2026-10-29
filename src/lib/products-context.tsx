"use client";

/**
 * Products cache with stale-while-revalidate behavior.
 *
 * Speed model:
 *  - On app start the provider immediately hydrates from localStorage
 *    ("grand-stay-products-v1"), so the menu/cart paint instantly.
 *  - One background fetch then validates/refreshes the snapshot and silently
 *    updates the UI (never blocking on the ~3s Apps Script round-trip).
 *  - Rapid navigation/first paint within 60s of the last fetch skips the
 *    network entirely (throttle), so page switching costs nothing.
 *  - If the backend is unreachable, the cached menu keeps working; the error
 *    screen only appears when there is no cache to fall back on.
 *
 * The Google Sheet stays the source of truth: this is a display snapshot.
 * A fresh network response also prunes stale cart lines (vanished products,
 * over-stock quantities, sold-out items).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Product } from "./types";
import { useCart } from "./cart-context";

const CACHE_KEY = "grand-stay-products-v1";
const FETCH_TS_KEY = "grand-stay-products-fetched-at-v1";
/** Skip the background fetch if a fetch completed less than this long ago. */
const REVALIDATE_THROTTLE_MS = 60_000;

type Source = "none" | "cache" | "network";

interface ProductsContextValue {
  products: Product[] | null;
  /** True only when nothing renderable yet (first visit, no cache). */
  loading: boolean;
  /** Latest backend failure message; pages must show it only when products === null. */
  error: string | null;
  /** Where the currently rendered data came from. */
  source: Source;
  /** Force a background revalidation (after admin changes, pull-to-refresh…). */
  refresh: () => void;
}

const ProductsContext = createContext<ProductsContextValue | null>(null);

/* ── localStorage persistence ────────────────────────────────────────────── */

function readCache(): { products: Product[]; ts: number } {
  if (typeof window === "undefined") return { products: [], ts: 0 };
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return { products: [], ts: 0 };
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { products?: unknown }).products) ||
      typeof (parsed as { ts?: unknown }).ts !== "number"
    ) {
      return { products: [], ts: 0 };
    }
    // Sanitize the snapshot — cache files can be stale, hand-edited or old-versioned.
    const products: Product[] = [];
    for (const row of (parsed as { products: unknown[] }).products) {
      if (typeof row !== "object" || row === null) continue;
      const p = row as Record<string, unknown>;
      if (typeof p.id !== "string" || !p.id) continue;
      const price = Number(p.price);
      if (!Number.isFinite(price) || price < 0) continue;
      const stockNum = Number(p.stock);
      products.push({
        id: p.id,
        name: typeof p.name === "string" && p.name ? p.name : p.id,
        category: typeof p.category === "string" && p.category ? p.category : "OTHER",
        price,
        imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : "",
        stock: Number.isFinite(stockNum) && stockNum >= 0 ? Math.trunc(stockNum) : 0,
      });
    }
    return { products, ts: (parsed as { ts: number }).ts };
  } catch {
    return { products: [], ts: 0 };
  }
}

function writeCache(products: Product[], fetchedAt: number): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ ts: fetchedAt, products }),
    );
    window.localStorage.setItem(FETCH_TS_KEY, String(fetchedAt));
  } catch {
    // Storage full/unavailable — the app still works, just without caching.
  }
}

/** Last successful fetch time, persisted so page refreshes throttle too. */
function readLastFetchTs(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem(FETCH_TS_KEY);
    const ts = raw === null ? 0 : Number(raw);
    return Number.isFinite(ts) ? ts : 0;
  } catch {
    return 0;
  }
}

export function ProductsProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[] | null>(null);
  const [source, setSource] = useState<Source>("none");
  const [error, setError] = useState<string | null>(null);

  const { prune, setQuantity, quantities, hydrated } = useCart();
  const quantitiesRef = useRef(quantities);
  useEffect(() => {
    quantitiesRef.current = quantities;
  }, [quantities]);

  const lastFetchStartedRef = useRef(0);
  const inFlightRef = useRef(false);

  const fetchAndApply = useCallback(() => {
    if (inFlightRef.current) return;
    if (
      Date.now() - lastFetchStartedRef.current < REVALIDATE_THROTTLE_MS &&
      lastFetchStartedRef.current !== 0
    ) {
      return; // Recent fetch already ran — cache is still warm.
    }
    inFlightRef.current = true;
    lastFetchStartedRef.current = Date.now();

    fetch("/api/products", { cache: "no-store" })
      .then(async (res) => {
        const data = (await res.json()) as {
          success?: boolean;
          message?: string;
          products?: Product[];
        };
        if (
          !res.ok ||
          !data.success ||
          !Array.isArray(data.products)
        ) {
          throw new Error(data.message ?? "The menu could not be loaded.");
        }
        // Keep stock awareness inside the cart before switching the UI over:
        // clamp over-stock lines, drop vanished/sold-out products.
        const byId = new Map(data.products.map((p) => [p.id, p]));
        for (const [id, qty] of Object.entries(quantitiesRef.current)) {
          if (qty === 0) continue;
          const product = byId.get(id);
          if (!product || product.stock <= 0) {
            setQuantity(id, 0);
          } else if (qty > product.stock) {
            setQuantity(id, product.stock, product.stock);
          }
        }
        prune(data.products.map((p) => p.id));

        const fetchedAt = Date.now();
        writeCache(data.products, fetchedAt);
        setProducts(data.products);
        setSource("network");
        setError(null);
      })
      .catch((err: unknown) => {
        // Keep the cached menu visible; only record the message for pages
        // that have nothing renderable.
        setError(
          err instanceof Error
            ? err.message
            : "The menu could not be loaded right now.",
        );
      })
      .finally(() => {
        inFlightRef.current = false;
      });
  }, [prune, setQuantity]);

  const refresh = useCallback(() => {
    lastFetchStartedRef.current = 0; // bypass the throttle
    setError(null);
    fetchAndApply();
  }, [fetchAndApply]);

  // App-start prefetch: hydrate from cache immediately (deferred timer keeps
  // the effect body free of synchronous setState), then revalidate in the
  // background. Gated on cart hydration so cache-driven clamping/pruning can
  // never run against an empty cart before localStorage is loaded. The
  // throttle seed comes from localStorage, so even hard refreshes are free
  // while the cached snapshot is still fresh.
  useEffect(() => {
    if (!hydrated) return;
    lastFetchStartedRef.current = readLastFetchTs();
    const timer = setTimeout(() => {
      const cached = readCache();
      if (cached.products.length > 0) {
        setProducts(cached.products);
        setSource("cache");
      }
      fetchAndApply();
    }, 0);
    return () => clearTimeout(timer);
  }, [hydrated, fetchAndApply]);

  const value = useMemo<ProductsContextValue>(
    () => ({ products, loading: products === null, error, source, refresh }),
    [products, error, source, refresh],
  );

  return (
    <ProductsContext.Provider value={value}>
      {children}
    </ProductsContext.Provider>
  );
}

export function useProducts(): ProductsContextValue {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside <ProductsProvider>");
  return ctx;
}
