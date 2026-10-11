/* =============================================================================
   4D — l'espace en profondeur, piloté par le défilement
   -----------------------------------------------------------------------------
   Trois dimensions d'espace, et le défilement comme quatrième (le temps du
   parcours) :
     • espace .space : champ d'étoiles en vraie perspective. La caméra avance
       quand on défile et dérive doucement au repos ; défiler vite étire les
       étoiles en traînées. Une porte dorée par section ([data-rail]) se
       traverse à l'arrivée de la section ; la caméra vole d'une porte à
       l'autre, s'incline dans les virages et suit le pointeur (regard)
     • contenu en volume : chaque section s'incline selon la vitesse de
       défilement et repart dans la profondeur en sortant par le haut
     • relevé 4D (x, y, z, t) discret en bas à gauche (bureau)
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
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const $ = (s, r) => (r || document).querySelector(s);
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

  const rgbOf = (value, fallback) => {
    const v = String(value || "").trim();
    let m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(v);
    if (m) return [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)].join(", ");
    m = /^(\d+)\s*,\s*(\d+)\s*,\s*(\d+)$/.exec(v);
    return m ? `${m[1]}, ${m[2]}, ${m[3]}` : fallback;
  };

  try {
    const FINE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const SMALL = window.matchMedia("(max-width: 760px)");
    let vh = window.innerHeight;

    /* Sections : une porte chacune dans l'espace, un plan incliné dans la page. */
    const rails = $$("[data-rail]");
    const sections = rails.filter((s) => !s.matches(".hero, .ohero"));
    const label = (s) => (html.lang === "en" && s.dataset.railEn) || s.dataset.rail || "";

    /* ------------------------------------------------------------- Regard */
    const look = { x: 0, y: 0, ax: 0, ay: 0 };
    if (FINE) {
      window.addEventListener(
        "pointermove",
        (e) => {
          look.ax = clamp((e.clientX / window.innerWidth - 0.5) * 2, -1, 1);
          look.ay = clamp((e.clientY / window.innerHeight - 0.5) * 2, -1, 1);
        },
        { passive: true }
      );
      document.addEventListener("pointerleave", () => {
        look.ax = 0;
        look.ay = 0;
      });
    } else {
      // Gyroscope là où il est disponible sans autorisation (Android) ; ailleurs, rien.
      window.addEventListener(
        "deviceorientation",
        (e) => {
          if (e.gamma == null || e.beta == null) return;
          look.ax = clamp(e.gamma / 30, -1, 1);
          look.ay = clamp((e.beta - 50) / 30, -1, 1);
        },
        { passive: true }
      );
    }

    /* ------------------------------------------------- Espace (canvas 2D) */
    function mountSpace(canvas) {
      const ctx = canvas.getContext("2d", { alpha: true });
      if (!ctx) return null;
      const host = canvas.parentElement;
      const curtain = host.closest(".curtain"); // page transport : l'espace vit dans le rideau
      const ZK = 2.2; // unités d'espace par pixel défilé
      const DEPTH = 5600; // profondeur du champ d'étoiles (répété à l'infini)
      const NEAR = 40;
      const GATE_R = 620; // rayon d'une porte
      const GATE_FAR = 7200; // au-delà, une porte n'est pas dessinée
      const GATE_AT = 0.62; // on traverse la porte quand le haut de la section atteint 62 % de l'écran
      let w = 1;
      let h = 1;
      let dpr = 1;
      let F = 800; // focale
      let paleStars = [];
      let goldStars = [];
      let gates = [];
      let accent = "216, 181, 102";
      let accent2 = "243, 217, 139";
      const pale = "226, 232, 245";
      let camZ = window.scrollY * ZK;
      let camX = 0;
      let camY = 0;
      let roll = 0;
      let vel = 0; // vitesse lissée, en unités par image (60 i/s)
      let drift = 0; // avance lente au repos (le temps passe)
      let last = performance.now();
      let raf = 0;
      let running = false;
      let lastOpacity = "";
      let passed = -1; // dernière porte traversée (salve dans le champ de flux)

      function colors() {
        const cs = getComputedStyle(html);
        accent = rgbOf(cs.getPropertyValue("--accent-rgb"), accent);
        accent2 = rgbOf(cs.getPropertyValue("--accent-2"), accent2);
      }

      function resize() {
        w = Math.max(1, canvas.clientWidth || window.innerWidth);
        h = Math.max(1, canvas.clientHeight || window.innerHeight);
        dpr = Math.min(window.devicePixelRatio || 1, 1.75);
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        F = Math.max(w, h) * 0.62;
        const lite = html.classList.contains("lite");
        const n = Math.round((SMALL.matches ? 170 : 420) * (lite ? 0.55 : 1));
        // Les étoiles occupent le cône de vision au fond du champ (un peu plus large).
        const spanX = ((w / 2) * DEPTH) / F;
        const spanY = ((h / 2) * DEPTH) / F;
        const stars = Array.from({ length: n }, (_, i) => ({
          x: (Math.random() * 2 - 1) * spanX * 1.1,
          y: (Math.random() * 2 - 1) * spanY * 1.1,
          z: Math.random() * DEPTH,
          r: 0.5 + Math.random() * 1.1,
          a: 0.35 + Math.random() * 0.65,
          gold: i % 4 === 0,
        }));
        paleStars = stars.filter((s) => !s.gold);
        goldStars = stars.filter((s) => s.gold);
        measure();
      }

      function measure() {
        vh = window.innerHeight;
        const shiftX = Math.min(w, 1400) * 0.42;
        const shiftY = h * 0.24;
        gates = sections.map((s, i) => ({
          s,
          z: Math.max(ZK * 120, (docTop(s) - vh * GATE_AT) * ZK),
          // Portes en quinconce : la caméra vire d'une porte à l'autre.
          x: (i % 2 ? 1 : -1) * shiftX * (0.75 + (i % 3) * 0.2),
          y: ((i % 3) - 1) * shiftY,
          num: String(i + 1).padStart(2, "0"),
          name: label(s).toUpperCase(),
          spin: Math.random() * Math.PI * 2,
        }));
      }

      /** Trajectoire : la caméra passe au centre de chaque porte, en courbe douce entre elles. */
      function pathAt(z) {
        let ax = 0;
        let ay = 0;
        let az = 0;
        for (const g of gates) {
          if (g.z > z) {
            const t = smooth(clamp((z - az) / Math.max(1, g.z - az), 0, 1));
            return { x: lerp(ax, g.x, t), y: lerp(ay, g.y, t), slope: (g.x - ax) / Math.max(1, g.z - az) };
          }
          ax = g.x;
          ay = g.y;
          az = g.z;
        }
        return { x: ax, y: ay, slope: 0 };
      }

      function drawStars(group, color, streak, hw, hh) {
        ctx.fillStyle = `rgb(${color})`;
        ctx.strokeStyle = `rgb(${color})`;
        ctx.lineCap = "round";
        for (const s of group) {
          let rz = (s.z - camZ - drift) % DEPTH;
          if (rz < 0) rz += DEPTH;
          if (rz < NEAR) continue;
          const k = F / rz;
          const sx = (s.x - camX) * k;
          const sy = (s.y - camY) * k;
          if (sx < -hw - 40 || sx > hw + 40 || sy < -hh - 40 || sy > hh + 40) continue;
          const a = s.a * Math.min(1, (DEPTH - rz) / (DEPTH * 0.3)) * Math.min(1, (rz - NEAR) / 220);
          if (a < 0.02) continue;
          const size = Math.min(3.4, Math.max(0.7, s.r * k * 2.4));
          ctx.globalAlpha = a;
          const tz = rz + streak;
          if (Math.abs(streak) > 6 && tz > NEAR) {
            const k2 = F / tz;
            const tx = (s.x - camX) * k2;
            const ty = (s.y - camY) * k2;
            if (Math.abs(tx - sx) + Math.abs(ty - sy) > 1.5) {
              ctx.lineWidth = size;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(sx, sy);
              ctx.stroke();
              continue;
            }
          }
          ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
        }
      }

      function drawGate(g, time, dim) {
        const rz = g.z - camZ;
        if (rz < 90 || rz > GATE_FAR) return;
        const k = F / rz;
        const r = GATE_R * k;
        if (r > Math.max(w, h) * 2.2) return;
        const gx = (g.x - camX) * k;
        const gy = (g.y - camY) * k;
        // Apparition au loin, effacement juste avant la traversée.
        const a = dim * Math.min(1, (GATE_FAR - rz) / (GATE_FAR * 0.35)) * clamp((rz - 90) / 900, 0, 1);
        if (a < 0.01) return;
        // Halo
        ctx.strokeStyle = `rgb(${accent})`;
        ctx.globalAlpha = a * 0.08;
        ctx.lineWidth = Math.max(3, r * 0.06);
        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Anneau (assez discret pour que le texte qu'il croise reste lisible)
        ctx.strokeStyle = `rgb(${accent2})`;
        ctx.globalAlpha = a * 0.5;
        ctx.lineWidth = Math.max(1, r * 0.007);
        ctx.beginPath();
        ctx.arc(gx, gy, r, 0, Math.PI * 2);
        ctx.stroke();
        // Anneau pointillé intérieur, en rotation (l'emblème du bureau)
        ctx.globalAlpha = a * 0.38;
        ctx.setLineDash([Math.max(1, r * 0.012), Math.max(4, r * 0.05)]);
        ctx.lineDashOffset = -time * 0.02 * Math.max(1, r * 0.02);
        ctx.beginPath();
        ctx.arc(gx, gy, r * 0.8, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
        // Graduations : 48 traits qui tournent lentement (le temps)
        ctx.globalAlpha = a * 0.36;
        ctx.lineWidth = Math.max(1, r * 0.004);
        ctx.beginPath();
        const rot = g.spin + time * 0.00012;
        for (let i = 0; i < 48; i++) {
          const ang = rot + (i / 48) * Math.PI * 2;
          const len = i % 12 === 0 ? 0.09 : i % 4 === 0 ? 0.05 : 0.025;
          const c = Math.cos(ang);
          const sn = Math.sin(ang);
          ctx.moveTo(gx + c * r * 1.03, gy + sn * r * 1.03);
          ctx.lineTo(gx + c * r * (1.03 + len), gy + sn * r * (1.03 + len));
        }
        ctx.stroke();
        // Libellé de la section, au sommet de la porte : lisible au loin, effacé à l'approche
        // (la porte grandit alors sur le contenu et le libellé croiserait les titres).
        if (r > 34 && r < 420) {
          const fs = clamp(r * 0.055, 9, 16);
          ctx.globalAlpha = a * 0.55 * clamp((r - 34) / 60, 0, 1) * clamp((420 - r) / 160, 0, 1);
          ctx.fillStyle = `rgb(${accent2})`;
          ctx.font = `500 ${fs.toFixed(1)}px "JetBrains Mono", ui-monospace, monospace`;
          ctx.textAlign = "center";
          ctx.textBaseline = "bottom";
          ctx.fillText(`${g.num} · ${g.name}`, gx, gy - r * 1.16);
        }
      }

      function frame(now) {
        raf = 0;
        if (!running) return;
        const dt = clamp(now - last, 1, 64);
        last = now;
        const f60 = dt / 16.667;

        // Caméra : suit le défilement (avec un léger amorti) et dérive au repos.
        const target = window.scrollY * ZK;
        const prev = camZ;
        camZ += (target - camZ) * (1 - Math.pow(0.78, f60));
        if (Math.abs(target - camZ) < 0.05) camZ = target;
        const v = (camZ - prev) / f60;
        vel += (v - vel) * Math.min(1, 0.25 * f60);
        drift += 0.9 * f60;

        look.x += (look.ax - look.x) * Math.min(1, 0.05 * f60);
        look.y += (look.ay - look.y) * Math.min(1, 0.05 * f60);
        const p = pathAt(camZ);
        camX = p.x + look.x * 220;
        camY = p.y + look.y * 140;
        roll += (clamp(-p.slope * 0.5 - look.x * 0.04, -0.16, 0.16) - roll) * Math.min(1, 0.06 * f60);

        // Sur la page transport, l'espace n'apparaît qu'à mesure que le rideau couvre l'écran.
        if (curtain) {
          const top = curtain.getBoundingClientRect().top;
          const o = clamp(1 - top / (vh * 0.8), 0, 1).toFixed(2);
          if (o !== lastOpacity) {
            lastOpacity = o;
            host.style.opacity = o;
          }
          if (o === "0.00") {
            raf = requestAnimationFrame(frame);
            return;
          }
        }

        const speed = Math.abs(vel);
        const warp = Math.min(0.22, speed * 0.0026);
        const Fbase = F;
        F = Fbase * (1 - warp); // la focale s'ouvre avec la vitesse (sensation d'accélération)
        const streak = clamp(vel * 7, -1400, 1400);

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, w, h);
        ctx.setTransform(dpr, 0, 0, dpr, (w / 2 - look.x * w * 0.03) * dpr, (h * 0.46 - look.y * h * 0.03) * dpr);
        ctx.rotate(roll);
        const hw = w / 2 + 80;
        const hh = h / 2 + 80;
        drawStars(paleStars, pale, streak, hw, hh);
        drawStars(goldStars, accent2, streak, hw, hh);
        // Portes : de la plus lointaine à la plus proche. Discrètes tant que le titre
        // d'accueil est à l'écran (lisibilité), pleines une fois le parcours engagé.
        const dim = curtain ? 1 : 0.32 + 0.68 * smooth(clamp(window.scrollY / (vh * 0.9), 0, 1));
        for (let i = gates.length - 1; i >= 0; i--) drawGate(gates[i], now, dim);
        ctx.globalAlpha = 1;
        F = Fbase;

        // Traversée d'une porte : salve dans le champ de flux (page d'accueil).
        let idx = -1;
        for (let i = 0; i < gates.length; i++) if (camZ >= gates[i].z) idx = i;
        if (idx > passed && v > 0.5) {
          const flow = $(".depth-field canvas");
          if (flow && flow.__flow) flow.__flow.burst(w / 2, h * 0.46, 48);
        }
        passed = idx;

        raf = requestAnimationFrame(frame);
      }

      function start() {
        if (running || document.hidden) return;
        running = true;
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }

      function stop() {
        running = false;
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
      }

      colors();
      resize();
      // Pas de salve pour les portes déjà franchies au chargement (ancre, rechargement).
      passed = gates.filter((g) => camZ >= g.z).length - 1;
      let tm = 0;
      const later = () => {
        clearTimeout(tm);
        tm = setTimeout(() => {
          resize();
          passed = gates.filter((g) => camZ >= g.z).length - 1;
        }, 120);
      };
      window.addEventListener("resize", later);
      window.addEventListener("load", later);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(later);
      document.addEventListener("mz:lang", () => {
        for (const g of gates) g.name = label(g.s).toUpperCase();
      });
      try {
        // Les portes suivent la mise en page (polices, section horizontale, contenu dynamique).
        // Minuterie distincte : ne doit pas annuler un redimensionnement complet en attente.
        let mtm = 0;
        if ("ResizeObserver" in window) new ResizeObserver(() => { clearTimeout(mtm); mtm = setTimeout(measure, 120); }).observe(document.body);
      } catch (e) {
        /* navigateur ancien : resize / load suffisent */
      }
      // Le mode allégé (html.lite, posé par scroll.js après mesure) réduit le nombre d'étoiles.
      let lite = html.classList.contains("lite");
      if ("MutationObserver" in window) {
        new MutationObserver(() => {
          if (html.classList.contains("lite") === lite) return;
          lite = !lite;
          later();
        }).observe(html, { attributes: true, attributeFilter: ["class"] });
      }
      document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
      start();
      return { start, stop, measure: later, state: () => ({ z: camZ, x: camX, y: camY, vel, gates: gates.length }) };
    }

    /* --------------------------------------- Contenu en volume (plans 4D) */
    function planes() {
      const items = sections
        .filter((s) => !s.matches("[data-hscroll]"))
        .map((s) => {
          s.classList.add("fourd-plane");
          return { s, top: 0, h: 0, key: "" };
        });
      if (!items.length || !MZ.scroll || !MZ.scroll.register) return;
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
        // La hauteur des sections peut changer sans redimensionnement (carte, contenu dynamique).
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

    /* ------------------------------------------------------- Relevé 4D */
    function hud(space) {
      const box = $(".hud4d");
      if (!box || !space) return;
      const out = {};
      for (const el of $$("[data-h]", box)) out[el.dataset.h] = el;
      let fmt = null;
      try {
        fmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
      } catch (e) {
        fmt = null;
      }
      const sign = (n) => (n < 0 ? "−" : "+") + Math.abs(n).toFixed(2);
      const set = (k, v) => {
        if (out[k] && out[k].textContent !== v) out[k].textContent = v;
      };
      setInterval(() => {
        if (document.hidden) return;
        const s = space.state();
        set("x", sign(s.x / 1000));
        set("y", sign(-s.y / 1000));
        set("z", String(Math.round(s.z / 10)).padStart(4, "0"));
        set("t", fmt ? fmt.format(new Date()) : new Date().toTimeString().slice(0, 8));
      }, 120);
    }

    const canvas = $(".space canvas");
    const space = canvas ? mountSpace(canvas) : null;
    planes();
    hud(space);

    MZ.fourd = { neutral, space };
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
