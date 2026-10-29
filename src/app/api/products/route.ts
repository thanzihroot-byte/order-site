import { NextResponse } from "next/server";
import { connection } from "next/server";
import { AppsScriptError, fetchProducts } from "@/lib/apps-script";

/**
 * GET /api/products — proxies the existing `?action=products` endpoint.
 * Response rows are validated & sanitized server-side before the client
 * ever sees them; backend data is authoritative (never mocked).
 */
export async function GET() {
  // Never prerender this handler at build time or cache it — live menu data
  // must be fetched fresh from the Apps Script backend on each request.
  await connection();
  try {
    const products = await fetchProducts();
    return NextResponse.json(
      { success: true, products },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof AppsScriptError) {
      console.error("[api/products]", error.message);
      return NextResponse.json(
        { success: false, message: error.message },
        { status: error.status >= 500 ? 502 : 400 },
      );
    }
    console.error("[api/products] Unexpected error:", error);
    return NextResponse.json(
      { success: false, message: "Unexpected server error while loading products." },
      { status: 500 },
    );
  }
}
