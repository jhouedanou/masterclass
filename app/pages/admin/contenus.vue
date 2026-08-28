<script setup lang="ts">
import type { Formateur } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Modules & chapitres — administration')

interface ModuleArbre {
  id: string
  slug: string
  numero: number
  titre: string
  statut: string
  nbChapitres: number
  formateur: string
  fiche: string
  contenu: string
  offre: string
  prixFcfa: number
}
interface ThematiqueArbre {
  id: string
  numero: number
  nom: string
  modules: ModuleArbre[]
}
interface ProgrammeArbre {
  id: string
  slug: string
  nom: string
  couleur: string
  thematiques: ThematiqueArbre[]
}

const { data: arbre, refresh } = await useFetch<ProgrammeArbre[]>('/api/admin/contenus')
const { data: formateurs } = await useFetch<Formateur[]>('/api/formateurs')

const creation = reactive({
  ouverte: false,
  titre: '',
  slug: '',
  numero: 1,
  thematiqueId: '',
  formateurId: '',
})
const erreur = ref('')
const enCours = ref(false)

// L'URL suit le titre tant qu'elle n'a pas été retouchée à la main.
watch(() => creation.titre, (titre) => {
  creation.slug = titre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
})

async function creerModule() {
  erreur.value = ''
  enCours.value = true
  try {
    const cree = await $fetch<{ id: string }>('/api/admin/modules', {
      method: 'POST',
      body: {
        titre: creation.titre,
        slug: creation.slug,
        numero: creation.numero,
        thematiqueId: creation.thematiqueId,
        formateurId: creation.formateurId,
      },
    })
    await refresh()
    await navigateTo(`/admin/module/${cree.id}`)
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'La création a échoué.'
  } finally {
    enCours.value = false
  }
}

const programmeActif = ref('social-media')
const programme = computed(() => arbre.value?.find((p) => p.slug === programmeActif.value))
const thematiqueOuverte = ref<string>('')
const moduleSelectionne = ref<ModuleArbre | null>(null)

watchEffect(() => {
  if (programme.value && !programme.value.thematiques.some((t) => t.id === thematiqueOuverte.value)) {
    thematiqueOuverte.value = programme.value.thematiques[1]?.id ?? programme.value.thematiques[0]?.id ?? ''
  }
})

const libelles: Record<string, string> = {
  disponible: 'Prêt',
  'en-preparation': 'En préparation',
  brouillon: 'Brouillon',
  publiee: 'Publiée',
  pret: 'Prêt',
  ouverte: 'Ouverte',
  fermee: 'Fermée',
}
</script>

<template>
  <div v-if="arbre">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h1 class="font-title text-[26px] font-light">Modules pédagogiques & chapitres</h1>
      <UiBaseButton taille="sm" @click="creation.ouverte = !creation.ouverte">
        {{ creation.ouverte ? 'Annuler' : '+ Nouveau module' }}
      </UiBaseButton>
    </div>

    <p v-if="erreur" class="mt-4 rounded-[10px] border border-erreur bg-[#fdeeee] px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <form
      v-if="creation.ouverte"
      class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5"
      @submit.prevent="creerModule"
    >
      <h2 class="font-title text-[18px] font-light">Nouveau module</h2>
      <p class="mt-1 text-[12.5px] text-discret">
        Créé en brouillon : ni visible, ni indexé, ni en vente. La fiche, les chapitres et l’offre
        s’ouvrent ensuite depuis son éditeur.
      </p>
      <div class="mt-4 grid gap-3 sm:grid-cols-2">
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold">Titre</span>
          <input v-model="creation.titre" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">URL</span>
          <input v-model="creation.slug" required placeholder="titre-du-module" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 font-mono text-[13.5px] focus:border-social focus:outline-none">
          <span class="mt-1 block text-[12px] text-discret">/modules/{{ creation.slug || '…' }}</span>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Numéro</span>
          <input v-model.number="creation.numero" type="number" min="1" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Thématique</span>
          <select v-model="creation.thematiqueId" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
            <option v-for="t in programme?.thematiques ?? []" :key="t.id" :value="t.id">{{ t.nom }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold">Formateur</span>
          <select v-model="creation.formateurId" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px] focus:border-social focus:outline-none">
            <option v-for="f in formateurs ?? []" :key="f.id" :value="f.id">{{ f.nom }}</option>
          </select>
        </label>
      </div>
      <UiBaseButton type="submit" taille="sm" class="mt-4" :disabled="enCours">
        {{ enCours ? 'Création…' : 'Créer le module' }}
      </UiBaseButton>
    </form>

    <div class="mt-5 flex gap-2 rounded-full bg-white p-1.5 text-[14px] font-bold" role="group">
      <button
        v-for="p in arbre"
        :key="p.id"
        class="rounded-full px-5 py-2"
        :class="programmeActif === p.slug ? 'text-white' : 'text-texte'"
        :style="programmeActif === p.slug ? { backgroundColor: p.couleur } : undefined"
        :aria-pressed="programmeActif === p.slug"
        @click="programmeActif = p.slug"
      >
        {{ p.nom }}
      </button>
    </div>

    <div class="mt-5 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
      <div class="flex flex-col gap-3">
        <div
          v-for="thematique in programme?.thematiques"
          :key="thematique.id"
          class="overflow-hidden rounded-[14px] border border-ligne-douce bg-white"
        >
          <h2>
            <button
              class="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
              :aria-expanded="thematiqueOuverte === thematique.id"
              @click="thematiqueOuverte = thematiqueOuverte === thematique.id ? '' : thematique.id"
            >
              <span class="font-title text-[17px] font-light">
                Thématique {{ thematique.numero }} · {{ thematique.nom }}
              </span>
              <span class="flex items-center gap-3 text-[12px] text-discret">
                <span class="rounded-full bg-succes-voile px-2.5 py-1 font-bold text-succes">Publiée</span>
                {{ thematiqueOuverte === thematique.id ? '▾' : '▸' }}
              </span>
            </button>
          </h2>

          <ul v-if="thematiqueOuverte === thematique.id" class="divide-y divide-ligne-claire border-t border-ligne-claire">
            <li v-for="module in thematique.modules" :key="module.id">
              <button
                class="flex w-full items-center justify-between gap-4 px-5 py-3 text-left hover:bg-fond-clair"
                :class="moduleSelectionne?.id === module.id && 'bg-fond-clair'"
                @click="moduleSelectionne = module"
              >
                <span class="min-w-0 flex-1 truncate text-[14px]">
                  <span class="text-discret">⋮⋮</span>
                  Module {{ numeroModule(module.numero) }} · {{ module.titre }}
                </span>
                <span class="flex shrink-0 gap-2 text-[11px] font-bold">
                  <span
                    class="rounded-full px-2.5 py-1"
                    :class="module.statut === 'disponible' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
                  >
                    {{ libelles[module.statut] }}
                  </span>
                  <span
                    class="rounded-full px-2.5 py-1"
                    :class="module.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
                  >
                    {{ module.offre === 'ouverte' ? 'Vente ouverte' : 'Teasing publié' }}
                  </span>
                </span>
              </button>
            </li>
          </ul>
        </div>
        <p class="text-[12.5px] text-discret">
          Glisser-déposer pour réordonner (à brancher). Publier un parent ne publie jamais ses
          enfants ; les brouillons incomplets sont autorisés à tous les niveaux.
        </p>
      </div>

      <aside v-if="moduleSelectionne" class="h-fit rounded-[14px] border border-ligne-douce bg-white p-6">
        <UiBaseButton
          :to="`/admin/module/${moduleSelectionne.id}`"
          taille="sm"
          class="mb-4 w-full"
        >
          Ouvrir l’éditeur
        </UiBaseButton>
        <h2 class="font-title text-[19px] font-light">
          Module {{ numeroModule(moduleSelectionne.numero) }} — trois objets indépendants
        </h2>

        <section class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between">
            <p class="font-bold text-[14px]">Fiche commerciale</p>
            <span class="rounded-full bg-succes-voile px-2.5 py-1 text-[11px] font-bold text-succes">
              {{ libelles[moduleSelectionne.fiche] }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-texte">
            Titre public, accroche, visuel, FAQ, SEO/OG, badge. Publiable en teasing même si le
            module est en brouillon.
          </p>
          <div class="mt-3 flex flex-wrap gap-2 text-[12.5px]">
            <NuxtLink :to="`/modules/${moduleSelectionne.slug}`" class="rounded-full border border-ligne px-3 py-1.5 text-encre">
              Prévisualiser
            </NuxtLink>
            <NuxtLink to="/admin/referencement" class="rounded-full border border-ligne px-3 py-1.5 text-encre">
              Référencement
            </NuxtLink>
          </div>
        </section>

        <section class="mt-4 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between">
            <p class="font-bold text-[14px]">Module pédagogique</p>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="moduleSelectionne.contenu === 'pret' ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
            >
              {{ libelles[moduleSelectionne.contenu] }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-texte">
            Vidéo de bienvenue + {{ Math.max(moduleSelectionne.nbChapitres - 1, 0) }} chapitres ·
            formateur {{ moduleSelectionne.formateur }}
          </p>
        </section>

        <section class="mt-4 rounded-[12px] border border-ligne-claire p-4">
          <div class="flex items-center justify-between">
            <p class="font-bold text-[14px]">Offre commerciale</p>
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="moduleSelectionne.offre === 'ouverte' ? 'bg-social-voile text-social' : 'bg-fond-voile text-discret'"
            >
              {{ libelles[moduleSelectionne.offre] }}
            </span>
          </div>
          <p class="mt-2 text-[13px] text-texte">
            {{ formatFcfa(moduleSelectionne.prixFcfa, true) }}. L’ouverture reste bloquée tant que la
            fiche n’est pas publiée ou le module non « Prêt ». Fermer l’offre ne retire jamais les
            accès acquis.
          </p>
        </section>
      </aside>

      <aside v-else class="h-fit rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un module pour voir sa fiche, son contenu et son offre.
      </aside>
    </div>
  </div>
</template>
