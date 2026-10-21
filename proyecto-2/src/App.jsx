// La Solana · Casa rural — portada pública (HU-09) construida sobre la API REST de Supabase.
//
// Flujo: catálogo público (HU-03) → buscador (filtra por capacidad) → Reservar exige
// sesión (HU-04 vía RLS; CA-4.1) → alta/login (HU-01/02) → «Mis reservas» (HU-05) →
// cancelar (HU-06). La clave pública (anon) viaja en .env.local: ver src/lib/supabase.js.

import { useEffect, useState, useCallback } from 'react'
import { supabase } from './lib/supabase'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Experiencias from './components/Experiencias'
import Habitaciones from './components/Habitaciones'
import Entorno from './components/Entorno'
import MisReservas from './components/MisReservas'
import PanelAdmin from './components/PanelAdmin'
import AuthModal from './components/AuthModal'
import BookingModal from './components/BookingModal'
import Footer from './components/Footer'
import { tomarReservaPendiente } from './lib/ayudas'

export default function App() {
  const [sesion, setSesion] = useState({ user: null, perfil: null })
  const [habitaciones, setHabitaciones] = useState([])
  const [estadoCat, setEstadoCat] = useState({ tipo: 'cargando', mensaje: 'Abriendo el catálogo…' })
  const [filtros, setFiltros] = useState({ desde: '', hasta: '', huespedes: '' })
  const [modalAuth, setModalAuth] = useState(null) // 'entrar' | 'registro' | null
  const [razonAuth, setRazonAuth] = useState('')
  const [modalReserva, setModalReserva] = useState(null) // habitación elegida
  const [reservas, setReservas] = useState([])
  const [estadoReservas, setEstadoReservas] = useState({ tipo: 'ok', mensaje: '' })
  const [cargandoReservas, setCargandoReservas] = useState(false)
  const [toast, setToast] = useState('')

  /* ---------- Firma «color by chapter»: la tinta del mástil cambia con el capítulo ---------- */
  useEffect(() => {
    const mastil = document.querySelector('.nav')
    if (!mastil) return
    const secciones = Array.from(document.querySelectorAll('[data-tinta]')).filter((el) => el !== mastil)
    const io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) mastil.dataset.tinta = e.target.dataset.tinta
        }
      },
      { rootMargin: '0px 0px -62% 0px' }
    )
    secciones.forEach((s) => io.observe(s))
    mastil.dataset.tinta = 'claro'
    return () => io.disconnect()
  }, [sesion.user, sesion.perfil])

  /* ---------- Entradas por capítulo: cada parte sube al entrar en pantalla ---------- */
  useEffect(() => {
    let io
    const preparar = (el) => {
      el.style.setProperty('--i', (Array.from(el.parentElement?.children ?? []).indexOf(el)) % 5)
      io?.observe(el)
    }

    io = new IntersectionObserver(
      (entradas) => {
        for (const e of entradas) {
          if (e.isIntersecting) {
            e.target.classList.add('revelado')
            io.unobserve(e.target)
          }
        }
      },
      { threshold: 0.12 }
    )

    document.querySelectorAll('[data-reveal]').forEach(preparar)

    /* los nodos que llegan tarde (catálogo, reservas) revelan igual */
    const refleja = new MutationObserver((mutaciones) => {
      for (const m of mutaciones) {
        m.addedNodes.forEach((n) => {
          if (!(n instanceof HTMLElement)) return
          if (n.hasAttribute?.('data-reveal')) preparar(n)
          n.querySelectorAll?.('[data-reveal]').forEach(preparar)
        })
      }
    })
    refleja.observe(document.body, { childList: true, subtree: true })

    return () => { io.disconnect(); refleja.disconnect() }
  }, [sesion.user, sesion.perfil])

  /* ---------- Toast ---------- */
  const avisar = useCallback((mensaje) => {
    setToast(mensaje)
    window.clearTimeout(avisar._t)
    avisar._t = window.setTimeout(() => setToast(''), 4200)
  }, [])

  /* ---------- Sesión (auth.statechange) ---------- */
  useEffect(() => {
    function aplicar(data) {
      const user = data?.session?.user ?? null
      if (!user) {
        setSesion({ user: null, perfil: null })
        setReservas([])
        return
      }
      setSesion((s) => ({ ...s, user }))
    }

    supabase.auth.getSession().then(({ data }) => aplicar(data))
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nueva) => aplicar({ session: nueva }))
    return () => sub.subscription.unsubscribe()
  }, [])

  /* ---------- Perfil (nombre/rol) cuando hay usuario ---------- */
  useEffect(() => {
    if (!sesion.user) return
    let vivo = true
    supabase
      .from('perfiles')
      .select('nombre_completo, rol')
      .eq('id', sesion.user.id)
      .single()
      .then(({ data }) => {
        if (vivo && data) setSesion((s) => ({ ...s, perfil: data }))
      })
    return () => { vivo = false }
  }, [sesion.user])

  /* ---------- Catálogo público (GET → SELECT, solo activas) ---------- */
  useEffect(() => {
    supabase
      .from('habitaciones')
      .select('id, nombre, descripcion, capacidad, precio_noche')
      .eq('activa', true)
      .order('id')
      .then(({ data, error }) => {
        if (error) {
          setEstadoCat({
            tipo: 'error',
            mensaje: 'No se pudo leer el catálogo. Revisa .env.local y aplica docs/esquema.sql en el SQL Editor.',
          })
        } else if (data.length === 0) {
          setEstadoCat({
            tipo: 'aviso',
            mensaje: 'El catálogo está vacío: siembra las habitaciones con docs/esquema.sql en Supabase.',
          })
        } else {
          setHabitaciones(data)
          setEstadoCat({ tipo: 'ok', mensaje: '' })
        }
      })
  }, [])

  /* ---------- Mis reservas cuando hay sesión (RLS devuelve solo las propias) ---------- */
  const refrescarReservas = useCallback(async () => {
    setCargandoReservas(true)
    const { data, error } = await supabase
      .from('reservas')
      .select('*, habitacion:habitaciones(id, nombre)')
      .order('fecha_entrada', { ascending: true })
    setCargandoReservas(false)
    if (error) {
      setEstadoReservas({ tipo: 'error', mensaje: 'No se pudieron leer tus reservas: ' + error.message })
      return
    }
    setReservas(data ?? [])
    setEstadoReservas({ tipo: 'ok', mensaje: '' })
  }, [])

  useEffect(() => {
    if (!sesion.user) return
    refrescarReservas()
  }, [sesion.user, refrescarReservas])

  /* ---------- Reserva pendiente (HU-10): creada al autenticarse ----------
     Cubre el regreso de Google (redirección) y la confirmación por email.
     Punto ÚNICO de inserción para evitar reservas duplicadas. */
  useEffect(() => {
    if (!sesion.user) return
    const pendiente = tomarReservaPendiente()
    if (!pendiente) return

    let vivo = true
    ;(async () => {
      const error = await insertarReserva(sesion.user, pendiente)
      if (!vivo) return
      if (error) {
        avisar('Tu sesión está lista, pero la reserva no se pudo crear: ' + error)
        return
      }
      setModalReserva(null)
      await refrescarReservas()
      avisar('¡Reserva confirmada! Te esperamos en La Solana.')
      document.getElementById('mis-reservas')?.scrollIntoView({ behavior: 'smooth' })
    })()
    return () => { vivo = false }
  }, [sesion.user, refrescarReservas, avisar])

  /* ---------- Acciones ---------- */
  function abrirAuth(pane, razon = '') {
    setRazonAuth(razon)
    setModalAuth(pane)
  }

  /** HU-10: reservar ya no exige sesión; la cuenta se pide al final. */
  function reservar(habitacion) {
    setModalReserva(habitacion)
  }

  /** Inserción centralizada de reservas (POST → INSERT). Devuelve el error o ''. */
  async function insertarReserva(user, datos) {
    const { error } = await supabase.from('reservas').insert({
      usuario_id: user.id,
      ...datos,
    })
    return error ? (error.message || 'La API REST rechazó la reserva.') : ''
  }

  async function cancelarReserva(r) {
    const { error } = await supabase
      .from('reservas')
      .update({ estado: 'cancelada' })
      .eq('id', r.id)
    if (error) {
      avisar('No se pudo cancelar: ' + error.message)
      return
    }
    setReservas((lista) => lista.map((x) => (x.id === r.id ? { ...x, estado: 'cancelada' } : x)))
    avisar('Reserva cancelada. Si cambias de idea, ya sabes dónde estamos.')
  }

  /** Confirmada desde el modal (con sesión previa): refresca y avisa. */
  async function reservaConfirmada(datos) {
    const error = await insertarReserva(sesion.user, datos)
    if (!error) {
      await refrescarReservas()
      avisar('¡Reserva creada! Queda pendiente de confirmación del anfitrión.')
    }
    return error
  }

  async function salir() {
    await supabase.auth.signOut()
    avisar('Sesión cerrada. Hasta pronto.')
  }

  /* ---------- Catálogo filtrado por capacidad ---------- */
  const visibles = filtros.huespedes
    ? habitaciones.filter((h) => h.capacidad >= filtros.huespedes)
    : habitaciones

  return (
    <>
      <Navbar sesion={sesion} esAdmin={sesion.perfil?.rol === 'administrador'} onSalir={salir} abrirAuth={abrirAuth} />

      <main>
        <Hero filtros={filtros} setFiltros={setFiltros} />
        <Habitaciones
          habitaciones={visibles}
          estadoCat={estadoCat}
          filtros={filtros}
          onReservar={reservar}
        />
        <Experiencias />
        <Entorno />
        {sesion.user && (
          <MisReservas
            reservas={reservas}
            estado={estadoReservas}
            cargando={cargandoReservas}
            onCancelar={cancelarReserva}
          />
        )}

        {/* HU-07: el rol lo decide la base de datos; sin rol admin, ni siquiera se monta */}
        {sesion.perfil?.rol === 'administrador' && <PanelAdmin onAvisar={avisar} />}
      </main>

      <Footer />

      {modalAuth && (
        <AuthModal
          pane={modalAuth}
          setPane={setModalAuth}
          razon={razonAuth}
          sesion={sesion}
          cerrar={() => setModalAuth(null)}
          avisar={avisar}
        />
      )}

      {modalReserva && (
        <BookingModal
          sesion={sesion}
          habitacion={modalReserva}
          filtros={filtros}
          onConfirmada={reservaConfirmada}
          cerrar={() => setModalReserva(null)}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </>
  )
}
