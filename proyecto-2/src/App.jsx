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
import AuthModal from './components/AuthModal'
import BookingModal from './components/BookingModal'
import Footer from './components/Footer'
import { hoyISO } from './lib/ayudas'

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
  useEffect(() => {
    if (!sesion.user) return
    let vivo = true
    setCargandoReservas(true)
    supabase
      .from('reservas')
      .select('*, habitacion:habitaciones(id, nombre)')
      .order('fecha_entrada', { ascending: true })
      .then(({ data, error }) => {
        if (!vivo) return
        setCargandoReservas(false)
        if (error) {
          setEstadoReservas({ tipo: 'error', mensaje: 'No se pudieron leer tus reservas: ' + error.message })
        } else {
          setReservas(data)
          setEstadoReservas({ tipo: 'ok', mensaje: '' })
        }
      })
    return () => { vivo = false }
  }, [sesion.user])

  /* ---------- Acciones ---------- */
  function abrirAuth(pane, razon = '') {
    setRazonAuth(razon)
    setModalAuth(pane)
  }

  function reservar(habitacion) {
    if (!sesion.user) {
      avisar('Para reservar necesitas una cuenta: abre el registro o inicia sesión.')
      abrirAuth('registro', 'Para reservar «' + habitacion.nombre + '» inicia sesión o crea tu cuenta.')
      return
    }
    setModalReserva(habitacion)
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

  function reservaCreada() {
    setModalReserva(null)
    avisar('¡Reserva creada! Queda pendiente de confirmación del anfitrión.')
    if (sesion.user) {
      supabase
        .from('reservas')
        .select('*, habitacion:habitaciones(id, nombre)')
        .order('fecha_entrada', { ascending: true })
        .then(({ data }) => data && setReservas(data))
    }
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
      <Navbar sesion={sesion} onSalir={salir} abrirAuth={abrirAuth} />

      <main>
        <Hero filtros={filtros} setFiltros={setFiltros} />
        <Experiencias />
        <Habitaciones
          habitaciones={visibles}
          estadoCat={estadoCat}
          filtros={filtros}
          sesion={sesion}
          onReservar={reservar}
        />
        <Entorno />
        {sesion.user && (
          <MisReservas
            reservas={reservas}
            estado={estadoReservas}
            cargando={cargandoReservas}
            onCancelar={cancelarReserva}
          />
        )}
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
          filtros={{ ...filtros, desde: filtros.desde || hoyISO() }}
          onCreado={reservaCreada}
          cerrar={() => setModalReserva(null)}
        />
      )}

      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </>
  )
}
