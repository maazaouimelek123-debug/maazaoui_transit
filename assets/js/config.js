/* =============================================================================
   MAAZAOUI TRANSIT — CONFIGURATION DU SITE
   -----------------------------------------------------------------------------
   Ce fichier est le SEUL endroit à modifier pour mettre à jour :
     • les coordonnées (téléphone, WhatsApp, e-mail, adresse) ;
     • les horaires d'ouverture (réguliers, été, Ramadan, congés) ;
     • les jours fériés (fixes et mobiles) ;
     • les informations de la société de transport.

   Les valeurs marquées « À COMPLÉTER » sont des espaces réservés : elles
   doivent être remplacées avant la mise en ligne.
   ========================================================================== */

window.MZ = window.MZ || {};

MZ.SITE = {
  /* -------------------------------------------------------------- Interface */
  ui: {
    /* Défilement inertiel à la molette (bureau uniquement). */
    smoothScroll: true,
    /* Effets pilotés par le défilement (hero épinglé, cartes empilées…). */
    scrollEffects: true,
  },

  /* ---------------------------------------------------------------- Marque */
  brand: {
    name: "Maazaoui Transit",
    since: 2010,
    tagline: { fr: "Commissionnaire en douane agréé", en: "Licensed customs broker" },
    /* Numéro d'agrément de commissionnaire en douane */
    license: { fr: "Agrément n° 776", en: "License no. 776" },
    city: "Radès",
    country: { fr: "Tunisie", en: "Tunisia" },
  },

  /* ----------------------------------------------------------- Coordonnées */
  contact: {
    /* Numéro affiché (avec espaces) et numéro brut (sans espaces, indicatif inclus) */
    phone: "+216 99 976 872",
    phoneRaw: "+21699976872",
    /* Numéro WhatsApp au format international sans « + » ni espaces */
    whatsapp: "21699976872",
    email: "maazaouitransit@gmail.com",
    /* Adresse du bureau. À COMPLÉTER : quand la rue et le numéro seront connus, les mettre en ligne 1
       et déplacer la ville en ligne 2 (ex. line2: "Radès, Ben Arous · Tunisie"). */
    address: {
      line1: { fr: "Radès", en: "Radès" },
      line2: { fr: "Ben Arous, Tunisie", en: "Ben Arous, Tunisia" },
    },
    /* Requête utilisée pour le lien « Itinéraire » (Google Maps) */
    mapsQuery: "Maazaoui Transit, Radès, Tunisie",
  },

  /* -------------------------------------------------- Société de transport */
  transport: {
    name: "By Ocean and Air Transport",
    short: "By Ocean & Air",
    /* Laisser vide pour réutiliser les coordonnées de Maazaoui Transit */
    phone: "",
    phoneRaw: "",
    whatsapp: "",
    email: "",
  },

  /* ------------------------------------------------------------- Horaires */
  hours: {
    timeZone: "Africa/Tunis",

    /* Horaires réguliers. Format "HH:MM". Un tableau vide = fermé. */
    regular: {
      mon: [["08:00", "17:00"]],
      tue: [["08:00", "17:00"]],
      wed: [["08:00", "17:00"]],
      thu: [["08:00", "17:00"]],
      fri: [["08:00", "17:00"]],
      sat: [["08:00", "14:00"]],
      sun: [],
    },

    /* Saisons récurrentes (chaque année). from/to au format "MM-JJ", bornes incluses.
       Exemple d'horaires d'été en séance unique (désactivé : le bureau garde ses horaires toute l'année) :
       {
         label: { fr: "Horaires d'été · séance unique", en: "Summer hours · single session" },
         from: "07-01", to: "08-31",
         days: { mon: [["07:30","14:00"]], tue: [["07:30","14:00"]], wed: [["07:30","14:00"]],
                 thu: [["07:30","14:00"]], fri: [["07:30","14:00"]], sat: [], sun: [] }
       }
    */
    seasons: [],

    /* Périodes ponctuelles (dates complètes "AAAA-MM-JJ"), prioritaires sur les saisons.
       Exemple pour le Ramadan :
       {
         label: { fr: "Horaires Ramadan", en: "Ramadan hours" },
         from: "2026-02-18", to: "2026-03-19",
         days: { mon: [["08:30","15:00"]], tue: [["08:30","15:00"]], wed: [["08:30","15:00"]],
                 thu: [["08:30","15:00"]], fri: [["08:30","15:00"]], sat: [], sun: [] }
       }
    */
    overrides: [],

    /* Fermetures exceptionnelles (congés). Prioritaires sur tout le reste.
       Exemple : { label: { fr: "Congé annuel", en: "Annual leave" }, from: "2026-08-10", to: "2026-08-16" }
    */
    closures: [],

    /* Jours fériés nationaux à date fixe (Tunisie). */
    holidays: [
      { date: "01-01", fr: "Nouvel An", en: "New Year's Day" },
      { date: "03-20", fr: "Fête de l'Indépendance", en: "Independence Day" },
      { date: "04-09", fr: "Journée des Martyrs", en: "Martyrs' Day" },
      { date: "05-01", fr: "Fête du Travail", en: "Labour Day" },
      { date: "07-25", fr: "Fête de la République", en: "Republic Day" },
      { date: "08-13", fr: "Fête de la Femme", en: "Women's Day" },
      { date: "10-15", fr: "Fête de l'Évacuation", en: "Evacuation Day" },
      { date: "12-17", fr: "Fête de la Révolution", en: "Revolution Day" },
    ],

    /* Fêtes religieuses (dates mobiles, à saisir chaque année après annonce officielle).
       Exemple : { date: "2026-03-20", fr: "Aïd el-Fitr", en: "Eid al-Fitr" }
    */
    movingHolidays: [],

    /* Seuils d'affichage « ouvre bientôt » / « ferme bientôt » (minutes). */
    thresholds: { openingSoon: 60, closingSoon: 30 },
  },
};
