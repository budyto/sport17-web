// ─── Vista: Configuración + seed inicial ─────────────────────────────────────

import { db, doc, getDoc, setDoc, serverTimestamp } from "../firebase-init.js";
import { STORE } from "./helpers.js";
import { $ } from "./helpers.js";
import { toast, confirmDialog } from "./ui.js";
import { runSeed } from "./seed.js";

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
}
