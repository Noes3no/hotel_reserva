// Portada «place-carries-it»: una sola vista del valle hace la venta.
// El nombre pega al borde inferior como un rótulo de film. El buscador
// (CA-9.1: fechas ≥ hoy + huéspedes) vive DEBAJO de la portada, centrado,
// para que nunca se solape con la fotografía ni con el nombre de la casa.

import { hoyISO } from '../lib/ayudas'

export default function Hero({ filtros, setFiltros }) {
  const hoy = hoyISO()

  function setF(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  return (
    <>
      <section className="hero" id="inicio" data-tinta="claro">
        <div className="hero_panel">
          <div className="hero_foto">
            <div className="hero_foto_deriva" aria-hidden="true" />

            <div className="hero_contenido">
              <div className="hero_pares">
                <span>Casa rural única · desde 1926</span>
                <span>Sierra del Aguilar · Burgos</span>
              </div>

              <p className="hero_lema">
                Piedra caliente, piscina de madera y la mejor chimenea del valle. La casa entera es tuya.
              </p>

              <h1 className="hero_nombre">La Solana</h1>
            </div>
          </div>

          <nav className="hero_nav" aria-label="Secciones de la casa">
            <a className="t-1" href="#habitaciones">Habitaciones</a>
            <a className="t-2" href="#experiencias">Días en la casa</a>
            <a className="t-3" href="#entorno">El entorno</a>
            <a className="t-4" href="#mis-reservas">Tu estancia</a>
            <a className="t-5" href="#habitaciones">Reservar</a>
          </nav>
        </div>
      </section>

      {/* Buscador centrado bajo la portada (CA-9.1): fechas ≥ hoy y huéspedes */}
      <div className="buscador-franja">
        <form
          className="buscador"
          aria-label="Elegir fechas y huéspedes"
          onSubmit={(e) => { e.preventDefault(); document.getElementById('habitaciones')?.scrollIntoView({ behavior: 'smooth' }) }}
        >
          <div className="buscador_campo">
            <label htmlFor="b-desde">Llegada</label>
            <input
              id="b-desde"
              type="date"
              min={hoy}
              value={filtros.desde ?? ''}
              onChange={(e) => {
                const v = e.target.value
                setFiltros((f) => ({
                  ...f,
                  desde: v,
                  // la salida no puede quedar antes que la llegada
                  hasta: f.hasta && v && f.hasta <= v ? '' : f.hasta,
                }))
              }}
            />
          </div>

          <div className="buscador_campo">
            <label htmlFor="b-hasta">Salida</label>
            <input
              id="b-hasta"
              type="date"
              min={filtros.desde || hoy}
              value={filtros.hasta ?? ''}
              onChange={(e) => setF('hasta', e.target.value)}
            />
          </div>

          <div className="buscador_campo">
            <label htmlFor="b-huespedes">Huéspedes</label>
            <select
              id="b-huespedes"
              value={filtros.huespedes ?? ''}
              onChange={(e) => setF('huespedes', e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Cualquiera</option>
              {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} huéspedes</option>)}
            </select>
          </div>

          <div className="buscador_botones">
            <button className="btn-buscar" type="submit" aria-label="Ver habitaciones disponibles">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.5-4.5" />
              </svg>
              <span className="btn-buscar_texto">Buscar</span>
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
