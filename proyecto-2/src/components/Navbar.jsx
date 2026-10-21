// Barra superior sticky: logo, anclas de secciones y estado de sesión.

import { inicial } from '../lib/ayudas'

export default function Navbar({ sesion, esAdmin, onSalir, abrirAuth }) {
  return (
    <header className="nav">
      <div className="nav-inner">
        <a className="logo" href="#inicio" aria-label="La Solana, ir al inicio">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 20l6-9 4 6 3-4 5 7z" />
            <circle cx="17.5" cy="5.5" r="2" />
          </svg>
          La Solana
        </a>

        <nav aria-label="Secciones">
          <ul className="nav-links">
            <li><a href="#habitaciones">Habitaciones</a></li>
            <li><a href="#experiencias">Experiencias</a></li>
            <li><a href="#entorno">El entorno</a></li>
            {sesion.user && <li><a href="#mis-reservas">Mis reservas</a></li>}
            {esAdmin && <li><a href="#panel-admin">Panel admin</a></li>}
          </ul>
        </nav>

        <div className="nav-cta">
          {sesion.user ? (
            <>
              <span className="usuario">
                <span className="avatar" aria-hidden="true">{inicial(sesion.perfil?.nombre_completo ?? sesion.user.email)}</span>
                {sesion.perfil?.nombre_completo ?? sesion.user.email}
              </span>
              <button className="btn btn-ghost" onClick={onSalir}>Salir</button>
            </>
          ) : (
            <>
              <button className="btn btn-ghost" onClick={() => abrirAuth('entrar')}>Iniciar sesión</button>
              <button className="btn btn-clay" onClick={() => abrirAuth('registro')}>Registrarse</button>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
