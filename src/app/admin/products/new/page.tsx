"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Admin — create a product via the existing Apps Script `createProduct`.
 *
 * Access control: the operator's passcode (ADMIN_UI_PASSCODE env var, chosen
 * by the operator) is entered here and sent only as a request header to the
 * server-side route /api/admin/products, which verifies it and then attaches
 * the real Apps Script admin token. The token itself never reaches the
 * browser.
 */

interface FormState {
  productId: string;
  productName: string;
  category: string;
  price: string;
  imageURL: string;
  stock: string;
}

const INITIAL: FormState = {
  productId: "",
  productName: "",
  category: "",
  price: "",
  imageURL: "",
  stock: "",
};

const PASSCODE_KEY = "grand-stay-admin-passcode";

const inputClass =
  "w-full rounded-lg border border-hairline bg-cream px-4 py-3 text-sm text-ink placeholder:text-steel focus:border-forest focus:bg-card focus:outline-none focus:ring-2 focus:ring-forest/20 transition-all";
const labelClass =
  "mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-muted";

export default function AdminNewProductPage() {
  const [passcode, setPasscode] = useState<string>(
    () => (typeof window === "undefined" ? "" : sessionStorage.getItem(PASSCODE_KEY) ?? ""),
  );
  const [form, setForm] = useState<FormState>(INITIAL);
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [feedback, setFeedback] = useState<string>("");

  const update = (field: keyof FormState) => (value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "submitting") return;

    // Client-side pre-checks (server validates authoritatively).
    if (!productIdOk) {
      setStatus("error");
      setFeedback("Product ID is required (letters, digits, dashes only).");
      return;
    }
    if (!form.productName.trim()) {
      setStatus("error");
      setFeedback("Product name is required.");
      return;
    }
    if (!form.category.trim()) {
      setStatus("error");
      setFeedback("Category is required.");
      return;
    }
    if (!(Number(form.price) > 0)) {
      setStatus("error");
      setFeedback("Price must be a positive number.");
      return;
    }
    if (!/^\d+$/.test(form.stock.trim()) || Number(form.stock) < 0) {
      setStatus("error");
      setFeedback("Stock must be zero or a positive whole number.");
      return;
    }

    setStatus("submitting");
    setFeedback("");

    try {
      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-passcode": passcode,
        },
        body: JSON.stringify({
          productId: form.productId.trim(),
          productName: form.productName.trim(),
          category: form.category.trim(),
          price: Number(form.price),
          imageURL: form.imageURL.trim(),
          stock: Number(form.stock),
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
        productId?: string;
      } | null;

      if (res.ok && data?.success) {
        setStatus("done");
        setFeedback(data.message || `Product ${data.productId ?? form.productId} created.`);
      } else {
        setStatus("error");
        setFeedback(
          data?.message ??
            (res.status === 401
              ? "Access denied — incorrect passcode."
              : res.status === 503
                ? "The admin screen is disabled on the server (ADMIN_UI_PASSCODE not set)."
                : "The product could not be created."),
        );
      }
    } catch {
      setStatus("error");
      setFeedback("Could not reach the server. Please try again.");
    }
  };

  const productIdOk = /^[A-Za-z0-9_-]+$/.test(form.productId.trim());

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-12 md:px-8">
      <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-gold">
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3 5 5v6c0 5 3 8 7 10 4-2 7-5 7-10V5l-7-2Z" />
        </svg>
        Staff Only
      </div>
      <h1 className="mb-1 font-display text-3xl font-semibold text-forest">
        Add a Product
      </h1>
      <p className="mb-8 text-sm text-muted">
        Creates a product in the kitchen sheet through the existing Apps Script
        integration. Stock and price can be edited later directly in the sheet.
      </p>

      <form
        onSubmit={submit}
        className="space-y-5 rounded-2xl border border-hairline bg-card p-6 shadow-[var(--shadow-card)] md:p-8"
        noValidate
      >
        {/* Passcode gate */}
        <div>
          <label htmlFor="passcode" className={labelClass}>
            Admin Passcode
          </label>
          <input
            id="passcode"
            type="password"
            value={passcode}
            onChange={(e) => {
              setPasscode(e.target.value);
              try {
                sessionStorage.setItem(PASSCODE_KEY, e.target.value);
              } catch {
                /* session storage unavailable */
              }
            }}
            autoComplete="off"
            placeholder="Set in ADMIN_UI_PASSCODE (server env)"
            className={inputClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="productId" className={labelClass}>
              Product ID
            </label>
            <input
              id="productId"
              value={form.productId}
              onChange={(e) => update("productId")(e.target.value)}
              placeholder="IT006"
              autoComplete="off"
              required
              className={inputClass}
            />
            {form.productId.trim() && !productIdOk && (
              <p className="mt-1 text-xs text-bordeaux">Letters, digits, dashes only.</p>
            )}
          </div>
          <div>
            <label htmlFor="productName" className={labelClass}>
              Product Name
            </label>
            <input
              id="productName"
              value={form.productName}
              onChange={(e) => update("productName")(e.target.value)}
              placeholder="COLD COFFEE"
              autoComplete="off"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="category" className={labelClass}>
              Category
            </label>
            <input
              id="category"
              value={form.category}
              onChange={(e) => update("category")(e.target.value)}
              placeholder="DRINKS"
              autoComplete="off"
              required
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="price" className={labelClass}>
              Price (₹)
            </label>
            <input
              id="price"
              type="number"
              min="1"
              step="1"
              value={form.price}
              onChange={(e) => update("price")(e.target.value)}
              placeholder="299"
              required
              className={inputClass}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="imageURL" className={labelClass}>
              Image URL <span className="normal-case text-steel">(optional)</span>
            </label>
            <input
              id="imageURL"
              type="url"
              value={form.imageURL}
              onChange={(e) => update("imageURL")(e.target.value)}
              placeholder="https://…/cold-coffee.jpg"
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="stock" className={labelClass}>
              Stock Quantity
            </label>
            <input
              id="stock"
              type="number"
              min="0"
              step="1"
              value={form.stock}
              onChange={(e) => update("stock")(e.target.value)}
              placeholder="50"
              required
              className={inputClass}
            />
          </div>
        </div>

        {/* Feedback */}
        {status === "done" && feedback && (
          <div
            role="status"
            className="flex items-center gap-3 rounded-lg border border-eligreen/20 bg-eligreen/10 px-4 py-3 text-sm text-forest"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5 shrink-0 text-eligreen" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m4.5 12.5 5 5 10-11" />
            </svg>
            {feedback}
          </div>
        )}
        {status === "error" && feedback && (
          <div
            role="alert"
            className="rounded-lg border border-bordeaux/20 bg-bordeaux/5 px-4 py-3 text-sm text-bordeaux"
          >
            {feedback}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <button
            type="submit"
            disabled={status === "submitting"}
            className="inline-flex items-center gap-2 rounded-full bg-forest px-7 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-forest-deep active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status === "submitting" ? (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <path d="M12 3a9 9 0 1 0 9 9" />
                </svg>
                Creating…
              </>
            ) : (
              "Create Product"
            )}
          </button>
          <Link
            href="/"
            className="text-sm font-semibold text-gold transition-colors hover:text-forest"
          >
            Back to menu
          </Link>
        </div>
      </form>

      <p className="mt-4 text-xs text-steel">
        On success the page clears the form; duplicate Product IDs are rejected
        by the backend if the sheet key already exists.
      </p>
    </main>
  );
}
