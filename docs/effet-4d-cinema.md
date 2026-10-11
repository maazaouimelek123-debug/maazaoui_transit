# Effet 4D — film d'introduction piloté par le défilement

Cahier des charges établi à partir de la vidéo de référence (TikTok « Nothing beats Claude 3D webdesign », site *VELA ARMONI*), puis sa mise en œuvre sur le site Maazaoui Transit.

## 1. Ce que montre la référence

| Moment | Ce qu'on voit | Principe |
| --- | --- | --- |
| 0–2 s | Au-dessus des nuages au lever du soleil, aucune interface, seulement « SCROLL » en bas | La page est une **scène plein écran** ; rien ne défile, c'est la caméra qui avance |
| 3–4 s | La caméra plonge à travers les nuages | Transition **continue** (aucune coupe), le blanc des nuages sert de fondu |
| 5–6 s | Une ville au crépuscule, une tour, une accroche discrète | Révélation du lieu |
| 7–8 s | « VELA ARMONI » en très grand, verre/lumière, sur la façade ; la caméra traverse la fenêtre | **Titre de marque géant** en surimpression, la caméra continue dessous |
| 9–19 s | Chapitres : *Residences*, *Horology*, *Yachts*, *Aviation* | Chaque chapitre = une scène plein écran + **titre en bas à gauche**, sur-titre, deux lignes, filet |
| 16–17 s | Course sur une piste, flou de vitesse, puis un jet décolle | **Accélérations** entre chapitres : traînées, flou |
| Partout | Fine ligne verticale à droite | **Progression** du film |

La « 4D » : trois dimensions d'espace (une caméra qui vole dans un décor) et le **défilement comme quatrième dimension** (le temps du film). Remonter la page fait reculer le film.

## 2. Termes (cahier des charges)

1. **Scène épinglée** : une section haute (≈ 7,5 écrans) dont la scène reste fixe à l'écran (`position: sticky`) ; la progression du défilement (0 → 1) pilote le film.
2. **Plan-séquence** : une seule caméra, sans coupe ; les changements de lieu se font par mouvement (plongée, survol, virage, montée).
3. **Inertie** : la caméra rejoint la position demandée avec un léger amorti (sensation cinéma, aucun à-coup à la molette ou au doigt).
4. **Ouverture muette** : premier écran sans texte hormis « Défiler » et « Passer l'intro ».
5. **Titre de marque** géant au centre lors de la révélation du port.
6. **Chapitres** : sur-titre numéroté, titre, deux lignes, filet ; apparition/disparition en fondu, montée et netteté (flou → net) liées au défilement.
7. **Vitesse** : traînées radiales et élargissement de la focale pendant les accélérations.
8. **Progression** : ligne verticale fine à droite, une graduation par chapitre, allumée au passage.
9. **Sortie** : fondu vers le fond du site, puis la page reprend (hero, disponibilité, contact). Le rail de navigation est masqué pendant le film.
10. **Accès direct** : « Passer l'intro » et tous les liens du menu mènent au contenu sans regarder le film.
11. **Accessibilité / sobriété** : sans JavaScript ou si l'appareil demande moins d'animations, pas de film, la page commence au hero. Bilingue FR/EN.
12. **Performance** : rien à télécharger hormis Three.js (CDN) ; textures générées ; rendu suspendu hors écran ; densités réduites sur mobile ; le champ de particules de la page est mis en pause pendant le film.
13. **Remplaçable par de vraies images** : la même mécanique doit pouvoir lire une vidéo image par image (voir § 5).

## 3. Le film de Maazaoui Transit (storyboard)

| Progression | Plan | Surimpression |
| --- | --- | --- |
| 0,00 – 0,12 | Au-dessus d'une mer de nuages, soleil bas sur le golfe | « Défiler » |
| 0,12 – 0,24 | Plongée à travers les nuages (blanc) | — |
| 0,24 – 0,40 | Le port de Radès au crépuscule : quai, portiques, piles de conteneurs, ville en lumières | *Commissionnaire en douane agréé · Radès · depuis 2010* / **MAAZAOUI TRANSIT** |
| 0,43 – 0,58 | Au ras du sol, entre les piles de conteneurs, vers le soleil | **01 — Douane · Dédouanement** |
| 0,62 – 0,77 | Le long d'un porte-conteneurs qui appareille | **02 — Mer · Fret maritime** |
| 0,81 – 0,94 | Sur la piste de Tunis-Carthage derrière un avion, roulage, décollage | **03 — Air · Fret aérien** |
| 0,95 – 1,00 | L'avion monte vers le soleil, fondu | *Un seul interlocuteur, du départ usine à la mainlevée.* |

## 4. Mise en œuvre

| Fichier | Rôle |
| --- | --- |
| `index.html` | Section `#film` (`.cinema`) avant le hero : scène, surimpressions (`data-from` / `data-to` = plage de progression), ligne de progression, « Passer l'intro » |
| `assets/js/cinema.js` | Moteur : progression, inertie, surimpressions, traînées, et scène 3D Three.js (ciel, mer, nuages, port, navires, piste, avion) ; variante vidéo |
| `assets/css/cinema.css` | Scène, étalonnage (vignette, dégradé bas), typographie des chapitres, progression |
| `assets/js/config.js` | `cinema.enabled`, `cinema.length` (durée en écrans), `cinema.video` |
| `assets/js/i18n.js` | Textes anglais (`cine.*`) |
| `assets/js/fourd.js` | Après le film : les sections s'inclinent selon la vitesse et repartent en profondeur en sortant |

Repères : la caméra suit des images-clés (`KEYS` dans `cinema.js` : progression → position, visée, focale) ; l'atmosphère suit `ENV` (brume, exposition). Pour allonger un chapitre, écarter ses images-clés et ses `data-from` / `data-to`.

Diagnostic : `index.html?diag=1` indique le mode du film (3D, vidéo, affiche). `MZ.cinema.still(0.5, 1280, 720)` renvoie l'image du film à mi-parcours (JPEG).

## 5. Passer à des images réelles (comme la référence)

La référence utilise un film pré-rendu (images générées par IA ou tournées au drone). La même scène peut lire une vidéo à la place de la 3D :

1. **Produire les plans** (Veo, Kling, Runway, Sora… ou drone), en 16:9, 5 à 8 s chacun, mouvements de caméra lents et continus, même heure dorée. Exemples de consignes (en anglais, langue la mieux comprise par ces outils) :
   - *Cinematic aerial shot above a sea of clouds at sunrise over the Mediterranean, camera slowly gliding forward then diving down into the clouds, golden hour, photorealistic, no text.*
   - *Camera emerges below the clouds revealing a container port at dusk on the Gulf of Tunis, ship-to-shore cranes, stacked containers, city lights, slow descending drone shot, photorealistic.*
   - *Low drone shot flying between tall stacks of colorful shipping containers toward the setting sun, smooth forward motion, cinematic.*
   - *Drone shot tracking alongside a large container ship leaving port at sunset, calm sea, photorealistic.*
   - *Camera low on an airport runway behind a cargo jet accelerating for takeoff at sunset, motion blur, then following it into the sky, cinematic.*
   Enchaîner chaque plan sur la dernière image du précédent pour garder un plan-séquence.
2. **Monter** les plans bout à bout (20 à 30 s au total), sans titres (les titres restent en HTML, bilingues).
3. **Encoder pour la lecture image par image** (une image-clé par image, sinon le défilement saccade) :
   ```bash
   ffmpeg -i montage.mp4 -vf scale=1920:-2 -c:v libx264 -preset slow -crf 23 -x264-params keyint=1:scenecut=0 -an -movflags +faststart assets/video/voyage.mp4
   ```
   Compter 15 à 30 Mo ; une version 1280 px allège le mobile.
4. Dans `config.js` : `cinema.video: "assets/video/voyage.mp4"`, puis caler les `data-from` / `data-to` des chapitres sur les moments du montage.
