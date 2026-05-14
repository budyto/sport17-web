// ─── Vista: Importar / Exportar Excel ────────────────────────────────────────
// Usa SheetJS (xlsx) cargado por CDN. Permite:
//   - descargar el listado actual
//   - subir un Excel con cambios de precio / stock / estado
//   - estructura preparada para sincronización con Google Sheets

import * as XLSX from "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/+esm";
import { fetchProducts, fetchCategories, bulkUpdateProducts, createProduct, updateProduct } from "./data.js";
import { escapeHtml, $ } from "./helpers.js";
import { toast, loadingState } from "./ui.js";

export async function renderImport(outlet) {
  outlet.innerHTML = loadingState();
  const [products, categories] = await Promise.all([fetchProducts(), fetchCategories()]);
  const catName = (id) => categories.find((c) => c.id === id)?.name || "";
  const catByName = (name) => categories.find((c) => c.name.toLowerCase() === String(name || "").toLowerCase());

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
  $("#export-xlsx").onclick = () => exportFile(products, catName, "xlsx");
  $("#export-csv").onclick = () => exportFile(products, catName, "csv");

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
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      previewAndImport(rows);
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
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: "" });
      previewAndImport(rows);
    } catch (err) {
      toast("No pude traer la hoja: " + err.message, "error");
    }
  };

  function previewAndImport(rows) {
    if (!rows.length) { toast("El archivo no tiene filas", "error"); return; }
    const preview = $("#xls-preview");
    const cols = Object.keys(rows[0]);

    const toCreate = [];
    const toUpdate = [];
    for (const r of rows) {
      const id = String(r.id || r.ID || "").trim();
      const parsed = parseRow(r, catByName);
      if (id && products.some((p) => p.id === id)) toUpdate.push({ id, fields: parsed });
      else toCreate.push(parsed);
    }

    preview.innerHTML = `
      <div class="alert alert-info" style="margin-top:14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
        <div>
          <strong>Vista previa</strong>
          <div>Se van a actualizar <strong>${toUpdate.length}</strong> producto${toUpdate.length === 1 ? "" : "s"} y crear <strong>${toCreate.length}</strong> nuevo${toCreate.length === 1 ? "" : "s"}.</div>
          <div style="font-size:12px; color: var(--text-soft); margin-top:6px;">Columnas detectadas: ${cols.map(escapeHtml).join(", ")}</div>
        </div>
      </div>
      <button class="btn btn-primary" id="confirm-import" style="margin-top: 10px;">Aplicar cambios</button>
      <button class="btn btn-ghost" id="cancel-import" style="margin-top: 10px;">Cancelar</button>
    `;
    $("#cancel-import").onclick = () => preview.innerHTML = "";
    $("#confirm-import").onclick = async () => {
      $("#confirm-import").disabled = true;
      try {
        if (toUpdate.length) await bulkUpdateProducts(toUpdate);
        for (const data of toCreate) await createProduct(data);
        toast(`Listo: ${toUpdate.length} actualizado${toUpdate.length === 1 ? "" : "s"}, ${toCreate.length} creado${toCreate.length === 1 ? "" : "s"}.`);
        preview.innerHTML = "";
        renderImport(outlet);
      } catch (err) {
        toast("Error al aplicar: " + err.message, "error");
        $("#confirm-import").disabled = false;
      }
    };
  }
}

function parseRow(r, catByName) {
  // Normalizamos nombres de columna: minúsculas, sin espacios, sin acentos.
  const norm = (k) =>
    String(k)
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .replace(/\s+/g, "");
  const map = {};
  for (const k of Object.keys(r)) map[norm(k)] = r[k];

  const get = (...keys) => {
    for (const k of keys) {
      if (map[k] !== undefined && map[k] !== "") return map[k];
    }
    return undefined;
  };

  const out = {};
  if (get("nombre", "name", "producto") !== undefined) out.name = String(get("nombre", "name", "producto")).trim();
  if (get("descripcion", "description") !== undefined) out.description = String(get("descripcion", "description")).trim();
  if (get("precio", "price") !== undefined) out.price = num(get("precio", "price"));
  if (get("precioanterior", "preciooriginal", "priceold") !== undefined) out.priceOld = num(get("precioanterior", "preciooriginal", "priceold"));
  if (get("stock", "cantidad") !== undefined) out.stock = parseInt(num(get("stock", "cantidad")), 10) || 0;
  if (get("activo", "active", "estado") !== undefined) out.active = bool(get("activo", "active", "estado"));
  if (get("destacado", "featured") !== undefined) out.featured = bool(get("destacado", "featured"));
  if (get("talles", "sizes") !== undefined) out.sizes = list(get("talles", "sizes"));
  if (get("colores", "colors") !== undefined) out.colors = list(get("colores", "colors"));
  const catRaw = get("categoria", "category");
  if (catRaw) {
    const cat = catByName(catRaw);
    if (cat) out.categoryId = cat.id;
  }
  return out;
}

function num(v) {
  if (v === "" || v == null) return null;
  const cleaned = String(v).replace(/[^\d.,-]/g, "").replace(",", ".");
  const n = Number(cleaned);
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

function exportFile(products, catName, format) {
  const rows = products.map((p) => ({
    id: p.id,
    nombre: p.name || "",
    descripcion: p.description || "",
    categoria: catName(p.categoryId),
    precio: p.price ?? "",
    preciOAnterior: p.priceOld ?? "",
    stock: p.stock ?? 0,
    talles: (p.sizes || []).join(", "),
    colores: (p.colors || []).join(", "),
    activo: p.active ? "Si" : "No",
    destacado: p.featured ? "Si" : "No",
    imagenPrincipal: p.images?.find((i) => i.isMain)?.url || p.images?.[0]?.url || "",
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 22 }, { wch: 32 }, { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 14 },
    { wch: 8 }, { wch: 18 }, { wch: 18 }, { wch: 8 }, { wch: 10 }, { wch: 40 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Productos");

  const stamp = new Date().toISOString().slice(0, 10);
  const filename = `sport17_catalogo_${stamp}.${format}`;
  XLSX.writeFile(wb, filename, { bookType: format });
  toast("Catálogo descargado");
}
