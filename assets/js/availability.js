/* =============================================================================
   AVAILABILITY — moteur d'horaires en temps réel (fuseau Africa/Tunis)
   -----------------------------------------------------------------------------
   Entrées  : MZ.SITE.hours (config.js)
   Sorties  : un objet « état » (ouvert / fermé / bientôt), le détail du jour,
              la prochaine transition, et le rendu DOM des widgets.
   Priorité : fermetures > fêtes mobiles > fériés fixes > périodes ponctuelles
              > saisons > horaires réguliers.
   ========================================================================== */

(function () {
  "use strict";

  window.MZ = window.MZ || {};

  const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lundi → dimanche
  const SOON_STATE = "soon";

  const STRINGS = {
    fr: {
      open: "Ouvert maintenant",
      closed: "Fermé",
      openingSoon: "Ouvre bientôt",
      closingSoon: "Ferme bientôt",
      closesAt: "Ferme à <strong>{t}</strong>",
      reopensAt: "Réouvre à <strong>{t}</strong>",
      opensAt: "Ouvre à <strong>{t}</strong>",
      opensTomorrow: "Ouvre demain à <strong>{t}</strong>",
      opensOn: "Ouvre {d} à <strong>{t}</strong>",
      inTime: "dans {x}",
      closedToday: "Fermé aujourd'hui",
      holiday: "Jour férié",
      noSchedule: "Horaires non renseignés",
      today: "Aujourd'hui",
      tunisTime: "Heure de Tunis",
      h: "h",
      min: "min",
      days: ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"],
      daysShort: ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"],
      closedWord: "Fermé",
    },
    en: {
      open: "Open now",
      closed: "Closed",
      openingSoon: "Opening soon",
      closingSoon: "Closing soon",
      closesAt: "Closes at <strong>{t}</strong>",
      reopensAt: "Reopens at <strong>{t}</strong>",
      opensAt: "Opens at <strong>{t}</strong>",
      opensTomorrow: "Opens tomorrow at <strong>{t}</strong>",
      opensOn: "Opens {d} at <strong>{t}</strong>",
      inTime: "in {x}",
      closedToday: "Closed today",
      holiday: "Public holiday",
      noSchedule: "Hours not set",
      today: "Today",
      tunisTime: "Tunis time",
      h: "h",
      min: "min",
      days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      daysShort: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      closedWord: "Closed",
    },
  };

  /* --------------------------------------------------------------- Helpers */

  const pad = (n) => String(n).padStart(2, "0");
  const toMin = (hhmm) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + m;
  };
  const fmtMin = (min) => `${pad(Math.floor(min / 60) % 24)}:${pad(min % 60)}`;
  const tpl = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? vars[k] : `{${k}}`));
  const pick = (v, lang) => (v && typeof v === "object" ? v[lang] || v.fr || "" : v || "");

  /** Décompose une date dans le fuseau demandé (indépendant du fuseau du visiteur). */
  function zonedParts(date, timeZone) {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour12: false,
      weekday: "short",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const p = {};
    for (const part of fmt.formatToParts(date)) p[part.type] = part.value;
    const wdIndex = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(p.weekday);
    const hour = Number(p.hour) % 24; // certains moteurs renvoient « 24 » à minuit
    return {
      y: Number(p.year),
      m: Number(p.month),
      d: Number(p.day),
      wd: wdIndex,
      minutes: hour * 60 + Number(p.minute),
      seconds: Number(p.second),
      iso: `${p.year}-${p.month}-${p.day}`,
      md: `${p.month}-${p.day}`,
    };
  }

  /** Décale un « jour zoné » de n jours (calcul calendaire pur, sans heure). */
  function shiftDay(parts, n) {
    const d = new Date(Date.UTC(parts.y, parts.m - 1, parts.d + n));
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    return {
      y,
      m: Number(m),
      d: Number(day),
      wd: d.getUTCDay(),
      iso: `${y}-${m}-${day}`,
      md: `${m}-${day}`,
    };
  }

  const inIsoRange = (iso, from, to) => iso >= from && iso <= to;
  /** Plage « MM-JJ » récurrente, gère le passage de l'année (ex. 12-20 → 01-05). */
  const inMdRange = (md, from, to) => (from <= to ? md >= from && md <= to : md >= from || md <= to);

  /* ---------------------------------------------------------- Résolution */

  /**
   * Retourne la définition du jour :
   * { intervals: [[startMin,endMin],...], label: {fr,en}|null, reason: 'closure'|'holiday'|'override'|'season'|'regular' }
   */
  function resolveDay(parts, cfg) {
    const key = DAY_KEYS[parts.wd];

    for (const c of cfg.closures || []) {
      if (inIsoRange(parts.iso, c.from, c.to)) return { intervals: [], label: c.label, reason: "closure" };
    }
    for (const h of cfg.movingHolidays || []) {
      if (h.date === parts.iso) return { intervals: [], label: { fr: h.fr, en: h.en }, reason: "holiday" };
    }
    for (const h of cfg.holidays || []) {
      if (h.date === parts.md) return { intervals: [], label: { fr: h.fr, en: h.en }, reason: "holiday" };
    }
    for (const o of cfg.overrides || []) {
      if (inIsoRange(parts.iso, o.from, o.to)) {
        return { intervals: toIntervals(o.days[key]), label: o.label, reason: "override" };
      }
    }
    for (const s of cfg.seasons || []) {
      if (inMdRange(parts.md, s.from, s.to)) {
        return { intervals: toIntervals(s.days[key]), label: s.label, reason: "season" };
      }
    }
    return { intervals: toIntervals((cfg.regular || {})[key]), label: null, reason: "regular" };
  }

  function toIntervals(list) {
    if (!Array.isArray(list)) return [];
    return list
      .map(([a, b]) => [toMin(a), toMin(b)])
      .filter(([a, b]) => b > a)
      .sort((x, y) => x[0] - y[0]);
  }

  /** Cherche la prochaine ouverture à partir d'un instant (jusqu'à 21 jours). */
  function nextOpening(parts, nowMin, cfg) {
    const today = resolveDay(parts, cfg);
    for (const [start] of today.intervals) {
      if (start > nowMin) return { dayOffset: 0, start, wd: parts.wd };
    }
    for (let i = 1; i <= 21; i++) {
      const p = shiftDay(parts, i);
      const day = resolveDay(p, cfg);
      if (day.intervals.length) return { dayOffset: i, start: day.intervals[0][0], wd: p.wd };
    }
    return null;
  }

  /**
   * Calcule l'état complet pour un instant donné.
   */
  function compute(now, cfg) {
    const parts = zonedParts(now, cfg.timeZone || "Africa/Tunis");
    const nowMin = parts.minutes;
    const day = resolveDay(parts, cfg);
    const th = Object.assign({ openingSoon: 60, closingSoon: 30 }, cfg.thresholds || {});

    let state = "closed";
    let current = null;
    for (const iv of day.intervals) {
      if (nowMin >= iv[0] && nowMin < iv[1]) {
        current = iv;
        state = "open";
        break;
      }
    }

    const next = state === "open" ? null : nextOpening(parts, nowMin, cfg);

    let soon = null;
    if (state === "open" && current[1] - nowMin <= th.closingSoon) soon = "closing";
    if (state === "closed" && next && next.dayOffset === 0 && next.start - nowMin <= th.openingSoon) soon = "opening";

    return {
      parts,
      nowMin,
      seconds: parts.seconds,
      day,
      state,
      soon,
      current,
      next,
      isHolidayLike: day.reason === "holiday" || day.reason === "closure",
    };
  }

  /* ------------------------------------------------------------- Textes */

  function describe(result, lang) {
    const S = STRINGS[lang] || STRINGS.fr;
    const { state, soon, current, next, day, nowMin } = result;

    let pillState = state;
    let title;
    let detail = "";
    let badge = day.label ? pick(day.label, lang) : "";

    if (result.isHolidayLike && badge) {
      badge = day.reason === "holiday" ? `${S.holiday} · ${badge}` : badge;
    }

    if (state === "open") {
      title = soon === "closing" ? S.closingSoon : S.open;
      if (soon === "closing") pillState = SOON_STATE;
      const left = current[1] - nowMin;
      detail = tpl(S.closesAt, { t: fmtMin(current[1]) });
      if (soon === "closing") detail += ` · ${tpl(S.inTime, { x: humanDuration(left, S) })}`;
    } else {
      title = soon === "opening" ? S.openingSoon : result.isHolidayLike || !day.intervals.length ? S.closedToday : S.closed;
      if (soon === "opening") pillState = SOON_STATE;
      if (!next) {
        detail = S.noSchedule;
      } else if (next.dayOffset === 0) {
        const hadEarlier = day.intervals.some((iv) => iv[1] <= nowMin);
        detail = tpl(hadEarlier ? S.reopensAt : S.opensAt, { t: fmtMin(next.start) });
        detail += ` · ${tpl(S.inTime, { x: humanDuration(next.start - nowMin, S) })}`;
      } else if (next.dayOffset === 1) {
        detail = tpl(S.opensTomorrow, { t: fmtMin(next.start) });
      } else {
        detail = tpl(S.opensOn, { d: S.days[next.wd].toLowerCase(), t: fmtMin(next.start) });
      }
    }

    return { pillState, title, detail, badge, pillLabel: S[pillState === "open" ? "open" : pillState === "soon" ? (soon === "closing" ? "closingSoon" : "openingSoon") : "closed"] };
  }

  function humanDuration(min, S) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    if (h && m) return `${h} ${S.h} ${pad(m)} ${S.min}`;
    if (h) return `${h} ${S.h}`;
    return `${m} ${S.min}`;
  }

  /* --------------------------------------------------------------- Rendu */

  function renderWeek(container, result, cfg, lang) {
    const S = STRINGS[lang] || STRINGS.fr;
    const rows = WEEK_ORDER.map((wd) => {
      // On projette chaque jour de la semaine courante sur sa date réelle,
      // pour refléter saison / fériés / fermetures de la semaine en cours.
      const offset = (wd - result.parts.wd + 7) % 7;
      const p = offset === 0 ? result.parts : shiftDay(result.parts, offset);
      const day = resolveDay(p, cfg);
      const isToday = offset === 0;
      const closed = !day.intervals.length;
      const hours = closed
        ? `<span>${S.closedWord}</span>`
        : day.intervals
            .map(([a, b]) => `<span>${fmtMin(a)}–${fmtMin(b)}</span>`)
            .join('<span class="sep">·</span>');
      const note = day.label && (day.reason === "holiday" || day.reason === "closure") ? ` <span class="sep">·</span> <span>${escapeHtml(pick(day.label, lang))}</span>` : "";
      return `<div class="week-row${isToday ? " is-today" : ""}${closed ? " is-closed" : ""}" ${isToday ? 'aria-current="date"' : ""}>
        <div class="week-day">${S.days[wd]}${isToday ? `<span class="tag">${S.today}</span>` : ""}</div>
        <div class="week-hours">${hours}${note}</div>
      </div>`;
    });
    container.innerHTML = rows.join("");
  }

  function renderDaybar(container, result) {
    const spans = result.day.intervals
      .map(([a, b]) => `<i class="daybar-span" style="left:${(a / 1440) * 100}%;width:${((b - a) / 1440) * 100}%"></i>`)
      .join("");
    const nowPct = (result.nowMin / 1440) * 100;
    container.innerHTML = `
      <div class="daybar-track">${spans}<i class="daybar-now" style="left:${nowPct}%" data-time="${fmtMin(result.nowMin)}"></i></div>
      <div class="daybar-scale"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>24:00</span></div>`;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }

  /**
   * Monte le widget : met à jour toutes les cibles [data-av="..."] présentes dans la page.
   *   data-av="pill"    → élément .status (data-state + texte)
   *   data-av="title"   → titre (Ouvert maintenant…)
   *   data-av="detail"  → détail (Ferme à 17:30…)
   *   data-av="badge"   → libellé de saison / férié
   *   data-av="clock"   → horloge locale HH:MM
   *   data-av="week"    → tableau hebdomadaire
   *   data-av="daybar"  → barre des 24 h
   */
  function mount(cfg) {
    const targets = (name) => Array.from(document.querySelectorAll(`[data-av="${name}"]`));
    let lang = document.documentElement.lang === "en" ? "en" : "fr";

    function tick() {
      const now = new Date();
      const result = compute(now, cfg);
      const text = describe(result, lang);

      for (const el of targets("pill")) {
        el.dataset.state = text.pillState;
        const label = el.querySelector("[data-av-label]") || el;
        label.textContent = text.pillLabel;
      }
      for (const el of targets("title")) el.textContent = text.title;
      for (const el of targets("detail")) el.innerHTML = text.detail;
      for (const el of targets("badge")) el.textContent = text.badge;
      for (const el of targets("clock")) {
        el.innerHTML = `${pad(Math.floor(result.nowMin / 60))}<span class="sep">:</span>${pad(result.nowMin % 60)}`;
      }
      for (const el of targets("week")) renderWeek(el, result, cfg, lang);
      for (const el of targets("daybar")) renderDaybar(el, result);
      for (const el of targets("tz-label")) el.textContent = (STRINGS[lang] || STRINGS.fr).tunisTime;

      document.dispatchEvent(new CustomEvent("mz:availability", { detail: { result, text } }));
    }

    tick();
    // Resynchronise au changement de minute, puis toutes les 30 s.
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 50;
    setTimeout(() => {
      tick();
      setInterval(tick, 30000);
    }, msToNextMinute);

    document.addEventListener("mz:lang", (e) => {
      lang = e.detail.lang === "en" ? "en" : "fr";
      tick();
    });
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) tick();
    });

    return { tick, compute: (d) => compute(d || new Date(), cfg), describe: (r, l) => describe(r, l || lang) };
  }

  MZ.availability = { compute, describe, mount, STRINGS, zonedParts, resolveDay };
})();
