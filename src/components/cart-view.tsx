"use client";

import Link from "next/link";
import type { Product } from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";
import { useCart } from "./cart-provider";
import { ProductTile } from "./product-tile";

/** Joins the cart (productId -> quantity) with the catalog. */
export function useCartLines(products: Product[]) {
  const { items } = useCart();
  const lines = products
    .filter((product) => items[product.id])
    .map((product) => ({ product, quantity: items[product.id] }));
  const totalCents = lines.reduce((sum, l) => sum + l.product.priceCents * l.quantity, 0);
  return { lines, totalCents };
}

export function CartView({ products }: { products: Product[] }) {
  const { setQuantity } = useCart();
  const { lines, totalCents } = useCartLines(products);

  if (lines.length === 0) {
    return (
      <p className="mt-6 text-zinc-500">
        Your cart is empty.{" "}
        <Link href="/" className="underline">
          Browse products
        </Link>
      </p>
    );
  }

  return (
    <div className="mt-8 grid gap-10 md:grid-cols-[1fr_320px]">
      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white">
        {lines.map(({ product, quantity }) => (
          <li key={product.id} className="flex items-center gap-4 p-4" data-testid="cart-line">
            <ProductTile emoji={product.emoji} color={product.color} size="sm" />
            <div className="flex-1">
              <p className="font-medium">{product.name}</p>
              <p className="text-sm text-zinc-500">{formatPrice(product.priceCents)}</p>
            </div>
            <select
              value={quantity}
              onChange={(e) => setQuantity(product.id, Number(e.target.value))}
              className="rounded-md border border-zinc-300 px-2 py-1"
              aria-label={`Quantity of ${product.name}`}
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n === 0 ? "Remove" : n}
                </option>
              ))}
            </select>
          </li>
        ))}
      </ul>
      <aside className="h-fit rounded-xl border border-zinc-200 bg-white p-6">
        <div className="flex justify-between text-lg font-medium">
          <span>Total</span>
          <span data-testid="cart-total">{formatPrice(totalCents)}</span>
        </div>
        <Link
          href="/checkout"
          className="mt-6 block rounded-lg bg-zinc-900 px-6 py-3 text-center font-medium text-white hover:bg-zinc-700"
          data-testid="go-to-checkout"
        >
          Checkout
        </Link>
      </aside>
    </div>
  );
}
