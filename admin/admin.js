// ─── Bootstrap del panel admin ───────────────────────────────────────────────

import { watchAuth, onAuth, login, logout, humanizeAuthError, sendPasswordReset } from "./modules/auth.js";
import { $, $$ } from "./modules/helpers.js";
import { toast } from "./modules/ui.js";
import { renderDashboard } from "./modules/view-dashboard.js";
import { renderProductList, renderProductForm } from "./modules/view-products.js";
import { renderCategories } from "./modules/view-categories.js";
import { renderSections } from "./modules/view-sections.js";
import { renderStock } from "./modules/view-stock.js";
import { renderImport } from "./modules/view-import.js";
import { renderSettings } from "./modules/view-settings.js";

// ═══ Router por hash ═══
const routes = [
  { match: /^#\/dashboard$/, title: "Dashboard", render: (outlet) => renderDashboard(outlet) },
  { match: /^#\/products$/, title: "Productos", render: (outlet) => renderProductList(outlet) },
  { match: /^#\/products\/new$/, title: "Nuevo producto", render: (outlet) => renderProductForm(outlet, "new") },
  { match: /^#\/products\/(.+)$/, title: "Editar producto", render: (outlet, id) => renderProductForm(outlet, id) },
  { match: /^#\/categories$/, title: "Categorías", render: (outlet) => renderCategories(outlet) },
  { match: /^#\/sections$/, title: "Secciones", render: (outlet) => renderSections(outlet) },
  { match: /^#\/stock$/, title: "Stock y precios", render: (outlet) => renderStock(outlet) },
  { match: /^#\/import$/, title: "Importar / Exportar", render: (outlet) => renderImport(outlet) },
  { match: /^#\/settings$/, title: "Configuración", render: (outlet) => renderSettings(outlet) },
];

function routeKey(hash) {
  if (hash.startsWith("#/products/") && hash !== "#/products/new") return "products";
  if (hash.startsWith("#/products")) return "products";
  if (hash.startsWith("#/sections")) return "sections";
  if (hash.startsWith("#/categories")) return "categories";
  if (hash.startsWith("#/stock")) return "stock";
  if (hash.startsWith("#/import")) return "import";
  if (hash.startsWith("#/settings")) return "settings";
  return "dashboard";
}

function navigate() {
  const hash = window.location.hash || "#/dashboard";
  let outlet = $("#route-outlet");
  if (!outlet) return;

  const match = routes.find((r) => r.match.test(hash));
  if (!match) {
    window.location.hash = "#/dashboard";
    return;
  }
  const m = hash.match(match.match);
  $("#page-title").textContent = match.title;

  // marcar nav activo
  const key = routeKey(hash);
  $$(".sidebar-nav a").forEach((a) => {
    a.classList.toggle("is-active", a.dataset.route === key);
  });

  // cerrar sidebar en mobile
  $("#sidebar")?.classList.remove("is-open");

  // CRÍTICO: reemplazar el outlet por un clon vacío para descartar todos los
  // event listeners que las vistas anteriores hayan registrado sobre él.
  // Sin esto, view-categories sigue capturando clicks de [data-edit] que
  // ahora pertenecen a view-sections u otras vistas. Cada vista debe registrar
  // sus listeners después de que su `render(outlet)` empiece.
  const fresh = outlet.cloneNode(false);
  outlet.parentNode.replaceChild(fresh, outlet);
  outlet = fresh;

  Promise.resolve(match.render(outlet, m[1])).catch((err) => {
    console.error(err);
    outlet.innerHTML = `<div class="alert alert-danger" style="margin: 20px;">Error: ${err.message}</div>`;
    toast(err.message, "error", 5000);
  });
}

// ═══ Auth flow ═══
function setupApp(user) {
  const loginScreen = $("#login-screen");
  const app = $("#app");

  if (!user) {
    loginScreen.hidden = false;
    app.hidden = true;
    return;
  }

  loginScreen.hidden = true;
  app.hidden = false;

  $("#user-email").textContent = user.email || "";
  $("#user-avatar").textContent = (user.email || "A").charAt(0).toUpperCase();

  if (!window.location.hash) window.location.hash = "#/dashboard";
  navigate();
}

window.addEventListener("hashchange", navigate);

// (El scrub de query params sensibles vive inline en admin/index.html — se
//  ejecuta antes que cualquier módulo y no depende de que este archivo cargue.)

// ═══ Login form ═══
const loginForm = $("#login-form");
const loginError = $("#login-error");
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const fd = new FormData(loginForm);
  const submitBtn = loginForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<span class="spinner"></span> Ingresando...`;
  try {
    await login(fd.get("email"), fd.get("password"));
  } catch (err) {
    loginError.textContent = humanizeAuthError(err);
    loginError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Ingresar";
  }
});

// ═══ Olvidé mi contraseña ═══
$("#forgot-password")?.addEventListener("click", async (e) => {
  e.preventDefault();
  const emailInput = loginForm?.querySelector("input[name=email]");
  const email = (emailInput?.value || "").trim();
  if (!email) {
    loginError.textContent = "Escribí tu email arriba y volvé a tocar el link.";
    loginError.hidden = false;
    emailInput?.focus();
    return;
  }
  loginError.hidden = true;
  try {
    await sendPasswordReset(email);
    loginError.style.color = "var(--success, #16a34a)";
    loginError.textContent = "Te mandamos un email con el link para resetear la contraseña.";
    loginError.hidden = false;
  } catch (err) {
    loginError.style.color = "";
    loginError.textContent = humanizeAuthError(err);
    loginError.hidden = false;
  }
});

// ═══ Logout ═══
$("#logout-btn")?.addEventListener("click", async () => {
  try {
    await logout();
    toast("Sesión cerrada", "info");
    window.location.hash = "";
  } catch (err) {
    toast("Error al cerrar sesión: " + err.message, "error");
  }
});

// ═══ Mobile menu ═══
$("#topbar-menu")?.addEventListener("click", () => {
  $("#sidebar")?.classList.toggle("is-open");
});

// ═══ Boot ═══
onAuth(setupApp);
watchAuth();
