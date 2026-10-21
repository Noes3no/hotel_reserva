// Carrusel de experiencias de la casa (sección visual).

const ITEMS = [
  { img: 'desayuno.jpg', t: 'Desayunos caseros', d: 'Torrijas, mermelada de higuera y café de la casa' },
  { img: 'salon-comun.jpg', t: 'Chimenea y fresco', d: 'Biblioteca, sofás y silencio' },
  { img: 'piscina-madera.jpg', t: 'Piscina de madera', d: 'Agua climatizada de abril a octubre' },
  { img: 'spa.jpg', t: 'Ritual en piedra', d: 'Hidromasaje privado bajo cita' },
  { img: 'cocina.jpg', t: 'Cocina de la abuela', d: 'Menú de temporada si lo pides' },
  { img: 'comedor.jpg', t: 'Cenas de quintero', d: 'Luz de faroles y pan a la lumbre' },
]

export default function Experiencias() {
  return (
    <section className="seccion" id="experiencias">
      <div className="cabecera-seccion">
        <div>
          <span className="eyebrow">Para tu antojo</span>
          <h2>Todo lo que te espera</h2>
          <p>Pequeños rituales de cada estancia — sin prisa, sin ruido.</p>
        </div>
      </div>

      <div className="experiencias" role="list">
        {ITEMS.map((x) => (
          <a key={x.t} href="#habitaciones" className="experiencia" role="listitem" style={{ textDecoration: 'none' }}>
            <img src={`/img/${x.img}`} alt={x.t} loading="lazy" />
            <b>{x.t}</b>
            <span>{x.d}</span>
          </a>
        ))}
      </div>
    </section>
  )
}
