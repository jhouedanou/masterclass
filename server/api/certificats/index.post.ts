import { delivrerCertificat, listerCertificatsUtilisateur } from '../../database/commerce'
import { confirmerIdentiteCertificat, majProfilUtilisateur } from '../../database/comptes'
import { notifierCompte } from '../../utils/notifications'
import { exigerUtilisateur } from '../../utils/session'

/**
 * Certificat de participation délivré une fois le module réalisé — après
 * l'écran de validation (planche B, écran 05) : l'apprenant confirme prénom et
 * nom, qui figureront tels quels sur le PDF ; une correction met le compte à
 * jour avant la génération.
 *
 * Le numéro EMBF-<programme>-<année>-<séquence>-<suffixe aléatoire> est tiré d'une séquence
 * Postgres : deux délivrances simultanées ne peuvent plus produire le même.
 * L'opération est idempotente — redemander son certificat le renvoie. L'e-mail
 * de l'attestation (recette ATT-09) ne part qu'à la première délivrance : deux
 * demandes simultanées ne peuvent pas en créer deux, la seconde se heurte à
 * l'unicité (apprenant, module) de la table.
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
  const dejaDelivre = (await listerCertificatsUtilisateur(utilisateur.id)).some((c) => c.moduleId === moduleId)
  const certificat = await delivrerCertificat(utilisateur.id, moduleId)
  await confirmerIdentiteCertificat(utilisateur.id, moduleId)
  if (!dejaDelivre) {
    await notifierCompte(utilisateur, 'attestation-delivree', {
      prenom: prenomConfirme,
      module: certificat.titreModule,
      numero: certificat.numero,
    })
  }
  return certificat
})
