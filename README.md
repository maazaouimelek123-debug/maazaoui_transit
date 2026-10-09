# Maazaoui Transit — site vitrine

Site statique (HTML / CSS / JavaScript, sans framework ni dépendance) présentant :

- **Maazaoui Transit** — bureau de commissionnaire en douane agréé, indépendant depuis 2010 (`index.html`) ;
- **By Ocean and Air Transport** — société sœur de transport international, maritime et aérien (`transport.html`), reliée par un « portail » animé.

## Fonctionnalités

| Fonction | Détail |
| --- | --- |
| Disponibilité en temps réel | État ouvert / fermé / ouvre bientôt calculé à l'heure de Tunis (`Africa/Tunis`), horaires d'été, jours fériés fixes, fêtes mobiles, fermetures exceptionnelles, barre des 24 h, tableau de la semaine. |
| Deux univers, un portail | Transition circulaire fluide entre les deux sites depuis le point cliqué, sans rechargement visible. |
| Bilingue FR / EN | Bascule instantanée, mémorisée sur l'appareil. Le français est la langue par défaut et reste lisible sans JavaScript. |
| Design génératif | Champ de flux (courants / corridors) sur la page douane, vagues et trajectoire aérienne sur la page transport. Pause automatique hors écran, rendu statique si l'utilisateur préfère réduire les animations. |
| Expérience de défilement | Défilement inertiel à la molette, hero qui recule dans la profondeur, cartes empilées pour le parcours, section de services horizontale épinglée (transport), texte qui s'allume mot à mot, teinte d'ambiance évolutive, barre de progression. Désactivable dans `config.js` (`ui.smoothScroll`, `ui.scrollEffects`) et automatiquement coupé si l'utilisateur préfère réduire les animations. |
| Plongée dans le champ | Sur la page d'accueil, le champ de particules est une couche fixe derrière tout le contenu : il s'accélère et zoome à mesure que l'on descend. Chaque bloc (`data-bloom`) naît d'un point jaune pulsant et s'ouvre en cercle vers le lecteur, avec une salve de particules dans le champ au moment de l'éclosion. Un chemin pointillé doré relie les points d'éclosion à travers la page et s'illumine au passage ; un rail à gauche (`data-rail`) sert de navigation. Avec la profondeur, le courant du champ devient radial (sensation d'avancer). |
| Contact sans serveur | Le formulaire compose un e-mail ou un message WhatsApp prêt à envoyer : aucune donnée n'est stockée. Boutons « copier » pour le téléphone, l'e-mail et le code Plus. Carte Google Maps intégrée depuis les coordonnées de la configuration, sans clé API. |
| Référencement | Balises Open Graph, données structurées (schema.org `LocalBusiness` / `Organization`), `sitemap.xml`, `robots.txt`, manifeste. |
| Accessibilité | Lien d'évitement, navigation clavier, libellés ARIA, `prefers-reduced-motion`, contrastes vérifiés sur fond sombre. |

## Données du bureau

Toutes les données modifiables sont dans **`assets/js/config.js`** :

| Donnée | Valeur en place |
| --- | --- |
| Téléphone / WhatsApp | +216 99 976 872 |
| E-mail | maazaouitransit@gmail.com |
| Adresse | Radès, Ben Arous · code Plus **Q75J+48M** (36,757838 N / 10,280797 E) — rue et numéro facultatifs : les saisir en `contact.address.line1` et déplacer « Radès » en `line2` |
| Agrément | n° 776 |
| Horaires | Lundi → vendredi 08:00–17:00 · samedi 08:00–14:00 · dimanche fermé |

À maintenir dans le temps :

1. `hours.movingHolidays` — fêtes religieuses (le bureau ferme pour l'Aïd). 2027 est pré-rempli d'après les projections astronomiques : **confirmer les dates dès l'annonce officielle du Mufti**, puis saisir l'année suivante ;
2. `hours.closures` — congés exceptionnels ; `hours.overrides` — périodes à horaires particuliers (Ramadan…) ;
3. `hours.seasons` — horaires d'été, désactivés (un exemple commenté est fourni) ;
4. `transport.*` — coordonnées propres à By Ocean and Air Transport, si elles diffèrent un jour ;
5. les horaires dans les données structurées de `index.html` (`openingHoursSpecification`) doivent refléter `config.js` ;
6. l'URL du site dans `robots.txt` et `sitemap.xml` si un nom de domaine personnalisé est utilisé ;
7. les visuels de partage `assets/img/og-cover.png` et `assets/img/og-cover-transport.png` (1200 × 630) sont fournis ; les régénérer si le slogan change.

## Mise en ligne (GitHub Pages)

Le site est publié sur <https://maazaouimelek123-debug.github.io/maazaoui_transit/>.

1. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions** (déjà fait).
2. Le workflow `.github/workflows/pages.yml` publie automatiquement à chaque push sur la branche par défaut du dépôt (actuellement `claude/wizardly-gates-91bh18`) et sur `main` ; il peut aussi être lancé à la main (**Actions → Deploy to GitHub Pages → Run workflow**).
3. L'environnement `github-pages` n'autorise les déploiements que depuis la branche par défaut : pour publier depuis `main`, la définir comme branche par défaut (**Settings → Branches**).

Modifier `assets/js/config.js` directement sur la branche par défaut (horaires, fermetures, contacts) suffit donc à mettre le site à jour. Un nom de domaine personnalisé peut être ajouté dans les réglages Pages.

## Développement local

Le site fonctionne en ouvrant directement `index.html`, mais un petit serveur est recommandé :

```bash
npx serve .        # ou : python3 -m http.server 8080
```

## Structure

```
index.html                 Maazaoui Transit
transport.html             By Ocean and Air Transport
404.html                   Page d'erreur
assets/css/base.css        Jetons de design (deux thèmes), reset, typographie
assets/css/components.css  Composants partagés (navigation, cartes, portail, formulaire…)
assets/css/customs.css     Mise en page de la page douane
assets/css/ocean.css       Mise en page de la page transport
assets/css/scroll.css      Effets de défilement (actifs sous html.fx)
assets/js/config.js        ★ Données métier modifiables
assets/js/i18n.js          Dictionnaire anglais et bascule de langue
assets/js/availability.js  Moteur d'horaires (fuseau, saisons, fériés)
assets/js/canvas-flow.js   Animation « champ de flux »
assets/js/canvas-ocean.js  Animation « vagues et trajectoire aérienne »
assets/js/core.js          Orchestration de l'interface
assets/js/scroll.js        Moteur des effets de défilement (une seule boucle rAF)
```

## Limites connues

- Les fêtes religieuses (dates mobiles) ne sont pas calculées : elles sont saisies à titre prévisionnel dans `hours.movingHolidays` (2027 pré-rempli) et doivent être confirmées après l'annonce officielle.
- Si l'embed Google Maps ne charge pas (réseau bloqué), la page d'erreur de l'iframe masque le repli quadrillé : limite navigateur, sans incidence en production.
- Le formulaire n'envoie rien par lui-même : il ouvre la messagerie ou WhatsApp du visiteur. Un service d'envoi (Formspree, Netlify Forms…) peut être branché ultérieurement.
- Les polices sont chargées depuis Google Fonts ; sans connexion, le site bascule sur les polices système.
