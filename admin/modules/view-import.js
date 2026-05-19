// ─── Vista: Importar / Exportar Excel ────────────────────────────────────────
// Usa SheetJS (xlsx) cargado por CDN. Permite:
//   - descargar el listado actual
//   - subir un Excel con cambios de precio / stock / estado
//   - estructura preparada para sincronización con Google Sheets

import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import {
  fetchProducts, fetchCategories, fetchSections, ensureDefaultSections,
  bulkUpdateProducts, createProduct, updateProduct,
  saveImportSnapshot, fetchImportHistory, deleteImportSnapshot, rollbackImport,
} from "./data.js";
import { escapeHtml, $, formatDateTime } from "./helpers.js";
import { toast, loadingState, confirmDialog } from "./ui.js";
import { getCurrentUser } from "./auth.js";

export async function renderImport(outlet) {
  outlet.innerHTML = loadingState();
  await ensureDefaultSections();
  const [products, categories, sections] = await Promise.all([
    fetchProducts(), fetchCategories(), fetchSections(),
  ]);
  const catById = (id) => categories.find((c) => c.id === id);
  // Mapeo slug → nombre legible para la columna "Genero" del Excel
  const sectionNameBySlug = new Map(sections.map((s) => [s.id, s.name]));

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
  $("#export-xlsx").onclick = () => exportFile(products, catById, "xlsx", sectionNameBySlug);
  $("#export-csv").onclick = () => exportFile(products, catById, "csv", sectionNameBySlug);

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
      const parsed = parseRow(r, categories, sections);
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

function parseRow(r, categories, sections = []) {
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

  // Resolver categoría a partir del combo "Genero" + "Categoria" del Excel.
  // El valor de "Genero" puede ser cualquier nombre de sección (Hombre, Mujer,
  // Tecnología, Hogar, etc.). Lo resolvemos primero contra los slugs reales y
  // si no matchea hacemos heurística por inicial (compat con "Hombre"/"Mujer").
  const genero = String(get("genero", "seccion", "gender") || "").trim();
  const categoria = String(get("categoria", "category") || "").trim();
  if (categoria) {
    const parent = resolveSectionSlug(genero, sections);
    const cat = resolveCategory(categories, categoria, parent);
    if (cat) fields.categoryId = cat.id;
  }

  return { id: idCol ? String(idCol).trim() : null, sku, fields };
}

// Resuelve el slug de sección a partir del texto que vino del Excel.
// Acepta: slug directo ("hombres"), nombre de sección ("Hombres"), o iniciales
// legacy ("h" → hombres, "m" → mujeres). Devuelve "" si no hay match.
function resolveSectionSlug(input, sections) {
  if (!input) return "";
  const norm = String(input).toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim();
  if (!norm) return "";
  // Match exacto contra slug
  const bySlug = sections.find((s) => s.id.toLowerCase() === norm);
  if (bySlug) return bySlug.id;
  // Match exacto contra nombre normalizado
  const byName = sections.find((s) => String(s.name || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").trim() === norm);
  if (byName) return byName.id;
  // Match prefijo (ej. "hombre" → "hombres" si el slug empieza con hombre)
  const byPrefix = sections.find((s) => s.id.toLowerCase().startsWith(norm) || norm.startsWith(s.id.toLowerCase()));
  if (byPrefix) return byPrefix.id;
  // Fallback legacy: si dice "h*" mapeamos a la sección de hombres si existe
  if (norm.startsWith("h") && sections.some((s) => s.id === "hombres")) return "hombres";
  if (norm.startsWith("m") && sections.some((s) => s.id === "mujeres")) return "mujeres";
  return "";
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

// Carga ExcelJS dinámicamente solo cuando se necesita (~600KB).
// Lo cargamos via UMD para que exponga `window.ExcelJS`. Esto evita peso muerto
// en el bundle inicial del admin (la mayoría no exporta seguido).
async function loadExcelJS() {
  if (window.ExcelJS) return window.ExcelJS;
  await new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js";
    s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error("No se pudo cargar ExcelJS desde el CDN."));
    document.head.appendChild(s);
  });
  return window.ExcelJS;
}

async function exportFile(products, catById, format, sectionNameBySlug = new Map()) {
  // Ordenamos productos: agrupados por sección (parent), luego categoría, luego nombre.
  // Las secciones se ordenan por slug para que el output sea estable.
  const sortedProducts = [...products].sort((a, b) => {
    const catA = catById(a.categoryId);
    const catB = catById(b.categoryId);
    const parentA = catA?.parent || "zzz";
    const parentB = catB?.parent || "zzz";
    if (parentA !== parentB) return parentA.localeCompare(parentB);
    const orderA = catA?.order ?? 999;
    const orderB = catB?.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || "").localeCompare(b.name || "");
  });

  if (format === "csv") {
    return exportFileCsv(sortedProducts, catById, sectionNameBySlug);
  }

  try {
    const ExcelJS = await loadExcelJS();
    await exportFileXlsx(ExcelJS, sortedProducts, catById, sectionNameBySlug);
    toast(`Catálogo descargado (${sortedProducts.length} productos)`);
  } catch (err) {
    console.error(err);
    toast("Error al exportar: " + err.message, "error");
  }
}

// Resolve "Hombres" / "Mujeres" / "Tecnología" según el slug del parent. Si no
// matchea con ninguna sección activa, hacemos un fallback al string crudo
// capitalizado (ej: "ropa-deportiva" → "Ropa Deportiva").
function resolveGeneroLabel(parentSlug, sectionNameBySlug) {
  if (!parentSlug) return "";
  const name = sectionNameBySlug?.get?.(parentSlug);
  if (name) return name;
  return parentSlug
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase())
    .join(" ");
}

// ─────────────────────────── EXPORT XLSX (ExcelJS) ───────────────────────────
// Replica el formato del archivo maestro del cliente:
//   - Hoja "CATALOGO": título mergeado A1:M1 con fondo #1A1A2E, header fila 2
//     con fondo #16213E, freeze A3, autofilter A2:M*, fórmulas en Ganancia $
//     y %, Alerta Stock dinámica.
//   - Hoja "RESUMEN": métricas y desglose por categoría con fórmulas COUNTIF
//     y AVERAGEIFS.
//   - Hoja "GUIA DE USO": documentación de las columnas y procedimientos.

async function exportFileXlsx(ExcelJS, sortedProducts, catById, sectionNameBySlug) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SPORT17 Admin";
  wb.created = new Date();

  // ═══════ HOJA 1: CATALOGO ═══════
  const ws = wb.addWorksheet("CATALOGO", {
    views: [{ state: "frozen", xSplit: 0, ySplit: 2, activeCell: "A3" }],
  });

  // Anchos de columna (12 + 1 = 13 columnas: A..M)
  ws.columns = [
    { width: 6 },     // A: ID
    { width: 10 },    // B: Genero
    { width: 16 },    // C: Categoria
    { width: 42.71 }, // D: Nombre del Producto
    { width: 16 },    // E: Precio Anterior ($)
    { width: 12.43 }, // F: Precio ($)
    { width: 11 },    // G: Costo ($)
    { width: 13 },    // H: Ganancia ($)
    { width: 12 },    // I: Ganancia (%)
    { width: 28 },    // J: Talles Disponibles
    { width: 9.71 },  // K: Stock
    { width: 13 },    // L: Alerta Stock
    { width: 24 },    // M: Notas
  ];

  // Fila 1: título mergeado A1:M1
  ws.mergeCells("A1:M1");
  const titleCell = ws.getCell("A1");
  titleCell.value = "SPORT17 — Catálogo de Productos";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(1).height = 30;

  // Fila 2: headers
  const headers = [
    "ID", "Genero", "Categoria", "Nombre del Producto",
    "Precio Anterior ($)", "Precio ($)", "Costo ($)", "Ganancia ($)", "Ganancia (%)",
    "Talles Disponibles", "Stock", "Alerta Stock", "Notas",
  ];
  const headerRow = ws.getRow(2);
  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16213E" } };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFE5E7EB" } },
      bottom: { style: "thin", color: { argb: "FFE5E7EB" } },
      left: { style: "thin", color: { argb: "FFE5E7EB" } },
      right: { style: "thin", color: { argb: "FFE5E7EB" } },
    };
  });
  headerRow.height = 36;

  // Filas 3+: data
  sortedProducts.forEach((p, i) => {
    const r = i + 3;
    const cat = catById(p.categoryId);
    const genero = resolveGeneroLabel(cat?.parent, sectionNameBySlug);
    const precio = normalizePriceValue(p.price);
    const precioOld = normalizePriceValue(p.priceOld);
    const costo = normalizePriceValue(p.cost);
    const stock = p.stock;

    const row = ws.getRow(r);
    row.getCell(1).value = generateExportId(p, i);                          // A: ID
    row.getCell(2).value = genero;                                          // B: Genero
    row.getCell(3).value = categoryToSingular(cat?.name);                   // C: Categoria
    row.getCell(4).value = p.name || "";                                    // D: Nombre
    if (precioOld > 0) row.getCell(5).value = precioOld;                    // E: Precio Anterior
    if (precio > 0) row.getCell(6).value = precio;                          // F: Precio
    if (costo > 0) row.getCell(7).value = costo;                            // G: Costo
    row.getCell(8).value = { formula: `IF(AND(F${r}<>"",G${r}<>""),F${r}-G${r},"")` };       // H: Ganancia $
    row.getCell(9).value = { formula: `IF(AND(G${r}<>"",G${r}<>0,H${r}<>""),H${r}/G${r},"")` }; // I: Ganancia %
    row.getCell(10).value = (p.sizes || []).join(",");                      // J: Talles
    if (typeof stock === "number") row.getCell(11).value = stock;           // K: Stock
    row.getCell(12).value = {                                                // L: Alerta Stock (fórmula)
      formula: `IF(K${r}="","Sin dato",IF(K${r}=0,"AGOTADO",IF(K${r}<=3,"BAJO","OK")))`
    };
    row.getCell(13).value = p.description || "";                            // M: Notas

    // Formato de moneda en columnas E, F, G, H
    ["E", "F", "G", "H"].forEach((col) => {
      row.getCell(col).numFmt = '"$"#,##0';
    });
    // Formato porcentaje en I
    row.getCell("I").numFmt = '0.0%;(0.0%);-';

    // Estilo "celda editable" en Precio (F) — azul sobre gris claro, como el cliente.
    const precioCell = row.getCell(6);
    precioCell.font = { color: { argb: "FF0000FF" } };
    precioCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8F9FA" } };

    // Filas zebra (alternar fondo cada par) para legibilidad
    if (i % 2 === 1) {
      [1, 2, 3, 4, 5, 7, 8, 9, 10, 11, 12, 13].forEach((c) => {
        const cell = row.getCell(c);
        if (!cell.fill || cell.fill.type !== "pattern") {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFAFBFC" } };
        }
      });
    }
  });

  // Autofilter en toda la tabla
  const lastRow = sortedProducts.length + 2;
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: lastRow, column: 13 } };

  // ═══════ HOJA 2: RESUMEN ═══════
  const wsResumen = wb.addWorksheet("RESUMEN");
  wsResumen.columns = [{ width: 28 }, { width: 18 }, { width: 22 }, { width: 18 }];

  // Título
  wsResumen.mergeCells("A1:D1");
  const tR = wsResumen.getCell("A1");
  tR.value = "SPORT17 — Resumen del Catálogo";
  tR.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  tR.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
  tR.alignment = { horizontal: "center", vertical: "middle" };
  wsResumen.getRow(1).height = 30;

  // Métricas generales
  const sectionStyle = (cell) => {
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16213E" } };
    cell.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
  };
  wsResumen.mergeCells("A2:D2");
  sectionStyle(wsResumen.getCell("A2"));
  wsResumen.getCell("A2").value = "MÉTRICAS GENERALES";
  wsResumen.getRow(2).height = 24;

  const lastDataRow = Math.max(lastRow, 200); // rango dinámico hasta fila 200
  const metricas = [
    ["Total de Productos",       `COUNTA(CATALOGO!D3:D${lastDataRow})`],
    ["Productos sin Precio",     `COUNTBLANK(CATALOGO!F3:F${lastRow})`],
    ["Precio Promedio ($)",      `IFERROR(AVERAGEIF(CATALOGO!F3:F${lastDataRow},"<>"),"-")`],
    ["Productos Hombre",         `COUNTIF(CATALOGO!B3:B${lastDataRow},"Hombre")`],
    ["Productos Mujer",          `COUNTIF(CATALOGO!B3:B${lastDataRow},"Mujer")`],
    ["Stock Total",              `SUM(CATALOGO!K3:K${lastDataRow})`],
    ["Productos AGOTADOS",       `COUNTIF(CATALOGO!L3:L${lastDataRow},"AGOTADO")`],
    ["Productos con stock BAJO", `COUNTIF(CATALOGO!L3:L${lastDataRow},"BAJO")`],
  ];
  metricas.forEach((m, idx) => {
    const r = idx + 3;
    wsResumen.getCell(`A${r}`).value = m[0];
    wsResumen.getCell(`A${r}`).font = { name: "Arial", size: 10 };
    wsResumen.getCell(`B${r}`).value = { formula: m[1] };
    wsResumen.getCell(`B${r}`).alignment = { horizontal: "right" };
    if (m[0].includes("Promedio") || m[0].includes("Precio")) {
      wsResumen.getCell(`B${r}`).numFmt = '"$"#,##0';
    }
  });

  // Desglose por categoría
  const desRow = metricas.length + 4; // gap
  wsResumen.mergeCells(`A${desRow}:D${desRow}`);
  sectionStyle(wsResumen.getCell(`A${desRow}`));
  wsResumen.getCell(`A${desRow}`).value = "DESGLOSE POR CATEGORÍA";
  wsResumen.getRow(desRow).height = 24;

  const desHeaderRow = desRow + 1;
  ["Categoría", "Cantidad", "Precio Promedio", "Stock Total"].forEach((h, i) => {
    const c = wsResumen.getCell(desHeaderRow, i + 1);
    c.value = h;
    c.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF374151" } };
    c.alignment = { horizontal: "center", vertical: "middle" };
  });

  const cats = ["Zapatilla", "Campera", "Conjunto", "Pantalon", "Camiseta", "Perfume", "Buzo", "Sweater"];
  cats.forEach((catName, idx) => {
    const r = desHeaderRow + 1 + idx;
    wsResumen.getCell(`A${r}`).value = catName;
    wsResumen.getCell(`B${r}`).value = { formula: `COUNTIF(CATALOGO!C3:C${lastDataRow},"${catName}")` };
    wsResumen.getCell(`C${r}`).value = { formula: `IFERROR(AVERAGEIFS(CATALOGO!F3:F${lastDataRow},CATALOGO!C3:C${lastDataRow},"${catName}",CATALOGO!F3:F${lastDataRow},"<>"),"-")` };
    wsResumen.getCell(`C${r}`).numFmt = '"$"#,##0';
    wsResumen.getCell(`D${r}`).value = { formula: `SUMIFS(CATALOGO!K3:K${lastDataRow},CATALOGO!C3:C${lastDataRow},"${catName}")` };
    wsResumen.getCell(`B${r}`).alignment = { horizontal: "right" };
    wsResumen.getCell(`D${r}`).alignment = { horizontal: "right" };
  });

  // ═══════ HOJA 3: GUIA DE USO ═══════
  const wsGuia = wb.addWorksheet("GUIA DE USO");
  wsGuia.columns = [{ width: 4 }, { width: 22 }, { width: 70 }];

  // Título
  wsGuia.mergeCells("B1:C1");
  const tG = wsGuia.getCell("B1");
  tG.value = "SPORT17 — Guía de Uso del Catálogo";
  tG.font = { name: "Arial", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  tG.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1A1A2E" } };
  tG.alignment = { horizontal: "center", vertical: "middle" };
  wsGuia.getRow(1).height = 30;

  const section = (rowNum, title) => {
    wsGuia.mergeCells(`B${rowNum}:C${rowNum}`);
    const c = wsGuia.getCell(`B${rowNum}`);
    c.value = title;
    c.font = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF16213E" } };
    c.alignment = { horizontal: "left", vertical: "middle", indent: 1 };
    wsGuia.getRow(rowNum).height = 22;
  };
  const item = (rowNum, label, desc) => {
    const b = wsGuia.getCell(`B${rowNum}`);
    const c = wsGuia.getCell(`C${rowNum}`);
    b.value = label;
    b.font = { name: "Arial", size: 10, bold: true };
    b.alignment = { vertical: "top", indent: 1 };
    c.value = desc;
    c.font = { name: "Arial", size: 10 };
    c.alignment = { vertical: "top", wrapText: true };
    wsGuia.getRow(rowNum).height = 22;
  };

  section(3, "1. COLUMNAS DEL CATÁLOGO");
  item(4, "ID", "Código único del producto (P001, P002...). No modificar.");
  item(5, "Genero", "Hombre o Mujer.");
  item(6, "Categoria", "Tipo de producto (Zapatilla, Campera, Conjunto, Pantalon, Camiseta, Perfume, Buzo, Sweater).");
  item(7, "Nombre del Producto", "Nombre completo del artículo tal como aparece en la web.");
  item(8, "Precio Anterior ($)", "Precio antes de la oferta. Si se completa, en la web aparece tachado y se muestra un badge de descuento.");
  item(9, "Precio ($)", "Precio de venta al público (lo que efectivamente paga el cliente).");
  item(10, "Costo ($)", "Precio al que comprás el producto. Solo para uso interno, no se muestra en la web.");
  item(11, "Ganancia ($)", "Se calcula automáticamente: Precio − Costo. No modificar.");
  item(12, "Ganancia (%)", "Se calcula automáticamente: Ganancia / Costo. No modificar.");
  item(13, "Talles Disponibles", "Talles separados por coma. Ej: \"S,M,L,XL\" o \"40,41,42\".");
  item(14, "Stock", "Cantidad de unidades disponibles. Actualizar manualmente.");
  item(15, "Alerta Stock", "Automático: BAJO si quedan 3 o menos, AGOTADO si stock = 0.");
  item(16, "Notas", "Observaciones libres: proveedor, color, variante, link de proveedor, etc.");

  section(18, "2. ACTUALIZAR UN PRECIO");
  item(19, "Paso 1", "Ir a la hoja CATALOGO.");
  item(20, "Paso 2", "Buscar el producto con Ctrl+F o usando el filtro en la columna Categoría.");
  item(21, "Paso 3", "Hacer clic en la celda de Precio ($) y escribir el nuevo precio de venta.");
  item(22, "Paso 4", "Guardar y subir el archivo desde el admin (Importar / Exportar).");

  section(24, "3. ACTUALIZAR STOCK");
  item(25, "Paso 1", "Ir a la columna Stock (K) del producto correspondiente.");
  item(26, "Paso 2", "Escribir la cantidad actual de unidades disponibles.");
  item(27, "Nota", "Si el stock llega a 0, la columna Alerta Stock muestra AGOTADO automáticamente.");

  section(29, "4. PROMOCIONES Y OFERTAS");
  item(30, "Paso 1", "Para marcar un producto en oferta, completar Precio Anterior ($) con el precio sin descuento.");
  item(31, "Paso 2", "El badge -X% aparece automáticamente en la web calculado sobre el Precio actual.");

  section(33, "5. HOJA RESUMEN");
  item(34, "Métricas", "Muestra automáticamente: total de productos, sin precio, precio promedio, cantidad por género, stock total, agotados y bajo stock.");
  item(35, "Desglose", "Cantidad, precio promedio y stock total por categoría. Se actualiza solo al editar el catálogo.");

  section(37, "6. SUBIR CAMBIOS A LA WEB");
  item(38, "Importar", "Desde el admin > Importar/Exportar, subí este archivo y se actualizan los productos automáticamente (precios, stock, descripción, talles).");
  item(39, "Historial", "Cada importación queda registrada, se puede deshacer desde el admin si algo sale mal.");

  // ═══════ DESCARGAR ═══════
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `catalogo_sport17_${stamp}.xlsx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─────────────────────────── EXPORT CSV (simple) ───────────────────────────
function exportFileCsv(sortedProducts, catById, sectionNameBySlug) {
  const headers = ["ID","Genero","Categoria","Nombre del Producto","Precio Anterior ($)","Precio ($)","Costo ($)","Ganancia ($)","Ganancia (%)","Talles Disponibles","Stock","Alerta Stock","Notas"];
  const rows = sortedProducts.map((p, i) => {
    const cat = catById(p.categoryId);
    const genero = resolveGeneroLabel(cat?.parent, sectionNameBySlug);
    const precio = normalizePriceValue(p.price);
    const precioOld = normalizePriceValue(p.priceOld);
    const costo = normalizePriceValue(p.cost);
    const ganancia = costo > 0 && precio > 0 ? precio - costo : "";
    const gananciaPct = costo > 0 && precio > 0 ? ((precio - costo) / costo).toFixed(3) : "";
    const stock = p.stock ?? "";
    const alerta = stock === "" ? "Sin dato" : stock <= 0 ? "AGOTADO" : stock <= 3 ? "BAJO" : "OK";
    return [
      generateExportId(p, i), genero, categoryToSingular(cat?.name), p.name || "",
      precioOld || "", precio || "", costo || "", ganancia, gananciaPct,
      (p.sizes || []).join(","), stock, alerta, p.description || "",
    ];
  });
  const csv = [headers, ...rows]
    .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `catalogo_sport17_${stamp}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast("Catálogo CSV descargado");
}
