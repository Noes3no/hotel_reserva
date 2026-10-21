// Modal de reserva en dos pasos (HU-04 + HU-10).
//
// Paso 1 «datos»: habitación, fechas ≥ hoy (CA-4.2), salida > entrada (CA-4.3),
//   huéspedes ≤ capacidad (CA-4.4) y total — sin exigir sesión (CA-10.1).
// Paso 2 «último paso» (solo sin sesión): crear cuenta por email, entrar
//   o continuar con Google (CA-10.2). Tras autenticarse, App crea la reserva
//   automáticamente con los datos guardados (CA-10.3).
// Con sesión previa: el paso 2 se salta y la reserva se crea al continuar.

import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { hoyISO, noches, euros, imgHabitacion, guardarReservaPendiente, limpiarReservaPendiente } from '../lib/ayudas'

export default function BookingModal({ sesion, habitacion, filtros, onConfirmada, cerrar }) {
  const hoy = hoyISO()
  const manana = (() => {
    const d = new Date(filtros.desde || hoy)
    d.setDate(d.getDate() + 2)
    return d.toLocaleDateString('en-CA')
  })()

  const [paso, setPaso] = useState('datos') // datos | ultimo | exito
  const [desde, setDesde] = useState(filtros.desde || '')
  const [hasta, setHasta] = useState(manana)
  const [huespedes, setHuespedes] = useState(Math.min(2, habitacion.capacidad))
  const [error, setError] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Último paso: autenticación
  const [modoAuth, setModoAuth] = useState('registro') // registro | entrar
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [clave, setClave] = useState('')
  const [avisoEmail, setAvisoEmail] = useState('')

  const n = (() => {
    if (!desde || !hasta || hasta <= desde) return 0
    return noches(desde, hasta)
  })()
  const total = n * Number(habitacion.precio_noche)

  function datosReserva() {
    return {
      habitacion_id: habitacion.id,
      fecha_entrada: desde,
      fecha_salida: hasta,
      num_huespedes: huespedes,
    }
  }

  function validar() {
    if (!desde || !hasta) return 'Elige la fecha de llegada y de salida.'
    if (desde < hoy) return 'Queda prohibido reservar fechas del pasado: la llegada debe ser a partir de hoy.'
    if (hasta <= desde) return 'La salida debe ser posterior a la llegada.'
    if (huespedes < 1 || huespedes > habitacion.capacidad) {
      return `La habitación ${habitacion.nombre} admite hasta ${habitacion.capacidad} huéspedes.`
    }
    return ''
  }

  /* Paso 1 → continuar */
  async function continuar(e) {
    e.preventDefault()
    setError('')
    setAvisoEmail('')

    const msg = validar()
    if (msg) return setError(msg)

    if (sesion.user) {
      // CA-4.1: con sesión, la reserva se crea ahora mismo.
      setEnviando(true)
      const err = await onConfirmada(datosReserva())
      setEnviando(false)
      if (err) return setError(err)
      limpiarReservaPendiente()
      setPaso('exito')
      return
    }

    // CA-10.2: sin sesión, la autenticación es el último paso.
    guardarReservaPendiente(datosReserva())
    setPaso('ultimo')
  }

  /* Último paso: continuar con Google (OAuth; hay redirección externa) */
  async function continuarConGoogle() {
    setError('')
    setEnviando(true)
    const { error: err } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    setEnviando(false)
    if (err) {
      setError(
        err.message?.includes('provider') || err.status === 400 || err.status === 422
          ? 'Google no está activado todavía en el proyecto Supabase (Authentication → Providers → Google). Usa el registro por email o inténtalo más tarde.'
          : err.message,
      )
    }
    // Si todo va bien, la página navega a Google; al volver, App retoma la reserva pendiente (CA-10.3/10.4).
  }

  /* Último paso: registro o entrada con email y contraseña */
  async function enviarAuth(e) {
    e.preventDefault()
    setError('')
    setAvisoEmail('')

    if (!email.includes('@')) return setError('Introduce un correo electrónico válido.')
    if (clave.length < 8) return setError('La contraseña necesita al menos 8 caracteres.')

    setEnviando(true)
    if (modoAuth === 'registro') {
      const { data, error: err } = await supabase.auth.signUp({
        email,
        password: clave,
        options: { data: { nombre_completo: nombre } },
      })
      setEnviando(false)
      if (err) return setError(err.message)
      if (!data.session) {
        // Confirmación por correo activada: al confirmar y entrar, App creará la reserva sola.
        setAvisoEmail('Cuenta creada. Revisa tu correo y confirma el alta: al iniciar sesión, tu reserva quedará registrada automáticamente.')
      }
      return
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email, password: clave })
    setEnviando(false)
    if (err) return setError(err.status === 400 ? 'Correo o contraseña incorrectos.' : err.message)
    // Sesión activa: App detecta la reserva pendiente, la crea y cierra este modal.
  }

  function cerrarConTecla(e) {
    if (e.key === 'Escape') cerrar()
  }

  return (
    <div className="manto" onClick={cerrar} onKeyDown={cerrarConTecla}>
      <div
        className="modal amplio"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reserva-titulo"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="reserva-img" style={{ background: `url(${imgHabitacion(habitacion.id)}) center/cover` }} aria-hidden="true" />
        <div className="reserva-cuerpo">
          <div className="modal-top" style={{ marginBottom: 0 }}>
            <div className="reserva-titulo">
              <h2 id="reserva-titulo">{habitacion.nombre}</h2>
              <span className="precio">
                {euros(Number(habitacion.precio_noche))}
                <small> / noche</small>
              </span>
            </div>
            <button className="btn-x" onClick={cerrar} aria-label="Cerrar">✕</button>
          </div>

          {paso !== 'exito' && (
            <form className="form-auth" onSubmit={continuar} noValidate>
              <div className="fechas">
                <div className="grupo">
                  <label htmlFor="r-desde">Llegada</label>
                  <input
                    id="r-desde" type="date" min={hoy} value={desde} required
                    onChange={(e) => {
                      setDesde(e.target.value)
                      if (hasta && hasta <= e.target.value) {
                        const d = new Date(e.target.value)
                        d.setDate(d.getDate() + 1)
                        setHasta(d.toLocaleDateString('en-CA'))
                      }
                    }}
                  />
                </div>
                <div className="grupo">
                  <label htmlFor="r-hasta">Salida</label>
                  <input
                    id="r-hasta" type="date" min={desde || hoy} value={hasta} required
                    onChange={(e) => setHasta(e.target.value)}
                  />
                </div>
              </div>

              <div className="grupo">
                <label htmlFor="r-huespedes">Huéspedes · máximo {habitacion.capacidad}</label>
                <input
                  id="r-huespedes"
                  type="number"
                  min="1"
                  max={habitacion.capacidad}
                  value={huespedes}
                  onChange={(e) => setHuespedes(Number(e.target.value))}
                />
              </div>

              {error && <p className="error-msg" role="alert">{error}</p>}

              <div className="total">
                <span>
                  {n > 0 ? `${n} ${n === 1 ? 'noche' : 'noches'} · ${euros(Number(habitacion.precio_noche))}/noche` : 'Elige fechas válidas'}
                </span>
                <b>{n > 0 ? euros(total) : '—'}</b>
              </div>

              {paso === 'datos' ? (
                <button className="btn btn-clay" disabled={enviando || n === 0}>
                  {sesion.user ? (enviando ? 'Reservando…' : 'Confirmar reserva') : 'Continuar con la reserva'}
                </button>
              ) : (
                /* ÚLTIMO PASO (HU-10): autenticación para confirmar la reserva */
                <UltimoPaso
                  modoAuth={modoAuth}
                  setModoAuth={setModoAuth}
                  nombre={nombre} setNombre={setNombre}
                  email={email} setEmail={setEmail}
                  clave={clave} setClave={setClave}
                  continuarConGoogle={continuarConGoogle}
                  enviando={enviando}
                  avisoEmail={avisoEmail}
                  resumen={`${n} ${n === 1 ? 'noche' : 'noches'} · ${euros(total)}`}
                />
              )}
            </form>
          )}

          {paso === 'exito' && (
            <div className="exito">
              <p className="exito-icono" aria-hidden="true">✓</p>
              <h3>¡Reserva creada, {sesion.perfil?.nombre_completo ?? 'viajero'}!</h3>
              <p className="nota">
                {habitacion.nombre} · {desde} → {hasta} · {huespedes} huéspedes · {euros(total)}.
                Queda «pendiente» hasta que el anfitrión la confirme.
              </p>
              <div className="fechas">
                <a className="btn btn-clay" href="#mis-reservas" onClick={cerrar}>Ver mis reservas</a>
                <button className="btn btn-ghost" onClick={cerrar}>Seguir mirando</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ---------- Último paso: crear cuenta, entrar o Google ---------- */
function UltimoPaso({ modoAuth, setModoAuth, nombre, setNombre, email, setEmail, clave, setClave, continuarConGoogle, enviando, avisoEmail, resumen }) {
  return (
    <fieldset className="ultimo-paso" disabled={enviando}>
      <legend>
        Último paso: guarda tu reserva ({resumen}) creando tu cuenta
      </legend>

      <button type="button" className="btn btn-google" onClick={continuarConGoogle}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.7 9.5 24 9.5z" />
          <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" />
          <path fill="#FBBC05" d="M10.4 28.7c-.5-1.5-.8-3-.8-4.7s.3-3.2.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z" />
          <path fill="#34A853" d="M24 48c6.2 0 11.4-2 15.4-5.5l-7.5-5.8c-2.1 1.4-4.8 2.3-7.9 2.3-6.3 0-11.7-3.7-13.6-9l-7.8 6.1C6.5 42.6 14.6 48 24 48z" />
        </svg>
        Continuar con Google
      </button>

      <p className="separador"><span>o con tu correo</span></p>

      <div className="auth-tabs" role="group" aria-label="Alternar entre registro y inicio de sesión">
        <button type="button" aria-pressed={modoAuth === 'registro'} onClick={() => setModoAuth('registro')}>Crear cuenta</button>
        <button type="button" aria-pressed={modoAuth === 'entrar'} onClick={() => setModoAuth('entrar')}>Ya tengo cuenta</button>
      </div>

      {modoAuth === 'registro' && (
        <div className="grupo">
          <label htmlFor="r-nombre">Nombre completo</label>
          <input id="r-nombre" placeholder="Ana Ruiz de la Vega" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        </div>
      )}

      <div className="grupo">
        <label htmlFor="r-email">Correo electrónico</label>
        <input id="r-email" type="email" placeholder="tu@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="grupo">
        <label htmlFor="r-clave">Contraseña</label>
        <input id="r-clave" type="password" placeholder="Mínimo 8 caracteres" value={clave} onChange={(e) => setClave(e.target.value)} required minLength={8} />
      </div>

      {avisoEmail && <p className="aviso-panel ok" role="status">{avisoEmail}</p>}

      <button className="btn btn-clay" disabled={enviando}>
        {enviando ? 'Un momento…' : modoAuth === 'registro' ? 'Crear cuenta y confirmar reserva' : 'Entrar y confirmar reserva'}
      </button>

      <p className="nota">
        La reserva queda a tu nombre (CA-4.6) con estado «pendiente» hasta que el anfitrión la confirme.
      </p>
    </fieldset>
  )
}
