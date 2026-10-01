# MonCommerce — plateforme de boutiques en ligne + administration

Une plateforme, plusieurs espaces :

- **La page d'accueil** (`/`) présente les produits de **tous les
  administrateurs** ; chaque boutique a aussi sa page (`/#/boutique/<adresse>`).
  Panier, commande, paiement, suivi et ticket de caisse téléchargeable.
- **« Mon espace »** (bouton de la page d'accueil → `/admin/`) : connexion de
  l'administrateur ou du vendeur à son tableau de bord, ou création d'un nouvel
  espace administrateur.
- **Chaque administrateur a son propre espace**, totalement séparé des autres :
  ses produits, stocks, clients, ventes, finances, marketing et **ses vendeurs**,
  dont il suit l'activité. Chaque vendeur ne voit que ses propres ventes.

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

Depuis la page d'accueil, **Mon espace → Créer mon espace** ouvre un espace
administrateur (nom, nom de la boutique, téléphone, mot de passe). Chaque
personne qui s'inscrit ainsi obtient un espace distinct. La connexion se fait
par téléphone + mot de passe ; un numéro = un compte sur toute la plateforme.

Une installation d'une version précédente (une seule base) est reprise
automatiquement : elle devient le premier espace, sans perte de données.

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

### Deux rôles : administrateur et vendeur

| | Administrateur | Vendeur |
|---|---|---|
| Caisse, commandes, clients, tickets | ✔ | ✔ |
| Produits : prix, contenu détaillé des packs, promotions | ✔ | lecture seule |
| **Stocks** : réceptions (avec dépense), sorties, inventaire, journal | ✔ | — |
| **Marketing** : campagnes, message hebdomadaire, promotions | ✔ | — |
| **Finances** : dépenses, coûts d'achat, bénéfices | ✔ | — |
| Supprimer une commande ou un client | ✔ | — |

Les restrictions sont appliquées par le serveur (403), pas seulement masquées
dans l'interface. L'administrateur crée ses vendeurs dans la page **Vendeurs**,
où il suit leurs ventes (en caisse et via leur lien), change leur mot de passe
ou les désactive.

### Espaces, vendeurs et lien de promotion
- **Un espace par administrateur** : une base de données par espace
  (`<DB_PATH>-espaces/`), plus un annuaire des boutiques et des comptes
  (`<DB_PATH>-plateforme.db`). Aucune donnée n'est partagée entre espaces.
- **Le vendeur fait la promotion des produits** de son administrateur : son
  tableau de bord affiche son **lien de promotion**
  (`/#/boutique/<adresse>?v=<vendeur>`). Toute commande passée par ce lien lui
  est attribuée et apparaît dans son espace et dans le suivi de l'administrateur.
- **Une commande = une boutique** : le panier ne mélange pas les produits de
  deux boutiques (livraison et paiement sont propres à chacune).

### Tickets de caisse
1. Avant validation, la vente (caisse ou boutique en ligne) est présentée sous
   forme de **ticket provisoire** (« récapitulatif — non validé »).
2. Après validation, le **ticket définitif s'affiche en PDF** (téléchargeable,
   imprimable). Le vendeur peut aussi l'imprimer en 80 mm, l'envoyer par
   **WhatsApp**, **e-mail** ou **SMS** au client.

### Marketing et fidélisation
- Le client accepte (case à cocher) de recevoir les offres lors de son achat ;
  chaque message contient un lien **STOP** de désinscription (`/#/stop/…`).
- **Message automatique** chaque semaine (jour et heure réglables, lundi 8 h
  par défaut) : bonne semaine + nouveautés + promotions en cours.
- **Lancer une promotion** : remise en % ou prix fixe sur les produits choisis,
  date de fin, et alerte automatique des clients abonnés (SMS / e-mail).
- **Plan de fidélisation** : VIP, clients fidèles, inactifs, nouveaux clients.
- Sans fournisseur SMS (`SMS_PROVIDER_*`) ni serveur e-mail (`SMTP_*`), les
  envois sont **simulés** (journalisés, marqués « Simulé » dans l'historique).

Si l'administration est ouverte sans serveur, elle propose un **mode démo**
dont les données restent dans le navigateur.

## 4. Mise en ligne (Render)

Le fichier `render.yaml` décrit tout le déploiement : instance `0.5c-512mb`
(région Francfort), disque persistant de 1 Go monté sur `/var/data` pour la
bases (`DB_PATH`) et les photos (`UPLOADS_DIR`), secret `JWT_SECRET`
généré automatiquement.

1. Sur [render.com](https://render.com), créez un compte en vous connectant
   avec GitHub et ajoutez un moyen de paiement (le disque exige une instance
   payante).
2. **New → Blueprint**, choisissez le dépôt `moncommerce`, puis **Apply**.
3. Ouvrez `https://<votre-service>.onrender.com/`, puis **Mon espace → Créer
   mon espace** pour ouvrir votre espace administrateur.
4. Facultatif : définissez `CODE_INVITATION` dans **Environment** pour réserver
   la création d'espaces aux personnes à qui vous donnez ce code (sinon
   l'inscription est ouverte à tous).
5. Facultatif : nom de domaine personnalisé (service → **Settings → Custom
   Domains**, puis renseignez `PUBLIC_URL`), clés CinetPay dans **Environment**.

**Démo gratuite (instance « Free »)** : pas de disque, donc les données sont
effacées à chaque redémarrage ou mise en veille, et le message hebdomadaire ne
part pas pendant la veille. Renseignez `COMPTE_ADMIN_*` et `COMPTE_VENDEUR_*`
dans **Environment** pour que les deux comptes soient recréés automatiquement.

Chaque `git push` sur `main` redéploie automatiquement. Les données sont sur le
disque et ne sont pas touchées par les redéploiements. Pensez à télécharger
régulièrement une sauvegarde depuis *Paramètres → Données*.

Toutes les routes de l'API sont documentées dans `backend/README.md`.
L'ancienne interface (v1) est conservée dans `frontend-v1-sauvegarde/`.
