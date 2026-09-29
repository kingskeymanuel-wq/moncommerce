# MonCommerce — Backend API

API REST (Express + SQLite) de **MonCommerce**. Le serveur sert aussi :

- la **boutique client** sur `/` (dossier `../boutique`),
- l'**administration** sur `/admin/` (dossier `../admin`),
- le code commun sur `/partage/` et les photos produits sur `/uploads/`.

## Démarrage

```bash
npm install
cp .env.example .env      # puis remplacez JWT_SECRET par une longue chaîne aléatoire
npm start                 # http://localhost:4000
```

La base SQLite (`db/moncommerce.db`) est créée au premier démarrage ; les
bases des versions précédentes sont **migrées automatiquement** (colonnes et
tables ajoutées, données conservées). `better-sqlite3` v12 fournit des
binaires précompilés pour Node 20 à 24 : ni Python ni compilateur requis.

### Variables d'environnement (`.env`)

| Variable | Rôle |
|---|---|
| `PORT` | Port d'écoute (4000 par défaut) |
| `JWT_SECRET` | Secret de signature des sessions (obligatoire en production) |
| `DB_PATH` | Chemin de la base SQLite |
| `NODE_ENV` | `production` en production |
| `PUBLIC_URL` | Adresse publique HTTPS du site (liens clients, retours CinetPay) |
| `CINETPAY_API_KEY` / `CINETPAY_API_PASSWORD` | Paiement en ligne (vide = désactivé) |
| `SMS_PROVIDER_URL` / `SMS_PROVIDER_API_KEY` / `SMS_SENDER_ID` | Envoi du ticket par SMS (vide = SMS simulé dans la console) |
| `CORS_ORIGIN` | Origines autorisées si les interfaces sont servies ailleurs |

## Authentification (administration)

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/auth/etat` | `{ initialise }` : le premier compte reste-t-il à créer ? |
| POST | `/api/auth/inscription` | `{ nom, telephone, mot_de_passe (≥ 6), email?, role? }` — libre pour le **premier compte (administrateur)**, ensuite réservé aux administrateurs |
| POST | `/api/auth/connexion` | `{ telephone, mot_de_passe }` → `{ utilisateur, jeton }` |
| GET | `/api/auth/moi` | Profil de l'utilisateur connecté |

Les autres routes `/api/*` (sauf boutique, reçus et santé) exigent
`Authorization: Bearer <jeton>` (JWT, 7 jours). À chaque requête, le compte est
relu en base : un compte supprimé est déconnecté et son rôle actuel s'applique.

## Boutique en ligne — routes publiques

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/boutique/config` | Nom, contact, livraison (frais, gratuité, zone), moyens de paiement proposés |
| GET | `/api/boutique/produits` | Catalogue : produits actifs, prix, stock, photo, ventes |
| GET | `/api/boutique/produits/:id` | Un produit |
| POST | `/api/boutique/commandes` | Passer commande (voir ci-dessous) — 20 / 15 min / IP |
| GET | `/api/boutique/commandes/:jeton` | Suivi : statut, étapes, lignes, totaux, paiement, ticket |
| POST | `/api/boutique/paiements/cinetpay/notification` | Webhook CinetPay |

```json
POST /api/boutique/commandes
{
  "client": { "nom": "Aïcha Koné", "telephone": "07 01 23 45 67", "email": "…", "adresse": "Angré 8e tranche", "ville": "Cocody", "instructions": "…" },
  "lignes": [ { "pack_id": "…", "quantite": 2 } ],
  "paiement": { "mode": "livraison" }
             | { "mode": "transfert", "operateur": "Wave", "telephone": "…", "reference": "ID de transaction" }
             | { "mode": "en_ligne" }
}
→ 201 { "numero": "#1079", "jeton": "…", "total": 71500, "redirection": "https://… (paiement en ligne)" }
→ 409 { "erreur": "…", "indisponibles": [ { "pack_id", "nom", "disponible" } ] }
```

Le serveur recalcule **prix, stock et frais de livraison** (les valeurs
envoyées par le navigateur ne comptent pas), décrémente le stock de façon
atomique, retrouve ou crée la fiche client (par téléphone) et crée une
commande `canal = en_ligne` à une ou plusieurs lignes.

Statut du paiement (`ventes.statut_paiement`) : `payee`, `en_attente`
(à la livraison), `a_verifier` (transfert déclaré par le client), `en_cours`
(paiement en ligne initié), `echoue`.

### Paiement en ligne CinetPay (`lib/cinetpay.js`)

API CinetPay v1, conforme au SDK officiel `cinetpay/cinetpay-go` :
`POST /v1/oauth/login` → jeton (mis en cache 23 h, renouvelé si expiré),
`POST /v1/payment` → `payment_url` + `notify_token`, `GET /v1/payment/{id}` → statut.
Bac à sable `https://api.cinetpay.net` (clé `sk_test_`), production
`https://api.cinetpay.co` (clé `sk_live_`).

- Le **webhook** est authentifié par comparaison à temps constant du
  `notify_token`, puis le statut est **redemandé à CinetPay** avant toute mise à jour.
- Au retour du client sur sa page de suivi, le statut est aussi vérifié
  (au plus toutes les 5 s) : la confirmation fonctionne même sans webhook joignable.
- Paiement réussi → commande payée ; refusé/expiré → commande annulée et stock
  réintégré ; non finalisé après 60 min → annulé.

## Ticket de caisse public

`GET /api/recus/:jeton` — ticket d'une commande (sans connexion), consulté via
le lien ou le QR code imprimé. Jeton aléatoire de 24 caractères.

## Administration — routes principales

### Commandes (une ou plusieurs lignes)
- `GET /api/commandes?statut=&canal=` · `GET /api/commandes/:id`
- `PATCH /api/commandes/:id/statut` `{ statut }` — l'annulation remet **toutes les lignes** en stock, le rétablissement les retire
- `POST /api/commandes/statut` `{ ids, statut }` — action groupée
- `PATCH /api/commandes/:id` `{ note?, adresse_livraison? }`
- `POST /api/commandes/:id/commentaires` `{ texte }`
- `PATCH /api/commandes/:id/paiement` `{ mode_paiement, montant_recu?, telephone_paiement?, reference_paiement? }` — encaisser (livraison) ou confirmer un transfert vérifié
- `POST /api/commandes/:id/envoyer-recu` — lien du ticket par SMS au client
- `DELETE /api/commandes/:id` — supprime la commande et ses lignes (stock réintégré)

### Ventes (caisse)
- `GET /api/ventes?clientId=&dateDebut=&dateFin=` · `GET /api/ventes/:id`
- `POST /api/ventes` `{ client_id, pack_id, quantite, mode_paiement, montant_recu?, telephone_paiement?, reference_paiement? }` — vente + stock + commande en une transaction. Moyens : Espèces (monnaie calculée), Orange Money, MTN MoMo, Moov Money, Wave (numéro du payeur obligatoire), Carte bancaire, Paiement à la livraison.
- `DELETE /api/ventes/:id`

### Produits
- `GET /api/packs?tous=1` · `GET /api/packs/:id`
- `POST /api/packs` · `PUT /api/packs/:id` — `image` : data URL JPEG/PNG/WebP (≤ 3 Mo, signature vérifiée) enregistrée dans `uploads/packs`, `null` pour la retirer
- `PATCH /api/packs/:id/stock` `{ delta }`
- `DELETE /api/packs/:id` — suppression logique (historique conservé)

### Clients, dépenses, réglages, données
- `GET|POST /api/clients`, `GET|PUT|DELETE /api/clients/:id` (suppression logique)
- `GET|POST /api/investissements`, `PUT|DELETE /api/investissements/:id`
- `GET /api/parametres` · `PUT /api/parametres` (admin) — nom, adresse, téléphone, message du ticket, slogan, WhatsApp, numéros Mobile Money marchands, frais et zone de livraison, boutique ouverte/fermée
- `GET /api/donnees` — toutes les données en un appel (utilisé par l'administration)
- `POST /api/donnees/import` (admin) — restauration / données d'exemple
- `GET /api/dashboard` — indicateurs (commandes annulées exclues)

## Sécurité

- Mots de passe hachés (bcrypt), JWT, compte revérifié à chaque requête
- Premier compte administrateur, création des comptes suivants réservée aux administrateurs
- Helmet (CSP adaptée aux CDN utilisés), CORS configurable
- Limitation de débit : 600 req / 15 min / IP, 30 pour connexion/inscription, 20 commandes publiques / 15 min
- Transactions SQL pour vente + stock + commande ; décrément de stock conditionnel contre les ventes simultanées
- Prix et totaux recalculés côté serveur pour les commandes en ligne
- Images : type, taille et signature binaire contrôlés
