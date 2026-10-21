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
