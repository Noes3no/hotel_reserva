# Especificación funcional — Proyecto 2: Sistema de Reservas para una Casa Rural

> Fuente de verdad del proyecto (Misión 1). Toda historia de usuario se aprueba aquí **antes** de programarse. El diseño de datos se materializa en `docs/esquema.sql`.

## 1. Visión general

Sistema de reservas para una casa rural con dos actores:

| Actor | Descripción | Alcance |
|---|---|---|
| **Cliente** | Usuario registrado y autenticado | Consulta el catálogo y gestiona **exclusivamente sus propias reservas** |
| **Administrador** | Dueño del negocio | Gestiona el catálogo de habitaciones y **todas** las reservas |

**Historia de usuario principal:**
«Como cliente de la casa rural quiero reservar unas fechas para asegurarme el alojamiento.»

**Arquitectura:** React + Vite (navegador) → API REST de Supabase (JSON sobre PostgreSQL) → PostgreSQL con Control de Acceso por Filas (RLS).

**Mapeo CRUD HTTP ⇄ SQL:**

| Operación | HTTP | SQL |
|---|---|---|
| Crear | POST | INSERT |
| Leer | GET | SELECT |
| Actualizar | PUT / PATCH | UPDATE |
| Borrar | DELETE | DELETE |

## 2. Historias de usuario

### HU-01 · Registrarse como cliente — Actor: Cliente
Como **visitante**, quiero **crear una cuenta con mi email, contraseña y nombre**, para poder reservar el alojamiento.

**Criterios de aceptación**
- CA-1.1 El registro pide email, contraseña y nombre completo, con validación de formato.
- CA-1.2 Tras el alta se crea automáticamente un perfil con rol `cliente` (trigger sobre `auth.users`).
- CA-1.3 No pueden existir dos cuentas con el mismo email (lo garantiza Supabase Auth).

### HU-02 · Iniciar y cerrar sesión — Actor: Cliente
Como **cliente registrado**, quiero **iniciar sesión con mis credenciales**, para que el sistema me reconozca y me deje reservar.

**Criterios de aceptación**
- CA-2.1 Solo email y contraseña válidos permiten entrar (Supabase Auth).
- CA-2.2 La sesión queda identificada por el JWT que Supabase entrega al cliente.
- CA-2.3 Al cerrar sesión se elimina el token: sin sesión, ninguna reserva es accesible (RLS).

### HU-03 · Consultar el catálogo — Actores: visitante anónimo y Cliente
Como **visitante**, quiero **ver las habitaciones disponibles con su capacidad y precio**, para decidir si reservo.

**Criterios de aceptación**
- CA-3.1 El listado muestra nombre, descripción, capacidad y precio por noche.
- CA-3.2 La consulta es posible en modo anónimo, pero solo se ven habitaciones con `activa = true`.
- CA-3.3 Nadie puede crear, modificar ni borrar habitaciones salvo el administrador.

### HU-04 · Crear una reserva ⭐ (historia principal) — Actor: Cliente
Como **cliente autenticado**, quiero **elegir fechas futuras y una habitación, e indicar el número de huéspedes**, para asegurarme el alojamiento.

**Criterios de aceptación**
- CA-4.1 Solo usuarios autenticados y registrados pueden crear reservas (RLS `to authenticated`).
- CA-4.2 **Queda prohibido** reservar con fechas del pasado: la entrada debe ser ≥ hoy.
- CA-4.3 La fecha de salida debe ser posterior a la de entrada.
- CA-4.4 El número de huéspedes no puede exceder la capacidad de la habitación.
- CA-4.5 No se permiten reservas solapadas de la misma habitación en fechas que se cruzan.
- CA-4.6 Toda reserva se registra con el `usuario_id` del titular autenticado: un cliente no puede reservar «a nombre de otro».

### HU-05 · Consultar mis reservas — Actor: Cliente
Como **cliente**, quiero **ver el listado de mis reservas con su estado**, para recordar mi estancia.

**Criterios de aceptación**
- CA-5.1 Se muestran únicamente las reservas cuyo `usuario_id` coincide con el cliente autenticado.
- CA-5.2 Aunque se manipule la consulta (filtros, ids ajenos), la base de datos devuelve solo filas propias (RLS).
- CA-5.3 El administrador sí ve todas las reservas (es un actor distinto por diseño).

### HU-06 · Modificar o cancelar mi reserva — Actor: Cliente
Como **cliente**, quiero **cambiar fechas o huéspedes, o cancelar mi reserva**, para adaptarme a imprevistos.

**Criterios de aceptación**
- CA-6.1 Un cliente solo puede modificar o eliminar **sus propias** reservas.
- CA-6.2 No se puede mover una reserva a fechas del pasado ni cambiar su titular.
- CA-6.3 Un cliente solo puede pasar su reserva a estado `cancelada`; los demás estados (`pendiente`, `confirmada`) los gestiona el administrador.
- CA-6.4 Una reserva cancelada queda bloqueada para su edición posterior.

### HU-07 · Gestionar todas las reservas — Actor: Administrador
Como **administrador**, quiero **ver todas las reservas y confirmarlas o cancelarlas**, para organizar la ocupación del negocio.

**Criterios de aceptación**
- CA-7.1 El administrador ve y opera sobre las reservas de todos los clientes.
- CA-7.2 Solo el rol `administrador` obtiene este acceso; el resto de usuarios sigue limitado a lo suyo.
- CA-7.3 Toda modificación respeta las mismas reglas de negocio (fechas, solapes, capacidad).

### HU-08 · Gestionar el catálogo — Actor: Administrador
Como **administrador**, quiero **crear, editar y desactivar habitaciones**, para mantener la oferta al día.

**Criterios de aceptación**
- CA-8.1 Alta y edición de habitaciones con nombre, descripción, capacidad y precio.
- CA-8.2 Las habitaciones se desactivan (`activa = false`) en lugar de borrarse, para conservar el historial.
- CA-8.3 Si se elimina una habitación se borran también sus reservas (FK en cascada); por eso se prefiere desactivar.

## 3. Modelo de datos

### 3.1 Entidades

**perfiles** — proyección de negocio del usuario de Supabase Auth

| Campo | Tipo | Restricciones / significado |
|---|---|---|
| id | uuid · PK | Igual a `auth.users.id` |
| nombre_completo | text | Not null |
| rol | text | `cliente` (por defecto) o `administrador` |
| creado_en | timestamptz | Fecha de alta |

**habitaciones** — catálogo del alojamiento

| Campo | Tipo | Restricciones / significado |
|---|---|---|
| id | bigint identity · PK | Autonumérico |
| nombre | text | Not null, único |
| descripcion | text | Opcional |
| capacidad | int | > 0 |
| precio_noche | numeric(10,2) | ≥ 0 |
| activa | boolean | Por defecto `true`; `false` = retirada del catálogo |

**reservas** — entidad central del caso de uso

| Campo | Tipo | Restricciones / significado |
|---|---|---|
| id | uuid · PK | `gen_random_uuid()` |
| usuario_id | uuid · FK → `perfiles.id` | Titular (solo autenticados) |
| habitacion_id | bigint · FK → `habitaciones.id` | Habitación reservada |
| fecha_entrada · fecha_salida | date | Salida > entrada; entrada ≥ hoy al crear |
| num_huespedes | int | > 0 y ≤ capacidad |
| estado | text | `pendiente` / `confirmada` / `cancelada` |
| creado_en · actualizado_en | timestamptz | Auditoría |

### 3.2 Relaciones

```
auth.users  ── 1:1 ──►  perfiles  ◄── N:1 ──  reservas  ─── N:1 ──►  habitaciones
             (trigger crear_perfil_usuario)   usuario_id              habitacion_id
```

### 3.3 Reglas de negocio (se garantizan en la base de datos, no solo en la UI)

| # | Regla | Se protege con |
|---|---|---|
| R1 | Solo autenticados crean reservas | Políticas RLS `to authenticated` |
| R2 | Prohibido el pasado en nuevas reservas | RLS `fecha_entrada >= current_date` + trigger `validar_reserva` |
| R3 | Salida posterior a la entrada | CHECK + trigger |
| R4 | Huéspedes ≤ capacidad | Trigger `validar_reserva` |
| R5 | Sin solapes por habitación | Restricción `EXCLUDE` con `daterange` (extensión `btree_gist`) |
| R6 | Cada cliente solo ve/actualiza/borra lo suyo | Políticas RLS con `usuario_id = auth.uid()` |
| R7 | Estados válidos y transiciones limitadas | CHECK + trigger (el cliente solo puede cancelar) |
| R8 | El titular de la reserva no cambia | Trigger |
| R9 | Solo el administrador gestiona catálogo y reservas ajenas | Políticas basadas en `es_administrador()` |

### 3.4 Matriz de acceso por actor

| Tabla | Anónimo | Cliente | Administrador |
|---|---|---|---|
| perfiles | — | Lee/actualiza el suyo | Todo |
| habitaciones | Lee activas | Lee activas | Todo |
| reservas | — | CRUD de las suyas | Todo |

## 4. Mapeo CRUD ⇄ HTTP ⇄ SQL por historia

| Historia | Operación | HTTP | SQL | Tabla |
|---|---|---|---|---|
| HU-04 | Crear | POST | INSERT | reservas |
| HU-05 | Leer (propias) | GET | SELECT | reservas |
| HU-06 / HU-07 | Actualizar | PATCH / PUT | UPDATE | reservas |
| HU-06 (cancelar) / HU-07 | Borrar | DELETE | DELETE | reservas |
| HU-08 · HU-03 | Catálogo CRUD | GET/POST/PATCH/DELETE | SELECT/INSERT/UPDATE/DELETE | habitaciones |

## 5. Definition of Done del proyecto

- [ ] Criterios de aceptación obligatorios verificados con pruebas reales (cURL / REST Client) en `docs/pruebas-api.http`.
- [ ] RLS aplicado y comprobado con actor anónimo, cliente y administrador.
- [ ] Frontend consume la API mediante `proyecto-2/src/lib/supabase.js` usando solo la clave pública.
- [ ] Historial versionado con commits semánticos y etiquetas `vX.Y.Z`.
