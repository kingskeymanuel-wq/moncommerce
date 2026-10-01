const express = require("express");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const { nanoid } = require("nanoid");
const db = require("../db");
const { signToken, authRequired, adminOnly } = require("../middleware/auth");
const { normTel } = require("../lib/outils");

const router = express.Router();

const nbUtilisateurs = () => db.prepare("SELECT COUNT(*) AS n FROM utilisateurs").get().n;

/**
 * Comptes créés au démarrage à partir des variables d'environnement (facultatif) :
 *   COMPTE_ADMIN_NOM / COMPTE_ADMIN_TELEPHONE / COMPTE_ADMIN_MOT_DE_PASSE
 *   COMPTE_VENDEUR_NOM / COMPTE_VENDEUR_TELEPHONE / COMPTE_VENDEUR_MOT_DE_PASSE
 * Utile sur un hébergement sans disque persistant : les comptes sont recréés à chaque redémarrage.
 * Un compte déjà existant (même téléphone) n'est jamais modifié.
 */
for (const [prefixe, role, nomDefaut] of [["COMPTE_ADMIN", "admin", "Administrateur"], ["COMPTE_VENDEUR", "vendeur", "Vendeur"]]) {
  const telephone = normTel(process.env[`${prefixe}_TELEPHONE`]);
  const mdp = process.env[`${prefixe}_MOT_DE_PASSE`];
  if (!telephone || !mdp) continue;
  if (String(mdp).length < 6) { console.warn(`⚠️  ${prefixe}_MOT_DE_PASSE trop court (6 caractères minimum) : compte non créé`); continue; }
  if (db.prepare("SELECT id FROM utilisateurs WHERE telephone = ?").get(telephone)) continue;
  db.prepare("INSERT INTO utilisateurs (id, nom, telephone, mot_de_passe, role) VALUES (?, ?, ?, ?, ?)")
    .run(nanoid(), process.env[`${prefixe}_NOM`] || nomDefaut, telephone, bcrypt.hashSync(String(mdp), 10), role);
  console.log(`   Compte ${role} créé depuis les variables d'environnement (${telephone})`);
}
const profil = (u) => ({ id: u.id, nom: u.nom, telephone: u.telephone, email: u.email, role: u.role });

// Code d'installation (CODE_INSTALLATION) : une fois le site en ligne, empêche un
// inconnu de créer le premier compte administrateur avant le propriétaire.
const CODE_INSTALLATION = process.env.CODE_INSTALLATION || "";
function codeInstallationValide(code) {
  if (!CODE_INSTALLATION) return true;
  const a = Buffer.from(String(code || "")), b = Buffer.from(CODE_INSTALLATION);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// GET /api/auth/etat — le premier compte (administrateur) reste-t-il à créer ? faut-il un code ?
router.get("/etat", (req, res) => {
  res.json({ initialise: nbUtilisateurs() > 0, code_installation: Boolean(CODE_INSTALLATION) });
});

// POST /api/auth/inscription — { nom, telephone, mot_de_passe, email?, role?, code_installation? }
// Le tout premier compte devient administrateur (code d'installation exigé s'il est défini).
// Ensuite, seul un administrateur connecté peut créer des comptes.
function inscriptionAutorisee(req, res, next) {
  if (nbUtilisateurs() === 0) {
    if (!codeInstallationValide(req.body.code_installation)) {
      return res.status(403).json({ erreur: "Code d'installation incorrect (variable CODE_INSTALLATION de l'hébergement)." });
    }
    return next();
  }
  authRequired(req, res, () => adminOnly(req, res, next));
}

router.post("/inscription", inscriptionAutorisee, (req, res) => {
  const { nom, mot_de_passe, email, role } = req.body;
  const telephone = normTel(req.body.telephone);
  if (!nom || !telephone || !mot_de_passe) {
    return res.status(400).json({ erreur: "nom, telephone et mot_de_passe sont requis" });
  }
  if (String(mot_de_passe).length < 6) {
    return res.status(400).json({ erreur: "Le mot de passe doit contenir au moins 6 caractères" });
  }
  const existe = db.prepare("SELECT id FROM utilisateurs WHERE telephone = ?").get(telephone);
  if (existe) return res.status(409).json({ erreur: "Un compte existe déjà avec ce numéro" });

  const premier = nbUtilisateurs() === 0;
  const id = nanoid();
  const hash = bcrypt.hashSync(mot_de_passe, 10);
  db.prepare(
    "INSERT INTO utilisateurs (id, nom, telephone, email, mot_de_passe, role) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, nom, telephone, email || null, hash, premier || role === "admin" ? "admin" : "vendeur");

  res.status(201).json({ message: "Compte créé", utilisateur: profil(db.prepare("SELECT * FROM utilisateurs WHERE id = ?").get(id)) });
});

// POST /api/auth/connexion — { telephone, mot_de_passe } → { utilisateur, jeton }
router.post("/connexion", (req, res) => {
  const { mot_de_passe } = req.body;
  const telephone = normTel(req.body.telephone);
  if (!telephone || !mot_de_passe) {
    return res.status(400).json({ erreur: "telephone et mot_de_passe sont requis" });
  }
  const user = db.prepare("SELECT * FROM utilisateurs WHERE telephone = ?").get(telephone);
  if (!user || !bcrypt.compareSync(String(mot_de_passe), user.mot_de_passe)) {
    return res.status(401).json({ erreur: "Numéro ou mot de passe incorrect" });
  }
  res.json({ utilisateur: profil(user), jeton: signToken(user) });
});

// GET /api/auth/moi
router.get("/moi", authRequired, (req, res) => {
  const user = db.prepare("SELECT * FROM utilisateurs WHERE id = ?").get(req.user.id);
  if (!user) return res.status(401).json({ erreur: "Compte introuvable" });
  res.json({ utilisateur: profil(user) });
});

module.exports = router;
