export default defineNuxtRouteMiddleware(async (to) => {
  const auth = useAuthStore()
  if (!auth.charge) await auth.rafraichir()
  if (!auth.estConnecte) {
    return navigateTo(`/connexion?suite=${encodeURIComponent(to.fullPath)}`)
  }
})
