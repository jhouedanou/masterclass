-- ---------------------------------------------------------------------------
-- Live Sessions : déclenchement du cycle toutes les 5 minutes (CDC §7)
--
-- L'offre Vercel Hobby n'accepte qu'un cron par jour. Le cycle des Live
-- Sessions (rappels J-1, H-10, H0, expiration des réservations, début et fin
-- des sessions) a besoin d'un passage toutes les 5 minutes : c'est Supabase
-- qui appelle l'application, avec pg_cron et pg_net.
--
-- Hors migrations : PGlite (npm run db:verifier) n'a ni pg_cron ni pg_net.
-- À exécuter une fois dans SQL Editor du projet Supabase, en production.
--
-- 1. Activer les extensions (Database → Extensions) : pg_cron et pg_net.
-- 2. Ranger la clé des tâches dans Vault, une fois (même valeur que la
--    variable TACHES_CLE de Vercel) :
--
--      select vault.create_secret('<valeur de TACHES_CLE>', 'taches_cle');
--
-- 3. Exécuter le bloc ci-dessous, en remplaçant l'adresse si besoin.
--
-- Vérifier : select * from cron.job_run_details order by start_time desc limit 5;
-- Arrêter  : select cron.unschedule('live-sessions-cycle');
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('live-sessions-cycle')
 where exists (select 1 from cron.job where jobname = 'live-sessions-cycle');

select cron.schedule(
  'live-sessions-cycle',
  '*/5 * * * *',
  $$
  select net.http_post(
    url := 'https://masterclass-omega-five.vercel.app/api/taches/live-sessions',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'taches_cle'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);
