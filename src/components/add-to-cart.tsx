"use client";

import { useState } from "react";
import type { Product } from "@/lib/catalog";
import type { Assignment } from "@/lib/experiments";
import { useCart } from "./cart-provider";
import { UpsellPopin } from "./upsell-popin";

type Props = {
  product: Product;
  upsellProduct: Product | null;
  /** Experiment "atc-button": which add-to-cart button to show. */
  buttonTest: Assignment | null;
  /** Experiment "upsell-popin": what happens right after add to cart. */
  upsellTest: Assignment | null;
};

export function AddToCart({ product, upsellProduct, buttonTest, upsellTest }: Props) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);
  const [popinOpen, setPopinOpen] = useState(false);

  const showPopin = upsellTest?.variantKey === "B" && upsellProduct !== null;

  function handleAdd() {
    add(product.id);
    setAdded(true);
    if (showPopin) setPopinOpen(true);
  }

  return (
    <div>
      {buttonTest?.variantKey === "B" ? (
        // Variant B: full-width, colored, and reassures about delivery costs.
        <button
          type="button"
          onClick={handleAdd}
          className="w-full rounded-lg bg-indigo-600 px-6 py-4 text-lg font-semibold text-white shadow-sm hover:bg-indigo-500"
          data-testid="add-to-cart"
          data-variant="B"
        >
          Add to cart · free delivery 🚚
        </button>
      ) : (
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700"
          data-testid="add-to-cart"
          data-variant="control"
        >
          Add to cart
        </button>
      )}

      {added && !showPopin && (
        <p className="mt-3 text-sm text-emerald-700" data-testid="added-message">
          Added to your cart ✓
        </p>
      )}

      {popinOpen && upsellProduct && (
        <UpsellPopin
          product={product}
          upsellProduct={upsellProduct}
          onClose={() => setPopinOpen(false)}
        />
      )}
    </div>
  );
}
