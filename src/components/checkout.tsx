"use client";

import Link from "next/link";
import { useState } from "react";
import type { Product } from "@/lib/catalog";
import { track } from "@/lib/tracker";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { useCartLines } from "./cart-view";

/** Simulated checkout: no payment, no personal data, just a "Place order" button. */
export function Checkout({ products }: { products: Product[] }) {
  const { clear } = useCart();
  const { lines, totalCents } = useCartLines(products);
  const [orderedCents, setOrderedCents] = useState<number | null>(null);

  if (orderedCents !== null) {
    return (
      <div
        className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6"
        data-testid="order-confirmed"
      >
        <p className="text-lg font-medium text-emerald-800">Order confirmed 🎉</p>
        <p className="mt-1 text-emerald-700">
          Simulated purchase of {formatPrice(orderedCents)}. Nothing was charged.
        </p>
        <Link href="/" className="mt-4 inline-block underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  if (lines.length === 0) {
    return <p className="mt-6 text-zinc-500">Your cart is empty.</p>;
  }

  return (
    <div className="mt-8 max-w-md rounded-xl border border-zinc-200 bg-white p-6">
      <ul className="space-y-2 text-sm">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex justify-between">
            <span>
              {quantity} × {product.name}
            </span>
            <span>{formatPrice(product.priceCents * quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-4 flex justify-between border-t border-zinc-200 pt-4 font-medium">
        <span>Total</span>
        <span>{formatPrice(totalCents)}</span>
      </div>
      <button
        type="button"
        onClick={() => {
          // Sent immediately: the purchase is the event we can least afford to lose.
          track({ type: "purchase", valueCents: totalCents }, { immediate: true });
          setOrderedCents(totalCents);
          clear();
        }}
        className="mt-6 w-full rounded-lg bg-emerald-600 px-6 py-3 font-medium text-white hover:bg-emerald-500"
        data-testid="place-order"
      >
        Place order (simulated)
      </button>
    </div>
  );
}
