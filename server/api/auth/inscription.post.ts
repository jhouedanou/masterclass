import { creerUtilisateur } from '../../database/comptes'
import { hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { limiterDebit } from '../../utils/debit'
import { contexteMeta, envoyerEvenementMeta, type SuiviNavigateur } from '../../utils/metaCapi'
import { ouvrirSession } from '../../utils/session'

/** Création d'un compte apprenant. Le pays est demandé ici et n'est plus
 *  redemandé dans la fiche apprenant (spec §8). */
export default defineEventHandler(async (event) => {
  await limiterDebit(event, 'inscription')
  const body = await readBody<{
    prenom?: string
    nom?: string
    email?: string
    motDePasse?: string
    whatsapp?: string
    pays?: string
    /** Consentement et cookies Meta (app/composables/useSuivi.ts). */
    suivi?: SuiviNavigateur
  }>(event)

  const email = (body.email ?? '').trim().toLowerCase()
  if (!email || !body.prenom?.trim() || !body.nom?.trim()) {
    throw createError({ statusCode: 422, statusMessage: 'Prénom, nom et e-mail sont requis' })
  }

  const refus = refusMotDePasse(body.motDePasse ?? '')
  if (refus) {
    throw createError({ statusCode: 422, statusMessage: refus })
  }

  const utilisateur = await creerUtilisateur({
    prenom: body.prenom.trim(),
    nom: body.nom.trim(),
    email,
    whatsapp: body.whatsapp?.trim() || undefined,
    pays: body.pays?.trim() || undefined,
    motDePasseHache: await hacherMotDePasse(body.motDePasse!),
  })

  await ouvrirSession(event, utilisateur)

  // CompleteRegistration côté serveur, sous l'identifiant du Pixel
  // (app/pages/inscription.vue, app/pages/achat/compte.vue). Hors du chemin de
  // la réponse : l'inscription n'attend pas Meta.
  const contexte = contexteMeta(event, body.suivi)
  if (contexte) {
    event.waitUntil(
      envoyerEvenementMeta({
        nom: 'CompleteRegistration',
        eventId: `inscription-${utilisateur.id}`,
        utilisateur,
        contexte,
      }),
    )
  }

  return utilisateur
})
