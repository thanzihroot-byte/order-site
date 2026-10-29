/**
 * Shared type definitions for The Grand Stay food ordering app.
 *
 * Raw field names mirror the existing Apps Script / Google Sheets contract
 * exactly (verified against the live endpoint):
 *   products → { ProductID, ProductName, Category, Price, ImageURL, stock }
 *   orders   → { OrderID, ProductID, Quantity, "Total price", "Payment Status" }
 */

/** Raw product row as returned by `?action=products`. */
export interface RawProduct {
  ProductID?: unknown;
  ProductName?: unknown;
  Category?: unknown;
  Price?: unknown;
  ImageURL?: unknown;
  stock?: unknown;
}

export interface Product {
  /** Product ID, e.g. "IT001". */
  id: string;
  name: string;
  /** Category as stored in the sheet, e.g. "DRINKS". */
  category: string;
  /** Unit price in whole rupees (authoritative — comes from the backend). */
  price: number;
  /** Product image URL, or "" when absent/placeholder. */
  imageUrl: string;
  /** Current stock quantity. 0 = unavailable. */
  stock: number;
}

/** Raw order row as returned by `?action=orders`. */
export interface RawOrder {
  OrderID?: unknown;
  ProductID?: unknown;
  Quantity?: unknown;
  "Total price"?: unknown;
  "Payment Status"?: unknown;
}

export interface OrderRecord {
  orderId: string;
  productId: string;
  quantity: number;
  total: number;
  paymentStatus: string;
}

/** Envelope returned by the Apps Script GET endpoints. */
export interface AppsScriptSuccess<T> {
  success: true;
  data: T;
}

export interface AppsScriptFailure {
  success: false;
  message: string;
}

/* ── Client → server route payloads ──────────────────────────────────────── */

/** POST /api/orders — one cart submission (multiple lines). */
export interface SubmitOrderRequest {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

/** What the server reports per line for a multi-item submission. */
export interface OrderLineResult {
  productId: string;
  productName: string;
  quantity: number;
  status: "created" | "failed" | "rejected";
  /** Server-generated order ID (sequential or prefixed, per backend). */
  orderId?: string;
  /** Price × quantity as accepted by the backend, when created. */
  total?: number;
  message?: string;
}

export interface SubmitOrderResponse {
  success: boolean;
  /** Human-readable summary for the UI. */
  message: string;
  results: OrderLineResult[];
  /** Number of lines actually accepted by the backend. */
  createdCount: number;
  /** Total value (from backend responses) of the lines created. */
  createdTotal: number;
}

/* ── Cart ────────────────────────────────────────────────────────────────── */

/** A cart line merged with authoritative product data at render time. */
export interface CartLine {
  product: Product;
  quantity: number;
  lineTotal: number;
}

export interface CartTotals {
  lineCount: number;
  unitCount: number;
  subtotal: number;
}
