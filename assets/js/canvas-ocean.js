/* =============================================================================
   CANVAS — océan & air pour l'univers « transport »
   -----------------------------------------------------------------------------
   • Vagues superposées (plusieurs harmoniques), dégradé d'aigue-marine
   • Étoiles scintillantes dans la partie haute
   • Trajectoire aérienne : un arc pointillé parcouru par un point lumineux
   • Option « compact » pour le hublot du portail (moins de couches, plus rapide)
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};

  function mountOcean(canvas, opts) {
    if (!canvas || !canvas.getContext) return null;
    const o = Object.assign(
      {
        compact: false,
        waves: 4,
        baseline: 0.62, // position verticale de la ligne d'eau (0–1)
        accent: "63, 217, 203",
        accent2: "56, 160, 255",
        stars: 70,
        plane: true,
        speed: 1,
      },
      opts || {}
    );

    const ctx = canvas.getContext("2d", { alpha: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let w = 0;
    let h = 0;
    let dpr = 1;
    let raf = 0;
    let t = Math.random() * 100;
    let running = false;
    let visible = true;
    let stars = [];

    function resize() {
      const rect = canvas.getBoundingClientRect();
      w = Math.max(1, Math.round(rect.width));
      h = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = o.compact ? Math.round(o.stars * 0.5) : o.stars;
      stars = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h * o.baseline * 0.9,
        r: 0.4 + Math.random() * 1.1,
        p: Math.random() * Math.PI * 2,
        s: 0.4 + Math.random() * 1.2,
      }));
      if (reduced) draw(0);
    }

    function wave(y0, amp, freq, phase, speed, time) {
      ctx.beginPath();
      ctx.moveTo(0, h);
      const stepX = o.compact ? 6 : 4;
      for (let x = 0; x <= w + stepX; x += stepX) {
        const y =
          y0 +
          Math.sin(x * freq + time * speed + phase) * amp +
          Math.sin(x * freq * 0.47 - time * speed * 0.6 + phase * 1.7) * amp * 0.55 +
          Math.sin(x * freq * 2.3 + time * speed * 1.4) * amp * 0.15;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
    }

    function draw(time) {
      ctx.clearRect(0, 0, w, h);

      // Étoiles
      for (const s of stars) {
        const tw = 0.45 + 0.55 * Math.sin(time * s.s + s.p);
        ctx.fillStyle = `rgba(230, 250, 255, ${0.25 + 0.6 * tw})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * (0.8 + 0.3 * tw), 0, Math.PI * 2);
        ctx.fill();
      }

      // Trajectoire aérienne (arc quadratique)
      if (o.plane) {
        const p0 = { x: -w * 0.05, y: h * (o.baseline - 0.05) };
        const p1 = { x: w * 0.45, y: h * 0.02 };
        const p2 = { x: w * 1.05, y: h * (o.baseline * 0.55) };
        ctx.save();
        ctx.setLineDash([3, 9]);
        ctx.lineWidth = 1;
        ctx.strokeStyle = `rgba(${o.accent2}, 0.35)`;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y);
        ctx.stroke();
        ctx.restore();

        const u = (time * 0.055 * o.speed) % 1;
        const px = (1 - u) * (1 - u) * p0.x + 2 * (1 - u) * u * p1.x + u * u * p2.x;
        const py = (1 - u) * (1 - u) * p0.y + 2 * (1 - u) * u * p1.y + u * u * p2.y;
        const glow = ctx.createRadialGradient(px, py, 0, px, py, 26);
        glow.addColorStop(0, `rgba(${o.accent2}, 0.9)`);
        glow.addColorStop(1, `rgba(${o.accent2}, 0)`);
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(px, py, 26, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#eafcff";
        ctx.beginPath();
        ctx.arc(px, py, 2.2, 0, Math.PI * 2);
        ctx.fill();
        // sillage
        ctx.strokeStyle = `rgba(${o.accent2}, 0.55)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let k = 0; k <= 14; k++) {
          const uu = Math.max(0, u - k * 0.006);
          const qx = (1 - uu) * (1 - uu) * p0.x + 2 * (1 - uu) * uu * p1.x + uu * uu * p2.x;
          const qy = (1 - uu) * (1 - uu) * p0.y + 2 * (1 - uu) * uu * p1.y + uu * uu * p2.y;
          k === 0 ? ctx.moveTo(qx, qy) : ctx.lineTo(qx, qy);
        }
        ctx.stroke();
      }

      // Vagues : du fond (plus sombre, plus lent) vers l'avant (plus clair, plus vif)
      const layers = o.compact ? 3 : o.waves;
      for (let i = 0; i < layers; i++) {
        const k = i / Math.max(1, layers - 1);
        const y0 = h * (o.baseline + k * 0.16);
        const amp = (o.compact ? 8 : 12) + k * 10;
        const freq = 0.006 + k * 0.004;
        const alpha = 0.16 + k * 0.22;
        const grad = ctx.createLinearGradient(0, y0 - amp, 0, h);
        grad.addColorStop(0, `rgba(${o.accent}, ${alpha})`);
        grad.addColorStop(0.5, `rgba(${o.accent2}, ${alpha * 0.55})`);
        grad.addColorStop(1, `rgba(${o.accent2}, 0)`);
        ctx.fillStyle = grad;
        wave(y0, amp, freq, i * 1.9, (0.5 + k * 0.7) * o.speed, time);
        ctx.fill();
        // crête lumineuse
        ctx.strokeStyle = `rgba(${o.accent}, ${0.25 + k * 0.3})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const stepX = o.compact ? 6 : 4;
        for (let x = 0; x <= w + stepX; x += stepX) {
          const y =
            y0 +
            Math.sin(x * freq + time * (0.5 + k * 0.7) * o.speed + i * 1.9) * amp +
            Math.sin(x * freq * 0.47 - time * (0.5 + k * 0.7) * o.speed * 0.6 + i * 1.9 * 1.7) * amp * 0.55 +
            Math.sin(x * freq * 2.3 + time * (0.5 + k * 0.7) * o.speed * 1.4) * amp * 0.15;
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    }

    function loop() {
      t += 0.016;
      draw(t);
      raf = requestAnimationFrame(loop);
    }

    function start() {
      if (running || reduced || !visible || document.hidden) return;
      running = true;
      raf = requestAnimationFrame(loop);
    }

    function stop() {
      running = false;
      cancelAnimationFrame(raf);
    }

    const ro = new ResizeObserver(resize);
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

  MZ.canvasOcean = { mount: mountOcean };
})();
