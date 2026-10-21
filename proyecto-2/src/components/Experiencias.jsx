// Experiencias (HU-03, sección visual): foto ancha con párrafo en papel,
// tile de color con el cordillera de la sierra y cuatro datos de la casa.

export default function Experiencias() {
  return (
    <section className="seccion" id="experiencias" data-tinta="oscuro" data-reveal>
      <div className="cabecera-seccion">
        <h2>Días en la casa</h2>
        <p>Sin prisa, sin ruido: los pequeños rituales son la estancia.</p>
      </div>

      <div className="sobre">
        <figure className="sobre_foto" data-reveal style={{ margin: 0 }}>
          <img src="/img/desayuno.jpg" alt="Pan de masa madre y mermelada de higuera en la mesa" loading="lazy" />
          <p className="sobre_parrafo">
            La mañana empieza con café de la casa y mermelada de higuera; a mediodía la piscina
            de madera se tempera sola; si cae la tarde entre niebla, la chimenea del salón está
            encendida antes de que pidas una manta. La cocina de la abuela se sirve por encargo,
            y bajo la piedra del spa hay agua helada y caliente para terminar el día.
          </p>
        </figure>

        <div className="sobre_medio" data-reveal aria-hidden="true">
          <svg width="260" height="150" viewBox="0 0 260 150" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 128 L64 58 L96 96 L136 30 L182 88 L214 52 L254 128" />
            <circle cx="136" cy="30" r="5" fill="currentColor" stroke="none" />
          </svg>
        </div>

        <div className="sobre_datos" data-reveal>
          <div><b>1.188 m</b><span>altitud de la aldea*</span></div>
          <div><b>68 km</b><span>hasta Burgos*</span></div>
          <div><b>Todo el año</b><span>temporada de la casa</span></div>
          <div><b>Al teléfono</b><span>Marta, la anfitriona</span></div>
        </div>
      </div>

      <p style={{ margin: '18px 0 0', color: 'var(--ink-3)', fontSize: 13.5 }}>* datos de muestra: confírmalos al reservar</p>
    </section>
  )
}
