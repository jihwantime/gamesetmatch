import { Hono } from "hono";
import {
  getHeadToHead,
  getLeaderboard,
  getMatch,
  getPlayerMatches,
  getPlayerProfile,
  getPrediction,
  getRankHistory,
  searchPlayers,
} from "./queries";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", (c) => c.json({ ok: true, service: "gamesetmatch" }));

app.get("/api/search", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 2) return c.json({ players: [] });
  return c.json({ players: await searchPlayers(c.env.DB, q) });
});

app.get("/api/players/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const profile = await getPlayerProfile(c.env.DB, id);
  if (!profile) return c.json({ error: "player not found" }, 404);
  return c.json(profile);
});

app.get("/api/players/:id/matches", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const page = Math.max(1, Number(c.req.query("page") ?? 1) || 1);
  const surface = c.req.query("surface") || undefined;
  const year = Number(c.req.query("year")) || undefined;
  return c.json(await getPlayerMatches(c.env.DB, id, { page, pageSize: 20, surface, year }));
});

app.get("/api/players/:id/rank-history", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  return c.json({ history: await getRankHistory(c.env.DB, id) });
});

app.get("/api/matches/:id", async (c) => {
  const id = Number(c.req.param("id"));
  if (!Number.isInteger(id)) return c.json({ error: "bad id" }, 400);
  const match = await getMatch(c.env.DB, id);
  if (!match) return c.json({ error: "match not found" }, 404);
  return c.json(match);
});

app.get("/api/leaderboard", async (c) => {
  const date = Number(c.req.query("date")) || undefined;
  return c.json(await getLeaderboard(c.env.DB, date));
});

app.get("/api/h2h/:id1/:id2", async (c) => {
  const id1 = Number(c.req.param("id1"));
  const id2 = Number(c.req.param("id2"));
  if (!Number.isInteger(id1) || !Number.isInteger(id2) || id1 === id2) {
    return c.json({ error: "bad ids" }, 400);
  }
  const h2h = await getHeadToHead(c.env.DB, id1, id2);
  if (!h2h) return c.json({ error: "player not found" }, 404);
  return c.json(h2h);
});

app.get("/api/predict", async (c) => {
  const id1 = Number(c.req.query("p1"));
  const id2 = Number(c.req.query("p2"));
  if (!Number.isInteger(id1) || !Number.isInteger(id2) || id1 === id2) {
    return c.json({ error: "pick two different players" }, 400);
  }
  const surfaceParam = c.req.query("surface");
  const surface = ["Hard", "Clay", "Grass", "Carpet"].includes(surfaceParam ?? "")
    ? surfaceParam!
    : null;
  const prediction = await getPrediction(c.env.DB, id1, id2, surface);
  if (!prediction) return c.json({ error: "player has no Elo rating" }, 404);
  return c.json(prediction);
});

app.notFound((c) =>
  c.req.path.startsWith("/api/")
    ? c.json({ error: "not found" }, 404)
    : c.env.ASSETS.fetch(c.req.raw)
);

export default app;
