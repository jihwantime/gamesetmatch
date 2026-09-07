"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

const SURFACES = ["Hard", "Clay", "Grass", "Carpet"];
const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: THIS_YEAR - 1999 }, (_, i) => THIS_YEAR - i);

// Writes the filter into the URL and lets the server re-render the page, so a
// filtered match list is a real, shareable address.
export default function MatchFilters({ surface, year }: { surface: string; year: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    next.delete("page"); // any filter change returns to page 1
    router.push(`${pathname}?${next}`);
  };

  return (
    <>
      <Select label="Surface" value={surface} onChange={(v) => set("surface", v)}
              options={[{ value: "", label: "All" }, ...SURFACES.map((s) => ({ value: s, label: s }))]} />
      <Select label="Season" value={year} onChange={(v) => set("year", v)}
              options={[{ value: "", label: "All" }, ...YEARS.map((y) => ({ value: String(y), label: String(y) }))]} />
    </>
  );
}

function Select({
  label, value, options, onChange,
}: {
  label: string; value: string; options: { value: string; label: string }[]; onChange: (v: string) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-1 rounded-full bg-card px-4 py-1.5 text-sm text-slate-300">
      <span className="text-slate-500">{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer appearance-none bg-transparent pr-1 font-semibold text-slate-200 focus:outline-none"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-card">
            {o.label}
          </option>
        ))}
      </select>
      <span className="text-xs text-slate-500">▾</span>
    </label>
  );
}
