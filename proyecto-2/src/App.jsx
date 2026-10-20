import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

// v0.1.0 — Configuración inicial.
// Primera interacción real con la API REST de Supabase: GET → SELECT
// sobre el catálogo de habitaciones (tabla creada en docs/esquema.sql).
// Las siguientes misiones construyen HU-01/02 (autenticación) y
// HU-04/05/06 (gestión de reservas).

export default function App() {
  const [estado, setEstado] = useState({
    tipo: 'cargando',
    mensaje: 'Comprobando conexión con Supabase…',
  })
  const [habitaciones, setHabitaciones] = useState([])

  useEffect(() => {
    comprobarConexion()
  }, [])

  async function comprobarConexion() {
    setEstado({ tipo: 'cargando', mensaje: 'Comprobando conexión con Supabase…' })

    const { data, error } = await supabase
      .from('habitaciones')
      .select('id, nombre, descripcion, capacidad, precio_noche')
      .eq('activa', true)
      .order('nombre')

    if (error) {
      setEstado({
        tipo: 'error',
        mensaje:
          'La consulta falló. Revisa proyecto-2/.env.local y verifica que docs/esquema.sql se haya aplicado en el SQL Editor de Supabase.',
      })
      return
    }

    setHabitaciones(data)
    setEstado(
      data.length === 0
        ? {
            tipo: 'aviso',
            mensaje:
              'Conexión correcta, pero el catálogo está vacío: aplica docs/esquema.sql en el SQL Editor de Supabase.',
          }
        : { tipo: 'ok', mensaje: 'Conexión verificada con la API REST de Supabase.' },
    )
  }

  return (
    <main>
      <h1>Proyecto 2 · Casa Rural</h1>
      <p className="mision">
        v0.1.0 — Configuración inicial completada (cliente de Supabase listo).
        Próximas misiones: autenticación (HU-01/02) y gestión de reservas (HU-04/05/06).
      </p>

      <section className={`tarjeta ${estado.tipo}`}>
        <h2>Estado de la conexión</h2>
        <p>{estado.mensaje}</p>
      </section>

      <section className="tarjeta">
        <h2>Catálogo de habitaciones (GET → SELECT)</h2>
        {habitaciones.length > 0 ? (
          <ul>
            {habitaciones.map((h) => (
              <li key={h.id}>
                <strong>{h.nombre}</strong> · capacidad {h.capacidad} ·{' '}
                {h.precio_noche} €/noche
                {h.descripcion && <span className="desc"> — {h.descripcion}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="desc">Sin habitaciones para mostrar (el catálogo se puebla desde docs/esquema.sql).</p>
        )}
        <button onClick={comprobarConexion}>Volver a comprobar</button>
      </section>
    </main>
  )
}
