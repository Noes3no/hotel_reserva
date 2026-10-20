-- =====================================================================
-- Proyecto 2 · Sistema de Reservas para una Casa Rural
-- docs/esquema.sql
-- Motor: PostgreSQL (Supabase) · Ejecutar en el SQL Editor de Supabase
--
-- Contenido:
--   1. Extensiones
--   2. Tabla perfiles (+ trigger automático sobre auth.users)
--   3. Tabla habitaciones (catálogo)
--   4. Tabla reservas (+ triggers de reglas de negocio)
--   5. Control de Acceso por Filas (RLS): políticas por actor
--   6. Datos de ejemplo
--   7. Consultas de verificación
--
-- Nota de seguridad: la seguridad vive en la base de datos. El frontend
-- solo lleva la clave pública (anon/publishable); lo que cada usuario
-- puede hacer lo deciden estas políticas RLS, no el cliente.
-- El script es idempotente: se puede volver a ejecutar sin romper nada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Extensiones
-- ---------------------------------------------------------------------
-- btree_gist permite combinar una columna escalar con un rango de fechas
-- dentro de la restricción EXCLUDE que impide reservar la misma
-- habitación dos veces en fechas solapadas.
create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 2. perfiles — identidad de negocio sobre Supabase Auth
-- ---------------------------------------------------------------------
create table if not exists public.perfiles (
  id              uuid        primary key references auth.users (id) on delete cascade,
  nombre_completo text        not null,
  rol             text        not null default 'cliente'
                              check (rol in ('cliente', 'administrador')),
  creado_en       timestamptz not null default now()
);

alter table public.perfiles enable row level security;

-- Helper para las políticas: ¿el usuario de la petición actual es admin?
-- security definer evita la recursión infinita de leer perfiles dentro de RLS.
create or replace function public.es_administrador()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.perfiles p
    where p.id = auth.uid()
      and p.rol = 'administrador'
  );
$$;

-- Cada alta en Auth genera su fila en perfiles (rol por defecto: cliente).
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', 'Cliente')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists al_registrarse on auth.users;
create trigger al_registrarse
  after insert on auth.users
  for each row
  execute function public.crear_perfil_usuario();

-- ---------------------------------------------------------------------
-- 3. habitaciones — catálogo del negocio
-- ---------------------------------------------------------------------
create table if not exists public.habitaciones (
  id           bigint generated always as identity primary key,
  nombre       text           not null unique,
  descripcion  text,
  capacidad    int            not null check (capacidad > 0),
  precio_noche numeric(10, 2) not null check (precio_noche >= 0),
  activa       boolean        not null default true,
  creado_en    timestamptz    not null default now()
);

alter table public.habitaciones enable row level security;

-- ---------------------------------------------------------------------
-- 4. reservas — entidad central
-- ---------------------------------------------------------------------
create table if not exists public.reservas (
  id             uuid        primary key default gen_random_uuid(),
  usuario_id     uuid        not null references public.perfiles (id) on delete cascade,
  habitacion_id  bigint      not null references public.habitaciones (id),
  fecha_entrada  date        not null,
  fecha_salida   date        not null,
  num_huespedes  int         not null check (num_huespedes > 0),
  estado         text        not null default 'pendiente'
                             check (estado in ('pendiente', 'confirmada', 'cancelada')),
  creado_en      timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),

  -- Regla estructural: la salida siempre después de la entrada.
  constraint reservas_fechas_coherentes check (fecha_salida > fecha_entrada)
  -- Importante: la regla «no reservar en el pasado» NO se expresa como un
  -- CHECK con CURRENT_DATE, porque los CHECK se reevalúan en cada UPDATE
  -- (bloquearía operaciones legítimas sobre reservas históricas). Se
  -- garantiza de verdad en las políticas RLS y en el trigger validar_reserva.
);

alter table public.reservas enable row level security;

-- Índices para las dos lecturas más frecuentes:
-- "mis reservas" (por usuario) y comprobación de disponibilidad (por habitación/date).
create index if not exists reservas_por_usuario_idx
  on public.reservas (usuario_id, fecha_entrada desc);

create index if not exists reservas_por_habitacion_y_fecha_idx
  on public.reservas (habitacion_id, fecha_entrada);

-- Dos clientes no pueden reservar la misma habitación en fechas solapadas
-- (las canceladas quedan fuera de la regla).
alter table public.reservas
  drop constraint if exists reservas_sin_solapes;

alter table public.reservas
  add constraint reservas_sin_solapes
  exclude using gist (
    habitacion_id with =,
    daterange(fecha_entrada, fecha_salida) with &&
  ) where (estado <> 'cancelada');

-- Validaciones de negocio (se aplican a INSERT y UPDATE, y valen aunque el
-- cliente intente saltarse el frontend).
create or replace function public.validar_reserva()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hab      record;
  es_admin boolean := auth.uid() is null or public.es_administrador();
begin
  -- a) La habitación debe existir y, para clientes, estar activa.
  select h.capacidad, h.activa
    into hab
    from public.habitaciones h
   where h.id = new.habitacion_id;

  if not found then
    raise exception 'La habitación seleccionada no existe';
  end if;

  if not hab.activa and not es_admin then
    raise exception 'La habitación no está disponible para reservas';
  end if;

  -- b) Respetar la capacidad máxima del alojamiento.
  if new.num_huespedes > hab.capacidad then
    raise exception 'La reserva excede la capacidad máxima de la habitación (%)', hab.capacidad;
  end if;

  -- c) Fechas coherentes y prohibido el pasado (criterio de aceptación 2).
  if new.fecha_salida <= new.fecha_entrada then
    raise exception 'La fecha de salida debe ser posterior a la fecha de entrada';
  end if;

  if new.fecha_entrada < current_date
     and (TG_OP = 'INSERT' or new.fecha_entrada is distinct from old.fecha_entrada) then
    raise exception 'Queda prohibido reservar con fechas del pasado';
  end if;

  -- d) Reglas exclusivas de UPDATE para el cliente propietario
  --    (el administrador pasa por la rama del if de arriba sin restricciones extra).
  if TG_OP = 'UPDATE' and not es_admin then
    if auth.uid() is distinct from old.usuario_id then
      raise exception 'No tienes permiso para modificar esta reserva';
    end if;

    if new.usuario_id is distinct from old.usuario_id then
      raise exception 'No se puede cambiar el titular de la reserva';
    end if;

    if new.estado is distinct from old.estado and new.estado <> 'cancelada' then
      raise exception 'Solo puedes cancelar tu reserva; el resto de estados los gestiona el administrador';
    end if;

    if old.estado = 'cancelada' then
      raise exception 'Una reserva cancelada ya no se puede modificar';
    end if;
  end if;

  new.actualizado_en := now();
  return new;
end;
$$;

create trigger validar_reserva
  before insert or update on public.reservas
  for each row
  execute function public.validar_reserva();

-- ---------------------------------------------------------------------
-- 5. Control de Acceso por Filas (RLS)
--    anon          → solo puede mirar el catálogo.
--    authenticated → el cliente gestiona exclusivamente sus reservas.
--    administrador → acceso completo de negocio.
--    (atte.: las políticas son permissivas y se combinan con OR)
-- ---------------------------------------------------------------------

-- ---------- perfiles ----------
drop policy if exists "perfiles_lectura_propia_o_admin" on public.perfiles;
create policy "perfiles_lectura_propia_o_admin"
  on public.perfiles for select
  to authenticated
  using ((select auth.uid()) = id or public.es_administrador());

drop policy if exists "perfiles_actualizacion_propia" on public.perfiles;
create policy "perfiles_actualizacion_propia"
  on public.perfiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id and rol = 'cliente');
  -- Nadie se autoproclama administrador: el INSERT lo hace el trigger de Auth.

drop policy if exists "perfiles_administracion" on public.perfiles;
create policy "perfiles_administracion"
  on public.perfiles for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- ---------- habitaciones ----------
drop policy if exists "habitaciones_lectura_catalogo" on public.habitaciones;
create policy "habitaciones_lectura_catalogo"
  on public.habitaciones for select
  to anon, authenticated
  using (activa or public.es_administrador());

drop policy if exists "habitaciones_administracion" on public.habitaciones;
create policy "habitaciones_administracion"
  on public.habitaciones for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- ---------- reservas ----------
drop policy if exists "reservas_creacion_cliente" on public.reservas;
create policy "reservas_creacion_cliente"
  on public.reservas for insert
  to authenticated
  with check (
    usuario_id = (select auth.uid())    -- criterio 1: solo autenticados
    and estado = 'pendiente'
    and fecha_entrada >= current_date   -- criterio 2: prohibido el pasado
    and fecha_salida > fecha_entrada
  );

drop policy if exists "reservas_lectura_cliente_o_admin" on public.reservas;
create policy "reservas_lectura_cliente_o_admin"
  on public.reservas for select
  to authenticated
  using (usuario_id = (select auth.uid()) or public.es_administrador());

drop policy if exists "reservas_actualizacion_cliente" on public.reservas;
create policy "reservas_actualizacion_cliente"
  on public.reservas for update
  to authenticated
  using (usuario_id = (select auth.uid()) and estado <> 'cancelada')
  with check (usuario_id = (select auth.uid()));

-- El cliente puede eliminar sus reservas salvo las ya confirmadas
-- (protege la contabilidad del negocio: confirmada se gestiona con el admin).
drop policy if exists "reservas_borrado_cliente" on public.reservas;
create policy "reservas_borrado_cliente"
  on public.reservas for delete
  to authenticated
  using (usuario_id = (select auth.uid()) and estado <> 'confirmada');

drop policy if exists "reservas_administracion" on public.reservas;
create policy "reservas_administracion"
  on public.reservas for all
  to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

-- ---------------------------------------------------------------------
-- 6. Datos de ejemplo
-- ---------------------------------------------------------------------
insert into public.habitaciones (nombre, descripcion, capacidad, precio_noche)
values
  ('Cabaña del Roble',    'Dos plantas con chimenea y vistas al bosque.',          4,  95.00),
  ('Suite del Valle',     'Baño privado con jacuzzi y balcón al valle.',           2, 120.00),
  ('Habitación Familiar', 'Dos camas dobles, ideal para estancias en familia.',    5, 110.00)
on conflict (nombre) do nothing;

-- ---------------------------------------------------------------------
-- 7. Consultas de verificación (SQL Editor / psql)
-- ---------------------------------------------------------------------
-- select * from public.habitaciones;
-- select * from public.perfiles;   -- RLS: solo verás filas según el actor actual
-- select * from public.reservas;
--
-- Pruebas de humo esperadas:
--   1) Anónimo: select sobre reservas → 0 filas (sin políticas para anon).
--   2) Cliente: insert con fecha_entrada en el pasado → error (RLS + trigger).
--   3) Cliente: update/delete de la reserva de otro → 0 filas afectadas.
--   4) Cliente: dos inserts que se solapan en la misma habitación → error 23P01.
--   5) Administrador: puede ver y gestionar todas las reservas.
