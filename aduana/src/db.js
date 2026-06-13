// =========================================================================
//  db.js — Capa de acceso a datos (CRUD) sobre Firestore
// =========================================================================
//
//  Cada clase del diagrama es una colección en Firestore:
//    - viajeros   (id del documento = rut)
//    - vehiculos  (id del documento = patente)
//    - tramites   (id del documento = idTramite, como string)
//    - usuarios   (id del documento = rut)
//
//  Usar los IDs naturales evita duplicados y permite editar/borrar
//  directamente sin tener que guardar un ID extra de Firestore.
// =========================================================================

import { db } from "./firebase";
import {
  collection, getDocs, doc, setDoc, deleteDoc,
} from "firebase/firestore";

// ---------- Lectura: traer una colección completa ----------
async function leerColeccion(nombre) {
  const snap = await getDocs(collection(db, nombre));
  return snap.docs.map((d) => d.data());
}

export const cargarViajeros  = () => leerColeccion("viajeros");
export const cargarVehiculos = () => leerColeccion("vehiculos");
export const cargarTramites  = () => leerColeccion("tramites");
export const cargarUsuarios  = () => leerColeccion("usuarios");

// ---------- Carga inicial de las 4 colecciones en paralelo ----------
export async function cargarTodo() {
  const [viajeros, vehiculos, tramites, usuarios] = await Promise.all([
    cargarViajeros(),
    cargarVehiculos(),
    cargarTramites(),
    cargarUsuarios(),
  ]);
  return { viajeros, vehiculos, tramites, usuarios };
}

// ---------- Escritura (crear o actualizar = "upsert") ----------
// setDoc con un id fijo: si no existe lo crea, si existe lo reemplaza.

export function guardarViajero(viajero) {
  return setDoc(doc(db, "viajeros", viajero.rut), viajero);
}

export function guardarVehiculo(vehiculo) {
  return setDoc(doc(db, "vehiculos", vehiculo.patente), vehiculo);
}

export function guardarTramite(tramite) {
  return setDoc(doc(db, "tramites", String(tramite.idTramite)), tramite);
}

export function guardarUsuario(usuario) {
  return setDoc(doc(db, "usuarios", usuario.rut), usuario);
}

// ---------- Borrado ----------
export function borrarViajero(rut) {
  return deleteDoc(doc(db, "viajeros", rut));
}

export function borrarVehiculo(patente) {
  return deleteDoc(doc(db, "vehiculos", patente));
}

// ---------- Sembrado inicial (opcional) ----------
// Llama esto UNA vez para subir los datos semilla a Firestore vacío.
export async function sembrarDatos({ viajeros, vehiculos, tramites, usuarios }) {
  await Promise.all([
    ...viajeros.map(guardarViajero),
    ...vehiculos.map(guardarVehiculo),
    ...tramites.map(guardarTramite),
    ...usuarios.map(guardarUsuario),
  ]);
}