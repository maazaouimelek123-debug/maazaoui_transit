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
  const effects = []; // fn(y) → lit la géométrie, renvoie une fonction d'écriture (ou rien)
  let dirty = true;
  let lastY = -1;
  let vh = window.innerHeight;
  const register = (fn) => effects.push(fn);
  const setVar = (el, name, value) => {
    if (el.style.getPropertyValue(name) !== value) el.style.setProperty(name, value);
  };

  /* Hero : recule et s'estompe. Épinglé (transport) → selon le défilement ;
     en flux (accueil) → selon la sortie réelle de son bord inférieur. */
  (function heroPin() {
    const hero = $(".hero, .ohero");
    if (!hero) return;
    register((y) => {
      const sticky = getComputedStyle(hero).position === "sticky";
      let hp;
      if (sticky) {
        hp = clamp(y / ((hero.offsetHeight || vh) * 0.9), 0, 1);
      } else {
        const bottom = hero.getBoundingClientRect().bottom;
        hp = clamp((vh * 0.6 - bottom) / (vh * 0.4), 0, 1);
      }
      const v = hp.toFixed(4);
      return () => {
        setVar(hero, "--hp", v);
        hero.classList.toggle("is-passed", sticky && hp >= 1);
      };
    });
  })();

  /* Progression de lecture : variable posée sur <html> (barre et rail en héritent) */
  (function progress() {
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      const v = clamp(y / max, 0, 1).toFixed(4);
      return () => setVar(html, "--scroll-p", v);
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
            setVar(c, "--sp", sps[i]);
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
      window.addEventListener("resize", () => {
        measure();
        dirty = true;
      });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { measure(); dirty = true; });
      register(() => {
        if (!extra) return null;
        const r = section.getBoundingClientRect();
        const p = clamp(-r.top / extra, 0, 1);
        const tx = `translate3d(${(-p * extra).toFixed(1)}px, 0, 0)`;
        return () => {
          if (track.style.transform !== tx) track.style.transform = tx;
          setVar(section, "--hx", p.toFixed(4));
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

  /* Teinte d'ambiance (aurore et rideau lisent les variables sur <html>) */
  (function tint() {
    const sections = $$("[data-tint]");
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
      const mix = best.toFixed(3);
      return () => {
        setVar(html, "--tint-mix", mix);
        if (rgb) setVar(html, "--tint-rgb", rgb);
      };
    });
  })();

  /* Champ persistant : la plongée s'accentue avec le défilement */
  (function fieldDepth() {
    const field = $(".depth-field");
    if (!field) return;
    const canvas = field.querySelector("canvas");
    register((y) => {
      const max = Math.max(1, html.scrollHeight - vh);
      const eased = 1 - Math.pow(1 - clamp(y / max, 0, 1), 1.7);
      const v = eased.toFixed(4);
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
      for (const it of items) {
        const h = it.el.offsetHeight || 1;
        // Origine : le centre du bloc, mais au plus 12 % de la hauteur d'écran sous son
        // bord supérieur, pour que la graine soit vue comme un point avant d'éclore.
        it.oy = Math.min(h / 2, vh * 0.12);
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

    register(() => {
      const start = vh * 0.98; // le haut du bloc entre par le bas de l'écran
      const end = vh * 0.52; // éclosion achevée quand il atteint la mi-hauteur
      const results = items.map((it) => {
        const r = it.el.getBoundingClientRect();
        if (it.floor) {
          // Le plancher ne tombe qu'une fois le bloc réellement vu (ligne de départ franchie)
          // puis dépassé vers le haut ; les images rendues avant le saut à l'ancre ne comptent pas.
          if (r.top <= start) it.floorArmed = true;
          else if (it.floorArmed) {
            it.floor = 0;
            it.floorArmed = false;
          }
        }
        const p = Math.max(it.floor, clamp((start - r.top) / (start - end), 0, 1));
        return { r, p };
      });
      return () => {
        items.forEach((it, i) => {
          const { r, p } = results[i];
          if (p === it.p) return;
          const rising = p > it.p;
          it.p = p;
          const v = p.toFixed(4);
          setVar(it.el, "--bp", v);
          it.el.classList.toggle("is-bloomed", p >= 0.999);
          setVar(it.seed, "--sp", v);
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

  /* Rail de parcours : pointillé jaune, nœuds par section, état courant exposé */
  (function rail() {
    const rail = $(".rail");
    const sections = $$("[data-rail]");
    if (!rail || !sections.length) return;
    let nodes = [];
    let active = -1;
    const build = () => {
      const en = html.lang === "en";
      rail.innerHTML = sections
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
  DESKTOP.addEventListener("change", () => {
    dirty = true;
  });

  initSmooth();
  requestAnimationFrame(frame);

  MZ.scroll = { refresh: () => { dirty = true; } };
})();
