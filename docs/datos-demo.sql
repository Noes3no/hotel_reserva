-- =====================================================================
-- Proyecto 2 · La Solana — datos demo de clientes y reservas
-- docs/datos-demo.sql · Ejecutar en el SQL Editor de Supabase
--
-- Qué hace:
--   1. Crea 5 clientes de demostración en Supabase Auth (emails
--      confirmados, sin pasar por el límite de envío de correos).
--      El trigger `al_registrarse` genera sus perfiles automáticamente.
--   2. Crea 69 reservas de demostración (la temporada ficticia completa)
--      de octubre 2026 (desde hoy) a octubre 2027 (la última estancia
--      termina el 31/10/2027), con al menos una reserva cada mes y nunca
--      más de diez por mes, repartidas por las 10 habitaciones y con
--      estados pendiente / confirmada / cancelada. El panel del
--      propietario (HU-07) y las agendas de calendario salen llenos.
--
-- Notas:
--   · TODO EN UNO: no necesitas ejecutar actualizacion-v3.sql antes;
--     la preparación de columnas y calendarios va incluida arriba.
--   · Idempotente: borra antes los datos de demo y vuelve a crearlos.
--   · Contraseña común de demo: LaSolana2027!
--   · Las reglas de negocio se respetan: fechas futuras, capacidad,
--     sin solapes por habitación (EXCLUDE) y estados válidos.
-- =====================================================================

create extension if not exists pgcrypto; -- crypt() / gen_salt() para las contraseñas

-- ---------------------------------------------------------------------
-- 0. Preparación (antes iba en docs/actualizacion-v3.sql; incluida aquí
--    para que ESTE guion baste solo). Crea las columnas de contacto de
--    perfiles si faltan y rellena el email desde Auth. Idempotente.
-- ---------------------------------------------------------------------
alter table public.perfiles add column if not exists email    text;
alter table public.perfiles add column if not exists telefono text;

update public.perfiles p
   set email = u.email
  from auth.users u
 where p.email is null
   and u.id = p.id;

-- trigger de alta con contacto, para los registros futuros
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

-- función pública de ocupaciones: alimenta los calendarios (CA-4.7 y CA-7.8)
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
-- 1. Clientes demo (UUID fijos para poder referenciarlos abajo)
-- ---------------------------------------------------------------------
delete from auth.users where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
); -- el cascade limpia perfiles, identidades y sus reservas

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111',
   'authenticated', 'authenticated', 'maria.demo@gmail.com',
   crypt('LaSolana2027!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre_completo":"María Fernández"}',
   now(), now(), '', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222',
   'authenticated', 'authenticated', 'juan.demo@gmail.com',
   crypt('LaSolana2027!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Juan Cid"}',
   now(), now(), '', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333',
   'authenticated', 'authenticated', 'laura.demo@gmail.com',
   crypt('LaSolana2027!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Laura Otín"}',
   now(), now(), '', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-8444-444444444444',
   'authenticated', 'authenticated', 'carlos.demo@gmail.com',
   crypt('LaSolana2027!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Carlos Vera"}',
   now(), now(), '', '', '', '', ''),

  ('00000000-0000-0000-0000-000000000000', '55555555-5555-4555-8555-555555555555',
   'authenticated', 'authenticated', 'elena.demo@gmail.com',
   crypt('LaSolana2027!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}', '{"nombre_completo":"Elena Rouco"}',
   now(), now(), '', '', '', '', '');

-- Identidad de acceso (flujo estándar de Supabase Auth para email/contraseña)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, 'email', 'email',
       jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
       now(), now(), now()
from auth.users u
where u.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
)
on conflict do nothing;

-- El trigger `al_registrarse` ya creó public.perfiles con rol 'cliente'.
-- Si lo ejecutaste en otro orden, esto lo garantiza:
insert into public.perfiles (id, nombre_completo)
select u.id, coalesce(u.raw_user_meta_data ->> 'nombre_completo', 'Cliente')
from auth.users u
where u.id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
)
on conflict (id) do nothing;

-- Contactos ficticios de los demo (CA-7.7): el panel puede escribir por
-- WhatsApp (teléfono) o email. El email lo rellena ya el Bloque 0 desde
-- Auth; aquí solo asignamos el teléfono de cada cliente.
update public.perfiles p
   set telefono = datos.telefono
  from (
    values ('11111111-1111-4111-8111-111111111111'::uuid, '+34600000001'),
           ('22222222-2222-4222-8222-222222222222'::uuid, '+34600000002'),
           ('33333333-3333-4333-8333-333333333333'::uuid, '+34600000003'),
           ('44444444-4444-4444-8444-444444444444'::uuid, '+34600000004'),
           ('55555555-5555-4555-8555-555555555555'::uuid, '+34600000005')
  ) as datos(id, telefono)
 where p.id = datos.id;

-- ---------------------------------------------------------------------
-- 2. Reservas de los clientes (temporada de demo: oct 2026 → oct 2027)
--    69 estancias: mínimo una por mes, máximo diez por mes, hay por las
--    10 habitaciones y con los tres estados (pendiente / confirmada /
--    cancelada). Se referencian habitaciones por nombre; si una no
--    existiera, su bloque se salta sin romper el resto
--    (select ... where nombre = ...). Huéspedes: least(N, h.capacidad)
--    respeta siempre la capacidad real. Sin solapes por habitación:
--    lo valida la restricción EXCLUDE.
-- ---------------------------------------------------------------------
delete from public.reservas
where usuario_id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555'
);

insert into public.reservas (usuario_id, habitacion_id, fecha_entrada, fecha_salida, num_huespedes, estado)
-- María · puente de noviembre 2026 (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2026-11-06', '2026-11-09', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Elena · estancia de noviembre (confirmada, individual)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2026-11-10', '2026-11-12', least(1, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- Carlos · escapada de noviembre (confirmada)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2026-11-13', '2026-11-15', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Laura · puente de noviembre (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2026-11-20', '2026-11-22', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Laura · fin de semana de adjetivos (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2026-11-27', '2026-11-29', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Carlos · estancia cancelada (demo del ciclo de vida; no cuenta para solapes)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2026-12-04', '2026-12-06', least(2, h.capacidad), 'cancelada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Juan · Nochebuena (confirmada)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2026-12-23', '2026-12-27', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Elena · despedida del año (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2026-12-30', '2027-01-03', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- María · arranque de año (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-01-02', '2027-01-05', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Juan · primeros fríos (confirmada, individual)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-01-18', '2027-01-20', least(1, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- Laura · cierre de enero (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-01-29', '2027-01-31', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Juan · escapada de febrero (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-02-12', '2027-02-14', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Elena · invierno con chimenea (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-02-19', '2027-02-22', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- María · esquí de fondo (pendiente)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-02-26', '2027-02-28', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Laura · primavera temprana (pendiente, individual)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-03-08', '2027-03-10', least(1, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- María · marca de la casa (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-03-12', '2027-03-14', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Elena · primeras lluvias (pendiente)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-03-05', '2027-03-08', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Laura · Semana Santa en familia (confirmada)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-03-26', '2027-03-31', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Laura · primicia de abril (confirmada)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-04-02', '2027-04-05', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Carlos · puente de abril (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-04-09', '2027-04-12', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Elena · primero de mayo (pendiente)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-05-07', '2027-05-10', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- María · mayo con piscina (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-05-21', '2027-05-24', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Elena · junio luminoso (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-06-02', '2027-06-06', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Carlos · solsticio (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-06-18', '2027-06-21', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Juan · fin de curso (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-06-25', '2027-06-28', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Elena · verano histórico (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-07-02', '2027-07-06', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Laura · pleno julio (confirmada)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-07-01', '2027-07-04', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Carlos · julio largo (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-07-14', '2027-07-19', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Elena · principios de agosto (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-08-01', '2027-08-05', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Carlos · agosto de individual (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-08-02', '2027-08-04', least(1, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- María · repite en agosto (pendiente)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-08-10', '2027-08-16', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Elena · casa entera para cerrar agosto (pendiente, hasta 30/08/2027)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-08-20', '2027-08-30', least(6, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- ===== OCTUBRE 2026 (la temporada arranca ya, con fechas posteriores a hoy) =====
-- Juan · primer fin de semana en la casa entera (confirmada)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2026-10-22', '2026-10-24', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Laura · media semana en la cabaña (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2026-10-23', '2026-10-25', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Elena · escapada de fin de semana en el suite (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2026-10-26', '2026-10-28', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Carlos · bisagra de octubre, entre pickle y reserva (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2026-10-29', '2026-10-31', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Elena · estancia en el ático (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2026-11-14', '2026-11-17', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Carlos · semana en la cabaña (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2026-11-24', '2026-11-26', least(4, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- María · diciembre en el loft (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2026-12-11', '2026-12-13', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Juan · fin de año en Aranjuez (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2026-12-18', '2026-12-20', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Elena · en el suite antes de la despedida (pendiente)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2026-12-28', '2026-12-30', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Carlos · cerrando enero en el suite (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-01-09', '2027-01-11', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Elena · San Antón en la familiar (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-01-22', '2027-01-24', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Carlos · febrero en elMirador (confirmada)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-02-05', '2027-02-07', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Juan · febrero en la sierra (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-02-20', '2027-02-22', least(6, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Carlos · marzo en la cabaña, chimenea alta (confirmada)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-03-15', '2027-03-17', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Juan · marzo en el ático (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-03-19', '2027-03-21', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- María · primera primavera en el suite (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-04-16', '2027-04-18', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Elena · abril en la familiar con la familia (pendiente)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-04-23', '2027-04-26', least(4, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Juan · puente de abril en Aranjuez (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-04-28', '2027-04-30', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Juan · primera escapada de mayo (confirmada)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-05-01', '2027-05-04', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Carlos · mayo en el ático (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-05-12', '2027-05-15', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Laura · última semana de mayo en La Castellana (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-05-28', '2027-05-30', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- María · junio en el loft (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-06-11', '2027-06-13', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Carlos · solsticio casi al final (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-06-27', '2027-06-29', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- María · julio en la familiar (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-07-09', '2027-07-11', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Juan · pleno julio en la sierra (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-07-22', '2027-07-25', least(5, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Juan · primeros de agosto en el suite (confirmada)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-08-06', '2027-08-08', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Laura · agosto en Aranjuez (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-08-17', '2027-08-19', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Carlos · agosto en la familiar (pendiente)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-08-22', '2027-08-24', least(4, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- ===== SEPTIEMBRE 2027 (el mes de vuelta a la rutina) =====
-- María · arranque de otoño en Aranjuez (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-09-03', '2027-09-06', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Carlos · semana silenciosa en el mirador (confirmada)
select '44444444-4444-4444-8444-444444444444'::uuid, h.id, '2027-09-10', '2027-09-13', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Elena · paseo de vendimia en la familiar (pendiente)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-09-17', '2027-09-20', least(4, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Juan · cierre del verano en la sierra (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-09-24', '2027-09-27', least(5, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- ===== OCTUBRE 2027 (la temporada llega completa hasta aquí) =====
-- María · paseo de octubre (confirmada)
select '11111111-1111-4111-8111-111111111111'::uuid, h.id, '2027-10-02', '2027-10-04', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Elena · otoño en la cabaña (confirmada)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-10-08', '2027-10-10', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Juan · octubre en el loft (pendiente)
select '22222222-2222-4222-8222-222222222222'::uuid, h.id, '2027-10-15', '2027-10-17', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Laura · casa entera para el segundo otoño (pendiente)
select '33333333-3333-4333-8333-333333333333'::uuid, h.id, '2027-10-21', '2027-10-24', least(5, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Elena · cierre de octubre (pendiente, hasta el 31/10/2027)
select '55555555-5555-4555-8555-555555555555'::uuid, h.id, '2027-10-29', '2027-10-31', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana';

-- ---------------------------------------------------------------------
-- 3. (Opcional) Promocionar tu cuenta a administrador del negocio.
--    Sustituye TU_EMAIL por el correo con el que te registraste en la web
--    y descomenta las dos líneas.
-- ---------------------------------------------------------------------
-- update public.perfiles
--    set rol = 'administrador'
--  where id = (select id from auth.users where email = 'TU_EMAIL');

-- ---------------------------------------------------------------------
-- 4. Verificación (ejecútala tras el script)
-- ---------------------------------------------------------------------
-- a) Total y rango: esperamos 32 reservas, la última salida 2027-08-30
select count(*) as reservas_demo, min(fecha_entrada) as primera_entrada,
       max(fecha_salida) as ultima_salida
  from public.reservas
 where usuario_id in (
   '11111111-1111-4111-8111-111111111111',
   '22222222-2222-4222-8222-222222222222',
   '33333333-3333-4333-8333-333333333333',
   '44444444-4444-4444-8444-444444444444',
   '55555555-5555-4555-8555-555555555555'
 );

-- b) Detalle completo (guarda captura si algo falla)
select p.nombre_completo, u.email, h.nombre as habitacion,
       r.fecha_entrada, r.fecha_salida, r.num_huespedes, r.estado
  from public.reservas r
  join public.perfiles p on p.id = r.usuario_id
  join auth.users u      on u.id = p.id
  join public.habitaciones h on h.id = r.habitacion_id
 order by r.fecha_entrada;
