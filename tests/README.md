# Tests de bout en bout

Deux suites Playwright (Chromium) vérifient le site servi localement :

```bash
python3 -m http.server 8080 --bind 127.0.0.1 &      # ou : npx serve -l 8080 .
npm i -D playwright && npx playwright install chromium   # une seule fois
node tests/e2e/site.test.mjs            # fonctionnel : disponibilité, langue, portail, mobile, 404
node tests/e2e/scroll-effects.test.mjs  # effets de défilement : hero, molette, empilement, éclosion, rail…
```

Variables : `BASE_URL` (défaut `http://127.0.0.1:8080`), `SHOTS_DIR` (dossier de captures, facultatif).
Les deux suites se terminent par `ALL CHECKS PASSED` ou listent les problèmes et sortent avec le code 1.
