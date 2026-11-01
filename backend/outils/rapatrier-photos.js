/* Rapatrie sur le site les photos d'illustration de la page d'accueil (Unsplash), pour ne pas dépendre
   d'un site extérieur à l'affichage. À relancer seulement si l'on change de photo : node outils/rapatrier-photos.js
   Photos sous licence Unsplash (usage commercial libre, sans attribution obligatoire). */
const fs = require("fs");
const path = require("path");

const PHOTOS = path.join(__dirname, "..", "..", "partage", "photos");
// identifiant Unsplash → tailles utilisées (voir PHOTOS et photo() dans boutique/boutique.jsx)
const IMAGES = {
  "1758525223677-b718f428fc87": [[640, 760, 75]],   // cliente heureuse, sacs de courses
  "1758876202400-64edbefc2256": [[520, 420, 75]],   // paiement sur téléphone
  "1605896163420-830698e44fb1": [[520, 420, 75]],   // client au téléphone, chemise bleue
  "1667844141318-ee2ba9d088d6": [[640, 520, 75]],   // livraison à moto
  "1687052093309-7a14efa58ecb": [[480, 600, 75]],   // mode, tenue en wax
  "1646457417181-cb62c7194d39": [[480, 600, 75]],   // beauté et soins
  "1773858441140-613eb79ccd27": [[480, 600, 75]],   // marché, alimentation
  "1739271933163-8dcc7c8e8a3e": [[480, 600, 75]],   // téléphone et accessoires
  "1773864931052-ea56474bcc84": [[760, 560, 75]],   // créatrices dans leur boutique
};
const NAVIGATEUR = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

(async () => {
  fs.mkdirSync(PHOTOS, { recursive: true });
  for (const [id, tailles] of Object.entries(IMAGES)) {
    for (const [l, h, q] of tailles) {
      const nom = `${id}-${l}x${h}.jpg`;
      const r = await fetch(`https://images.unsplash.com/photo-${id}?w=${l}&h=${h}&fit=crop&crop=faces&q=${q}&fm=jpg`, { headers: { "User-Agent": NAVIGATEUR } });
      if (!r.ok) throw new Error(`${r.status} ${id}`);
      fs.writeFileSync(path.join(PHOTOS, nom), Buffer.from(await r.arrayBuffer()));
      console.log("photo", nom, Math.round(fs.statSync(path.join(PHOTOS, nom)).size / 1024) + " Ko");
    }
  }
})().catch((e) => { console.error(e.message); process.exit(1); });
