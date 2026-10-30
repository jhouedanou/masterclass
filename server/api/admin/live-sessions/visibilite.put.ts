import type { VisibiliteLive } from '#shared/types'
import { enregistrerJournal } from '../../../database/administration'
import { majVisibiliteLive } from '../../../database/live'
import { oublierVisibiliteLive } from '../../../utils/live'
import { exigerSection } from '../../../utils/session'

const LIBELLES: Record<VisibiliteLive, string> = {
  personne: 'Personne',
  admins: 'Admins seulement',
  tous: 'Tout le monde',
}

/**
 * Réglage « Fonctionnalité Live Sessions · visible sur le site pour »
 * (planche 07, CDC 10.G) : menu, pages, badges, cartes, onglet formateur et
 * e-mails suivent ce réglage.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerSection(event, 'live-sessions')
  const { visibilite } = await readBody<{ visibilite?: VisibiliteLive }>(event)
  if (!visibilite || !(visibilite in LIBELLES)) {
    throw createError({ statusCode: 422, statusMessage: 'Réglage inconnu' })
  }
  const auteur = `${admin.prenom} ${admin.nom}`
  await majVisibiliteLive(visibilite, auteur)
  oublierVisibiliteLive()
  await enregistrerJournal(auteur, 'a réglé la visibilité des Live Sessions', LIBELLES[visibilite], {
    type: 'reglage',
    objet: 'live-sessions',
  })
  return { visibilite }
})
