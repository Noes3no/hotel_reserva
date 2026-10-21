// ¿Está activado el proveedor Google en el proyecto Supabase?
// Consulta el endpoint público de configuración de Auth: si el proveedor no
// está activado, la interfaz oculta el botón y evita el salto a la página
// de error 400 («Unsupported provider») de la API.

import { useEffect, useState } from 'react'
import { SUPABASE_URL } from './supabase'

export default function usarGoogleActivo() {
  const [activo, setActivo] = useState(false)

  useEffect(() => {
    let vivo = true
    const clave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
    const url =
      `${SUPABASE_URL}/auth/v1/settings?apikey=${encodeURIComponent(clave)}`

    fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((cfg) => { if (vivo) setActivo(Boolean(cfg?.external?.google)) })
      .catch(() => { if (vivo) setActivo(false) })
    return () => { vivo = false }
  }, [])

  return activo
}
