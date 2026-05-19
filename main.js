// ─── SPORT17 · main.js ───────────────────────────────────────────────────────
// Tienda pública: carga productos y categorías desde Firestore (en vivo) y
// arma las grillas Hombres / Mujeres / Destacados. Mantiene el carrusel del
// hero, las galerías multi-imagen y el lightbox.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc,
  addDoc, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, STORE_CONFIG } from "./admin/firebase-config.js";

// ═══════ Firebase ═══════
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════ Refs DOM ═══════
const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");

// Estos tres se llenan dinámicamente cuando carguemos las secciones de Firestore.
// Antes eran arrays/objetos estáticos con "hombres" y "mujeres" hardcoded.
let collectionTabs = [];
let collectionPanels = [];
const collectionRoots = {};

// ═══════ Búsqueda en vivo ═══════
let searchQuery = "";
let activeCollectionKey = null;

// ═══════ Secciones (dinámicas desde Firestore) ═══════
let sectionsList = []; // [{ id, name, description, coverImage, active, order }]
let categoriesList = []; // [{ id, name, parent, order, active }] — necesarias para mega-menu y footer dividido
let productsLoaded = false; // true cuando ya terminamos de pedir productos a Firestore

// ═══════ Estado en memoria ═══════
let storeSettings = { hideOutOfStock: false, whatsapp: STORE_CONFIG.whatsappNumber, lowStock: STORE_CONFIG.lowStockThreshold };
const collectionData = {}; // { [sectionSlug]: [{ title, items }] }
let featuredProducts = [];

// ═══════ SVGs ═══════
const SVG_PREV = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const SVG_NEXT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const SVG_WSP  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.121 1.533 5.849L.057 23.428a.75.75 0 0 0 .907.93l5.733-1.502A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.86 0-3.607-.498-5.11-1.368l-.365-.215-3.81.998 1.016-3.712-.237-.381A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

// ═══════ Helpers ═══════
function escapeHtml(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function formatPrice(value) {
  if (value == null || value === "") return "";
  return `$${Number(value).toLocaleString("es-AR")}`;
}

// ═══════ Carga desde Firestore ═══════

async function loadStoreSettings() {
  try {
    const snap = await getDoc(doc(db, "settings", "store"));
    if (snap.exists()) {
      const data = snap.data();
      storeSettings = {
        hideOutOfStock: !!data.hideOutOfStock,
        whatsapp: data.whatsapp || STORE_CONFIG.whatsappNumber,
        lowStock: data.lowStock ?? STORE_CONFIG.lowStockThreshold,
        promoBanner: data.promoBanner || "",
      };
    }
  } catch (err) {
    console.warn("No se pudo cargar la configuración de la tienda", err);
  }
}

async function loadSections() {
  // Trae las secciones activas, ordenadas por `order`. Si no hay ninguna en la
  // BD usamos defaults para que la home no quede vacía si el admin todavía no
  // corrió la migración (ensureDefaultSections).
  try {
    const snap = await getDocs(collection(db, "sections"));
    sectionsList = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((s) => s.active !== false)
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  } catch (err) {
    console.warn("No se pudieron cargar secciones:", err);
    sectionsList = [];
  }
  if (sectionsList.length === 0) {
    sectionsList = [
      { id: "hombres", name: "Hombres", description: "Conjuntos · Camperas · Zapatillas · Perfumes", coverImage: { url: "./men.webp" }, order: 0 },
      { id: "mujeres", name: "Mujeres", description: "Conjuntos · Camperas · Buzos · Perfumes", coverImage: { url: "./women.webp" }, order: 1 },
    ];
  }
}

async function loadCategoriesAndProducts() {
  // Categorías activas
  const catSnap = await getDocs(collection(db, "categories"));
  const categories = catSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  categoriesList = categories; // exponer al scope global para mega-menu y footer

  // Productos activos
  const prodSnap = await getDocs(collection(db, "products"));
  const products = prodSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.active !== false)
    .filter((p) => !storeSettings.hideOutOfStock || (p.stock ?? 0) > 0);

  // Inicializar buckets para cada sección activa (sin esto, secciones nuevas
  // sin categorías quedarían sin entrada en collectionData).
  for (const s of sectionsList) {
    collectionData[s.id] = [];
  }

  // Agrupar por sección padre y categoría.
  // Orden de productos: del que menos stock tiene al que más (para incentivar
  // venta de los que se están por agotar). Los sin stock van al final para no
  // arruinar la primera impresión.
  for (const cat of categories) {
    if (!cat.parent || !collectionData[cat.parent]) continue;
    const items = products
      .filter((p) => p.categoryId === cat.id)
      .map(productToItem)
      .sort((a, b) => {
        const aOut = a.outOfStock ? 1 : 0;
        const bOut = b.outOfStock ? 1 : 0;
        if (aOut !== bOut) return aOut - bOut;          // sin stock al final
        if (!a.outOfStock && !b.outOfStock) {
          if (a.stock !== b.stock) return a.stock - b.stock; // menos stock primero
        }
        return (a._order ?? 0) - (b._order ?? 0);       // tie-breaker: orden manual
      });
    if (items.length === 0) continue;
    collectionData[cat.parent].push({
      title: cat.name,
      description: cat.description || "",
      items,
    });
  }

  featuredProducts = products.filter((p) => p.featured).map(productToItem).slice(0, 8);
  productsLoaded = true; // marca que los datos llegaron (aunque haya secciones vacías)
}

// Renderiza la grilla de selección de secciones, los paneles vacíos, el menú
// del header y los links del footer. Se llama después de loadSections().
function renderSectionsUI() {
  // Si la home declara estos contenedores, los llenamos. Si no, ignoramos.
  const grid = document.getElementById("sections-grid");
  const panelsRoot = document.getElementById("sections-panels");
  const nav = document.getElementById("nav");
  const footerLinks = document.getElementById("footer-links");

  // Secciones que tienen al menos un producto (para no mostrar vacías).
  // Si todavía no se cargaron datos (collectionData vacío), mostramos todas.
  const visibleSections = sectionsList.filter((s) => {
    const buckets = collectionData[s.id];
    if (!buckets) return true; // todavía no cargaron productos
    return buckets.length > 0;
  });

  if (grid) {
    grid.innerHTML = visibleSections.map((s) => {
      // resolveCoverUrl: convertir "./men.webp" en "/men.webp" si quedó así
      let img = s.coverImage?.url || "./hero.webp";
      if (img.startsWith("./")) img = img.slice(1); // "./men.webp" → "/men.webp"
      const desc = s.description || "";
      return `
        <div class="category-selection-card" data-collection="${escapeHtml(s.id)}">
          <img src="${escapeHtml(img)}" alt="Colección ${escapeHtml(s.name)}" loading="lazy" decoding="async" />
          <div class="category-overlay">
            <div class="category-overlay-content">
              <h2>${escapeHtml(s.name.toUpperCase())}</h2>
              ${desc ? `<p>${escapeHtml(desc)}</p>` : ""}
            </div>
          </div>
        </div>`;
    }).join("");
  }

  if (panelsRoot) {
    panelsRoot.innerHTML = sectionsList.map((s) => `
      <div class="collection-products" id="${escapeHtml(s.id)}-grid" data-panel="${escapeHtml(s.id)}" style="display: none;"></div>
    `).join("");
  }

  // Re-cachear las refs de tabs/paneles/roots (ahora viven en el DOM nuevo)
  collectionTabs = [...document.querySelectorAll("[data-collection]")];
  collectionPanels = [...document.querySelectorAll("[data-panel]")];
  for (const s of sectionsList) {
    collectionRoots[s.id] = document.getElementById(`${s.id}-grid`);
  }

  // Re-bindear el click de las cards (sin esto los handlers viejos no funcionan
  // con los nodos nuevos creados por innerHTML)
  collectionTabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveCollection(tab.dataset.collection, { scroll: true }));
  });

  // Menú del header: link por cada sección + mega-menu con categorías al hover.
  // Idempotente: limpiamos los previos antes de agregar (sin esto, en re-renders
  // el menú se duplicaría).
  if (nav) {
    nav.querySelectorAll('.site-nav-section').forEach((el) => el.remove());

    sectionsList.forEach((s) => {
      // Wrapper que contiene el link + el dropdown de categorías
      const wrap = document.createElement("div");
      wrap.className = "site-nav-section";

      const a = document.createElement("a");
      a.href = "#colecciones";
      a.className = "site-nav-section-link";
      a.dataset.openCollection = s.id;
      a.textContent = s.name;
      a.addEventListener("click", (e) => {
        e.preventDefault();
        setActiveCollection(s.id, { scroll: true });
        siteNav?.classList.remove("is-open");
        menuButton?.setAttribute("aria-expanded", "false");
      });
      wrap.appendChild(a);

      // Mega-menu con las categorías de esta sección (si tiene)
      const cats = categoriesList.filter((c) => c.parent === s.id);
      if (cats.length > 0) {
        const dd = document.createElement("div");
        dd.className = "site-nav-dropdown";
        dd.setAttribute("role", "menu");
        cats.forEach((c) => {
          const cl = document.createElement("a");
          cl.href = "#colecciones";
          cl.textContent = c.name;
          cl.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveCollection(s.id, { scroll: true });
            // Scroll hasta el grupo de la categoría dentro del catálogo
            setTimeout(() => {
              const root = collectionRoots[s.id];
              const heading = root?.querySelector(`.product-group-head h4`);
              const allHeadings = root?.querySelectorAll(".product-group-head h4") || [];
              for (const h of allHeadings) {
                if (h.textContent.trim().toLowerCase() === c.name.toLowerCase()) {
                  h.closest(".product-group")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  break;
                }
              }
            }, 300);
          });
          dd.appendChild(cl);
        });
        wrap.appendChild(dd);
      }

      nav.appendChild(wrap);
    });
  }

  // Footer: una columna por sección con sus categorías. Si una sección no
  // tiene categorías, la mostramos igual con un solo link "Ver todo".
  const footerColsRoot = document.getElementById("footer-sections-cols");
  if (footerColsRoot) {
    footerColsRoot.innerHTML = ""; // limpiar antes (idempotente)
    sectionsList.forEach((s) => {
      const cats = categoriesList.filter((c) => c.parent === s.id);
      const col = document.createElement("div");
      col.className = "footer-col";
      col.innerHTML = `
        <h3>${escapeHtml(s.name)}</h3>
        <ul></ul>
      `;
      const ul = col.querySelector("ul");
      if (cats.length === 0) {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = "#colecciones";
        a.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
          Ver todo
        `;
        a.addEventListener("click", (e) => {
          e.preventDefault();
          setActiveCollection(s.id, { scroll: true });
        });
        li.appendChild(a);
        ul.appendChild(li);
      } else {
        cats.forEach((c) => {
          const li = document.createElement("li");
          const a = document.createElement("a");
          a.href = "#colecciones";
          a.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            ${escapeHtml(c.name)}
          `;
          a.addEventListener("click", (e) => {
            e.preventDefault();
            setActiveCollection(s.id, { scroll: true });
            setTimeout(() => {
              const root = collectionRoots[s.id];
              const allHeadings = root?.querySelectorAll(".product-group-head h4") || [];
              for (const h of allHeadings) {
                if (h.textContent.trim().toLowerCase() === c.name.toLowerCase()) {
                  h.closest(".product-group")?.scrollIntoView({ behavior: "smooth", block: "start" });
                  break;
                }
              }
            }, 300);
          });
          li.appendChild(a);
          ul.appendChild(li);
        });
      }
      footerColsRoot.appendChild(col);
    });
  }
}

function productToItem(p) {
  const main = p.images?.find((i) => i.isMain) || p.images?.[0];
  const others = (p.images || []).filter((i) => i !== main);
  const allImgs = [main, ...others].filter(Boolean).map((i) => i.url);

  // Cálculo de descuento (normalizando precios que pudieron quedar en miles)
  const rawPrice = Number(p.price);
  const rawOld = Number(p.priceOld);
  const normPrice = Number.isFinite(rawPrice) && rawPrice > 0 && rawPrice < 1000 ? rawPrice * 1000 : rawPrice;
  const normOld = Number.isFinite(rawOld) && rawOld > 0 && rawOld < 1000 ? rawOld * 1000 : rawOld;
  const discountPct = (Number.isFinite(normOld) && Number.isFinite(normPrice) && normOld > normPrice)
    ? Math.round((1 - normPrice / normOld) * 100)
    : 0;

  // "Nuevo" si createdAt < 14 días
  let isNew = false;
  if (p.createdAt) {
    const created = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
    if (!Number.isNaN(created.getTime())) {
      isNew = (Date.now() - created.getTime()) < 14 * 24 * 60 * 60 * 1000;
    }
  }

  return {
    src: main?.url || "",
    images: allImgs.length > 1 ? allImgs : undefined,
    label: p.name,
    description: p.description || "",
    sizes: p.sizes || [],
    colors: p.colors || [],
    price: priceForDisplay(p.price),
    priceOld: priceForDisplay(p.priceOld),
    discountPct,
    isNew,
    stock: p.stock ?? 0,
    outOfStock: (p.stock ?? 0) <= 0,
    _order: p.order ?? 0,
  };
}

// Históricamente algunos precios se guardaron en miles (ej: 45 = $45.000) y
// otros en pesos exactos (ej: 45000 = $45.000). Si el valor es chico
// (< 1000 y entero), asumimos que está en miles y multiplicamos x1000 para
// mostrar bien al cliente, aunque el admin todavía no haya corrido la limpieza.
function priceForDisplay(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "";
  const normalized = n < 1000 ? n * 1000 : n;
  return normalized.toLocaleString("es-AR");
}

// ═══════ Render ═══════

function renderItem(item) {
  const wspBase = storeSettings.whatsapp || STORE_CONFIG.whatsappNumber;
  const priceHTML = item.price
    ? `<p class="product-price">$${item.price}${item.priceOld ? ` <span style="color:#9ca3af; text-decoration:line-through; font-size:13px; margin-left:4px;">$${item.priceOld}</span>` : ""}</p>`
    : "";
  // Mensaje pre-armado para WhatsApp con la info clave del producto.
  // El cliente ya llega con todo, no necesita escribir referencia.
  const msgParts = [`Hola SPORT17! Me interesa este producto:`];
  msgParts.push(`📦 *${item.label}*`);
  if (item.price) msgParts.push(`💰 $${item.price}${item.priceOld ? ` (antes $${item.priceOld})` : ""}`);
  if (item.sizes?.length) msgParts.push(`📏 Talles: ${item.sizes.join(", ")}`);
  if (item.colors?.length) msgParts.push(`🎨 Colores: ${item.colors.join(", ")}`);
  msgParts.push(`\n¿Tenés disponibilidad?`);
  const personalizedMsg = encodeURIComponent(msgParts.join("\n"));
  // Badge de stock + badges comerciales (descuento + nuevo + low stock)
  const stockBadge = item.outOfStock ? `<span class="product-badge product-badge-out">Sin stock</span>` : "";
  // Stock urgente: "¡ÚLTIMO!" cuando queda 1, "¡Quedan X!" cuando hay 2-3.
  let lowStockBadge = "";
  if (!item.outOfStock && item.stock > 0 && item.stock <= 3) {
    if (item.stock === 1) {
      lowStockBadge = `<span class="product-badge product-badge-last">¡ÚLTIMO!</span>`;
    } else {
      lowStockBadge = `<span class="product-badge product-badge-low">¡Quedan ${item.stock}!</span>`;
    }
  }
  const discountBadge = item.discountPct > 0
    ? `<span class="product-badge product-badge-discount">-${item.discountPct}%</span>`
    : "";
  const newBadge = item.isNew && !item.outOfStock
    ? `<span class="product-badge product-badge-new">NUEVO</span>`
    : "";
  // Texto buscable: lo metemos en data-search para filtrar sin tocar el DOM
  const searchText = [item.label, item.description, ...(item.sizes || []), ...(item.colors || [])].join(" ").toLowerCase();

  const wspLink = `https://wa.me/${wspBase}?text=${personalizedMsg}`;
  const imgs = item.images || (item.src ? [item.src] : []);
  const hasGallery = imgs.length > 1;

  const shareBtn = `<button class="product-share-btn" type="button" data-share data-label="${escapeHtml(item.label)}" data-img="${escapeHtml(imgs[0] || "")}" aria-label="Compartir ${escapeHtml(item.label)}">
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="11.49"/>
    </svg>
  </button>`;

  let mediaHtml;
  if (hasGallery) {
    const dotsHtml = imgs.map((_, i) =>
      `<button class="pgal-dot${i === 0 ? " is-active" : ""}" type="button" aria-label="Foto ${i + 1}"></button>`
    ).join("");
    const imgsHtml = imgs.map((src, i) =>
      `<img src="${escapeHtml(src)}" alt="${escapeHtml(item.label)} — foto ${i + 1}" loading="lazy" decoding="async" />`
    ).join("");
    mediaHtml = `
      <div class="product-gallery" data-gallery>
        <div class="product-gallery-track">${imgsHtml}</div>
        <button class="pgal-btn pgal-prev" type="button" aria-label="Foto anterior">${SVG_PREV}</button>
        <button class="pgal-btn pgal-next" type="button" aria-label="Foto siguiente">${SVG_NEXT}</button>
        <div class="pgal-dots">${dotsHtml}</div>
        <div class="product-badges">${stockBadge}${lowStockBadge}${discountBadge}${newBadge}</div>
        ${shareBtn}
      </div>`;
  } else {
    mediaHtml = `
      <div class="product-single-media">
        <img src="${escapeHtml(imgs[0] || "")}" alt="${escapeHtml(item.label)}" loading="lazy" decoding="async" />
        <div class="product-badges">${stockBadge}${lowStockBadge}${discountBadge}${newBadge}</div>
        ${shareBtn}
      </div>`;
  }

  const buttonAttrs = item.outOfStock ? `style="opacity: 0.6;" aria-disabled="true"` : "";
  const buttonLabel = item.outOfStock ? "Consultar reposición" : "Quiero más info";

  return `
    <article class="product-card ${item.outOfStock ? "is-out-of-stock" : ""}" data-search="${escapeHtml(searchText)}">
      ${mediaHtml}
      <div class="product-card-body">
        <strong>${escapeHtml(item.label)}</strong>
        ${priceHTML}
        <a href="${wspLink}" target="_blank" rel="noreferrer" ${buttonAttrs}
           class="button button-small button-secondary whatsapp-card-btn">
          ${SVG_WSP} ${buttonLabel}
        </a>
      </div>
    </article>`;
}

function renderGroup(group) {
  const cards = group.items.map(renderItem).join("");
  return `
    <section class="product-group">
      <div class="product-group-head">
        <h4>${escapeHtml(group.title)}</h4>
        <p>${escapeHtml(group.description)}</p>
      </div>
      <div class="product-rail">${cards}</div>
    </section>`;
}

function matchesSearch(item, q) {
  if (!q) return true;
  const haystack = [
    item.label || "",
    item.description || "",
    (item.sizes || []).join(" "),
    (item.colors || []).join(" "),
  ].join(" ").toLowerCase();
  return haystack.includes(q);
}

// Renderiza TODA la colección una sola vez (sin filtrar). El filtro de búsqueda
// se aplica después con CSS para no tocar el DOM y no romper el scroll.
function renderCollection(key) {
  const root = collectionRoots[key];
  if (!root) return;
  const groups = collectionData[key] || [];

  if (groups.length === 0) {
    root.innerHTML = `<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.6);">Pronto vas a ver productos acá.</div>`;
  } else {
    root.innerHTML = groups.map(renderGroup).join("");
  }
  root.dataset.rendered = "true";

  // Aplicar el filtro de búsqueda actual (si hay) sin destruir nada
  applySearchFilterToDom();
}

// Filtro por CSS: marca como .is-hidden las cards que no matchean y oculta
// los grupos completos que quedan vacíos. Preserva el scroll porque no toca
// el orden ni la cantidad de nodos del DOM (solo classList).
function applySearchFilterToDom() {
  const q = searchQuery.trim().toLowerCase();
  const countEl = document.getElementById("search-count");

  // Recorrer ambos roots porque el usuario puede tener uno visible
  let totalMatches = 0;
  let totalSearched = 0;

  Object.entries(collectionRoots).forEach(([key, root]) => {
    if (!root) return;
    const cards = root.querySelectorAll(".product-card[data-search]");
    const groups = root.querySelectorAll(".product-group");

    cards.forEach((card) => {
      const text = card.dataset.search || "";
      const match = !q || text.includes(q);
      card.classList.toggle("is-hidden", !match);
      if (root === collectionRoots[activeCollectionKey]) {
        totalSearched++;
        if (match) totalMatches++;
      }
    });

    // Ocultar grupos enteros sin matches
    groups.forEach((g) => {
      const visible = g.querySelector(".product-card:not(.is-hidden)");
      g.classList.toggle("is-hidden", !visible);
    });
  });

  // Mensaje "sin resultados" como overlay (no destructivo)
  const root = collectionRoots[activeCollectionKey];
  if (root) {
    let empty = root.querySelector(".search-empty");
    const hasGroups = (collectionData[activeCollectionKey] || []).length > 0;
    if (q && totalMatches === 0 && hasGroups) {
      if (!empty) {
        empty = document.createElement("div");
        empty.className = "search-empty";
        root.prepend(empty);
      }
      empty.innerHTML = `
        <p style="font-size:1.05rem; margin-bottom:8px;">Sin resultados para "<strong>${escapeHtml(q)}</strong>"</p>
        <p style="color:rgba(255,255,255,0.5); font-size:0.9rem;">Probá con otro nombre, talle o color.</p>
      `;
    } else if (empty) {
      empty.remove();
    }
  }

  // Contador
  if (countEl) {
    if (q) {
      countEl.textContent = totalMatches === 0
        ? "Sin resultados"
        : `${totalMatches} producto${totalMatches === 1 ? "" : "s"} encontrado${totalMatches === 1 ? "" : "s"}`;
    } else {
      countEl.textContent = "";
    }
  }
}

function renderSkeleton(key) {
  const root = collectionRoots[key];
  if (!root) return;
  const cards = Array.from({ length: 8 }, () => `
    <div class="skeleton-card">
      <div class="skeleton-img"></div>
      <div class="skeleton-body">
        <div class="skeleton-line"></div>
        <div class="skeleton-line short"></div>
        <div class="skeleton-line btn"></div>
      </div>
    </div>
  `).join("");
  root.innerHTML = `<div class="skeleton-grid">${cards}</div>`;
}

function renderFeatured() {
  if (featuredProducts.length === 0) return;
  const trustBar = document.querySelector(".trust-bar");
  const colecciones = document.getElementById("colecciones");
  if (!colecciones || !trustBar) return;

  // Reusar contenedor existente si ya está montado
  let featSection = document.getElementById("featured-section");
  if (!featSection) {
    featSection = document.createElement("section");
    featSection.id = "featured-section";
    featSection.className = "section featured-section";
    trustBar.insertAdjacentElement("afterend", featSection);
  }

  featSection.innerHTML = `
    <div class="section-intro">
      <h2 class="section-intro-title">Los más pedidos</h2>
      <p class="section-intro-text">Lo que más se mueve en SPORT17 esta temporada. Stock limitado y reposición constante: si te gusta uno, consultalo por WhatsApp antes de que vuele.</p>
    </div>
    <div class="product-rail featured-rail">${featuredProducts.map(renderItem).join("")}</div>
  `;
}

// ═══════ Carrusel del hero ═══════

const heroCarousel = document.querySelector("[data-carousel]");
const heroTrack = heroCarousel?.querySelector(".hero-carousel-track");
const heroSlides = heroCarousel ? [...heroCarousel.querySelectorAll(".hero-slide")] : [];
const heroDots = heroCarousel ? [...heroCarousel.querySelectorAll(".carousel-dot")] : [];
const heroPrev = heroCarousel?.querySelector(".carousel-button-prev");
const heroNext = heroCarousel?.querySelector(".carousel-button-next");

function scrollToSlide(index) {
  const slide = heroSlides[index];
  if (!heroTrack || !slide) return;
  // IMPORTANTE: usamos scrollTo del track horizontal y NO scrollIntoView,
  // porque scrollIntoView con block:"nearest" también scrollea la página
  // vertical para mostrar el hero, lo que tira al usuario hacia arriba cada
  // vez que el autoplay avanza el slide.
  heroTrack.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
  heroDots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
}

function currentSlideIndex() {
  if (!heroTrack || heroSlides.length === 0) return 0;
  const trackRect = heroTrack.getBoundingClientRect();
  const offset = heroTrack.scrollLeft + trackRect.width / 2;
  let bestIndex = 0;
  let bestDistance = Infinity;
  heroSlides.forEach((slide, index) => {
    const center = slide.offsetLeft + slide.offsetWidth / 2;
    const distance = Math.abs(center - offset);
    if (distance < bestDistance) {
      bestDistance = distance;
      bestIndex = index;
    }
  });
  return bestIndex;
}

// ═══════ Tabs colección ═══════

const collectionContainer = document.getElementById("collection-container");

function setActiveCollection(key, { scroll = true } = {}) {
  activeCollectionKey = key;
  collectionTabs.forEach((tab) => {
    const active = tab.dataset.collection === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  collectionPanels.forEach((panel) => {
    panel.style.display = panel.dataset.panel === key ? "grid" : "none";
  });

  // Mostrar skeleton SOLO si todavía estamos esperando datos de Firestore.
  // Si ya cargaron y esta sección no tiene productos, renderCollection mostrará
  // el mensaje "Pronto vas a ver productos acá".
  const hasData = (collectionData[key] || []).length > 0;
  if (!productsLoaded && !hasData) {
    renderSkeleton(key);
  } else {
    renderCollection(key);
  }
  if (collectionContainer) {
    collectionContainer.style.display = "block";
    // Solo scrolleamos al cambiar de colección por click directo, no por búsqueda.
    if (scroll) collectionContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ═══════ Wiring de eventos ═══════

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    siteNav?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
  });
});

// Los handlers de tabs y de [data-open-collection] se registran en
// renderSectionsUI() porque los nodos son dinámicos. Acá solo dejamos el
// soporte para "data-open-group" (deep link a un sub-riel específico) en
// caso de que algún elemento estático use el patrón viejo.
document.querySelectorAll("[data-open-collection]").forEach((link) => {
  // (este selector solo capta lo que esté en el HTML inicial)
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const collection = link.dataset.openCollection;
    const group = link.dataset.openGroup;
    setActiveCollection(collection);
    siteNav?.classList.remove("is-open");
    menuButton?.setAttribute("aria-expanded", "false");
    if (group) {
      setTimeout(() => {
        const allHeadings = document.querySelectorAll(".product-group-head h4");
        for (const heading of allHeadings) {
          if (heading.textContent.trim() === group) {
            heading.closest(".product-group")?.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
        }
      }, 350);
    }
  });
});

heroDots.forEach((dot) => dot.addEventListener("click", () => scrollToSlide(Number(dot.dataset.go || 0))));
heroPrev?.addEventListener("click", () => {
  const index = currentSlideIndex();
  scrollToSlide((index - 1 + heroSlides.length) % heroSlides.length);
});
heroNext?.addEventListener("click", () => {
  const index = currentSlideIndex();
  scrollToSlide((index + 1) % heroSlides.length);
});
heroTrack?.addEventListener("scroll", () => {
  const index = currentSlideIndex();
  heroDots.forEach((dot, dotIndex) => dot.classList.toggle("is-active", dotIndex === index));
});
scrollToSlide(0);

// ═══════ Galería multi-imagen ═══════

function getGalleryIndex(gallery) {
  const track = gallery.querySelector(".product-gallery-track");
  if (!track) return 0;
  const imgs = track.querySelectorAll("img");
  if (!imgs.length) return 0;
  const w = track.clientWidth || 1;
  return Math.round(track.scrollLeft / w);
}

function setGalleryIndex(gallery, index) {
  const track = gallery.querySelector(".product-gallery-track");
  const dots  = gallery.querySelectorAll(".pgal-dot");
  const imgs  = track ? track.querySelectorAll("img") : [];
  const count = imgs.length;
  if (!count) return;
  const i = ((index % count) + count) % count;
  if (track) track.scrollTo({ left: i * track.clientWidth, behavior: "smooth" });
  dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest(".pgal-btn");
  if (!btn) return;
  e.stopPropagation();
  const gallery = btn.closest("[data-gallery]");
  if (!gallery) return;
  const dir = btn.classList.contains("pgal-prev") ? -1 : 1;
  setGalleryIndex(gallery, getGalleryIndex(gallery) + dir);
});

document.addEventListener("click", (e) => {
  const dot = e.target.closest(".pgal-dot");
  if (!dot) return;
  e.stopPropagation();
  const gallery = dot.closest("[data-gallery]");
  if (!gallery) return;
  const dots = [...gallery.querySelectorAll(".pgal-dot")];
  setGalleryIndex(gallery, dots.indexOf(dot));
});

document.addEventListener("scroll", (e) => {
  const track = e.target;
  if (!track.classList?.contains("product-gallery-track")) return;
  const gallery = track.closest("[data-gallery]");
  if (!gallery) return;
  const imgs  = track.querySelectorAll("img");
  const dots  = gallery.querySelectorAll(".pgal-dot");
  const w = track.clientWidth || 1;
  const i = Math.round(track.scrollLeft / w);
  dots.forEach((d, di) => d.classList.toggle("is-active", di === i));
}, true);

// ═══════ Lightbox ═══════

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.querySelector(".lightbox-close");

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.classList.add("is-open");
}

document.addEventListener("click", (e) => {
  const img = e.target.closest(".product-card img, .product-gallery-track img");
  if (!img) return;
  openLightbox(img.src, img.alt);
});
lightboxClose?.addEventListener("click", (e) => { e.stopPropagation(); lightbox.classList.remove("is-open"); });
lightbox?.addEventListener("click", (e) => { if (e.target === lightbox) lightbox.classList.remove("is-open"); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") lightbox?.classList.remove("is-open"); });

// ═══════ Auto-play del hero (pausa al hover / focus / off-screen) ═══════

let heroAutoplay = null;
function startHeroAutoplay() {
  if (heroAutoplay || heroSlides.length < 2) return;
  heroAutoplay = setInterval(() => {
    if (document.hidden) return;
    const i = currentSlideIndex();
    scrollToSlide((i + 1) % heroSlides.length);
  }, 5500);
}
function stopHeroAutoplay() {
  if (heroAutoplay) { clearInterval(heroAutoplay); heroAutoplay = null; }
}

if (heroCarousel) {
  heroCarousel.addEventListener("mouseenter", stopHeroAutoplay);
  heroCarousel.addEventListener("mouseleave", startHeroAutoplay);
  heroCarousel.addEventListener("focusin", stopHeroAutoplay);
  heroCarousel.addEventListener("focusout", startHeroAutoplay);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stopHeroAutoplay();
    else startHeroAutoplay();
  });
  // Pausar el autoplay si el usuario interactúa con prev/next/dots
  [heroPrev, heroNext, ...heroDots].forEach((btn) => {
    btn?.addEventListener("click", () => {
      stopHeroAutoplay();
      setTimeout(startHeroAutoplay, 10000); // reanudar a los 10s
    });
  });
}

// ═══════ Buscador del header (estilo Tiendanube) ═══════

const searchInput = document.getElementById("search-input");
const searchClear = document.getElementById("search-clear");
const searchToggle = document.getElementById("header-search-toggle");
const headerSearch = document.getElementById("header-search");

// Cuenta resultados totales en ambas colecciones
function countMatchesIn(key, q) {
  const groups = collectionData[key] || [];
  return groups.reduce((acc, g) => acc + g.items.filter((it) => matchesSearch(it, q)).length, 0);
}

function applySearch(value) {
  searchQuery = value || "";
  if (searchClear) searchClear.hidden = !searchQuery;

  const q = searchQuery.trim().toLowerCase();

  // Si hay búsqueda y todavía no hay sección activa, abrir la que tenga más
  // matches entre todas las secciones cargadas. SIN scroll.
  if (q && !activeCollectionKey && sectionsList.length > 0) {
    const counts = sectionsList.map((s) => ({ id: s.id, count: countMatchesIn(s.id, q) }));
    counts.sort((a, b) => b.count - a.count);
    const winner = counts[0];
    if (winner && winner.count > 0) {
      setActiveCollection(winner.id, { scroll: false });
      return;
    }
  }

  // Filtro puro por CSS: no toca el DOM, no rompe el scroll.
  applySearchFilterToDom();
}

let searchTimer = null;
searchInput?.addEventListener("input", (e) => {
  clearTimeout(searchTimer);
  const v = e.target.value;
  searchTimer = setTimeout(() => applySearch(v), 120);
});
// Evitar que Enter envíe un submit nativo (que provocaría reload + scroll-to-top)
searchInput?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    applySearch(e.target.value);
    searchInput.blur(); // en mobile cierra el teclado
  }
});
searchClear?.addEventListener("click", () => {
  if (searchInput) searchInput.value = "";
  applySearch("");
  searchInput?.focus();
});

// Toggle mobile: abrir/cerrar el input expandible
searchToggle?.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = headerSearch?.classList.toggle("is-open");
  searchToggle.setAttribute("aria-expanded", String(!!isOpen));
  if (isOpen) {
    setTimeout(() => searchInput?.focus(), 50);
  }
});
// Cerrar el overlay mobile al tocar fuera
document.addEventListener("click", (e) => {
  if (!headerSearch?.classList.contains("is-open")) return;
  if (headerSearch.contains(e.target)) return;
  headerSearch.classList.remove("is-open");
  searchToggle?.setAttribute("aria-expanded", "false");
});
// Cerrar con Escape
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (headerSearch?.classList.contains("is-open")) {
    headerSearch.classList.remove("is-open");
    searchToggle?.setAttribute("aria-expanded", "false");
  }
});

// ═══════ Botón volver arriba ═══════

const backToTopBtn = document.getElementById("back-to-top");
if (backToTopBtn) {
  const toggleBackToTop = () => {
    const show = window.scrollY > 600;
    backToTopBtn.hidden = !show;
    backToTopBtn.classList.toggle("is-visible", show);
  };
  window.addEventListener("scroll", toggleBackToTop, { passive: true });
  backToTopBtn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  toggleBackToTop();
}

// ═══════ WhatsApp FAB: actualizar número desde settings ═══════

function syncWhatsappLinks() {
  const number = storeSettings.whatsapp || STORE_CONFIG.whatsappNumber;
  const text = encodeURIComponent("Hola SPORT17, quiero ver la colección");
  const url = `https://wa.me/${number}?text=${text}`;
  document.querySelectorAll(".whatsapp-fab, .whatsapp-pill, .footer-social-wsp, .footer-col-wsp").forEach((a) => {
    if (a.tagName === "A") a.href = url;
  });
}

// ═══════ Banner promocional dinámico ═══════

function renderPromoBanner() {
  const banner = document.getElementById("promo-banner");
  const text = document.getElementById("promo-banner-text");
  if (!banner || !text) return;
  const msg = (storeSettings.promoBanner || "").trim();
  // Si el usuario lo cerró, no mostrar de nuevo (en esta sesión)
  const dismissedKey = "sport17_promo_dismissed";
  const dismissed = sessionStorage.getItem(dismissedKey);
  if (!msg || dismissed === msg) {
    banner.hidden = true;
    return;
  }
  text.textContent = msg;
  banner.hidden = false;
  const closeBtn = banner.querySelector(".promo-banner-close");
  closeBtn?.addEventListener("click", () => {
    banner.hidden = true;
    sessionStorage.setItem(dismissedKey, msg);
  }, { once: true });
}

// ═══════ Compartir producto (Web Share API + copy fallback) ═══════

async function shareProduct(label, imgUrl) {
  const shareData = {
    title: `SPORT17 — ${label}`,
    text: `Mirá este producto de SPORT17: ${label}`,
    url: window.location.origin || "https://sport17.com.ar/",
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
  } catch (err) {
    if (err?.name === "AbortError") return; // usuario canceló
  }
  // Fallback: copiar URL + abrir WhatsApp con el mensaje
  try {
    await navigator.clipboard.writeText(`${shareData.text} — ${shareData.url}`);
    showToast("Link copiado al portapapeles");
  } catch {
    const wspBase = storeSettings.whatsapp || STORE_CONFIG.whatsappNumber;
    window.open(`https://wa.me/${wspBase}?text=${encodeURIComponent(shareData.text + " " + shareData.url)}`, "_blank");
  }
}

// Toast simple para feedback de share
function showToast(message) {
  let toast = document.getElementById("simple-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "simple-toast";
    toast.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%) translateY(20px);background:#05070b;color:#fff;padding:12px 20px;border-radius:12px;font-size:0.9rem;font-weight:600;border:1px solid rgba(255,255,255,0.12);box-shadow:0 10px 30px rgba(0,0,0,0.5);z-index:100;opacity:0;transition:opacity 220ms ease, transform 220ms ease;pointer-events:none;";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  requestAnimationFrame(() => {
    toast.style.opacity = "1";
    toast.style.transform = "translateX(-50%) translateY(0)";
  });
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(-50%) translateY(20px)";
  }, 2200);
}

document.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-share]");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  shareProduct(btn.dataset.label || "", btn.dataset.img || "");
});

// ═══════ Newsletter: captura de leads ═══════

const newsletterForm = document.getElementById("newsletter-form");
const newsletterEmail = document.getElementById("newsletter-email");
const newsletterSubmit = document.getElementById("newsletter-submit");
const newsletterFeedback = document.getElementById("newsletter-feedback");

function showNewsletterFeedback(message, type = "success") {
  if (!newsletterFeedback) return;
  newsletterFeedback.textContent = message;
  newsletterFeedback.className = "newsletter-feedback is-" + type;
  newsletterFeedback.hidden = false;
}

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

newsletterForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = (newsletterEmail?.value || "").trim();
  if (!email || !EMAIL_RE.test(email)) {
    showNewsletterFeedback("Ingresá un email válido.", "error");
    newsletterEmail?.focus();
    return;
  }

  // Anti doble-submit del mismo navegador (no es seguridad real, solo UX)
  const dismissedKey = "sport17_newsletter_dismissed";
  if (localStorage.getItem(dismissedKey) === email) {
    showNewsletterFeedback("¡Ya estás suscripto! Te avisamos cuando haya ofertas.", "success");
    return;
  }

  newsletterSubmit.disabled = true;
  const btnText = newsletterSubmit.querySelector(".newsletter-btn-text");
  const originalText = btnText?.textContent;
  if (btnText) btnText.textContent = "Enviando...";

  try {
    await addDoc(collection(db, "newsletter"), {
      email,
      source: "home_footer",
      createdAt: serverTimestamp(),
    });
    localStorage.setItem(dismissedKey, email);
    showNewsletterFeedback("¡Listo! Te vamos a avisar de las próximas ofertas.", "success");
    newsletterForm.reset();
  } catch (err) {
    console.error("Newsletter error:", err);
    showNewsletterFeedback("No pudimos guardar tu email. Probá de nuevo en un rato.", "error");
  } finally {
    newsletterSubmit.disabled = false;
    if (btnText && originalText) btnText.textContent = originalText;
  }
});

// ═══════ Boot ═══════

(async () => {
  try {
    // 1) Settings + secciones primero: necesitamos el menú/UI antes de pintar productos
    await loadStoreSettings();
    syncWhatsappLinks();
    renderPromoBanner();

    await loadSections();
    renderSectionsUI();

    // 2) Cargar productos y categorías
    await loadCategoriesAndProducts();
    renderFeatured();

    // Re-render para ocultar secciones vacías ahora que sabemos qué hay
    renderSectionsUI();

    // Si el usuario ya tocó alguna sección antes de que llegaran los datos, repintar
    if (activeCollectionKey) renderCollection(activeCollectionKey);

    // Si ninguna está activa pero hay datos, dejamos las cards de selección
    // listas para que el usuario elija

    // Iniciar autoplay del hero después de cargar
    startHeroAutoplay();
  } catch (err) {
    console.error("Error cargando productos:", err);
    Object.values(collectionRoots).forEach((root) => {
      if (!root) return;
      root.innerHTML = `<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.7);">
        <p>Estamos actualizando el catálogo. Volvé en unos minutos o consultanos por WhatsApp.</p>
      </div>`;
    });
    startHeroAutoplay();
  }
})();
