#!/usr/bin/env bash
# =============================================================================
# Préparation du site pour la mise en ligne (Netlify : build.command ; GitHub Pages :
# workflow). Aucune compilation : on copie les fichiers du site dans dist/ puis on y
# inscrit l'empreinte de version et l'adresse publique.
#   • ?v=<commit> sur les feuilles de style et scripts du site, <meta name="mz-build"> = commit
#     (les navigateurs rechargent toujours la version du jour ; ?diag=1 l'affiche) ;
#   • adresse absolue du site (aperçus de partage og:url / og:image, sitemap, robots) :
#     $SITE_URL, ou $URL fourni par Netlify (domaine personnalisé s'il y en a un).
# Usage : bash scripts/build.sh [dossier-de-sortie]   (défaut : dist)
# =============================================================================
set -euo pipefail
cd "$(dirname "$0")/.."
out="${1:-dist}"

sha="${COMMIT_REF:-${GITHUB_SHA:-}}"   # Netlify : COMMIT_REF ; GitHub Actions : GITHUB_SHA
v="${sha:0:8}"
[ -n "$v" ] || v="$(date -u +%Y%m%d%H%M)"
base="${SITE_URL:-${URL:-}}"
base="${base%/}"
old="https://maazaouimelek123-debug.github.io/maazaoui_transit"

rm -rf "$out"
mkdir -p "$out"
cp -R index.html transport.html 404.html manifest.webmanifest robots.txt sitemap.xml assets "$out"/

for f in "$out"/index.html "$out"/transport.html "$out"/404.html; do
  sed -i -E "s#(assets/(css|js)/[A-Za-z0-9_.-]+\.(css|js))\"#\1?v=${v}\"#g; s#<meta name=\"mz-build\" content=\"dev\">#<meta name=\"mz-build\" content=\"${v}\">#" "$f"
done
if [ -n "$base" ]; then
  for f in "$out"/index.html "$out"/transport.html "$out"/sitemap.xml "$out"/robots.txt; do
    sed -i "s#${old}#${base}#g" "$f"
  done
fi

n=$(grep -c "?v=${v}" "$out"/index.html)
[ "$n" -ge 10 ] || { echo "empreinte absente ($n références)"; exit 1; }
echo "site préparé dans ${out}/ : version ${v}, adresse ${base:-inchangée (GitHub Pages)}"
