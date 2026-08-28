import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './types'

/**
 * Client Supabase du serveur applicatif.
 *
 * Il utilise la clé secrète du projet (`sb_secret_…`, nouveau système de clés
 * Supabase — l'ancienne `service_role` JWT est acceptée en secours), qui
 * contourne la sécurité au niveau des lignes : elle ne doit jamais quitter le
 * serveur. Les contrôles d'accès restent portés par `server/utils/session.ts`,
 * et RLS est activé sans politique pour que la clé publique (publishable /
 * `anon`) ne donne accès à rien (voir la migration `…_securite_rls.sql`).
 */
let client: SupabaseClient<Database> | null = null

export function supabase(): SupabaseClient<Database> {
  if (client) return client

  const config = useRuntimeConfig()

  // L'environnement d'exécution prime sur la valeur figée à la compilation.
  // Nuxt fige en effet dans le bundle ce que `nuxt.config` a lu de `.env` au
  // moment du build : sans cette priorité, un serveur démarré avec un autre
  // SUPABASE_URL continuerait d'écrire dans la base du build — silencieusement.
  // Les variables `NUXT_`, elles, passent par `config` et restent honorées.
  const url = process.env.SUPABASE_URL || config.supabaseUrl || ''
  const cle =
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    config.supabaseSecretKey ||
    ''

  if (!url || !cle) {
    throw createError({
      statusCode: 500,
      statusMessage:
        'Base de données non configurée : renseignez SUPABASE_URL et SUPABASE_SECRET_KEY.',
    })
  }

  client = createClient<Database>(url, cle, {
    // Aucune session Supabase à conserver : chaque requête HTTP est autonome.
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application': 'emasterclass-bigfive' } },
  })

  return client
}
