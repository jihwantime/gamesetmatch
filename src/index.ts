import { Hono } from "hono";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
};

const app = new Hono<{ Bindings: Env }>();

app.get("/api/health", async (c) => {
  return c.json({ ok: true, service: "gamesetmatch" });
});

export default app;
