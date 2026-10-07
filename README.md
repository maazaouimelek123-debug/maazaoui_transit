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
| Expérience de défilement | Défilement inertiel à la molette, hero épinglé qui recule sous le « rideau » des sections, cartes empilées pour le parcours, section de services horizontale épinglée (transport), texte qui s'allume mot à mot, teinte d'ambiance évolutive, barre de progression. Désactivable dans `config.js` (`ui.smoothScroll`, `ui.scrollEffects`) et automatiquement coupé si l'utilisateur préfère réduire les animations. |
| Contact sans serveur | Le formulaire compose un e-mail ou un message WhatsApp prêt à envoyer : aucune donnée n'est stockée. Boutons « copier » pour le téléphone et l'e-mail. |
| Référencement | Balises Open Graph, données structurées (schema.org `LocalBusiness` / `Organization`), `sitemap.xml`, `robots.txt`, manifeste. |
| Accessibilité | Lien d'évitement, navigation clavier, libellés ARIA, `prefers-reduced-motion`, contrastes vérifiés sur fond sombre. |

## Données du bureau

Toutes les données modifiables sont dans **`assets/js/config.js`** :

| Donnée | Valeur en place |
| --- | --- |
| Téléphone / WhatsApp | +216 99 976 872 |
| E-mail | maazaouitransit@gmail.com |
| Adresse | Radès, Ben Arous — rue et numéro **à compléter** : les saisir en `contact.address.line1` et déplacer « Radès » en `line2` |
| Agrément | n° 776 |
| Horaires | Lundi → vendredi 08:00–17:00 · samedi 08:00–14:00 · dimanche fermé |

À maintenir dans le temps :

1. `hours.movingHolidays` — fêtes religieuses de l'année (Aïd, Mouled…), à saisir après l'annonce officielle ;
2. `hours.closures` — congés exceptionnels ; `hours.overrides` — périodes à horaires particuliers (Ramadan…) ;
3. `hours.seasons` — horaires d'été, désactivés (un exemple commenté est fourni) ;
4. `transport.*` — coordonnées propres à By Ocean and Air Transport, si elles diffèrent un jour ;
5. les horaires dans les données structurées de `index.html` (`openingHoursSpecification`) doivent refléter `config.js` ;
6. l'URL du site dans `robots.txt` et `sitemap.xml` si un nom de domaine personnalisé est utilisé ;
7. les visuels de partage `assets/img/og-cover.png` et `assets/img/og-cover-transport.png` (1200 × 630) sont fournis ; les régénérer si le slogan change.

## Mise en ligne (GitHub Pages)

1. Fusionner la branche dans `main`.
2. Dans le dépôt : **Settings → Pages → Build and deployment → Source : GitHub Actions**.
3. Le workflow `.github/workflows/pages.yml` publie automatiquement à chaque push sur `main`.

Le site est alors disponible sur `https://<compte>.github.io/maazaoui_transit/`. Un nom de domaine personnalisé peut être ajouté dans les mêmes réglages.

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

- Les fêtes religieuses (dates mobiles) ne sont pas calculées : elles se saisissent dans `hours.movingHolidays` après l'annonce officielle.
- Le formulaire n'envoie rien par lui-même : il ouvre la messagerie ou WhatsApp du visiteur. Un service d'envoi (Formspree, Netlify Forms…) peut être branché ultérieurement.
- Les polices sont chargées depuis Google Fonts ; sans connexion, le site bascule sur les polices système.
