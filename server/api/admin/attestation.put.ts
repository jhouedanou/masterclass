import { majReglagesAttestation } from '../../database/administration'
import { exigerAdmin } from '../../utils/session'

/**
 * La légende sous la ligne de signature de la direction. Elle était écrite en
 * dur dans le gabarit de l'attestation ; la changer demandait un déploiement.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)
  const { signataire } = await readBody<{ signataire?: string }>(event)

  const valeur = (signataire ?? '').trim()
  if (!valeur) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Le nom du signataire ne peut pas être vide',
    })
  }

  return majReglagesAttestation({ signataire: valeur })
})
