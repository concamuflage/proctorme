import type { Metadata } from "next";
import ProductDetailClient from "@/app/products/[Slug]/ProductDetailClient";
import { getServerApiBaseUrl } from "@/lib/api-base";

type ProductPageProps = {
  params: Promise<{ Slug: string }>;
};

type ProductTitlePayload = {
  name?: unknown;
};

const SITE_NAME = "OutlierFit";

function pageTitle(title: string) {
  return `${title} | ${SITE_NAME}`;
}

async function getProductName(slug: string) {
  const productId = Number(slug);
  if (!Number.isFinite(productId)) {
    return null;
  }

  try {
    const response = await fetch(`${getServerApiBaseUrl()}/products/${productId}`, {
      cache: "no-store",
    });
    const product = (await response.json().catch(() => null)) as ProductTitlePayload | null;
    const productName = typeof product?.name === "string" ? product.name.trim() : "";

    return response.ok && productName ? productName : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { Slug } = await params;
  const productName = await getProductName(Slug);

  return {
    title: productName ? pageTitle(productName) : pageTitle("Product"),
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { Slug } = await params;

  return <ProductDetailClient slug={Slug} />;
}
