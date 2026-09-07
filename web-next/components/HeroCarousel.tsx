"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { HEROES, type Hero } from "@/lib/heroes";

const HOLD_MS = 6500;   // time each photo is held
const FADE_MS = 2000;   // crossfade duration

function shuffle<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function HeroCarousel({ onChange }: { onChange?: (hero: Hero) => void }) {
  // The server can't know the random order, so render the canonical order with
  // everything still transparent, then shuffle after mount. Randomising during
  // render would desync server and client HTML and React would drop the tree.
  const [order, setOrder] = useState<Hero[]>(HEROES);
  const [index, setIndex] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onMq = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onMq);

    // Reordering while every layer is still at opacity 0 is invisible, so the
    // first photo simply fades up out of black.
    setOrder(shuffle(HEROES));
    setMounted(true);
    return () => mq.removeEventListener("change", onMq);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    // Swap the caption mid-crossfade so it doesn't announce the next venue
    // while the previous photo is still on screen.
    const t = setTimeout(() => onChange?.(order[index]), index === 0 ? 0 : FADE_MS / 2);
    return () => clearTimeout(t);
  }, [mounted, index, order, onChange]);

  useEffect(() => {
    if (!mounted || reduced || order.length < 2) return;
    const t = setInterval(() => setIndex((i) => (i + 1) % order.length), HOLD_MS);
    return () => clearInterval(t);
  }, [mounted, reduced, order.length]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
      {order.map((hero, i) => {
        const active = mounted && i === index;
        return (
          <div
            key={hero.slug}
            aria-hidden={!active}
            className="absolute inset-0"
            style={{
              opacity: active ? 1 : 0,
              transition: `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
            }}
          >
            <Image
              src={hero.src}
              alt={`${hero.label} — ${hero.detail}`}
              fill
              priority={i === 0}
              sizes="100vw"
              className="object-cover"
              style={
                reduced
                  ? undefined
                  : {
                      // slow drift so a still frame doesn't feel dead
                      transform: active ? "scale(1.06)" : "scale(1)",
                      transition: `transform ${HOLD_MS + FADE_MS}ms linear`,
                    }
              }
            />
          </div>
        );
      })}

      {/* Scrim. Three layers: an overall damp, a vertical gradient that anchors
          the header and the caption, and a soft radial pool behind the centre
          text so the headline stays legible over bright, busy frames. */}
      <div className="absolute inset-0 bg-black/20" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 50% 45%, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.2) 45%, rgba(0,0,0,0) 75%)",
        }}
      />
    </div>
  );
}
