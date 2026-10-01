/**
 * Données de test — boutiques de produits de beauté.
 *
 * Quand la plateforme est vide (aucun espace), deux espaces de démonstration
 * sont créés au démarrage : administrateurs, vendeurs, produits, clients et
 * quelques ventes. L'écran « Mon espace » propose alors ces comptes de test.
 *
 * ⚠️ Ces comptes sont publics (identifiants ci-dessous). Avant une utilisation
 * réelle, désactivez-les avec DONNEES_TEST=0 (ou changez MOT_DE_PASSE_TEST).
 */
const { nanoid } = require("nanoid");
const db = require("./index");
const { mouvement } = require("../lib/stock");
const { prochainNumero, ajouterEvenement } = require("../lib/outils");

const ACTIF = process.env.DONNEES_TEST !== "0";
const MOT_DE_PASSE = process.env.MOT_DE_PASSE_TEST || "test-2026";
const jours = (n, heure = 10) => { const d = new Date(Date.now() - n * 864e5); d.setUTCHours(heure, 15, 0, 0); return d.toISOString(); };

const ESPACES = [
  {
    boutique: "Belle Ivoire Cosmétiques",
    reglages: { slogan: "Maquillage et parfums pour sublimer votre beauté", adresse: "Cocody Angré, Abidjan", zone_livraison: "Abidjan et environs, 24 à 48 h", frais_livraison: "1500", livraison_gratuite_des: "30000", message: "Merci pour votre achat et à bientôt chez Belle Ivoire !" },
    admin: { nom: "Aminata Koné (admin test)", telephone: "0100000001" },
    vendeurs: [{ nom: "Fatou Bamba (vendeuse test)", telephone: "0100000011" }, { nom: "Koffi N'Guessan (vendeur test)", telephone: "0100000012" }],
    produits: [
      { nom: "Coffret Maquillage Éclat", emoji: "💄", teinte: 3, prix: 25000, cout: 15000, stock: 14, sku: "BI-101", promo: 20000, description: "Tout le nécessaire pour un maquillage complet, dans un coffret prêt à offrir.", contenu: ["Fond de teint fluide", "Poudre compacte", "Rouge à lèvres mat", "Mascara volume", "Pinceau kabuki"] },
      { nom: "Rouge à lèvres mat longue tenue", emoji: "💋", teinte: 3, prix: 4500, cout: 2200, stock: 40, sku: "BI-102", description: "Couleur intense, tenue 12 heures, ne dessèche pas les lèvres." },
      { nom: "Parfum Fleur d'Abidjan 50 ml", emoji: "🌸", teinte: 5, prix: 18000, cout: 10500, stock: 12, sku: "BI-103", description: "Eau de parfum florale et fruitée, notes de jasmin et de mangue." },
      { nom: "Palette fards à paupières 12 teintes", emoji: "🎨", teinte: 1, prix: 9500, cout: 5000, stock: 18, sku: "BI-104", description: "Douze teintes mates et irisées, du nude au fumé." },
      { nom: "Vernis à ongles — lot de 5", emoji: "💅", teinte: 2, prix: 6000, cout: 3000, stock: 25, sku: "BI-105", description: "Cinq couleurs tendance, séchage rapide.", contenu: ["Rouge passion", "Rose poudré", "Nude", "Corail", "Top coat brillant"] },
      { nom: "Sérum éclat vitamine C", emoji: "✨", teinte: 0, prix: 12000, cout: 6500, stock: 3, seuil: 5, sku: "BI-106", description: "Illumine le teint et unifie la peau. Flacon de 30 ml." },
      { nom: "Kit pinceaux maquillage (8 pièces)", emoji: "🖌️", teinte: 7, prix: 8500, cout: 4200, stock: 20, sku: "BI-107", description: "Poils doux synthétiques, avec trousse de rangement.", contenu: ["Pinceau fond de teint", "Pinceau poudre", "Pinceau blush", "3 pinceaux yeux", "Pinceau sourcils", "Trousse de rangement"] },
    ],
    clients: [
      { nom: "Adjoua Kouamé", telephone: "0500000101", ville: "Cocody", consentement: 1 },
      { nom: "Mariam Sanogo", telephone: "0500000102", ville: "Marcory", consentement: 1, statut: "VIP" },
      { nom: "Grâce Aka", telephone: "0500000103", ville: "Yopougon", consentement: 0 },
      { nom: "Estelle N'Dri", telephone: "0500000104", ville: "Riviera", consentement: 1 },
    ],
    // [jours avant aujourd'hui, client, produit, quantité, vendeur (0 = admin, 1.. = vendeurs, null = aucun), options]
    ventes: [
      [12, 1, 0, 1, 1], [10, 0, 1, 2, 1, { mode: "Orange Money" }], [9, 2, 3, 1, 2], [7, 1, 2, 1, 0, { mode: "Wave" }],
      [5, 3, 4, 2, 2], [4, 0, 6, 1, 1], [2, 1, 1, 3, 1, { mode: "MTN MoMo" }], [1, 3, 0, 1, 2, { enLigne: true, statut: "confirmee" }],
      [0, 2, 5, 1, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
  {
    boutique: "Éclat Karité",
    reglages: { slogan: "Soins naturels au karité, fabriqués en Côte d'Ivoire", adresse: "Marcory Zone 4, Abidjan", zone_livraison: "Abidjan, livraison sous 48 h", frais_livraison: "1000", livraison_gratuite_des: "20000", message: "Merci ! Prenez soin de vous avec Éclat Karité." },
    admin: { nom: "Mariam Touré (admin test)", telephone: "0100000002" },
    vendeurs: [{ nom: "Awa Diallo (vendeuse test)", telephone: "0100000021" }],
    produits: [
      { nom: "Beurre de karité pur 250 g", emoji: "🧴", teinte: 1, prix: 3500, cout: 1500, stock: 60, sku: "EK-201", description: "100 % naturel, non raffiné. Nourrit la peau et les cheveux." },
      { nom: "Savon noir africain", emoji: "🧼", teinte: 6, prix: 2000, cout: 800, stock: 80, sku: "EK-202", description: "Nettoie en douceur, idéal pour les peaux à imperfections." },
      { nom: "Huile de coco vierge 200 ml", emoji: "🥥", teinte: 4, prix: 4000, cout: 1900, stock: 35, sku: "EK-203", description: "Pressée à froid. Soin du corps, du visage et des cheveux." },
      { nom: "Coffret Soins Karité", emoji: "🎁", teinte: 0, prix: 15000, cout: 8000, stock: 10, sku: "EK-204", promo: 12500, description: "La routine complète au karité, dans un panier tressé.", contenu: ["Beurre de karité 250 g", "Savon noir africain", "Lait corporel au cacao", "Baume à lèvres", "Gant de gommage"] },
      { nom: "Lait corporel hydratant au cacao", emoji: "🍫", teinte: 7, prix: 5500, cout: 2800, stock: 22, sku: "EK-205", description: "Hydratation 24 h, parfum gourmand. Flacon de 400 ml." },
      { nom: "Huile de ricin pour cheveux 100 ml", emoji: "🌿", teinte: 0, prix: 3000, cout: 1300, stock: 4, seuil: 8, sku: "EK-206", description: "Fortifie et favorise la pousse des cheveux." },
      { nom: "Gommage corps café et sucre", emoji: "☕", teinte: 2, prix: 4500, cout: 2000, stock: 16, sku: "EK-207", description: "Exfolie et laisse la peau douce. Pot de 300 g." },
    ],
    clients: [
      { nom: "Rokia Traoré", telephone: "0500000201", ville: "Treichville", consentement: 1, statut: "VIP" },
      { nom: "Sandrine Yao", telephone: "0500000202", ville: "Marcory", consentement: 1 },
      { nom: "Bintou Coulibaly", telephone: "0500000203", ville: "Abobo", consentement: 0 },
    ],
    ventes: [
      [11, 0, 3, 1, 1], [8, 1, 0, 3, 1, { mode: "Wave" }], [6, 2, 1, 4, 0], [3, 0, 4, 1, 1, { mode: "Orange Money" }],
      [1, 1, 6, 2, 1, { enLigne: true, statut: "expediee" }], [0, 2, 2, 1, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
];

function remplir(e, utilisateurs) {
  const packs = e.produits.map((p, i) => {
    const id = nanoid();
    db.prepare(
      `INSERT INTO packs (id, nom, description, contenu, prix, cout, stock, seuil_alerte, sku, emoji, teinte, actif, prix_promo, promo_fin, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(id, p.nom, p.description || "", (p.contenu || []).join("\n") || null, p.prix, p.cout ?? null, p.seuil ?? 5, p.sku, p.emoji, p.teinte ?? 0,
      p.promo ?? null, p.promo ? new Date(Date.now() + 10 * 864e5).toISOString() : null, jours(20 - i));
    mouvement(id, p.stock, "stock_initial", { auteurId: utilisateurs[0].id });
    return { id, ...p };
  });
  const clients = e.clients.map((c, i) => {
    const id = nanoid();
    db.prepare("INSERT INTO clients (id, nom, telephone, ville, statut, notes, consentement_marketing, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, c.nom, c.telephone, c.ville, c.statut || "Standard", "Client de démonstration", c.consentement, jours(15 - i));
    return { id, ...c };
  });
  for (const [j, ic, ip, qte, iv, o = {}] of e.ventes) {
    const p = packs[ip], c = clients[ic], vendeur = iv == null ? null : utilisateurs[iv];
    const date = jours(j, 9 + (ip % 8));
    const prix = p.promo && j <= 1 ? p.promo : p.prix;
    const venteId = nanoid(), cmdId = nanoid(), numero = prochainNumero();
    const livraison = o.enLigne && o.statut === "en_attente";
    db.prepare(
      `INSERT INTO ventes (id, commande_id, client_id, pack_id, vendeur_id, quantite, prix_unitaire, mode_paiement, statut_paiement, montant_recu, paye_le, date_vente)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(venteId, cmdId, c.id, p.id, vendeur?.id || null, qte, prix, livraison ? "Paiement à la livraison" : o.mode || (o.enLigne ? "Orange Money" : "Espèces"), livraison ? "en_attente" : "payee",
      !o.enLigne && !o.mode ? qte * prix : null, livraison ? null : date, date);
    const statut = o.statut || "livree";
    db.prepare(
      `INSERT INTO commandes (id, vente_id, numero, statut, adresse_livraison, jeton_recu, canal, frais_livraison, contact_telephone, maj_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
    ).run(cmdId, venteId, numero, statut, c.ville, nanoid(24), o.enLigne ? "en_ligne" : "boutique", c.telephone, date);
    mouvement(p.id, -qte, o.enLigne ? "vente_en_ligne" : "vente", { reference: numero, auteurId: vendeur?.id || null });
    ajouterEvenement(cmdId, { statut: "en_attente", texte: o.enLigne ? "Commande passée sur la boutique en ligne" : null, auteurId: vendeur?.id || null, date });
    if (statut !== "en_attente") ajouterEvenement(cmdId, { statut, auteurId: utilisateurs[0].id, date });
  }
}

/** Crée les espaces de test si la plateforme est vide. */
function installer({ creerEspace, creerUtilisateur, ecrireBoutique }) {
  if (!ACTIF || db.listerBoutiques().length > 0) return;
  for (const e of ESPACES) {
    const { boutique, utilisateur } = creerEspace({ ...e.admin, mot_de_passe: MOT_DE_PASSE, boutique: e.boutique });
    db.dansEspace(boutique.id, () => {
      ecrireBoutique(e.reglages);
      const vendeurs = e.vendeurs.map((v) => creerUtilisateur({ ...v, mot_de_passe: MOT_DE_PASSE, role: "vendeur" }));
      db.transaction(() => remplir(e, [utilisateur, ...vendeurs]))();
    });
  }
  db.reglages.ecrire("donnees_test", "1");
  console.log(`   Données de test installées : ${ESPACES.length} boutiques de beauté (désactiver : DONNEES_TEST=0)`);
}

/** Comptes de test encore présents — proposés sur l'écran de connexion. */
function comptesTest() {
  if (!ACTIF || db.reglages.lire("donnees_test") !== "1") return [];
  return ESPACES.flatMap((e) => [{ ...e.admin, role: "admin" }, ...e.vendeurs.map((v) => ({ ...v, role: "vendeur" }))].map((c) => ({ ...c, boutique: e.boutique })))
    .filter((c) => db.comptes.boutiqueDe(c.telephone))
    .map((c) => ({ ...c, mot_de_passe: MOT_DE_PASSE }));
}

module.exports = { installer, comptesTest };
