/**
 * Server-side client for the existing Google Apps Script backend.
 *
 * Contract (verified live on 2026-10-29):
 *   GET  {url}?action=products → {"success":true,"products":[{ProductID,ProductName,Category,Price,ImageURL,stock}]}
 *   GET  {url}?action=orders   → {"success":true,"orders":[{OrderID,ProductID,Quantity,"Total price","Payment Status"}]}
 *   POST {url}                 JSON body:
 *     {action:"createOrder", productId:"IT001", quantity:2}
 *     {action:"createProduct", adminToken, productId, productName, category, price, imageURL, stock}
 *   Responses: HTTP 200 with {success:true,...} or {success:false,message}.
 *   Apps Script 302-redirects to script.googleusercontent.com; Node fetch
 *   follows it and (verified) re-sends the POST body.
 *
 * The admin token NEVER leaves the server. Nothing here logs secrets or any
 * part of request payloads.
 */

import { serverEnv } from "./env";
import {
  AppsScriptFailure,
  OrderRecord,
  Product,
  RawOrder,
  RawProduct,
} from "./types";

const REQUEST_TIMEOUT_MS = 25_000;

/** Failed internal call while talking to Apps Script. */
export class AppsScriptError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "AppsScriptError";
  }
}

function requireUrl(): string {
  // Read at call time (not module load) so the same build works locally and
  // on Vercel, where variables are injected into the running function.
  const url = serverEnv("GOOGLE_APPS_SCRIPT_URL");
  if (!url) {
    throw new AppsScriptError(
      "Server is not configured: GOOGLE_APPS_SCRIPT_URL is missing in the environment.",
      500,
    );
  }
  return url;
}

/** Parse a script response, raising helpful errors for HTML / malformed JSON. */
async function parseScriptResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!response.ok) {
    throw new AppsScriptError(
      `Apps Script returned HTTP ${response.status}.`,
      502,
    );
  }

  // Guard against login/CAPTCHA/HTML responses from Google infrastructure.
  if (text.trimStart().startsWith("<")) {
    throw new AppsScriptError(
      "Apps Script returned an unexpected HTML page instead of JSON (the web-app deployment may be unreachable).",
      502,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new AppsScriptError(
      "Apps Script returned malformed JSON.",
      502,
    );
  }

  return parsed;
}

/**
 * Perform a call against the Apps Script web app.
 * `init.body` must be a pre-stringified payload; only the action name is
 * accepted here so secrets are always assembled server-side.
 */
async function callAppsScript(
  action: "products" | "orders" | "createOrder" | "createProduct" | "__unknown__",
  init?: { method?: "GET" | "POST"; bodyJson?: string },
): Promise<unknown> {
  const url = requireUrl();
  const fullUrl =
    init?.method === "POST"
      ? url
      : `${url}?action=${encodeURIComponent(action)}`;

  let response: Response;
  try {
    response = await fetch(fullUrl, {
      method: init?.method ?? "GET",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      ...(init?.method === "POST"
        ? {
            headers: { "Content-Type": "text/plain;charset=utf-8" },
            body: init.bodyJson ?? "{}",
          }
        : {}),
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new AppsScriptError(
        "Apps Script did not respond in time (timeout).",
        504,
      );
    }
    throw new AppsScriptError(
      "Could not reach the Apps Script backend (network error).",
      502,
    );
  }

  const parsed = (await parseScriptResponse(response)) as
    | { success?: unknown; message?: unknown; error?: unknown }
    | Record<string, unknown>;

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "success" in parsed &&
    parsed.success === false
  ) {
    const failure = parsed as AppsScriptFailure & { error?: unknown };
    throw new AppsScriptError(
      typeof failure.message === "string"
        ? failure.message
        : String(failure.error ?? "Apps Script rejected the request."),
      502,
    );
  }

  return parsed;
}

/**
 * Create (register) a product via the existing createProduct action.
 * The admin token is read here — server-side only — and never logged.
 */
export async function createProduct(payload: {
  productId: string;
  productName: string;
  category: string;
  price: number;
  imageURL: string;
  stock: number;
}): Promise<{ message: string; raw: unknown }> {
  const token = serverEnv("GOOGLE_APPS_SCRIPT_ADMIN_TOKEN");
  if (!token) {
    throw new AppsScriptError(
      "Server is not configured: GOOGLE_APPS_SCRIPT_ADMIN_TOKEN is missing.",
      500,
    );
  }

  const parsed = (await callAppsScript("createProduct", {
    method: "POST",
    bodyJson: JSON.stringify({
      action: "createProduct",
      adminToken: token,
      productId: payload.productId,
      productName: payload.productName,
      category: payload.category,
      price: payload.price,
      imageURL: payload.imageURL,
      stock: payload.stock,
    }),
  })) as { message?: unknown; error?: unknown };

  const record = parsed as Record<string, unknown>;
  return {
    message:
      typeof record.message === "string"
        ? record.message
        : typeof record.error === "string"
          ? record.error
          : "Product request processed.",
    raw: parsed,
  };
}

/* ── Validation helpers ──────────────────────────────────────────────────── */
/**
 * Validate & sanitize an unknown row into a Product.
 * Rows with an unusable ID/price/stock are skipped (never trusted).
 */
export function sanitizeProduct(raw: RawProduct): Product | null {
  const id =
    typeof raw.ProductID === "string" ? raw.ProductID.trim() : "";
  if (!id) return null;

  const price = Number(raw.Price);
  if (!Number.isFinite(price) || price < 0) return null;

  const stockNum = Number(raw.stock);
  const stock = Number.isFinite(stockNum) ? Math.max(0, Math.trunc(stockNum)) : 0;

  const name =
    typeof raw.ProductName === "string" && raw.ProductName.trim()
      ? raw.ProductName.trim()
      : id;

  const category =
    typeof raw.Category === "string" && raw.Category.trim()
      ? raw.Category.trim()
      : "OTHER";

  // Placeholder URLs (e.g. https://example.com/...) are replaced client-side
  // with a local fallback; we keep whatever the backend provides.
  const imageUrl = typeof raw.ImageURL === "string" ? raw.ImageURL : "";

  return {
    id,
    name,
    category: category.toUpperCase(),
    price: Math.round(price),
    imageUrl,
    stock,
  };
}

/** Validate & sanitize an unknown row into an OrderRecord. */
export function sanitizeOrder(raw: RawOrder): OrderRecord | null {
  const orderId = typeof raw.OrderID === "string" ? raw.OrderID.trim() : "";
  const productId = typeof raw.ProductID === "string" ? raw.ProductID.trim() : "";
  if (!orderId || !productId) return null;

  // Backend rows sometimes store a leading apostrophe (text-formatted IDs).
  const cleanId = orderId.replace(/^'/, "");
  const cleanProduct = productId.replace(/^'/, "");

  const quantity = Number(raw.Quantity);
  const total = Number(raw["Total price"]);

  return {
    orderId: cleanId,
    productId: cleanProduct,
    quantity: Number.isFinite(quantity) ? Math.max(0, quantity) : 0,
    total: Number.isFinite(total) ? total : 0,
    paymentStatus:
      typeof raw["Payment Status"] === "string" ? raw["Payment Status"] : "",
  };
}

/* ── Public API ──────────────────────────────────────────────────────────── */

export async function fetchProducts(): Promise<Product[]> {
  const parsed = (await callAppsScript("products")) as {
    products?: RawProduct[];
  };

  const rows = Array.isArray(parsed?.products) ? parsed.products : [];
  const products: Product[] = [];

  for (const row of rows) {
    const product = sanitizeProduct(row);
    if (product) products.push(product);
  }

  return products;
}

export async function fetchOrders(): Promise<OrderRecord[]> {
  const parsed = (await callAppsScript("orders")) as { orders?: RawOrder[] };

  const rows = Array.isArray(parsed?.orders) ? parsed.orders : [];
  const orders: OrderRecord[] = [];

  for (const row of rows) {
    const order = sanitizeOrder(row);
    if (order) orders.push(order);
  }

  return orders;
}

/**
 * Create a single order line. Returns the raw backend payload when it
 * reports success, so the caller can read the generated OrderID.
 */
export async function createOrder(
  productId: string,
  quantity: number,
): Promise<{ orderId?: string; total?: number; raw: unknown }> {
  const parsed = (await callAppsScript("createOrder", {
    method: "POST",
    bodyJson: JSON.stringify({ action: "createOrder", productId, quantity }),
  })) as
    | {success?: unknown; message?: unknown; error?: unknown;
      OrderID?: unknown; orderID?: unknown; orderId?: unknown;
      Total?: unknown; "Total price"?: unknown; total?: unknown; totalprice?: unknown;};

  // (A failure envelope {success:false} has already been converted to a
  // thrown AppsScriptError by callAppsScript.)

  // Backend response shape is not fully documented; harvest the order id /
  // total defensively across the commonly used field names.
  const record = parsed as Record<string, unknown>;
  const orderId =
    typeof record.OrderID === "string"
      ? record.OrderID
      : typeof record.orderId === "string"
        ? record.orderId
        : typeof record.orderID === "string"
          ? record.orderID
          : undefined;
  const total =
    Number(record["Total price"]) ||
    Number(record.totalPrice) ||
    Number(record.total) ||
    undefined;

  return { orderId, total, raw: parsed };
}
