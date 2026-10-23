import { motifsBlocageSuppression, listerMotifs } from '#shared/utils/suppressionFormateur'
import { enregistrerJournal } from '../../../database/administration'
import {
  bloquantsSuppressionFormateurs,
  supprimerFormateurEtCompte,
  trouverFormateur,
} from '../../../database/catalogue'
import { exigerAdmin } from '../../../utils/session'

/**
 * « Supprimer définitivement » un formateur (planche C, écran 11).
 *
 * La fiche et le compte qui y entre partent ensemble, ou rien ne part : c'est
 * la fonction `supprimer_formateur` qui le garantit, dans une transaction.
 * Tout ce qui renvoie au formateur bloque, quel qu'en soit le statut — module
 * en brouillon, session passée, demande de coaching close, candidature,
 * article — et le refus nomme chacun. Rien n'est réassigné d'office.
 *
 * Réservé à l'administrateur supérieur : la section « Formateurs » ouvre
 * l'édition des fiches, pas l'effacement d'un compte et de son historique de
 * connexion. Même règle que la réinitialisation TOTP.
 *
 * La saisie « SUPPRIMER » de la modale est revérifiée ici : un appel direct à
 * la route ne doit pas pouvoir s'en dispenser.
 */
export default defineEventHandler(async (event) => {
  const admin = await exigerAdmin(event, true)
  const id = getRouterParam(event, 'id') ?? ''
  const { confirmation } = await readBody<{ confirmation?: string }>(event)

  if (confirmation !== 'SUPPRIMER') {
    throw createError({ statusCode: 422, statusMessage: 'Tapez « SUPPRIMER » pour confirmer.' })
  }

  const formateur = await trouverFormateur(id)
  if (!formateur) throw createError({ statusCode: 404, statusMessage: 'Formateur introuvable' })

  const bloquants = (await bloquantsSuppressionFormateurs(id)).get(id)
  const motifs = bloquants ? motifsBlocageSuppression(bloquants) : []
  if (motifs.length) {
    throw createError({
      statusCode: 409,
      statusMessage: `Suppression impossible : ${formateur.nom} est encore rattaché à ${listerMotifs(motifs)}. Réassignez ou retirez ces éléments d’abord.`,
    })
  }

  const { nom, comptes } = await supprimerFormateurEtCompte(id)

  await enregistrerJournal(
    `${admin.prenom} ${admin.nom}`,
    'a supprimé définitivement le formateur',
    comptes.length ? `${nom} (compte ${comptes.join(', ')})` : nom,
    { type: 'compte', objet: 'formateur' },
  )

  return { ok: true, nom, comptes }
})
