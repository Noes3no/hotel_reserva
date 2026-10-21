// Centraliza el acceso a la API REST de Supabase (Backend como Servicio).
//
// ⚠️ Seguridad:
// - Solo viaja al navegador la clave PUBLICA (publishable / anon) vía .env.local.
// - La clave pública NO concede acceso total: lo que puede hacer el usuario
//   lo deciden las políticas RLS definidas en docs/esquema.sql.
// - La clave secret (service_role) omite RLS: nunca debe aparecer aquí.

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Faltan las variables de entorno de Supabase. ' +
      'Crea proyecto-2/.env.local con VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY ' +
      'y reinicia el servidor de desarrollo (npm run dev).',
  )
}

export const supabase = createClient(supabaseUrl, supabaseKey)

/** URL del proyecto (pública, útil para endpoints abiertos como /auth/v1/settings). */
export const SUPABASE_URL = String(supabaseUrl).replace(/\/$/, '')
