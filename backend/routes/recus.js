/**
 * Ticket de caisse public : GET /api/recus/:jeton
 * Accessible SANS connexion par le client (lien envoyé ou QR code imprimé sur
 * le ticket). Le jeton de 24 caractères aléatoires rend le lien impossible à
 * deviner ; seules les informations du ticket sont exposées.
 */
const express = require("express");
const db = require("../db");
const { ticketCommande } = require("../lib/commandes");
const router = express.Router();

router.get("/:jeton", (req, res) => {
  const jeton = String(req.params.jeton);
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(jeton)) return res.status(404).json({ erreur: "Ticket introuvable" });
  const cmd = db.prepare("SELECT * FROM commandes WHERE jeton_recu = ?").get(jeton);
  if (!cmd) return res.status(404).json({ erreur: "Ticket introuvable" });
  res.json(ticketCommande(cmd));
});

module.exports = router;
