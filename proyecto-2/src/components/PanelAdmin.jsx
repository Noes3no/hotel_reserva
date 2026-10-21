// Panel de administración (HU-07): el propietario del negocio ve TODAS las
// reservas y las gestiona: confirmar, cancelar, posponer (cambiar fechas) o
// ajustar huéspedes. La base de datos decide quién es administrador:
// la tabla solo devuelve todas las filas si perfiles.rol = 'administrador'.
// Las reglas de negocio (solapes, capacidad, fechas futuras) las sigue
// garantizando Supabase: aquí solo se manda el PATCH.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { euros, hoyISO, imgHabitacion, noches } from '../lib/ayudas'

const FILTROS = ['todas', 'pendiente', 'confirmada', 'cancelada']

export default function PanelAdmin({ onAvisar }) {
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estado, setEstado] = useState({ tipo: 'ok', mensaje: '' })
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')
  const [editando, setEditando] = useState(null) // id de la reserva abierta
  const [borrador, setBorrador] = useState({ fecha_entrada: '', fecha_salida: '', num_huespedes: '' })
  const [guardando, setGuardando] = useState(false)
  const hoy = hoyISO()

  /* Todas las reservas con cliente y habitación incrustados (SELECT + JOIN) */
  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('reservas')
      .select('*, habitacion:habitaciones(id, nombre, precio_noche, capacidad), cliente:perfiles(nombre_completo)')
      .order('fecha_entrada', { ascending: true })
    setCargando(false)
    if (error) {
      setEstado({ tipo: 'error', mensaje: 'No se pudieron leer las reservas: ' + error.message })
      return
    }
    setReservas(data ?? [])
    setEstado({ tipo: 'ok', mensaje: '' })
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  /** PATCH parcial sobre una reserva (UPDATE). Actualiza la copia local. */
  async function patchReserva(r, cambios, mensajeExito) {
    const { error } = await supabase.from('reservas').update(cambios).eq('id', r.id)
    if (error) {
      onAvisar('La base de datos rechazó el cambio: ' + error.message)
      return false
    }
    setReservas((lista) => lista.map((x) => (x.id === r.id ? { ...x, ...cambios } : x)))
    onAvisar(mensajeExito)
    return true
  }

  async function confirmar(r) {
    await patchReserva(r, { estado: 'confirmada' }, `Reserva confirmada para ${r.cliente?.nombre_completo ?? 'el cliente'}.`)
  }

  async function cancelar(r) {
    await patchReserva(r, { estado: 'cancelada' }, 'Reserva cancelada: la habitación vuelve a quedar libre.')
    setEditando((id) => (id === r.id ? null : id))
  }

  /** HU-07 CA-7.5/7.6: posponer o ajustar fechas y huéspedes. */
  function abrirAjuste(r) {
    setEditando(r.id)
    setBorrador({ fecha_entrada: r.fecha_entrada, fecha_salida: r.fecha_salida, num_huespedes: String(r.num_huespedes) })
  }

  async function guardarAjuste(r) {
    const entrada = borrador.fecha_entrada
    const salida = borrador.fecha_salida
    const huespedes = Number(borrador.num_huespedes)

    if (!entrada || !salida) return onAvisar('Elige las dos fechas de la estancia.')
    if (salida <= entrada) return onAvisar('La salida debe ser posterior a la llegada.')
    if (entrada < hoy) return onAvisar('No puedes posponer la reserva al pasado: la llegada debe ser de hoy en adelante.')
    if (!Number.isInteger(huespedes) || huespedes < 1 || huespedes > (r.habitacion?.capacidad ?? 20)) {
      return onAvisar(`Los huéspedes deben ir de 1 hasta ${r.habitacion?.capacidad ?? 'la capacidad'} (capacidad de la habitación).`)
    }

    setGuardando(true)
    const ok = await patchReserva(
      r,
      { fecha_entrada: entrada, fecha_salida: salida, num_huespedes: huespedes },
      'Reserva actualizada: fechas y huéspedes guardados.',
    )
    setGuardando(false)
    if (ok) setEditando(null)
  }

  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return reservas.filter(
      (r) =>
        (filtro === 'todas' || r.estado === filtro) &&
        (!q ||
          (r.cliente?.nombre_completo ?? '').toLowerCase().includes(q) ||
          (r.habitacion?.nombre ?? '').toLowerCase().includes(q)),
    )
  }, [reservas, filtro, busqueda])

  const metricas = useMemo(() => {
    const activas = reservas.filter((r) => r.estado !== 'cancelada')
    return {
      total: reservas.length,
      pendientes: reservas.filter((r) => r.estado === 'pendiente').length,
      confirmadas: reservas.filter((r) => r.estado === 'confirmada').length,
      ingreso: activas.reduce(
        (t, r) => t + noches(r.fecha_entrada, r.fecha_salida) * Number(r.habitacion?.precio_noche ?? 0),
        0,
      ),
    }
  }, [reservas])

  return (
    <section className="seccion" id="panel-admin" data-tinta="oscuro" data-reveal>
      <div className="cabecera-seccion">
        <h2>Todas las reservas del negocio</h2>
        <p>
          Confirmas, cancelas, pospones fechas o ajustas huéspedes (HU-07). La base de datos
          vela por las reglas: si un cambio choca con otra reserva o la capacidad, te lo dirá.
        </p>
      </div>

      <div className="admin-metricas">
        <div className="metrica"><b>{metricas.total}</b><span>reservas totales</span></div>
        <div className="metrica metrica-warn"><b>{metricas.pendientes}</b><span>pendientes de confirmar</span></div>
        <div className="metrica metrica-ok"><b>{metricas.confirmadas}</b><span>confirmadas</span></div>
        <div className="metrica"><b>{euros(metricas.ingreso)}</b><span>ingreso estimado (no canceladas)</span></div>
      </div>

      {estado.tipo === 'error' && <p className="aviso-panel error" role="alert">{estado.mensaje}</p>}

      <div className="admin-controles">
        <div className="chips" role="group" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f}
              className={`chip ${filtro === f ? 'chip-activa' : ''}`}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
            >
              {f}
            </button>
          ))}
        </div>
        <input
          type="search"
          className="admin-buscar"
          placeholder="Buscar por cliente o habitación…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          aria-label="Buscar reservas"
        />
        <button className="btn btn-ghost" onClick={cargar}>Recargar</button>
      </div>

      {cargando && <div className="skeleton" style={{ aspectRatio: 'auto', height: 420 }} />}

      {!cargando && visibles.length === 0 && estado.tipo !== 'error' && (
        <p className="aviso-panel">No hay reservas con ese filtro todavía: cambia el estado o borra la búsqueda.</p>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {visibles.map((r) => {
          const n = noches(r.fecha_entrada, r.fecha_salida)
          const precio = n * Number(r.habitacion?.precio_noche ?? 0)
          const abierta = editando === r.id
          return (
            <article key={r.id} className="card-reserva">
              <img src={imgHabitacion(r.habitacion_id)} alt="" aria-hidden="true" loading="lazy" />
              <div className="reserva-datos">
                <b>
                  {r.habitacion?.nombre ?? `Habitación #${r.habitacion_id}`}
                  <span className="admin-cliente"> · {r.cliente?.nombre_completo ?? 'Cliente sin perfil'}</span>
                </b>
                <span>
                  Llegada {r.fecha_entrada} · salida {r.fecha_salida} · {n} {n === 1 ? 'noche' : 'noches'} ·{' '}
                  {r.num_huespedes} huéspedes
                </span>
                <span className="admin-precio">Estimado: {euros(precio)}</span>
              </div>

              <div className="reserva-pie">
                <span className={`badge ${r.estado}`}>{r.estado}</span>
                <button className="btn btn-ghost" onClick={() => (abierta ? setEditando(null) : abrirAjuste(r))}>
                  {abierta ? 'Cerrar' : 'Ajustar'}
                </button>
                {!abierta && r.estado === 'pendiente' && (
                  <button className="btn btn-clay" onClick={() => confirmar(r)}>Confirmar</button>
                )}
                {!abierta && r.estado !== 'cancelada' && (
                  <button className="btn btn-ghost" onClick={() => cancelar(r)}>Cancelar</button>
                )}
                {r.estado === 'cancelada' && <span className="admin-bloqueada">libera la habitación</span>}
              </div>

              {abierta && (
                <div className="reserva-editor">
                  <div className="grupo">
                    <label htmlFor={`h-ent-${r.id}`}>Nueva llegada</label>
                    <input
                      id={`h-ent-${r.id}`}
                      type="date"
                      min={hoy}
                      value={borrador.fecha_entrada}
                      onChange={(e) =>
                        setBorrador((b) => ({
                          ...b,
                          fecha_entrada: e.target.value,
                          fecha_salida: b.fecha_salida && b.fecha_salida <= e.target.value ? '' : b.fecha_salida,
                        }))
                      }
                    />
                  </div>
                  <div className="grupo">
                    <label htmlFor={`h-sal-${r.id}`}>Nueva salida</label>
                    <input
                      id={`h-sal-${r.id}`}
                      type="date"
                      min={borrador.fecha_entrada || hoy}
                      value={borrador.fecha_salida}
                      onChange={(e) => setBorrador((b) => ({ ...b, fecha_salida: e.target.value }))}
                    />
                  </div>
                  <div className="grupo">
                    <label htmlFor={`h-hue-${r.id}`}>Huéspedes (hasta {r.habitacion?.capacidad ?? '—'})</label>
                    <input
                      id={`h-hue-${r.id}`}
                      type="number"
                      min="1"
                      max={r.habitacion?.capacidad ?? 20}
                      value={borrador.num_huespedes}
                      onChange={(e) => setBorrador((b) => ({ ...b, num_huespedes: e.target.value }))}
                    />
                  </div>
                  <button className="btn btn-clay" disabled={guardando} onClick={() => guardarAjuste(r)}>
                    Guardar
                  </button>
                  <button className="btn btn-ghost" onClick={() => setEditando(null)}>Cerrar</button>
                </div>
              )}
            </article>
          )
        })}
      </div>
    </section>
  )
}
