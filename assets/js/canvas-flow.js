/* =============================================================================
   CANVAS — champ de flux (courants / routes) pour l'univers « douane »
   -----------------------------------------------------------------------------
   Des centaines de particules suivent un champ de vecteurs continu (somme de
   sinus), laissant des traînées qui s'estompent. Résultat : des courants
   marins / corridors logistiques en mouvement lent, en laiton sur bleu nuit.
   • DPR plafonné à 2, densité adaptée à la surface
   • pause quand l'onglet est caché ou l'élément hors écran
   • rendu statique si « prefers-reduced-motion »
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};

  function mountFlow(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    const o = Object.assign(
      {
        color: "216, 181, 102",
        density: 11000, // px² par particule
        speed: 1.1,
        fade: 0.045,
        lineWidth: 0.9,
        alpha: 0.5,
        scale: 0.0024,
        maxParticles: 900,
        burstColor: "243, 217, 139",
      },
      opts || {}
    );

    const ctx = canvas.getContext("2d", { alpha: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles = [];
    let extras = []; // salves d'éclosion (particules éphémères)
    let depth = 0; // 0 = surface, 1 = plongée maximale (pilote la vitesse et l'intensité)
    let raf = 0;
    let t = Math.random() * 1000;
    let running = false;
    let visible = true;

    function spawn(p) {
      p = p || {};
      p.x = Math.random() * w;
      p.y = Math.random() * h;
      p.life = 80 + Math.random() * 260;
      p.speed = o.speed * (0.6 + Math.random() * 0.8);
      p.w = o.lineWidth * (0.5 + Math.random());
      return p;
    }

    function resize() {
      // Taille non transformée (le canvas peut être mis à l'échelle par CSS).
      w = Math.max(1, canvas.clientWidth || Math.round(canvas.getBoundingClientRect().width));
      h = Math.max(1, canvas.clientHeight || Math.round(canvas.getBoundingClientRect().height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(o.maxParticles, Math.max(120, Math.round((w * h) / o.density)));
      particles = Array.from({ length: n }, () => spawn());
      ctx.clearRect(0, 0, w, h);
      if (reduced) drawStatic();
    }

    /** Champ de vecteurs : angle en (x, y, t). */
    function angle(x, y, time) {
      const s = o.scale;
      return (
        Math.sin(x * s + time * 0.35) * Math.cos(y * s * 1.2 - time * 0.22) * Math.PI +
        Math.sin((x + y) * s * 0.45 + time * 0.12) * (Math.PI / 2) +
        Math.cos(y * s * 0.7 - x * s * 0.3 + time * 0.08) * 0.6
      );
    }

    let frameNo = 0;
    function step() {
      // Estompe les traînées en conservant la transparence du canvas. Un fondu plus
      // fort toutes les 20 images abaisse le plancher d'alpha 8 bits (sinon ≈ 4 % résiduels).
      frameNo++;
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${frameNo % 20 === 0 ? Math.max(o.fade, 0.14) : o.fade})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      const boost = 1 + depth * 1.8;
      const glow = o.alpha * (1 + depth * 0.6);
      for (const p of particles) {
        const a = angle(p.x, p.y, t);
        const nx = p.x + Math.cos(a) * p.speed * boost;
        const ny = p.y + Math.sin(a) * p.speed * boost;
        p.life -= 1;
        if (p.life < 0 || nx < -2 || nx > w + 2 || ny < -2 || ny > h + 2) {
          spawn(p);
          continue;
        }
        const fadeIn = Math.min(1, (340 - p.life) / 40);
        ctx.strokeStyle = `rgba(${o.color},${Math.min(1, glow * fadeIn)})`;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
      }
      // Salves : particules brillantes à courte vie, sans réapparition.
      if (extras.length) {
        ctx.lineWidth = 1.1;
        for (let i = extras.length - 1; i >= 0; i--) {
          const p = extras[i];
          // Radial au départ, puis emporté par le courant du champ.
          const k = p.life / p.max;
          const a = p.spin * k + angle(p.x, p.y, t) * (1 - k);
          const nx = p.x + Math.cos(a) * p.speed * (0.4 + k);
          const ny = p.y + Math.sin(a) * p.speed * (0.4 + k);
          p.life -= 1;
          if (p.life < 0) {
            extras.splice(i, 1);
            continue;
          }
          ctx.strokeStyle = `rgba(${o.burstColor || o.color},${Math.min(1, (p.life / p.max) * 0.95)})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(nx, ny);
          ctx.stroke();
          p.x = nx;
          p.y = ny;
        }
      }
      t += 0.0035 * (1 + depth * 0.8);
      raf = requestAnimationFrame(step);
    }

    /** Règle la profondeur de plongée (0–1). */
    function setDepth(d) {
      depth = Math.min(1, Math.max(0, Number(d) || 0));
    }

    /** Déclenche une salve de particules au point (x, y) en pixels CSS du canvas. */
    function burst(x, y, n) {
      if (reduced) return;
      const count = Math.min(90, Math.max(8, n || 32));
      for (let i = 0; i < count; i++) {
        const ang = Math.random() * Math.PI * 2;
        const dist = Math.random() * 5;
        const life = 45 + Math.random() * 70;
        extras.push({
          x: x + Math.cos(ang) * dist,
          y: y + Math.sin(ang) * dist,
          life,
          max: life,
          speed: 1.2 + Math.random() * 1.8,
          spin: ang,
        });
      }
      if (extras.length > 600) extras.splice(0, extras.length - 600);
      start();
    }

    /** Variante immobile : on trace de longues lignes de courant d'un coup. */
    function drawStatic() {
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = o.lineWidth;
      ctx.strokeStyle = `rgba(${o.color},${o.alpha * 0.8})`;
      for (const p of particles) {
        let x = p.x;
        let y = p.y;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let i = 0; i < 60; i++) {
          const a = angle(x, y, t);
          x += Math.cos(a) * 1.6;
          y += Math.sin(a) * 1.6;
          if (x < 0 || x > w || y < 0 || y > h) break;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function start() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(step);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const ro = new ResizeObserver(() => {
      resize();
    });
    ro.observe(canvas);

    const io = new IntersectionObserver(
      (entries) => {
        visible = entries[0].isIntersecting;
        if (visible) start();
        else {
          stop();
          ctx.clearRect(0, 0, w, h); // hors écran : on repart d'une toile vierge (aucun résidu)
        }
      },
      { threshold: 0.02 }
    );
    io.observe(canvas);

    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    resize();
    start();

    const handle = { start, stop, setDepth, burst, destroy: () => { stop(); ro.disconnect(); io.disconnect(); } };
    canvas.__flow = handle;
    return handle;
  }

  MZ.canvasFlow = { mount: mountFlow };
})();
