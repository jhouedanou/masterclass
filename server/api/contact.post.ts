import { notifier } from '../utils/notifications'

/**
 * Formulaire de contact (planche A, écran 08). Chaque champ est vérifié
 * séparément pour que l'écran signale l'erreur sous le bon champ
 * (« Adresse email incomplète — vérifiez le format. »), et un accusé de
 * réception part aussitôt : « un accusé vient de vous être adressé ».
 */
export default defineEventHandler(async (event) => {
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

  const erreurs: Record<string, string> = {}
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
