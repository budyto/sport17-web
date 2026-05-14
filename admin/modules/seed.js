// ─── Seed: importar categorías y productos iniciales a Firestore ─────────────

import {
  db, doc, getDoc, setDoc, serverTimestamp,
  collection, query, getDocs, where,
  addDoc,
} from "../firebase-init.js";
import { SEED_CATEGORIES, SEED_PRODUCTS } from "./seed-data.js";

export async function runSeed() {
  let categoriesCreated = 0;
  let productsCreated = 0;
  const slugToId = new Map();

  // Cargar categorías existentes para no duplicar (matcheamos por slug guardado como id)
  for (const cat of SEED_CATEGORIES) {
    const ref = doc(db, "categories", cat.slug);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        name: cat.name,
        description: cat.description,
        parent: cat.parent,
        order: cat.order,
        active: true,
        coverImage: cat.cover ? { url: cat.cover, path: null } : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      categoriesCreated++;
    }
    slugToId.set(cat.slug, cat.slug);
  }

  // Para productos chequeamos por (name + categoryId) ya existente
  // Traemos todo de una para no hacer N queries
  const existingSnap = await getDocs(collection(db, "products"));
  const existing = new Set(existingSnap.docs.map((d) => `${d.data().categoryId}|${(d.data().name || "").toLowerCase()}`));

  for (const p of SEED_PRODUCTS) {
    const categoryId = slugToId.get(p.categorySlug);
    if (!categoryId) continue;
    const key = `${categoryId}|${p.name.toLowerCase()}`;
    if (existing.has(key)) continue;

    await addDoc(collection(db, "products"), {
      name: p.name,
      description: p.description || "",
      price: p.price,
      priceOld: p.priceOld || null,
      stock: p.stock ?? 0,
      categoryId,
      sizes: p.sizes || [],
      colors: p.colors || [],
      active: true,
      featured: !!p.featured,
      images: p.images || [],
      order: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    productsCreated++;
    existing.add(key);
  }

  return { categoriesCreated, productsCreated };
}
