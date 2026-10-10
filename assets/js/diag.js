/* =============================================================================
   DIAGNOSTIC À DISTANCE — chargé uniquement avec ?diag=1 dans l'adresse
   -----------------------------------------------------------------------------
   Affiche un panneau avec ce que CE navigateur voit réellement : version servie,
   réglages (réduction des animations, pointeur), effets actifs ou non, éclosion
   des blocs au défilement, fraîcheur du cache, erreurs de script. Un bouton copie
   le rapport complet (JSON) à transmettre pour analyse.
   Ne modifie rien au site ; aucune donnée n'est envoyée nulle part.
   ========================================================================== */

(function () {
  "use strict";
  const html = document.documentElement;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const raf = (n) => new Promise((res) => { let i = 0; const f = () => (++i >= n ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  const mq = (q) => { try { return window.matchMedia(q).matches; } catch (e) { return null; } };
  const sup = (p, v) => { try { return !!(window.CSS && CSS.supports && CSS.supports(p, v)); } catch (e) { return false; } };

  /* ---------------------------------------------------------------- panneau */
  const box = document.createElement("div");
  box.id = "mz-diag";
  box.setAttribute("lang", "fr");
  box.innerHTML =
    '<style>' +
    '#mz-diag{position:fixed;z-index:2147483647;right:12px;bottom:12px;left:12px;max-width:560px;margin-left:auto;background:#0b0f1a;color:#e6ebf5;border:1px solid rgba(216,181,102,.5);border-radius:14px;box-shadow:0 20px 60px rgba(0,0,0,.6);font:14px/1.45 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-height:70vh;display:flex;flex-direction:column;cursor:auto}' +
    '#mz-diag *{box-sizing:border-box}' +
    '#mz-diag header{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid rgba(255,255,255,.08)}' +
    '#mz-diag h2{margin:0;font-size:15px;font-weight:700;color:#f3d98b}' +
    '#mz-diag .body{padding:12px 14px;overflow:auto;-webkit-overflow-scrolling:touch}' +
    '#mz-diag .verdict{padding:10px 12px;border-radius:10px;background:rgba(216,181,102,.12);border:1px solid rgba(216,181,102,.35);margin-bottom:10px;font-weight:600}' +
    '#mz-diag .verdict.bad{background:rgba(255,92,92,.12);border-color:rgba(255,92,92,.45)}' +
    '#mz-diag .verdict.ok{background:rgba(92,214,140,.12);border-color:rgba(92,214,140,.45)}' +
    '#mz-diag dl{display:grid;grid-template-columns:auto 1fr;gap:4px 10px;margin:0 0 10px}' +
    '#mz-diag dt{color:#aab3c5}#mz-diag dd{margin:0;word-break:break-word}' +
    '#mz-diag textarea{width:100%;height:110px;background:#060910;color:#cfd6e4;border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace}' +
    '#mz-diag .row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}' +
    '#mz-diag button{appearance:none;border:1px solid rgba(216,181,102,.6);background:#f3d98b;color:#0b0f1a;font-weight:700;border-radius:999px;padding:8px 14px;cursor:pointer;font-size:13px}' +
    '#mz-diag button.ghost{background:transparent;color:#e6ebf5;border-color:rgba(255,255,255,.25)}' +
    '#mz-diag .muted{color:#aab3c5;font-size:12px}' +
    '</style>' +
    '<header><h2>Diagnostic d’affichage</h2><button class="ghost" type="button" data-close>Fermer</button></header>' +
    '<div class="body"><div class="verdict" data-verdict>Analyse en cours… ne touchez pas à la page pendant quelques secondes.</div>' +
    '<dl data-facts></dl><textarea readonly data-raw aria-label="Rapport brut"></textarea>' +
    '<div class="row"><button type="button" data-copy>Copier le rapport</button><button class="ghost" type="button" data-rerun>Relancer</button></div>' +
    '<p class="muted">Rapport local : rien n’est envoyé automatiquement. Copiez-le et transmettez-le pour analyse.</p></div>';
  document.body.appendChild(box);
  const verdictEl = $("[data-verdict]", box);
  const factsEl = $("[data-facts]", box);
  const rawEl = $("[data-raw]", box);
  $("[data-close]", box).addEventListener("click", () => box.remove());
  $("[data-copy]", box).addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(rawEl.value);
      $("[data-copy]", box).textContent = "Copié ✓";
    } catch (e) {
      rawEl.focus();
      rawEl.select();
      $("[data-copy]", box).textContent = "Sélectionné : copiez (Ctrl+C)";
    }
  });
  $("[data-rerun]", box).addEventListener("click", () => run());

  /* ---------------------------------------------------------------- lectures */
  function env() {
    const c = navigator.connection || {};
    return {
      url: location.href,
      build: ($('meta[name="mz-build"]') || {}).content || "?",
      ua: navigator.userAgent,
      platform: navigator.platform,
      langue: navigator.language,
      ecran: `${screen.width}×${screen.height}`,
      fenetre: `${innerWidth}×${innerHeight}`,
      dpr: window.devicePixelRatio,
      touch: navigator.maxTouchPoints || 0,
      reseau: c.effectiveType || "?",
      reducedMotion: mq("(prefers-reduced-motion: reduce)"),
      pointeurFin: mq("(hover: hover) and (pointer: fine)"),
      large1000: mq("(min-width: 1000px)"),
      etroit760: mq("(max-width: 760px)"),
      schema: mq("(prefers-color-scheme: dark)") ? "sombre" : "clair",
      sessionStorage: (() => { try { sessionStorage.setItem("mz:diag", "1"); return true; } catch (e) { return false; } })(),
      fuseau: (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (e) { return "?"; } })(),
    };
  }
  function caps() {
    let canvas2d = false;
    try { canvas2d = !!document.createElement("canvas").getContext("2d"); } catch (e) {}
    return {
      canvas2d,
      clipPathUrl: sup("clip-path", "url(#x)"),
      clipPathInset: sup("clip-path", "inset(0 0 10% 0)"),
      calcMax: sup("opacity", "calc(1 - max(0, 0.5 - 0.3) / 0.5)"),
      overflowClip: sup("overflow", "clip"),
      insetShorthand: sup("inset", "0"),
      resizeObserver: "ResizeObserver" in window,
      intersectionObserver: "IntersectionObserver" in window,
      intlTimeZone: (() => { try { new Intl.DateTimeFormat("fr", { timeZone: "Africa/Tunis" }); return true; } catch (e) { return false; } })(),
    };
  }
  function site() {
    const MZ = window.MZ || {};
    const canvas = $(".depth-field canvas");
    let alpha = null;
    if (canvas) {
      try {
        const g = canvas.getContext("2d");
        const W = canvas.width, H = canvas.height;
        const d = g.getImageData(0, 0, W, H).data;
        let n = 0, tot = 0;
        for (let y = 0; y < H; y += 4) for (let x = 0; x < W; x += 4) { tot++; if (d[(y * W + x) * 4 + 3] > 16) n++; }
        alpha = +(n / Math.max(1, tot)).toFixed(4);
      } catch (e) { alpha = "err:" + e.message; }
    }
    const blooms = $$("[data-bloom]");
    const vis = blooms.filter((el) => { const r = el.getBoundingClientRect(); return r.bottom > 0 && r.top < innerHeight; });
    const loader = $(".loader");
    const hero = $(".hero > .container");
    return {
      classesHtml: html.className,
      scripts: { config: !!MZ.SITE, core: !!MZ.core, scroll: !!MZ.scroll, flow: !!MZ.canvasFlow, availability: !!MZ.availability || !!$("[data-av='pill']") },
      scrollEffectsConfig: MZ.SITE && MZ.SITE.ui ? MZ.SITE.ui.scrollEffects : "?",
      scrollY: Math.round(scrollY),
      hauteurPage: html.scrollHeight,
      loader: loader ? { done: loader.classList.contains("is-done"), opacity: getComputedStyle(loader).opacity, visibility: getComputedStyle(loader).visibility } : "absent",
      veil: ($(".page-veil") && getComputedStyle($(".page-veil")).opacity) || "absent",
      hero: hero ? { transform: hero.style.transform || "", opacity: getComputedStyle(hero).opacity } : "absent",
      seeds: $$(".seed").length,
      blocs: blooms.length,
      blocsEclos: $$("[data-bloom].is-bloomed").length,
      blocsVisibles: vis.length,
      opacitesVisibles: vis.slice(0, 4).map((el) => getComputedStyle(el).opacity),
      champ: canvas ? { taille: `${canvas.width}×${canvas.height}`, couverture: alpha, profondeur: $(".depth-field").style.getPropertyValue("--depth") } : "absent",
      chemin: { segments: $$(".journey-done").length, etats: $$(".journey-done").map((el) => (el.style.visibility === "hidden" ? "H" : el.style.clipPath.indexOf("url(") === 0 ? "A" : "D")).join("") },
      rail: $$(".rail-node").length,
      erreurs: (window.__mzErrors || []).slice(0, 10),
    };
  }
  async function freshness() {
    const urls = $$('link[rel="stylesheet"][href^="assets/"], script[src^="assets/"]').map((el) => el.href || el.src);
    urls.unshift(location.pathname.replace(/\/$/, "/index.html"));
    const out = [];
    for (const u of urls) {
      try {
        const a = await (await fetch(u, { cache: "default" })).text();
        const b = await (await fetch(u, { cache: "reload" })).text();
        out.push({ fichier: u.split("/").pop(), cache: a.length, reseau: b.length, perime: a !== b });
      } catch (e) {
        out.push({ fichier: u.split("/").pop(), erreur: String(e.message || e) });
      }
    }
    return out;
  }

  /* ---------------------------------------------------------------- verdict */
  function verdict(r) {
    const s = r.site, e = r.env;
    const stale = (r.cache || []).filter((x) => x.perime).map((x) => x.fichier);
    if (s.erreurs.length) return ["bad", `Erreur de script dans votre navigateur : « ${s.erreurs[0].m} » (${s.erreurs[0].s}:${s.erreurs[0].l}). L’effet est bloqué par cette erreur ; transmettez le rapport.`];
    if (e.reducedMotion) return ["bad", "Votre appareil demande la réduction des animations : l’effet est volontairement désactivé (site en version calme). iOS : Réglages › Accessibilité › Mouvement › « Réduire les animations ». Android : Paramètres › Accessibilité › « Supprimer les animations ». Windows : Paramètres › Accessibilité › Effets visuels › « Effets d’animation »."];
    if (!/\bfx\b/.test(s.classesHtml)) return ["bad", s.scripts.scroll ? "Les effets de défilement sont désactivés par la configuration (scrollEffects)." : "Le script des effets n’est pas chargé (scroll.js absent ou bloqué) ; transmettez le rapport."];
    if (stale.length) return ["bad", `Votre navigateur utilisait une ancienne version de : ${stale.join(", ")}. Elle vient d’être rafraîchie : rechargez la page (Ctrl + F5 sur ordinateur) et relancez le diagnostic.`];
    if (s.loader !== "absent" && !s.loader.done) return ["bad", "L’écran de chargement n’est jamais parti : transmettez le rapport."];
    if (r.apresDefilement && r.apresDefilement.blocsEclos === 0) return ["bad", "Effets actifs mais aucun bloc n’éclot au défilement : défaut à analyser, transmettez le rapport."];
    const mobile = !e.pointeurFin;
    return ["ok", `Tout est actif chez vous (version ${e.build}) : hero qui recule, champ de particules, blocs qui éclosent depuis les points dorés, chemin pointillé.${mobile ? " Sur écran tactile, le défilement inertiel est désactivé par conception et le champ est plus discret." : ""} Si cela ne correspond pas à ce que vous voyez, décrivez-le avec ce rapport.`];
  }

  /* ---------------------------------------------------------------- séquence */
  let running = false;
  async function run() {
    if (running) return;
    running = true;
    verdictEl.className = "verdict";
    verdictEl.textContent = "Analyse en cours… ne touchez pas à la page pendant quelques secondes.";
    const report = { date: new Date().toISOString(), env: env(), capacites: caps() };
    try {
      await wait(400);
      report.site = site();
      const max = Math.max(1, html.scrollHeight - innerHeight);
      window.scrollTo({ top: Math.round(max * 0.45), behavior: "instant" });
      await raf(6); await wait(900);
      report.apresDefilement = site();
      window.scrollTo({ top: Math.round(max * 0.9), behavior: "instant" });
      await raf(6); await wait(900);
      report.basDePage = site();
      window.scrollTo({ top: 0, behavior: "instant" });
      await raf(3);
      verdictEl.textContent = "Vérification du cache…";
      report.cache = await freshness();
    } catch (e) {
      report.erreurDiag = String(e && e.stack || e);
    }
    const [cls, text] = verdict(report);
    report.verdict = text;
    verdictEl.className = "verdict " + cls;
    verdictEl.textContent = text;
    const f = [
      ["Version servie", report.env.build],
      ["Navigateur", report.env.ua.replace(/^Mozilla\/5\.0 /, "").slice(0, 120)],
      ["Fenêtre", `${report.env.fenetre} · ×${report.env.dpr} · tactile ${report.env.touch}`],
      ["Réduction des animations", report.env.reducedMotion ? "OUI (effet désactivé)" : "non"],
      ["Effets (classe fx)", /\bfx\b/.test(report.site.classesHtml) ? "actifs" : "inactifs"],
      ["Blocs éclos après défilement", report.apresDefilement ? `${report.apresDefilement.blocsEclos} / ${report.apresDefilement.blocs}` : "?"],
      ["Champ de particules", report.site.champ === "absent" ? "absent" : `couverture ${report.basDePage && report.basDePage.champ.couverture}`],
      ["Erreurs de script", report.site.erreurs.length ? report.site.erreurs.map((x) => x.m).join(" | ") : "aucune"],
      ["Cache périmé", (report.cache || []).filter((x) => x.perime).map((x) => x.fichier).join(", ") || "non"],
    ];
    factsEl.innerHTML = f.map(([k, v]) => `<dt>${k}</dt><dd>${String(v).replace(/</g, "&lt;")}</dd>`).join("");
    rawEl.value = JSON.stringify(report, null, 1);
    running = false;
  }
  if (document.readyState === "complete") setTimeout(run, 2600);
  else window.addEventListener("load", () => setTimeout(run, 2600));
})();
