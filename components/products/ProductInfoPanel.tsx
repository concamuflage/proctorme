"use client";

import React, { useMemo, type ReactNode } from "react";
import { formatUsd } from "@/lib/formatters";

// This component displays the "text" portion of a product detail page:
// brand, name, price, attributes (style/color/size/sku/stock), measurements,
// materials, and description.
//


export type ProductMaterial = {
  material: string;
  percentage: number | null;
};

// This type matches the product JSON you showed from GET /products/:id.
export type ProductInfoPanelProduct = {
  sku: string;
  size: string;
  height_cm: number | null;
  chest_cm: number | null;
  weight_kg: number | null;
  description: string;
  id: number;
  name: string;
  brand: string;
  style: string;
  color: string;
  qty: number | null;
  cost_rmb: string | number | null;
  materials: ProductMaterial[];
};

export type ProductInfoPanelProps = {
  product: ProductInfoPanelProduct;
  variantControls?: ReactNode;
};

export default function ProductInfoPanel({ product, variantControls }: ProductInfoPanelProps) {
  const RMB_TO_USD = Number(process.env.NEXT_PUBLIC_RMB_TO_USD);

  // Convert cost_rmb (often a string like "229.00") to a number,
  // then format it as USD for display.
  const priceUsdText = useMemo(() => {
    const rmb = product.cost_rmb == null ? 0 : Number(product.cost_rmb);
    const usd = rmb * RMB_TO_USD;
    return formatUsd(usd)
  }, [product.cost_rmb, RMB_TO_USD]);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{product.name}</h1>
      <div className="mt-1 text-base font-semibold text-zinc-700">{product.brand}</div>
      <div className="mt-3 text-lg font-semibold">{priceUsdText}</div>
      {variantControls ? <div className="mt-6">{variantControls}</div> : null}

      <div className="mt-6 space-y-3 text-sm">
        <div>
          <span className="text-zinc-500">Style:</span> {product.style}
        </div>
        <div>
          <span className="text-zinc-500">Color:</span> {product.color}
        </div>
        <div>
          <span className="text-zinc-500">Size:</span> {product.size}
        </div>
        <div>
          <span className="text-zinc-500">Estimated Weight:</span>{" "}
          {product.weight_kg == null ? "N/A" : `${product.weight_kg.toFixed(2)} kg`}
        </div>
        <div>
          <span className="text-zinc-500">SKU:</span> {product.sku}
        </div>
        <div>
          <span className="text-zinc-500">Stock:</span>{product.qty}
        </div>
      </div>

      {Array.isArray(product.materials) && product.materials.length > 0 ? (
        <div className="mt-3 text-sm">
          <span className="text-zinc-500">Materials:</span>{" "}
          {product.materials
            .map((m) => (m.percentage == null ? m.material : `${m.material} ${m.percentage}%`))
            .join(", ")}
        </div>
      ) : null}

      {/* Description */}
      <div className="mt-8">
        <h2 className="text-base font-medium">Description</h2>
        <p className="mt-2 text-sm text-zinc-700">{product.description}</p>
      </div>

    </div>
  );
}
