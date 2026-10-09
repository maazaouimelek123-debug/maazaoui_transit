/* =============================================================================
   CORE — orchestration de l'interface
   -----------------------------------------------------------------------------
   Modules (tous sans dépendance externe) :
     01 utilitaires            07 cartes (projecteur + inclinaison)
     02 liaison des données    08 révélation au défilement, titres, compteurs
     03 préchargeur & voile    09 texte « scramble »
     04 navigation & menu      10 marquee sans couture
     05 curseur & magnétisme   11 presse-papiers, toast, formulaire
     06 langue                 12 démarrage par page
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};
  const SITE = MZ.SITE || {};
  const html = document.documentElement;
  const body = document.body;
  const PAGE = body.dataset.page || "customs";
  const REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const FINE_POINTER = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  /* ======================================================= 01 · Utilitaires */
  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const lang = () => (html.lang === "en" ? "en" : "fr");
  const pick = (v) => (v && typeof v === "object" && !Array.isArray(v) ? v[lang()] || v.fr || "" : v == null ? "" : String(v));

  const store = {
    get(k, fallback) {
      try {
        const v = localStorage.getItem(k);
        return v == null ? fallback : v;
      } catch (e) {
        return fallback;
      }
    },
    set(k, v) {
      try {
        localStorage.setItem(k, v);
      } catch (e) {
        /* stockage indisponible : on ignore */
      }
    },
  };

  /* ================================================ 02 · Liaison des données */
  /** Coordonnées effectives : la page transport surcharge celles du bureau si renseignées. */
  function resolvedContact() {
    const base = SITE.contact || {};
    if (PAGE !== "transport") return base;
    const t = SITE.transport || {};
    return Object.assign({}, base, {
      phone: t.phone || base.phone,
      phoneRaw: t.phoneRaw || base.phoneRaw,
      whatsapp: t.whatsapp || base.whatsapp,
      email: t.email || base.email,
    });
  }

  function dataModel() {
    const now = new Date();
    const since = (SITE.brand && SITE.brand.since) || 2010;
    return {
      brand: SITE.brand || {},
      contact: resolvedContact(),
      transport: SITE.transport || {},
      year: now.getFullYear(),
      years: Math.max(1, now.getFullYear() - since),
    };
  }

  function getPath(obj, path) {
    return path.split(".").reduce((acc, k) => (acc == null ? undefined : acc[k]), obj);
  }

  function bindData() {
    const model = dataModel();
    for (const el of $$("[data-bind]")) {
      const v = getPath(model, el.dataset.bind);
      if (v !== undefined) el.textContent = pick(v);
    }
    const c = model.contact;
    const hrefs = {
      tel: `tel:${c.phoneRaw || ""}`,
      mailto: `mailto:${c.email || ""}`,
      wa: `https://wa.me/${c.whatsapp || ""}`,
      maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.mapsQuery || "")}`,
    };
    for (const el of $$("[data-href]")) {
      const key = el.dataset.href;
      if (hrefs[key]) el.setAttribute("href", hrefs[key]);
    }
    for (const el of $$("[data-copy-bind]")) {
      const v = getPath(model, el.dataset.copyBind);
      if (v !== undefined) el.dataset.copy = pick(v);
    }
    // Carte intégrée : construite depuis les coordonnées de la configuration (aucune clé API requise).
    for (const el of $$("[data-map]")) {
      const g = c.geo;
      if (!g || typeof g.lat !== "number" || typeof g.lng !== "number") {
        el.hidden = true;
        continue;
      }
      const src = `https://maps.google.com/maps?q=${g.lat},${g.lng}&z=16&hl=${lang()}&output=embed`;
      let f = el.querySelector("iframe");
      if (!f) {
        f = document.createElement("iframe");
        f.loading = "lazy";
        f.referrerPolicy = "no-referrer-when-downgrade";
        f.setAttribute("allowfullscreen", "");
        el.appendChild(f);
      }
      if (f.getAttribute("src") !== src) f.src = src; // suit la langue courante
      f.title = el.dataset.mapTitle || "Google Maps";
    }
    for (const el of $$("[data-count-bind]")) {
      const v = getPath(model, el.dataset.countBind);
      if (v !== undefined) {
        el.dataset.count = String(v);
        if (el.classList.contains("is-visible")) el.textContent = formatCount(Number(v), el);
      }
    }
  }

  /* ============================================== 03 · Préchargeur & voile */
  const veil = $(".page-veil");

  function initLoader() {
    const loader = $(".loader");
    if (!loader) return;
    if (html.classList.contains("veil-in")) {
      loader.remove();
      return;
    }
    body.classList.add("is-locked");
    const minShow = REDUCED ? 0 : 1200;
    const started = performance.now();
    const finish = () => {
      const wait = Math.max(0, minShow - (performance.now() - started));
      setTimeout(() => {
        loader.classList.add("is-done");
        body.classList.remove("is-locked");
        body.classList.add("is-ready");
        reanchor();
        setTimeout(() => loader.remove(), 1000);
      }, wait);
    };
    const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise((r) => setTimeout(r, 1800))]).then(finish);
  }

  /** Arrivée via portail : le voile couvre la page puis se rétracte depuis le point du clic. */
  function initVeilArrival() {
    if (!veil || !html.classList.contains("veil-in")) return;
    let origin = { x: 0.5, y: 0.5 };
    try {
      const saved = JSON.parse(sessionStorage.getItem("mz:veil") || "null");
      if (saved) origin = saved;
      sessionStorage.removeItem("mz:veil");
    } catch (e) {
      /* ignore */
    }
    veil.style.setProperty("--x", `${origin.x * 100}%`);
    veil.style.setProperty("--y", `${origin.y * 100}%`);
    body.classList.add("is-ready");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        html.classList.remove("veil-in");
        veil.classList.add("is-collapsing");
        setTimeout(() => {
          veil.classList.remove("is-collapsing");
          veil.style.removeProperty("--x");
          veil.style.removeProperty("--y");
        }, 1100);
      });
    });
  }

  /** Départ via portail : expansion circulaire depuis le clic, puis navigation. */
  function portalTo(href, clientX, clientY) {
    if (!veil || REDUCED) {
      window.location.href = href;
      return;
    }
    const x = clientX == null ? window.innerWidth / 2 : clientX;
    const y = clientY == null ? window.innerHeight / 2 : clientY;
    veil.style.setProperty("--x", `${x}px`);
    veil.style.setProperty("--y", `${y}px`);
    try {
      sessionStorage.setItem("mz:veil", JSON.stringify({ x: x / window.innerWidth, y: y / window.innerHeight }));
    } catch (e) {
      /* ignore */
    }
    body.classList.add("is-locked");
    // Force le calcul de style avant d'ajouter la classe (sinon pas de transition).
    void veil.offsetWidth;
    veil.classList.add("is-expanding");
    setTimeout(() => {
      window.location.href = href;
    }, 820);
  }

  function initPortals() {
    for (const link of $$("a[data-portal]")) {
      link.addEventListener("click", (e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
        e.preventDefault();
        portalTo(link.getAttribute("href"), e.clientX, e.clientY);
      });
    }
    // Retour arrière (bfcache) : on remet le voile à zéro.
    window.addEventListener("pageshow", (e) => {
      if (e.persisted && veil) {
        veil.classList.remove("is-expanding");
        body.classList.remove("is-locked");
      }
    });
  }

  /* ============================================== 04 · Navigation & menu */
  function initNav() {
    const nav = $(".nav");
    if (!nav) return;
    let lastY = window.scrollY;
    let eventY = lastY; // position lue dans l'événement (mise en page propre), jamais relue après les écritures d'effets
    let ticking = false;
    const toTop = $(".to-top");
    const onScroll = () => {
      const y = eventY;
      nav.classList.toggle("is-scrolled", y > 24);
      const menuOpen = $("#menu") && $("#menu").classList.contains("is-open");
      if (!menuOpen) nav.classList.toggle("is-hidden", y > lastY && y > 160);
      if (toTop) toTop.classList.toggle("is-visible", y > 900);
      lastY = y;
      ticking = false;
    };
    window.addEventListener(
      "scroll",
      () => {
        eventY = window.scrollY;
        if (!ticking) {
          requestAnimationFrame(onScroll);
          ticking = true;
        }
      },
      { passive: true }
    );
    onScroll();

    // Lien actif selon la section visible
    const links = $$('.nav-link[href^="#"]');
    const sections = links.map((l) => $(l.getAttribute("href"))).filter(Boolean);
    if (sections.length && "IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          for (const en of entries) {
            if (!en.isIntersecting) continue;
            const id = `#${en.target.id}`;
            links.forEach((l) => l.classList.toggle("is-active", l.getAttribute("href") === id));
          }
        },
        { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
      );
      sections.forEach((s) => io.observe(s));
    }

    // Menu mobile
    const burger = $("#burger");
    const menu = $("#menu");
    if (burger && menu) {
      const setOpen = (open) => {
        burger.setAttribute("aria-expanded", String(open));
        menu.classList.toggle("is-open", open);
        body.classList.toggle("is-locked", open);
        nav.classList.remove("is-hidden");
        if (open) ($(".menu-link", menu) || burger).focus({ preventScroll: true });
      };
      burger.addEventListener("click", () => setOpen(burger.getAttribute("aria-expanded") !== "true"));
      $$("a", menu).forEach((a) => a.addEventListener("click", () => setOpen(false)));
      document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && menu.classList.contains("is-open")) {
          setOpen(false);
          burger.focus();
        }
      });
      window.matchMedia("(min-width: 1024px)").addEventListener("change", (e) => e.matches && setOpen(false));
    }

    // Retour en haut (visibilité gérée dans onScroll)
    if (toTop) toTop.addEventListener("click", () => window.scrollTo({ top: 0, behavior: REDUCED ? "auto" : "smooth" }));
  }

  /* ============================================ 05 · Curseur & magnétisme */
  function initCursor() {
    const dot = $(".cursor");
    const ring = $(".cursor-ring");
    if (!dot || !ring || !FINE_POINTER || REDUCED) return;
    body.classList.add("has-cursor");
    const label = ring.querySelector("span");
    let tx = window.innerWidth / 2;
    let ty = window.innerHeight / 2;
    let rx = tx;
    let ry = ty;
    let shown = false;

    window.addEventListener(
      "pointermove",
      (e) => {
        tx = e.clientX;
        ty = e.clientY;
        if (!shown) {
          shown = true;
          dot.style.opacity = "1";
          ring.style.opacity = "1";
        }
        const target = e.target.closest("[data-cursor], a, button, [role='button'], input, textarea, select, label");
        if (target && target.dataset && target.dataset.cursor) {
          ring.classList.add("is-label");
          ring.classList.remove("is-hover");
          if (label) label.textContent = pick(parseMaybeJson(target.dataset.cursor));
        } else {
          ring.classList.remove("is-label");
          ring.classList.toggle("is-hover", !!target);
        }
      },
      { passive: true }
    );
    document.addEventListener("mouseleave", () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    });
    document.addEventListener("mouseenter", () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    });
    dot.style.opacity = "0";
    ring.style.opacity = "0";

    (function loop() {
      rx = lerp(rx, tx, 0.18);
      ry = lerp(ry, ty, 0.18);
      dot.style.transform = `translate(${tx}px, ${ty}px) translate(-50%, -50%)`;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%)`;
      requestAnimationFrame(loop);
    })();
  }

  function parseMaybeJson(s) {
    if (s && s[0] === "{") {
      try {
        return JSON.parse(s);
      } catch (e) {
        return s;
      }
    }
    return s;
  }

  function initMagnetic() {
    if (!FINE_POINTER || REDUCED) return;
    for (const el of $$("[data-magnetic]")) {
      const strength = Number(el.dataset.magnetic) || 0.35;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * strength}px, ${dy * strength}px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    }
  }

  /* ========================================================== 06 · Langue */
  function initLang() {
    const saved = store.get("mz:lang", null);
    const initial = saved || ((navigator.language || "fr").toLowerCase().startsWith("en") ? "en" : "fr");
    if (MZ.i18n) MZ.i18n.apply(initial, { silent: true });
    const sync = () => $$(".lang button[data-lang]").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.lang === lang())));
    sync();
    $$(".lang button[data-lang]").forEach((b) =>
      b.addEventListener("click", () => {
        if (MZ.i18n) MZ.i18n.apply(b.dataset.lang);
        store.set("mz:lang", b.dataset.lang);
        sync();
        bindData();
      })
    );
    document.addEventListener("mz:lang", () => {
      sync();
      bindData();
      for (const el of $$(".split-words")) {
        delete el.dataset.split;
        splitWords(el);
        el.classList.add("is-visible");
      }
      for (const el of $$("[data-scramble].is-visible")) scramble(el, el.textContent);
    });
  }

  /* ========================================= 07 · Cartes : projecteur & tilt */
  function initCards() {
    if (!FINE_POINTER) return;
    for (const card of $$(".card, .live, .schedule-card, .contact-form-card, .mode")) {
      card.addEventListener("pointermove", (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      });
    }
    if (REDUCED) return;
    for (const el of $$("[data-tilt]")) {
      const max = Number(el.dataset.tilt) || 6;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(900px) rotateX(${-py * max}deg) rotateY(${px * max}deg) translateY(-4px)`;
      });
      el.addEventListener("pointerleave", () => {
        el.style.transform = "";
      });
    }
  }

  /* ================================= 08 · Révélation, titres, compteurs */
  function splitWords(el) {
    if (el.dataset.split === "done") return;
    const nodes = Array.from(el.childNodes);
    let i = 0;
    const frag = document.createDocumentFragment();
    const wrap = (text, className) => {
      const words = text.split(/(\s+)/);
      for (const word of words) {
        if (!word) continue;
        if (/^\s+$/.test(word)) {
          frag.appendChild(document.createTextNode(" "));
          continue;
        }
        const w = document.createElement("span");
        w.className = "w";
        const inner = document.createElement("span");
        inner.style.setProperty("--i", i++);
        if (className) inner.className = className;
        inner.textContent = word;
        w.appendChild(inner);
        frag.appendChild(w);
      }
    };
    for (const n of nodes) {
      if (n.nodeType === Node.TEXT_NODE) wrap(n.textContent, "");
      else if (n.nodeType === Node.ELEMENT_NODE) {
        if (n.tagName === "BR") frag.appendChild(document.createElement("br"));
        else wrap(n.textContent, n.className);
      }
    }
    el.textContent = "";
    el.appendChild(frag);
    el.dataset.split = "done";
  }

  function initReveal() {
    const items = $$("[data-reveal], [data-reveal-stagger], .split-words, [data-count], [data-scramble]");
    for (const el of $$(".split-words")) splitWords(el);
    if (REDUCED || !("IntersectionObserver" in window)) {
      items.forEach((el) => {
        el.classList.add("is-visible");
        if (el.dataset.count != null) el.textContent = formatCount(Number(el.dataset.count), el);
      });
      return;
    }
    const pending = new Set(items);
    const show = (el) => {
      if (!pending.has(el)) return;
      pending.delete(el);
      el.classList.add("is-visible");
      if (el.dataset.count != null) countUp(el);
      if (el.dataset.scramble != null) scramble(el);
      io.unobserve(el);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const en of entries) {
          // Visible, ou déjà dépassé (page rechargée plus bas, défilement très rapide).
          if (en.isIntersecting || en.boundingClientRect.bottom < 0) show(en.target);
        }
      },
      { threshold: 0.1, rootMargin: "0px 0px -6% 0px" }
    );
    items.forEach((el) => io.observe(el));

    // Filet de sécurité : après chaque défilement, tout ce qui est au-dessus du bas
    // de l'écran est révélé (couvre les sauts que l'observateur peut manquer).
    let sweepTimer = 0;
    const sweep = () => {
      const limit = window.innerHeight * 0.98;
      for (const el of Array.from(pending)) {
        if (el.getBoundingClientRect().top < limit) show(el);
      }
    };
    window.addEventListener(
      "scroll",
      () => {
        clearTimeout(sweepTimer);
        sweepTimer = setTimeout(sweep, 160);
      },
      { passive: true }
    );
  }

  function formatCount(v, el) {
    const dec = Number(el.dataset.countDecimals) || 0;
    return new Intl.NumberFormat(lang() === "en" ? "en-GB" : "fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(v);
  }

  function countUp(el) {
    const target = Number(el.dataset.count);
    const dur = Number(el.dataset.countDuration) || 1600;
    const start = performance.now();
    const ease = (t) => 1 - Math.pow(2, -10 * t);
    const frame = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      el.textContent = formatCount(target * ease(p), el);
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = formatCount(target, el);
    };
    requestAnimationFrame(frame);
  }

  /* ================================================ 09 · Texte « scramble » */
  const GLYPHS = "ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/·—";
  function scramble(el, finalText) {
    const target = finalText != null ? finalText : el.dataset.scrambleText || el.textContent;
    el.dataset.scrambleText = target;
    if (REDUCED) {
      el.textContent = target;
      return;
    }
    const len = target.length;
    const dur = Number(el.dataset.scrambleDuration) || 700;
    const start = performance.now();
    const frame = (now) => {
      const p = clamp((now - start) / dur, 0, 1);
      const reveal = Math.floor(p * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        const ch = target[i];
        if (i < reveal || ch === " ") out += ch;
        else out += GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = target;
    };
    requestAnimationFrame(frame);
  }

  /* ============================================== 10 · Marquee sans couture */
  function initMarquee() {
    for (const track of $$(".marquee-track")) {
      const group = $(".marquee-group", track);
      if (!group) continue;
      const clone = group.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    }
  }

  /* ====================================== 11 · Presse-papiers, toast, formulaire */
  let toastTimer = 0;
  function toast(msg) {
    const el = $(".toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove("is-visible"), 2200);
  }

  const T = {
    copied: { fr: "Copié dans le presse-papiers", en: "Copied to clipboard" },
    copyFail: { fr: "Copie impossible — sélectionnez le texte", en: "Copy failed — select the text" },
    required: { fr: "Merci de compléter les champs requis.", en: "Please complete the required fields." },
    subject: { fr: "Demande via le site — {name}", en: "Website request — {name}" },
    greeting: { fr: "Bonjour,", en: "Hello," },
    labels: {
      fr: { name: "Nom", company: "Société", phone: "Téléphone", email: "E-mail", type: "Besoin", message: "Message" },
      en: { name: "Name", company: "Company", phone: "Phone", email: "Email", type: "Need", message: "Message" },
    },
  };

  function initClipboard() {
    document.addEventListener("click", async (e) => {
      const btn = e.target.closest("[data-copy]");
      if (!btn) return;
      e.preventDefault();
      const text = btn.dataset.copy;
      try {
        await navigator.clipboard.writeText(text);
        toast(pick(T.copied));
      } catch (err) {
        toast(pick(T.copyFail));
      }
    });
  }

  function initForm() {
    const form = $("#contact-form");
    if (!form) return;
    const contact = resolvedContact();

    const collect = () => {
      const data = Object.fromEntries(new FormData(form).entries());
      let valid = true;
      for (const field of $$("[required]", form)) {
        const wrap = field.closest(".field");
        const ok = field.value.trim().length > 0 && (field.type !== "email" || field.checkValidity());
        if (wrap) wrap.classList.toggle("is-invalid", !ok);
        if (!ok) valid = false;
      }
      return { data, valid };
    };

    const composeBody = (d) => {
      const L = T.labels[lang()];
      const typeSel = $("[name='type']", form);
      const typeLabel = typeSel && typeSel.selectedOptions[0] ? typeSel.selectedOptions[0].textContent.trim() : d.type;
      const lines = [
        pick(T.greeting),
        "",
        `${L.name} : ${d.name || "—"}`,
        `${L.company} : ${d.company || "—"}`,
        `${L.phone} : ${d.phone || "—"}`,
        `${L.email} : ${d.email || "—"}`,
        `${L.type} : ${typeLabel || "—"}`,
        "",
        `${L.message} :`,
        d.message || "—",
      ];
      return lines.join("\n");
    };

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const { data, valid } = collect();
      if (!valid) {
        toast(pick(T.required));
        return;
      }
      const subject = pick(T.subject).replace("{name}", data.name || "");
      window.location.href = `mailto:${contact.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(composeBody(data))}`;
    });

    const waBtn = $("[data-send='whatsapp']", form);
    if (waBtn) {
      waBtn.addEventListener("click", () => {
        const { data, valid } = collect();
        if (!valid) {
          toast(pick(T.required));
          return;
        }
        window.open(`https://wa.me/${contact.whatsapp}?text=${encodeURIComponent(composeBody(data))}`, "_blank", "noopener");
      });
    }

    form.addEventListener("input", (e) => {
      const wrap = e.target.closest(".field");
      if (wrap && wrap.classList.contains("is-invalid") && e.target.value.trim()) wrap.classList.remove("is-invalid");
    });
  }

  /* ========================================= 12 · Modules spécifiques page */
  function initSteps() {
    const steps = $(".steps");
    const bar = $(".steps-progress");
    if (!steps || !bar) return;
    const items = $$(".step", steps);
    const update = () => {
      const r = steps.getBoundingClientRect();
      const mid = window.innerHeight * 0.55;
      const progress = clamp((mid - r.top) / r.height, 0, 1);
      bar.style.height = `${progress * (r.height - 48)}px`;
      items.forEach((s) => {
        const sr = s.getBoundingClientRect();
        s.classList.toggle("is-active", sr.top < mid);
      });
    };
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function initCanvases() {
    const flow = $("[data-canvas='flow']");
    if (flow && MZ.canvasFlow) MZ.canvasFlow.mount(flow, { color: "216, 181, 102" });
    const ocean = $("[data-canvas='ocean']");
    if (ocean && MZ.canvasOcean) MZ.canvasOcean.mount(ocean, {});
    for (const el of $$("[data-canvas='ocean-compact']")) {
      if (MZ.canvasOcean) MZ.canvasOcean.mount(el, { compact: true, baseline: 0.58, stars: 40 });
    }
    for (const el of $$("[data-canvas='flow-compact']")) {
      if (MZ.canvasFlow) MZ.canvasFlow.mount(el, { color: "216, 181, 102", density: 6000, minParticles: 120, maxParticles: 320, alpha: 0.6 });
    }
    const waves = $("[data-canvas='waves-only']");
    if (waves && MZ.canvasOcean) MZ.canvasOcean.mount(waves, { plane: false, stars: 0, baseline: 0.5, waves: 4 });
    const air = $("[data-canvas='air-only']");
    if (air && MZ.canvasOcean) MZ.canvasOcean.mount(air, { plane: true, stars: 90, waves: 0, baseline: 0.95, accent2: "147, 243, 255" });
  }

  /** Les animations décoratives du portail ne tournent que lorsqu'il est à l'écran. */
  function initPortalPause() {
    const portals = $$(".portal");
    if (!portals.length || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) en.target.classList.toggle("is-offscreen", !en.isIntersecting);
    }, { rootMargin: "10% 0px" });
    portals.forEach((p) => io.observe(p));
  }

  /** Après le préchargeur et les polices, la mise en page a pu bouger : on recale l'ancre demandée. */
  function reanchor() {
    if (!location.hash || location.hash.length < 2) return;
    let target = null;
    try {
      target = document.querySelector(location.hash);
    } catch (e) {
      return;
    }
    if (target) target.scrollIntoView({ behavior: "instant", block: "start" });
  }

  function initAvailability() {
    if (MZ.availability && SITE.hours && $("[data-av]")) MZ.availability.mount(SITE.hours);
  }

  /* ============================================================ Démarrage */
  function boot() {
    initLang();
    bindData();
    initVeilArrival();
    initLoader();
    initPortals();
    initNav();
    initCursor();
    initMagnetic();
    initCards();
    initMarquee();
    initReveal();
    initClipboard();
    initForm();
    initCanvases();
    initAvailability();
    initPortalPause();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => setTimeout(reanchor, 60));
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();

  MZ.core = { portalTo, toast, scramble, lang, pick };
})();
