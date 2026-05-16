// ─── Helpers compartidos ─────────────────────────────────────────────────────

import { STORE_CONFIG } from "../firebase-config.js";

export function $(sel, root = document) { return root.querySelector(sel); }
export function $$(sel, root = document) { return [...root.querySelectorAll(sel)]; }

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else if (k === "text") node.textContent = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) node.setAttribute(k, "");
    else if (v === false || v == null) {}
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(child instanceof Node ? child : document.createTextNode(child));
  }
  return node;
}

export function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Historicamente algunos precios se guardaron en miles (ej: 45 = $45.000).
// Si el valor es < 1000 lo tratamos como miles para mostrarlo bien en el admin,
// igual que en la home publica. La limpieza de la BD lo normaliza definitivo.
function normalizePriceForDisplay(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return n;
  return n < 1000 ? n * 1000 : n;
}

export function formatPrice(value) {
  if (value == null || value === "") return "—";
  const n = Number(value);
  if (Number.isNaN(n)) return "—";
  const normalized = normalizePriceForDisplay(n);
  return `$${normalized.toLocaleString("es-AR")}`;
}

export function formatPriceShort(value) {
  if (value == null || value === "") return "—";
  const normalized = normalizePriceForDisplay(Number(value));
  return `$${normalized.toLocaleString("es-AR")}`;
}

export function slugify(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function formatDate(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(ts) {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("es-AR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const STORE = STORE_CONFIG;
