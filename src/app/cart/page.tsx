import { CartView } from "@/components/cart-view";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CartPage() {
  // The cart lives in the browser; the server only provides the catalog to render it.
  const products = await getProducts();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Your cart</h1>
      <CartView products={products} />
    </>
  );
}
