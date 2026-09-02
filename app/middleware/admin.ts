export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.charge) await auth.rafraichir()
  if (!auth.estConnecte) {
    return navigateTo(`/admin/login?suite=${encodeURIComponent(to.fullPath)}`)
  }
  if (!auth.estAdmin) {
    throw createError({ statusCode: 403, statusMessage: 'Accès réservé à l’administration' })
  }
})
