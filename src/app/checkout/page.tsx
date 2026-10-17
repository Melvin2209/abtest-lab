import { Checkout } from "@/components/checkout";
import { getProducts } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const products = await getProducts();
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Checkout</h1>
      <Checkout products={products} />
    </>
  );
}
