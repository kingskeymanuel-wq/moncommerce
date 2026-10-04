/**
 * Données de test — une boutique de vêtements pour enfants (mise en avant) et
 * trois boutiques de beauté (maquillage, ongles, soins, capillaire, mèches).
 *
 * Quand la plateforme est vide (aucun espace), quatre espaces de démonstration
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
const { genererTicket, journaliser } = require("../lib/tickets");

const ACTIF = process.env.DONNEES_TEST !== "0";
const MOT_DE_PASSE = process.env.MOT_DE_PASSE_TEST || "test-2026";
const jours = (n, heure = 10) => { const d = new Date(Date.now() - n * 864e5); d.setUTCHours(heure, 15, 0, 0); return d.toISOString(); };
const photo = (id) => `https://images.unsplash.com/photo-${id}?w=800&h=800&fit=crop&q=75&auto=format`;

/* Catégorie de chaque produit et, pour les lots, nombre d'articles par lot (référence → [catégorie, articles]) */
const FICHES = {
  "PC-401": ["Tenues chic"], "PC-402": ["Tenues chic"], "PC-403": ["Tenues chic"], "PC-404": ["Tenues chic"], "PC-405": ["Tenues chic"], "PC-406": ["Tenues chic"],
  "PC-407": ["Pyjamas"], "PC-408": ["Pyjamas"], "PC-409": ["Chaussettes", 3], "PC-410": ["Chaussettes", 5], "PC-411": ["Chaussettes", 3],
  "PC-412": ["Bébé", 3], "PC-413": ["Bébé"], "PC-414": ["Bébé", 5], "PC-415": ["Vêtements"], "PC-416": ["Chaussures"],
  "BI-101": ["Maquillage"], "BI-102": ["Maquillage"], "BI-103": ["Parfums"], "BI-104": ["Maquillage"], "BI-105": ["Ongles", 5], "BI-106": ["Soins du visage"],
  "BI-107": ["Maquillage"], "BI-108": ["Ongles"], "BI-109": ["Ongles"], "BI-110": ["Ongles", 6], "BI-111": ["Pédicure"],
  "EK-201": ["Soins du corps"], "EK-202": ["Soins du corps", 3], "EK-203": ["Soins du corps"], "EK-204": ["Coffrets"], "EK-205": ["Soins du corps"], "EK-206": ["Cheveux"],
  "EK-207": ["Soins du corps"], "EK-208": ["Cheveux"], "EK-209": ["Cheveux", 2], "EK-210": ["Cheveux"], "EK-211": ["Cheveux"],
  "RM-301": ["Perruques"], "RM-302": ["Perruques"], "RM-303": ["Perruques"], "RM-304": ["Perruques"], "RM-305": ["Perruques"],
  "RM-306": ["Mèches à tresser", 6], "RM-307": ["Mèches à tresser", 6], "RM-308": ["Tissages", 3], "RM-309": ["Tissages", 3], "RM-310": ["Mèches à tresser", 5], "RM-311": ["Mèches à tresser", 4],
};

const ESPACES = [
  {
    // Boutique mise en avant : ses produits sont les plus récents, donc affichés en premier sur la page d'accueil
    priorite: true,
    boutique: "Petit Chic Abidjan",
    reglages: { slogan: "La mode chic et confortable des enfants, de la naissance à 12 ans", adresse: "Riviera Palmeraie, Abidjan", zone_livraison: "Abidjan et environs, 24 à 48 h", frais_livraison: "1500", livraison_gratuite_des: "25000", message: "Merci ! À bientôt chez Petit Chic Abidjan." },
    admin: { nom: "Clarisse Yapi (admin test)", telephone: "0100000004" },
    vendeurs: [{ nom: "Ismaël Koné (vendeur test)", telephone: "0100000041" }],
    produits: [
      { nom: "Ensemble chic garçon — nœud papillon et bretelles", image: "1503327151497-be3b97ef0d42", emoji: "🎀", teinte: 4, prix: 14500, cout: 8500, stock: 12, sku: "PC-401", promo: 12000, description: "La tenue des grandes occasions : mariage, baptême, fête de fin d'année. Du 2 au 10 ans.", contenu: ["Chemise blanche", "Pantalon habillé", "Bretelles réglables", "Nœud papillon"] },
      { nom: "Gilet chic et bermuda garçon", image: "1519238263530-99bdd11df2ea", emoji: "🧥", teinte: 5, prix: 18000, cout: 11000, stock: 8, sku: "PC-402", description: "Gilet marine à écusson, bermuda bleu et nœud papillon. Élégant et confortable, du 3 au 12 ans.", contenu: ["Gilet à écusson", "Bermuda bleu", "Chemise", "Nœud papillon"] },
      { nom: "Robe de cérémonie en dentelle", image: "1544586947-3e09d1a036f1", emoji: "👗", teinte: 1, prix: 16500, cout: 9500, stock: 9, sku: "PC-403", description: "Robe à dentelle brodée et ceinture satinée, doublée coton. Du 2 au 10 ans." },
      { nom: "Robe rose à col claudine", image: "1735417117978-e549663de484", emoji: "🌸", teinte: 3, prix: 9500, cout: 5200, stock: 15, sku: "PC-404", description: "Robe manches longues en coton doux, col claudine et volants. Du 1 au 6 ans." },
      { nom: "Ensemble robe et ballerines", image: "1735417174537-7e7abbf1dc35", emoji: "🩰", teinte: 3, prix: 13500, cout: 7800, stock: 7, sku: "PC-405", promo: 11500, description: "La robe à pois et sa paire de ballerines assorties, prêtes à offrir.", contenu: ["Robe à pois", "Ballerines beiges"] },
      { nom: "Jupe tutu de fête", image: "1624623327085-9bfb64382f9a", emoji: "🧡", teinte: 2, prix: 7500, cout: 3800, stock: 14, sku: "PC-406", description: "Tutu en tulle volumineux, taille élastique. Anniversaires et spectacles, du 2 au 8 ans." },
      { nom: "Pyjama enfant en coton imprimé", image: "1634188157846-c6e3bdf99420", emoji: "🌙", teinte: 6, prix: 6500, cout: 3400, stock: 24, sku: "PC-407", description: "Pyjama deux pièces à motifs, 100 % coton, doux pour la peau. Du 2 au 10 ans.", contenu: ["Haut manches longues", "Pantalon à taille élastique"] },
      { nom: "Pyjama deux pièces garçon", image: "1585628481991-ba29df510208", emoji: "😴", teinte: 5, prix: 6000, cout: 3100, stock: 20, sku: "PC-408", description: "Ensemble de nuit léger et respirant, idéal pour les nuits chaudes. Du 3 au 12 ans." },
      { nom: "Chaussettes enfant — lot de 3 paires", image: "1615486364462-ef6363adbc18", emoji: "🧦", teinte: 2, prix: 2500, cout: 1100, stock: 60, sku: "PC-409", description: "Trois paires unies en coton épais : gris, violet et jaune. Pointures 23 à 34.", contenu: ["1 paire grise", "1 paire violette", "1 paire jaune"] },
      { nom: "Chaussettes rayées — lot de 5 paires", image: "1632944968588-3ec2870641ce", emoji: "🧦", teinte: 3, prix: 3500, cout: 1600, stock: 45, sku: "PC-410", description: "Cinq paires à rayures et motifs, bien chaudes. Pointures 19 à 30." },
      { nom: "Chaussettes fantaisie", image: "1566563634870-d566ab58a4df", emoji: "🍌", teinte: 5, prix: 3000, cout: 1300, stock: 3, seuil: 6, sku: "PC-411", description: "Motifs rigolos qui donnent envie de s'habiller tout seul. Lot de 3 paires." },
      { nom: "Body bébé coton blanc — lot de 3", image: "1622290291165-d341f1938b8a", emoji: "👶", teinte: 0, prix: 5500, cout: 2700, stock: 30, sku: "PC-412", description: "Bodies manches courtes à pressions, coton tout doux. De la naissance à 24 mois." },
      { nom: "Chaussons bébé tricotés", image: "1602685365252-c13f549f1f5f", emoji: "🧶", teinte: 6, prix: 3500, cout: 1500, stock: 26, sku: "PC-413", description: "Chaussons en maille douce, tricotés main. De 0 à 12 mois." },
      { nom: "Layette bébé — lot de 5 pièces", image: "1766918780914-e19d9de76d85", emoji: "🍼", teinte: 4, prix: 12000, cout: 6800, stock: 11, sku: "PC-414", description: "Le trousseau des premiers mois, aux couleurs tendres. Idéal en cadeau de naissance.", contenu: ["2 bodies", "1 gilet", "1 pantalon", "1 barboteuse"] },
      { nom: "Ensemble jean enfant", image: "1556905055-8f358a7a47b2", emoji: "👖", teinte: 5, prix: 11000, cout: 6200, stock: 13, sku: "PC-415", description: "Veste et pantalon en jean souple, pour l'école comme pour les sorties. Du 2 au 10 ans." },
      { nom: "Baskets bébé à scratch", image: "1678192568478-9488ee55def6", emoji: "👟", teinte: 4, prix: 8500, cout: 4800, stock: 10, sku: "PC-416", description: "Semelle souple pour les premiers pas, fermeture à scratch. Pointures 18 à 24." },
    ],
    clients: [
      { nom: "Marie-Laure Kouadio", telephone: "0500000401", ville: "Riviera", consentement: 1, statut: "VIP" },
      { nom: "Fatoumata Cissé", telephone: "0500000402", ville: "Cocody", consentement: 1 },
      { nom: "Jean-Marc Aké", telephone: "0500000403", ville: "Bingerville", consentement: 0 },
      { nom: "Crèche Les Petits Anges", telephone: "0500000404", ville: "Cocody", consentement: 1 },
    ],
    ventes: [
      [9, 0, 0, 1, 1, { mode: "Orange Money" }], [7, 1, 8, 3, 1], [6, 2, 6, 2, 0], [4, 0, 2, 1, 1, { mode: "Wave" }], [3, 1, 11, 1, 1],
      [5, 3, 8, 10, 1, { b2b: true, mode: "Wave" }], [2, 2, 9, 2, 1, { nonRemis: true }], [3, 1, 12, 2, null, { enLigne: true, statut: "livree" }], [1, 2, 4, 1, null, { enLigne: true, statut: "expediee" }], [1, 0, 3, 1, 1, { enLigne: true, statut: "confirmee" }], [0, 1, 6, 1, null, { enLigne: true, statut: "en_attente" }],
    ],
  },
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
      [5, 3, 4, 2, 2], [4, 0, 7, 1, 1, { nonRemis: true }], [3, 2, 9, 1, 2, { mode: "Wave" }], [2, 1, 1, 3, 1, { mode: "MTN MoMo" }],
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

/* Livreurs de démonstration (les mêmes profils dans chaque boutique, numéros distincts) */
const LIVREURS = [{ nom: "Moussa Traoré (moto)", zone: "Cocody, Riviera, Bingerville" }, { nom: "Serge Kouakou (moto)", zone: "Yopougon, Adjamé, Abobo" }];

function remplir(e, utilisateurs, rang) {
  const livreurs = LIVREURS.map((l, i) => {
    const id = nanoid();
    db.prepare("INSERT INTO livreurs (id, nom, telephone, zone, actif, supprime, cree_le) VALUES (?, ?, ?, ?, 1, 0, ?)").run(id, l.nom, `05000009${rang}${i + 1}`, l.zone, jours(20));
    return id;
  });
  let colis = 0;
  const packs = e.produits.map((p, i) => {
    const id = nanoid();
    db.prepare(
      `INSERT INTO packs (id, nom, description, contenu, prix, cout, stock, seuil_alerte, sku, emoji, image, teinte, actif, prix_promo, promo_fin, cree_le, categorie, pieces_par_lot)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?)`
    ).run(id, p.nom, p.description || "", (p.contenu || []).join("\n") || null, p.prix, p.cout ?? null, p.seuil ?? 5, p.sku, p.emoji, p.image ? photo(p.image) : null, p.teinte ?? 0,
      p.promo ?? null, p.promo ? new Date(Date.now() + 10 * 864e5).toISOString() : null,
      e.priorite ? new Date(Date.now() - i * 60000).toISOString() : jours(20 - i), FICHES[p.sku]?.[0] || null, FICHES[p.sku]?.[1] || 1);
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
      `INSERT INTO commandes (id, vente_id, numero, statut, adresse_livraison, jeton_recu, canal, frais_livraison, contact_telephone, type_vente, maj_le)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`
    ).run(cmdId, venteId, numero, statut, c.ville, nanoid(24), o.enLigne ? "en_ligne" : "boutique", c.telephone, o.b2b ? "b2b" : "b2c", date);
    // Commandes en ligne : colis à livrer. Dès qu'elles sont confirmées, un livreur et une date sont prévus.
    if (o.enLigne) {
      const frais = Number(e.reglages.frais_livraison) || 0;
      const affecte = statut !== "en_attente";
      db.prepare("UPDATE commandes SET livraison = 1, frais_livraison = ?, livreur_id = ?, livraison_prevue = ?, livree_le = ? WHERE id = ?")
        .run(frais, affecte ? livreurs[colis++ % livreurs.length] : null, affecte ? new Date(Date.now() + (statut === "livree" ? -1 : 1) * 864e5).toISOString().slice(0, 10) : null, statut === "livree" ? date : null, cmdId);
    }
    // Chaque vente a son ticket ; « nonRemis » simule un ticket que le vendeur n'a pas encore remis au client
    genererTicket(cmdId, vendeur?.id || null, date);
    if (!o.nonRemis) journaliser(cmdId, o.enLigne ? "consulte_client" : o.mode ? "whatsapp" : "imprime", o.enLigne ? null : vendeur?.id || null, { evenement: false, date });
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
      db.transaction(() => remplir(e, [utilisateur, ...vendeurs], ESPACES.indexOf(e) + 1))();
    });
  }
  db.reglages.ecrire("donnees_test", "1");
  console.log(`   Données de test installées : ${ESPACES.length} boutiques de test (désactiver : DONNEES_TEST=0)`);
}

/** Comptes de test encore présents — proposés sur l'écran de connexion. */
function comptesTest() {
  if (!ACTIF || db.reglages.lire("donnees_test") !== "1") return [];
  return ESPACES.flatMap((e) => [{ ...e.admin, role: "admin" }, ...e.vendeurs.map((v) => ({ ...v, role: "vendeur" }))].map((c) => ({ ...c, boutique: e.boutique })))
    .filter((c) => db.comptes.boutiqueDe(c.telephone))
    .map((c) => ({ ...c, mot_de_passe: MOT_DE_PASSE }));
}

module.exports = { installer, comptesTest };
