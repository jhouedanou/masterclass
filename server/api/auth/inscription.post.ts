import { creerUtilisateur } from '../../database/comptes'
import { hacherMotDePasse, refusMotDePasse } from '../../utils/motDePasse'
import { ouvrirSession } from '../../utils/session'

/** Création d'un compte apprenant. Le pays est demandé ici et n'est plus
 *  redemandé dans la fiche apprenant (spec §8). */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    prenom?: string
    nom?: string
    email?: string
    motDePasse?: string
    whatsapp?: string
    pays?: string
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
  return utilisateur
})
