"use client";

import { useState } from "react";

/**
 * Product photo with graceful fallback.
 *
 * Real image hosts vary by product (Cloudinary, Pinterest, placeholders);
 * a plain <img> keeps arbitrary remote hosts working, and the onError
 * fallback swaps broken images (e.g. the "example.com" URLs left in the live
 * sheet) for an in-house placeholder.
 */
export function ProductImage({
  src,
  alt,
  className = "",
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
}) {
  const PLACEHOLDER = "/placeholder-dish.svg";
  const isPlaceholder = !src || !/^https?:\/\//i.test(src);

  // Tracks which src last failed, so switching products resets the fallback
  // without needing an effect.
  const [failedOn, setFailedOn] = useState<string | null>(null);
  const failed = failedOn === src;

  const resolved = isPlaceholder || failed ? PLACEHOLDER : src;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading={eager ? "eager" : "lazy"}
      decoding="async"
      onError={() => setFailedOn(src)}
      className={className}
    />
  );
}
