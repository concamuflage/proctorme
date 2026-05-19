import Link from "next/link";
import { formatUsd } from "@/lib/formatters";


// Define a TypeScript type for a product object, which describes the shape of the data this component expects.
// The `?` after some properties means they are optional and may be undefined.
export type Product = {
  slug: string;
  name: string;
  price: number; // USD
  brand: string;
  imageUrl: string;
  colors: string[];
};

// Define the props object type for the ProductCard component.
// This tells TypeScript that ProductCard expects a single prop named `product` of type Product.
type ProductCardProps = {
  product: Product;
};

// This is a React functional component named ProductCard.
// React components are reusable pieces of UI that can accept inputs (props) and render elements.
// This component renders a card displaying product details.
export default function ProductCard({ product }: ProductCardProps) {
  // Destructuring `{ product }` means extracting the product property from the props object directly.
  
  // Format the product price as US dollars using Intl.NumberFormat,
  // which formats numbers according to locale and currency rules.
  const priceText = formatUsd(product.price);

  return (
    // The Link component from Next.js enables client-side navigation to the product's detail page.
    <Link
      href={`/products/${product.slug}`}
      className="group block overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:shadow"
      data-testid={`product-card-${product.slug}`}
    >
      <div className="aspect-[4/5] w-full bg-zinc-100">
        {/* Conditional rendering: if product.imageUrl exists, show the image; otherwise, show a placeholder */}
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-[1.02]"
            // `loading="lazy"` defers loading the image until it is close to being visible,
            // improving page load performance.
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-sm text-zinc-500">
            No image yet
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-500">
              {product.brand ?? "Curated"}
            </div>
            <h3 className="mt-1 line-clamp-2 text-base font-medium text-zinc-900">
              {product.name}
            </h3>

            {/* If product.colors exists and has items, join the array into a comma-separated string */}
            {product.colors && product.colors.length > 0 ? (
              <div className="mt-2 text-xs text-zinc-600">
                Colors: {product.colors.join(", ")}
              </div>
            ) : null}
          </div>

          <div className="shrink-0 text-sm font-semibold text-zinc-900">
            {priceText}
          </div>
        </div>
      </div>
    </Link>
  );
}
