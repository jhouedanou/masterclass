/**
 * Chargement des traqueurs, après consentement.
 *
 * L'écran « Tracking & pixels » annonçait une injection dans le `<head>` de
 * toutes les pages ; rien n'était posé nulle part. C'est fait ici, et
 * seulement ici.
 *
 * Trois règles :
 *
 *   — rien ne part avant que le visiteur ait tranché, et rien ne part s'il
 *     refuse la mesure : c'est ce que promet le bandeau cookies ;
 *   — le chargement est différé après l'hydratation, pour ne pas retarder
 *     l'affichage sur une connexion mobile ;
 *   — les pages privées ne sont pas mesurées : l'espace apprenant et le
 *     back-office n'ont rien à faire dans une audience publicitaire.
 */
export default defineNuxtPlugin(() => {
  const { consentement, lire } = useConsentement()
  const route = useRoute()

  const PRIVEES = /^\/(admin|mon-espace|formateur|achat|apercu)/

  let charge = false

  async function charger() {
    if (charge || PRIVEES.test(route.path)) return

    const choix = consentement.value ?? lire()
    if (!choix?.mesure) return

    const ids = await $fetch<{ gtmConteneur: string; codePersonnalise: string }>(
      '/api/tracking',
    ).catch(() => null)
    if (!ids?.gtmConteneur) return

    charge = true

    // Le conteneur porte les autres traqueurs : c'est tout l'intérêt d'un
    // gestionnaire de balises, et cela évite d'injecter cinq scripts ici.
    const w = window as unknown as { dataLayer?: unknown[] }
    w.dataLayer = w.dataLayer ?? []
    w.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(ids.gtmConteneur)}`
    document.head.appendChild(script)

    // Le code additionnel de l'écran 19. Il est saisi par un administrateur
    // supérieur et s'exécute sur toutes les pages publiques : c'est ce qu'on
    // attend d'un champ « scripts additionnels », et c'est exactement pourquoi
    // son écriture lui est réservée.
    if (ids.codePersonnalise?.trim()) {
      const conteneur = document.createElement('div')
      conteneur.innerHTML = ids.codePersonnalise
      for (const balise of conteneur.querySelectorAll('script')) {
        const copie = document.createElement('script')
        for (const attribut of balise.attributes) copie.setAttribute(attribut.name, attribut.value)
        copie.textContent = balise.textContent
        document.head.appendChild(copie)
      }
    }
  }

  // Après l'hydratation, puis à chaque changement de consentement.
  onNuxtReady(() => void charger())
  watch(consentement, () => void charger())
})
