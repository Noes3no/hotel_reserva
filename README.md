# Proyecto 2 — Sistema de Reservas para una Casa Rural

Materialización de la *Guía de Configuración y Prompt Maestro* (Práctica 9 · Proyecto 2) para **Antigravity IDE**. Las instrucciones del agente (rol, arquitectura, mapeo CRUD HTTP⇄SQL, seguridad y criterios de aceptación) viven en [`AGENTS.md`](AGENTS.md).

## Estructura creada

```
.
├── AGENTS.md                  # Reglas del agente (System Prompt)
├── README.md
├── .gitignore                 # Excluye .env.local, node_modules, builds…
├── .vscode/extensions.json    # Ext. recomendadas (REST Client, DotENV, GitLens, snippets React)
├── docs/
│   ├── especificacion.md      # Misión 1 · 8 historias de usuario + modelo de datos
│   ├── esquema.sql            # Misión 2 · tablas, FK, índices, triggers y políticas RLS
│   └── pruebas-api.http       # Misión 5 · GET/POST/PATCH/DELETE (+ equivalentes cURL)
└── proyecto-2/                # Misión 3 · app React + Vite
    ├── .env.local             # Misión 4 · credenciales (¡NO se sube a Git!)
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── index.html
    ├── .gitignore
    └── src/
        ├── main.jsx
        ├── App.jsx
        ├── index.css
        └── lib/supabase.js    # Cliente Supabase (solo clave pública)
```

## Puesta en marcha

**1 · Supabase.** Crea el proyecto en [supabase.com](https://supabase.com), abre **SQL Editor**, pega el contenido de `docs/esquema.sql` y ejecútalo. Luego copia en **Settings → API** la *Project URL* y la clave **publishable / anon**.

**2 · Variables de entorno.** Edita `proyecto-2/.env.local`:

```
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU_CLAVE_PUBLICA_ANON
```

**3 · Frontend.**

```bash
cd proyecto-2
npm install
npm run dev
```

## Seguridad

- El navegador solo lleva la clave **pública** (anon): lo que puede hacer cada usuario lo deciden las políticas **RLS** de `docs/esquema.sql`, no el frontend.
- La clave **secret / service_role** omite RLS: nunca en el cliente, nunca en Git, nunca en `docs/`.
- `.env.local` está excluido en `.gitignore`; la exclusión se verifica con `git check-ignore -v proyecto-2/.env.local`.

## Misiones — estado

| Misión | Contenido | Estado |
|---|---|---|
| 1 · Documentación | `docs/especificacion.md` (8 HU + criterios + modelo de datos) | ✅ |
| 2 · Base de datos | `docs/esquema.sql` (tablas + RLS + triggers) | ✅ pendiente de ejecutar en tu proyecto de Supabase |
| 3 · Frontend | Vite + React + `src/lib/supabase.js` + `@supabase/supabase-js` | ✅ |
| 4 · Entorno | `.env.local` + exclusión en Git | ✅ |
| 5 · Validación API | `docs/pruebas-api.http` (con equivalentes cURL) | ⏳ ejecuta con tus credenciales reales |
| 6 · Versiones | Commit semántico + tag `v0.1.0` | ✅ push pendiente de configurar tu remoto |

## Validación de la API REST (Misión 5)

```bash
curl "https://TU-PROYECTO.supabase.co/rest/v1/habitaciones?select=*" \
  -H "apikey: TU_CLAVE_PUBLICA_ANON" \
  -H "Authorization: Bearer TU_CLAVE_PUBLICA_ANON"
```

Con la extensión **REST Client** también puedes ejecutar cada bloque de `docs/pruebas-api.http` sin salir del editor (incluye login, CRUD completo y pruebas negativas de RLS).

## Convenciones de Git

Commits semánticos (`feat:`, `fix:`, `docs:`, `chore:`…) y etiquetas de versión siguiendo SemVer (`v0.1.0`, `v0.2.0`, …).
