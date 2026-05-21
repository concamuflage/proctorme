import Link from "next/link";
import { formatUsd } from "@/lib/formatters";
import { proctorInitials } from "@/lib/proctor";

export type Proctor = {
  slug: string;
  name: string;
  price: number; // USD
  brand: string;
  specialty?: string;
  imageUrl: string;
  address: string;
  sessionWindow: string;
};

type ProctorCardProps = {
  proctor: Proctor;
};

export default function ProctorCard({ proctor }: ProctorCardProps) {
  const priceText = formatUsd(proctor.price);
  const initials = proctorInitials(proctor.name);

  return (
    <Link
      href={`/proctors/${proctor.slug}`}
      className="group block overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-sm transition hover:shadow"
      data-testid={`proctor-card-${proctor.slug}`}
    >
      <div className="flex aspect-[4/3] w-full items-center justify-center bg-zinc-100 p-6">
        {proctor.imageUrl ? (
          <img src={proctor.imageUrl} alt={proctor.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full border border-zinc-300 bg-white text-3xl font-semibold text-zinc-900 shadow-sm transition group-hover:scale-[1.02]">
            {initials}
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-sm text-zinc-500">
              {proctor.brand}
            </div>
            <h3 className="mt-1 line-clamp-2 text-base font-medium text-zinc-900">
              {proctor.name}
            </h3>
            {proctor.specialty ? (
              <div className="mt-2 text-xs font-medium text-zinc-700">{proctor.specialty}</div>
            ) : null}

            {proctor.address ? (
              <div className="mt-2 text-xs text-zinc-600">
                {proctor.address}
              </div>
            ) : null}
            <div className="mt-2 text-xs text-zinc-600">Session: {proctor.sessionWindow}</div>
          </div>

          <div className="shrink-0 text-right text-sm font-semibold text-zinc-900">
            {priceText}
            <div className="mt-1 text-xs font-normal text-zinc-500">hour</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
