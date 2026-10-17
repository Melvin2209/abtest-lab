"use client";

import Link from "next/link";
import { useCart } from "./cart-provider";

export function Header() {
  const { count } = useCart();
  return (
    <header className="border-b border-zinc-200 bg-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          ⚡ Brightcart <span className="font-normal text-zinc-400">· demo store</span>
        </Link>
        <div className="flex items-center gap-6 text-sm">
          <Link href="/dashboard" className="text-zinc-600 hover:text-zinc-900">
            Experiments dashboard
          </Link>
          <Link
            href="/cart"
            className="rounded-full bg-zinc-900 px-4 py-2 font-medium text-white hover:bg-zinc-700"
            data-testid="cart-link"
          >
            Cart ({count})
          </Link>
        </div>
      </nav>
    </header>
  );
}
