import { defineStore } from 'pinia'
import type { Utilisateur } from '#shared/types'

export const useAuthStore = defineStore('auth', () => {
  const utilisateur = ref<Utilisateur | null>(null)
  const charge = ref(false)

  const estConnecte = computed(() => !!utilisateur.value)
  const estAdmin = computed(
    () =>
      utilisateur.value?.role === 'admin-contenu' ||
      utilisateur.value?.role === 'admin-superieur',
  )
  const estAdminSuperieur = computed(() => utilisateur.value?.role === 'admin-superieur')
  const estFormateur = computed(() => utilisateur.value?.role === 'formateur')

  async function rafraichir() {
    // useRequestFetch transmet les cookies de la requête entrante pendant le SSR ;
    // un $fetch nu perdrait la session et renverrait toujours null côté serveur.
    const requete = useRequestFetch()
    utilisateur.value = await requete<Utilisateur | null>('/api/auth/moi')
    charge.value = true
  }

  async function connexion(email: string) {
    utilisateur.value = await $fetch<Utilisateur>('/api/auth/connexion', {
      method: 'POST',
      body: { email },
    })
  }

  async function inscription(payload: { prenom: string; nom: string; email: string }) {
    utilisateur.value = await $fetch<Utilisateur>('/api/auth/inscription', {
      method: 'POST',
      body: payload,
    })
  }

  async function deconnexion() {
    await $fetch('/api/auth/deconnexion', { method: 'POST' })
    utilisateur.value = null
  }

  return {
    utilisateur,
    charge,
    estConnecte,
    estAdmin,
    estAdminSuperieur,
    estFormateur,
    rafraichir,
    connexion,
    inscription,
    deconnexion,
  }
})
