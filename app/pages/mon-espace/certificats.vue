<script setup lang="ts">
import type { Acces, Certificat, Module } from '#shared/types'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Mes certificats')

const auth = useAuthStore()
const route = useRoute()
const { data: certificats, refresh } = await useFetch<Certificat[]>('/api/certificats')
const { data: acces } = await useFetch<(Acces & { module: Module | null; formateur: { nom: string } | null })[]>('/api/mon-espace/acces')
const { data: tableau } = await useFetch<{ cartes: { moduleId: string; chapitresVus: number; chapitresTotal: number; prochaineSession: unknown }[] }>('/api/mon-espace')

const cartes = computed(() => new Map((tableau.value?.cartes ?? []).map((c) => [c.moduleId, c])))
const delivres = computed(() => new Map((certificats.value ?? []).map((c) => [c.moduleId, c])))

/** Les trois états (planche B, écran 09) : 🎓 délivré · ⏳ en progression · 🔒 non commencé. */
const toutesLignes = computed(() =>
  (acces.value ?? [])
    .filter((a) => !a.revoqueLe)
    .map((a) => {
      const certificat = delivres.value.get(a.moduleId) ?? null
      const carte = cartes.value.get(a.moduleId)
      const etat: 'delivre' | 'a-generer' | 'en-progression' | 'non-commence' = certificat
        ? 'delivre'
        : a.progression === 100
          ? 'a-generer'
          : a.progression > 0
            ? 'en-progression'
            : 'non-commence'
      // Un module pas encore en vente (brouillon, en préparation) auquel
      // l'apprenant a déjà accès — un compte d'équipe, typiquement. Une
      // attestation déjà délivrée reste parmi les disponibles : elle demeure
      // valable même si son module repasse en brouillon.
      const aVenir = !certificat && a.module?.statut !== 'disponible'
      return { acces: a, certificat, carte, etat, aVenir }
    })
    .sort((x, y) => ['delivre', 'a-generer', 'en-progression', 'non-commence'].indexOf(x.etat) - ['delivre', 'a-generer', 'en-progression', 'non-commence'].indexOf(y.etat)),
)

/** Deux onglets : les modules en vente d'abord, ceux à venir à part, pour que
 *  la liste principale ne promette que ce qui existe au catalogue. */
const onglet = ref<'disponibles' | 'a-venir'>('disponibles')
const nbAVenir = computed(() => toutesLignes.value.filter((l) => l.aVenir).length)
const lignes = computed(() =>
  toutesLignes.value.filter((l) => l.aVenir === (onglet.value === 'a-venir')),
)
const options = computed(() => [
  { valeur: 'disponibles' as const, libelle: `Disponibles (${toutesLignes.value.length - nbAVenir.value})` },
  { valeur: 'a-venir' as const, libelle: `À venir (${nbAVenir.value})` },
])

// Écran 05 — validation de l'identité avant génération.
const validation = ref<{ moduleId: string; titre: string; formateur: string; termineLe: string | null } | null>(null)
const prenom = ref(auth.utilisateur?.prenom ?? '')
const nom = ref(auth.utilisateur?.nom ?? '')
const enCours = ref(false)
const erreur = ref('')

function ouvrirValidation(ligne: (typeof toutesLignes.value)[number]) {
  validation.value = {
    moduleId: ligne.acces.moduleId,
    titre: ligne.acces.module?.titre ?? '',
    formateur: ligne.acces.formateur?.nom ?? '',
    termineLe: ligne.acces.termineLe,
  }
}

onMounted(() => {
  const cible = typeof route.query.module === 'string' ? route.query.module : ''
  const ligne = toutesLignes.value.find((l) => l.acces.moduleId === cible && l.etat === 'a-generer')
  if (!ligne) return
  if (ligne.aVenir) onglet.value = 'a-venir'
  ouvrirValidation(ligne)
})

async function generer() {
  if (!validation.value) return
  enCours.value = true
  erreur.value = ''
  try {
    const certificat = await $fetch<Certificat>('/api/certificats', {
      method: 'POST',
      body: { moduleId: validation.value.moduleId, prenom: prenom.value, nom: nom.value },
    })
    await auth.rafraichir()
    await refresh()
    validation.value = null
    await navigateTo(`/certificats/${certificat.numero}?telecharger=1`)
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Génération impossible.'
  } finally {
    enCours.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-[30px] font-light">Mes certificats</h1>
    <p class="mt-2 max-w-[680px] text-[15px] text-texte">
      PDF nominatifs, numérotés et vérifiables. Re-téléchargeables à tout moment.
    </p>

    <div
      v-if="nbAVenir"
      class="mt-6 inline-flex gap-1 rounded-full bg-fond-voile p-1.5 text-[14px] font-bold"
      role="group"
      aria-label="Afficher les modules"
    >
      <button
        v-for="option in options"
        :key="option.valeur"
        type="button"
        class="rounded-full px-5 py-2"
        :class="onglet === option.valeur ? 'bg-encre text-white' : 'text-texte hover:text-encre'"
        :aria-pressed="onglet === option.valeur"
        @click="onglet = option.valeur"
      >
        {{ option.libelle }}
      </button>
    </div>
    <p v-if="onglet === 'a-venir'" class="mt-3 max-w-[680px] text-[13.5px] text-discret">
      Modules auxquels vous avez déjà accès mais qui ne sont pas encore en vente.
    </p>

    <div v-if="lignes.length" class="mt-6 flex flex-col gap-3">
      <article
        v-for="ligne in lignes"
        :key="ligne.acces.moduleId"
        class="flex flex-wrap items-center gap-4 rounded-[14px] border bg-white p-5"
        :class="ligne.etat === 'non-commence' ? 'border-ligne-claire opacity-80' : 'border-ligne-douce'"
      >
        <span class="grid size-11 shrink-0 place-items-center rounded-full bg-fond-voile text-[20px]" aria-hidden="true">
          {{ ligne.etat === 'delivre' || ligne.etat === 'a-generer' ? '🎓' : ligne.etat === 'en-progression' ? '⏳' : '🔒' }}
        </span>
        <div class="min-w-[220px] flex-1">
          <h2 class="font-title text-[19px] font-light">
            {{ ligne.acces.module?.titre }}
            <span
              v-if="ligne.aVenir"
              class="ml-2 inline-block rounded-full bg-fond-voile px-2.5 py-0.5 align-middle font-sans text-[11.5px] font-bold text-texte"
            >
              {{ ligne.acces.module?.statut === 'en-preparation' ? 'En préparation' : 'Brouillon' }}
            </span>
          </h2>
          <p class="mt-1 text-[13px] text-discret">
            <template v-if="ligne.certificat?.revoqueLe">
              N° {{ ligne.certificat.numero }} · révoquée le {{ formatDate(ligne.certificat.revoqueLe) }}
            </template>
            <template v-else-if="ligne.certificat">
              N° {{ ligne.certificat.numero }} · délivrée le {{ formatDate(ligne.certificat.dateDelivrance) }}
            </template>
            <template v-else-if="ligne.etat === 'a-generer'">Module complété à 100 % — certificat prêt à générer</template>
            <template v-else-if="ligne.etat === 'en-progression'">
              Chapitres : {{ ligne.carte?.chapitresVus ?? 0 }}/{{ ligne.carte?.chapitresTotal ?? ligne.acces.module?.chapitres.length }} vus ·
              participation session : {{ ligne.carte?.prochaineSession ? 'à venir' : 'non planifiée' }}
            </template>
            <template v-else>Module non commencé</template>
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <!-- Revoir le module reste ouvert quel que soit l'état de
               l'attestation, y compris révoquée : le retrait du document ne
               retire pas l'accès au cours, que seul `revoqueLe` sur l'accès
               lui-même ferme. -->
          <UiBaseButton
            v-if="ligne.acces.module && ligne.etat !== 'non-commence'"
            :to="`/mon-espace/module/${ligne.acces.module.slug}`"
            taille="sm"
            variante="contour"
          >
            Revoir le module
          </UiBaseButton>
          <span
            v-if="ligne.certificat?.revoqueLe"
            class="rounded-full bg-[#fdeeee] px-3 py-1.5 text-[12px] font-bold text-erreur"
          >
            Révoquée
          </span>
          <UiBaseButton
            v-else-if="ligne.certificat"
            :to="`/certificats/${ligne.certificat.numero}?telecharger=1`"
            taille="sm"
          >
            Télécharger PDF
          </UiBaseButton>
          <UiBaseButton v-else-if="ligne.etat === 'a-generer'" taille="sm" @click="ouvrirValidation(ligne)">
            Obtenir mon certificat
          </UiBaseButton>
          <span v-else-if="ligne.etat === 'en-progression'" class="rounded-full bg-alerte-voile px-3 py-1.5 text-[12px] font-bold text-alerte">
            En progression · {{ Math.round(ligne.acces.progression) }} %
          </span>
        </div>
      </article>
    </div>
    <p v-else class="mt-6 rounded-[14px] border border-dashed border-ligne p-12 text-center text-[14px] text-discret">
      Réalisez un module pour obtenir votre premier certificat.
    </p>

    <p class="mt-6 text-[12.5px] text-discret">
      Conditions : 100 % des chapitres vus (temps réel). Le PDF reprend prénom, nom, module,
      formateur, date et QR de vérification.
    </p>

    <!-- Écran 05 — validation d'attestation -->
    <div v-if="validation" class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
      <form class="w-full max-w-lg rounded-carte bg-white p-6" @submit.prevent="generer">
        <p class="grid size-12 place-items-center rounded-full bg-succes-voile text-[22px] text-succes" aria-hidden="true">✓</p>
        <h2 class="mt-3 font-title text-[24px] font-light">Module complété à 100 % !</h2>
        <p class="mt-2 text-[14px] text-texte">
          Vérifiez vos informations : elles figureront telles quelles sur votre certificat de participation.
        </p>
        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
            <input v-model="prenom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
            <input v-model="nom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
          </label>
        </div>
        <dl class="mt-5 grid gap-2 text-[14px] sm:grid-cols-[140px_1fr]">
          <dt class="text-discret">Email</dt>
          <dd>{{ auth.utilisateur?.email }} <span class="text-discret">(non modifiable)</span></dd>
          <dt class="text-discret">Module</dt>
          <dd>{{ validation.titre }}</dd>
          <dt class="text-discret">Formateur</dt>
          <dd>{{ validation.formateur }}</dd>
          <dt class="text-discret">Date de complétion</dt>
          <dd>{{ validation.termineLe ? formatDate(validation.termineLe) : formatDate(new Date().toISOString()) }}</dd>
        </dl>
        <p v-if="erreur" class="mt-4 text-[14px] text-erreur">{{ erreur }}</p>
        <div class="mt-6 flex flex-wrap gap-2">
          <UiBaseButton type="submit" :disabled="enCours">
            {{ enCours ? 'Génération…' : 'Générer et télécharger mon certificat (PDF)' }}
          </UiBaseButton>
          <UiBaseButton variante="contour" @click="validation = null">Plus tard</UiBaseButton>
        </div>
        <p class="mt-3 text-[12.5px] text-discret">Re-téléchargeable à tout moment depuis « Mes certificats ».</p>
      </form>
    </div>
  </div>
</template>
