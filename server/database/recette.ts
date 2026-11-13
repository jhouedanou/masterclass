import type { ResultatRecette, StatutRecette } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier } from './erreurs'

/**
 * Résultats de la recette partagée (/admin/recette).
 *
 * La liste des contrôles vit dans `server/data/recette.json` ; la base ne porte
 * que ce que chaque testeur a coché.
 */

/** Table inconnue de PostgREST ou de Postgres : migration pas encore passée. */
const TABLE_ABSENTE = ['PGRST205', '42P01']

/**
 * Tous les résultats, du plus récent au plus ancien, avec le nom du testeur.
 * `null` quand la table n'existe pas encore : l'écran affiche alors la liste
 * des contrôles et dit quel script passer, au lieu de tomber.
 */
export async function listerResultatsRecette(): Promise<ResultatRecette[] | null> {
  const reponse = await supabase()
    .from('recette_resultats')
    .select('*')
    .order('maj_le', { ascending: false })
  if (reponse.error && TABLE_ABSENTE.includes(reponse.error.code)) return null
  const lignes = verifier(reponse, 'résultats de recette')
  if (!lignes.length) return []

  const ids = [...new Set(lignes.map((l) => l.testeur_id))]
  const comptes = verifier(
    await supabase().from('utilisateurs').select('id, prenom, nom').in('id', ids),
    'testeurs de la recette',
  )
  // « Prénom N. » ; l'initiale est omise quand le nom n'en est pas un
  // (« (à compléter) » sur une fiche inachevée).
  const noms = new Map(
    comptes.map((c) => [c.id, `${c.prenom} ${/^\p{L}/u.test(c.nom ?? '') ? `${c.nom[0]}.` : ''}`.trim()]),
  )

  return lignes.map((l) => ({
    controle: l.controle,
    testeurId: l.testeur_id,
    testeur: noms.get(l.testeur_id) ?? 'Testeur',
    statut: l.statut,
    note: l.note,
    majLe: l.maj_le,
  }))
}

/** Pose ou remplace le résultat d'un testeur sur un contrôle. */
export async function enregistrerResultatRecette(
  controle: string,
  testeurId: string,
  statut: StatutRecette,
  note: string,
): Promise<void> {
  verifier(
    await supabase()
      .from('recette_resultats')
      .upsert(
        { controle, testeur_id: testeurId, statut, note, maj_le: new Date().toISOString() },
        { onConflict: 'controle,testeur_id' },
      )
      .select('controle'),
    'enregistrement d’un résultat de recette',
  )
}

/** Retire le résultat d'un testeur : le contrôle redevient « à faire » pour lui. */
export async function effacerResultatRecette(controle: string, testeurId: string): Promise<void> {
  const { error } = await supabase()
    .from('recette_resultats')
    .delete()
    .eq('controle', controle)
    .eq('testeur_id', testeurId)
  if (error) throw traduireErreur(error, 'effacement d’un résultat de recette')
}
