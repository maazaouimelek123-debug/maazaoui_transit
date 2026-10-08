/* =============================================================================
   SCROLL — expérience de défilement pilotée par la progression
   -----------------------------------------------------------------------------
   Un seul rAF lit la position de défilement et met à jour des variables CSS :
     • défilement inertiel (molette) — désactivable : MZ.SITE.ui.smoothScroll
     • hero épinglé qui recule et s'estompe sous le « rideau » des sections
     • cartes empilées [data-stack] (chaque carte glisse sur la précédente)
     • section horizontale épinglée [data-hscroll] (bureau uniquement)
     • texte qui s'allume mot à mot [data-scrub-text]
     • parallaxe légère [data-parallax="0.15"]
     • teinte d'ambiance [data-tint="r g b"] appliquée au rideau
     • barre de progression de lecture
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

  if (REDUCED || UI.scrollEffects === false) return;
  html.classList.add("fx");

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
  const effects = [];
  let dirty = true;
  let lastY = -1;
  let vh = window.innerHeight;

  function register(fn) {
    effects.push(fn);
  }

  /* Hero épinglé */
  (function heroPin() {
    const hero = $(".hero, .ohero");
    if (!hero) return;
    register((y) => {
      const h = hero.offsetHeight || vh;
      const hp = clamp(y / (h * 0.9), 0, 1);
      hero.style.setProperty("--hp", hp.toFixed(4));
      hero.classList.toggle("is-passed", hp >= 1);
    });
  })();

  /* Barre de progression */
  (function progressBar() {
    const bar = $(".scroll-progress");
    if (!bar) return;
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      bar.style.setProperty("--scroll-p", clamp(y / max, 0, 1).toFixed(4));
    });
  })();

  /* Cartes empilées */
  (function stacks() {
    for (const stack of $$("[data-stack]")) {
      const cards = Array.from(stack.children).filter((c) => c.classList.contains("step"));
      cards.forEach((c, i) => c.style.setProperty("--i", i));
      register(() => {
        let active = -1;
        for (let i = 0; i < cards.length; i++) {
          const a = cards[i].getBoundingClientRect();
          if (i < cards.length - 1) {
            const b = cards[i + 1].getBoundingClientRect();
            const sp = clamp(1 - (b.top - a.top) / Math.max(1, a.height), 0, 1);
            cards[i].style.setProperty("--sp", sp.toFixed(4));
          } else {
            cards[i].style.setProperty("--sp", "0");
          }
          if (a.top < vh * 0.6) active = i;
        }
        cards.forEach((c, i) => c.classList.toggle("is-active", i === active));
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
      window.addEventListener("resize", () => {
        measure();
        dirty = true;
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); dirty = true; });
      register(() => {
        if (!extra) return;
        const r = section.getBoundingClientRect();
        const p = clamp(-r.top / extra, 0, 1);
        track.style.transform = `translate3d(${(-p * extra).toFixed(1)}px, 0, 0)`;
        section.style.setProperty("--hx", p.toFixed(4));
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
    // Après un changement de langue, le contenu est remplacé : on redécoupe.
    document.addEventListener("mz:lang", () => {
      for (const it of items) {
        delete it.el.dataset.scrubReady;
        it.words = split(it.el);
        it.count = -1;
      }
      dirty = true;
    });
    register(() => {
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        const p = clamp((vh * 0.82 - r.top) / (r.height + vh * 0.22), 0, 1);
        const count = Math.round(p * it.words.length);
        if (count === it.count) continue;
        it.count = count;
        it.words.forEach((w, i) => w.classList.toggle("on", i < count));
      }
    });
  })();

  /* Parallaxe */
  (function parallax() {
    const items = $$("[data-parallax]").map((el) => ({ el, speed: Number(el.dataset.parallax) || 0.15 }));
    if (!items.length) return;
    register(() => {
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        const off = (r.top + r.height / 2 - vh / 2) * it.speed;
        it.el.style.transform = `translate3d(0, ${off.toFixed(1)}px, 0)`;
      }
    });
  })();

  /* Teinte d'ambiance du rideau */
  (function tint() {
    const sections = $$("[data-tint]");
    const curtain = html;
    if (!sections.length) return;
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
      curtain.style.setProperty("--tint-mix", best.toFixed(3));
      if (rgb) curtain.style.setProperty("--tint-rgb", rgb);
    });
  })();

  /* Champ persistant : la plongée s'accentue avec le défilement */
  (function fieldDepth() {
    const field = $(".depth-field");
    if (!field) return;
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      const d = clamp(y / max, 0, 1);
      const eased = 1 - Math.pow(1 - d, 1.7);
      field.style.setProperty("--depth", eased.toFixed(4));
      const c = field.querySelector("canvas");
      if (c && c.__flow) c.__flow.setDepth(eased);
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
      return { el, seed, burst: false, p: -1 };
    });
    if (!items.length) return;
    const place = () => {
      for (const it of items) {
        const h = it.el.offsetHeight || 1;
        // Origine : le centre du bloc, mais jamais plus bas que 35 % de la hauteur d'écran
        // sous son bord supérieur, pour rester visible au moment de l'éclosion.
        it.oy = Math.min(h / 2, vh * 0.35);
        it.el.style.setProperty("--oy", `${((it.oy / h) * 100).toFixed(2)}%`);
        it.seed.style.top = `${it.el.offsetTop + it.oy}px`;
        it.seed.style.left = `${it.el.offsetLeft + it.el.offsetWidth / 2}px`;
      }
      dirty = true;
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("load", place);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
    document.addEventListener("mz:lang", () => setTimeout(place, 50));
    const flow = () => {
      const c = $(".depth-field canvas");
      return c && c.__flow;
    };
    register(() => {
      for (const it of items) {
        const r = it.el.getBoundingClientRect();
        const start = vh * 0.98; // le haut du bloc entre par le bas de l'écran
        const end = vh * 0.52; // éclosion achevée quand il atteint la mi-hauteur
        const p = clamp((start - r.top) / (start - end), 0, 1);
        if (p === it.p) continue;
        const rising = p > it.p;
        it.p = p;
        it.el.style.setProperty("--bp", p.toFixed(4));
        it.el.classList.toggle("is-bloomed", p >= 0.999);
        it.seed.style.setProperty("--sp", p.toFixed(4));
        if (rising && !it.burst && p > 0.28) {
          it.burst = true;
          const f = flow();
          if (f) f.burst(r.left + r.width / 2, clamp(r.top + (it.oy || r.height / 2), vh * 0.12, vh * 0.9), 36);
        }
        if (p < 0.04) it.burst = false;
      }
    });
  })();

  /* Rail de parcours : pointillé jaune et nœuds par section */
  (function rail() {
    const rail = $(".rail");
    const sections = $$("[data-rail]");
    if (!rail || !sections.length) return;
    let nodes = [];
    const build = () => {
      const en = html.lang === "en";
      rail.innerHTML = sections
        .map((s, i) => `<a class="rail-node" href="#${s.id}" style="--i:${i}"><span>${(en && s.dataset.railEn) || s.dataset.rail}</span></a>`)
        .join("");
      nodes = $$(".rail-node", rail);
      dirty = true;
    };
    build();
    document.addEventListener("mz:lang", build);
    register(() => {
      let active = 0;
      sections.forEach((s, i) => {
        if (s.getBoundingClientRect().top < vh * 0.5) active = i;
      });
      nodes.forEach((n, i) => n.classList.toggle("is-active", i === active));
    });
  })();

  /* ------------------------------------------------------------- Boucle */
  function frame() {
    const y = window.scrollY;
    if (y !== lastY || dirty) {
      lastY = y;
      dirty = false;
      for (const fn of effects) fn(y);
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
  DESKTOP.addEventListener("change", () => {
    dirty = true;
  });

  initSmooth();
  requestAnimationFrame(frame);

  MZ.scroll = { refresh: () => { dirty = true; } };
})();
