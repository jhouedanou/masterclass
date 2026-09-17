<script setup lang="ts">
// Bandeau de consentement et fenêtre de personnalisation (planche A, écran 10).
const { consentement, decide, lire, enregistrer } = useConsentement()

const panneau = ref(false)
const choix = reactive({ mesure: false, marketing: false })

// Le stockage local n'existe pas au rendu serveur : le bandeau n'apparaît
// qu'une fois le choix précédent relu, ce qui évite de le faire clignoter chez
// les visiteurs qui ont déjà répondu.
const pret = ref(false)
onMounted(() => {
  consentement.value = lire()
  pret.value = true
})

function tout() {
  enregistrer({ mesure: true, marketing: true })
  panneau.value = false
}
function essentielsSeulement() {
  enregistrer({ mesure: false, marketing: false })
  panneau.value = false
}
function mesChoix() {
  enregistrer({ mesure: choix.mesure, marketing: choix.marketing })
  panneau.value = false
}

// La maquette ne dessine pas de bouton « Retour » dans la fenêtre de
// personnalisation ; Échap tient ce rôle, sans rien ajouter à l'écran.
function surEchap(evenement: KeyboardEvent) {
  if (evenement.key === 'Escape') panneau.value = false
}
watch(panneau, (ouvert) => {
  if (!import.meta.client) return
  if (ouvert) window.addEventListener('keydown', surEchap)
  else window.removeEventListener('keydown', surEchap)
})
onBeforeUnmount(() => import.meta.client && window.removeEventListener('keydown', surEchap))
</script>

<template>
  <div v-if="pret && !decide">
    <!-- Bandeau : une carte encre posée en bas de page, non une barre pleine largeur. -->
    <div
      v-if="!panneau"
      class="sur-sombre fixed inset-x-4 bottom-4 z-50 mx-auto w-auto max-w-[760px] rounded-carte bg-encre px-7 py-6 text-white shadow-[0_16px_40px_rgba(23,21,28,.3)]"
      role="dialog"
      aria-labelledby="cookies-titre"
    >
      <b id="cookies-titre" class="text-[15px]">Nous utilisons des cookies</b>
      <p class="mt-2 mb-4 text-[13.5px] leading-relaxed text-gris-perle">
        Des cookies essentiels font fonctionner le site (connexion, panier). Avec votre accord,
        des cookies de mesure d’audience nous aident à améliorer les programmes. Détails dans la
        <NuxtLink to="/cookies" class="text-social-clair underline">politique de cookies</NuxtLink>.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <UiBaseButton variante="blanc" taille="sm" @click="tout">Tout accepter</UiBaseButton>
        <!-- Contour gris de texte sur l'encre : le contour encre y disparaîtrait. -->
        <button class="rounded-full border-[1.5px] border-texte px-5.5 py-3 text-[14px] font-bold" @click="essentielsSeulement">
          Refuser les non essentiels
        </button>
        <button class="px-2.5 py-3 text-[14px] font-bold text-gris-perle hover:text-white" @click="panneau = true">
          Personnaliser
        </button>
      </div>
    </div>

    <!-- Fenêtre de personnalisation. Échap ramène au bandeau : la maquette n'y
         dessine pas de bouton de retour, mais on ne referme pas un dialogue
         seulement en tranchant. -->
    <div
      v-else
      class="fixed inset-0 z-50 flex items-end justify-center bg-encre/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookies-panneau-titre"
    >
      <div class="w-full max-w-[480px] rounded-carte bg-white p-7 shadow-[0_16px_40px_rgba(23,21,28,.12)]">
        <h2 id="cookies-panneau-titre" class="mb-4 font-title text-[21px] font-light">
          Personnaliser les cookies
        </h2>

        <div class="mb-4.5 flex flex-col gap-3">
          <div class="rounded-[12px] border border-ligne-claire px-4">
            <UiInterrupteur
              :model-value="true"
              disabled
              libelle="Essentiels"
              description="Connexion, sécurité, paiement — toujours actifs."
            />
          </div>
          <div class="rounded-[12px] border border-ligne-claire px-4">
            <UiInterrupteur
              v-model="choix.mesure"
              libelle="Mesure d’audience"
              description="Pages vues, parcours — statistiques anonymisées."
            />
          </div>
          <div class="rounded-[12px] border border-ligne-claire px-4">
            <UiInterrupteur
              v-model="choix.marketing"
              libelle="Marketing"
              description="Pixels publicitaires (Meta, TikTok) pour nos campagnes."
            />
          </div>
        </div>

        <UiBaseButton class="w-full" variante="sombre" @click="mesChoix">
          Enregistrer mes choix
        </UiBaseButton>
      </div>
    </div>
  </div>
</template>
