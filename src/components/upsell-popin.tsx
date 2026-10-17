"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { track } from "@/lib/tracker";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { ProductTile } from "./product-tile";

/** Variant B of the "upsell-popin" experiment: suggests an accessory after add to cart. */
export function UpsellPopin({
  product,
  upsellProduct,
  onClose,
}: {
  product: Product;
  upsellProduct: Product;
  onClose: () => void;
}) {
  const { add } = useCart();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
      data-testid="upsell-popin"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm text-emerald-700">✓ {product.name} added to your cart</p>
        <h2 id="upsell-title" className="mt-4 text-xl font-semibold">
          Complete your setup
        </h2>
        <div className="mt-4 flex items-center gap-4 rounded-xl border border-zinc-200 p-3">
          <ProductTile emoji={upsellProduct.emoji} color={upsellProduct.color} size="sm" />
          <div className="flex-1">
            <p className="font-medium">{upsellProduct.name}</p>
            <p className="text-sm text-zinc-500">{formatPrice(upsellProduct.priceCents)}</p>
          </div>
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              add(upsellProduct.id);
              track({ type: "click", target: "upsell_add", productId: upsellProduct.id });
              track({
                type: "add_to_cart",
                productId: upsellProduct.id,
                valueCents: upsellProduct.priceCents,
              });
              onClose();
            }}
            className="rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white hover:bg-indigo-500"
            data-testid="upsell-add"
          >
            Add it for {formatPrice(upsellProduct.priceCents)}
          </button>
          <Link
            href="/cart"
            className="rounded-lg border border-zinc-300 px-4 py-3 text-center font-medium hover:bg-zinc-50"
          >
            Go to cart
          </Link>
          <button
            type="button"
            onClick={() => {
              track({ type: "click", target: "upsell_dismiss" });
              onClose();
            }}
            className="py-2 text-sm text-zinc-500 hover:text-zinc-900"
            data-testid="upsell-dismiss"
          >
            No thanks, continue shopping
          </button>
        </div>
      </div>
    </div>
  );
}
