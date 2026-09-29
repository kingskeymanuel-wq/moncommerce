/**
 * Boutique en ligne — API publique (sans connexion) utilisée par le site client.
 *
 *   GET  /api/boutique/config                  informations, livraison, moyens de paiement
 *   GET  /api/boutique/produits                catalogue (produits actifs)
 *   GET  /api/boutique/produits/:id
 *   POST /api/boutique/commandes               passer commande (prix et stock vérifiés ici)
 *   GET  /api/boutique/commandes/:jeton        suivi de commande + ticket
 *   POST /api/boutique/paiements/cinetpay/notification   webhook CinetPay
 *
 * Paiements proposés :
 *   - livraison : le client paie le livreur ; la commande reste « à encaisser »
 *   - transfert : le client envoie l'argent sur un numéro Mobile Money de la boutique
 *                 et saisit l'ID de transaction ; la boutique vérifie puis confirme
 *   - en_ligne  : CinetPay (si les clés sont configurées), confirmé automatiquement
 */
const express = require("express");
const crypto = require("crypto");
const { nanoid } = require("nanoid");
const rateLimit = require("express-rate-limit");
const db = require("../db");
const { normTel, prochainNumero, ajouterEvenement, versIso, urlPublique } = require("../lib/outils");
const { lireBoutique } = require("./parametres");
const { lignesCommande, totalCommande, changerStatut, enregistrerPaiement, ticketCommande, nomCourt } = require("../lib/commandes");
const cinetpay = require("../lib/cinetpay");
const router = express.Router();

const OPERATEURS = [
  { cle: "momo_orange", mode: "Orange Money" },
  { cle: "momo_mtn", mode: "MTN MoMo" },
  { cle: "momo_moov", mode: "Moov Money" },
  { cle: "momo_wave", mode: "Wave" },
];
const MAX_LIGNES = 30;
const MAX_QTE = 50;
const DELAI_ABANDON_MIN = 60; // paiement en ligne non finalisé → commande annulée, stock libéré

function configPublique() {
  const b = lireBoutique();
  const frais = Math.max(0, Math.round(Number(b.frais_livraison) || 0));
  const gratuite = Math.max(0, Math.round(Number(b.livraison_gratuite_des) || 0));
  return {
    boutique: { nom: b.nom, slogan: b.slogan, adresse: b.adresse, telephone: b.telephone, whatsapp: b.whatsapp, message: b.message },
    ouverte: b.boutique_ouverte !== "0",
    livraison: { frais, gratuite_des: gratuite, zone: b.zone_livraison },
    paiements: {
      livraison: true,
      transfert: OPERATEURS.filter((o) => String(b[o.cle] || "").trim()).map((o) => ({ mode: o.mode, numero: String(b[o.cle]).trim(), titulaire: b.momo_titulaire || b.nom })),
      en_ligne: cinetpay.estConfigure(),
      en_ligne_test: cinetpay.estConfigure() && cinetpay.estBacASable(),
    },
  };
}
const fraisPour = (st, cfg) => (cfg.livraison.gratuite_des > 0 && st >= cfg.livraison.gratuite_des ? 0 : cfg.livraison.frais);

function produitsPublics() {
  const vendus = new Map(db.prepare(
    `SELECT v.pack_id, SUM(v.quantite) AS n FROM ventes v LEFT JOIN commandes c ON c.id = v.commande_id
     WHERE COALESCE(c.statut, '') <> 'annulee' GROUP BY v.pack_id`
  ).all().map((r) => [r.pack_id, r.n]));
  return db.prepare("SELECT * FROM packs WHERE supprime = 0 AND actif = 1 ORDER BY cree_le DESC").all().map((p) => ({
    id: p.id, nom: p.nom, description: p.description || "", prix: p.prix, image: p.image, emoji: p.emoji, teinte: p.teinte,
    stock: Math.max(0, p.stock), disponible: p.stock > 0, ventes: vendus.get(p.id) || 0, cree_le: versIso(p.cree_le),
  }));
}

const lireParJeton = (jeton) => (/^[A-Za-z0-9_-]{16,64}$/.test(String(jeton)) ? db.prepare("SELECT * FROM commandes WHERE jeton_recu = ?").get(String(jeton)) : null);

/* ---------------------------------------------------------------- lecture */

router.get("/config", (req, res) => res.json(configPublique()));

router.get("/produits", (req, res) => res.json(produitsPublics()));

router.get("/produits/:id", (req, res) => {
  const p = produitsPublics().find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ erreur: "Produit introuvable" });
  res.json(p);
});

/* ---------------------------------------------------------------- commande */

const limiteCommandes = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false, message: { erreur: "Trop de commandes depuis cette connexion, réessayez dans quelques minutes." } });

function validerClient(c = {}, exigerEmail) {
  const client = {
    nom: String(c.nom || "").trim().replace(/\s+/g, " ").slice(0, 80),
    telephone: String(c.telephone || "").trim().slice(0, 30),
    email: String(c.email || "").trim().toLowerCase().slice(0, 120),
    adresse: String(c.adresse || "").trim().slice(0, 200),
    ville: String(c.ville || "").trim().slice(0, 80),
    instructions: String(c.instructions || "").trim().slice(0, 300),
  };
  if (client.nom.length < 2) return { erreur: "Indiquez votre nom complet." };
  if (normTel(client.telephone).replace(/\D/g, "").length < 8) return { erreur: "Indiquez un numéro de téléphone valide." };
  if (client.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(client.email)) return { erreur: "Adresse e-mail invalide." };
  if (exigerEmail && !client.email) return { erreur: "L'adresse e-mail est obligatoire pour le paiement en ligne (reçu de l'opérateur)." };
  if (client.adresse.length < 3) return { erreur: "Indiquez l'adresse de livraison (quartier, rue, repère)." };
  return { client };
}

function trouverOuCreerClient(c) {
  const tel = normTel(c.telephone).replace(/\D/g, "");
  const existant = db.prepare("SELECT * FROM clients WHERE supprime = 0").all().find((x) => normTel(x.telephone).replace(/\D/g, "") === tel);
  if (existant) {
    db.prepare("UPDATE clients SET email = COALESCE(NULLIF(email, ''), ?), ville = COALESCE(NULLIF(ville, ''), ?) WHERE id = ?")
      .run(c.email || null, c.ville || null, existant.id);
    return existant.id;
  }
  const id = nanoid();
  db.prepare("INSERT INTO clients (id, nom, telephone, email, ville, statut, notes, cree_le) VALUES (?, ?, ?, ?, ?, 'Standard', ?, ?)")
    .run(id, c.nom, c.telephone, c.email || null, c.ville || null, "Client inscrit via la boutique en ligne", new Date().toISOString());
  return id;
}

router.post("/commandes", limiteCommandes, async (req, res) => {
  const cfg = configPublique();
  if (!cfg.ouverte) return res.status(403).json({ erreur: "La boutique n'accepte pas de commandes en ligne pour le moment." });

  // Lignes : regroupées par produit, quantités entières
  const brutes = Array.isArray(req.body.lignes) ? req.body.lignes : [];
  const qtes = new Map();
  for (const l of brutes) {
    const q = Math.round(Number(l?.quantite));
    if (!l?.pack_id || !Number.isFinite(q) || q < 1) continue;
    qtes.set(String(l.pack_id), Math.min(MAX_QTE, (qtes.get(String(l.pack_id)) || 0) + q));
  }
  if (qtes.size === 0) return res.status(400).json({ erreur: "Votre panier est vide." });
  if (qtes.size > MAX_LIGNES) return res.status(400).json({ erreur: `${MAX_LIGNES} produits différents au maximum par commande.` });

  // Prix et stock lus en base : le navigateur n'a jamais le dernier mot
  const lignes = [];
  const indisponibles = [];
  for (const [packId, q] of qtes) {
    const p = db.prepare("SELECT * FROM packs WHERE id = ? AND supprime = 0 AND actif = 1").get(packId);
    if (!p) { indisponibles.push({ pack_id: packId, nom: "Produit retiré", disponible: 0 }); continue; }
    if (p.stock < q) { indisponibles.push({ pack_id: p.id, nom: p.nom, disponible: Math.max(0, p.stock) }); continue; }
    lignes.push({ pack: p, quantite: q });
  }
  if (indisponibles.length) {
    return res.status(409).json({ erreur: "Certains articles ne sont plus disponibles en quantité suffisante.", indisponibles });
  }

  const paiement = req.body.paiement || {};
  const modePaiement = ["livraison", "transfert", "en_ligne"].includes(paiement.mode) ? paiement.mode : null;
  if (!modePaiement) return res.status(400).json({ erreur: "Choisissez un mode de paiement." });

  const v = validerClient(req.body.client, modePaiement === "en_ligne");
  if (v.erreur) return res.status(400).json({ erreur: v.erreur });
  const client = v.client;

  const sousTotal = lignes.reduce((s, l) => s + l.quantite * l.pack.prix, 0);
  const frais = fraisPour(sousTotal, cfg);
  const total = sousTotal + frais;

  let champsPaiement;
  if (modePaiement === "livraison") {
    champsPaiement = { mode: "Paiement à la livraison", statut: "en_attente" };
  } else if (modePaiement === "transfert") {
    const op = cfg.paiements.transfert.find((o) => o.mode === paiement.operateur);
    if (!op) return res.status(400).json({ erreur: "Opérateur Mobile Money non disponible." });
    const ref = String(paiement.reference || "").trim().slice(0, 60);
    const telPayeur = String(paiement.telephone || "").trim().slice(0, 30);
    if (normTel(telPayeur).replace(/\D/g, "").length < 8) return res.status(400).json({ erreur: `Indiquez le numéro ${op.mode} qui a envoyé le paiement.` });
    if (ref.length < 4) return res.status(400).json({ erreur: "Indiquez l'ID de transaction reçu par SMS après votre transfert." });
    champsPaiement = { mode: op.mode, statut: "a_verifier", reference: ref, telephone: telPayeur };
  } else {
    if (!cfg.paiements.en_ligne) return res.status(400).json({ erreur: "Le paiement en ligne n'est pas disponible." });
    if (total < 100 || total > 2500000) return res.status(400).json({ erreur: "Le paiement en ligne accepte les montants de 100 à 2 500 000 FCFA." });
    champsPaiement = { mode: "Paiement en ligne", statut: "en_cours" };
  }

  // Création de la commande (transaction : tout ou rien)
  const commandeId = nanoid();
  const jeton = nanoid(24);
  const maintenant = new Date().toISOString();
  let numero;
  try {
    db.transaction(() => {
      const clientId = trouverOuCreerClient(client);
      numero = prochainNumero();
      const venteIds = [];
      const insVente = db.prepare(
        `INSERT INTO ventes (id, commande_id, client_id, pack_id, quantite, prix_unitaire, mode_paiement, statut_paiement,
           reference_paiement, telephone_paiement, date_vente) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      const decStock = db.prepare("UPDATE packs SET stock = stock - ? WHERE id = ? AND stock >= ?");
      for (const l of lignes) {
        // Décrément conditionnel : protège contre deux commandes simultanées sur le dernier article
        if (decStock.run(l.quantite, l.pack.id, l.quantite).changes !== 1) throw Object.assign(new Error("stock"), { stock: l.pack });
        const id = nanoid();
        venteIds.push(id);
        insVente.run(id, commandeId, clientId, l.pack.id, l.quantite, l.pack.prix, champsPaiement.mode, champsPaiement.statut,
          champsPaiement.reference || null, champsPaiement.telephone || null, maintenant);
      }
      db.prepare(
        `INSERT INTO commandes (id, vente_id, numero, statut, adresse_livraison, note, jeton_recu, canal, frais_livraison, contact_telephone, contact_email, maj_le)
         VALUES (?, ?, ?, 'en_attente', ?, ?, ?, 'en_ligne', ?, ?, ?, ?)`
      ).run(commandeId, venteIds[0], numero, [client.adresse, client.ville].filter(Boolean).join(", "), client.instructions || null,
        jeton, frais, client.telephone, client.email || null, maintenant);
      ajouterEvenement(commandeId, { statut: "en_attente", texte: "Commande passée sur la boutique en ligne", date: maintenant });
      if (modePaiement === "transfert") {
        ajouterEvenement(commandeId, { type: "paiement", texte: `Transfert ${champsPaiement.mode} déclaré par le client (réf. ${champsPaiement.reference}) — à vérifier`, date: maintenant });
      }
    })();
  } catch (e) {
    if (e.stock) return res.status(409).json({ erreur: `${e.stock.nom} vient d'être épuisé.`, indisponibles: [{ pack_id: e.stock.id, nom: e.stock.nom, disponible: 0 }] });
    throw e;
  }

  const reponse = { numero, jeton, total, redirection: null };

  if (modePaiement === "en_ligne") {
    const base = urlPublique(req);
    const merchantId = ("MC" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex")).toUpperCase().slice(0, 30);
    const [prenom, ...reste] = client.nom.split(" ");
    const nomFamille = reste.join(" ") || prenom;
    try {
      const init = await cinetpay.initialiserPaiement({
        merchantTransactionId: merchantId,
        montant: total,
        designation: `Commande ${numero} — ${cfg.boutique.nom}`,
        email: client.email,
        prenom: prenom.length >= 2 ? prenom : prenom + ".",
        nom: nomFamille.length >= 2 ? nomFamille : nomFamille + ".",
        telephone: client.telephone,
        successUrl: `${base}/#/commande/${jeton}`,
        failedUrl: `${base}/#/commande/${jeton}`,
        notifyUrl: `${base}/api/boutique/paiements/cinetpay/notification`,
      });
      db.prepare(
        `INSERT INTO paiements_en_ligne (id, commande_id, merchant_transaction_id, transaction_id, notify_token, payment_url, montant, statut, cree_le)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(nanoid(), commandeId, merchantId, init.transactionId, init.notifyToken, init.paymentUrl, total, init.statut, new Date().toISOString());
      reponse.redirection = init.paymentUrl;
    } catch (e) {
      // Échec d'initialisation : on libère le stock et on l'indique clairement au client
      db.transaction(() => {
        enregistrerPaiement(db.prepare("SELECT * FROM commandes WHERE id = ?").get(commandeId), { mode: "Paiement en ligne", statut: "echoue" });
        changerStatut(commandeId, "annulee", null, "Paiement en ligne impossible à initialiser");
      })();
      console.error("CinetPay :", e.message);
      return res.status(502).json({ erreur: `Le paiement en ligne est indisponible pour le moment (${e.message}). Choisissez un autre mode de paiement.` });
    }
  }

  res.status(201).json(reponse);
});

/* ---------------------------------------------------------------- paiement en ligne */

/** Interroge CinetPay et met la commande à jour (payée, ou annulée si le paiement a échoué). */
async function verifierPaiementEnLigne(cmd) {
  const p = db.prepare("SELECT * FROM paiements_en_ligne WHERE commande_id = ? ORDER BY cree_le DESC LIMIT 1").get(cmd.id);
  if (!p || !cinetpay.estConfigure()) return;
  const r = await cinetpay.statutPaiement(p.transaction_id || p.merchant_transaction_id);
  const maintenant = new Date().toISOString();
  db.prepare("UPDATE paiements_en_ligne SET statut = ?, verifie_le = ?, transaction_id = COALESCE(transaction_id, ?) WHERE id = ?").run(r.statut, maintenant, r.transactionId, p.id);
  const actuel = db.prepare("SELECT * FROM commandes WHERE id = ?").get(cmd.id);
  const ligne = lignesCommande(actuel)[0];
  if (!ligne || ligne.statut_paiement === "payee") return;
  if (r.reussi) {
    db.transaction(() => {
      if (actuel.statut === "annulee") changerStatut(actuel.id, "en_attente", null, "Paiement reçu après annulation : commande rétablie");
      enregistrerPaiement(actuel, { mode: "Paiement en ligne", statut: "payee", reference: r.transactionId || p.transaction_id || p.merchant_transaction_id, payeLe: maintenant });
      ajouterEvenement(actuel.id, { type: "paiement", texte: `Paiement en ligne confirmé par CinetPay (${totalCommande(actuel)} FCFA)`, date: maintenant });
    })();
  } else if (r.echoue && actuel.statut !== "annulee") {
    db.transaction(() => {
      enregistrerPaiement(actuel, { mode: "Paiement en ligne", statut: "echoue", reference: p.transaction_id });
      changerStatut(actuel.id, "annulee", null, `Paiement en ligne non abouti (${r.statut})`);
    })();
  }
}

// Webhook CinetPay : on authentifie la notification (notify_token), puis on
// redemande le statut à CinetPay plutôt que de croire le contenu reçu.
router.post("/paiements/cinetpay/notification", async (req, res) => {
  const { notify_token: recu, merchant_transaction_id: mid, transaction_id: tid } = req.body || {};
  const p = mid ? db.prepare("SELECT * FROM paiements_en_ligne WHERE merchant_transaction_id = ?").get(String(mid)) : null;
  if (!p || !recu || !p.notify_token) return res.status(404).json({ erreur: "Transaction inconnue" });
  const a = Buffer.from(String(recu)), b = Buffer.from(String(p.notify_token));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ erreur: "Notification non authentifiée" });
  if (tid && !p.transaction_id) db.prepare("UPDATE paiements_en_ligne SET transaction_id = ? WHERE id = ?").run(String(tid), p.id);
  try {
    await verifierPaiementEnLigne(db.prepare("SELECT * FROM commandes WHERE id = ?").get(p.commande_id));
    res.json({ message: "OK" });
  } catch (e) {
    console.error("Notification CinetPay :", e.message);
    res.status(502).json({ erreur: "Vérification impossible, renvoyez la notification" });
  }
});

/* ---------------------------------------------------------------- suivi */

router.get("/commandes/:jeton", async (req, res) => {
  let cmd = lireParJeton(req.params.jeton);
  if (!cmd) return res.status(404).json({ erreur: "Commande introuvable" });
  let ligne = lignesCommande(cmd)[0];

  // Retour depuis la page de paiement : on vérifie auprès de CinetPay (au plus toutes les 5 s)
  if (ligne?.statut_paiement === "en_cours") {
    const p = db.prepare("SELECT verifie_le FROM paiements_en_ligne WHERE commande_id = ? ORDER BY cree_le DESC LIMIT 1").get(cmd.id);
    if (!p?.verifie_le || Date.now() - new Date(p.verifie_le).getTime() > 5000) {
      try { await verifierPaiementEnLigne(cmd); } catch (e) { console.error("Vérification CinetPay :", e.message); }
      cmd = lireParJeton(req.params.jeton);
      ligne = lignesCommande(cmd)[0];
    }
  }

  const cfg = configPublique();
  const t = ticketCommande(cmd);
  const etapes = db.prepare("SELECT type, statut, texte, cree_le FROM commande_evenements WHERE commande_id = ? AND type <> 'note' ORDER BY cree_le")
    .all(cmd.id).map((e) => ({ ...e, cree_le: versIso(e.cree_le) }));
  const enLigne = db.prepare("SELECT payment_url, statut FROM paiements_en_ligne WHERE commande_id = ? ORDER BY cree_le DESC LIMIT 1").get(cmd.id);
  const operateur = cfg.paiements.transfert.find((o) => o.mode === ligne?.mode_paiement);
  res.json({
    ...t,
    jeton: cmd.jeton_recu,
    adresse_livraison: cmd.adresse_livraison,
    etapes,
    reprendre_paiement: ligne?.statut_paiement === "en_cours" ? enLigne?.payment_url || null : null,
    transfert: ligne?.statut_paiement === "a_verifier" && operateur ? operateur : null,
    contact: { telephone: cfg.boutique.telephone, whatsapp: cfg.boutique.whatsapp },
    client: nomCourt(t.client),
  });
});

/* ---------------------------------------------------------------- abandons */

// Paiements en ligne jamais finalisés : vérification puis libération du stock
function nettoyerAbandons() {
  if (!cinetpay.estConfigure()) return;
  const limite = new Date(Date.now() - DELAI_ABANDON_MIN * 60 * 1000).toISOString();
  const cmds = db.prepare(
    `SELECT DISTINCT c.* FROM commandes c JOIN ventes v ON v.commande_id = c.id
     WHERE v.statut_paiement = 'en_cours' AND c.statut <> 'annulee' AND c.maj_le < ?`
  ).all(limite);
  for (const c of cmds) {
    verifierPaiementEnLigne(c).then(() => {
      const l = lignesCommande(c)[0];
      if (l?.statut_paiement === "en_cours") {
        db.transaction(() => {
          enregistrerPaiement(c, { mode: "Paiement en ligne", statut: "echoue" });
          changerStatut(c.id, "annulee", null, `Paiement en ligne non finalisé après ${DELAI_ABANDON_MIN} min`);
        })();
      }
    }).catch((e) => console.error("Nettoyage des paiements :", e.message));
  }
}
setInterval(nettoyerAbandons, 10 * 60 * 1000).unref();

module.exports = router;
