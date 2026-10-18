import Link from "next/link";
import { ProductTile } from "@/components/product-tile";
import { getProducts } from "@/lib/catalog";
import { formatPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const products = await getProducts();

  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">All products</h1>
      <p className="mt-1 text-zinc-500">{products.length} products · free delivery from $50</p>

      <ul className="mt-8 grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <li key={product.id}>
            <Link
              href={`/product/${product.id}`}
              className="group block"
              data-testid="product-card"
            >
              <ProductTile emoji={product.emoji} color={product.color} />
              <p className="mt-3 text-xs uppercase tracking-wide text-zinc-400">
                {product.category}
              </p>
              <p className="font-medium group-hover:underline">{product.name}</p>
              <p className="text-zinc-600">{formatPrice(product.priceCents)}</p>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
