/* Dessine les icônes de VENDRE+ (« V+ » blanc et vert sur dégradé bleu nuit → bleu roi → vert émeraude).
   À relancer seulement si l'on change d'icône. Nécessite @resvg/resvg-js : npm i --no-save @resvg/resvg-js
   puis node outils/icones.js */
const fs = require("fs"), path = require("path");
const { Resvg } = require("@resvg/resvg-js");

const DOSSIER = path.join(__dirname, "..", "..", "boutique", "icones");
const defs = `<defs>
    <linearGradient id="f" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0B2545"/><stop offset=".55" stop-color="#1D4ED8"/><stop offset="1" stop-color="#059669"/></linearGradient>
    <radialGradient id="h" cx=".78" cy=".2" r=".7"><stop offset="0" stop-color="#34D399" stop-opacity=".45"/><stop offset="1" stop-color="#34D399" stop-opacity="0"/></radialGradient>
  </defs>`;
// Le « V+ », tracé en formes (aucune police nécessaire), dans un carré de 100
const marque = `
  <path d="M20 30 L40 72 L60 30" fill="none" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M80 24 V46 M69 35 H91" fill="none" stroke="#6EE7B7" stroke-width="8" stroke-linecap="round"/>`;
const icone = (masquable) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">${defs}
  <rect width="100" height="100" rx="${masquable ? 0 : 22}" fill="url(#f)"/>
  <rect width="100" height="100" rx="${masquable ? 0 : 22}" fill="url(#h)"/>
  <g transform="translate(50 50) scale(${masquable ? 0.66 : 0.86}) translate(-50 -50)">${marque}</g></svg>`;

fs.writeFileSync(path.join(DOSSIER, "icone.svg"), icone(false) + "\n");
for (const [nom, taille, masquable] of [["icone-180.png", 180, false], ["icone-192.png", 192, false], ["icone-512.png", 512, false], ["icone-masquable-512.png", 512, true]]) {
  const png = new Resvg(icone(masquable), { fitTo: { mode: "width", value: taille } }).render().asPng();
  fs.writeFileSync(path.join(DOSSIER, nom), png);
  console.log(nom, png.length, "octets");
}
