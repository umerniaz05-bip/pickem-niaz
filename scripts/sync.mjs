/**
 * Trigger an NFL sync by calling the /api/sync endpoint (same path Vercel Cron
 * uses). Point it at your dev server or a deployment.
 *
 *   node --env-file=.env.local scripts/sync.mjs                 # current + prev week
 *   node --env-file=.env.local scripts/sync.mjs --week 1
 *   node --env-file=.env.local scripts/sync.mjs --week 1 --url https://your-app.vercel.app
 *
 * Needs CRON_SECRET in the environment (from .env.local).
 */
function arg(name) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 ? process.argv[i + 1] : undefined;
}

const base = (arg("url") || "http://localhost:3000").replace(/\/$/, "");
const secret = process.env.CRON_SECRET;
if (!secret) {
  console.error("CRON_SECRET not set. Run: node --env-file=.env.local scripts/sync.mjs");
  process.exit(1);
}

const params = new URLSearchParams();
if (arg("week")) params.set("week", arg("week"));
if (arg("season")) params.set("season", arg("season"));

const url = `${base}/api/sync${params.toString() ? `?${params}` : ""}`;
const res = await fetch(url, {
  method: "POST",
  headers: { authorization: `Bearer ${secret}` },
});

const body = await res.json().catch(() => ({}));
console.log(`${res.status} ${res.statusText}`);
console.dir(body, { depth: 5 });
process.exit(res.ok ? 0 : 1);
