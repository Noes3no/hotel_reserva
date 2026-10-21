// Pie: «el reverso de la postal» — papel claro festoneado sobre el negro,
// firma de la casa, dirección enrevesada, sello de fotografía e imprenta.

export default function Footer() {
  return (
    <footer className="pie" data-tinta="oscuro">
      <div className="pie-papel">
        <img className="pie-sello" src="/img/cabana-bosque.jpg" alt="La casa vista entre pinos" loading="lazy" />

        <div className="pie-firma">
          <div>
            <h3>Escríbenos, y nos vemos en el valle</h3>
            <p>
              Casa rural en la Sierra del Aguilar. Piedra, madera y silencio desde 1926.
              Respuesta el mismo día, de persona a persona.
            </p>
          </div>

          <div className="pie-dir">
            <a href="mailto:hola@lasolana.es">hola@lasolana.es</a>
            <a href="tel:+34947100192">(+34) 947 100 192</a>
            <span>Camino del Tejo, 4 · 09123 · Burgos</span>
            <span>De 9:00 a 20:00, todos los días</span>
          </div>
        </div>

        <p className="pie-imprenta">
          La Solana · Casa rural registrada nº 09-1234 · reservas confirmadas al instante por la casa ·
          fotografías de archivo con licencia libre · niebla de bosque: Reza Rafizadeh (CC BY 3.0, Wikimedia Commons).
        </p>
      </div>
    </footer>
  )
}
