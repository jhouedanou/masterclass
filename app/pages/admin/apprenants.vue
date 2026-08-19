<script setup lang="ts">
import type { Module, Persona } from '#shared/types'

definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Apprenants — administration')

interface Apprenant {
  id: string
  nom: string
  email: string
  whatsapp: string
  pays: string
  ficheCompletee: boolean
  profilPourcent: number
  modulesAcquis: { id: string; titre: string; programme: string }[]
  progression: number
  certificats: number
  persona: Persona | null
  montantPaye: number
}

const filtreProgramme = ref('')
const filtreProfil = ref('')

const { data: apprenants, refresh } = await useFetch<Apprenant[]>('/api/admin/apprenants', {
  query: computed(() => ({
    programme: filtreProgramme.value || undefined,
    profil: filtreProfil.value || undefined,
  })),
})
const { data: modules } = await useFetch<Module[]>('/api/modules')

const selection = ref<Apprenant | null>(null)
const attribution = reactive({ moduleId: '', motif: '', notifier: true })
const message = ref('')
const erreur = ref('')

async function attribuer() {
  erreur.value = ''
  try {
    await $fetch('/api/admin/attribution', {
      method: 'POST',
      body: {
        utilisateurId: selection.value!.id,
        moduleId: attribution.moduleId,
        motif: attribution.motif,
      },
    })
    message.value = `Accès attribué à ${selection.value!.nom} — marqué « Attribution admin », apprenant notifié.`
    attribution.moduleId = ''
    attribution.motif = ''
    await refresh()
    selection.value = null
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Attribution impossible.'
  }
}
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">
      Apprenants — {{ apprenants?.length ?? 0 }} comptes actifs
    </h1>
    <p class="mt-2 text-[12.5px] text-discret">
      L’export respecte les filtres actifs — colonnes : identité, contact, programme, progression,
      paiements, certificats. Action journalisée (export à brancher).
    </p>

    <p v-if="message" class="mt-4 rounded-[10px] border border-succes bg-succes-voile p-3 text-[13.5px] text-succes">
      {{ message }}
    </p>

    <div class="mt-5 flex flex-wrap gap-2 text-[13px]">
      <select v-model="filtreProgramme" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous programmes</option>
        <option value="social-media">Social Média</option>
        <option value="entrepreneurs">Entrepreneurs</option>
      </select>
      <select v-model="filtreProfil" class="rounded-full border border-ligne bg-white px-3.5 py-2">
        <option value="">Tous profils</option>
        <option value="complet">Profil complet (100 %)</option>
        <option value="incomplet">Profil incomplet</option>
      </select>
    </div>

    <div class="mt-4 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <AdminTableauSimple :colonnes="['Apprenant', 'Progression', 'Profil', 'Certificats', '']">
        <tr v-for="apprenant in apprenants" :key="apprenant.id">
          <td class="px-4 py-3">
            <p class="font-bold">{{ apprenant.nom }}</p>
            <p class="text-[12px] text-discret">{{ apprenant.email }} · {{ apprenant.whatsapp }}</p>
          </td>
          <td class="px-4 py-3">{{ apprenant.progression }} %</td>
          <td class="px-4 py-3">
            <span
              class="rounded-full px-2.5 py-1 text-[11px] font-bold"
              :class="apprenant.profilPourcent === 100 ? 'bg-succes-voile text-succes' : 'bg-alerte-voile text-alerte'"
            >
              {{ apprenant.profilPourcent }} %
            </span>
          </td>
          <td class="px-4 py-3">{{ apprenant.certificats || '—' }}</td>
          <td class="px-4 py-3 text-right">
            <button class="text-[12.5px] underline" @click="selection = apprenant">Fiche</button>
          </td>
        </tr>
      </AdminTableauSimple>

      <aside v-if="selection" class="h-fit rounded-[14px] border border-ligne-douce bg-white p-6">
        <div class="flex items-start justify-between gap-3">
          <div>
            <h2 class="font-title text-[21px] font-light">{{ selection.nom }}</h2>
            <p class="text-[12.5px] text-discret">{{ selection.pays }}</p>
          </div>
          <button class="text-[12px] text-discret underline" @click="selection = null">Fermer</button>
        </div>

        <section v-if="selection.persona" class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="surtitre text-discret">Fiche persona — contexte pour le coach</p>
          <dl class="mt-3 grid gap-2 text-[13.5px] sm:grid-cols-2">
            <div><dt class="text-discret">Âge</dt><dd>{{ selection.persona.age }} ans</dd></div>
            <div><dt class="text-discret">Secteur</dt><dd>{{ selection.persona.secteur }}</dd></div>
            <div><dt class="text-discret">Expérience</dt><dd>{{ selection.persona.experience }}</dd></div>
            <div><dt class="text-discret">Réseaux gérés</dt><dd>{{ selection.persona.reseaux }}</dd></div>
            <div class="sm:col-span-2"><dt class="text-discret">Objectif</dt><dd>{{ selection.persona.objectif }}</dd></div>
          </dl>
        </section>

        <p
          v-if="selection.profilPourcent < 100"
          class="mt-4 rounded-[10px] border border-alerte bg-alerte-voile p-3 text-[13px] text-alerte"
        >
          Profil à {{ selection.profilPourcent }} % — participation aux sessions de coaching bloquée
          tant qu’il n’est pas complété.
        </p>

        <dl class="mt-4 grid gap-2 text-[13.5px] sm:grid-cols-2">
          <div>
            <dt class="text-discret">Modules achetés</dt>
            <dd>{{ selection.modulesAcquis.length }} · {{ formatFcfa(selection.montantPaye) }}</dd>
          </div>
          <div><dt class="text-discret">Certificats</dt><dd>{{ selection.certificats }}</dd></div>
        </dl>

        <section class="mt-5 rounded-[12px] border border-ligne-claire p-4">
          <p class="font-bold text-[14px]">Attribuer un accès gratuit</p>
          <p class="mt-1 text-[12.5px] text-discret">
            L’accès attribué est marqué « Attribution admin », distinct d’un achat. Motif obligatoire,
            action journalisée, apprenant notifié.
          </p>
          <form class="mt-3 space-y-3" @submit.prevent="attribuer">
            <select v-model="attribution.moduleId" required class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option value="">Choisir un module…</option>
              <option v-for="m in modules" :key="m.id" :value="m.id">{{ m.titre }}</option>
            </select>
            <input
              v-model="attribution.motif"
              required
              placeholder="Motif (journalisé, obligatoire)"
              class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]"
            >
            <label class="flex items-center gap-2 text-[13px] text-texte">
              <input v-model="attribution.notifier" type="checkbox">
              Notifier l’apprenant par e-mail et WhatsApp
            </label>
            <p v-if="erreur" class="text-[13px] text-erreur">{{ erreur }}</p>
            <UiBaseButton type="submit" taille="sm">Attribuer et notifier</UiBaseButton>
          </form>
        </section>
      </aside>

      <aside v-else class="h-fit rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-[13.5px] text-discret">
        Sélectionnez un apprenant pour ouvrir sa fiche.
      </aside>
    </div>
  </div>
</template>
