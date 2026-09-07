"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import HeroCarousel from "./HeroCarousel";
import HeroSearch from "./HeroSearch";
import type { Hero } from "@/lib/heroes";
import type { BoardRow } from "@/lib/queries";
import { flagEmoji, formatDate } from "@/lib/format";

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
          <h1 className="rise font-sf text-[clamp(2.75rem,7vw,5.25rem)] font-semibold leading-[1.05] tracking-[-0.035em] text-white"
            style={{ textShadow: "0 2px 40px rgba(0,0,0,0.45)" }}>
            Every match.
            <br />
            Every player.
          </h1>
          <p
            className="rise mt-6 max-w-md font-sf text-[17px] leading-relaxed text-white/75"
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
              <div className="font-sf text-[13px] font-medium tracking-tight text-white/85">
                {hero?.venue ?? " "}
              </div>
              <div className="font-sf text-[12px] tracking-tight text-white/45">
                {hero?.place ?? " "}
              </div>
            </div>
            <a
              href={hero?.source}
              target="_blank"
              rel="noreferrer"
              className="pointer-events-auto hidden font-sf text-[11px] tracking-tight text-white/30 transition-colors hover:text-white/60 sm:block"
            >
              {hero ? `Photo: ${hero.credit} · ${hero.license}` : ""}
            </a>
          </div>
        </div>
      </section>

      {/* Rankings preview, in the same restrained language as the hero. */}
      {top.length > 0 && (
        <section className="mx-auto max-w-2xl px-6 py-24">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-sf text-[22px] font-semibold tracking-tight text-white">
              ATP Rankings
            </h2>
            <span className="font-sf text-[13px] text-white/35">{formatDate(asOf)}</span>
          </div>

          <ol>
            {top.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/player/${e.id}`}
                  className="group flex items-center gap-4 border-b border-white/[0.07] py-3.5 transition-colors hover:border-white/20"
                >
                  <span className="w-5 text-right font-sf text-[13px] tabular-nums text-white/30">
                    {e.rank}
                  </span>
                  <span className="text-[15px]">{flagEmoji(e.ioc)}</span>
                  <span className="flex-1 font-sf text-[15px] tracking-tight text-white/85 transition-colors group-hover:text-white">
                    {e.full_name}
                  </span>
                  <span className="font-sf text-[13px] tabular-nums text-white/35">
                    {e.points?.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ol>

          <Link
            href="/leaderboard"
            className="mt-8 inline-block font-sf text-[14px] tracking-tight text-white/50 transition-colors hover:text-white"
          >
            All rankings →
          </Link>
        </section>
      )}

      <footer className="mx-auto max-w-2xl px-6 pb-16 font-sf text-[12px] leading-relaxed text-white/25">
        Match data from{" "}
        <a className="underline hover:text-white/50" href="https://github.com/JeffSackmann/tennis_atp">
          Jeff Sackmann&apos;s tennis_atp
        </a>{" "}
        (CC BY-NC-SA 4.0) with current-season results from{" "}
        <a className="underline hover:text-white/50" href="http://www.tennis-data.co.uk">
          tennis-data.co.uk
        </a>
        . Venue photography from Wikimedia Commons under Creative Commons licences.
      </footer>
    </>
  );
}
