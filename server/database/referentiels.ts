import type { CategorieReferentiel, EntreeReferentiel } from '#shared/utils/referentiels'
import { supabase } from './client'
import { verifier, verifierUn } from './erreurs'
import { versReferentiel } from './mappers'

/**
 * Référentiels des champs à choix multiple du profil apprenant.
 *
 * Une entrée n'est jamais supprimée, seulement désactivée : les fiches en
 * conservent la clé, et un effacement ferait disparaître la réponse d'un
 * apprenant de son propre profil. La désactivation la retire du formulaire sans
 * toucher à ce qui est déjà enregistré.
 */

/** Toutes les entrées, actives comprises ou non — l'administration voit tout. */
export async function listerReferentiels(): Promise<EntreeReferentiel[]> {
  const rows = verifier(
    await supabase().from('referentiels').select('*').order('categorie').order('ordre'),
    'référentiels',
  )
  return rows.map(versReferentiel)
}

/** Les seules entrées proposées à la saisie. */
export async function listerReferentielsActifs(): Promise<EntreeReferentiel[]> {
  const rows = verifier(
    await supabase().from('referentiels').select('*').eq('actif', true).order('categorie').order('ordre'),
    'référentiels',
  )
  return rows.map(versReferentiel)
}

export async function creerReferentiel(entree: {
  categorie: CategorieReferentiel
  cle: string
  libelle: string
  ordre?: number
}): Promise<EntreeReferentiel> {
  const row = verifierUn(
    await supabase()
      .from('referentiels')
      .insert({
        id: `ref-${entree.categorie.slice(0, 3)}-${entree.cle}`,
        categorie: entree.categorie,
        cle: entree.cle,
        libelle: entree.libelle,
        ordre: entree.ordre ?? 0,
      })
      .select('*')
      .maybeSingle(),
    'création de l’entrée',
    'Entrée introuvable',
  )
  return versReferentiel(row)
}

/**
 * La clé et la catégorie ne sont pas modifiables : les fiches apprenant
 * pointent dessus. Seuls l'intitulé, le rang et l'activation bougent — c'est
 * précisément ce qui rend le renommage rétroactif.
 */
export async function majReferentiel(
  id: string,
  champs: { libelle?: string; ordre?: number; actif?: boolean },
): Promise<EntreeReferentiel> {
  const colonnes: { libelle?: string; ordre?: number; actif?: boolean } = {}
  if (champs.libelle !== undefined) colonnes.libelle = champs.libelle
  if (champs.ordre !== undefined) colonnes.ordre = champs.ordre
  if (champs.actif !== undefined) colonnes.actif = champs.actif

  const row = verifierUn(
    await supabase().from('referentiels').update(colonnes).eq('id', id).select('*').maybeSingle(),
    'entrée de référentiel',
    'Entrée introuvable',
  )
  return versReferentiel(row)
}
