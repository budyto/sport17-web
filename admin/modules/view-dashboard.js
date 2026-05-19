// ─── Vista: Dashboard ────────────────────────────────────────────────────────
// Inspirado en Tiendanube/Shopify: KPIs comerciales, distribución por sección
// y categoría, top productos, alertas accionables, últimos cargados.

import { fetchProducts, fetchCategories, fetchSections, ensureDefaultSections } from "./data.js";
import { db, collection, getDocs } from "../firebase-init.js";
import { escapeHtml, formatPrice, formatDate, STORE } from "./helpers.js";
import { loadingState, openModal } from "./ui.js";

// Helper local para obtener suscriptores de newsletter (no requiere otro módulo)
async function fetchNewsletterCount() {
  try {
    const snap = await getDocs(collection(db, "newsletter"));
    return snap.size;
  } catch {
    return 0;
  }
}

// Normaliza precios viejos guardados en miles (45 → 45000) para los cálculos.
function nPrice(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return n < 1000 ? n * 1000 : n;
}

// Suma reduce con normalizaciones
function sumBy(arr, fn) {
  return arr.reduce((acc, x) => acc + (fn(x) || 0), 0);
}

export async function renderDashboard(outlet) {
  outlet.innerHTML = loadingState("Cargando dashboard...");

  await ensureDefaultSections().catch(() => {});
  const [products, categories, sections, newsletterCount] = await Promise.all([
    fetchProducts(), fetchCategories(), fetchSections().catch(() => []), fetchNewsletterCount(),
  ]);

  // ═══════════ KPIs principales ═══════════
  const total = products.length;
  const active = products.filter((p) => p.active).length;
  const inactive = total - active;
  const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold).length;
  const activeCats = categories.filter((c) => c.active).length;
  const featured = products.filter((p) => p.featured).length;

  // Métricas comerciales (con normalización de precios viejos)
  const stockTotal = sumBy(products, (p) => Number(p.stock) || 0);
  const inventoryValue = sumBy(products, (p) => nPrice(p.price) * (Number(p.stock) || 0));
  const catalogValue = sumBy(products, (p) => nPrice(p.price)); // valor sumado de precios (sin stock)
  const productsWithPrice = products.filter((p) => nPrice(p.price) > 0);
  const avgPrice = productsWithPrice.length > 0
    ? Math.round(sumBy(productsWithPrice, (p) => nPrice(p.price)) / productsWithPrice.length)
    : 0;
  const productsWithCost = products.filter((p) => nPrice(p.cost) > 0 && nPrice(p.price) > 0);
  const totalCost = sumBy(productsWithCost, (p) => nPrice(p.cost) * (Number(p.stock) || 0));
  const totalRevenue = sumBy(productsWithCost, (p) => nPrice(p.price) * (Number(p.stock) || 0));
  const potentialMargin = totalCost > 0 ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 100) : 0;
  const potentialProfit = totalRevenue - totalCost;

  // Cada alerta tiene una clave única para identificarla en el click handler.
  const alerts = [];
  const noImage = products.filter((p) => !p.images || p.images.length === 0);
  const noCategory = products.filter((p) => !p.categoryId);
  const noPrice = products.filter((p) => p.price == null || p.price === "" || Number(p.price) <= 0);
  const outOfStockList = products.filter((p) => (p.stock ?? 0) <= 0);
  const lowStockList = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold);

  if (noImage.length) alerts.push({ key: "no-image", type: "warning", label: `${noImage.length} producto${noImage.length === 1 ? "" : "s"} sin imagen`, items: noImage });
  if (noCategory.length) alerts.push({ key: "no-cat", type: "warning", label: `${noCategory.length} producto${noCategory.length === 1 ? "" : "s"} sin categoría`, items: noCategory });
  if (noPrice.length) alerts.push({ key: "no-price", type: "danger", label: `${noPrice.length} producto${noPrice.length === 1 ? "" : "s"} sin precio válido`, items: noPrice });
  if (outOfStock) alerts.push({ key: "out-of-stock", type: "danger", label: `${outOfStock} producto${outOfStock === 1 ? "" : "s"} sin stock`, items: outOfStockList });
  if (lowStock) alerts.push({ key: "low-stock", type: "warning", label: `${lowStock} producto${lowStock === 1 ? "" : "s"} con stock bajo (≤ ${STORE.lowStockThreshold})`, items: lowStockList });

  const recent = [...products]
    .sort((a, b) => (toMs(b.createdAt) - toMs(a.createdAt)))
    .slice(0, 6);

  // ═══════════ Distribución por sección ═══════════
  const sectionStats = sections.map((s) => {
    const catsInSection = categories.filter((c) => c.parent === s.id);
    const prodsInSection = products.filter((p) => {
      const cat = categories.find((c) => c.id === p.categoryId);
      return cat?.parent === s.id;
    });
    return {
      id: s.id,
      name: s.name,
      cats: catsInSection.length,
      products: prodsInSection.length,
      stock: sumBy(prodsInSection, (p) => Number(p.stock) || 0),
      value: sumBy(prodsInSection, (p) => nPrice(p.price) * (Number(p.stock) || 0)),
    };
  }).sort((a, b) => b.products - a.products);

  // ═══════════ Top categorías por cantidad de productos ═══════════
  const catStats = categories.map((c) => {
    const prodsInCat = products.filter((p) => p.categoryId === c.id);
    return {
      id: c.id,
      name: c.name,
      parent: c.parent,
      products: prodsInCat.length,
      stock: sumBy(prodsInCat, (p) => Number(p.stock) || 0),
    };
  }).sort((a, b) => b.products - a.products).slice(0, 8);

  // ═══════════ Top productos ═══════════
  const topPriciest = [...products]
    .filter((p) => nPrice(p.price) > 0)
    .sort((a, b) => nPrice(b.price) - nPrice(a.price))
    .slice(0, 5);
  const topStock = [...products]
    .filter((p) => (p.stock ?? 0) > 0)
    .sort((a, b) => (b.stock ?? 0) - (a.stock ?? 0))
    .slice(0, 5);
  const lowStockTop = [...products]
    .filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold)
    .sort((a, b) => (a.stock ?? 0) - (b.stock ?? 0))
    .slice(0, 5);
  const featuredList = products.filter((p) => p.featured).slice(0, 5);

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Resumen de la tienda</h2>
        <p>Estado completo de SPORT17 — actualizado en tiempo real.</p>
      </div>
      <div class="page-actions">
        <a href="#/products/new" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo producto
        </a>
      </div>
    </div>

    <!-- ═══════════ KPIs COMERCIALES (destacados) ═══════════ -->
    <div class="kpi-grid">
      ${kpiCard({
        label: "Valor del inventario",
        value: formatPrice(inventoryValue),
        sub: `${stockTotal.toLocaleString("es-AR")} unidades en stock`,
        icon: "wallet",
        color: "#16a34a",
      })}
      ${kpiCard({
        label: "Precio promedio",
        value: formatPrice(avgPrice),
        sub: `Sobre ${productsWithPrice.length} producto${productsWithPrice.length === 1 ? "" : "s"} con precio`,
        icon: "tag",
        color: "#2f7cff",
      })}
      ${potentialProfit > 0 ? kpiCard({
        label: "Ganancia potencial",
        value: formatPrice(potentialProfit),
        sub: `Margen ${potentialMargin}% · ${productsWithCost.length} con costo`,
        icon: "trending-up",
        color: "#7c3aed",
      }) : kpiCard({
        label: "Valor del catálogo",
        value: formatPrice(catalogValue),
        sub: "Suma de precios sin stock",
        icon: "store",
        color: "#7c3aed",
      })}
      ${kpiCard({
        label: "Suscriptores",
        value: newsletterCount.toLocaleString("es-AR"),
        sub: "Newsletter del footer",
        icon: "users",
        color: "#ec4899",
      })}
    </div>

    <!-- ═══════════ Cards secundarias (counters) ═══════════ -->
    <div class="stats-grid">
      ${statCard("Productos totales", total, "", `${active} activos · ${inactive} inactivos`)}
      ${statCard("Secciones", sections.length, "", `${categories.filter((c)=>c.active).length} categorías activas`)}
      ${statCard("Sin stock", outOfStock, outOfStock ? "is-danger" : "")}
      ${statCard("Bajo stock", lowStock, lowStock ? "is-warning" : "", `≤ ${STORE.lowStockThreshold} unidades`)}
      ${statCard("Destacados", featured, "is-success", "Aparecen en la home")}
      ${statCard("Stock total", stockTotal.toLocaleString("es-AR"), "", "Unidades disponibles")}
    </div>

    <!-- ═══════════ Alertas accionables ═══════════ -->
    ${alerts.length ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-head">
          <h2>Alertas</h2>
          <span style="color: var(--text-mute); font-size: 12px;">Click para ver el detalle</span>
        </div>
        ${alerts.map((a) => `
          <button class="alert alert-${a.type}" type="button" data-alert-key="${a.key}" style="width:100%; text-align:left; cursor:pointer; border: 0; font: inherit;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div style="flex:1;">
              <strong>${escapeHtml(a.label)}</strong>
              ${a.items ? `<div style="margin-top: 4px; font-size: 12px; opacity: 0.85;">${a.items.slice(0, 4).map((p) => escapeHtml(p.name)).join(", ")}${a.items.length > 4 ? "..." : ""}</div>` : ""}
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" style="opacity:0.6;"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
        `).join("")}
      </div>
    ` : ""}

    <!-- ═══════════ Distribución por sección (barras horizontales) ═══════════ -->
    <div class="dash-row" style="margin-bottom: 24px;">
      <div class="card">
        <div class="card-head">
          <h2>Productos por sección</h2>
          <div class="actions"><a href="#/sections" class="btn btn-ghost btn-sm">Gestionar →</a></div>
        </div>
        ${sectionStats.length === 0
          ? `<div class="empty"><p>Sin secciones todavía.</p></div>`
          : `<div class="dash-bars">${renderBars(sectionStats, "products", { showValue: true })}</div>`}
      </div>

      <div class="card">
        <div class="card-head">
          <h2>Stock por sección</h2>
          <span style="color:var(--text-mute); font-size:12px;">Unidades totales</span>
        </div>
        ${sectionStats.length === 0
          ? `<div class="empty"><p>Sin datos.</p></div>`
          : `<div class="dash-bars">${renderBars(sectionStats, "stock", { showValue: true, color: "#16a34a" })}</div>`}
      </div>
    </div>

    <!-- ═══════════ Valor por sección ═══════════ -->
    <div class="card" style="margin-bottom: 24px;">
      <div class="card-head">
        <h2>Valor del inventario por sección</h2>
        <span style="color:var(--text-mute); font-size:12px;">Precio × stock</span>
      </div>
      ${sectionStats.length === 0
        ? `<div class="empty"><p>Sin datos.</p></div>`
        : `<div class="dash-bars">${renderBars(sectionStats, "value", { format: "money", color: "#7c3aed" })}</div>`}
    </div>

    <!-- ═══════════ Top categorías ═══════════ -->
    ${catStats.length > 0 ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-head">
          <h2>Top categorías por cantidad de productos</h2>
          <div class="actions"><a href="#/categories" class="btn btn-ghost btn-sm">Ver todas →</a></div>
        </div>
        <div class="dash-bars">${renderBars(catStats, "products", { showValue: true, color: "#0891b2" })}</div>
      </div>
    ` : ""}

    <!-- ═══════════ Top productos (4 columnas) ═══════════ -->
    <div class="dash-row dash-row-4" style="margin-bottom: 24px;">
      ${topListCard("Más caros", topPriciest, categories, (p) => formatPrice(nPrice(p.price)), "💎")}
      ${topListCard("Más stock", topStock, categories, (p) => `${p.stock} und.`, "📦")}
      ${topListCard("Stock bajo", lowStockTop, categories, (p) => `${p.stock} und.`, "⚠️")}
      ${topListCard("Destacados", featuredList, categories, (p) => formatPrice(nPrice(p.price)), "⭐")}
    </div>

    <div class="card">
      <div class="card-head">
        <h2>Últimos productos cargados</h2>
        <div class="actions"><a href="#/products" class="btn btn-ghost btn-sm">Ver todos →</a></div>
      </div>
      ${recent.length === 0 ? `
        <div class="empty">
          <h3>No hay productos todavía</h3>
          <p>Empezá cargando tu primer producto o importando un Excel.</p>
          <a href="#/products/new" class="btn btn-primary">Crear primer producto</a>
        </div>
      ` : `
        <div class="recent-list">
          ${recent.map((p) => recentRow(p, categories)).join("")}
        </div>
      `}
    </div>
  `;

  // Handler: click en alerta → modal con la lista completa de productos
  outlet.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-alert-key]");
    if (!btn) return;
    const alert = alerts.find((a) => a.key === btn.dataset.alertKey);
    if (!alert?.items?.length) return;
    openAlertDetailModal(alert, categories);
  });
}

// Mapeo visual por tipo de alerta: icono SVG + colores
const ALERT_META = {
  "no-image":     { icon: "image",   color: "#f59e0b", title: "Productos sin imagen",         desc: "No tienen ni una foto cargada. Los clientes no pueden verlos." },
  "no-cat":       { icon: "folder",  color: "#f59e0b", title: "Productos sin categoría",      desc: "No están asignados a ninguna categoría. No aparecen en la tienda." },
  "no-price":     { icon: "tag",     color: "#dc2626", title: "Productos sin precio válido",  desc: "No tienen precio cargado o está en 0. Se muestran sin valor en la web." },
  "out-of-stock": { icon: "package", color: "#dc2626", title: "Productos sin stock",          desc: "Stock en 0. Aparecen con etiqueta 'Sin stock' o están ocultos." },
  "low-stock":    { icon: "clock",   color: "#f59e0b", title: "Productos con stock bajo",     desc: "Quedan pocas unidades. Considerá reponer pronto." },
};

const ALERT_ICONS = {
  image:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="M21 15l-5-5L5 21"/></svg>`,
  folder:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  tag:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  package: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>`,
  clock:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
};

// Muestra un modal con la lista de productos afectados por la alerta.
function openAlertDetailModal(alert, categories) {
  const meta = ALERT_META[alert.key] || { icon: "package", color: "#6b7280", title: alert.label, desc: "" };
  const catNameById = (id) => categories.find((c) => c.id === id)?.name || "—";

  // Stats top: total, sin-stock crítico, valor potencial perdido si aplica
  const items = alert.items;
  const totalValue = items.reduce((acc, p) => acc + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);
  const showValue = ["low-stock"].includes(alert.key) && totalValue > 0;

  const body = document.createElement("div");
  body.innerHTML = `
    <!-- Hero del modal: ícono + titulo + descripción -->
    <div class="alert-modal-hero" style="--alert-color:${meta.color};">
      <div class="alert-modal-icon">${ALERT_ICONS[meta.icon]}</div>
      <div class="alert-modal-hero-text">
        <h3>${escapeHtml(meta.title)}</h3>
        <p>${escapeHtml(meta.desc)}</p>
      </div>
    </div>

    <!-- Stats -->
    <div class="alert-modal-stats">
      <div class="alert-stat">
        <div class="alert-stat-value">${items.length}</div>
        <div class="alert-stat-label">Total afectados</div>
      </div>
      ${showValue ? `
        <div class="alert-stat">
          <div class="alert-stat-value">${formatPrice(totalValue)}</div>
          <div class="alert-stat-label">Valor en stock</div>
        </div>
      ` : ""}
      <div class="alert-stat">
        <div class="alert-stat-value">${items.filter((p) => p.active).length}</div>
        <div class="alert-stat-label">Activos en tienda</div>
      </div>
    </div>

    <!-- Tabla -->
    <div class="table-wrap" style="max-height: 50vh; overflow:auto; margin-top: 18px;">
      <table class="table">
        <thead>
          <tr>
            <th style="width:54px;"></th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th style="width:90px;"></th>
          </tr>
        </thead>
        <tbody>
          ${items.map((p) => {
            const main = p.images?.find((i) => i.isMain) || p.images?.[0];
            const stockBadge = (p.stock ?? 0) === 0
              ? `<span class="badge badge-danger">Sin stock</span>`
              : (p.stock ?? 0) === 1
                ? `<span class="badge badge-danger">¡ÚLTIMO!</span>`
                : (p.stock ?? 0) <= STORE.lowStockThreshold
                  ? `<span class="badge badge-warning">${p.stock} und.</span>`
                  : `<span class="badge badge-success">${p.stock} und.</span>`;
            return `
              <tr>
                <td>${main ? `<img class="table-thumb" src="${escapeHtml(main.url)}" alt="" loading="lazy">` : `<div class="table-thumb-empty">—</div>`}</td>
                <td><strong>${escapeHtml(p.name || "Sin nombre")}</strong></td>
                <td><span style="color:var(--text-mute); font-size:13px;">${escapeHtml(catNameById(p.categoryId))}</span></td>
                <td>${p.price ? formatPrice(p.price) : `<span style="color:var(--danger); font-weight:600;">sin precio</span>`}</td>
                <td>${stockBadge}</td>
                <td>${p.active ? `<span class="badge badge-success">Activo</span>` : `<span class="badge badge-neutral">Inactivo</span>`}</td>
                <td style="text-align:right;">
                  <a href="#/products/${p.id}" class="btn btn-primary btn-sm" data-close-modal>Editar →</a>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    </div>
  `;

  const close = document.createElement("button");
  close.className = "btn btn-secondary";
  close.type = "button";
  close.textContent = "Cerrar";

  const goAll = document.createElement("a");
  goAll.className = "btn btn-ghost";
  goAll.href = "#/products";
  goAll.textContent = "Ver todos los productos";

  const modal = openModal({
    title: "Detalle de la alerta",
    body,
    footer: [goAll, close],
    size: "large",
  });
  close.onclick = () => modal.close();
  goAll.addEventListener("click", () => modal.close());
  body.addEventListener("click", (e) => {
    if (e.target.closest("[data-close-modal]")) modal.close();
  });
}

function statCard(label, value, modifier = "", sub = "") {
  return `
    <div class="stat-card ${modifier}">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ""}
    </div>`;
}

// KPI card grande con ícono + color personalizado
const KPI_ICONS = {
  wallet:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4"/><path d="M4 6v12c0 1.1.9 2 2 2h14v-4"/><path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z"/></svg>`,
  tag:         `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  "trending-up": `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>`,
  store:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l1-5h16l1 5"/><path d="M3 9v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9"/><path d="M9 22V12h6v10"/></svg>`,
  users:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
};
function kpiCard({ label, value, sub, icon, color = "#2f7cff" }) {
  return `
    <div class="kpi-card" style="--kpi-color:${color};">
      <div class="kpi-icon">${KPI_ICONS[icon] || ""}</div>
      <div class="kpi-body">
        <div class="kpi-label">${escapeHtml(label)}</div>
        <div class="kpi-value">${escapeHtml(String(value))}</div>
        ${sub ? `<div class="kpi-sub">${escapeHtml(sub)}</div>` : ""}
      </div>
    </div>`;
}

// Renderiza barras horizontales para distribución (sección/categoría).
// `field` es la prop del item a usar para el ancho relativo.
function renderBars(items, field, opts = {}) {
  const { showValue = true, format = "number", color = "#2f7cff" } = opts;
  const max = Math.max(1, ...items.map((i) => i[field] || 0));
  return items.map((it) => {
    const val = it[field] || 0;
    const pct = max > 0 ? (val / max) * 100 : 0;
    const valueStr = format === "money" ? formatPrice(val) : val.toLocaleString("es-AR");
    return `
      <div class="dash-bar">
        <div class="dash-bar-label">
          <span>${escapeHtml(it.name)}</span>
          ${showValue ? `<strong>${escapeHtml(valueStr)}</strong>` : ""}
        </div>
        <div class="dash-bar-track">
          <div class="dash-bar-fill" style="width:${pct.toFixed(1)}%; background:${color};"></div>
        </div>
      </div>`;
  }).join("");
}

// Lista compacta de "top N" productos para el dashboard
function topListCard(title, items, categories, valueFn, emoji = "") {
  return `
    <div class="card top-list">
      <div class="card-head">
        <h2>${emoji} ${escapeHtml(title)}</h2>
      </div>
      ${items.length === 0
        ? `<p style="color:var(--text-mute); font-size:13px; padding: 10px 0;">Sin datos.</p>`
        : `<ul class="top-list-items">
            ${items.map((p) => {
              const main = p.images?.find((i) => i.isMain) || p.images?.[0];
              const cat = categories.find((c) => c.id === p.categoryId);
              return `
                <li>
                  <a href="#/products/${p.id}">
                    ${main
                      ? `<img src="${escapeHtml(main.url)}" alt="" loading="lazy">`
                      : `<div class="top-list-thumb-empty"></div>`}
                    <div class="top-list-info">
                      <strong>${escapeHtml(p.name || "Sin nombre")}</strong>
                      <span>${escapeHtml(cat?.name || "—")}</span>
                    </div>
                    <span class="top-list-value">${escapeHtml(String(valueFn(p)))}</span>
                  </a>
                </li>`;
            }).join("")}
          </ul>`}
    </div>`;
}

function recentRow(p, categories) {
  const main = p.images?.find((i) => i.isMain) || p.images?.[0];
  const cat = categories.find((c) => c.id === p.categoryId);
  return `
    <a class="recent-item" href="#/products/${p.id}">
      ${main ? `<img src="${escapeHtml(main.url)}" alt="${escapeHtml(p.name)}" loading="lazy">` : `<div class="recent-item-empty"></div>`}
      <div class="info">
        <strong>${escapeHtml(p.name || "Sin nombre")}</strong>
        <span>${cat ? escapeHtml(cat.name) : "Sin categoría"} · ${formatPrice(p.price)} · stock ${p.stock ?? 0}</span>
      </div>
      <div>
        ${p.active ? `<span class="badge badge-success">Activo</span>` : `<span class="badge badge-neutral">Inactivo</span>`}
      </div>
    </a>`;
}

function toMs(ts) {
  if (!ts) return 0;
  if (ts.toMillis) return ts.toMillis();
  if (ts.seconds) return ts.seconds * 1000;
  return new Date(ts).getTime();
}
