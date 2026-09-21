<script setup lang="ts">
import type { CategorieReferentiel, EntreeReferentiel } from '#shared/utils/referentiels'
import { CATEGORIES, cleDepuisLibelle, entreesDe } from '#shared/utils/referentiels'

/**
 * Valeurs proposées aux champs à choix multiple du profil apprenant.
 *
 * Une entrée n'est jamais supprimée, seulement désactivée : les fiches en
 * conservent la clé. L'effacer ferait disparaître la réponse d'un apprenant de
 * son propre profil, sans qu'il y soit pour rien.
 *
 * La clé n'est pas modifiable non plus — c'est ce qui rend le renommage
 * rétroactif : changer « X » en « X (Twitter) » se propage à toutes les fiches.
 */
const { data, refresh } = await useFetch<EntreeReferentiel[]>('/api/admin/referentiels', {
  default: () => [],
})

const categorie = ref<CategorieReferentiel>('reseau')
const nouveau = ref('')
const message = ref('')
const erreur = ref('')

const entrees = computed(() => entreesDe(data.value, categorie.value))
const clePrevue = computed(() => cleDepuisLibelle(nouveau.value.trim()))

const dejaPris = computed(
  () => !!clePrevue.value && data.value.some((e) => e.categorie === categorie.value && e.cle === clePrevue.value),
)

const { annoncer } = useToasts()

async function agir(action: () => Promise<unknown>, succes: string) {
  erreur.value = ''
  message.value = ''
  try {
    await action()
    message.value = succes
    await refresh()
    annoncer(succes)
  } catch (e) {
    const souci = (e as { statusMessage?: string }).statusMessage ?? 'Opération impossible.'
    erreur.value = souci
    annoncer(souci, 'erreur')
  }
}

function ajouter() {
  const libelle = nouveau.value.trim()
  if (!libelle || dejaPris.value) return
  return agir(async () => {
    await $fetch('/api/admin/referentiels', {
      method: 'POST',
      body: { categorie: categorie.value, libelle, ordre: (entrees.value.at(-1)?.ordre ?? 0) + 10 },
    })
    nouveau.value = ''
  }, 'Valeur ajoutée — modification journalisée.')
}

function renommer(entree: EntreeReferentiel, libelle: string) {
  const propre = libelle.trim()
  if (!propre || propre === entree.libelle) return
  return agir(
    () => $fetch('/api/admin/referentiels', { method: 'PATCH', body: { id: entree.id, libelle: propre } }),
    'Intitulé mis à jour sur toutes les fiches — modification journalisée.',
  )
}

function basculerActif(entree: EntreeReferentiel) {
  return agir(
    () => $fetch('/api/admin/referentiels', { method: 'PATCH', body: { id: entree.id, actif: !entree.actif } }),
    entree.actif
      ? 'Valeur retirée du formulaire. Les fiches qui la portent sont intactes.'
      : 'Valeur réactivée.',
  )
}
</script>

<template>
  <section class="mt-6 rounded-[14px] border border-ligne-douce bg-white p-6">
    <h2 class="font-title text-[19px] font-light">Valeurs du profil apprenant</h2>
    <p class="mt-1 text-[12.5px] text-discret">
      Ce que l’apprenant peut cocher dans « Réseaux gérés », « Outils utilisés », « Canaux de vente »
      et « Présence en ligne ». Renommer une valeur met à jour toutes les fiches ; la retirer la
      masque du formulaire sans effacer les fiches qui la portent. Toute modification est journalisée.
    </p>

    <div class="mt-5 flex flex-wrap gap-2">
      <button
        v-for="c in CATEGORIES"
        :key="c.valeur"
        type="button"
        class="rounded-full border px-3.5 py-1.5 text-[13px] transition"
        :class="
          categorie === c.valeur
            ? 'border-social bg-social-voile font-bold text-social'
            : 'border-ligne text-texte hover:border-discret'
        "
        @click="categorie = c.valeur"
      >
        {{ c.libelle }}
      </button>
    </div>
    <p class="mt-2 text-[12.5px] text-discret">
      {{ CATEGORIES.find((c) => c.valeur === categorie)?.usage }}
    </p>

    <ul class="mt-4 divide-y divide-ligne-claire border-y border-ligne-claire">
      <li v-for="entree in entrees" :key="entree.id" class="flex items-center gap-3 py-2.5">
        <input
          :value="entree.libelle"
          class="min-w-0 flex-1 rounded-champ border border-ligne px-3 py-1.5 text-[13.5px]"
          :class="!entree.actif && 'text-discret line-through'"
          :aria-label="`Intitulé de ${entree.libelle}`"
          @change="renommer(entree, ($event.target as HTMLInputElement).value)"
        >
        <code class="shrink-0 text-[12px] text-discret">{{ entree.cle }}</code>
        <button
          type="button"
          class="shrink-0 rounded-full border border-ligne px-3 py-1 text-[12.5px] font-bold transition hover:border-discret"
          @click="basculerActif(entree)"
        >
          {{ entree.actif ? 'Retirer' : 'Réactiver' }}
        </button>
      </li>
    </ul>

    <form class="mt-4 flex flex-wrap items-center gap-2" @submit.prevent="ajouter">
      <input
        v-model="nouveau"
        placeholder="Ajouter une valeur…"
        class="min-w-0 flex-1 rounded-champ border border-ligne px-3 py-2 text-[13.5px]"
        aria-label="Intitulé de la valeur à ajouter"
      >
      <UiBaseButton type="submit" taille="sm" :disabled="!clePrevue || dejaPris">Ajouter</UiBaseButton>
    </form>
    <p v-if="clePrevue" class="mt-1.5 text-[12.5px]" :class="dejaPris ? 'text-alerte' : 'text-discret'">
      <template v-if="dejaPris">Cette valeur existe déjà dans cette catégorie.</template>
      <template v-else>Clé enregistrée dans les fiches : <code>{{ clePrevue }}</code></template>
    </p>

    <p v-if="message" class="mt-3 text-[13px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="mt-3 text-[13px] text-erreur">{{ erreur }}</p>
  </section>
</template>
