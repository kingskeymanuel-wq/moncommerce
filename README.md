# MonCommerce — boutique en ligne + administration (projet complet)

Deux sites servis par un même serveur, une seule base de données :

- **La boutique client** (`/`) : catalogue, fiche produit, panier, commande,
  paiement, suivi de commande et ticket de caisse téléchargeable.
- **L'administration** (`/admin/`) : caisse, commandes, produits, clients,
  ventes, finances, réglages (style Shopify).

```
moncommerce-complet/
├── boutique/           → site client (index.html, boutique.jsx, boutique.css)
├── admin/              → administration (index.html, app.jsx, styles.css)
├── partage/            → code commun (ticket de caisse, PDF, QR code)
└── backend/            → API Express + SQLite, sert aussi les deux sites
    ├── server.js
    ├── db/  lib/  routes/
    └── README.md
```

## 1. Démarrer

Il faut **Node.js 20 ou plus récent** (aucun Python ni serveur SQL : la base
SQLite est un simple fichier).

```bash
cd backend
npm install
cp .env.example .env     # puis remplacez JWT_SECRET par une longue chaîne aléatoire
npm start
```

- Boutique client : **http://localhost:4000/**
- Administration : **http://localhost:4000/admin/**

Au premier lancement, l'administration propose de créer le **compte
administrateur** (nom, téléphone, mot de passe). La connexion se fait par
téléphone + mot de passe.

## 2. La boutique en ligne

Tout ce que voit le client vient de la base : produits actifs, photos, prix et
stock réels. Une commande passée sur le site apparaît immédiatement dans
l'administration (badge « En ligne », notification, liste « À traiter »).

- **Panier** conservé sur l'appareil du client ; prix et stock **revérifiés par
  le serveur** à la validation (un prix modifié dans le navigateur est ignoré,
  un article épuisé entre-temps est signalé et le panier corrigé).
- **Livraison** : frais fixes, livraison offerte à partir d'un montant, zone
  desservie (*Paramètres → Boutique en ligne*).
- **Fiche client** créée automatiquement, ou retrouvée par son numéro de téléphone.
- **Suivi de commande** : lien personnel (Reçue → Confirmée → En livraison →
  Livrée), état du paiement, ticket de caisse PDF avec QR code, bouton WhatsApp
  vers la boutique. « Mes commandes » retrouve les commandes passées depuis
  l'appareil.
- La boutique peut être **fermée** aux commandes d'un clic.

### Paiements proposés au client

| Mode | Fonctionnement | Confirmation |
|---|---|---|
| **À la livraison** | Le client paie le livreur (espèces ou Mobile Money) | Vous encaissez depuis la commande (« Encaisser le paiement ») |
| **Transfert Mobile Money** | Le client envoie le montant sur **vos numéros** Orange Money / MTN MoMo / Moov Money / Wave, puis saisit l'ID de transaction reçu par SMS | Vous vérifiez votre relevé puis cliquez « J'ai bien reçu le paiement » |
| **Paiement en ligne (CinetPay)** | Page de paiement sécurisée CinetPay (Orange, MTN, Moov, Wave) | **Automatique** (webhook authentifié + revérification auprès de CinetPay) |

Les numéros Mobile Money se renseignent dans *Paramètres → Boutique en ligne* ;
un opérateur sans numéro n'est pas proposé.

### Activer le paiement en ligne CinetPay

1. Ouvrez un compte marchand sur [cinetpay.com](https://cinetpay.com) et
   récupérez votre **clé API** et votre **mot de passe API**.
2. Dans `backend/.env` :
   ```
   CINETPAY_API_KEY=sk_test_...        # sk_test_ = bac à sable, sk_live_ = production
   CINETPAY_API_PASSWORD=...
   PUBLIC_URL=https://www.votre-boutique.ci
   ```
3. Redémarrez le serveur : l'option « Payer en ligne » apparaît sur le site.

`PUBLIC_URL` doit être une adresse **publique en HTTPS** : CinetPay y renvoie
le client après paiement et y envoie sa notification
(`/api/boutique/paiements/cinetpay/notification`). En local, sans adresse
publique, le paiement est quand même confirmé au retour du client sur sa page
de suivi (le serveur interroge CinetPay). Un paiement non finalisé après 60 min
est annulé et le stock libéré.

L'intégration suit l'API CinetPay v1 du SDK officiel
([cinetpay-go](https://github.com/cinetpay/cinetpay-go)).

## 3. L'administration

- **Accueil** : indicateurs, courbe des ventes, priorités (commandes en ligne,
  paiements à vérifier ou à encaisser, stock faible…).
- **Commandes** (caisse et en ligne, une ou plusieurs lignes), **Produits**
  (photos téléversées), **Clients**, **Ventes**, **Finances**.
- **Caisse** : espèces avec monnaie à rendre, Orange Money, MTN MoMo, Moov Money,
  Wave, carte bancaire, paiement à la livraison ; ticket imprimable (80 mm),
  PDF, WhatsApp, SMS.
- **Paramètres** : informations imprimées sur les tickets, boutique en ligne,
  équipe (comptes vendeurs), sauvegarde / restauration.

Si l'administration est ouverte sans serveur, elle propose un **mode démo**
dont les données restent dans le navigateur.

## 4. Mise en ligne

Pour que vos clients accèdent à la boutique depuis Internet, hébergez le
dossier complet sur un serveur Node.js (VPS, Render, Railway…) derrière un nom
de domaine en HTTPS, avec `NODE_ENV=production` et `PUBLIC_URL` renseignés.
Sauvegardez régulièrement `backend/db/moncommerce.db` et `backend/uploads/`
(photos des produits).

Toutes les routes de l'API sont documentées dans `backend/README.md`.
L'ancienne interface (v1) est conservée dans `frontend-v1-sauvegarde/`.
