import type { StatutRecette } from '#shared/types'
import { recette } from '../../../data/recette'
import { effacerResultatRecette, enregistrerResultatRecette } from '../../../database/recette'
import { exigerAdmin } from '../../../utils/session'

const CONTROLES = new Set(recette.sections.flatMap((s) => s.controles.map((c) => c.k)))
const STATUTS: StatutRecette[] = ['ok', 'ko', 'passe']
const NOTE_MAX = 1000

/**
 * Résultat du testeur connecté sur un contrôle. `statut: null` l'efface.
 * Chacun n'écrit que sa propre ligne : le testeur est celui de la session,
 * jamais un identifiant reçu du navigateur.
 */
export default defineEventHandler(async (event) => {
  const testeur = await exigerAdmin(event)
  const controle = getRouterParam(event, 'controle') ?? ''
  if (!CONTROLES.has(controle)) {
    throw createError({ statusCode: 404, statusMessage: 'Contrôle inconnu' })
  }

  const corps = await readBody<{ statut?: StatutRecette | null; note?: string }>(event)
  const statut = corps?.statut ?? null
  const note = typeof corps?.note === 'string' ? corps.note.trim() : ''
  if (statut !== null && !STATUTS.includes(statut)) {
    throw createError({ statusCode: 422, statusMessage: 'Résultat inconnu' })
  }
  if (note.length > NOTE_MAX) {
    throw createError({ statusCode: 422, statusMessage: `Note trop longue (${NOTE_MAX} caractères au plus)` })
  }

  if (statut === null) await effacerResultatRecette(controle, testeur.id)
  else await enregistrerResultatRecette(controle, testeur.id, statut, note)
  return { controle, statut, note }
})
