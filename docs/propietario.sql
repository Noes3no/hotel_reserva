-- =====================================================================
-- Proyecto 2 · La Solana — cuenta del PROPIETARIO (administrador)
-- docs/propietario.sql · Ejecutar en el SQL Editor de Supabase
--
-- Qué hace:
--   1. Crea el usuario del propietario en Supabase Auth con acceso por
--      email + contraseña ya confirmado (sin pasar por el correo).
--      · Email:      propietario@lasolana.es
--      · Contraseña: LaSolana-Propietario2026!
--   2. Le asigna el rol «administrador»: vis de a la web, verá el
--      panel con TODAS las reservas y podrá cancelarlas, posponerlas
--      (cambiar fechas) y ajustar huéspedes.
--
-- Idempotente: si la cuenta ya existe, la recrea con esta contraseña.
-- Accede en la web: https://hotelreserva.vercel.app → Entrar.
-- =====================================================================

create extension if not exists pgcrypto;

-- 1. Limpieza previa (idempotencia)
delete from auth.users
 where id = '66666666-6666-4666-8666-666666666666';

-- 2. Alta del propietario (el trigger al_registrarse creará su perfil)
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
   created_at, updated_at,
   confirmation_token, recovery_token, email_change, email_change_token_new, email_change_token_current)
values
  ('00000000-0000-0000-0000-000000000000',
   '66666666-6666-4666-8666-666666666666',
   'authenticated', 'authenticated', 'propietario@lasolana.es',
   crypt('LaSolana-Propietario2026!', gen_salt('bf')), now(),
   '{"provider":"email","providers":["email"]}',
   '{"nombre_completo":"Propietario de La Solana"}',
   now(), now(), '', '', '', '', '');

-- Identidad de acceso (flujo estándar email/contraseña)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
values (gen_random_uuid(),
        '66666666-6666-4666-8666-666666666666', 'email', 'email',
        jsonb_build_object('sub', '66666666-6666-4666-8666-666666666666',
                           'email', 'propietario@lasolana.es', 'email_verified', true),
        now(), now(), now())
on conflict do nothing;

-- Perfil garantizado (por si el trigger no alcanzó a crearlo)
insert into public.perfiles (id, nombre_completo)
values ('66666666-6666-4666-8666-666666666666', 'Propietario de La Solana')
on conflict (id) do nothing;

-- 3. Rol de administrador del negocio (RS propietario del panel HU-07)
update public.perfiles
   set rol = 'administrador'
 where id = '66666666-6666-4666-8666-666666666666';

-- 4. Verificación (debe «administrador» = true)
select u.email,
       p.nombre_completo,
       (p.rol = 'administrador') as es_administrador
  from auth.users u
  join public.perfiles p on p.id = u.id
 where u.email = 'propietario@lasolana.es';
