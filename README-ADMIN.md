# Panel admin SPORT17

Panel privado tipo Tiendanube para gestionar productos, categorías, stock, imágenes y precios sin tocar código. Conectado en tiempo real con la web pública.

## Stack

- **Frontend admin:** HTML/CSS/JS vanilla con módulos ES (sin npm ni build)
- **Backend:** Firebase
  - **Auth** (email + contraseña) para el login
  - **Firestore** para productos, categorías y configuración
  - **Storage** para imágenes optimizadas
- **Hosting:** Firebase Hosting (el proyecto ya está configurado: `sport17-a01f6`)

## Setup inicial (una sola vez)

### 1. Activar Firebase Auth, Firestore y Storage

1. Entrá a [console.firebase.google.com](https://console.firebase.google.com) → proyecto **sport17-a01f6**.
2. **Authentication** → "Comenzar" → habilitar **Email/contraseña** como método de inicio.
3. **Firestore Database** → "Crear base de datos" → modo producción → región `southamerica-east1` (São Paulo).
4. **Storage** → "Comenzar" → modo producción → misma región que Firestore.

### 2. Crear el usuario admin

En **Authentication › Users › Agregar usuario**, creá tu cuenta con un email + contraseña fuerte. Por defecto el sistema acepta:

- `admin@sport17.com.ar`

Si querés usar otro email, editá las dos listas blancas:

- [admin/firebase-config.js](admin/firebase-config.js) → `ADMIN_EMAILS`
- [firestore.rules](firestore.rules) → función `isAdmin()`
- [storage.rules](storage.rules) → función `isAdmin()`

### 3. Copiar las credenciales web

En **Configuración del proyecto › Tus apps**, agregá una "App web" si no existe. Copiá los valores de `firebaseConfig` y pegalos en [admin/firebase-config.js](admin/firebase-config.js):

```js
export const firebaseConfig = {
  apiKey: "...",
  authDomain: "sport17-a01f6.firebaseapp.com",
  projectId: "sport17-a01f6",
  storageBucket: "sport17-a01f6.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};
```

### 4. Desplegar reglas e índices

Con [Firebase CLI](https://firebase.google.com/docs/cli) instalado:

```bash
firebase login
firebase deploy --only firestore:rules,firestore:indexes,storage
```

### 5. Subir el sitio + admin

```bash
firebase deploy --only hosting
```

El panel queda accesible en:

- `https://sport17.com.ar/admin/` (o `https://sport17-a01f6.web.app/admin/`)

### 6. Cargar productos iniciales

Entrá al panel, andá a **Configuración › Importar productos iniciales**. Va a poblar Firestore con las categorías y productos que estaban hardcodeados en la web (no duplica si ya están).

> **Sobre imágenes del seed:** las imágenes apuntan a las rutas locales `../masculino/...`, `../femenino/...`, `../perfumes/...`. Funcionan al instante en producción porque esas carpetas se siguen desplegando junto al sitio. Para tener todo en Firebase Storage (recomendado a futuro), editá cada producto y re-subí las imágenes desde el panel.

## Estructura

```
.
├── index.html                # Sitio público
├── main.js                   # Lee productos en vivo desde Firestore
├── styles.css                # Estilos del sitio público
├── femenino/ masculino/ perfumes/ secciones/   # Imágenes legacy
│
├── admin/                    # Panel admin
│   ├── index.html
│   ├── admin.css
│   ├── admin.js              # Router + bootstrap
│   ├── firebase-config.js    # Credenciales (editar acá)
│   ├── firebase-init.js      # Inicialización Firebase CDN
│   └── modules/
│       ├── auth.js           # Login / logout
│       ├── data.js           # CRUD Firestore (productos, categorías)
│       ├── images.js         # Subida + optimización a Storage
│       ├── helpers.js        # Utilidades
│       ├── ui.js             # Toasts, modales, confirmaciones
│       ├── seed.js           # Importa productos iniciales
│       ├── seed-data.js      # Catálogo histórico
│       ├── view-dashboard.js
│       ├── view-products.js
│       ├── view-categories.js
│       ├── view-stock.js
│       ├── view-import.js    # Excel + Google Sheets
│       └── view-settings.js
│
├── firebase.json             # Config Hosting + Firestore + Storage
├── firestore.rules
├── firestore.indexes.json
└── storage.rules
```

## Funcionalidades

### Dashboard
- Productos totales, activos, inactivos, sin stock, bajo stock
- Categorías activas y destacados
- Alertas: sin imagen, sin categoría, sin precio
- Últimos productos cargados

### Productos
- CRUD completo (crear, editar, eliminar, duplicar via edición)
- Activar/desactivar con toggle directo en la tabla
- Marcar como destacado (aparece en home)
- Filtros: búsqueda por texto, categoría, estado, stock
- Múltiples imágenes con drag-and-drop, elección de principal, eliminación
- Talles y colores como chips
- Precio + precio anterior (para ofertas)

### Imágenes
- Carga por click o drag-and-drop
- Optimización automática en el navegador (resize a 1600px, conversión a WebP)
- Almacenadas en Firebase Storage bajo `products/{productId}/...`
- Múltiples por producto, una marcada como principal
- Reordenables arrastrando

### Categorías
- CRUD + activación
- Sección padre (hombres / mujeres) para que se rendericen en el tab correcto
- Imagen de portada
- Reordenables arrastrando la fila

### Stock y precios
- Vista de tabla con edición inline
- Cambia precio, precio anterior y stock en cualquier producto
- Botón "Guardar (N)" que aplica todos los cambios en bulk
- Filtros para encontrar rápido productos sin stock

### Excel
- **Exportar:** descarga `.xlsx` o `.csv` con todos los productos
- **Importar:** subí un archivo y actualizá precios/stock masivo. Productos con `id` existente se actualizan; sin `id` se crean nuevos
- **Google Sheets:** publicá tu hoja como CSV (`Archivo › Compartir › Publicar en la web`) y pegá la URL para traer datos

Columnas reconocidas (insensible a mayúsculas/acentos): `id`, `nombre`, `descripcion`, `categoria`, `precio`, `precioAnterior`, `stock`, `talles`, `colores`, `activo`, `destacado`.

### Configuración
- WhatsApp (el botón "Quiero más info" usa este número)
- Umbral de bajo stock
- Ocultar productos sin stock en la web pública
- Texto del banner promocional (preparado para usar)

## Cómo trabajar día a día

1. Entrás a `/admin/`, te logueás.
2. Cargás o editás productos desde **Productos**.
3. La web pública `sport17.com.ar` los muestra en tiempo real (al refrescar).

### Atajos útiles

- **Producto sin stock:** se muestra con etiqueta "Sin stock" sobre la imagen. Si querés ocultarlos, activá el toggle en **Configuración**.
- **Destacar producto:** en la ficha del producto → marcá "Destacado". Aparece en una sección "Destacados" en la home, antes de las colecciones.
- **Bulk de precios:** entrá a **Stock y precios**, modificá lo que quieras y dale "Guardar".
- **Subir Excel:** **Importar/Exportar** → descargá primero, completá la columna `id` de los productos que querés actualizar, y volvé a subir.

## Seguridad

- El panel está bloqueado a la lista de emails configurada. Cualquier usuario logueado fuera de esa lista es expulsado.
- Las reglas de Firestore/Storage validan en servidor: aunque alguien consiga el código fuente, no puede escribir si no es admin.
- El header `X-Robots-Tag: noindex` evita que Google indexe `/admin/`.

## Próximos pasos sugeridos (opcionales)

- Migrar las imágenes legacy del repo a Firebase Storage (re-subiéndolas desde el panel) para tener todo en la nube.
- Conectar 2FA en Firebase Auth.
- Agregar logs de actividad (ya hay una colección `activity` en las reglas, lista para usarse).
- Reemplazar el banner promo manual por uno editable desde Configuración.
