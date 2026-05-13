const menuButton = document.querySelector(".menu-button");
const siteNav = document.querySelector(".site-nav");

const collectionTabs = [...document.querySelectorAll("[data-collection]")];
const collectionPanels = [...document.querySelectorAll("[data-panel]")];
const collectionRoots = {
  hombres: document.getElementById("hombres-grid"),
  mujeres: document.getElementById("mujeres-grid"),
};

const collectionData = {
  hombres: [
    {
      title: "Camisetas",
      description: "Las camisetas más buscadas: Argentina, Boca y más. Réplicas premium con tela de calidad y detalles impecables.",
      items: [
        { src: "./masculino/camiseta_futbol_argentina_titular.webp", label: "Camiseta Argentina Titular", price: "45" },
        { src: "./masculino/camiseta_futbol_argentina_negra_y_azul.webp", label: "Camiseta Argentina Negra y Azul", price: "45" },
        { src: "./masculino/camiseta_futbol_argentina_titular_manga_larga.webp", label: "Camiseta Argentina Titular Manga Larga", price: "45" },
        { src: "./masculino/camiseta_futbol_boca_amarilla.webp", label: "Camiseta Boca Juniors Amarilla", price: "45" },
      ],
    },
    {
      title: "Camperas",
      description: "Camperas y rompevientos importados para completar el outfit con estilo. Livianas, resistentes y con diseño urbano.",
      items: [
        { src: "./masculino/campera_deportiva_azul_y_celeste.webp", label: "Campera Deportiva Azul y Celeste", price: "75" },
        { src: "./masculino/campera_deportiva_blanca_y_negra.webp", label: "Campera Deportiva Blanca y Negra", price: "75" },
        { src: "./masculino/campera_deportiva_negra_y_amarilla.webp", label: "Campera Deportiva Negra y Amarilla", price: "75" },
        { src: "./masculino/rompevientos_azul_y_celeste.webp", label: "Rompevientos Azul y Celeste", price: "70" },
      ],
    },
    {
      title: "Conjuntos",
      description: "Conjuntos completos listos para usar. Los más pedidos de la temporada, con excelente terminación y telas premium.",
      items: [
        { src: "./masculino/conjunto_deportivo_argentina_azul.webp", label: "Conjunto Argentina Azul", price: "120" },
        { src: "./masculino/conjunto_deportivo_argentina_negro.webp", label: "Conjunto Argentina Negro", price: "120" },
        { src: "./masculino/conjunto_deportivo_argentina_gris.webp", label: "Conjunto Argentina Gris", price: "120" },
        { src: "./masculino/conjunto_deportivo_argentina_blanco_y_negro.webp", label: "Conjunto Argentina Blanco y Negro", price: "120" },
        { src: "./masculino/conjunto_deportivo_blanco_y_gris.webp", label: "Conjunto Deportivo Blanco y Gris", price: "80" },
        { src: "./masculino/conjunto_deportivo_negro.webp", label: "Conjunto Deportivo Negro", price: "80" },
        { src: "./masculino/conjunto_deportivo_negro_y_blanco.webp", label: "Conjunto Deportivo Negro y Blanco", price: "80" },
        { src: "./masculino/conjunto_deportivo_gris_y_negro.webp", label: "Conjunto Deportivo Gris y Negro", price: "80" },
        { src: "./masculino/conjunto_deportivo_futbol_negro_rojo_blanco.webp", label: "Conjunto Fútbol Negro Rojo y Blanco", price: "120" },
        { src: "./masculino/conjunto_deportivo_futbol_gris_oscuro_y_blanco.webp", label: "Conjunto Fútbol Gris Oscuro y Blanco", price: "120" },
        { src: "./masculino/conjunto_deportivo_futbol_celeste_y_azul.webp", label: "Conjunto Fútbol Celeste y Azul", price: "120" },
        { src: "./masculino/conjunto_deportivo_futbol_azul_y_naranja.webp", label: "Conjunto Fútbol Azul y Naranja", price: "120" },
        { src: "./masculino/conjunto_deportivo_futbol_azul_amarillo_rojo.webp", label: "Conjunto Fútbol Azul Amarillo y Rojo", price: "120" },
        { src: "./masculino/conjunto_deportivo_futbol_rojo_y_blanco.webp", label: "Conjunto Fútbol Rojo y Blanco", price: "120" },
      ],
    },
    {
      title: "Pantalones",
      description: "Pantalones deportivos cómodos y versátiles. Perfectos solos o para combinar con cualquier campera o camiseta.",
      items: [
        { src: "./masculino/pantalon_deportivo_negro.webp", label: "Pantalón Deportivo Negro", price: "70" },
        { src: "./masculino/pantalon_deportivo_gris_y_blanco.webp", label: "Pantalón Deportivo Gris y Blanco", price: "70" },
        { src: "./masculino/pantalon_deportivo_gris_oscuro_y_claro.webp", label: "Pantalón Deportivo Gris Bicolor", price: "70" },
      ],
    },
    {
      title: "Zapatillas",
      description: "Nike y Jordan importadas con toda la presencia. Las más buscadas del mercado con calidad y terminación de primer nivel.",
      items: [
        { src: "./masculino/nike_shox_tl_negras.webp", label: "Nike Shox TL Negras", price: "120" },
        { src: "./masculino/air_jordan_4_retro_black_cat.webp", label: "Air Jordan 4 Retro Black Cat", price: "120" },
        { src: "./masculino/nike_air_max_dn_negras.webp", label: "Nike Air Max DN Negras", price: "120" },
        { src: "./masculino/air_jordan_1_mid_space_jam.webp", label: "Air Jordan 1 Mid Space Jam", price: "120" },
        { src: "./masculino/nike_shox_tl_negras_plata.webp", label: "Nike Shox TL Negras y Plata", price: "120" },
        { src: "./masculino/nike_air_max_dn_negras_verdes.webp", label: "Nike Air Max DN Negras y Verde", price: "120" },
        { src: "./masculino/air_jordan_1_retro_high_og_black_gold.webp", label: "Air Jordan 1 Retro High OG Black Gold", price: "120" },
        { src: "./masculino/nike_shox_tl_blancas.webp", label: "Nike Shox TL Blancas", price: "120" },
        { src: "./masculino/nike_shox_r4_blancas_plata.webp", label: "Nike Shox R4 Blancas y Plata", price: "120" },
        { src: "./masculino/nike_shox_r4_blancas_rojas.webp", label: "Nike Shox R4 Blancas y Rojas", price: "120" },
        { src: "./masculino/air_jordan_3_retro_white_cement_reimagined.webp", label: "Air Jordan 3 Retro White Cement", price: "120" },
        { src: "./masculino/air_jordan_1_retro_high_og_royal_reimagined.webp", label: "Air Jordan 1 Retro High OG Royal", price: "120" },
        { src: "./masculino/nike_shox_r4_plata_negras.webp", label: "Nike Shox R4 Plata y Negras", price: "120" },
        { src: "./masculino/air_jordan_1_retro_high_og_bred_patent.webp", label: "Air Jordan 1 Retro High OG Bred Patent", price: "120" },
      ],
    },
    {
      title: "Perfumes Hombres",
      description: "Perfumes árabes importados de larga duración. Fragancias intensas y proyección potente para un cierre de look impecable.",
      items: [
        { src: "./perfumes/haramain_amber_oud_gold_edition.webp", label: "Al Haramain Amber Oud Gold Edition", price: "120" },
        { src: "./perfumes/armaf_club_de_nuit_intense_man.webp", label: "Armaf Club de Nuit Intense Man", price: "90" },
        { src: "./perfumes/armaf_club_de_nuit_untold.webp", label: "Armaf Club de Nuit Untold", price: "90" },
        { src: "./perfumes/armaf_island_bliss.webp", label: "Armaf Island Bliss", price: "85" },
        { src: "./perfumes/armaf_odyssey_aoud.webp", label: "Armaf Odyssey Aoud", price: "85" },
        { src: "./perfumes/armaf_odyssey_dubai_chocolat.webp", label: "Armaf Odyssey Dubai Chocolat", price: "85" },
        { src: "./perfumes/afnan_9pm.webp", label: "Afnan 9PM", price: "75" },
        { images: ["./perfumes/lattafa_asad.webp", "./perfumes/lattafa_asad_2.webp"], label: "Lattafa Asad", price: "75" },
        { src: "./perfumes/lattafa_khamrah.webp", label: "Lattafa Khamrah", price: "75" },
      ],
    },
  ],
  mujeres: [
    {
      title: "Buzos y Sweaters",
      description: "Abrigos suaves y cómodos con estética urbana. Ideales para el día a día con un toque de personalidad.",
      items: [
        { src: "./femenino/buzo_y_top_deportivo_blanco_y_negro.webp", label: "Buzo y Top Deportivo Blanco y Negro", price: "50" },
        {
          images: [
            "./femenino/sweater_tejido_celeste_y_blanco.webp",
            "./femenino/sweater_tejido_celeste_y_blanco_2.webp",
            "./femenino/sweater_tejido_celeste_y_blanco_espalda.webp",
          ],
          label: "Sweater Tejido Celeste y Blanco", price: "50"
        },
      ],
    },
    {
      title: "Camperas",
      description: "Camperas con personalidad y presencia. Animal print, denim y diseños deportivos para cualquier ocasión.",
      items: [
        {
          images: [
            "./femenino/campera_animal_print_leopardo.webp",
            "./femenino/campera_animal_print_leopardo_2.webp",
            "./femenino/campera_animal_print_leopardo_3.webp",
            "./femenino/campera_animal_print_leopardo_4.webp",
            "./femenino/campera_animal_print_leopardo_5.webp",
            "./femenino/campera_animal_print_leopardo_6.webp",
          ],
          label: "Campera Animal Print Leopardo", price: "65"
        },
        {
          images: [
            "./femenino/campera_denim_azul.webp",
            "./femenino/campera_denim_azul_2.webp",
            "./femenino/campera_denim_azul_3.webp",
            "./femenino/campera_denim_azul_4.webp",
            "./femenino/campera_denim_azul_5.webp",
          ],
          label: "Campera Denim Azul", price: "75"
        },
        { src: "./femenino/campera_deportiva_blanca_y_rosa.webp", label: "Campera Deportiva Blanca y Rosa", price: "50" },
        { src: "./femenino/tres_camperas_deportivas_colores_varios.webp", label: "Pack Camperas Deportivas — Colores Varios", price: "65" },
      ],
    },
    {
      title: "Conjuntos",
      description: "Sets completos listos para usar. Diseños únicos que combinan comodidad, color y estilo en un solo producto.",
      items: [
        { src: "./femenino/conjunto_deportivo_naranja_canguro.webp", label: "Conjunto Deportivo Naranja con Canguro", price: "65" },
        { src: "./femenino/conjunto_animal_print_leopardo.webp", label: "Conjunto Animal Print Leopardo", price: "65" },
        { src: "./femenino/conjunto_deportivo_verde_canguro.webp", label: "Conjunto Deportivo Verde con Canguro", price: "85" },
      ],
    },
    {
      title: "Perfumes Mujeres",
      description: "Fragancias dulces, frescas y sofisticadas. Perfumes árabes importados de larga duración con proyección intensa.",
      items: [
        { images: ["./perfumes/lattafa_yara.webp", "./perfumes/lattafa_yara_2.webp", "./perfumes/lattafa_yara_3.webp"], label: "Lattafa Yara", price: "75" },
        { src: "./perfumes/lattafa_yara_tous.webp", label: "Lattafa Yara Tous", price: "75" },
        { src: "./perfumes/lattafa_yara_moi.webp", label: "Lattafa Yara Moi", price: "75" },
        { src: "./perfumes/lattafa_mayar.webp", label: "Lattafa Mayar", price: "75" },
        { src: "./perfumes/lattafa_mayar_intense_cherry.webp", label: "Lattafa Mayar Intense Cherry", price: "75" },
        { src: "./perfumes/lattafa_her_confession.webp", label: "Lattafa Her Confession", price: "85" },
        { src: "./perfumes/lattafa_eclaire.webp", label: "Lattafa Éclaire", price: "85" },
        { src: "./perfumes/lattafa_fakhar_rose.webp", label: "Lattafa Fakhar Rose", price: "75" },
        { src: "./perfumes/lattafa_ajwad.webp", label: "Lattafa Ajwad", price: "75" },
      ],
    },
  ],
};

const SVG_PREV = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
const SVG_NEXT = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
const SVG_WSP  = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.558 4.121 1.533 5.849L.057 23.428a.75.75 0 0 0 .907.93l5.733-1.502A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.86 0-3.607-.498-5.11-1.368l-.365-.215-3.81.998 1.016-3.712-.237-.381A9.945 9.945 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>`;

function renderItem(item) {
  const priceHTML = item.price ? `<p class="product-price">$${item.price}.000</p>` : "";
  const wspLink = `https://wa.me/5491136634655?text=Hola%20SPORT17%2C%20quiero%20m%C3%A1s%20info%20sobre%20${encodeURIComponent(item.label)}`;
  const imgs = item.images || (item.src ? [item.src] : []);
  const hasGallery = imgs.length > 1;

  let mediaHtml;
  if (hasGallery) {
    const dotsHtml = imgs.map((_, i) =>
      `<button class="pgal-dot${i === 0 ? " is-active" : ""}" type="button" aria-label="Foto ${i + 1}"></button>`
    ).join("");
    const imgsHtml = imgs.map((src, i) =>
      `<img src="${src}" alt="${item.label} — foto ${i + 1}" loading="lazy" decoding="async" />`
    ).join("");
    mediaHtml = `
      <div class="product-gallery" data-gallery>
        <div class="product-gallery-track">${imgsHtml}</div>
        <button class="pgal-btn pgal-prev" type="button" aria-label="Foto anterior">${SVG_PREV}</button>
        <button class="pgal-btn pgal-next" type="button" aria-label="Foto siguiente">${SVG_NEXT}</button>
        <div class="pgal-dots">${dotsHtml}</div>
      </div>`;
  } else {
    mediaHtml = `<img src="${imgs[0]}" alt="${item.label}" loading="lazy" decoding="async" />`;
  }

  return `
    <article class="product-card">
      ${mediaHtml}
      <div class="product-card-body">
        <strong>${item.label}</strong>
        ${priceHTML}
        <a href="${wspLink}" target="_blank" rel="noreferrer"
           class="button button-small button-secondary whatsapp-card-btn">
          ${SVG_WSP} Quiero más info
        </a>
      </div>
    </article>`;
}

function renderGroup(group) {
  const cards = group.items.map(renderItem).join("");
  return `
    <section class="product-group">
      <div class="product-group-head">
        <h4>${group.title}</h4>
        <p>${group.description}</p>
      </div>
      <div class="product-rail">${cards}</div>
    </section>`;
}

function renderCollection(key) {
  const root = collectionRoots[key];
  if (!root || root.dataset.rendered === "true") return;

  root.innerHTML = collectionData[key].map(renderGroup).join("");
  root.dataset.rendered = "true";
}

const collectionContainer = document.getElementById("collection-container");

function setActiveCollection(key) {
  collectionTabs.forEach((tab) => {
    const active = tab.dataset.collection === key;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-pressed", String(active));
  });

  collectionPanels.forEach((panel) => {
    if (panel.dataset.panel === key) {
      panel.style.display = "grid";
    } else {
      panel.style.display = "none";
    }
  });

  renderCollection(key);
  
  if (collectionContainer) {
    collectionContainer.style.display = "block";
    collectionContainer.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

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

if (menuButton && siteNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener("click", () => {
    if (siteNav) {
      siteNav.classList.remove("is-open");
    }
    if (menuButton) {
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
});

collectionTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    setActiveCollection(tab.dataset.collection);
  });
});

// Quick nav links: data-open-collection and optional data-open-group
document.querySelectorAll("[data-open-collection]").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    const collection = link.dataset.openCollection;
    const group = link.dataset.openGroup;

    setActiveCollection(collection);

    // Close mobile nav
    if (siteNav) siteNav.classList.remove("is-open");
    if (menuButton) menuButton.setAttribute("aria-expanded", "false");

    // If a specific group is requested, scroll to it after render
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

heroDots.forEach((dot) => {
  dot.addEventListener("click", () => {
    scrollToSlide(Number(dot.dataset.go || 0));
  });
});

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

// ─── Galería multi-imagen ───────────────────────────────────────────────────

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

// Prev / Next buttons (event delegation)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".pgal-btn");
  if (!btn) return;
  e.stopPropagation();
  const gallery = btn.closest("[data-gallery]");
  if (!gallery) return;
  const dir = btn.classList.contains("pgal-prev") ? -1 : 1;
  setGalleryIndex(gallery, getGalleryIndex(gallery) + dir);
});

// Dots (event delegation)
document.addEventListener("click", (e) => {
  const dot = e.target.closest(".pgal-dot");
  if (!dot) return;
  e.stopPropagation();
  const gallery = dot.closest("[data-gallery]");
  if (!gallery) return;
  const dots = [...gallery.querySelectorAll(".pgal-dot")];
  setGalleryIndex(gallery, dots.indexOf(dot));
});

// Sync dots on scroll
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

// ─── Lightbox ───────────────────────────────────────────────────────────────

const lightbox     = document.getElementById("lightbox");
const lightboxImg  = document.getElementById("lightbox-img");
const lightboxClose = document.querySelector(".lightbox-close");

function openLightbox(src, alt) {
  if (!lightbox || !lightboxImg) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt || "";
  lightbox.classList.add("is-open");
}

// Click on any product image (single or inside gallery)
document.addEventListener("click", (e) => {
  const img = e.target.closest(".product-card img, .product-gallery-track img");
  if (!img) return;
  // Don't open if user clicked a gallery button (already stopped)
  openLightbox(img.src, img.alt);
});

lightboxClose?.addEventListener("click", (e) => {
  e.stopPropagation();
  lightbox.classList.remove("is-open");
});

lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) lightbox.classList.remove("is-open");
});

// Close lightbox with Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") lightbox?.classList.remove("is-open");
});
