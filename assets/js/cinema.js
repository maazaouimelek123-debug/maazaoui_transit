/* =============================================================================
   CINÉMA — le film piloté par le défilement (effet 4D)
   -----------------------------------------------------------------------------
   Le haut de la page d'accueil est une scène plein écran épinglée : le
   défilement ne fait plus glisser une page, il fait avancer une caméra dans un
   film en 3D temps réel (Three.js). Trois dimensions d'espace, le défilement
   comme quatrième : le voyage d'une marchandise, en un seul plan-séquence.
     · au-dessus des nuages, à l'aube (« Défiler »)
     · plongée à travers les nuages : le port de Radès au crépuscule (titre)
     · 01 Dédouanement : au ras des piles de conteneurs
     · 02 Fret maritime : le long d'un porte-conteneurs qui appareille
     · 03 Fret aérien : sur la piste de Tunis-Carthage, décollage
     · montée vers le ciel ; un point jaune naît au centre et s'ouvre en
       cercle doré : il dévoile la page (le hero est déjà sous le film),
       comme les blocs qui éclosent plus bas
   Titres en surimpression par chapitre, ligne de progression à droite,
   « Passer l'intro ». Variante vidéo : si MZ.SITE.cinema.video est renseigné,
   une vidéo (rushes réels ou générés) est lue image par image au défilement à
   la place de la 3D. Le film n'existe que si le mouvement est autorisé (même
   règle que les effets de défilement) ; sinon la section est retirée et la
   page commence au hero. Ce script s'exécute avant scroll.js (rail, plans).
   ========================================================================== */

(function () {
  "use strict";
  window.MZ = window.MZ || {};
  const html = document.documentElement;
  const SITE = MZ.SITE || {};
  const UI = SITE.ui || {};
  const CFG = Object.assign({ enabled: true, length: 7.5, video: "" }, SITE.cinema || {});
  const section = document.querySelector(".cinema");
  if (!section) return;

  const motion = MZ.motion ? MZ.motion.enabled : !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!CFG.enabled || !motion || UI.scrollEffects === false) {
    section.remove(); // ni rail, ni hauteur : la page commence au hero
    return;
  }

  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const THREE_URL = "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js";

  try {
  // Classe de page distincte du nom de la section : « .cinema { display: none } » ne doit jamais viser <html>.
  html.classList.add("has-film");
  section.style.height = `${Math.max(3, Number(CFG.length) || 7.5) * 100}vh`;

  const stage = $(".cinema-stage", section);
  const canvas = $(".cinema-canvas", section);
  const speedCanvas = $(".cinema-speed", section);
  const seedEl = $(".cinema-seed", section);
  const ringEl = $(".cinema-ring", section);
  const fill = $(".cinema-progress i", section);
  const SMALL = window.matchMedia("(max-width: 760px)").matches;

  /* ------------------------------------------------ Chapitres (surimpressions) */
  const chapters = $$(".cine-ch", section).map((el) => ({
    el,
    from: Number(el.dataset.from) || 0,
    to: Number(el.dataset.to) || 1,
    hold: el.hasAttribute("data-hold"), // reste affiché jusqu'à la fin
    key: "",
  }));
  // Graduations de la ligne de progression : une par chapitre titré
  const ticks = $(".cinema-progress", section);
  if (ticks) {
    for (const c of chapters) {
      if (!c.el.classList.contains("cine-ch--title") && !c.el.classList.contains("cine-ch--brand")) continue;
      const b = document.createElement("b");
      b.style.top = `${(((c.from + c.to) / 2) * 100).toFixed(1)}%`;
      ticks.appendChild(b);
      c.tick = b;
    }
  }

  function paintChapters(p) {
    for (const c of chapters) {
      const span = Math.max(0.001, c.to - c.from);
      const q = (p - c.from) / span;
      const fadeIn = smooth(clamp(q / 0.2, 0, 1));
      const fadeOut = c.hold ? 1 : smooth(clamp((1 - q) / 0.2, 0, 1));
      const a = q <= 0 || (!c.hold && q >= 1) ? 0 : Math.min(fadeIn, fadeOut);
      const rise = (1 - fadeIn) * 34 - (1 - fadeOut) * 26;
      const scale = c.el.classList.contains("cine-ch--brand") ? 1.14 - 0.14 * smooth(clamp(q, 0, 1)) : 1;
      const blur = (1 - a) * 10;
      const key = `${a.toFixed(3)}|${rise.toFixed(1)}|${scale.toFixed(3)}`;
      if (key === c.key) continue;
      c.key = key;
      c.el.style.opacity = a.toFixed(3);
      c.el.style.visibility = a <= 0.001 ? "hidden" : "visible";
      c.el.style.transform = `translate3d(0, ${rise.toFixed(1)}px, 0) scale(${scale.toFixed(3)})`;
      c.el.style.filter = blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "";
      if (c.tick) c.tick.classList.toggle("is-on", a > 0.5);
    }
  }

  /* ------------------------------------------------ Traînées de vitesse (2D) */
  const speedFx = (() => {
    if (!speedCanvas) return { draw() {} };
    const g = speedCanvas.getContext("2d");
    const lines = Array.from({ length: SMALL ? 70 : 140 }, () => ({ a: Math.random() * Math.PI * 2, r: Math.random(), l: 0.2 + Math.random() * 0.5, w: 0.5 + Math.random() * 1.3 }));
    let shown = false;
    return {
      draw(k, w, h) {
        if (k < 0.04) {
          if (shown) {
            g.clearRect(0, 0, speedCanvas.width, speedCanvas.height);
            shown = false;
          }
          return;
        }
        shown = true;
        if (speedCanvas.width !== Math.round(w) || speedCanvas.height !== Math.round(h)) {
          speedCanvas.width = Math.round(w);
          speedCanvas.height = Math.round(h);
        }
        g.clearRect(0, 0, w, h);
        const cx = w / 2;
        const cy = h * 0.46;
        const R = Math.hypot(w, h) / 2;
        g.strokeStyle = "rgb(255, 236, 214)";
        g.lineCap = "round";
        for (const s of lines) {
          s.r += 0.05 + k * 0.12;
          if (s.r > 1) {
            s.r = 0.25 + Math.random() * 0.2;
            s.a = Math.random() * Math.PI * 2;
          }
          const r0 = R * s.r;
          const r1 = r0 + R * s.l * k;
          const c = Math.cos(s.a);
          const sn = Math.sin(s.a);
          g.globalAlpha = Math.min(0.5, k * 0.55) * s.r;
          g.lineWidth = s.w;
          g.beginPath();
          g.moveTo(cx + c * r0, cy + sn * r0);
          g.lineTo(cx + c * r1, cy + sn * r1);
          g.stroke();
        }
        g.globalAlpha = 1;
      },
    };
  })();

  /* ------------------------------------------------------- Scène 3D */
  // Images-clés de la caméra : progression du défilement → position, visée, focale.
  const KEYS = [
    { p: 0.0, pos: [0, 1000, 2600], look: [400, -150, -6000], fov: 50 },
    { p: 0.1, pos: [0, 940, 2000], look: [300, -300, -5000], fov: 50 },
    { p: 0.17, pos: [0, 640, 1300], look: [100, -400, -1500], fov: 52 },
    { p: 0.22, pos: [0, 420, 950], look: [0, -200, -800], fov: 56 },
    { p: 0.28, pos: [0, 270, 700], look: [0, 0, -400], fov: 52 },
    { p: 0.36, pos: [0, 190, 430], look: [0, 20, -320], fov: 48 },
    { p: 0.42, pos: [0, 70, 120], look: [0, 12, -420], fov: 54 },
    { p: 0.47, pos: [0, 9, -150], look: [0, 9, -600], fov: 62 },
    { p: 0.55, pos: [0, 9, -460], look: [0, 12, -900], fov: 62 },
    { p: 0.61, pos: [60, 110, -640], look: [420, 20, -100], fov: 54 },
    { p: 0.64, pos: [270, 82, -112], look: [500, 18, 220], fov: 52 }, // entre deux portiques (x = 225 et 315)
    { p: 0.67, pos: [330, 45, 80], look: [560, 12, 270], fov: 50 },
    { p: 0.74, pos: [560, 32, 190], look: [760, 16, 280], fov: 50 },
    { p: 0.79, pos: [900, 170, -60], look: [1600, 40, -900], fov: 54 },
    { p: 0.815, pos: [1480, 48, -390], look: [1600, 8, -1150], fov: 56 },
    { p: 0.84, pos: [1600, 9, -620], look: [1600, 7, -1300], fov: 58 },
    { p: 0.9, pos: [1600, 11, -1250], look: [1600, 14, -2400], fov: 66 },
    { p: 0.95, pos: [1600, 120, -2300], look: [1600, 300, -3900], fov: 58 },
    { p: 1.0, pos: [1600, 420, -2900], look: [1700, 760, -6000], fov: 52 },
  ];
  // Atmosphère : brume (couleur, début, fin) et exposition, interpolées au défilement.
  const ENV = [
    { p: 0.0, fog: "#d6a383", near: 1500, far: 15000, exp: 1.0 },
    { p: 0.15, fog: "#c9a593", near: 500, far: 9000, exp: 1.0 },
    { p: 0.19, fog: "#bfb1ae", near: 10, far: 260, exp: 1.08 },
    { p: 0.235, fog: "#b5a8a8", near: 10, far: 300, exp: 1.05 },
    { p: 0.275, fog: "#76636f", near: 400, far: 5200, exp: 1.0 },
    { p: 0.45, fog: "#6e5b66", near: 150, far: 3600, exp: 1.02 },
    { p: 0.62, fog: "#7a6169", near: 400, far: 5000, exp: 1.0 },
    { p: 0.82, fog: "#8c6c63", near: 300, far: 6500, exp: 1.02 },
    { p: 1.0, fog: "#4c4155", near: 600, far: 9000, exp: 0.95 },
  ];

  function buildScene(THREE) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: !SMALL, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, SMALL ? 1.25 : 1.5));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 2, 40000);
    scene.fog = new THREE.Fog(0xd6a383, 1500, 15000);
    const SUN = new THREE.Vector3(0.25, 0.07, -1).normalize();
    const C = (hex) => new THREE.Color(hex);
    const rnd = (a, b) => a + Math.random() * (b - a);
    const n = (big, small) => (SMALL ? small : big);

    /* Textures générées (aucun fichier à charger) */
    const texFrom = (size, paint, srgb) => {
      const c = document.createElement("canvas");
      c.width = c.height = size;
      paint(c.getContext("2d"), size);
      const t = new THREE.CanvasTexture(c);
      if (srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
      return t;
    };
    const glowTex = texFrom(64, (g, s) => {
      const r = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
      r.addColorStop(0, "rgba(255,255,255,1)");
      r.addColorStop(0.25, "rgba(255,255,255,0.55)");
      r.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = r;
      g.fillRect(0, 0, s, s);
    });
    const cloudTex = [0, 1, 2].map(() =>
      texFrom(256, (g, s) => {
        // Cumulus : bourgeons plus clairs en haut, base plus grise (volume sans éclairage 3D).
        const puffs = [];
        for (let i = 0; i < 70; i++) {
          const spread = rnd(0, 1);
          puffs.push({ x: s / 2 + rnd(-0.3, 0.3) * s * (0.4 + spread * 0.6), y: s * 0.6 - Math.pow(rnd(0, 1), 1.6) * s * 0.26, r: rnd(0.05, 0.15) * s });
        }
        puffs.sort((a, b) => b.y - a.y);
        for (const p of puffs) {
          const gr = g.createRadialGradient(p.x - p.r * 0.2, p.y - p.r * 0.45, p.r * 0.1, p.x, p.y, p.r);
          gr.addColorStop(0, "rgba(255,255,255,0.55)");
          gr.addColorStop(0.55, "rgba(222,222,232,0.32)");
          gr.addColorStop(1, "rgba(170,172,190,0)");
          g.fillStyle = gr;
          g.beginPath();
          g.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          g.fill();
        }
        // Base aplatie et grisée
        const base = g.createLinearGradient(0, s * 0.45, 0, s * 0.75);
        base.addColorStop(0, "rgba(150,150,170,0)");
        base.addColorStop(1, "rgba(150,150,170,0.35)");
        g.globalCompositeOperation = "source-atop";
        g.fillStyle = base;
        g.fillRect(0, 0, s, s);
        g.globalCompositeOperation = "source-over";
        g.globalCompositeOperation = "destination-in";
        const m = g.createRadialGradient(s / 2, s / 2, s * 0.18, s / 2, s / 2, s / 2);
        m.addColorStop(0, "rgba(0,0,0,1)");
        m.addColorStop(1, "rgba(0,0,0,0)");
        g.fillStyle = m;
        g.fillRect(0, 0, s, s);
      })
    );
    const ribTex = texFrom(128, (g, s) => {
      // Tôle ondulée des conteneurs
      g.fillStyle = "#cfcfcf";
      g.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 8) {
        g.fillStyle = "rgba(0,0,0,0.22)";
        g.fillRect(x, 0, 3, s);
        g.fillStyle = "rgba(255,255,255,0.18)";
        g.fillRect(x + 4, 0, 2, s);
      }
      g.fillStyle = "rgba(0,0,0,0.35)";
      g.fillRect(0, 0, s, 5);
      g.fillRect(0, s - 5, s, 5);
    });

    /* Ciel : dégradé, soleil bas, horizon raccordé à la brume */
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(30000, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uSun: { value: SUN },
            uTop: { value: C("#1f3158") },
            uHorSun: { value: C("#f2a065") },
            uHorAway: { value: C("#9a7a8c") },
            uSunCol: { value: C("#ffd29a") },
            uHaze: { value: 0.55 },
          },
        ]),
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }`,
        fragmentShader: `
          uniform vec3 uSun; uniform vec3 uTop; uniform vec3 uHorSun; uniform vec3 uHorAway; uniform vec3 uSunCol; uniform float uHaze;
          uniform vec3 fogColor;
          varying vec3 vDir;
          void main() {
            vec3 d = normalize(vDir);
            float s = max(dot(d, uSun), 0.0);
            float side = pow(max(dot(normalize(vec3(d.x, 0.0, d.z)), normalize(vec3(uSun.x, 0.0, uSun.z))), 0.0), 3.0);
            vec3 hor = mix(uHorAway, uHorSun, side);
            float h = clamp(d.y, -1.0, 1.0);
            vec3 col = mix(hor, uTop, pow(smoothstep(0.0, 0.55, h), 0.7));
            col += uSunCol * (pow(s, 8.0) * 0.45 + pow(s, 90.0) * 0.8 + smoothstep(0.9993, 0.9997, s) * 6.0);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            // Bas du ciel fondu dans la brume : raccord parfait avec la mer et les nuages lointains.
            float hz = 1.0 - smoothstep(-0.02, 0.09, h);
            gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, hz * uHaze);
          }`,
      })
    );
    sky.renderOrder = -1;
    scene.add(sky);

    /* Lumières : soleil rasant, ciel, contre-jour froid */
    scene.add(new THREE.HemisphereLight(0xf3b48b, 0x1a1c24, 0.9));
    const sun = new THREE.DirectionalLight(0xffc58a, 2.4);
    sun.position.copy(SUN).multiplyScalar(1000);
    scene.add(sun);
    const fillLight = new THREE.DirectionalLight(0x8fa3d0, 0.55);
    fillLight.position.set(-0.3, 0.6, 1).multiplyScalar(1000);
    scene.add(fillLight);

    /* Mer : vagues procédurales, reflet du ciel et du soleil */
    const sea = new THREE.Mesh(
      new THREE.PlaneGeometry(60000, 60000, 1, 1),
      new THREE.ShaderMaterial({
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
          THREE.UniformsLib.fog,
          {
            uTime: { value: 0 },
            uSun: { value: SUN },
            uDeep: { value: C("#0b1520") },
            uTop: { value: C("#2a3a5e") },
            uHor: { value: C("#c98d6e") },
            uSunCol: { value: C("#ffcf96") },
          },
        ]),
        vertexShader: `
          varying vec3 vWorld;
          #include <fog_pars_vertex>
          void main() {
            vec4 wp = modelMatrix * vec4(position, 1.0);
            vWorld = wp.xyz;
            vec4 mvPosition = viewMatrix * wp;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
          }`,
        fragmentShader: `
          uniform float uTime; uniform vec3 uSun; uniform vec3 uDeep; uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uSunCol;
          varying vec3 vWorld;
          #include <fog_pars_fragment>
          // Houle en bruit de valeur (4 octaves) : pas de motif régulier, donc pas de moiré.
          // Hachage sans sinus (précision stable sur GPU : pas de lignes parasites au loin)
          float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
          float noise(vec2 p) {
            vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
            return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
          }
          float swell(vec2 p) {
            float h = 0.0; float a = 0.5;
            for (int i = 0; i < 4; i++) {
              h += a * noise(p + uTime * vec2(0.22, 0.13) * (1.0 + float(i) * 0.7));
              p = mat2(1.6, 1.2, -1.2, 1.6) * p; a *= 0.5;
            }
            return h;
          }
          void main() {
            float dist = length(cameraPosition - vWorld);
            float k = mix(0.5, 0.04, smoothstep(40.0, 2600.0, dist));
            vec2 p = vec2(vWorld.x * 0.09, vWorld.z * 0.15);
            float e = 0.3;
            float hc = swell(p);
            vec3 nrm = normalize(vec3((hc - swell(p + vec2(e, 0.0))) * k * 2.2, 1.0, (hc - swell(p + vec2(0.0, e))) * k * 2.2));
            vec3 v = normalize(cameraPosition - vWorld);
            vec3 r = reflect(-v, nrm);
            r.y = abs(r.y);
            float fres = 0.03 + 0.97 * pow(1.0 - max(dot(nrm, v), 0.0), 5.0);
            vec3 skyc = mix(uHor, uTop, smoothstep(0.05, 0.7, r.y) * 0.6);
            float s = max(dot(r, uSun), 0.0);
            vec3 col = mix(uDeep, skyc, fres * 0.9) + uSunCol * (pow(s, 260.0) * 2.4 + pow(s, 14.0) * 0.12);
            gl_FragColor = vec4(col, 1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
            #include <fog_fragment>
          }`,
      })
    );
    sea.rotation.x = -Math.PI / 2;
    scene.add(sea);

    /* Terre : côte découpée (sauf le quai rectiligne du port), ville en lumières */
    const coastZ = (x) => {
      if (Math.abs(x) < 520) return -100;
      const t = Math.abs(x) - 520;
      const e = Math.min(1, t / 400);
      return -100 + e * (Math.sin(x * 0.0021) * 260 + Math.sin(x * 0.0057 + 1.3) * 120 - 160);
    };
    const shape = new THREE.Shape();
    shape.moveTo(-16000, 16000);
    for (let x = -16000; x <= 16000; x += 80) shape.lineTo(x, -coastZ(x));
    shape.lineTo(16000, 16000);
    shape.lineTo(-16000, 16000);
    const land = new THREE.Mesh(new THREE.ShapeGeometry(shape), new THREE.MeshStandardMaterial({ color: 0x15171c, roughness: 1 }));
    land.rotation.x = -Math.PI / 2;
    land.position.y = 0.6;
    scene.add(land);
    const yard = new THREE.Mesh(new THREE.PlaneGeometry(960, 640), new THREE.MeshStandardMaterial({ color: 0x2a2c31, roughness: 0.95 }));
    yard.rotation.x = -Math.PI / 2;
    yard.position.set(0, 0.8, -420);
    scene.add(yard);
    const quay = new THREE.Mesh(new THREE.BoxGeometry(1040, 4, 30), new THREE.MeshStandardMaterial({ color: 0x3a3b40, roughness: 0.9 }));
    quay.position.set(0, -0.5, -112);
    scene.add(quay);

    // Feux (ville, port, piste, navires) : sprites additifs, éteints dans le blanc des nuages.
    const lightMats = [];
    const lights = (points, size, opts) => {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute("position", new THREE.Float32BufferAttribute(points.pos, 3));
      geo.setAttribute("color", new THREE.Float32BufferAttribute(points.col, 3));
      const mat = new THREE.PointsMaterial(
        Object.assign({ size, map: glowTex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, sizeAttenuation: true }, opts || {})
      );
      lightMats.push(mat);
      return new THREE.Points(geo, mat);
    };
    let lightLevel = 1;
    const pushLight = (acc, x, y, z, hex, mult) => {
      const c = C(hex).multiplyScalar(mult || 1);
      acc.pos.push(x, y, z);
      acc.col.push(c.r, c.g, c.b);
    };
    const airport = (x, z) => x > 1450 && x < 1760 && z < -500 && z > -4100;

    // Ville : quartiers en grille, éclairage sodium et blanc
    const city = { pos: [], col: [] };
    const warm = ["#ffb066", "#ffc98a", "#ffd9a8", "#fff1d6"];
    for (let d = 0; d < n(70, 40); d++) {
      const cx = rnd(-9000, 9000);
      const cz = rnd(-9000, -700);
      const ang = rnd(0, Math.PI);
      const size = rnd(200, 700);
      const step = rnd(26, 46);
      const ca = Math.cos(ang);
      const sa = Math.sin(ang);
      for (let i = -size; i <= size; i += step) {
        for (let j = -size; j <= size; j += step * 0.5) {
          if (Math.random() < 0.55) continue;
          const lx = i + rnd(-4, 4);
          const lz = j;
          const x = cx + lx * ca - lz * sa;
          const z = cz + lx * sa + lz * ca;
          if (z > coastZ(x) - 60 || airport(x, z) || (Math.abs(x) < 520 && z > -760)) continue;
          if (Math.hypot(lx, lz) > size * rnd(0.7, 1.1)) continue;
          pushLight(city, x, 2 + Math.random() * 6, z, warm[(Math.random() * warm.length) | 0], rnd(0.5, 1));
        }
      }
    }
    scene.add(lights(city, n(9, 11)));

    /* Port de Radès : piles de conteneurs, portiques, éclairage */
    const PALETTE = ["#8e3b2c", "#2f5d8a", "#2b6c68", "#b3652b", "#b9bcbf", "#3f5a42", "#a8862f", "#26344d", "#7c2f3c", "#d5d6d2"];
    const contMat = new THREE.MeshStandardMaterial({ map: ribTex, roughness: 0.75, metalness: 0.2 });
    const boxGeo = new THREE.BoxGeometry(1, 1, 1);
    const yardSlots = [];
    const blockW = 6 * 2.55;
    const aisle = 14;
    for (let side = -1; side <= 1; side += 2) {
      for (let b = 0; b < n(11, 7); b++) {
        const x0 = side * (aisle / 2 + b * (blockW + aisle));
        for (let r = 0; r < 6; r++) {
          const x = x0 + side * (r * 2.55 + 1.275);
          if (Math.abs(x) > 430) continue;
          for (let z = -125; z > -700; z -= 12.6) {
            if (Math.floor((-z - 125) / 12.6) % 5 === 4) continue; // allées transversales
            const tiers = Math.random() < 0.08 ? 0 : 1 + Math.floor(Math.random() * (b === 0 ? 5 : 4.4));
            for (let t = 0; t < tiers; t++) yardSlots.push([x, 0.8 + 1.3 + t * 2.6, z - 6]);
          }
        }
      }
    }
    const yardBoxes = new THREE.InstancedMesh(boxGeo, contMat, yardSlots.length);
    const m4 = new THREE.Matrix4();
    const q0 = new THREE.Quaternion();
    const v3 = new THREE.Vector3();
    const s3 = new THREE.Vector3(2.44, 2.59, 12.2);
    const tint = new THREE.Color();
    yardSlots.forEach((s, i) => {
      m4.compose(v3.set(s[0], s[1], s[2]), q0, s3);
      yardBoxes.setMatrixAt(i, m4);
      tint.set(PALETTE[(Math.random() * PALETTE.length) | 0]).multiplyScalar(rnd(0.75, 1.1));
      yardBoxes.setColorAt(i, tint);
    });
    yardBoxes.instanceMatrix.needsUpdate = true;
    if (yardBoxes.instanceColor) yardBoxes.instanceColor.needsUpdate = true;
    scene.add(yardBoxes);

    // Portiques de quai (STS) : entre deux portiques, l'allée centrale reste libre pour la caméra.
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xc9ccd2, roughness: 0.6, metalness: 0.4 });
    const craneRed = new THREE.MeshStandardMaterial({ color: 0x9c2f2a, roughness: 0.6, metalness: 0.3 });
    const redLights = { pos: [], col: [] };
    const part = (g, w, h, d, x, y, z, mat) => {
      const m = new THREE.Mesh(boxGeo, mat || craneMat);
      m.scale.set(w, h, d);
      m.position.set(x, y, z);
      g.add(m);
      return m;
    };
    for (let k = 0; k < 10; k++) {
      const g = new THREE.Group();
      const x = -405 + k * 90;
      for (const lx of [-9, 9]) {
        for (const lz of [-14, 6]) part(g, 1.6, 44, 1.6, lx, 22, lz);
        part(g, 1.4, 1.4, 22, lx, 12, -4);
      }
      part(g, 20, 2, 2, 0, 44, -14);
      part(g, 20, 2, 2, 0, 44, 6);
      part(g, 3, 3.4, 120, 0, 47, 12, craneRed); // flèche au-dessus de l'eau
      part(g, 11, 7, 13, 0, 52, -10); // salle des machines
      const apexA = part(g, 1.2, 26, 1.2, 0, 60, -6);
      apexA.rotation.x = 0.35;
      const apexB = part(g, 1.2, 30, 1.2, 0, 62, 14);
      apexB.rotation.x = -0.55;
      g.position.set(x, 0, -112);
      scene.add(g);
      pushLight(redLights, x, 74, -112, "#ff3b2f", 1);
      pushLight(redLights, x, 49, -112 + 72, "#ff3b2f", 1);
    }
    const blink = lights(redLights, 7);
    scene.add(blink);

    // Mâts d'éclairage : points chauds en hauteur et halos au sol
    const masts = { pos: [], col: [] };
    const poolMat = new THREE.MeshBasicMaterial({ map: glowTex, color: 0xff9a4a, transparent: true, opacity: 0.32, depthWrite: false, blending: THREE.AdditiveBlending, fog: true });
    const poolGeo = new THREE.PlaneGeometry(70, 70);
    for (let x = -400; x <= 400; x += 100) {
      for (let z = -180; z >= -680; z -= 125) {
        pushLight(masts, x + 3, 32, z, "#ffb36b", 0.9);
        const pool = new THREE.Mesh(poolGeo, poolMat);
        pool.rotation.x = -Math.PI / 2;
        pool.position.set(x + 3, 1.2, z);
        scene.add(pool);
      }
    }
    scene.add(lights(masts, 7));

    /* Navires : un porte-conteneurs à quai, un autre qui appareille */
    function makeShip(L, B) {
      const g = new THREE.Group();
      const s = new THREE.Shape();
      s.moveTo(-L / 2, -B / 2);
      s.lineTo(L / 2 - 30, -B / 2);
      s.quadraticCurveTo(L / 2 + 4, -B / 2 + 2, L / 2 + 6, 0);
      s.quadraticCurveTo(L / 2 + 4, B / 2 - 2, L / 2 - 30, B / 2);
      s.lineTo(-L / 2, B / 2);
      s.lineTo(-L / 2, -B / 2);
      const H = 20;
      const hullGeo = new THREE.ExtrudeGeometry(s, { depth: H, bevelEnabled: false });
      hullGeo.rotateX(-Math.PI / 2);
      const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({ color: 0x2c3a4e, roughness: 0.55, metalness: 0.35 }));
      hull.position.y = -9;
      g.add(hull);
      const stripe = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x7d2a25, roughness: 0.8 }));
      stripe.scale.set(L - 10, 1.2, B + 0.4);
      stripe.position.set(-5, -0.2, 0);
      g.add(stripe);
      const slots = [];
      for (let bx = -L / 2 + 34; bx < L / 2 - 26; bx += 13) {
        for (let r = 0; r < 12; r++) {
          const tiers = 2 + Math.floor(Math.random() * 4.6);
          for (let t = 0; t < tiers; t++) slots.push([bx, 11 + 1.3 + t * 2.6, -B / 2 + 2 + r * 2.5 + 1.25]);
        }
      }
      const boxes = new THREE.InstancedMesh(boxGeo, contMat, slots.length);
      const s3s = new THREE.Vector3(12.2, 2.59, 2.44);
      slots.forEach((p, i) => {
        m4.compose(v3.set(p[0], p[1], p[2]), q0, s3s);
        boxes.setMatrixAt(i, m4);
        tint.set(PALETTE[(Math.random() * PALETTE.length) | 0]).multiplyScalar(rnd(0.75, 1.1));
        boxes.setColorAt(i, tint);
      });
      boxes.instanceMatrix.needsUpdate = true;
      if (boxes.instanceColor) boxes.instanceColor.needsUpdate = true;
      g.add(boxes);
      const white = new THREE.MeshStandardMaterial({ color: 0xe6e4df, roughness: 0.6 });
      const bridge = new THREE.Mesh(boxGeo, white);
      bridge.scale.set(14, 26, B - 2);
      bridge.position.set(-L / 2 + 20, 11 + 13, 0);
      g.add(bridge);
      const wings = new THREE.Mesh(boxGeo, white);
      wings.scale.set(8, 3, B + 8);
      wings.position.set(-L / 2 + 22, 11 + 25, 0);
      g.add(wings);
      const win = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xffc27a, emissiveIntensity: 1.4 }));
      win.scale.set(14.4, 1.3, B - 4);
      win.position.set(-L / 2 + 20, 11 + 22, 0);
      g.add(win);
      const funnel = new THREE.Mesh(boxGeo, new THREE.MeshStandardMaterial({ color: 0x2a2f38, roughness: 0.7 }));
      funnel.scale.set(7, 10, 6);
      funnel.position.set(-L / 2 + 9, 11 + 28, 0);
      g.add(funnel);
      const nav = { pos: [], col: [] };
      pushLight(nav, L / 2 + 2, 14, 0, "#ffffff", 1);
      pushLight(nav, -L / 2 + 20, 41, 0, "#ffffff", 1);
      pushLight(nav, -L / 2 + 22, 37, B / 2 + 4, "#3cff7a", 1);
      pushLight(nav, -L / 2 + 22, 37, -B / 2 - 4, "#ff3b2f", 1);
      g.add(lights(nav, 6));
      // Feux de pont le long du bord : le navire se lit au crépuscule
      const deck = { pos: [], col: [] };
      for (let x = -L / 2 + 30; x < L / 2 - 20; x += 16) {
        pushLight(deck, x, 11.5, B / 2 + 0.5, "#ffd7a0", 0.8);
        pushLight(deck, x, 11.5, -B / 2 - 0.5, "#ffd7a0", 0.8);
      }
      g.add(lights(deck, 3.2));
      return g;
    }
    const docked = makeShip(240, 32);
    docked.position.set(0, 0, -78);
    docked.rotation.y = Math.PI;
    scene.add(docked);
    const vessel = makeShip(230, 32);
    vessel.position.set(420, 0, 270);
    scene.add(vessel);
    const wake = new THREE.Mesh(
      new THREE.PlaneGeometry(260, 34),
      new THREE.MeshBasicMaterial({
        map: texFrom(128, (g, s) => {
          // Sillage : s'évase et s'efface vers l'arrière, bords adoucis (aucune arête visible)
          for (let x = 0; x < s; x++) {
            const t = x / s;
            const half = s * (0.12 + 0.3 * (1 - t));
            const gr = g.createLinearGradient(0, s / 2 - half, 0, s / 2 + half);
            const a = 0.6 * t * t;
            gr.addColorStop(0, "rgba(255,255,255,0)");
            gr.addColorStop(0.5, `rgba(255,255,255,${a.toFixed(3)})`);
            gr.addColorStop(1, "rgba(255,255,255,0)");
            g.fillStyle = gr;
            g.fillRect(x, s / 2 - half, 1, half * 2);
          }
        }),
        transparent: true,
        depthWrite: false,
        opacity: 0.5,
      })
    );
    wake.rotation.x = -Math.PI / 2;
    scene.add(wake);

    /* Aéroport de Tunis-Carthage : piste, balisage, avion */
    const RW_X = 1600;
    const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 3400), new THREE.MeshStandardMaterial({ color: 0x34353a, roughness: 0.7, metalness: 0.1 }));
    runway.rotation.x = -Math.PI / 2;
    runway.position.set(RW_X, 0.9, -2400);
    scene.add(runway);
    const markMat = new THREE.MeshBasicMaterial({ color: 0xd8d4c8, fog: true });
    for (const ex of [-28.5, 28.5]) {
      const edge = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 3380), markMat);
      edge.rotation.x = -Math.PI / 2;
      edge.position.set(RW_X + ex, 0.95, -2400);
      scene.add(edge);
    }
    const dashGeo = new THREE.PlaneGeometry(0.9, 30);
    const dashes = new THREE.InstancedMesh(dashGeo, markMat, 56);
    for (let i = 0; i < 56; i++) {
      m4.makeRotationX(-Math.PI / 2);
      m4.setPosition(RW_X, 1, -760 - i * 60);
      dashes.setMatrixAt(i, m4);
    }
    scene.add(dashes);
    const piano = new THREE.InstancedMesh(new THREE.PlaneGeometry(1.8, 40), markMat, 16);
    for (let i = 0; i < 16; i++) {
      m4.makeRotationX(-Math.PI / 2);
      m4.setPosition(RW_X - 26 + (i < 8 ? i : i + 4) * 3.3, 1, -740);
      piano.setMatrixAt(i, m4);
    }
    scene.add(piano);
    const rwl = { pos: [], col: [] };
    for (let z = -710; z > -4090; z -= 30) {
      pushLight(rwl, RW_X - 31, 1.6, z, "#fff4dc", 1);
      pushLight(rwl, RW_X + 31, 1.6, z, "#fff4dc", 1);
    }
    for (let x = -30; x <= 30; x += 4) {
      pushLight(rwl, RW_X + x, 1.6, -702, "#3cff7a", 1);
      pushLight(rwl, RW_X + x, 1.6, -4098, "#ff3b2f", 1);
    }
    for (let z = -690; z < -330; z += 30) for (let x = -8; x <= 8; x += 4) pushLight(rwl, RW_X + x, 2, z, "#fff7e6", 1.2);
    scene.add(lights(rwl, 4.5));

    function makePlane() {
      const g = new THREE.Group();
      const skin = new THREE.MeshStandardMaterial({ color: 0xeef0f2, roughness: 0.35, metalness: 0.45 });
      const dark = new THREE.MeshStandardMaterial({ color: 0x3a3f48, roughness: 0.5, metalness: 0.5 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(2, 2, 32, 20), skin);
      body.rotation.x = Math.PI / 2;
      g.add(body);
      const nose = new THREE.Mesh(new THREE.SphereGeometry(2, 20, 14), skin);
      nose.scale.set(1, 1, 2.2);
      nose.position.z = -16;
      g.add(nose);
      const tail = new THREE.Mesh(new THREE.ConeGeometry(2, 10, 20), skin);
      tail.rotation.x = Math.PI / 2;
      tail.position.set(0, 0.5, 21);
      g.add(tail);
      const sheared = (w, h, d, k) => {
        const geo = new THREE.BoxGeometry(w, h, d);
        const pa = geo.attributes.position;
        for (let i = 0; i < pa.count; i++) pa.setZ(i, pa.getZ(i) + Math.abs(pa.getX(i)) * k); // flèche des ailes
        geo.computeVertexNormals();
        return geo;
      };
      const wing = new THREE.Mesh(sheared(34, 0.45, 5, 0.42), skin);
      wing.position.set(0, -1, 1);
      g.add(wing);
      const htail = new THREE.Mesh(sheared(12, 0.3, 3, 0.45), skin);
      htail.position.set(0, 0.6, 20);
      g.add(htail);
      const finGeo = new THREE.BoxGeometry(0.4, 7, 5);
      const fp = finGeo.attributes.position;
      for (let i = 0; i < fp.count; i++) fp.setZ(i, fp.getZ(i) + (fp.getY(i) + 3.5) * 0.7);
      finGeo.computeVertexNormals();
      const fin = new THREE.Mesh(finGeo, skin);
      fin.position.set(0, 4.5, 19);
      g.add(fin);
      for (const x of [-7, 7]) {
        const eng = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1, 4.6, 16), dark);
        eng.rotation.x = Math.PI / 2;
        eng.position.set(x, -2.4, -1.5 + Math.abs(x) * 0.42 - 2.6);
        g.add(eng);
      }
      const nav = { pos: [], col: [] };
      pushLight(nav, -17, -1, 8.5, "#ff3b2f", 1);
      pushLight(nav, 17, -1, 8.5, "#3cff7a", 1);
      pushLight(nav, 0, 8.5, 23, "#ffffff", 1);
      g.add(lights(nav, 3.2));
      const beams = { pos: [], col: [] }; // phares d'atterrissage
      pushLight(beams, -2.5, -1.2, -6, "#fffbe8", 1.6);
      pushLight(beams, 2.5, -1.2, -6, "#fffbe8", 1.6);
      g.add(lights(beams, 9));
      return g;
    }
    const plane = makePlane();
    scene.add(plane);

    /* Nuages : une mer de nuages au-dessus de la baie, traversée par la caméra */
    const clouds = new THREE.Group();
    const cloudMats = cloudTex.map((t) => new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: true }));
    const lit = C("#ffe3cf");
    const shade = C("#8f8fa3");
    const addCloud = (x, y, z, s, a) => {
      const mat = cloudMats[(Math.random() * 3) | 0].clone();
      mat.color.copy(shade).lerp(lit, clamp((y - 360) / 220 + rnd(-0.2, 0.25), 0, 1));
      mat.opacity = a;
      const sp = new THREE.Sprite(mat);
      sp.position.set(x, y, z);
      sp.scale.set(s, s * rnd(0.38, 0.55), 1);
      clouds.add(sp);
    };
    // Mer de nuages jusqu'à l'horizon, avec une trouée au centre au loin (la ville sous la brume).
    for (let i = 0; i < n(340, 190); i++) {
      const x = rnd(-9000, 9000);
      const z = rnd(-14000, 2600);
      const gap = z < -1500 && z > -9000 && Math.abs(x - 300) < 1400 + (-z - 1500) * 0.12;
      if (gap && Math.random() < 0.85) continue;
      addCloud(x, rnd(380, 560), z, rnd(900, 2300), rnd(0.6, 1));
    }
    // Bancs proches, de part et d'autre de l'axe, comme dans un hublot
    for (let i = 0; i < n(80, 44); i++) {
      const side = Math.random() < 0.5 ? -1 : 1;
      addCloud(side * rnd(350, 2600), rnd(400, 600), rnd(-1500, 2200), rnd(500, 1300), rnd(0.7, 1));
    }
    // Couche dense autour de la descente : la caméra traverse vraiment les nuages.
    for (let i = 0; i < n(80, 46); i++) addCloud(rnd(-700, 700), rnd(360, 560), rnd(500, 1400), rnd(260, 620), rnd(0.55, 0.9));
    scene.add(clouds);

    /* Trajectoire */
    const V = (a) => new THREE.Vector3(a[0], a[1], a[2]);
    const posCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.pos)), false, "centripetal");
    const lookCurve = new THREE.CatmullRomCurve3(KEYS.map((k) => V(k.look)), false, "centripetal");
    const seg = (list, p) => {
      if (p <= list[0].p) return [0, 0];
      for (let i = 0; i < list.length - 1; i++) {
        if (p <= list[i + 1].p) return [i, (p - list[i].p) / (list[i + 1].p - list[i].p)];
      }
      return [list.length - 2, 1];
    };
    const look = new THREE.Vector3();
    const fogA = new THREE.Color();
    const fogB = new THREE.Color();
    const prevPos = new THREE.Vector3();
    let speed = 0;
    let first = true; // première image : pas de vitesse mesurée depuis l'origine

    function setEnv(p) {
      const [i, t] = seg(ENV, p);
      const a = ENV[i];
      const b = ENV[i + 1];
      const e = smooth(t);
      fogA.set(a.fog);
      fogB.set(b.fog);
      scene.fog.color.copy(fogA).lerp(fogB, e);
      scene.fog.near = lerp(a.near, b.near, e);
      scene.fog.far = lerp(a.far, b.far, e);
      renderer.toneMappingExposure = lerp(a.exp, b.exp, e);
      // Dans les nuages (brume très courte), les feux au sol disparaissent.
      lightLevel = smooth(clamp((scene.fog.far - 450) / 1800, 0, 1));
      for (const m of lightMats) m.opacity = lightLevel;
      poolMat.opacity = 0.32 * lightLevel;
    }

    function place(p, time) {
      // Porte-conteneurs : appareille pendant le chapitre maritime
      const sv = smooth(clamp((p - 0.58) / 0.25, 0, 1));
      vessel.position.x = 420 + sv * 220;
      vessel.position.y = Math.sin(time * 0.6) * 0.25;
      vessel.rotation.z = Math.sin(time * 0.45) * 0.006;
      wake.position.set(vessel.position.x - 230, 0.3, 270);
      wake.material.opacity = 0.25 + sv * 0.35;
      // Avion : roulage, rotation, décollage
      const q = clamp((p - 0.84) / 0.16, 0, 1);
      const z = -850 - 3200 * Math.pow(q, 1.4); // toujours 150 à 450 m devant la caméra : il ne masque jamais les titres
      const climb = Math.max(0, -z - 1900);
      plane.position.set(RW_X, 4.6 + climb * 0.3, z);
      plane.rotation.x = Math.min(0.24, climb * 0.0011);
      // Feux rouges des portiques : clignotement lent
      blink.material.opacity = lightLevel * (0.45 + 0.55 * (Math.sin(time * 2.2) > 0 ? 1 : 0.25));
    }

    function render(p, dt, time) {
      const [i, t] = seg(KEYS, p);
      const u = (i + t) / (KEYS.length - 1);
      prevPos.copy(camera.position);
      posCurve.getPoint(u, camera.position);
      if (camera.position.y < 4) camera.position.y = 4; // jamais sous le sol, même si la courbe plonge
      lookCurve.getPoint(u, look);
      camera.fov = lerp(KEYS[i].fov, KEYS[Math.min(i + 1, KEYS.length - 1)].fov, smooth(t));
      camera.updateProjectionMatrix();
      camera.lookAt(look);
      sky.position.copy(camera.position);
      setEnv(p);
      place(p, time);
      sea.material.uniforms.uTime.value = time;
      const v = first ? 0 : camera.position.distanceTo(prevPos) / Math.max(0.001, dt / 1000);
      first = false;
      speed += (v - speed) * Math.min(1, dt / 120);
      renderer.render(scene, camera);
      return speed;
    }

    function resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / Math.max(1, h);
      camera.updateProjectionMatrix();
    }

    /** Coupe franche : la prochaine image ne mesure pas de vitesse (pas de traînées après un saut). */
    function cut() {
      first = true;
      speed = 0;
    }

    return { render, resize, cut, info: () => renderer.info.render, camera };
  }

  /* --------------------------------------------- Variante : vidéo réelle */
  function buildVideo(src) {
    const v = document.createElement("video");
    v.className = "cinema-video";
    v.src = src;
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.setAttribute("aria-hidden", "true");
    canvas.replaceWith(v);
    let busy = false;
    v.addEventListener("seeked", () => (busy = false));
    return {
      render(p) {
        if (!v.duration || busy) return 0;
        const target = p * (v.duration - 0.05);
        if (Math.abs(v.currentTime - target) > 1 / 30) {
          busy = true;
          v.currentTime = target;
        }
        return 0;
      },
      resize() {},
      info: () => ({}),
    };
  }

  /* ---------------------------------------------------------- Boucle */
  let film = null; // scène 3D ou vidéo, une fois prête
  let mode = "loading";
  let p = 0;
  let sp = 0;
  let last = performance.now();
  let covering = false;
  let started = false;
  let lastOpen = "";
  let lastFill = "";
  // Sortie du film : le point jaune naît (SEED_*), puis s'ouvre en cercle et dévoile la page (OPEN_*).
  const SEED_FROM = 0.928;
  const OPEN_FROM = 0.95;
  const OPEN_TO = 0.977; // ouvert avant 1 : une arrivée par ancre (#accueil, marge de la navigation) voit la page

  /** Ouverture : masque circulaire troué sur la scène, anneau doré au bord, graine qui s'efface. */
  function paintOpening(k) {
    const open = smooth(clamp((k - OPEN_FROM) / (OPEN_TO - OPEN_FROM), 0, 1));
    const born = smooth(clamp((k - SEED_FROM) / (OPEN_FROM - SEED_FROM), 0, 1));
    const key = `${open.toFixed(4)}|${born.toFixed(3)}`;
    if (key === lastOpen) return open;
    lastOpen = key;
    const R = Math.hypot(w, h) * 0.56 * open; // 0,5 × diagonale couvre tout l'écran depuis le centre
    const mask = open > 0 ? `radial-gradient(circle at 50% 50%, transparent ${R.toFixed(1)}px, #000 ${(R + 1.5).toFixed(1)}px)` : "";
    stage.style.webkitMaskImage = mask;
    stage.style.maskImage = mask;
    section.classList.toggle("is-opening", open > 0);
    if (seedEl) {
      seedEl.style.opacity = (born * (1 - open)).toFixed(3);
      seedEl.style.transform = `scale(${(born * (1 + open * 3)).toFixed(3)})`;
    }
    if (ringEl) {
      const d = 2 * (R + 4);
      ringEl.style.width = ringEl.style.height = `${d.toFixed(1)}px`;
      ringEl.style.opacity = open > 0 && open < 1 ? Math.min(1, open * 8, (1 - open) * 6).toFixed(3) : "0";
    }
    return open;
  }
  let w = 0;
  let h = 0;
  let camSpeed = 0;

  const flowCanvas = () => {
    const c = $(".depth-field canvas");
    return c && c.__flow;
  };

  function measure() {
    w = stage.clientWidth || window.innerWidth;
    h = stage.clientHeight || window.innerHeight;
    if (film) film.resize(w, h);
  }

  function frame(now) {
    if (!section.isConnected) return; // film retiré (3D indisponible) : la boucle s'arrête
    const dt = clamp(now - last, 1, 80);
    last = now;
    const r = section.getBoundingClientRect();
    const vh = window.innerHeight;
    const run = Math.max(1, r.height - vh);
    p = clamp(-r.top / run, 0, 1);
    if (!started || Math.abs(p - sp) > 0.2) {
      // Saut (« Passer l'intro », lien du menu, position restaurée au rechargement) : la caméra
      // se place directement, sans rejouer le film en accéléré par-dessus la page.
      sp = p;
      started = true;
      if (film && film.cut) film.cut();
    }
    sp += (p - sp) * (1 - Math.pow(0.9, dt / 16.667)); // inertie de caméra
    if (Math.abs(p - sp) < 0.00002) sp = p;
    const visible = r.bottom > 0 && r.top < vh;

    // Le film couvre l'écran tant qu'il est épinglé et pas encore ouvert sur la page.
    const cover = r.top <= 1 && r.bottom >= vh - 1 && sp < OPEN_FROM;
    if (cover !== covering) {
      covering = cover;
      html.classList.toggle("cinema-on", cover);
      const f = flowCanvas(); // le champ de flux est entièrement masqué : on le met en pause
      if (f) cover ? f.stop() : f.start();
    }

    if (visible) {
      paintChapters(sp);
      const open = paintOpening(sp);
      const fl = sp.toFixed(4);
      if (fl !== lastFill && fill) fill.style.transform = `scaleY(${(lastFill = fl)})`;
      // Film entièrement ouvert : plus rien à dessiner, la page est à l'écran.
      if (film && open < 1) camSpeed = film.render(sp, dt, now / 1000) || 0;
      speedFx.draw(open < 1 ? clamp((camSpeed - 140) / 520, 0, 1) : 0, w, h);
    }
    requestAnimationFrame(frame);
  }

  function fail(e) {
    mode = "poster";
    section.classList.add("is-poster");
    if (window.console) console.warn("[MZ] cinema", e);
    if (window.__mzErrors) window.__mzErrors.push({ m: "cinema: " + (e && e.message), s: "cinema.js", l: 0 });
    // Échec avant que le visiteur ne soit entré dans le film : on le retire, la page commence au hero.
    if (window.scrollY < 40) {
      html.classList.remove("has-film", "cinema-on");
      section.remove();
      const node = $('.rail-node[href="#film"]');
      if (node) node.remove();
      const f = flowCanvas();
      if (f) f.start();
      if (MZ.scroll && MZ.scroll.refresh) MZ.scroll.refresh();
    }
  }

  window.addEventListener("resize", measure);
  measure();
  requestAnimationFrame(frame);

  if (CFG.video) {
    film = buildVideo(CFG.video);
    mode = "video";
    measure();
  } else {
    const timer = setTimeout(() => {
      if (!film) fail(new Error("three.js timeout"));
    }, 9000);
    import(THREE_URL)
      .then((THREE) => {
        if (mode === "poster" && !document.body.contains(section)) return;
        clearTimeout(timer);
        film = buildScene(THREE);
        mode = "3d";
        section.classList.add("is-ready");
        measure();
      })
      .catch((e) => {
        clearTimeout(timer);
        fail(e);
      });
  }

  MZ.cinema = {
    end: () => (document.body.contains(section) ? section.offsetTop + section.offsetHeight : 0),
    state: () => ({ mode, p, sp, speed: camSpeed, covering, render: film && film.info ? film.info() : null }),
    /** Diagnostic : rend l'image du film à la progression p (0–1) et la renvoie en JPEG (data URL). */
    still(at, width, height) {
      if (mode !== "3d" || !film) return null;
      film.resize(width || w, height || h);
      film.render(clamp(at, 0, 1), 16, performance.now() / 1000);
      const url = canvas.toDataURL("image/jpeg", 0.85);
      measure();
      return url;
    },
  };
  } catch (e) {
    // Une erreur d'initialisation ne doit jamais laisser un grand vide en haut de page.
    html.classList.remove("has-film", "cinema-on");
    section.remove();
    if (window.console) console.error("[MZ] cinema", e);
    if (window.__mzErrors) window.__mzErrors.push({ m: "cinema: " + (e && e.message), s: "cinema.js", l: 0 });
  }
})();
