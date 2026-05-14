// ─── Firebase config ─────────────────────────────────────────────────────────
// Proyecto Firebase: sport17-a01f6
//
// IMPORTANTE: Reemplazar estos valores con los que Firebase Console te muestra
// en "Configuración del proyecto > Tus apps > Configuración del SDK".
// Si todavía no creaste una "Web App", entrá a console.firebase.google.com,
// elegí el proyecto sport17-a01f6, andá a "Configuración del proyecto" y
// agregá una nueva app web. Después copiá los valores acá.

export const firebaseConfig = {
  apiKey: "REEMPLAZAR_API_KEY",
  authDomain: "sport17-a01f6.firebaseapp.com",
  projectId: "sport17-a01f6",
  storageBucket: "sport17-a01f6.appspot.com",
  messagingSenderId: "REEMPLAZAR_SENDER_ID",
  appId: "REEMPLAZAR_APP_ID",
};

// Lista blanca de emails admin. Cualquier usuario que no esté acá no puede
// acceder al panel aunque tenga credenciales válidas de Firebase Auth.
export const ADMIN_EMAILS = [
  "admin@sport17.com.ar",
];

// Configuración de la tienda
export const STORE_CONFIG = {
  whatsappNumber: "5491136634655",
  currency: "ARS",
  priceMultiplier: 1000, // los precios en pesos se guardan en miles (ej: 45 = $45.000)
  lowStockThreshold: 3,  // alerta cuando el stock baja de este número
  hideOutOfStock: false, // si true, productos sin stock no aparecen en la web pública
};
