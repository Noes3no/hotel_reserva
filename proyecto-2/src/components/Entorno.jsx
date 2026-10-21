// Sección de entorno con mosaico fotográfico (referencia: paisajes del tablero).

export default function Entorno() {
  return (
    <section className="seccion" id="entorno">
      <div className="cabecera-seccion">
        <div>
          <span className="eyebrow">Sierra del Aguilar</span>
          <h2>El entorno, seco y verde</h2>
          <p>Bosques de rebollo, ríos lentos y pueblos de pizarra teñidos de ocre. Un mapa pequeño que se recorre a pie.</p>
        </div>
      </div>

      <div className="mosaico">
        <figure className="g8">
          <img src="/img/valle.jpg" alt="Valle nublado desde el mirador" loading="lazy" />
          <figcaption>Valle del Aguilar a primera hora</figcaption>
        </figure>
        <figure className="g4">
          <img src="/img/refugio-lago.jpg" alt="Cabaña de pesca junto al lago" loading="lazy" />
          <figcaption>Pantano de Robla</figcaption>
        </figure>
        <figure className="g4">
          <img src="/img/parque-natural.jpg" alt="Río entre pinos del parque natural" loading="lazy" />
          <figcaption>Río quieto</figcaption>
        </figure>
        <figure className="g4">
          <img src="/img/trigo-atardecer.jpg" alt="Campo labrado al atardecer" loading="lazy" />
          <figcaption>Camino de oro</figcaption>
        </figure>
        <figure className="g4">
          <img src="/img/bosque.jpg" alt="Bosque de pinares con luz lateral" loading="lazy" />
          <figcaption>Pinar de la Umbría</figcaption>
        </figure>
      </div>

      <p className="entorno-texto">
        A media hora andando: un tejo milenario, una bodega familiar que defiende sus
        postres a base de melocotones y un mirador donde se oye más de lo que se ve.
        Las rutas que recomendamos van siempre con un mapa dibujado a mano.
      </p>
    </section>
  )
}
