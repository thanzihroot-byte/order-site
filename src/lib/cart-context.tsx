"use client";

/**
 * Cart state shared between the menu (/) and cart (/cart) pages.
 *
 * The cart is deliberately stored as a shallow map of productId → quantity in
 * localStorage. Product data (name, price, stock) is ALWAYS re-fetched from
 * the backend and never trusted from the browser, so prices and totals shown
 * anywhere are computed from backend-verified values only.
 *
 * Order placement runs as a BACKGROUND WORKER: `submitOrder()` returns
 * immediately after snapshotting the cart, then performs the sequential
 * createOrder calls to Apps Script while the user keeps browsing. The
 * submission state machine survives navigation (React context) and even a
 * page refresh (sessionStorage). It never claims success before the backend
 * confirms — see the three explicit terminal phases below.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { OrderLineResult, SubmitOrderResponse } from "./types";

const STORAGE_KEY = "grand-stay-cart-v1";
const SUBMISSION_KEY = "grand-stay-order-v1";

type CartMap = Record<string, number>;

/** One cart line captured when Place Order was pressed (for status displays). */
export interface SubmissionLine {
  productId: string;
  name: string;
  quantity: number;
}

/**
 * Submission lifecycle:
 *  sending  → sequential backend calls in flight; user can keep browsing.
 *  success  → backend accepted EVERY line; cart cleared.
 *  failed   → backend rejected/at least partially failed; rejected lines are
 *             removed from the cart, the rest kept for retry.
 *  unknown  → the tab was refreshed/closed mid-flight; the result of the
 *             in-progress submission cannot be verified, so we never claim
 *             success and ask the user to check with the concierge.
 */
export type OrderSubmission =
  | { phase: "sending"; lines: SubmissionLine[] }
  | {
      phase: "success";
      message: string;
      lines: SubmissionLine[];
      results: OrderLineResult[];
      createdTotal: number;
    }
  | {
      phase: "failed";
      message: string;
      lines: SubmissionLine[];
      results: OrderLineResult[];
    }
  | { phase: "unknown"; lines: SubmissionLine[] };

interface CartContextValue {
  /** productId → quantity (validated ≥ 0, integers only). */
  quantities: CartMap;
  /** Total number of units selected (sum of quantities). */
  count: number;
  /** True after hydration from localStorage has run (SSR-safe rendering). */
  hydrated: boolean;
  /** Background order submission state (null when idle/dismissed). */
  orderSubmission: OrderSubmission | null;
  /** True while the background worker is still posting lines. */
  isSubmitting: boolean;
  /**
   * Start a background order submission. Returns immediately; the network
   * work continues in the worker below and surfaces via `orderSubmission`.
   */
  submitOrder: (items: Array<{ productId: string; quantity: number }>, lines: SubmissionLine[]) => void;
  /** Clears the submission banner/screens (after reading the result). */
  dismissSubmission: () => void;
  /**
   * Set quantity for a product, clamped to [0, max].
   * quantity 0 removes the item from the cart.
   */
  setQuantity: (productId: string, quantity: number, max?: number) => void;
  /** Removes every line. */
  clearCart: () => void;
  /** Drops stored lines whose productId no longer exists in the product list. */
  prune: (validProductIds: string[]) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

function parseStoredCart(): CartMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};

    const clean: CartMap = {};
    for (const [id, qty] of Object.entries(parsed as Record<string, unknown>)) {
      const n = Number(qty);
      if (typeof id === "string" && id.trim() && Number.isInteger(n) && n > 0) {
        clean[id] = n;
      }
    }
    return clean;
  } catch {
    return {};
  }
}

function readSubmission(): OrderSubmission | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(SUBMISSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as OrderSubmission;
  } catch {
    return null;
  }
}

function persistSubmission(submission: OrderSubmission | null): void {
  if (typeof window === "undefined") return;
  try {
    if (submission === null) {
      window.sessionStorage.removeItem(SUBMISSION_KEY);
    } else {
      window.sessionStorage.setItem(SUBMISSION_KEY, JSON.stringify(submission));
    }
  } catch {
    // Storage unavailable — banner just won't survive a refresh.
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [quantities, setQuantities] = useState<CartMap>({});
  const [hydrated, setHydrated] = useState(false);
  const [orderSubmission, setOrderSubmission] = useState<OrderSubmission | null>(null);

  // Hydrate from localStorage on first mount (cart survives refresh/navigation).
  // Deferred to a timeout so the effect body itself doesn't set state
  // synchronously (avoids cascading renders).
  useEffect(() => {
    const stored = parseStoredCart();
    const memo = readSubmission();
    const timer = setTimeout(() => {
      setQuantities(stored);
      // A submission captured as "sending" died with the previous page load —
      // its result can never be verified, so downgrade it honestly.
      if (memo) {
        if (memo.phase === "sending") {
          const unknown: OrderSubmission = { phase: "unknown", lines: memo.lines };
          persistSubmission(unknown);
          setOrderSubmission(unknown);
        } else {
          setOrderSubmission(memo);
        }
      }
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Persist on every change after hydration.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quantities));
    } catch {
      // Storage full/unavailable — cart simply won't persist.
    }
  }, [quantities, hydrated]);

  const setQuantity = useCallback(
    (productId: string, quantity: number, max = 99) => {
      const clamped = Math.min(Math.max(Math.trunc(quantity), 0), Math.max(0, max));
      setQuantities((prev) => {
        if (clamped === 0) {
          const next = { ...prev };
          delete next[productId];
          return next;
        }
        if (prev[productId] === clamped) return prev;
        return { ...prev, [productId]: clamped };
      });
    },
    [],
  );

  const clearCart = useCallback(() => setQuantities({}), []);

  const prune = useCallback((validProductIds: string[]) => {
    const valid = new Set(validProductIds);
    setQuantities((prev) => {
      const next: CartMap = {};
      for (const [id, qty] of Object.entries(prev)) {
        if (valid.has(id)) next[id] = qty;
      }
      return next;
    });
  }, []);

  const dismissSubmission = useCallback(() => {
    persistSubmission(null);
    setOrderSubmission(null);
  }, []);

  /* ── Background order worker ────────────────────────────────────────────── */
  const submitOrder = useCallback(
    async (
      items: Array<{ productId: string; quantity: number }>,
      lines: SubmissionLine[],
    ) => {
      if (items.length === 0) return;

      const start: OrderSubmission = { phase: "sending", lines };
      persistSubmission(start);
      setOrderSubmission(start);

      try {
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });

        let data: SubmitOrderResponse | null = null;
        try {
          data = (await res.json()) as SubmitOrderResponse;
        } catch {
          data = null;
        }

        if (data) {
          // Lines the backend rejected (unknown product / sold out) are always
          // dropped from the cart; everything else stays for review/retry.
          for (const result of data.results) {
            if (result.status === "rejected") {
              setQuantity(result.productId, 0);
            }
          }

          if (data.success && data.createdCount === items.length) {
            clearCart();
            const done: OrderSubmission = {
              phase: "success",
              message: data.message,
              lines,
              results: data.results,
              createdTotal: data.createdTotal,
            };
            persistSubmission(done);
            setOrderSubmission(done);
          } else {
            const done: OrderSubmission = {
              phase: "failed",
              message: data.message,
              lines,
              results: data.results,
            };
            persistSubmission(done);
            setOrderSubmission(done);
          }
        } else {
          const done: OrderSubmission = {
            phase: "failed",
            message:
              res.ok
                ? "The kitchen responded with an unexpected message."
                : `The kitchen could not be reached (HTTP ${res.status}). Your items are still in the cart.`,
            lines,
            results: [],
          };
          persistSubmission(done);
          setOrderSubmission(done);
        }
      } catch {
        const done: OrderSubmission = {
          phase: "failed",
          message:
            "Could not reach the server while placing your order — your items are still in the cart.",
          lines,
          results: [],
        };
        persistSubmission(done);
        setOrderSubmission(done);
      }
    },
    [clearCart, setQuantity],
  );

  const count = useMemo(
    () => Object.values(quantities).reduce((sum, q) => sum + q, 0),
    [quantities],
  );

  const isSubmitting = orderSubmission?.phase === "sending";

  const value = useMemo<CartContextValue>(
    () => ({
      quantities,
      count,
      hydrated,
      orderSubmission,
      isSubmitting,
      submitOrder,
      dismissSubmission,
      setQuantity,
      clearCart,
      prune,
    }),
    [
      quantities,
      count,
      hydrated,
      orderSubmission,
      isSubmitting,
      submitOrder,
      dismissSubmission,
      setQuantity,
      clearCart,
      prune,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
