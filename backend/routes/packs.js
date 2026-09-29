const express = require("express");
const db = require("../db");
const { idOuNouveau, versIso } = require("../lib/outils");
const { resoudreImage, ErreurImage } = require("../lib/images");
const router = express.Router();

const lire = (id) => db.prepare("SELECT * FROM packs WHERE id = ? AND supprime = 0").get(id);
const serialiser = (p) => p && { ...p, cree_le: versIso(p.cree_le) };
const entierPositif = (v) => Math.max(0, Math.round(Number(v) || 0));

// GET /api/packs?tous=1 — catalogue avec total vendu par pack (brouillons inclus avec tous=1)
router.get("/", (req, res) => {
  const sql = req.query.tous ? "SELECT * FROM packs WHERE supprime = 0" : "SELECT * FROM packs WHERE supprime = 0 AND actif = 1";
  const packs = db.prepare(sql + " ORDER BY cree_le DESC").all();
  const ventesParPack = db
    .prepare(
      `SELECT v.pack_id, SUM(v.quantite) AS total_vendu FROM ventes v
       LEFT JOIN commandes c ON c.id = v.commande_id WHERE COALESCE(c.statut, '') <> 'annulee' GROUP BY v.pack_id`
    )
    .all()
    .reduce((acc, r) => ({ ...acc, [r.pack_id]: r.total_vendu }), {});
  res.json(packs.map((p) => ({ ...serialiser(p), totalVendu: ventesParPack[p.id] || 0 })));
});

// GET /api/packs/:id
router.get("/:id", (req, res) => {
  const pack = lire(req.params.id);
  if (!pack) return res.status(404).json({ erreur: "Pack introuvable" });
  res.json(serialiser(pack));
});

// POST /api/packs — { id?, nom, prix, description?, cout?, stock?, sku?, emoji?, teinte?, actif?, image? (data URL) }
router.post("/", (req, res) => {
  const { nom, description, prix, cout, stock, sku, emoji, teinte, actif } = req.body;
  if (!nom || !(Number(prix) > 0)) return res.status(400).json({ erreur: "nom et prix (> 0) sont requis" });
  const id = idOuNouveau(req.body.id);
  if (db.prepare("SELECT id FROM packs WHERE id = ?").get(id)) return res.status(409).json({ erreur: "Identifiant déjà utilisé" });
  let image;
  try { image = resoudreImage(req.body.image, null, id); } catch (e) { if (e instanceof ErreurImage) return res.status(400).json({ erreur: e.message }); throw e; }
  db.prepare(
    "INSERT INTO packs (id, nom, description, prix, cout, stock, sku, emoji, teinte, actif, image, cree_le) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).run(
    id, nom, description || "", Number(prix), cout == null || cout === "" ? null : Number(cout), entierPositif(stock),
    sku || null, emoji || "📦", Number(teinte) || 0, actif === false || actif === 0 ? 0 : 1, image, new Date().toISOString()
  );
  res.status(201).json(serialiser(lire(id)));
});

// PUT /api/packs/:id — mise à jour partielle
router.put("/:id", (req, res) => {
  const existant = lire(req.params.id);
  if (!existant) return res.status(404).json({ erreur: "Pack introuvable" });
  const c = { ...existant };
  for (const k of ["nom", "description", "prix", "cout", "stock", "sku", "emoji", "teinte", "actif"]) if (req.body[k] !== undefined) c[k] = req.body[k];
  if (!c.nom || !(Number(c.prix) > 0)) return res.status(400).json({ erreur: "nom et prix (> 0) sont requis" });
  // image : data URL = nouvelle image, null = retirer, URL existante = inchangée
  let image;
  try { image = resoudreImage(req.body.image, existant.image, existant.id); } catch (e) { if (e instanceof ErreurImage) return res.status(400).json({ erreur: e.message }); throw e; }
  db.prepare(
    "UPDATE packs SET nom=?, description=?, prix=?, cout=?, stock=?, sku=?, emoji=?, teinte=?, actif=?, image=? WHERE id=?"
  ).run(
    c.nom, c.description, Number(c.prix), c.cout == null || c.cout === "" ? null : Number(c.cout), entierPositif(c.stock),
    c.sku, c.emoji, Number(c.teinte) || 0, c.actif === false || c.actif === 0 ? 0 : 1, image, req.params.id
  );
  res.json(serialiser(lire(req.params.id)));
});

// PATCH /api/packs/:id/stock — { delta } : ajustement relatif (sûr en cas de clics rapides)
router.patch("/:id/stock", (req, res) => {
  const delta = Math.round(Number(req.body.delta) || 0);
  const info = db.prepare("UPDATE packs SET stock = MAX(0, stock + ?) WHERE id = ? AND supprime = 0").run(delta, req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Pack introuvable" });
  res.json(serialiser(lire(req.params.id)));
});

// DELETE /api/packs/:id  (suppression logique pour préserver l'historique des ventes)
router.delete("/:id", (req, res) => {
  const info = db.prepare("UPDATE packs SET supprime = 1 WHERE id = ? AND supprime = 0").run(req.params.id);
  if (info.changes === 0) return res.status(404).json({ erreur: "Pack introuvable" });
  res.status(204).send();
});

module.exports = router;
