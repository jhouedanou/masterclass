<script setup lang="ts">
/**
 * Prévisualisation intégrée — écran 10.
 *
 * L'iframe pointe sur la même origine : le cookie de session passe, et
 * l'aperçu s'affiche sans jeton. Pas de `sandbox` : sans
 * `allow-same-origin allow-scripts`, Nuxt ne s'hydrate pas, et les poser
 * revient à ne rien enfermer du tout.
 */
const props = defineProps<{ moduleId: string; slug: string }>()

const mode = ref<'desktop' | 'mobile'>('desktop')

const lienPartage = ref('')
const validite = ref(0)
const erreur = ref('')

/** Lien à durée limitée, pour un formateur qui doit relire son module sans
 *  avoir de compte d'administration. */
async function engendrerLien() {
  erreur.value = ''
  try {
    const r = await $fetch<{ lien: string; validiteMinutes: number }>('/api/admin/apercu', {
      method: 'POST',
      body: { id: props.moduleId },
    })
    lienPartage.value = r.lien
    validite.value = r.validiteMinutes
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Lien indisponible.'
  }
}
</script>

<template>
  <section class="mt-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="font-title text-[19px] font-light">Prévisualisation — vue apprenant</h2>
      <div class="flex gap-2 rounded-full bg-white p-1 text-[13px] font-bold" role="group">
        <button
          v-for="m in (['desktop', 'mobile'] as const)"
          :key="m"
          class="rounded-full px-4 py-1.5"
          :class="mode === m ? 'bg-encre text-white' : 'text-texte'"
          :aria-pressed="mode === m"
          @click="mode = m"
        >
          {{ m === 'desktop' ? 'Desktop' : 'Mobile' }}
        </button>
      </div>
    </div>

    <!-- Bandeau « PRÉVISUALISATION — non publié » affiché en permanence (écran 10) -->
    <p
      class="mt-3 rounded-t-[14px] bg-alerte px-4 py-2 text-center text-[12px] font-bold tracking-[0.08em] text-white uppercase"
      role="status"
    >
      PRÉVISUALISATION — non publié
    </p>
    <div class="flex justify-center rounded-b-[14px] border border-t-0 border-ligne-douce bg-fond-voile p-4">
      <iframe
        :src="`/apercu/${slug}`"
        title="Prévisualisation du module"
        loading="lazy"
        class="h-[720px] rounded-[10px] border border-ligne bg-white"
        :style="{ width: mode === 'mobile' ? '390px' : '100%' }"
      />
    </div>

    <div class="mt-3 flex flex-wrap items-center gap-3 text-[12.5px]">
      <button class="text-social underline" @click="engendrerLien">
        Obtenir un lien de relecture
      </button>
      <span class="text-discret">
        À envoyer au formateur qui n’a pas de compte d’administration.
      </span>
    </div>
    <p v-if="lienPartage" class="mt-2 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[12.5px] text-alerte">
      Valable {{ validite }} minutes :
      <span class="mt-1 block font-mono break-all">{{ lienPartage }}</span>
    </p>
    <p v-if="erreur" class="mt-2 text-[12.5px] text-erreur">{{ erreur }}</p>
  </section>
</template>
