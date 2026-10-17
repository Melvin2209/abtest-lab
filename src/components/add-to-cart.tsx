"use client";

import { useState } from "react";
import { useCart } from "./cart-provider";

export function AddToCart({ productId }: { productId: string }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          add(productId);
          setAdded(true);
        }}
        className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white hover:bg-zinc-700"
        data-testid="add-to-cart"
      >
        Add to cart
      </button>
      {added && <p className="mt-3 text-sm text-emerald-700">Added to your cart ✓</p>}
    </div>
  );
}
