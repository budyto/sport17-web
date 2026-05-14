// ─── Carga / optimización de imágenes ────────────────────────────────────────

import {
  storage,
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "../firebase-init.js";

const MAX_DIMENSION = 1600;
const QUALITY = 0.85;

// Optimiza la imagen en el navegador: redimensiona si excede MAX_DIMENSION,
// convierte a WebP cuando el navegador lo soporta y reduce el peso.
export async function optimizeImage(file) {
  if (!file.type.startsWith("image/")) throw new Error("Archivo no es una imagen.");

  const dataUrl = await readAsDataURL(file);
  const img = await loadImage(dataUrl);

  let { width, height } = img;
  const max = Math.max(width, height);
  if (max > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / max;
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, width, height);

  const supportsWebp = await canSupportWebp();
  const outputType = supportsWebp ? "image/webp" : "image/jpeg";
  const extension = supportsWebp ? "webp" : "jpg";

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, QUALITY));
  if (!blob) throw new Error("No se pudo procesar la imagen.");

  return { blob, extension, type: outputType };
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("No se pudo leer el archivo."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo cargar la imagen."));
    img.src = src;
  });
}

let webpSupport = null;
function canSupportWebp() {
  if (webpSupport !== null) return webpSupport;
  webpSupport = new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob((blob) => resolve(!!blob && blob.type === "image/webp"), "image/webp");
  });
  return webpSupport;
}

export async function uploadProductImage(productId, file) {
  const { blob, extension } = await optimizeImage(file);
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;
  const path = `products/${productId}/${fileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function uploadCategoryImage(categoryId, file) {
  const { blob, extension } = await optimizeImage(file);
  const fileName = `cover-${Date.now()}.${extension}`;
  const path = `categories/${categoryId}/${fileName}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob, { contentType: blob.type });
  const url = await getDownloadURL(storageRef);
  return { url, path };
}

export async function deleteStorageObject(path) {
  if (!path) return;
  try {
    await deleteObject(ref(storage, path));
  } catch (err) {
    // si ya no existe, ignoramos
    if (err?.code !== "storage/object-not-found") {
      console.warn("No se pudo borrar la imagen:", err);
    }
  }
}
