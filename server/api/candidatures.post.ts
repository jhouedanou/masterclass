import { creerCandidature } from '../database/administration'

/** Formulaire public « Devenir formateur » (planche A, écran 06). */
export default defineEventHandler(async (event) => {
  const body = await readBody<{
    nom?: string
    whatsapp?: string
    email?: string
    programme?: string
    expertise?: string
    sujet?: string
    experience?: string
    motivation?: string
    portfolio?: string
    linkedin?: string
  }>(event)

  const nom = (body.nom ?? '').trim()
  const whatsapp = (body.whatsapp ?? '').trim()
  const email = (body.email ?? '').trim().toLowerCase()
  const expertise = (body.expertise ?? '').trim()
  const motivation = (body.motivation ?? '').trim()

  if (!nom || !whatsapp || !expertise || !motivation) {
    throw createError({ statusCode: 422, statusMessage: 'Nom, WhatsApp, expertise et message sont obligatoires' })
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Adresse e-mail invalide' })
  }

  // Le message conserve tout le contexte utile à l'étude : programme visé,
  // sujet proposé, années d'expérience.
  const message = [
    body.programme && `Programme : ${body.programme}`,
    body.sujet && `Sujet proposé : ${body.sujet.trim()}`,
    body.experience && `Expérience : ${body.experience} an(s)`,
    motivation,
  ]
    .filter(Boolean)
    .join('\n')

  const candidature = await creerCandidature({
    nom,
    expertise,
    message,
    whatsapp,
    email: email || undefined,
    lien: (body.linkedin || body.portfolio || '').trim() || undefined,
  })
  return { ok: true, id: candidature.id }
})
