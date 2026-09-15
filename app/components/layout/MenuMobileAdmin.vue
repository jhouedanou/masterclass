<script setup lang="ts">
/**
 * Tiroir de navigation du back-office sous 768 px : la barre latérale et sa
 * variante en icônes (tablette, C-17) n'y existent pas.
 */
defineProps<{
  liens: { libelle: string; chemin: string; icone: string }[]
}>()
const ouvert = ref(false)
const route = useRoute()
watch(() => route.path, () => (ouvert.value = false))
</script>

<template>
  <div class="md:hidden">
    <button
      type="button"
      class="grid size-10 place-items-center rounded-[8px] text-encre hover:bg-fond-clair"
      :aria-expanded="ouvert"
      aria-controls="menu-admin-mobile"
      aria-label="Ouvrir la navigation"
      @click="ouvert = !ouvert"
    >
      <Icon :name="ouvert ? 'ph:x' : 'ph:list'" size="24" />
    </button>
    <Transition name="tiroir">
      <div v-if="ouvert" class="fixed inset-0 z-50 flex" @click.self="ouvert = false">
        <nav
          id="menu-admin-mobile"
          aria-label="Navigation d’administration"
          class="sur-sombre flex w-72 max-w-[85vw] flex-col gap-5 overflow-y-auto bg-encre p-5 text-[#b9b4c4]"
        >
          <div class="flex items-center justify-between">
            <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-8 w-auto brightness-0 invert">
            <button type="button" aria-label="Fermer" class="text-white" @click="ouvert = false">
              <Icon name="ph:x" size="22" />
            </button>
          </div>
          <div class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="lien in liens"
              :key="lien.chemin"
              :to="lien.chemin"
              class="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[14px] text-[#b9b4c4] hover:bg-encre-800 hover:text-white"
              active-class="bg-social text-white"
            >
              <Icon :name="lien.icone" size="17" />
              {{ lien.libelle }}
            </NuxtLink>
          </div>
        </nav>
        <div class="flex-1 bg-black/40" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.tiroir-enter-active,
.tiroir-leave-active {
  transition: opacity 0.15s ease;
}
.tiroir-enter-from,
.tiroir-leave-to {
  opacity: 0;
}
</style>
