# SPORT17 Memory

## Proyecto

Tienda online para SPORT17 / Nico Web.

Objetivo: home moderna, comercial y profesional para vender ropa deportiva urbana
desde Instagram y WhatsApp.

## Stack

- HTML/CSS/JS vanilla (sin npm ni build) en la home publica.
- Admin con modulos ES + Firebase (Auth, Firestore, Storage).
- Firebase Hosting (proyecto: `sport17-a01f6`).

---

## Identidad visual

- Logo: `logo2.0.webp` (de `logo2.0.png` original).
- Estetica oscura con acentos azules y blancos.
- Mobile-first y responsive.
- WhatsApp: `+54 9 11 3663-4655`.

---

## Sesion 2026-05-18 — Secciones dinamicas, dashboard Tiendanube, UX

### Arquitectural: secciones dinamicas
Antes las secciones padre estaban hardcoded ("hombres" / "mujeres") en HTML
y JS. Ahora hay una coleccion `sections/{slug}` en Firestore con CRUD
completo desde el admin. Permite agregar Tecnologia, Hogar, lo que sea.

- `data.js`: `EMPTY_SECTION`, `fetchSections`, `setSectionWithId`,
  `updateSection`, `deleteSectionDoc`, `reorderSections`,
  `ensureDefaultSections` (migracion automatica de hombres/mujeres)
- `view-sections.js` (nuevo): vista admin con lista, drag-to-reorder,
  modal de editor con auto-slugify, upload de portada, validacion de
  duplicados (slug y nombre)
- `view-categories.js`: el selector "Seccion padre" ahora carga las
  secciones reales de Firestore + valida duplicados por nombre+parent
- `view-import.js`: el campo "Genero" del Excel resuelve a cualquier
  seccion (slug, nombre, prefijo, legacy "Hombre"/"Mujer")
- `firestore.rules`: regla para sections (read publico, write admin)
- Sidebar admin: nuevo item "Secciones" entre Productos y Categorias

### Home publica dinamica
- `main.js`: `loadSections()` + `renderSectionsUI()` arman desde JS el
  grid de seleccion, el menu del header y el footer
- Secciones sin productos se ocultan automaticamente de la home
- Mega-menu: hover sobre cada seccion del header dropdownea con sus
  categorias clickeables (en mobile las muestra indentadas)
- Footer reestructurado: 1 columna por seccion con sus categorias
  (link scrollea al grupo correspondiente en el catalogo)

### Dashboard estilo Tiendanube
Reescrito completo. Ya no es solo "X productos totales":

- **KPI cards grandes** (con icono y color):
  - Valor del inventario = sum(precio * stock)
  - Precio promedio
  - Ganancia potencial = sum((precio-costo)*stock), o valor catalogo
  - Suscriptores del newsletter
- **Stats secundarias**: totales, secciones, sin stock, bajo stock,
  destacados, stock total
- **Distribucion por seccion** (barras horizontales):
  - Productos por seccion
  - Stock por seccion
  - Valor del inventario por seccion (formato moneda)
- **Top categorias** por cantidad de productos
- **Top productos** en 4 cards: mas caros, mas stock, stock bajo,
  destacados (cada uno con thumbnail y link al editor)
- **Alertas accionables** (renovadas): click abre modal con
  hero icon coloreado por tipo, 3 stats card, tabla completa con
  badges color-coded incluyendo "ULTIMO!"

### Form de productos: pickers visuales
- Talles como botones agrupados:
  - Ropa (XS, S, M, L, XL, XXL, XXXL)
  - Calzado (36 a 46)
  - Otros (Unico, Talle 1-4)
  - + input custom abajo
- Colores como swatches con dot del color real:
  - Paleta de 15 colores comunes con su hex
  - Agregar custom con name + `<input type="color">`
- Estado interno sigue siendo `string[]` (back-compat con BD)

### UX comercial pulido
- Badge `ULTIMO!` rojo con pulso fuerte cuando stock = 1
- Badge `Quedan X!` naranja para stock 2-3
- Productos ordenados por stock ascendente:
  menos stock primero (urgencia), sin stock al final
- Avatares de testimonios:
  - Cada uno con gradiente unico (M=naranja, J=azul, L=verde,
    S=rosa, N=violeta, C=cian)
  - Fix: `display: inline-flex` + `line-height:1` para centrar bien
    la letra en el circulo (grid no funcionaba en todos los browsers)

### Bugs criticos resueltos
- **Editor de seccion abria modal de "Nueva categoria"**: collisi'on
  de event listeners. `view-categories.js` deja un listener en el
  outlet del admin que persiste al navegar. Fix doble:
  1. Renombrar `data-edit`/`data-delete` a `data-section-edit/delete`
     en view-sections.js
  2. `admin.js` ahora clona el outlet en cada navegacion, descartando
     todos los listeners viejos
- **Skeleton infinito en secciones sin productos**: `setActiveCollection`
  mostraba skeleton para siempre. Fix: flag `productsLoaded` global
- **Portadas rotas en secciones default**: `ensureDefaultSections`
  guardaba `./men.webp` que desde `/admin/` se resuelve a
  `/admin/men.webp` (404). Fix: ruta absoluta `/men.webp`
- **Footer duplicaba links**: `renderSectionsUI` se llama 2 veces en
  el boot. Fix: limpiar nodos previos antes de poblar (idempotente)
- **Sintaxis error en view-import.js**: llave extra a fin de
  historyRow. Eliminada
- **Tonos del fondo "vibrando"** al escribir en la lupa del header:
  saco box-shadow pulsante; header pasa a 94% opacidad al focus

### Mejoras al Excel del cliente
Reescritura completa del exportFile con ExcelJS:
- Carga dinamica del CDN solo cuando el cliente exporta (~600KB)
- Replica EXACTAMENTE el formato del Sheets maestro del cliente:
  - 13 columnas (ID, Genero, Categoria, Nombre, Precio Anterior,
    Precio, Costo, Ganancia $, Ganancia %, Talles, Stock, Alerta,
    Notas)
  - Titulo mergeado A1:M1 con fondo #1A1A2E
  - Header fila 2 con fondo #16213E
  - Freeze A3 + autofilter
  - Formulas reales en Ganancia $ ($-precio-costo), Ganancia %
    (ganancia/costo) y Alerta Stock (IF stock=0 AGOTADO etc.)
  - Formato moneda y porcentaje
  - Precio (F) con texto azul sobre gris claro
  - Filas zebra para legibilidad
- 3 hojas: CATALOGO, RESUMEN (con COUNTIF/AVERAGEIFS/SUMIFS),
  GUIA DE USO

### Acciones del admin > Configuracion
- "Limpiar catalogo": detecta duplicados + precios <1000, muestra
  resumen, aplica en lotes seguros de 400 docs
- "Borrar productos sin imagen" (destructiva, doble confirm)
- "Suscriptores del newsletter" con export a CSV
- Banner promocional editable
- WhatsApp, umbral de bajo stock, ocultar sin stock

### Quick wins comerciales
- WhatsApp pre-armado por producto (nombre, precio, talles, colores)
- Badge `-X%` calculado si hay priceOld > price
- Badge `NUEVO` si createdAt < 14 dias
- Lupa en el header (estilo Tiendanube/MG): input desktop / overlay
  mobile expandible
- Testimonios en home (6 hardcoded, editables despues desde admin)
- Newsletter en el footer con captura de leads
- Boton flotante de WhatsApp con tooltip y pulso
- Boton "volver arriba" tras 600px de scroll
- Compartir producto (Web Share API + fallback portapapeles)
- Skeleton loading durante carga inicial
- Auto-play del hero (5.5s, pausa al hover/focus/tab inactivo)

### Bug critico de seguridad resuelto
Form de login admin sin `method`/`action` enviaba la contrasena en la
URL como query param si el JS aun no se habia bindeado (race condition
en modulos ES).
Fix:
- `method="post" action="javascript:void(0)"` en el form
- Script inline en `<head>` que borra params sensibles del historial
  antes de cualquier modulo ES (defense in depth)
- Link "Olvidaste tu contrasena?" con `sendPasswordResetEmail`

### SEO / PWA / Performance
- `robots.txt`, `sitemap.xml` (con imagenes), `manifest.webmanifest`
- Favicon + apple-touch-icon
- Preload del hero.webp (LCP) + preconnect a Firebase
- Headers de seguridad: X-Content-Type-Options, Referrer-Policy,
  X-Frame-Options, Permissions-Policy
- Content-Type explicito para manifest/sitemap/robots

### Deploy
- Firebase Hosting: `sport17-a01f6.web.app` (200 OK)
- Firebase rules: deployadas (sections + newsletter)
- GitHub: `origin/main` actualizado (commit df40d0d)

---

## Sesion 2026-05-15 — Mejoras integrales y bugs criticos

### 1. WhatsApp FAB flotante

- Boton circular verde con pulso, siempre visible en la esquina inferior derecha.
- Tooltip "Te ayudamos?" al hover (desktop).
- Numero leido de `settings.whatsapp` en Firestore o fallback a `STORE_CONFIG.whatsappNumber`.

### 2. Banner promocional dinamico

- Banner azul gradient animado arriba de todo el sitio.
- Texto leido de `settings.promoBanner` en Firestore.
- Editable desde admin > Configuracion > "Texto del banner promocional".
- Se puede cerrar (X). Queda dismissed por sesion via `sessionStorage`.

### 3. Lupa en el header (estilo Tiendanube/MG)

- Input de busqueda integrado en el header (no inline en el catalogo).
- Desktop: input visible siempre, al lado del logo.
- Mobile: icono lupa que abre un overlay full-width al tocarlo.
- Cierra con click fuera o tecla Escape.
- IDs: `#header-search`, `#header-search-toggle`, `#search-input`, `#search-clear`.

### 4. Buscador con filtro CSS (no destruye el DOM)

**Bug original**: al buscar, la pagina se acortaba drasticamente y el browser
tiraba al usuario al top.

**Solucion**: ahora se pintan TODAS las cards una sola vez con un atributo
`data-search="texto buscable"`. El filtro solo agrega/quita la clase `.is-hidden`
con CSS. El DOM no se destruye → el scroll del usuario se preserva.

- Funcion: `applySearchFilterToDom()` en `main.js`.
- Si el usuario busca sin haber elegido coleccion, se abre la que tiene mas
  matches (sin scroll).
- Tecla Enter en el input hace `preventDefault` + `blur()` (cierra el teclado
  mobile, no recarga la pagina).

### 5. Skeleton loading

- Mientras Firestore carga los productos, se muestra un grid de placeholders
  con animacion shimmer.
- Reemplaza la pantalla blanca durante la carga.

### 6. Auto-play del hero carousel

- Avanza solo cada 5.5 segundos.
- Pausa al hover/focus/tab inactivo (visibilitychange).
- Si el usuario toca prev/next/dots, se pausa y reanuda 10s despues.

**Bug critico arreglado**: el original usaba `slide.scrollIntoView({ block: "nearest" })`
que tambien scrollea verticalmente la pagina, tirando al usuario al hero cada vez
que avanzaba. Reemplazado por `heroTrack.scrollTo({ left: slide.offsetLeft })`
que solo afecta el scroll horizontal del track.

### 7. Boton volver arriba

- Aparece (fade-in) cuando el usuario scrollea mas de 600px.
- Click hace `window.scrollTo({ top: 0, behavior: "smooth" })`.

### 8. Compartir producto

- Boton compartir aparece al hover sobre cada card.
- Usa Web Share API nativo si esta disponible.
- Fallback: copia URL al portapapeles + abre WhatsApp con el mensaje.
- Toast custom de confirmacion ("Link copiado").

### 9. Badges comerciales en productos

- **Badge `-X%`** (gradient naranja-rojo) si `priceOld > price`.
  Calculado automaticamente: `(1 - price/priceOld) * 100`.
- **Badge `NUEVO`** (gradient azul) si `createdAt < 14 dias`.
- **Badge `Sin stock`** (rojo) si `stock <= 0`.
- Apilados verticalmente arriba a la izquierda, no se montan.

### 10. Normalizacion automatica de precios

Historicamente algunos precios se guardaron en miles (45) y otros en pesos exactos
(45000). Para no mostrar `$45` por mistake:

- `priceForDisplay()` en `main.js`: si valor < 1000, multiplica x1000 visualmente.
- `formatPrice()` y `formatPriceShort()` en `admin/modules/helpers.js`: igual.
- Esto es solo visual. La normalizacion definitiva en la BD se hace desde
  admin > Configuracion > Limpiar catalogo.

### 11. Performance / SEO / PWA

- **Preload** del `hero.webp` con `fetchpriority="high"` → mejora LCP.
- **Preconnect** a `firestore.googleapis.com` y `firebasestorage.googleapis.com`.
- **`robots.txt`** con sitemap y `Disallow: /admin/`.
- **`sitemap.xml`** con imagenes (`<image:image>` tags).
- **`manifest.webmanifest`** para instalar la PWA en mobile.
- **Favicon** y apple-touch-icon usando `logo2.0.webp`.

### 12. Headers de seguridad (`firebase.json`)

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: SAMEORIGIN`
- `Permissions-Policy: geolocation=(), microphone=(), camera=()`
- Content-Type explicito para `/manifest.webmanifest`, `/sitemap.xml`, `/robots.txt`.

### 13. Bug critico: contraseña admin en la URL

**Problema descubierto**: el `<form id="login-form">` del admin no tenia
`method` ni `action`. Como los modulos ES cargan async, si el usuario apretaba
Enter antes que `admin.js` registrara el `addEventListener`, el form se enviaba
nativamente por GET y la contraseña terminaba en la URL
(`admin/?email=...&password=...`). Quedaba en el historial del navegador y en
la sync de Chrome.

**Fix aplicado en `admin/index.html`**:
- `method="post" action="javascript:void(0)"` → nunca se envia por GET aunque
  el JS no haya cargado.
- Script inline en `<head>` que detecta y borra de la URL cualquier param
  sensible (`password`, `pass`, `pwd`, `email`, `token`, `secret`, `key`,
  `apikey`) usando `history.replaceState`. Se ejecuta antes que cualquier
  modulo, sin depender del bundle.

### 14. "¿Olvidaste tu contraseña?" en el admin

- Link discreto debajo del boton "Ingresar".
- Usa `sendPasswordResetEmail` de Firebase Auth.
- Pide que el usuario haya escrito su email arriba.
- Envia email con link de reset → no requiere acceso a Firebase Console.

### 15. SyntaxError en `view-import.js`

**Bug**: linea 313 tenia un `}` de mas que rompia el bundle entero del admin.
Sin admin.js corriendo, la pantalla del admin quedaba en blanco. **Fix**: se
elimino la llave extra.

### 16. Tonos del fondo "vibrando" al escribir en la lupa

**Causa**: dos cosas combinadas:
1. El `:focus-within` tenia `box-shadow` con `rgba(47,124,255,0.14)` y un
   cambio de `background` que pulsaba al focusear.
2. El header con `backdrop-filter: blur(18px)` mostraba cambios del contenido
   detras a traves del blur cada vez que el contenido cambiaba.

**Fix**:
- Se saco el `box-shadow` pulsante (solo cambia el color del borde).
- El header se vuelve mas opaco (`rgba(5,7,11,0.94)`) cuando el input esta
  focuseado usando el selector `.site-header:has(.header-search-field input:focus)`.

### 17. Limpieza de catalogo (admin > Configuracion)

Nuevo card **"Limpiar catalogo"**:

- **Analizar catalogo**: detecta productos duplicados (mismo nombre normalizado)
  y precios sospechosamente bajos (< 1000, que deberian estar en miles).
- Muestra resumen: cuantos duplicados, cuantos precios, primeros 20 grupos.
- **Aplicar limpieza** (con confirm dialog):
  - Conserva el "mejor" de cada grupo (mas imagenes > precio > descripcion > stock > fecha).
  - Borra los duplicados + sus imagenes del Storage.
  - Multiplica x1000 todos los `price` y `priceOld` que esten abajo de 1000.
  - Lotes seguros de 400 docs (limite Firestore: 500).

Nuevo card **"Acciones destructivas"**:

- **Borrar productos sin imagen**: listo cuantos son, primeros 10, doble
  confirmacion antes de aplicar. Lotes de 400.

### 18. Excel completo (admin > Importar / Exportar)

Reescrito el export para imitar el Sheets maestro del cliente. **21 columnas**:

1. ID (P001, P002... autogenerado si no hay `sku`)
2. Genero (Hombre / Mujer)
3. Categoria (en singular: Camiseta, Conjunto, Pantalon, etc.)
4. Nombre del Producto
5. **Colores** (separados por coma)
6. Talles Disponibles
7. Precio ($) — formato moneda `$45.000`
8. **Precio Anterior ($)** — formato moneda
9. **% Descuento** — calculado automaticamente
10. Costo ($) — formato moneda
11. Ganancia ($) — calculado
12. Ganancia (%) — calculado
13. Stock
14. Alerta Stock (OK / BAJO / AGOTADO)
15. **Imagen Principal** (URL)
16. Notas
17. **Creado** (DD/MM/YYYY HH:mm)
18. **Ultimo Cambio** (DD/MM/YYYY HH:mm)
19. Activo (Si / No)
20. Destacado (Si / No)
21. ID Firestore (no tocar, usado para matchear en imports)

Mejoras adicionales:
- Freeze pane en la primera fila.
- Autofiltro en todas las columnas.
- Ordenado por genero > categoria > nombre.
- Anchos de columna optimizados.
- Hoja secundaria **"AYUDA"** con descripcion de cada columna, valores validos
  y si es editable en import o no.

---

## Estructura del repo (relevante)

```
.
├── index.html                   # Home publica
├── main.js                      # Logica de la home (Firestore live)
├── styles.css                   # Estilos de la home
├── manifest.webmanifest         # PWA
├── robots.txt                   # SEO
├── sitemap.xml                  # SEO
├── firebase.json                # Hosting + headers + Firestore + Storage
├── firestore.rules
├── firestore.indexes.json
├── storage.rules
├── femenino/ masculino/ perfumes/ secciones/   # Imagenes legacy
├── admin/
│   ├── index.html
│   ├── admin.css
│   ├── admin.js                 # Router + bootstrap + scrub URL sensible
│   ├── firebase-config.js       # Credenciales + ADMIN_EMAILS
│   ├── firebase-init.js
│   └── modules/
│       ├── auth.js              # Login + sendPasswordReset
│       ├── data.js              # CRUD Firestore
│       ├── helpers.js           # formatPrice normalizado
│       ├── images.js            # Subida + optimizacion Storage
│       ├── seed.js, seed-data.js
│       ├── ui.js                # Toasts, modales, confirm
│       ├── view-dashboard.js
│       ├── view-products.js
│       ├── view-categories.js
│       ├── view-stock.js
│       ├── view-import.js       # Export con 21 cols + AYUDA
│       └── view-settings.js     # Limpiar catalogo + borrar sin imagen
```

---

## Modelo de datos (Firestore)

### `products/{id}`
```
{
  name, description, sku,
  price, priceOld, cost,
  stock, categoryId,
  sizes: [], colors: [],
  active, featured,
  images: [{ url, path, isMain }],
  order, createdAt, updatedAt
}
```

### `categories/{id}`
```
{
  name, description,
  coverImage: { url, path },
  active, order,
  parent: "hombres" | "mujeres",
  createdAt, updatedAt
}
```

### `settings/store`
```
{
  whatsapp, lowStock,
  hideOutOfStock,
  promoBanner,
  updatedAt
}
```

### `import-history/{id}` (para deshacer imports)
```
{
  source: "excel" | "sheets",
  fileName, userEmail,
  updated: [{ id, before: {...} }],
  created: [productId],
  createdAt
}
```

---

## Decisiones tomadas

- No usar imagenes externas para el contenido principal de la home.
- No mover ni renombrar archivos del proyecto.
- Priorizar rutas locales existentes para legacy.
- Mantener el sitio facil de editar.
- Renderizar TODOS los productos al cargar y filtrar via CSS (no destruir DOM).
- Normalizar precios visualmente (x1000 si <1000) sin tocar la BD (la limpieza
  formal se hace desde el admin).

---

## Pendientes / Por hacer

- Migrar imagenes legacy del repo a Firebase Storage (re-subir desde el panel).
- Conectar Google Analytics (`measurementId` ya esta en `firebase-config.js`).
- Conectar 2FA en Firebase Auth.
- Aplicar la limpieza de catalogo desde el admin para dejar la BD definitivamente
  normalizada.
- Subir las imagenes faltantes en los productos que estan "Sin foto".
- Afinar el hero para que se parezca mas a la referencia visual deseada.
- Completar enlaces reales de redes sociales si el cliente los pasa.

---

## Notas tecnicas

- El archivo `memory.md` funciona como registro vivo del proyecto.
- Cada vez que hagamos un cambio importante, conviene actualizar esta memoria.
- Los precios en la BD pueden estar en miles (45) o en pesos exactos (45000).
  El frontend normaliza visualmente. La limpieza formal se hace desde el admin.
- El admin solo es accesible para los emails listados en `ADMIN_EMAILS`
  (`admin/firebase-config.js`) y validados por las reglas de Firestore/Storage.
- El servidor local de desarrollo se levanta con:
  `python -c "from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler; ThreadingHTTPServer(('0.0.0.0', 5500), SimpleHTTPRequestHandler).serve_forever()"`
- `http.server` sin `ThreadingHTTPServer` se cuelga rapido (single-threaded).
