"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import HeroCarousel from "./HeroCarousel";
import HeroSearch from "./HeroSearch";
import RankTable from "./RankTable";
import type { Hero } from "@/lib/heroes";
import type { BoardRow } from "@/lib/queries";
import { formatDate } from "@/lib/format";

export default function HeroStage({
  top,
  asOf,
}: {
  top: BoardRow[];
  asOf: number | null;
}) {
  const [hero, setHero] = useState<Hero | null>(null);
  const onChange = useCallback((h: Hero) => setHero(h), []);

  return (
    <>
      <section className="relative flex h-screen min-h-[640px] flex-col items-center justify-center px-6">
        <HeroCarousel onChange={onChange} />

        <div className="relative z-10 flex w-full max-w-2xl flex-col items-center text-center">
          <h1 className="rise text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white"
            style={{ textShadow: "0 2px 40px rgba(0,0,0,0.45)" }}>
            Every match.
            <br />
            Every player.
          </h1>
          <p
            className="rise mt-6 max-w-md text-[17px] leading-relaxed text-white/75"
            style={{ animationDelay: "120ms", textShadow: "0 1px 24px rgba(0,0,0,0.5)" }}
          >
            Twenty-five years of ATP tennis — match histories, surface splits, and a
            performance rating for every player in every match.
          </p>

          <div className="rise mt-10 w-full max-w-md" style={{ animationDelay: "240ms" }}>
            <HeroSearch />
          </div>
        </div>

        {/* Which venue is on screen — gives the photography a reason to exist. */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-6 pb-8">
          <div className="mx-auto flex max-w-6xl items-end justify-between gap-6">
            <div
              key={hero?.slug}
              className="rise text-left"
              style={{ animationDuration: "900ms" }}
            >
              <div className="text-[13px] font-medium tracking-tight text-white/85">
                {hero?.label ?? " "}
              </div>
              <div className="text-[12px] tracking-tight text-white/45">
                {hero?.detail ?? " "}
              </div>
            </div>
            <a
              href={hero?.source}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto hidden text-[11px] tracking-tight text-white/30 transition-colors hover:text-white/60 sm:block"
            >
              {hero ? `Photo: ${hero.credit} · ${hero.license}` : ""}
            </a>
          </div>
        </div>
      </section>

      {/* Rankings preview, in the same restrained language as the hero. */}
      {top.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 py-28">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="text-[28px] font-semibold tracking-[-0.02em] text-fg">
              Top ten
            </h2>
            <span className="text-[13px] text-fg/45">{formatDate(asOf)}</span>
          </div>

          <RankTable rows={top} showForm={false} />

          <Link
            href="/leaderboard"
            className="mt-8 inline-block text-[15px] tracking-tight text-fg/55 transition-colors hover:text-fg"
          >
            All rankings →
          </Link>
        </section>
      )}

      <footer className="mx-auto max-w-2xl px-6 pb-20 text-[12px] leading-relaxed text-fg/45">
        Match data from{" "}
        <a className="underline hover:text-fg/70" href="https://github.com/JeffSackmann/tennis_atp">
          Jeff Sackmann&apos;s tennis_atp
        </a>{" "}
        (CC BY-NC-SA 4.0) with current-season results from{" "}
        <a className="underline hover:text-fg/70" href="http://www.tennis-data.co.uk">
          tennis-data.co.uk
        </a>
        . Venue photography from Wikimedia Commons under Creative Commons licences.
      </footer>
    </>
  );
}
