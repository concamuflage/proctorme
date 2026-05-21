import ProctorCard, { type Proctor } from "@/components/proctors/ProctorCard";

type ProctorGridProps = {
  proctors: Proctor[];
};

export default function ProctorGrid({ proctors }: ProctorGridProps) {
  if (!proctors || proctors.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600 sm:p-8">
        No proctors match that address.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
      {proctors.map((proctor) => (
        <ProctorCard key={proctor.slug} proctor={proctor} />
      ))}
    </div>
  );
}
