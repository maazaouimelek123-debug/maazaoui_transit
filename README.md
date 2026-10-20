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
| Effet 4D : le film d'ouverture | Trois dimensions d'espace, et le défilement comme quatrième. Le haut de l'accueil est une scène plein écran épinglée (`#film`, `cinema.js`, Three.js) : défiler fait avancer une caméra dans un plan-séquence en 3D temps réel, le voyage d'une marchandise. Au-dessus des nuages à l'aube, plongée à travers les nuages, le port de Radès au crépuscule sous le titre **MAAZAOUI TRANSIT**, puis trois chapitres titrés en bas à gauche : *Dédouanement* (au ras des piles de conteneurs), *Fret maritime* (le long d'un porte-conteneurs), *Fret aérien* (sur la piste de Tunis-Carthage, décollage). Inertie de caméra, traînées de vitesse, ligne de progression à droite, « Passer l'intro » (la caméra se place directement, sans rejouer le film). À la fin, comme les blocs de la page, un point jaune naît au centre et s'ouvre en cercle doré sur le reste du site. Remonter fait reculer le film. Cahier des charges, storyboard et passage à une vidéo réelle : [`docs/effet-4d-cinema.md`](docs/effet-4d-cinema.md). Réglages dans `config.js` (`cinema.enabled`, `cinema.length`, `cinema.video`). |
| Contenu en volume | Après le film, les sections s'inclinent selon la vitesse de défilement et repartent dans la profondeur en sortant par le haut ; le hero bascule en arrière, les blocs arrivent inclinés (`fourd.js`, désactivable par `ui.fourD`). |
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

## Mise en ligne (Netlify)

Le site est hébergé sur **Netlify**, relié au dépôt GitHub : chaque push sur la branche de production choisie dans Netlify publie le site en une minute environ. La configuration est dans `netlify.toml` :

- `scripts/build.sh` copie le site dans `dist/` (sans compilation), ajoute `?v=<commit>` aux feuilles de style et scripts, inscrit le commit dans `<meta name="mz-build">` et remplace l'adresse publique (aperçus de partage `og:url` / `og:image`, `sitemap.xml`, `robots.txt`) par l'URL du site Netlify (domaine personnalisé compris, variable `URL` fournie par Netlify) ;
- en-têtes de sécurité et cache long pour `assets/css` et `assets/js` (sans risque : toujours référencés avec `?v=`).

Modifier `assets/js/config.js` directement sur GitHub (horaires, fermetures, contacts) suffit donc à mettre le site à jour. Un domaine personnalisé s'ajoute dans Netlify (Domain management) ; rien à changer dans le code.

GitHub Pages reste disponible en secours : **Actions → Deploy to GitHub Pages → Run workflow** (dépôt public et Settings → Pages → Source : GitHub Actions). Il utilise le même script avec l'adresse `https://maazaouimelek123-debug.github.io/maazaoui_transit`.

## Animations réduites, appareils lents, anciens navigateurs

- Si le système du visiteur demande la réduction des animations (iOS « Réduire les animations », Android « Supprimer les animations », Windows « Effets d'animation » désactivés), le site s'affiche en version calme et un bandeau discret propose **« Activer les effets »**. Le choix est mémorisé (`localStorage` `mz:fx` = `on` ou `off`) et le bandeau permet de revenir au mode calme.
- Si l'appareil peine (moins d'environ 22 images par seconde mesurées après le chargement), la classe `lite` retire le grain en fusion et allège le flou de fond.
- Une erreur de script au démarrage ne laisse jamais la page vide : chaque module de `core.js` est isolé, et un échec dans `scroll.js` retire la classe `fx` (contenu visible sans effets). Un échec dans `fourd.js` retire seulement la classe `fourd` : la plongée classique reste. Si Three.js ne se charge pas (réseau, WebGL absent), le film est retiré et la page commence au hero ; si le visiteur est déjà dans le film, une affiche (ciel d'aube) garde les titres. Les erreurs sont consignées pour le diagnostic ci-dessous.
- Sans JavaScript ou avec réduction des animations, il n'y a pas de film : la page commence au hero, comme avant.
- Les raccourcis CSS récents (`inset`, `padding-block`, `margin-inline`, `aspect-ratio`) ont un repli explicite pour les navigateurs antérieurs à 2021.

## Diagnostic à distance

Si l'effet de plongée ne s'affiche pas chez un visiteur, lui faire ouvrir l'adresse du site suivie de `?diag=1` (par exemple `https://<site>.netlify.app/?diag=1`) : un panneau analyse son navigateur (version servie, réglage « réduire les animations », effets actifs, éclosion des blocs au défilement, cache périmé, erreurs de script) et propose de copier le rapport. Le panneau est chargé uniquement avec `?diag=1` (`assets/js/diag.js`) et n'envoie rien.

À chaque déploiement, `scripts/build.sh` ajoute `?v=<commit>` aux feuilles de style et scripts et inscrit le commit dans `<meta name="mz-build">` : les navigateurs rechargent toujours la version du jour.

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
assets/css/fourd.css       Plans inclinés après le film (actifs sous html.fourd)
assets/css/cinema.css      Film d'ouverture : scène, titres, progression (actifs sous html.has-film)
assets/js/config.js        ★ Données métier modifiables
assets/js/i18n.js          Dictionnaire anglais et bascule de langue
assets/js/availability.js  Moteur d'horaires (fuseau, saisons, fériés)
assets/js/canvas-flow.js   Animation « champ de flux »
assets/js/canvas-ocean.js  Animation « vagues et trajectoire aérienne »
assets/js/core.js          Orchestration de l'interface
assets/js/scroll.js        Moteur des effets de défilement (une seule boucle rAF)
assets/js/cinema.js        Effet 4D : film 3D piloté par le défilement (Three.js), variante vidéo
assets/js/fourd.js         Sections en volume après le film
docs/effet-4d-cinema.md    Cahier des charges de l'effet 4D (analyse de la référence, storyboard)
```

## Limites connues

- Les fêtes religieuses (dates mobiles) ne sont pas calculées : elles sont saisies à titre prévisionnel dans `hours.movingHolidays` (2027 pré-rempli) et doivent être confirmées après l'annonce officielle.
- Si l'embed Google Maps ne charge pas (réseau bloqué), la page d'erreur de l'iframe masque le repli quadrillé : limite navigateur, sans incidence en production.
- Le formulaire n'envoie rien par lui-même : il ouvre la messagerie ou WhatsApp du visiteur. Un service d'envoi (Formspree, Netlify Forms…) peut être branché ultérieurement.
- Les polices sont chargées depuis Google Fonts ; sans connexion, le site bascule sur les polices système.
