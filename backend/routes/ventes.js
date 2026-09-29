const express = require("express");
const { nanoid } = require("nanoid");
const { validerPaiement } = require("../lib/paiements");
const db = require("../db");
const { idOuNouveau, versIso, prochainNumero, ajouterEvenement } = require("../lib/outils");
const router = express.Router();

function enrichir(vente) {
  const client = db.prepare("SELECT id, nom, telephone, ville FROM clients WHERE id = ?").get(vente.client_id);
  const pack = db.prepare("SELECT id, nom, emoji, prix FROM packs WHERE id = ?").get(vente.pack_id);
  const commande = db.prepare("SELECT * FROM commandes WHERE id = ? OR vente_id = ?").get(vente.commande_id, vente.id);
  return { ...vente, date_vente: versIso(vente.date_vente), total: vente.quantite * vente.prix_unitaire, client, pack, commande };
}

// GET /api/ventes?clientId=&dateDebut=&dateFin=
router.get("/", (req, res) => {
  const { clientId, dateDebut, dateFin } = req.query;
  let sql = "SELECT * FROM ventes WHERE 1=1";
  const params = [];
  if (clientId) { sql += " AND client_id = ?"; params.push(clientId); }
  if (dateDebut) { sql += " AND date_vente >= ?"; params.push(dateDebut); }
  if (dateFin) { sql += " AND date_vente <= ?"; params.push(dateFin); }
  sql += " ORDER BY date_vente DESC";
  res.json(db.prepare(sql).all(...params).map(enrichir));
});

// GET /api/ventes/:id
router.get("/:id", (req, res) => {
  const vente = db.prepare("SELECT * FROM ventes WHERE id = ?").get(req.params.id);
  if (!vente) return res.status(404).json({ erreur: "Vente introuvable" });
  res.json(enrichir(vente));
});

// POST /api/ventes — enregistre la vente, décrémente le stock et génère
// automatiquement la commande à suivre.
// { id?, commande_id?, client_id, pack_id, quantite, adresse_livraison?,
//   mode_paiement, montant_recu? (espèces), telephone_paiement? (Mobile Money), reference_paiement? }
router.post("/", (req, res) => {
  const { client_id, pack_id, quantite, adresse_livraison } = req.body;
  if (!client_id || !pack_id) {
    return res.status(400).json({ erreur: "client_id et pack_id sont requis" });
  }
  const client = db.prepare("SELECT * FROM clients WHERE id = ? AND supprime = 0").get(client_id);
  const pack = db.prepare("SELECT * FROM packs WHERE id = ? AND supprime = 0").get(pack_id);
  if (!client) return res.status(404).json({ erreur: "Client introuvable" });
  if (!pack) return res.status(404).json({ erreur: "Pack introuvable" });

  const qte = Math.max(1, Math.round(Number(quantite) || 1));
  if (pack.stock < qte) {
    return res.status(409).json({ erreur: `Stock insuffisant pour ${pack.nom} (disponible : ${pack.stock})` });
  }
  const paiement = validerPaiement(req.body, qte * pack.prix);
  if (paiement.erreur) return res.status(400).json({ erreur: paiement.erreur });

  const venteId = idOuNouveau(req.body.id);
  const commandeId = idOuNouveau(req.body.commande_id);
  if (db.prepare("SELECT id FROM ventes WHERE id = ?").get(venteId)) return res.status(409).json({ erreur: "Identifiant déjà utilisé" });

  db.transaction(() => {
    const maintenant = new Date().toISOString();
    db.prepare(
      `INSERT INTO ventes (id, commande_id, client_id, pack_id, vendeur_id, quantite, prix_unitaire, mode_paiement, statut_paiement,
         montant_recu, reference_paiement, telephone_paiement, paye_le, date_vente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      venteId, commandeId, client_id, pack_id, req.user?.id || null, qte, pack.prix, paiement.mode, paiement.statut,
      paiement.montant_recu, paiement.reference, paiement.telephone, paiement.statut === "payee" ? maintenant : null, maintenant
    );

    db.prepare("UPDATE packs SET stock = stock - ? WHERE id = ?").run(qte, pack_id);

    db.prepare(
      "INSERT INTO commandes (id, vente_id, numero, statut, adresse_livraison, jeton_recu, maj_le) VALUES (?, ?, ?, 'en_attente', ?, ?, ?)"
    ).run(commandeId, venteId, prochainNumero(), adresse_livraison ?? client.ville ?? "", nanoid(24), maintenant);
    ajouterEvenement(commandeId, { statut: "en_attente", auteurId: req.user?.id, date: maintenant });
  })();

  res.status(201).json(enrichir(db.prepare("SELECT * FROM ventes WHERE id = ?").get(venteId)));
});

// DELETE /api/ventes/:id — supprime une ligne de vente ; restitue le stock sauf si
// la commande était déjà annulée. Une commande sans ligne restante est supprimée.
router.delete("/:id", (req, res) => {
  const vente = db.prepare("SELECT * FROM ventes WHERE id = ?").get(req.params.id);
  if (!vente) return res.status(404).json({ erreur: "Vente introuvable" });
  const cmd = db.prepare("SELECT * FROM commandes WHERE id = ? OR vente_id = ?").get(vente.commande_id, vente.id);
  db.transaction(() => {
    if (cmd?.statut !== "annulee") db.prepare("UPDATE packs SET stock = stock + ? WHERE id = ?").run(vente.quantite, vente.pack_id);
    if (cmd && cmd.vente_id === vente.id) {
      const autre = db.prepare("SELECT id FROM ventes WHERE commande_id = ? AND id <> ? LIMIT 1").get(cmd.id, vente.id);
      if (autre) db.prepare("UPDATE commandes SET vente_id = ? WHERE id = ?").run(autre.id, cmd.id);
    }
    db.prepare("DELETE FROM ventes WHERE id = ?").run(req.params.id);
  })();
  res.status(204).send();
});

module.exports = router;
