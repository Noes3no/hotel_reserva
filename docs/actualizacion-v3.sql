-- =====================================================================
-- Proyecto 2 · La Solana — ACTUALIZACIÓN v3 (archivo independiente)
-- docs/actualizacion-v3.sql · Ejecutar completo en el SQL Editor de Supabase
--
-- Qué hace (idempotente: puede repetirse sin romper nada):
--   1. Añade a perfiles las columnas de contacto email y telefono y las
--      rellena desde Auth (el propietario puede escribir a los clientes,
--      CA-7.7). El trigger para futuros registros también las guarda.
--   2. Crea la función pública ver_ocupaciones(), que alimenta los
--      calendarios de disponibilidad (CA-4.7 público y CA-7.8 del panel).
--
-- Fix durante pruebas: el panel mostraba
--   "column perfiles_1.email does not exist"
-- cuando este bloque no se había ejecutado todavía. Tras ejecutarlo,
-- el panel vuelve a leer el contacto completo y los calendarios del
-- modal de reserva dejan de avisar de la actualización pendiente.
-- =====================================================================

-- 1. contacto del cliente en perfiles (email para correo, teléfono para WhatsApp)
alter table public.perfiles add column if not exists email    text;
alter table public.perfiles add column if not exists telefono text;

-- rellena el email de contacto con el de Auth para los perfiles ya creados
update public.perfiles p
   set email = u.email
  from auth.users u
 where p.email is null
   and u.id = p.id;

-- el trigger se vuelve a crear con la versión que guarda email y teléfono
create or replace function public.crear_perfil_usuario()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfiles (id, nombre_completo, email, telefono)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nombre_completo', 'Cliente'),
    new.email,
    new.phone
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- 2. ocupaciones para pintar los calendarios: devuelve los tramos reservados.
-- El intervalo [fecha_entrada, fecha_salida) son las noches ocupadas; el día
-- de salida queda libre como llegada de la reserva siguiente (EXCLUDE usa
-- daterange igual que las reglas de negocio).
-- security definer: el visitante anónimo necesita leer las ocupaciones para
-- el calendario público, pero sigue SIN poder leer la tabla reservas (RLS).
create or replace function public.ver_ocupaciones()
returns table (
  habitacion_id bigint,
  fecha_entrada date,
  fecha_salida  date,
  estado        text
)
language sql
security definer
stable
set search_path = public
as $$
  select r.habitacion_id, r.fecha_entrada, r.fecha_salida, r.estado
    from public.reservas r
   where r.estado <> 'cancelada'
     and r.fecha_salida >= current_date;
$$;

grant execute on function public.ver_ocupaciones() to anon, authenticated;

-- ---------------------------------------------------------------------
-- Verificación (ejecútala tras el script)
-- ---------------------------------------------------------------------
-- a) Las columnas han de existir y los demo guardan su contacto:
-- select id, nombre_completo, email, telefono from public.perfiles order by id;
--
-- b) Los calendarios: han de salir los tramos de la temporada demo
-- (nov 2026 → ago 2027):
-- select * from public.ver_ocupaciones() order by fecha_entrada limit 10;
