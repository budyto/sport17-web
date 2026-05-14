// ─── Vista: Productos (listado + edición) ────────────────────────────────────

import {
  fetchProducts,
  fetchProduct,
  fetchCategories,
  createProduct,
  updateProduct,
  deleteProductDoc,
  EMPTY_PRODUCT,
} from "./data.js";
import { uploadProductImage, deleteStorageObject } from "./images.js";
import { escapeHtml, formatPrice, $, $$, el, STORE } from "./helpers.js";
import { toast, confirmDialog, loadingState } from "./ui.js";

let _cache = { products: [], categories: [], loaded: false };

async function loadCache(force = false) {
  if (_cache.loaded && !force) return _cache;
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  _cache = { products, categories, loaded: true };
  return _cache;
}

// ═══════ LISTADO ═══════
export async function renderProductList(outlet) {
  outlet.innerHTML = loadingState("Cargando productos...");
  const { products, categories } = await loadCache(true);

  const state = {
    search: "",
    categoryId: "",
    status: "",
    stock: "",
  };

  function applyFilters() {
    return products.filter((p) => {
      if (state.search) {
        const s = state.search.toLowerCase();
        if (!`${p.name || ""} ${p.description || ""}`.toLowerCase().includes(s)) return false;
      }
      if (state.categoryId && p.categoryId !== state.categoryId) return false;
      if (state.status === "active" && !p.active) return false;
      if (state.status === "inactive" && p.active) return false;
      if (state.status === "featured" && !p.featured) return false;
      if (state.stock === "out" && (p.stock ?? 0) > 0) return false;
      if (state.stock === "low" && !((p.stock ?? 0) > 0 && (p.stock ?? 0) <= STORE.lowStockThreshold)) return false;
      if (state.stock === "in" && (p.stock ?? 0) <= 0) return false;
      return true;
    });
  }

  function paint() {
    const list = applyFilters();
    $("#products-tbody").innerHTML = list.length === 0
      ? `<tr><td colspan="7" style="text-align:center; padding: 40px; color: var(--text-mute);">Sin resultados. Probá quitar los filtros.</td></tr>`
      : list.map((p) => productRow(p, categories)).join("");
    $("#products-count").textContent = `${list.length} de ${products.length}`;
  }

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Productos</h2>
        <p id="products-count" style="color: var(--text-mute);">${products.length} en total</p>
      </div>
      <div class="page-actions">
        <a href="#/import" class="btn btn-secondary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          Importar Excel
        </a>
        <a href="#/products/new" class="btn btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo producto
        </a>
      </div>
    </div>

    <div class="filters">
      <div class="search">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input id="f-search" class="form-input" placeholder="Buscar por nombre o descripción..." type="search" />
      </div>
      <select id="f-cat" class="form-select">
        <option value="">Todas las categorías</option>
        ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join("")}
      </select>
      <select id="f-status" class="form-select">
        <option value="">Todos los estados</option>
        <option value="active">Activos</option>
        <option value="inactive">Inactivos</option>
        <option value="featured">Destacados</option>
      </select>
      <select id="f-stock" class="form-select">
        <option value="">Todo el stock</option>
        <option value="in">Con stock</option>
        <option value="low">Stock bajo</option>
        <option value="out">Sin stock</option>
      </select>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:60px;"></th>
            <th>Producto</th>
            <th>Categoría</th>
            <th>Precio</th>
            <th>Stock</th>
            <th>Estado</th>
            <th style="width:120px;"></th>
          </tr>
        </thead>
        <tbody id="products-tbody"></tbody>
      </table>
    </div>
  `;

  paint();

  $("#f-search").oninput = (e) => { state.search = e.target.value; paint(); };
  $("#f-cat").onchange = (e) => { state.categoryId = e.target.value; paint(); };
  $("#f-status").onchange = (e) => { state.status = e.target.value; paint(); };
  $("#f-stock").onchange = (e) => { state.stock = e.target.value; paint(); };

  // Toggle activo desde tabla
  outlet.addEventListener("click", async (e) => {
    const toggle = e.target.closest("[data-toggle-active]");
    if (toggle) {
      const id = toggle.dataset.toggleActive;
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const newVal = !p.active;
      toggle.disabled = true;
      try {
        await updateProduct(id, { active: newVal });
        p.active = newVal;
        toast(newVal ? "Producto activado" : "Producto desactivado");
        paint();
      } catch (err) {
        toast("No se pudo actualizar: " + err.message, "error");
      } finally {
        toggle.disabled = false;
      }
      return;
    }
    const delBtn = e.target.closest("[data-delete]");
    if (delBtn) {
      const id = delBtn.dataset.delete;
      const p = products.find((x) => x.id === id);
      if (!p) return;
      const ok = await confirmDialog({
        title: "Eliminar producto",
        message: `¿Eliminar "${p.name}"? Esta acción no se puede deshacer.`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (!ok) return;
      try {
        // borrar imágenes asociadas
        for (const img of p.images || []) {
          await deleteStorageObject(img.path);
        }
        await deleteProductDoc(id);
        const idx = products.findIndex((x) => x.id === id);
        if (idx >= 0) products.splice(idx, 1);
        toast("Producto eliminado");
        paint();
      } catch (err) {
        toast("No se pudo eliminar: " + err.message, "error");
      }
    }
  });
}

function productRow(p, categories) {
  const main = p.images?.find((i) => i.isMain) || p.images?.[0];
  const cat = categories.find((c) => c.id === p.categoryId);
  const stockBadge = (p.stock ?? 0) <= 0
    ? `<span class="badge badge-danger">Sin stock</span>`
    : (p.stock ?? 0) <= STORE.lowStockThreshold
      ? `<span class="badge badge-warning">Bajo · ${p.stock}</span>`
      : `<span class="badge badge-success">${p.stock}</span>`;
  return `
    <tr>
      <td>${main
        ? `<img class="table-thumb" src="${escapeHtml(main.url)}" alt="" loading="lazy">`
        : `<div class="table-thumb-empty">sin foto</div>`}</td>
      <td>
        <a href="#/products/${p.id}" style="font-weight:600;">${escapeHtml(p.name || "Sin nombre")}</a>
        ${p.featured ? `<span class="badge badge-info" style="margin-left:6px;">Destacado</span>` : ""}
      </td>
      <td>${cat ? escapeHtml(cat.name) : `<span style="color:var(--text-mute);">Sin categoría</span>`}</td>
      <td>${formatPrice(p.price)}${p.priceOld ? ` <span style="color:var(--text-mute); text-decoration:line-through; font-size:12px;">${formatPrice(p.priceOld)}</span>` : ""}</td>
      <td>${stockBadge}</td>
      <td>
        <label class="form-toggle">
          <input type="checkbox" data-toggle-active="${p.id}" ${p.active ? "checked" : ""}>
          <span class="switch"></span>
        </label>
      </td>
      <td style="text-align:right;">
        <a href="#/products/${p.id}" class="btn btn-ghost btn-sm">Editar</a>
        <button class="btn btn-ghost btn-sm" data-delete="${p.id}" style="color:var(--danger);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
        </button>
      </td>
    </tr>`;
}

// ═══════ FORMULARIO (crear / editar) ═══════

export async function renderProductForm(outlet, productId) {
  outlet.innerHTML = loadingState();
  const isNew = !productId || productId === "new";
  const { categories } = await loadCache(true);

  const product = isNew
    ? { ...EMPTY_PRODUCT, images: [] }
    : await fetchProduct(productId);

  if (!product && !isNew) {
    outlet.innerHTML = `<div class="empty"><h3>Producto no encontrado</h3><a href="#/products" class="btn btn-secondary">Volver</a></div>`;
    return;
  }

  let workingId = isNew ? null : productId;
  let images = [...(product.images || [])];
  let sizes = [...(product.sizes || [])];
  let colors = [...(product.colors || [])];

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>${isNew ? "Nuevo producto" : "Editar producto"}</h2>
        <p style="color:var(--text-mute);">${isNew ? "Completá los datos y guardá." : escapeHtml(product.name)}</p>
      </div>
      <div class="page-actions">
        <a href="#/products" class="btn btn-secondary">Cancelar</a>
        <button class="btn btn-primary" id="save-btn" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          Guardar
        </button>
      </div>
    </div>

    <form id="product-form" class="form-grid">

      <!-- Columna izquierda: datos -->
      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-head"><h2>Información básica</h2></div>
        <div class="form-grid">
          <div class="form-row full">
            <label for="f-name">Nombre *</label>
            <input id="f-name" class="form-input" name="name" required value="${escapeHtml(product.name || "")}" />
          </div>
          <div class="form-row full">
            <label for="f-desc">Descripción</label>
            <textarea id="f-desc" class="form-textarea" name="description">${escapeHtml(product.description || "")}</textarea>
            <span class="form-hint">Aparece debajo del título en la ficha del producto.</span>
          </div>
          <div class="form-row">
            <label for="f-cat">Categoría</label>
            <select id="f-cat" class="form-select" name="categoryId">
              <option value="">— Sin categoría —</option>
              ${categories.map((c) => `<option value="${c.id}" ${c.id === product.categoryId ? "selected" : ""}>${escapeHtml(c.name)}</option>`).join("")}
            </select>
          </div>
          <div class="form-row">
            <span class="form-label">Estado</span>
            <div style="display:flex; gap:18px; align-items:center; padding-top:6px;">
              <label class="form-toggle">
                <input type="checkbox" id="f-active" ${product.active ? "checked" : ""}>
                <span class="switch"></span>
                <span>Activo</span>
              </label>
              <label class="form-toggle">
                <input type="checkbox" id="f-featured" ${product.featured ? "checked" : ""}>
                <span class="switch"></span>
                <span>Destacado</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-head"><h2>Precio y stock</h2></div>
        <div class="form-grid">
          <div class="form-row">
            <label for="f-price">Precio *</label>
            <input id="f-price" class="form-input" type="number" min="0" step="0.01" name="price" value="${product.price ?? ""}" />
            <span class="form-hint">En pesos. Ej: 45000</span>
          </div>
          <div class="form-row">
            <label for="f-price-old">Precio anterior</label>
            <input id="f-price-old" class="form-input" type="number" min="0" step="0.01" name="priceOld" value="${product.priceOld ?? ""}" />
            <span class="form-hint">Opcional. Si está, se muestra tachado para mostrar oferta.</span>
          </div>
          <div class="form-row">
            <label for="f-stock">Stock</label>
            <input id="f-stock" class="form-input" type="number" min="0" step="1" name="stock" value="${product.stock ?? 0}" />
            <span class="form-hint">Cantidad disponible. Si llega a 0 se marca como sin stock.</span>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-head"><h2>Variantes</h2></div>
        <div class="form-grid">
          <div class="form-row">
            <span class="form-label">Talles</span>
            <div class="tag-input" id="tag-sizes" data-tag-target="sizes"></div>
            <span class="form-hint">Apretá Enter para agregar cada talle (S, M, L, 38, 40...).</span>
          </div>
          <div class="form-row">
            <span class="form-label">Colores</span>
            <div class="tag-input" id="tag-colors" data-tag-target="colors"></div>
            <span class="form-hint">Apretá Enter para agregar cada color.</span>
          </div>
        </div>
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <div class="card-head">
          <h2>Imágenes</h2>
          <span style="color:var(--text-mute); font-size:12px;">JPG, PNG o WEBP · máx 5MB · se optimizan automáticamente</span>
        </div>
        <div class="uploader" id="uploader">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p><strong>Hacé click acá</strong> o arrastrá las fotos del producto.</p>
          <input type="file" id="file-input" accept="image/*" multiple style="display:none;" />
        </div>
        <div class="image-grid" id="image-grid"></div>
      </div>

    </form>
  `;

  // ── Tag inputs ──
  setupTagInput($("#tag-sizes"), sizes);
  setupTagInput($("#tag-colors"), colors);

  // ── Imágenes ──
  const uploader = $("#uploader");
  const fileInput = $("#file-input");
  const grid = $("#image-grid");

  function paintImages() {
    grid.innerHTML = images.map((img, idx) => `
      <div class="image-tile ${img.isMain ? "is-main" : ""}" draggable="true" data-idx="${idx}">
        <img src="${escapeHtml(img.url)}" alt="">
        ${img.isMain ? `<span class="main-tag">Principal</span>` : ""}
        <div class="image-actions">
          ${!img.isMain ? `<button type="button" title="Marcar como principal" data-action="main"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></button>` : ""}
          <button type="button" class="danger" title="Eliminar" data-action="delete"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg></button>
        </div>
      </div>
    `).join("");
  }
  paintImages();

  uploader.onclick = () => fileInput.click();
  uploader.ondragover = (e) => { e.preventDefault(); uploader.classList.add("is-drag"); };
  uploader.ondragleave = () => uploader.classList.remove("is-drag");
  uploader.ondrop = async (e) => {
    e.preventDefault();
    uploader.classList.remove("is-drag");
    await handleFiles(e.dataTransfer.files);
  };
  fileInput.onchange = (e) => handleFiles(e.target.files);

  async function handleFiles(fileList) {
    const files = [...fileList];
    if (files.length === 0) return;

    // Si es producto nuevo, primero creamos un doc para tener id
    if (!workingId) {
      try {
        workingId = await createProduct({ name: $("#f-name").value || "Sin nombre", active: false });
        toast("Producto creado. Ahora subimos las imágenes.", "info");
      } catch (err) {
        toast("No se pudo crear el producto: " + err.message, "error");
        return;
      }
    }

    for (const file of files) {
      const placeholder = { url: URL.createObjectURL(file), path: null, isMain: images.length === 0, uploading: true };
      images.push(placeholder);
      paintImages();
      const idx = images.length - 1;
      $$("#image-grid .image-tile")[idx]?.classList.add("is-uploading");
      try {
        const uploaded = await uploadProductImage(workingId, file);
        URL.revokeObjectURL(placeholder.url);
        images[idx] = { ...uploaded, isMain: placeholder.isMain };
        paintImages();
      } catch (err) {
        images.splice(idx, 1);
        toast("Error subiendo imagen: " + err.message, "error");
        paintImages();
      }
    }
    // persistir cambio de imágenes ya
    try {
      await updateProduct(workingId, { images: cleanImages(images) });
    } catch (err) {
      toast("No se pudieron guardar las imágenes: " + err.message, "error");
    }
  }

  grid.addEventListener("click", async (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const tile = btn.closest(".image-tile");
    const idx = Number(tile.dataset.idx);
    const action = btn.dataset.action;
    if (action === "main") {
      images.forEach((img, i) => { img.isMain = i === idx; });
      paintImages();
      if (workingId) await updateProduct(workingId, { images: cleanImages(images) });
    } else if (action === "delete") {
      const img = images[idx];
      images.splice(idx, 1);
      if (img.isMain && images[0]) images[0].isMain = true;
      paintImages();
      if (workingId) {
        await updateProduct(workingId, { images: cleanImages(images) });
        if (img.path) deleteStorageObject(img.path);
      }
    }
  });

  // Drag and drop para reordenar imágenes
  let dragSrc = null;
  grid.addEventListener("dragstart", (e) => {
    const tile = e.target.closest(".image-tile");
    if (!tile) return;
    dragSrc = Number(tile.dataset.idx);
    e.dataTransfer.effectAllowed = "move";
  });
  grid.addEventListener("dragover", (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  });
  grid.addEventListener("drop", async (e) => {
    e.preventDefault();
    const tile = e.target.closest(".image-tile");
    if (!tile || dragSrc == null) return;
    const target = Number(tile.dataset.idx);
    if (target === dragSrc) return;
    const [moved] = images.splice(dragSrc, 1);
    images.splice(target, 0, moved);
    dragSrc = null;
    paintImages();
    if (workingId) await updateProduct(workingId, { images: cleanImages(images) });
  });

  // ── Guardar producto ──
  $("#save-btn").onclick = async () => {
    const name = $("#f-name").value.trim();
    if (!name) {
      toast("El nombre es obligatorio", "error");
      $("#f-name").focus();
      return;
    }

    const data = {
      name,
      description: $("#f-desc").value.trim(),
      categoryId: $("#f-cat").value,
      price: parseNumber($("#f-price").value),
      priceOld: parseNumber($("#f-price-old").value),
      stock: parseInt($("#f-stock").value, 10) || 0,
      active: $("#f-active").checked,
      featured: $("#f-featured").checked,
      sizes,
      colors,
      images: cleanImages(images),
    };

    $("#save-btn").disabled = true;
    try {
      if (workingId) {
        await updateProduct(workingId, data);
        toast("Producto guardado");
      } else {
        workingId = await createProduct(data);
        toast("Producto creado");
      }
      window.location.hash = "#/products";
    } catch (err) {
      toast("Error al guardar: " + err.message, "error");
      $("#save-btn").disabled = false;
    }
  };
}

function setupTagInput(container, list) {
  function paint() {
    container.innerHTML = "";
    list.forEach((tag, i) => {
      const chip = el("span", { class: "tag-chip", text: tag });
      const btn = el("button", { type: "button", text: "×", onClick: () => { list.splice(i, 1); paint(); } });
      chip.appendChild(btn);
      container.appendChild(chip);
    });
    const input = el("input", { type: "text", placeholder: list.length ? "" : "Agregar..." });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === ",") {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          list.push(val);
          paint();
        }
      } else if (e.key === "Backspace" && !input.value && list.length) {
        list.pop();
        paint();
      }
    });
    input.addEventListener("blur", () => {
      const val = input.value.trim();
      if (val) { list.push(val); paint(); }
    });
    container.appendChild(input);
  }
  container.addEventListener("click", () => container.querySelector("input")?.focus());
  paint();
}

function cleanImages(arr) {
  return arr
    .filter((img) => img.url && !img.uploading)
    .map((img) => ({ url: img.url, path: img.path || null, isMain: !!img.isMain }));
}

function parseNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
