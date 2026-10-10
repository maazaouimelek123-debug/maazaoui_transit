/* =============================================================================
   I18N — bascule FR / EN
   -----------------------------------------------------------------------------
   Le français est écrit directement dans le HTML (langue par défaut, lisible
   sans JavaScript). Au premier passage, chaque élément [data-i18n] mémorise son
   contenu d'origine ; le dictionnaire ci-dessous ne contient donc que l'anglais.
     • data-i18n="clé"                     → remplace le contenu (HTML autorisé)
     • data-i18n-attr="placeholder:clé"    → remplace un attribut (séparateur « | »)
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};

  const EN = {
    /* ----------------------------------------------------------- Commun */
    "meta.title.customs": "Maazaoui Transit — Licensed customs broker, Tunisia · since 2010",
    "meta.title.transport": "By Ocean and Air Transport — Sea & air freight, Tunisia · Maazaoui Transit group",
    "a11y.skip": "Skip to content",
    "nav.rail": "Page progress",
    "hero.scroll": "Scroll",
    "fx.reduced": "Animations reduced by your device setting.",
    "fx.enable": "Enable effects",
    "fx.forced": "Effects enabled despite your device setting.",
    "fx.calm": "Back to calm mode",
    "fx.close": "Close",
    "ft.nav": "Navigation",
    "ft.group": "Group",
    "ft.contact": "Contact details",
    "ft.made": "Crafted with care · Tunis",
    "ct.phone": "Phone",
    "ct.callNow": "Call",
    "ct.copy": "Copy",
    "ct.write": "Write",
    "ct.openWa": "Open WhatsApp",
    "ct.address": "Address",
    "ct.directions": "Directions",
    "ct.plusCode": "Plus Code",
    "ct.map.title": "The office, in Radès",
    "ct.map.open": "Open in Google Maps",
    "ct.map.iframeTitle": "Map — Maazaoui Transit, Radès",
    "ct.form.lead": "The form prepares a ready-to-send message for your mail client or WhatsApp: nothing is stored on this website.",
    "ct.form.name": "Name *",
    "ct.form.namePh": "Your name",
    "ct.form.company": "Company",
    "ct.form.companyPh": "Company name",
    "ct.form.phone": "Phone",
    "ct.form.email": "Email",
    "ct.form.typePh": "Choose…",
    "ct.form.sendMail": "Send by email",
    "ct.form.sendWa": "Send via WhatsApp",

    /* ------------------------------------------------- Maazaoui Transit */
    "nav.sub": "Customs broker",
    "nav.expertise": "Expertise",
    "nav.process": "Process",
    "nav.availability": "Availability",
    "nav.office": "The office",
    "nav.contact": "Contact",
    "nav.call": "Call",

    "hero.eyebrow": "Licensed customs broker · Tunisia · since 2010",
    "hero.title": 'Customs,<br><span class="em">without friction.</span>',
    "hero.lead": "Since 2010, Maazaoui Transit has supported importers and exporters in Tunisia: detailed declarations, foreign trade titles, tariff classification and follow-up through to release. One dedicated contact, reachable, who knows your file.",
    "hero.cta1": "Get in touch",
    "hero.cta2": "See our availability",
    "hero.stat1": "Office founded",
    "hero.stat2": "Years of expertise",
    "hero.stat3": "Files reviewed before filing",
    "hero.stat4unit": "&thinsp;d/7",
    "hero.stat4": "Reachable, Monday → Saturday",

    "exp.eyebrow": "Expertise",
    "exp.title": 'A profession of precision, <span class="em">practised with method.</span>',
    "exp.lead": "Every file carries regulatory responsibility. We handle it ourselves, document by document, from the first reading of the invoice to the release of the goods.",
    "exp.c1.t": "Import & export clearance",
    "exp.c1.p": "Preparation and filing of detailed declarations on SINDA, follow-up of the control circuit, settlement of duties and taxes, release and collection of goods.",
    "exp.c2.t": "Foreign trade titles",
    "exp.c2.p": "Preparation and filing of import and export titles through Tunisia TradeNet, coordination of bank domiciliation, follow-up of clearances and deadlines.",
    "exp.c3.t": "Tariff classification (HS code)",
    "exp.c3.p": "Determination of the tariff heading in the national customs nomenclature, origin analysis, anticipation of duties, taxes and prior formalities.",
    "exp.c3.note": "Classification carries legal responsibility: every heading is checked by the broker before filing.",
    "exp.c4.t": "Economic customs regimes",
    "exp.c4.p": "Temporary admission, inward processing, bonded warehouse, re-export: choice of the regime best suited to your flow and rigorous management of discharges.",
    "exp.c5.t": "Documents & compliance",
    "exp.c5.p": "Consistency checks of invoices, packing lists, bills of lading and air waybills, certificates of origin; preparation of technical import controls.",
    "exp.c6.t": "Advice & representation",
    "exp.c6.p": "Representation before customs offices, assistance in case of dispute or post-clearance audit, monitoring of the Customs Code and circulars.",

    "proc.eyebrow": "Method",
    "proc.title": 'From invoice to release, <span class="em">a readable process.</span>',
    "proc.lead": "You know at any time where your file stands, what is missing and what remains to be paid.",
    "proc.quote": "“An accurate declaration is prepared before data entry: in the careful reading of every document.”",
    "proc.cite": "How the office works",
    "proc.s1.t": "Receiving the file",
    "proc.s1.p": "Invoice, bill of lading or air waybill, packing list, certificate of origin. We check the consistency of every document before any data entry.",
    "proc.s2.t": "Analysis & classification",
    "proc.s2.p": "Determination of the tariff heading, the appropriate customs regime and prior formalities: foreign trade title, authorisations, technical controls.",
    "proc.s3.t": "Declaration",
    "proc.s3.p": "Entry and filing of the detailed declaration on SINDA, then follow-up of the control circuit assigned by customs until settlement.",
    "proc.s4.t": "Release & collection",
    "proc.s4.p": "Payment of duties and taxes, obtaining the release, coordination of collection and delivery of a complete, archivable file.",

    "av.eyebrow": "Availability",
    "av.title": 'Are we open? <span class="em">Answered in real time.</span>',
    "av.lead": "The status below is computed on Tunis time, taking into account national public holidays and exceptional closures.",
    "av.call": "Call the office",
    "av.week": "Current week",
    "av.note": "National public holidays are handled automatically; religious holidays (Eid, Mawlid…) are entered provisionally and confirmed once officially announced. Indicative hours: a call always confirms.",

    "off.eyebrow": "The office",
    "off.title": 'An independent office <span class="em">since 2010.</span>',
    "off.p1": "Maazaoui Transit is a customs brokerage office founded in 2010. We handle every file ourselves, without subcontracting or intermediaries: the person who reads your invoice is the one who files your declaration and answers your questions.",
    "off.p2": "This proximity is our method. It allows us to spot a documentary inconsistency early, choose the right regime and avoid the delays that cost dearly in storage and demurrage.",
    "off.v1.t": "Documentary rigour",
    "off.v1.p": "Every document is re-read before entry. No declaration leaves without human review.",
    "off.v2.t": "Responsiveness",
    "off.v2.p": "A direct contact, reachable during office hours and beyond for emergencies.",
    "off.v3.t": "Transparency",
    "off.v3.p": "Duties, taxes and fees itemised before filing. No surprise at collection.",
    "off.v4.t": "Confidentiality",
    "off.v4.p": "Your invoices, prices and suppliers stay between us.",
    "off.t1.t": "Office opens",
    "off.t1.p": "Creation of Maazaoui Transit, an independent customs brokerage office in Radès.",
    "off.t2.y": "2010 → today",
    "off.t2.t": "Import, export, economic regimes",
    "off.t2.p": "Support for SMEs, manufacturers and individuals across all operations: clearance, foreign trade titles, temporary admission, bonded warehouse.",
    "off.t3.y": "Recently",
    "off.t3.t": "Launch of By Ocean and Air Transport",
    "off.t3.p": "A sister company dedicated to international transport: sea freight, air freight, consolidation and door-to-door, with customs clearance built in.",
    "off.t3.link": "Discover",

    "por.eyebrow": "New",
    "por.title": 'Beyond the border, <span class="em">transport.</span>',
    "por.lead": "We have opened By Ocean and Air Transport: sea and air freight, consolidation, door-to-door. One team, from factory gate to customs release.",
    "por.kicker": "Sister company",
    "por.enter": "Enter the portal",
    "por.p1": "Sea freight FCL · LCL",
    "por.p2": "Air freight",
    "por.p3": "Consolidation",
    "por.p4": "Door-to-door",

    "ct.eyebrow": "Contact",
    "ct.title": 'Let\'s talk about your <span class="em">next file.</span>',
    "ct.lead": "By phone during office hours, by WhatsApp or by email at any time. Send your documents and we come back to you with a clear reading.",
    "ct.form.title": "Describe your need",
    "ct.form.type": "Type of operation *",
    "ct.form.t1": "Import",
    "ct.form.t2": "Export",
    "ct.form.t3": "Foreign trade title",
    "ct.form.t4": "Economic regime (temporary admission, warehouse…)",
    "ct.form.t5": "International transport",
    "ct.form.t6": "Other / advice",
    "ct.form.message": "Message *",
    "ct.form.messagePh": "Nature of the goods, origin, transport mode, deadlines…",
    "ct.form.hint": "* Required fields. For an accurate quote, attach the pro forma invoice and packing list to your message.",

    "ft.about": "Licensed customs brokerage office in Radès, independent since 2010. Clearance, foreign trade titles, economic regimes and advice.",
    "ft.sea": "Sea freight",
    "ft.air": "Air freight",
    "ft.lanes": "Lanes",

    /* ---------------------------------------- By Ocean and Air Transport */
    "t.nav.sub": "International transport",
    "t.nav.services": "Services",
    "t.nav.lanes": "Lanes",
    "t.nav.method": "Method",
    "t.nav.contact": "Contact",
    "t.nav.quote": "Request a quote",

    "t.hero.badge": "New company · Maazaoui Transit group",
    "t.hero.title": 'By sea, by air,<br><span class="em">right to your door.</span>',
    "t.hero.lead": "By Ocean and Air Transport organises your international shipments: FCL and LCL sea freight, air freight, consolidation and door-to-door delivery. Customs clearance is handled by Maazaoui Transit, within the same team.",
    "t.hero.cta1": "Request a quote",
    "t.hero.cta2": "See the lanes",
    "t.hero.coords": "Radès · Gulf of Tunis",
    "t.mode.sea": "Sea",
    "t.mode.seaSub": "FCL · LCL · 20' / 40' containers",
    "t.mode.air": "Air",
    "t.mode.airSub": "Express · standard · parcels and pallets",
    "t.mode.customs": "Customs clearance",
    "t.mode.customsSub": "By Maazaoui Transit · since 2010",

    "t.sv.eyebrow": "Services",
    "t.sv.title": 'One point of contact, <span class="em">from factory to release.</span>',
    "t.sv.lead": "We organise the transport, we track the goods and we clear them through customs. You only have one number to call.",
    "t.sv.sea.k": "Ocean",
    "t.sv.sea.t": "Sea freight",
    "t.sv.sea.p": "Full containers (FCL) and sea consolidation (LCL) to and from Radès and La Goulette. Booking, port-call tracking, documentation (B/L), coordination at the port.",
    "t.sv.air.k": "Air",
    "t.sv.air.t": "Air freight",
    "t.sv.air.p": "Urgent shipments and sensitive goods via Tunis-Carthage: booking on direct or connecting flights, air waybill, pick-up and fast delivery after clearance.",
    "t.sv.air.l1": "Express",
    "t.sv.air.l3": "Parcels · pallets",
    "t.sv.c1.t": "Consolidation",
    "t.sv.c1.p": "For volumes that do not fill a container: grouped with other shipments, regular departures, cost proportional to volume.",
    "t.sv.c2.t": "Door-to-door",
    "t.sv.c2.p": "Pick-up at the supplier, pre-carriage, main transport, customs clearance and final delivery in Tunisia: one quote, one tracking.",
    "t.sv.c3.t": "Integrated customs clearance",
    "t.sv.c3.p": "Every shipment is cleared by Maazaoui Transit, licensed customs broker since 2010: classification, declaration, settlement, release.",
    "t.sv.c3.link": "See the group's customs expertise",
    "t.sv.hint": "Scroll to explore",

    "t.ln.eyebrow": "Lanes",
    "t.ln.title": 'The corridors <span class="em">we operate.</span>',
    "t.ln.lead": "Indicative port-to-port or airport-to-airport transit times, excluding customs clearance. Other destinations are studied on request.",
    "t.ln.h1": "Origin → Destination",
    "t.ln.h2": "City",
    "t.ln.h3": "Mode",
    "t.ln.h4": "Indicative time",
    "t.ln.sea": "Sea",
    "t.ln.air": "Air",
    "t.ln.d1": "2 – 3 d",
    "t.ln.d2": "2 – 3 d",
    "t.ln.d3": "5 – 7 d",
    "t.ln.d4": "25 – 35 d",
    "t.ln.d5": "24 – 48 h",
    "t.ln.d6": "48 – 72 h",
    "t.ln.foot": "Exports from Tunis on the same corridors. Transit times vary with carrier, season and port calls.",

    "t.mt.eyebrow": "Method",
    "t.mt.title": 'Five steps, <span class="em">one single thread.</span>',
    "t.mt.s1.t": "Quote",
    "t.mt.s1.p": "Nature, volume, weight, Incoterm and desired lead time. You receive a detailed quote, transport and customs included.",
    "t.mt.s2.t": "Pick-up",
    "t.mt.s2.p": "Coordination with your supplier or factory, pre-carriage to the port or airport of departure.",
    "t.mt.s3.t": "Transport",
    "t.mt.s3.p": "Booking, transport documents (B/L, AWB), port-call tracking and proactive information in case of disruption.",
    "t.mt.s4.t": "Customs clearance",
    "t.mt.s4.p": "Classification, detailed declaration, settlement and release by the group's customs broker.",
    "t.mt.s5.t": "Delivery",
    "t.mt.s5.p": "On-carriage to your warehouse or shop, hand-over of the complete file.",

    "t.bk.eyebrow": "The group",
    "t.bk.title": 'Behind every shipment, <span class="em">a customs broker.</span>',
    "t.bk.lead": "By Ocean and Air Transport was born from the Maazaoui Transit office, active since 2010. Find the customs expertise, opening hours and contact details of the office.",
    "t.bk.kicker": "Since 2010",
    "t.bk.enter": "Back to the office",

    "t.ct.eyebrow": "Quote",
    "t.ct.title": 'Describe the shipment, <span class="em">we price it.</span>',
    "t.ct.lead": "Goods, origin, destination, volume or weight, Incoterm: the more precise the brief, the more accurate the quote.",
    "t.ct.form.title": "Quote request",
    "t.ct.form.mode": "Transport mode *",
    "t.ct.form.m1": "Sea — full container (FCL)",
    "t.ct.form.m2": "Sea — consolidation (LCL)",
    "t.ct.form.m3": "Air",
    "t.ct.form.m4": "Door-to-door",
    "t.ct.form.m5": "I don't know yet",
    "t.ct.form.brief": "Shipment *",
    "t.ct.form.briefPh": "Goods, origin → destination, volume / weight, Incoterm, desired date…",
    "t.ct.form.hint": "* Required fields. If possible, attach the pro forma invoice and packing list.",

    "t.ft.about": "Freight forwarder and international transport organiser, sister company of Maazaoui Transit. Sea freight, air freight, consolidation, door-to-door.",
    "t.ft.expertise": "Customs expertise",
    "t.ft.hours": "Office hours",
    "t.ft.group2": "Maazaoui Transit group",
  };

  const DICT = { en: EN };
  const originals = new WeakMap(); // élément → contenu FR d'origine
  const originalAttrs = new WeakMap(); // élément → { attr: valeur FR }
  let current = document.documentElement.lang === "en" ? "en" : "fr";

  function captureOriginals() {
    for (const el of document.querySelectorAll("[data-i18n]")) {
      if (!originals.has(el)) originals.set(el, el.innerHTML);
    }
    for (const el of document.querySelectorAll("[data-i18n-attr]")) {
      if (originalAttrs.has(el)) continue;
      const map = {};
      for (const pair of el.dataset.i18nAttr.split("|")) {
        const [attr] = pair.split(":");
        if (attr) map[attr.trim()] = el.getAttribute(attr.trim());
      }
      originalAttrs.set(el, map);
    }
  }

  function apply(lang, opts) {
    const options = opts || {};
    const target = lang === "en" ? "en" : "fr";
    captureOriginals();
    const dict = DICT[target] || {};

    for (const el of document.querySelectorAll("[data-i18n]")) {
      const key = el.dataset.i18n;
      const fr = originals.get(el);
      const value = target === "fr" ? fr : key in dict ? dict[key] : fr;
      if (el.innerHTML !== value) el.innerHTML = value;
    }

    for (const el of document.querySelectorAll("[data-i18n-attr]")) {
      const frAttrs = originalAttrs.get(el) || {};
      for (const pair of el.dataset.i18nAttr.split("|")) {
        const [attrRaw, keyRaw] = pair.split(":");
        const attr = (attrRaw || "").trim();
        const key = (keyRaw || "").trim();
        if (!attr) continue;
        const value = target === "fr" ? frAttrs[attr] : key in dict ? dict[key] : frAttrs[attr];
        if (value != null) el.setAttribute(attr, value);
      }
    }

    document.documentElement.lang = target;
    current = target;
    if (!options.silent) document.dispatchEvent(new CustomEvent("mz:lang", { detail: { lang: target } }));
  }

  MZ.i18n = { apply, current: () => current, dict: DICT };
})();
