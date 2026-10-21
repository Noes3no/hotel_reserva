// Pequeñas ayudas compartidas por la interfaz.

/** Fecha de hoy en formato local YYYY-MM-DD (sin desfase de zona horaria). */
export function hoyISO() {
  return new Date().toLocaleDateString('en-CA')
}

/** Noches entre dos fechas ISO. */
export function noches(desde, hasta) {
  const ms = new Date(hasta) - new Date(desde)
  return Math.round(ms / 86400000)
}

/** Precio formateado en euros con símbolo. */
export function euros(valor) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(valor)
}

/** Ruta de imagen por defecto si la habitación no usa una asignada. */
export const IMGS_HABITACIONES = [
  'habitacion-suite.jpg',
  'habitacion-doble.jpg',
  'cabana-nieve.jpg',
  'cabana-bosque.jpg',
  'piscina-madera.jpg',
  'refugio-lago.jpg',
  'casa-campo.jpg',
  'casita-colina.jpg',
]

export function imgHabitacion(id) {
  return `/img/${IMGS_HABITACIONES[(id - 1 + IMGS_HABITACIONES.length) % IMGS_HABITACIONES.length]}`
}

/** Inicial grande para el avatar de sesión. */
export function inicial(nombre) {
  const t = (nombre ?? '').trim()
  return t ? t[0].toUpperCase() : '?'
}

/* ---------- Reserva pendiente (HU-10) ----------
   El visitante rellena la reserva sin cuenta; la autenticación llega al final
   (email o Google). Con Google hay redirección externa: la reserva se guarda
   en localStorage y caduca a los 15 minutos. */

export const CLAVE_RESERVA_PENDIENTE = 'la-solana:reserva-pendiente'
const CADUCIDAD_MS = 15 * 60 * 1000

export function guardarReservaPendiente(datos) {
  try {
    localStorage.setItem(CLAVE_RESERVA_PENDIENTE, JSON.stringify({ ...datos, creado: Date.now() }))
  } catch { /* modo privado: sin persistencia, la reserva por email sigue funcionando */ }
}

/** Devuelve la reserva pendiente si existe y no ha caducado (y la limpia). */
export function tomarReservaPendiente() {
  let cruda = null
  try { cruda = localStorage.getItem(CLAVE_RESERVA_PENDIENTE) } catch { return null }
  if (!cruda) return null
  try { localStorage.removeItem(CLAVE_RESERVA_PENDIENTE) } catch { /* ignora */ }
  try {
    const datos = JSON.parse(cruda)
    return Date.now() - (datos?.creado ?? 0) <= CADUCIDAD_MS ? datos : null
  } catch {
    return null
  }
}

export function limpiarReservaPendiente() {
  try { localStorage.removeItem(CLAVE_RESERVA_PENDIENTE) } catch { /* ignora */ }
}
