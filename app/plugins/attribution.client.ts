/**
 * Provenance publicitaire (CDC Live Session, 10.B) : à l'arrivée sur le site,
 * `utm_source`, `utm_medium`, `utm_campaign` et les identifiants de clic
 * (`fbclid`, `ttclid`, `li_fat_id`) sont gardés 30 jours dans le cookie
 * `em_attribution`, puis recopiés sur l'inscription à une Live Session
 * (server/api/live-sessions/[slug]/inscription.post.ts).
 *
 * Seulement avec le consentement marketing : avant qu'il soit donné, la
 * provenance attend dans l'onglet (sessionStorage) et n'est écrite qu'une fois
 * le visiteur d'accord ; refusé, rien n'est gardé.
 */
const CLES = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'ttclid', 'li_fat_id'] as const
const ATTENTE = 'attribution-en-attente'
const DUREE_JOURS = 30

export default defineNuxtPlugin(() => {
  const route = useRoute()
  const { consentement } = useConsentement()

  function lireUrl(): Record<string, string> | null {
    const valeurs = Object.fromEntries(
      CLES.flatMap((cle) => {
        const v = route.query[cle]
        return typeof v === 'string' && v.trim() ? [[cle, v.trim().slice(0, 200)]] : []
      }),
    )
    return Object.keys(valeurs).length ? valeurs : null
  }

  function ecrire(valeurs: Record<string, string>) {
    const expire = new Date(Date.now() + DUREE_JOURS * 86_400_000).toUTCString()
    const securise = window.location.protocol === 'https:' ? '; Secure' : ''
    document.cookie = `em_attribution=${encodeURIComponent(JSON.stringify(valeurs))}; expires=${expire}; path=/; SameSite=Lax${securise}`
  }

  function appliquer() {
    let enAttente: Record<string, string> | null = null
    try {
      const brut = sessionStorage.getItem(ATTENTE)
      enAttente = brut ? JSON.parse(brut) : null
    } catch {
      enAttente = null
    }
    const nouvelles = lireUrl() ?? enAttente
    if (!nouvelles) return
    if (consentement.value?.marketing) {
      // Une nouvelle campagne remplace la précédente (dernier clic).
      ecrire(nouvelles)
      try {
        sessionStorage.removeItem(ATTENTE)
      } catch {
        /* stockage indisponible */
      }
    } else if (consentement.value === null) {
      try {
        sessionStorage.setItem(ATTENTE, JSON.stringify(nouvelles))
      } catch {
        /* stockage indisponible : la provenance de cette visite est perdue */
      }
    }
  }

  appliquer()
  watch(() => route.query, appliquer)
  watch(consentement, appliquer)
})
