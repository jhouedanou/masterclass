import { enregistrerJournal } from '../../database/administration'
import { retablirCertificat, revoquerCertificat } from '../../database/commerce'
import { exigerAdmin } from '../../utils/session'

/**
 * Révocation d'une attestation délivrée à tort, et retour en arrière.
 *
 * Comme l'attribution d'un accès gratuit, c'est une décision de l'équipe qui
 * touche un apprenant : motif obligatoire et action journalisée, pour qu'elle
 * reste explicable des mois plus tard. Le document n'est pas effacé — il a pu
 * être imprimé — mais la page publique de vérification le déclare non valable.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event)
  const { numero, motif, action } = await readBody<{
    numero?: string
    motif?: string
    action?: 'revoquer' | 'retablir'
  }>(event)

  if (!numero?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Attestation non précisée' })
  }
  const auteur = `${admin.prenom} ${admin.nom}`

  if (action === 'retablir') {
    const certificat = await retablirCertificat(numero.trim())
    await enregistrerJournal(auteur, 'a rétabli une attestation', certificat.numero, {
      type: 'certificat',
      objet: 'attestation',
    })
    return certificat
  }

  if (!motif?.trim()) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Indiquez le motif de la révocation.',
    })
  }

  const certificat = await revoquerCertificat(numero.trim(), motif.trim())
  await enregistrerJournal(
    auteur,
    'a révoqué une attestation',
    `${certificat.numero} — ${certificat.prenomNom} — ${motif.trim()}`,
    { type: 'certificat', objet: 'attestation' },
  )
  return certificat
})
