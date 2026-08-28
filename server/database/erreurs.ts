import type { PostgrestError } from '@supabase/supabase-js'

/**
 * Traduction des erreurs Postgres en réponses HTTP.
 *
 * Les fonctions métier (`supabase/migrations/…_fonctions_metier.sql`) lèvent
 * des exceptions portant un SQLSTATE dédié, que PostgREST relaie tel quel.
 * Le message reste celui écrit en base : il est déjà rédigé pour l'utilisateur.
 */
const STATUTS_METIER: Record<string, number> = {
  EM404: 404,
  EM403: 403,
  EM409: 409,
  EM422: 422,
}

/** Codes Postgres génériques susceptibles de remonter d'une écriture directe. */
const STATUTS_POSTGRES: Record<string, { statut: number; message: string }> = {
  '23505': { statut: 409, message: 'Cet enregistrement existe déjà' },
  '23503': { statut: 422, message: 'Référence inconnue' },
  '23514': { statut: 422, message: 'Valeur refusée par une contrainte de la base' },
  '23502': { statut: 422, message: 'Champ obligatoire manquant' },
}

export function traduireErreur(erreur: PostgrestError, contexte: string) {
  const metier = STATUTS_METIER[erreur.code]
  if (metier) {
    return createError({ statusCode: metier, statusMessage: erreur.message })
  }

  const postgres = STATUTS_POSTGRES[erreur.code]
  if (postgres) {
    return createError({ statusCode: postgres.statut, statusMessage: postgres.message })
  }

  // Rien d'exploitable côté client : on journalise le détail et on reste sobre.
  console.error(`[base] ${contexte} — ${erreur.code} ${erreur.message}`, erreur.details)
  return createError({ statusCode: 500, statusMessage: 'Erreur de base de données' })
}

/**
 * Déballe une réponse Supabase pour une lecture qui ramène forcément quelque
 * chose : une liste, ou une ligne obtenue par `.single()`.
 */
export function verifier<T>(
  reponse: { data: T; error: PostgrestError | null },
  contexte: string,
): NonNullable<T> {
  if (reponse.error) throw traduireErreur(reponse.error, contexte)
  return reponse.data as NonNullable<T>
}

/** Variante pour `.maybeSingle()` : l'absence est un résultat valide. */
export function verifierOptionnel<T>(
  reponse: { data: T; error: PostgrestError | null },
  contexte: string,
): NonNullable<T> | null {
  if (reponse.error) throw traduireErreur(reponse.error, contexte)
  return (reponse.data ?? null) as NonNullable<T> | null
}

/** Variante pour une ligne attendue : l'absence devient un 404 explicite. */
export function verifierUn<T>(
  reponse: { data: T; error: PostgrestError | null },
  contexte: string,
  messageAbsence: string,
): NonNullable<T> {
  if (reponse.error) throw traduireErreur(reponse.error, contexte)
  if (reponse.data === null || reponse.data === undefined) {
    throw createError({ statusCode: 404, statusMessage: messageAbsence })
  }
  return reponse.data as NonNullable<T>
}
