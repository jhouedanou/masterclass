import { creerRessource, listerRessources, supprimerRessource } from '../../database/backoffice'
import { exigerSection } from '../../utils/session'

/** Ressources téléchargeables d'un module (onglet « Ressources »). */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')
  const body = await readBody<{
    action: 'creer' | 'supprimer'
    moduleId: string
    id?: string
    titre?: string
    url?: string
    format?: string
  }>(event)

  if (body.action === 'supprimer') {
    if (!body.id) throw createError({ statusCode: 422, statusMessage: 'Ressource non précisée' })
    await supprimerRessource(body.id)
  } else {
    if (!body.titre?.trim() || !body.url?.trim()) {
      throw createError({ statusCode: 422, statusMessage: 'Titre et lien sont requis' })
    }
    const existantes = await listerRessources(body.moduleId)
    await creerRessource({
      moduleId: body.moduleId,
      titre: body.titre.trim(),
      url: body.url.trim(),
      format: body.format,
      position: existantes.length,
    })
  }

  return { ressources: await listerRessources(body.moduleId) }
})
