import { trouverModule } from '../../database/catalogue'
import { DUREE_APERCU_SECONDES, messageApercu } from '../apercu/[slug].get'
import { secretVideo, signer } from '../../utils/video'
import { exigerSection } from '../../utils/session'

/** Lien de relecture à durée limitée, à envoyer à un formateur qui n'a pas de
 *  compte d'administration. */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')
  const { id } = await readBody<{ id: string }>(event)

  const moduleTrouve = await trouverModule(id)
  if (!moduleTrouve) throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })

  const expiration = Math.floor(Date.now() / 1000) + DUREE_APERCU_SECONDES
  const jeton = await signer(messageApercu(moduleTrouve.id, expiration), secretVideo())

  return {
    lien: `${useRuntimeConfig().public.siteUrl}/apercu/${moduleTrouve.slug}?e=${expiration}&jeton=${jeton}`,
    expireLe: expiration,
    validiteMinutes: DUREE_APERCU_SECONDES / 60,
  }
})
