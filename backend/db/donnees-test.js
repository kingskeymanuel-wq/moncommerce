/**
 * Données de test — boutiques de beauté (maquillage, ongles, soins, produits
 * capillaires, mèches et perruques).
 *
 * Quand la plateforme est vide (aucun espace), trois espaces de démonstration
 * sont créés au démarrage : administrateurs, vendeurs, produits, clients et
 * quelques ventes. L'écran « Mon espace » propose alors ces comptes de test.
 *
 * Photos : banque d'images libre Unsplash (https://unsplash.com/license),
 * affichées depuis images.unsplash.com. Ce sont des photos d'illustration :
 * pour de vraies ventes, remplacez-les par les photos de vos propres produits.
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
const photo = (id) => `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=75&auto=format`;

const ESPACES = [
  {
    boutique: "Belle Ivoire Cosmétiques",
    reglages: { slogan: "Maquillage, parfums et ongles pour sublimer votre beauté", adresse: "Cocody Angré, Abidjan", zone_livraison: "Abidjan et environs, 24 à 48 h", frais_livraison: "1500", livraison_gratuite_des: "30000", message: "Merci pour votre achat et à bientôt chez Belle Ivoire !" },
    admin: { nom: "Aminata Koné (admin test)", telephone: "0100000001" },
    vendeurs: [{ nom: "Fatou Bamba (vendeuse test)", telephone: "0100000011" }, { nom: "Koffi N'Guessan (vendeur test)", telephone: "0100000012" }],
    produits: [
      { nom: "Coffret Maquillage Éclat", image: "1596462502278-27bfdc403348", emoji: "💄", teinte: 3, prix: 25000, cout: 15000, stock: 14, sku: "BI-101", promo: 20000, description: "Tout le nécessaire pour un maquillage complet, dans un coffret prêt à offrir.", contenu: ["Fond de teint fluide", "Poudre compacte", "Rouge à lèvres mat", "Mascara volume", "Pinceau kabuki"] },
      { nom: "Rouge à lèvres mat longue tenue", image: "1625093742435-6fa192b6fb10", emoji: "💋", teinte: 3, prix: 4500, cout: 2200, stock: 40, sku: "BI-102", description: "Couleur intense, tenue 12 heures, ne dessèche pas les lèvres." },
      { nom: "Parfum Fleur d'Abidjan 50 ml", image: "1594125311687-3b1b3eafa9f4", emoji: "🌸", teinte: 5, prix: 18000, cout: 10500, stock: 12, sku: "BI-103", description: "Eau de parfum florale et fruitée, notes de jasmin et de mangue." },
      { nom: "Palette fards à paupières nude", image: "1625094640367-05f84293fe42", emoji: "🎨", teinte: 1, prix: 9500, cout: 5000, stock: 18, sku: "BI-104", description: "Six teintes mates et irisées, du nude au brun, avec applicateur." },
      { nom: "Vernis à ongles — lot de 5", image: "1636019411401-82485711b6ba", emoji: "💅", teinte: 2, prix: 6000, cout: 3000, stock: 25, sku: "BI-105", description: "Cinq couleurs tendance, séchage rapide.", contenu: ["Bleu nuit", "Violet", "Prune", "Vert olive", "Bleu électrique"] },
      { nom: "Sérum éclat vitamine C", image: "1638609269435-1b4421f8585c", emoji: "✨", teinte: 0, prix: 12000, cout: 6500, stock: 3, seuil: 5, sku: "BI-106", description: "Illumine le teint et unifie la peau. Flacon de 30 ml." },
      { nom: "Kit pinceaux maquillage (12 pièces)", image: "1667369039699-f30c4b863e51", emoji: "🖌️", teinte: 7, prix: 8500, cout: 4200, stock: 20, sku: "BI-107", description: "Poils doux synthétiques, avec pot de rangement.", contenu: ["Pinceau fond de teint", "Pinceau poudre", "Pinceau blush", "6 pinceaux yeux", "Pinceau sourcils", "Pinceau lèvres", "Pot de rangement"] },
      { nom: "Kit manucure-pédicure complet", image: "1779636198585-658170ee0283", emoji: "💅", teinte: 4, prix: 7500, cout: 3600, stock: 22, sku: "BI-108", description: "Tout pour des mains et des pieds soignés à la maison.", contenu: ["Coupe-ongles", "Pince à cuticules", "Limes et polissoir", "Repousse-cuticules", "Séparateurs d'orteils", "Brosse à ongles"] },
      { nom: "Kit vernis semi-permanent + lampe UV", image: "1663229048792-0734ab152480", emoji: "💡", teinte: 5, prix: 22000, cout: 13000, stock: 9, sku: "BI-109", promo: 18500, description: "Une manucure qui tient trois semaines, comme à l'institut.", contenu: ["Lampe UV/LED", "Base et top coat", "4 vernis gel", "Dissolvant", "Bâtonnets et limes"] },
      { nom: "Coffret vernis 6 couleurs", image: "1667242197482-ffe672de74da", emoji: "🌈", teinte: 2, prix: 8000, cout: 4000, stock: 16, sku: "BI-110", description: "Six vernis brillants pour manucure et pédicure : noir, orange, jaune, rose, blanc, rouge." },
      { nom: "Soin pédicure pieds doux", image: "1656774446450-56a427a184b4", emoji: "🦶", teinte: 6, prix: 6500, cout: 3000, stock: 18, sku: "BI-111", description: "Des pieds doux et des ongles impeccables.", contenu: ["Bain de pieds aux sels", "Râpe anti-callosités", "Gommage pieds", "Crème nourrissante au karité"] },
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
      [5, 3, 4, 2, 2], [4, 0, 7, 1, 1], [3, 2, 9, 1, 2, { mode: "Wave" }], [2, 1, 1, 3, 1, { mode: "MTN MoMo" }],
      [1, 3, 8, 1, 2, { enLigne: true, statut: "confirmee" }], [0, 2, 5, 1, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
  {
    boutique: "Éclat Karité",
    reglages: { slogan: "Soins naturels et produits capillaires, fabriqués en Côte d'Ivoire", adresse: "Marcory Zone 4, Abidjan", zone_livraison: "Abidjan, livraison sous 48 h", frais_livraison: "1000", livraison_gratuite_des: "20000", message: "Merci ! Prenez soin de vous avec Éclat Karité." },
    admin: { nom: "Mariam Touré (admin test)", telephone: "0100000002" },
    vendeurs: [{ nom: "Awa Diallo (vendeuse test)", telephone: "0100000021" }],
    produits: [
      { nom: "Beurre de karité pur 250 g", image: "1702650730093-43cfa3237228", emoji: "🧴", teinte: 1, prix: 3500, cout: 1500, stock: 60, sku: "EK-201", description: "100 % naturel, non raffiné. Nourrit la peau et les cheveux." },
      { nom: "Savons artisanaux — lot de 3", image: "1618840313409-66c0d92d6f26", emoji: "🧼", teinte: 6, prix: 4500, cout: 1900, stock: 45, sku: "EK-202", description: "Saponifiés à froid, pour le visage et le corps.", contenu: ["Savon noir au charbon", "Savon au karité", "Savon exfoliant à l'avoine"] },
      { nom: "Huile de coco vierge 200 ml", image: "1628602040839-682c1c959aac", emoji: "🥥", teinte: 4, prix: 4000, cout: 1900, stock: 35, sku: "EK-203", description: "Pressée à froid. Soin du corps, du visage et des cheveux." },
      { nom: "Panier Soins Karité", image: "1687217913172-871617a789e3", emoji: "🎁", teinte: 0, prix: 15000, cout: 8000, stock: 10, sku: "EK-204", promo: 12500, description: "La routine complète, dans un panier tressé prêt à offrir.", contenu: ["Lait corporel", "Gel douche", "Huile de soin", "Beurre de karité"] },
      { nom: "Crème corporelle au karité", image: "1693004926638-d2e47d705229", emoji: "🍶", teinte: 7, prix: 5500, cout: 2800, stock: 22, sku: "EK-205", description: "Texture fouettée, hydratation 24 h. Pot de 250 ml." },
      { nom: "Huile de ricin pour cheveux 100 ml", image: "1671493235081-5842463637cd", emoji: "🌿", teinte: 0, prix: 3000, cout: 1300, stock: 4, seuil: 8, sku: "EK-206", description: "Fortifie les cheveux et favorise la pousse des tempes." },
      { nom: "Gommage corps café", image: "1510776537653-6d0da167186c", emoji: "☕", teinte: 2, prix: 4500, cout: 2000, stock: 16, sku: "EK-207", description: "Exfolie et laisse la peau douce. Pot de 300 g." },
      { nom: "Shampooing hydratant au karité 500 ml", image: "1747858989102-cca0f4dc4a11", emoji: "🧴", teinte: 1, prix: 5000, cout: 2400, stock: 30, sku: "EK-208", description: "Sans sulfates. Nettoie en douceur les cheveux crépus, frisés et défrisés." },
      { nom: "Duo shampooing + après-shampooing", image: "1747098393451-6b985f62a2c2", emoji: "🫧", teinte: 4, prix: 9000, cout: 4500, stock: 18, sku: "EK-209", promo: 7500, description: "Le duo démêlant et nourrissant pour cheveux secs.", contenu: ["Shampooing hydratant 300 ml", "Après-shampooing démêlant 300 ml"] },
      { nom: "Sérum pousse cheveux 50 ml", image: "1608571423539-e951b9b3871e", emoji: "💧", teinte: 5, prix: 6500, cout: 3000, stock: 20, sku: "EK-210", description: "Aux huiles de ricin, de romarin et de menthe. À masser sur le cuir chevelu." },
      { nom: "Crème coiffante boucles définies", image: "1632765854612-9b02b6ec2b15", emoji: "🌀", teinte: 3, prix: 5500, cout: 2600, stock: 24, sku: "EK-211", description: "Définit et hydrate les cheveux naturels, afros et bouclés, sans effet carton." },
    ],
    clients: [
      { nom: "Rokia Traoré", telephone: "0500000201", ville: "Treichville", consentement: 1, statut: "VIP" },
      { nom: "Sandrine Yao", telephone: "0500000202", ville: "Marcory", consentement: 1 },
      { nom: "Bintou Coulibaly", telephone: "0500000203", ville: "Abobo", consentement: 0 },
    ],
    ventes: [
      [11, 0, 3, 1, 1], [8, 1, 0, 3, 1, { mode: "Wave" }], [6, 2, 1, 2, 0], [4, 1, 7, 2, 1], [3, 0, 4, 1, 1, { mode: "Orange Money" }],
      [1, 1, 9, 2, 1, { enLigne: true, statut: "expediee" }], [0, 2, 10, 1, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
  {
    boutique: "Reine des Mèches",
    reglages: { slogan: "Perruques, tissages et mèches à tresser pour toutes les coiffures", adresse: "Adjamé, Abidjan", zone_livraison: "Abidjan en 24 h, intérieur du pays en 72 h", frais_livraison: "2000", livraison_gratuite_des: "50000", message: "Merci ! Soyez la reine avec Reine des Mèches." },
    admin: { nom: "Adjoua Brou (admin test)", telephone: "0100000003" },
    vendeurs: [{ nom: "Grâce Kouassi (vendeuse test)", telephone: "0100000031" }],
    produits: [
      { nom: "Perruque lisse 22 pouces — lace frontale", image: "1752487128390-ffef04d24882", emoji: "👩🏾", teinte: 6, prix: 65000, cout: 42000, stock: 8, sku: "RM-301", description: "Cheveux lisses longs, raie naturelle, bonnet ajustable. Prête à porter." },
      { nom: "Perruque ondulée Body Wave 24 pouces", image: "1645736279976-59f8fd22720c", emoji: "👩🏾", teinte: 6, prix: 75000, cout: 48000, stock: 6, sku: "RM-302", promo: 65000, description: "Ondulations souples et volume naturel. Se coiffe et se lisse à volonté." },
      { nom: "Perruque bouclée Deep Wave", image: "1637463675679-d86b8f934b59", emoji: "👩🏾‍🦱", teinte: 6, prix: 70000, cout: 45000, stock: 7, sku: "RM-303", description: "Boucles serrées et brillantes, longueur aux épaules." },
      { nom: "Perruque lisse blond miel", image: "1663582816182-15cf69d87665", emoji: "💛", teinte: 1, prix: 55000, cout: 34000, stock: 5, sku: "RM-304", description: "Carré long lisse, racines foncées et pointes blond miel." },
      { nom: "Perruque lace frontale châtain", image: "1663582816158-42354522fe15", emoji: "🤎", teinte: 2, prix: 60000, cout: 38000, stock: 5, sku: "RM-305", description: "Lisse, raie au milieu, dentelle invisible sur le front." },
      { nom: "Mèches à tresser Box Braids — lot de 6", image: "1572955304332-bf714bd49add", emoji: "🪢", teinte: 0, prix: 9000, cout: 4800, stock: 40, sku: "RM-306", description: "Six paquets de mèches noires pré-étirées pour de longues tresses légères." },
      { nom: "Mèches à tresser blond miel — lot de 6", image: "1658497730270-b5f4fef00ae1", emoji: "🪢", teinte: 1, prix: 9500, cout: 5000, stock: 32, sku: "RM-307", description: "Six paquets couleur miel pour des box braids lumineuses." },
      { nom: "Tissage ondulé naturel — 3 bundles", image: "1745975980824-bc88bd400c78", emoji: "🌊", teinte: 6, prix: 45000, cout: 28000, stock: 10, sku: "RM-308", description: "Trois bundles de 18, 20 et 22 pouces, ondulation Body Wave.", contenu: ["Bundle 18 pouces", "Bundle 20 pouces", "Bundle 22 pouces"] },
      { nom: "Tissage lisse cuivré — 3 bundles", image: "1685157713304-977307f78ef7", emoji: "🧡", teinte: 2, prix: 40000, cout: 25000, stock: 3, seuil: 4, sku: "RM-309", description: "Couleur cuivre tendance, cheveux lisses et soyeux.", contenu: ["Bundle 16 pouces", "Bundle 18 pouces", "Bundle 20 pouces"] },
      { nom: "Mèches pour vanilles (twists) — lot de 5", image: "1614173968962-0e61c5ed196f", emoji: "➰", teinte: 0, prix: 8000, cout: 4200, stock: 28, sku: "RM-310", description: "Mèches légères pour vanilles et twists, tenue plusieurs semaines." },
      { nom: "Tresses longues prêtes à poser (crochet braids)", image: "1663851071150-b6617bbee927", emoji: "✨", teinte: 0, prix: 12000, cout: 6500, stock: 20, sku: "RM-311", description: "Tresses déjà faites, à poser au crochet en une heure. Lot de 4 paquets." },
    ],
    clients: [
      { nom: "Christelle Assi", telephone: "0500000301", ville: "Adjamé", consentement: 1, statut: "VIP" },
      { nom: "Nadège Koffi", telephone: "0500000302", ville: "Cocody", consentement: 1 },
      { nom: "Salimata Ouattara", telephone: "0500000303", ville: "Bouaké", consentement: 1 },
    ],
    ventes: [
      [10, 0, 0, 1, 1, { mode: "Orange Money" }], [8, 1, 5, 2, 1], [6, 2, 7, 1, 0, { mode: "Wave" }], [4, 0, 6, 1, 1],
      [2, 1, 2, 1, 1, { mode: "MTN MoMo" }], [1, 2, 1, 1, 1, { enLigne: true, statut: "confirmee" }], [0, 1, 10, 2, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
];

function remplir(e, utilisateurs) {
  const packs = e.produits.map((p, i) => {
    const id = nanoid();
    db.prepare(
      `INSERT INTO packs (id, nom, description, contenu, prix, cout, stock, seuil_alerte, sku, emoji, image, teinte, actif, prix_promo, promo_fin, cree_le)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?)`
    ).run(id, p.nom, p.description || "", (p.contenu || []).join("\n") || null, p.prix, p.cout ?? null, p.seuil ?? 5, p.sku, p.emoji, p.image ? photo(p.image) : null, p.teinte ?? 0,
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
