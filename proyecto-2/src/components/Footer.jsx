// Pie: «el reverso de la postal» — papel claro festoneado sobre el negro,
// firma de la casa, dirección enrevesada, sello de fotografía e imprenta.

export default function Footer() {
  return (
    <footer className="pie" data-tinta="oscuro">
      <div className="pie-papel">
        <p className="nota-prueba">
          WEB DE PRUEBA · reservas y datos ficticios · este prototipo no atiende peticiones reales.
        </p>
        <img className="pie-sello" src="/img/cabana-bosque.jpg" alt="La casa vista entre pinos" loading="lazy" />

        <div className="pie-firma">
          <div>
            <h3>Escríbenos, y nos vemos en el valle</h3>
            <p>
              Casa rural en la Sierra del Aguilar. Piedra, madera y silencio desde 1926.
              Respuesta el mismo día, de persona a persona. (Datos de demostración: este entorno no es real.)
            </p>
          </div>

          <div className="pie-dir">
            <a href="mailto:webtest@ejemplo.test">webtest@ejemplo.test</a>
            <a href="tel:+34000000000">+34 000 000 000</a>
            <span>Camino del Tejo, 4 · 09123 · Burgos (dirección ficticia)</span>
            <span>De 9:00 a 20:00, todos los días</span>
          </div>
        </div>

        <p className="pie-imprenta">
          WEB TEST · La Solana es un prototipo de práctica: los clientes, reservas y contactos son ficticios ·
          casa rural registrada nº 09-1234 (dato inventado) · fotografías de archivo con licencia libre ·
          niebla de bosque: Reza Rafizadeh (CC BY 3.0, Wikimedia Commons).
        </p>
      </div>
    </footer>
  )
}
