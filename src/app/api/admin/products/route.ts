import { NextRequest, NextResponse } from "next/server";
import { AppsScriptError, createProduct } from "@/lib/apps-script";

/**
 * POST /api/admin/products — protected product-creation route.
 *
 * Access control (no auth system exists in this project yet, so this is the
 * minimal secure gate):
 *   1. The admin UI asks the operator for ADMIN_UI_PASSCODE (typed once,
 *      kept in sessionStorage — never rendered as a NEXT_PUBLIC_ var).
 *   2. This server route compares it against the server-side env var.
 *   3. Only then is the REAL Apps Script admin token (server-side env)
 *      attached to the createProduct payload. The browser never sees it.
 *
 * If ADMIN_UI_PASSCODE is unset, the admin feature is disabled entirely.
 */

function normalizeProductId(raw: string): string {
  return raw.trim().replace(/^'+/, "");
}

export async function POST(request: NextRequest) {
  // ── 1. Passcode gate ──────────────────────────────────────────────────────────
  const expectedPasscode = process.env.ADMIN_UI_PASSCODE ?? "";
  if (!expectedPasscode) {
    return NextResponse.json(
      {
        success: false,
        message:
          "The admin screen is disabled. Set ADMIN_UI_PASSCODE in the server environment to enable it.",
      },
      { status: 503 },
    );
  }

  const providedPasscode = request.headers.get("x-admin-passcode") ?? "";
  if (providedPasscode !== expectedPasscode) {
    return NextResponse.json(
      { success: false, message: "Access denied — incorrect passcode." },
      { status: 401 },
    );
  }

  // ── 2. Validate the product payload ──────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json(
      { success: false, message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const productId = typeof body.productId === "string" ? normalizeProductId(body.productId) : "";
  const productName =
    typeof body.productName === "string" ? body.productName.trim() : "";
  const category = typeof body.category === "string" ? body.category.trim().toUpperCase() : "";
  const price = Number(body.price);
  const stock = Number(body.stock);
  const imageURL = typeof body.imageURL === "string" ? body.imageURL.trim() : "";

  if (!productId || !/^[A-Za-z0-9_-]+$/.test(productId)) {
    return NextResponse.json(
      { success: false, message: "Product ID is required (letters, digits, dashes only)." },
      { status: 400 },
    );
  }
  if (!productName) {
    return NextResponse.json(
      { success: false, message: "Product name is required." },
      { status: 400 },
    );
  }
  if (!category) {
    return NextResponse.json(
      { success: false, message: "Category is required." },
      { status: 400 },
    );
  }
  if (!Number.isFinite(price) || price <= 0) {
    return NextResponse.json(
      { success: false, message: "Price must be a positive number." },
      { status: 400 },
    );
  }
  if (!Number.isInteger(stock) || stock < 0 || stock > 1_000_000) {
    return NextResponse.json(
      { success: false, message: "Stock must be a non-negative whole number." },
      { status: 400 },
    );
  }
  if (imageURL && !/^https?:\/\//i.test(imageURL)) {
    return NextResponse.json(
      { success: false, message: "Image URL must start with http:// or https:// (leave blank for no photo)." },
      { status: 400 },
    );
  }

  // ── 3. Forward to Apps Script with the server-side token ────────────────────
  try {
    const result = await createProduct({
      productId,
      productName,
      category,
      price: Math.round(price),
      imageURL,
      stock,
    });
    console.error(`[api/admin/products] created product ${productId}`);
    return NextResponse.json(
      { success: true, message: result.message, productId },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof AppsScriptError) {
      console.error("[api/admin/products] Backend rejected:", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status >= 500 ? 502 : 403 },
      );
    }
    console.error("[api/admin/products] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error while creating the product." },
      { status: 500 },
    );
  }
}
