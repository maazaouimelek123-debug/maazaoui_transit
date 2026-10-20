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
    name: "index-film-4d",
    url: "index.html",
    viewport: { width: 1440, height: 900 },
    fn: async (page) => {
      // Film d'ouverture : section épinglée, 3D prête (ou affiche si WebGL / le CDN manque)
      const a = await page.evaluate(() => ({
        cls: document.documentElement.className,
        state: window.MZ && MZ.cinema && MZ.cinema.state(),
        sticky: getComputedStyle(document.querySelector(".cinema-stage")).position,
        height: document.querySelector("#film").offsetHeight,
        skip: document.querySelector(".cinema-skip").getAttribute("href"),
        planes: document.querySelectorAll(".fourd-plane").length,
      }));
      console.log("film mount:", a);
      // La page doit être visible (régression : une classe « cinema » sur <html> masquait tout le document)
      const shown = await page.evaluate(() => ({ html: getComputedStyle(document.documentElement).display, body: document.body.offsetHeight }));
      assert(shown.html !== "none" && shown.body > 900 * 5, "page hidden: " + JSON.stringify(shown));
      assert(/\bhas-film\b/.test(a.cls) && /\bfourd\b/.test(a.cls) && a.sticky === "sticky" && a.height > 900 * 5 && a.skip === "#accueil" && a.planes >= 5, "film not mounted");
      assert(a.state.mode === "3d" || a.state.mode === "poster", "film mode: " + a.state.mode);
      if (a.state.mode === "3d") {
        const still = await page.evaluate(() => MZ.cinema.still(0.47, 320, 180).length);
        assert(still > 4000, "film frame empty");
      }
      // Mi-parcours : le chapitre « Dédouanement » est à l'écran, le rail de la page s'efface
      const film = await page.evaluate(() => ({ top: document.querySelector("#film").offsetTop, run: document.querySelector("#film").offsetHeight - innerHeight }));
      await scrollTo(page, film.top + film.run * 0.51);
      await page.waitForTimeout(1600);
      const mid = await page.evaluate(() => {
        const ch = [...document.querySelectorAll(".cine-ch")].find((c) => /Dédouanement/.test(c.textContent));
        return { p: MZ.cinema.state().p, op: Number(ch.style.opacity), on: document.documentElement.classList.contains("cinema-on"), rail: getComputedStyle(document.querySelector(".rail")).opacity };
      });
      console.log("film mid:", mid);
      assert(mid.p > 0.45 && mid.p < 0.56 && mid.op > 0.8 && mid.on && Number(mid.rail) < 0.1, "film chapter not shown mid-way");
      await shot(page, "fx-film-mid");
      // Sortie : le point jaune s'ouvre en cercle (masque troué) et dévoile le hero, déjà dessous
      await scrollTo(page, film.top + film.run * 0.965);
      await page.waitForTimeout(1600);
      const opening = await page.evaluate(() => ({
        cls: document.querySelector("#film").className,
        mask: document.querySelector(".cinema-stage").style.maskImage || document.querySelector(".cinema-stage").style.webkitMaskImage,
        ring: Number(document.querySelector(".cinema-ring").style.opacity),
        heroTop: document.querySelector("#accueil").getBoundingClientRect().top,
        on: document.documentElement.classList.contains("cinema-on"),
      }));
      console.log("film opening:", opening);
      assert(/is-opening/.test(opening.cls) && /radial-gradient/.test(opening.mask) && opening.ring > 0 && opening.heroTop < 900 && !opening.on, "film does not open onto the page");
      await shot(page, "fx-film-opening");
      // « Passer l'intro » depuis le début : la caméra se place sans rejouer le film, la page est cliquable
      await scrollTo(page, 0);
      await page.waitForTimeout(600);
      await page.click(".cinema-skip");
      await page.waitForTimeout(1800);
      const skipped = await page.evaluate(() => { const el = document.elementFromPoint(innerWidth / 2, innerHeight / 2); return { sp: MZ.cinema.state().sp, hit: !!(el && el.closest("#accueil")) }; });
      console.log("after skip:", skipped);
      assert(skipped.sp > 0.97 && skipped.hit, "skip intro does not reveal the page");
      // Après le film : la page reprend (plus de cinema-on)
      const end = await page.evaluate(() => MZ.cinema.end());
      await scrollTo(page, end + 200);
      await page.waitForTimeout(500);
      assert(!(await page.evaluate(() => document.documentElement.classList.contains("cinema-on"))), "film still covering after its end");
      // Au repos, une section à l'écran est à plat (l'inclinaison de vitesse est retombée)
      await scrollTo(page, end + 2400);
      await page.waitForTimeout(900);
      const rest = await page.evaluate(() => [...document.querySelectorAll(".fourd-plane")].filter((s) => { const r = s.getBoundingClientRect(); return r.top < innerHeight * 0.4 && r.bottom > innerHeight * 0.6; }).map((s) => s.style.transform));
      console.log("planes at rest:", rest);
      assert(rest.length >= 1 && rest.every((t) => t === ""), "planes still tilted at rest");
      // Sortie par le haut : la section repart dans la profondeur
      const exitTop = await page.evaluate(() => { const s = document.querySelector("#disponibilite"); return s.getBoundingClientRect().bottom + window.scrollY - window.innerHeight * 0.2; });
      await scrollTo(page, exitTop);
      await page.waitForTimeout(700);
      const exit = await page.evaluate(() => { const s = document.querySelector("#disponibilite"); return { t: s.style.transform, o: s.style.opacity }; });
      console.log("exiting section:", exit);
      assert(/rotateX\((1\d|2\d)\./.test(exit.t) && Number(exit.o) < 0.65, "exiting section not receding");
      await shot(page, "fx-4d-exit");
      // Le chemin pointillé est mesuré à plat malgré les plans inclinés (reconstruit ici, section en sortie)
      await page.evaluate(() => window.dispatchEvent(new Event("resize")));
      await page.waitForTimeout(400);
      const flat = await page.evaluate(() => {
        // Extrémités de chaque courbe du chemin (M x y, puis tous les 3 points de « C »)
        const nums = document.querySelector(".journey-dots").getAttribute("d").replace(/[MC,]/g, " ").trim().split(/\s+/).map(Number);
        const pairs = [];
        for (let i = 0; i < nums.length; i += 2) pairs.push([nums[i], nums[i + 1]]);
        const ends = [pairs[0]];
        for (let i = 3; i < pairs.length; i += 3) ends.push(pairs[i]);
        const base = document.querySelector(".journey").getBoundingClientRect().top + window.scrollY;
        const seeds = MZ.fourd.neutral(() =>
          [...document.querySelectorAll(".curtain .seed")].map((el) => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 + window.scrollY - base]; }).sort((p, q) => p[1] - q[1])
        );
        return { n: ends.length, seeds: seeds.length, maxDiff: Math.max(...ends.map((e, i) => Math.hypot(e[0] - seeds[i][0], e[1] - seeds[i][1]))) };
      });
      console.log("journey vs flat seeds:", flat);
      assert(flat.n === flat.seeds && flat.maxDiff <= 2, "journey not measured flat");
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
      const r = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), fourd: document.documentElement.classList.contains("fourd"), film: !!document.querySelector("#film"), seeds: document.querySelectorAll(".seed").length, hidden: [...document.querySelectorAll("#main [data-bloom], #main [data-reveal]")].filter((e) => getComputedStyle(e).opacity === "0").length }));
      console.log("reduced motion:", r);
      assert(!r.fx && !r.fourd && !r.film && r.seeds === 0 && r.hidden === 0, "reduced-motion fallback broken");
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
      // Effets forcés : le film d'ouverture est là aussi ; on vérifie les éclosions après lui.
      await scrollTo(page, 2600 + (await page.evaluate(() => (window.MZ && MZ.cinema ? MZ.cinema.end() : 0))));
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
      const b = await page.evaluate(() => ({ fx: document.documentElement.classList.contains("fx"), fourd: document.documentElement.classList.contains("fourd"), hiddenBlooms: [...document.querySelectorAll("#main [data-bloom]")].filter((e) => getComputedStyle(e).opacity === "0").length, errors: (window.__mzErrors || []).map((x) => x.m) }));
      console.log("scroll init error:", b);
      assert(!b.fx && !b.fourd && b.hiddenBlooms === 0 && /simulated-scroll/.test(b.errors.join(" ")), "page left empty after a scroll.js init error");
    },
  },
]);
