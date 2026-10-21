// El entorno (HU-03): fila arrastrable de módulos desiguales — una foto alta,
// una pareja apilada, una foto ancha — con el texto de la sierra debajo.

export default function Entorno() {
  return (
    <section className="seccion" id="entorno" data-tinta="claro" data-reveal>
      <div className="galeria-cabecera">
        <h2>El entorno</h2>
        <span>Siete vistas · arrastra para recorrerlo</span>
      </div>

      <div className="galeria" tabIndex="0" aria-label="Galería del valle, desplazable">
        <figure className="g-wide" data-reveal style={{ margin: 0 }}>
          <video
            src="/video/niebla-bosque.webm"
            poster="/video/niebla-bosque-poster.jpg"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        </figure>

        <figure className="g-tall" data-reveal style={{ margin: 0 }}>
          <img src="/img/valle.jpg" alt="Valle del Aguilar a primera hora, entre niebla" loading="lazy" />
        </figure>

        <div className="g-par" data-reveal>
          <img src="/img/bosque.jpg" alt="Bosque de rebollos en verde profundo" loading="lazy" />
          <img src="/img/parque-natural.jpg" alt="Río lento entre pinos del parque natural" loading="lazy" />
        </div>

        <figure className="g-wide" data-reveal style={{ margin: 0 }}>
          <img src="/img/trigo-atardecer.jpg" alt="Campo de trigo al atardecer en la falda de la sierra" loading="lazy" />
        </figure>

        <div className="g-par" data-reveal>
          <img src="/img/refugio-lago.jpg" alt="Cabaña de pesca junto al Pantano de Robla" loading="lazy" />
          <img src="/img/cabana-nieve.jpg" alt="La casa bajo la primera nevada" loading="lazy" />
        </div>

        <figure className="g-tall" data-reveal style={{ margin: 0 }}>
          <img src="/img/cocina.jpg" alt="Cocina de la casa con piedra y cobre" loading="lazy" />
        </figure>
      </div>

      <p className="entorno-texto">
        Bosques de rebollo, ríos lentos y pueblos de pizarra teñidos de ocre. La sierra se recorre
        a pie: desde la puerta salen tres senderos — al mirador del valle, al pantano de Robla y
        al escondrijo de enebros — y el invierno trae esquí de fondo a los puertos.
      </p>
    </section>
  )
}
