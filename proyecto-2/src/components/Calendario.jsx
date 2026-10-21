// Calendario mensual reutilizable (HU-04 CA-4.7 · HU-07 CA-7.8).
//
// Modo disponibilidad (modal de reserva): se le pasan los tramos ocupados
// (estado ≠ cancelada) y sombrea los días que ya están reservados o han
// pasado; el cliente marca llegada y salida pulsando días libres.
// Modo agenda (panel del propietario): cada día pinta una píldora por
// reserva (habitación + estado) mediante el callback `extra`.
//
// La lógica de negocio (solapes, capacidad, fechas futuras) sigue
// garantizándola Supabase: aquí solo se pinta lo que la base devuelve.

import { useState } from 'react'
import { hoyISO } from '../lib/ayudas'

const DIAS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']

export default function Calendario({
  ocupadas = [],   // tramos: { habitacion_id?, fecha_entrada, fecha_salida, estado? }
  habitacionId = null, // si viene, solo miran los tramos de esa habitación
  desde = '',      // llegada elegida (ISO) para pintar el rango
  hasta = '',      // salida elegida (ISO; el día de salida queda libre)
  onDia = null,    // callback onDia(diaISO) con los días clicables
  extra = null,    // callback extra(diaISO) → nodos dentro del día (píldoras)
  ariaLabel = 'Calendario de disponibilidad',
}) {
  const hoy = hoyISO()
  const [salto, setSalto] = useState(0) // meses desde el actual (0-11)

  const base = new Date()
  const y = base.getFullYear()
  const m = base.getMonth() + salto
  const primero = new Date(y, m, 1)
  const finMes = new Date(y, m + 1, 0)
  const desplazamiento = (primero.getDay() + 6) % 7 // lunes = columna 0
  const total = finMes.getDate()

  const iso = (dia) =>
    `${y}-${String(m + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`

  const estaOcupado = (dia) =>
    ocupadas.some((r) => {
      if (habitacionId !== null && r.habitacion_id !== habitacionId) return false
      // [entrada, salida): el día de salida vuelve a estar libre (igual que la restricción EXCLUDE)
      return dia >= r.fecha_entrada && dia < r.fecha_salida
    })

  function navegar(delta) {
    setSalto((s) => Math.min(11, Math.max(0, s + delta)))
  }

  return (
    <div className="calendario" role="group" aria-label={`${ariaLabel} · ${MESES[((m % 12) + 12) % 12]} ${iso(1).slice(0, 4)}`}>
      <div className="cal-cabecera">
        <button type="button" className="cal-nav" disabled={salto <= 0} onClick={() => navegar(-1)} aria-label="Mes anterior">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M15 5 8 12l7 7" /></svg>
        </button>
        <b className="cal-mes">{MESES[((m % 12) + 12) % 12]} {y}</b>
        <button type="button" className="cal-nav" disabled={salto >= 11} onClick={() => navegar(1)} aria-label="Mes siguiente">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
        </button>
      </div>

      <div className="cal-dias" aria-hidden="true">
        {DIAS.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className="cal-cuadro">
        {Array.from({ length: desplazamiento }).map((_, i) => (
          <i key={`vacío-${i}`} className="cal-vacio" aria-hidden="true" />
        ))}

        {Array.from({ length: total }, (_, i) => i + 1).map((d) => {
          const dia = iso(d)
          const pasado = dia < hoy
          const ocupado = !pasado && estaOcupado(dia)
          const punta = dia === desde || dia === hasta
          const enRango = desde && hasta && dia > desde && dia < hasta
          const clases = [
            'cal-dia',
            pasado && 'pasado',
            ocupado && 'ocupado',
            punta && 'punta',
            enRango && 'en-rango',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={dia}
              type="button"
              className={clases}
              disabled={pasado || ocupado}
              title={`${dia}${ocupado ? ' · reservado' : ''}${pasado ? ' · pasado' : ''}`}
              aria-pressed={punta}
              onClick={() => !pasado && !ocupado && onDia?.(dia)}
            >
              <span className="cal-num">{d}</span>
              {extra?.(dia)}
            </button>
          )
        })}
      </div>
    </div>
  )
}
