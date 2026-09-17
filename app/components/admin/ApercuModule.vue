<script setup lang="ts">
/**
 * Prévisualisation intégrée — écran 10.
 *
 * L'iframe pointe sur la même origine : le cookie de session passe, et
 * l'aperçu s'affiche sans jeton. Pas de `sandbox` : sans
 * `allow-same-origin allow-scripts`, Nuxt ne s'hydrate pas, et les poser
 * revient à ne rien enfermer du tout.
 *
 * Le bandeau « PRÉVISUALISATION — non publié » est rendu par la page
 * `/apercu/[slug]`, donc à l'intérieur du cadre : le répéter au-dessus le
 * dédoublerait.
 */
const props = defineProps<{
  moduleId: string
  slug: string
  numero: number
  titre: string
  programme: string
}>()

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

const numeroCadre = computed(() => `MODULE ${String(props.numero).padStart(2, '0')}`)
</script>

<template>
  <div class="mt-6 flex flex-wrap items-start gap-5">
    <section class="min-w-0 flex-1 rounded-[14px] border border-ligne-douce bg-white p-5">
      <div class="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <h2 class="font-sans text-[14px] font-bold">Prévisualisation — vue apprenant</h2>
        <div class="flex gap-1.5 text-[12px] font-bold" role="group">
          <button
            v-for="m in (['desktop', 'mobile'] as const)"
            :key="m"
            class="rounded-full px-3.5 py-1.5"
            :class="mode === m ? 'bg-social text-white' : 'border-[1.5px] border-ligne text-texte'"
            :aria-pressed="mode === m"
            @click="mode = m"
          >
            {{ m === 'desktop' ? 'Desktop' : 'Mobile' }}
          </button>
        </div>
      </div>

      <div class="flex justify-center rounded-[10px] border border-ligne-claire bg-fond-clair p-[18px]">
        <iframe
          :src="`/apercu/${slug}`"
          title="Prévisualisation du module"
          loading="lazy"
          class="h-[720px] rounded-[10px] border border-ligne bg-white"
          :style="{ width: mode === 'mobile' ? '390px' : '100%' }"
        />
      </div>

      <div class="mt-3 flex flex-wrap items-center gap-2 text-[11.5px] text-discret">
        <button class="font-bold text-social" @click="engendrerLien">Obtenir un lien de relecture</button>
        <span>À envoyer au formateur qui n’a pas de compte d’administration.</span>
      </div>
      <p v-if="lienPartage" class="mt-2 rounded-[10px] border border-alerte-bordure bg-alerte-pale px-3.5 py-[11px] text-[12px] text-alerte-fonce">
        Valable {{ validite }} minutes :
        <span class="mt-1 block font-mono break-all">{{ lienPartage }}</span>
      </p>
      <p v-if="erreur" class="mt-2 text-[12px] text-erreur">{{ erreur }}</p>
    </section>

    <!-- Rappel de cadrage mobile 390 : la maquette le montre à côté de
         l'aperçu, pas à sa place — d'où une vignette et non un second cadre. -->
    <section class="w-[240px] shrink-0 rounded-[14px] border border-ligne-douce bg-white p-5">
      <h2 class="font-sans text-[14px] font-bold">Aperçu mobile 390</h2>
      <div class="mt-3 rounded-[16px] border border-ligne-claire bg-fond-clair p-3">
        <p class="text-[9px] font-bold tracking-[0.06em] text-social">{{ numeroCadre }}</p>
        <p class="mt-1 mb-2 text-[12px] leading-[1.3] font-bold">{{ titre }}</p>
        <div class="mb-2 h-[5px] rounded-full bg-piste" />
        <span class="block rounded-full bg-encre p-2 text-center text-[10px] font-bold text-white">
          Commencer
        </span>
      </div>
      <p class="mt-2 text-[11px] text-discret">{{ programme }}</p>
    </section>
  </div>
</template>
