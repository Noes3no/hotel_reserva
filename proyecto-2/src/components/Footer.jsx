// Pie con contacto, índice y créditos de fotografía (licencias libres).

export default function Footer() {
  return (
    <footer className="pie">
      <div className="pie-inner">
        <div>
          <a className="logo" href="#inicio" style={{ marginBottom: 12 }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M3 20l6-9 4 6 3-4 5 7z" />
              <circle cx="17.5" cy="5.5" r="2" />
            </svg>
            La Solana
          </a>
          <p style={{ maxWidth: '34ch' }}>
            Casa rural en la Sierra del Aguilar. Piedra, madera y silencio desde 1926.
            Camino del Tejo, 4 · 09123 · Burgos.
          </p>
        </div>

        <div>
          <h3>Contacto</h3>
          <ul>
            <li><a href="mailto:hola@lasolana.es">hola@lasolana.es</a></li>
            <li><a href="tel:+34947100192">(+34) 947 100 192</a></li>
            <li>De 9:00 a 20:00, todos los días</li>
          </ul>
        </div>

        <div>
          <h3>La web</h3>
          <ul>
            <li><a href="#habitaciones">Habitaciones</a></li>
            <li><a href="#experiencias">Experiencias</a></li>
            <li><a href="#entorno">El entorno</a></li>
            <li>
              <small>Fotografías de licencia libre (Unsplash) · ver <code>public/img/CREDITOS.txt</code></small>
            </li>
          </ul>
        </div>
      </div>

      <div className="pie-legal">
        La Solana · Sistema de reservas sobre Supabase (API REST + RLS) · Proyecto 2
      </div>
    </footer>
  )
}
