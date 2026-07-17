// Rebuild the local D1 database: apply schema.sql, then every seed file in
// etl/out/ in name order. Run `python etl/build_seed.py` first to generate them.
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const outDir = join(root, "etl", "out");

const seedFiles = existsSync(outDir)
  ? readdirSync(outDir).filter((f) => f.endsWith(".sql")).sort()
  : [];

if (seedFiles.length === 0) {
  console.error("no seed files in etl/out/ — run `python etl/build_seed.py` first");
  process.exit(1);
}

const files = ["schema.sql", ...seedFiles.map((f) => join("etl", "out", f))];
for (const file of files) {
  console.log(`applying ${file}`);
  execFileSync(
    "npx",
    ["wrangler", "d1", "execute", "gamesetmatch", "--local", `--file=${file}`],
    { cwd: root, stdio: ["ignore", "ignore", "inherit"] }
  );
}
console.log(`done: applied schema + ${seedFiles.length} seed files`);
