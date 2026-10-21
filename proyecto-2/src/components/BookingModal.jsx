// Modal de creación de reserva (HU-04).
// RLS exige sesión; aquí además validamos en cliente: entrada ≥ hoy (CA-4.2),
// salida > entrada (CA-4.3) y huéspedes ≤ capacidad (CA-4.4).

import { useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO, noches, euros, imgHabitacion } from '../lib/ayudas'

export default function BookingModal({ sesion, habitacion, filtros, onCreado, cerrar }) {
  const hoy = hoyISO()
  const [desde, setDesde] = useState(filtros.desde ?? '')
  const [hasta, setHasta] = useState(
    (() => {
      const base = filtros.desde || hoy
      const d = new Date(base)
      d.setDate(d.getDate() + 2)
      return d.toLocaleDateString('en-CA')
    })(),
  )
  const [huespedes, setHuespedes] = useState(Math.min(2, habitacion.capacidad))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  const n = useMemo(() => {
    if (!desde || !hasta || hasta <= desde) return 0
    return noches(desde, hasta)
  }, [desde, hasta])

  const total = n * Number(habitacion.precio_noche)

  function validar() {
    if (!desde || !hasta) return 'Elige la fecha de llegada y de salida.'
    if (desde < hoy) return 'Queda prohibido reservar fechas del pasado: la llegada debe ser a partir de hoy.'
    if (hasta <= desde) return 'La salida debe ser posterior a la llegada.'
    if (huespedes < 1 || huespedes > habitacion.capacidad) {
      return `La habitación ${habitacion.nombre} admite hasta ${habitacion.capacidad} huéspedes.`
    }
    return ''
  }

  async function crearReserva(e) {
    e.preventDefault()
    const msg = validar()
    setError(msg)
    if (msg) return

    setEnviando(true)
    const { error: errorDb } = await supabase.from('reservas').insert({
      usuario_id: sesion.user.id,
      habitacion_id: habitacion.id,
      fecha_entrada: desde,
      fecha_salida: hasta,
      num_huespedes: huespedes,
    })
    setEnviando(false)

    if (errorDb) {
      // La BD puede rechazar: solape (CA-4.5), pasado, capacidad… mostramos su mensaje.
      setError(errorDb.message || 'La API REST rechazó la reserva.')
      return
    }
    onCreado(desde, hasta)
  }

  function cerrarConTecla(e) {
    if (e.key === 'Escape') cerrar()
  }

  return (
    <div className="manto" onClick={cerrar} onKeyDown={cerrarConTecla}>
      <div
        className="modal amplio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserva-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reserva-img" style={{ background: `url(${imgHabitacion(habitacion.id)}) center/cover` }} aria-hidden="true" />
        <div className="reserva-cuerpo">
          <div className="modal-top" style={{ marginBottom: 0 }}>
            <div className="reserva-titulo">
              <h2 id="reserva-titulo">{habitacion.nombre}</h2>
              <span className="precio">
                {euros(Number(habitacion.precio_noche))}
                <small> / noche</small>
              </span>
            </div>
            <button className="btn-x" onClick={cerrar} aria-label="Cerrar">✕</button>
          </div>

          <form className="form-auth" onSubmit={crearReserva} noValidate>
            <div className="fechas">
              <div className="grupo">
                <label htmlFor="r-desde">Llegada</label>
                <input
                  id="r-desde" type="date" min={hoy} value={desde} required
                  onChange={(e) => {
                    setDesde(e.target.value)
                    if (hasta && hasta <= e.target.value) {
                      const d = new Date(e.target.value)
                      d.setDate(d.getDate() + 1)
                      setHasta(d.toLocaleDateString('en-CA'))
                    }
                  }}
                />
              </div>
              <div className="grupo">
                <label htmlFor="r-hasta">Salida</label>
                <input
                  id="r-hasta" type="date" min={desde || hoy} value={hasta} required
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>
            </div>

            <div className="grupo">
              <label htmlFor="r-huespedes">
                Huéspedes · máximo {habitacion.capacidad}
              </label>
              <input
                id="r-huespedes"
                type="number"
                min="1"
                max={habitacion.capacidad}
                value={huespedes}
                onChange={(e) => setHuespedes(Number(e.target.value))}
              />
            </div>

            {error && <p className="error-msg" role="alert">{error}</p>}

            <div className="total">
              <span>
                {n > 0 ? `${n} ${n === 1 ? 'noche' : 'noches'} · ${euros(Number(habitacion.precio_noche))}/noche` : 'Elige fechas válidas'}
              </span>
              <b>{n > 0 ? euros(total) : '—'}</b>
            </div>

            <button className="btn btn-clay" disabled={enviando || n === 0}>
              {enviando ? 'Reservando…' : 'Confirmar reserva'}
            </button>

            <p className="nota">
              Reserva a nombre de {sesion.perfil?.nombre_completo ?? 'tu cuenta'}; quedará en estado
              «pendiente» hasta que el anfitrión la confirme.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
