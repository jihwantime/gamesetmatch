"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SURFACES = ["Hard", "Clay", "Grass", "Carpet"];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);

// Filters write to the URL and the server re-renders, so a filtered match list
// is a real, shareable address.
export default function MatchFilters({ surface, year }: { surface: string; year: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page");
    router.push(`${pathname}?${next}`);
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={surface} onChange={(v) => set("surface", v)}
        options={[{ value: "", label: "All surfaces" }, ...SURFACES.map((s) => ({ value: s, label: s }))]} />
      <Select value={year} onChange={(v) => set("year", v)}
        options={[{ value: "", label: "All years" }, ...YEARS.map((y) => ({ value: String(y), label: String(y) }))]} />
    </div>
  );
}

function Select({
  value, options, onChange,
}: {
  value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none rounded-full bg-white/[0.06] py-1.5 pl-3.5 pr-8 text-[13px] tracking-tight text-white/70 transition-colors hover:bg-white/[0.1] focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#131316] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-white/40">▾</span>
    </div>
  );
}
