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
  serverTimestamp,
  writeBatch,
} from "../firebase-init.js";

const PRODUCTS = "products";
const CATEGORIES = "categories";

// ═══════ Productos ═══════

export const EMPTY_PRODUCT = {
  name: "",
  description: "",
  price: null,
  priceOld: null,
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
