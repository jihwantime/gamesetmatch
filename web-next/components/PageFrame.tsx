"use client";

import { usePathname } from "next/navigation";

// The landing page runs full-bleed for its photography; every other page gets
// the standard container and footer.
export default function PageFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  if (pathname === "/") return <>{children}</>;

  return (
    <>
      <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      <footer className="mx-auto max-w-5xl px-4 pb-10 pt-4 text-xs text-fg/40">
        Data:{" "}
        <a className="underline hover:text-fg/60" href="https://github.com/JeffSackmann/tennis_atp">
          Jeff Sackmann&apos;s tennis_atp
        </a>{" "}
        (CC BY-NC-SA 4.0) with current-season results from{" "}
        <a className="underline hover:text-fg/60" href="http://www.tennis-data.co.uk">
          tennis-data.co.uk
        </a>{" "}
        · ATP tour-level matches since 2000
      </footer>
    </>
  );
}
