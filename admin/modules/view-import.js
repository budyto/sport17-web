// ─── Vista: Importar / Exportar Excel ────────────────────────────────────────
// Usa SheetJS (xlsx) cargado por CDN. Permite:
//   - descargar el listado actual
//   - subir un Excel con cambios de precio / stock / estado
//   - estructura preparada para sincronización con Google Sheets

import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import {
  fetchProducts, fetchCategories, bulkUpdateProducts, createProduct, updateProduct,
  saveImportSnapshot, fetchImportHistory, deleteImportSnapshot, rollbackImport,
} from "./data.js";
import { escapeHtml, $, formatDateTime } from "./helpers.js";
import { toast, loadingState, confirmDialog } from "./ui.js";
import { getCurrentUser } from "./auth.js";

export async function renderImport(outlet) {
  outlet.innerHTML = loadingState();
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const catById = (id) => categories.find((c) => c.id === id);

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Importar / Exportar</h2>
        <p style="color: var(--text-mute);">Trabajá la tienda desde Excel: descargá el catálogo, editá masivo y volvé a subirlo.</p>
      </div>
    </div>

    <div class="form-grid">
      <!-- Exportar -->
      <div class="card">
        <div class="card-head">
          <h2>Exportar catálogo</h2>
        </div>
        <p style="color: var(--text-soft);">Descargá un Excel con todos los productos: id, nombre, precio, precio anterior, stock, categoría, talles, colores, estado, destacado y descripción.</p>
        <div style="display:flex; gap:10px; margin-top: 14px;">
          <button class="btn btn-primary" id="export-xlsx">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Descargar .xlsx
          </button>
          <button class="btn btn-secondary" id="export-csv">Descargar .csv</button>
        </div>
        <p style="font-size:12px; color: var(--text-mute); margin-top:14px;">
          ${products.length} producto${products.length === 1 ? "" : "s"} disponible${products.length === 1 ? "" : "s"}.
        </p>
      </div>

      <!-- Importar -->
      <div class="card">
        <div class="card-head">
          <h2>Importar Excel</h2>
        </div>
        <p style="color: var(--text-soft);">Subí un .xlsx o .csv para actualizar precios, stock y estado. Los productos con id existente se actualizan; los que no tienen id se crean nuevos.</p>
        <div class="uploader" id="xls-uploader" style="margin-top:12px;">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
          <p><strong>Hacé click</strong> o arrastrá tu archivo Excel.</p>
          <input type="file" id="xls-file" accept=".xlsx,.xls,.csv" style="display:none;" />
        </div>
        <div id="xls-preview"></div>
      </div>
    </div>

    <div class="card" style="margin-top: 24px;">
      <div class="card-head">
        <h2>Google Sheets (preparado)</h2>
      </div>
      <p style="color: var(--text-soft);">
        Para sincronizar con Google Sheets en tiempo real podés exportar la hoja como CSV publicado y usar la URL como fuente.
        El sistema ya soporta importar desde Sheets: publicá tu hoja en
        <em>Archivo › Compartir › Publicar en la Web › formato CSV</em>, pegá la URL acá y traemos los datos.
      </p>
      <div class="form-row" style="margin-top:12px; max-width: 600px;">
        <label>URL CSV de Google Sheets</label>
        <input id="sheets-url" class="form-input" placeholder="https://docs.google.com/spreadsheets/d/.../pub?output=csv" />
      </div>
      <button class="btn btn-secondary" id="sheets-fetch" style="margin-top: 10px;">Traer datos de Google Sheets</button>
    </div>
  `;

  // ── Export
  $("#export-xlsx").onclick = () => exportFile(products, catById, "xlsx");
  $("#export-csv").onclick = () => exportFile(products, catById, "csv");

  // ── Import
  const uploader = $("#xls-uploader");
  const fileInput = $("#xls-file");
  uploader.onclick = () => fileInput.click();
  uploader.ondragover = (e) => { e.preventDefault(); uploader.classList.add("is-drag"); };
  uploader.ondragleave = () => uploader.classList.remove("is-drag");
  uploader.ondrop = (e) => { e.preventDefault(); uploader.classList.remove("is-drag"); handleFile(e.dataTransfer.files[0]); };
  fileInput.onchange = (e) => handleFile(e.target.files[0]);

  async function handleFile(file) {
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = pickCatalogSheet(wb);
      const rows = extractRows(sheet);
      previewAndImport(rows, { source: "excel", fileName: file.name });
    } catch (err) {
      toast("No pude leer el archivo: " + err.message, "error");
    }
  }

  // ── Google Sheets
  $("#sheets-fetch").onclick = async () => {
    const url = $("#sheets-url").value.trim();
    if (!url) { toast("Pegá la URL del Google Sheet publicado", "error"); return; }
    try {
      const res = await fetch(url);
      const csv = await res.text();
      const wb = XLSX.read(csv, { type: "string" });
      const rows = extractRows(wb.Sheets[wb.SheetNames[0]]);
      previewAndImport(rows, { source: "sheets", fileName: "Google Sheets" });
    } catch (err) {
      toast("No pude traer la hoja: " + err.message, "error");
    }
  };

  function previewAndImport(rows, meta) {
    if (!rows.length) { toast("El archivo no tiene filas", "error"); return; }
    const preview = $("#xls-preview");
    const cols = Object.keys(rows[0]);

    const toCreate = [];
    const toUpdate = [];
    const skipped = [];
    for (const r of rows) {
      const parsed = parseRow(r, categories);
      if (!parsed) { skipped.push(r); continue; }
      const { id, sku, fields } = parsed;

      // Estrategia de match:
      //  1) id de Firestore explícito
      //  2) sku (ej. "P001") guardado previamente en el producto
      //  3) nombre exacto + misma categoría (fallback útil tras el seed)
      let existing = null;
      if (id) existing = products.find((p) => p.id === id);
      if (!existing && sku) existing = products.find((p) => (p.sku || "").toLowerCase() === sku.toLowerCase());
      if (!existing && fields.name) {
        existing = products.find((p) =>
          (p.name || "").trim().toLowerCase() === fields.name.trim().toLowerCase()
          && (!fields.categoryId || p.categoryId === fields.categoryId)
        );
      }

      if (existing) toUpdate.push({ id: existing.id, fields });
      else toCreate.push(fields);
    }

    preview.innerHTML = `
      <div class="alert alert-info" style="margin-top:14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <strong>Vista previa</strong>
          <div>Se van a actualizar <strong>${toUpdate.length}</strong> producto${toUpdate.length === 1 ? "" : "s"} y crear <strong>${toCreate.length}</strong> nuevo${toCreate.length === 1 ? "" : "s"}.${skipped.length ? ` Se saltean <strong>${skipped.length}</strong> fila${skipped.length === 1 ? "" : "s"} sin nombre.` : ""}</div>
          <div style="font-size:12px; color: var(--text-soft); margin-top:6px;">Columnas detectadas: ${cols.map(escapeHtml).join(", ")}</div>
        </div>
      </div>
      <button class="btn btn-primary" id="confirm-import" style="margin-top: 10px;">Aplicar cambios</button>
      <button class="btn btn-ghost" id="cancel-import" style="margin-top: 10px;">Cancelar</button>
    `;
    $("#cancel-import").onclick = () => preview.innerHTML = "";
    $("#confirm-import").onclick = async () => {
      $("#confirm-import").disabled = true;
      $("#confirm-import").innerHTML = `<span class="spinner"></span> Aplicando...`;
      try {
        // 1. Capturar snapshot del estado anterior — solo de los productos que se van a tocar.
        const snapshotUpdated = toUpdate.map(({ id, fields }) => {
          const current = products.find((p) => p.id === id) || {};
          const before = {};
          for (const k of Object.keys(fields)) before[k] = current[k] ?? null;
          // capturamos también los campos críticos por las dudas
          ["name", "description", "price", "priceOld", "cost", "stock", "categoryId", "sizes", "colors", "active", "featured", "sku", "images"].forEach((k) => {
            if (!(k in before)) before[k] = current[k] ?? null;
          });
          return { id, before };
        });

        // 2. Aplicar updates + creates, recolectando IDs creados.
        if (toUpdate.length) await bulkUpdateProducts(toUpdate);
        const createdIds = [];
        for (const data of toCreate) {
          const newId = await createProduct(data);
          createdIds.push(newId);
        }

        // 3. Guardar snapshot para poder deshacer.
        const user = getCurrentUser();
        await saveImportSnapshot({
          source: meta?.source || "manual",
          fileName: meta?.fileName || "",
          userEmail: user?.email || "",
          updated: snapshotUpdated,
          created: createdIds,
          stats: { updated: toUpdate.length, created: toCreate.length, skipped: skipped.length },
        });

        toast(`Listo: ${toUpdate.length} actualizado${toUpdate.length === 1 ? "" : "s"}, ${toCreate.length} creado${toCreate.length === 1 ? "" : "s"}. Podés deshacer desde abajo.`);
        preview.innerHTML = "";
        renderImport(outlet);
      } catch (err) {
        toast("Error al aplicar: " + err.message, "error");
        $("#confirm-import").disabled = false;
        $("#confirm-import").textContent = "Aplicar cambios";
      }
    };
  }

  // ═══ Historial de imports (con deshacer) ═══
  await renderHistory(outlet);
}

async function renderHistory(outlet) {
  // Insertamos la card de historial al final del outlet
  const history = await fetchImportHistory(10);
  const wrap = document.createElement("div");
  wrap.className = "card";
  wrap.style.marginTop = "24px";
  wrap.innerHTML = `
    <div class="card-head">
      <h2>Historial de importaciones</h2>
      <span style="color: var(--text-mute); font-size: 12px;">Últimas 10 · podés deshacer cada una</span>
    </div>
    ${history.length === 0 ? `
      <p style="color: var(--text-soft); margin: 0;">Todavía no hiciste imports. Cuando subas un Excel o un Sheet vas a poder revertirlo desde acá.</p>
    ` : `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Origen</th>
              <th>Cambios</th>
              <th>Usuario</th>
              <th style="text-align:right;">Acciones</th>
            </tr>
          </thead>
          <tbody>
            ${history.map(historyRow).join("")}
          </tbody>
        </table>
      </div>
    `}
  `;
  outlet.appendChild(wrap);

  wrap.addEventListener("click", async (e) => {
    const undoBtn = e.target.closest("[data-undo]");
    const dropBtn = e.target.closest("[data-drop]");
    if (undoBtn) {
      const id = undoBtn.dataset.undo;
      const snap = history.find((h) => h.id === id);
      const stats = snap.stats || {};
      const ok = await confirmDialog({
        title: "Deshacer importación",
        message: `Vamos a restaurar ${stats.updated || 0} producto${stats.updated === 1 ? "" : "s"} a su estado anterior y eliminar ${stats.created || 0} producto${stats.created === 1 ? "" : "s"} creado${stats.created === 1 ? "" : "s"} en este import. ¿Continuar?`,
        confirmText: "Sí, deshacer",
        danger: true,
      });
      if (!ok) return;
      undoBtn.disabled = true;
      undoBtn.innerHTML = `<span class="spinner"></span>`;
      try {
        await rollbackImport(snap);
        await deleteImportSnapshot(id);
        toast("Importación revertida");
        renderImport(document.getElementById("route-outlet"));
      } catch (err) {
        toast("Error al revertir: " + err.message, "error");
        undoBtn.disabled = false;
        undoBtn.textContent = "Deshacer";
      }
    } else if (dropBtn) {
      const id = dropBtn.dataset.drop;
      const ok = await confirmDialog({
        title: "Borrar del historial",
        message: "Esto borra solo el registro del historial. Los cambios al catálogo se mantienen tal cual están.",
        confirmText: "Borrar registro",
        danger: true,
      });
      if (!ok) return;
      await deleteImportSnapshot(id);
      toast("Registro borrado");
      renderImport(outlet.parentElement || outlet);
    }
  });
}

function historyRow(h) {
  const stats = h.stats || {};
  const srcLabel = h.source === "sheets" ? "Google Sheets" : h.source === "excel" ? "Excel" : (h.source || "—");
  return `
    <tr>
      <td>${formatDateTime(h.createdAt)}</td>
      <td><span class="badge badge-info">${escapeHtml(srcLabel)}</span>${h.fileName && h.source === "excel" ? `<div style="font-size:11px; color:var(--text-mute); margin-top:2px;">${escapeHtml(h.fileName)}</div>` : ""}</td>
      <td>
        ${stats.updated ? `<span style="margin-right:8px;">↻ ${stats.updated} actualizado${stats.updated === 1 ? "" : "s"}</span>` : ""}
        ${stats.created ? `<span style="color:var(--success);">+ ${stats.created} creado${stats.created === 1 ? "" : "s"}</span>` : ""}
        ${!stats.updated && !stats.created ? `<span style="color:var(--text-mute);">sin cambios</span>` : ""}
      </td>
      <td><span style="color:var(--text-soft); font-size:12px;">${escapeHtml(h.userEmail || "—")}</span></td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn btn-secondary btn-sm" data-undo="${h.id}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Deshacer
        </button>
        <button class="btn btn-ghost btn-sm" data-drop="${h.id}" title="Borrar registro" style="color:var(--text-mute);">×</button>
      </td>
    </tr>`;
}

// Reconoce el primer sheet con cabecera real ("ID" / "Nombre" / "Precio").
function pickCatalogSheet(wb) {
  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
    if (rows.some(rowLooksLikeHeader)) return sheet;
  }
  return wb.Sheets[wb.SheetNames[0]];
}

function rowLooksLikeHeader(row) {
  const text = row.map((c) => String(c || "").toLowerCase()).join("|");
  return /\b(id|sku)\b/.test(text)
      && /\b(nombre|name|producto)\b/.test(text)
      && /\b(precio|price)\b/.test(text);
}

// Convierte un sheet a array de objetos, saltando filas de título previas a la cabecera.
function extractRows(sheet) {
  const raw = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });
  let headerIdx = raw.findIndex(rowLooksLikeHeader);
  if (headerIdx === -1) {
    // fallback: usar primera fila como cabecera
    return XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }
  const headers = raw[headerIdx].map((h) => String(h).trim());
  const out = [];
  for (let i = headerIdx + 1; i < raw.length; i++) {
    const row = raw[i];
    if (row.every((c) => c === "" || c == null)) continue;
    const obj = {};
    headers.forEach((h, j) => { obj[h] = row[j] ?? ""; });
    out.push(obj);
  }
  return out;
}

function parseRow(r, categories) {
  // Normalizamos nombres de columna: minúsculas, sin espacios, sin acentos, sin paréntesis.
  const norm = (k) =>
    String(k)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\([^)]*\)/g, "") // quita "(%)", "($)" etc.
      .replace(/[^a-z0-9]+/g, "");
  const map = {};
  for (const k of Object.keys(r)) map[norm(k)] = r[k];

  const get = (...keys) => {
    for (const k of keys) {
      if (map[k] !== undefined && map[k] !== "" && map[k] !== null) return map[k];
    }
    return undefined;
  };

  const name = get("nombredelproducto", "nombre", "name", "producto");
  if (!name) return null;

  const idCol = get("idfirestore"); // por si el usuario agregó esta columna manualmente
  const sku = String(get("id", "sku", "codigo") || "").trim();

  const fields = { name: String(name).trim() };

  if (sku) fields.sku = sku;
  if (get("descripcion", "description", "notas") !== undefined) fields.description = String(get("descripcion", "description", "notas")).trim();
  if (get("precio", "precioventa", "price") !== undefined) fields.price = num(get("precio", "precioventa", "price"));
  if (get("preciooriginal", "precioanterior", "priceold") !== undefined) fields.priceOld = num(get("preciooriginal", "precioanterior", "priceold"));
  if (get("costo", "cost") !== undefined) fields.cost = num(get("costo", "cost"));
  if (get("stock", "cantidad") !== undefined) fields.stock = parseInt(num(get("stock", "cantidad")), 10) || 0;
  if (get("activo", "active", "estado") !== undefined) fields.active = bool(get("activo", "active", "estado"));
  if (get("destacado", "featured") !== undefined) fields.featured = bool(get("destacado", "featured"));
  if (get("tallesdisponibles", "talles", "sizes") !== undefined) fields.sizes = list(get("tallesdisponibles", "talles", "sizes"));
  if (get("colores", "colors") !== undefined) fields.colors = list(get("colores", "colors"));

  // Resolver categoría: priorizamos combo Género+Categoría → slug del seed (ej. "Hombre"+"Camiseta" → "hombres-camisetas").
  // Si no matchea, caemos al match por nombre exacto de categoría.
  const genero = String(get("genero", "seccion", "gender") || "").toLowerCase().trim();
  const categoria = String(get("categoria", "category") || "").trim();
  if (categoria) {
    const parent = genero.startsWith("h") ? "hombres" : genero.startsWith("m") ? "mujeres" : "";
    const cat = resolveCategory(categories, categoria, parent);
    if (cat) fields.categoryId = cat.id;
  }

  return { id: idCol ? String(idCol).trim() : null, sku, fields };
}

function resolveCategory(categories, name, parent) {
  const nameNorm = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
  // Match estricto por sección + nombre que empieza con el texto del Excel
  // Ej: "Camiseta" + parent "hombres" → "Camisetas" en parent "hombres"
  const matchesName = (catName) => {
    const n = catName.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
    return n === nameNorm || n.startsWith(nameNorm) || nameNorm.startsWith(n);
  };
  if (parent) {
    const c = categories.find((x) => x.parent === parent && matchesName(x.name));
    if (c) return c;
  }
  return categories.find((x) => matchesName(x.name));
}

function num(v) {
  if (v === "" || v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  let s = String(v).replace(/[^\d.,-]/g, "").trim();
  if (!s) return null;
  // Detectar formato es-AR ($45.000 = 45000) vs en-US ($45,000.50 = 45000.50).
  // Regla: el último separador es el decimal; el otro es de miles.
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    if (lastDot > lastComma) s = s.replace(/,/g, "");                   // en-US
    else s = s.replace(/\./g, "").replace(",", ".");                    // es-AR
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    // múltiples puntos, o un punto con 3 dígitos al final = separador de miles
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = s.replace(/\./g, "");
  } else if (lastComma >= 0) {
    const parts = s.split(",");
    if (parts.length > 2 || parts[parts.length - 1].length === 3) s = s.replace(/,/g, "");
    else s = s.replace(",", ".");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function bool(v) {
  const s = String(v).toLowerCase().trim();
  return ["1", "true", "si", "sí", "yes", "activo", "destacado"].includes(s);
}
function list(v) {
  if (Array.isArray(v)) return v;
  return String(v).split(/[,;|]/).map((s) => s.trim()).filter(Boolean);
}

// Mapeo de categorías plural → singular para imitar el formato del Excel
// maestro (ej: "Camisetas" en Firestore → "Camiseta" en el export).
function categoryToSingular(catName) {
  if (!catName) return "";
  return catName
    .replace(/ Mujer$/i, "")          // "Camperas Mujer" → "Camperas"
    .replace(/^Camisetas?$/i, "Camiseta")
    .replace(/^Camperas?$/i, "Campera")
    .replace(/^Conjuntos?$/i, "Conjunto")
    .replace(/^Pantalones?$/i, "Pantalon")
    .replace(/^Zapatillas?$/i, "Zapatilla")
    .replace(/^Perfumes? (Hombres|Mujeres)$/i, "Perfume")
    .replace(/^Perfumes?$/i, "Perfume")
    .replace(/^Buzos y Sweaters?$/i, "Buzo");
}

// Genera el ID legible para el Excel: usa p.sku si existe, sino "P001"..."P999"
// según el orden de aparición. Esto le da continuidad al Excel de control.
function generateExportId(p, index) {
  if (p.sku && p.sku.trim()) return p.sku.trim();
  return "P" + String(index + 1).padStart(3, "0");
}

// Formatea un timestamp de Firestore o Date a "DD/MM/YYYY HH:mm" (estilo AR).
function formatTimestamp(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : (ts instanceof Date ? ts : new Date(ts));
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Normaliza precios que quedaron guardados en miles (ej: 45 → 45000).
function normalizePriceValue(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return n;
  return n < 1000 ? n * 1000 : n;
}

// Devuelve la URL de la imagen principal del producto (o vacío si no tiene).
function getMainImageUrl(p) {
  const imgs = p.images || [];
  if (imgs.length === 0) return "";
  const main = imgs.find((i) => i.isMain) || imgs[0];
  return main?.url || "";
}

function exportFile(products, catById, format) {
  // Ordenamos productos por género y categoría para que el Excel salga prolijo,
  // igual que el Sheets maestro: primero Hombres, después Mujeres.
  const sortedProducts = [...products].sort((a, b) => {
    const catA = catById(a.categoryId);
    const catB = catById(b.categoryId);
    const parentA = catA?.parent === "hombres" ? 0 : catA?.parent === "mujeres" ? 1 : 2;
    const parentB = catB?.parent === "hombres" ? 0 : catB?.parent === "mujeres" ? 1 : 2;
    if (parentA !== parentB) return parentA - parentB;
    const orderA = catA?.order ?? 999;
    const orderB = catB?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "");
  });

  // Cabecera completa: 18 columnas comerciales + 3 metadatos para import inverso.
  const headers = [
    "ID",
    "Genero",
    "Categoria",
    "Nombre del Producto",
    "Colores",
    "Talles Disponibles",
    "Precio ($)",
    "Precio Anterior ($)",
    "% Descuento",
    "Costo ($)",
    "Ganancia ($)",
    "Ganancia (%)",
    "Stock",
    "Alerta Stock",
    "Imagen Principal",
    "Notas",
    "Creado",
    "Ultimo Cambio",
    // Metadatos para import (al final)
    "Activo",
    "Destacado",
    "ID Firestore",
  ];

  const dataRows = sortedProducts.map((p, i) => {
    const cat = catById(p.categoryId);
    const genero = cat?.parent === "hombres" ? "Hombre" : cat?.parent === "mujeres" ? "Mujer" : "";
    const precio = normalizePriceValue(p.price);
    const precioOld = normalizePriceValue(p.priceOld);
    const costo = normalizePriceValue(p.cost);
    // % de descuento si hay precio anterior mayor al actual
    const descuentoPct = (precioOld > 0 && precio > 0 && precioOld > precio)
      ? Math.round((1 - precio / precioOld) * 100)
      : "";
    const ganancia = costo > 0 && precio > 0 ? precio - costo : "";
    const gananciaPct = costo > 0 ? Math.round(((precio - costo) / costo) * 100) : "";
    const stock = p.stock ?? 0;
    const alerta = stock <= 0 ? "AGOTADO" : stock <= 3 ? "BAJO" : "OK";
    return [
      generateExportId(p, i),
      genero,
      categoryToSingular(cat?.name),
      p.name || "",
      (p.colors || []).join(","),
      (p.sizes || []).join(","),
      precio || "",
      precioOld || "",
      descuentoPct === "" ? "" : descuentoPct,
      costo || "",
      ganancia,
      gananciaPct,
      stock,
      alerta,
      getMainImageUrl(p),
      p.description || "",
      formatTimestamp(p.createdAt),
      formatTimestamp(p.updatedAt),
      p.active ? "Si" : "No",
      p.featured ? "Si" : "No",
      p.id,
    ];
  });

  // Construimos la hoja como array-of-arrays para tener control fino sobre
  // tipos de celda y formato (no es lo mismo que json_to_sheet).
  const aoa = [headers, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Formatos por columna (las letras corresponden a la nueva estructura de 21 columnas):
  //   G=Precio  H=Precio Anterior  I=% Descuento  J=Costo  K=Ganancia $  L=Ganancia %  M=Stock
  const moneyCols = ["G", "H", "J", "K"];
  const pctCols = ["I", "L"];
  const numCols = ["M"];
  for (let r = 2; r <= aoa.length; r++) {
    moneyCols.forEach((col) => {
      const cell = ws[`${col}${r}`];
      if (cell && typeof cell.v === "number") { cell.t = "n"; cell.z = '"$"#,##0'; }
    });
    pctCols.forEach((col) => {
      const cell = ws[`${col}${r}`];
      if (cell && typeof cell.v === "number") { cell.t = "n"; cell.z = '0"%"'; }
    });
    numCols.forEach((col) => {
      const cell = ws[`${col}${r}`];
      if (cell && typeof cell.v === "number") { cell.t = "n"; }
    });
  }

  // Anchos de columna optimizados (21 columnas)
  ws["!cols"] = [
    { wch: 8 },   // ID
    { wch: 10 },  // Genero
    { wch: 14 },  // Categoria
    { wch: 42 },  // Nombre del Producto
    { wch: 24 },  // Colores
    { wch: 22 },  // Talles
    { wch: 14 },  // Precio
    { wch: 16 },  // Precio Anterior
    { wch: 12 },  // % Descuento
    { wch: 14 },  // Costo
    { wch: 14 },  // Ganancia $
    { wch: 14 },  // Ganancia %
    { wch: 8 },   // Stock
    { wch: 14 },  // Alerta Stock
    { wch: 50 },  // Imagen Principal (URL)
    { wch: 36 },  // Notas
    { wch: 18 },  // Creado
    { wch: 18 },  // Ultimo Cambio
    { wch: 8 },   // Activo
    { wch: 11 },  // Destacado
    { wch: 26 },  // ID Firestore
  ];

  // Freeze pane: primera fila siempre visible al scrollear
  ws["!freeze"] = { xSplit: 0, ySplit: 1, topLeftCell: "A2", activePane: "bottomLeft", state: "frozen" };
  // Para xlsx, la propiedad oficial es "!freeze" o sheetView; usamos el método actual:
  if (!ws["!views"]) ws["!views"] = [];
  ws["!views"][0] = { state: "frozen", ySplit: 1 };

  // Autofiltro en toda la cabecera (Excel agrega los dropdowns automáticamente)
  ws["!autofilter"] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "CATALOGO");

  // Hoja de "Ayuda" con descripción de cada columna y los valores válidos
  const helpRows = [
    ["Columna", "Qué es", "Valores válidos", "Editable en import"],
    ["ID", "Código corto del producto (ej: P001)", "Texto libre. Si está vacío en un import nuevo, se autogenera.", "Sí"],
    ["Genero", "Sección padre", "Hombre | Mujer", "Sí"],
    ["Categoria", "Categoría del producto", "Camiseta, Campera, Conjunto, Pantalon, Zapatilla, Perfume, Buzo", "Sí"],
    ["Nombre del Producto", "Nombre comercial", "Texto libre", "Sí"],
    ["Colores", "Colores disponibles separados por coma", 'Ej: "Negro,Blanco,Rojo"', "Sí"],
    ["Talles Disponibles", "Talles separados por coma", 'Ej: "S,M,L,XL" o "40,41,42"', "Sí"],
    ["Precio ($)", "Precio de venta en pesos", "Número entero (ej: 45000)", "Sí"],
    ["Precio Anterior ($)", "Precio antes de la oferta. Se muestra tachado en la web.", "Número entero. Vacío si no hay oferta.", "Sí"],
    ["% Descuento", "Calculado automáticamente si hay Precio Anterior", "Calculado: (1 − Precio/Precio Anterior) × 100", "No"],
    ["Costo ($)", "Costo interno (no se muestra al público)", "Número entero (vacío si no se quiere registrar)", "Sí"],
    ["Ganancia ($)", "Calculado automáticamente: Precio − Costo", "Calculado", "No"],
    ["Ganancia (%)", "Calculado automáticamente: (Precio − Costo) / Costo × 100", "Calculado", "No"],
    ["Stock", "Unidades disponibles", "Número entero", "Sí"],
    ["Alerta Stock", "Calculado automáticamente", "OK (>3) | BAJO (1-3) | AGOTADO (0)", "No"],
    ["Imagen Principal", "URL de la imagen principal", "URL (Firebase Storage o ruta relativa)", "No editar manualmente. Subir desde el panel."],
    ["Notas", "Descripción interna del producto", "Texto libre", "Sí"],
    ["Creado", "Fecha de creación del producto", "DD/MM/YYYY HH:mm", "No"],
    ["Ultimo Cambio", "Última vez que se modificó", "DD/MM/YYYY HH:mm", "No"],
    ["Activo", "Si se muestra en la tienda pública", "Si | No", "Sí"],
    ["Destacado", "Si aparece en la sección Destacados del home", "Si | No", "Sí"],
    ["ID Firestore", "ID interno (no tocar)", "Auto", "No — si lo borrás se crea un producto nuevo en el import"],
  ];
  const wsHelp = XLSX.utils.aoa_to_sheet(helpRows);
  wsHelp["!cols"] = [{ wch: 22 }, { wch: 48 }, { wch: 42 }, { wch: 18 }];
  wsHelp["!views"] = [{ state: "frozen", ySplit: 1 }];
  XLSX.utils.book_append_sheet(wb, wsHelp, "AYUDA");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `sport17_catalogo_${stamp}.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format });
  toast(`Catálogo descargado (${sortedProducts.length} productos)`);
}
