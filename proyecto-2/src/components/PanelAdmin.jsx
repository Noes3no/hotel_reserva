// Panel de administración (HU-07): el administrador ve TODAS las reservas y las
// confirma o cancela. La base de datos decide quién es administrador:
// la tabla solo devuelve todas las filas si perfiles.rol = 'administrador'
// (RLS: `usuario_id = auth.uid() or es_administrador()`).
// Reglas respetadas: el cliente solo puede cancelar (R7) — aquí opera el admin;
// fechas, solapes y capacidad siguen validados por los triggers.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { euros, imgHabitacion, noches } from '../lib/ayudas'

const FILTROS = ['todas', 'pendiente', 'confirmada', 'cancelada']

export default function PanelAdmin({ onAvisar }) {
  const [reservas, setReservas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [estado, setEstado] = useState({ tipo: 'ok', mensaje: '' })
  const [filtro, setFiltro] = useState('todas')
  const [busqueda, setBusqueda] = useState('')

  /* Todas las reservas con cliente y habitación incrustados (SELECT + JOIN) */
  const cargar = useCallback(async () => {
    setCargando(true)
    const { data, error } = await supabase
      .from('reservas')
      .select('*, habitacion:habitaciones(id, nombre, precio_noche), cliente:perfiles(nombre_completo)')
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

  /** PATCH estado (UPDATE → confirmada / cancelada). Devuelve un aviso en el toast. */
  async function cambiarEstado(r, nuevo) {
    const { error } = await supabase.from('reservas').update({ estado: nuevo }).eq('id', r.id)
    if (error) {
      onAvisar('No se pudo actualizar la reserva: ' + error.message)
      return
    }
    setReservas((lista) => lista.map((x) => (x.id === r.id ? { ...x, estado: nuevo } : x)))
    onAvisar(nuevo === 'confirmada' ? 'Reserva confirmada para ' + (r.cliente?.nombre_completo ?? 'el cliente') : 'Reserva cancelada.')
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
    <section className="seccion" id="panel-admin">
      <div className="cabecera-seccion">
        <div>
          <span className="eyebrow">HU-07 · solo visible al rol «administrador»</span>
          <h2>Panel de reservas del negocio</h2>
          <p>
            Todas las reservas de todos los clientes (RLS con <code>es_administrador()</code>). Confirma entradas o
            cancela liberando la habitación; el resto de reglas las sigue garantizando la base de datos.
          </p>
        </div>
      </div>

      <div className="admin-metricas">
        <div className="metrica"><b>{metricas.total}</b><span>reservas totales</span></div>
        <div className="metrica metrica-warn"><b>{metricas.pendientes}</b><span>pendientes de confirmar</span></div>
        <div className="metrica metrica-ok"><b>{metricas.confirmadas}</b><span>confirmadas</span></div>
        <div className="metrica"><b>{euros(metricas.ingreso)}</b><span>ingreso estimado (no canceladas)</span></div>
      </div>

      {estado.tipo === 'error' && <p className="aviso-panel error" role="alert">{estado.mensaje}</p>}

      <div className="admin-controles">
        <div className="chips" role="tablist" aria-label="Filtrar por estado">
          {FILTROS.map((f) => (
            <button
              key={f}
              className={`chip ${filtro === f ? 'chip-activa' : ''}`}
              onClick={() => setFiltro(f)}
              aria-pressed={filtro === f}
            >
              {f === 'todas' ? 'todas' : f}
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
        <p className="aviso-panel">No hay reservas con ese filtro aún. Cambia el estado o limpia la búsqueda.</p>
      )}

      <div style={{ display: 'grid', gap: 14 }}>
        {visibles.map((r) => {
          const n = noches(r.fecha_entrada, r.fecha_salida)
          const precio = n * Number(r.habitacion?.precio_noche ?? 0)
          const cancelada = r.estado === 'cancelada'
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
                <span className={`badge ${ESTADOS.includes(r.estado) ? r.estado : 'pendiente'}`}>{r.estado}</span>
                {r.estado === 'pendiente' && (
                  <button className="btn btn-clay" onClick={() => cambiarEstado(r, 'confirmada')}>
                    Confirmar
                  </button>
                )}
                {r.estado === 'confirmada' && (
                  <button className="btn btn-ghost" onClick={() => cambiarEstado(r, 'cancelada')}>
                    Cancelar
                  </button>
                )}
                {cancelada && <span className="admin-bloqueada">libera la habitación</span>}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
