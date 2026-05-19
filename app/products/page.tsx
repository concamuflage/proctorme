"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import FilterSidebar from "@/components/products/FilterSidebar";
import ProductGrid from "@/components/products/ProductGrid";
import { type Product } from "@/components/products/ProductCard";
import { CLIENT_API_BASE_PATH } from "@/lib/api-base";

const RMB_TO_USD = Number(process.env.NEXT_PUBLIC_RMB_TO_USD ?? "0.14");

const BRAND_FILTERS = [
  {
    brand: "Nike",
    logo: "/logo/nike.jpg",
    width: 5000,
    height: 2813,
    imageClassName: "max-h-14 max-w-36",
  },
  {
    brand: "Levi's",
    logo: "/logo/levis.webp",
    width: 800,
    height: 800,
    imageClassName: "max-h-16 max-w-24",
  },
] as const;

type ProductsApiItem = {
  product_id?: number | string | null;
  id?: number | string | null;
  name?: string | null;
  brand?: string | null;
  style?: string | null;
  photos?: string[] | null;
  colors?: string[] | null;
  lowest_cost_rmb?: number | string | null;
};

function getPreferredCoverPhoto(photos: string[] | null | undefined) {
  if (!Array.isArray(photos)) return "";

  const cleanedPhotos = photos
    .filter((photo): photo is string => typeof photo === "string")
    .map((photo) => photo.trim())
    .filter((photo) => photo.length > 0);

  const preferredPhoto = cleanedPhotos.find((photo) => {
    const fileName = photo.split("/").pop() ?? "";
    const baseName = fileName.replace(/\.[^.]+$/, "");
    return baseName === "1";
  });

  return preferredPhoto ?? cleanedPhotos[0] ?? "";
}

function ProductsPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [productsData, setProductsData] = useState<ProductsApiItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`${CLIENT_API_BASE_PATH}/products`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setProductsData(Array.isArray(data) ? data : []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load products");
        setProductsData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = useMemo(() => {
    const styles = new Set<string>();
    for (const p of productsData) {
      if (typeof p?.style === "string" && p.style.trim()) {
        styles.add(p.style.trim());
      }
    }
    return Array.from(styles).sort((a, b) => a.localeCompare(b));
  }, [productsData]);

  const categoryFromUrl = searchParams.get("category");
  const selectedCategory =
    categoryFromUrl && categories.includes(categoryFromUrl) ? categoryFromUrl : null;
  const brandFromUrl = searchParams.get("brand");
  const selectedBrand =
    brandFromUrl && BRAND_FILTERS.some((filter) => filter.brand === brandFromUrl)
      ? brandFromUrl
      : null;

  const handleSelectCategory = (category: string | null) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (category === null) {
      nextParams.delete("category");
    } else {
      nextParams.set("category", category);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const handleSelectBrand = (brand: string) => {
    const nextParams = new URLSearchParams(searchParams.toString());

    if (selectedBrand === brand) {
      nextParams.delete("brand");
    } else {
      nextParams.set("brand", brand);
    }

    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  useEffect(() => {
    if (categoryFromUrl === null) return;
    if (categories.length === 0) return;
    if (categories.includes(categoryFromUrl)) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.delete("category");
    const nextQuery = nextParams.toString();
    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  }, [categories, categoryFromUrl, pathname, router, searchParams]);

  const filteredProductsData = useMemo(() => {
    return productsData.filter((p) => {
      const matchesCategory = selectedCategory === null || p?.style === selectedCategory;
      const matchesBrand = selectedBrand === null || p?.brand === selectedBrand;
      return matchesCategory && matchesBrand;
    });
  }, [productsData, selectedBrand, selectedCategory]);

  const products = useMemo<Product[]>(() => {
    return filteredProductsData.map((p) => ({
      slug: String(p.product_id ?? p.id ?? ""),
      name: p.name ?? "",
      brand: p.brand ?? "",
      imageUrl: getPreferredCoverPhoto(p.photos),
      colors: Array.isArray(p.colors) ? p.colors : [],
      price: p.lowest_cost_rmb == null ? 0 : Number(p.lowest_cost_rmb) * RMB_TO_USD,
    }));
  }, [filteredProductsData]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <div className="mb-6 flex flex-wrap items-center gap-3">
          {BRAND_FILTERS.map((filter) => {
            const active = selectedBrand === filter.brand;

            return (
              <button
                key={filter.brand}
                type="button"
                onClick={() => handleSelectBrand(filter.brand)}
                aria-pressed={active}
                className={`flex h-24 w-48 items-center justify-center rounded border bg-white px-5 transition ${
                  active
                    ? "border-zinc-900 shadow-sm"
                    : "border-zinc-200 hover:border-zinc-400"
                }`}
              >
                <Image
                  src={filter.logo}
                  alt={`${filter.brand} logo`}
                  width={filter.width}
                  height={filter.height}
                  className={`${filter.imageClassName} h-auto w-auto object-contain`}
                />
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr] lg:gap-8">
          <FilterSidebar
            categories={categories}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          <div>
            {loading ? <div className="mb-4 text-sm text-zinc-600">Loading...</div> : null}
            {error ? <div className="mb-4 text-sm text-red-600">{error}</div> : null}

            <ProductGrid products={products} />
          </div>
        </div>
      </main>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense fallback={null}>
      <ProductsPageContent />
    </Suspense>
  );
}
