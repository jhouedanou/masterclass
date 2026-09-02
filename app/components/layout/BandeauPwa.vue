<script setup lang="ts">
/**
 * Écrans propres à la PWA (planche B, écran 13) : proposition d'installation
 * « Ajouter à l'écran d'accueil » et « Mise à jour disponible ». Les deux
 * s'appuient sur le module PWA ; le refus d'installation est mémorisé sept
 * jours pour ne pas harceler.
 */
const { $pwa } = useNuxtApp()

const CLE_REFUS = 'emc-pwa-installation-refusee-le'
const REFUS_JOURS = 7

const refusRecent = ref(false)
onMounted(() => {
  try {
    const refuse = localStorage.getItem(CLE_REFUS)
    refusRecent.value = !!refuse && Date.now() - Number(refuse) < REFUS_JOURS * 24 * 60 * 60 * 1000
  } catch {
    refusRecent.value = false
  }
})

const proposerInstallation = computed(() => !!$pwa?.showInstallPrompt && !refusRecent.value)
const proposerMiseAJour = computed(() => !!$pwa?.needRefresh)

function plusTard() {
  try {
    localStorage.setItem(CLE_REFUS, String(Date.now()))
  } catch {
    /* stockage indisponible : le bandeau reviendra à la prochaine visite */
  }
  refusRecent.value = true
  $pwa?.cancelInstall()
}
</script>

<template>
  <div
    v-if="proposerMiseAJour || proposerInstallation"
    class="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-carte border border-ligne bg-white p-4 shadow-[0_12px_32px_rgba(23,21,28,.12)]"
    role="status"
  >
    <template v-if="proposerMiseAJour">
      <p class="text-[14px] font-bold text-encre">Mise à jour disponible</p>
      <p class="mt-1 text-[13px] text-texte">Une nouvelle version de l’application est prête.</p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiBaseButton taille="sm" @click="$pwa?.updateServiceWorker(true)">Recharger</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="$pwa?.cancelPrompt()">Plus tard</UiBaseButton>
      </div>
    </template>
    <template v-else>
      <p class="text-[14px] font-bold text-encre">Installer E-Masterclass</p>
      <p class="mt-1 text-[13px] text-texte">
        Ajoutez l’application à votre écran d’accueil : vos modules et vos sessions à portée de main.
      </p>
      <div class="mt-3 flex flex-wrap gap-2">
        <UiBaseButton taille="sm" @click="$pwa?.install()">Ajouter à l’écran d’accueil</UiBaseButton>
        <UiBaseButton taille="sm" variante="contour" @click="plusTard">Plus tard</UiBaseButton>
      </div>
    </template>
  </div>
</template>
