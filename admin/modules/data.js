// ─── Acceso a Firestore (productos + categorías) ─────────────────────────────

import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  writeBatch,
} from "../firebase-init.js";

const PRODUCTS = "products";
const CATEGORIES = "categories";
const SECTIONS = "sections";

// ═══════ Productos ═══════

export const EMPTY_PRODUCT = {
  sku: "",        // código tipo "P001" usado en el Excel maestro
  name: "",
  description: "",
  price: null,
  priceOld: null,
  cost: null,     // costo interno (no se muestra al público)
  stock: 0,
  categoryId: "",
  sizes: [],
  colors: [],
  active: true,
  featured: false,
  images: [],     // [{ url, path, isMain }]
  order: 0,
};

export async function fetchProducts() {
  const q = query(collection(db, PRODUCTS), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchProduct(id) {
  const snap = await getDoc(doc(db, PRODUCTS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createProduct(data) {
  const payload = {
    ...EMPTY_PRODUCT,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, PRODUCTS), payload);
  return ref.id;
}

export async function updateProduct(id, data) {
  await updateDoc(doc(db, PRODUCTS, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProductDoc(id) {
  await deleteDoc(doc(db, PRODUCTS, id));
}

export async function bulkUpdateProducts(updates) {
  // updates: [{ id, fields: {...} }]
  const batch = writeBatch(db);
  for (const u of updates) {
    batch.update(doc(db, PRODUCTS, u.id), { ...u.fields, updatedAt: serverTimestamp() });
  }
  await batch.commit();
}

// ═══════ Categorías ═══════

export const EMPTY_CATEGORY = {
  name: "",
  description: "",
  coverImage: null,  // { url, path }
  active: true,
  order: 0,
  parent: "",        // "hombres" o "mujeres" (sección)
};

export async function fetchCategories() {
  const q = query(collection(db, CATEGORIES), orderBy("order", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function fetchCategory(id) {
  const snap = await getDoc(doc(db, CATEGORIES, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createCategory(data) {
  const payload = {
    ...EMPTY_CATEGORY,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, CATEGORIES), payload);
  return ref.id;
}

export async function setCategoryWithId(id, data) {
  const payload = {
    ...EMPTY_CATEGORY,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, CATEGORIES, id), payload);
  return id;
}

export async function updateCategory(id, data) {
  await updateDoc(doc(db, CATEGORIES, id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteCategoryDoc(id) {
  await deleteDoc(doc(db, CATEGORIES, id));
}

export async function reorderCategories(ordered) {
  const batch = writeBatch(db);
  ordered.forEach((id, idx) => batch.update(doc(db, CATEGORIES, id), { order: idx }));
  await batch.commit();
}

// ═══════ Secciones (nivel padre de las categorías) ═══════
// Un doc por sección. El doc id ES el slug (hombres, mujeres, tecnologia...)
// para que las categorías puedan referenciarlo por nombre legible.

export const EMPTY_SECTION = {
  name: "",
  description: "",
  coverImage: null,  // { url, path }
  active: true,
  order: 0,
};

export async function fetchSections() {
  try {
    const q = query(collection(db, SECTIONS), orderBy("order", "asc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    // Las reglas todavía pueden no estar deployadas en producción.
    // Devolvemos [] para que el resto de la app pueda funcionar.
    console.warn("fetchSections falló (probablemente faltan reglas en Firestore):", err.message);
    return [];
  }
}

export async function fetchSection(id) {
  const snap = await getDoc(doc(db, SECTIONS, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

// Setea (crea o sobreescribe) con un slug específico. Esto permite que el
// admin elija el slug a la hora de crear la sección (y queda como doc id).
export async function setSectionWithId(id, data) {
  const payload = {
    ...EMPTY_SECTION,
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  await setDoc(doc(db, SECTIONS, id), payload);
  return id;
}

export async function updateSection(id, data) {
  await updateDoc(doc(db, SECTIONS, id), { ...data, updatedAt: serverTimestamp() });
}

export async function deleteSectionDoc(id) {
  await deleteDoc(doc(db, SECTIONS, id));
}

export async function reorderSections(ordered) {
  const batch = writeBatch(db);
  ordered.forEach((id, idx) => batch.update(doc(db, SECTIONS, id), { order: idx }));
  await batch.commit();
}

// Asegura que existan las secciones base (hombres y mujeres). Se llama una
// vez al cargar el admin si todavía no hay secciones. Esto migra el estado
// "hardcoded" anterior a la nueva colección sin romper retrocompatibilidad.
// Defensive: si las reglas de Firestore aún no permiten leer/escribir
// `sections` (ej: aún no se hizo `firebase deploy --only firestore:rules`),
// no rompemos la app. La home igual cae a defaults hardcodeados.
export async function ensureDefaultSections() {
  try {
    const snap = await getDocs(collection(db, SECTIONS));
    if (!snap.empty) return false; // ya hay secciones
    const batch = writeBatch(db);
    // Usamos rutas absolutas para que las imágenes se resuelvan igual desde
    // la home (/) y desde el admin (/admin/). Si fueran relativas (./men.webp)
    // desde el admin se buscarían en /admin/men.webp y darían 404.
    batch.set(doc(db, SECTIONS, "hombres"), {
      name: "Hombres",
      description: "Conjuntos · Camperas · Zapatillas · Perfumes",
      coverImage: { url: "/men.webp", path: null },
      active: true,
      order: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, SECTIONS, "mujeres"), {
      name: "Mujeres",
      description: "Conjuntos · Camperas · Buzos · Perfumes",
      coverImage: { url: "/women.webp", path: null },
      active: true,
      order: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
    return true;
  } catch (err) {
    console.warn(
      "ensureDefaultSections falló. Probablemente faltan reglas de Firestore deployadas. " +
      "Ejecutá: firebase deploy --only firestore:rules — Detalle:",
      err.message
    );
    return false;
  }
}

// ═══════ Historial de imports (para deshacer) ═══════
const IMPORT_HISTORY = "import-history";

// Guarda un snapshot del estado anterior a un import.
// payload: {
//   source: "excel" | "sheets",
//   fileName?: string,
//   userEmail?: string,
//   updated: [{ id, before: {...campos viejos} }],
//   created: [productId, ...],
// }
export async function saveImportSnapshot(payload) {
  const ref = await addDoc(collection(db, IMPORT_HISTORY), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function fetchImportHistory(max = 10) {
  const q = query(collection(db, IMPORT_HISTORY), orderBy("createdAt", "desc"), limit(max));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function deleteImportSnapshot(id) {
  await deleteDoc(doc(db, IMPORT_HISTORY, id));
}

// Aplica el rollback: restaura productos modificados a su estado previo y
// elimina los productos creados durante ese import.
export async function rollbackImport(snapshot) {
  const batch = writeBatch(db);
  for (const u of snapshot.updated || []) {
    if (!u.id || !u.before) continue;
    batch.set(doc(db, PRODUCTS, u.id), { ...u.before, updatedAt: serverTimestamp() }, { merge: false });
  }
  for (const id of snapshot.created || []) {
    batch.delete(doc(db, PRODUCTS, id));
  }
  await batch.commit();
}
