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
      description: "Futbol y streetwear para un look deportivo con identidad.",
      items: [
        { src: "./masculino/camiseta_futbol_argentina_titular.jpeg", label: "Camiseta Futbol Argentina Titular" },
        { src: "./masculino/camiseta_futbol_argentina_negra_y_azul.jpeg", label: "Camiseta Futbol Argentina Negra Y Azul" },
        { src: "./masculino/camiseta_futbol_argentina_titular_manga_larga.jpeg", label: "Camiseta Futbol Argentina Titular Manga Larga" },
        { src: "./masculino/camiseta_futbol_boca_amarilla.jpeg", label: "Camiseta Futbol Boca Amarilla" },
      ],
    },
    {
      title: "Camperas",
      description: "Capas livianas, urbanas y con presencia premium.",
      items: [
        { src: "./masculino/campera_deportiva_azul_y_celeste.jpeg", label: "Campera Deportiva Azul Y Celeste" },
        { src: "./masculino/campera_deportiva_blanca_y_negra.jpeg", label: "Campera Deportiva Blanca Y Negra" },
        { src: "./masculino/campera_deportiva_negra_y_amarilla.jpeg", label: "Campera Deportiva Negra Y Amarilla" },
        { src: "./masculino/rompevientos_azul_y_celeste.jpeg", label: "Rompevientos Azul Y Celeste" },
      ],
    },
    {
      title: "Conjuntos",
      description: "La categoria mas fuerte para vender por redes sociales.",
      items: [
        { src: "./masculino/conjunto_deportivo_argentina_azul.jpeg", label: "Conjunto Deportivo Argentina Azul" },
        { src: "./masculino/conjunto_deportivo_argentina_negro.jpeg", label: "Conjunto Deportivo Argentina Negro" },
        { src: "./masculino/conjunto_deportivo_argentina_gris.jpeg", label: "Conjunto Deportivo Argentina Gris" },
        { src: "./masculino/conjunto_deportivo_argentina_blanco_y_negro.jpeg", label: "Conjunto Deportivo Argentina Blanco Y Negro" },
        { src: "./masculino/conjunto_deportivo_blanco_y_gris.jpeg", label: "Conjunto Deportivo Blanco Y Gris" },
        { src: "./masculino/conjunto_deportivo_negro.jpeg", label: "Conjunto Deportivo Negro" },
        { src: "./masculino/conjunto_deportivo_negro_y_blanco.jpeg", label: "Conjunto Deportivo Negro Y Blanco" },
        { src: "./masculino/conjunto_deportivo_gris_y_negro.jpeg", label: "Conjunto Deportivo Gris Y Negro" },
        { src: "./masculino/conjunto_deportivo_futbol_negro_rojo_blanco.jpeg", label: "Conjunto Deportivo Futbol Negro Rojo Blanco" },
        { src: "./masculino/conjunto_deportivo_futbol_gris_oscuro_y_blanco.jpeg", label: "Conjunto Deportivo Futbol Gris Oscuro Y Blanco" },
        { src: "./masculino/conjunto_deportivo_futbol_celeste_y_azul.jpeg", label: "Conjunto Deportivo Futbol Celeste Y Azul" },
        { src: "./masculino/conjunto_deportivo_futbol_azul_y_naranja.jpeg", label: "Conjunto Deportivo Futbol Azul Y Naranja" },
        { src: "./masculino/conjunto_deportivo_futbol_azul_amarillo_rojo.jpeg", label: "Conjunto Deportivo Futbol Azul Amarillo Rojo" },
        { src: "./masculino/conjunto_deportivo_futbol_rojo_y_blanco.jpeg", label: "Conjunto Deportivo Futbol Rojo Y Blanco" },
      ],
    },
    {
      title: "Pantalones",
      description: "Bases comodas para completar cualquier outfit.",
      items: [
        { src: "./masculino/pantalon_deportivo_negro.jpeg", label: "Pantalon Deportivo Negro" },
        { src: "./masculino/pantalon_deportivo_gris_y_blanco.jpeg", label: "Pantalon Deportivo Gris Y Blanco" },
        { src: "./masculino/pantalon_deportivo_gris_oscuro_y_claro.jpeg", label: "Pantalon Deportivo Gris Oscuro Y Claro" },
      ],
    },
    {
      title: "Zapatillas",
      description: "Calzado urbano con una estetica limpia y deportiva.",
      items: [
        { src: "./masculino/zapatillas_deportivas_negras.jpeg", label: "Zapatillas Deportivas Negras" },
        { src: "./masculino/zapatillas_deportivas_negras_4.jpeg", label: "Zapatillas Deportivas Negras 4" },
        { src: "./masculino/zapatillas_deportivas_negras_5.jpeg", label: "Zapatillas Deportivas Negras 5" },
        { src: "./masculino/zapatillas_deportivas_negras_brillantes.jpeg", label: "Zapatillas Deportivas Negras Brillantes" },
        { src: "./masculino/zapatillas_deportivas_negras_y_gris.jpeg", label: "Zapatillas Deportivas Negras Y Gris" },
        { src: "./masculino/zapatillas_deportivas_negras_y_verde.jpeg", label: "Zapatillas Deportivas Negras Y Verde" },
        { src: "./masculino/zapatillas_deportivas_negro_y_dorado.jpeg", label: "Zapatillas Deportivas Negro Y Dorado" },
        { src: "./masculino/zapatillas_deportivas_blancas.jpeg", label: "Zapatillas Deportivas Blancas" },
        { src: "./masculino/zapatillas_deportivas_blancas_2.jpeg", label: "Zapatillas Deportivas Blancas 2" },
        { src: "./masculino/zapatillas_deportivas_blancas_3.jpeg", label: "Zapatillas Deportivas Blancas 3" },
        { src: "./masculino/zapatillas_deportivas_blancas_y_gris.jpeg", label: "Zapatillas Deportivas Blancas Y Gris" },
        { src: "./masculino/zapatillas_deportivas_azul_y_negro.jpeg", label: "Zapatillas Deportivas Azul Y Negro" },
        { src: "./masculino/zapatillas_deportivas_plata_y_negro.jpeg", label: "Zapatillas Deportivas Plata Y Negro" },
        { src: "./masculino/zapatillas_deportivas_rojo_y_negro.jpeg", label: "Zapatillas Deportivas Rojo Y Negro" },
      ],
    },
    {
      title: "Perfumes Hombres",
      description: "Fragancias intensas para cerrar el look SPORT17.",
      items: [
        { src: "./perfumes/haramain_amber_oud_gold_edition.jpeg", label: "Haramain Amber Oud Gold Edition" },
        { src: "./perfumes/armaf_club_de_nuit_intense_man.jpeg", label: "Armaf Club De Nuit Intense Man" },
        { src: "./perfumes/armaf_club_de_nuit_untold.jpeg", label: "Armaf Club De Nuit Untold" },
        { src: "./perfumes/armaf_island_bliss.jpeg", label: "Armaf Island Bliss" },
        { src: "./perfumes/armaf_odyssey_aoud.jpeg", label: "Armaf Odyssey Aoud" },
        { src: "./perfumes/armaf_odyssey_dubai_chocolat.jpeg", label: "Armaf Odyssey Dubai Chocolat" },
        { src: "./perfumes/afnan_9pm.jpeg", label: "Afnan 9PM" },
        { src: "./perfumes/lattafa_asad.jpeg", label: "Lattafa Asad" },
        { src: "./perfumes/lattafa_khamrah.jpeg", label: "Lattafa Khamrah" },
      ],
    },
  ],
  mujeres: [
    {
      title: "Buzos",
      description: "Abrigos suaves y comodas con estetica urbana.",
      items: [
        { src: "./femenino/buzo_y_top_deportivo_blanco_y_negro.jpeg", label: "Buzo y Top Deportivo Blanco y Negro" },
        { src: "./femenino/sweater_tejido_celeste_y_blanco.jpeg", label: "Sweater Tejido Celeste y Blanco" },
        { src: "./femenino/sweater_tejido_celeste_y_blanco_2.jpeg", label: "Sweater Tejido Celeste y Blanco 2" },
        { src: "./femenino/sweater_tejido_celeste_y_blanco_espalda.jpeg", label: "Sweater Tejido Celeste y Blanco Espalda" },
      ],
    },
    {
      title: "Camperas",
      description: "Piezas fuertes, con personalidad y muchos looks distintos.",
      items: [
        { src: "./femenino/campera_animal_print_leopardo.jpeg", label: "Campera Animal Print Leopardo" },
        { src: "./femenino/campera_animal_print_leopardo_2.jpeg", label: "Campera Animal Print Leopardo 2" },
        { src: "./femenino/campera_animal_print_leopardo_3.jpeg", label: "Campera Animal Print Leopardo 3" },
        { src: "./femenino/campera_animal_print_leopardo_4.jpeg", label: "Campera Animal Print Leopardo 4" },
        { src: "./femenino/campera_denim_azul.jpeg", label: "Campera Denim Azul" },
        { src: "./femenino/campera_denim_azul_2.jpeg", label: "Campera Denim Azul 2" },
        { src: "./femenino/campera_deportiva_blanca_y_rosa.jpeg", label: "Campera Deportiva Blanca y Rosa" },
        { src: "./femenino/tres_camperas_deportivas_colores_varios.jpeg", label: "Tres Camperas Deportivas Colores Varios" },
      ],
    },
    {
      title: "Conjuntos",
      description: "Sets completos pensados para vender desde Instagram y WhatsApp.",
      items: [
        { src: "./femenino/conjunto_deportivo_naranja_canguro.jpeg", label: "Conjunto Deportivo Naranja Canguro" },
        { src: "./femenino/conjunto_animal_print_leopardo.jpeg", label: "Conjunto Animal Print Leopardo" },
        { src: "./femenino/conjunto_deportivo_verde_canguro.jpeg", label: "Conjunto Deportivo Verde Canguro" },
      ],
    },
    {
      title: "Perfumes Mujeres",
      description: "Notas dulces, frescas y modernas para un cierre premium.",
      items: [
        { src: "./perfumes/lattafa_yara.jpeg", label: "Lattafa Yara" },
        { src: "./perfumes/lattafa_yara_tous.jpeg", label: "Lattafa Yara Tous" },
        { src: "./perfumes/lattafa_yara_moi.jpeg", label: "Lattafa Yara Moi" },
        { src: "./perfumes/lattafa_mayar.jpeg", label: "Lattafa Mayar" },
        { src: "./perfumes/lattafa_mayar_intense_cherry.jpeg", label: "Lattafa Mayar Intense Cherry" },
        { src: "./perfumes/lattafa_her_confession.jpeg", label: "Lattafa Her Confession" },
        { src: "./perfumes/lattafa_eclaire.jpeg", label: "Lattafa Eclaire" },
        { src: "./perfumes/lattafa_fakhar_rose.jpeg", label: "Lattafa Fakhar Rose" },
        { src: "./perfumes/lattafa_ajwad.jpeg", label: "Lattafa Ajwad" },
      ],
    },
  ],
};

function renderGroup(group) {
  const cards = group.items
    .map(
      (item) => `
        <article class="product-card">
          <img src="${item.src}" alt="${item.label}" loading="lazy" decoding="async" />
          <div class="product-card-body">
            <strong>${item.label}</strong>
            <a 
              href="https://wa.me/5491136634655?text=Hola%20SPORT17%2C%20quiero%20mas%20info%20sobre%20${encodeURIComponent(item.label)}" 
              target="_blank" 
              rel="noreferrer" 
              class="button button-small button-secondary whatsapp-card-btn">
              Quiero más info
            </a>
          </div>
        </article>`,
    )
    .join("");

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

// Lightbox logic
const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightbox-img');
const lightboxClose = document.querySelector('.lightbox-close');

document.addEventListener('click', (e) => {
  if (e.target.matches('.product-card img')) {
    lightboxImg.src = e.target.src;
    lightbox.classList.add('is-open');
  }
});

lightboxClose?.addEventListener('click', () => {
  lightbox.classList.remove('is-open');
});

lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) {
    lightbox.classList.remove('is-open');
  }
});
