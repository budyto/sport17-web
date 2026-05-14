// ─── Vista: Stock y precios (edición rápida en tabla) ────────────────────────

import { fetchProducts, fetchCategories, bulkUpdateProducts } from "./data.js";
import { escapeHtml, formatPrice, $, STORE } from "./helpers.js";
import { toast, loadingState } from "./ui.js";

export async function renderStock(outlet) {
  outlet.innerHTML = loadingState("Cargando stock y precios...");
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const catName = (id) => categories.find((c) => c.id === id)?.name || "—";

  const dirty = new Map(); // id -> { price?, priceOld?, stock? }

  function row(p) {
    return `
      <tr data-id="${p.id}">
        <td><strong>${escapeHtml(p.name || "Sin nombre")}</strong>
          <div style="font-size:12px; color:var(--text-mute);">${escapeHtml(catName(p.categoryId))}</div>
        </td>
        <td><input type="number" min="0" step="0.01" class="form-input" data-field="price" value="${p.price ?? ""}" style="width: 130px;"></td>
        <td><input type="number" min="0" step="0.01" class="form-input" data-field="priceOld" value="${p.priceOld ?? ""}" style="width: 130px;"></td>
        <td><input type="number" min="0" step="1" class="form-input" data-field="stock" value="${p.stock ?? 0}" style="width: 90px;"></td>
        <td><span class="alert-cell"></span></td>
      </tr>`;
  }

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Stock y precios</h2>
        <p style="color: var(--text-mute);">Modificá precios y stock directamente en la tabla. Guardá todo de una.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-secondary" id="discard-btn" disabled>Descartar cambios</button>
        <button class="btn btn-primary" id="save-all-btn" disabled>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/></svg>
          Guardar <span id="dirty-count"></span>
        </button>
      </div>
    </div>

    <div class="filters">
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="f-search" class="form-input" placeholder="Buscar producto..." />
      </div>
      <select id="f-cat" class="form-select">
        <option value="">Todas las categorías</option>
        ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
      </select>
      <select id="f-stock" class="form-select">
        <option value="">Todo el stock</option>
        <option value="out">Sin stock</option>
        <option value="low">Bajo stock</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th>Producto</th>
            <th>Precio</th>
            <th>Precio anterior</th>
            <th>Stock</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="stock-tbody">${products.map(row).join("")}</tbody>
      </table>
    </div>
  `;

  const state = { search: "", cat: "", stock: "" };
  function applyFilters() {
    const tbody = $("#stock-tbody");
    [...tbody.querySelectorAll("tr")].forEach((tr) => {
      const p = products.find((x) => x.id === tr.dataset.id);
      let show = true;
      if (state.search && !`${p.name}`.toLowerCase().includes(state.search.toLowerCase())) show = false;
      if (state.cat && p.categoryId !== state.cat) show = false;
      if (state.stock === "out" && (p.stock ?? 0) > 0) show = false;
      if (state.stock === "low" && !((p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold)) show = false;
      tr.style.display = show ? "" : "none";
    });
  }
  $("#f-search").oninput = (e) => { state.search = e.target.value; applyFilters(); };
  $("#f-cat").onchange = (e) => { state.cat = e.target.value; applyFilters(); };
  $("#f-stock").onchange = (e) => { state.stock = e.target.value; applyFilters(); };

  // Detect dirty
  const tbody = $("#stock-tbody");
  tbody.addEventListener("input", (e) => {
    const input = e.target;
    if (!input.matches("[data-field]")) return;
    const tr = input.closest("tr");
    const id = tr.dataset.id;
    const field = input.dataset.field;
    const original = products.find((x) => x.id === id);
    const val = input.value === "" ? null : (field === "stock" ? parseInt(input.value, 10) : Number(input.value));
    const origVal = original?.[field] ?? (field === "stock" ? 0 : null);

    let entry = dirty.get(id) || {};
    if (val === origVal) delete entry[field];
    else entry[field] = val;
    if (Object.keys(entry).length === 0) dirty.delete(id);
    else dirty.set(id, entry);

    updateDirtyUI();
  });

  function updateDirtyUI() {
    const count = dirty.size;
    $("#save-all-btn").disabled = count === 0;
    $("#discard-btn").disabled = count === 0;
    $("#dirty-count").textContent = count ? `(${count})` : "";
  }

  $("#discard-btn").onclick = () => {
    dirty.clear();
    tbody.querySelectorAll("[data-field]").forEach((input) => {
      const tr = input.closest("tr");
      const p = products.find((x) => x.id === tr.dataset.id);
      input.value = p?.[input.dataset.field] ?? (input.dataset.field === "stock" ? 0 : "");
    });
    updateDirtyUI();
    toast("Cambios descartados", "info");
  };

  $("#save-all-btn").onclick = async () => {
    const updates = [...dirty.entries()].map(([id, fields]) => ({ id, fields }));
    $("#save-all-btn").disabled = true;
    try {
      await bulkUpdateProducts(updates);
      // Actualizar cache local
      updates.forEach(({ id, fields }) => {
        const p = products.find((x) => x.id === id);
        Object.assign(p, fields);
      });
      dirty.clear();
      updateDirtyUI();
      toast(`${updates.length} producto${updates.length === 1 ? "" : "s"} actualizado${updates.length === 1 ? "" : "s"}`);
    } catch (err) {
      toast("No se pudo guardar: " + err.message, "error");
      $("#save-all-btn").disabled = false;
    }
  };
}
