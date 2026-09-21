<script setup lang="ts">
/**
 * Volet « Attestations » des paramètres (écran 20).
 *
 * Le pied du document porte deux griffes : celle du formateur qui a donné le
 * module, celle de la direction qui le délivre. Elles étaient jusqu'ici un
 * fichier du dépôt, jamais fourni — donc une ligne nue sur toutes les
 * attestations, et rien à faire sans un déploiement.
 *
 * Les griffes ne sont pas figées dans les certificats déjà délivrés : déposer
 * une signature ici signe aussi ce qui est sorti avant elle. C'est voulu — le
 * contraire aurait laissé le passé non signé pour toujours.
 */
const { data, refresh } = await useFetch<{
  reglages: { signature: string; signataire: string }
  formateurs: { id: string; nom: string; signature: string }[]
}>('/api/admin/attestation')

const signataire = ref(data.value?.reglages.signataire ?? '')
watch(() => data.value?.reglages.signataire, (v) => { if (v !== undefined) signataire.value = v })

const enCours = ref(false)
const message = ref('')
const erreur = ref('')

async function enregistrerSignataire() {
  enCours.value = true
  message.value = ''
  erreur.value = ''
  try {
    await $fetch('/api/admin/attestation', {
      method: 'PUT',
      body: { signataire: signataire.value },
    })
    await refresh()
    message.value = 'Légende enregistrée.'
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Enregistrement impossible.'
  } finally {
    enCours.value = false
  }
}

const carte = 'rounded-[14px] border border-ligne-douce bg-white p-6'
const titreCarte = 'font-sans text-[15px] font-bold'
const champ =
  'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-3 text-[14px] focus:border-social focus:outline-none'
</script>

<template>
  <div v-if="data" class="grid gap-5">
    <p v-if="message" class="rounded-[10px] border border-succes bg-succes-voile px-4 py-3 text-[14px] text-succes">{{ message }}</p>
    <p v-if="erreur" class="rounded-[10px] border border-erreur bg-erreur-voile px-4 py-3 text-[14px] text-erreur">{{ erreur }}</p>

    <section :class="carte">
      <h2 :class="titreCarte">Griffe de la direction</h2>
      <p class="mt-1.5 text-[12.5px] leading-[1.6] text-discret">
        Apposée à droite du pied de page, sur toutes les attestations. Signez à la souris ou
        déposez une image — JPEG, PNG ou WebP, 256 ko au maximum. Un PNG à fond transparent rend
        le meilleur résultat à l’impression.
      </p>

      <label class="mt-4 block max-w-[420px]">
        <span class="mb-1.5 block text-[12.5px] font-bold">Nom sous la ligne de signature</span>
        <div class="flex flex-wrap gap-2">
          <input v-model="signataire" :class="champ" class="min-w-[220px] flex-1">
          <UiBaseButton taille="sm" variante="sombre" :disabled="enCours" @click="enregistrerSignataire">
            {{ enCours ? 'Enregistrement…' : 'Enregistrer' }}
          </UiBaseButton>
        </div>
      </label>

      <AdminChampSignature
        class="mt-4"
        :model-value="data.reglages.signature"
        :legende="data.reglages.signataire"
        @update:model-value="refresh()"
      />
    </section>

    <section :class="carte">
      <h2 :class="titreCarte">Griffes des formateurs</h2>
      <p class="mt-1.5 text-[12.5px] leading-[1.6] text-discret">
        Chacune n’apparaît que sur les attestations des modules de son formateur. Sans griffe, le
        document imprime la ligne seule — un module reste attestable par un formateur qui n’a pas
        signé.
      </p>

      <div class="mt-4 grid gap-3">
        <AdminChampSignature
          v-for="formateur in data.formateurs"
          :key="formateur.id"
          :model-value="formateur.signature"
          :legende="formateur.nom"
          :formateur-id="formateur.id"
          @update:model-value="refresh()"
        />
      </div>

      <p v-if="!data.formateurs.length" class="mt-4 rounded-[10px] border border-dashed border-ligne p-6 text-center text-[13.5px] text-discret">
        Aucun formateur enregistré.
      </p>
    </section>
  </div>
</template>
