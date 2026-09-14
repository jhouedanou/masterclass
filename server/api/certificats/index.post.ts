import { delivrerCertificat } from '../../database/commerce'
import { confirmerIdentiteCertificat, majProfilUtilisateur } from '../../database/comptes'
import { exigerUtilisateur } from '../../utils/session'

/**
 * Certificat de participation délivré une fois le module réalisé — après
 * l'écran de validation (planche B, écran 05) : l'apprenant confirme prénom et
 * nom, qui figureront tels quels sur le PDF ; une correction met le compte à
 * jour avant la génération.
 *
 * Le numéro EMBF-<programme>-<année>-<séquence> est tiré d'une séquence
 * Postgres : deux délivrances simultanées ne peuvent plus produire le même.
 * L'opération est idempotente — redemander son certificat le renvoie.
 */
export default defineEventHandler(async (event) => {
  const utilisateur = await exigerUtilisateur(event)
  const { moduleId, prenom, nom } = await readBody<{ moduleId: string; prenom?: string; nom?: string }>(event)

  const prenomConfirme = (prenom ?? '').trim()
  const nomConfirme = (nom ?? '').trim()
  if (!prenomConfirme || !nomConfirme) {
    throw createError({ statusCode: 422, statusMessage: 'Vérifiez votre prénom et votre nom : ils figureront sur le certificat.' })
  }
  if (prenomConfirme !== utilisateur.prenom || nomConfirme !== utilisateur.nom) {
    await majProfilUtilisateur(utilisateur.id, {
      prenom: prenomConfirme,
      nom: nomConfirme,
      whatsapp: utilisateur.whatsapp,
      pays: utilisateur.pays,
    })
  }
  const certificat = await delivrerCertificat(utilisateur.id, moduleId)
  await confirmerIdentiteCertificat(utilisateur.id, moduleId)
  return certificat
})
