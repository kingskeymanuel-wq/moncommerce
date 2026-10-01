const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const DB_PATH = process.env.DB_PATH || path.join(__dirname, "moncommerce.db");
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Initialise le schéma au démarrage
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");
db.exec(schema);

// Migrations : ajoute les colonnes apparues après la v1 aux bases existantes
function ajouterColonne(table, colonne, definition) {
  const colonnes = db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name);
  if (!colonnes.includes(colonne)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${colonne} ${definition}`);
}
ajouterColonne("clients", "supprime", "INTEGER NOT NULL DEFAULT 0");
ajouterColonne("packs", "cout", "REAL");
ajouterColonne("packs", "sku", "TEXT");
ajouterColonne("packs", "teinte", "INTEGER NOT NULL DEFAULT 0");
ajouterColonne("packs", "supprime", "INTEGER NOT NULL DEFAULT 0");
ajouterColonne("commandes", "note", "TEXT");
// v3 : images produit, paiements détaillés, ticket de caisse public
ajouterColonne("packs", "image", "TEXT");
ajouterColonne("ventes", "statut_paiement", "TEXT NOT NULL DEFAULT 'payee'");
ajouterColonne("ventes", "montant_recu", "REAL");
ajouterColonne("ventes", "reference_paiement", "TEXT");
ajouterColonne("ventes", "telephone_paiement", "TEXT");
ajouterColonne("ventes", "paye_le", "TEXT");
ajouterColonne("commandes", "jeton_recu", "TEXT");

// v4 : boutique en ligne — commandes à plusieurs lignes
ajouterColonne("ventes", "commande_id", "TEXT");
ajouterColonne("commandes", "canal", "TEXT NOT NULL DEFAULT 'boutique'");
ajouterColonne("commandes", "frais_livraison", "REAL NOT NULL DEFAULT 0");
ajouterColonne("commandes", "contact_telephone", "TEXT");
ajouterColonne("commandes", "contact_email", "TEXT");
db.exec("UPDATE ventes SET commande_id = (SELECT c.id FROM commandes c WHERE c.vente_id = ventes.id) WHERE commande_id IS NULL");
db.exec("CREATE INDEX IF NOT EXISTS idx_ventes_commande ON ventes(commande_id)");

// v5 : contenu des packs, promotions, seuils d'alerte, consentement marketing
ajouterColonne("packs", "contenu", "TEXT");                 // équipements / articles inclus (un par ligne)
ajouterColonne("packs", "prix_promo", "REAL");              // prix promotionnel
ajouterColonne("packs", "promo_fin", "TEXT");               // fin de la promotion (ISO), vide = sans limite
ajouterColonne("packs", "seuil_alerte", "INTEGER NOT NULL DEFAULT 10");
ajouterColonne("clients", "consentement_marketing", "INTEGER NOT NULL DEFAULT 0");
ajouterColonne("clients", "jeton_desinscription", "TEXT");
ajouterColonne("clients", "desinscrit_le", "TEXT");

// Anciens libellés de paiement → libellés actuels
db.prepare("UPDATE ventes SET mode_paiement = 'Carte bancaire' WHERE mode_paiement = 'Carte'").run();

// Chaque commande reçoit un jeton public (lien et QR code du ticket de caisse)
const { nanoid } = require("nanoid");
const sansJeton = db.prepare("SELECT id FROM commandes WHERE jeton_recu IS NULL").all();
const majJeton = db.prepare("UPDATE commandes SET jeton_recu = ? WHERE id = ?");
for (const c of sansJeton) majJeton.run(nanoid(24), c.id);
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_commandes_jeton ON commandes(jeton_recu)");

module.exports = db;
