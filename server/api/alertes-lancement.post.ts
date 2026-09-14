import { enregistrerAlerteLancement, trouverModuleParSlug } from '../database/catalogue'

/** « Être prévenu du lancement » (planche A, écran 03c, état 4) : collecte email/WhatsApp. */
export default defineEventHandler(async (event) => {
  const body = await readBody<{ slug?: string; email?: string; whatsapp?: string }>(event)
  const email = (body.email ?? '').trim().toLowerCase()
  const whatsapp = (body.whatsapp ?? '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw createError({ statusCode: 422, statusMessage: 'Adresse email incomplète — vérifiez le format.' })
  }
  const module = await trouverModuleParSlug(body.slug ?? '')
  if (!module || module.statut === 'brouillon') {
    throw createError({ statusCode: 404, statusMessage: 'Module introuvable' })
  }
  if (module.statut === 'disponible') {
    throw createError({ statusCode: 409, statusMessage: 'Ce module est déjà disponible.' })
  }
  await enregistrerAlerteLancement({ moduleId: module.id, email, whatsapp: whatsapp || undefined })
  return { ok: true }
})
