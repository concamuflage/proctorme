import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-zinc-200 bg-zinc-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-sm text-zinc-600 sm:px-6 sm:py-10 md:flex-row md:items-center md:justify-between">
        <div>© {new Date().getFullYear()} OutlierFit</div>
        <div className="flex gap-4">
          <Link className="hover:underline" href="/policies/returns">
            Returns
          </Link>
          <Link className="hover:underline" href="/policies/shipping">
            Shipping
          </Link>
        </div>
      </div>
    </footer>
  );
}
