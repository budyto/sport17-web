// ─── Vista: Categorías ───────────────────────────────────────────────────────

import {
  fetchCategories,
  fetchProducts,
  fetchSections,
  ensureDefaultSections,
  createCategory,
  updateCategory,
  deleteCategoryDoc,
  reorderCategories,
} from "./data.js";
import { uploadCategoryImage, deleteStorageObject } from "./images.js";
import { escapeHtml, $, $$, el } from "./helpers.js";
import { toast, confirmDialog, openModal, loadingState } from "./ui.js";

export async function renderCategories(outlet) {
  outlet.innerHTML = loadingState("Cargando categorías...");
  await ensureDefaultSections();
  const [categories, products, sections] = await Promise.all([
    fetchCategories(), fetchProducts(), fetchSections(),
  ]);
  // Helper: resolver el nombre legible de la sección padre desde su slug.
  const sectionById = new Map(sections.map((s) => [s.id, s]));

  const counts = {};
  products.forEach((p) => { counts[p.categoryId] = (counts[p.categoryId] || 0) + 1; });

  outlet.innerHTML = `
    <div class="page-head">
      <div>
        <h2>Categorías</h2>
        <p style="color: var(--text-mute);">${categories.length} categoría${categories.length === 1 ? "" : "s"}. Arrastrá para reordenar.</p>
      </div>
      <div class="page-actions">
        <button class="btn btn-primary" id="new-cat-btn">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nueva categoría
        </button>
      </div>
    </div>

    <div class="table-wrap">
      <table class="table">
        <thead>
          <tr>
            <th style="width:60px;"></th>
            <th>Nombre</th>
            <th>Sección</th>
            <th>Productos</th>
            <th>Estado</th>
            <th>Orden</th>
            <th style="width:160px;"></th>
          </tr>
        </thead>
        <tbody id="cat-tbody">
          ${categories.length === 0 ? `
            <tr><td colspan="7"><div class="empty"><h3>Sin categorías</h3><p>Creá la primera para empezar a organizar productos.</p></div></td></tr>
          ` : categories.map((c) => row(c, counts, sectionById)).join("")}
        </tbody>
      </table>
    </div>
  `;

  $("#new-cat-btn").onclick = () => openCategoryEditor(null, sections, categories, () => renderCategories(outlet));

  // Hacer las filas reordenables con drag&drop
  const tbody = $("#cat-tbody");
  let dragId = null;
  tbody.querySelectorAll("tr[data-id]").forEach((tr) => tr.setAttribute("draggable", "true"));
  tbody.addEventListener("dragstart", (e) => {
    const tr = e.target.closest("tr");
    if (!tr) return;
    dragId = tr.dataset.id;
    tr.style.opacity = "0.4";
  });
  tbody.addEventListener("dragend", (e) => {
    const tr = e.target.closest("tr");
    if (tr) tr.style.opacity = "";
  });
  tbody.addEventListener("dragover", (e) => e.preventDefault());
  tbody.addEventListener("drop", async (e) => {
    e.preventDefault();
    const tr = e.target.closest("tr[data-id]");
    if (!tr || !dragId) return;
    const targetId = tr.dataset.id;
    if (targetId === dragId) return;

    const ids = [...tbody.querySelectorAll("tr[data-id]")].map((r) => r.dataset.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    ids.splice(from, 1);
    ids.splice(to, 0, dragId);

    // Reordenar visualmente
    ids.forEach((id) => tbody.appendChild(tbody.querySelector(`tr[data-id="${id}"]`)));
    try {
      await reorderCategories(ids);
      toast("Orden actualizado");
    } catch (err) {
      toast("No se pudo reordenar: " + err.message, "error");
    }
  });

  outlet.addEventListener("click", async (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) {
      const cat = categories.find((c) => c.id === edit.dataset.edit);
      openCategoryEditor(cat, sections, categories, () => renderCategories(outlet));
      return;
    }
    const del = e.target.closest("[data-delete]");
    if (del) {
      const cat = categories.find((c) => c.id === del.dataset.delete);
      const inUse = counts[cat.id] || 0;
      const ok = await confirmDialog({
        title: "Eliminar categoría",
        message: inUse
          ? `"${cat.name}" tiene ${inUse} producto${inUse === 1 ? "" : "s"} asignado${inUse === 1 ? "" : "s"}. Si la borrás esos productos quedan sin categoría. ¿Continuar?`
          : `¿Eliminar la categoría "${cat.name}"?`,
        confirmText: "Eliminar",
        danger: true,
      });
      if (!ok) return;
      try {
        if (cat.coverImage?.path) await deleteStorageObject(cat.coverImage.path);
        await deleteCategoryDoc(cat.id);
        toast("Categoría eliminada");
        renderCategories(outlet);
      } catch (err) {
        toast("No se pudo eliminar: " + err.message, "error");
      }
    }
    const toggle = e.target.closest("[data-toggle]");
    if (toggle) {
      const id = toggle.dataset.toggle;
      const cat = categories.find((c) => c.id === id);
      const next = !cat.active;
      try {
        await updateCategory(id, { active: next });
        cat.active = next;
        toast(next ? "Categoría activada" : "Categoría desactivada");
        renderCategories(outlet);
      } catch (err) {
        toast("No se pudo actualizar: " + err.message, "error");
      }
    }
  });
}

function row(c, counts, sectionById) {
  const count = counts[c.id] || 0;
  const sec = c.parent ? sectionById?.get(c.parent) : null;
  const parentLabel = sec ? sec.name : (c.parent || "");
  return `
    <tr data-id="${c.id}">
      <td>${c.coverImage?.url ? `<img class="table-thumb" src="${escapeHtml(c.coverImage.url)}" alt="">` : `<div class="table-thumb-empty">sin foto</div>`}</td>
      <td>
        <strong>${escapeHtml(c.name)}</strong>
        ${c.description ? `<div style="font-size:12px; color:var(--text-mute); margin-top:2px;">${escapeHtml(c.description.slice(0, 80))}${c.description.length > 80 ? "..." : ""}</div>` : ""}
      </td>
      <td>${parentLabel ? `<span class="badge badge-info">${escapeHtml(parentLabel)}</span>` : `<span style="color:var(--text-mute);">—</span>`}</td>
      <td>${count}</td>
      <td>
        <label class="form-toggle">
          <input type="checkbox" data-toggle="${c.id}" ${c.active ? "checked" : ""}>
          <span class="switch"></span>
        </label>
      </td>
      <td>${c.order ?? 0}</td>
      <td style="text-align:right;">
        <button class="btn btn-ghost btn-sm" data-edit="${c.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" data-delete="${c.id}" style="color:var(--danger);">Borrar</button>
      </td>
    </tr>`;
}

function openCategoryEditor(category, sections, allCategories, onSaved) {
  const isNew = !category;
  const cat = category || { name: "", description: "", parent: "", active: true, order: 0, coverImage: null };
  let coverImage = cat.coverImage;
  // Las secciones disponibles vienen de Firestore. Si no llegaron por algún
  // motivo, asumimos hombres/mujeres legacy para no bloquear el form.
  const sectionOptions = (sections && sections.length > 0)
    ? sections
    : [{ id: "hombres", name: "Hombres" }, { id: "mujeres", name: "Mujeres" }];

  const body = el("div");
  body.innerHTML = `
    <form id="cat-form">
      <div class="form-grid">
        <div class="form-row full">
          <label>Nombre *</label>
          <input class="form-input" name="name" required value="${escapeHtml(cat.name)}" />
        </div>
        <div class="form-row full">
          <label>Descripción</label>
          <textarea class="form-textarea" name="description">${escapeHtml(cat.description || "")}</textarea>
        </div>
        <div class="form-row">
          <label>Sección padre</label>
          <select class="form-select" name="parent">
            <option value="" ${!cat.parent ? "selected" : ""}>— Ninguna —</option>
            ${sectionOptions.map((s) => `
              <option value="${escapeHtml(s.id)}" ${cat.parent === s.id ? "selected" : ""}>${escapeHtml(s.name)}</option>
            `).join("")}
          </select>
          <span class="form-hint">Para mostrar en el tab correcto de la tienda. <a href="#/sections" style="color:var(--primary);">Gestionar secciones</a></span>
        </div>
        <div class="form-row">
          <label>Orden</label>
          <input class="form-input" type="number" min="0" step="1" name="order" value="${cat.order ?? 0}" />
        </div>
        <div class="form-row full">
          <label class="form-toggle">
            <input type="checkbox" name="active" ${cat.active ? "checked" : ""}>
            <span class="switch"></span>
            <span>Activa (se muestra en la tienda)</span>
          </label>
        </div>
        <div class="form-row full">
          <label>Imagen de portada</label>
          <div class="uploader" id="cat-uploader">
            <p>${coverImage ? `<img src="${escapeHtml(coverImage.url)}" style="max-width:160px; max-height:140px; border-radius:8px;">` : "<strong>Hacé click</strong> para elegir una imagen"}</p>
            <input type="file" id="cat-file" accept="image/*" style="display:none;" />
          </div>
        </div>
      </div>
    </form>
  `;

  const cancel = el("button", { class: "btn btn-secondary", type: "button", text: "Cancelar" });
  const save = el("button", { class: "btn btn-primary", type: "button", text: isNew ? "Crear categoría" : "Guardar cambios" });

  const modal = openModal({
    title: isNew ? "Nueva categoría" : "Editar categoría",
    body,
    footer: [cancel, save],
  });

  cancel.onclick = () => modal.close();

  body.querySelector("#cat-uploader").onclick = () => body.querySelector("#cat-file").click();
  body.querySelector("#cat-file").onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    save.disabled = true;
    try {
      // si la categoría no existe aún, la creamos primero
      let tempId = cat.id;
      if (!tempId) {
        tempId = await createCategory({ name: body.querySelector("[name=name]").value || "Nueva", active: false });
        cat.id = tempId;
      }
      // borrar imagen anterior si existía
      if (coverImage?.path) await deleteStorageObject(coverImage.path);
      coverImage = await uploadCategoryImage(tempId, file);
      await updateCategory(tempId, { coverImage });
      body.querySelector("#cat-uploader p").innerHTML = `<img src="${coverImage.url}" style="max-width:160px; max-height:140px; border-radius:8px;">`;
      toast("Imagen subida");
    } catch (err) {
      toast("Error subiendo imagen: " + err.message, "error");
    } finally {
      save.disabled = false;
    }
  };

  save.onclick = async () => {
    const f = body.querySelector("#cat-form");
    const name = f.name.value.trim();
    if (!name) { toast("El nombre es obligatorio", "error"); return; }

    // Validar que no exista otra categoría con el mismo nombre+sección padre.
    const parent = f.parent.value;
    const normName = name.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
    const duplicate = (allCategories || []).some((c) => {
      if (cat.id && c.id === cat.id) return false; // ignorar self al editar
      const cName = String(c.name || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
      return cName === normName && (c.parent || "") === (parent || "");
    });
    if (duplicate) {
      toast(
        parent
          ? `Ya existe la categoría "${name}" en esa sección.`
          : `Ya existe una categoría con ese nombre.`,
        "error"
      );
      return;
    }

    const data = {
      name,
      description: f.description.value.trim(),
      parent,
      order: parseInt(f.order.value, 10) || 0,
      active: f.active.checked,
      coverImage,
    };
    save.disabled = true;
    try {
      if (cat.id) await updateCategory(cat.id, data);
      else await createCategory(data);
      toast(isNew ? "Categoría creada" : "Categoría actualizada");
      modal.close();
      onSaved?.();
    } catch (err) {
      toast("Error: " + err.message, "error");
      save.disabled = false;
    }
  };
}
