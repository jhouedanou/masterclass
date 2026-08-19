export default defineEventHandler(async (event) => {
  const body = await readBody<{ nom?: string; email?: string; message?: string }>(event)
  if (!body.nom || !body.email || !body.message) {
    throw createError({ statusCode: 422, statusMessage: 'Tous les champs sont requis' })
  }
  // À brancher sur le service d'envoi d'e-mails retenu.
  console.info('[contact] nouveau message de', body.email)
  return { ok: true }
})
