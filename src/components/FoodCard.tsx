"use client";

import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { ProductImage } from "./ProductImage";
import { QuantitySelector } from "./QuantitySelector";

/**
 * Product card matching the Stitch reference (order_food screen):
 * photo with category badge, serif title, gold "PRICE" label and the
 * compact `[- qty +]` pill.
 *
 * Out-of-stock products are rendered muted with an "Unavailable" badge and
 * a disabled selector — they can never be added to the cart.
 */
export function FoodCard({
  product,
  quantity,
  onQuantityChange,
}: {
  product: Product;
  quantity: number;
  onQuantityChange: (productId: string, quantity: number) => void;
}) {
  const soldOut = product.stock <= 0;

  return (
    <article
      className={`dish-card group flex flex-col justify-between overflow-hidden rounded-xl border border-hairline bg-card ${
        soldOut ? "opacity-60" : ""
      }`}
      aria-label={`${product.name}, ${product.category}, ${formatCurrency(product.price)}${
        soldOut ? ", currently unavailable" : ""
      }`}
    >
      <div className="relative w-full overflow-hidden bg-cream aspect-[4/3]">
        <ProductImage
          src={product.imageUrl}
          alt={product.name}
          className="dish-photo h-full w-full object-cover transition-transform duration-500"
        />

        {soldOut && (
          <span className="absolute top-3 left-3 rounded-md bg-bordeaux px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-white">
            Sold out
          </span>
        )}

        <span className="absolute right-3 bottom-3 rounded-full bg-forest/85 px-2.5 py-0.5 text-[10px] font-bold tracking-[0.08em] text-white uppercase backdrop-blur-md">
          {product.category}
        </span>
      </div>

      <div className="flex flex-col gap-1 p-4">
        <h3 className="font-display text-lg font-semibold tracking-tight text-forest">
          {product.name}
        </h3>
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-steel">
          {product.category}
          {!soldOut && product.stock <= 5 ? ` — only ${product.stock} left` : ""}
        </p>
      </div>

      <div className="mt-auto flex items-center justify-between p-4 pt-0">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-gold">
            Price
          </span>
          <span className="font-display text-lg font-bold text-forest">
            {formatCurrency(product.price)}
          </span>
        </div>

        {soldOut ? (
          <span className="rounded-full border border-hairline bg-cream px-3 py-1.5 text-xs font-semibold text-steel">
            Unavailable
          </span>
        ) : quantity > 0 ? (
          <QuantitySelector
            productId={product.id}
            value={quantity}
            max={product.stock}
            onChange={onQuantityChange}
            small
          />
        ) : (
          <button
            type="button"
            aria-label={`Add ${product.name} to cart`}
            disabled={product.stock <= 0}
            onClick={() => onQuantityChange(product.id, 1)}
            className="flex items-center gap-1 rounded-full bg-forest px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-forest-deep active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-40"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-gold" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add to Cart
          </button>
        )}
      </div>
    </article>
  );
}
