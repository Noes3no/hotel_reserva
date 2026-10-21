// Modal de autenticación (HU-01 registro / HU-02 sesión) con Supabase Auth.

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthModal({ pane, setPane, razon = '', cerrar, avisar }) {
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [error, setError] = useState('')
  const [pendiente, setPendiente] = useState(false)

  async function enviar(e) {
    e.preventDefault()
    setError('')

    if (!email.includes('@')) return setError('Introduce un correo electrónico válido.')
    if (clave.length < 8) return setError('La contraseña necesita al menos 8 caracteres.')

    setPendiente(true)
    if (pane === 'registro') {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password: clave,
        options: { data: { nombre_completo: nombre } },
      })
      setPendiente(false)
      if (err) return setError(err.message)
      if (!data.session) {
        avisar('Cuenta creada. Revisa tu correo para confirmar el alta y después inicia sesión.')
        setPane('entrar')
      } else {
        avisar('¡Bienvenido a La Solana!')
        cerrar()
      }
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password: clave })
    setPendiente(false)
    if (err) {
      setError(err.status === 400 ? 'Correo o contraseña incorrectos.' : err.message)
      return
    }
    avisar('Sesión iniciada. ¡Te echábamos de menos!')
    cerrar()
  }

  async function continuarConGoogle() {
    setPendiente(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    setPendiente(false)
    if (err) {
      setError(
        err.message?.includes('provider') || err.status === 400 || err.status === 422
          ? 'Google no está activado todavía en el proyecto Supabase (Authentication → Providers → Google). Usa el registro por email.'
          : err.message,
      )
    }
  }

  function cerrarConTecla(e) {
    if (e.key === 'Escape') cerrar()
  }

  return (
    <div className="manto" onClick={cerrar} onKeyDown={cerrarConTecla}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-top">
          <h2 id="auth-titulo">{pane === 'registro' ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h2>
          <button className="btn-x" onClick={cerrar} aria-label="Cerrar">✕</button>
        </div>

        <div className="auth-tabs" role="group" aria-label="Alternar entre registro y inicio de sesión">
          <button aria-pressed={pane === 'registro'} onClick={() => setPane('registro')}>Registrarse</button>
          <button aria-pressed={pane === 'entrar'} onClick={() => setPane('entrar')}>Iniciar sesión</button>
        </div>

        {razon && <p className="nota" style={{ marginTop: -12, marginBottom: 14 }}>{razon}</p>}

        <form className="form-auth" onSubmit={enviar} noValidate>
          {pane === 'registro' && (
            <div className="grupo">
              <label htmlFor="a-nombre">Nombre completo</label>
              <input
                id="a-nombre" placeholder="Ana Ruiz de la Vega" value={nombre} required
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          )}

          <div className="grupo">
            <label htmlFor="a-email">Correo electrónico</label>
            <input
              id="a-email" type="email" placeholder="tu@correo.com" value={email} required
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grupo">
            <label htmlFor="a-clave">Contraseña</label>
            <input
              id="a-clave" type="password" placeholder="Mínimo 8 caracteres" value={clave} required minLength={8}
              onChange={(e) => setClave(e.target.value)}
            />
          </div>

          {error && <p className="error-msg" role="alert">{error}</p>}

          <button type="button" className="btn btn-google" disabled={pendiente} onClick={continuarConGoogle}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
              <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
              <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z" />
              <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
            </svg>
            Continuar con Google
          </button>

          <p className="separador"><span>o con tu correo</span></p>

          <button className="btn btn-clay" disabled={pendiente}>
            {pendiente ? 'Un momento…' : pane === 'registro' ? 'Crear cuenta' : 'Entrar'}
          </button>

          <p className="nota">
            {pane === 'registro'
              ? 'Se creará tu perfil con rol «cliente»: solo verás y gestionarás tus reservas.'
              : 'Reservar exige sesión iniciada: crea cuenta o entra con la tuya.'}
          </p>
        </form>
      </div>
    </div>
  )
}
