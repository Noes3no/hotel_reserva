// Rejilla del catálogo (HU-03): consulta pública de habitaciones activas.

import { euros, imgHabitacion } from '../lib/ayudas'

const TAGS = ['La más solicitada', 'Vista al valle', 'Familiar', 'Entre pinos', 'Con encanto', 'Junto al agua', 'De piedra y luz', 'Amaneceres']

export default function Habitaciones({ habitaciones, estadoCat, filtros, onReservar, sesion }) {
  return (
    <section className="seccion" id="habitaciones">
      <div className="cabecera-seccion">
        <div>
          <span className="eyebrow">Exclusivo y reservado</span>
          <h2>Las habitaciones de la casa</h2>
          <p>
            Cada habitación respira piedra caliente y madera vieja.
            {filtros.desde && <> Filtro activo: llegada el {filtros.desde}{filtros.hasta ? `, salida el ${filtros.hasta}` : ''}.</>}
          </p>
        </div>
      </div>

      {estadoCat.tipo === 'cargando' && (
        <div className="grid-rooms">
          {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton" aria-hidden="true" />)}
        </div>
      )}

      {estadoCat.tipo === 'error' && (
        <p className="aviso-panel error" role="alert">{estadoCat.mensaje}</p>
      )}

      {estadoCat.tipo === 'aviso' && <p className="aviso-panel aviso">{estadoCat.mensaje}</p>}

      {habitaciones.length > 0 && (
        <div className="grid-rooms">
          {habitaciones.map((h) => {
            const vistoso = TAGS[(h.id - 1 + TAGS.length) % TAGS.length]
            return (
              <article key={h.id} className="card-room">
                <div className="card-room_foto">
                  <img src={imgHabitacion(h.id)} alt={`Habitación ${h.nombre}`} loading="lazy" />
                  <span className="badge-foto">{vistoso}</span>
                </div>
                <div className="card-room_cuerpo">
                  <h3>{h.nombre}</h3>
                  <span className="meta">Hasta {h.capacidad} huéspedes · desayunos incluidos</span>
                  {h.descripcion && <p className="desc">{h.descripcion}</p>}
                  <div className="card-room_pie">
                    <span className="precio">{euros(Number(h.precio_noche))}<small> / noche</small></span>
                    <button
                      className="btn btn-linea"
                      onClick={() => onReservar(h)}
                      aria-label={`Reservar ${h.nombre}`}
                    >
                      Reservar
                    </button>
                  </div>
                </div>
              </article>
            )
          })}
        </div>
      )}
    </section>
  )
}
