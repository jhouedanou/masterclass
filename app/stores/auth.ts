import { defineStore } from 'pinia'
import type { SectionAdmin, Utilisateur } from '#shared/types'

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

  /** Droit fin par section du back-office : un administrateur supérieur voit
   *  tout, un administrateur de contenu seulement ses sections cochées. */
  function voitSection(section: SectionAdmin) {
    if (utilisateur.value?.role === 'admin-superieur') return true
    return utilisateur.value?.sectionsAutorisees?.includes(section) === true
  }
  const estFormateur = computed(() => utilisateur.value?.role === 'formateur')

  async function rafraichir() {
    // useRequestFetch transmet les cookies de la requête entrante pendant le SSR ;
    // un $fetch nu perdrait la session et renverrait toujours null côté serveur.
    const requete = useRequestFetch()
    utilisateur.value = await requete<Utilisateur | null>('/api/auth/moi')
    charge.value = true
  }

  async function connexion(email: string, motDePasse: string) {
    utilisateur.value = await $fetch<Utilisateur>('/api/auth/connexion', {
      method: 'POST',
      body: { email, motDePasse },
    })
  }

  /** Connexion admin, étape 1 : mot de passe. Renvoie l'adresse masquée à
   *  laquelle le code est envoyé. */
  async function connexionAdmin(email: string, motDePasse: string) {
    return await $fetch<{ etape: 'code'; masque: string }>('/api/auth/admin/connexion', {
      method: 'POST',
      body: { email, motDePasse },
    })
  }

  /** Étape 2 : code à six chiffres. Ouvre la session. */
  async function validerCode(code: string) {
    utilisateur.value = await $fetch<Utilisateur>('/api/auth/admin/verifier-code', {
      method: 'POST',
      body: { code },
    })
  }

  async function inscription(payload: {
    prenom: string
    nom: string
    email: string
    motDePasse: string
    whatsapp?: string
    pays?: string
  }) {
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
    voitSection,
    rafraichir,
    connexion,
    connexionAdmin,
    validerCode,
    inscription,
    deconnexion,
  }
})
