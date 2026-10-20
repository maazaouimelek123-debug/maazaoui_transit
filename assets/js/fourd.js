/* =============================================================================
   4D — le contenu en volume, après le film (cinema.js)
   -----------------------------------------------------------------------------
   Chaque section ([data-rail], hors hero, film et section horizontale) est un
   plan dans l'espace : elle s'incline selon la vitesse de défilement et repart
   dans la profondeur, vers le point de fuite, en sortant par le haut. Le hero
   bascule en arrière et les blocs éclosent inclinés (scroll.js, sous html.fourd).
   Actif sous html.fourd (posé par scroll.js avec html.fx), désactivable :
   MZ.SITE.ui.fourD = false. Toute erreur retire la classe : la page reste
   celle de la plongée classique.
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};
  const html = document.documentElement;
  if (!html.classList.contains("fourd")) return;

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (t) => t * t * (3 - 2 * t);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /** Position dans le document, hors transformations (chaîne des offsetTop). */
  const docTop = (el) => {
    let t = 0;
    for (let e = el; e; e = e.offsetParent) t += e.offsetTop;
    return t;
  };

  /** Mesure « à plat » : les plans 4D sont neutralisés le temps de la lecture. */
  function neutral(fn) {
    html.classList.add("fourd-measure");
    try {
      return fn();
    } finally {
      html.classList.remove("fourd-measure");
    }
  }

  try {
    const SMALL = window.matchMedia("(max-width: 760px)");
    let vh = window.innerHeight;

    const items = $$("[data-rail]")
      .filter((s) => !s.matches(".hero, .ohero, .cinema, [data-hscroll]"))
      .map((s) => {
        s.classList.add("fourd-plane");
        return { s, top: 0, h: 0, key: "" };
      });

    if (items.length && MZ.scroll && MZ.scroll.register) {
      const measure = () => {
        vh = window.innerHeight;
        for (const it of items) {
          it.top = docTop(it.s);
          it.h = it.s.offsetHeight;
        }
        MZ.scroll.refresh();
      };
      measure();
      let tm = 0;
      const later = () => {
        clearTimeout(tm);
        tm = setTimeout(measure, 100);
      };
      window.addEventListener("resize", later);
      window.addEventListener("load", later);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
      document.addEventListener("mz:lang", later);
      try {
        // La hauteur des sections peut changer sans redimensionnement (carte, contenu dynamique, film retiré).
        if ("ResizeObserver" in window) new ResizeObserver(later).observe(document.body);
      } catch (e) {
        /* navigateur ancien : les événements ci-dessus suffisent */
      }

      let tilt = 0;
      let lastY = window.scrollY;
      let lastT = performance.now();
      MZ.scroll.register((y) => {
        const now = performance.now();
        const dt = clamp(now - lastT, 1, 100);
        const v = ((y - lastY) / dt) * 16.667; // px par image (60 i/s)
        lastY = y;
        lastT = now;
        const small = SMALL.matches;
        const target = clamp(v * (small ? 0.06 : 0.07), small ? -3 : -4.5, small ? 3 : 4.5);
        tilt += (target - tilt) * (1 - Math.pow(0.84, dt / 16.667)); // amorti indépendant de la cadence
        if (Math.abs(tilt) < 0.02 && Math.abs(target) < 0.02) tilt = 0;
        const out = items.map((it) => {
          const top = it.top - y;
          const bottom = top + it.h;
          if (bottom <= 0 || top >= vh) return { it, key: "" };
          // Sortie par le haut : le bas de la section passe au-dessus de 42 % de l'écran.
          const e = smooth(clamp((vh * 0.42 - bottom) / (vh * 0.42), 0, 1));
          const ang = tilt + e * 24;
          const z = -e * 170 - Math.abs(tilt) * 8;
          if (Math.abs(ang) < 0.01 && Math.abs(z) < 0.1) return { it, key: "" };
          const origin = `50% ${(vh / 2 - top).toFixed(0)}px`;
          const transform = `perspective(1300px) translate3d(0, 0, ${z.toFixed(1)}px) rotateX(${ang.toFixed(2)}deg)`;
          const opacity = e > 0 ? (1 - e * 0.8).toFixed(3) : "";
          return { it, key: transform + origin + opacity, transform, origin, opacity };
        });
        return () => {
          for (const o of out) {
            if (o.key === o.it.key) continue;
            o.it.key = o.key;
            const st = o.it.s.style;
            st.transform = o.transform || "";
            st.transformOrigin = o.origin || "";
            st.opacity = o.opacity || "";
          }
          if (tilt !== 0) MZ.scroll.refresh(); // l'inclinaison retombe en douceur après l'arrêt
        };
      });
    }

    MZ.fourd = { neutral, planes: items.length };
  } catch (e) {
    // Une erreur ne doit jamais casser la page : on retire la couche 4D, la plongée reste.
    html.classList.remove("fourd");
    for (const s of $$(".fourd-plane")) {
      s.style.transform = "";
      s.style.transformOrigin = "";
      s.style.opacity = "";
    }
    if (window.console) console.error("[MZ] fourd", e);
    if (window.__mzErrors) window.__mzErrors.push({ m: "fourd: " + (e && e.message), s: "fourd.js", l: 0 });
  }
})();
