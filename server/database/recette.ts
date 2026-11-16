import type { AnomalieRecette, ResultatRecette, StatutRecette } from '#shared/types'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'

/**
 * Résultats de la recette partagée (/admin/recette).
 *
 * La liste des contrôles vit dans `server/data/recette.json` ; la base ne porte
 * que ce que chaque testeur a coché.
 */

/** Table inconnue de PostgREST ou de Postgres : migration pas encore passée. */
const TABLE_ABSENTE = ['PGRST205', '42P01']

/** « Prénom N. » par identifiant de testeur. */
async function nomsDesTesteurs(identifiants: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(identifiants)]
  if (!ids.length) return new Map()
  const comptes = verifier(
    await supabase().from('utilisateurs').select('id, prenom, nom').in('id', ids),
    'testeurs de la recette',
  )
  // L'initiale est omise quand le nom n'en est pas un (« (à compléter) » sur
  // une fiche inachevée).
  return new Map(
    comptes.map((c) => [c.id, `${c.prenom} ${/^\p{L}/u.test(c.nom ?? '') ? `${c.nom[0]}.` : ''}`.trim()]),
  )
}

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

  const noms = await nomsDesTesteurs(lignes.map((l) => l.testeur_id))

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

// --- Anomalies libres ---------------------------------------------------------

/**
 * Toutes les anomalies signalées, de la plus récente à la plus ancienne.
 * `null` quand la table n'existe pas encore (migration 53 non passée).
 */
export async function listerAnomaliesRecette(): Promise<AnomalieRecette[] | null> {
  const reponse = await supabase()
    .from('recette_anomalies')
    .select('*')
    .order('cree_le', { ascending: false })
  if (reponse.error && TABLE_ABSENTE.includes(reponse.error.code)) return null
  const lignes = verifier(reponse, 'anomalies de recette')
  const noms = await nomsDesTesteurs(lignes.map((l) => l.testeur_id))

  return lignes.map((l) => ({
    id: l.id,
    testeurId: l.testeur_id,
    testeur: noms.get(l.testeur_id) ?? 'Testeur',
    page: l.page,
    description: l.description,
    creeLe: l.cree_le,
    corrigeeLe: l.corrigee_le,
  }))
}

/** Le testeur qui a signalé l'anomalie, `null` si elle n'existe pas. */
export async function auteurAnomalieRecette(id: string): Promise<string | null> {
  // Un identifiant mal formé ferait échouer la requête : c'est une absence.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return null
  const ligne = verifierOptionnel(
    await supabase().from('recette_anomalies').select('testeur_id').eq('id', id).maybeSingle(),
    'anomalie de recette',
  )
  return ligne?.testeur_id ?? null
}

export async function signalerAnomalieRecette(
  testeurId: string,
  page: string,
  description: string,
): Promise<string> {
  const ligne = verifier(
    await supabase()
      .from('recette_anomalies')
      .insert({ testeur_id: testeurId, page, description })
      .select('id')
      .single(),
    'signalement d’une anomalie de recette',
  )
  return ligne.id
}

/** Déclare l'anomalie corrigée (`true`) ou la rouvre (`false`). */
export async function marquerAnomalieRecette(id: string, corrigee: boolean): Promise<void> {
  verifier(
    await supabase()
      .from('recette_anomalies')
      .update({ corrigee_le: corrigee ? new Date().toISOString() : null })
      .eq('id', id)
      .select('id'),
    'mise à jour d’une anomalie de recette',
  )
}

export async function supprimerAnomalieRecette(id: string): Promise<void> {
  const { error } = await supabase().from('recette_anomalies').delete().eq('id', id)
  if (error) throw traduireErreur(error, 'suppression d’une anomalie de recette')
}
