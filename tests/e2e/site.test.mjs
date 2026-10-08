/* Suite 1 — fonctionnel : disponibilité, langue, portail, mobile, 404. */
import { run, assert, scrollTo, scrollThrough, shot } from "./lib.mjs";

await run([
  {
    name: "index-desktop",
    url: "index.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      await shot(page, "index-hero");
      const pill = await page.locator('.hero-side [data-av="pill"]').getAttribute("data-state");
      const title = await page.locator('.hero-side [data-av="title"]').textContent();
      const clock = await page.locator('.hero-side [data-av="clock"]').textContent();
      console.log("availability:", { pill, title, clock });
      assert(["open", "closed", "soon"].includes(pill), "pill state invalid");
      assert(/\d{2}:\d{2}/.test(clock), "clock not rendered");
      console.log("years:", await page.locator('[data-count-bind="years"]').textContent());
      await scrollThrough(page);
      await page.waitForTimeout(800);
      const weekRows = await page.locator('[data-av="week"] .week-row').count();
      console.log("week rows:", weekRows);
      assert(weekRows === 7, "week table rows != 7");
      await scrollTo(page, 0);
      await page.waitForTimeout(600);
      await page.click('.lang button[data-lang="en"]');
      await page.waitForTimeout(500);
      const h1 = (await page.locator("#hero-title").textContent()).trim();
      console.log("EN h1:", h1, "| title:", await page.title());
      assert(/Customs/.test(h1) && /friction/.test(h1), "EN translation not applied to h1");
      console.log("EN pill:", await page.locator(".hero-side [data-av-label]").first().textContent());
      const link = page.locator("a.portal");
      await link.scrollIntoViewIfNeeded();
      await page.waitForTimeout(600);
      await link.click({ position: { x: 200, y: 200 } });
      await page.waitForURL(/transport\.html/, { timeout: 5000 });
      await page.waitForTimeout(1500);
      const lang = await page.evaluate(() => document.documentElement.lang);
      console.log("lang persisted on transport:", lang);
      assert(lang === "en", "language not persisted");
    },
  },
  {
    name: "transport-desktop",
    url: "transport.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      await page.evaluate(() => localStorage.removeItem("mz:lang"));
      await shot(page, "transport-hero");
      await scrollThrough(page);
      await page.waitForTimeout(800);
      const lanes = await page.locator(".lane").count();
      assert(lanes === 6, "lanes != 6");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(sw <= 1440, `horizontal overflow: ${sw}`);
    },
  },
  {
    name: "index-mobile",
    url: "index.html",
    viewport: { width: 390, height: 844 },
    fn: async (page) => {
      await shot(page, "index-mobile-hero");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log("mobile scrollWidth:", sw);
      assert(sw <= 390, `horizontal overflow: ${sw}`);
      await page.click("#burger");
      await page.waitForTimeout(900);
      assert(await page.evaluate(() => document.getElementById("menu").classList.contains("is-open")), "menu did not open");
      await page.click("#burger");
      await page.waitForTimeout(400);
      await scrollThrough(page, 400, 60);
      const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(sw2 <= 390, `horizontal overflow after scroll: ${sw2}`);
    },
  },
  {
    name: "transport-mobile",
    url: "transport.html",
    viewport: { width: 390, height: 844 },
    fn: async (page) => {
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      console.log("transport mobile scrollWidth:", sw);
      assert(sw <= 390, `horizontal overflow: ${sw}`);
      await scrollThrough(page, 400, 60);
    },
  },
  {
    name: "404",
    url: "404.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      assert((await page.locator(".btn").count()) === 2, "404 buttons");
    },
  },
]);
