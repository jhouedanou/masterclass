import { changerStatutCandidature, enregistrerJournal, trouverCandidature } from '../../database/administration'
import { exigerSection } from '../../utils/session'

/** Étude ou refus d'une candidature (planche C, écran 11). L'acceptation
 *  passe par la création du compte formateur (`POST /api/admin/formateurs`). */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'candidatures-formateurs')
  const { id, action } = await readBody<{ id?: string; action?: 'en-etude' | 'refuser' | 'nouvelle' }>(event)

  const candidature = await trouverCandidature(id ?? '')
  if (!candidature) throw createError({ statusCode: 404, statusMessage: 'Candidature introuvable' })
  if (candidature.statut === 'acceptee') {
    throw createError({ statusCode: 409, statusMessage: 'Candidature déjà acceptée' })
  }

  const statut = action === 'refuser' ? 'refusee' : action === 'en-etude' ? 'en-etude' : 'nouvelle'
  const majee = await changerStatutCandidature(candidature.id, statut)
  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    statut === 'refusee' ? 'a refusé la candidature de' : statut === 'en-etude' ? 'a mis en étude la candidature de' : 'a rouvert la candidature de',
    candidature.nom,
  )
  return majee
})
