"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Nav from "./Nav";
import SearchBox from "./SearchBox";

// On the landing page the header floats over the photography with no chrome;
// everywhere else it is a normal solid bar.
export default function SiteHeader() {
  const pathname = usePathname();
  const overlay = pathname === "/";

  return (
    <header
      className={
        overlay
          ? "absolute inset-x-0 top-0 z-30"
          : "sticky top-0 z-30 border-b border-white/[0.06] bg-ink/80 backdrop-blur-xl"
      }
    >
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-5">
        <Link
          href="/"
          className={`font-sf text-[15px] font-semibold tracking-tight ${
            overlay ? "text-white" : "text-white"
          }`}
        >
          GameSetMatch
        </Link>
        <Nav overlay={overlay} />
        {!overlay && (
          <div className="ml-auto">
            <SearchBox />
          </div>
        )}
      </div>
    </header>
  );
}
