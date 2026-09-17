import { limiterDebit } from '../utils/debit'
import { notifier } from '../utils/notifications'

/**
 * Formulaire de contact (planche A, écran 08). Chaque champ est vérifié
 * séparément pour que l'écran signale l'erreur sous le bon champ
 * (« Adresse email incomplète — vérifiez le format. »), et un accusé de
 * réception part aussitôt : « un accusé vient de vous être adressé ».
 */
export default defineEventHandler(async (event) => {
  await limiterDebit(event, 'contact')
  const body = await readBody<{
    nom?: string
    email?: string
    whatsapp?: string
    sujet?: string
    reference?: string
    message?: string
  }>(event)

  const nom = (body.nom ?? '').trim()
  const email = (body.email ?? '').trim()
  const sujet = (body.sujet ?? '').trim()
  const message = (body.message ?? '').trim()

  // Le corps part en variables de gabarit d'e-mail : chaque champ est borné,
  // pour qu'un formulaire public ne serve pas à pousser un roman dans la boîte
  // de l'équipe.
  const LONGUEURS: Record<string, number> = {
    nom: 120,
    email: 254,
    whatsapp: 30,
    sujet: 120,
    reference: 120,
    message: 5000,
  }

  const erreurs: Record<string, string> = {}
  for (const [champ, maximum] of Object.entries(LONGUEURS)) {
    const valeur = (body as Record<string, string | undefined>)[champ] ?? ''
    if (valeur.trim().length > maximum) {
      erreurs[champ] = `Ce champ est limité à ${maximum} caractères.`
    }
  }
  if (!nom) erreurs.nom = 'Indiquez votre nom et prénom.'
  if (!email) erreurs.email = 'Indiquez votre adresse email.'
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    erreurs.email = 'Adresse email incomplète — vérifiez le format.'
  }
  if (!sujet) erreurs.sujet = 'Choisissez un sujet.'
  if (!message) erreurs.message = 'Écrivez votre message.'

  if (Object.keys(erreurs).length) {
    throw createError({ statusCode: 422, statusMessage: 'Vérifiez les champs signalés.', data: { erreurs } })
  }

  // Le message est transmis à l'équipe et un accusé part à l'expéditeur.
  await notifier({
    canal: 'email',
    a: 'contact@bigfive.ci',
    modele: 'contact-message',
    variables: {
      nom,
      email,
      whatsapp: (body.whatsapp ?? '').trim(),
      sujet,
      reference: (body.reference ?? '').trim(),
      message,
    },
  })
  await notifier({ canal: 'email', a: email, modele: 'contact-accuse', variables: { nom, sujet } })

  return { ok: true }
})
