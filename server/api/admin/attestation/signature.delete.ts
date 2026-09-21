import { lireReglagesAttestation, majReglagesAttestation } from '../../../database/administration'
import { majFormateur, trouverFormateur } from '../../../database/catalogue'
import { SEAU_SIGNATURES, cheminDansSeau, effacerImage } from '../../../utils/photos'
import { exigerAdmin } from '../../../utils/session'

/**
 * Retrait d'une griffe. Le pied de l'attestation retombe alors sur sa ligne
 * nue — l'état d'avant tout dépôt, et celui de toutes les attestations tant
 * que personne n'a signé.
 *
 * Le fichier part du seau en même temps que la référence : laissé là, il
 * resterait servi publiquement par une adresse que plus rien ne désigne, ce
 * qu'on ne pourrait plus ni retrouver ni justifier.
 */
export default defineEventHandler(async (event) => {
  await exigerAdmin(event)

  const formateurId = (getQuery(event).formateur as string | undefined)?.trim() || null
  const formateur = formateurId ? await trouverFormateur(formateurId) : null
  if (formateurId && !formateur) {
    throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })
  }

  const ancienne = formateur ? formateur.signature : (await lireReglagesAttestation()).signature

  if (formateurId) await majFormateur(formateurId, { signature: '' })
  else await majReglagesAttestation({ signature: '' })

  await effacerImage(SEAU_SIGNATURES, cheminDansSeau(SEAU_SIGNATURES, ancienne))
  return { signature: '' }
})
