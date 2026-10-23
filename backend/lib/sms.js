/**
 * Envoi de SMS (tickets, alertes, campagnes, agents).
 *
 * Réglage par variables d'environnement (.env du serveur) :
 *   SMS_FOURNISSEUR  orange | africastalking | generique
 *   SMS_IDENTIFIANT  Orange : Client ID ; Africa's Talking : nom d'utilisateur (« sandbox » pour les essais)
 *   SMS_CLE          Orange : Client secret ; Africa's Talking : clé API ; générique : clé « Bearer »
 *   SMS_EXPEDITEUR   Orange : numéro expéditeur du contrat (2250700000000) ; Africa's Talking : nom d'expéditeur validé (facultatif)
 *   SMS_PROVIDER_URL générique seulement : POST JSON { to, from, text } avec « Authorization: Bearer <clé> »
 * Anciennes variables encore acceptées : SMS_PROVIDER_API_KEY, SMS_SENDER_ID (fournisseur générique).
 * Sans réglage, le SMS est simulé (journalisé), pour que tout reste utilisable sans compte.
 */
const BASE_ORANGE = (process.env.ORANGE_SMS_URL || "https://api.orange.com").replace(/\/$/, "");
const BASE_AT = (process.env.AFRICASTALKING_URL || "https://api.africastalking.com").replace(/\/$/, "");

function config() {
  const e = (k) => String(process.env[k] || "").trim();
  const fournisseur = e("SMS_FOURNISSEUR") || (e("SMS_PROVIDER_URL") && e("SMS_PROVIDER_API_KEY") ? "generique" : "");
  if (!fournisseur) return null;
  return { fournisseur, url: e("SMS_PROVIDER_URL"), identifiant: e("SMS_IDENTIFIANT"), cle: e("SMS_CLE") || e("SMS_PROVIDER_API_KEY"), expediteur: e("SMS_EXPEDITEUR") || e("SMS_SENDER_ID") };
}
function estConfigure() {
  const c = config();
  if (!c || !c.cle) return false;
  if (c.fournisseur === "generique") return /^https:\/\/\S+$/.test(c.url);
  if (c.fournisseur === "orange") return Boolean(c.identifiant) && String(c.expediteur).replace(/\D/g, "").length >= 8;
  return c.fournisseur === "africastalking" && Boolean(c.identifiant);
}
const international = (tel) => { const d = String(tel || "").replace(/\D/g, ""); return d.length === 10 ? "+225" + d : d.startsWith("00") ? "+" + d.slice(2) : "+" + d; };

let jetonOrange = { valeur: "", fin: 0, id: "" };
async function envoyerOrange(c, a, message) {
  if (!jetonOrange.valeur || jetonOrange.fin < Date.now() + 60000 || jetonOrange.id !== c.identifiant) {
    const r = await fetch(`${BASE_ORANGE}/oauth/v3/token`, { method: "POST", headers: { Authorization: "Basic " + Buffer.from(`${c.identifiant}:${c.cle}`).toString("base64"), "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: "grant_type=client_credentials", signal: AbortSignal.timeout(15000) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.access_token) throw new Error("Orange SMS : identifiants refusés");
    jetonOrange = { valeur: j.access_token, fin: Date.now() + (Number(j.expires_in) || 3600) * 1000, id: c.identifiant };
  }
  const expediteur = international(c.expediteur);
  const r = await fetch(`${BASE_ORANGE}/smsmessaging/v1/outbound/${encodeURIComponent("tel:" + expediteur)}/requests`, {
    method: "POST", headers: { Authorization: "Bearer " + jetonOrange.valeur, "Content-Type": "application/json" }, signal: AbortSignal.timeout(15000),
    body: JSON.stringify({ outboundSMSMessageRequest: { address: "tel:" + a, senderAddress: "tel:" + expediteur, outboundSMSTextMessage: { message } } }),
  });
  if (!r.ok) throw new Error(`Orange SMS : échec de l'envoi (statut ${r.status})`);
  return r.json().catch(() => ({}));
}
async function envoyerAfricasTalking(c, a, message) {
  const corps = new URLSearchParams({ username: c.identifiant, to: a, message });
  if (c.expediteur && c.identifiant !== "sandbox") corps.set("from", c.expediteur);
  const base = c.identifiant === "sandbox" ? BASE_AT.replace("api.", "api.sandbox.") : BASE_AT;
  const r = await fetch(`${base}/version1/messaging`, { method: "POST", headers: { apiKey: c.cle, Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: corps, signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  const statut = j.SMSMessageData?.Recipients?.[0]?.status;
  if (!r.ok || (statut && statut !== "Success")) throw new Error(`Africa's Talking : ${statut || "échec de l'envoi (statut " + r.status + ")"}`);
  return j;
}

async function envoyerSms(telephone, message) {
  const c = config();
  if (!estConfigure()) { console.log(`[SMS SIMULÉ] Vers ${telephone} : ${message}`); return { simule: true }; }
  const a = international(telephone), texte = String(message).slice(0, 640);
  if (c.fournisseur === "orange") return envoyerOrange(c, a, texte);
  if (c.fournisseur === "africastalking") return envoyerAfricasTalking(c, a, texte);
  const r = await fetch(c.url, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${c.cle}` }, body: JSON.stringify({ to: a, from: c.expediteur || "IvoireShop", text: texte }), signal: AbortSignal.timeout(15000) });
  if (!r.ok) throw new Error(`Échec de l'envoi du SMS (statut ${r.status})`);
  return r.json().catch(() => ({}));
}

module.exports = { envoyerSms, estConfigure };
