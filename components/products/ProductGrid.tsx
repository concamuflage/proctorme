import ProductCard, { type Product } from "@/components/products/ProductCard";

// This defines the expected props for the ProductGrid component.
// 'products' is an array of Product objects.
type ProductGridProps = {
  products: Product[]; // Product[] means an array of Product objects in TypeScript.
};

// A React component is a reusable piece of UI that can accept inputs called "props" and returns React elements to render.
// Here, ProductGrid is a functional component that takes products as a prop.
export default function ProductGrid({ products }: ProductGridProps) {
  // Conditional rendering: if there are no products, show a message instead of the grid.
  if (!products || products.length === 0) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 sm:p-8">
        No products yet.
      </div>
    );
  }

  // If there are products, render them in a grid.
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {/* 
        .map() is used to render a list of components.
        For each product 'p' in the products array, a ProductCard is rendered.
      */}
      {products.map((p) => (
        // The 'key' prop helps React identify which items have changed, are added, or removed,
        // improving performance when rendering lists.
        <ProductCard key={p.slug} product={p} /> // only product is the prop.key is used for refreshing a card

      ))}
    </div>
  );
}
