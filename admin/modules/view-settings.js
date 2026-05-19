// ─── Vista: Configuración + seed inicial ─────────────────────────────────────

import { db, doc, getDoc, setDoc, serverTimestamp, writeBatch, collection, getDocs, deleteDoc, query, orderBy } from "../firebase-init.js";
import { STORE } from "./helpers.js";
import { $ } from "./helpers.js";
import { toast, confirmDialog } from "./ui.js";
import { runSeed } from "./seed.js";
import { deleteStorageObject } from "./images.js";

export async function renderSettings(outlet) {
  outlet.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  const snap = await getDoc(doc(db, "settings", "store"));
  const data = snap.exists() ? snap.data() : {};

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Configuración</h2>
        <p style="color: var(--text-mute);">Datos generales de la tienda y mantenimiento.</p>
      </div>
    </div>

    <div class="card" style="max-width: 720px;">
      <div class="card-head"><h2>Tienda</h2></div>
      <form id="settings-form" class="form-grid">
        <div class="form-row">
          <label>WhatsApp (formato internacional)</label>
          <input class="form-input" name="whatsapp" value="${data.whatsapp || STORE.whatsappNumber}" placeholder="5491136634655" />
          <span class="form-hint">Sin "+" ni espacios. Se usa para los botones "Quiero más info".</span>
        </div>
        <div class="form-row">
          <label>Umbral de bajo stock</label>
          <input class="form-input" type="number" min="0" name="lowStock" value="${data.lowStock ?? STORE.lowStockThreshold}" />
          <span class="form-hint">Productos con stock ≤ este número aparecen como "bajo stock".</span>
        </div>
        <div class="form-row full">
          <label class="form-toggle">
            <input type="checkbox" name="hideOutOfStock" ${data.hideOutOfStock ?? STORE.hideOutOfStock ? "checked" : ""}>
            <span class="switch"></span>
            <span>Ocultar productos sin stock en la tienda pública</span>
          </label>
          <span class="form-hint">Si está apagado, los productos sin stock se muestran con la etiqueta "Sin stock".</span>
        </div>
        <div class="form-row full">
          <label>Texto del banner promocional</label>
          <input class="form-input" name="promoBanner" value="${data.promoBanner || ""}" placeholder="Ej: 15% off pagando en efectivo" />
        </div>
      </form>
      <div style="margin-top: 18px; display:flex; gap:10px;">
        <button class="btn btn-primary" id="save-settings">Guardar configuración</button>
      </div>
    </div>

    <div class="card" style="max-width: 720px; margin-top: 24px;">
      <div class="card-head"><h2>Mantenimiento</h2></div>
      <p style="color: var(--text-soft); margin-bottom: 14px;">Acciones útiles para arrancar o resetear el catálogo.</p>
      <button class="btn btn-secondary" id="seed-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        Importar productos iniciales (desde main.js histórico)
      </button>
      <p style="font-size:12px; color: var(--text-mute); margin-top: 8px;">
        Carga las categorías y productos que estaban hardcodeados en la web (hombres, mujeres, perfumes).
        Solo crea los que no existen. Se puede ejecutar varias veces sin duplicar.
      </p>
    </div>

    <div class="card" style="max-width: 720px; margin-top: 24px;">
      <div class="card-head"><h2>Limpiar catálogo</h2></div>
      <p style="color: var(--text-soft); margin-bottom: 14px;">
        Detecta productos duplicados (mismo nombre), normaliza precios que quedaron en miles
        (ej: 45 → $45.000), y opcionalmente elimina los que no tienen imagen.
        Te muestra un resumen antes de aplicar nada.
      </p>
      <button class="btn btn-secondary" id="cleanup-scan-btn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        Analizar catálogo
      </button>
      <div id="cleanup-report" style="margin-top:16px;"></div>
    </div>

    <div class="card" style="max-width: 720px; margin-top: 24px;">
      <div class="card-head">
        <h2>Suscriptores al newsletter</h2>
      </div>
      <p style="color: var(--text-soft); margin-bottom: 14px;">
        Emails capturados desde el footer de la home. Exportá la lista para usarla
        en tu herramienta de email marketing.
      </p>
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-secondary" id="newsletter-refresh-btn">Ver lista</button>
        <button class="btn btn-secondary" id="newsletter-export-btn">Descargar CSV</button>
      </div>
      <div id="newsletter-list" style="margin-top:16px;"></div>
    </div>

    <div class="card" style="max-width: 720px; margin-top: 24px; border: 1px solid rgba(220,38,38,0.3);">
      <div class="card-head"><h2>Acciones destructivas</h2></div>
      <p style="color: var(--text-soft); margin-bottom: 14px;">
        Elimina <strong>todos</strong> los productos sin imagen del catálogo. Útil después de
        un import inicial donde quedaron productos placeholder. Esta acción no se puede deshacer.
      </p>
      <button class="btn btn-secondary" id="delete-no-image-btn" style="color: #ef4444; border-color: rgba(220,38,38,0.3);">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
        Borrar productos sin imagen
      </button>
      <div id="no-image-report" style="margin-top:16px;"></div>
    </div>
  `;

  $("#save-settings").onclick = async () => {
    const f = $("#settings-form");
    const payload = {
      whatsapp: f.whatsapp.value.trim(),
      lowStock: parseInt(f.lowStock.value, 10) || 0,
      hideOutOfStock: f.hideOutOfStock.checked,
      promoBanner: f.promoBanner.value.trim(),
      updatedAt: serverTimestamp(),
    };
    try {
      await setDoc(doc(db, "settings", "store"), payload, { merge: true });
      toast("Configuración guardada");
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  };

  $("#seed-btn").onclick = async () => {
    const ok = await confirmDialog({
      title: "Importar productos iniciales",
      message: "Esto va a crear las categorías y productos originales en Firestore. Solo se agregan los que faltan. ¿Continuar?",
      confirmText: "Sí, importar",
    });
    if (!ok) return;
    $("#seed-btn").disabled = true;
    try {
      const res = await runSeed();
      toast(`Listo: ${res.categoriesCreated} categorías, ${res.productsCreated} productos creados.`);
    } catch (err) {
      toast("Error en el seed: " + err.message, "error");
    } finally {
      $("#seed-btn").disabled = false;
    }
  };

  $("#cleanup-scan-btn").onclick = () => runCleanupScan();
  $("#delete-no-image-btn").onclick = () => deleteNoImageProducts();
  $("#newsletter-refresh-btn").onclick = () => loadNewsletterList();
  $("#newsletter-export-btn").onclick = () => exportNewsletterCsv();
}

// ═══════════════ NEWSLETTER ═══════════════
async function fetchNewsletter() {
  const q = query(collection(db, "newsletter"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function loadNewsletterList() {
  const list = $("#newsletter-list");
  list.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const items = await fetchNewsletter();
    if (items.length === 0) {
      list.innerHTML = `<p style="color:var(--text-mute); font-size:13px;">Todavía no hay suscriptores.</p>`;
      return;
    }
    const rows = items.map((it) => {
      const date = it.createdAt?.toDate ? it.createdAt.toDate() : null;
      const dateStr = date
        ? `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`
        : "—";
      return `<tr>
        <td><a href="mailto:${escapeForHtml(it.email)}" style="color:var(--primary);">${escapeForHtml(it.email)}</a></td>
        <td><span style="font-size:12px; color:var(--text-mute);">${escapeForHtml(it.source || "—")}</span></td>
        <td>${dateStr}</td>
        <td><button class="btn btn-ghost btn-sm" data-newsletter-drop="${it.id}" style="color:var(--danger);">×</button></td>
      </tr>`;
    }).join("");
    list.innerHTML = `
      <p style="color:var(--text-soft); font-size:13px; margin: 0 0 8px;">${items.length} suscriptor${items.length === 1 ? "" : "es"}</p>
      <div class="table-wrap" style="max-height: 400px; overflow:auto;">
        <table class="table">
          <thead>
            <tr><th>Email</th><th>Origen</th><th>Fecha</th><th></th></tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
    `;
    list.querySelectorAll("[data-newsletter-drop]").forEach((btn) => {
      btn.onclick = async () => {
        const ok = await confirmDialog({
          title: "Borrar suscriptor",
          message: "¿Eliminar este email de la lista?",
          confirmText: "Borrar",
          danger: true,
        });
        if (!ok) return;
        try {
          await deleteDoc(doc(db, "newsletter", btn.dataset.newsletterDrop));
          loadNewsletterList();
          toast("Suscriptor eliminado");
        } catch (err) {
          toast("Error: " + err.message, "error");
        }
      };
    });
  } catch (err) {
    list.innerHTML = `<p style="color:#ef4444; font-size:13px;">Error: ${escapeForHtml(err.message)}</p>`;
  }
}

async function exportNewsletterCsv() {
  try {
    const items = await fetchNewsletter();
    if (items.length === 0) {
      toast("Todavía no hay suscriptores", "info");
      return;
    }
    const header = ["Email", "Origen", "Fecha de alta"];
    const rows = items.map((it) => {
      const date = it.createdAt?.toDate ? it.createdAt.toDate() : null;
      const dateStr = date ? date.toISOString() : "";
      return [it.email || "", it.source || "", dateStr];
    });
    const csv = [header, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sport17_newsletter_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast(`${items.length} suscriptores exportados`);
  } catch (err) {
    toast("Error al exportar: " + err.message, "error");
  }
}

// Borra todos los productos cuyo array images esté vacío.
async function deleteNoImageProducts() {
  const btn = $("#delete-no-image-btn");
  const report = $("#no-image-report");
  btn.disabled = true;
  report.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const products = await fetchAllProducts();
    const orphans = products.filter((p) => !p.images || p.images.length === 0);

    if (orphans.length === 0) {
      report.innerHTML = `<div style="background: rgba(22,163,74,0.12); color: #16a34a; padding:14px; border-radius:10px; border:1px solid rgba(22,163,74,0.3);">
        ✓ Todos los productos tienen al menos una imagen. Nada que borrar.
      </div>`;
      btn.disabled = false;
      return;
    }

    const sample = orphans.slice(0, 10).map((p) => `<li style="padding:3px 0; font-size:13px;">${escapeForHtml(p.name)}</li>`).join("");
    report.innerHTML = `
      <div style="background: rgba(220,38,38,0.08); border:1px solid rgba(220,38,38,0.3); border-radius:12px; padding:16px;">
        <p style="margin:0 0 10px; color:#ef4444; font-weight:600;">${orphans.length} productos sin imagen detectados</p>
        <details style="margin-bottom: 14px;">
          <summary style="cursor:pointer; color: var(--text-soft); font-size:13px;">Ver primeros 10</summary>
          <ul style="margin:6px 0 0; padding-left:18px;">${sample}</ul>
        </details>
        <div style="display:flex; gap:10px;">
          <button class="btn btn-primary" id="confirm-delete-no-image" style="background:#dc2626; border-color:#dc2626;">Borrar ${orphans.length} productos</button>
          <button class="btn btn-ghost" id="cancel-delete-no-image">Cancelar</button>
        </div>
      </div>
    `;

    $("#cancel-delete-no-image").onclick = () => { report.innerHTML = ""; btn.disabled = false; };

    $("#confirm-delete-no-image").onclick = async () => {
      const ok = await confirmDialog({
        title: "Confirmar borrado",
        message: `Se eliminarán ${orphans.length} productos. Esta acción no se puede deshacer.`,
        confirmText: "Sí, borrar",
        danger: true,
      });
      if (!ok) return;
      $("#confirm-delete-no-image").disabled = true;
      $("#confirm-delete-no-image").innerHTML = `<span class="spinner"></span> Borrando...`;
      let deleted = 0;
      try {
        // Borrar en lotes de 400 (límite Firestore = 500)
        for (let i = 0; i < orphans.length; i += 400) {
          const slice = orphans.slice(i, i + 400);
          const batch = writeBatch(db);
          for (const p of slice) batch.delete(doc(db, "products", p.id));
          await batch.commit();
          deleted += slice.length;
        }
        report.innerHTML = `<div style="background: rgba(22,163,74,0.12); color: #16a34a; padding:14px; border-radius:10px; border:1px solid rgba(22,163,74,0.3);">
          ✓ ${deleted} productos sin imagen eliminados.
        </div>`;
        toast(`${deleted} productos sin imagen eliminados`);
      } catch (err) {
        report.innerHTML = `<div style="background:rgba(220,38,38,0.1); color:#ef4444; padding:14px; border-radius:10px;">
          Error: ${escapeForHtml(err.message)}
        </div>`;
        toast("Error al borrar: " + err.message, "error");
      } finally {
        btn.disabled = false;
      }
    };
  } catch (err) {
    report.innerHTML = `<div style="background:rgba(220,38,38,0.1); color:#ef4444; padding:14px; border-radius:10px;">
      Error: ${escapeForHtml(err.message)}
    </div>`;
    btn.disabled = false;
  }
}

// ═══════════════ LIMPIEZA DE CATÁLOGO ═══════════════
// Detecta:
//   1. Productos duplicados (mismo nombre normalizado). Conserva el "mejor":
//      el que tiene más imágenes; a igualdad, el más nuevo (createdAt).
//   2. Precios sospechosamente bajos (< 1000): los multiplica x1000 porque
//      históricamente se guardaban en miles (ej: 45 → 45000).
//   3. priceOld bajo: misma normalización.

function norm(s) {
  return String(s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}

async function fetchAllProducts() {
  const snap = await getDocs(collection(db, "products"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

function rateProduct(p) {
  const imgCount = (p.images || []).length;
  const hasPrice = (p.price ?? 0) > 0 ? 1 : 0;
  const hasDesc = (p.description || "").trim() ? 1 : 0;
  const stockGood = (p.stock ?? 0) > 0 ? 1 : 0;
  const created = p.createdAt?.toMillis?.() || 0;
  // Más imágenes pesa fuerte, luego precio, descripción, stock, y por último fecha (más nuevo gana).
  return imgCount * 100 + hasPrice * 10 + hasDesc * 5 + stockGood * 2 + created * 1e-12;
}

function analyzeCatalog(products) {
  // Duplicados
  const groups = new Map();
  for (const p of products) {
    const key = norm(p.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const dupGroups = [];
  for (const [key, items] of groups) {
    if (items.length < 2) continue;
    items.sort((a, b) => rateProduct(b) - rateProduct(a));
    dupGroups.push({ name: items[0].name, keeper: items[0], drop: items.slice(1) });
  }

  // Precios en miles
  const priceFixes = products.filter((p) => {
    const n = Number(p.price);
    return Number.isFinite(n) && n > 0 && n < 1000;
  });
  const priceOldFixes = products.filter((p) => {
    const n = Number(p.priceOld);
    return Number.isFinite(n) && n > 0 && n < 1000;
  });

  return { dupGroups, priceFixes, priceOldFixes };
}

async function runCleanupScan() {
  const btn = $("#cleanup-scan-btn");
  const report = $("#cleanup-report");
  btn.disabled = true;
  report.innerHTML = `<div class="loading"><div class="spinner"></div></div>`;
  try {
    const products = await fetchAllProducts();
    const { dupGroups, priceFixes, priceOldFixes } = analyzeCatalog(products);
    const totalDrops = dupGroups.reduce((acc, g) => acc + g.drop.length, 0);
    const nothing = totalDrops === 0 && priceFixes.length === 0 && priceOldFixes.length === 0;

    if (nothing) {
      report.innerHTML = `<div class="alert alert-success" style="background: rgba(22,163,74,0.12); color: #16a34a; padding:14px; border-radius:10px; border:1px solid rgba(22,163,74,0.3);">
        ✓ El catálogo está limpio. No hay duplicados ni precios para normalizar.
      </div>`;
      btn.disabled = false;
      return;
    }

    const dupListHtml = dupGroups.length === 0
      ? `<p style="color:var(--text-mute); font-size:13px;">No se detectaron duplicados.</p>`
      : dupGroups.slice(0, 20).map((g) => `
        <li style="padding:6px 0; border-bottom:1px solid var(--line); font-size:13px;">
          <strong>${escapeForHtml(g.name)}</strong>
          <span style="color:var(--text-mute);"> — se conserva 1, se eliminan ${g.drop.length}</span>
        </li>`).join("");

    report.innerHTML = `
      <div style="background: rgba(245, 158, 11, 0.08); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:16px;">
        <h3 style="margin:0 0 12px; font-size:1rem; color:#f59e0b;">Resultados del análisis</h3>
        <ul style="margin:0 0 12px; padding-left:18px; font-size:14px; line-height:1.7;">
          <li><strong>${totalDrops}</strong> productos duplicados a eliminar (${dupGroups.length} grupos)</li>
          <li><strong>${priceFixes.length}</strong> precios sospechosamente bajos (se multiplican x1000)</li>
          <li><strong>${priceOldFixes.length}</strong> precios anteriores a normalizar</li>
        </ul>

        ${dupGroups.length > 0 ? `
          <details style="margin: 8px 0 14px;">
            <summary style="cursor:pointer; color: var(--text-soft); font-size:13px;">Ver los primeros 20 grupos de duplicados</summary>
            <ul style="list-style:none; padding:8px 0 0; margin:6px 0 0;">${dupListHtml}</ul>
          </details>
        ` : ""}

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-primary" id="cleanup-apply-btn">Aplicar limpieza</button>
          <button class="btn btn-ghost" id="cleanup-cancel-btn">Cancelar</button>
        </div>
        <p style="font-size:12px; color:var(--text-mute); margin: 10px 0 0;">
          Se hace en lotes seguros. Las imágenes de los productos eliminados se borran del Storage también.
        </p>
      </div>
    `;

    $("#cleanup-cancel-btn").onclick = () => { report.innerHTML = ""; btn.disabled = false; };

    $("#cleanup-apply-btn").onclick = async () => {
      const ok = await confirmDialog({
        title: "Aplicar limpieza",
        message: `Se eliminarán ${totalDrops} productos duplicados y se normalizarán ${priceFixes.length + priceOldFixes.length} precios. Esta acción no se puede deshacer.`,
        confirmText: "Sí, aplicar",
        danger: true,
      });
      if (!ok) return;
      $("#cleanup-apply-btn").disabled = true;
      $("#cleanup-apply-btn").innerHTML = `<span class="spinner"></span> Limpiando...`;
      try {
        const result = await applyCleanup(dupGroups, priceFixes, priceOldFixes);
        report.innerHTML = `<div class="alert alert-success" style="background: rgba(22,163,74,0.12); color: #16a34a; padding:14px; border-radius:10px; border:1px solid rgba(22,163,74,0.3);">
          ✓ Limpieza aplicada: ${result.deleted} eliminados, ${result.priceUpdated} precios normalizados, ${result.imagesDeleted} imágenes borradas del Storage.
        </div>`;
        toast(`Limpieza OK: ${result.deleted} eliminados, ${result.priceUpdated} precios ok`);
      } catch (err) {
        report.innerHTML = `<div class="alert alert-danger" style="background:rgba(220,38,38,0.1); color:#ef4444; padding:14px; border-radius:10px; border:1px solid rgba(220,38,38,0.3);">
          Error: ${escapeForHtml(err.message)}
        </div>`;
        toast("Error en la limpieza: " + err.message, "error");
      } finally {
        btn.disabled = false;
      }
    };
  } catch (err) {
    report.innerHTML = `<div class="alert alert-danger" style="background:rgba(220,38,38,0.1); color:#ef4444; padding:14px; border-radius:10px;">
      Error analizando el catálogo: ${escapeForHtml(err.message)}
    </div>`;
    btn.disabled = false;
  }
}

async function applyCleanup(dupGroups, priceFixes, priceOldFixes) {
  let deleted = 0;
  let priceUpdated = 0;
  let imagesDeleted = 0;

  // 1. Borrar duplicados (con sus imágenes de Storage)
  for (const group of dupGroups) {
    for (const p of group.drop) {
      try {
        for (const img of p.images || []) {
          if (img.path) {
            try { await deleteStorageObject(img.path); imagesDeleted++; } catch { /* ignore */ }
          }
        }
      } catch { /* ignore image errors */ }
      const ref = doc(db, "products", p.id);
      const batch = writeBatch(db);
      batch.delete(ref);
      await batch.commit();
      deleted++;
    }
  }

  // 2. Normalizar precios bajos (x1000)
  const updates = new Map(); // id -> patch
  for (const p of priceFixes) {
    const cur = updates.get(p.id) || {};
    cur.price = Number(p.price) * 1000;
    updates.set(p.id, cur);
  }
  for (const p of priceOldFixes) {
    const cur = updates.get(p.id) || {};
    cur.priceOld = Number(p.priceOld) * 1000;
    updates.set(p.id, cur);
  }

  // Aplicar updates en lotes de 400 (límite firestore = 500)
  const entries = [...updates.entries()];
  for (let i = 0; i < entries.length; i += 400) {
    const slice = entries.slice(i, i + 400);
    const batch = writeBatch(db);
    for (const [id, patch] of slice) {
      batch.update(doc(db, "products", id), { ...patch, updatedAt: serverTimestamp() });
    }
    await batch.commit();
    priceUpdated += slice.length;
  }

  return { deleted, priceUpdated, imagesDeleted };
}

function escapeForHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
