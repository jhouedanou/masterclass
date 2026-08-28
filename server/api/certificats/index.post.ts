import { delivrerCertificat } from '../../database/commerce'
import { exigerUtilisateur } from '../../utils/session'

/**
 * Certificat de participation délivré une fois le module réalisé.
 *
 * Le numéro EMBF-<programme>-<année>-<séquence> est tiré d'une séquence
 * Postgres : deux délivrances simultanées ne peuvent plus produire le même.
 * L'opération est idempotente — redemander son certificat le renvoie.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleId } = await readBody<{ moduleId: string }>(event)
  return await delivrerCertificat(utilisateur.id, moduleId)
})
