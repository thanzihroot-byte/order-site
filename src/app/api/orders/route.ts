import { connection, NextRequest, NextResponse } from "next/server";
import {
  AppsScriptError,
  createOrder,
  fetchOrders,
  fetchProducts,
} from "@/lib/apps-script";
import type { SubmitOrderResponse } from "@/lib/types";

/**
 * GET /api/orders — proxies the existing `?action=orders` endpoint
 * (verified rows only; useful for back-office views).
 */
export async function GET() {
  // Live ledger data — never prerender/cache this handler.
  await connection();
  try {
    const orders = await fetchOrders();
    return NextResponse.json(
      { success: true, orders },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AppsScriptError) {
      console.error("[api/orders GET]", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status >= 500 ? 502 : 400 },
      );
    }
    console.error("[api/orders GET] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error while loading orders." },
      { status: 500 },
    );
  }
}

/**
 * POST /api/orders — places a multi-item cart against the existing backend.
 *
 * ⚠ Known backend limitation (documented): the existing Apps Script contract
 * accepts exactly ONE {productId, quantity} per createOrder request, so a
 * multi-line cart is submitted as SEQUENTIAL createOrder calls. This is NOT
 * an atomic transaction — if the backend rejects a line partway through,
 * earlier accepted lines remain in the Google Sheet and are reported back to
 * the user explicitly. (See README for the recommended single-shot
 * `createMultiItemOrder` enhancement.)
 *
 * Security posture:
 *  - Only quantities arrive from the browser. Product existence, prices and
 *    stock are re-fetched from the backend at submission time; nothing is
 *    trusted from the client.
 *  - The backend's per-line response is authoritative; the UI never claims
 *    an order exists without a backend confirmation.
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const items = (body as { items?: unknown })?.items;
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { success: false, message: "Your cart is empty." },
      { status: 400 },
    );
  }
  if (items.length > 20) {
    return NextResponse.json(
      { success: false, message: "Carts are limited to 20 distinct items per order." },
      { status: 400 },
    );
  }

  // ── Sanitize the requested lines (never trust prices/totals from browser) ──
  interface RequestLine {
    productId: string;
    quantity: number;
  }
  const requested: RequestLine[] = [];

  for (const entry of items) {
    if (typeof entry !== "object" || entry === null) continue;
    const rawProductId = (entry as { productId?: unknown }).productId;
    const rawQuantity = (entry as { quantity?: unknown }).quantity;
    const productId = typeof rawProductId === "string" ? rawProductId.trim() : "";
    const quantity = typeof rawQuantity === "number" ? rawQuantity : Number.NaN;
    if (!productId) {
      return NextResponse.json(
        { success: false, message: "Every cart line needs a valid product ID." },
        { status: 400 },
      );
    }
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) {
      return NextResponse.json(
        { success: false, message: `Quantity for ${productId} must be between 1 and 99.` },
        { status: 400 },
      );
    }
    requested.push({ productId, quantity });
  }

  if (requested.length === 0) {
    return NextResponse.json(
      { success: false, message: "Your cart is empty." },
      { status: 400 },
    );
  }

  try {
    // ── Live backend validation of availability, stock and pricing ──
    const products = await fetchProducts();
    const byId = new Map(products.map((p) => [p.id, p]));

    const results = [];
    let createdCount = 0;
    let createdTotal = 0;

    for (const line of requested) {
      const product = byId.get(line.productId);

      // Pre-submission rejection: unknown product / sold out / over-stock.
      if (!product) {
        results.push({
          productId: line.productId,
          productName: line.productId,
          quantity: line.quantity,
          status: "rejected" as const,
          message: "This product no longer exists in the kitchen menu.",
        });
        continue;
      }
      if (line.quantity > product.stock) {
        results.push({
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          status: "rejected" as const,
          message:
            product.stock === 0
              ? `${product.name} just sold out — it cannot be ordered.`
              : `Only ${product.stock} × ${product.name} left — reduce the quantity.`,
        });
        continue;
      }

      // ── Sequential backend submission (see limitation note above) ──
      try {
        const created = await createOrder(product.id, line.quantity);
        createdCount += 1;
        createdTotal += created.total ?? product.price * line.quantity;
        results.push({
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          status: "created" as const,
          orderId: created.orderId,
          total: created.total ?? product.price * line.quantity,
        });
      } catch (lineError) {
        // Never claim the line was ordered — the backend decides.
        const message =
          lineError instanceof AppsScriptError
            ? lineError.message
            : `${product.name} could not be ordered right now.`;
        console.error(
          `[api/orders] line rejected by backend: ${product.id} x${line.quantity} — ${
            lineError instanceof AppsScriptError ? lineError.message : lineError
          }`,
        );
        results.push({
          productId: product.id,
          productName: product.name,
          quantity: line.quantity,
          status: "failed" as const,
          message,
        });
      }
    }

    const response: SubmitOrderResponse = {
      success: createdCount === results.length && createdCount > 0,
      message:
        createdCount === requested.length
          ? createdCount === 1
            ? "Your order has been confirmed — the kitchen is on it."
            : `All ${createdCount} lines of your order have been confirmed.`
          : createdCount === 0
            ? "Unfortunately none of your cart lines could be ordered."
            : `Partially placed: ${createdCount} of ${requested.length} lines were confirmed by the kitchen. Unconfirmed lines were not charged.`,
      results,
      createdCount,
      createdTotal,
    };

    return NextResponse.json(response, {
      status: createdCount === requested.length ? 201 : createdCount === 0 ? 422 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof AppsScriptError) {
      console.error("[api/orders POST] Backend error:", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status >= 500 ? 502 : 400 },
      );
    }
    console.error("[api/orders POST] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error while placing your order." },
      { status: 500 },
    );
  }
}
