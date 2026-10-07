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
      },
      opts || {}
    );

    const ctx = canvas.getContext("2d", { alpha: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let particles = [];
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
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
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

    function step() {
      // Estompe les traînées en conservant la transparence du canvas.
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${o.fade})`;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      for (const p of particles) {
        const a = angle(p.x, p.y, t);
        const nx = p.x + Math.cos(a) * p.speed;
        const ny = p.y + Math.sin(a) * p.speed;
        p.life -= 1;
        if (p.life < 0 || nx < -2 || nx > w + 2 || ny < -2 || ny > h + 2) {
          spawn(p);
          continue;
        }
        const fadeIn = Math.min(1, (340 - p.life) / 40);
        ctx.strokeStyle = `rgba(${o.color},${o.alpha * fadeIn})`;
        ctx.lineWidth = p.w;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
      }
      t += 0.0035;
      raf = requestAnimationFrame(step);
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
        visible ? start() : stop();
      },
      { threshold: 0.02 }
    );
    io.observe(canvas);

    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));

    resize();
    start();

    return { start, stop, destroy: () => { stop(); ro.disconnect(); io.disconnect(); } };
  }

  MZ.canvasFlow = { mount: mountFlow };
})();
