<script setup lang="ts">
definePageMeta({ layout: 'formateur', middleware: 'formateur' })
usePagePrivee('Mes modules — formateur')

const { data: modules } = await useFetch<
  {
    id: string
    slug: string
    titre: string
    programme: string
    statut: string
    thematique: string
    inscrits: number
    nouveaux: number
    completion: number
    certificats: number
  }[]
>('/api/formateur/modules')
</script>

<template>
  <div>
    <h1 class="font-title text-[26px] font-light">Mes modules — statistiques d’inscription</h1>
    <p class="mt-2 text-[13.5px] text-discret">
      Lecture seule : les contenus des modules sont produits avec l’équipe Big Five.
    </p>

    <AdminTableauSimple
      class="mt-6"
      :colonnes="['Module', 'Inscrits', 'Nouveaux (30 j)', 'Complétion', 'Certificats']"
    >
      <tr v-for="module in modules" :key="module.id">
        <td class="px-4 py-3">
          <p class="font-bold">{{ module.titre }}</p>
          <p class="text-[12px] text-discret">
            {{ module.programme === 'social-media' ? 'SM' : 'ENT' }} · {{ module.thematique }}
            <span v-if="module.statut !== 'disponible'"> — teasing publié</span>
          </p>
        </td>
        <td class="px-4 py-3">{{ module.statut === 'disponible' ? module.inscrits : '—' }}</td>
        <td class="px-4 py-3">{{ module.statut === 'disponible' ? `+${module.nouveaux}` : '—' }}</td>
        <td class="px-4 py-3">
          {{ module.statut === 'disponible' ? `${module.completion} %` : 'En préparation' }}
        </td>
        <td class="px-4 py-3">{{ module.statut === 'disponible' ? module.certificats : '—' }}</td>
      </tr>
    </AdminTableauSimple>
  </div>
</template>
