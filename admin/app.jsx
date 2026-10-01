import React, {
  useState, useEffect, useMemo, useCallback, useRef, useContext, createContext, useLayoutEffect,
} from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import {
  Home, ShoppingCart, Tag, Users, Receipt, Landmark, Settings, Search, Bell, Plus, Minus, X, Menu,
  ChevronDown, ChevronLeft, ChevronRight, ArrowLeft, ArrowUpRight, ArrowDownRight, ArrowUpDown,
  MoreHorizontal, Check, CheckCircle2, Clock, Truck, XCircle, PackageCheck, Package, Star, Phone, Mail,
  MapPin, Trash2, Pencil, Eye, EyeOff, Lock, ShieldCheck, LogOut, Moon, Sun, Monitor, Download, Upload,
  Printer, Copy, RotateCcw, ShoppingBag, LayoutGrid, List, AlertCircle, AlertTriangle, Info, Sparkles,
  CreditCard, Smartphone, Banknote, TrendingUp, Inbox, UserPlus, User, MessageSquare, Store, Wallet,
  Boxes, Megaphone, Percent, Send, History, ClipboardList, PackagePlus, PackageMinus, CalendarClock, FileText, Gift,
} from "lucide-react";
import { lignesTicket, telechargerTicketPdf, urlTicketPdf, pdfIntegrable, telInternational, genererQr, cheminQr, lienTicket } from "../partage/ticket.js";

/* =====================================================================
   MonCommerce — administration de boutique (style Shopify)
   ===================================================================== */

/* ---------- Constantes métier ---------- */
const STATUTS = {
  en_attente: { label: "En attente", tone: "warning", icon: Clock },
  confirmee: { label: "Confirmée", tone: "info", icon: CheckCircle2 },
  expediee: { label: "Expédiée", tone: "magic", icon: Truck },
  livree: { label: "Livrée", tone: "success", icon: PackageCheck },
  annulee: { label: "Annulée", tone: "critical", icon: XCircle },
};
const FLOW = ["en_attente", "confirmee", "expediee", "livree"];
const NEXT_STEP = {
  en_attente: { statut: "confirmee", label: "Confirmer la commande", icon: CheckCircle2 },
  confirmee: { statut: "expediee", label: "Marquer comme expédiée", icon: Truck },
  expediee: { statut: "livree", label: "Marquer comme livrée", icon: PackageCheck },
};
/* Moyens de paiement utilisés en boutique en Côte d'Ivoire.
   type : especes (montant reçu → monnaie), mobile (numéro + ID de transaction),
   carte (n° d'autorisation du TPE), livraison (payé plus tard, à encaisser). */
const PAIEMENTS = [
  { key: "Espèces", court: "Espèces", type: "especes", icon: Banknote, color: "#16a34a", sigle: "₣" },
  { key: "Orange Money", court: "Orange", type: "mobile", icon: Smartphone, color: "#ff7900", sigle: "OM" },
  { key: "MTN MoMo", court: "MTN", type: "mobile", icon: Smartphone, color: "#ffcb05", sigle: "MTN", texte: "#1a1a1a" },
  { key: "Moov Money", court: "Moov", type: "mobile", icon: Smartphone, color: "#0066b3", sigle: "MV" },
  { key: "Wave", court: "Wave", type: "mobile", icon: Smartphone, color: "#1dc8ff", sigle: "W" },
  { key: "Carte bancaire", court: "Carte", type: "carte", icon: CreditCard, color: "#2c6ecb", sigle: "CB" },
  { key: "Paiement à la livraison", court: "À la livraison", type: "livraison", icon: Truck, color: "#8a8a8a", sigle: "…" },
  // Paiement réalisé par le client sur la boutique en ligne (CinetPay) — jamais saisi en caisse
  { key: "Paiement en ligne", court: "En ligne", type: "en_ligne", icon: CreditCard, color: "#6d28d9", sigle: "CP" },
];
// Libellés des anciennes versions
const PAIEMENTS_ANCIENS = {
  "Mobile Money": { key: "Mobile Money", court: "Mobile Money", type: "mobile", icon: Smartphone, color: "#e0a12c", sigle: "MM" },
  Carte: PAIEMENTS[5],
};
const infoPaiement = (mode) => PAIEMENTS.find((p) => p.key === mode) || PAIEMENTS_ANCIENS[mode] || PAIEMENTS[0];
const ModePaiement = ({ mode, taille = 22 }) => {
  const p = infoPaiement(mode);
  return <span className="pay-logo" style={{ background: p.color, color: p.texte || "#fff", width: taille, height: taille, fontSize: taille * 0.38 }}>{p.sigle}</span>;
};
const CATEGORIES = [
  { key: "Stock", color: "var(--c-blue)" },
  { key: "Marketing", color: "var(--c-gold)" },
  { key: "Logistique", color: "var(--c-green)" },
  { key: "Équipement", color: "var(--c-purple)" },
  { key: "Autre", color: "var(--c-gray)" },
];
const catColor = (k) => (CATEGORIES.find((c) => c.key === k) || CATEGORIES[4]).color;
const STOCK_FAIBLE = 10;

/* ---------- Utilitaires ---------- */
const uid = () => Math.random().toString(36).slice(2, 10);
let _seq = 0;
const nextId = (p = "id") => `${p}${++_seq}`;
const cx = (...a) => a.filter(Boolean).join(" ");
const norm = (s) => (s || "").toString().normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const initials = (nom) => (nom || "?").split(/\s+/).filter(Boolean).map((p) => p[0]).slice(0, 2).join("").toUpperCase();
const toneOf = (s) => { let h = 0; for (const ch of s || "") h = (h * 31 + ch.charCodeAt(0)) % 8; return h; };
const prefersReducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const nf = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const fmt = (n) => nf.format(Math.round(n || 0)) + " FCFA";
const fmtNum = (n) => nf.format(Math.round(n || 0));
const fmtShort = (n) => {
  const a = Math.abs(n);
  if (a >= 1e6) return (n / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace(".", ",") + " M";
  if (a >= 1e3) return Math.round(n / 1e3) + " k";
  return String(Math.round(n));
};
const pct = (n) => (n >= 0 ? "" : "−") + Math.abs(n).toFixed(0) + " %";

const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const hhmm = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parseDate = (s) => {
  if (!s) return new Date();
  if (s.length <= 10) { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); }
  return new Date(s);
};
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
const daysBetween = (a, b) => Math.round((parseDate(isoDate(b)) - parseDate(isoDate(a))) / 864e5);
const fmtDate = (s) => parseDate(s).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });
const fmtDateCourt = (s) => { const d = parseDate(s); return d.toLocaleDateString("fr-FR", d.getFullYear() === new Date().getFullYear() ? { day: "numeric", month: "short" } : { day: "numeric", month: "short", year: "numeric" }); };
const fmtDateLong = (d) => d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
const fmtDateTime = (s) => parseDate(s).toLocaleString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
const relDay = (dateStr, heure) => {
  const n = daysBetween(parseDate(dateStr), today());
  const h = heure ? ` à ${heure}` : "";
  if (n === 0) return "Aujourd'hui" + h;
  if (n === 1) return "Hier" + h;
  if (n > 1 && n < 7) return `Il y a ${n} jours`;
  return fmtDate(dateStr);
};
const venteStamp = (v) => (v?.date || "") + "T" + (v?.heure || "12:00");

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function toCsv(rows) {
  const esc = (v) => { const s = String(v ?? ""); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return "﻿" + rows.map((r) => r.map(esc).join(";")).join("\n");
}

/* =====================================================================
   Données de démonstration (générées autour de la date du jour)
   ===================================================================== */
function rng(seed) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedData() {
  const r = rng(20260813);
  const pick = (a) => a[Math.floor(r() * a.length)];
  const T0 = today();
  const now = new Date();

  const base = [
    ["Aïcha Koné", "07 01 23 45 67", "Cocody, Abidjan", "VIP", "Cliente fidèle, préfère le paiement Mobile Money"],
    ["Yao Kouassi", "05 44 12 98 76", "Yopougon, Abidjan", "Standard", ""],
    ["Fatou Diabaté", "01 22 33 44 55", "Bouaké", "VIP", "Achète en gros pour revente"],
    ["Ibrahim Traoré", "07 88 99 00 11", "Marcory, Abidjan", "Standard", ""],
    ["Mariam Ouattara", "07 45 67 12 30", "Plateau, Abidjan", "VIP", "Livraison uniquement l'après-midi"],
    ["Serge N'Guessan", "05 12 78 45 90", "Yamoussoukro", "Standard", ""],
    ["Awa Bamba", "01 98 76 54 32", "Treichville, Abidjan", "Standard", "Aime les emballages cadeaux"],
    ["Koffi Assi", "07 33 21 09 87", "San-Pédro", "Standard", ""],
    ["Adjoua Yao", "05 66 43 21 10", "Bingerville", "VIP", ""],
    ["Moussa Sangaré", "07 21 34 56 78", "Korhogo", "Standard", ""],
    ["Christelle Gnagne", "01 55 44 33 22", "Angré, Abidjan", "Standard", "Nouvelle cliente via Instagram"],
    ["Bakary Coulibaly", "05 90 80 70 60", "Daloa", "Standard", ""],
  ];
  const clients = base.map(([nom, tel, ville, statut, notes], i) => ({
    id: uid(), nom, tel, ville, statut, notes,
    email: norm(nom).replace(/[^a-z ]/g, "").trim().replace(/\s+/g, ".") + "@mail.ci",
    dateAjout: isoDate(addDays(T0, -(i >= 9 ? 3 + Math.floor(r() * 20) : 60 + Math.floor(r() * 220)))),
  }));

  const packs = [
    ["Pack Découverte", 15000, 42, "📦", "Idéal pour démarrer, 3 articles essentiels", 0],
    ["Pack Premium", 45000, 18, "💎", "Sélection haut de gamme, 6 articles", 2],
    ["Pack Business", 90000, 7, "🚀", "Pour revendeurs, quantité en gros", 5],
    ["Pack Cadeau", 25000, 25, "🎁", "Emballage soigné, prêt à offrir", 3],
    ["Pack Beauté", 32000, 14, "💄", "Soins et maquillage, 4 produits", 7],
    ["Pack Café", 12000, 0, "☕", "Café d'Abidjan torréfié, 3 variétés", 1],
    ["Pack Bien-être", 28000, 22, "🕯️", "Bougies, huiles et thé détente", 4],
    ["Pack Gourmand", 18000, 5, "🍫", "Chocolats et douceurs artisanales", 6],
  ].map(([nom, prix, stock, emoji, desc, teinte], i) => ({
    id: uid(), nom, prix, stock, emoji, desc, teinte,
    cout: Math.round(prix * (0.45 + r() * 0.15) / 100) * 100,
    sku: "PK-" + String(101 + i),
    actif: true,
  }));

  const N = 78;
  const ages = [...Array(N)].map(() => Math.floor(Math.pow(r(), 1.5) * 92)).sort((a, b) => b - a);
  const ventes = [];
  const commandes = [];
  ages.forEach((daysAgo, i) => {
    const client = r() < 0.45 ? pick(clients.filter((c) => c.statut === "VIP")) : pick(clients);
    const pack = r() < 0.5 ? pick(packs.slice(0, 4)) : pick(packs);
    const qte = r() < 0.7 ? 1 : r() < 0.7 ? 2 : 3;
    const pr = r();
    const paiement = pr < 0.3 ? "Espèces" : pr < 0.5 ? "Orange Money" : pr < 0.62 ? "Wave" : pr < 0.74 ? "MTN MoMo" : pr < 0.8 ? "Moov Money" : pr < 0.9 ? "Carte bancaire" : "Paiement à la livraison";
    const date = addDays(T0, -daysAgo);
    let h = 8 + Math.floor(r() * 12);
    if (daysAgo === 0) h = Math.min(h, Math.max(8, now.getHours() - 1));
    const heure = pad(h) + ":" + pad(Math.floor(r() * 60));
    const statut = daysAgo === 0 ? pick(["en_attente", "en_attente", "confirmee"])
      : daysAgo <= 2 ? pick(["confirmee", "expediee", "en_attente"])
      : daysAgo <= 6 ? pick(["expediee", "livree", "livree"])
      : r() < 0.06 ? "annulee" : "livree";

    const vid = uid();
    const total = qte * pack.prix;
    const info = infoPaiement(paiement);
    const livree = statut === "livree";
    const aLivraison = info.type === "livraison";
    const cid = uid();
    ventes.push({
      id: vid, commandeId: cid, clientId: client.id, packId: pack.id, qte, prixUnitaire: pack.prix, date: isoDate(date), heure,
      // Paiement à la livraison : encaissé en espèces une fois la commande livrée
      paiement: aLivraison && livree ? "Espèces" : paiement,
      statutPaiement: aLivraison && !livree ? "en_attente" : "payee",
      montantRecu: info.type === "especes" || (aLivraison && livree) ? Math.ceil(total / 5000) * 5000 : null,
      telPaiement: info.type === "mobile" ? client.tel : "",
      reference: info.type === "mobile" ? "TX" + String(Math.floor(r() * 1e10)).padStart(10, "0") : info.type === "carte" ? "AUT" + String(Math.floor(r() * 1e6)).padStart(6, "0") : "",
    });

    const start = parseDate(isoDate(date)); start.setHours(h, Number(heure.slice(3)));
    const path = statut === "annulee" ? ["en_attente", "annulee"] : FLOW.slice(0, FLOW.indexOf(statut) + 1);
    const stepH = daysAgo === 0 ? 0.5 : Math.min(30, (daysAgo * 24) / (path.length + 1));
    const historique = path.map((s, k) => {
      let t = new Date(start.getTime() + k * stepH * 3600e3);
      if (t > now) t = new Date(now.getTime() - (path.length - k) * 60e3);
      return { statut: s, date: t.toISOString() };
    });
    commandes.push({ id: cid, venteId: vid, numero: "#" + (1001 + i), statut, adresseLivraison: client.ville, note: "", historique, canal: "boutique", fraisLivraison: 0 });
  });

  const investissements = [
    ["Achat de stock — Pack Premium x20", "Stock", 620000, 88],
    ["Publicité Facebook & Instagram", "Marketing", 80000, 80],
    ["Emballages & étiquettes", "Logistique", 35000, 72],
    ["Achat de stock — Pack Business x10", "Stock", 550000, 64],
    ["Imprimante de reçus", "Équipement", 95000, 50],
    ["Campagne influenceurs", "Marketing", 150000, 38],
    ["Achat de stock — Packs Cadeau & Beauté", "Stock", 480000, 24],
    ["Frais de livraison (moto)", "Logistique", 42000, 12],
    ["Achat de stock — Pack Découverte x40", "Stock", 310000, 4],
  ].map(([libelle, categorie, montant, d]) => ({ id: uid(), libelle, categorie, montant, date: isoDate(addDays(T0, -d)) }));

  return { clients, packs, ventes, commandes, investissements, boutique: boutiqueParDefaut() };
}

function boutiqueParDefaut() {
  return {
    nom: readJson(SETTINGS_KEY)?.nomBoutique || "Ma Boutique",
    adresse: "Cocody Angré, Abidjan",
    telephone: "",
    message: "Merci pour votre achat et à bientôt !",
    slogan: "", whatsapp: "",
    momo_orange: "", momo_mtn: "", momo_moov: "", momo_wave: "", momo_titulaire: "",
    frais_livraison: "0", livraison_gratuite_des: "0", zone_livraison: "", boutique_ouverte: "1",
  };
}

/* Mise à niveau des données enregistrées par l'ancienne version */
function migrate(d) {
  const x = {
    clients: d.clients || [], packs: d.packs || [], ventes: d.ventes || [],
    commandes: d.commandes || [], investissements: d.investissements || [],
  };
  x.packs = x.packs.map((p, i) => ({ actif: true, sku: "PK-" + (101 + i), teinte: i % 8, cout: null, desc: "", ...p }));
  x.clients = x.clients.map((c) => ({ email: "", ville: "", notes: "", statut: "Standard", ...c }));
  x.ventes = x.ventes.map((v) => ({ statutPaiement: "payee", montantRecu: null, telPaiement: "", reference: "", ...v, paiement: v.paiement === "Carte" ? "Carte bancaire" : v.paiement }));
  x.boutique = { ...boutiqueParDefaut(), ...(d.boutique || {}) };
  const cmdParVente = new Map(x.commandes.map((c) => [c.venteId, c.id]));
  x.ventes = x.ventes.map((v) => (v.commandeId ? v : { ...v, commandeId: cmdParVente.get(v.id) || null }));
  x.commandes = x.commandes.map((c) => ({ canal: "boutique", fraisLivraison: 0, ...c }));
  x.commandes = x.commandes.map((c) => {
    if (c.historique) return c;
    const v = x.ventes.find((v) => v.id === c.venteId);
    return { note: "", ...c, historique: [{ statut: c.statut, date: parseDate(v?.date || isoDate(new Date())).toISOString() }] };
  });
  return x;
}

/* =====================================================================
   Persistance (localStorage)
   ===================================================================== */
const STORAGE_KEY = "moncommerce-data";
const SETTINGS_KEY = "moncommerce-reglages";
const AUTH_KEY = "moncommerce-auth";

const readJson = (k) => { try { const r = window.localStorage.getItem(k); return r ? JSON.parse(r) : null; } catch { return null; } };
const writeJson = (k, v) => { try { window.localStorage.setItem(k, JSON.stringify(v)); } catch { /* stockage indisponible */ } };
const removeKey = (k) => { try { window.localStorage.removeItem(k); } catch { /* ignoré */ } };

/* Données de la boutique. En mode démo elles vivent dans localStorage ;
   connectées au serveur, elles sont chargées depuis l'API (voir App). */
function useStore(mode) {
  const [data, setData] = useState(null);
  useEffect(() => { if (mode === "demo" && data) writeJson(STORAGE_KEY, data); }, [data, mode]);
  const update = useCallback((fn) => setData((d) => (d ? fn(d) : d)), []);
  return { data, update, replace: setData };
}
const chargerLocal = () => { const raw = readJson(STORAGE_KEY); return raw ? migrate(raw) : seedData(); };

/* =====================================================================
   Connexion au serveur (API REST du dossier backend/)
   ===================================================================== */
let API_BASE = "";

class ErreurApi extends Error {
  constructor(message, statut) { super(message); this.statut = statut; }
}

async function apiFetch(method, chemin, corps) {
  const auth = readJson(AUTH_KEY);
  let res;
  try {
    res = await fetch(API_BASE + chemin, {
      method,
      headers: { "Content-Type": "application/json", ...(auth?.jeton ? { Authorization: "Bearer " + auth.jeton } : {}) },
      body: corps !== undefined ? JSON.stringify(corps) : undefined,
    });
  } catch {
    throw new ErreurApi("Serveur injoignable. Vérifiez votre connexion.", 0);
  }
  if (res.status === 401 && auth?.jeton && !chemin.startsWith("/api/auth/")) {
    window.dispatchEvent(new Event("mc-session-expiree"));
  }
  if (res.status === 204) return null;
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ErreurApi(json.erreur || `Erreur ${res.status}`, res.status);
  return json;
}

/** Cherche l'API : même origine (interface servie par le backend), puis localhost:4000. */
async function detecterServeur() {
  const candidats = [];
  if (window.MONCOMMERCE_API_URL) candidats.push(String(window.MONCOMMERCE_API_URL).replace(/\/$/, ""));
  if (location.protocol.startsWith("http")) candidats.push("");
  candidats.push("http://localhost:4000");
  for (const base of candidats) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const r = await fetch(base + "/api/sante", { signal: ctrl.signal });
      clearTimeout(t);
      if (r.ok && (await r.json()).service) return base;
    } catch { /* candidat suivant */ }
  }
  return null;
}

/* Conversion format serveur (snake_case, horodatages UTC) ↔ format de l'interface */
const localIso = (date, heure = "12:00") => {
  const [y, m, d] = String(date).slice(0, 10).split("-").map(Number);
  const [hh, mi] = String(heure).split(":").map(Number);
  return new Date(y, m - 1, d, hh || 0, mi || 0).toISOString();
};

function depuisServeur(p) {
  const evts = new Map();
  (p.evenements || []).forEach((e) => { if (!evts.has(e.commande_id)) evts.set(e.commande_id, []); evts.get(e.commande_id).push(e); });
  const ventes = p.ventes.map((v) => {
    const d = new Date(v.date_vente);
    return {
      id: v.id, commandeId: v.commande_id || null, clientId: v.client_id, packId: v.pack_id, qte: v.quantite, prixUnitaire: v.prix_unitaire, date: isoDate(d), heure: hhmm(d),
      paiement: v.mode_paiement, statutPaiement: v.statut_paiement || "payee", montantRecu: v.montant_recu ?? null,
      telPaiement: v.telephone_paiement || "", reference: v.reference_paiement || "", payeLe: v.paye_le || null, vendeur: v.vendeur_nom || "",
    };
  });
  const venteDate = new Map(p.ventes.map((v) => [v.id, v.date_vente]));
  return {
    role: p.role || "admin",
    clients: p.clients.map((c) => ({ id: c.id, nom: c.nom, tel: c.telephone || "", email: c.email || "", ville: c.ville || "", statut: c.statut || "Standard", notes: c.notes || "", dateAjout: isoDate(new Date(c.cree_le)), consentement: !!c.consentement_marketing })),
    packs: p.packs.map((x) => ({ id: x.id, nom: x.nom, desc: x.description || "", prix: x.prix, cout: x.cout ?? null, stock: x.stock, sku: x.sku || "", emoji: x.emoji || "📦", teinte: x.teinte ?? 0, actif: !!x.actif, image: x.image || null,
      contenu: x.contenu || "", prixPromo: x.prix_promo ?? null, promoFin: x.promo_fin || null, seuilAlerte: x.seuil_alerte ?? STOCK_FAIBLE })),
    ventes,
    commandes: p.commandes.map((c) => {
      const h = (evts.get(c.id) || []).map((e) => (e.type === "statut" ? { statut: e.statut, date: e.cree_le } : { type: e.type, texte: e.texte, date: e.cree_le }));
      return {
        id: c.id, venteId: c.vente_id, numero: c.numero, statut: c.statut, adresseLivraison: c.adresse_livraison || "", note: c.note || "", jetonRecu: c.jeton_recu || null,
        canal: c.canal || "boutique", fraisLivraison: Number(c.frais_livraison) || 0, contactTel: c.contact_telephone || "", contactEmail: c.contact_email || "",
        historique: h.length ? h : [{ statut: c.statut, date: venteDate.get(c.vente_id) || c.maj_le }],
      };
    }),
    investissements: p.investissements.map((i) => ({ id: i.id, libelle: i.libelle, categorie: i.categorie, montant: i.montant, date: String(i.date_invest).slice(0, 10) })),
    boutique: { ...boutiqueParDefaut(), ...(p.boutique || {}) },
  };
}

const clientVersServeur = (c) => ({ nom: c.nom, telephone: c.tel, email: c.email || "", ville: c.ville || "", statut: c.statut, notes: c.notes || "", consentement_marketing: c.consentement ? 1 : 0 });
const packVersServeur = (p) => ({ nom: p.nom, description: p.desc || "", prix: p.prix, cout: p.cout ?? null, stock: p.stock, sku: p.sku || "", emoji: p.emoji, teinte: p.teinte, actif: p.actif !== false, image: p.image ?? null,
  contenu: p.contenu || "", prix_promo: p.prixPromo ?? null, promo_fin: p.promoFin || null, seuil_alerte: p.seuilAlerte ?? STOCK_FAIBLE });

/* Promotion en cours ? (même règle que le serveur : lib/prix.js) */
const promoActive = (p) => p?.prixPromo != null && p.prixPromo > 0 && p.prixPromo < p.prix && (!p.promoFin || new Date(p.promoFin) > new Date());
const prixEffectif = (p) => (promoActive(p) ? p.prixPromo : p?.prix || 0);
const seuilDe = (p) => p?.seuilAlerte ?? STOCK_FAIBLE;
const investVersServeur = (i) => ({ libelle: i.libelle, categorie: i.categorie, montant: i.montant, date_invest: i.date });

function versServeur(d) {
  return {
    clients: d.clients.map((c) => ({ id: c.id, ...clientVersServeur(c), cree_le: localIso(c.dateAjout || isoDate(new Date())) })),
    packs: d.packs.map((p) => ({ id: p.id, ...packVersServeur(p), actif: p.actif !== false ? 1 : 0 })),
    ventes: d.ventes.map((v) => ({ id: v.id, commande_id: v.commandeId || null, client_id: v.clientId, pack_id: v.packId, quantite: v.qte, prix_unitaire: v.prixUnitaire, mode_paiement: v.paiement, date_vente: localIso(v.date, v.heure),
      statut_paiement: v.statutPaiement || "payee", montant_recu: v.montantRecu ?? null, reference_paiement: v.reference || null, telephone_paiement: v.telPaiement || null })),
    commandes: d.commandes.map((c) => ({ id: c.id, vente_id: c.venteId, numero: c.numero, statut: c.statut, adresse_livraison: c.adresseLivraison || "", note: c.note || "", jeton_recu: c.jetonRecu || null,
      canal: c.canal || "boutique", frais_livraison: c.fraisLivraison || 0, contact_telephone: c.contactTel || null, contact_email: c.contactEmail || null })),
    evenements: d.commandes.flatMap((c) => (c.historique || []).map((e) => ({ commande_id: c.id, type: e.type || "statut", statut: e.statut || null, texte: e.texte || null, cree_le: new Date(e.date).toISOString() }))),
    investissements: d.investissements.map((i) => ({ id: i.id, ...investVersServeur(i) })),
    boutique: d.boutique,
  };
}

/* ---------- Opérations sur les données ---------- */
/* Lignes (ventes) d'une commande — une ou plusieurs */
const lignesDe = (d, c) => {
  const l = d.ventes.filter((v) => v.commandeId === c.id);
  return l.length ? l : d.ventes.filter((v) => v.id === c.venteId);
};

function applyStatut(d, ids, statut) {
  const set = new Set(ids);
  const now = new Date().toISOString();
  let packs = d.packs;
  const commandes = d.commandes.map((c) => {
    if (!set.has(c.id) || c.statut === statut) return c;
    for (const v of lignesDe(d, c)) {
      const delta = statut === "annulee" ? v.qte : c.statut === "annulee" ? -v.qte : 0;
      if (delta) packs = packs.map((p) => (p.id === v.packId ? { ...p, stock: Math.max(0, p.stock + delta) } : p));
    }
    return { ...c, statut, historique: [...(c.historique || []), { statut, date: now }] };
  });
  return { ...d, commandes, packs };
}

function deleteCommande(d, id) {
  const c = d.commandes.find((x) => x.id === id);
  if (!c) return d;
  const lignes = lignesDe(d, c);
  let packs = d.packs;
  if (c.statut !== "annulee") for (const v of lignes) packs = packs.map((p) => (p.id === v.packId ? { ...p, stock: p.stock + v.qte } : p));
  const ids = new Set(lignes.map((v) => v.id));
  return { ...d, packs, commandes: d.commandes.filter((x) => x.id !== id), ventes: d.ventes.filter((x) => !ids.has(x.id)) };
}

function nextNumero(d) {
  const max = d.commandes.reduce((m, c) => Math.max(m, parseInt(String(c.numero).replace(/\D/g, ""), 10) || 0), 1000);
  return "#" + (max + 1);
}

function enrichVentes(d) {
  const parId = new Map(d.commandes.map((c) => [c.id, c]));
  const parVente = new Map(d.commandes.map((c) => [c.venteId, c]));
  const cl = new Map(d.clients.map((c) => [c.id, c]));
  const pk = new Map(d.packs.map((p) => [p.id, p]));
  return d.ventes.map((v) => ({ ...v, total: v.qte * v.prixUnitaire, commande: parId.get(v.commandeId) || parVente.get(v.id), client: cl.get(v.clientId), pack: pk.get(v.packId) }));
}
const isValid = (v) => v.commande?.statut !== "annulee";

function enrichCommandes(d) {
  const vt = new Map(d.ventes.map((v) => [v.id, v]));
  const parCommande = new Map();
  for (const v of d.ventes) if (v.commandeId) { if (!parCommande.has(v.commandeId)) parCommande.set(v.commandeId, []); parCommande.get(v.commandeId).push(v); }
  const cl = new Map(d.clients.map((c) => [c.id, c]));
  const pk = new Map(d.packs.map((p) => [p.id, p]));
  return d.commandes.map((c) => {
    const brutes = parCommande.get(c.id) || [vt.get(c.venteId)].filter(Boolean);
    const lignes = brutes.map((v) => ({ ...v, pack: pk.get(v.packId), total: v.qte * v.prixUnitaire }));
    const vente = lignes[0];
    const sousTotal = lignes.reduce((s, l) => s + l.total, 0);
    const frais = Number(c.fraisLivraison) || 0;
    return {
      ...c, vente, lignes, client: cl.get(vente?.clientId), pack: vente?.pack,
      sousTotal, frais, total: sousTotal + frais, articles: lignes.reduce((s, l) => s + l.qte, 0), stamp: venteStamp(vente),
    };
  });
}
/* Libellé court du contenu d'une commande */
const resumeCommande = (c) => (c.lignes?.length > 1 ? `${c.lignes.length} produits · ${c.articles} articles` : `${c.pack?.nom || "Produit supprimé"} × ${c.vente?.qte ?? 0}`);

function clientStats(d, clientId) {
  const vs = enrichVentes(d).filter((v) => v.clientId === clientId);
  const valid = vs.filter(isValid);
  const total = valid.reduce((s, v) => s + v.total, 0);
  const last = vs.map(venteStamp).sort().pop();
  return { ventes: vs, nb: vs.length, total, panier: valid.length ? total / valid.length : 0, last };
}

function computeTodo(d) {
  const count = (s) => d.commandes.filter((c) => c.statut === s).length;
  return {
    attente: count("en_attente"),
    aEncaisser: enrichCommandes(d).filter((c) => c.vente?.statutPaiement === "en_attente" && c.statut !== "annulee"),
    aVerifier: enrichCommandes(d).filter((c) => c.vente?.statutPaiement === "a_verifier" && c.statut !== "annulee"),
    enLigne: d.commandes.filter((c) => c.canal === "en_ligne" && c.statut === "en_attente").length,
    aExpedier: count("confirmee"),
    enLivraison: count("expediee"),
    faible: d.packs.filter((p) => p.actif !== false && p.stock > 0 && p.stock <= seuilDe(p)),
    rupture: d.packs.filter((p) => p.actif !== false && p.stock <= 0),
  };
}

function computeDashboard(d, days) {
  const T0 = today();
  const start = addDays(T0, -(days - 1));
  const pStart = addDays(start, -days);
  const vs = enrichVentes(d).filter(isValid);
  const inR = (s, a, b) => { const t = parseDate(s); return t >= a && t <= b; };
  const cur = vs.filter((v) => inR(v.date, start, T0));
  const prev = vs.filter((v) => inR(v.date, pStart, addDays(start, -1)));
  const sum = (a) => a.reduce((s, v) => s + v.total, 0);

  const byDay = new Map();
  vs.forEach((v) => { const o = byDay.get(v.date) || { t: 0, n: 0, q: 0 }; o.t += v.total; o.n += 1; o.q += v.qte; byDay.set(v.date, o); });
  const newByDay = new Map();
  d.clients.forEach((c) => c.dateAjout && newByDay.set(c.dateAjout, (newByDay.get(c.dateAjout) || 0) + 1));

  const series = [...Array(days)].map((_, i) => {
    const key = isoDate(addDays(start, i));
    const pk = isoDate(addDays(pStart, i));
    const o = byDay.get(key) || { t: 0, n: 0, q: 0 };
    return { date: key, value: o.t, prev: (byDay.get(pk) || { t: 0 }).t, n: o.n, q: o.q, nc: newByDay.get(key) || 0 };
  });

  const ca = sum(cur), caPrev = sum(prev);
  const nb = cur.length, nbPrev = prev.length;
  const panier = nb ? ca / nb : 0, panierPrev = nbPrev ? caPrev / nbPrev : 0;
  const nc = d.clients.filter((c) => c.dateAjout && inR(c.dateAjout, start, T0)).length;
  const ncPrev = d.clients.filter((c) => c.dateAjout && inR(c.dateAjout, pStart, addDays(start, -1))).length;
  const delta = (a, b) => (b > 0 ? ((a - b) / b) * 100 : null);

  const byPack = new Map();
  cur.forEach((v) => { const o = byPack.get(v.packId) || { pack: v.pack, qte: 0, total: 0 }; o.qte += v.qte; o.total += v.total; byPack.set(v.packId, o); });
  const top = [...byPack.values()].filter((o) => o.pack).sort((a, b) => b.total - a.total).slice(0, 5);

  const paiements = [...PAIEMENTS, ...Object.values(PAIEMENTS_ANCIENS).slice(0, 1)]
    .map((p) => ({ label: p.court, color: p.color, value: cur.filter((v) => infoPaiement(v.statutPaiement === "en_attente" ? "Paiement à la livraison" : v.paiement).key === p.key).reduce((s, v) => s + v.total, 0) }))
    .filter((p) => p.value > 0);

  return {
    series, ca, nb, panier, nc, top, paiements,
    dCa: delta(ca, caPrev), dNb: delta(nb, nbPrev), dPanier: delta(panier, panierPrev), dNc: delta(nc, ncPrev),
  };
}

/* =====================================================================
   Contexte & hooks
   ===================================================================== */
const AppCtx = createContext(null);
const useApp = () => useContext(AppCtx);

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, "");
  const [path, qs = ""] = h.split("?");
  const [page = "accueil", id = null] = path.split("/").filter(Boolean);
  return { page: decodeURIComponent(page), id: id ? decodeURIComponent(id) : null, query: Object.fromEntries(new URLSearchParams(qs)) };
}
function useRoute() {
  const [route, setRoute] = useState(parseHash);
  useEffect(() => {
    const f = () => setRoute(parseHash());
    window.addEventListener("hashchange", f);
    return () => window.removeEventListener("hashchange", f);
  }, []);
  const go = useCallback((page, id, query) => {
    const qs = query ? "?" + new URLSearchParams(query).toString() : "";
    window.location.hash = "/" + page + (id ? "/" + encodeURIComponent(id) : "") + qs;
  }, []);
  return [route, go];
}

function usePresence(open, ms = 200) {
  const [mounted, setMounted] = useState(open);
  const [closing, setClosing] = useState(false);
  useEffect(() => {
    if (open) { setMounted(true); setClosing(false); return; }
    if (!mounted) return;
    setClosing(true);
    const t = setTimeout(() => { setMounted(false); setClosing(false); }, ms);
    return () => clearTimeout(t);
  }, [open]);
  return [mounted, closing];
}

/* Pile des calques ouverts : Échap ne ferme que le plus haut */
const layerStack = [];
function useEscape(active, onEsc) {
  const idRef = useRef(nextId("layer"));
  const cb = useRef(onEsc);
  cb.current = onEsc;
  useEffect(() => {
    if (!active) return;
    const id = idRef.current;
    layerStack.push(id);
    const h = (e) => {
      if (e.key === "Escape" && layerStack[layerStack.length - 1] === id) { e.preventDefault(); cb.current?.(); }
    };
    window.addEventListener("keydown", h);
    return () => {
      window.removeEventListener("keydown", h);
      const i = layerStack.lastIndexOf(id);
      if (i >= 0) layerStack.splice(i, 1);
    };
  }, [active]);
}

function useCountUp(target, duration = 800) {
  const [value, setValue] = useState(prefersReducedMotion() ? target : 0);
  const fromRef = useRef(prefersReducedMotion() ? target : 0);
  useEffect(() => {
    if (prefersReducedMotion()) { setValue(target); fromRef.current = target; return; }
    const from = fromRef.current;
    const t0 = performance.now();
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / duration);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (target - from) * e;
      setValue(v);
      fromRef.current = v;
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return value;
}
const CountUp = ({ value, format = fmtNum }) => <span className="num">{format(useCountUp(value))}</span>;

/* Indicateur glissant pour Segmented / Tabs */
function useIndicator(dep) {
  const ref = useRef(null);
  const [style, setStyle] = useState({ opacity: 0 });
  const measure = useCallback(() => {
    const el = ref.current?.querySelector('[data-active="true"]');
    if (!el) { setStyle((s) => (s.opacity === 0 ? s : { opacity: 0 })); return; }
    const next = { width: el.offsetWidth, transform: `translateX(${el.offsetLeft}px)`, opacity: 1 };
    setStyle((s) => (s.width === next.width && s.transform === next.transform && s.opacity === 1 ? s : next));
  }, []);
  useLayoutEffect(measure);
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, [measure]);
  return [ref, style];
}

function usePaged(rows, per, resetKey) {
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [resetKey]);
  const pages = Math.max(1, Math.ceil(rows.length / per));
  const p = Math.min(page, pages);
  return {
    slice: rows.slice((p - 1) * per, p * per), page: p, pages, setPage, total: rows.length,
    from: rows.length ? (p - 1) * per + 1 : 0, to: Math.min(p * per, rows.length),
  };
}

function useSort(initialKey, initialDir = "desc") {
  const [sort, setSort] = useState({ key: initialKey, dir: initialDir });
  const toggle = (key) => setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "nom" || key === "client" ? "asc" : "desc" }));
  const apply = (rows, getters) => {
    const g = getters[sort.key];
    if (!g) return rows;
    const m = sort.dir === "asc" ? 1 : -1;
    return [...rows].sort((a, b) => {
      const x = g(a), y = g(b);
      return (typeof x === "string" ? x.localeCompare(y, "fr") : x - y) * m;
    });
  };
  return { sort, toggle, apply, set: setSort };
}

/* =====================================================================
   Composants d'interface
   ===================================================================== */
function Btn({ children, variant = "secondary", size, icon: Icon, iconRight: IconR, loading, full, className, ...rest }) {
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cx("btn", `btn-${variant}`, size && `btn-${size}`, full && "btn-full", !children && "btn-icon", loading && "is-loading", className)}
    >
      {loading && <span className="spinner" />}
      {Icon && <Icon size={size === "sm" ? 14 : 16} strokeWidth={2.2} />}
      {children && <span>{children}</span>}
      {IconR && <IconR size={14} strokeWidth={2.2} />}
    </button>
  );
}

const Badge = ({ tone = "neutral", children, dot, icon: Icon, className }) => (
  <span className={cx("badge", `badge-${tone}`, className)}>
    {dot && <span className="badge-dot" />}
    {Icon && <Icon size={12} strokeWidth={2.4} />}
    {children}
  </span>
);
const StatutBadge = ({ statut }) => {
  const s = STATUTS[statut] || STATUTS.en_attente;
  return <Badge tone={s.tone} dot>{s.label}</Badge>;
};
const PaiementBadge = ({ c }) => {
  const sp = c?.vente?.statutPaiement || "payee";
  if (c?.statut === "annulee") return <Badge tone="neutral" dot>{sp === "payee" ? "Remboursée" : "Non payée"}</Badge>;
  if (sp === "en_attente") return <Badge tone="warning" dot>Paiement en attente</Badge>;
  if (sp === "a_verifier") return <Badge tone="critical" dot>Paiement à vérifier</Badge>;
  if (sp === "en_cours") return <Badge tone="info" dot>Paiement en ligne en cours</Badge>;
  if (sp === "echoue") return <Badge tone="critical" dot>Paiement échoué</Badge>;
  return <Badge tone="neutral" dot>Payée</Badge>;
};
const CanalBadge = ({ c }) => (c?.canal === "en_ligne" ? <Badge tone="magic" icon={ShoppingBag}>En ligne</Badge> : null);
const StockBadge = ({ stock, seuil = STOCK_FAIBLE }) => (stock <= 0 ? <Badge tone="critical">Rupture</Badge> : stock <= seuil ? <Badge tone="warning">{stock} en stock</Badge> : <Badge tone="success">{stock} en stock</Badge>);

const Delta = ({ value }) => (value == null
  ? <span className="delta neutral">—</span>
  : <span className={cx("delta", value >= 0 ? "up" : "down")}>{value >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{Math.abs(value).toFixed(0)} %</span>);

function Card({ title, sub, actions, children, className, padded = true, style, onClick }) {
  return (
    <section className={cx("card", onClick && "interactive", className)} style={style} onClick={onClick}>
      {(title || actions) && (
        <header className="card-head">
          <div className="grow"><h2 className="card-title">{title}</h2>{sub && <p className="card-sub">{sub}</p>}</div>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {padded ? <div className="card-body">{children}</div> : children}
    </section>
  );
}

function Field({ label, help, error, children, optional, className }) {
  return (
    <div className={cx("field", error && "has-error", className)}>
      {label && <label className="label">{label}{optional && <span className="optional"> (facultatif)</span>}</label>}
      {children}
      {error ? <div className="field-error"><AlertCircle size={14} />{error}</div> : help ? <div className="help">{help}</div> : null}
    </div>
  );
}
function Input({ prefix, suffix, icon: Icon, className, size, ...rest }) {
  return (
    <div className={cx("input-wrap", size === "lg" && "input-lg", className)}>
      {Icon && <Icon size={16} className="input-icon" />}
      {prefix && <span className="input-affix">{prefix}</span>}
      <input className="input" {...rest} />
      {suffix && <span className="input-affix">{suffix}</span>}
    </div>
  );
}
const Select = ({ children, className, ...rest }) => (
  <div className={cx("select-wrap", className)}>
    <select className="select" {...rest}>{children}</select>
    <ChevronDown size={16} className="select-icon" />
  </div>
);
const SearchInput = ({ value, onChange, placeholder, autoFocus }) => (
  <div className="input-wrap search">
    <Search size={16} className="input-icon" />
    <input className="input" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus} />
    {value && <button className="input-clear" onClick={() => onChange("")} aria-label="Effacer"><X size={13} /></button>}
  </div>
);

const Checkbox = ({ checked, indeterminate, onChange, label }) => (
  <label className="checkbox" onClick={(e) => e.stopPropagation()}>
    <input type="checkbox" checked={!!checked} ref={(el) => el && (el.indeterminate = !!indeterminate)} onChange={(e) => onChange(e.target.checked)} />
    <span className="checkbox-box">{indeterminate ? <Minus size={12} strokeWidth={3} /> : <Check size={12} strokeWidth={3} />}</span>
    {label && <span>{label}</span>}
  </label>
);

const Switch = ({ on, onChange, label }) => (
  <button type="button" role="switch" aria-checked={on} aria-label={label} className={cx("switch", on && "on")} onClick={() => onChange(!on)} />
);

function Segmented({ options, value, onChange, full }) {
  const [ref, ind] = useIndicator(value);
  return (
    <div className={cx("segmented", full && "full")} ref={ref} role="tablist">
      <span className="seg-indicator" style={ind} />
      {options.map((o) => (
        <button key={String(o.value)} role="tab" data-active={o.value === value} aria-selected={o.value === value} onClick={() => onChange(o.value)}>
          {o.icon && <o.icon size={14} />}{o.label}
        </button>
      ))}
    </div>
  );
}

function Tabs({ tabs, value, onChange }) {
  const [ref, ind] = useIndicator(value);
  return (
    <div className="tabs" ref={ref} role="tablist">
      <span className="seg-indicator" style={ind} />
      {tabs.map((t) => (
        <button key={t.key} role="tab" data-active={t.key === value} aria-selected={t.key === value} onClick={() => onChange(t.key)}>
          {t.label}{t.count != null && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

const Avatar = ({ name, size = "md" }) => <span className={cx("avatar", size !== "md" && `avatar-${size}`, `tint-${toneOf(name)}`)}>{initials(name)}</span>;
/* Image téléversée (servie par l'API) ou vignette de secours */
const urlImage = (img) => (img && img.startsWith("/uploads/") ? API_BASE + img : img);
const Thumb = ({ pack, size = "md" }) => (pack?.image
  ? <span className={cx("thumb thumb-img", size !== "md" && `thumb-${size}`)}><img src={urlImage(pack.image)} alt="" loading="lazy" /></span>
  : <span className={cx("thumb", size !== "md" && `thumb-${size}`, `tint-${pack?.teinte ?? 6}`)}>{pack?.emoji || "📦"}</span>);

const EmptyState = ({ icon: Icon = Inbox, title, children, action }) => (
  <div className="empty">
    <div className="empty-icon"><Icon size={26} /></div>
    <h3>{title}</h3>
    {children && <p>{children}</p>}
    {action}
  </div>
);

const Pager = ({ pg }) => (pg.pages <= 1 ? null : (
  <div className="pager">
    <span>{pg.from}–{pg.to} sur {pg.total}</span>
    <div className="pager-btns">
      <Btn size="sm" icon={ChevronLeft} disabled={pg.page <= 1} onClick={() => pg.setPage(pg.page - 1)} aria-label="Page précédente" />
      <Btn size="sm" icon={ChevronRight} disabled={pg.page >= pg.pages} onClick={() => pg.setPage(pg.page + 1)} aria-label="Page suivante" />
    </div>
  </div>
));

function SortTh({ label, k, sort, onSort, className }) {
  const on = sort.sort.key === k;
  return (
    <th className={cx("sortable", on && "sorted", className)} onClick={() => onSort(k)}>
      {label}<ArrowUpDown size={12} className="sort-ic" />
    </th>
  );
}

function Stepper({ value, onChange, min = 1, max = 999 }) {
  return (
    <div className="stepper">
      <button type="button" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Diminuer"><Minus size={14} /></button>
      <input value={value} inputMode="numeric" aria-label="Quantité"
        onChange={(e) => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10); onChange(Math.min(max, Math.max(min, isNaN(n) ? min : n))); }} />
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Augmenter"><Plus size={14} /></button>
    </div>
  );
}

function PageHeader({ title, back, badges, meta, actions }) {
  return (
    <div className="page-head">
      {back && <button className="back-btn" onClick={back} aria-label="Retour"><ArrowLeft size={18} /></button>}
      <div className="page-head-main">
        <div className="page-title-row"><h1 className="page-title">{title}</h1>{badges}</div>
        {meta && <div className="page-meta">{meta}</div>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}

/* ---------- Modale ---------- */
function Modal({ open, onClose, title, children, footer, size = "md", className, hideHeader }) {
  const [mounted, closing] = usePresence(open, 200);
  const kept = useRef({});
  if (open) kept.current = { title, children, footer };
  useEscape(open, onClose);
  const ref = useRef(null);
  useEffect(() => {
    if (!open || !mounted) return;
    const t = setTimeout(() => {
      // Sur mobile, on évite d'ouvrir le clavier automatiquement (sauf champ marqué data-autofocus)
      const el = ref.current?.querySelector("[data-autofocus]")
        || (window.innerWidth > 768 ? ref.current?.querySelector("input:not([type=checkbox]):not([type=file]), textarea") : null);
      el?.focus({ preventScroll: true });
    }, 80);
    return () => clearTimeout(t);
  }, [open, mounted]);
  if (!mounted) return null;
  const k = kept.current;
  return createPortal(
    <div className={cx("overlay", closing && "closing")}>
      <div className="backdrop" onMouseDown={onClose} />
      <div ref={ref} className={cx("modal", `modal-${size}`, className)} role="dialog" aria-modal="true" aria-label={typeof k.title === "string" ? k.title : undefined}>
        {!hideHeader && (
          <div className="modal-head">
            <h2>{k.title}</h2>
            <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
          </div>
        )}
        {hideHeader ? k.children : <div className="modal-body">{k.children}</div>}
        {k.footer && <div className="modal-foot">{k.footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

function Drawer({ open, onClose, children }) {
  const [mounted, closing] = usePresence(open, 220);
  useEscape(open, onClose);
  if (!mounted) return null;
  return createPortal(
    <div className={cx("overlay drawer-overlay", closing && "closing")}>
      <div className="backdrop" onMouseDown={onClose} />
      <aside className="drawer">{children}</aside>
    </div>,
    document.body,
  );
}

function Popover({ open, onClose, trigger, children, align = "end", className }) {
  const ref = useRef(null);
  const [mounted, closing] = usePresence(open, 140);
  useEscape(open, onClose);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open, onClose]);
  return (
    <div className="pop-anchor" ref={ref}>
      {trigger}
      {mounted && <div className={cx("popover", `pop-${align}`, closing && "closing", className)}>{children}</div>}
    </div>
  );
}
const MenuItem = ({ icon: Icon, children, onClick, tone, hint }) => (
  <button className={cx("menu-item", tone && `tone-${tone}`)} onClick={onClick}>
    {Icon && <Icon size={16} />}<span className="grow">{children}</span>{hint && <kbd>{hint}</kbd>}
  </button>
);

function MoreMenu({ items }) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onClose={() => setOpen(false)}
      trigger={<Btn icon={MoreHorizontal} iconRight={ChevronDown} onClick={() => setOpen((o) => !o)}>Plus d'actions</Btn>}>
      {items.filter(Boolean).map((it, i) => it === "sep" ? <div key={i} className="pop-sep" /> : (
        <MenuItem key={i} icon={it.icon} tone={it.tone} onClick={() => { setOpen(false); it.onClick(); }}>{it.label}</MenuItem>
      ))}
    </Popover>
  );
}

/* ---------- Toasts ---------- */
function ToastItem({ t, onDismiss }) {
  const [leaving, setLeaving] = useState(false);
  const duration = t.duration || 4200;
  const close = useCallback(() => { setLeaving(true); setTimeout(() => onDismiss(t.id), 200); }, [t.id, onDismiss]);
  const timer = useRef(null);
  const startTimer = () => { clearTimeout(timer.current); timer.current = setTimeout(close, duration); };
  useEffect(() => { startTimer(); return () => clearTimeout(timer.current); }, []);
  const Icon = t.tone === "critical" ? AlertCircle : t.tone === "info" ? Info : CheckCircle2;
  return (
    <div className={cx("toast", t.tone && `toast-${t.tone}`, leaving && "leaving")} onMouseEnter={() => clearTimeout(timer.current)} onMouseLeave={startTimer}>
      <Icon size={18} className="toast-icon" />
      <div className="toast-text"><strong>{t.title}</strong>{t.desc && <span>{t.desc}</span>}</div>
      {t.action && <button className="toast-action" onClick={() => { t.action.onClick(); close(); }}>{t.action.label}</button>}
      <button className="toast-close" onClick={close} aria-label="Fermer"><X size={15} /></button>
      <span className="toast-bar" style={{ animationDuration: duration + "ms" }} />
    </div>
  );
}
const Toasts = ({ items, onDismiss }) => createPortal(
  <div className="toasts" role="status" aria-live="polite">
    {items.map((t) => <ToastItem key={t.id} t={t} onDismiss={onDismiss} />)}
  </div>,
  document.body,
);

function ConfirmDialog({ state, onDone }) {
  return (
    <Modal open={!!state} onClose={() => onDone(false)} title={state?.title} size="sm"
      footer={<>
        <Btn onClick={() => onDone(false)}>Annuler</Btn>
        <Btn variant={state?.tone === "critical" ? "critical" : "primary"} onClick={() => onDone(true)} data-autofocus>{state?.confirmLabel || "Confirmer"}</Btn>
      </>}>
      <p className="confirm-text">{state?.message}</p>
    </Modal>
  );
}

/* =====================================================================
   Graphiques (SVG natif, animés)
   ===================================================================== */
function niceMax(v) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * e;
}

function useWidth() {
  const ref = useRef(null);
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    setW(ref.current.clientWidth);
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function AreaChart({ points, height = 240, compare = true, color = "var(--c-blue)" }) {
  const [ref, w] = useWidth();
  const [hover, setHover] = useState(null);
  const gid = useMemo(() => nextId("grad"), []);
  const n = points.length;
  const P = { l: 44, r: 10, t: 12, b: 26 };
  const iw = Math.max(10, w - P.l - P.r), ih = height - P.t - P.b;
  const max = niceMax(Math.max(1, ...points.map((p) => Math.max(p.value, compare ? p.prev : 0))));
  const x = (i) => P.l + (n <= 1 ? iw / 2 : (i * iw) / (n - 1));
  const y = (v) => P.t + ih - (v / max) * ih;
  const path = (k) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p[k]).toFixed(1)}`).join(" ");
  const area = n ? `${path("value")} L${x(n - 1)},${y(0)} L${x(0)},${y(0)} Z` : "";
  const step = Math.max(1, Math.ceil(n / (w < 500 ? 4 : 7)));

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
    const i = Math.round(((px - P.l) / iw) * (n - 1));
    setHover(Math.max(0, Math.min(n - 1, i)));
  };
  const hp = hover != null ? points[hover] : null;
  const tipLeft = hover != null ? Math.min(Math.max(x(hover), 90), w - 90) : 0;

  return (
    <div className="chart" ref={ref} style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} onMouseMove={onMove} onTouchMove={onMove} onMouseLeave={() => setHover(null)}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.28 }} />
              <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
            </linearGradient>
          </defs>
          {[0, 0.25, 0.5, 0.75, 1].map((f) => (
            <g key={f}>
              <line className="grid-line" x1={P.l} x2={w - P.r} y1={y(max * f)} y2={y(max * f)} />
              <text className="axis-label" x={P.l - 8} y={y(max * f) + 4} textAnchor="end">{fmtShort(max * f)}</text>
            </g>
          ))}
          {points.map((p, i) => (i % step === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= step / 2) ? (
            <text key={p.date} className="axis-label" x={x(i)} y={height - 6} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"}>
              {parseDate(p.date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
            </text>
          ) : null)}
          {compare && <path d={path("prev")} fill="none" style={{ stroke: "var(--chart-prev)" }} strokeWidth="2" strokeDasharray="4 4" strokeLinejoin="round" />}
          <path className="area" d={area} style={{ fill: `url(#${gid})` }} />
          <path className="draw" pathLength="1" d={path("value")} fill="none" style={{ stroke: color }} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {hp && (
            <g>
              <line className="hover-line" x1={x(hover)} x2={x(hover)} y1={P.t} y2={P.t + ih} />
              {compare && <circle cx={x(hover)} cy={y(hp.prev)} r="4" style={{ fill: "var(--surface)", stroke: "var(--chart-prev)" }} strokeWidth="2" />}
              <circle cx={x(hover)} cy={y(hp.value)} r="5" style={{ fill: "var(--surface)", stroke: color }} strokeWidth="2.5" />
            </g>
          )}
        </svg>
      )}
      {hp && (
        <div className="chart-tip" style={{ left: tipLeft, transform: "translateX(-50%)" }}>
          <div className="tip-date">{parseDate(hp.date).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "long" })}</div>
          <div className="tip-row"><i style={{ background: color }} />Ventes<b>{fmt(hp.value)}</b></div>
          {compare && <div className="tip-row"><i style={{ background: "var(--chart-prev)" }} />Période préc.<b>{fmt(hp.prev)}</b></div>}
        </div>
      )}
    </div>
  );
}

function Sparkline({ values, color = "var(--c-blue)" }) {
  const gid = useMemo(() => nextId("sp"), []);
  const n = values.length;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / Math.max(1, n - 1)) * 100, 36 - (v / max) * 30 - 2]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(" ");
  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" style={{ stopColor: color, stopOpacity: 0.22 }} />
          <stop offset="100%" style={{ stopColor: color, stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <path d={`${line} L100,36 L0,36 Z`} style={{ fill: `url(#${gid})` }} />
      <path d={line} fill="none" style={{ stroke: color }} strokeWidth="1.8" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}

function Donut({ items, size = 168, thickness = 22, format = fmt, centerLabel = "Total" }) {
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(null);
  useEffect(() => { const r = requestAnimationFrame(() => setReady(true)); return () => cancelAnimationFrame(r); }, []);
  const total = items.reduce((s, i) => s + i.value, 0);
  const r = (size - thickness) / 2;
  const C = 2 * Math.PI * r;
  let acc = 0;
  const shown = active != null ? items[active] : null;
  return (
    <div className="donut-wrap">
      <div className="donut" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" style={{ stroke: "var(--surface-3)" }} strokeWidth={thickness} />
          {total > 0 && items.map((it, i) => {
            const len = (it.value / total) * C;
            const gap = items.filter((x) => x.value > 0).length > 1 ? 2 : 0;
            const seg = (
              <circle key={it.label} className="seg" cx={size / 2} cy={size / 2} r={r} fill="none"
                style={{ stroke: it.color, opacity: active != null && active !== i ? 0.35 : 1 }}
                strokeWidth={active === i ? thickness + 4 : thickness}
                strokeDasharray={ready ? `${Math.max(0, len - gap)} ${C}` : `0 ${C}`}
                strokeDashoffset={ready ? -acc : 0}
                onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} />
            );
            acc += len;
            return seg;
          })}
        </svg>
        <div className="donut-center">
          <div>
            <strong>{shown ? format(shown.value) : format(total)}</strong>
            <span>{shown ? `${shown.label} · ${total ? Math.round((shown.value / total) * 100) : 0} %` : centerLabel}</span>
          </div>
        </div>
      </div>
      <div className="donut-legend">
        {items.map((it, i) => (
          <div key={it.label} className={cx(active === i && "active")} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)}>
            <i style={{ background: it.color }} />{it.label}<b>{total ? Math.round((it.value / total) * 100) : 0} %</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function GroupedBars({ groups, series }) {
  const max = niceMax(Math.max(1, ...groups.flatMap((g) => g.values)));
  return (
    <div>
      <div className="bars">
        {groups.map((g, gi) => (
          <div className={cx("bar-group", gi === 0 && "first", gi === groups.length - 1 && "last")} key={g.label}>
            {g.values.map((v, si) => (
              <div key={si} className="bar" style={{ height: `${(v / max) * 100}%`, background: series[si].color, "--i": gi * 2 + si }} />
            ))}
            <div className="chart-tip">
              <div className="tip-date">{g.full || g.label}</div>
              {series.map((s, si) => <div className="tip-row" key={s.label}><i style={{ background: s.color }} />{s.label}<b>{fmt(g.values[si])}</b></div>)}
            </div>
          </div>
        ))}
      </div>
      <div className="bar-labels">{groups.map((g) => <span key={g.label}>{g.label}</span>)}</div>
    </div>
  );
}

/* =====================================================================
   Coque de l'application : barre du haut, navigation
   ===================================================================== */
const NAV = [
  { key: "accueil", label: "Accueil", icon: Home },
  { key: "commandes", label: "Commandes", icon: ShoppingCart, badge: (d) => d.commandes.filter((c) => c.statut === "en_attente").length },
  { key: "produits", label: "Produits", icon: Tag },
  { key: "stocks", label: "Stocks", icon: Boxes, admin: true, badge: (d) => d.packs.filter((p) => p.actif !== false && p.stock <= seuilDe(p)).length },
  { key: "clients", label: "Clients", icon: Users },
  { key: "ventes", label: "Ventes", icon: Receipt },
  { key: "marketing", label: "Marketing", icon: Megaphone, admin: true },
  { key: "finances", label: "Finances", icon: Landmark, admin: true },
];
/* Pages visibles selon le rôle (le vendeur n'a ni stocks, ni marketing, ni finances) */
const navPour = (estAdmin) => NAV.filter((n) => estAdmin || !n.admin);

function useNotifications(data) {
  return useMemo(() => {
    const t = computeTodo(data);
    const list = [];
    if (t.attente) list.push({ id: "att", icon: Clock, tone: "tint-1", title: `${t.attente} commande${t.attente > 1 ? "s" : ""} à confirmer`, sub: "En attente de traitement", go: ["commandes", null, { statut: "en_attente" }] });
    if (t.aVerifier.length) list.push({ id: "ver", icon: ShieldCheck, tone: "tint-3", title: `${t.aVerifier.length} paiement${t.aVerifier.length > 1 ? "s" : ""} Mobile Money à vérifier`, sub: "Transferts déclarés par des clients en ligne", go: ["commandes", t.aVerifier[0].id] });
    if (t.enLigne) list.push({ id: "web", icon: ShoppingBag, tone: "tint-0", title: `${t.enLigne} nouvelle${t.enLigne > 1 ? "s" : ""} commande${t.enLigne > 1 ? "s" : ""} en ligne`, sub: "Passées sur la boutique client", go: ["commandes", null, { statut: "en_attente" }] });
    if (t.aEncaisser.length) list.push({ id: "enc", icon: Banknote, tone: "tint-1", title: `${t.aEncaisser.length} paiement${t.aEncaisser.length > 1 ? "s" : ""} à encaisser`, sub: `${fmt(t.aEncaisser.reduce((x, v) => x + v.total, 0))} en attente (livraison)`, go: ["ventes", null, { paiement: "en_attente" }] });
    if (t.aExpedier) list.push({ id: "exp", icon: Truck, tone: "tint-2", title: `${t.aExpedier} commande${t.aExpedier > 1 ? "s" : ""} à expédier`, sub: "Confirmées, prêtes à partir", go: ["commandes", null, { statut: "confirmee" }] });
    t.rupture.forEach((p) => list.push({ id: "r" + p.id, icon: AlertTriangle, tone: "tint-3", title: `Rupture : ${p.nom}`, sub: "Réapprovisionnez ce produit", go: ["produits", p.id] }));
    t.faible.forEach((p) => list.push({ id: "f" + p.id, icon: Package, tone: "tint-7", title: `Stock faible : ${p.nom}`, sub: `Plus que ${p.stock} en stock`, go: ["produits", p.id] }));
    return list;
  }, [data]);
}

function Topbar({ onMenu }) {
  const { data, settings, openCmdk, go, logout, cycleTheme, effectiveTheme, auth, estAdmin } = useApp();
  const notifs = useNotifications(data);
  const [nOpen, setNOpen] = useState(false);
  const [uOpen, setUOpen] = useState(false);
  const closeN = useCallback(() => setNOpen(false), []);
  const closeU = useCallback(() => setUOpen(false), []);
  const ThemeIcon = settings.theme === "systeme" ? Monitor : effectiveTheme === "dark" ? Moon : Sun;
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
  return (
    <header className="topbar">
      <button className="topbar-icon only-mobile" onClick={onMenu} aria-label="Ouvrir le menu"><Menu size={20} /></button>
      <a className="brand" href="#/accueil"><span className="brand-mark"><ShoppingBag size={16} strokeWidth={2.4} /></span><span className="brand-name">MonCommerce</span></a>
      <button className="topbar-search" onClick={openCmdk}><Search size={16} /><span>Rechercher</span><kbd>{isMac ? "⌘ K" : "Ctrl K"}</kbd></button>
      <div className="topbar-right">
        <button className="topbar-icon only-mobile" onClick={openCmdk} aria-label="Rechercher"><Search size={19} /></button>
        <button className="topbar-icon hide-sm" onClick={cycleTheme} aria-label="Changer de thème" title="Changer de thème"><ThemeIcon size={18} /></button>
        <Popover open={nOpen} onClose={closeN}
          trigger={<button className="topbar-icon" onClick={() => setNOpen((o) => !o)} aria-label="Notifications"><Bell size={18} />{notifs.length > 0 && <span className="notif-dot">{notifs.length}</span>}</button>}>
          <div style={{ width: 320, maxWidth: "calc(100vw - 32px)" }}>
            <div className="pop-head">Notifications</div>
            {notifs.length === 0 && <div className="empty" style={{ padding: 24 }}><div className="empty-icon"><Bell size={22} /></div><p>Tout est à jour 🎉</p></div>}
            <div style={{ maxHeight: 360, overflowY: "auto" }}>
              {notifs.map((n) => (
                <button key={n.id} className="menu-item notif-item" onClick={() => { closeN(); go(...n.go); }}>
                  <span className={cx("todo-icon", n.tone)}><n.icon size={15} /></span>
                  <span className="grow">{n.title}<small>{n.sub}</small></span>
                </button>
              ))}
            </div>
          </div>
        </Popover>
        <Popover open={uOpen} onClose={closeU}
          trigger={<button className="user-btn" onClick={() => setUOpen((o) => !o)}><span className={cx("avatar avatar-sm", `tint-${toneOf((data.boutique?.nom || "Ma Boutique"))}`)}>{initials((data.boutique?.nom || "Ma Boutique"))}</span><span className="hide-sm">{(data.boutique?.nom || "Ma Boutique")}</span></button>}>
          <div style={{ padding: "8px 10px 10px" }}>
            <div className="strong">{(data.boutique?.nom || "Ma Boutique")}</div>
            <div className="subtle">{auth?.utilisateur?.nom ? `${auth.utilisateur.nom} · ` : ""}{estAdmin ? "Administrateur" : "Vendeur"}</div>
          </div>
          <div className="pop-sep" />
          <MenuItem icon={Settings} onClick={() => { closeU(); go("parametres"); }}>Paramètres</MenuItem>
          <MenuItem icon={ThemeIcon} onClick={cycleTheme}>Thème : {settings.theme === "systeme" ? "système" : settings.theme}</MenuItem>
          <MenuItem icon={Search} hint={isMac ? "⌘K" : "Ctrl K"} onClick={() => { closeU(); openCmdk(); }}>Recherche rapide</MenuItem>
          <div className="pop-sep" />
          <MenuItem icon={LogOut} tone="critical" onClick={() => { closeU(); logout(); }}>Se déconnecter</MenuItem>
        </Popover>
      </div>
    </header>
  );
}

function SidebarNav({ onNavigate }) {
  const { route, data, openSale, estAdmin } = useApp();
  return (
    <nav className="nav">
      <div className="nav-store">
        <span className={cx("avatar avatar-sm", `tint-${toneOf((data.boutique?.nom || "Ma Boutique"))}`)}>{initials((data.boutique?.nom || "Ma Boutique"))}</span>
        <div className="grow"><strong className="truncate">{(data.boutique?.nom || "Ma Boutique")}</strong><span>{estAdmin ? "Administrateur" : "Espace vendeur"} · FCFA</span></div>
      </div>
      <Btn variant="primary" full icon={Plus} className="nav-cta" onClick={() => { onNavigate?.(); openSale(); }}>Nouvelle vente</Btn>
      {navPour(estAdmin).map((n) => {
        const badge = n.badge?.(data);
        return (
          <a key={n.key} href={"#/" + n.key} className={cx("nav-item", route.page === n.key && "active")} onClick={onNavigate}>
            <n.icon size={18} /><span>{n.label}</span>{badge > 0 && <span className="nav-badge">{badge}</span>}
          </a>
        );
      })}
      <div className="nav-spacer" />
      <a href="#/parametres" className={cx("nav-item", route.page === "parametres" && "active")} onClick={onNavigate}><Settings size={18} /><span>Paramètres</span></a>
      <div className="nav-foot">MonCommerce · v5.0</div>
    </nav>
  );
}

function BottomNav({ onMenu }) {
  const { route, data, openSale } = useApp();
  const badge = data.commandes.filter((c) => c.statut === "en_attente").length;
  const item = (key, label, Icon, b) => (
    <a href={"#/" + key} className={cx("bn-item", route.page === key && "active")}>
      <Icon size={21} />{label}{b > 0 && <span className="nav-badge">{b}</span>}
    </a>
  );
  return (
    <nav className="bottom-nav">
      {item("accueil", "Accueil", Home)}
      {item("commandes", "Commandes", ShoppingCart, badge)}
      <div className="bn-fab-wrap"><button className="bn-fab" onClick={() => openSale()} aria-label="Nouvelle vente"><Plus size={24} strokeWidth={2.5} /></button></div>
      {item("clients", "Clients", Users)}
      <button className="bn-item" onClick={onMenu}><Menu size={21} />Menu</button>
    </nav>
  );
}

/* ---------- Palette de commandes (Ctrl/⌘ + K) ---------- */
function CommandPalette({ open, onClose }) {
  const { data, go, openSale, cycleTheme, estAdmin } = useApp();
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const listRef = useRef(null);
  useEffect(() => { if (open) { setQ(""); setIdx(0); } }, [open]);

  const groups = useMemo(() => {
    const n = norm(q.trim());
    const match = (s) => !n || norm(s).includes(n);
    const actions = [
      { id: "a-sale", label: "Nouvelle vente", icon: Plus, run: () => openSale() },
      estAdmin && { id: "a-prod", label: "Ajouter un produit", icon: Tag, run: () => go("produits", "nouveau") },
      estAdmin && { id: "a-rec", label: "Réceptionner du stock", icon: PackagePlus, run: () => go("stocks", "reception") },
      estAdmin && { id: "a-promo", label: "Lancer une promotion", icon: Percent, run: () => go("marketing", "promotion") },
      { id: "a-cli", label: "Ajouter un client", icon: UserPlus, run: () => go("clients", "nouveau") },
      estAdmin && { id: "a-inv", label: "Enregistrer une dépense", icon: Wallet, run: () => go("finances", "nouveau") },
      { id: "a-theme", label: "Changer de thème", icon: Moon, run: () => cycleTheme() },
    ].filter((a) => a && match(a.label));
    const pages = [...navPour(estAdmin), { key: "parametres", label: "Paramètres", icon: Settings }]
      .filter((p) => match(p.label)).map((p) => ({ id: "p-" + p.key, label: p.label, icon: p.icon, hint: "Aller à", run: () => go(p.key) }));
    const g = [];
    if (n) {
      const cmds = enrichCommandes(data).filter((c) => match(c.numero + " " + (c.client?.nom || ""))).sort((a, b) => b.stamp.localeCompare(a.stamp)).slice(0, 5)
        .map((c) => ({ id: "c-" + c.id, label: `Commande ${c.numero}`, sub: `${c.client?.nom || "—"} · ${fmt(c.total)}`, icon: ShoppingCart, run: () => go("commandes", c.id) }));
      const cls = data.clients.filter((c) => match(c.nom + " " + c.tel + " " + c.ville)).slice(0, 5)
        .map((c) => ({ id: "cl-" + c.id, label: c.nom, sub: c.tel + (c.ville ? " · " + c.ville : ""), icon: User, run: () => go("clients", c.id) }));
      const pks = data.packs.filter((p) => match(p.nom + " " + (p.sku || ""))).slice(0, 5)
        .map((p) => ({ id: "pk-" + p.id, label: p.nom, sub: `${fmt(p.prix)} · ${p.stock} en stock`, emoji: p.emoji, run: () => go("produits", p.id) }));
      if (cls.length) g.push({ title: "Clients", items: cls });
      if (cmds.length) g.push({ title: "Commandes", items: cmds });
      if (pks.length) g.push({ title: "Produits", items: pks });
    }
    if (actions.length) g.push({ title: "Actions", items: actions });
    if (pages.length) g.push({ title: "Pages", items: pages });
    return g;
  }, [q, data]);

  const flat = groups.flatMap((g) => g.items);
  useEffect(() => setIdx(0), [q]);
  useEffect(() => { listRef.current?.querySelector(".cmdk-item.active")?.scrollIntoView({ block: "nearest" }); }, [idx]);
  const run = (it) => { onClose(); setTimeout(() => it.run(), 10); };
  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => (i + 1) % Math.max(1, flat.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => (i - 1 + flat.length) % Math.max(1, flat.length)); }
    else if (e.key === "Enter" && flat[idx]) { e.preventDefault(); run(flat[idx]); }
  };

  let k = -1;
  return (
    <Modal open={open} onClose={onClose} hideHeader size="md" className="cmdk" title="Recherche">
      <div className="cmdk-input">
        <Search size={18} className="muted" />
        <input data-autofocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onKey} placeholder="Rechercher une commande, un client, un produit…" />
        <kbd>Échap</kbd>
      </div>
      <div className="cmdk-list" ref={listRef}>
        {flat.length === 0 && <EmptyState icon={Search} title="Aucun résultat">Essayez un nom de client, un numéro de commande ou un produit.</EmptyState>}
        {groups.map((g) => (
          <div key={g.title}>
            <div className="cmdk-group">{g.title}</div>
            {g.items.map((it) => {
              k += 1;
              const i = k;
              return (
                <button key={it.id} className={cx("cmdk-item", i === idx && "active")} onMouseMove={() => setIdx(i)} onClick={() => run(it)}>
                  <span className="cmdk-ic">{it.emoji ? <span style={{ fontSize: 15 }}>{it.emoji}</span> : <it.icon size={15} />}</span>
                  <span className="grow truncate">{it.label}{it.sub && <><br /><small>{it.sub}</small></>}</span>
                  {it.hint && <span className="cmdk-hint">{it.hint}</span>}
                  {i === idx && <ChevronRight size={15} className="muted" />}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="cmdk-foot hide-sm"><span><kbd>↑</kbd> <kbd>↓</kbd> naviguer</span><span><kbd>Entrée</kbd> ouvrir</span><span><kbd>Échap</kbd> fermer</span></div>
    </Modal>
  );
}

/* =====================================================================
   Modales métier
   ===================================================================== */
function SuccessCheck() {
  return (
    <svg className="check-anim" viewBox="0 0 84 84" aria-hidden="true">
      <circle cx="42" cy="42" r="38" />
      <path d="M26 43 l11 11 l21 -23" />
    </svg>
  );
}
function Confetti() {
  const pieces = useMemo(() => [...Array(28)].map((_, i) => ({
    left: Math.random() * 100, delay: Math.random() * 0.4, dur: 1.2 + Math.random() * 0.8,
    color: ["#36d399", "#e0a12c", "#2c6ecb", "#8b5cf6", "#e8664f"][i % 5], rot: Math.random() * 360,
  })), []);
  if (prefersReducedMotion()) return null;
  return <div className="confetti">{pieces.map((p, i) => <i key={i} style={{ left: p.left + "%", background: p.color, animationDelay: p.delay + "s", animationDuration: p.dur + "s", transform: `rotate(${p.rot}deg)` }} />)}</div>;
}

/* ---------- Paiement : saisie selon le moyen utilisé ---------- */
const paiementVide = (mode = "Espèces") => ({ mode, recu: "", tel: "", ref: "" });

/* Montants « ronds » proposés pour un paiement en espèces */
function billetsProposes(total) {
  const set = new Set([total]);
  for (const pas of [500, 1000, 2000, 5000, 10000]) set.add(Math.ceil(total / pas) * pas);
  return [...set].filter((x) => x >= total).sort((a, b) => a - b).slice(0, 4);
}

function validerPaiementLocal(v, total) {
  const p = infoPaiement(v.mode);
  if (p.type === "especes" && v.recu !== "" && Number(v.recu) < total) return `Montant insuffisant : ${fmt(total)} sont dus.`;
  if (p.type === "mobile" && v.tel.replace(/\D/g, "").length < 8) return `Indiquez le numéro ${p.key} du payeur.`;
  return null;
}
/* Champs de la vente côté interface / côté API */
function paiementLocal(v, total) {
  const p = infoPaiement(v.mode);
  return {
    paiement: v.mode,
    statutPaiement: p.type === "livraison" ? "en_attente" : "payee",
    montantRecu: p.type === "especes" ? (v.recu === "" ? total : Number(v.recu)) : null,
    telPaiement: p.type === "mobile" ? v.tel.trim() : "",
    reference: p.type === "mobile" || p.type === "carte" ? v.ref.trim() : "",
  };
}
function paiementVersServeur(v, total) {
  const l = paiementLocal(v, total);
  return { mode_paiement: l.paiement, montant_recu: l.montantRecu, telephone_paiement: l.telPaiement || null, reference_paiement: l.reference || null };
}

function PaiementForm({ total, value, onChange, telClient, erreur, sansLivraison }) {
  const p = infoPaiement(value.mode);
  const modes = PAIEMENTS.filter((m) => m.type !== "en_ligne" && !(sansLivraison && m.type === "livraison"));
  const recu = value.recu === "" ? null : Number(value.recu);
  const set = (k, v) => onChange({ ...value, [k]: v });
  return (
    <div className="stack-sm">
      <div className="pay-grid">
        {modes.map((m) => (
          <button key={m.key} type="button" className={cx("pay-opt", value.mode === m.key && "selected")}
            onClick={() => onChange({ ...value, mode: m.key, tel: m.type === "mobile" ? value.tel || telClient || "" : value.tel })}>
            <ModePaiement mode={m.key} taille={24} /><span>{m.court}</span>
          </button>
        ))}
      </div>
      <div className="pay-detail" key={p.type}>
        {p.type === "especes" && (
          <>
            <Field label="Montant reçu du client" error={erreur}>
              <Input value={value.recu} onChange={(e) => set("recu", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" placeholder={fmtNum(total)} />
            </Field>
            {total > 0 && <div className="chips">{billetsProposes(total).map((b) => <button key={b} type="button" className={cx("chip", recu === b && "on")} onClick={() => set("recu", String(b))}>{b === total ? "Montant exact" : fmtNum(b)}</button>)}</div>}
            <div className="monnaie"><span>Monnaie à rendre</span><strong className="num">{recu != null && recu >= total ? fmt(recu - total) : "—"}</strong></div>
          </>
        )}
        {p.type === "mobile" && (
          <>
            <Field label={`Numéro ${p.key} du payeur`} error={erreur}><Input icon={Phone} value={value.tel} onChange={(e) => set("tel", e.target.value)} placeholder="07 00 00 00 00" inputMode="tel" /></Field>
            <Field label="ID de transaction" optional help="Référence indiquée dans le SMS de confirmation de l'opérateur."><Input value={value.ref} onChange={(e) => set("ref", e.target.value)} placeholder="Ex : MP240929.1234.A5678" /></Field>
          </>
        )}
        {p.type === "carte" && (
          <Field label="N° d'autorisation" optional help="Imprimé sur le reçu du terminal de paiement (TPE)."><Input value={value.ref} onChange={(e) => set("ref", e.target.value)} placeholder="Ex : 004512" /></Field>
        )}
        {p.type === "livraison" && (
          <div className="banner banner-warning"><Truck size={16} /><div>La commande restera « paiement en attente ». Encaissez-la depuis la fiche commande à la livraison.</div></div>
        )}
      </div>
    </div>
  );
}

/* ---------- Ticket de caisse ---------- */
const nomCourt = (nom) => { const p = String(nom || "").trim().split(/\s+/); return p.length > 1 ? `${p[0]} ${p[p.length - 1][0]}.` : p[0] || null; };

/* Ticket au format commun (même forme que GET /api/recus/:jeton) */
function construireTicket(data, c, mode) {
  const v = c.vente || {};
  const total = c.total;
  return {
    boutique: data.boutique || boutiqueParDefaut(),
    numero: c.numero,
    date: localIso(v.date, v.heure),
    statut: c.statut,
    vendeur: v.vendeur ? nomCourt(v.vendeur) : null,
    client: c.client ? nomCourt(c.client.nom) : null,
    canal: c.canal,
    lignes: (c.lignes || []).map((l) => ({ nom: l.pack?.nom || "Article", quantite: l.qte, prix_unitaire: l.prixUnitaire, total: l.total })),
    sous_total: c.sousTotal ?? total,
    frais_livraison: c.frais || 0,
    total,
    paiement: {
      mode: v.paiement, statut: v.statutPaiement || "payee", montant_recu: v.montantRecu ?? null,
      monnaie: v.montantRecu != null ? Math.max(0, v.montantRecu - total) : null, reference: v.reference || null,
    },
    lien: mode === "api" ? lienTicket(c.jetonRecu) : null,
  };
}

function useQr(texte) {
  const [qr, setQr] = useState(null);
  useEffect(() => {
    if (!texte) { setQr(null); return; }
    let actif = true;
    genererQr(texte).then((q) => actif && setQr(q)).catch(() => actif && setQr(null));
    return () => { actif = false; };
  }, [texte]);
  return qr;
}

function QrCode({ texte, taille = 120 }) {
  const qr = useQr(texte);
  if (!qr) return <div className="qr-attente" style={{ width: taille, height: taille }}><span className="spinner" /></div>;
  const n = qr.getModuleCount();
  return <svg className="qr" width={taille} height={taille} viewBox={`-2 -2 ${n + 4} ${n + 4}`} shapeRendering="crispEdges" role="img" aria-label="QR code du ticket"><rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" /><path d={cheminQr(qr)} fill="#000" /></svg>;
}

function TicketCaisse({ t }) {
  return (
    <div className="receipt-wrap">
      <div className="receipt">
        {lignesTicket(t).map((l, i) => {
          if (l.k === "titre") return <h3 key={i}>{l.txt}</h3>;
          if (l.k === "centre") return <div key={i} className="r-center" style={l.gras ? { fontWeight: 700, color: "#1f2124", marginTop: 2 } : null}>{l.txt}</div>;
          if (l.k === "sep") return <div key={i} className="r-sep" />;
          if (l.k === "texte") return <div key={i} className="r-row"><span style={{ fontWeight: 600 }}>{l.txt}</span></div>;
          if (l.k === "badge") return <div key={i} className="r-badge">{l.txt}</div>;
          return <div key={i} className={cx("r-row", l.grand && "r-total")}><span>{l.g}</span><span>{l.d}</span></div>;
        })}
        {t.lien && (
          <div className="r-qr">
            <QrCode texte={t.lien} taille={112} />
            <div>Scannez pour télécharger<br />votre ticket</div>
          </div>
        )}
        <div className="r-center" style={{ marginTop: 8 }}>{t.boutique?.message || "Merci pour votre achat !"}</div>
      </div>
    </div>
  );
}

/* Ticket validé affiché directement en PDF (si le navigateur sait l'afficher), sinon en HTML */
function TicketPdfApercu({ t }) {
  const integrable = pdfIntegrable();
  const [url, setUrl] = useState(null);
  const [echec, setEchec] = useState(false);
  const cle = JSON.stringify(t);
  useEffect(() => {
    if (!integrable) return;
    let actif = true, u = null;
    setUrl(null);
    urlTicketPdf(t).then((x) => { u = x; if (actif) setUrl(x); else URL.revokeObjectURL(x); }).catch(() => actif && setEchec(true));
    return () => { actif = false; if (u) URL.revokeObjectURL(u); };
  }, [cle]);
  if (!integrable || echec) return <TicketCaisse t={t} />;
  if (!url) return <div className="pdf-attente"><span className="spinner" />Génération du ticket PDF…</div>;
  return <iframe className="ticket-pdf" src={url + "#toolbar=1&view=FitH"} title={`Ticket ${t.numero || ""} (PDF)`} />;
}

/* Envoi du ticket par e-mail au client */
function EmailTicketModal({ open, onClose, t, cmd }) {
  const { mode, sync, toast } = useApp();
  const [email, setEmail] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setEmail(cmd?.contactEmail || cmd?.client?.email || ""); setErr(""); setBusy(false); } }, [open]);
  const envoyer = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) { setErr("Adresse e-mail invalide."); return; }
    if (mode !== "api") {
      // Démo locale : le logiciel de messagerie de l'appareil prend le relais
      const corps = lignesTicket(t).map((l) => l.k === "ligne" ? `${l.g} : ${l.d}` : l.k === "sep" ? "----------------" : l.txt || "").join("\n");
      window.location.href = `mailto:${e}?subject=${encodeURIComponent(`Votre ticket ${t.numero} — ${t.boutique?.nom}`)}&body=${encodeURIComponent(corps)}`;
      onClose();
      return;
    }
    setBusy(true);
    const r = await sync(["POST", `/api/commandes/${cmd.id}/envoyer-email`, { email: e }]);
    setBusy(false);
    if (!r) return;
    toast({ title: r[0]?.simule ? "E-mail simulé" : "Ticket envoyé par e-mail", desc: r[0]?.simule ? "Aucun serveur e-mail (SMTP) configuré sur l'hébergement." : `À ${e}` });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Envoyer le ticket par e-mail" size="sm"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" icon={Send} loading={busy} onClick={envoyer}>Envoyer</Btn></>}>
      <div className="stack-sm">
        <p className="subtle">Le client reçoit son ticket {t.numero} ({fmt(t.total)}) avec le lien de téléchargement du PDF.</p>
        <Field label="Adresse e-mail du client" error={err} help={cmd?.client && !cmd.client.email ? "Elle sera aussi enregistrée sur la fiche du client." : null}>
          <Input icon={Mail} type="email" value={email} onChange={(ev) => { setEmail(ev.target.value); setErr(""); }} placeholder="client@exemple.ci" data-autofocus onKeyDown={(ev) => ev.key === "Enter" && envoyer()} />
        </Field>
      </div>
    </Modal>
  );
}

function ActionsTicket({ t, cmd, compact }) {
  const { toast, mode, sync } = useApp();
  const [pdf, setPdf] = useState(false);
  const [sms, setSms] = useState(false);
  const [mail, setMail] = useState(false);
  const telephoner = cmd?.client?.tel;
  const texte = `${t.boutique?.nom} : merci pour votre achat (${t.numero}, ${fmt(t.total)}).${t.lien ? " Votre ticket de caisse : " + t.lien : ""}`;
  const telecharger = async () => {
    setPdf(true);
    try { await telechargerTicketPdf(t); toast({ title: "Ticket téléchargé (PDF)" }); }
    catch (e) { toast({ title: "Téléchargement impossible", desc: e.message, tone: "critical" }); }
    finally { setPdf(false); }
  };
  const envoyerSms = async () => {
    setSms(true);
    const r = await sync(["POST", `/api/commandes/${cmd.id}/envoyer-recu`, {}]);
    setSms(false);
    if (r) toast({ title: r[0]?.simule ? "SMS simulé" : "Ticket envoyé par SMS", desc: r[0]?.simule ? "Aucun fournisseur SMS configuré sur le serveur." : `Au ${telephoner}` });
  };
  return (
    <div className={cx("ticket-actions", compact && "compact")}>
      {/* Copie du ticket réservée à l'impression (format 80 mm) */}
      {createPortal(<div className="print-zone"><TicketCaisse t={t} /></div>, document.body)}
      <Btn icon={Printer} onClick={() => window.print()}>Imprimer</Btn>
      <Btn icon={Download} loading={pdf} onClick={telecharger}>PDF</Btn>
      {telephoner && <Btn icon={MessageSquare} onClick={() => window.open(`https://wa.me/${telInternational(telephoner)}?text=${encodeURIComponent(texte)}`, "_blank", "noopener")}>WhatsApp</Btn>}
      {cmd && <Btn icon={Mail} onClick={() => setMail(true)}>E-mail</Btn>}
      {mode === "api" && telephoner && <Btn icon={Smartphone} loading={sms} onClick={envoyerSms}>SMS</Btn>}
      {t.lien && <Btn icon={Copy} onClick={() => navigator.clipboard?.writeText(t.lien).then(() => toast({ title: "Lien du ticket copié" }), () => toast({ title: "Copie impossible", tone: "critical" }))}>Lien</Btn>}
      {cmd && <EmailTicketModal open={mail} onClose={() => setMail(false)} t={t} cmd={cmd} />}
    </div>
  );
}

/* ---------- Nouvelle vente (point de vente) ---------- */
function SaleModal({ open, preset, onClose }) {
  const { data, update, sync, toast, go, auth, mode } = useApp();
  const [packId, setPackId] = useState("");
  const [clientId, setClientId] = useState("");
  const [qte, setQte] = useState(1);
  const [pay, setPay] = useState(paiementVide());
  const [qp, setQp] = useState("");
  const [qc, setQc] = useState("");
  const [nouveau, setNouveau] = useState(null);
  const [err, setErr] = useState({});
  const [done, setDone] = useState(null);
  const [saving, setSaving] = useState(false);
  const [apercu, setApercu] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPackId(preset?.packId || ""); setClientId(preset?.clientId || ""); setQte(1); setPay(paiementVide());
    setQp(""); setQc(""); setNouveau(null); setErr({}); setDone(null); setSaving(false); setApercu(false);
  }, [open]);

  const pack = data.packs.find((p) => p.id === packId);
  const client = data.clients.find((c) => c.id === clientId);
  const prixU = prixEffectif(pack);
  const total = pack ? prixU * qte : 0;
  const packs = data.packs.filter((p) => p.actif !== false && norm(p.nom + " " + p.sku).includes(norm(qp)));
  const clients = data.clients.filter((c) => norm(c.nom + " " + c.tel + " " + c.ville).includes(norm(qc)));
  const clientOk = !!client || (nouveau && nouveau.nom.trim() && nouveau.tel.trim());

  useEffect(() => { if (pack && qte > pack.stock) setQte(Math.max(1, pack.stock)); }, [packId]);

  /* Étape 1 : vérification, puis récapitulatif sous forme de ticket provisoire */
  const verifier = () => {
    const e = {};
    if (!pack) e.pack = "Choisissez un produit.";
    if (!clientOk) e.client = nouveau ? "Nom et téléphone requis." : "Choisissez un client.";
    if (nouveau?.email?.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nouveau.email.trim())) e.client = "Adresse e-mail invalide.";
    if (pack && qte > pack.stock) e.pack = `Stock insuffisant (${pack.stock} disponible${pack.stock > 1 ? "s" : ""}).`;
    const ep = validerPaiementLocal(pay, total);
    if (ep) e.pay = ep;
    setErr(e);
    if (Object.keys(e).length) return;
    setApercu(true);
  };

  const ticketProvisoire = () => {
    const l = paiementLocal(pay, total);
    return {
      provisoire: true, boutique: data.boutique || boutiqueParDefaut(), numero: null, date: new Date().toISOString(), statut: "en_attente",
      vendeur: auth?.utilisateur?.nom ? nomCourt(auth.utilisateur.nom) : null, client: nomCourt(client?.nom || nouveau?.nom), canal: "boutique",
      lignes: [{ nom: pack.nom, quantite: qte, prix_unitaire: prixU, total }], sous_total: total, frais_livraison: 0, total,
      paiement: { mode: l.paiement, statut: l.statutPaiement, montant_recu: l.montantRecu, monnaie: l.montantRecu != null ? Math.max(0, l.montantRecu - total) : null, reference: l.reference || null },
      lien: null,
    };
  };

  /* Étape 2 : validation définitive (stock, numéro, ticket) */
  const submit = () => {
    setSaving(true);
    setTimeout(async () => {
      const now = new Date();
      const venteId = uid(), cmdId = uid();
      let numero = nextNumero(data);
      const newClient = !client ? { id: uid(), nom: nouveau.nom.trim(), tel: nouveau.tel.trim(), email: nouveau.email?.trim().toLowerCase() || "", ville: nouveau.ville?.trim() || "", statut: "Standard", notes: "", dateAjout: isoDate(now), consentement: !!nouveau.consentement } : null;
      const cl = client || newClient;
      update((d) => ({
        ...d,
        clients: newClient ? [...d.clients, newClient] : d.clients,
        ventes: [...d.ventes, { id: venteId, commandeId: cmdId, clientId: cl.id, packId: pack.id, qte, prixUnitaire: prixU, date: isoDate(now), heure: hhmm(now), vendeur: auth?.utilisateur?.nom || "", ...paiementLocal(pay, total) }],
        packs: d.packs.map((p) => (p.id === pack.id ? { ...p, stock: Math.max(0, p.stock - qte) } : p)),
        commandes: [...d.commandes, { id: cmdId, venteId, numero, statut: "en_attente", adresseLivraison: cl.ville || "", note: "", canal: "boutique", fraisLivraison: 0, historique: [{ statut: "en_attente", date: now.toISOString() }] }],
      }));
      // Connecté au serveur : on attend sa confirmation (stock vérifié côté serveur)
      const res = await sync(
        ...(newClient ? [["POST", "/api/clients", { id: newClient.id, ...clientVersServeur(newClient) }]] : []),
        ["POST", "/api/ventes", { id: venteId, commande_id: cmdId, client_id: cl.id, pack_id: pack.id, quantite: qte, adresse_livraison: cl.ville || "", ...paiementVersServeur(pay, total) }],
      );
      setSaving(false);
      if (!res) { setApercu(false); return; } // erreur déjà signalée, données rechargées depuis le serveur
      setApercu(false);
      numero = res[res.length - 1]?.commande?.numero || numero;
      setDone({ cmdId, numero, total, client: cl.nom });
      toast({ title: "Vente enregistrée", desc: `${numero} · ${fmt(total)}`, action: { label: "Voir", onClick: () => go("commandes", cmdId) } });
    }, 300);
  };

  if (done) {
    const cmdFinale = enrichCommandes(data).find((c) => c.id === done.cmdId);
    const ticket = cmdFinale && construireTicket(data, cmdFinale, mode);
    const monnaie = cmdFinale?.vente?.montantRecu != null ? cmdFinale.vente.montantRecu - cmdFinale.total : 0;
    return (
      <Modal open={open} onClose={onClose} title="Vente enregistrée" size="md" hideHeader>
        <div className="success" style={{ position: "relative" }}>
          <Confetti />
          <SuccessCheck />
          <h3>Vente enregistrée !</h3>
          <p>Commande <b>{cmdFinale?.numero || done.numero}</b> pour {done.client}<br /><span className="num strong" style={{ color: "var(--text)" }}>{fmt(done.total)}</span></p>
          {monnaie > 0 && <div className="banner banner-success" style={{ animation: "fadeUp .4s .5s var(--ease-out) both" }}><Banknote size={16} /><div>Monnaie à rendre : <b className="num">{fmt(monnaie)}</b></div></div>}
          {ticket && (
            <div className="success-ticket">
              <div className="label" style={{ marginBottom: 8 }}>Ticket de caisse validé (PDF)</div>
              <TicketPdfApercu t={ticket} />
              <ActionsTicket t={ticket} cmd={cmdFinale} />
            </div>
          )}
          <div className="row">
            <Btn onClick={onClose}>Fermer</Btn>
            <Btn onClick={() => { setDone(null); setApercu(false); setPackId(""); setClientId(""); setQte(1); setNouveau(null); setPay(paiementVide()); }} icon={Plus}>Autre vente</Btn>
            <Btn variant="primary" onClick={() => { onClose(); go("commandes", done.cmdId); }}>Voir la commande</Btn>
          </div>
        </div>
      </Modal>
    );
  }

  if (apercu && pack) {
    const livraison = infoPaiement(pay.mode).type === "livraison";
    return (
      <Modal open={open} onClose={onClose} title="Récapitulatif de la vente" size="md" hideHeader>
        <div className="modal-head">
          <h2>Récapitulatif avant validation</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
        </div>
        <div className="modal-body stack">
          <div className="banner banner-info"><FileText size={16} /><div>Vérifiez le ticket avec le client. Rien n'est encore enregistré : le stock et le numéro de ticket seront attribués à la validation.</div></div>
          <TicketCaisse t={ticketProvisoire()} />
        </div>
        <div className="modal-foot">
          <Btn icon={ArrowLeft} onClick={() => setApercu(false)} disabled={saving}>Modifier</Btn>
          <Btn variant="brand" icon={CheckCircle2} loading={saving} onClick={submit}>{livraison ? "Valider la commande" : `Valider et encaisser ${fmt(total)}`}</Btn>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="Nouvelle vente" size="xl" hideHeader>
      <div className="modal-head">
        <h2>Nouvelle vente</h2>
        <button className="icon-btn" onClick={onClose} aria-label="Fermer"><X size={18} /></button>
      </div>
      <div className="sale-grid" style={{ overflow: "auto" }}>
        <div className="sale-pick">
          <section>
            <div className="sale-step-title"><span className={cx("n", pack && "ok")}>{pack ? <Check size={13} strokeWidth={3} /> : 1}</span>Produit</div>
            <SearchInput value={qp} onChange={setQp} placeholder="Rechercher un produit…" />
            {err.pack && <div className="field-error" style={{ marginTop: 8 }}><AlertCircle size={14} />{err.pack}</div>}
            <div className="pick-grid">
              {packs.map((p) => (
                <button key={p.id} className={cx("pick-tile", packId === p.id && "selected")} disabled={p.stock <= 0} onClick={() => { setPackId(p.id); setErr((e) => ({ ...e, pack: null })); }}>
                  {packId === p.id && <span className="pick-check"><Check size={12} strokeWidth={3} /></span>}
                  <Thumb pack={p} />
                  <span className="pt-name">{p.nom}</span>
                  <span className="row" style={{ justifyContent: "space-between", width: "100%", flexWrap: "wrap", gap: 4 }}>
                    <span className="pt-price">{fmt(prixEffectif(p))}</span>
                    {promoActive(p) && <span className="prix-barre">{fmt(p.prix)}</span>}
                  </span>
                  <span className="subtle">{p.stock <= 0 ? "Rupture de stock" : `${p.stock} en stock`}</span>
                </button>
              ))}
              {packs.length === 0 && <div className="subtle">Aucun produit trouvé.</div>}
            </div>
          </section>

          <section>
            <div className="sale-step-title"><span className={cx("n", clientOk && "ok")}>{clientOk ? <Check size={13} strokeWidth={3} /> : 2}</span>Client</div>
            {!nouveau ? (
              <>
                <div className="row">
                  <div className="grow"><SearchInput value={qc} onChange={setQc} placeholder="Rechercher par nom, téléphone, ville…" /></div>
                  <Btn icon={UserPlus} onClick={() => { setNouveau({ nom: qc, tel: "", ville: "" }); setClientId(""); }}>Nouveau</Btn>
                </div>
                {err.client && <div className="field-error" style={{ marginTop: 8 }}><AlertCircle size={14} />{err.client}</div>}
                <div className="client-list">
                  {clients.map((c) => (
                    <button key={c.id} className={cx("client-opt", clientId === c.id && "selected")} onClick={() => { setClientId(c.id); setErr((e) => ({ ...e, client: null })); }}>
                      <Avatar name={c.nom} size="sm" />
                      <span className="grow"><span className="strong">{c.nom}</span> {c.statut === "VIP" && <Star size={12} fill="var(--c-gold)" color="var(--c-gold)" />}<br /><span className="subtle">{c.tel}{c.ville && " · " + c.ville}</span></span>
                      {clientId === c.id && <CheckCircle2 size={18} color="var(--brand)" />}
                    </button>
                  ))}
                  {clients.length === 0 && <div className="subtle" style={{ padding: 12 }}>Aucun client — créez-en un nouveau.</div>}
                </div>
              </>
            ) : (
              <div className="card" style={{ padding: 14, animation: "fadeDown .25s var(--ease-out)" }}>
                <div className="form-grid">
                  <Field label="Nom complet" error={err.client && !nouveau.nom.trim() ? "Nom requis" : null}><Input value={nouveau.nom} onChange={(e) => setNouveau({ ...nouveau, nom: e.target.value })} placeholder="Ex : Awa Bamba" autoFocus /></Field>
                  <Field label="Téléphone" error={err.client && !nouveau.tel.trim() ? "Téléphone requis" : null}><Input value={nouveau.tel} onChange={(e) => setNouveau({ ...nouveau, tel: e.target.value })} placeholder="07 00 00 00 00" inputMode="tel" /></Field>
                  <Field label="Ville / quartier" optional><Input value={nouveau.ville} onChange={(e) => setNouveau({ ...nouveau, ville: e.target.value })} placeholder="Ex : Cocody, Abidjan" /></Field>
                  <Field label="E-mail" optional><Input icon={Mail} type="email" value={nouveau.email || ""} onChange={(e) => setNouveau({ ...nouveau, email: e.target.value })} placeholder="client@exemple.ci" /></Field>
                  <div className="full"><Checkbox checked={nouveau.consentement} onChange={(v) => setNouveau({ ...nouveau, consentement: v })} label="Le client accepte de recevoir nos promotions et nouveautés (SMS / e-mail)" /></div>
                </div>
                <div style={{ marginTop: 10 }}><Btn variant="plain" icon={ArrowLeft} onClick={() => setNouveau(null)}>Choisir un client existant</Btn></div>
              </div>
            )}
          </section>
        </div>

        <aside className="sale-summary">
          <div className="strong">Récapitulatif</div>
          {pack ? (
            <div className="row" style={{ gap: 12, animation: "fadeUp .3s var(--ease-out)" }} key={pack.id}>
              <Thumb pack={pack} />
              <div className="grow"><div className="strong truncate">{pack.nom}</div><div className="subtle num">{fmt(prixU)}{promoActive(pack) && <> <span className="prix-barre">{fmt(pack.prix)}</span> <Badge tone="success">Promo</Badge></>}</div></div>
              <Stepper value={qte} onChange={setQte} max={Math.max(1, pack.stock)} />
            </div>
          ) : <div className="subtle" style={{ padding: "8px 0" }}>Aucun produit sélectionné</div>}
          <div className="row" style={{ gap: 10 }}>
            {client || nouveau?.nom ? <><Avatar name={client?.nom || nouveau.nom} size="sm" /><div className="grow truncate"><div className="strong truncate">{client?.nom || nouveau.nom}</div><div className="subtle">{client ? client.tel : "Nouveau client"}</div></div></> : <span className="subtle">Aucun client sélectionné</span>}
          </div>
          <div>
            <div className="label" style={{ marginBottom: 8 }}>Paiement</div>
            <PaiementForm total={total} value={pay} onChange={(v) => { setPay(v); setErr((e) => ({ ...e, pay: null })); }} telClient={client?.tel || nouveau?.tel} erreur={err.pay} />
          </div>
          <div className="stack-sm sale-cta">
            <div className="summary-line"><span>Sous-total</span><span className="num">{fmt(total)}</span></div>
            <div className="summary-line"><span>Livraison</span><span>Gratuite</span></div>
            <div className="summary-total"><span className="strong">Total</span><strong><CountUp value={total} format={fmt} /></strong></div>
            <Btn variant="brand" size="lg" full onClick={verifier} icon={FileText}>Voir le récapitulatif (ticket)</Btn>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

/* ---------- Image produit (fichier → redimensionnée côté navigateur) ---------- */
const IMAGE_MAX = 800; // px, côté le plus long

function redimensionnerImage(fichier) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|gif|bmp|heic|heif)$/i.test(fichier.type) && !/\.(jpe?g|png|webp|gif|bmp)$/i.test(fichier.name)) {
      return reject(new Error("Choisissez une image (JPEG, PNG ou WebP)."));
    }
    if (fichier.size > 15 * 1024 * 1024) return reject(new Error("Image trop lourde (15 Mo maximum)."));
    const url = URL.createObjectURL(fichier);
    const img = new Image();
    img.onload = () => {
      const echelle = Math.min(1, IMAGE_MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * echelle), h = Math.round(img.height * echelle);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; // fond blanc pour les PNG transparents convertis en JPEG
      ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Impossible de lire cette image.")); };
    img.src = url;
  });
}

function ImagePicker({ value, onChange }) {
  const inputRef = useRef(null);
  const [survol, setSurvol] = useState(false);
  const [erreur, setErreur] = useState("");
  const [lecture, setLecture] = useState(false);
  const charger = async (fichier) => {
    if (!fichier) return;
    setErreur(""); setLecture(true);
    try { onChange(await redimensionnerImage(fichier)); } catch (e) { setErreur(e.message); } finally { setLecture(false); }
  };
  const ouvrir = () => inputRef.current?.click();
  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(e) => { charger(e.target.files?.[0]); e.target.value = ""; }} />
      {value ? (
        <div className="img-preview">
          <img src={urlImage(value)} alt="Aperçu du produit" />
          <div className="img-preview-actions">
            <Btn size="sm" icon={Upload} onClick={ouvrir}>Remplacer</Btn>
            <Btn size="sm" variant="critical-plain" icon={Trash2} onClick={() => onChange(null)}>Retirer</Btn>
          </div>
        </div>
      ) : (
        <button type="button" className={cx("dropzone", survol && "survol")} onClick={ouvrir}
          onDragOver={(e) => { e.preventDefault(); setSurvol(true); }} onDragLeave={() => setSurvol(false)}
          onDrop={(e) => { e.preventDefault(); setSurvol(false); charger(e.dataTransfer.files?.[0]); }}>
          {lecture ? <span className="spinner" /> : <span className="dropzone-icon"><Upload size={20} /></span>}
          <span className="strong">Ajouter une image</span>
          <span className="subtle">Cliquez ou glissez-déposez un fichier depuis votre appareil</span>
        </button>
      )}
      {erreur && <div className="field-error" style={{ marginTop: 6 }}><AlertCircle size={14} />{erreur}</div>}
    </div>
  );
}

/* ---------- Produit ---------- */
function ProductModal({ open, pack, onClose }) {
  const { data, update, sync, toast, confirm } = useApp();
  const blank = { nom: "", desc: "", prix: "", cout: "", stock: "", sku: "", emoji: "📦", teinte: 0, actif: true, image: null, contenu: "", seuilAlerte: String(STOCK_FAIBLE), prixPromo: "", promoFin: "" };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState({});
  const [shake, setShake] = useState(false);
  useEffect(() => {
    if (!open) return;
    setErr({});
    setF(pack
      ? { ...blank, ...pack, prix: String(pack.prix ?? ""), cout: pack.cout != null ? String(pack.cout) : "", stock: String(pack.stock ?? 0),
        contenu: pack.contenu || "", seuilAlerte: String(seuilDe(pack)), prixPromo: pack.prixPromo != null ? String(pack.prixPromo) : "", promoFin: pack.promoFin ? isoDate(new Date(pack.promoFin)) : "" }
      : { ...blank, sku: "PK-" + (101 + data.packs.length), teinte: data.packs.length % 8 });
  }, [open, pack?.id]);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); if (err[k]) setErr((e) => ({ ...e, [k]: null })); };
  const prix = Number(f.prix) || 0, cout = Number(f.cout) || 0;
  const marge = prix && cout ? prix - cout : null;
  const prixPromo = f.prixPromo === "" ? null : Number(f.prixPromo);
  const vendus = pack ? data.ventes.filter((v) => v.packId === pack.id).reduce((s, v) => s + v.qte, 0) : 0;
  const elements = String(f.contenu || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);

  const save = () => {
    const e = {};
    if (!f.nom.trim()) e.nom = "Le titre est obligatoire.";
    if (!(prix > 0)) e.prix = "Indiquez un prix supérieur à 0.";
    if (f.stock !== "" && (Number(f.stock) < 0 || !Number.isInteger(Number(f.stock)))) e.stock = "Quantité entière positive.";
    if (prixPromo != null && !(prixPromo > 0 && prixPromo < prix)) e.prixPromo = "Le prix promotionnel doit être inférieur au prix de vente.";
    if (f.promoFin && prixPromo == null) e.prixPromo = "Indiquez le prix promotionnel.";
    if (f.promoFin && parseDate(f.promoFin) < today()) e.promoFin = "Date déjà passée.";
    setErr(e);
    if (Object.keys(e).length) { setShake(true); setTimeout(() => setShake(false), 450); return; }
    const fin = f.promoFin ? (() => { const d = parseDate(f.promoFin); d.setHours(23, 59, 59, 0); return d.toISOString(); })() : null;
    const clean = { ...f, nom: f.nom.trim(), prix, cout: f.cout === "" ? null : cout, stock: Number(f.stock) || 0,
      contenu: elements.join("\n"), seuilAlerte: Math.max(0, Number(f.seuilAlerte) || 0), prixPromo, promoFin: prixPromo != null ? fin : null };
    if (pack) {
      update((d) => ({ ...d, packs: d.packs.map((p) => (p.id === pack.id ? { ...p, ...clean } : p)) }));
      sync(["PUT", `/api/packs/${pack.id}`, packVersServeur(clean)]);
    } else {
      const id = uid();
      update((d) => ({ ...d, packs: [...d.packs, { id, ...clean }] }));
      sync(["POST", "/api/packs", { id, ...packVersServeur(clean) }]);
    }
    toast({ title: pack ? "Produit mis à jour" : "Produit ajouté", desc: clean.nom });
    onClose();
  };
  const remove = async () => {
    const ok = await confirm({
      title: `Supprimer « ${pack.nom} » ?`,
      message: vendus ? `Ce produit apparaît dans ${vendus} vente(s). Les ventes seront conservées mais le produit n'apparaîtra plus au catalogue.` : "Cette action est définitive.",
      confirmLabel: "Supprimer", tone: "critical",
    });
    if (!ok) return;
    update((d) => ({ ...d, packs: d.packs.filter((p) => p.id !== pack.id) }));
    sync(["DELETE", `/api/packs/${pack.id}`]);
    toast({ title: "Produit supprimé", desc: pack.nom });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={pack ? "Modifier le produit" : "Ajouter un produit"} size="lg" className={shake ? "shake" : ""}
      footer={<>
        {pack && <Btn variant="critical-plain" icon={Trash2} onClick={remove} className="spacer">Supprimer</Btn>}
        <Btn onClick={onClose}>Annuler</Btn>
        <Btn variant="primary" onClick={save}>{pack ? "Enregistrer" : "Ajouter le produit"}</Btn>
      </>}>
      <div className="stack">
        <Field label="Titre" error={err.nom}><Input value={f.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex : Pack Élégance" /></Field>
        <Field label="Description" optional><textarea className="textarea" value={f.desc} onChange={(e) => set("desc", e.target.value)} placeholder="Ses avantages, à qui il s'adresse…" /></Field>
        <Field label="Contenu détaillé (équipements)" optional help={elements.length ? `${elements.length} élément${elements.length > 1 ? "s" : ""} — affichés sur la fiche produit de la boutique en ligne.` : "Un élément par ligne. Ex : Sac en cuir, Portefeuille, Ceinture…"}>
          <textarea className="textarea" rows={4} value={f.contenu} onChange={(e) => set("contenu", e.target.value)} placeholder={"Sac en cuir\nPortefeuille assorti\nCeinture réglable"} />
        </Field>
        <Field label="Image du produit" optional help="JPEG, PNG ou WebP. L'image est automatiquement redimensionnée.">
          <ImagePicker value={f.image} onChange={(v) => set("image", v)} />
        </Field>
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
          <div className="card-section"><div className="card-title">Prix</div></div>
          <div className="card-section form-grid">
            <Field label="Prix de vente" error={err.prix}><Input value={f.prix} onChange={(e) => set("prix", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" placeholder="0" /></Field>
            <Field label="Coût par article" optional help="Les clients ne verront pas ce prix."><Input value={f.cout} onChange={(e) => set("cout", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" placeholder="0" /></Field>
            {marge != null && (
              <div className="full row" style={{ gap: 24, animation: "fadeDown .25s var(--ease-out)" }}>
                <div><div className="subtle">Marge</div><div className="strong num">{fmt(marge)}</div></div>
                <div><div className="subtle">Taux de marge</div><div className="strong num" style={{ color: marge >= 0 ? "var(--success-dot)" : "var(--critical-solid)" }}>{((marge / prix) * 100).toFixed(1).replace(".", ",")} %</div></div>
              </div>
            )}
          </div>
        </div>
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
          <div className="card-section"><div className="card-title">Promotion</div><div className="subtle">Prix réduit appliqué en caisse et sur la boutique en ligne. Pour alerter les clients, utilisez Marketing → Lancer une promotion.</div></div>
          <div className="card-section form-grid">
            <Field label="Prix promotionnel" optional error={err.prixPromo} help={prixPromo > 0 && prix > prixPromo ? `Remise de ${Math.round((1 - prixPromo / prix) * 100)} %` : null}>
              <Input value={f.prixPromo} onChange={(e) => set("prixPromo", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" placeholder="Aucune promotion" />
            </Field>
            <Field label="Fin de la promotion" optional error={err.promoFin} help="Sans date : jusqu'à ce que vous la retiriez.">
              <Input type="date" value={f.promoFin} onChange={(e) => set("promoFin", e.target.value)} min={isoDate(new Date())} />
            </Field>
          </div>
        </div>
        <div className="card" style={{ boxShadow: "none", border: "1px solid var(--border)" }}>
          <div className="card-section"><div className="card-title">Inventaire</div></div>
          <div className="card-section form-grid">
            <Field label="SKU (référence)"><Input value={f.sku} onChange={(e) => set("sku", e.target.value)} /></Field>
            <Field label="Seuil d'alerte" help="Alerte « stock faible » à partir de cette quantité."><Input value={f.seuilAlerte} onChange={(e) => set("seuilAlerte", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" suffix="unités" /></Field>
            <Field label={pack ? "Quantité en stock (correction)" : "Stock initial"} error={err.stock} className="full" help={pack ? "Pour une livraison fournisseur, préférez Stocks → Réception (historique et coût d'achat)." : null}>
              <div className="row">
                <div className="grow"><Input value={f.stock} onChange={(e) => set("stock", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" placeholder="0" /></div>
                <Stepper value={Number(f.stock) || 0} min={0} max={99999} onChange={(v) => set("stock", String(v))} />
              </div>
            </Field>
          </div>
        </div>
        <div className="row-between card" style={{ padding: 14, boxShadow: "none", border: "1px solid var(--border)" }}>
          <div><div className="strong">Produit actif</div><div className="subtle">Un brouillon n'apparaît pas dans le point de vente.</div></div>
          <Switch on={f.actif !== false} onChange={(v) => set("actif", v)} label="Produit actif" />
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Client ---------- */
function ClientModal({ open, client, onClose, onSaved }) {
  const { update, sync, toast } = useApp();
  const blank = { nom: "", tel: "", email: "", ville: "", statut: "Standard", notes: "", consentement: false };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState({});
  const [shake, setShake] = useState(false);
  useEffect(() => { if (open) { setF(client ? { ...blank, ...client } : blank); setErr({}); } }, [open, client?.id]);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); if (err[k]) setErr((e) => ({ ...e, [k]: null })); };
  const save = () => {
    const e = {};
    if (!f.nom.trim()) e.nom = "Le nom est obligatoire.";
    if (f.tel.replace(/\D/g, "").length < 8) e.tel = "Numéro de téléphone invalide.";
    if (f.email && !/^\S+@\S+\.\S+$/.test(f.email)) e.email = "Adresse e-mail invalide.";
    setErr(e);
    if (Object.keys(e).length) { setShake(true); setTimeout(() => setShake(false), 450); return; }
    const clean = { ...f, nom: f.nom.trim(), tel: f.tel.trim(), email: f.email.trim(), ville: f.ville.trim() };
    let id = client?.id;
    if (client) {
      update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === client.id ? { ...c, ...clean } : c)) }));
      sync(["PUT", `/api/clients/${client.id}`, clientVersServeur(clean)]);
    } else {
      id = uid();
      update((d) => ({ ...d, clients: [...d.clients, { id, dateAjout: isoDate(new Date()), ...clean }] }));
      sync(["POST", "/api/clients", { id, ...clientVersServeur(clean) }]);
    }
    toast({ title: client ? "Client mis à jour" : "Client ajouté", desc: clean.nom });
    onClose();
    onSaved?.(id);
  };
  return (
    <Modal open={open} onClose={onClose} title={client ? "Modifier le client" : "Ajouter un client"} size="md" className={shake ? "shake" : ""}
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" onClick={save}>{client ? "Enregistrer" : "Ajouter le client"}</Btn></>}>
      <div className="form-grid">
        <Field label="Nom complet" error={err.nom} className="full"><Input value={f.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex : Awa Bamba" /></Field>
        <Field label="Téléphone" error={err.tel}><Input icon={Phone} value={f.tel} onChange={(e) => set("tel", e.target.value)} placeholder="07 00 00 00 00" inputMode="tel" /></Field>
        <Field label="E-mail" optional error={err.email}><Input icon={Mail} value={f.email} onChange={(e) => set("email", e.target.value)} placeholder="email@exemple.com" inputMode="email" /></Field>
        <Field label="Ville / quartier" optional className="full"><Input icon={MapPin} value={f.ville} onChange={(e) => set("ville", e.target.value)} placeholder="Ex : Cocody, Abidjan" /></Field>
        <Field label="Statut" className="full">
          <Segmented full value={f.statut} onChange={(v) => set("statut", v)} options={[{ value: "Standard", label: "Standard", icon: User }, { value: "VIP", label: "VIP", icon: Star }]} />
        </Field>
        <Field label="Notes" optional className="full"><textarea className="textarea" value={f.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Préférences, remarques…" /></Field>
        <div className="full row-between card" style={{ padding: 14, boxShadow: "none", border: "1px solid var(--border)" }}>
          <div><div className="strong">Accepte les messages marketing</div><div className="subtle">Promotions, nouveautés et message du lundi par SMS / e-mail. Ne cochez qu'avec l'accord du client.</div></div>
          <Switch on={!!f.consentement} onChange={(v) => set("consentement", v)} label="Consentement marketing" />
        </div>
      </div>
    </Modal>
  );
}

/* ---------- Dépense / investissement ---------- */
function InvestModal({ open, item, onClose }) {
  const { update, sync, toast } = useApp();
  const blank = { libelle: "", categorie: "Stock", montant: "", date: isoDate(new Date()) };
  const [f, setF] = useState(blank);
  const [err, setErr] = useState({});
  useEffect(() => { if (open) { setF(item ? { ...item, montant: String(item.montant) } : blank); setErr({}); } }, [open, item?.id]);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v })); if (err[k]) setErr((e) => ({ ...e, [k]: null })); };
  const save = () => {
    const e = {};
    if (!f.libelle.trim()) e.libelle = "Le libellé est obligatoire.";
    if (!(Number(f.montant) > 0)) e.montant = "Indiquez un montant.";
    setErr(e);
    if (Object.keys(e).length) return;
    const clean = { ...f, libelle: f.libelle.trim(), montant: Number(f.montant) };
    if (item) {
      update((d) => ({ ...d, investissements: d.investissements.map((i) => (i.id === item.id ? { ...i, ...clean } : i)) }));
      sync(["PUT", `/api/investissements/${item.id}`, investVersServeur(clean)]);
    } else {
      const id = uid();
      update((d) => ({ ...d, investissements: [{ id, ...clean }, ...d.investissements] }));
      sync(["POST", "/api/investissements", { id, ...investVersServeur(clean) }]);
    }
    toast({ title: item ? "Dépense mise à jour" : "Dépense enregistrée", desc: `${clean.libelle} · ${fmt(clean.montant)}` });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={item ? "Modifier la dépense" : "Enregistrer une dépense"} size="md"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" onClick={save}>Enregistrer</Btn></>}>
      <div className="form-grid">
        <Field label="Libellé" error={err.libelle} className="full"><Input value={f.libelle} onChange={(e) => set("libelle", e.target.value)} placeholder="Ex : Achat de stock" /></Field>
        <Field label="Montant" error={err.montant}><Input value={f.montant} onChange={(e) => set("montant", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" placeholder="0" /></Field>
        <Field label="Date"><Input type="date" value={f.date} onChange={(e) => set("date", e.target.value)} /></Field>
        <Field label="Catégorie" className="full">
          <div className="row" style={{ flexWrap: "wrap", gap: 8 }}>
            {CATEGORIES.map((c) => (
              <button key={c.key} type="button" className={cx("btn btn-sm", f.categorie === c.key ? "btn-primary" : "btn-secondary")} onClick={() => set("categorie", c.key)}>
                <span style={{ width: 8, height: 8, borderRadius: 3, background: c.color }} />{c.key}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Modal>
  );
}

/* ---------- Reçu imprimable ---------- */
function TicketModal({ open, cmd, onClose }) {
  const { data, mode } = useApp();
  const t = cmd ? construireTicket(data, cmd, mode) : null;
  return (
    <Modal open={open} onClose={onClose} title="Ticket de caisse" size="sm" footer={t && <ActionsTicket t={t} cmd={cmd} compact />}>
      {t && <TicketCaisse t={t} />}
      {t && !t.lien && mode !== "api" && <p className="subtle" style={{ textAlign: "center", marginTop: 8 }}>Mode démo : le lien et le QR code de téléchargement sont disponibles une fois connecté au serveur.</p>}
    </Modal>
  );
}

/* ---------- Encaisser une vente « paiement à la livraison » ---------- */
function EncaisserModal({ open, cmd, onClose }) {
  const { update, sync, toast } = useApp();
  const [pay, setPay] = useState(paiementVide());
  const [err, setErr] = useState(null);
  const [busy, setBusy] = useState(false);
  const aVerifier = cmd?.vente?.statutPaiement === "a_verifier";
  useEffect(() => {
    if (!open) return;
    // Transfert déclaré par le client : on préremplit avec ce qu'il a saisi
    setPay(aVerifier ? { mode: cmd.vente.paiement, recu: "", tel: cmd.vente.telPaiement || "", ref: cmd.vente.reference || "" } : paiementVide());
    setErr(null); setBusy(false);
  }, [open]);
  if (!cmd) return <Modal open={false} onClose={onClose} />;
  const total = cmd.total;
  const valider = async () => {
    const e = validerPaiementLocal(pay, total);
    if (e) return setErr(e);
    setBusy(true);
    const maintenant = new Date().toISOString();
    const l = paiementLocal(pay, total);
    update((d) => ({
      ...d,
      ventes: d.ventes.map((v) => (v.commandeId === cmd.id || v.id === cmd.venteId ? { ...v, ...l, statutPaiement: "payee", payeLe: maintenant } : v)),
      commandes: d.commandes.map((c) => (c.id === cmd.id ? { ...c, historique: [...(c.historique || []), { type: "paiement", texte: aVerifier ? `Paiement vérifié et confirmé (${l.paiement})` : `Paiement encaissé (${l.paiement})`, date: maintenant }] } : c)),
    }));
    const r = await sync(["PATCH", `/api/commandes/${cmd.id}/paiement`, paiementVersServeur(pay, total)]);
    setBusy(false);
    if (!r) return;
    const monnaie = l.montantRecu != null ? l.montantRecu - total : 0;
    toast({ title: `Paiement de ${fmt(total)} encaissé`, desc: monnaie > 0 ? `Monnaie à rendre : ${fmt(monnaie)}` : l.paiement });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title={aVerifier ? `Vérifier le paiement ${cmd.numero}` : `Encaisser ${cmd.numero}`} size="md"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="brand" icon={CheckCircle2} loading={busy} onClick={valider}>{aVerifier ? "J'ai bien reçu le paiement" : `Encaisser ${fmt(total)}`}</Btn></>}>
      <div className="stack">
        {aVerifier && (
          <div className="banner banner-warning"><ShieldCheck size={16} /><div>
            Le client déclare avoir envoyé <b>{fmt(total)}</b> par <b>{cmd.vente.paiement}</b> depuis le <b>{cmd.vente.telPaiement || "—"}</b> (réf. <b>{cmd.vente.reference || "—"}</b>).
            Vérifiez sur votre relevé {cmd.vente.paiement} que la somme est bien arrivée avant de confirmer.
          </div></div>
        )}
        <div className="row-between"><span className="muted">Montant à encaisser</span><strong className="num" style={{ fontSize: 20 }}>{fmt(total)}</strong></div>
        <PaiementForm total={total} value={pay} onChange={(v) => { setPay(v); setErr(null); }} telClient={cmd.client?.tel} erreur={err} sansLivraison />
      </div>
    </Modal>
  );
}

/* =====================================================================
   PAGE : Accueil
   ===================================================================== */
function PageAccueil() {
  const { data, settings, go, openSale, mode, auth, remplacerTout, toast } = useApp();
  const [period, setPeriod] = useState(30);
  const [chargement, setChargement] = useState(null);
  const baseVide = mode === "api" && data.clients.length === 0 && data.packs.length === 0 && data.ventes.length === 0;
  const peutImporter = auth?.utilisateur?.role === "admin";
  const local = baseVide ? readJson(STORAGE_KEY) : null;
  const demarrer = async (quoi) => {
    setChargement(quoi);
    const ok = await remplacerTout(quoi === "demo" ? { ...seedData(), boutique: data.boutique } : migrate(local));
    setChargement(null);
    if (ok) toast({ title: quoi === "demo" ? "Données de démonstration chargées" : "Données du navigateur envoyées sur le serveur" });
  };
  const m = useMemo(() => computeDashboard(data, period), [data, period]);
  const todo = useMemo(() => computeTodo(data), [data]);
  const recent = useMemo(() => enrichCommandes(data).sort((a, b) => b.stamp.localeCompare(a.stamp)).slice(0, 6), [data]);
  const h = new Date().getHours();
  const hello = h < 5 ? "Bonsoir" : h < 12 ? "Bonjour" : h < 18 ? "Bon après-midi" : "Bonsoir";

  const kpis = [
    { label: "Chiffre d'affaires", value: m.ca, format: fmt, delta: m.dCa, spark: m.series.map((s) => s.value), color: "var(--c-blue)", icon: TrendingUp, tint: 4 },
    { label: "Commandes", value: m.nb, format: fmtNum, delta: m.dNb, spark: m.series.map((s) => s.n), color: "var(--c-green)", icon: ShoppingCart, tint: 0 },
    { label: "Panier moyen", value: m.panier, format: fmt, delta: m.dPanier, spark: m.series.map((s) => (s.n ? s.value / s.n : 0)), color: "var(--c-purple)", icon: ShoppingBag, tint: 5 },
    { label: "Nouveaux clients", value: m.nc, format: fmtNum, delta: m.dNc, spark: m.series.map((s) => s.nc), color: "var(--c-gold)", icon: UserPlus, tint: 1 },
  ];

  const todos = [
    todo.attente && { icon: Clock, tint: 1, title: `${todo.attente} commande${todo.attente > 1 ? "s" : ""} à confirmer`, sub: "Validez-les pour lancer la préparation", go: () => go("commandes", null, { statut: "en_attente" }) },
    todo.aVerifier.length && { icon: ShieldCheck, tint: 3, title: `${todo.aVerifier.length} paiement${todo.aVerifier.length > 1 ? "s" : ""} à vérifier`, sub: "Transferts Mobile Money déclarés en ligne : contrôlez votre relevé", go: () => go("commandes", todo.aVerifier[0].id) },
    todo.aEncaisser.length && { icon: Banknote, tint: 1, title: `${todo.aEncaisser.length} paiement${todo.aEncaisser.length > 1 ? "s" : ""} à encaisser`, sub: `${fmt(todo.aEncaisser.reduce((x, v) => x + v.total, 0))} payables à la livraison`, go: () => go("ventes", null, { paiement: "en_attente" }) },
    todo.aExpedier && { icon: Truck, tint: 2, title: `${todo.aExpedier} commande${todo.aExpedier > 1 ? "s" : ""} à expédier`, sub: "Prêtes pour la livraison", go: () => go("commandes", null, { statut: "confirmee" }) },
    todo.enLivraison && { icon: PackageCheck, tint: 5, title: `${todo.enLivraison} en cours de livraison`, sub: "Marquez-les livrées à réception", go: () => go("commandes", null, { statut: "expediee" }) },
    todo.rupture.length && { icon: AlertTriangle, tint: 3, title: `${todo.rupture.length} produit${todo.rupture.length > 1 ? "s" : ""} en rupture`, sub: todo.rupture.map((p) => p.nom).join(", "), go: () => go("produits", null, { filtre: "rupture" }) },
    todo.faible.length && { icon: Package, tint: 7, title: `${todo.faible.length} produit${todo.faible.length > 1 ? "s" : ""} en stock faible`, sub: todo.faible.map((p) => p.nom).join(", "), go: () => go("produits", null, { filtre: "faible" }) },
  ].filter(Boolean);

  const topMax = Math.max(1, ...m.top.map((t) => t.total));

  return (
    <>
      <PageHeader
        title={`${hello} 👋`}
        meta={<>Voici l'activité de <b>{(data.boutique?.nom || "Ma Boutique")}</b> · {fmtDateLong(new Date())}</>}
        actions={<>
          <Segmented value={period} onChange={setPeriod} options={[{ value: 7, label: "7 jours" }, { value: 30, label: "30 jours" }, { value: 90, label: "90 jours" }]} />
          <Btn variant="primary" icon={Plus} onClick={() => openSale()} className="hide-sm">Nouvelle vente</Btn>
        </>}
      />

      {baseVide && (
        <div className="card onboarding" style={{ marginBottom: 16 }}>
          <div className="card-body row" style={{ gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
            <span className="todo-icon tint-0" style={{ width: 44, height: 44, borderRadius: 12 }}><Sparkles size={20} /></span>
            <div className="grow" style={{ minWidth: 220 }}>
              <div className="strong" style={{ fontSize: 15 }}>Votre boutique est prête</div>
              <p className="muted" style={{ marginTop: 2 }}>
                La base de données du serveur est vide. Ajoutez vos produits et clients, ou partez d'un exemple.
                {!peutImporter && " Seul un administrateur peut charger des données d'exemple."}
              </p>
              <div className="row" style={{ marginTop: 12, flexWrap: "wrap" }}>
                <Btn variant="primary" icon={Plus} onClick={() => go("produits", "nouveau")}>Ajouter un produit</Btn>
                {peutImporter && local && <Btn icon={Upload} loading={chargement === "local"} onClick={() => demarrer("local")}>Importer les données de ce navigateur</Btn>}
                {peutImporter && <Btn icon={Sparkles} loading={chargement === "demo"} onClick={() => demarrer("demo")}>Charger des données d'exemple</Btn>}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="kpi-grid stagger">
        {kpis.map((k, i) => (
          <div className="card kpi" key={k.label} style={{ "--i": i }}>
            <div className="kpi-label"><span className={cx("kpi-dot", `tint-${k.tint}`)}><k.icon size={13} /></span>{k.label}</div>
            <div className="kpi-value"><CountUp value={k.value} format={k.format} /></div>
            <div className="kpi-foot"><Delta value={k.delta} /><span className="hide-sm">vs période préc.</span></div>
            <div className="kpi-spark" key={period}><Sparkline values={k.spark} color={k.color} /></div>
          </div>
        ))}
      </div>

      <div className="grid-main">
        <Card title="Ventes au fil du temps" sub={`${period} derniers jours, commandes annulées exclues`}>
          <div className="chart-head">
            <div className="big-num"><CountUp value={m.ca} format={fmt} /></div>
            <Delta value={m.dCa} />
            <div className="legend hide-sm">
              <span><i style={{ background: "var(--c-blue)" }} />Période actuelle</span>
              <span><i className="dashed" />Période précédente</span>
            </div>
          </div>
          <AreaChart key={period} points={m.series} />
        </Card>

        <Card title="À traiter" sub={todos.length ? "Vos priorités du moment" : null} padded={false}>
          <div style={{ padding: 6 }}>
            {todos.length === 0 && <EmptyState icon={CheckCircle2} title="Tout est à jour 🎉">Aucune commande ni aucun stock ne demande votre attention.</EmptyState>}
            {todos.map((t, i) => (
              <button key={i} className="todo-item" onClick={t.go} style={{ animation: `fadeUp .4s ${i * 60}ms var(--ease-out) both` }}>
                <span className={cx("todo-icon", `tint-${t.tint}`)}><t.icon size={16} /></span>
                <span className="grow"><span className="strong">{t.title}</span><br /><span className="subtle truncate" style={{ display: "block" }}>{t.sub}</span></span>
                <ChevronRight size={16} className="todo-arrow" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid-3">
        <Card title="Meilleurs produits" sub={`Par chiffre d'affaires · ${period} j`} actions={<Btn variant="plain" size="sm" onClick={() => go("produits")}>Tout voir</Btn>}>
          {m.top.length === 0 && <EmptyState icon={Tag} title="Pas encore de ventes" />}
          <div className="stack" style={{ gap: 14 }}>
            {m.top.map((t, i) => (
              <div key={t.pack.id} className="row" style={{ gap: 12, cursor: "pointer" }} onClick={() => go("produits", t.pack.id)}>
                <Thumb pack={t.pack} size="sm" />
                <div className="grow">
                  <div className="row-between"><span className="strong truncate">{t.pack.nom}</span><span className="num strong">{fmtShort(t.total)}</span></div>
                  <div className="row" style={{ gap: 8, marginTop: 5 }}>
                    <div className="progress grow"><span style={{ width: `${(t.total / topMax) * 100}%`, animationDelay: `${i * 80}ms` }} /></div>
                    <span className="subtle num">{t.qte} u.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Moyens de paiement" sub={`${period} derniers jours`}>
          <Donut key={period} items={m.paiements} format={fmtShort} />
        </Card>

        <Card title="Commandes récentes" padded={false} actions={<Btn variant="plain" size="sm" onClick={() => go("commandes")}>Tout voir</Btn>}>
          <div className="list" style={{ marginTop: 8 }}>
            {recent.map((c) => (
              <a key={c.id} className="list-item" href={`#/commandes/${c.id}`}>
                <Thumb pack={c.pack} size="sm" />
                <div className="grow">
                  <div className="row-between"><span className="strong">{c.numero}</span><span className="num strong">{fmt(c.total)}</span></div>
                  <div className="row-between"><span className="subtle truncate">{c.client?.nom || "—"} · {relDay(c.vente?.date, c.vente?.heure)}</span><StatutBadge statut={c.statut} /></div>
                </div>
              </a>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

/* =====================================================================
   PAGE : Commandes (liste)
   ===================================================================== */
function PageCommandes({ route }) {
  const { data, update, sync, go, toast, confirm, openSale } = useApp();
  const [tab, setTab] = useState(route.query.statut || "toutes");
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(() => new Set());
  const sort = useSort("date");
  useEffect(() => { if (route.query.statut) setTab(route.query.statut); }, [route.query.statut]);
  useEffect(() => setSel(new Set()), [tab, q]);

  const all = useMemo(() => enrichCommandes(data), [data]);
  const counts = useMemo(() => Object.fromEntries(Object.keys(STATUTS).map((k) => [k, all.filter((c) => c.statut === k).length])), [all]);
  const rows = sort.apply(
    all.filter((c) => (tab === "toutes" || c.statut === tab) && norm(`${c.numero} ${c.client?.nom} ${c.lignes.map((l) => l.pack?.nom).join(" ")} ${c.adresseLivraison} ${c.canal === "en_ligne" ? "en ligne web" : ""}`).includes(norm(q))),
    { date: (c) => c.stamp, total: (c) => c.total, client: (c) => c.client?.nom || "", numero: (c) => parseInt(String(c.numero).replace(/\D/g, ""), 10) || 0 },
  );
  const pg = usePaged(rows, 15, tab + q + sort.sort.key + sort.sort.dir);

  const T0 = today();
  const last30 = all.filter((c) => daysBetween(parseDate(c.vente?.date), T0) < 30);
  const strip = [
    { label: "Commandes (30 j)", value: last30.length },
    { label: "Articles commandés", value: last30.reduce((s, c) => s + c.articles, 0) },
    { label: "Livrées (30 j)", value: last30.filter((c) => c.statut === "livree").length },
    { label: "Taux d'annulation", value: last30.length ? Math.round((last30.filter((c) => c.statut === "annulee").length / last30.length) * 100) : 0, suffix: " %" },
  ];

  const allOnPage = pg.slice.length > 0 && pg.slice.every((c) => sel.has(c.id));
  const someOnPage = pg.slice.some((c) => sel.has(c.id));
  const toggleAll = (v) => setSel((s) => { const n = new Set(s); pg.slice.forEach((c) => (v ? n.add(c.id) : n.delete(c.id))); return n; });
  const toggle = (id, v) => setSel((s) => { const n = new Set(s); v ? n.add(id) : n.delete(id); return n; });

  const bulk = async (statut) => {
    const ids = [...sel];
    if (statut === "annulee") {
      const ok = await confirm({ title: `Annuler ${ids.length} commande${ids.length > 1 ? "s" : ""} ?`, message: "Les articles seront remis en stock. Vous pourrez toujours rétablir une commande depuis sa fiche.", confirmLabel: "Annuler les commandes", tone: "critical" });
      if (!ok) return;
    }
    update((d) => applyStatut(d, ids, statut));
    sync(["POST", "/api/commandes/statut", { ids, statut }]);
    toast({ title: `${ids.length} commande${ids.length > 1 ? "s" : ""} : ${STATUTS[statut].label.toLowerCase()}` });
    setSel(new Set());
  };

  const exporter = () => {
    downloadFile(`commandes-${isoDate(new Date())}.csv`, toCsv([
      ["Commande", "Date", "Client", "Produit", "Quantité", "Total (FCFA)", "Paiement", "Statut", "Adresse"],
      ...rows.map((c) => [c.numero, c.vente?.date, c.client?.nom, c.lignes.map((l) => `${l.pack?.nom || "?"} x${l.qte}`).join(" + "), c.articles, c.total, c.vente?.paiement, STATUTS[c.statut]?.label, c.adresseLivraison]),
    ]), "text/csv;charset=utf-8");
    toast({ title: "Export terminé", desc: `${rows.length} commande(s) exportée(s) en CSV` });
  };

  const tabs = [{ key: "toutes", label: "Toutes", count: all.length }, ...Object.entries(STATUTS).map(([k, s]) => ({ key: k, label: s.label, count: counts[k] }))];

  return (
    <>
      <PageHeader title="Commandes" actions={<><Btn icon={Download} onClick={exporter}>Exporter</Btn><Btn variant="primary" icon={Plus} onClick={() => openSale()}>Créer une vente</Btn></>} />

      <div className="card stat-strip stagger">
        {strip.map((s, i) => <div key={s.label} style={{ "--i": i }}><div className="label">{s.label}</div><div className="value"><CountUp value={s.value} />{s.suffix}</div></div>)}
      </div>

      <div className="card">
        <div className="table-toolbar"><Tabs tabs={tabs} value={tab} onChange={setTab} /></div>
        <div className="table-filters"><SearchInput value={q} onChange={setQ} placeholder="Rechercher par numéro, client, produit…" /></div>
        {rows.length === 0 ? (
          <EmptyState icon={ShoppingCart} title={q ? "Aucune commande trouvée" : "Aucune commande ici"}>
            {q ? "Modifiez votre recherche ou changez d'onglet." : "Les commandes apparaîtront ici dès votre prochaine vente."}
          </EmptyState>
        ) : (
          <div className="table-scroll has-bulk">
            {/* Barre d'actions groupées : recouvre l'en-tête pour ne pas décaler les lignes */}
            {sel.size > 0 && (
              <div className="bulk-bar">
                <Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} label={<strong>{sel.size} sélectionnée{sel.size > 1 ? "s" : ""}</strong>} />
                <span className="grow" />
                <Btn size="sm" onClick={() => bulk("confirmee")}>Confirmer</Btn>
                <Btn size="sm" onClick={() => bulk("expediee")}>Expédier</Btn>
                <Btn size="sm" onClick={() => bulk("livree")}>Livrer</Btn>
                <Btn size="sm" variant="critical-plain" onClick={() => bulk("annulee")}>Annuler</Btn>
              </div>
            )}
            <table className="table">
              <thead>
                <tr>
                  <th className="col-check hide-sm"><Checkbox checked={allOnPage} indeterminate={!allOnPage && someOnPage} onChange={toggleAll} label={<span className="sr-only">Tout sélectionner</span>} /></th>
                  <SortTh label="Commande" k="numero" sort={sort} onSort={sort.toggle} />
                  <SortTh label="Date" k="date" sort={sort} onSort={sort.toggle} className="hide-sm" />
                  <SortTh label="Client" k="client" sort={sort} onSort={sort.toggle} className="hide-sm" />
                  <SortTh label="Total" k="total" sort={sort} onSort={sort.toggle} className="right" />
                  <th className="hide-md">Paiement</th>
                  <th>Statut</th>
                  <th className="hide-md">Articles</th>
                </tr>
              </thead>
              <tbody key={tab + pg.page}>
                {pg.slice.map((c, i) => (
                  <tr key={c.id} className={cx("clickable", sel.has(c.id) && "selected")} style={{ "--i": i }} tabIndex={0}
                    onClick={() => go("commandes", c.id)} onKeyDown={(e) => e.key === "Enter" && go("commandes", c.id)}>
                    <td className="col-check hide-sm"><Checkbox checked={sel.has(c.id)} onChange={(v) => toggle(c.id, v)} label={<span className="sr-only">Sélectionner {c.numero}</span>} /></td>
                    <td><span className="cell-main">{c.numero}</span>{c.canal === "en_ligne" && <ShoppingBag size={13} className="canal-web" aria-label="En ligne" />}<div className="cell-sub only-mobile">{relDay(c.vente?.date, c.vente?.heure)}</div></td>
                    <td className="muted hide-sm">{relDay(c.vente?.date, c.vente?.heure)}</td>
                    <td className="hide-sm">{c.client?.nom || <span className="subtle">Client supprimé</span>}</td>
                    <td className="right num">{fmt(c.total)}</td>
                    <td className="hide-md"><PaiementBadge c={c} /></td>
                    <td><StatutBadge statut={c.statut} /></td>
                    <td className="hide-md muted">{c.articles} article{c.articles > 1 ? "s" : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pg={pg} />
      </div>
    </>
  );
}

/* =====================================================================
   PAGE : Commande (détail)
   ===================================================================== */
function PageCommande({ id }) {
  const { data, update, sync, go, toast, confirm, estAdmin } = useApp();
  const [receipt, setReceipt] = useState(false);
  const [encaisser, setEncaisser] = useState(false);
  const [comment, setComment] = useState("");
  const [addrOpen, setAddrOpen] = useState(false);
  const [addr, setAddr] = useState("");
  const [note, setNote] = useState(null);
  const c = useMemo(() => enrichCommandes(data).find((x) => x.id === id), [data, id]);

  if (!c) {
    return <><PageHeader title="Commande introuvable" back={() => go("commandes")} /><Card><EmptyState icon={ShoppingCart} title="Cette commande n'existe pas" action={<Btn variant="primary" onClick={() => go("commandes")}>Retour aux commandes</Btn>}>Elle a peut-être été supprimée.</EmptyState></Card></>;
  }
  const v = c.vente;
  const next = NEXT_STEP[c.statut];
  const setStatut = (s) => {
    update((d) => applyStatut(d, [c.id], s));
    sync(["PATCH", `/api/commandes/${c.id}/statut`, { statut: s }]);
    toast({ title: `Commande ${c.numero} : ${STATUTS[s].label.toLowerCase()}`, desc: s === "annulee" ? "Les articles ont été remis en stock." : c.statut === "annulee" ? "Le stock a été mis à jour." : undefined });
  };
  const cancel = async () => {
    if (await confirm({ title: `Annuler la commande ${c.numero} ?`, message: "La commande sera marquée comme annulée et le client remboursé. Les articles seront remis en stock.", confirmLabel: "Annuler la commande", tone: "critical" })) setStatut("annulee");
  };
  const remove = async () => {
    if (await confirm({ title: `Supprimer ${c.numero} ?`, message: "La commande et la vente associée seront définitivement supprimées. Le stock sera réintégré.", confirmLabel: "Supprimer", tone: "critical" })) {
      update((d) => deleteCommande(d, c.id));
      sync(["DELETE", `/api/commandes/${c.id}`]);
      go("commandes");
      toast({ title: "Commande supprimée", desc: c.numero });
    }
  };
  const patch = (fields) => update((d) => ({ ...d, commandes: d.commandes.map((x) => (x.id === c.id ? { ...x, ...fields(x) } : x)) }));
  const addComment = () => {
    if (!comment.trim()) return;
    patch((x) => ({ historique: [...(x.historique || []), { type: "note", texte: comment.trim(), date: new Date().toISOString() }] }));
    sync(["POST", `/api/commandes/${c.id}/commentaires`, { texte: comment.trim() }]);
    setComment("");
  };
  const stepIdx = FLOW.indexOf(c.statut);
  const events = [...(c.historique || [])].reverse();
  const cs = c.client ? clientStats(data, c.client.id) : null;

  return (
    <>
      <PageHeader
        back={() => go("commandes")}
        title={c.numero}
        badges={<><CanalBadge c={c} /><PaiementBadge c={c} /><StatutBadge statut={c.statut} /></>}
        meta={`${fmtDateTime(venteStamp(v))} · ${c.canal === "en_ligne" ? "commande passée sur la boutique en ligne" : "via le point de vente"}`}
        actions={<>
          <Btn icon={Receipt} onClick={() => setReceipt(true)}>Ticket de caisse</Btn>
          <MoreMenu items={[
            c.statut === "annulee" && { label: "Rétablir la commande", icon: RotateCcw, onClick: () => setStatut("en_attente") },
            c.statut !== "annulee" && { label: "Annuler la commande", icon: XCircle, onClick: cancel },
            ...(estAdmin ? ["sep", { label: "Supprimer", icon: Trash2, tone: "critical", onClick: remove }] : []),
          ]} />
        </>}
      />

      <div className="layout-detail">
        <div>
          <Card title={<span className="row"><StatutBadge statut={c.statut} /></span>} actions={next && <Btn variant="primary" icon={next.icon} onClick={() => setStatut(next.statut)}>{next.label}</Btn>}>
            {c.statut === "annulee" ? (
              <div className="banner banner-critical"><XCircle size={16} /><div>Cette commande a été annulée. Les articles ont été remis en stock.</div></div>
            ) : (
              <div className="steps">
                {FLOW.map((s, i) => {
                  const St = STATUTS[s];
                  return (
                    <div key={s} className={cx("step", i <= stepIdx && "done", i === stepIdx && "current")}>
                      <div className="step-dot">{i < stepIdx ? <Check size={15} strokeWidth={3} /> : <St.icon size={15} />}</div>
                      <div className="step-label">{St.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{ marginTop: 16, borderTop: "1px solid var(--divider)" }}>
              {c.lignes.map((l) => (
                <div key={l.id} className="list-item" style={{ padding: "12px 0 0", borderTop: 0 }}>
                  <Thumb pack={l.pack} size="lg" />
                  <div className="grow">
                    <div className="strong">{l.pack?.nom || "Produit supprimé"}</div>
                    <div className="subtle">{l.pack?.sku && `SKU : ${l.pack.sku}`}</div>
                  </div>
                  <div className="num muted">{fmt(l.prixUnitaire)} × {l.qte}</div>
                  <div className="num strong" style={{ minWidth: 110, textAlign: "right" }}>{fmt(l.total)}</div>
                </div>
              ))}
            </div>
          </Card>

          <Card title={<span className="row"><PaiementBadge c={c} /></span>}
            actions={["en_attente", "a_verifier", "echoue"].includes(v?.statutPaiement) && c.statut !== "annulee" && (v?.statutPaiement === "a_verifier"
              ? <Btn variant="brand" icon={ShieldCheck} onClick={() => setEncaisser(true)}>Vérifier le paiement</Btn>
              : <Btn variant="brand" icon={Banknote} onClick={() => setEncaisser(true)}>Encaisser le paiement</Btn>)}>
            <div className="stack-sm">
              <div className="summary-line"><span>Sous-total</span><span>{c.articles} article{c.articles > 1 ? "s" : ""}</span><span className="num">{fmt(c.sousTotal)}</span></div>
              <div className="summary-line"><span>Livraison</span><span /><span className="num">{c.frais ? fmt(c.frais) : c.canal === "en_ligne" ? "Gratuite" : "—"}</span></div>
              <div className="summary-line" style={{ color: "var(--text)", fontWeight: 650 }}><span>Total</span><span /><span className="num">{fmt(c.total)}</span></div>
              <div className="summary-total" style={{ fontSize: 13 }}>
                <span className="muted">{{
                  en_attente: c.statut === "annulee" ? "Non payé" : "À encaisser à la livraison",
                  a_verifier: "Transfert déclaré par le client, à vérifier",
                  en_cours: "Paiement en ligne non finalisé",
                  echoue: "Paiement en ligne échoué",
                }[v?.statutPaiement] || (c.statut === "annulee" ? "Remboursé au client" : "Payé par le client")}</span>
                <span className="num strong">{fmt(c.total)}</span>
              </div>
              {v?.statutPaiement !== "en_attente" && v?.statutPaiement !== "en_cours" && (
                <div className="pay-recap">
                  <ModePaiement mode={v?.paiement} taille={32} />
                  <div className="grow">
                    <div className="strong">{infoPaiement(v?.paiement).key}</div>
                    <div className="subtle">
                      {[v?.telPaiement && `N° ${v.telPaiement}`, v?.reference && `Réf. ${v.reference}`, v?.montantRecu != null && `Reçu ${fmt(v.montantRecu)} · rendu ${fmt(Math.max(0, v.montantRecu - c.total))}`].filter(Boolean).join(" · ") || "Aucun détail enregistré"}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Chronologie">
            <div className="comment-box">
              <Avatar name="Moi" size="sm" />
              <textarea className="textarea grow" rows={1} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Ajouter un commentaire…"
                onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addComment(); }} />
              <Btn onClick={addComment} disabled={!comment.trim()}>Publier</Btn>
            </div>
            <div className="timeline">
              {events.map((e, i) => (
                <div key={i} className={cx("tl-item", i === 0 && "first")} style={{ "--i": i }}>
                  <span className="tl-dot" />
                  {e.type === "note" ? (
                    <><div className="tl-title row"><MessageSquare size={13} /> Commentaire</div><div className="tl-note">{e.texte}</div></>
                  ) : e.type === "paiement" ? (
                    <div className="tl-title row"><Banknote size={13} /> {e.texte}</div>
                  ) : (
                    <div className="tl-title">{e.statut === "en_attente" && i === events.length - 1 ? `Commande passée par ${c.client?.nom || "un client"} · ${fmt(c.total)}` : `Commande ${STATUTS[e.statut]?.label.toLowerCase()}`}</div>
                  )}
                  <div className="tl-date">{fmtDateTime(e.date)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div>
          <Card title="Notes" actions={note == null && <button className="icon-btn" onClick={() => setNote(c.note || "")} aria-label="Modifier la note"><Pencil size={15} /></button>}>
            {note == null ? (
              <p className={c.note ? "" : "subtle"} style={{ whiteSpace: "pre-wrap" }}>{c.note || "Aucune note sur cette commande"}</p>
            ) : (
              <div className="stack-sm">
                <textarea className="textarea" autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder="Instructions de livraison, remarques…" />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Btn size="sm" onClick={() => setNote(null)}>Annuler</Btn>
                  <Btn size="sm" variant="primary" onClick={() => { patch(() => ({ note })); sync(["PATCH", `/api/commandes/${c.id}`, { note }]); setNote(null); toast({ title: "Note enregistrée" }); }}>Enregistrer</Btn>
                </div>
              </div>
            )}
          </Card>

          <Card title="Client">
            {c.client ? (
              <div className="stack-sm">
                <a href={`#/clients/${c.client.id}`} className="row" style={{ gap: 10, color: "inherit" }}>
                  <Avatar name={c.client.nom} />
                  <div className="grow"><div className="link">{c.client.nom}</div><div className="subtle">{cs.nb} commande{cs.nb > 1 ? "s" : ""}</div></div>
                  {c.client.statut === "VIP" && <Badge tone="warning" icon={Star}>VIP</Badge>}
                </a>
                <div className="pop-sep" style={{ margin: "8px 0" }} />
                <div className="label">Coordonnées</div>
                <div className="row muted"><Phone size={14} /><a href={`tel:${c.client.tel.replace(/\s/g, "")}`}>{c.client.tel}</a></div>
                {c.client.email && <div className="row muted"><Mail size={14} /><a href={`mailto:${c.client.email}`} className="truncate">{c.client.email}</a></div>}
              </div>
            ) : <p className="subtle">Client supprimé</p>}
          </Card>

          <Card title="Adresse de livraison" actions={<button className="icon-btn" onClick={() => { setAddr(c.adresseLivraison || ""); setAddrOpen(true); }} aria-label="Modifier l'adresse"><Pencil size={15} /></button>}>
            <div className="row" style={{ alignItems: "flex-start" }}>
              <MapPin size={16} className="muted" style={{ marginTop: 2 }} />
              <div>{c.client?.nom && <div className="strong">{c.client.nom}</div>}<div className={c.adresseLivraison ? "muted" : "subtle"}>{c.adresseLivraison || "Aucune adresse"}</div></div>
            </div>
          </Card>
        </div>
      </div>

      <TicketModal open={receipt} cmd={c} onClose={() => setReceipt(false)} />
      <EncaisserModal open={encaisser} cmd={c} onClose={() => setEncaisser(false)} />
      <Modal open={addrOpen} onClose={() => setAddrOpen(false)} title="Adresse de livraison" size="sm"
        footer={<><Btn onClick={() => setAddrOpen(false)}>Annuler</Btn><Btn variant="primary" onClick={() => { patch(() => ({ adresseLivraison: addr.trim() })); sync(["PATCH", `/api/commandes/${c.id}`, { adresse_livraison: addr.trim() }]); setAddrOpen(false); toast({ title: "Adresse mise à jour" }); }}>Enregistrer</Btn></>}>
        <Field label="Adresse"><textarea className="textarea" value={addr} onChange={(e) => setAddr(e.target.value)} placeholder="Quartier, rue, point de repère…" /></Field>
      </Modal>
    </>
  );
}

/* =====================================================================
   PAGE : Produits
   ===================================================================== */
/* Fiche produit en lecture seule (vendeur) */
function FicheProduitModal({ open, pack, onClose, onVendre }) {
  const elements = String(pack?.contenu || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  return (
    <Modal open={open} onClose={onClose} title={pack?.nom || "Produit"} size="md"
      footer={pack && <><Btn onClick={onClose}>Fermer</Btn><Btn variant="primary" icon={ShoppingCart} disabled={pack.stock <= 0 || pack.actif === false} onClick={() => onVendre(pack)}>Vendre ce produit</Btn></>}>
      {pack && (
        <div className="stack">
          <div className="row" style={{ gap: 14 }}>
            <Thumb pack={pack} size="xl" />
            <div className="grow stack-sm">
              <div className="row" style={{ gap: 8, flexWrap: "wrap" }}><span className="strong num" style={{ fontSize: 22 }}>{fmt(prixEffectif(pack))}</span>{promoActive(pack) && <><span className="prix-barre">{fmt(pack.prix)}</span><Badge tone="success">Promo</Badge></>}</div>
              {promoActive(pack) && pack.promoFin && <div className="subtle">Promotion jusqu'au {fmtDate(isoDate(new Date(pack.promoFin)))}</div>}
              <div><StockBadge stock={pack.stock} seuil={seuilDe(pack)} /> <span className="subtle">{pack.sku}</span></div>
            </div>
          </div>
          {pack.desc && <p className="muted">{pack.desc}</p>}
          {elements.length > 0 && (
            <div>
              <div className="label" style={{ marginBottom: 6 }}>Contenu du pack</div>
              <ul className="liste-contenu">{elements.map((x, i) => <li key={i}><Check size={14} />{x}</li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function PageProduits({ route }) {
  const { data, update, sync, go, toast, estAdmin, openSale } = useApp();
  const [tab, setTab] = useState(route.query.filtre || "tous");
  const [q, setQ] = useState("");
  const [view, setView] = useState(() => readJson("moncommerce-vue-produits") || "grille");
  const sort = useSort("nom", "asc");
  useEffect(() => { if (route.query.filtre) setTab(route.query.filtre); }, [route.query.filtre]);
  useEffect(() => writeJson("moncommerce-vue-produits", view), [view]);

  const modalId = route.id;
  const editing = modalId && modalId !== "nouveau" ? data.packs.find((p) => p.id === modalId) : null;
  const modalOpen = modalId === "nouveau" || !!editing;

  const vendus = useMemo(() => {
    const m = new Map();
    enrichVentes(data).filter(isValid).forEach((v) => m.set(v.packId, (m.get(v.packId) || 0) + v.qte));
    return m;
  }, [data]);

  const filters = {
    tous: () => true,
    actifs: (p) => p.actif !== false,
    brouillons: (p) => p.actif === false,
    faible: (p) => p.stock > 0 && p.stock <= seuilDe(p),
    promo: (p) => promoActive(p),
    rupture: (p) => p.stock <= 0,
  };
  const tabs = [
    { key: "tous", label: "Tous" }, { key: "actifs", label: "Actifs" }, { key: "brouillons", label: "Brouillons" },
    { key: "faible", label: "Stock faible" }, { key: "rupture", label: "Rupture" }, { key: "promo", label: "En promotion" },
  ].map((t) => ({ ...t, count: data.packs.filter(filters[t.key]).length }));

  const rows = sort.apply(
    data.packs.filter((p) => filters[tab](p) && norm(p.nom + " " + p.sku + " " + p.desc).includes(norm(q))),
    { nom: (p) => p.nom, prix: (p) => p.prix, stock: (p) => p.stock, vendus: (p) => vendus.get(p.id) || 0 },
  );

  const valeurStock = data.packs.reduce((s, p) => s + p.stock * p.prix, 0);
  const adjust = (p, delta) => {
    update((d) => ({ ...d, packs: d.packs.map((x) => (x.id === p.id ? { ...x, stock: Math.max(0, x.stock + delta) } : x)) }));
    sync(["PATCH", `/api/packs/${p.id}/stock`, { delta }]);
  };
  const exporter = () => {
    downloadFile(`produits-${isoDate(new Date())}.csv`, toCsv([["SKU", "Nom", "Prix (FCFA)", "Coût (FCFA)", "Stock", "Vendus", "Statut"], ...rows.map((p) => [p.sku, p.nom, p.prix, p.cout ?? "", p.stock, vendus.get(p.id) || 0, p.actif === false ? "Brouillon" : "Actif"])]), "text/csv;charset=utf-8");
    toast({ title: "Export terminé", desc: `${rows.length} produit(s)` });
  };

  return (
    <>
      <PageHeader title="Produits" meta={`${data.packs.length} produits · valeur du stock ${fmt(valeurStock)}`}
        actions={estAdmin && <><Btn icon={Download} onClick={exporter} className="hide-sm">Exporter</Btn><Btn variant="primary" icon={Plus} onClick={() => go("produits", "nouveau")}>Ajouter un produit</Btn></>} />
      {!estAdmin && <div className="banner banner-info" style={{ marginBottom: 16 }}><Info size={16} /><div>Catalogue en consultation : les prix, le contenu des packs et les stocks sont gérés par l'administrateur.</div></div>}

      <div className="card">
        <div className="table-toolbar">
          <Tabs tabs={tabs} value={tab} onChange={setTab} />
          <Segmented value={view} onChange={setView} options={[{ value: "grille", label: "", icon: LayoutGrid }, { value: "liste", label: "", icon: List }]} />
        </div>
        <div className="table-filters">
          <SearchInput value={q} onChange={setQ} placeholder="Rechercher un produit ou un SKU…" />
          <Select value={sort.sort.key + ":" + sort.sort.dir} onChange={(e) => { const [key, dir] = e.target.value.split(":"); sort.set({ key, dir }); }} style={{ width: 180 }} aria-label="Trier">
            <option value="nom:asc">Nom A → Z</option>
            <option value="nom:desc">Nom Z → A</option>
            <option value="prix:desc">Prix décroissant</option>
            <option value="prix:asc">Prix croissant</option>
            <option value="stock:asc">Stock croissant</option>
            <option value="vendus:desc">Plus vendus</option>
          </Select>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={Tag} title={q || tab !== "tous" ? "Aucun produit trouvé" : "Ajoutez votre premier produit"}
            action={!q && tab === "tous" && estAdmin && <Btn variant="primary" icon={Plus} onClick={() => go("produits", "nouveau")}>Ajouter un produit</Btn>}>
            {q || tab !== "tous" ? "Essayez un autre filtre ou une autre recherche." : "Créez vos packs pour commencer à vendre."}
          </EmptyState>
        ) : view === "grille" ? (
          <div className="product-grid" key={tab + q}>
            {rows.map((p, i) => (
              <div key={p.id} className="product-card" style={{ "--i": i }} role="button" tabIndex={0} onClick={() => go("produits", p.id)} onKeyDown={(e) => e.key === "Enter" && go("produits", p.id)}>
                <div className="pc-media"><Thumb pack={p} size="xl" /></div>
                <div className="pc-badge">{p.actif === false ? <Badge tone="neutral">Brouillon</Badge> : <StockBadge stock={p.stock} seuil={seuilDe(p)} />}</div>
                {promoActive(p) && <div className="pc-promo">−{Math.round((1 - p.prixPromo / p.prix) * 100)} %</div>}
                {estAdmin && <div className="pc-actions" onClick={(e) => e.stopPropagation()}>
                  <button className="icon-btn" aria-label="Retirer 1 du stock" onClick={() => adjust(p, -1)}><Minus size={14} /></button>
                  <button className="icon-btn" aria-label="Ajouter 1 au stock" onClick={() => adjust(p, 1)}><Plus size={14} /></button>
                </div>}
                <div className="pc-body">
                  <div className="pc-name truncate">{p.nom}</div>
                  <div className="pc-desc">{p.desc || <span className="subtle">Pas de description</span>}</div>
                  <div className="row-between"><span className="pc-price">{fmt(prixEffectif(p))}{promoActive(p) && <span className="prix-barre">{fmt(p.prix)}</span>}</span><span className="subtle">{vendus.get(p.id) || 0} vendus</span></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <SortTh label="Produit" k="nom" sort={sort} onSort={sort.toggle} />
                  <th className="hide-sm">Statut</th>
                  <SortTh label="Stock" k="stock" sort={sort} onSort={sort.toggle} />
                  <SortTh label="Vendus" k="vendus" sort={sort} onSort={sort.toggle} className="hide-sm right" />
                  <SortTh label="Prix" k="prix" sort={sort} onSort={sort.toggle} className="right" />
                </tr>
              </thead>
              <tbody key={tab + q}>
                {rows.map((p, i) => (
                  <tr key={p.id} className="clickable" style={{ "--i": i }} onClick={() => go("produits", p.id)}>
                    <td className="wrap"><div className="cell-product"><Thumb pack={p} size="sm" /><div><div className="cell-main">{p.nom}</div><div className="cell-sub">{p.sku}</div></div></div></td>
                    <td className="hide-sm">{p.actif === false ? <Badge>Brouillon</Badge> : <Badge tone="success">Actif</Badge>}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="row"><StockBadge stock={p.stock} seuil={seuilDe(p)} />{estAdmin && <span className="hide-sm row" style={{ gap: 2 }}><button className="icon-btn" onClick={() => adjust(p, -1)} aria-label="Retirer 1"><Minus size={13} /></button><button className="icon-btn" onClick={() => adjust(p, 1)} aria-label="Ajouter 1"><Plus size={13} /></button></span>}</div>
                    </td>
                    <td className="hide-sm right num">{vendus.get(p.id) || 0}</td>
                    <td className="right num strong">{fmt(prixEffectif(p))}{promoActive(p) && <div className="prix-barre">{fmt(p.prix)}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {estAdmin
        ? <ProductModal open={modalOpen} pack={editing} onClose={() => go("produits")} />
        : <FicheProduitModal open={!!editing} pack={editing} onClose={() => go("produits")} onVendre={(p) => { go("produits"); openSale({ packId: p.id }); }} />}
    </>
  );
}

/* =====================================================================
   PAGE : Clients (liste)
   ===================================================================== */
function PageClients({ route }) {
  const { data, go, toast } = useApp();
  const [tab, setTab] = useState("tous");
  const [q, setQ] = useState("");
  const sort = useSort("total");
  const stats = useMemo(() => {
    const m = new Map();
    enrichVentes(data).forEach((v) => {
      const o = m.get(v.clientId) || { nb: 0, total: 0, last: "" };
      o.nb += 1;
      if (isValid(v)) o.total += v.total;
      const s = venteStamp(v);
      if (s > o.last) o.last = s;
      m.set(v.clientId, o);
    });
    return m;
  }, [data]);
  const st = (id) => stats.get(id) || { nb: 0, total: 0, last: "" };

  const rows = sort.apply(
    data.clients.filter((c) => (tab === "tous" || (tab === "abonnes" ? c.consentement : c.statut === tab)) && norm(c.nom + " " + c.tel + " " + c.ville + " " + c.email).includes(norm(q))),
    { nom: (c) => c.nom, total: (c) => st(c.id).total, nb: (c) => st(c.id).nb, date: (c) => c.dateAjout || "" },
  );
  const pg = usePaged(rows, 15, tab + q + sort.sort.key + sort.sort.dir);

  const T0 = today();
  const nouveaux = data.clients.filter((c) => c.dateAjout && daysBetween(parseDate(c.dateAjout), T0) < 30).length;
  const acheteurs = data.clients.filter((c) => st(c.id).nb > 0);
  const moyenne = acheteurs.length ? acheteurs.reduce((s, c) => s + st(c.id).total, 0) / acheteurs.length : 0;
  const recurrents = data.clients.filter((c) => st(c.id).nb > 1).length;

  const exporter = () => {
    downloadFile(`clients-${isoDate(new Date())}.csv`, toCsv([["Nom", "Téléphone", "E-mail", "Ville", "Statut", "Commandes", "Total dépensé (FCFA)", "Client depuis"], ...rows.map((c) => [c.nom, c.tel, c.email, c.ville, c.statut, st(c.id).nb, st(c.id).total, c.dateAjout])]), "text/csv;charset=utf-8");
    toast({ title: "Export terminé", desc: `${rows.length} client(s)` });
  };

  return (
    <>
      <PageHeader title="Clients" actions={<><Btn icon={Download} onClick={exporter} className="hide-sm">Exporter</Btn><Btn variant="primary" icon={UserPlus} onClick={() => go("clients", "nouveau")}>Ajouter un client</Btn></>} />
      <div className="card stat-strip stagger">
        {[
          { label: "Clients", value: data.clients.length, f: fmtNum },
          { label: "Nouveaux (30 j)", value: nouveaux, f: fmtNum },
          { label: "Clients récurrents", value: recurrents, f: fmtNum },
          { label: "Dépense moyenne", value: moyenne, f: fmt },
        ].map((s, i) => <div key={s.label} style={{ "--i": i }}><div className="label">{s.label}</div><div className="value"><CountUp value={s.value} format={s.f} /></div></div>)}
      </div>
      <div className="card">
        <div className="table-toolbar">
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: "tous", label: "Tous", count: data.clients.length },
            { key: "VIP", label: "VIP", count: data.clients.filter((c) => c.statut === "VIP").length },
            { key: "Standard", label: "Standard", count: data.clients.filter((c) => c.statut !== "VIP").length },
            { key: "abonnes", label: "Abonnés marketing", count: data.clients.filter((c) => c.consentement).length },
          ]} />
        </div>
        <div className="table-filters"><SearchInput value={q} onChange={setQ} placeholder="Rechercher par nom, téléphone, ville…" /></div>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="Aucun client trouvé" action={!q && <Btn variant="primary" icon={UserPlus} onClick={() => go("clients", "nouveau")}>Ajouter un client</Btn>}>
            {q ? "Essayez une autre recherche." : "Ajoutez vos clients pour suivre leurs achats."}
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <SortTh label="Client" k="nom" sort={sort} onSort={sort.toggle} />
                  <th className="hide-md">Ville</th>
                  <SortTh label="Commandes" k="nb" sort={sort} onSort={sort.toggle} className="hide-sm right" />
                  <SortTh label="Dépensé" k="total" sort={sort} onSort={sort.toggle} className="right" />
                  <th className="hide-sm">Statut</th>
                  <SortTh label="Client depuis" k="date" sort={sort} onSort={sort.toggle} className="hide-md" />
                </tr>
              </thead>
              <tbody key={tab + pg.page}>
                {pg.slice.map((c, i) => (
                  <tr key={c.id} className="clickable" style={{ "--i": i }} tabIndex={0} onClick={() => go("clients", c.id)} onKeyDown={(e) => e.key === "Enter" && go("clients", c.id)}>
                    <td><div className="cell-product"><Avatar name={c.nom} /><div><div className="cell-main">{c.nom}</div><div className="cell-sub">{c.tel}</div></div></div></td>
                    <td className="hide-md muted">{c.ville || "—"}</td>
                    <td className="hide-sm right num">{st(c.id).nb}</td>
                    <td className="right num strong">{fmt(st(c.id).total)}</td>
                    <td className="hide-sm"><span className="row" style={{ gap: 4 }}>{c.statut === "VIP" ? <Badge tone="warning" icon={Star}>VIP</Badge> : <Badge>Standard</Badge>}{c.consentement && <Badge tone="info" icon={Megaphone}>Abonné</Badge>}</span></td>
                    <td className="hide-md muted">{c.dateAjout ? fmtDate(c.dateAjout) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager pg={pg} />
      </div>
      <ClientModal open={route.id === "nouveau"} onClose={() => go("clients")} />
    </>
  );
}

/* =====================================================================
   PAGE : Client (détail)
   ===================================================================== */
function PageClient({ id }) {
  const { data, update, sync, go, toast, confirm, openSale, estAdmin } = useApp();
  const [edit, setEdit] = useState(false);
  const [notes, setNotes] = useState(null);
  const client = data.clients.find((c) => c.id === id);
  const s = useMemo(() => (client ? clientStats(data, client.id) : null), [data, id]);
  if (!client) {
    return <><PageHeader title="Client introuvable" back={() => go("clients")} /><Card><EmptyState icon={Users} title="Ce client n'existe pas" action={<Btn variant="primary" onClick={() => go("clients")}>Retour aux clients</Btn>}>Il a peut-être été supprimé.</EmptyState></Card></>;
  }
  const cmds = enrichCommandes(data).filter((c) => c.vente?.clientId === client.id).sort((a, b) => b.stamp.localeCompare(a.stamp));
  const remove = async () => {
    const ok = await confirm({ title: `Supprimer ${client.nom} ?`, message: s.nb ? `Ce client a ${s.nb} commande(s). Elles seront conservées, sans client associé.` : "Cette action est définitive.", confirmLabel: "Supprimer le client", tone: "critical" });
    if (!ok) return;
    update((d) => ({ ...d, clients: d.clients.filter((c) => c.id !== client.id) }));
    sync(["DELETE", `/api/clients/${client.id}`]);
    go("clients");
    toast({ title: "Client supprimé", desc: client.nom });
  };
  const toggleVip = () => {
    const statut = client.statut === "VIP" ? "Standard" : "VIP";
    update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === client.id ? { ...c, statut } : c)) }));
    sync(["PUT", `/api/clients/${client.id}`, { statut }]);
    toast({ title: statut === "VIP" ? `${client.nom} est maintenant VIP ⭐` : `${client.nom} repasse en Standard` });
  };

  return (
    <>
      <PageHeader back={() => go("clients")} title={client.nom}
        badges={client.statut === "VIP" && <Badge tone="warning" icon={Star}>VIP</Badge>}
        meta={`${client.ville ? client.ville + " · " : ""}Client depuis ${client.dateAjout ? fmtDate(client.dateAjout) : "—"}`}
        actions={<>
          <Btn icon={Pencil} onClick={() => setEdit(true)}>Modifier</Btn>
          <MoreMenu items={[
            { label: client.statut === "VIP" ? "Retirer le statut VIP" : "Passer en VIP", icon: Star, onClick: toggleVip },
            ...(estAdmin ? ["sep", { label: "Supprimer le client", icon: Trash2, tone: "critical", onClick: remove }] : []),
          ]} />
          <Btn variant="primary" icon={Plus} onClick={() => openSale({ clientId: client.id })}>Nouvelle vente</Btn>
        </>} />

      <div className="layout-detail">
        <div>
          <div className="card stat-strip stagger" style={{ marginBottom: 0 }}>
            {[
              { label: "Total dépensé", value: s.total, f: fmt },
              { label: "Commandes", value: s.nb, f: fmtNum },
              { label: "Panier moyen", value: s.panier, f: fmt },
            ].map((x, i) => <div key={x.label} style={{ "--i": i }}><div className="label">{x.label}</div><div className="value"><CountUp value={x.value} format={x.f} /></div></div>)}
            <div style={{ "--i": 3 }}><div className="label">Dernière commande</div><div className="value" style={{ fontSize: 15, paddingTop: 3 }}>{s.last ? relDay(s.last.slice(0, 10)) : "—"}</div></div>
          </div>

          <Card title="Commandes" sub={cmds.length ? `${cmds.length} commande${cmds.length > 1 ? "s" : ""}` : null} padded={false}>
            {cmds.length === 0 ? (
              <EmptyState icon={ShoppingCart} title="Aucune commande" action={<Btn variant="primary" icon={Plus} onClick={() => openSale({ clientId: client.id })}>Créer une vente</Btn>}>Ce client n'a pas encore acheté.</EmptyState>
            ) : (
              <div className="list" style={{ marginTop: 8 }}>
                {cmds.map((c, i) => (
                  <a key={c.id} href={`#/commandes/${c.id}`} className="list-item" style={{ animation: `rowIn .35s ${i * 30}ms var(--ease-out) both` }}>
                    <Thumb pack={c.pack} size="sm" />
                    <div className="grow">
                      <div className="row-between"><span><span className="strong">{c.numero}</span> <span className="subtle">· {resumeCommande(c)}</span></span><span className="num strong">{fmt(c.total)}</span></div>
                      <div className="row-between"><span className="subtle">{fmtDateTime(c.stamp)} · {c.vente?.paiement}</span><StatutBadge statut={c.statut} /></div>
                    </div>
                  </a>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div>
          <Card title="Coordonnées" actions={<button className="icon-btn" onClick={() => setEdit(true)} aria-label="Modifier"><Pencil size={15} /></button>}>
            <div className="row" style={{ gap: 12, marginBottom: 14 }}>
              <Avatar name={client.nom} size="lg" />
              <div><div className="strong">{client.nom}</div><div className="subtle">{client.statut}</div></div>
            </div>
            <div className="stack-sm">
              <div className="row muted"><Phone size={14} /><a href={`tel:${client.tel.replace(/\s/g, "")}`}>{client.tel}</a></div>
              {client.email ? <div className="row muted"><Mail size={14} /><a href={`mailto:${client.email}`} className="truncate">{client.email}</a></div> : <div className="row subtle"><Mail size={14} />Pas d'e-mail</div>}
              <div className="row muted"><MapPin size={14} />{client.ville || <span className="subtle">Pas d'adresse</span>}</div>
              <div className="row muted"><Megaphone size={14} />{client.consentement ? "Abonné aux promotions et nouveautés" : <span className="subtle">Non abonné aux messages marketing</span>}</div>
            </div>
          </Card>
          <Card title="Notes" actions={notes == null && <button className="icon-btn" onClick={() => setNotes(client.notes || "")} aria-label="Modifier les notes"><Pencil size={15} /></button>}>
            {notes == null ? (
              <p className={client.notes ? "" : "subtle"} style={{ whiteSpace: "pre-wrap" }}>{client.notes || "Aucune note"}</p>
            ) : (
              <div className="stack-sm">
                <textarea className="textarea" autoFocus value={notes} onChange={(e) => setNotes(e.target.value)} />
                <div className="row" style={{ justifyContent: "flex-end" }}>
                  <Btn size="sm" onClick={() => setNotes(null)}>Annuler</Btn>
                  <Btn size="sm" variant="primary" onClick={() => { update((d) => ({ ...d, clients: d.clients.map((c) => (c.id === client.id ? { ...c, notes } : c)) })); sync(["PUT", `/api/clients/${client.id}`, { notes }]); setNotes(null); toast({ title: "Notes enregistrées" }); }}>Enregistrer</Btn>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
      <ClientModal open={edit} client={client} onClose={() => setEdit(false)} />
    </>
  );
}

/* =====================================================================
   PAGE : Ventes (journal des transactions)
   ===================================================================== */
function PageVentes() {
  const { route } = useApp();
  const { data, go, toast, openSale } = useApp();
  const [q, setQ] = useState("");
  const [pay, setPay] = useState(route.query.paiement || "");
  useEffect(() => { if (route.query.paiement) setPay(route.query.paiement); }, [route.query.paiement]);
  const [period, setPeriod] = useState(30);
  const sort = useSort("date");
  const T0 = today();
  const all = useMemo(() => enrichVentes(data), [data]);
  const rows = sort.apply(
    all.filter((v) => (!pay || (pay === "en_attente" ? v.statutPaiement !== "payee" : v.paiement === pay && v.statutPaiement === "payee")) && (!period || daysBetween(parseDate(v.date), T0) < period) && norm(`${v.client?.nom} ${v.pack?.nom} ${v.commande?.numero}`).includes(norm(q))),
    { date: venteStamp, total: (v) => v.total, client: (v) => v.client?.nom || "", qte: (v) => v.qte },
  );
  const valid = rows.filter(isValid);
  const total = valid.reduce((s, v) => s + v.total, 0);
  const articles = valid.reduce((s, v) => s + v.qte, 0);
  const pg = usePaged(rows, 20, q + pay + period + sort.sort.key + sort.sort.dir);

  const exporter = () => {
    downloadFile(`ventes-${isoDate(new Date())}.csv`, toCsv([["Date", "Heure", "Commande", "Client", "Produit", "Quantité", "Prix unitaire", "Montant", "Paiement", "Statut", "Statut paiement", "Référence", "N° payeur", "Montant reçu"], ...rows.map((v) => [v.date, v.heure || "", v.commande?.numero || "", v.client?.nom || "", v.pack?.nom || "", v.qte, v.prixUnitaire, v.total, v.paiement, STATUTS[v.commande?.statut]?.label || "", v.statutPaiement === "en_attente" ? "En attente" : "Payé", v.reference || "", v.telPaiement || "", v.montantRecu ?? ""])]), "text/csv;charset=utf-8");
    toast({ title: "Export terminé", desc: `${rows.length} vente(s)` });
  };

  return (
    <>
      <PageHeader title="Ventes" meta="Journal détaillé de toutes les transactions"
        actions={<><Btn icon={Download} onClick={exporter}>Exporter</Btn><Btn variant="primary" icon={Plus} onClick={() => openSale()}>Nouvelle vente</Btn></>} />
      <div className="card stat-strip stagger">
        {[
          { label: "Montant encaissé", value: total, f: fmt },
          { label: "Transactions", value: valid.length, f: fmtNum },
          { label: "Articles vendus", value: articles, f: fmtNum },
          { label: "Panier moyen", value: valid.length ? total / valid.length : 0, f: fmt },
        ].map((s, i) => <div key={s.label} style={{ "--i": i }}><div className="label">{s.label}</div><div className="value"><CountUp value={s.value} format={s.f} /></div></div>)}
      </div>
      <div className="card">
        <div className="table-filters">
          <SearchInput value={q} onChange={setQ} placeholder="Client, produit, n° de commande…" />
          <Select value={pay} onChange={(e) => setPay(e.target.value)} style={{ width: 170 }} aria-label="Moyen de paiement">
            <option value="">Tous paiements</option>
            {PAIEMENTS.filter((p) => p.type !== "livraison").map((p) => <option key={p.key}>{p.key}</option>)}
            <option value="en_attente">Paiement en attente</option>
          </Select>
          <Select value={period} onChange={(e) => setPeriod(Number(e.target.value))} style={{ width: 150 }} aria-label="Période">
            <option value={7}>7 derniers jours</option>
            <option value={30}>30 derniers jours</option>
            <option value={90}>90 derniers jours</option>
            <option value={0}>Toute la période</option>
          </Select>
        </div>
        {rows.length === 0 ? <EmptyState icon={Receipt} title="Aucune vente sur cette période">Modifiez les filtres ou enregistrez une nouvelle vente.</EmptyState> : (
          <div className="table-scroll">
            <table className="table">
              <thead>
                <tr>
                  <SortTh label="Date" k="date" sort={sort} onSort={sort.toggle} />
                  <th className="hide-md">Commande</th>
                  <SortTh label="Client" k="client" sort={sort} onSort={sort.toggle} className="hide-sm" />
                  <th>Produit</th>
                  <SortTh label="Qté" k="qte" sort={sort} onSort={sort.toggle} className="right hide-sm" />
                  <th className="hide-md">Paiement</th>
                  <SortTh label="Montant" k="total" sort={sort} onSort={sort.toggle} className="right" />
                </tr>
              </thead>
              <tbody key={pg.page + pay + period}>
                {pg.slice.map((v, i) => {
                  const off = !isValid(v);
                  return (
                    <tr key={v.id} className="clickable" style={{ "--i": i, opacity: off ? 0.55 : 1 }} onClick={() => v.commande && go("commandes", v.commande.id)}>
                      <td><div className="cell-main" style={{ fontWeight: 500 }}>{fmtDateCourt(v.date)}</div><div className="cell-sub">{v.heure || ""}</div></td>
                      <td className="hide-md">{v.commande?.numero || "—"}</td>
                      <td className="hide-sm">{v.client?.nom || <span className="subtle">—</span>}</td>
                      <td className="wrap"><div className="cell-product"><Thumb pack={v.pack} size="sm" /><span>{v.pack?.nom || "Produit supprimé"}</span></div></td>
                      <td className="right num hide-sm">{v.qte}</td>
                      <td className="hide-md"><span className="row"><ModePaiement mode={v.statutPaiement === "en_attente" ? "Paiement à la livraison" : v.paiement} taille={20} />{v.statutPaiement !== "payee" ? <Badge tone="warning">{{ a_verifier: "À vérifier", en_cours: "En cours", echoue: "Échoué" }[v.statutPaiement] || "En attente"}</Badge> : infoPaiement(v.paiement).court}</span></td>
                      <td className="right num strong" style={{ textDecoration: off ? "line-through" : "none" }}>{fmt(v.total)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td colSpan={2} className="hide-md" /><td className="hide-sm" /><td className="wrap">Total · {valid.length} ventes</td><td className="right num hide-sm">{articles}</td><td className="hide-md" /><td className="right num">{fmt(total)}</td></tr>
              </tfoot>
            </table>
          </div>
        )}
        <Pager pg={pg} />
      </div>
    </>
  );
}

/* Page réservée à l'administrateur */
const AccesReserve = () => {
  const { go } = useApp();
  return <Card><EmptyState icon={Lock} title="Accès réservé à l'administrateur" action={<Btn variant="primary" onClick={() => go("accueil")}>Retour à l'accueil</Btn>}>Votre compte vendeur ne donne pas accès à cette page.</EmptyState></Card>;
};

/* =====================================================================
   PAGE : Stocks (administrateur) — réceptions, sorties, inventaire, journal
   ===================================================================== */
const MOTIFS_STOCK = {
  vente: { label: "Vente en caisse", tone: "info" }, vente_en_ligne: { label: "Vente en ligne", tone: "magic" },
  annulation: { label: "Annulation", tone: "neutral" }, retablissement: { label: "Rétablissement", tone: "neutral" },
  suppression: { label: "Suppression de vente", tone: "neutral" }, reception: { label: "Réception", tone: "success" },
  inventaire: { label: "Inventaire", tone: "warning" }, casse: { label: "Casse / perte", tone: "critical" },
  retour: { label: "Retour", tone: "success" }, ajustement: { label: "Ajustement", tone: "warning" }, stock_initial: { label: "Stock initial", tone: "neutral" },
};

function ReceptionModal({ open, packId, onClose }) {
  const { data, update, sync, toast } = useApp();
  const [f, setF] = useState({});
  const [err, setErr] = useState({});
  const packs = data.packs.filter((p) => p.actif !== false || p.id === packId);
  useEffect(() => {
    if (!open) return;
    const p = data.packs.find((x) => x.id === packId) || packs[0];
    setF({ packId: p?.id || "", quantite: "", cout: p?.cout != null ? String(p.cout) : "", fournisseur: "", depense: true });
    setErr({});
  }, [open, packId]);
  const pack = data.packs.find((p) => p.id === f.packId);
  const q = Number(f.quantite) || 0, cout = f.cout === "" ? null : Number(f.cout);
  const set = (k, v) => { setF((s) => ({ ...s, [k]: v, ...(k === "packId" ? { cout: data.packs.find((p) => p.id === v)?.cout != null ? String(data.packs.find((p) => p.id === v).cout) : "" } : {}) })); setErr({}); };
  const valider = () => {
    const e = {};
    if (!pack) e.packId = "Choisissez un produit.";
    if (!(q > 0)) e.quantite = "Indiquez la quantité reçue.";
    setErr(e);
    if (Object.keys(e).length) return;
    const fournisseur = f.fournisseur.trim();
    const depense = f.depense && cout > 0 ? { id: uid(), libelle: `Achat de stock — ${pack.nom} ×${q}${fournisseur ? " (" + fournisseur + ")" : ""}`, categorie: "Stock", montant: q * cout, date: isoDate(new Date()) } : null;
    update((d) => ({
      ...d,
      packs: d.packs.map((p) => (p.id === pack.id ? { ...p, stock: p.stock + q, cout: cout ?? p.cout } : p)),
      investissements: depense ? [depense, ...d.investissements] : d.investissements,
    }));
    sync(["POST", "/api/stocks/reception", { pack_id: pack.id, quantite: q, cout_unitaire: cout, fournisseur, creer_depense: !!depense }]);
    toast({ title: `+${q} ${pack.nom}`, desc: depense ? `Dépense de ${fmt(depense.montant)} enregistrée (Stock)` : "Réception enregistrée" });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Réception de marchandise" size="md"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" icon={PackagePlus} onClick={valider}>Enregistrer la réception</Btn></>}>
      <div className="form-grid">
        <Field label="Produit" error={err.packId} className="full">
          <Select value={f.packId || ""} onChange={(e) => set("packId", e.target.value)}>{packs.map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.stock} en stock</option>)}</Select>
        </Field>
        <Field label="Quantité reçue" error={err.quantite}><Input value={f.quantite || ""} onChange={(e) => set("quantite", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" suffix="unités" placeholder="0" data-autofocus /></Field>
        <Field label="Coût d'achat unitaire" optional help="Met à jour le coût du produit (calcul des marges)."><Input value={f.cout || ""} onChange={(e) => set("cout", e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" suffix="FCFA" placeholder="0" /></Field>
        <Field label="Fournisseur" optional className="full"><Input value={f.fournisseur || ""} onChange={(e) => set("fournisseur", e.target.value)} placeholder="Ex : Grossiste Adjamé" /></Field>
        <div className="full"><Checkbox checked={f.depense} onChange={(v) => set("depense", v)} label={`Enregistrer l'achat dans les dépenses${q && cout ? ` (${fmt(q * cout)})` : ""}`} /></div>
        {pack && q > 0 && <div className="full banner banner-success"><PackagePlus size={16} /><div>Stock de <b>{pack.nom}</b> : {pack.stock} → <b>{pack.stock + q}</b></div></div>}
      </div>
    </Modal>
  );
}

function SortieModal({ open, packId, onClose }) {
  const { data, update, sync, toast } = useApp();
  const [f, setF] = useState({});
  const [err, setErr] = useState("");
  useEffect(() => { if (open) { setF({ packId: packId || data.packs[0]?.id || "", quantite: "", motif: "casse", note: "" }); setErr(""); } }, [open, packId]);
  const pack = data.packs.find((p) => p.id === f.packId);
  const q = Number(f.quantite) || 0;
  const valider = () => {
    if (!pack) return setErr("Choisissez un produit.");
    if (!(q > 0)) return setErr("Indiquez la quantité.");
    if (q > pack.stock) return setErr(`Stock insuffisant (${pack.stock} en stock).`);
    update((d) => ({ ...d, packs: d.packs.map((p) => (p.id === pack.id ? { ...p, stock: p.stock - q } : p)) }));
    sync(["POST", "/api/stocks/sortie", { pack_id: pack.id, quantite: q, motif: f.motif, note: f.note.trim() }]);
    toast({ title: `−${q} ${pack.nom}`, desc: MOTIFS_STOCK[f.motif].label });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Sortie de stock" size="md"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="critical" icon={PackageMinus} onClick={valider}>Retirer du stock</Btn></>}>
      <div className="form-grid">
        <Field label="Produit" className="full"><Select value={f.packId || ""} onChange={(e) => setF({ ...f, packId: e.target.value })}>{data.packs.map((p) => <option key={p.id} value={p.id}>{p.nom} — {p.stock} en stock</option>)}</Select></Field>
        <Field label="Quantité" error={err}><Input value={f.quantite || ""} onChange={(e) => { setF({ ...f, quantite: e.target.value.replace(/[^\d]/g, "") }); setErr(""); }} inputMode="numeric" suffix="unités" placeholder="0" data-autofocus /></Field>
        <Field label="Motif"><Select value={f.motif || "casse"} onChange={(e) => setF({ ...f, motif: e.target.value })}><option value="casse">Casse / perte / vol</option><option value="ajustement">Ajustement (usage interne, cadeau…)</option></Select></Field>
        <Field label="Commentaire" optional className="full"><Input value={f.note || ""} onChange={(e) => setF({ ...f, note: e.target.value })} placeholder="Ex : carton abîmé à la livraison" /></Field>
      </div>
    </Modal>
  );
}

function InventaireModal({ open, onClose }) {
  const { data, update, sync, toast } = useApp();
  const [reel, setReel] = useState({});
  useEffect(() => { if (open) setReel(Object.fromEntries(data.packs.map((p) => [p.id, String(p.stock)]))); }, [open]);
  const ecarts = data.packs.map((p) => ({ p, apres: reel[p.id] === "" || reel[p.id] == null ? p.stock : Number(reel[p.id]) })).filter((x) => x.apres !== x.p.stock);
  const valider = () => {
    if (!ecarts.length) { onClose(); return; }
    const m = new Map(ecarts.map((x) => [x.p.id, x.apres]));
    update((d) => ({ ...d, packs: d.packs.map((p) => (m.has(p.id) ? { ...p, stock: m.get(p.id) } : p)) }));
    sync(["POST", "/api/stocks/inventaire", { lignes: ecarts.map((x) => ({ pack_id: x.p.id, stock_reel: x.apres })) }]);
    toast({ title: "Inventaire enregistré", desc: `${ecarts.length} écart${ecarts.length > 1 ? "s" : ""} corrigé${ecarts.length > 1 ? "s" : ""}` });
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} title="Inventaire (comptage physique)" size="lg"
      footer={<><span className="subtle spacer">{ecarts.length ? `${ecarts.length} écart(s) à corriger` : "Aucun écart"}</span><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" icon={ClipboardList} onClick={valider}>Valider l'inventaire</Btn></>}>
      <p className="subtle" style={{ marginBottom: 12 }}>Saisissez la quantité réellement comptée en boutique. Les écarts sont corrigés et tracés dans le journal des mouvements.</p>
      <div className="table-scroll">
        <table className="table">
          <thead><tr><th>Produit</th><th className="right">Théorique</th><th style={{ width: 130 }}>Compté</th><th className="right">Écart</th></tr></thead>
          <tbody>
            {data.packs.map((p) => {
              const v = reel[p.id] ?? "";
              const d = v === "" ? 0 : Number(v) - p.stock;
              return (
                <tr key={p.id}>
                  <td><div className="cell-product"><Thumb pack={p} size="sm" /><div className="cell-main">{p.nom}</div></div></td>
                  <td className="right num">{p.stock}</td>
                  <td><Input value={v} onChange={(e) => setReel((r) => ({ ...r, [p.id]: e.target.value.replace(/[^\d]/g, "") }))} inputMode="numeric" /></td>
                  <td className="right num strong" style={{ color: d > 0 ? "var(--success-dot)" : d < 0 ? "var(--critical-solid)" : undefined }}>{d > 0 ? "+" + d : d || "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

function PageStocks({ route }) {
  const { data, mode, go } = useApp();
  const [q, setQ] = useState("");
  const [tab, setTab] = useState("tous");
  const [modal, setModal] = useState(route.id === "reception" ? { type: "reception" } : null);
  const [mvts, setMvts] = useState(null);
  const [mvtPack, setMvtPack] = useState("");
  const signature = data.packs.map((p) => p.id + ":" + p.stock).join(",");

  useEffect(() => {
    if (mode !== "api") return;
    let actif = true;
    const t = setTimeout(() => apiFetch("GET", `/api/stocks/mouvements?limite=150${mvtPack ? "&pack_id=" + encodeURIComponent(mvtPack) : ""}`)
      .then((r) => actif && setMvts(r)).catch(() => actif && setMvts([])), 600);
    return () => { actif = false; clearTimeout(t); };
  }, [mode, mvtPack, signature]);

  const vendus30 = useMemo(() => {
    const depuis = isoDate(addDays(today(), -30));
    const m = new Map();
    enrichVentes(data).filter((v) => isValid(v) && v.date >= depuis).forEach((v) => m.set(v.packId, (m.get(v.packId) || 0) + v.qte));
    return m;
  }, [data]);

  const filtres = { tous: () => true, alerte: (p) => p.stock > 0 && p.stock <= seuilDe(p), rupture: (p) => p.stock <= 0, brouillons: (p) => p.actif === false };
  const rows = data.packs.filter((p) => filtres[tab](p) && norm(p.nom + " " + p.sku).includes(norm(q))).sort((a, b) => (a.stock - seuilDe(a)) - (b.stock - seuilDe(b)));
  const unites = data.packs.reduce((s, p) => s + p.stock, 0);
  const valeurAchat = data.packs.reduce((s, p) => s + p.stock * (p.cout || 0), 0);
  const valeurVente = data.packs.reduce((s, p) => s + p.stock * prixEffectif(p), 0);
  const alertes = data.packs.filter((p) => p.actif !== false && p.stock <= seuilDe(p)).length;
  const couverture = (p) => { const v = vendus30.get(p.id) || 0; return v ? Math.floor(p.stock / (v / 30)) : null; };

  const kpis = [
    { label: "Unités en stock", value: unites, f: fmtNum, icon: Boxes, tint: 4 },
    { label: "Valeur au prix d'achat", value: valeurAchat, f: fmt, icon: Wallet, tint: 3 },
    { label: "Valeur au prix de vente", value: valeurVente, f: fmt, icon: TrendingUp, tint: 0 },
    { label: "Produits en alerte", value: alertes, f: fmtNum, icon: AlertTriangle, tint: alertes ? 3 : 0, color: alertes ? "var(--critical-solid)" : undefined },
  ];

  return (
    <>
      <PageHeader title="Stocks" meta="Contrôle complet de l'inventaire : entrées, sorties, comptages et historique"
        actions={<>
          <Btn icon={ClipboardList} onClick={() => setModal({ type: "inventaire" })} className="hide-sm">Inventaire</Btn>
          <Btn icon={PackageMinus} onClick={() => setModal({ type: "sortie" })}>Sortie</Btn>
          <Btn variant="primary" icon={PackagePlus} onClick={() => setModal({ type: "reception" })}>Réception</Btn>
        </>} />
      <div className="kpi-grid stagger">
        {kpis.map((k, i) => (
          <div className="card kpi" key={k.label} style={{ "--i": i }}>
            <div className="kpi-label"><span className={cx("kpi-dot", `tint-${k.tint}`)}><k.icon size={13} /></span>{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}><CountUp value={k.value} format={k.f} /></div>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="table-toolbar">
          <Tabs value={tab} onChange={setTab} tabs={[
            { key: "tous", label: "Tous", count: data.packs.length },
            { key: "alerte", label: "Stock faible", count: data.packs.filter(filtres.alerte).length },
            { key: "rupture", label: "Rupture", count: data.packs.filter(filtres.rupture).length },
            { key: "brouillons", label: "Brouillons", count: data.packs.filter(filtres.brouillons).length },
          ]} />
        </div>
        <div className="table-filters"><SearchInput value={q} onChange={setQ} placeholder="Rechercher un produit…" /></div>
        {rows.length === 0 ? <EmptyState icon={Boxes} title="Aucun produit">Essayez un autre filtre.</EmptyState> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Produit</th><th>Stock</th><th className="hide-sm right">Seuil</th><th className="hide-sm right">Vendus 30 j</th><th className="hide-md right">Couverture</th><th className="hide-md right">Valeur (achat)</th><th style={{ width: 96 }} /></tr></thead>
              <tbody key={tab + q}>
                {rows.map((p, i) => {
                  const c = couverture(p);
                  return (
                    <tr key={p.id} style={{ "--i": i }}>
                      <td className="wrap"><div className="cell-product"><Thumb pack={p} size="sm" /><div><div className="cell-main">{p.nom}</div><div className="cell-sub">{p.sku}{p.actif === false ? " · brouillon" : ""}</div></div></div></td>
                      <td><StockBadge stock={p.stock} seuil={seuilDe(p)} /></td>
                      <td className="hide-sm right num muted">{seuilDe(p)}</td>
                      <td className="hide-sm right num">{vendus30.get(p.id) || 0}</td>
                      <td className="hide-md right num">{c == null ? <span className="subtle">—</span> : <span style={{ color: c < 7 ? "var(--critical-solid)" : undefined }}>{c} j</span>}</td>
                      <td className="hide-md right num">{p.cout != null ? fmt(p.stock * p.cout) : <span className="subtle">coût ?</span>}</td>
                      <td className="right"><span className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                        <button className="icon-btn" title="Réception" aria-label={`Réceptionner ${p.nom}`} onClick={() => setModal({ type: "reception", packId: p.id })}><PackagePlus size={15} /></button>
                        <button className="icon-btn" title="Sortie" aria-label={`Sortie de ${p.nom}`} onClick={() => setModal({ type: "sortie", packId: p.id })}><PackageMinus size={15} /></button>
                        <button className="icon-btn" title="Modifier le produit" aria-label={`Modifier ${p.nom}`} onClick={() => go("produits", p.id)}><Pencil size={14} /></button>
                      </span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Card title="Journal des mouvements" sub="Chaque entrée et sortie de stock, avec son auteur" padded={false}
        actions={mode === "api" && <Select value={mvtPack} onChange={(e) => setMvtPack(e.target.value)} style={{ width: 200 }} aria-label="Produit"><option value="">Tous les produits</option>{data.packs.map((p) => <option key={p.id} value={p.id}>{p.nom}</option>)}</Select>}>
        <div style={{ height: 12 }} />
        {mode !== "api" ? <EmptyState icon={History} title="Disponible avec le serveur">Le journal des mouvements est enregistré par le serveur.</EmptyState>
          : mvts == null ? <div className="pdf-attente"><span className="spinner" />Chargement…</div>
          : mvts.length === 0 ? <EmptyState icon={History} title="Aucun mouvement" /> : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Date</th><th>Produit</th><th>Motif</th><th className="right">Mouvement</th><th className="right hide-sm">Stock après</th><th className="hide-md">Détail</th></tr></thead>
                <tbody>
                  {mvts.map((m, i) => (
                    <tr key={m.id} style={{ "--i": Math.min(i, 20) }}>
                      <td className="muted">{fmtDateTime(m.cree_le)}</td>
                      <td className="wrap">{m.pack_nom || <span className="subtle">Produit supprimé</span>}</td>
                      <td><Badge tone={MOTIFS_STOCK[m.motif]?.tone || "neutral"}>{MOTIFS_STOCK[m.motif]?.label || m.motif_libelle}</Badge></td>
                      <td className="right num strong" style={{ color: m.delta > 0 ? "var(--success-dot)" : "var(--critical-solid)" }}>{m.delta > 0 ? "+" + m.delta : m.delta}</td>
                      <td className="right num hide-sm">{m.stock_apres}</td>
                      <td className="hide-md subtle wrap">{[m.reference, m.note, m.auteur_nom && "par " + m.auteur_nom].filter(Boolean).join(" · ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </Card>

      <ReceptionModal open={modal?.type === "reception"} packId={modal?.packId} onClose={() => { setModal(null); if (route.id) go("stocks"); }} />
      <SortieModal open={modal?.type === "sortie"} packId={modal?.packId} onClose={() => setModal(null)} />
      <InventaireModal open={modal?.type === "inventaire"} onClose={() => setModal(null)} />
    </>
  );
}

/* =====================================================================
   PAGE : Marketing (administrateur) — fidélisation, campagnes, promotions
   ===================================================================== */
const TYPES_CAMPAGNE = [
  { value: "bonne_semaine", label: "Bonne semaine", icon: Sun },
  { value: "promotion", label: "Promotion", icon: Percent },
  { value: "nouveautes", label: "Nouveautés", icon: Sparkles },
  { value: "libre", label: "Message libre", icon: MessageSquare },
];
const JOURS = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
const AIDE_VARIABLES = "Variables : {prenom}, {boutique}, {lien}, {promos}, {nouveautes}, {promos_detail}, {nouveautes_detail}";

function CanauxChoix({ value, onChange }) {
  const t = (c) => onChange(value.includes(c) ? value.filter((x) => x !== c) : [...value, c]);
  return (
    <div className="row" style={{ gap: 16, flexWrap: "wrap" }}>
      <Checkbox checked={value.includes("sms")} onChange={() => t("sms")} label="SMS" />
      <Checkbox checked={value.includes("email")} onChange={() => t("email")} label="E-mail" />
    </div>
  );
}

/* Aperçu en direct : nombre de destinataires + message tel que reçu */
function useApercuCampagne(open, { audience, canaux, type, message }) {
  const [a, setA] = useState(null);
  useEffect(() => {
    if (!open) return;
    let actif = true;
    const t = setTimeout(() => apiFetch("POST", "/api/campagnes/apercu", { audience, canaux, type, message })
      .then((r) => actif && setA(r)).catch(() => actif && setA(null)), 350);
    return () => { actif = false; clearTimeout(t); };
  }, [open, audience, canaux.join(","), type, message]);
  return a;
}

function ApercuMessage({ a, canaux }) {
  if (!a) return <div className="pdf-attente"><span className="spinner" />Calcul des destinataires…</div>;
  return (
    <div className="apercu-message">
      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
        <Badge tone="info" icon={Users}>{a.destinataires} destinataire{a.destinataires > 1 ? "s" : ""}</Badge>
        {canaux.includes("sms") && <Badge icon={Smartphone}>{a.sms} SMS</Badge>}
        {canaux.includes("email") && <Badge icon={Mail}>{a.email} e-mail{a.email > 1 ? "s" : ""}</Badge>}
      </div>
      {a.exemple ? <div className="bulle-sms">{a.exemple}</div> : <div className="subtle">Le message est vide.</div>}
      {a.destinataires === 0 && <div className="field-error" style={{ marginTop: 8 }}><AlertCircle size={14} />Aucun client abonné dans cette audience.</div>}
    </div>
  );
}

function CampagneModal({ open, preset, info, onClose, onLancee }) {
  const { toast } = useApp();
  const [f, setF] = useState({ titre: "", type: "bonne_semaine", message: "", audience: "tous", canaux: ["sms", "email"] });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const type = preset?.type || "bonne_semaine";
    setF({ titre: preset?.titre || "", type, message: info?.modeles?.[type] || "", audience: preset?.audience || "tous", canaux: ["sms", "email"] });
    setBusy(false);
  }, [open]);
  const a = useApercuCampagne(open, f);
  const choisirType = (type) => setF((s) => ({ ...s, type, message: info?.modeles?.[type] ?? s.message }));
  const lancer = async () => {
    if (!f.message.trim()) return toast({ title: "Le message est vide", tone: "critical" });
    if (!f.canaux.length) return toast({ title: "Choisissez au moins un canal", tone: "critical" });
    setBusy(true);
    try {
      const c = await apiFetch("POST", "/api/campagnes", { ...f, titre: f.titre.trim() || TYPES_CAMPAGNE.find((t) => t.value === f.type)?.label });
      toast({ title: "Campagne lancée", desc: `${c.nb_destinataires} client(s)${c.simule ? " — envoi simulé" : ""}` });
      onLancee?.();
      onClose();
    } catch (e) { toast({ title: "Lancement impossible", desc: e.message, tone: "critical" }); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Nouvelle campagne" size="lg"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" icon={Send} loading={busy} disabled={a && a.destinataires === 0} onClick={lancer}>Envoyer{a ? ` à ${a.destinataires} client${a.destinataires > 1 ? "s" : ""}` : ""}</Btn></>}>
      <div className="stack">
        <Field label="Type de message"><Segmented full value={f.type} onChange={choisirType} options={TYPES_CAMPAGNE} /></Field>
        <div className="form-grid">
          <Field label="Titre (interne)" optional><Input value={f.titre} onChange={(e) => setF({ ...f, titre: e.target.value })} placeholder="Ex : Fête des mères" /></Field>
          <Field label="Audience"><Select value={f.audience} onChange={(e) => setF({ ...f, audience: e.target.value })}>{Object.entries(info?.audiences || { tous: "Tous les clients abonnés" }).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select></Field>
        </div>
        <Field label="Message" help={AIDE_VARIABLES}><textarea className="textarea" rows={4} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} /></Field>
        <Field label="Canaux"><CanauxChoix value={f.canaux} onChange={(canaux) => setF({ ...f, canaux })} /></Field>
        <Field label="Aperçu (premier destinataire)"><ApercuMessage a={a} canaux={f.canaux} /></Field>
      </div>
    </Modal>
  );
}

function PromotionModal({ open, onClose, onLancee }) {
  const { data, update, mode, toast, rafraichir } = useApp();
  const [f, setF] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (open) { setF({ ids: [], mode: "pourcentage", valeur: "20", fin: isoDate(addDays(new Date(), 7)), alerter: mode === "api", canaux: ["sms", "email"], audience: "tous" }); setErr(""); setBusy(false); }
  }, [open]);
  const packs = data.packs.filter((p) => p.actif !== false);
  const v = Number(f.valeur) || 0;
  const nouveauPrix = (p) => (f.mode === "prix" ? Math.round(v) : Math.round((p.prix * (100 - v)) / 100 / 5) * 5);
  const ids = f.ids || [];
  const toggle = (id) => setF((s) => ({ ...s, ids: s.ids.includes(id) ? s.ids.filter((x) => x !== id) : [...s.ids, id] }));
  const a = useApercuCampagne(open && mode === "api" && f.alerter, { audience: f.audience || "tous", canaux: f.canaux || [], type: "promotion", message: "" });
  const lancer = async () => {
    if (!ids.length) return setErr("Choisissez au moins un produit.");
    if (f.mode === "pourcentage" && !(v > 0 && v < 100)) return setErr("Réduction entre 1 et 99 %.");
    const invalides = ids.map((id) => data.packs.find((p) => p.id === id)).filter((p) => !(nouveauPrix(p) > 0 && nouveauPrix(p) < p.prix));
    if (invalides.length) return setErr(`Prix promotionnel invalide pour : ${invalides.map((p) => p.nom).join(", ")}`);
    const fin = f.fin ? (() => { const d = parseDate(f.fin); d.setHours(23, 59, 59, 0); return d.toISOString(); })() : null;
    if (mode !== "api") {
      update((d) => ({ ...d, packs: d.packs.map((p) => (ids.includes(p.id) ? { ...p, prixPromo: nouveauPrix(p), promoFin: fin } : p)) }));
      toast({ title: "Promotion appliquée", desc: `${ids.length} produit(s)` });
      onClose();
      return;
    }
    setBusy(true);
    try {
      const r = await apiFetch("POST", "/api/campagnes/promotion", { pack_ids: ids, mode: f.mode, valeur: v, fin, alerter: f.alerter, canaux: f.canaux, audience: f.audience });
      await rafraichir();
      toast({ title: "Promotion lancée 🎉", desc: r.campagne ? `${r.campagne.nb_destinataires} client(s) alerté(s)${r.campagne.simule ? " (envoi simulé)" : ""}` : `${r.packs.length} produit(s) en promotion` });
      onLancee?.();
      onClose();
    } catch (e) { setErr(e.message); }
    finally { setBusy(false); }
  };
  return (
    <Modal open={open} onClose={onClose} title="Lancer une promotion" size="lg"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="brand" icon={Percent} loading={busy} onClick={lancer}>{f.alerter ? "Lancer et alerter les clients" : "Appliquer la promotion"}</Btn></>}>
      <div className="stack">
        <Field label={`Produits (${ids.length} sélectionné${ids.length > 1 ? "s" : ""})`}>
          <div className="promo-liste">
            {packs.map((p) => (
              <label key={p.id} className={cx("promo-item", ids.includes(p.id) && "on")}>
                <Checkbox checked={ids.includes(p.id)} onChange={() => toggle(p.id)} />
                <Thumb pack={p} size="sm" />
                <span className="grow truncate">{p.nom}</span>
                <span className="num">{ids.includes(p.id) && nouveauPrix(p) > 0 && nouveauPrix(p) < p.prix ? <><span className="prix-barre">{fmt(p.prix)}</span> <b>{fmt(nouveauPrix(p))}</b></> : fmt(prixEffectif(p))}</span>
              </label>
            ))}
          </div>
        </Field>
        <div className="form-grid">
          <Field label="Type de remise"><Segmented full value={f.mode} onChange={(m) => setF({ ...f, mode: m, valeur: m === "prix" ? "" : "20" })} options={[{ value: "pourcentage", label: "Pourcentage" }, { value: "prix", label: "Prix fixe" }]} /></Field>
          <Field label={f.mode === "prix" ? "Nouveau prix" : "Réduction"}><Input value={f.valeur || ""} onChange={(e) => { setF({ ...f, valeur: e.target.value.replace(/[^\d]/g, "") }); setErr(""); }} inputMode="numeric" suffix={f.mode === "prix" ? "FCFA" : "%"} /></Field>
          <Field label="Fin de la promotion" optional><Input type="date" value={f.fin || ""} min={isoDate(addDays(new Date(), 1))} onChange={(e) => setF({ ...f, fin: e.target.value })} /></Field>
          <Field label="Audience alertée"><Select value={f.audience || "tous"} onChange={(e) => setF({ ...f, audience: e.target.value })} disabled={!f.alerter}><option value="tous">Tous les clients abonnés</option><option value="vip">Clients VIP</option><option value="fideles">Clients fidèles</option><option value="inactifs">Clients inactifs (30 j)</option></Select></Field>
        </div>
        <div className="card" style={{ padding: 14, boxShadow: "none", border: "1px solid var(--border)" }}>
          <div className="row-between">
            <div><div className="strong">Alerter automatiquement les clients</div><div className="subtle">{mode === "api" ? "SMS et/ou e-mail aux clients ayant accepté de recevoir nos offres." : "Disponible une fois connecté au serveur."}</div></div>
            <Switch on={!!f.alerter} onChange={(x) => mode === "api" && setF({ ...f, alerter: x })} label="Alerter les clients" />
          </div>
          {f.alerter && <div style={{ marginTop: 12 }} className="stack-sm"><CanauxChoix value={f.canaux || []} onChange={(canaux) => setF({ ...f, canaux })} /><ApercuMessage a={a} canaux={f.canaux || []} /><div className="help">Le message reprendra les prix promotionnels une fois la promotion appliquée.</div></div>}
        </div>
        {err && <div className="field-error"><AlertCircle size={14} />{err}</div>}
      </div>
    </Modal>
  );
}

function CampagneDetailModal({ id, onClose }) {
  const [c, setC] = useState(null);
  useEffect(() => { setC(null); if (id) apiFetch("GET", `/api/campagnes/${id}`).then(setC).catch(() => setC({ erreur: true })); }, [id]);
  return (
    <Modal open={!!id} onClose={onClose} title={c?.titre || "Campagne"} size="lg" footer={<Btn onClick={onClose}>Fermer</Btn>}>
      {!c ? <div className="pdf-attente"><span className="spinner" />Chargement…</div> : c.erreur ? <EmptyState icon={AlertCircle} title="Campagne introuvable" /> : (
        <div className="stack">
          <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
            <Badge tone={c.statut === "envoyee" ? "success" : "info"} dot>{c.statut === "envoyee" ? "Envoyée" : "En cours"}</Badge>
            {c.simule ? <Badge tone="warning">Simulée</Badge> : null}
            {c.automatique ? <Badge icon={CalendarClock}>Automatique</Badge> : null}
            <span className="subtle">{fmtDateTime(c.cree_le)}</span>
          </div>
          <div className="bulle-sms">{c.message}</div>
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Client</th><th>Canal</th><th className="hide-sm">Destinataire</th><th>Statut</th></tr></thead>
              <tbody>
                {c.envois.map((e) => (
                  <tr key={e.id}>
                    <td>{e.client_nom || "—"}</td>
                    <td>{e.canal === "sms" ? "SMS" : "E-mail"}</td>
                    <td className="hide-sm muted">{e.destinataire}</td>
                    <td><Badge tone={e.statut === "envoye" ? "success" : e.statut === "simule" ? "warning" : "critical"}>{e.statut === "envoye" ? "Envoyé" : e.statut === "simule" ? "Simulé" : "Échec"}</Badge>{e.erreur && <div className="cell-sub">{e.erreur}</div>}</td>
                  </tr>
                ))}
                {c.envois.length === 0 && <tr><td colSpan={4} className="subtle">Aucun envoi.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Modal>
  );
}

function CarteHebdo({ info, onMaj }) {
  const { toast } = useApp();
  const [h, setH] = useState(null);
  const [busy, setBusy] = useState("");
  useEffect(() => { if (info?.hebdo) setH({ actif: info.hebdo.actif === "1", jour: Number(info.hebdo.jour), heure: Number(info.hebdo.heure), canaux: String(info.hebdo.canaux || "").split(",").filter(Boolean), message: info.hebdo.message }); }, [info]);
  const a = useApercuCampagne(!!h, { audience: "tous", canaux: h?.canaux || [], type: "bonne_semaine", message: h?.message || "" });
  if (!h) return null;
  const enregistrer = async (patch = {}) => {
    const n = { ...h, ...patch };
    setH(n); setBusy("save");
    try { await apiFetch("PUT", "/api/campagnes/hebdo", n); toast({ title: n.actif ? `Message automatique activé (${JOURS[n.jour].toLowerCase()} ${n.heure} h)` : "Message automatique désactivé" }); onMaj(); }
    catch (e) { toast({ title: "Enregistrement impossible", desc: e.message, tone: "critical" }); }
    finally { setBusy(""); }
  };
  const maintenant = async () => {
    setBusy("now");
    try { const c = await apiFetch("POST", "/api/campagnes/hebdo/maintenant"); toast({ title: "Message de la semaine envoyé", desc: `${c.nb_destinataires} client(s)${c.simule ? " — simulé" : ""}` }); onMaj(); }
    catch (e) { toast({ title: "Envoi impossible", desc: e.message, tone: "critical" }); }
    finally { setBusy(""); }
  };
  return (
    <Card title="Message automatique de début de semaine" sub="Bonne semaine + nouveautés + promotions en cours, envoyé chaque semaine aux clients abonnés"
      actions={<Switch on={h.actif} onChange={(v) => enregistrer({ actif: v })} label="Activer le message automatique" />}>
      <div className="stack">
        <div className="form-grid">
          <Field label="Jour d'envoi"><Select value={h.jour} onChange={(e) => setH({ ...h, jour: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 0].map((j) => <option key={j} value={j}>{JOURS[j]}</option>)}</Select></Field>
          <Field label="Heure (Abidjan)"><Select value={h.heure} onChange={(e) => setH({ ...h, heure: Number(e.target.value) })}>{[...Array(24)].map((_, k) => <option key={k} value={k}>{pad(k)} h 00</option>)}</Select></Field>
        </div>
        <Field label="Message" help={AIDE_VARIABLES}><textarea className="textarea" rows={3} value={h.message} onChange={(e) => setH({ ...h, message: e.target.value })} /></Field>
        <Field label="Canaux"><CanauxChoix value={h.canaux} onChange={(canaux) => setH({ ...h, canaux })} /></Field>
        <Field label="Aperçu"><ApercuMessage a={a} canaux={h.canaux} /></Field>
        <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
          {info.hebdo.dernier && <span className="subtle spacer">Dernier envoi : semaine {info.hebdo.dernier}</span>}
          <Btn icon={Send} loading={busy === "now"} onClick={maintenant}>Envoyer maintenant</Btn>
          <Btn variant="primary" loading={busy === "save"} onClick={() => enregistrer()}>Enregistrer</Btn>
        </div>
      </div>
    </Card>
  );
}

function PageMarketing({ route }) {
  const { data, mode, go, toast, update, sync, confirm } = useApp();
  const [info, setInfo] = useState(null);
  const [compose, setCompose] = useState(null);
  const [promo, setPromo] = useState(route.id === "promotion");
  const [detail, setDetail] = useState(null);
  const charger = useCallback(() => {
    if (mode !== "api") return;
    apiFetch("GET", "/api/campagnes").then(setInfo).catch((e) => toast({ title: "Marketing indisponible", desc: e.message, tone: "critical" }));
  }, [mode]);
  useEffect(() => { charger(); }, [charger]);
  // Les campagnes partent en arrière-plan : on rafraîchit l'historique tant qu'une est en cours
  useEffect(() => {
    if (!info?.campagnes?.some((c) => c.statut !== "envoyee")) return;
    const t = setTimeout(charger, 2500);
    return () => clearTimeout(t);
  }, [info]);

  // Plan de fidélisation : segments calculés sur l'historique d'achat
  const segments = useMemo(() => {
    const st = new Map();
    enrichVentes(data).filter(isValid).forEach((v) => {
      const o = st.get(v.clientId) || { cmds: new Set(), total: 0, last: "" };
      o.cmds.add(v.commandeId || v.id); o.total += v.total;
      if (v.date > o.last) o.last = v.date;
      st.set(v.clientId, o);
    });
    const il30 = isoDate(addDays(today(), -30));
    const ab = (l) => l.filter((c) => c.consentement).length;
    const s = (c) => st.get(c.id);
    const vip = data.clients.filter((c) => c.statut === "VIP");
    const fideles = data.clients.filter((c) => (s(c)?.cmds.size || 0) >= 2);
    const inactifs = data.clients.filter((c) => s(c) && s(c).last < il30);
    const nouveaux = data.clients.filter((c) => c.dateAjout && c.dateAjout >= il30);
    return [
      { key: "vip", titre: "Clients VIP", icon: Star, tint: 1, liste: vip, conseil: "Remerciez-les avec une offre exclusive ou un accès en avant-première.", type: "promotion" },
      { key: "fideles", titre: "Clients fidèles (2 achats et +)", icon: Gift, tint: 0, liste: fideles, conseil: "Proposez une remise fidélité pour leur prochain achat.", type: "promotion" },
      { key: "inactifs", titre: "Sans achat depuis 30 jours", icon: Clock, tint: 3, liste: inactifs, conseil: "Relancez-les avec les nouveautés ou une promotion limitée.", type: "nouveautes" },
      { key: null, titre: "Nouveaux clients (30 jours)", icon: UserPlus, tint: 4, liste: nouveaux, conseil: "Souhaitez-leur la bienvenue et présentez la boutique.", type: "bonne_semaine" },
    ].map((x) => ({ ...x, abonnes: ab(x.liste) }));
  }, [data]);

  const abonnes = data.clients.filter((c) => c.consentement).length;
  const stats = info?.stats || { clients: data.clients.length, abonnes, joignables_sms: abonnes, joignables_email: data.clients.filter((c) => c.consentement && c.email).length };
  const promos = data.packs.filter(promoActive);
  const arreterPromo = async (p) => {
    if (!(await confirm({ title: `Arrêter la promotion sur ${p.nom} ?`, message: `Le prix revient à ${fmt(p.prix)}.`, confirmLabel: "Arrêter" }))) return;
    update((d) => ({ ...d, packs: d.packs.map((x) => (x.id === p.id ? { ...x, prixPromo: null, promoFin: null } : x)) }));
    sync(["DELETE", `/api/campagnes/promotion/${p.id}`]);
    toast({ title: "Promotion arrêtée", desc: p.nom });
  };
  const kpis = [
    { label: "Clients", value: stats.clients, icon: Users, tint: 4 },
    { label: "Abonnés marketing", value: stats.abonnes, icon: Megaphone, tint: 0, sub: stats.clients ? `${Math.round((stats.abonnes / stats.clients) * 100)} % des clients` : null },
    { label: "Joignables par SMS", value: stats.joignables_sms, icon: Smartphone, tint: 1 },
    { label: "Joignables par e-mail", value: stats.joignables_email, icon: Mail, tint: 5 },
  ];

  return (
    <>
      <PageHeader title="Marketing" meta="Fidélisation, campagnes SMS / e-mail et promotions"
        actions={<>
          {mode === "api" && <Btn icon={Send} onClick={() => setCompose({})}>Nouvelle campagne</Btn>}
          <Btn variant="primary" icon={Percent} onClick={() => setPromo(true)}>Lancer une promotion</Btn>
        </>} />
      {mode !== "api" && <div className="banner banner-warning" style={{ marginBottom: 16 }}><AlertTriangle size={16} /><div>Mode démo : les envois de SMS / e-mails et le message automatique nécessitent le serveur. Les promotions s'appliquent localement.</div></div>}
      {info && (!info.fournisseurs.sms || !info.fournisseurs.email) && (
        <div className="banner banner-warning" style={{ marginBottom: 16 }}><Info size={16} /><div>
          <b>Envois simulés</b> pour {[!info.fournisseurs.sms && "les SMS", !info.fournisseurs.email && "les e-mails"].filter(Boolean).join(" et ")} : les messages sont préparés et enregistrés, mais pas réellement envoyés.
          Ajoutez les identifiants du fournisseur ({[!info.fournisseurs.sms && "SMS_PROVIDER_*", !info.fournisseurs.email && "SMTP_*"].filter(Boolean).join(", ")}) dans les variables de l'hébergement pour les envoyer réellement.
        </div></div>
      )}
      <div className="kpi-grid stagger">
        {kpis.map((k, i) => (
          <div className="card kpi" key={k.label} style={{ "--i": i }}>
            <div className="kpi-label"><span className={cx("kpi-dot", `tint-${k.tint}`)}><k.icon size={13} /></span>{k.label}</div>
            <div className="kpi-value"><CountUp value={k.value} format={fmtNum} /></div>
            {k.sub && <div className="subtle">{k.sub}</div>}
          </div>
        ))}
      </div>

      <Card title="Plan de fidélisation" sub="Vos clients regroupés selon leurs achats — seuls les abonnés reçoivent les messages">
        <div className="segments">
          {segments.map((s) => (
            <div key={s.titre} className="segment">
              <div className="row" style={{ gap: 10 }}><span className={cx("todo-icon", `tint-${s.tint}`)}><s.icon size={15} /></span><div className="grow"><div className="strong">{s.titre}</div><div className="subtle">{s.liste.length} client{s.liste.length > 1 ? "s" : ""} · {s.abonnes} abonné{s.abonnes > 1 ? "s" : ""}</div></div></div>
              <p className="subtle">{s.conseil}</p>
              {mode === "api" && s.key && <Btn size="sm" icon={Send} disabled={!s.abonnes} onClick={() => setCompose({ audience: s.key, type: s.type, titre: s.titre })}>Contacter</Btn>}
            </div>
          ))}
        </div>
      </Card>

      <div className="grid-main">
        {mode === "api" ? (info ? <CarteHebdo info={info} onMaj={charger} /> : <Card title="Message automatique"><div className="pdf-attente"><span className="spinner" />Chargement…</div></Card>) : <Card title="Message automatique de début de semaine"><EmptyState icon={CalendarClock} title="Disponible avec le serveur" /></Card>}
        <Card title="Promotions en cours" sub={promos.length ? `${promos.length} produit${promos.length > 1 ? "s" : ""}` : null}
          actions={<Btn size="sm" icon={Plus} onClick={() => setPromo(true)}>Ajouter</Btn>}>
          {promos.length === 0 ? <EmptyState icon={Percent} title="Aucune promotion">Lancez une promotion : les clients abonnés sont alertés automatiquement.</EmptyState> : (
            <div className="list">
              {promos.map((p) => (
                <div key={p.id} className="list-item">
                  <Thumb pack={p} size="sm" />
                  <div className="grow">
                    <div className="row-between"><span className="strong truncate">{p.nom}</span><Badge tone="success">−{Math.round((1 - p.prixPromo / p.prix) * 100)} %</Badge></div>
                    <div className="row-between"><span className="num"><b>{fmt(p.prixPromo)}</b> <span className="prix-barre">{fmt(p.prix)}</span></span><span className="subtle">{p.promoFin ? "jusqu'au " + fmtDateCourt(isoDate(new Date(p.promoFin))) : "sans fin"}</span></div>
                  </div>
                  <button className="icon-btn danger" onClick={() => arreterPromo(p)} aria-label={`Arrêter la promotion ${p.nom}`}><X size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {mode === "api" && (
        <Card title="Historique des campagnes" padded={false}>
          <div style={{ height: 12 }} />
          {!info ? <div className="pdf-attente"><span className="spinner" />Chargement…</div> : info.campagnes.length === 0 ? <EmptyState icon={Megaphone} title="Aucune campagne envoyée">Lancez une promotion ou une campagne pour fidéliser vos clients.</EmptyState> : (
            <div className="table-scroll">
              <table className="table">
                <thead><tr><th>Campagne</th><th className="hide-sm">Canaux</th><th className="right">Destinataires</th><th className="right hide-sm">Envoyés</th><th>Statut</th></tr></thead>
                <tbody>
                  {info.campagnes.map((c, i) => (
                    <tr key={c.id} className="clickable" style={{ "--i": Math.min(i, 20) }} onClick={() => setDetail(c.id)}>
                      <td className="wrap"><div className="cell-main">{c.titre}{c.automatique ? <CalendarClock size={13} style={{ marginLeft: 6, verticalAlign: -2 }} /> : null}</div><div className="cell-sub">{fmtDateTime(c.cree_le)} · {info.audiences[c.audience] || c.audience}</div></td>
                      <td className="hide-sm muted">{String(c.canaux).split(",").map((x) => (x === "sms" ? "SMS" : "E-mail")).join(" + ")}</td>
                      <td className="right num">{c.nb_destinataires}</td>
                      <td className="right num hide-sm">{c.nb_envoyes}{c.nb_echecs ? <span style={{ color: "var(--critical-solid)" }}> · {c.nb_echecs} échec(s)</span> : null}</td>
                      <td><span className="row" style={{ gap: 4 }}><Badge tone={c.statut === "envoyee" ? "success" : "info"} dot>{c.statut === "envoyee" ? "Envoyée" : "En cours"}</Badge>{c.simule ? <Badge tone="warning">Simulée</Badge> : null}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {mode === "api" && <CampagneModal open={!!compose} preset={compose} info={info} onClose={() => setCompose(null)} onLancee={charger} />}
      <PromotionModal open={promo} onClose={() => { setPromo(false); if (route.id) go("marketing"); }} onLancee={charger} />
      {mode === "api" && <CampagneDetailModal id={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

/* =====================================================================
   PAGE : Finances (investissements & rentabilité)
   ===================================================================== */
function PageFinances({ route }) {
  const { data, update, sync, go, toast, confirm } = useApp();
  const [cat, setCat] = useState("");
  const [editing, setEditing] = useState(null);
  const vs = useMemo(() => enrichVentes(data).filter(isValid), [data]);
  const ca = vs.reduce((s, v) => s + v.total, 0);
  const invest = data.investissements.reduce((s, i) => s + i.montant, 0);
  const benef = ca - invest;
  const roi = invest ? (benef / invest) * 100 : 0;
  const coutMarchandises = vs.reduce((s, v) => s + (v.pack?.cout ? v.pack.cout * v.qte : 0), 0);
  const margeBrute = ca - coutMarchandises;

  const months = useMemo(() => {
    const now = new Date();
    return [...Array(6)].map((_, k) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - k), 1);
      const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
      return {
        label: d.toLocaleDateString("fr-FR", { month: "short" }).replace(".", ""),
        full: d.toLocaleDateString("fr-FR", { month: "long", year: "numeric" }),
        values: [
          vs.filter((v) => v.date.startsWith(key)).reduce((s, v) => s + v.total, 0),
          data.investissements.filter((i) => i.date.startsWith(key)).reduce((s, i) => s + i.montant, 0),
        ],
      };
    });
  }, [vs, data.investissements]);

  const byCat = CATEGORIES.map((c) => ({ label: c.key, color: c.color, value: data.investissements.filter((i) => i.categorie === c.key).reduce((s, i) => s + i.montant, 0) })).filter((c) => c.value > 0);
  const rows = [...data.investissements].filter((i) => !cat || i.categorie === cat).sort((a, b) => b.date.localeCompare(a.date));
  const remove = async (i) => {
    if (!(await confirm({ title: "Supprimer cette dépense ?", message: `« ${i.libelle} » (${fmt(i.montant)}) sera supprimée.`, confirmLabel: "Supprimer", tone: "critical" }))) return;
    update((d) => ({ ...d, investissements: d.investissements.filter((x) => x.id !== i.id) }));
    sync(["DELETE", `/api/investissements/${i.id}`]);
    toast({ title: "Dépense supprimée" });
  };

  const kpis = [
    { label: "Chiffre d'affaires", value: ca, f: fmt, icon: TrendingUp, tint: 4 },
    { label: "Total investi", value: invest, f: fmt, icon: Wallet, tint: 3 },
    { label: "Bénéfice net", value: benef, f: fmt, icon: Landmark, tint: benef >= 0 ? 0 : 3, color: benef >= 0 ? "var(--success-dot)" : "var(--critical-solid)" },
    { label: "Retour sur investissement", value: roi, f: pct, icon: Sparkles, tint: 5, color: roi >= 0 ? "var(--success-dot)" : "var(--critical-solid)" },
  ];

  return (
    <>
      <PageHeader title="Finances" meta="Capital engagé, rentabilité et dépenses"
        actions={<Btn variant="primary" icon={Plus} onClick={() => go("finances", "nouveau")}>Enregistrer une dépense</Btn>} />
      <div className="kpi-grid stagger">
        {kpis.map((k, i) => (
          <div className="card kpi" key={k.label} style={{ "--i": i }}>
            <div className="kpi-label"><span className={cx("kpi-dot", `tint-${k.tint}`)}><k.icon size={13} /></span>{k.label}</div>
            <div className="kpi-value" style={{ color: k.color }}><CountUp value={k.value} format={k.f} /></div>
          </div>
        ))}
      </div>
      {coutMarchandises > 0 && (
        <div className="banner banner-info" style={{ marginBottom: 16 }}>
          <Info size={16} />
          <div>Marge brute sur ventes : <b className="num">{fmt(margeBrute)}</b> ({ca ? ((margeBrute / ca) * 100).toFixed(0) : 0} % du CA), calculée à partir du coût par article de vos produits.</div>
        </div>
      )}
      <div className="grid-main">
        <Card title="Ventes vs dépenses" sub="6 derniers mois">
          <div className="legend" style={{ marginBottom: 12, marginLeft: 0 }}>
            <span><i style={{ background: "var(--c-blue)", height: 10, width: 10 }} />Chiffre d'affaires</span>
            <span><i style={{ background: "var(--c-coral)", height: 10, width: 10 }} />Dépenses</span>
          </div>
          <GroupedBars groups={months} series={[{ label: "CA", color: "var(--c-blue)" }, { label: "Dépenses", color: "var(--c-coral)" }]} />
        </Card>
        <Card title="Répartition des dépenses">
          {byCat.length ? <Donut items={byCat} format={fmtShort} centerLabel="Investi" /> : <EmptyState icon={Wallet} title="Aucune dépense" />}
        </Card>
      </div>
      <Card title="Historique des dépenses" padded={false}
        actions={<Select value={cat} onChange={(e) => setCat(e.target.value)} style={{ width: 170 }} aria-label="Catégorie"><option value="">Toutes catégories</option>{CATEGORIES.map((c) => <option key={c.key}>{c.key}</option>)}</Select>}>
        <div style={{ height: 12 }} />
        {rows.length === 0 ? <EmptyState icon={Wallet} title="Aucune dépense" action={<Btn variant="primary" icon={Plus} onClick={() => go("finances", "nouveau")}>Enregistrer une dépense</Btn>} /> : (
          <div className="table-scroll">
            <table className="table">
              <thead><tr><th>Libellé</th><th className="hide-sm">Catégorie</th><th className="hide-sm">Date</th><th className="right">Montant</th><th style={{ width: 80 }} /></tr></thead>
              <tbody key={cat}>
                {rows.map((i, k) => (
                  <tr key={i.id} style={{ "--i": k }}>
                    <td className="wrap"><div className="cell-main" style={{ fontWeight: 550 }}>{i.libelle}</div><div className="cell-sub only-mobile">{i.categorie} · {fmtDate(i.date)}</div></td>
                    <td className="hide-sm"><span className="row"><span style={{ width: 8, height: 8, borderRadius: 3, background: catColor(i.categorie) }} />{i.categorie}</span></td>
                    <td className="hide-sm muted">{fmtDate(i.date)}</td>
                    <td className="right num strong" style={{ color: "var(--critical-solid)" }}>−{fmt(i.montant)}</td>
                    <td className="right"><span className="row" style={{ gap: 2, justifyContent: "flex-end" }}>
                      <button className="icon-btn" onClick={() => setEditing(i)} aria-label="Modifier"><Pencil size={14} /></button>
                      <button className="icon-btn danger" onClick={() => remove(i)} aria-label="Supprimer"><Trash2 size={14} /></button>
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <InvestModal open={route.id === "nouveau" || !!editing} item={editing} onClose={() => { setEditing(null); if (route.id) go("finances"); }} />
    </>
  );
}

/* =====================================================================
   PAGE : Paramètres
   ===================================================================== */
/* ---------- Réglages de la boutique en ligne (site client) ---------- */
function CarteBoutiqueEnLigne({ estAdmin }) {
  const { data, update, sync, toast } = useApp();
  const CLES = ["boutique_ouverte", "slogan", "whatsapp", "frais_livraison", "livraison_gratuite_des", "zone_livraison", "momo_orange", "momo_mtn", "momo_moov", "momo_wave", "momo_titulaire"];
  const depuis = () => Object.fromEntries(CLES.map((k) => [k, String(({ ...boutiqueParDefaut(), ...(data.boutique || {}) })[k] ?? "")]));
  const [f, setF] = useState(depuis);
  const [cinetpay, setCinetpay] = useState(null);
  useEffect(() => { setF(depuis()); }, [JSON.stringify(data.boutique)]);
  useEffect(() => { apiFetch("GET", "/api/boutique/config").then((c) => setCinetpay(c.paiements)).catch(() => setCinetpay(null)); }, []);
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const modifie = CLES.some((k) => f[k] !== depuis()[k]);
  const lien = location.origin + "/";
  const enregistrer = async () => {
    const b = { ...f, frais_livraison: String(Number(f.frais_livraison) || 0), livraison_gratuite_des: String(Number(f.livraison_gratuite_des) || 0) };
    update((d) => ({ ...d, boutique: { ...d.boutique, ...b } }));
    if (await sync(["PUT", "/api/parametres", b])) {
      toast({ title: "Boutique en ligne mise à jour" });
      apiFetch("GET", "/api/boutique/config").then((c) => setCinetpay(c.paiements)).catch(() => {});
    }
  };
  const ouverte = f.boutique_ouverte !== "0";
  const numeros = [["momo_orange", "Orange Money"], ["momo_mtn", "MTN MoMo"], ["momo_moov", "Moov Money"], ["momo_wave", "Wave"]];
  return (
    <Card title="Boutique en ligne" sub="Le site où vos clients consultent le catalogue, commandent et paient.">
      <div className="stack">
        <div className="row-between" style={{ flexWrap: "wrap" }}>
          <div className="row" style={{ minWidth: 0 }}>
            <Badge tone={ouverte ? "success" : "neutral"} dot>{ouverte ? "Ouverte aux commandes" : "Fermée"}</Badge>
            <a className="link truncate" href={lien} target="_blank" rel="noopener">{lien}</a>
          </div>
          <div className="row">
            <Btn size="sm" icon={Copy} onClick={() => navigator.clipboard?.writeText(lien).then(() => toast({ title: "Lien de la boutique copié" }))}>Copier le lien</Btn>
            {estAdmin && <Switch on={ouverte} onChange={(v) => set("boutique_ouverte", v ? "1" : "0")} label="Boutique ouverte" />}
          </div>
        </div>
        <div className="form-grid">
          <Field label="Slogan (page d'accueil)" optional className="full"><Input value={f.slogan} onChange={(e) => set("slogan", e.target.value)} placeholder="Ex : Des packs soignés, livrés chez vous à Abidjan" disabled={!estAdmin} /></Field>
          <Field label="WhatsApp de la boutique" optional help="Bouton « Nous écrire » sur le site."><Input icon={MessageSquare} value={f.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} placeholder="07 00 00 00 00" inputMode="tel" disabled={!estAdmin} /></Field>
          <Field label="Zone de livraison" optional><Input icon={MapPin} value={f.zone_livraison} onChange={(e) => set("zone_livraison", e.target.value)} placeholder="Ex : Abidjan et environs, 24 à 48 h" disabled={!estAdmin} /></Field>
          <Field label="Frais de livraison"><Input value={f.frais_livraison} onChange={(e) => set("frais_livraison", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" disabled={!estAdmin} /></Field>
          <Field label="Livraison offerte dès" help="0 = jamais offerte."><Input value={f.livraison_gratuite_des} onChange={(e) => set("livraison_gratuite_des", e.target.value.replace(/[^\d]/g, ""))} suffix="FCFA" inputMode="numeric" disabled={!estAdmin} /></Field>
        </div>

        <div>
          <div className="strong">Paiement par transfert Mobile Money</div>
          <p className="subtle" style={{ marginBottom: 10 }}>Le client envoie le montant sur votre numéro puis saisit l'ID de transaction. Vous confirmez la réception depuis la commande. Laissez vide pour ne pas proposer un opérateur.</p>
          <div className="form-grid">
            {numeros.map(([k, nom]) => (
              <Field key={k} label={nom} optional><div className="row"><ModePaiement mode={nom} taille={28} /><div className="grow"><Input value={f[k]} onChange={(e) => set(k, e.target.value)} placeholder="Numéro marchand" inputMode="tel" disabled={!estAdmin} /></div></div></Field>
            ))}
            <Field label="Nom affiché du titulaire" optional className="full" help="Le nom que le client voit sur son téléphone au moment du transfert."><Input value={f.momo_titulaire} onChange={(e) => set("momo_titulaire", e.target.value)} placeholder={data.boutique?.nom} disabled={!estAdmin} /></Field>
          </div>
        </div>

        <div className="pay-recap">
          <ModePaiement mode="Paiement en ligne" taille={32} />
          <div className="grow">
            <div className="strong">Paiement en ligne CinetPay {cinetpay?.en_ligne ? <Badge tone={cinetpay.en_ligne_test ? "warning" : "success"}>{cinetpay.en_ligne_test ? "Actif (bac à sable)" : "Actif"}</Badge> : <Badge>Non configuré</Badge>}</div>
            <div className="subtle">
              {cinetpay?.en_ligne
                ? "Orange Money, MTN MoMo, Moov Money, Wave : le paiement est confirmé automatiquement."
                : "Ouvrez un compte marchand sur cinetpay.com puis renseignez CINETPAY_API_KEY et CINETPAY_API_PASSWORD dans backend/.env et redémarrez le serveur."}
            </div>
          </div>
        </div>

        {estAdmin && <div className="row" style={{ justifyContent: "flex-end" }}><Btn variant="primary" disabled={!modifie} onClick={enregistrer}>Enregistrer</Btn></div>}
      </div>
    </Card>
  );
}

function EquipeModal({ open, onClose }) {
  const { toast } = useApp();
  const [f, setF] = useState({ nom: "", tel: "", mdp: "", role: "vendeur" });
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ nom: "", tel: "", mdp: "", role: "vendeur" }); setErr(""); setBusy(false); } }, [open]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const save = async () => {
    if (!f.nom.trim() || f.tel.replace(/\D/g, "").length < 8) return setErr("Nom et numéro de téléphone valides requis.");
    if (f.mdp.length < 6) return setErr("Le mot de passe doit contenir au moins 6 caractères.");
    setBusy(true);
    try {
      await apiFetch("POST", "/api/auth/inscription", { nom: f.nom.trim(), telephone: f.tel, mot_de_passe: f.mdp, role: f.role });
      toast({ title: "Compte créé", desc: `${f.nom.trim()} peut maintenant se connecter.` });
      onClose();
    } catch (e) {
      setErr(e.message);
      setBusy(false);
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Ajouter un membre de l'équipe" size="md"
      footer={<><Btn onClick={onClose}>Annuler</Btn><Btn variant="primary" loading={busy} onClick={save}>Créer le compte</Btn></>}>
      <div className="form-grid">
        <Field label="Nom complet" className="full"><Input value={f.nom} onChange={(e) => set("nom", e.target.value)} placeholder="Ex : Awa Bamba" /></Field>
        <Field label="Téléphone"><Input icon={Phone} value={f.tel} onChange={(e) => set("tel", e.target.value)} placeholder="07 00 00 00 00" inputMode="tel" /></Field>
        <Field label="Mot de passe provisoire" help="6 caractères minimum."><Input icon={Lock} type="password" value={f.mdp} onChange={(e) => set("mdp", e.target.value)} autoComplete="new-password" /></Field>
        <Field label="Rôle" className="full">
          <Segmented full value={f.role} onChange={(v) => set("role", v)} options={[{ value: "vendeur", label: "Vendeur", icon: User }, { value: "admin", label: "Administrateur", icon: ShieldCheck }]} />
        </Field>
        {err && <div className="banner banner-critical full"><AlertCircle size={16} />{err}</div>}
      </div>
    </Modal>
  );
}

function PageParametres() {
  const { settings, setSettings, data, update, sync, remplacerTout, toast, confirm, logout, auth, mode } = useApp();
  const enLigne = mode === "api";
  const estAdmin = !enLigne || auth?.utilisateur?.role === "admin";
  const localDispo = enLigne && !!readJson(STORAGE_KEY);
  const [equipeOpen, setEquipeOpen] = useState(false);
  const [boutique, setBoutique] = useState(() => ({ ...boutiqueParDefaut(), ...(data.boutique || {}) }));
  useEffect(() => { setBoutique({ ...boutiqueParDefaut(), ...(data.boutique || {}) }); }, [JSON.stringify(data.boutique)]);
  const setB = (k, v) => setBoutique((b) => ({ ...b, [k]: v }));
  const CLES_INFOS = ["nom", "adresse", "telephone", "message"];
  const boutiqueModifiee = CLES_INFOS.some((k) => (boutique[k] || "") !== ({ ...boutiqueParDefaut(), ...(data.boutique || {}) })[k]);
  const enregistrerBoutique = async () => {
    const b = { nom: boutique.nom.trim(), adresse: boutique.adresse.trim(), telephone: boutique.telephone.trim(), message: boutique.message.trim() };
    update((d) => ({ ...d, boutique: { ...d.boutique, ...b } }));
    if (await sync(["PUT", "/api/parametres", b])) toast({ title: "Informations de la boutique enregistrées" });
  };
  const fileRef = useRef(null);
  const exporter = () => {
    downloadFile(`moncommerce-sauvegarde-${isoDate(new Date())}.json`, JSON.stringify(data, null, 2), "application/json");
    toast({ title: "Sauvegarde téléchargée" });
  };
  const importer = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!Array.isArray(parsed.clients) || !Array.isArray(parsed.ventes)) throw new Error("format");
        if (!(await confirm({ title: "Restaurer cette sauvegarde ?", message: `Vos données actuelles seront remplacées par celles du fichier « ${file.name} » (${parsed.clients.length} clients, ${parsed.ventes.length} ventes).`, confirmLabel: "Restaurer" }))) return;
        if (await remplacerTout(migrate(parsed))) toast({ title: "Données restaurées" });
      } catch {
        toast({ title: "Fichier invalide", desc: "Choisissez une sauvegarde MonCommerce (.json).", tone: "critical" });
      }
    };
    reader.readAsText(file);
  };
  const reset = async () => {
    if (!(await confirm({ title: "Réinitialiser les données ?", message: "Toutes vos données seront remplacées par les données de démonstration. Pensez à exporter une sauvegarde avant.", confirmLabel: "Réinitialiser", tone: "critical" }))) return;
    if (await remplacerTout({ ...seedData(), boutique: data.boutique })) toast({ title: "Données de démonstration rechargées" });
  };
  const envoyerLocal = async () => {
    const local = migrate(readJson(STORAGE_KEY));
    if (!(await confirm({ title: "Envoyer les données de ce navigateur ?", message: `Les données du serveur seront remplacées par celles enregistrées dans ce navigateur (${local.clients.length} clients, ${local.ventes.length} ventes).`, confirmLabel: "Envoyer vers le serveur", tone: "critical" }))) return;
    if (await remplacerTout(local)) toast({ title: "Données envoyées sur le serveur" });
  };

  const Row = ({ title, sub, children }) => (
    <div className="card-section row-between" style={{ flexWrap: "wrap" }}>
      <div style={{ minWidth: 200, flex: 1 }}><div className="strong">{title}</div>{sub && <div className="subtle">{sub}</div>}</div>
      <div className="row" style={{ flexWrap: "wrap" }}>{children}</div>
    </div>
  );

  return (
    <div className="page-narrow" style={{ margin: "0 auto" }}>
      <PageHeader title="Paramètres" />
      <div className="stack">
        <Card title="Boutique" sub="Ces informations sont imprimées sur les tickets de caisse.">
          <div className="form-grid">
            <Field label="Nom de la boutique" className="full"><Input icon={Store} value={boutique.nom} onChange={(e) => setB("nom", e.target.value)} disabled={!estAdmin} /></Field>
            <Field label="Adresse" optional><Input icon={MapPin} value={boutique.adresse} onChange={(e) => setB("adresse", e.target.value)} placeholder="Ex : Cocody Angré, Abidjan" disabled={!estAdmin} /></Field>
            <Field label="Téléphone" optional><Input icon={Phone} value={boutique.telephone} onChange={(e) => setB("telephone", e.target.value)} placeholder="07 00 00 00 00" disabled={!estAdmin} /></Field>
            <Field label="Message en bas du ticket" optional className="full"><Input value={boutique.message} onChange={(e) => setB("message", e.target.value)} placeholder="Merci pour votre achat et à bientôt !" disabled={!estAdmin} /></Field>
          </div>
          <div className="row" style={{ justifyContent: "flex-end", marginTop: 14 }}>
            {!estAdmin && <span className="subtle grow">Modifiable par un administrateur.</span>}
            {estAdmin && <Btn variant="primary" disabled={!boutique.nom.trim() || !boutiqueModifiee} onClick={enregistrerBoutique}>Enregistrer</Btn>}
          </div>
        </Card>
        {enLigne && <CarteBoutiqueEnLigne estAdmin={estAdmin} />}
        <Card title="Apparence" padded={false}>
          <Row title="Thème" sub="Le mode système suit le réglage de votre appareil.">
            <Segmented value={settings.theme} onChange={(theme) => setSettings({ ...settings, theme })} options={[{ value: "systeme", label: "Système", icon: Monitor }, { value: "clair", label: "Clair", icon: Sun }, { value: "sombre", label: "Sombre", icon: Moon }]} />
          </Row>
        </Card>
        <Card title="Connexion" padded={false}>
          <Row title={enLigne ? "Connecté au serveur" : "Mode démo (hors ligne)"} sub={enLigne ? `API : ${API_BASE || location.origin} · base de données partagée entre vos appareils` : "Les données restent dans ce navigateur. Démarrez le serveur (dossier backend) pour les partager."}>
            {enLigne ? <Badge tone="success" dot>En ligne</Badge> : <Btn icon={RotateCcw} onClick={() => window.location.reload()}>Rechercher le serveur</Btn>}
          </Row>
        </Card>
        {enLigne && estAdmin && (
          <Card title="Équipe" padded={false}>
            <Row title="Ajouter un membre" sub="Créez un compte vendeur ou administrateur. Il se connectera avec son téléphone, son mot de passe et un code SMS."><Btn icon={UserPlus} onClick={() => setEquipeOpen(true)}>Ajouter</Btn></Row>
          </Card>
        )}
        <Card title="Données" sub={enLigne ? "Les données sont enregistrées sur le serveur." : "Les données sont enregistrées dans ce navigateur."} padded={false}>
          <Row title="Exporter une sauvegarde" sub={`${data.clients.length} clients · ${data.packs.length} produits · ${data.ventes.length} ventes`}><Btn icon={Download} onClick={exporter}>Télécharger (.json)</Btn></Row>
          {estAdmin ? <>
            <Row title="Restaurer une sauvegarde" sub="Remplace les données actuelles.">
              <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={importer} />
              <Btn icon={Upload} onClick={() => fileRef.current?.click()}>Importer</Btn>
            </Row>
            {localDispo && <Row title="Données de ce navigateur" sub="Envoie sur le serveur les données saisies en mode démo."><Btn icon={Upload} onClick={envoyerLocal}>Envoyer vers le serveur</Btn></Row>}
            <Row title="Données de démonstration" sub="Recharge un jeu de données d'exemple."><Btn variant="critical-plain" icon={RotateCcw} onClick={reset}>Réinitialiser</Btn></Row>
          </> : <Row title="Restauration et réinitialisation" sub="Réservées aux administrateurs." />}
        </Card>
        <Card title="Compte" padded={false}>
          <Row title={auth?.utilisateur?.nom || "Connecté"} sub={[auth?.tel && `Téléphone : ${auth.tel}`, auth?.utilisateur?.role && (auth.utilisateur.role === "admin" ? "Administrateur" : "Vendeur")].filter(Boolean).join(" · ") || null}><Btn icon={LogOut} onClick={logout}>Se déconnecter</Btn></Row>
        </Card>
      </div>
      <EquipeModal open={equipeOpen} onClose={() => setEquipeOpen(false)} />
    </div>
  );
}

/* =====================================================================
   Squelette de chargement
   ===================================================================== */
function SkeletonPage() {
  return (
    <div aria-busy="true" aria-label="Chargement">
      <div className="skeleton" style={{ width: 220, height: 26, marginBottom: 8 }} />
      <div className="skeleton" style={{ width: 320, height: 14, marginBottom: 24 }} />
      <div className="kpi-grid">{[0, 1, 2, 3].map((i) => <div key={i} className="card kpi"><div className="skeleton" style={{ width: "60%", height: 12 }} /><div className="skeleton" style={{ width: "80%", height: 24, marginTop: 8 }} /><div className="skeleton" style={{ width: "40%", height: 12, marginTop: 8 }} /></div>)}</div>
      <div className="grid-main">
        <div className="card" style={{ padding: 16 }}><div className="skeleton" style={{ width: 160, height: 14 }} /><div className="skeleton" style={{ height: 240, marginTop: 16 }} /></div>
        <div className="card" style={{ padding: 16 }}>{[0, 1, 2, 3].map((i) => <div key={i} className="row" style={{ marginBottom: 14 }}><div className="skeleton" style={{ width: 34, height: 34, borderRadius: 9 }} /><div className="grow"><div className="skeleton" style={{ height: 12, width: "70%" }} /><div className="skeleton" style={{ height: 10, width: "45%", marginTop: 6 }} /></div></div>)}</div>
      </div>
    </div>
  );
}

/* =====================================================================
   Connexion (téléphone + mot de passe + code SMS)
   ===================================================================== */
function AuthScreen({ onSuccess, mode }) {
  const enLigne = mode === "api";
  const [etape, setEtape] = useState(enLigne ? "chargement" : "connexion"); // chargement | inscription | connexion
  const [nom, setNom] = useState("");
  const [tel, setTel] = useState("");
  const [mdp, setMdp] = useState("");
  const [mdp2, setMdp2] = useState("");
  const [codeRequis, setCodeRequis] = useState(false);
  const [codeInstall, setCodeInstall] = useState("");
  const [voir, setVoir] = useState(false);
  const [erreur, setErreur] = useState("");
  const [errKey, setErrKey] = useState(0);
  const [busy, setBusy] = useState(false);

  // Serveur : au tout premier lancement, on crée le compte administrateur
  useEffect(() => {
    if (!enLigne) return;
    apiFetch("GET", "/api/auth/etat")
      .then((r) => { setCodeRequis(!!r.code_installation); setEtape(r.initialise ? "connexion" : "inscription"); })
      .catch(() => setEtape("connexion"));
  }, []);

  const fail = (m) => { setErreur(m); setErrKey((k) => k + 1); };

  const valider = async (e) => {
    e.preventDefault();
    setErreur("");
    const inscription = etape === "inscription";
    if (inscription && !nom.trim()) return fail("Indiquez votre nom.");
    if (tel.replace(/\D/g, "").length < 8) return fail("Entrez un numéro de téléphone valide.");
    const min = enLigne ? 6 : 4;
    if (mdp.length < min) return fail(`Le mot de passe doit contenir au moins ${min} caractères.`);
    if (inscription && mdp !== mdp2) return fail("Les deux mots de passe ne correspondent pas.");
    setBusy(true);
    if (!enLigne) {
      setTimeout(() => {
        const a = { tel, connecteLe: new Date().toISOString() };
        writeJson(AUTH_KEY, a);
        onSuccess(a);
      }, 500);
      return;
    }
    try {
      if (inscription) await apiFetch("POST", "/api/auth/inscription", { nom: nom.trim(), telephone: tel, mot_de_passe: mdp, code_installation: codeInstall.trim() });
      const r = await apiFetch("POST", "/api/auth/connexion", { telephone: tel, mot_de_passe: mdp });
      const a = { tel, jeton: r.jeton, utilisateur: r.utilisateur, connecteLe: new Date().toISOString() };
      writeJson(AUTH_KEY, a);
      onSuccess(a);
    } catch (err) {
      setBusy(false);
      fail(err.message);
    }
  };

  return (
    <div className="auth">
      <div className="auth-hero">
        <div className="brand" style={{ width: "auto" }}><span className="brand-mark"><ShoppingBag size={16} strokeWidth={2.4} /></span>MonCommerce</div>
        <div>
          <h1>Gérez votre commerce, <em>simplement.</em></h1>
          <p>Ventes, commandes, clients, stock et finances réunis dans un seul espace, sur ordinateur comme sur mobile.</p>
          <div className="auth-feats">
            {[[ShoppingCart, "Suivi des commandes de bout en bout"], [Banknote, "Espèces, Orange Money, MTN, Moov, Wave, carte"], [Receipt, "Tickets de caisse imprimés ou téléchargeables"]].map(([I, t], i) => (
              <div key={t} style={{ "--i": i }}><span><I size={14} /></span>{t}</div>
            ))}
          </div>
        </div>
        <div className="auth-float">
          <small>Chiffre d'affaires · 7 jours</small>
          <strong>1 245 000 FCFA</strong>
          <div className="mini-bars">{[40, 65, 35, 80, 55, 90, 72].map((h, i) => <i key={i} style={{ height: h + "%", "--i": i }} />)}</div>
        </div>
      </div>

      <div className="auth-side">
        <div className="card auth-card">
          <div className="card-body">
            <div className="auth-logo"><span className="brand-mark"><ShoppingBag size={16} strokeWidth={2.4} /></span>MonCommerce</div>
            {etape === "chargement" ? (
              <div className="row" style={{ justifyContent: "center", padding: "40px 0" }}><span className="spinner" /></div>
            ) : (
              <form onSubmit={valider} className="stack" key={etape} style={{ animation: "fadeUp .35s var(--ease-out)" }}>
                {etape === "inscription" ? (
                  <>
                    <div><h2>Bienvenue 👋</h2><p className="muted" style={{ marginTop: 4 }}>Créez le compte administrateur de votre boutique.</p></div>
                    <Field label="Votre nom"><Input size="lg" icon={User} value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Ex : Aïcha Koné" autoComplete="name" autoFocus /></Field>
                  </>
                ) : (
                  <div><h2>Connexion</h2><p className="muted" style={{ marginTop: 4 }}>Accédez à l'administration de votre boutique.</p></div>
                )}
                <Field label="Numéro de téléphone"><Input size="lg" icon={Phone} value={tel} onChange={(e) => setTel(e.target.value)} placeholder="07 00 00 00 00" inputMode="tel" autoComplete="tel" autoFocus={etape !== "inscription"} /></Field>
                <Field label="Mot de passe">
                  <div className="input-wrap input-lg">
                    <Lock size={16} className="input-icon" />
                    <input className="input" type={voir ? "text" : "password"} value={mdp} onChange={(e) => setMdp(e.target.value)} placeholder="••••••••" autoComplete={etape === "inscription" ? "new-password" : "current-password"} />
                    <button type="button" className="icon-btn" style={{ marginRight: 4 }} onClick={() => setVoir((v) => !v)} aria-label={voir ? "Masquer" : "Afficher"}>{voir ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                  </div>
                </Field>
                {etape === "inscription" && codeRequis && <Field label="Code d'installation" help="Affiché dans votre hébergeur (variable CODE_INSTALLATION). Il protège la création du premier compte."><Input size="lg" icon={ShieldCheck} value={codeInstall} onChange={(e) => setCodeInstall(e.target.value)} autoComplete="off" /></Field>}
                {etape === "inscription" && <Field label="Confirmez le mot de passe" help="6 caractères minimum."><Input size="lg" icon={Lock} type={voir ? "text" : "password"} value={mdp2} onChange={(e) => setMdp2(e.target.value)} placeholder="••••••••" autoComplete="new-password" /></Field>}
                {erreur && <div className="banner banner-critical" key={errKey}><AlertCircle size={16} />{erreur}</div>}
                <Btn type="submit" variant="primary" size="lg" full loading={busy}>{etape === "inscription" ? "Créer le compte" : "Se connecter"}</Btn>
                {!enLigne && <div className="banner banner-warning"><AlertTriangle size={16} /><div>Mode démo hors ligne : les données restent dans ce navigateur.</div></div>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =====================================================================
   Ticket de caisse public (lien / QR code remis au client, sans connexion)
   ===================================================================== */
function PageRecuPublic({ jeton }) {
  const [t, setT] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    apiFetch("GET", `/api/recus/${encodeURIComponent(jeton || "")}`)
      .then((r) => setT({ ...r, lien: lienTicket(jeton) }))
      .catch((e) => setErr(e.statut === 404 ? "Ce ticket n'existe pas ou le lien est incomplet." : e.message));
  }, [jeton]);
  return (
    <div className="recu-public">
      <div className="recu-public-head">
        <span className="brand-mark"><Receipt size={16} strokeWidth={2.4} /></span>
        <div><strong>{t?.boutique?.nom || "Ticket de caisse"}</strong><div className="subtle">Ticket de caisse {t ? t.numero : ""}</div></div>
      </div>
      {err ? (
        <div className="card"><EmptyState icon={Receipt} title="Ticket introuvable">{err}</EmptyState></div>
      ) : !t ? (
        <div className="row" style={{ justifyContent: "center", padding: 60 }}><span className="spinner" /></div>
      ) : (
        <div className="stack" style={{ animation: "fadeUp .4s var(--ease-out)" }}>
          <p className="muted" style={{ textAlign: "center" }}>Merci pour votre achat ! Téléchargez ou imprimez votre ticket ci-dessous.</p>
          <TicketCaisse t={t} />
          <ActionsTicket t={t} />
        </div>
      )}
    </div>
  );
}

/* =====================================================================
   Application
   ===================================================================== */
function useSettings() {
  const [settings, setSettingsState] = useState(() => ({ theme: "systeme", ...(readJson(SETTINGS_KEY) || {}) }));
  const setSettings = useCallback((s) => { setSettingsState(s); writeJson(SETTINGS_KEY, s); }, []);
  const [sysDark, setSysDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const f = (e) => setSysDark(e.matches);
    mq.addEventListener("change", f);
    return () => mq.removeEventListener("change", f);
  }, []);
  const effectiveTheme = settings.theme === "sombre" || (settings.theme === "systeme" && sysDark) ? "dark" : "light";
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", effectiveTheme);
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", effectiveTheme === "dark" ? "#0c0c0c" : "#1a1a1a");
  }, [effectiveTheme]);
  return { settings, setSettings, effectiveTheme };
}

/* Écran d'attente plein écran (recherche du serveur, chargement des données) */
function Splash({ texte }) {
  return (
    <div className="splash">
      <span className="brand-mark splash-mark"><ShoppingBag size={22} strokeWidth={2.4} /></span>
      <div className="strong">MonCommerce</div>
      <div className="row subtle"><span className="spinner" style={{ width: 14, height: 14 }} />{texte}</div>
    </div>
  );
}

/* Aucun serveur trouvé : réessayer ou continuer en mode démo local */
function ServeurIntrouvable({ onRetry, onDemo }) {
  return (
    <div className="splash">
      <div className="card" style={{ maxWidth: 460, width: "calc(100% - 32px)", animation: "fadeUp .4s var(--ease-out)" }}>
        <div className="card-body stack">
          <div className="row" style={{ gap: 12 }}>
            <span className="todo-icon tint-3" style={{ width: 44, height: 44, borderRadius: 12 }}><AlertTriangle size={22} /></span>
            <div><h2 style={{ fontSize: 18, fontWeight: 700 }}>Serveur introuvable</h2><p className="muted">L'API MonCommerce ne répond pas.</p></div>
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Démarrez le serveur depuis le dossier <b>backend</b> avec <code>npm start</code>, puis ouvrez <b>http://localhost:4000</b>.
            Vous pouvez aussi continuer en mode démo : les données resteront dans ce navigateur.
          </p>
          <div className="row" style={{ justifyContent: "flex-end", flexWrap: "wrap" }}>
            <Btn onClick={onDemo}>Continuer en mode démo</Btn>
            <Btn variant="primary" icon={RotateCcw} onClick={onRetry}>Réessayer</Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

function App() {
  // mode : null = recherche du serveur, "api" = connecté, "demo" = local, "hors-ligne" = serveur introuvable
  const [mode, setMode] = useState(null);
  const modeRef = useRef(null);
  modeRef.current = mode;
  const { data, update, replace } = useStore(mode);
  const { settings, setSettings, effectiveTheme } = useSettings();
  const [route, go] = useRoute();
  const [auth, setAuth] = useState(() => readJson(AUTH_KEY));
  const [booting, setBooting] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [sale, setSale] = useState({ open: false, preset: null });
  const [cmdk, setCmdk] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const mainRef = useRef(null);
  const pending = useRef(0);
  const refreshTimer = useRef(null);

  const toast = useCallback((t) => setToasts((s) => [...s.slice(-3), { ...t, id: uid() }]), []);
  const dismiss = useCallback((id) => setToasts((s) => s.filter((t) => t.id !== id)), []);
  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);
  const doneConfirm = (ok) => { confirmState?.resolve(ok); setConfirmState(null); };
  const openSale = useCallback((preset = null) => setSale({ open: true, preset }), []);
  const openCmdk = useCallback(() => setCmdk(true), []);

  // Connecté au serveur, un jeton est obligatoire ; en démo, la session locale suffit
  const session = mode === "api" ? (auth?.jeton ? auth : null) : auth && !auth.jeton ? auth : null;

  const chercherServeur = useCallback(async () => {
    setMode(null);
    const base = await detecterServeur();
    if (base === null) { setMode("hors-ligne"); return; }
    API_BASE = base;
    setMode("api");
  }, []);
  useEffect(() => { chercherServeur(); }, []);

  const passerEnDemo = () => { setMode("demo"); replace(chargerLocal()); };

  /** Recharge toutes les données depuis le serveur. */
  const rafraichir = useCallback(async () => {
    if (modeRef.current !== "api" || !readJson(AUTH_KEY)?.jeton) return;
    try {
      replace(depuisServeur(await apiFetch("GET", "/api/donnees")));
    } catch (e) {
      if (e.statut !== 401) toast({ title: "Impossible de charger les données", desc: e.message, tone: "critical" });
    }
  }, []);

  /**
   * Envoie au serveur les requêtes correspondant à une modification déjà
   * appliquée localement (mise à jour optimiste). Renvoie les réponses, ou
   * null en cas d'échec : l'erreur est signalée et les données rechargées.
   * En mode démo, ne fait rien.
   */
  const sync = useCallback(async (...requetes) => {
    if (modeRef.current !== "api") return [];
    pending.current += 1;
    try {
      const res = [];
      for (const r of requetes) res.push(await apiFetch(...r));
      return res;
    } catch (e) {
      if (e.statut !== 401) toast({ title: "Modification non enregistrée", desc: e.message, tone: "critical" });
      return null;
    } finally {
      pending.current -= 1;
      clearTimeout(refreshTimer.current);
      // Resynchronise (numéros, stock…) une fois toutes les requêtes terminées
      refreshTimer.current = setTimeout(() => { if (pending.current === 0) rafraichir(); }, 400);
    }
  }, []);

  /** Remplace toutes les données (restauration, démo, import du navigateur). */
  const remplacerTout = useCallback(async (d) => {
    if (modeRef.current !== "api") { replace(d); return true; }
    try {
      await apiFetch("POST", "/api/donnees/import", versServeur(d));
      await rafraichir();
      return true;
    } catch (e) {
      toast({ title: "Import impossible", desc: e.message, tone: "critical" });
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    removeKey(AUTH_KEY);
    setAuth(null);
    if (modeRef.current === "api") replace(null);
    window.location.hash = "";
  }, []);

  // Chargement des données une fois connecté
  useEffect(() => {
    if (mode === "api" && session) { setBooting(true); rafraichir().finally(() => setBooting(false)); }
    if (mode === "demo") { const t = setTimeout(() => setBooting(false), 400); return () => clearTimeout(t); }
  }, [mode, session?.jeton]);

  // Session expirée (jeton refusé par le serveur)
  useEffect(() => {
    const h = () => {
      if (!readJson(AUTH_KEY)) return;
      logout();
      toast({ title: "Session expirée", desc: "Reconnectez-vous pour continuer.", tone: "info" });
    };
    window.addEventListener("mc-session-expiree", h);
    return () => window.removeEventListener("mc-session-expiree", h);
  }, []);

  // Retour sur l'onglet : on récupère les changements faits depuis un autre appareil
  useEffect(() => {
    const h = () => { if (document.visibilityState === "visible" && pending.current === 0) rafraichir(); };
    document.addEventListener("visibilitychange", h);
    return () => document.removeEventListener("visibilitychange", h);
  }, []);

  const cycleTheme = useCallback(() => {
    const order = ["systeme", "clair", "sombre"];
    const next = order[(order.indexOf(settings.theme) + 1) % 3];
    setSettings({ ...settings, theme: next });
    toast({ title: `Thème : ${next === "systeme" ? "système" : next}`, tone: "info", duration: 1800 });
  }, [settings, setSettings, toast]);

  useEffect(() => {
    const h = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k" && document.querySelector(".app")) { e.preventDefault(); setCmdk((o) => !o); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  useEffect(() => { mainRef.current?.scrollTo({ top: 0, behavior: "instant" }); setDrawer(false); }, [route.page, route.page === "commandes" || route.page === "clients" ? route.id : null]);

  // Rôle : le serveur fait foi (data.role) ; en démo locale, tous les droits
  const estAdmin = mode !== "api" || (data?.role || session?.utilisateur?.role) === "admin";
  const ctx = { data, update, sync, replace, remplacerTout, rafraichir, mode, settings, setSettings, effectiveTheme, cycleTheme, route, go, toast, confirm, openSale, openCmdk, logout, auth: session, estAdmin };

  if (mode === null) return <Splash texte="Connexion au serveur…" />;
  if (mode === "hors-ligne") return <ServeurIntrouvable onRetry={chercherServeur} onDemo={passerEnDemo} />;

  // Ticket consulté par un client : aucune connexion requise
  if (route.page === "recu" && mode === "api") {
    return (
      <AppCtx.Provider value={ctx}>
        <PageRecuPublic jeton={route.id} />
        <Toasts items={toasts} onDismiss={dismiss} />
      </AppCtx.Provider>
    );
  }

  if (!session) {
    return (
      <AppCtx.Provider value={ctx}>
        <AuthScreen key={mode} mode={mode} onSuccess={(a) => { setAuth(a); toast({ title: `Bienvenue${a.utilisateur?.nom ? " " + a.utilisateur.nom.split(" ")[0] : ""} 👋`, desc: "Connexion réussie." }); }} />
        <Toasts items={toasts} onDismiss={dismiss} />
      </AppCtx.Provider>
    );
  }

  if (!data) {
    return (
      <AppCtx.Provider value={ctx}>
        <Splash texte="Chargement des données…" />
        <Toasts items={toasts} onDismiss={dismiss} />
      </AppCtx.Provider>
    );
  }

  const isDetail = (route.page === "commandes" || route.page === "clients") && route.id && route.id !== "nouveau";
  const pageKey = route.page + (isDetail ? "/" + route.id : "");
  let content;
  switch (route.page) {
    case "commandes": content = isDetail ? <PageCommande id={route.id} /> : <PageCommandes route={route} />; break;
    case "produits": content = <PageProduits route={route} />; break;
    case "clients": content = isDetail ? <PageClient id={route.id} /> : <PageClients route={route} />; break;
    case "ventes": content = <PageVentes />; break;
    case "stocks": content = estAdmin ? <PageStocks route={route} /> : <AccesReserve />; break;
    case "marketing": content = estAdmin ? <PageMarketing route={route} /> : <AccesReserve />; break;
    case "finances": content = estAdmin ? <PageFinances route={route} /> : <AccesReserve />; break;
    case "parametres": content = <PageParametres />; break;
    default: content = <PageAccueil />;
  }

  return (
    <AppCtx.Provider value={ctx}>
      <div className="app">
        <Topbar onMenu={() => setDrawer(true)} />
        <div className="shell">
          <aside className="sidebar"><SidebarNav /></aside>
          <main className="main" ref={mainRef}>
            <div className="page" key={booting ? "boot" : pageKey}>{booting ? <SkeletonPage /> : content}</div>
          </main>
        </div>
        <BottomNav onMenu={() => setDrawer(true)} />
      </div>
      <Drawer open={drawer} onClose={() => setDrawer(false)}><SidebarNav onNavigate={() => setDrawer(false)} /></Drawer>
      <SaleModal open={sale.open} preset={sale.preset} onClose={() => setSale((s) => ({ ...s, open: false }))} />
      <CommandPalette open={cmdk} onClose={() => setCmdk(false)} />
      <ConfirmDialog state={confirmState} onDone={doneConfirm} />
      <Toasts items={toasts} onDismiss={dismiss} />
    </AppCtx.Provider>
  );
}

/* =====================================================================
   Montage
   ===================================================================== */
createRoot(document.getElementById("root")).render(<App />);
