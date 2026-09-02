<script setup lang="ts">
/** Écran hors ligne de la PWA (planche B, écran 13) : servi par le service
 *  worker quand une navigation échoue sans réseau. */
usePagePrivee('Vous êtes hors ligne')

const enLigne = ref(true)
function majEtat() {
  enLigne.value = navigator.onLine
}
onMounted(() => {
  majEtat()
  window.addEventListener('online', majEtat)
  window.addEventListener('offline', majEtat)
})
onBeforeUnmount(() => {
  window.removeEventListener('online', majEtat)
  window.removeEventListener('offline', majEtat)
})

function reessayer() {
  const retour = history.length > 1 ? 'back' : '/'
  if (retour === 'back') history.back()
  else window.location.assign('/')
}
</script>

<template>
  <div class="conteneur flex min-h-[60vh] flex-col items-center justify-center py-16 text-center">
    <div class="grid size-16 place-items-center rounded-full bg-fond-voile text-discret">
      <Icon name="ph:wifi-slash" size="32" />
    </div>
    <h1 class="mt-5 text-[30px] font-medium">Vous êtes hors ligne</h1>
    <p class="mt-3 max-w-[460px] text-[15px] text-texte">
      Cette page n’est pas disponible sans connexion. Vos modules et vos sessions vous attendent dès
      que le réseau revient.
    </p>
    <p v-if="enLigne" class="mt-3 text-[14px] text-succes">Connexion rétablie — vous pouvez réessayer.</p>
    <div class="mt-6 flex flex-wrap justify-center gap-2">
      <UiBaseButton @click="reessayer">Réessayer</UiBaseButton>
      <UiBaseButton to="/mon-espace" variante="contour">Mon espace</UiBaseButton>
    </div>
  </div>
</template>
