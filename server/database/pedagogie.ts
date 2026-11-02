import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './client'
import { verifier } from './erreurs'

/**
 * Lectures brutes du tableau de bord pédagogique (back-office, brief du
 * 02/11) : visionnages et tentatives de quiz de tous les apprenants. Ce sont
 * les données qui servent déjà au fonctionnement — reprise de lecture,
 * attestation — et qui sont en base quel que soit le consentement cookies.
 *
 * PostgREST plafonne une réponse à mille lignes : les tables qui grossissent
 * avec le nombre d'apprenants sont lues par pages.
 */

const PAGE = 1000

/** Table inconnue de PostgREST ou de Postgres : migration pas encore passée. */
const TABLE_ABSENTE = ['PGRST205', '42P01']

async function toutesLesPages<T>(
  lire: (du: number, au: number) => PromiseLike<{ data: T[] | null; error: PostgrestError | null }>,
  contexte: string,
  { videSiAbsente = false } = {},
): Promise<T[]> {
  const lignes: T[] = []
  for (let du = 0; ; du += PAGE) {
    const reponse = await lire(du, du + PAGE - 1)
    if (videSiAbsente && reponse.error && TABLE_ABSENTE.includes(reponse.error.code)) return []
    const page = verifier(reponse, contexte)
    lignes.push(...page)
    if (page.length < PAGE) return lignes
  }
}

export interface ChapitreBrut {
  id: string
  moduleId: string
  position: number
  titre: string
  dureeSecondes: number
}

export async function listerChapitresPedagogie(): Promise<ChapitreBrut[]> {
  const rows = verifier(
    await supabase().from('chapitres').select('id, module_id, position, titre, video_duree_secondes, duree_minutes'),
    'chapitres',
  )
  return rows.map((c) => ({
    id: c.id,
    moduleId: c.module_id,
    position: c.position,
    titre: c.titre,
    dureeSecondes: c.video_duree_secondes ?? (c.duree_minutes ?? 0) * 60,
  }))
}

export async function listerTousVisionnages(): Promise<{ utilisateurId: string; chapitreId: string; secondesVues: number }[]> {
  const rows = await toutesLesPages<{ utilisateur_id: string; chapitre_id: string; secondes_vues: number }>(
    (du, au) =>
      supabase()
        .from('visionnages')
        .select('utilisateur_id, chapitre_id, secondes_vues')
        .order('chapitre_id')
        .order('utilisateur_id')
        .range(du, au),
    'visionnages',
  )
  return rows.map((v) => ({ utilisateurId: v.utilisateur_id, chapitreId: v.chapitre_id, secondesVues: v.secondes_vues }))
}

/** Tentatives de quiz ; vide tant que la migration des quiz n'est pas passée. */
export async function listerToutesTentativesQuiz(): Promise<{ utilisateurId: string; moduleId: string; note: number; reussi: boolean }[]> {
  const rows = await toutesLesPages<{ utilisateur_id: string; module_id: string; note: number; reussi: boolean }>(
    (du, au) => supabase().from('quiz_tentatives').select('utilisateur_id, module_id, note, reussi').order('id').range(du, au),
    'tentatives de quiz',
    { videSiAbsente: true },
  )
  return rows.map((t) => ({ utilisateurId: t.utilisateur_id, moduleId: t.module_id, note: t.note, reussi: t.reussi }))
}
