/**
 * Informations de la boutique (affichées sur les tickets de caisse).
 * GET /api/parametres — PUT /api/parametres (administrateurs)
 */
const express = require("express");
const db = require("../db");
const { adminOnly } = require("../middleware/auth");
const router = express.Router();

/*
 * nom, adresse, telephone, message (bas du ticket), slogan, whatsapp : informations publiques
 * momo_* : numéros marchands affichés aux clients pour les paiements par transfert
 * lien_* : liens de paiement des opérateurs (ex. lien marchand Wave), ouverts par le client pour payer
 * frais_livraison, livraison_gratuite_des, zone_livraison : livraison de la boutique en ligne
 * boutique_ouverte : "1" pour accepter les commandes en ligne
 */
const CLES = [
  "nom", "adresse", "telephone", "message", "slogan", "whatsapp",
  "momo_orange", "momo_mtn", "momo_moov", "momo_wave", "momo_titulaire",
  "lien_orange", "lien_mtn", "lien_moov", "lien_wave",
  "frais_livraison", "livraison_gratuite_des", "zone_livraison", "boutique_ouverte",
];
const DEFAUTS = {
  nom: "Ma Boutique", adresse: "", telephone: "", message: "Merci pour votre achat et à bientôt !",
  slogan: "", whatsapp: "",
  momo_orange: "", momo_mtn: "", momo_moov: "", momo_wave: "", momo_titulaire: "",
  lien_orange: "", lien_mtn: "", lien_moov: "", lien_wave: "",
  frais_livraison: "0", livraison_gratuite_des: "0", zone_livraison: "", boutique_ouverte: "1",
};

function lireBoutique() {
  const b = { ...DEFAUTS };
  for (const r of db.prepare("SELECT cle, valeur FROM parametres").all()) if (CLES.includes(r.cle)) b[r.cle] = r.valeur ?? "";
  return b;
}

function ecrireBoutique(valeurs) {
  const maj = db.prepare("INSERT INTO parametres (cle, valeur) VALUES (?, ?) ON CONFLICT(cle) DO UPDATE SET valeur = excluded.valeur");
  db.transaction(() => {
    for (const k of CLES) if (valeurs[k] !== undefined) maj.run(k, String(valeurs[k] ?? "").slice(0, 300));
  })();
}

router.get("/", (req, res) => res.json(lireBoutique()));

router.put("/", adminOnly, (req, res) => {
  if (req.body.nom !== undefined && !String(req.body.nom).trim()) return res.status(400).json({ erreur: "Le nom de la boutique est requis" });
  // Liens de paiement : adresses https uniquement (elles sont ouvertes par les clients)
  for (const k of CLES.filter((c) => c.startsWith("lien_"))) {
    if (req.body[k] === undefined) continue;
    const v = String(req.body[k] || "").trim();
    let ok = !v;
    try { ok = ok || new URL(v).protocol === "https:"; } catch { /* adresse invalide */ }
    if (!ok) return res.status(400).json({ erreur: "Lien de paiement invalide : collez l'adresse complète, qui commence par https://" });
    req.body[k] = v;
  }
  ecrireBoutique(req.body || {});
  res.json(lireBoutique());
});

module.exports = router;
module.exports.lireBoutique = lireBoutique;
module.exports.ecrireBoutique = ecrireBoutique;
