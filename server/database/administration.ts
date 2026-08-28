import type { Article, EntreeJournal, Formateur, Module, Programme } from '#shared/types'
import type { CandidatureFormateur } from '#shared/types'
import type { PostgrestError } from '@supabase/supabase-js'
import { supabase } from './client'
import { traduireErreur, verifier, verifierOptionnel } from './erreurs'
import {
  versArticle,
  versCandidatureFormateur,
  versEntreeJournal,
  versFormateur,
  versModule,
  versProgramme,
  versReglagesFinanciers,
  versReglagesSeo,
  type ReglagesFinanciers,
  type ReglagesSeo,
} from './mappers'
import type { ColonnesSeo, ReglagesFinanciersRow } from './types'

/** Back-office : journal, réglages, référencement, recrutement. */

// --- Journal ---------------------------------------------------------------

export async function listerJournal(limite = 200): Promise<EntreeJournal[]> {
  const rows = verifier(
    await supabase()
      .from('journal')
      .select('*')
      .order('date_entree', { ascending: false })
      .limit(limite),
    'journal',
  )
  return rows.map(versEntreeJournal)
}

export async function enregistrerJournal(
  auteur: string,
  action: string,
  cible: string,
): Promise<void> {
  verifier(
    await supabase().from('journal').insert({ auteur, action, cible }).select('id'),
    'journalisation',
  )
}

// --- Réglages --------------------------------------------------------------

export async function lireReglagesFinanciers(): Promise<ReglagesFinanciers> {
  const row = verifier(
    await supabase().from('reglages_financiers').select('*').single(),
    'réglages financiers',
  )
  return versReglagesFinanciers(row)
}

/** La répartition Big Five / formateur doit totaliser 100 % — la contrainte
 *  `repartition_totalise_cent` le refuse aussi côté base. */
export async function majReglagesFinanciers(
  champs: Partial<ReglagesFinanciers>,
): Promise<ReglagesFinanciers> {
  const colonnes: Partial<ReglagesFinanciersRow> = {}
  if (champs.fraisPaiementPourcent !== undefined)
    colonnes.frais_paiement_pourcent = champs.fraisPaiementPourcent
  if (champs.partBigFivePourcent !== undefined)
    colonnes.part_big_five_pourcent = champs.partBigFivePourcent
  if (champs.partFormateurPourcent !== undefined)
    colonnes.part_formateur_pourcent = champs.partFormateurPourcent
  if (champs.objectifInscriptionsMensuel !== undefined)
    colonnes.objectif_inscriptions_mensuel = champs.objectifInscriptionsMensuel
  if (champs.objectifCaMensuel !== undefined)
    colonnes.objectif_ca_mensuel = champs.objectifCaMensuel

  if (!Object.keys(colonnes).length) return lireReglagesFinanciers()

  const row = verifier(
    await supabase().from('reglages_financiers').update(colonnes).eq('id', true).select('*').single(),
    'mise à jour des réglages financiers',
  )
  return versReglagesFinanciers(row)
}

export async function lireReglagesSeo(): Promise<ReglagesSeo> {
  const row = verifier(await supabase().from('reglages_seo').select('*').single(), 'réglages SEO')
  return versReglagesSeo(row)
}

// --- Référencement ---------------------------------------------------------

export type TableSeo = 'modules' | 'formateurs' | 'articles' | 'programmes'

/**
 * Les quatre entités dont le référencement est éditable ont chacune leur espace
 * d'identifiants : on cherche dans l'une après l'autre jusqu'à trouver.
 *
 * Les requêtes sont écrites table par table plutôt que dans une boucle : une
 * table désignée par une variable fait perdre à PostgREST le type de la ligne
 * renvoyée.
 */
export async function localiserEntiteSeo(
  id: string,
): Promise<{ table: TableSeo; slug: string } | null> {
  const db = supabase()

  const module = verifierOptionnel(
    await db.from('modules').select('slug').eq('id', id).maybeSingle(),
    'localisation du module',
  )
  if (module) return { table: 'modules', slug: module.slug }

  const formateur = verifierOptionnel(
    await db.from('formateurs').select('slug').eq('id', id).maybeSingle(),
    'localisation du formateur',
  )
  if (formateur) return { table: 'formateurs', slug: formateur.slug }

  const article = verifierOptionnel(
    await db.from('articles').select('slug').eq('id', id).maybeSingle(),
    'localisation de l’article',
  )
  if (article) return { table: 'articles', slug: article.slug }

  const programme = verifierOptionnel(
    await db.from('programmes').select('slug').eq('id', id).maybeSingle(),
    'localisation du programme',
  )
  if (programme) return { table: 'programmes', slug: programme.slug }

  return null
}

/** Un slug déjà pris rend l'URL ambiguë : on le dit plutôt que de laisser
 *  remonter une violation d'unicité générique. */
function verifierMaj<T>(reponse: { data: T; error: PostgrestError | null }): NonNullable<T> {
  if (reponse.error?.code === '23505') {
    throw createError({ statusCode: 409, statusMessage: 'Cette URL est déjà utilisée' })
  }
  if (reponse.error) throw traduireErreur(reponse.error, 'mise à jour du référencement')
  return reponse.data as NonNullable<T>
}

export async function majSeoEntite(
  table: TableSeo,
  id: string,
  champs: Partial<ColonnesSeo> & { slug?: string },
): Promise<Programme | Module | Formateur | Article> {
  const db = supabase()

  switch (table) {
    case 'modules':
      // Les chapitres ne sont pas touchés par une édition de référencement.
      return versModule(
        verifierMaj(await db.from('modules').update(champs).eq('id', id).select('*').single()),
      )

    case 'formateurs':
      return versFormateur(
        verifierMaj(await db.from('formateurs').update(champs).eq('id', id).select('*').single()),
      )

    case 'articles':
      return versArticle(
        verifierMaj(await db.from('articles').update(champs).eq('id', id).select('*').single()),
      )

    case 'programmes': {
      // Le slug d'un programme est une valeur énumérée, référencée par les
      // thématiques, les modules et les formateurs : il n'est pas éditable ici.
      const { slug: _verrouille, ...seo } = champs
      return versProgramme(
        verifierMaj(await db.from('programmes').update(seo).eq('id', id).select('*').single()),
      )
    }
  }
}

export async function listerRedirections() {
  const rows = verifier(
    await supabase().from('redirections').select('*').order('creee_le', { ascending: false }),
    'redirections',
  )
  return rows.map((row) => ({ de: row.de, vers: row.vers, creeeLe: row.creee_le }))
}

/** Redirection permanente posée lors d'un changement de slug publié
 *  (spec SEO §5). Une même origine ne peut être redirigée deux fois. */
export async function creerRedirection(de: string, vers: string): Promise<void> {
  const { error } = await supabase().from('redirections').upsert({ de, vers }, { onConflict: 'de' })
  if (error) throw traduireErreur(error, 'création de la redirection')
}

// --- Recrutement -----------------------------------------------------------

export async function listerCandidatures(): Promise<CandidatureFormateur[]> {
  const rows = verifier(
    await supabase()
      .from('candidatures_formateurs')
      .select('*')
      .order('recue_le', { ascending: false }),
    'candidatures',
  )
  return rows.map(versCandidatureFormateur)
}

// --- Attribution d'accès ---------------------------------------------------

/** Accès offert par un administrateur : motif obligatoire, journalisation
 *  incluse, le tout dans la même transaction. */
export async function attribuerAcces(
  utilisateurId: string,
  moduleId: string,
  motif: string,
  auteur: string,
): Promise<void> {
  const { error } = await supabase().rpc('attribuer_acces', {
    p_utilisateur_id: utilisateurId,
    p_module_id: moduleId,
    p_motif: motif,
    p_auteur: auteur,
  })
  if (error) throw traduireErreur(error, 'attribution d’accès')
}
