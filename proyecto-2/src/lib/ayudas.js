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
