import { upsellFor } from "@/data/catalog-data";
import { db } from "./db";

export type Product = Awaited<ReturnType<typeof getProducts>>[number];

export function getProducts() {
  return db.product.findMany({ orderBy: [{ category: "asc" }, { priceCents: "desc" }] });
}

export function getProduct(id: string) {
  return db.product.findUnique({ where: { id } });
}

/** Accessory suggested with a product (used by the upsell pop-in experiment). */
export async function getUpsellProduct(productId: string) {
  const upsellId = upsellFor[productId] ?? "p-cable";
  return upsellId === productId ? null : getProduct(upsellId);
}
