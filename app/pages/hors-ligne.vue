<script setup lang="ts">
/** Écran hors ligne de la PWA (planche B, écran 13) : servi par le service
 *  worker quand une navigation échoue sans réseau. */
usePagePrivee('Vous êtes hors ligne')

const enLigne = ref(true)
/** Dernière position de lecture connue, pour « reprise de la lecture à 24:12 ». */
const reprise = ref<{ slug: string; chapitre: number; secondes: number } | null>(null)

function majEtat() {
  enLigne.value = navigator.onLine
}
onMounted(() => {
  majEtat()
  window.addEventListener('online', majEtat)
  window.addEventListener('offline', majEtat)
  try {
    const brut = localStorage.getItem('emc-derniere-lecture')
    if (brut) reprise.value = JSON.parse(brut)
  } catch {
    reprise.value = null
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('online', majEtat)
  window.removeEventListener('offline', majEtat)
})

function horloge(secondes: number): string {
  const s = Math.max(0, Math.floor(secondes))
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
}

function reessayer() {
  if (reprise.value) {
    window.location.assign(`/mon-espace/lecture/${reprise.value.slug}?chapitre=${reprise.value.chapitre}&reprise=${Math.floor(reprise.value.secondes)}`)
    return
  }
  if (history.length > 1) history.back()
  else window.location.assign('/')
}
</script>

<template>
  <div class="conteneur flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
    <div class="grid size-16 place-items-center rounded-full bg-fond-voile text-[28px]" aria-hidden="true">📡</div>
    <h1 class="mt-5 text-[30px] font-medium">Vous êtes hors ligne</h1>
    <p class="mt-3 max-w-[460px] text-[15px] text-texte">
      Vos vidéos nécessitent une connexion. Votre progression déjà enregistrée est en sécurité.
    </p>
    <p v-if="enLigne" class="mt-3 text-[14px] text-succes" role="status">
      ✓ Connexion rétablie<template v-if="reprise"> — reprise de la lecture à {{ horloge(reprise.secondes) }}.</template><template v-else>.</template>
    </p>
    <UiBaseButton class="mt-6" @click="reessayer">Réessayer</UiBaseButton>
  </div>
</template>
