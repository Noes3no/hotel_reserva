// Listado «Mis reservas» (HU-05 — solo las propias vía RLS) y cancelación (HU-06).

import { euros, imgHabitacion, noches } from '../lib/ayudas'

const ESTADOS = ['pendiente', 'confirmada', 'cancelada']

export default function MisReservas({ reservas, estado, cargando, onCancelar }) {
  return (
    <section className="seccion" id="mis-reservas" data-tinta="claro" data-reveal>
      <div className="cabecera-seccion">
        <h2>Mis reservas</h2>
        <p>Solo tú las ves (RLS). Puedes cancelarlas mientras no estén canceladas.</p>
      </div>

      {estado.tipo === 'error' && <p className="aviso-panel error" role="alert">{estado.mensaje}</p>}

      {cargando && <div className="skeleton" style={{ aspectRatio: 'auto', height: 120 }} />}

      {!cargando && reservas.length === 0 && estado.tipo !== 'error' && (
        <p className="aviso-panel">
          Aún no tienes reservas. Elige unas fechas en el buscador y una habitación de la casa.
        </p>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {reservas.map((r) => {
          const n = noches(r.fecha_entrada, r.fecha_salida)
          const cancelada = r.estado === 'cancelada'
          return (
            <article key={r.id} className="card-reserva">
              <img src={imgHabitacion(r.habitacion_id)} alt="" aria-hidden="true" loading="lazy" />
              <div className="reserva-datos">
                <b>{r.habitacion?.nombre ?? `Habitación #${r.habitacion_id}`}</b>
                <span>
                  Llegada {r.fecha_entrada} · salida {r.fecha_salida} · {n} {n === 1 ? 'noche' : 'noches'}
                </span>
                <span>{r.num_huespedes} huéspedes</span>
              </div>
              <div className="reserva-pie">
                <span className={`badge ${ESTADOS.includes(r.estado) ? r.estado : 'pendiente'}`}>{r.estado}</span>
                {!cancelada && (
                  <button className="btn btn-ghost" onClick={() => onCancelar(r)}>
                    Cancelar reserva
                  </button>
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
