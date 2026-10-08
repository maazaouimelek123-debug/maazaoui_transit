/* Utilitaires partagés des tests de bout en bout (Playwright + Chromium).
   Lancement : node tests/e2e/site.test.mjs  (un serveur statique doit servir le dépôt sur BASE_URL, par défaut http://127.0.0.1:8080) */

export const BASE = process.env.BASE_URL || "http://127.0.0.1:8080";
export const SHOTS = process.env.SHOTS_DIR || "";

export async function launch() {
  let pw;
  try {
    pw = await import("playwright");
  } catch (e) {
    pw = await import("/opt/node-tools/node_modules/playwright/index.mjs");
  }
  return pw.chromium.launch();
}

/** Les échecs réseau vers les polices et Google Maps sont attendus hors ligne. */
export const isExternal = (url) => /fonts\.g|google\.com\/maps|maps\.google|gstatic/.test(url);

export function watchErrors(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !isExternal(m.text())) errors.push(`console: ${m.text()}`);
  });
  page.on("requestfailed", (r) => {
    if (!isExternal(r.url())) errors.push(`requestfailed: ${r.url()} ${r.failure() && r.failure().errorText}`);
  });
  return errors;
}

export const scrollTo = (page, y) => page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), y);

export async function scrollThrough(page, step = 500, wait = 90) {
  await page.evaluate(
    async ({ step, wait }) => {
      for (let y = 0; y < document.body.scrollHeight; y += step) {
        window.scrollTo({ top: y, behavior: "instant" });
        await new Promise((r) => setTimeout(r, wait));
      }
    },
    { step, wait }
  );
}

export async function shot(page, name, opts) {
  if (!SHOTS) return;
  await page.screenshot({ path: `${SHOTS}/${name}.png`, ...(opts || {}) });
}

/** Exécute une série de cas ; chaque cas reçoit une page neuve. Sort avec le code 1 si un cas échoue. */
export async function run(cases) {
  const browser = await launch();
  const problems = [];
  for (const c of cases) {
    const ctx = await browser.newContext({ viewport: c.viewport, locale: "fr-FR", timezoneId: "Africa/Tunis", ...(c.context || {}) });
    const page = await ctx.newPage();
    const errors = watchErrors(page);
    try {
      await page.goto(`${BASE}/${c.url}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(2300); // préchargeur
      await c.fn(page);
    } catch (e) {
      errors.push(`test: ${e.message}`);
    }
    if (errors.length) problems.push({ name: c.name, errors });
    await ctx.close();
  }
  await browser.close();
  if (problems.length) {
    console.log("\nPROBLEMS:");
    for (const p of problems) {
      console.log(`\n[${p.name}]`);
      p.errors.forEach((e) => console.log("  - " + e));
    }
    process.exitCode = 1;
  } else {
    console.log("\nALL CHECKS PASSED");
  }
}

export function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}
