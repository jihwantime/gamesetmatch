"use client";

import { useEffect, useRef } from "react";

// Opacity is driven straight from scroll position (not a fixed-duration CSS
// transition) so the fade tracks how fast you scroll, in both directions.
export default function ScrollReveal({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const FADE_DIST = 260;
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current;
      if (!el) return;
      const rectTop = el.getBoundingClientRect().top;
      const progress = Math.min(1, Math.max(0, (window.innerHeight - rectTop) / FADE_DIST));
      el.style.opacity = String(progress);
      el.style.transform = `translateY(${(1 - progress) * 32}px)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={ref} style={{ opacity: 0, willChange: "opacity, transform" }} className={className}>
      {children}
    </div>
  );
}
