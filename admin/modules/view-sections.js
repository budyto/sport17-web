// ─── Vista: Secciones (nivel padre de categorías) ────────────────────────────
// Las secciones son la primera capa visual de la tienda (Hombres, Mujeres,
// Tecnología, etc.). Cada sección tiene su imagen, descripción y orden.
// Las categorías referencian la sección por slug (doc id).

import {
  fetchSections,
  fetchCategories,
  fetchProducts,
  setSectionWithId,
  updateSection,
  deleteSectionDoc,
  reorderSections,
  ensureDefaultSections,
} from "./data.js";
import { uploadCategoryImage, deleteStorageObject } from "./images.js";
import { escapeHtml, slugify, $, el } from "./helpers.js";
import { toast, confirmDialog, openModal, loadingState } from "./ui.js";

export async function renderSections(outlet) {
  outlet.innerHTML = loadingState("Cargando secciones...");
  // Asegura hombres y mujeres si la BD todavía no tiene secciones
  await ensureDefaultSections();
  const [sections, categories, products] = await Promise.all([
    fetchSections(), fetchCategories(), fetchProducts(),
  ]);

  // Contar categorías y productos por sección
  const catBySection = {};
  const productBySection = {};
  categories.forEach((c) => {
    if (!c.parent) return;
    catBySection[c.parent] = (catBySection[c.parent] || 0) + 1;
  });
  products.forEach((p) => {
    const cat = categories.find((c) => c.id === p.categoryId);
    if (cat?.parent) {
      productBySection[cat.parent] = (productBySection[cat.parent] || 0) + 1;
    }
  });

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Secciones</h2>
        <p style="color: var(--text-mute);">
          ${sections.length} secci${sections.length === 1 ? "ón" : "ones"}. Arrastrá para reordenar.
          Las secciones son la primera capa de la tienda (Hombres, Mujeres, etc.).
        </p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="new-section-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva sección
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:80px;"></th>
            <th>Nombre</th>
            <th>Slug</th>
            <th>Categorías</th>
            <th>Productos</th>
            <th>Estado</th>
            <th>Orden</th>
            <th style="width:160px;"></th>
          </tr>
        </thead>
        <tbody id="sections-tbody">
          ${sections.length === 0 ? `
            <tr><td colspan="8"><div class="empty"><h3>Sin secciones</h3><p>Creá la primera para empezar.</p></div></td></tr>
          ` : sections.map((s) => row(s, catBySection, productBySection)).join("")}
        </tbody>
      </table>
    </div>
  `;

  $("#new-section-btn").onclick = () => openSectionEditor(null, sections, () => renderSections(outlet));

  // Drag & drop para reordenar
  const tbody = $("#sections-tbody");
  let dragId = null;
  tbody.addEventListener("dragstart", (e) => {
    const tr = e.target.closest("tr");
    if (!tr || !tr.dataset.id) return;
    dragId = tr.dataset.id;
    tr.classList.add("is-dragging");
  });
  tbody.addEventListener("dragend", (e) => {
    e.target.closest("tr")?.classList.remove("is-dragging");
    dragId = null;
  });
  tbody.addEventListener("dragover", (e) => e.preventDefault());
  tbody.addEventListener("drop", async (e) => {
    e.preventDefault();
    const tr = e.target.closest("tr");
    if (!tr || !tr.dataset.id || tr.dataset.id === dragId) return;
    const ordered = [...tbody.querySelectorAll("tr[data-id]")].map((r) => r.dataset.id);
    const fromIdx = ordered.indexOf(dragId);
    const toIdx = ordered.indexOf(tr.dataset.id);
    ordered.splice(fromIdx, 1);
    ordered.splice(toIdx, 0, dragId);
    try {
      await reorderSections(ordered);
      toast("Orden actualizado");
      renderSections(outlet);
    } catch (err) {
      toast("Error: " + err.message, "error");
    }
  });

  // Acciones en filas (editar / eliminar). Usamos data-section-edit/delete
  // para no colisionar con view-categories que tiene listeners al mismo outlet.
  tbody.addEventListener("click", async (e) => {
    const editBtn = e.target.closest("[data-section-edit]");
    if (editBtn) {
      e.preventDefault();
      const sec = sections.find((s) => s.id === editBtn.dataset.sectionEdit);
      openSectionEditor(sec, sections, () => renderSections(outlet));
      return;
    }
    const delBtn = e.target.closest("[data-section-delete]");
    if (delBtn) {
      e.preventDefault();
      const id = delBtn.dataset.sectionDelete;
      const sec = sections.find((s) => s.id === id);
      if (!sec) return;
      const cats = catBySection[id] || 0;
      const prods = productBySection[id] || 0;
      let msg = `¿Eliminar la sección "${sec.name}"?`;
      if (cats > 0) {
        msg += `\n\n⚠ Hay ${cats} categoría${cats === 1 ? "" : "s"} con ${prods} producto${prods === 1 ? "" : "s"} dentro. Quedarán huérfanas pero no se borran.`;
      }
      const ok = await confirmDialog({
        title: "Eliminar sección",
        message: msg,
        confirmText: "Eliminar",
        danger: true,
      });
      if (!ok) return;
      try {
        if (sec.coverImage?.path) {
          try { await deleteStorageObject(sec.coverImage.path); } catch {}
        }
        await deleteSectionDoc(id);
        toast("Sección eliminada");
        renderSections(outlet);
      } catch (err) {
        toast("Error al eliminar: " + err.message, "error");
      }
    }
  });
}

// Convierte rutas relativas históricas como "./men.webp" en absolutas "/men.webp"
// para que se resuelvan bien desde el admin (/admin/) y desde la home (/).
function resolveCoverUrl(url) {
  if (!url) return "";
  if (url.startsWith("./")) return url.slice(1); // "./men.webp" → "/men.webp"
  return url;
}

function row(s, catCounts, prodCounts) {
  const cats = catCounts[s.id] || 0;
  const prods = prodCounts[s.id] || 0;
  const cover = resolveCoverUrl(s.coverImage?.url);
  return `
    <tr data-id="${s.id}" draggable="true">
      <td>
        ${cover
          ? `<img class="table-thumb" src="${escapeHtml(cover)}" alt="">`
          : `<div class="table-thumb-empty">sin foto</div>`}
      </td>
      <td>
        <a href="#" data-section-edit="${s.id}" style="font-weight:600;">${escapeHtml(s.name)}</a>
        ${s.description ? `<div style="font-size:12px; color:var(--text-mute); margin-top:2px;">${escapeHtml(s.description)}</div>` : ""}
      </td>
      <td><code style="background:rgba(255,255,255,0.06); padding:2px 6px; border-radius:4px; font-size:12px;">${escapeHtml(s.id)}</code></td>
      <td>${cats}</td>
      <td>${prods}</td>
      <td>
        ${s.active
          ? `<span class="badge badge-success">Activa</span>`
          : `<span class="badge badge-warning">Oculta</span>`}
      </td>
      <td>${s.order ?? 0}</td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm" data-section-edit="${s.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-section-delete="${s.id}" style="color:var(--danger);">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </td>
    </tr>`;
}

function openSectionEditor(section, allSections, onSaved) {
  const isNew = !section;
  const sec = section || { id: "", name: "", description: "", coverImage: null, active: true, order: allSections.length };
  let coverImage = sec.coverImage;
  // Si el slug fue auto-generado en este modal, lo recordamos para regenerar al cambiar el nombre
  let slugWasAuto = isNew;

  const body = el("div");
  body.innerHTML = `
    <form id="section-form">
      <div class="form-grid">
        <div class="form-row full">
          <label>Nombre *</label>
          <input class="form-input" name="name" required value="${escapeHtml(sec.name)}" placeholder="Ej: Tecnología, Hogar, Niños..." />
        </div>
        <div class="form-row full">
          <label>Slug (ID de la sección)</label>
          <input class="form-input" name="slug" value="${escapeHtml(sec.id || "")}" placeholder="tecnologia" ${!isNew ? "readonly" : ""} />
          <span class="form-hint">${isNew ? "Auto-generado del nombre. Solo letras/números/guiones. No se puede cambiar después." : "Esta sección ya existe, el slug no puede modificarse."}</span>
        </div>
        <div class="form-row full">
          <label>Descripción</label>
          <textarea class="form-textarea" name="description" placeholder="Ej: Celulares, auriculares, accesorios...">${escapeHtml(sec.description || "")}</textarea>
          <span class="form-hint">Aparece debajo del nombre en la home.</span>
        </div>
        <div class="form-row">
          <label>Orden</label>
          <input class="form-input" type="number" min="0" step="1" name="order" value="${sec.order ?? 0}" />
        </div>
        <div class="form-row">
          <label class="form-toggle" style="margin-top:24px;">
            <input type="checkbox" name="active" ${sec.active ? "checked" : ""}>
            <span class="switch"></span>
            <span>Activa (se muestra en la tienda)</span>
          </label>
        </div>
        <div class="form-row full">
          <label>Imagen de portada</label>
          <div class="uploader" id="section-uploader">
            <p>${coverImage ? `<img src="${escapeHtml(resolveCoverUrl(coverImage.url))}" style="max-width:200px; max-height:160px; border-radius:8px;">` : "<strong>Hacé click</strong> para elegir una imagen"}</p>
            <input type="file" id="section-file" accept="image/*" style="display:none;" />
          </div>
          <span class="form-hint">Se muestra como portada de la sección en la home. Recomendado 1200x900 px.</span>
        </div>
      </div>
    </form>
  `;

  const cancel = el("button", { class: "btn btn-secondary", type: "button", text: "Cancelar" });
  const save = el("button", { class: "btn btn-primary", type: "button", text: isNew ? "Crear sección" : "Guardar cambios" });

  const modal = openModal({
    title: isNew ? "Nueva sección" : "Editar sección",
    body,
    footer: [cancel, save],
  });

  // Auto-generar slug a partir del nombre (solo en nuevas)
  const nameInput = body.querySelector("[name=name]");
  const slugInput = body.querySelector("[name=slug]");
  nameInput.addEventListener("input", () => {
    if (slugWasAuto && isNew) slugInput.value = slugify(nameInput.value);
  });
  slugInput.addEventListener("input", () => {
    slugWasAuto = false; // si el usuario lo toca, dejamos de regenerar
    // Limpiar: solo letras/números/guiones
    slugInput.value = slugInput.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
  });

  cancel.onclick = () => modal.close();

  // Imagen
  body.querySelector("#section-uploader").onclick = () => body.querySelector("#section-file").click();
  body.querySelector("#section-file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const slug = slugInput.value.trim() || slugify(nameInput.value);
    if (!slug) {
      toast("Primero poné un nombre y slug", "error");
      return;
    }
    save.disabled = true;
    try {
      // Si la sección no existe aún, la creamos primero con datos mínimos
      if (isNew && !sec.id) {
        await setSectionWithId(slug, { name: nameInput.value || "Nueva", active: false, order: sec.order });
        sec.id = slug;
      }
      if (coverImage?.path) await deleteStorageObject(coverImage.path);
      // Reusamos uploadCategoryImage (mismo storage path /categories/{id}) renombrado
      coverImage = await uploadCategoryImage(slug, file);
      await updateSection(slug, { coverImage });
      body.querySelector("#section-uploader p").innerHTML = `<img src="${coverImage.url}" style="max-width:200px; max-height:160px; border-radius:8px;">`;
      toast("Imagen subida");
    } catch (err) {
      toast("Error subiendo imagen: " + err.message, "error");
    } finally {
      save.disabled = false;
    }
  };

  save.onclick = async () => {
    const f = body.querySelector("#section-form");
    const name = f.name.value.trim();
    const slug = slugInput.value.trim() || slugify(name);

    if (!name) { toast("El nombre es obligatorio", "error"); return; }
    if (!slug) { toast("El slug es obligatorio", "error"); return; }

    // Validar duplicados al crear una sección nueva:
    //   1. Slug no debe existir (es la key del doc).
    //   2. Nombre normalizado tampoco (case + tildes-insensitive) — para
    //      evitar 2 secciones "Tecnología" / "tecnologia" con slugs distintos.
    if (isNew) {
      if (allSections.some((s) => s.id === slug)) {
        toast(`Ya existe una sección con el slug "${slug}". Elegí otro.`, "error");
        return;
      }
      const norm = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      if (allSections.some((s) => String(s.name || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") === norm)) {
        toast(`Ya existe una sección con el nombre "${name}".`, "error");
        return;
      }
    } else {
      // Al editar, validar que el nombre nuevo no choque con OTRA sección
      const norm = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      const clash = allSections.find((s) =>
        s.id !== sec.id &&
        String(s.name || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "") === norm
      );
      if (clash) {
        toast(`Ya existe otra sección con el nombre "${name}".`, "error");
        return;
      }
    }

    const data = {
      name,
      description: f.description.value.trim(),
      order: parseInt(f.order.value, 10) || 0,
      active: f.active.checked,
      coverImage,
    };

    save.disabled = true;
    try {
      if (isNew) {
        await setSectionWithId(slug, data);
        toast("Sección creada");
      } else {
        await updateSection(sec.id, data);
        toast("Sección actualizada");
      }
      modal.close();
      onSaved?.();
    } catch (err) {
      toast("Error: " + err.message, "error");
      save.disabled = false;
    }
  };
}
