import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/add-to-cart";
import { ProductTile } from "@/components/product-tile";
import { getProduct, getUpsellProduct } from "@/lib/catalog";
import { getAssignment } from "@/lib/experiments";
import { formatPrice } from "@/lib/utils";

export default async function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const product = await getProduct(id);
  if (!product) notFound();

  // Variants are decided on the server, before rendering: the visitor never
  // sees the control flash and then switch to the variant ("flicker").
  const [upsellProduct, buttonTest, upsellTest] = await Promise.all([
    getUpsellProduct(product.id),
    getAssignment("atc-button"),
    getAssignment("upsell-popin"),
  ]);

  return (
    <>
      <Link href="/" className="text-sm text-zinc-500 hover:text-zinc-900">
        ← All products
      </Link>
      <div className="mt-6 grid gap-10 md:grid-cols-2">
        <ProductTile emoji={product.emoji} color={product.color} size="lg" />
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-400">{product.category}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
          <p className="mt-4 text-2xl">{formatPrice(product.priceCents)}</p>
          <p className="mt-4 text-zinc-600">{product.description}</p>
          <div className="mt-8">
            <AddToCart
              product={product}
              upsellProduct={upsellProduct}
              buttonTest={buttonTest}
              upsellTest={upsellTest}
            />
          </div>
        </div>
      </div>
    </>
  );
}
