// ─── Datos del seed inicial ──────────────────────────────────────────────────
// Replica los productos hardcodeados que estaban en main.js, agrupados por
// sección (hombres / mujeres) y categoría. Cada producto referencia las
// imágenes ya existentes en el repo (./masculino/, ./femenino/, ./perfumes/).

// Las URL absolutas se ajustan en runtime: como Firestore se llena desde el
// admin (que vive en /admin/), apuntamos a "../<carpeta>/<archivo>" para que
// las imágenes sean accesibles tanto desde el admin como desde la home pública.

export const SEED_CATEGORIES = [
  // Hombres
  { slug: "hombres-camisetas", name: "Camisetas", parent: "hombres", order: 10,
    description: "Las camisetas más buscadas: Argentina, Boca y más. Réplicas premium con tela de calidad y detalles impecables.",
    cover: "../secciones/hombre_camisetas.webp" },
  { slug: "hombres-camperas", name: "Camperas", parent: "hombres", order: 20,
    description: "Camperas y rompevientos importados para completar el outfit con estilo. Livianas, resistentes y con diseño urbano.",
    cover: "../secciones/hombre_camperas.webp" },
  { slug: "hombres-conjuntos", name: "Conjuntos", parent: "hombres", order: 30,
    description: "Conjuntos completos listos para usar. Los más pedidos de la temporada, con excelente terminación y telas premium.",
    cover: "../secciones/hombre_conjuntos.webp" },
  { slug: "hombres-pantalones", name: "Pantalones", parent: "hombres", order: 40,
    description: "Pantalones deportivos cómodos y versátiles. Perfectos solos o para combinar con cualquier campera o camiseta.",
    cover: "../secciones/hombre_pantalones.webp" },
  { slug: "hombres-zapatillas", name: "Zapatillas", parent: "hombres", order: 50,
    description: "Nike y Jordan importadas con toda la presencia. Las más buscadas del mercado con calidad y terminación de primer nivel.",
    cover: "../secciones/hombre_zapatillas.webp" },
  { slug: "hombres-perfumes", name: "Perfumes Hombres", parent: "hombres", order: 60,
    description: "Perfumes árabes importados de larga duración. Fragancias intensas y proyección potente para un cierre de look impecable.",
    cover: "../secciones/hombre_perfumes.webp" },

  // Mujeres
  { slug: "mujeres-buzos", name: "Buzos y Sweaters", parent: "mujeres", order: 110,
    description: "Abrigos suaves y cómodos con estética urbana. Ideales para el día a día con un toque de personalidad.",
    cover: "../secciones/mujer_buzos.webp" },
  { slug: "mujeres-camperas", name: "Camperas Mujer", parent: "mujeres", order: 120,
    description: "Camperas con personalidad y presencia. Animal print, denim y diseños deportivos para cualquier ocasión.",
    cover: "../secciones/mujer_camperas.webp" },
  { slug: "mujeres-conjuntos", name: "Conjuntos Mujer", parent: "mujeres", order: 130,
    description: "Sets completos listos para usar. Diseños únicos que combinan comodidad, color y estilo en un solo producto.",
    cover: "../secciones/mujer_conjuntos.webp" },
  { slug: "mujeres-perfumes", name: "Perfumes Mujeres", parent: "mujeres", order: 140,
    description: "Fragancias dulces, frescas y sofisticadas. Perfumes árabes importados de larga duración con proyección intensa.",
    cover: "../secciones/mujer_perfumes.webp" },
];

// price en pesos (multiplicado por 1000 porque main.js usaba miles)
const PRICE_MULT = 1000;

function img(...paths) {
  return paths.map((p) => ({ url: `../${p.replace(/^\.\//, "")}`, path: null, isMain: false }));
}
function single(path) {
  const arr = img(path);
  arr[0].isMain = true;
  return arr;
}
function gallery(paths) {
  const arr = img(...paths);
  if (arr[0]) arr[0].isMain = true;
  return arr;
}

export const SEED_PRODUCTS = [
  // ═══ Hombres › Camisetas ═══
  { categorySlug: "hombres-camisetas", name: "Camiseta Argentina Titular", price: 45 * PRICE_MULT, stock: 10, sizes: ["S","M","L","XL"], colors: ["Celeste y Blanco"], images: single("masculino/camiseta_futbol_argentina_titular.webp") },
  { categorySlug: "hombres-camisetas", name: "Camiseta Argentina Negra y Azul", price: 45 * PRICE_MULT, stock: 10, sizes: ["S","M","L","XL"], colors: ["Negra y Azul"], images: single("masculino/camiseta_futbol_argentina_negra_y_azul.webp") },
  { categorySlug: "hombres-camisetas", name: "Camiseta Argentina Titular Manga Larga", price: 45 * PRICE_MULT, stock: 8, sizes: ["S","M","L","XL"], images: single("masculino/camiseta_futbol_argentina_titular_manga_larga.webp") },
  { categorySlug: "hombres-camisetas", name: "Camiseta Boca Juniors Amarilla", price: 45 * PRICE_MULT, stock: 8, sizes: ["S","M","L","XL"], colors: ["Amarillo"], images: single("masculino/camiseta_futbol_boca_amarilla.webp") },

  // ═══ Hombres › Camperas ═══
  { categorySlug: "hombres-camperas", name: "Campera Deportiva Azul y Celeste", price: 75 * PRICE_MULT, stock: 6, sizes: ["M","L","XL"], colors: ["Azul y Celeste"], images: single("masculino/campera_deportiva_azul_y_celeste.webp") },
  { categorySlug: "hombres-camperas", name: "Campera Deportiva Blanca y Negra", price: 75 * PRICE_MULT, stock: 6, sizes: ["M","L","XL"], colors: ["Blanco y Negro"], images: single("masculino/campera_deportiva_blanca_y_negra.webp") },
  { categorySlug: "hombres-camperas", name: "Campera Deportiva Negra y Amarilla", price: 75 * PRICE_MULT, stock: 5, sizes: ["M","L","XL"], colors: ["Negro y Amarillo"], images: single("masculino/campera_deportiva_negra_y_amarilla.webp") },
  { categorySlug: "hombres-camperas", name: "Rompevientos Azul y Celeste", price: 70 * PRICE_MULT, stock: 4, sizes: ["M","L","XL"], colors: ["Azul y Celeste"], images: single("masculino/rompevientos_azul_y_celeste.webp") },

  // ═══ Hombres › Conjuntos ═══
  { categorySlug: "hombres-conjuntos", name: "Conjunto Argentina Azul", price: 120 * PRICE_MULT, stock: 5, sizes: ["S","M","L","XL"], colors: ["Azul"], featured: true, images: single("masculino/conjunto_deportivo_argentina_azul.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Argentina Negro", price: 120 * PRICE_MULT, stock: 5, sizes: ["S","M","L","XL"], colors: ["Negro"], featured: true, images: single("masculino/conjunto_deportivo_argentina_negro.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Argentina Gris", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], colors: ["Gris"], images: single("masculino/conjunto_deportivo_argentina_gris.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Argentina Blanco y Negro", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], colors: ["Blanco y Negro"], images: single("masculino/conjunto_deportivo_argentina_blanco_y_negro.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Deportivo Blanco y Gris", price: 80 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Blanco y Gris"], images: single("masculino/conjunto_deportivo_blanco_y_gris.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Deportivo Negro", price: 80 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Negro"], images: single("masculino/conjunto_deportivo_negro.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Deportivo Negro y Blanco", price: 80 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Negro y Blanco"], images: single("masculino/conjunto_deportivo_negro_y_blanco.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Deportivo Gris y Negro", price: 80 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Gris y Negro"], images: single("masculino/conjunto_deportivo_gris_y_negro.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Negro Rojo y Blanco", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_negro_rojo_blanco.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Gris Oscuro y Blanco", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_gris_oscuro_y_blanco.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Celeste y Azul", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_celeste_y_azul.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Azul y Naranja", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_azul_y_naranja.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Azul Amarillo y Rojo", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_azul_amarillo_rojo.webp") },
  { categorySlug: "hombres-conjuntos", name: "Conjunto Fútbol Rojo y Blanco", price: 120 * PRICE_MULT, stock: 4, sizes: ["S","M","L","XL"], images: single("masculino/conjunto_deportivo_futbol_rojo_y_blanco.webp") },

  // ═══ Hombres › Pantalones ═══
  { categorySlug: "hombres-pantalones", name: "Pantalón Deportivo Negro", price: 70 * PRICE_MULT, stock: 8, sizes: ["S","M","L","XL"], colors: ["Negro"], images: single("masculino/pantalon_deportivo_negro.webp") },
  { categorySlug: "hombres-pantalones", name: "Pantalón Deportivo Gris y Blanco", price: 70 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Gris y Blanco"], images: single("masculino/pantalon_deportivo_gris_y_blanco.webp") },
  { categorySlug: "hombres-pantalones", name: "Pantalón Deportivo Gris Bicolor", price: 70 * PRICE_MULT, stock: 6, sizes: ["S","M","L","XL"], colors: ["Gris bicolor"], images: single("masculino/pantalon_deportivo_gris_oscuro_y_claro.webp") },

  // ═══ Hombres › Zapatillas ═══
  { categorySlug: "hombres-zapatillas", name: "Nike Shox TL Negras", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], featured: true, images: single("masculino/nike_shox_tl_negras.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 4 Retro Black Cat", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], featured: true, images: single("masculino/air_jordan_4_retro_black_cat.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Air Max DN Negras", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_air_max_dn_negras.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 1 Mid Space Jam", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/air_jordan_1_mid_space_jam.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Shox TL Negras y Plata", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_shox_tl_negras_plata.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Air Max DN Negras y Verde", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], images: single("masculino/nike_air_max_dn_negras_verdes.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 1 Retro High OG Black Gold", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], images: single("masculino/air_jordan_1_retro_high_og_black_gold.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Shox TL Blancas", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_shox_tl_blancas.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Shox R4 Blancas y Plata", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_shox_r4_blancas_plata.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Shox R4 Blancas y Rojas", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_shox_r4_blancas_rojas.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 3 Retro White Cement", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], images: single("masculino/air_jordan_3_retro_white_cement_reimagined.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 1 Retro High OG Royal", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], images: single("masculino/air_jordan_1_retro_high_og_royal_reimagined.webp") },
  { categorySlug: "hombres-zapatillas", name: "Nike Shox R4 Plata y Negras", price: 120 * PRICE_MULT, stock: 3, sizes: ["40","41","42","43","44"], images: single("masculino/nike_shox_r4_plata_negras.webp") },
  { categorySlug: "hombres-zapatillas", name: "Air Jordan 1 Retro High OG Bred Patent", price: 120 * PRICE_MULT, stock: 2, sizes: ["40","41","42","43","44"], images: single("masculino/air_jordan_1_retro_high_og_bred_patent.webp") },

  // ═══ Hombres › Perfumes ═══
  { categorySlug: "hombres-perfumes", name: "Al Haramain Amber Oud Gold Edition", price: 120 * PRICE_MULT, stock: 4, images: single("perfumes/haramain_amber_oud_gold_edition.webp") },
  { categorySlug: "hombres-perfumes", name: "Armaf Club de Nuit Intense Man", price: 90 * PRICE_MULT, stock: 5, images: single("perfumes/armaf_club_de_nuit_intense_man.webp") },
  { categorySlug: "hombres-perfumes", name: "Armaf Club de Nuit Untold", price: 90 * PRICE_MULT, stock: 4, images: single("perfumes/armaf_club_de_nuit_untold.webp") },
  { categorySlug: "hombres-perfumes", name: "Armaf Island Bliss", price: 85 * PRICE_MULT, stock: 4, images: single("perfumes/armaf_island_bliss.webp") },
  { categorySlug: "hombres-perfumes", name: "Armaf Odyssey Aoud", price: 85 * PRICE_MULT, stock: 4, images: single("perfumes/armaf_odyssey_aoud.webp") },
  { categorySlug: "hombres-perfumes", name: "Armaf Odyssey Dubai Chocolat", price: 85 * PRICE_MULT, stock: 4, images: single("perfumes/armaf_odyssey_dubai_chocolat.webp") },
  { categorySlug: "hombres-perfumes", name: "Afnan 9PM", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/afnan_9pm.webp") },
  { categorySlug: "hombres-perfumes", name: "Lattafa Asad", price: 75 * PRICE_MULT, stock: 5, images: gallery(["perfumes/lattafa_asad.webp","perfumes/lattafa_asad_2.webp"]) },
  { categorySlug: "hombres-perfumes", name: "Lattafa Khamrah", price: 75 * PRICE_MULT, stock: 4, images: single("perfumes/lattafa_khamrah.webp") },

  // ═══ Mujeres › Buzos ═══
  { categorySlug: "mujeres-buzos", name: "Buzo y Top Deportivo Blanco y Negro", price: 50 * PRICE_MULT, stock: 4, sizes: ["S","M","L"], images: single("femenino/buzo_y_top_deportivo_blanco_y_negro.webp") },
  { categorySlug: "mujeres-buzos", name: "Sweater Tejido Celeste y Blanco", price: 50 * PRICE_MULT, stock: 4, sizes: ["S","M","L"], images: gallery([
    "femenino/sweater_tejido_celeste_y_blanco.webp",
    "femenino/sweater_tejido_celeste_y_blanco_2.webp",
    "femenino/sweater_tejido_celeste_y_blanco_espalda.webp",
  ]) },

  // ═══ Mujeres › Camperas ═══
  { categorySlug: "mujeres-camperas", name: "Campera Animal Print Leopardo", price: 65 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], featured: true, images: gallery([
    "femenino/campera_animal_print_leopardo.webp",
    "femenino/campera_animal_print_leopardo_2.webp",
    "femenino/campera_animal_print_leopardo_3.webp",
    "femenino/campera_animal_print_leopardo_4.webp",
    "femenino/campera_animal_print_leopardo_5.webp",
    "femenino/campera_animal_print_leopardo_6.webp",
  ]) },
  { categorySlug: "mujeres-camperas", name: "Campera Denim Azul", price: 75 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], featured: true, images: gallery([
    "femenino/campera_denim_azul.webp",
    "femenino/campera_denim_azul_2.webp",
    "femenino/campera_denim_azul_3.webp",
    "femenino/campera_denim_azul_4.webp",
    "femenino/campera_denim_azul_5.webp",
  ]) },
  { categorySlug: "mujeres-camperas", name: "Campera Deportiva Blanca y Rosa", price: 50 * PRICE_MULT, stock: 4, sizes: ["S","M","L"], images: single("femenino/campera_deportiva_blanca_y_rosa.webp") },
  { categorySlug: "mujeres-camperas", name: "Pack Camperas Deportivas — Colores Varios", price: 65 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], images: single("femenino/tres_camperas_deportivas_colores_varios.webp") },

  // ═══ Mujeres › Conjuntos ═══
  { categorySlug: "mujeres-conjuntos", name: "Conjunto Deportivo Naranja con Canguro", price: 65 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], images: single("femenino/conjunto_deportivo_naranja_canguro.webp") },
  { categorySlug: "mujeres-conjuntos", name: "Conjunto Animal Print Leopardo", price: 65 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], featured: true, images: single("femenino/conjunto_animal_print_leopardo.webp") },
  { categorySlug: "mujeres-conjuntos", name: "Conjunto Deportivo Verde con Canguro", price: 85 * PRICE_MULT, stock: 3, sizes: ["S","M","L"], images: single("femenino/conjunto_deportivo_verde_canguro.webp") },

  // ═══ Mujeres › Perfumes ═══
  { categorySlug: "mujeres-perfumes", name: "Lattafa Yara", price: 75 * PRICE_MULT, stock: 6, images: gallery([
    "perfumes/lattafa_yara.webp","perfumes/lattafa_yara_2.webp","perfumes/lattafa_yara_3.webp",
  ]) },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Yara Tous", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/lattafa_yara_tous.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Yara Moi", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/lattafa_yara_moi.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Mayar", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/lattafa_mayar.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Mayar Intense Cherry", price: 75 * PRICE_MULT, stock: 4, images: single("perfumes/lattafa_mayar_intense_cherry.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Her Confession", price: 85 * PRICE_MULT, stock: 4, images: single("perfumes/lattafa_her_confession.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Éclaire", price: 85 * PRICE_MULT, stock: 4, images: single("perfumes/lattafa_eclaire.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Fakhar Rose", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/lattafa_fakhar_rose.webp") },
  { categorySlug: "mujeres-perfumes", name: "Lattafa Ajwad", price: 75 * PRICE_MULT, stock: 5, images: single("perfumes/lattafa_ajwad.webp") },
];
