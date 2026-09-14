<script setup lang="ts">
/**
 * Écrans propres à la PWA (planche B, écran 13) : invitation à installer
 * (carte avec tutoriel Android / iPhone) et toast « Nouvelle version
 * disponible ». Le refus d'installation est mémorisé sept jours ; la mise à
 * jour ne se propose jamais pendant une lecture vidéo ou une session.
 */
const { $pwa } = useNuxtApp()
const route = useRoute()

const CLE_REFUS = 'emc-pwa-installation-refusee-le'
const REFUS_JOURS = 7

const refusRecent = ref(false)
const iphone = ref(false)
const dejaInstallee = ref(false)
onMounted(() => {
  try {
    const refuse = localStorage.getItem(CLE_REFUS)
    refusRecent.value = !!refuse && Date.now() - Number(refuse) < REFUS_JOURS * 24 * 60 * 60 * 1000
  } catch {
    refusRecent.value = false
  }
  iphone.value = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream
  dejaInstallee.value =
    window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true
})

/** Sur iPhone, `beforeinstallprompt` n'existe pas : l'invitation s'affiche avec le tutoriel Partager → « Sur l'écran d'accueil ». */
const proposerInstallation = computed(
  () => !dejaInstallee.value && !refusRecent.value && (!!$pwa?.showInstallPrompt || iphone.value),
)
const enLecture = computed(() => route.path.startsWith('/mon-espace/lecture') || route.path.startsWith('/mon-espace/session'))
const proposerMiseAJour = computed(() => !!$pwa?.needRefresh && !enLecture.value)

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
  <!-- Mise à jour : toast non bloquant en bas d'écran -->
  <div
    v-if="proposerMiseAJour"
    class="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-md rounded-carte border border-ligne bg-white p-4 shadow-[0_12px_32px_rgba(23,21,28,.12)] lg:inset-x-auto lg:right-6"
    role="status"
  >
    <p class="text-[14px] font-bold text-encre">Nouvelle version disponible</p>
    <p class="mt-1 text-[13px] text-texte">
      Rechargez pour profiter des dernières améliorations. Votre lecture reprendra où vous en êtes.
    </p>
    <div class="mt-3 flex flex-wrap gap-2">
      <UiBaseButton taille="sm" @click="$pwa?.updateServiceWorker(true)">Recharger</UiBaseButton>
      <UiBaseButton taille="sm" variante="contour" @click="$pwa?.cancelPrompt()">Plus tard</UiBaseButton>
    </div>
  </div>

  <!-- Invitation à installer : carte plein écran sur mobile -->
  <div
    v-else-if="proposerInstallation && !enLecture"
    class="fixed inset-0 z-40 flex items-end justify-center bg-encre/40 p-4 sm:items-center"
    role="dialog"
    aria-labelledby="pwa-titre"
  >
    <div class="w-full max-w-md rounded-carte bg-white p-6 shadow-[0_12px_32px_rgba(23,21,28,.18)]">
      <img src="/images/pwa/icone-192.png" alt="" class="size-14 rounded-[14px]" width="56" height="56">
      <h2 id="pwa-titre" class="mt-4 font-title text-[22px] leading-[1.2] font-light">
        Installez E-Masterclass Big Five sur votre téléphone
      </h2>
      <p class="mt-2 text-[14px] text-texte">
        Accès en 1 clic depuis votre écran d’accueil, reprise de lecture instantanée, sans passer par
        le navigateur.
      </p>

      <template v-if="$pwa?.showInstallPrompt">
        <div class="mt-5 flex flex-wrap gap-2">
          <UiBaseButton @click="$pwa?.install()">Installer l’application</UiBaseButton>
          <UiBaseButton variante="contour" @click="plusTard">Plus tard</UiBaseButton>
        </div>
        <p class="mt-4 text-[12.5px] text-discret">
          <b>Android :</b> bannière native + menu ⋮ → « Ajouter à l’écran d’accueil ».
        </p>
      </template>
      <template v-else>
        <!-- iPhone : tutoriel illustré -->
        <ol class="mt-5 space-y-2 rounded-[12px] bg-fond-clair p-4 text-[13.5px] text-texte">
          <li class="flex items-center gap-3">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[16px] shadow-sm" aria-hidden="true">⬆</span>
            <span><b>iPhone :</b> touchez <b>Partager</b> dans la barre de Safari</span>
          </li>
          <li class="flex items-center gap-3">
            <span class="grid size-8 shrink-0 place-items-center rounded-full bg-white text-[16px] shadow-sm" aria-hidden="true">➕</span>
            <span>puis <b>« Sur l’écran d’accueil »</b></span>
          </li>
        </ol>
        <div class="mt-5">
          <UiBaseButton variante="contour" @click="plusTard">Plus tard</UiBaseButton>
        </div>
      </template>
    </div>
  </div>
</template>
