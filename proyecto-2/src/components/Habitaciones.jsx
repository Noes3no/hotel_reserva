// Habitaciones (HU-03): banda desigual de cuatro vistas de la casa y,
// debajo, el catálogo completo como filas alternadas (foto y texto se turnan).
// El buscador del hero sirve el filtro: capacidad y fechas activas.

import { euros, imgHabitacion } from '../lib/ayudas'

const VISTAS_BANDA = [
  { img: 'casa-campo.jpg', alt: 'La casa de piedra entre árboles' },
  { img: 'piscina-madera.jpg', alt: 'Piscina de madera templada' },
  { img: 'spa.jpg', alt: 'Hidromasaje privado en piedra' },
  { img: 'salon-comun.jpg', alt: 'Salón común junto a la chimenea' },
]

export default function Habitaciones({ habitaciones, estadoCat, filtros, onReservar }) {
  return (
    <section className="seccion" id="habitaciones" data-tinta="claro" data-reveal>
      <div className="cabecera-seccion">
        <h2>Las habitaciones</h2>
        <p>
          Cada habitación respira piedra caliente y madera vieja; todas miran al valle.
          {filtros.desde && <> Filtro activo: llegada el {filtros.desde}{filtros.hasta ? `, salida el ${filtros.hasta}` : ''}.</>}
        </p>
      </div>

      {/* Banda de paneles desiguales: al pasar el ratón, cada foto crece */}
      <div className="banda" role="img" aria-label="Cuatro vistas de la casa">
        {VISTAS_BANDA.map((v, i) => (
          <figure key={v.img} className="banda-item" data-reveal style={{ margin: 0 }}>
            <img src={`/img/${v.img}`} alt={v.alt} loading={i === 0 ? 'eager' : 'lazy'} />
            {i === 0 && <span className="banda_titulo">La casa</span>}
          </figure>
        ))}
      </div>
      <p className="banda_pie">Cuatro rincones de La Solana. Todas las fechas se reservan en el mismo paso.</p>

      {estadoCat.tipo === 'cargando' && (
        <div style={{ display: 'grid', gap: 20, marginTop: 24 }}>
          {[0, 1, 2].map((i) => <div key={i} className="skeleton" style={{ aspectRatio: 'auto', height: 180 }} aria-hidden="true" />)}
        </div>
      )}

      {estadoCat.tipo === 'error' && (
        <p className="aviso-panel error" role="alert">{estadoCat.mensaje}</p>
      )}

      {estadoCat.tipo === 'aviso' && <p className="aviso-panel aviso" style={{ marginTop: 24 }}>{estadoCat.mensaje}</p>}

      {habitaciones.length > 0 && (
        <div className="room-filas">
          {habitaciones.map((h) => (
            <article key={h.id} className="room-fila" data-reveal>
              <div className="room-fila_foto">
                <img src={imgHabitacion(h.id)} alt={`Habitación ${h.nombre}`} loading="lazy" />
              </div>
              <div>
                <h3>{h.nombre}</h3>
                <span className="meta">Hasta {h.capacidad} huéspedes · desayunos incluidos</span>
                {h.descripcion && <p className="desc">{h.descripcion}</p>}
                <div className="room-fila_pie">
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
          ))}
        </div>
      )}
    </section>
  )
}
