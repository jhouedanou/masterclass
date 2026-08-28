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
</script>

<template>
  <div v-if="pret && !decide">
    <!-- Bandeau -->
    <div
      v-if="!panneau"
      class="fixed inset-x-0 bottom-0 z-50 border-t border-ligne bg-white p-5 shadow-[0_-6px_24px_-16px_rgba(23,21,28,.4)]"
      role="dialog"
      aria-labelledby="cookies-titre"
    >
      <div class="conteneur flex flex-wrap items-center justify-between gap-5">
        <div class="max-w-[640px]">
          <p id="cookies-titre" class="font-title text-[18px] font-light text-encre">
            Nous utilisons des cookies
          </p>
          <p class="mt-1.5 text-[13.5px] leading-relaxed text-texte">
            Des cookies essentiels font fonctionner le site (connexion, panier). Avec votre accord,
            des cookies de mesure d’audience nous aident à améliorer les programmes. Détails dans la
            <NuxtLink to="/cookies" class="underline">politique de cookies</NuxtLink>.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <UiBaseButton taille="sm" @click="tout">Tout accepter</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="essentielsSeulement">
            Refuser les non essentiels
          </UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="panneau = true">
            Personnaliser
          </UiBaseButton>
        </div>
      </div>
    </div>

    <!-- Fenêtre de personnalisation -->
    <div
      v-else
      class="fixed inset-0 z-50 flex items-end justify-center bg-encre/40 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookies-panneau-titre"
    >
      <div class="w-full max-w-[520px] rounded-carte bg-white p-6">
        <h2 id="cookies-panneau-titre" class="font-title text-[21px] font-light">
          Personnaliser les cookies
        </h2>

        <div class="mt-5 flex flex-col gap-3">
          <div class="rounded-[12px] border border-ligne-douce bg-fond-clair p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[14px] font-bold text-encre">Essentiels</p>
                <p class="mt-0.5 text-[13px] text-texte">
                  Connexion, sécurité, paiement — toujours actifs.
                </p>
              </div>
              <input type="checkbox" checked disabled class="mt-1">
            </div>
          </div>

          <label class="rounded-[12px] border border-ligne-douce p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[14px] font-bold text-encre">Mesure d’audience</p>
                <p class="mt-0.5 text-[13px] text-texte">
                  Pages vues, parcours — statistiques anonymisées.
                </p>
              </div>
              <input v-model="choix.mesure" type="checkbox" class="mt-1">
            </div>
          </label>

          <label class="rounded-[12px] border border-ligne-douce p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <p class="text-[14px] font-bold text-encre">Marketing</p>
                <p class="mt-0.5 text-[13px] text-texte">
                  Pixels publicitaires (Meta, TikTok) pour nos campagnes.
                </p>
              </div>
              <input v-model="choix.marketing" type="checkbox" class="mt-1">
            </div>
          </label>
        </div>

        <div class="mt-6 flex flex-wrap gap-2">
          <UiBaseButton taille="sm" @click="mesChoix">Enregistrer mes choix</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="panneau = false">Retour</UiBaseButton>
        </div>
      </div>
    </div>
  </div>
</template>
