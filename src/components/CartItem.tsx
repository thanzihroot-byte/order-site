"use client";

import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { QuantitySelector } from "./QuantitySelector";

/** One line in the cart, following the Stitch cart reference layout. */
export function CartItem({
  product,
  quantity,
  lineTotal,
  onQuantityChange,
  onRemove,
}: {
  product: Product;
  quantity: number;
  lineTotal: number;
  onQuantityChange: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <article className="flex flex-col items-stretch justify-between gap-4 rounded-xl bg-card p-4 shadow-[var(--shadow-card)] md:flex-row md:items-center md:p-6">
      <div className="flex min-w-0 items-start gap-4">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-cream shadow-sm md:h-24 md:w-24">
          <ProductImage src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
        </div>

        <div className="flex min-w-0 flex-col gap-0.5 pr-2">
          <h3 className="truncate font-display text-lg font-semibold text-forest">
            {product.name}
          </h3>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel">
            {product.category}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-semibold text-gold">{formatCurrency(product.price)}</span>
            <span className="text-xs text-muted/70">unit price</span>
          </div>
        </div>
      </div>

      <div className="flex w-full items-center justify-between gap-6 sm:w-auto sm:gap-8">
        <div className="flex flex-col sm:items-end">
          <span className="text-xs uppercase text-muted/60 sm:hidden">Total</span>
          <span className="font-display text-lg font-semibold text-forest">
            {formatCurrency(lineTotal)}
          </span>
        </div>

        <QuantitySelector
          productId={product.id}
          value={quantity}
          max={product.stock}
          onChange={onQuantityChange}
        />

        <button
          type="button"
          aria-label={`Remove ${product.name} from cart`}
          onClick={() => onRemove(product.id)}
          className="rounded-full p-2 text-steel transition-colors hover:bg-bordeaux/10 hover:text-bordeaux focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bordeaux"
        >
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4 7h16M10 11v6M14 11v6" />
            <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
            <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
          </svg>
        </button>
      </div>
    </article>
  );
}
