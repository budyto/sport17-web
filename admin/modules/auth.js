// ─── Autenticación ───────────────────────────────────────────────────────────

import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "../firebase-init.js";
import { ADMIN_EMAILS } from "../firebase-config.js";

let currentUser = null;
const listeners = new Set();

export function isAuthorized(user) {
  if (!user || !user.email) return false;
  if (ADMIN_EMAILS.length === 0) return true; // sin lista blanca: cualquier user logueado
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(user.email.toLowerCase());
}

export function getCurrentUser() {
  return currentUser;
}

export function onAuth(cb) {
  listeners.add(cb);
  cb(currentUser);
  return () => listeners.delete(cb);
}

export function watchAuth() {
  onAuthStateChanged(auth, (user) => {
    if (user && !isAuthorized(user)) {
      signOut(auth);
      currentUser = null;
    } else {
      currentUser = user;
    }
    listeners.forEach((cb) => cb(currentUser));
  });
}

export async function login(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  if (!isAuthorized(cred.user)) {
    await signOut(auth);
    throw new Error("Tu cuenta no tiene permisos de administrador.");
  }
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export function humanizeAuthError(err) {
  const msg = (err?.message || "").toLowerCase();
  if (err?.code === "auth/invalid-credential" || msg.includes("invalid-credential")) return "Email o contraseña incorrectos.";
  if (err?.code === "auth/user-not-found") return "No existe una cuenta con ese email.";
  if (err?.code === "auth/wrong-password") return "Contraseña incorrecta.";
  if (err?.code === "auth/too-many-requests") return "Demasiados intentos. Probá más tarde.";
  if (err?.code === "auth/network-request-failed") return "Sin conexión. Revisá tu internet.";
  if (err?.code === "auth/invalid-email") return "El email no es válido.";
  return err?.message || "No se pudo ingresar.";
}
