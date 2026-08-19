export default defineEventHandler(async (event) => {
  await readBody(event)
  // Réponse volontairement identique que le compte existe ou non.
  return { ok: true, message: 'Si un compte existe, un lien de réinitialisation a été envoyé.' }
})
