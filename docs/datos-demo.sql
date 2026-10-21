-- =====================================================================
-- Proyecto 2 · La Solana — datos demo de clientes y reservas
-- docs/datos-demo.sql · Ejecutar en el SQL Editor de Supabase
--
-- Qué hace:
--   1. Crea 5 clientes de demostración en Supabase Auth (emails
--      confirmados, sin pasar por el límite de envío de correos).
--      El trigger `al_registrarse` genera sus perfiles automáticamente.
--   2. Crea 32 reservas de demostración (temporada ficticia completa)
--      de noviembre 2026 a agosto 2027 (la última estancia termina el
--      30/08/2027), repartidas por las 10 habitaciones y con estados
--      pendiente / confirmada / cancelada. El panel del propietario
--      (HU-07) y las agendas de calendario salen llenos de ejemplos.
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

-- Contactos ficticios de los demo (CA-7.7): el panel puede escribir por
-- WhatsApp (teléfono) o email. El email sale de Auth si faltara.
update public.perfiles set telefono = '+34600000001',
  email = coalesce(email, (select email from auth.users where id = perfiles.id))
 where id = '11111111-1111-4111-8111-111111111111';
update public.perfiles set telefono = '+34600000002',
  email = coalesce(email, (select email from auth.users where id = perfiles.id))
 where id = '22222222-2222-4222-8222-222222222222';
update public.perfiles set telefono = '+34600000003',
  email = coalesce(email, (select email from auth.users where id = perfiles.id))
 where id = '33333333-3333-4333-8333-333333333333';
update public.perfiles set telefono = '+34600000004',
  email = coalesce(email, (select email from auth.users where id = perfiles.id))
 where id = '44444444-4444-4444-8444-444444444444';
update public.perfiles set telefono = '+34600000005',
  email = coalesce(email, (select email from auth.users where id = perfiles.id))
 where id = '55555555-5555-4555-8555-555555555555';

-- ---------------------------------------------------------------------
-- 2. Reservas de los clientes (temporada de demo: nov 2026 → agosto 2027)
--    32 estancias repartidas por las 10 habitaciones y todos los meses,
--    con los tres estados (pendiente / confirmada / cancelada).
--    Se referencian habitaciones por nombre; si una no existiera, su
--    bloque se salta sin romper el resto (select ... where nombre = ...).
--    Huéspedes: least(N, h.capacidad) respeta siempre la capacidad real.
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
-- María · puente de noviembre 2026 (confirmada)
select '11111111-1111-4111-8111-111111111111', h.id, '2026-11-06', '2026-11-09', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Elena · estancia de noviembre (confirmada, individual)
select '55555555-5555-4555-8555-555555555555', h.id, '2026-11-10', '2026-11-12', least(1, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- Carlos · escapada de noviembre (confirmada)
select '44444444-4444-4444-8444-444444444444', h.id, '2026-11-13', '2026-11-15', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Laura · puente de noviembre (pendiente)
select '33333333-3333-4333-8333-333333333333', h.id, '2026-11-20', '2026-11-22', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Laura · fin de semana de adjetivos (pendiente)
select '33333333-3333-4333-8333-333333333333', h.id, '2026-11-27', '2026-11-29', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Carlos · estancia cancelada (demo del ciclo de vida; no cuenta para solapes)
select '44444444-4444-4444-8444-444444444444', h.id, '2026-12-04', '2026-12-06', least(2, h.capacidad), 'cancelada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Juan · Nochebuena (confirmada)
select '22222222-2222-4222-8222-222222222222', h.id, '2026-12-23', '2026-12-27', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Elena · despedida del año (confirmada)
select '55555555-5555-4555-8555-555555555555', h.id, '2026-12-30', '2027-01-03', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- María · arranque de año (confirmada)
select '11111111-1111-4111-8111-111111111111', h.id, '2027-01-02', '2027-01-05', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte'
union all
-- Juan · primeros fríos (confirmada, individual)
select '22222222-2222-4222-8222-222222222222', h.id, '2027-01-18', '2027-01-20', least(1, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- Laura · cierre de enero (pendiente)
select '33333333-3333-4333-8333-333333333333', h.id, '2027-01-29', '2027-01-31', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- Juan · escapada de febrero (pendiente)
select '22222222-2222-4222-8222-222222222222', h.id, '2027-02-12', '2027-02-14', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Elena · invierno con chimenea (confirmada)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-02-19', '2027-02-22', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- María · esquí de fondo (pendiente)
select '11111111-1111-4111-8111-111111111111', h.id, '2027-02-26', '2027-02-28', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Laura · primavera temprana (pendiente, individual)
select '33333333-3333-4333-8333-333333333333', h.id, '2027-03-08', '2027-03-10', least(1, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- María · marca de la casa (confirmada)
select '11111111-1111-4111-8111-111111111111', h.id, '2027-03-12', '2027-03-14', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Elena · primeras lluvias (pendiente)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-03-05', '2027-03-08', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Laura · Semana Santa en familia (confirmada)
select '33333333-3333-4333-8333-333333333333', h.id, '2027-03-26', '2027-03-31', least(4, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Laura · primicia de abril (confirmada)
select '33333333-3333-4333-8333-333333333333', h.id, '2027-04-02', '2027-04-05', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Carlos · puente de abril (pendiente)
select '44444444-4444-4444-8444-444444444444', h.id, '2027-04-09', '2027-04-12', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Elena · primero de mayo (pendiente)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-05-07', '2027-05-10', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Loft Alcalá de Henares'
union all
-- María · mayo con piscina (confirmada)
select '11111111-1111-4111-8111-111111111111', h.id, '2027-05-21', '2027-05-24', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Elena · junio luminoso (confirmada)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-06-02', '2027-06-06', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Habitación Doble La Castellana'
union all
-- Carlos · solsticio (pendiente)
select '44444444-4444-4444-8444-444444444444', h.id, '2027-06-18', '2027-06-21', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Familiar El Escorial'
union all
-- Juan · fin de curso (pendiente)
select '22222222-2222-4222-8222-222222222222', h.id, '2027-06-25', '2027-06-28', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Elena · verano histórico (confirmada)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-07-02', '2027-07-06', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Apartamento Aranjuez'
union all
-- Laura · pleno julio (confirmada)
select '33333333-3333-4333-8333-333333333333', h.id, '2027-07-01', '2027-07-04', least(2, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre = 'Suite Buitrago del Lozoya'
union all
-- Carlos · julio largo (pendiente)
select '44444444-4444-4444-8444-444444444444', h.id, '2027-07-14', '2027-07-19', least(3, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Cabaña Manzanares el Real'
union all
-- Elena · principios de agosto (confirmada)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-08-01', '2027-08-05', least(3, h.capacidad), 'confirmada'
  from public.habitaciones h where h.nombre ilike '%Chinch%'
union all
-- Carlos · agosto de individual (pendiente)
select '44444444-4444-4444-8444-444444444444', h.id, '2027-08-02', '2027-08-04', least(1, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Individual El Pardo'
union all
-- María · repite en agosto (pendiente)
select '11111111-1111-4111-8111-111111111111', h.id, '2027-08-10', '2027-08-16', least(2, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Suite El Mirador de Guadarrama'
union all
-- Elena · casa entera para cerrar la temporada (pendiente, hasta 30/08/2027)
select '55555555-5555-4555-8555-555555555555', h.id, '2027-08-20', '2027-08-30', least(6, h.capacidad), 'pendiente'
  from public.habitaciones h where h.nombre = 'Casa Completa Sierra Norte';

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
