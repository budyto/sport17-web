// ─── SPORT17 · main.js ───────────────────────────────────────────────────────
// Tienda pública: carga productos y categorías desde Firestore (en vivo) y
// arma las grillas Hombres / Mujeres / Destacados. Mantiene el carrusel del
// hero, las galerías multi-imagen y el lightbox.

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore, collection, getDocs, query, where, orderBy, doc, getDoc,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, STORE_CONFIG } from "./admin/firebase-config.js";

// ═══════ Firebase ═══════
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ═══════ Refs DOM ═══════
const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");

const collectionTabs = [...document.querySelectorAll("[data-collection]")];
const collectionPanels = [...document.querySelectorAll("[data-panel]")];
const collectionRoots = {
  hombres: document.getElementById("hombres-grid"),
  mujeres: document.getElementById("mujeres-grid"),
};

// ═══════ Estado en memoria ═══════
let storeSettings = { hideOutOfStock: false, whatsapp: STORE_CONFIG.whatsappNumber, lowStock: STORE_CONFIG.lowStockThreshold };
const collectionData = { hombres: [], mujeres: [] };
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

async function loadCategoriesAndProducts() {
  // Categorías activas
  const catSnap = await getDocs(collection(db, "categories"));
  const categories = catSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c.active !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  // Productos activos
  const prodSnap = await getDocs(collection(db, "products"));
  const products = prodSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => p.active !== false)
    .filter((p) => !storeSettings.hideOutOfStock || (p.stock ?? 0) > 0);

  // Agrupar por sección padre y categoría
  const sections = { hombres: [], mujeres: [] };
  for (const cat of categories) {
    if (!sections[cat.parent]) continue;
    const items = products
      .filter((p) => p.categoryId === cat.id)
      .map(productToItem)
      .sort((a, b) => (a._order ?? 0) - (b._order ?? 0));
    if (items.length === 0) continue;
    sections[cat.parent].push({
      title: cat.name,
      description: cat.description || "",
      items,
    });
  }

  collectionData.hombres = sections.hombres;
  collectionData.mujeres = sections.mujeres;
  featuredProducts = products.filter((p) => p.featured).map(productToItem).slice(0, 8);
}

function productToItem(p) {
  const main = p.images?.find((i) => i.isMain) || p.images?.[0];
  const others = (p.images || []).filter((i) => i !== main);
  const allImgs = [main, ...others].filter(Boolean).map((i) => i.url);
  return {
    src: main?.url || "",
    images: allImgs.length > 1 ? allImgs : undefined,
    label: p.name,
    price: priceForDisplay(p.price),
    priceOld: priceForDisplay(p.priceOld),
    stock: p.stock ?? 0,
    outOfStock: (p.stock ?? 0) <= 0,
    _order: p.order ?? 0,
  };
}

// La home antes mostraba "$45.000" cuando el dato era 45 (en miles).
// Ahora guardamos el precio real en pesos: si parece que está en miles los
// dejamos como están; si parece grande (> 1000) lo mostramos tal cual.
function priceForDisplay(value) {
  if (value == null || value === "") return "";
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("es-AR");
}

// ═══════ Render ═══════

function renderItem(item) {
  const wspBase = storeSettings.whatsapp || STORE_CONFIG.whatsappNumber;
  const priceHTML = item.price
    ? `<p class="product-price">$${item.price}${item.priceOld ? ` <span style="color:#9ca3af; text-decoration:line-through; font-size:13px; margin-left:4px;">$${item.priceOld}</span>` : ""}</p>`
    : "";
  const stockBadge = item.outOfStock ? `<span class="product-badge product-badge-out">Sin stock</span>` : "";

  const wspLink = `https://wa.me/${wspBase}?text=Hola%20SPORT17%2C%20quiero%20m%C3%A1s%20info%20sobre%20${encodeURIComponent(item.label)}`;
  const imgs = item.images || (item.src ? [item.src] : []);
  const hasGallery = imgs.length > 1;

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
        ${stockBadge}
      </div>`;
  } else {
    mediaHtml = `
      <div class="product-single-media">
        <img src="${escapeHtml(imgs[0] || "")}" alt="${escapeHtml(item.label)}" loading="lazy" decoding="async" />
        ${stockBadge}
      </div>`;
  }

  const buttonAttrs = item.outOfStock ? `style="opacity: 0.6;" aria-disabled="true"` : "";
  const buttonLabel = item.outOfStock ? "Consultar reposición" : "Quiero más info";

  return `
    <article class="product-card ${item.outOfStock ? "is-out-of-stock" : ""}">
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
      <h2 class="section-intro-title">Destacados</h2>
      <p class="section-intro-text">Los favoritos del momento. Una selección curada de lo más buscado.</p>
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
  slide.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
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

function setActiveCollection(key) {
  collectionTabs.forEach((tab) => {
    const active = tab.dataset.collection === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });
  collectionPanels.forEach((panel) => {
    panel.style.display = panel.dataset.panel === key ? "grid" : "none";
  });
  renderCollection(key);
  if (collectionContainer) {
    collectionContainer.style.display = "block";
    collectionContainer.scrollIntoView({ behavior: "smooth", block: "start" });
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

collectionTabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveCollection(tab.dataset.collection));
});

document.querySelectorAll("[data-open-collection]").forEach((link) => {
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

// ═══════ Boot ═══════

(async () => {
  try {
    await loadStoreSettings();
    await loadCategoriesAndProducts();
    // pre-renderizar destacados en home
    renderFeatured();
    // si el usuario ya cambió a una tab antes de que carguen los datos, repintar
    collectionTabs.forEach((tab) => {
      if (tab.classList.contains("is-active")) {
        delete collectionRoots[tab.dataset.collection].dataset.rendered;
        renderCollection(tab.dataset.collection);
      }
    });
  } catch (err) {
    console.error("Error cargando productos:", err);
    // si Firestore falla, mostramos un mensaje suave
    Object.values(collectionRoots).forEach((root) => {
      if (!root) return;
      root.innerHTML = `<div style="padding:40px; text-align:center; color:rgba(255,255,255,0.7);">
        <p>Estamos actualizando el catálogo. Volvé en unos minutos o consultanos por WhatsApp.</p>
      </div>`;
    });
  }
})();
