import { supabase } from './client'
import { verifier } from './erreurs'

/** Comptage des appels aux routes publiques d'écriture, par adresse. */

/** Fenêtre glissante sur laquelle les appels d'une même adresse sont comptés. */
export const FENETRE_DEBIT_MINUTES = 60

export async function enregistrerTentativePublique(ip: string, route: string): Promise<void> {
  verifier(
    await supabase().from('tentatives_publiques').insert({ ip, route }).select('id'),
    'appel à une route publique',
  )
}

export async function compterTentativesPubliques(ip: string, route: string): Promise<number> {
  const depuis = new Date(Date.now() - FENETRE_DEBIT_MINUTES * 60_000).toISOString()
  const rows = verifier(
    await supabase()
      .from('tentatives_publiques')
      .select('id')
      .eq('ip', ip)
      .eq('route', route)
      .gte('cree_le', depuis),
    'appels récents à une route publique',
  )
  return rows.length
}

/** Comme les consultations de vérification : au-delà d'un jour, ces lignes ne
 *  sont plus qu'un journal d'adresses IP dont personne n'a l'usage. */
export async function purgerTentativesPubliques(): Promise<number> {
  const limite = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const rows = verifier(
    await supabase().from('tentatives_publiques').delete().lt('cree_le', limite).select('id'),
    'purge des appels aux routes publiques',
  )
  return rows.length
}
