/* Suite 2 — effets de défilement : hero, molette, empilement, texte, teinte, progression, champ, éclosion, rail, horizontal. */
import { run, assert, scrollTo, shot } from "./lib.mjs";

await run([
  {
    name: "index-scroll",
    url: "index.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      const cls = await page.evaluate(() => document.documentElement.className);
      console.log("html classes:", cls);
      assert(/\bfx\b/.test(cls), "fx not enabled");
      // Hero : lisible tant que les statistiques sont à l'écran
      await scrollTo(page, 450);
      await page.waitForTimeout(400);
      const op450 = await page.evaluate(() => getComputedStyle(document.querySelector(".hero > .container")).opacity);
      console.log("hero opacity at 450px:", op450);
      assert(Number(op450) >= 0.95, "hero fades too early");
      // Molette : le défilement inertiel avance et ne vole pas les défilements externes
      await page.mouse.move(700, 500);
      const before = await page.evaluate(() => window.scrollY);
      for (let i = 0; i < 8; i++) {
        await page.mouse.wheel(0, 120);
        await page.waitForTimeout(40);
      }
      await page.waitForTimeout(900);
      const after = await page.evaluate(() => window.scrollY);
      console.log("wheel scroll:", before, "→", after);
      assert(after - before > 500, "smooth wheel scroll did not advance");
      await scrollTo(page, 2000);
      await page.waitForTimeout(300);
      assert(Math.abs((await page.evaluate(() => window.scrollY)) - 2000) < 2, "external scrollTo was overridden by smooth scroll");
      // Cartes empilées
      const stackTop = await page.evaluate(() => document.querySelector(".steps").getBoundingClientRect().top + window.scrollY);
      await scrollTo(page, stackTop + 420);
      await page.waitForTimeout(500);
      const tr = await page.evaluate(() => [...document.querySelectorAll(".step")].map((s) => s.style.transform));
      console.log("stack transforms:", tr);
      assert(/scale\(0\.9[0-9]+\)/.test(tr[0]), "first card not scaled down under the next one");
      await shot(page, "fx-stack");
      // Texte mot à mot
      const aboutTop = await page.evaluate(() => document.querySelector("#bureau").getBoundingClientRect().top + window.scrollY);
      await scrollTo(page, aboutTop + 120);
      await page.waitForTimeout(600);
      const on = await page.evaluate(() => ({ on: document.querySelectorAll("[data-scrub-text] .sw.on").length, total: document.querySelectorAll("[data-scrub-text] .sw").length }));
      console.log("scrub words:", on);
      assert(on.on > 0, "scrub text never lit");
      // Teinte au portail (voile dédié, rien sur <html>)
      const portalTop = await page.evaluate(() => document.querySelector("#transport").getBoundingClientRect().top + window.scrollY);
      await scrollTo(page, portalTop - 100);
      await page.waitForTimeout(600);
      const tint = await page.evaluate(() => ({ opacity: document.querySelector(".tint-veil").style.opacity, rgb: document.querySelector(".tint-veil").style.getPropertyValue("--tint-rgb"), html: document.documentElement.getAttribute("style") }));
      console.log("tint:", tint);
      assert(Number(tint.opacity) > 0.3 && !tint.html, "tint veil inactive or variables leaked on <html>");
      // Progression, champ, éclosion, rail
      const misc = await page.evaluate(() => ({
        progress: document.querySelector(".scroll-progress").style.transform,
        depth: document.querySelector(".depth-field").style.getPropertyValue("--depth"),
        bloomed: document.querySelectorAll("[data-bloom].is-bloomed").length,
        blooms: document.querySelectorAll("[data-bloom]").length,
        seeds: document.querySelectorAll(".seed").length,
        railActive: document.querySelector(".rail-node.is-active span") && document.querySelector(".rail-node.is-active span").textContent,
        railFill: document.querySelector(".rail > .rail-fill") && document.querySelector(".rail > .rail-fill").style.transform,
      }));
      console.log("misc:", misc);
      assert(/scaleX\(0\.[5-9]/.test(misc.progress), "progress bar not updated");
      assert(Number(misc.depth) > 0.4, "field depth not updated");
      assert(misc.seeds === misc.blooms && misc.bloomed >= 6, "blooms/seeds inconsistent");
      assert(misc.railActive === "Portail", `rail active label: ${misc.railActive}`);
      assert(/scaleY\(0\.[1-9]/.test(misc.railFill || ""), "rail fill never filled");
      // Chemin pointillé : un tracé par segment, parcourus entiers / en cours rogné / à venir masqués
      const journey = await page.evaluate(() => {
        const svg = document.querySelector(".journey");
        const segs = [...svg.querySelectorAll(".journey-done")].map((el) => (el.style.visibility === "hidden" ? "H" : el.style.clipPath.startsWith("url(") ? "A" : "D")).join("");
        const rect = svg.querySelector("#journey-clip rect");
        const base = svg.getBoundingClientRect().top + window.scrollY;
        return { segs, rectH: Number(rect && rect.getAttribute("height")), expected: window.scrollY + window.innerHeight / 2 - base, seeds: document.querySelectorAll(".seed").length };
      });
      console.log("journey:", journey);
      assert(journey.segs.length >= journey.seeds - 1 && /^D+A?H+$/.test(journey.segs), "journey segments not in done/active/hidden order: " + journey.segs);
      assert(Math.abs(journey.rectH - journey.expected) <= 4, `journey clip height ${journey.rectH} vs expected ${journey.expected}`);
      // Retour en haut : hero visible
      await scrollTo(page, 0);
      await page.waitForTimeout(500);
      const top = await page.evaluate(() => ({ vis: getComputedStyle(document.querySelector(".hero")).visibility, op: getComputedStyle(document.querySelector(".hero > .container")).opacity }));
      assert(top.vis === "visible" && Number(top.op) === 1, "hero not restored at top");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(sw <= 1440, "horizontal overflow " + sw);
    },
  },
  {
    name: "index-anchor",
    url: "index.html#contact",
    viewport: { width: 1366, height: 768 },
    fn: async (page) => {
      await page.waitForTimeout(500);
      const a = await page.evaluate(() => ({ grid: document.querySelector("#contact .contact-grid").classList.contains("is-bloomed"), map: document.querySelector("#contact .map-wrap").classList.contains("is-bloomed") }));
      console.log("anchor arrival:", a);
      assert(a.grid && a.map, "anchor target blocks not bloomed");
    },
  },
  {
    name: "transport-scroll",
    url: "transport.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      const sec = await page.evaluate(() => {
        const s = document.querySelector("#services");
        return { height: s.offsetHeight, top: s.getBoundingClientRect().top + window.scrollY };
      });
      console.log("hscroll section:", sec);
      assert(sec.height > 1200, "hscroll section not extended: " + sec.height);
      await scrollTo(page, sec.top + (sec.height - 900) * 0.5);
      await page.waitForTimeout(500);
      const trk = await page.evaluate(() => document.querySelector(".hscroll-track").style.transform);
      console.log("track transform mid:", trk);
      assert(/translate3d\(-\d/.test(trk), "track not translated");
      const sticky = await page.evaluate(() => getComputedStyle(document.querySelector(".ohero")).position);
      assert(sticky === "sticky", "transport hero not sticky");
      await shot(page, "fx-hscroll-mid");
    },
  },
  {
    name: "transport-mobile-fx",
    url: "transport.html",
    viewport: { width: 390, height: 844 },
    fn: async (page) => {
      const h = await page.evaluate(() => ({ secH: document.querySelector("#services").style.height, sw: document.documentElement.scrollWidth }));
      console.log("mobile hscroll fallback:", h);
      assert(!h.secH && h.sw <= 390, "mobile fallback broken");
    },
  },
  {
    name: "index-mobile-fx",
    url: "index.html",
    viewport: { width: 390, height: 844 },
    fn: async (page) => {
      const stackTop = await page.evaluate(() => document.querySelector(".steps").getBoundingClientRect().top + window.scrollY);
      await scrollTo(page, stackTop + 500);
      await page.waitForTimeout(500);
      await shot(page, "fx-stack-mobile");
      const sw = await page.evaluate(() => document.documentElement.scrollWidth);
      assert(sw <= 390, "mobile overflow " + sw);
    },
  },
  {
    name: "reduced-motion",
    url: "index.html",
    viewport: { width: 1366, height: 768 },
    context: { reducedMotion: "reduce" },
    fn: async (page) => {
      const r = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), seeds: document.querySelectorAll(".seed").length, hidden: [...document.querySelectorAll("#main [data-bloom], #main [data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length }));
      console.log("reduced motion:", r);
      assert(!r.fx && r.seeds === 0 && r.hidden === 0, "reduced-motion fallback broken");
      // Bandeau « animations réduites » : visible, et « Activer les effets » force la plongée (choix mémorisé)
      const notice = await page.evaluate(() => { const n = document.querySelector(".fx-notice"); return { hidden: n.hidden, display: getComputedStyle(n).display, text: n.querySelector("p").textContent, btn: n.querySelector("[data-fx]").textContent }; });
      console.log("fx notice:", notice);
      assert(!notice.hidden && notice.display !== "none" && /Activer/.test(notice.btn), "reduced-motion notice missing");
      await shot(page, "fx-notice-reduced");
      await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".fx-notice [data-fx='on']")]);
      await page.waitForTimeout(2600);
      const forced = await page.evaluate(() => ({ cls: document.documentElement.className, seeds: document.querySelectorAll(".seed").length, pref: localStorage.getItem("mz:fx"), btn: document.querySelector(".fx-notice [data-fx]").textContent, hidden: document.querySelector(".fx-notice").hidden }));
      console.log("forced on:", forced);
      assert(/\bfx\b/.test(forced.cls) && /\bfx-forced\b/.test(forced.cls) && forced.seeds === 12 && forced.pref === "on" && /calme/.test(forced.btn) && !forced.hidden, "forcing effects on failed");
      await scrollTo(page, 2600);
      await page.waitForTimeout(700);
      const bloomed = await page.evaluate(() => document.querySelectorAll("[data-bloom].is-bloomed").length);
      console.log("forced blooms:", bloomed);
      assert(bloomed >= 1, "forced effects do not bloom");
      // Retour au mode calme
      await Promise.all([page.waitForNavigation({ waitUntil: "load" }), page.click(".fx-notice [data-fx='off']")]);
      await page.waitForTimeout(800);
      const calm = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), pref: localStorage.getItem("mz:fx") }));
      console.log("calm again:", calm);
      assert(!calm.fx && calm.pref === "off", "returning to calm mode failed");
      await page.evaluate(() => localStorage.removeItem("mz:fx"));
    },
  },
  {
    name: "init-error-fallback",
    url: "index.html",
    viewport: { width: 1366, height: 768 },
    expectErrors: /simulated/,
    fn: async (page) => {
      // Une exception au démarrage des effets ne doit jamais laisser la page vide
      // (1) erreur dans un module de core.js (ResizeObserver cassé) : isolée, le reste démarre
      await page.addInitScript(() => { Object.defineProperty(window, "ResizeObserver", { get() { throw new Error("simulated"); } }); });
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2600);
      const a = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), loaderDone: !document.querySelector(".loader") || document.querySelector(".loader").classList.contains("is-done"), pill: (document.querySelector("[data-av='pill']") || {}).textContent, errors: (window.__mzErrors || []).map((x) => x.m) }));
      console.log("core module error:", a);
      assert(a.fx && a.loaderDone && /initCanvases/.test(a.errors.join(" ")) && a.pill && a.pill.trim().length > 0, "a failing core module stopped the others");
      // (2) erreur dans l'initialisation des effets (scroll.js) : la classe fx est retirée, rien n'est masqué
      await page.addInitScript(() => { const orig = window.matchMedia; window.matchMedia = (q) => { if (q === "(max-width: 760px)") throw new Error("simulated-scroll"); return orig.call(window, q); }; });
      await page.reload({ waitUntil: "load" });
      await page.waitForTimeout(2600);
      const b = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), hiddenBlooms: [...document.querySelectorAll("#main [data-bloom]")].filter((e) => getComputedStyle(e).opacity === "0").length, errors: (window.__mzErrors || []).map((x) => x.m) }));
      console.log("scroll init error:", b);
      assert(!b.fx && b.hiddenBlooms === 0 && /simulated-scroll/.test(b.errors.join(" ")), "page left empty after a scroll.js init error");
    },
  },
]);
