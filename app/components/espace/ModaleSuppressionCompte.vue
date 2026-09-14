<script setup lang="ts">
/**
 * Parcours de suppression (planche B, écran 12) — écran 1 avertissement
 * chiffré, écran 2 confirmation forte, écran 3 suppression programmée. L'écran
 * 4 (« Bon retour ») vit sur le tableau de bord, à la reconnexion.
 */
const emit = defineEmits<{ fermer: [] }>()
const auth = useAuthStore()

const { data: recap } = await useFetch<{ modules: number; certificats: number; sessions: number }>(
  '/api/mon-espace/compte/recapitulatif',
)

const etape = ref<1 | 2 | 3>(1)
const motDePasse = ref('')
const comprends = ref(false)
const erreur = ref('')
const envoi = ref(false)
const suppressionPrevueLe = ref('')

async function demander() {
  erreur.value = ''
  envoi.value = true
  try {
    const reponse = await $fetch<{ suppressionPrevueLe: string }>('/api/mon-espace/compte/suppression', {
      method: 'POST',
      body: { motDePasse: motDePasse.value, confirmation: comprends.value },
    })
    suppressionPrevueLe.value = reponse.suppressionPrevueLe
    etape.value = 3
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Suppression impossible.'
  } finally {
    envoi.value = false
  }
}

async function terminer() {
  auth.utilisateur = null
  await navigateTo('/')
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
    <div class="w-full max-w-lg rounded-carte bg-white p-6">
      <!-- Écran 1 — avertissement -->
      <template v-if="etape === 1">
        <h2 class="font-title text-[24px] font-light">Supprimer votre compte ?</h2>
        <p class="mt-3 text-[14.5px] text-texte">
          Vous perdrez définitivement :
          <b>{{ recap?.modules ?? 0 }} module{{ (recap?.modules ?? 0) > 1 ? 's' : '' }} acheté{{ (recap?.modules ?? 0) > 1 ? 's' : '' }}</b> (accès à vie),
          <b>{{ recap?.certificats ?? 0 }} certificat{{ (recap?.certificats ?? 0) > 1 ? 's' : '' }}</b>, votre historique. Aucun remboursement.
        </p>
        <div class="mt-6 flex flex-wrap gap-2">
          <UiBaseButton variante="sombre" @click="emit('fermer')">Conserver mon compte</UiBaseButton>
          <UiBaseButton variante="contour" @click="etape = 2">Continuer →</UiBaseButton>
        </div>
      </template>

      <!-- Écran 2 — confirmation forte -->
      <form v-else-if="etape === 2" @submit.prevent="demander">
        <h2 class="font-title text-[24px] font-light">Confirmez avec votre mot de passe</h2>
        <label class="mt-5 block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Mot de passe</span>
          <input v-model="motDePasse" type="password" autocomplete="current-password" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
        </label>
        <label class="mt-4 flex items-start gap-3 text-[14px] text-texte">
          <input v-model="comprends" type="checkbox" class="mt-1" required>
          <span>Je comprends que la suppression est irréversible après 14 jours.</span>
        </label>
        <p v-if="erreur" class="mt-3 text-[14px] text-erreur" role="alert">{{ erreur }}</p>
        <div class="mt-6 flex flex-wrap gap-2">
          <UiBaseButton type="submit" variante="sombre" :disabled="!comprends || envoi">Demander la suppression</UiBaseButton>
          <UiBaseButton variante="contour" @click="emit('fermer')">Annuler</UiBaseButton>
        </div>
      </form>

      <!-- Écran 3 — délai de grâce -->
      <template v-else>
        <h2 class="font-title text-[24px] font-light">Suppression programmée</h2>
        <p class="mt-3 text-[14.5px] text-texte">
          Compte désactivé. Suppression définitive le <b>{{ formatDate(suppressionPrevueLe) }}</b>.
          Reconnectez-vous avant cette date pour annuler.
        </p>
        <p class="mt-2 text-[13px] text-discret">J-14 · email de rappel à J-3</p>
        <UiBaseButton class="mt-6" variante="sombre" @click="terminer">Fermer</UiBaseButton>
      </template>
    </div>
  </div>
</template>
