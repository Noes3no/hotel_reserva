// Hero a pantalla completa con buscador tipo Airbnb: destino, fechas y huéspedes.

import { hoyISO } from '../lib/ayudas'

export default function Hero({ filtros, setFiltros }) {
  const hoy = hoyISO()

  function set(campo, valor) {
    setFiltros((f) => ({ ...f, [campo]: valor }))
  }

  return (
    <section className="hero" id="inicio">
      <div className="hero_foto" role="img" aria-label="Casa de madera encendida al anochecer, rodeada de vegetación" />
      <div className="hero_velo" aria-hidden="true" />

      <div className="hero-inner">
        <span className="eyebrow" style={{ color: '#f4b28a' }}>Casa rural · Sierra del Aguilar</span>
        <h1 className="hero_titulo">Despiertas entre niebla, cenas bajo tu estrella.</h1>
        <p className="hero_lema">
          Piedra de siglos, una piscina de madera y la mejor chimenea del valle.
          La casa entera es tuya y tus fechas se reservan desde hoy.
        </p>

        <form
          className="buscador"
          aria-label="Buscar disponibilidad"
          onSubmit={(e) => { e.preventDefault(); document.getElementById('habitaciones')?.scrollIntoView({ behavior: 'smooth' }) }}
        >
          <div className="buscador_campo">
            <label htmlFor="b-destino">Destino</label>
            <input id="b-destino" placeholder="La Solana, Sierra del Aguilar" disabled />
          </div>

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
              onChange={(e) => set('hasta', e.target.value)}
            />
          </div>

          <div className="buscador_campo">
            <label htmlFor="b-huespedes">Huéspedes</label>
            <select
              id="b-huespedes"
              value={filtros.huespedes ?? ''}
              onChange={(e) => set('huespedes', e.target.value === '' ? '' : Number(e.target.value))}
            >
              <option value="">Cualquiera</option>
              {[2, 3, 4, 5, 6, 8].map((n) => <option key={n} value={n}>{n} huéspedes</option>)}
            </select>
          </div>

          <div className="buscador_botones">
            <button className="btn btn-buscar" type="submit" aria-label="Buscar habitaciones">
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.5-4.5" />
              </svg>
            </button>
          </div>
        </form>

        <div className="hero_chips">
          <span className="chip-opaca">★ 4,9 · 312 opiniones</span>
          <span className="chip-opaca">⚡ Piscina con hidromasaje</span>
          <span className="chip-opaca">🔥 Chimenea y leña incluida</span>
          <span className="chip-opaca">🍞 Desayunos de la casa</span>
        </div>
      </div>
    </section>
  )
}
