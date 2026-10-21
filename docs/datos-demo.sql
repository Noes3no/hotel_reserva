-- =====================================================================
-- Proyecto 2 · La Solana — datos demo de clientes y reservas
-- docs/datos-demo.sql · Ejecutar en el SQL Editor de Supabase
--
-- Qué hace:
--   1. Crea 5 clientes de demostración en Supabase Auth (emails
--      confirmados, sin pasar por el límite de envío de correos).
--      El trigger `al_registrarse` genera sus perfiles automáticamente.
--   2. Crea reservas de esos clientes desde noviembre 2026 hasta
--      agosto 2027 (la última estancia termina el 30/08/2027), con
--      estados pendiente / confirmada / cancelada.
--
-- Notas:
--   · Idempotente: borra antes los datos de demo y vuelve a crearlos.
--   · Contraseña común de demo: LaSolana2027!
--   · Las reglas de negocio se respetan: fechas futuras, capacidad,
--     sin solapes por habitación (EXCLUDE) y estados válidos.
-- =====================================================================

create extension if not exists pgcrypto; -- crypt() / gen_salt() para las contraseñas

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

-- ---------------------------------------------------------------------
-- 2. Reservas de los clientes (nov 2026 → agosto 2027)
--    Se referencian habitaciones por nombre (más robusto que por id).
--    Sin solapes por habitación: lo valida la restricción EXCLUDE.
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
values
  -- María · puente de noviembre (confirmada)
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.habitaciones where nombre = 'Suite El Mirador de Guadarrama'),
   '2026-11-06', '2026-11-09', 2, 'confirmada'),

  -- Juan · Nochebuena (confirmada)
  ('22222222-2222-4222-8222-222222222222',
   (select id from public.habitaciones where nombre = 'Habitación Doble La Castellana'),
   '2026-12-23', '2026-12-27', 2, 'confirmada'),

  -- Juan · escapada de febrero (pendiente)
  ('22222222-2222-4222-8222-222222222222',
   (select id from public.habitaciones where nombre = 'Suite Buitrago del Lozoya'),
   '2027-02-12', '2027-02-14', 2, 'pendiente'),

  -- Laura · Semana Santa en familia (confirmada)
  ('33333333-3333-4333-8333-333333333333',
   (select id from public.habitaciones where nombre = 'Familiar El Escorial'),
   '2027-03-26', '2027-03-31', 4, 'confirmada'),

  -- Carlos · estancia cancelada (demo del ciclo de vida; no cuenta para solapes)
  ('44444444-4444-4444-8444-444444444444',
   (select id from public.habitaciones where nombre = 'Cabaña Manzanares el Real'),
   '2026-12-04', '2026-12-06', 2, 'cancelada'),

  -- Carlos · julio (pendiente)
  ('44444444-4444-4444-8444-444444444444',
   (select id from public.habitaciones where nombre = 'Cabaña Manzanares el Real'),
   '2027-07-14', '2027-07-19', 3, 'pendiente'),

  -- María · repite en agosto (pendiente)
  ('11111111-1111-4111-8111-111111111111',
   (select id from public.habitaciones where nombre = 'Suite El Mirador de Guadarrama'),
   '2027-08-10', '2027-08-16', 2, 'pendiente'),

  -- Elena · casa entera para cerrar la temporada (pendiente, hasta 30/08/2027)
  ('55555555-5555-4555-8555-555555555555',
   (select id from public.habitaciones where nombre = 'Casa Completa Sierra Norte'),
   '2027-08-20', '2027-08-30', 6, 'pendiente');

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
select p.nombre_completo, u.email, h.nombre as habitacion,
       r.fecha_entrada, r.fecha_salida, r.num_huespedes, r.estado
  from public.reservas r
  join public.perfiles p on p.id = r.usuario_id
  join auth.users u      on u.id = p.id
  join public.habitaciones h on h.id = r.habitacion_id
 order by r.fecha_entrada;
