const express = require("express");
const db = require("../db");
const { versIso, ajouterEvenement, urlPublique } = require("../lib/outils");
const { validerPaiement } = require("../lib/paiements");
const { envoyerSms } = require("../lib/sms");
const { lignesCommande, totalCommande, changerStatut, enregistrerPaiement, supprimerCommande } = require("../lib/commandes");
const router = express.Router();

const STATUTS_VALIDES = ["en_attente", "confirmee", "expediee", "livree", "annulee"];

function enrichir(cmd) {
  const lignes = lignesCommande(cmd).map((v) => ({
    ...v,
    date_vente: versIso(v.date_vente),
    pack: db.prepare("SELECT id, nom, emoji, image FROM packs WHERE id = ?").get(v.pack_id),
  }));
  const vente = lignes[0] || null;
  const client = vente ? db.prepare("SELECT id, nom, telephone, ville FROM clients WHERE id = ?").get(vente.client_id) : null;
  const historique = db
    .prepare("SELECT type, statut, texte, cree_le FROM commande_evenements WHERE commande_id = ? ORDER BY cree_le")
    .all(cmd.id)
    .map((e) => ({ ...e, cree_le: versIso(e.cree_le) }));
  return {
    ...cmd,
    maj_le: versIso(cmd.maj_le),
    vente, lignes, client, pack: vente?.pack || null,
    total: totalCommande(cmd, lignes),
    historique,
  };
}
const lire = (id) => db.prepare("SELECT * FROM commandes WHERE id = ?").get(id);

// GET /api/commandes?statut=&canal=
router.get("/", (req, res) => {
  const { statut, canal } = req.query;
  let sql = "SELECT * FROM commandes WHERE 1=1";
  const params = [];
  if (statut) { sql += " AND statut = ?"; params.push(statut); }
  if (canal) { sql += " AND canal = ?"; params.push(canal); }
  sql += " ORDER BY maj_le DESC";
  res.json(db.prepare(sql).all(...params).map(enrichir));
});

// GET /api/commandes/:id
router.get("/:id", (req, res) => {
  const cmd = lire(req.params.id);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  res.json(enrichir(cmd));
});

// PATCH /api/commandes/:id/statut — { statut: "expediee" }
// Une annulation remet les articles en stock ; un rétablissement les retire.
router.patch("/:id/statut", (req, res) => {
  const { statut } = req.body;
  if (!STATUTS_VALIDES.includes(statut)) {
    return res.status(400).json({ erreur: `statut doit être l'un de : ${STATUTS_VALIDES.join(", ")}` });
  }
  const cmd = db.transaction(() => changerStatut(req.params.id, statut, req.user?.id))();
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  res.json(enrichir(cmd));
});

// POST /api/commandes/statut — { ids: [...], statut } : action groupée
router.post("/statut", (req, res) => {
  const { ids, statut } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ erreur: "ids doit être une liste non vide" });
  if (!STATUTS_VALIDES.includes(statut)) {
    return res.status(400).json({ erreur: `statut doit être l'un de : ${STATUTS_VALIDES.join(", ")}` });
  }
  const modifiees = db.transaction(() => ids.map((id) => changerStatut(String(id), statut, req.user?.id)).filter(Boolean))();
  res.json({ modifiees: modifiees.length });
});

// PATCH /api/commandes/:id — { note?, adresse_livraison? }
router.patch("/:id", (req, res) => {
  const cmd = lire(req.params.id);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  const note = req.body.note !== undefined ? String(req.body.note) : cmd.note;
  const adresse = req.body.adresse_livraison !== undefined ? String(req.body.adresse_livraison) : cmd.adresse_livraison;
  db.prepare("UPDATE commandes SET note = ?, adresse_livraison = ?, maj_le = ? WHERE id = ?").run(note, adresse, new Date().toISOString(), cmd.id);
  res.json(enrichir(lire(cmd.id)));
});

// POST /api/commandes/:id/commentaires — { texte }
router.post("/:id/commentaires", (req, res) => {
  const texte = String(req.body.texte || "").trim();
  if (!texte) return res.status(400).json({ erreur: "Le commentaire est vide" });
  if (!lire(req.params.id)) return res.status(404).json({ erreur: "Commande introuvable" });
  ajouterEvenement(req.params.id, { type: "note", texte, auteurId: req.user?.id });
  res.status(201).json(enrichir(lire(req.params.id)));
});

// PATCH /api/commandes/:id/paiement — encaisse ou confirme un paiement non réglé :
// à la livraison, transfert Mobile Money déclaré par le client (à vérifier), paiement en ligne échoué…
// { mode_paiement, montant_recu?, telephone_paiement?, reference_paiement? }
router.patch("/:id/paiement", (req, res) => {
  const cmd = lire(req.params.id);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  if (cmd.statut === "annulee") return res.status(409).json({ erreur: "Commande annulée : rien à encaisser" });
  const lignes = lignesCommande(cmd);
  if (lignes[0]?.statut_paiement === "payee") return res.status(409).json({ erreur: "Cette commande est déjà payée" });
  const p = validerPaiement(req.body, totalCommande(cmd, lignes), { encaissement: true });
  if (p.erreur) return res.status(400).json({ erreur: p.erreur });
  const maintenant = new Date().toISOString();
  const verification = lignes[0]?.statut_paiement === "a_verifier";
  db.transaction(() => {
    enregistrerPaiement(cmd, { mode: p.mode, statut: "payee", montantRecu: p.montant_recu, reference: p.reference, telephone: p.telephone, payeLe: maintenant });
    ajouterEvenement(cmd.id, { type: "paiement", texte: verification ? `Paiement vérifié et confirmé (${p.mode})` : `Paiement encaissé (${p.mode})`, auteurId: req.user?.id, date: maintenant });
  })();
  res.json(enrichir(lire(cmd.id)));
});

// POST /api/commandes/:id/envoyer-recu — envoie le lien du ticket par SMS au client.
// Le lien est construit ici : PUBLIC_URL (.env) sinon l'adresse de l'interface.
router.post("/:id/envoyer-recu", async (req, res) => {
  const cmd = lire(req.params.id);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  const vente = lignesCommande(cmd)[0];
  const client = vente && db.prepare("SELECT * FROM clients WHERE id = ?").get(vente.client_id);
  const telephone = cmd.contact_telephone || client?.telephone;
  if (!telephone) return res.status(400).json({ erreur: "Ce client n'a pas de numéro de téléphone" });
  const lien = `${urlPublique(req)}/#/recu/${cmd.jeton_recu}`;
  const boutique = db.prepare("SELECT valeur FROM parametres WHERE cle = 'nom'").get()?.valeur || "MonCommerce";
  try {
    const envoi = await envoyerSms(telephone, `${boutique} : merci pour votre achat (${cmd.numero}). Votre ticket de caisse : ${lien}`);
    ajouterEvenement(cmd.id, { type: "note", texte: `Ticket envoyé par SMS au ${telephone}`, auteurId: req.user?.id });
    res.json({ message: envoi?.simule ? "SMS simulé (aucun fournisseur configuré)" : "SMS envoyé", simule: !!envoi?.simule });
  } catch (e) {
    res.status(502).json({ erreur: "Envoi du SMS impossible pour le moment" });
  }
});

// DELETE /api/commandes/:id — supprime la commande et ses lignes ; le stock est
// réintégré sauf si la commande était déjà annulée.
router.delete("/:id", (req, res) => {
  const cmd = lire(req.params.id);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  db.transaction(() => supprimerCommande(cmd))();
  res.status(204).send();
});

module.exports = router;
