"use client";

import { useEffect, useState } from "react";

export type PlayerHit = { id: number; full_name: string; ioc: string | null; total_matches: number };

export function usePlayerSearch(query: string) {
  const term = query.trim();
  const [result, setResult] = useState<{ term: string; players: PlayerHit[] }>({ term: "", players: [] });

  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal });
        if (!response.ok) throw new Error("Search failed");
        const data = await response.json();
        if (!controller.signal.aborted) setResult({ term, players: data.players });
      } catch {
        if (!controller.signal.aborted) setResult({ term, players: [] });
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [term]);

  // Hide old results immediately while a different query is being fetched.
  return term.length >= 2 && result.term === term ? result.players : [];
}
