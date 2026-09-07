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
    <div className="flex items-center gap-5">
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
        className="cursor-pointer appearance-none border-b border-white/[0.14] bg-transparent pb-1 pl-0 pr-5 text-[13px] tracking-tight text-white/60 transition-colors hover:border-white/35 hover:text-white focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#131316] text-white">
            {o.label}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-0 top-1/2 -translate-y-[60%] text-[9px] text-white/35">▾</span>
    </div>
  );
}
