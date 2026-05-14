// ─── UI helpers: toasts, modales, confirmaciones ─────────────────────────────

import { $, el, escapeHtml } from "./helpers.js";

export function toast(message, type = "success", duration = 3500) {
  const container = $("#toast-container");
  if (!container) return;
  const node = el("div", { class: `toast toast-${type}`, text: message });
  container.appendChild(node);
  setTimeout(() => {
    node.style.transition = "opacity 0.2s, transform 0.2s";
    node.style.opacity = "0";
    node.style.transform = "translateX(20px)";
    setTimeout(() => node.remove(), 220);
  }, duration);
}

export function openModal({ title, body, footer, onClose, size = "default" }) {
  const root = $("#modal-root");
  if (!root) return null;

  const closeFn = () => {
    root.hidden = true;
    root.innerHTML = "";
    document.body.style.overflow = "";
    onClose?.();
  };

  const modal = el("div", { class: `modal modal-${size}` });

  const head = el("div", { class: "modal-head" });
  head.appendChild(el("h2", { text: title }));
  head.appendChild(el("button", {
    class: "modal-close",
    type: "button",
    "aria-label": "Cerrar",
    onClick: closeFn,
    html: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
  }));

  const bodyEl = el("div", { class: "modal-body" });
  if (typeof body === "string") bodyEl.innerHTML = body;
  else if (body instanceof Node) bodyEl.appendChild(body);

  const footEl = el("div", { class: "modal-foot" });
  if (footer instanceof Node) footEl.appendChild(footer);
  else if (Array.isArray(footer)) footer.forEach((f) => footEl.appendChild(f));

  modal.appendChild(head);
  modal.appendChild(bodyEl);
  if (footer) modal.appendChild(footEl);

  root.innerHTML = "";
  root.appendChild(modal);
  root.hidden = false;
  document.body.style.overflow = "hidden";

  root.onclick = (e) => { if (e.target === root) closeFn(); };

  return { close: closeFn, bodyEl, footEl };
}

export function confirmDialog({ title, message, confirmText = "Confirmar", danger = false }) {
  return new Promise((resolve) => {
    const cancelBtn = el("button", { class: "btn btn-secondary", type: "button", text: "Cancelar" });
    const okBtn = el("button", {
      class: `btn ${danger ? "btn-danger" : "btn-primary"}`,
      type: "button",
      text: confirmText,
    });

    const modal = openModal({
      title,
      body: el("p", { text: message, style: "margin: 0; line-height: 1.5;" }),
      footer: [cancelBtn, okBtn],
    });

    cancelBtn.onclick = () => { modal.close(); resolve(false); };
    okBtn.onclick = () => { modal.close(); resolve(true); };
  });
}

export function loadingState(message = "Cargando...") {
  return `<div class="loading"><div class="spinner"></div><p>${escapeHtml(message)}</p></div>`;
}

export function emptyState({ title, message, action }) {
  return `
    <div class="empty">
      <h3>${escapeHtml(title || "Nada por acá")}</h3>
      <p>${escapeHtml(message || "")}</p>
      ${action || ""}
    </div>`;
}
