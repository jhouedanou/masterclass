-- ---------------------------------------------------------------------------
-- E-Masterclass Big Five — securite rls
--
-- FICHIER GÉNÉRÉ : ne pas éditer à la main.
-- Régénération : npm run db:sql
--
-- Migration 3 sur 5 · source : 20260828120200_securite_rls.sql
--
-- À exécuter dans SQL Editor du projet Supabase, dans l'ordre des numéros.
-- Ces scripts ne sont pas rejouables : sur une base déjà installée,
-- n'exécutez que les fichiers dont le numéro vous manque.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Sécurité au niveau des lignes
--
-- Toute la plateforme lit et écrit via Nitro (`server/api`) avec la clé
-- `service_role`, qui n'est jamais exposée au navigateur. Aucun code client ne
-- parle à Supabase directement — les contrôles d'accès restent dans
-- `server/utils/session.ts`.
--
-- On active donc RLS partout sans définir la moindre politique : la clé `anon`,
-- publique par nature, ne peut alors rien lire ni écrire. C'est la posture la
-- plus sûre tant que le front n'interroge pas la base lui-même ; sans cette
-- activation, la clé `anon` donnerait accès à l'intégralité des tables, y
-- compris les comptes, les transactions et le journal d'administration.
--
-- Le jour où une lecture directe depuis le navigateur devient utile (catalogue
-- public, vérification d'un certificat), il faudra ajouter des politiques
-- `for select to anon` ciblées — voir le bloc en fin de fichier.
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'programmes', 'thematiques', 'formateurs', 'modules', 'chapitres',
    'utilisateurs', 'personas', 'acces',
    'sessions_coaching', 'inscriptions_sessions', 'sujets_sessions', 'notes_formateurs',
    'articles', 'articles_modules',
    'commandes', 'commandes_modules', 'transactions', 'certificats',
    'demandes_coaching_prive', 'candidatures_formateurs',
    'journal', 'reglages_financiers', 'reglages_seo', 'redirections'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
  end loop;
end;
$$;

-- Les fonctions métier écrivent en base : elles ne doivent être appelables que
-- depuis le serveur applicatif.
revoke execute on function
  public.reserver_place_session(text, text, text, text, text),
  public.delivrer_certificat(text, text),
  public.attribuer_acces(text, text, text, text)
  from anon, authenticated, public;

grant execute on function
  public.reserver_place_session(text, text, text, text, text),
  public.delivrer_certificat(text, text),
  public.attribuer_acces(text, text, text, text)
  to service_role;

-- Les séquences ne servent qu'aux valeurs par défaut évaluées côté serveur.
revoke all on all sequences in schema public from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Pour mémoire — politiques à activer si le catalogue devient lisible depuis le
-- navigateur. Attention : les colonnes `seo_mot_cle_principal` sont des repères
-- internes qui ne doivent pas fuir (spec SEO §3), il faudra passer par une vue
-- restreinte plutôt que d'ouvrir les tables telles quelles.
--
--   create policy programmes_lecture_publique on programmes
--     for select to anon using (true);
--
--   create policy modules_lecture_publique on modules
--     for select to anon using (statut <> 'brouillon');
--
--   create policy articles_lecture_publique on articles
--     for select to anon using (statut = 'publie');
-- ---------------------------------------------------------------------------
