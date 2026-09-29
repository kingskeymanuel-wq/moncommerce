import React, { useState, useEffect, useMemo, useCallback } from "react";
import { createRoot } from "react-dom/client";
import {
  Home, Users, ShoppingBag, Package, TrendingUp, Plus, X, Search,
  ChevronRight, ChevronLeft, Phone, Mail, MapPin, Star, Trash2, Edit3,
  CreditCard, Truck, CheckCircle2, Clock, XCircle, ArrowUpRight, ArrowDownRight,
  Wallet, BarChart3, User, Filter, ChevronDown, Save, AlertCircle,
  Lock, ShieldCheck, LogOut, Eye, EyeOff
} from "lucide-react";

/* ============================================================
   MonCommerce — CRM de vente mobile
   Design tokens
   ============================================================ */
const FONT_IMPORT = `@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap');`;

const T = {
  navy900: "#0B1B3A",
  navy700: "#14285C",
  navy600: "#1B3372",
  gold: "#E8A93B",
  goldDark: "#C98A22",
  emerald: "#1FA97A",
  coral: "#F0614F",
  paper: "#FAF7F0",
  paperDim: "#F1ECE1",
  ink: "#16213E",
  inkSoft: "#5A6482",
  line: "#E6E0D2",
};

const uid = () => Math.random().toString(36).slice(2, 10);
const fmt = (n) =>
  new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n || 0)) + " FCFA";
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

const STATUTS_CMD = [
  { key: "en_attente", label: "En attente", color: T.inkSoft, icon: Clock },
  { key: "confirmee", label: "Confirmée", color: T.gold, icon: CheckCircle2 },
  { key: "expediee", label: "Expédiée", color: T.navy600, icon: Truck },
  { key: "livree", label: "Livrée", color: T.emerald, icon: CheckCircle2 },
  { key: "annulee", label: "Annulée", color: T.coral, icon: XCircle },
];

const EMOJI_PACKS = ["📦", "🎁", "✨", "🛍️", "💎", "🚀", "🌟", "🔥"];

/* ============================================================
   Données de démonstration
   ============================================================ */
function seedData() {
  const clients = [
    { id: uid(), nom: "Aïcha Koné", tel: "07 01 23 45 67", email: "aicha.kone@mail.ci", ville: "Cocody, Abidjan", statut: "VIP", dateAjout: "2025-11-02", notes: "Cliente fidèle, préfère le paiement Mobile Money" },
    { id: uid(), nom: "Yao Kouassi", tel: "05 44 12 98 76", email: "yao.k@mail.ci", ville: "Yopougon, Abidjan", statut: "Standard", dateAjout: "2026-01-14", notes: "" },
    { id: uid(), nom: "Fatou Diabaté", tel: "01 22 33 44 55", email: "fatou.d@mail.ci", ville: "Bouaké", statut: "VIP", dateAjout: "2025-09-20", notes: "Achète en gros pour revente" },
    { id: uid(), nom: "Ibrahim Traoré", tel: "07 88 99 00 11", email: "ibrahim.t@mail.ci", ville: "Marcory, Abidjan", statut: "Standard", dateAjout: "2026-03-05", notes: "" },
  ];
  const packs = [
    { id: uid(), nom: "Pack Découverte", prix: 15000, stock: 42, emoji: "📦", desc: "Idéal pour démarrer, 3 articles essentiels" },
    { id: uid(), nom: "Pack Premium", prix: 45000, stock: 18, emoji: "💎", desc: "Sélection haut de gamme, 6 articles" },
    { id: uid(), nom: "Pack Business", prix: 90000, stock: 7, emoji: "🚀", desc: "Pour revendeurs, quantité en gros" },
    { id: uid(), nom: "Pack Cadeau", prix: 25000, stock: 25, emoji: "🎁", desc: "Emballage soigné, prêt à offrir" },
  ];
  const ventes = [
    { id: uid(), clientId: clients[0].id, packId: packs[1].id, qte: 1, prixUnitaire: 45000, date: "2026-08-10", paiement: "Mobile Money" },
    { id: uid(), clientId: clients[2].id, packId: packs[2].id, qte: 2, prixUnitaire: 90000, date: "2026-08-11", paiement: "Espèces" },
    { id: uid(), clientId: clients[1].id, packId: packs[0].id, qte: 1, prixUnitaire: 15000, date: "2026-08-12", paiement: "Carte" },
    { id: uid(), clientId: clients[3].id, packId: packs[3].id, qte: 1, prixUnitaire: 25000, date: "2026-08-12", paiement: "Mobile Money" },
    { id: uid(), clientId: clients[0].id, packId: packs[3].id, qte: 3, prixUnitaire: 25000, date: "2026-08-13", paiement: "Mobile Money" },
  ];
  const commandes = ventes.map((v, i) => ({
    id: uid(),
    venteId: v.id,
    numero: "CMD-" + (1000 + i),
    statut: ["livree", "expediee", "confirmee", "en_attente", "confirmee"][i] || "en_attente",
    adresseLivraison: clients.find((c) => c.id === v.clientId)?.ville || "",
  }));
  const investissements = [
    { id: uid(), libelle: "Achat de stock — Pack Premium x20", categorie: "Stock", montant: 620000, date: "2026-07-28" },
    { id: uid(), libelle: "Publicité réseaux sociaux", categorie: "Marketing", montant: 80000, date: "2026-08-01" },
    { id: uid(), libelle: "Emballages & étiquettes", categorie: "Logistique", montant: 35000, date: "2026-08-05" },
    { id: uid(), libelle: "Achat de stock — Pack Business x10", categorie: "Stock", montant: 550000, date: "2026-08-09" },
  ];
  return { clients, packs, ventes, commandes, investissements };
}

/* ============================================================
   Persistance (localStorage du navigateur)
   ============================================================ */
const STORAGE_KEY = "moncommerce-data";

function useStore() {
  const [data, setData] = useState(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setData(JSON.parse(raw));
      } else {
        const seed = seedData();
        setData(seed);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      }
    } catch (e) {
      setData(seedData());
    } finally {
      setReady(true);
    }
  }, []);

  const persist = useCallback((next) => {
    setData(next);
    setSaving(true);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch (e) {
      /* stockage indisponible — on continue en mémoire */
    } finally {
      setSaving(false);
    }
  }, []);

  return { data, setData: persist, ready, saving };
}

/* ============================================================
   UI atoms
   ============================================================ */
const Card = ({ children, style, onClick, className = "" }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: "#fff",
      borderRadius: 18,
      border: `1px solid ${T.line}`,
      boxShadow: "0 1px 2px rgba(11,27,58,0.04)",
      ...style,
    }}
  >
    {children}
  </div>
);

const Pill = ({ color, children, bg }) => (
  <span
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      fontFamily: "Inter, sans-serif",
      fontSize: 11.5,
      fontWeight: 700,
      color: color,
      background: bg || color + "18",
      padding: "4px 10px",
      borderRadius: 999,
      letterSpacing: 0.2,
    }}
  >
    {children}
  </span>
);

const Btn = ({ children, onClick, variant = "primary", style, full, icon: Icon, type = "button", disabled }) => {
  const variants = {
    primary: { background: T.navy900, color: "#fff" },
    gold: { background: T.gold, color: T.navy900 },
    ghost: { background: "transparent", color: T.navy900, border: `1.5px solid ${T.navy900}` },
    danger: { background: "#fff", color: T.coral, border: `1.5px solid ${T.coral}30` },
    subtle: { background: T.paperDim, color: T.ink },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        fontFamily: "Sora, sans-serif",
        fontWeight: 600,
        fontSize: 14.5,
        padding: "12px 18px",
        borderRadius: 14,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        width: full ? "100%" : "auto",
        transition: "transform .12s ease, opacity .12s ease",
        ...variants[variant],
        ...style,
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.97)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {Icon && <Icon size={16} strokeWidth={2.3} />}
      {children}
    </button>
  );
};

const Field = ({ label, children }) => (
  <label style={{ display: "block", marginBottom: 14 }}>
    <span style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, fontWeight: 600, color: T.inkSoft, marginBottom: 6, display: "block" }}>
      {label}
    </span>
    {children}
  </label>
);

const inputStyle = {
  width: "100%",
  boxSizing: "border-box",
  padding: "12px 14px",
  borderRadius: 12,
  border: `1.5px solid ${T.line}`,
  fontFamily: "Inter, sans-serif",
  fontSize: 14.5,
  color: T.ink,
  background: T.paper,
  outline: "none",
};

const Sheet = ({ title, onClose, children }) => (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(11,27,58,0.45)",
      zIndex: 50,
      display: "flex",
      alignItems: "flex-end",
      borderRadius: 40,
      overflow: "hidden",
    }}
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: T.paper,
        width: "100%",
        maxHeight: "88%",
        borderRadius: "24px 24px 0 0",
        padding: "18px 20px 26px",
        overflowY: "auto",
        boxShadow: "0 -8px 30px rgba(11,27,58,0.25)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <div style={{ width: 40, height: 4, borderRadius: 4, background: T.line }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <h3 style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18, color: T.navy900, margin: 0 }}>{title}</h3>
        <button onClick={onClose} style={{ background: T.paperDim, border: "none", borderRadius: 10, padding: 7, cursor: "pointer" }}>
          <X size={16} color={T.navy900} />
        </button>
      </div>
      {children}
    </div>
  </div>
);

const Empty = ({ icon: Icon, title, sub }) => (
  <div style={{ textAlign: "center", padding: "40px 20px", color: T.inkSoft }}>
    <Icon size={30} style={{ marginBottom: 10, opacity: 0.5 }} />
    <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, color: T.navy900 }}>{title}</div>
    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, marginTop: 4 }}>{sub}</div>
  </div>
);

/* ============================================================
   Header commun
   ============================================================ */
const ScreenHeader = ({ title, sub, right }) => (
  <div style={{ padding: "22px 20px 16px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
    <div>
      <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", margin: 0, letterSpacing: -0.3 }}>{title}</h1>
      {sub && <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#B9C3E0", marginTop: 3 }}>{sub}</div>}
    </div>
    {right}
  </div>
);

/* ============================================================
   Ticket de caisse (signature visuelle)
   ============================================================ */
const Ticket = ({ vente, client, pack, statut }) => {
  const total = vente.qte * vente.prixUnitaire;
  const st = STATUTS_CMD.find((s) => s.key === statut) || STATUTS_CMD[0];
  return (
    <div style={{ position: "relative", filter: "drop-shadow(0 6px 14px rgba(11,27,58,0.12))" }}>
      <svg width="0" height="0">
        <defs>
          <clipPath id={`zig-${vente.id}`} clipPathUnits="objectBoundingBox">
            <path d="M0,0 H1 V0.94 L0.96,1 L0.92,0.94 L0.88,1 L0.84,0.94 L0.8,1 L0.76,0.94 L0.72,1 L0.68,0.94 L0.64,1 L0.6,0.94 L0.56,1 L0.52,0.94 L0.48,1 L0.44,0.94 L0.4,1 L0.36,0.94 L0.32,1 L0.28,0.94 L0.24,1 L0.2,0.94 L0.16,1 L0.12,0.94 L0.08,1 L0.04,0.94 L0,1 Z" />
          </clipPath>
        </defs>
      </svg>
      <div style={{ background: "#fff", padding: "18px 18px 26px", clipPath: `url(#zig-${vente.id})` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 22 }}>{pack?.emoji || "📦"}</span>
            <div>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14.5, color: T.navy900 }}>{pack?.nom || "Produit"}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{client?.nom || "Client"}</div>
            </div>
          </div>
          <Pill color={st.color}>{st.label}</Pill>
        </div>
        <div style={{ borderTop: `1.5px dashed ${T.line}`, margin: "10px 0" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "IBM Plex Mono, monospace", fontSize: 12.5, color: T.inkSoft, marginBottom: 4 }}>
          <span>{vente.qte} × {fmt(vente.prixUnitaire)}</span>
          <span>{fmtDate(vente.date)}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 8 }}>
          <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{vente.paiement}</span>
          <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 17, color: T.navy900 }}>{fmt(total)}</span>
        </div>
      </div>
    </div>
  );
};

/* ============================================================
   ÉCRAN : Tableau de bord
   ============================================================ */
function DashboardScreen({ data }) {
  const stats = useMemo(() => {
    const ca = data.ventes.reduce((s, v) => s + v.qte * v.prixUnitaire, 0);
    const invest = data.investissements.reduce((s, i) => s + i.montant, 0);
    const benefice = ca - invest;
    const clientsActifs = new Set(data.ventes.map((v) => v.clientId)).size;
    const cmdEnCours = data.commandes.filter((c) => !["livree", "annulee"].includes(c.statut)).length;
    return { ca, invest, benefice, clientsActifs, cmdEnCours };
  }, [data]);

  const last7 = useMemo(() => {
    const days = [...Array(7)].map((_, i) => {
      const d = new Date("2026-08-13");
      d.setDate(d.getDate() - (6 - i));
      return d.toISOString().slice(0, 10);
    });
    return days.map((day) => ({
      day,
      total: data.ventes.filter((v) => v.date === day).reduce((s, v) => s + v.qte * v.prixUnitaire, 0),
    }));
  }, [data]);
  const maxDay = Math.max(1, ...last7.map((d) => d.total));

  const topPacks = useMemo(() => {
    const byPack = {};
    data.ventes.forEach((v) => {
      byPack[v.packId] = (byPack[v.packId] || 0) + v.qte;
    });
    return Object.entries(byPack)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, qte]) => ({ pack: data.packs.find((p) => p.id === id), qte }));
  }, [data]);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: `linear-gradient(160deg, ${T.navy900}, ${T.navy600})`, borderRadius: "0 0 28px 28px" }}>
        <ScreenHeader title="Bonjour 👋" sub={fmtDate("2026-08-13")} />
        <div style={{ padding: "0 20px 22px" }}>
          <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12.5, color: "#B9C3E0", marginBottom: 4 }}>Chiffre d'affaires total</div>
          <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 32, color: "#fff", letterSpacing: -0.5 }}>{fmt(stats.ca)}</div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <Pill color={stats.benefice >= 0 ? T.emerald : T.coral} bg="rgba(255,255,255,0.14)">
              {stats.benefice >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              Bénéfice {fmt(stats.benefice)}
            </Pill>
          </div>
        </div>
      </div>

      <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {[
          { label: "Clients actifs", value: stats.clientsActifs, icon: Users, color: T.navy900 },
          { label: "Commandes en cours", value: stats.cmdEnCours, icon: Truck, color: T.gold },
          { label: "Investi (total)", value: fmt(stats.invest), icon: Wallet, color: T.coral, small: true },
          { label: "Packs actifs", value: data.packs.length, icon: Package, color: T.emerald },
        ].map((k, i) => (
          <Card key={i} style={{ padding: 14 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: k.color + "16", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 8 }}>
              <k.icon size={16} color={k.color} />
            </div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: k.small ? 15 : 19, color: T.navy900 }}>{k.value}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft, marginTop: 2 }}>{k.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ padding: "18px 20px 0" }}>
        <Card style={{ padding: 16 }}>
          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.navy900, marginBottom: 14 }}>Ventes — 7 derniers jours</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 90 }}>
            {last7.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    width: "100%",
                    height: Math.max(4, (d.total / maxDay) * 74),
                    borderRadius: 6,
                    background: i === 6 ? T.gold : T.navy600,
                  }}
                />
                <span style={{ fontFamily: "Inter, sans-serif", fontSize: 9.5, color: T.inkSoft }}>
                  {new Date(d.day).toLocaleDateString("fr-FR", { weekday: "short" }).slice(0, 3)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div style={{ padding: "18px 20px 0" }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.navy900, marginBottom: 10 }}>Packs les plus vendus</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topPacks.map((t, i) => t.pack && (
            <Card key={i} style={{ padding: "12px 14px", display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>{t.pack.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13.5, color: T.navy900 }}>{t.pack.nom}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{t.qte} unités vendues</div>
              </div>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 13, color: T.navy900 }}>{fmt(t.pack.prix)}</div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   ÉCRAN : Clients (CRM)
   ============================================================ */
function ClientsScreen({ data, setData }) {
  const [q, setQ] = useState("");
  const [openForm, setOpenForm] = useState(false);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({ nom: "", tel: "", email: "", ville: "", statut: "Standard", notes: "" });

  const filtered = data.clients.filter((c) => c.nom.toLowerCase().includes(q.toLowerCase()) || c.tel.includes(q));

  const clientVentes = (id) => data.ventes.filter((v) => v.clientId === id);
  const totalDepense = (id) => clientVentes(id).reduce((s, v) => s + v.qte * v.prixUnitaire, 0);

  const saveClient = () => {
    if (!form.nom.trim() || !form.tel.trim()) return;
    const next = {
      ...data,
      clients: [...data.clients, { id: uid(), dateAjout: "2026-08-13", ...form }],
    };
    setData(next);
    setForm({ nom: "", tel: "", email: "", ville: "", statut: "Standard", notes: "" });
    setOpenForm(false);
  };

  const removeClient = (id) => {
    setData({ ...data, clients: data.clients.filter((c) => c.id !== id) });
    setSelected(null);
  };

  return (
    <div style={{ paddingBottom: 90, position: "relative" }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader title="Clientèle" sub={`${data.clients.length} clients enregistrés`} />
      </div>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", background: "#fff", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "0 12px" }}>
            <Search size={16} color={T.inkSoft} />
            <input
              placeholder="Rechercher un client..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ border: "none", outline: "none", padding: "11px 8px", fontFamily: "Inter, sans-serif", fontSize: 13.5, width: "100%", background: "transparent" }}
            />
          </div>
          <button onClick={() => setOpenForm(true)} style={{ background: T.gold, border: "none", borderRadius: 12, width: 42, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
            <Plus size={19} color={T.navy900} />
          </button>
        </div>
      </div>

      <div style={{ padding: "14px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.length === 0 && <Empty icon={Users} title="Aucun client" sub="Ajoutez votre premier client" />}
        {filtered.map((c) => (
          <Card key={c.id} onClick={() => setSelected(c)} style={{ padding: 14, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: T.navy900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15 }}>
              {c.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 14, color: T.navy900 }}>{c.nom}</span>
                {c.statut === "VIP" && <Star size={12} color={T.gold} fill={T.gold} />}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.inkSoft }}>{c.tel} · {c.ville}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 12.5, color: T.navy900 }}>{fmt(totalDepense(c.id))}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: T.inkSoft }}>{clientVentes(c.id).length} achats</div>
            </div>
          </Card>
        ))}
      </div>

      {openForm && (
        <Sheet title="Nouveau client" onClose={() => setOpenForm(false)}>
          <Field label="Nom complet"><input style={inputStyle} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Awa Bamba" /></Field>
          <Field label="Téléphone"><input style={inputStyle} value={form.tel} onChange={(e) => setForm({ ...form, tel: e.target.value })} placeholder="07 00 00 00 00" /></Field>
          <Field label="Email"><input style={inputStyle} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemple.com" /></Field>
          <Field label="Ville / Quartier"><input style={inputStyle} value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} placeholder="Ex : Cocody, Abidjan" /></Field>
          <Field label="Statut">
            <div style={{ display: "flex", gap: 8 }}>
              {["Standard", "VIP"].map((s) => (
                <button key={s} onClick={() => setForm({ ...form, statut: s })} style={{ flex: 1, padding: "10px", borderRadius: 10, border: `1.5px solid ${form.statut === s ? T.navy900 : T.line}`, background: form.statut === s ? T.navy900 : "#fff", color: form.statut === s ? "#fff" : T.ink, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>
                  {s}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Notes"><textarea style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Préférences, remarques..." /></Field>
          <Btn full icon={Save} onClick={saveClient} style={{ marginTop: 6 }}>Enregistrer le client</Btn>
        </Sheet>
      )}

      {selected && (
        <Sheet title="Fiche client" onClose={() => setSelected(null)}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: T.navy900, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 18 }}>
              {selected.nom.split(" ").map((p) => p[0]).slice(0, 2).join("")}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 16, color: T.navy900 }}>{selected.nom}</span>
                {selected.statut === "VIP" && <Pill color={T.gold}>VIP</Pill>}
              </div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.inkSoft }}>Client depuis {fmtDate(selected.dateAjout)}</div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: T.ink }}><Phone size={14} color={T.inkSoft} /> {selected.tel}</div>
            {selected.email && <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: T.ink }}><Mail size={14} color={T.inkSoft} /> {selected.email}</div>}
            {selected.ville && <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: "Inter, sans-serif", fontSize: 13.5, color: T.ink }}><MapPin size={14} color={T.inkSoft} /> {selected.ville}</div>}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
            <Card style={{ padding: 12 }}>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 16, color: T.navy900 }}>{fmt(totalDepense(selected.id))}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft }}>Total dépensé</div>
            </Card>
            <Card style={{ padding: 12 }}>
              <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 16, color: T.navy900 }}>{clientVentes(selected.id).length}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft }}>Achats réalisés</div>
            </Card>
          </div>

          {selected.notes && (
            <div style={{ background: T.paperDim, borderRadius: 12, padding: 12, marginBottom: 18, fontFamily: "Inter, sans-serif", fontSize: 13, color: T.ink }}>
              {selected.notes}
            </div>
          )}

          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, color: T.navy900, marginBottom: 10 }}>Historique d'achats</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
            {clientVentes(selected.id).length === 0 && <Empty icon={ShoppingBag} title="Aucun achat" sub="Ce client n'a pas encore commandé" />}
            {clientVentes(selected.id).map((v) => {
              const pack = data.packs.find((p) => p.id === v.packId);
              return (
                <Card key={v.id} style={{ padding: 12, display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{pack?.emoji}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: T.navy900 }}>{pack?.nom}</div>
                    <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft }}>{fmtDate(v.date)} · {v.qte} unité(s)</div>
                  </div>
                  <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 12.5, color: T.navy900 }}>{fmt(v.qte * v.prixUnitaire)}</div>
                </Card>
              );
            })}
          </div>

          <Btn variant="danger" full icon={Trash2} onClick={() => removeClient(selected.id)}>Supprimer ce client</Btn>
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   ÉCRAN : Ventes (vente en détail + création)
   ============================================================ */
function VentesScreen({ data, setData }) {
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ clientId: "", packId: "", qte: 1, paiement: "Mobile Money" });
  const [filterClient, setFilterClient] = useState("");

  const sorted = [...data.ventes].sort((a, b) => new Date(b.date) - new Date(a.date));
  const filtered = filterClient ? sorted.filter((v) => v.clientId === filterClient) : sorted;

  const submit = () => {
    if (!form.clientId || !form.packId) return;
    const pack = data.packs.find((p) => p.id === form.packId);
    const venteId = uid();
    const nextVentes = [...data.ventes, { id: venteId, clientId: form.clientId, packId: form.packId, qte: Number(form.qte) || 1, prixUnitaire: pack.prix, date: "2026-08-13", paiement: form.paiement }];
    const nextPacks = data.packs.map((p) => (p.id === form.packId ? { ...p, stock: Math.max(0, p.stock - (Number(form.qte) || 1)) } : p));
    const nextCommandes = [...data.commandes, { id: uid(), venteId, numero: "CMD-" + (1000 + data.commandes.length), statut: "en_attente", adresseLivraison: data.clients.find((c) => c.id === form.clientId)?.ville || "" }];
    setData({ ...data, ventes: nextVentes, packs: nextPacks, commandes: nextCommandes });
    setForm({ clientId: "", packId: "", qte: 1, paiement: "Mobile Money" });
    setOpenForm(false);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader title="Ventes" sub={`${data.ventes.length} ventes enregistrées`} />
      </div>

      <div style={{ padding: "16px 20px 0", display: "flex", gap: 10 }}>
        <select value={filterClient} onChange={(e) => setFilterClient(e.target.value)} style={{ ...inputStyle, flex: 1, background: "#fff" }}>
          <option value="">Tous les clients</option>
          {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
        </select>
        <button onClick={() => setOpenForm(true)} style={{ background: T.gold, border: "none", borderRadius: 12, padding: "0 16px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13, color: T.navy900 }}>
          <Plus size={16} /> Vente
        </button>
      </div>

      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 16 }}>
        {filtered.length === 0 && <Empty icon={ShoppingBag} title="Aucune vente" sub="Créez votre première vente" />}
        {filtered.map((v) => {
          const client = data.clients.find((c) => c.id === v.clientId);
          const pack = data.packs.find((p) => p.id === v.packId);
          const cmd = data.commandes.find((c) => c.venteId === v.id);
          return <Ticket key={v.id} vente={v} client={client} pack={pack} statut={cmd?.statut} />;
        })}
      </div>

      {openForm && (
        <Sheet title="Nouvelle vente" onClose={() => setOpenForm(false)}>
          <Field label="Client">
            <select style={{ ...inputStyle, background: "#fff" }} value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Sélectionner un client</option>
              {data.clients.map((c) => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          </Field>
          <Field label="Pack / Produit">
            <select style={{ ...inputStyle, background: "#fff" }} value={form.packId} onChange={(e) => setForm({ ...form, packId: e.target.value })}>
              <option value="">Sélectionner un pack</option>
              {data.packs.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.nom} — {fmt(p.prix)} (stock: {p.stock})</option>)}
            </select>
          </Field>
          <Field label="Quantité">
            <input type="number" min={1} style={inputStyle} value={form.qte} onChange={(e) => setForm({ ...form, qte: e.target.value })} />
          </Field>
          <Field label="Mode de paiement">
            <div style={{ display: "flex", gap: 8 }}>
              {["Mobile Money", "Espèces", "Carte"].map((p) => (
                <button key={p} onClick={() => setForm({ ...form, paiement: p })} style={{ flex: 1, padding: "10px 4px", borderRadius: 10, border: `1.5px solid ${form.paiement === p ? T.navy900 : T.line}`, background: form.paiement === p ? T.navy900 : "#fff", color: form.paiement === p ? "#fff" : T.ink, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 11.5, cursor: "pointer" }}>
                  {p}
                </button>
              ))}
            </div>
          </Field>
          {form.packId && (
            <div style={{ background: T.paperDim, borderRadius: 12, padding: 12, marginBottom: 14, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: T.inkSoft }}>Total</span>
              <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 700, fontSize: 15, color: T.navy900 }}>
                {fmt((data.packs.find((p) => p.id === form.packId)?.prix || 0) * (Number(form.qte) || 1))}
              </span>
            </div>
          )}
          <Btn full icon={Save} onClick={submit}>Valider la vente</Btn>
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   ÉCRAN : Suivi de commande
   ============================================================ */
function CommandesScreen({ data, setData }) {
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState("toutes");

  const enrich = (cmd) => {
    const vente = data.ventes.find((v) => v.id === cmd.venteId);
    const client = data.clients.find((c) => c.id === vente?.clientId);
    const pack = data.packs.find((p) => p.id === vente?.packId);
    return { ...cmd, vente, client, pack };
  };

  const list = data.commandes.map(enrich).filter((c) => filter === "toutes" || c.statut === filter);

  const updateStatut = (cmdId, statut) => {
    setData({ ...data, commandes: data.commandes.map((c) => (c.id === cmdId ? { ...c, statut } : c)) });
    setSelected((s) => (s && s.id === cmdId ? { ...s, statut } : s));
  };

  return (
    <div style={{ paddingBottom: 90, position: "relative" }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader title="Suivi de commandes" sub={`${data.commandes.length} commandes au total`} />
      </div>

      <div style={{ padding: "14px 20px 0", display: "flex", gap: 8, overflowX: "auto" }}>
        {["toutes", ...STATUTS_CMD.map((s) => s.key)].map((f) => {
          const st = STATUTS_CMD.find((s) => s.key === f);
          return (
            <button key={f} onClick={() => setFilter(f)} style={{ whiteSpace: "nowrap", padding: "7px 13px", borderRadius: 999, border: `1.5px solid ${filter === f ? T.navy900 : T.line}`, background: filter === f ? T.navy900 : "#fff", color: filter === f ? "#fff" : T.ink, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {f === "toutes" ? "Toutes" : st.label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: "14px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {list.length === 0 && <Empty icon={Truck} title="Aucune commande" sub="Rien à afficher pour ce filtre" />}
        {list.map((c) => {
          const st = STATUTS_CMD.find((s) => s.key === c.statut);
          const StIcon = st.icon;
          return (
            <Card key={c.id} onClick={() => setSelected(c)} style={{ padding: 14, cursor: "pointer" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 12.5, color: T.navy900 }}>{c.numero}</span>
                <Pill color={st.color}><StIcon size={11} /> {st.label}</Pill>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{c.pack?.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: T.navy900 }}>{c.pack?.nom}</div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{c.client?.nom} · {c.adresseLivraison}</div>
                </div>
                <ChevronRight size={16} color={T.inkSoft} />
              </div>
            </Card>
          );
        })}
      </div>

      {selected && (
        <Sheet title={selected.numero} onClose={() => setSelected(null)}>
          <div style={{ marginBottom: 18 }}>
            <Ticket vente={selected.vente} client={selected.client} pack={selected.pack} statut={selected.statut} />
          </div>

          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, color: T.navy900, marginBottom: 12 }}>Suivi de livraison</div>
          <div style={{ position: "relative", paddingLeft: 24, marginBottom: 20 }}>
            <div style={{ position: "absolute", left: 9, top: 6, bottom: 6, width: 2, background: T.line }} />
            {STATUTS_CMD.filter((s) => s.key !== "annulee").map((s, i) => {
              const order = STATUTS_CMD.findIndex((x) => x.key === selected.statut);
              const stepOrder = STATUTS_CMD.findIndex((x) => x.key === s.key);
              const done = selected.statut !== "annulee" && stepOrder <= order;
              const StIcon = s.icon;
              return (
                <div key={s.key} style={{ position: "relative", marginBottom: 18 }}>
                  <div style={{ position: "absolute", left: -24, top: 0, width: 20, height: 20, borderRadius: "50%", background: done ? T.emerald : "#fff", border: `2px solid ${done ? T.emerald : T.line}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    {done && <CheckCircle2 size={12} color="#fff" fill={T.emerald} />}
                  </div>
                  <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: done ? T.navy900 : T.inkSoft }}>{s.label}</div>
                </div>
              );
            })}
          </div>

          <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, color: T.navy900, marginBottom: 10 }}>Changer le statut</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {STATUTS_CMD.map((s) => (
              <button key={s.key} onClick={() => updateStatut(selected.id, s.key)} style={{ padding: "10px", borderRadius: 10, border: `1.5px solid ${selected.statut === s.key ? s.color : T.line}`, background: selected.statut === s.key ? s.color + "18" : "#fff", color: selected.statut === s.key ? s.color : T.ink, fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 12.5, cursor: "pointer" }}>
                {s.label}
              </button>
            ))}
          </div>
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   ÉCRAN : Packs
   ============================================================ */
function PacksScreen({ data, setData }) {
  const [openForm, setOpenForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ nom: "", prix: "", stock: "", emoji: "📦", desc: "" });

  const openNew = () => { setEditing(null); setForm({ nom: "", prix: "", stock: "", emoji: "📦", desc: "" }); setOpenForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ nom: p.nom, prix: p.prix, stock: p.stock, emoji: p.emoji, desc: p.desc }); setOpenForm(true); };

  const save = () => {
    if (!form.nom.trim() || !form.prix) return;
    if (editing) {
      setData({ ...data, packs: data.packs.map((p) => (p.id === editing.id ? { ...p, ...form, prix: Number(form.prix), stock: Number(form.stock) || 0 } : p)) });
    } else {
      setData({ ...data, packs: [...data.packs, { id: uid(), ...form, prix: Number(form.prix), stock: Number(form.stock) || 0 }] });
    }
    setOpenForm(false);
  };

  const removePack = (id) => setData({ ...data, packs: data.packs.filter((p) => p.id !== id) });

  const ventesDe = (id) => data.ventes.filter((v) => v.packId === id).reduce((s, v) => s + v.qte, 0);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader
          title="Packs vendus"
          sub={`${data.packs.length} packs au catalogue`}
          right={<button onClick={openNew} style={{ background: T.gold, border: "none", borderRadius: 12, padding: "9px 14px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 12.5, color: T.navy900 }}><Plus size={14} /> Pack</button>}
        />
      </div>

      <div style={{ padding: "16px 20px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {data.packs.map((p) => (
          <Card key={p.id} style={{ padding: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <span style={{ fontSize: 24 }}>{p.emoji}</span>
              <div style={{ display: "flex", gap: 4 }}>
                <button onClick={() => openEdit(p)} style={{ background: T.paperDim, border: "none", borderRadius: 8, padding: 5, cursor: "pointer" }}><Edit3 size={12} color={T.navy900} /></button>
                <button onClick={() => removePack(p.id)} style={{ background: T.coral + "16", border: "none", borderRadius: 8, padding: 5, cursor: "pointer" }}><Trash2 size={12} color={T.coral} /></button>
              </div>
            </div>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.navy900, marginTop: 8 }}>{p.nom}</div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft, marginTop: 2, minHeight: 32 }}>{p.desc}</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 15, color: T.navy900, marginTop: 8 }}>{fmt(p.prix)}</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
              <Pill color={p.stock < 10 ? T.coral : T.emerald}>{p.stock} en stock</Pill>
              <span style={{ fontFamily: "Inter, sans-serif", fontSize: 10.5, color: T.inkSoft }}>{ventesDe(p.id)} vendus</span>
            </div>
          </Card>
        ))}
      </div>

      {openForm && (
        <Sheet title={editing ? "Modifier le pack" : "Nouveau pack"} onClose={() => setOpenForm(false)}>
          <Field label="Icône">
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {EMOJI_PACKS.map((e) => (
                <button key={e} onClick={() => setForm({ ...form, emoji: e })} style={{ fontSize: 20, width: 42, height: 42, borderRadius: 10, border: `1.5px solid ${form.emoji === e ? T.navy900 : T.line}`, background: form.emoji === e ? T.paperDim : "#fff", cursor: "pointer" }}>{e}</button>
              ))}
            </div>
          </Field>
          <Field label="Nom du pack"><input style={inputStyle} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} placeholder="Ex : Pack Élégance" /></Field>
          <Field label="Description"><input style={inputStyle} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="Courte description" /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Field label="Prix (FCFA)"><input type="number" style={inputStyle} value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} /></Field>
            <Field label="Stock"><input type="number" style={inputStyle} value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} /></Field>
          </div>
          <Btn full icon={Save} onClick={save} style={{ marginTop: 6 }}>{editing ? "Mettre à jour" : "Ajouter le pack"}</Btn>
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   ÉCRAN : Investissements
   ============================================================ */
function InvestissementsScreen({ data, setData }) {
  const [openForm, setOpenForm] = useState(false);
  const [form, setForm] = useState({ libelle: "", categorie: "Stock", montant: "" });
  const categories = ["Stock", "Marketing", "Logistique", "Équipement", "Autre"];
  const catColor = { Stock: T.navy600, Marketing: T.gold, Logistique: T.emerald, Équipement: T.coral, Autre: T.inkSoft };

  const total = data.investissements.reduce((s, i) => s + i.montant, 0);
  const ca = data.ventes.reduce((s, v) => s + v.qte * v.prixUnitaire, 0);
  const roi = total > 0 ? (((ca - total) / total) * 100) : 0;

  const byCat = categories.map((c) => ({
    cat: c,
    total: data.investissements.filter((i) => i.categorie === c).reduce((s, i) => s + i.montant, 0),
  })).filter((c) => c.total > 0);

  const save = () => {
    if (!form.libelle.trim() || !form.montant) return;
    setData({ ...data, investissements: [{ id: uid(), ...form, montant: Number(form.montant), date: "2026-08-13" }, ...data.investissements] });
    setForm({ libelle: "", categorie: "Stock", montant: "" });
    setOpenForm(false);
  };

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: `linear-gradient(160deg, ${T.navy900}, ${T.navy600})`, borderRadius: "0 0 28px 28px" }}>
        <ScreenHeader title="Investissements" sub="Suivi du capital engagé" />
        <div style={{ padding: "0 20px 22px", display: "flex", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#B9C3E0" }}>Total investi</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 22, color: "#fff" }}>{fmt(total)}</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.2)" }} />
          <div>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: "#B9C3E0" }}>ROI estimé</div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 22, color: roi >= 0 ? T.emerald : T.coral }}>{roi.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {byCat.length > 0 && (
        <div style={{ padding: "16px 20px 0" }}>
          <Card style={{ padding: 16 }}>
            <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 13.5, color: T.navy900, marginBottom: 12 }}>Répartition par catégorie</div>
            <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 10, marginBottom: 12 }}>
              {byCat.map((c) => <div key={c.cat} style={{ width: `${(c.total / total) * 100}%`, background: catColor[c.cat] }} />)}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {byCat.map((c) => (
                <div key={c.cat} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: catColor[c.cat] }} />
                  <span style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{c.cat} · {fmt(c.total)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      <div style={{ padding: "16px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.navy900 }}>Historique</div>
        <button onClick={() => setOpenForm(true)} style={{ background: T.gold, border: "none", borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 12, color: T.navy900 }}>
          <Plus size={13} /> Ajouter
        </button>
      </div>

      <div style={{ padding: "12px 20px 0", display: "flex", flexDirection: "column", gap: 8 }}>
        {data.investissements.map((i) => (
          <Card key={i.id} style={{ padding: 13, display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: catColor[i.categorie] + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={15} color={catColor[i.categorie]} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: T.navy900 }}>{i.libelle}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft }}>{i.categorie} · {fmtDate(i.date)}</div>
            </div>
            <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 13, color: T.coral }}>-{fmt(i.montant)}</div>
          </Card>
        ))}
      </div>

      {openForm && (
        <Sheet title="Nouvel investissement" onClose={() => setOpenForm(false)}>
          <Field label="Libellé"><input style={inputStyle} value={form.libelle} onChange={(e) => setForm({ ...form, libelle: e.target.value })} placeholder="Ex : Achat de stock" /></Field>
          <Field label="Catégorie">
            <select style={{ ...inputStyle, background: "#fff" }} value={form.categorie} onChange={(e) => setForm({ ...form, categorie: e.target.value })}>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Montant (FCFA)"><input type="number" style={inputStyle} value={form.montant} onChange={(e) => setForm({ ...form, montant: e.target.value })} /></Field>
          <Btn full icon={Save} onClick={save}>Enregistrer</Btn>
        </Sheet>
      )}
    </div>
  );
}

/* ============================================================
   ÉCRAN : Achats en détail (toutes les lignes de vente)
   ============================================================ */
function AchatsScreen({ data }) {
  const [q, setQ] = useState("");
  const rows = data.ventes
    .map((v) => ({
      ...v,
      client: data.clients.find((c) => c.id === v.clientId),
      pack: data.packs.find((p) => p.id === v.packId),
    }))
    .filter((r) => (r.client?.nom + r.pack?.nom).toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader title="Détail des achats" sub={`${data.ventes.length} lignes d'achat`} />
      </div>
      <div style={{ padding: "16px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", background: "#fff", border: `1.5px solid ${T.line}`, borderRadius: 12, padding: "0 12px" }}>
          <Search size={16} color={T.inkSoft} />
          <input placeholder="Filtrer par client ou pack..." value={q} onChange={(e) => setQ(e.target.value)} style={{ border: "none", outline: "none", padding: "11px 8px", fontFamily: "Inter, sans-serif", fontSize: 13.5, width: "100%", background: "transparent" }} />
        </div>
      </div>
      <div style={{ padding: "14px 20px 0" }}>
        <Card style={{ overflow: "hidden" }}>
          {rows.map((r, i) => (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", borderBottom: i < rows.length - 1 ? `1px solid ${T.paperDim}` : "none" }}>
              <span style={{ fontSize: 17 }}>{r.pack?.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "Inter, sans-serif", fontWeight: 600, fontSize: 13, color: T.navy900, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.pack?.nom}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft }}>{r.client?.nom} · {fmtDate(r.date)}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontFamily: "IBM Plex Mono, monospace", fontWeight: 600, fontSize: 12.5, color: T.navy900 }}>{fmt(r.qte * r.prixUnitaire)}</div>
                <div style={{ fontFamily: "Inter, sans-serif", fontSize: 10, color: T.inkSoft }}>qté {r.qte}</div>
              </div>
            </div>
          ))}
          {rows.length === 0 && <Empty icon={ShoppingBag} title="Aucun résultat" sub="Essayez un autre filtre" />}
        </Card>
      </div>
    </div>
  );
}

/* ============================================================
   NAVIGATION
   ============================================================ */
const TABS = [
  { key: "dashboard", label: "Accueil", icon: Home, Screen: DashboardScreen },
  { key: "clients", label: "Clients", icon: Users, Screen: ClientsScreen },
  { key: "ventes", label: "Ventes", icon: ShoppingBag, Screen: VentesScreen },
  { key: "commandes", label: "Suivi", icon: Truck, Screen: CommandesScreen },
  { key: "plus", label: "Plus", icon: BarChart3, Screen: null },
];

function PlusScreen({ tab, setTab, onDeconnexion }) {
  const items = [
    { key: "packs", label: "Packs vendus", sub: "Catalogue & stock", icon: Package, color: T.gold },
    { key: "investissements", label: "Investissements", sub: "Capital & ROI", icon: TrendingUp, color: T.emerald },
    { key: "achats", label: "Détail des achats", sub: "Toutes les lignes de vente", icon: CreditCard, color: T.navy600 },
  ];
  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: T.navy900 }}>
        <ScreenHeader title="Plus" sub="Gestion avancée" />
      </div>
      <div style={{ padding: "16px 20px 0", display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it) => (
          <Card key={it.key} onClick={() => setTab(it.key)} style={{ padding: 15, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: it.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <it.icon size={18} color={it.color} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.navy900 }}>{it.label}</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>{it.sub}</div>
            </div>
            <ChevronRight size={16} color={T.inkSoft} />
          </Card>
        ))}
        {onDeconnexion && (
          <Card onClick={onDeconnexion} style={{ padding: 15, display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: T.coral + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <LogOut size={18} color={T.coral} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 14, color: T.coral }}>Se déconnecter</div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   ÉCRAN : Connexion (téléphone + mot de passe + OTP SMS)
   ============================================================ */
const AUTH_KEY = "moncommerce-auth";

function genererOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function AuthScreen({ onSuccess }) {
  const [etape, setEtape] = useState("identifiants"); // identifiants | otp
  const [tel, setTel] = useState("");
  const [motDePasse, setMotDePasse] = useState("");
  const [voirMdp, setVoirMdp] = useState(false);
  const [erreur, setErreur] = useState("");
  const [code, setCode] = useState("");
  const [otpEnvoye, setOtpEnvoye] = useState("");
  const [envoiEnCours, setEnvoiEnCours] = useState(false);
  const [chrono, setChrono] = useState(0);

  useEffect(() => {
    if (chrono <= 0) return;
    const t = setTimeout(() => setChrono((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [chrono]);

  const envoyerOtp = (e) => {
    e.preventDefault();
    setErreur("");
    const telPropre = tel.replace(/\s+/g, "");
    if (telPropre.length < 8) {
      setErreur("Entrez un numéro de téléphone valide.");
      return;
    }
    if (motDePasse.length < 4) {
      setErreur("Le mot de passe doit contenir au moins 4 caractères.");
      return;
    }
    setEnvoiEnCours(true);
    // En production : POST /api/auth/connexion { telephone, mot_de_passe }
    // -> le backend vérifie l'identifiant puis envoie un vrai SMS (Twilio / Africa's Talking / Orange API).
    setTimeout(() => {
      const nouveauCode = genererOtp();
      setOtpEnvoye(nouveauCode);
      setEnvoiEnCours(false);
      setEtape("otp");
      setChrono(60);
    }, 700);
  };

  const verifierOtp = (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setErreur("Le code contient 6 chiffres.");
      return;
    }
    if (code !== otpEnvoye) {
      setErreur("Code incorrect. Réessayez.");
      return;
    }
    window.localStorage.setItem(AUTH_KEY, JSON.stringify({ tel, connecteLe: "2026-08-13" }));
    onSuccess(tel);
  };

  const renvoyer = () => {
    const nouveauCode = genererOtp();
    setOtpEnvoye(nouveauCode);
    setCode("");
    setErreur("");
    setChrono(60);
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: T.navy900 }}>
      <div style={{ padding: "44px 26px 26px" }}>
        <div style={{ width: 46, height: 46, borderRadius: 14, background: T.gold, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          <ShoppingBag size={22} color={T.navy900} />
        </div>
        <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 800, fontSize: 24, color: "#fff" }}>MonCommerce</div>
        <div style={{ fontFamily: "Inter, sans-serif", fontSize: 13, color: "#B9C3E0", marginTop: 4 }}>
          {etape === "identifiants" ? "Connectez-vous pour gérer votre commerce" : "Vérification par SMS"}
        </div>
      </div>

      <div style={{ flex: 1, background: T.paper, borderRadius: "24px 24px 0 0", padding: "26px 22px" }}>
        {etape === "identifiants" ? (
          <form onSubmit={envoyerOtp}>
            <Field label="Numéro de téléphone">
              <div style={{ position: "relative" }}>
                <Phone size={16} color={T.inkSoft} style={{ position: "absolute", left: 13, top: 14 }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 38 }}
                  placeholder="07 00 00 00 00"
                  value={tel}
                  onChange={(e) => setTel(e.target.value)}
                  inputMode="tel"
                />
              </div>
            </Field>
            <Field label="Mot de passe">
              <div style={{ position: "relative" }}>
                <Lock size={16} color={T.inkSoft} style={{ position: "absolute", left: 13, top: 14 }} />
                <input
                  style={{ ...inputStyle, paddingLeft: 38, paddingRight: 40 }}
                  type={voirMdp ? "text" : "password"}
                  placeholder="••••••••"
                  value={motDePasse}
                  onChange={(e) => setMotDePasse(e.target.value)}
                />
                <button type="button" onClick={() => setVoirMdp((v) => !v)} style={{ position: "absolute", right: 10, top: 10, background: "none", border: "none", cursor: "pointer", padding: 4 }}>
                  {voirMdp ? <EyeOff size={16} color={T.inkSoft} /> : <Eye size={16} color={T.inkSoft} />}
                </button>
              </div>
            </Field>

            {erreur && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.coral, fontFamily: "Inter, sans-serif", fontSize: 12.5, marginBottom: 12 }}>
                <AlertCircle size={14} /> {erreur}
              </div>
            )}

            <Btn full type="submit" disabled={envoiEnCours} style={{ marginTop: 4 }}>
              {envoiEnCours ? "Envoi du code..." : "Recevoir le code par SMS"}
            </Btn>
            <div style={{ fontFamily: "Inter, sans-serif", fontSize: 11, color: T.inkSoft, textAlign: "center", marginTop: 14 }}>
              Un code de vérification à 6 chiffres sera envoyé par SMS à ce numéro.
            </div>
          </form>
        ) : (
          <form onSubmit={verifierOtp}>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
              <div style={{ width: 52, height: 52, borderRadius: 16, background: T.emerald + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={24} color={T.emerald} />
              </div>
            </div>
            <div style={{ textAlign: "center", fontFamily: "Inter, sans-serif", fontSize: 13, color: T.ink, marginBottom: 20 }}>
              Code envoyé au <strong>{tel}</strong>
            </div>

            <Field label="Code de vérification (SMS)">
              <input
                style={{ ...inputStyle, letterSpacing: 8, textAlign: "center", fontFamily: "IBM Plex Mono, monospace", fontSize: 18 }}
                maxLength={6}
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </Field>

            {/* Mode démo : aucun SMS réel n'est envoyé dans cette version autonome.
                Le code est affiché ici pour permettre le test. Branché sur le
                backend, ce bloc disparaît et le SMS est envoyé par un vrai
                fournisseur (voir backend/routes/auth.js). */}
            <div style={{ background: T.paperDim, borderRadius: 12, padding: "10px 12px", marginBottom: 14, fontFamily: "Inter, sans-serif", fontSize: 11.5, color: T.inkSoft }}>
              Mode démo — code simulé (aucun SMS réel envoyé) : <strong style={{ color: T.navy900, fontFamily: "IBM Plex Mono, monospace" }}>{otpEnvoye}</strong>
            </div>

            {erreur && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: T.coral, fontFamily: "Inter, sans-serif", fontSize: 12.5, marginBottom: 12 }}>
                <AlertCircle size={14} /> {erreur}
              </div>
            )}

            <Btn full type="submit">Valider et se connecter</Btn>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16 }}>
              <button type="button" onClick={() => setEtape("identifiants")} style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "Inter, sans-serif", fontSize: 12, color: T.inkSoft, display: "flex", alignItems: "center", gap: 4 }}>
                <ChevronLeft size={14} /> Modifier
              </button>
              <button type="button" onClick={renvoyer} disabled={chrono > 0} style={{ background: "none", border: "none", cursor: chrono > 0 ? "not-allowed" : "pointer", fontFamily: "Inter, sans-serif", fontSize: 12, fontWeight: 600, color: chrono > 0 ? T.inkSoft : T.navy900 }}>
                {chrono > 0 ? `Renvoyer (${chrono}s)` : "Renvoyer le code"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function App() {
  const { data, setData, ready, saving } = useStore();
  const [tab, setTab] = useState("dashboard");
  const [auth, setAuth] = useState(undefined); // undefined = en cours de vérification, null = déconnecté

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(AUTH_KEY);
      setAuth(raw ? JSON.parse(raw) : null);
    } catch (e) {
      setAuth(null);
    }
  }, []);

  const deconnecter = () => {
    window.localStorage.removeItem(AUTH_KEY);
    setAuth(null);
  };

  const screens = {
    dashboard: DashboardScreen,
    clients: ClientsScreen,
    ventes: VentesScreen,
    commandes: CommandesScreen,
    packs: PacksScreen,
    investissements: InvestissementsScreen,
    achats: AchatsScreen,
    plus: PlusScreen,
  };
  const Active = screens[tab];
  const inSubMenu = ["packs", "investissements", "achats"].includes(tab);
  const activeTabKey = inSubMenu ? "plus" : tab;

  return (
    <div style={{ display: "flex", justifyContent: "center", background: "#E9E4D8", padding: "24px 0", minHeight: 640, fontFamily: "Inter, sans-serif" }}>
      <style>{FONT_IMPORT}{`
        * { box-sizing: border-box; }
        input::placeholder, textarea::placeholder { color: ${T.inkSoft}99; }
        select { -webkit-appearance: none; appearance: none; }
      `}</style>
      <div
        style={{
          width: 390,
          maxWidth: "94vw",
          height: 780,
          maxHeight: "88vh",
          background: T.paper,
          borderRadius: 40,
          border: `10px solid ${T.navy900}`,
          boxShadow: "0 30px 60px rgba(11,27,58,0.35)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 130, height: 22, background: T.navy900, borderRadius: "0 0 14px 14px", zIndex: 40 }} />

        <div style={{ height: "100%", overflowY: "auto" }}>
          {!ready || auth === undefined ? (
            <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10, background: T.paper }}>
              <div style={{ fontSize: 34 }}>🛍️</div>
              <div style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, color: T.navy900 }}>MonCommerce</div>
              <div style={{ fontFamily: "Inter, sans-serif", fontSize: 12, color: T.inkSoft }}>Chargement des données...</div>
            </div>
          ) : !auth ? (
            <AuthScreen onSuccess={(tel) => setAuth({ tel })} />
          ) : (
            tab === "clients" ? <ClientsScreen data={data} setData={setData} /> :
            tab === "ventes" ? <VentesScreen data={data} setData={setData} /> :
            tab === "commandes" ? <CommandesScreen data={data} setData={setData} /> :
            tab === "packs" ? <PacksScreen data={data} setData={setData} /> :
            tab === "investissements" ? <InvestissementsScreen data={data} setData={setData} /> :
            tab === "achats" ? <AchatsScreen data={data} /> :
            tab === "plus" ? <PlusScreen tab={tab} setTab={setTab} onDeconnexion={deconnecter} /> :
            <DashboardScreen data={data} />
          )}
        </div>

        {auth && inSubMenu && (
          <button
            onClick={() => setTab("plus")}
            style={{ position: "absolute", top: 22, left: 16, zIndex: 30, background: "rgba(255,255,255,0.15)", border: "none", borderRadius: 10, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
          >
            <ChevronLeft size={18} color="#fff" />
          </button>
        )}

        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            background: "#fff",
            borderTop: `1px solid ${T.line}`,
            display: "flex",
            justifyContent: "space-around",
            padding: "10px 6px 16px",
          }}
        >
          {TABS.map((t) => {
            const active = activeTabKey === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{ background: "none", border: "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer", padding: "4px 8px" }}
              >
                <t.icon size={20} color={active ? T.navy900 : T.inkSoft} strokeWidth={active ? 2.4 : 2} />
                <span style={{ fontFamily: "Inter, sans-serif", fontWeight: active ? 700 : 500, fontSize: 10, color: active ? T.navy900 : T.inkSoft }}>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Montage de l'application
   ============================================================ */
const conteneur = document.getElementById("root");
const racine = createRoot(conteneur);
racine.render(<App />);
