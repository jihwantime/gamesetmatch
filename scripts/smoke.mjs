import assert from "node:assert/strict";

const base = (process.env.BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
async function page(path, expected, status = 200) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, status, `${path}: expected HTTP ${status}`);
  const html = await response.text();
  for (const text of expected) assert.ok(html.includes(text), `${path}: missing ${text}`);
  console.log(`PASS ${path}`);
  return html;
}

const health = await fetch(`${base}/api/health`);
assert.equal(health.status, 200);
assert.equal((await health.json()).status, "ok");
const search = await fetch(`${base}/api/search?q=Federer`);
assert.equal(search.status, 200);
const { players } = await search.json();
assert.ok(players.some(p => p.id === 103819 && p.full_name === "Roger Federer"));
assert.ok(players.every(p => Number.isInteger(p.total_matches) && p.total_matches > 0));
const short = await fetch(`${base}/api/search?q=F`);
assert.deepEqual((await short.json()).players, []);
await page("/", ["Every match.", "Roger Federer"]);
await page("/leaderboard", ["Rankings", "Roger Federer", "Rafael Nadal"]);
const profile = await page("/player/103819", ["Roger Federer", "Rafael Nadal"]);
const matchId = profile.match(/href="\/match\/(\d+)"/)?.[1];
assert.ok(matchId, "Player profile must link to a match");
await page(`/match/${matchId}`, ["Roger Federer"]);
await page("/predict?p1=103819", ["Roger Federer", "Select both players"]);
for (const surface of ["Hard", "Clay", "Grass"]) {
  const prediction = await page(`/predict?p1=103819&p2=104745&surface=${surface}`,
    ["Roger Federer", "Rafael Nadal", "is favoured.", "Head to head"]);
  const probabilities = [...prediction.matchAll(/>(\d+)(?:<!-- -->)?%</g)].map(m => Number(m[1]));
  assert.ok(probabilities.length >= 2, "Expected both win probabilities");
  assert.equal(probabilities[0] + probabilities[1], 100);
}
await page("/player/2147483647", [], 404);
console.log("All database-backed HTTP checks passed.");
