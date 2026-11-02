<script setup lang="ts">
/**
 * /live-sessions/[slug]/inscription (CDC §5.2) : entrée directe dans le
 * tunnel d'inscription, depuis un lien partagé ou un e-mail. Le tunnel est
 * celui d'un achat de module (compte → récapitulatif → paiement FeexPay →
 * confirmation, planche 04) : la page prépare l'inscription et y renvoie.
 */
const route = useRoute()
const auth = useAuthStore()
const achat = useAchatStore()

const { data } = await useFetch<{
  redirection: string | null
  session: {
    slug: string
    debut: string
    dureeMinutes: number
    module: { titre: string; prixFcfa: number }
    formateur: { nom: string } | null
  }
  programme: { nom: string } | null
  inscriptionsOuvertes: boolean
  dejaInscrit: boolean
}>(() => `/api/live-sessions/${route.params.slug}`)

if (!data.value) {
  throw createError({ statusCode: 404, statusMessage: 'Live Session introuvable', fatal: true })
}
const fiche = `/live-sessions/${route.params.slug}`
if (data.value.redirection) {
  await navigateTo(data.value.redirection, { redirectCode: 302 })
} else if (data.value.dejaInscrit) {
  await navigateTo('/mon-espace')
} else if (!data.value.inscriptionsOuvertes) {
  await navigateTo(fiche)
} else if (import.meta.client) {
  achat.definirLive({
    slug: data.value.session.slug,
    titre: data.value.session.module.titre,
    prixFcfa: data.value.session.module.prixFcfa,
    debut: data.value.session.debut,
    dureeMinutes: data.value.session.dureeMinutes,
    formateur: data.value.session.formateur?.nom ?? '',
    programme: data.value.programme?.nom ?? '',
  })
  if (!auth.charge) await auth.rafraichir()
  await navigateTo(auth.estConnecte ? '/achat/recapitulatif' : '/achat/compte', { replace: true })
}

usePagePrivee('Inscription à la Live Session')
</script>

<template>
  <div class="mx-auto w-full max-w-[480px] px-5 py-16 text-center text-[15px] text-texte">
    Préparation de votre inscription…
    <NuxtLink :to="fiche" class="mt-3 block font-bold text-social">Revenir à la fiche</NuxtLink>
  </div>
</template>
