/* =============================================================================
   SCROLL — expérience de défilement pilotée par la progression
   -----------------------------------------------------------------------------
   Une seule boucle rAF, en deux passes : chaque effet LIT d'abord la géométrie
   (getBoundingClientRect…) et renvoie une fonction d'ÉCRITURE ; toutes les
   écritures de style sont ensuite appliquées d'un bloc. Cela évite les
   recalculs de style forcés par l'entrelacement lecture/écriture.
     • défilement inertiel (molette) — désactivable : MZ.SITE.ui.smoothScroll
     • hero qui recule (épinglé sur la page transport, en flux sur l'accueil)
     • cartes empilées [data-stack], section horizontale [data-hscroll]
     • texte mot à mot [data-scrub-text], parallaxe [data-parallax]
     • teinte d'ambiance [data-tint] (variables sur <html>)
     • champ persistant .depth-field (profondeur), éclosion [data-bloom]
       depuis une graine jaune, rail de parcours [data-rail]
   Tout est désactivé si l'utilisateur préfère réduire les animations ; sans
   JavaScript, la mise en page reste la mise en page classique (html sans .fx).
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};
  const html = document.documentElement;
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const DESKTOP = window.matchMedia("(min-width: 1000px)");
  const UI = (MZ.SITE && MZ.SITE.ui) || {};
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* Mouvement : réglage système, surchargé par le choix mémorisé du visiteur (MZ.motion, core.js). */
  const MOTION = MZ.motion || { enabled: !REDUCED, systemReduced: REDUCED, pref: null, set() {} };
  const onMedia = MZ.onMedia || ((mql, fn) => (typeof mql.addEventListener === "function" ? mql.addEventListener("change", fn) : mql.addListener(fn)));

  /* Bandeau : explique l'absence d'effets quand le système réduit les animations, et
     propose de les activer (choix mémorisé) ; en sens inverse, permet de revenir au calme. */
  (function fxNotice() {
    const box = $(".fx-notice");
    if (!box) return;
    let dismissed = false;
    try { dismissed = sessionStorage.getItem("mz:fx-notice") === "1"; } catch (e) {}
    const forced = MOTION.enabled && MOTION.systemReduced;
    const reducedNow = !MOTION.enabled && UI.scrollEffects !== false;
    if (dismissed || (!forced && !reducedNow)) return;
    const text = box.querySelector("p");
    const btn = box.querySelector("[data-fx='on']");
    if (forced) {
      text.setAttribute("data-i18n", "fx.forced");
      text.textContent = "Effets activés malgré le réglage de votre appareil.";
      btn.setAttribute("data-i18n", "fx.calm");
      btn.textContent = "Revenir au mode calme";
      btn.dataset.fx = "off";
    }
    box.hidden = false;
    box.addEventListener("click", (e) => {
      const t = e.target.closest("[data-fx]");
      if (!t) return;
      if (t.dataset.fx === "dismiss") {
        try { sessionStorage.setItem("mz:fx-notice", "1"); } catch (err) {}
        box.hidden = true;
        return;
      }
      MOTION.set(t.dataset.fx === "on" ? "on" : "off");
      location.reload();
    });
  })();

  if (!MOTION.enabled || UI.scrollEffects === false) return;
  html.classList.add("fx");
  if (MOTION.systemReduced) html.classList.add("fx-forced");
  try {

  /* ------------------------------------------------- Défilement inertiel */
  function initSmooth() {
    if (!FINE || UI.smoothScroll === false) return;
    html.classList.add("smooth");
    let target = window.scrollY;
    let current = target;
    let lastWritten = target; // dernière position réellement appliquée par ce module
    let animating = false;
    const maxY = () => Math.max(0, html.scrollHeight - window.innerHeight);
    const syncExternal = () => {
      // Un défilement que nous n'avons pas produit (clavier, ascenseur, ancre,
      // script) devient la nouvelle référence : on ne lutte jamais contre lui.
      const y = window.scrollY;
      if (Math.abs(y - lastWritten) > 1) {
        current = target = y;
        lastWritten = y;
        return true;
      }
      return false;
    };

    window.addEventListener(
      "wheel",
      (e) => {
        if (e.ctrlKey || document.body.classList.contains("is-locked")) return;
        if (e.target && e.target.closest && e.target.closest("[data-native-scroll], textarea, select")) return;
        e.preventDefault();
        syncExternal();
        let d = e.deltaY;
        if (e.deltaMode === 1) d *= 16;
        else if (e.deltaMode === 2) d *= window.innerHeight;
        target = clamp(target + d, 0, maxY());
        if (!animating) {
          animating = true;
          requestAnimationFrame(step);
        }
      },
      { passive: false }
    );

    window.addEventListener("scroll", syncExternal, { passive: true });

    function step() {
      if (syncExternal()) {
        animating = false;
        return;
      }
      current = lerp(current, target, 0.11);
      if (Math.abs(target - current) < 0.4) {
        current = target;
        animating = false;
      }
      window.scrollTo({ top: current, behavior: "instant" });
      lastWritten = window.scrollY; // valeur arrondie par le navigateur
      if (animating) requestAnimationFrame(step);
    }
  }

  /* ------------------------------------------------------- Registre d'effets */
  const effects = []; // fn(y) → lit la géométrie, renvoie une fonction d'écriture (ou rien)
  let dirty = true;
  let lastY = -1;
  let vh = window.innerHeight;
  const register = (fn) => effects.push(fn);
  const setVar = (el, name, value) => {
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  };

  /* Hero : recule et s'estompe. Épinglé (transport) → selon le défilement ;
     en flux (accueil) → selon la sortie du dernier bloc (.hero-stats) par le haut.
     Les styles sont écrits directement sur les éléments concernés : une variable
     CSS posée sur un conteneur forcerait le recalcul de style de tout son sous-arbre. */
  (function heroPin() {
    const hero = $(".hero, .ohero");
    if (!hero) return;
    const container = hero.querySelector(":scope > .container");
    const fades = [hero.querySelector(".hero-canvas, .ohero-canvas"), hero.querySelector(".hero-year")].filter(Boolean);
    const foot = hero.querySelector(".ohero-foot");
    const ref = hero.querySelector(".hero-stats");
    let last = -1;
    register((y) => {
      const sticky = getComputedStyle(hero).position === "sticky";
      let hp;
      if (sticky) {
        hp = clamp(y / ((hero.offsetHeight || vh) * 0.9), 0, 1);
      } else if (ref) {
        // Référence de mise en page (non transformée) : on cumule les offsets jusqu'au .hero
        // (le conteneur intermédiaire, doté de will-change, est offsetParent sous Chromium).
        let t = 0;
        for (let el = ref; el && el !== hero; el = el.offsetParent) t += el.offsetTop;
        const top = hero.getBoundingClientRect().top + t;
        hp = clamp(-top / Math.max(ref.offsetHeight, vh * 0.3), 0, 1);
      } else {
        hp = clamp(-hero.getBoundingClientRect().bottom / (vh * 0.3) + 1, 0, 1);
      }
      hp = Math.round(hp * 1000) / 1000;
      if (hp === last) return null;
      last = hp;
      const shift = sticky ? -90 : -64;
      const shrink = sticky ? 0.07 : 0.1;
      const fade = sticky ? 1.25 : 1;
      return () => {
        if (container) {
          container.style.transform = `translate3d(0, ${(hp * shift).toFixed(1)}px, 0) scale(${(1 - hp * shrink).toFixed(4)})`;
          container.style.opacity = clamp(1 - hp * fade, 0, 1).toFixed(3);
        }
        if (foot) {
          foot.style.transform = `translate3d(0, ${(hp * shift).toFixed(1)}px, 0)`;
          foot.style.opacity = clamp(1 - hp * fade, 0, 1).toFixed(3);
        }
        for (const el of fades) el.style.opacity = (0.9 * (1 - hp)).toFixed(3);
        hero.classList.toggle("is-passed", sticky && hp >= 1);
      };
    });
  })();

  /* Progression de lecture : écrite sur ses seuls consommateurs (barre, rail) */
  (function progress() {
    const bar = $(".scroll-progress");
    let last = "";
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      const v = clamp(y / max, 0, 1).toFixed(4);
      if (v === last) return null;
      last = v;
      return () => {
        if (bar) bar.style.transform = `scaleX(${v})`;
        const fill = $(".rail > .rail-fill"); // élément sans descendant : transform inline uniquement
        if (fill) fill.style.transform = `scaleY(${v})`;
      };
    });
  })();

  /* Cartes empilées */
  (function stacks() {
    for (const stack of $$("[data-stack]")) {
      const cards = Array.from(stack.children).filter((c) => c.classList.contains("step"));
      cards.forEach((c, i) => c.style.setProperty("--i", i));
      register(() => {
        const rects = cards.map((c) => c.getBoundingClientRect());
        const sps = [];
        let active = -1;
        for (let i = 0; i < cards.length; i++) {
          const a = rects[i];
          sps[i] = i < cards.length - 1 ? clamp(1 - (rects[i + 1].top - a.top) / Math.max(1, a.height), 0, 1).toFixed(4) : "0";
          if (a.top < vh * 0.6) active = i;
        }
        return () => {
          cards.forEach((c, i) => {
            const sp = Number(sps[i]);
            const t = `scale(${(1 - sp * 0.06).toFixed(4)})`;
            const f = `brightness(${(1 - sp * 0.45).toFixed(3)})`;
            if (c.style.transform !== t) c.style.transform = t;
            if (c.style.filter !== f) c.style.filter = f;
            c.classList.toggle("is-active", i === active);
          });
        };
      });
    }
  })();

  /* Section horizontale épinglée */
  (function hscroll() {
    for (const section of $$("[data-hscroll]")) {
      const sticky = $(".hscroll-sticky", section);
      const track = $(".hscroll-track", section);
      if (!sticky || !track) continue;
      let extra = 0;
      const measure = () => {
        if (!DESKTOP.matches) {
          extra = 0;
          section.style.removeProperty("height");
          track.style.removeProperty("transform");
          return;
        }
        extra = Math.max(0, track.scrollWidth - sticky.clientWidth);
        section.style.height = `${sticky.offsetHeight + extra}px`;
      };
      measure();
      let tm = 0;
      window.addEventListener("resize", () => {
        clearTimeout(tm);
        tm = setTimeout(() => {
          measure();
          dirty = true;
        }, 60);
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); dirty = true; });
      register(() => {
        if (!extra) return null;
        const r = section.getBoundingClientRect();
        const p = clamp(-r.top / extra, 0, 1);
        const tx = `translate3d(${(-p * extra).toFixed(1)}px, 0, 0)`;
        return () => {
          if (track.style.transform !== tx) track.style.transform = tx;
        };
      });
    }
  })();

  /* Texte qui s'allume mot à mot */
  (function scrubText() {
    const split = (el) => {
      if (el.dataset.scrubReady) return $$(".sw", el);
      const words = el.textContent.trim().split(/\s+/);
      el.textContent = "";
      const frag = document.createDocumentFragment();
      words.forEach((w, i) => {
        const s = document.createElement("span");
        s.className = "sw";
        s.textContent = w;
        frag.appendChild(s);
        if (i < words.length - 1) frag.appendChild(document.createTextNode(" "));
      });
      el.appendChild(frag);
      el.dataset.scrubReady = "1";
      return $$(".sw", el);
    };
    const items = $$("[data-scrub-text]").map((el) => ({ el, words: split(el), count: -1 }));
    if (!items.length) return;
    document.addEventListener("mz:lang", () => {
      for (const it of items) {
        delete it.el.dataset.scrubReady;
        it.words = split(it.el);
        it.count = -1;
      }
      dirty = true;
    });
    register(() => {
      const counts = items.map((it) => {
        const r = it.el.getBoundingClientRect();
        const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.22), 0, 1);
        return Math.round(p * it.words.length);
      });
      return () => {
        items.forEach((it, idx) => {
          const count = counts[idx];
          if (count === it.count) return;
          it.count = count;
          it.words.forEach((w, i) => w.classList.toggle("on", i < count));
        });
      };
    });
  })();

  /* Parallaxe */
  (function parallax() {
    const items = $$("[data-parallax]").map((el) => ({ el, speed: Number(el.dataset.parallax) || 0.15 }));
    if (!items.length) return;
    register(() => {
      const offs = items.map((it) => {
        const r = it.el.getBoundingClientRect();
        return ((r.top + r.height / 2 - vh / 2) * it.speed).toFixed(1);
      });
      return () => {
        items.forEach((it, i) => {
          const t = `translate3d(0, ${offs[i]}px, 0)`;
          if (it.el.style.transform !== t) it.el.style.transform = t;
        });
      };
    });
  })();

  /* Teinte d'ambiance : écrite sur le voile dédié .tint-veil (un élément, aucun descendant) */
  (function tint() {
    const sections = $$("[data-tint]");
    const veil = $(".tint-veil");
    if (!sections.length || !veil) return;
    let lastMix = "";
    let lastRgb = "";
    register(() => {
      let best = 0;
      let rgb = null;
      for (const s of sections) {
        const r = s.getBoundingClientRect();
        const center = r.top + r.height / 2;
        const m = clamp(1 - Math.abs(center - vh / 2) / (vh * 0.95), 0, 1);
        if (m > best) {
          best = m;
          rgb = s.dataset.tint;
        }
      }
      const mix = best.toFixed(3);
      if (mix === lastMix && rgb === lastRgb) return null;
      lastMix = mix;
      lastRgb = rgb;
      return () => {
        veil.style.opacity = mix;
        if (rgb) veil.style.setProperty("--tint-rgb", rgb);
      };
    });
  })();

  /* Champ persistant : la plongée s'accentue avec le défilement */
  (function fieldDepth() {
    const field = $(".depth-field");
    if (!field) return;
    const canvas = field.querySelector("canvas");
    let last = "";
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      const eased = 1 - Math.pow(1 - clamp(y / max, 0, 1), 1.7);
      const v = eased.toFixed(2); // pas de 1 % : imperceptible, et bien moins de recompositions
      if (v === last) return null;
      last = v;
      return () => {
        setVar(field, "--depth", v);
        if (canvas && canvas.__flow) canvas.__flow.setDepth(eased);
      };
    });
  })();

  /* Éclosion : chaque bloc [data-bloom] naît d'un point jaune et grandit vers le lecteur */
  (function bloom() {
    const items = $$("[data-bloom]").map((el) => {
      const parent = el.parentElement;
      if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
      const seed = document.createElement("i");
      seed.className = "seed";
      seed.setAttribute("aria-hidden", "true");
      parent.insertBefore(seed, el);
      return { el, seed, burst: false, p: -1, oy: 0, floor: 0, floorArmed: false, section: el.closest("section") };
    });
    if (!items.length) return;

    const place = () => {
      vh = window.innerHeight; // l'écouteur global peut ne pas encore avoir tourné
      // Toutes les lectures d'abord, puis toutes les écritures (pas de mise en page forcée par graine).
      const reads = items.map((it) => ({ h: it.el.offsetHeight || 1, top: it.el.offsetTop, left: it.el.offsetLeft, w: it.el.offsetWidth }));
      items.forEach((it, i) => {
        const { h, top, left, w } = reads[i];
        // Origine : le centre du bloc, mais au plus 12 % de la hauteur d'écran sous son
        // bord supérieur, pour que la graine soit vue comme un point avant d'éclore.
        it.oy = Math.min(h / 2, vh * 0.12);
        it.el.style.setProperty("--oy", `${((it.oy / h) * 100).toFixed(2)}%`);
        it.seed.style.top = `${top + it.oy}px`;
        it.seed.style.left = `${left + w / 2}px`;
      });
      dirty = true;
    };
    place();
    let ptm = 0;
    window.addEventListener("resize", () => {
      // Une seule passe de placement à la fin d'un redimensionnement, pas une par événement.
      clearTimeout(ptm);
      ptm = setTimeout(place, 60);
    });
    window.addEventListener("load", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    document.addEventListener("mz:lang", () => setTimeout(place, 50));

    // Arrivée par ancre : les blocs de la section visée sont considérés éclos
    // (le lecteur est déjà « dans » la section), jusqu'à ce qu'il remonte au-dessus.
    const forceHash = () => {
      const id = decodeURIComponent((location.hash || "").slice(1));
      if (!id) return;
      const target = document.getElementById(id);
      if (!target) return;
      for (const it of items) {
        if (target === it.el || target.contains(it.el) || (it.section && it.section === target)) it.floor = 1;
      }
      dirty = true;
    };
    forceHash();
    window.addEventListener("hashchange", forceHash);
    window.addEventListener("load", forceHash);

    const flow = () => {
      const c = $(".depth-field canvas");
      return c && c.__flow;
    };

    const mobile = window.matchMedia("(max-width: 760px)");
    register(() => {
      const start = vh * 0.98; // le haut du bloc entre par le bas de l'écran
      const end = vh * 0.52; // éclosion achevée quand il atteint la mi-hauteur
      // Plancher d'ancre : levé par section, une fois la section vue puis repassée sous l'écran.
      const sectionTops = new Map();
      for (const it of items) {
        if (it.floor && it.section && !sectionTops.has(it.section)) sectionTops.set(it.section, it.section.getBoundingClientRect().top);
      }
      const results = items.map((it) => {
        const r = it.el.getBoundingClientRect();
        if (it.floor && it.section) {
          const st = sectionTops.get(it.section);
          if (st <= start) it.floorArmed = true;
          else if (it.floorArmed) {
            it.floor = 0;
            it.floorArmed = false;
          }
        }
        const p = Math.max(it.floor, clamp((start - r.top) / (start - end), 0, 1));
        return { r, p: Math.round(p * 1000) / 1000 };
      });
      const small = mobile.matches;
      return () => {
        items.forEach((it, i) => {
          const { r, p } = results[i];
          if (p === it.p) return;
          const rising = p > it.p;
          it.p = p;
          const el = it.el;
          if (p >= 0.999) {
            // Éclos : on rend la main à la feuille de style (survol, sticky, etc.)
            el.style.transform = "";
            el.style.opacity = "";
            el.style.clipPath = "";
            el.classList.add("is-bloomed");
          } else {
            const q = 1 - p;
            const dz = small ? -320 : -720;
            const dy = small ? 28 : 48;
            const sc = small ? 0.72 + p * 0.28 : 0.6 + p * 0.4;
            el.classList.remove("is-bloomed");
            el.style.transform = `perspective(${small ? 900 : 1400}px) translate3d(0, ${(q * dy).toFixed(1)}px, ${(q * dz).toFixed(1)}px) scale(${sc.toFixed(4)})`;
            el.style.opacity = Math.min(1, p * 1.15).toFixed(3);
            el.style.clipPath = `circle(${(p * 125).toFixed(1)}% at 50% ${el.style.getPropertyValue("--oy") || "50%"})`;
          }
          setVar(it.seed, "--sp", p.toFixed(3));
          it.seed.classList.toggle("is-done", p >= 0.999);
          if (rising && !it.burst && p > 0.28 && p < 0.999) {
            it.burst = true;
            const f = flow();
            if (f) f.burst(r.left + r.width / 2, clamp(r.top + (it.oy || r.height / 2), vh * 0.12, vh * 0.9), 36);
          }
          if (p < 0.04) it.burst = false;
        });
      };
    });
  })();

  /* Chemin pointillé : relie les points d'éclosion à travers la page et s'illumine au passage */
  (function journey() {
    const svg = $(".journey");
    const curtain = $(".curtain");
    if (!svg || !curtain) return;
    const dots = svg.querySelector(".journey-dots");
    if (!dots) return;
    const NS = "http://www.w3.org/2000/svg";
    // La partie allumée est découpée en un tracé par segment (graine → graine). Seul le
    // segment en cours est rogné à chaque image : la zone repeinte reste bornée à la hauteur
    // d'un segment au lieu de tout le chemin (sur l'accueil : 3 300 px de haut).
    // Le rognage est un <clipPath> SVG (rectangle en pixels) : aucune ambiguïté de boîte de
    // référence, même pour un segment vertical dont la boîte englobante a une largeur nulle.
    let clipRect = svg.querySelector(".journey-clip rect");
    if (!clipRect) {
      const defs = document.createElementNS(NS, "defs");
      const cp = document.createElementNS(NS, "clipPath");
      cp.setAttribute("id", "journey-clip");
      cp.setAttribute("class", "journey-clip");
      clipRect = document.createElementNS(NS, "rect");
      clipRect.setAttribute("x", "0");
      clipRect.setAttribute("y", "0");
      clipRect.setAttribute("width", "100%");
      clipRect.setAttribute("height", "0");
      cp.appendChild(clipRect);
      defs.appendChild(cp);
      svg.insertBefore(defs, svg.firstChild);
    }
    const HIDDEN = 0;
    const ACTIVE = 1;
    const DONE = 2;
    let segs = []; // { el, y0, y1, state } — y en coordonnées du document
    let base = 0; // haut du rideau dans le document (= origine du SVG)
    let lastH = -1;
    let tm = 0;
    const apply = (seg, state) => {
      seg.state = state;
      seg.el.style.visibility = state === HIDDEN ? "hidden" : "visible";
      seg.el.style.clipPath = state === ACTIVE ? "url(#journey-clip)" : "none";
    };
    const build = () => {
      const seeds = $$(".seed", curtain);
      if (seeds.length < 2) return;
      base = curtain.getBoundingClientRect().top + window.scrollY;
      const pts = seeds.map((el) => {
        const r = el.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 + window.scrollY - base };
      });
      pts.sort((p1, p2) => p1.y - p2.y);
      const f = (n) => n.toFixed(1);
      const cubic = (p0, p1, p2, p3) => `M ${f(p0.x)} ${f(p0.y)} C ${f(p1.x)} ${f(p1.y)}, ${f(p2.x)} ${f(p2.y)}, ${f(p3.x)} ${f(p3.y)}`;
      const mid = (p, q) => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
      // Un segment plus haut qu'environ un écran est coupé en deux (de Casteljau, t = ½) :
      // la zone repeinte à chaque image reste bornée, même entre deux blocs éloignés.
      const split = (p0, p1, p2, p3, out, depthLeft) => {
        if (depthLeft > 0 && p3.y - p0.y > vh * 1.1) {
          const p01 = mid(p0, p1);
          const p12 = mid(p1, p2);
          const p23 = mid(p2, p3);
          const p012 = mid(p01, p12);
          const p123 = mid(p12, p23);
          const m = mid(p012, p123);
          split(p0, p01, p012, m, out, depthLeft - 1);
          split(m, p123, p23, p3, out, depthLeft - 1);
        } else {
          out.push({ d: cubic(p0, p1, p2, p3), y0: p0.y + base, y1: p3.y + base });
        }
      };
      let d = `M ${f(pts[0].x)} ${f(pts[0].y)}`;
      const parts = [];
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        const dy = (b.y - a.y) / 2;
        // Tangentes verticales : les blocs se relient par de douces courbes en S.
        const c1 = { x: a.x, y: a.y + dy };
        const c2 = { x: b.x, y: b.y - dy };
        d += ` C ${f(c1.x)} ${f(c1.y)}, ${f(c2.x)} ${f(c2.y)}, ${f(b.x)} ${f(b.y)}`;
        split(a, c1, c2, b, parts, 3);
      }
      dots.setAttribute("d", d);
      $$(".journey-done", svg).forEach((el) => el.remove());
      let cum = 0; // longueur cumulée : chaque morceau reprend la phase des pointillés (période 11)
      segs = parts.map((pt) => {
        const el = document.createElementNS(NS, "path");
        el.setAttribute("class", "journey-done");
        el.setAttribute("d", pt.d);
        el.setAttribute("stroke-dashoffset", f(-(cum % 11)));
        svg.appendChild(el);
        cum += el.getTotalLength();
        const seg = { el, y0: pt.y0, y1: pt.y1, state: -1 };
        apply(seg, HIDDEN);
        return seg;
      });
      svg.style.height = `${curtain.offsetHeight}px`;
      lastH = -1;
      dirty = true;
    };
    // Après le placement des graines (mêmes événements, un peu plus tard) ; un seul build par rafale.
    const later = (ms) => {
      clearTimeout(tm);
      tm = setTimeout(build, ms || 80);
    };
    later();
    window.addEventListener("resize", () => later());
    window.addEventListener("load", () => later());
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => later());
    document.addEventListener("mz:lang", () => later(160));
    register((y) => {
      if (!segs.length) return null;
      const edge = y + vh * 0.5; // le chemin s'allume jusqu'au milieu de l'écran
      const changes = [];
      for (const seg of segs) {
        const state = edge >= seg.y1 ? DONE : edge <= seg.y0 ? HIDDEN : ACTIVE;
        if (state !== seg.state) changes.push([seg, state]);
      }
      // Hauteur du rectangle de rognage (pixels SVG = pixels CSS), par pas de 4 px.
      const hClip = Math.round(clamp(edge - base, 0, 1e7) / 4) * 4;
      if (!changes.length && hClip === lastH) return null;
      const writeH = hClip !== lastH;
      lastH = hClip;
      return () => {
        for (const [seg, state] of changes) apply(seg, state);
        if (writeH) clipRect.setAttribute("height", String(hClip));
      };
    });
  })();

  /* Rail de parcours : pointillé jaune, nœuds par section, état courant exposé */
  (function rail() {
    const rail = $(".rail");
    const sections = $$("[data-rail]");
    if (!rail || !sections.length) return;
    let nodes = [];
    let active = -1;
    const build = () => {
      const en = html.lang === "en";
      rail.innerHTML =
        '<i class="rail-fill" aria-hidden="true"></i>' +
        sections
          .map((s, i) => {
            const label = (en && s.dataset.railEn) || s.dataset.rail;
            return `<a class="rail-node" href="#${s.id}" style="--i:${i}" aria-label="${label}"><span aria-hidden="true">${label}</span></a>`;
          })
          .join("");
      nodes = $$(".rail-node", rail);
      active = -1;
      dirty = true;
    };
    build();
    document.addEventListener("mz:lang", build);
    register(() => {
      let next = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top < vh * 0.5) next = i;
      });
      return () => {
        if (next === active) return;
        active = next;
        nodes.forEach((n, i) => {
          n.classList.toggle("is-active", i === active);
          if (i === active) n.setAttribute("aria-current", "true");
          else n.removeAttribute("aria-current");
        });
      };
    });
  })();

  /* ------------------------------------------------------------- Boucle */
  function frame() {
    const y = window.scrollY;
    if (y !== lastY || dirty) {
      lastY = y;
      dirty = false;
      const writes = [];
      for (const fn of effects) {
        const w = fn(y); // phase lecture
        if (typeof w === "function") writes.push(w);
      }
      for (const w of writes) w(); // phase écriture
    }
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", () => {
    vh = window.innerHeight;
    dirty = true;
  });
  window.addEventListener("load", () => {
    dirty = true;
  });
  onMedia(DESKTOP, () => {
    dirty = true;
  });

  initSmooth();
  requestAnimationFrame(frame);

  /* Mode allégé : si l'appareil peine (moins de ~22 images/s mesurées au repos après le
     chargement), on retire les couches les plus coûteuses (grain en fusion, flou lourd). */
  (function lite() {
    if (UI.lite === false) return;
    const measure = () => {
      if (document.hidden) return;
      let n = 0;
      let last = performance.now();
      const deltas = [];
      const tick = (now) => {
        deltas.push(now - last);
        last = now;
        if (++n < 40) return requestAnimationFrame(tick);
        deltas.sort((a, b) => a - b);
        const median = deltas[Math.floor(deltas.length / 2)];
        if (median > 45) html.classList.add("lite");
      };
      requestAnimationFrame(tick);
    };
    if (document.readyState === "complete") setTimeout(measure, 1500);
    else window.addEventListener("load", () => setTimeout(measure, 1500));
  })();

  MZ.scroll = { refresh: () => { dirty = true; } };
  } catch (e) {
    // Une erreur d'initialisation ne doit jamais laisser la page vide : on retire les effets.
    html.classList.remove("fx", "fx-forced", "smooth");
    if (window.console) console.error("[MZ] scroll", e);
    if (window.__mzErrors) window.__mzErrors.push({ m: "scroll: " + (e && e.message), s: "scroll.js", l: 0 });
  }
})();
