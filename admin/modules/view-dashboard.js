// ─── Vista: Dashboard ────────────────────────────────────────────────────────

import { fetchProducts, fetchCategories } from "./data.js";
import { escapeHtml, formatPrice, formatDate, STORE } from "./helpers.js";
import { loadingState } from "./ui.js";

export async function renderDashboard(outlet) {
  outlet.innerHTML = loadingState("Cargando dashboard...");

  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);

  const total = products.length;
  const active = products.filter((p) => p.active).length;
  const inactive = total - active;
  const outOfStock = products.filter((p) => (p.stock ?? 0) <= 0).length;
  const lowStock = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold).length;
  const activeCats = categories.filter((c) => c.active).length;
  const featured = products.filter((p) => p.featured).length;

  const alerts = [];
  const noImage = products.filter((p) => !p.images || p.images.length === 0);
  const noCategory = products.filter((p) => !p.categoryId);
  const noPrice = products.filter((p) => p.price == null || p.price === "" || Number(p.price) <= 0);

  if (noImage.length) alerts.push({ type: "warning", label: `${noImage.length} producto${noImage.length === 1 ? "" : "s"} sin imagen`, items: noImage });
  if (noCategory.length) alerts.push({ type: "warning", label: `${noCategory.length} producto${noCategory.length === 1 ? "" : "s"} sin categoría`, items: noCategory });
  if (noPrice.length) alerts.push({ type: "danger", label: `${noPrice.length} producto${noPrice.length === 1 ? "" : "s"} sin precio válido`, items: noPrice });
  if (outOfStock) alerts.push({ type: "danger", label: `${outOfStock} producto${outOfStock === 1 ? "" : "s"} sin stock` });
  if (lowStock) alerts.push({ type: "warning", label: `${lowStock} producto${lowStock === 1 ? "" : "s"} con stock bajo (≤ ${STORE.lowStockThreshold})` });

  const recent = [...products]
    .sort((a, b) => (toMs(b.createdAt) - toMs(a.createdAt)))
    .slice(0, 6);

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Resumen de la tienda</h2>
        <p>Vista rápida del estado actual de SPORT17.</p>
      </div>
      <div class="page-actions">
        <a href="#/products/new" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo producto
        </a>
      </div>
    </div>

    <div class="stats-grid">
      ${statCard("Productos totales", total)}
      ${statCard("Activos", active, "is-success")}
      ${statCard("Inactivos", inactive, inactive ? "is-warning" : "")}
      ${statCard("Sin stock", outOfStock, outOfStock ? "is-danger" : "")}
      ${statCard("Bajo stock", lowStock, lowStock ? "is-warning" : "", `≤ ${STORE.lowStockThreshold} unidades`)}
      ${statCard("Categorías activas", activeCats)}
      ${statCard("Destacados", featured, "is-success", "Aparecen en la home")}
    </div>

    ${alerts.length ? `
      <div class="card" style="margin-bottom: 24px;">
        <div class="card-head"><h2>Alertas</h2></div>
        ${alerts.map((a) => `
          <div class="alert alert-${a.type}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div>
              <strong>${escapeHtml(a.label)}</strong>
              ${a.items ? `<div style="margin-top: 4px; font-size: 12px; opacity: 0.85;">${a.items.slice(0, 4).map((p) => escapeHtml(p.name)).join(", ")}${a.items.length > 4 ? "..." : ""}</div>` : ""}
            </div>
          </div>
        `).join("")}
      </div>
    ` : ""}

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
}

function statCard(label, value, modifier = "", sub = "") {
  return `
    <div class="stat-card ${modifier}">
      <div class="stat-label">${escapeHtml(label)}</div>
      <div class="stat-value">${value}</div>
      ${sub ? `<div class="stat-sub">${escapeHtml(sub)}</div>` : ""}
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
