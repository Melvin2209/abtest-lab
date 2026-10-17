"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

/** Cart lines: productId -> quantity. Kept in localStorage, like many real storefronts. */
export type CartItems = Record<string, number>;

type CartContextValue = {
  items: CartItems;
  count: number;
  add: (productId: string, quantity?: number) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
};

const STORAGE_KEY = "abl_cart";
const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItems>({});

  // Load the saved cart after hydration (localStorage does not exist on the server).
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off sync from storage
      if (saved) setItems(JSON.parse(saved));
    } catch {
      // ignore a corrupted or blocked storage: start with an empty cart
    }
  }, []);

  const update = useCallback((next: (prev: CartItems) => CartItems) => {
    setItems((prev) => {
      const value = next(prev);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      } catch {
        // storage unavailable (private mode...): the cart still works for this page view
      }
      return value;
    });
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: Object.values(items).reduce((sum, quantity) => sum + quantity, 0),
      add: (productId, quantity = 1) =>
        update((prev) => ({ ...prev, [productId]: (prev[productId] ?? 0) + quantity })),
      setQuantity: (productId, quantity) =>
        update((prev) => {
          const next = { ...prev };
          if (quantity > 0) next[productId] = quantity;
          else delete next[productId];
          return next;
        }),
      clear: () => update(() => ({})),
    }),
    [items, update],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
