<script setup lang="ts">
import type { CandidatureFormateur, ProgrammeSlug } from '#shared/types'

/**
 * Création d'un compte formateur (planche C, écran 07b), depuis une
 * candidature ou à vide. Le mot de passe temporaire est facultatif : sans lui,
 * un lien d'invitation valable 72 h est envoyé — et affiché ici tant que
 * l'envoi n'est pas automatisé.
 */
const props = defineProps<{ candidature?: CandidatureFormateur | null }>()
const emit = defineEmits<{ fermer: []; cree: [] }>()

function decouperNom(complet: string): { prenom: string; nom: string } {
  const parties = complet.trim().split(/\s+/)
  if (parties.length < 2) return { prenom: '', nom: complet.trim() }
  return { prenom: parties[0] ?? '', nom: parties.slice(1).join(' ') }
}

const identite = decouperNom(props.candidature?.nom ?? '')
const formulaire = reactive({
  prenom: identite.prenom,
  nom: identite.nom,
  email: props.candidature?.email ?? '',
  whatsapp: props.candidature?.whatsapp ?? '',
  expertise: props.candidature?.expertise ?? '',
  bio: '',
  programmePrincipal: 'social-media' as ProgrammeSlug,
  mode: 'lien' as 'lien' | 'motDePasse',
  motDePasse: '',
})
const erreur = ref('')
const envoi = ref(false)
const resultat = ref<{ lienDefinition?: string; email: string } | null>(null)

async function creer() {
  erreur.value = ''
  envoi.value = true
  try {
    const reponse = await $fetch<{ utilisateur: { email: string }; lienDefinition?: string }>(
      '/api/admin/formateurs',
      {
        method: 'POST',
        body: {
          candidatureId: props.candidature?.id,
          prenom: formulaire.prenom,
          nom: formulaire.nom,
          email: formulaire.email,
          whatsapp: formulaire.whatsapp,
          expertise: formulaire.expertise,
          bio: formulaire.bio,
          programmePrincipal: formulaire.programmePrincipal,
          motDePasse: formulaire.mode === 'motDePasse' ? formulaire.motDePasse : undefined,
        },
      },
    )
    resultat.value = { lienDefinition: reponse.lienDefinition, email: reponse.utilisateur.email }
    emit('cree')
  } catch (e) {
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Création impossible.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-encre/50 p-4">
    <div class="my-6 w-full max-w-xl rounded-carte bg-white p-6">
      <template v-if="resultat">
        <h2 class="font-title text-[21px] font-light">Compte formateur créé</h2>
        <p class="mt-2 text-[14px] text-texte">
          {{ formulaire.prenom }} {{ formulaire.nom }} peut se connecter avec {{ resultat.email }}.
          Son espace s’ouvre en « Formateur simple » ; le coaching privé s’active depuis la liste.
        </p>
        <div v-if="resultat.lienDefinition" class="mt-4 rounded-[12px] border border-alerte bg-alerte-voile p-4">
          <p class="text-[13px] font-bold text-alerte">Lien de définition du mot de passe (72 h)</p>
          <p class="mt-1 break-all text-[12.5px] text-texte">{{ resultat.lienDefinition }}</p>
          <p class="mt-2 text-[12px] text-discret">
            Envoyé par e-mail et WhatsApp dès que le fournisseur d’envoi est branché ; d’ici là,
            transmettez-le vous-même.
          </p>
        </div>
        <UiBaseButton class="mt-5" taille="sm" @click="emit('fermer')">Fermer</UiBaseButton>
      </template>

      <form v-else class="space-y-4" @submit.prevent="creer">
        <h2 class="font-title text-[21px] font-light">
          {{ candidature ? 'Créer le compte formateur' : 'Ajouter un formateur' }}
        </h2>
        <p v-if="candidature" class="text-[13px] text-discret">Depuis la candidature {{ candidature.id }} — {{ candidature.nom }}.</p>

        <div class="grid gap-4 sm:grid-cols-2">
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
            <input v-model="formulaire.prenom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
            <input v-model="formulaire.nom" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">E-mail *</span>
            <input v-model="formulaire.email" type="email" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">WhatsApp</span>
            <input v-model="formulaire.whatsapp" type="tel" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Expertise *</span>
            <input v-model="formulaire.expertise" required class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]">
          </label>
          <label class="block">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Programme principal</span>
            <select v-model="formulaire.programmePrincipal" class="w-full rounded-[10px] border border-ligne bg-white px-3 py-2.5 text-[14px]">
              <option value="social-media">Social Média</option>
              <option value="entrepreneurs">Entrepreneurs</option>
            </select>
          </label>
          <label class="block sm:col-span-2">
            <span class="mb-1.5 block text-[13px] font-bold text-texte">Présentation (modifiable ensuite par le formateur)</span>
            <textarea v-model="formulaire.bio" rows="3" class="w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]" />
          </label>
        </div>

        <fieldset class="rounded-[12px] border border-ligne-douce p-4">
          <legend class="px-1 text-[13px] font-bold text-texte">Accès au compte</legend>
          <label class="flex items-center gap-2 text-[14px]">
            <input v-model="formulaire.mode" type="radio" value="lien" class="accent-social">
            Envoyer un lien pour définir le mot de passe (valable 72 h)
          </label>
          <label class="mt-2 flex items-center gap-2 text-[14px]">
            <input v-model="formulaire.mode" type="radio" value="motDePasse" class="accent-social">
            Communiquer un mot de passe temporaire
          </label>
          <input
            v-if="formulaire.mode === 'motDePasse'"
            v-model="formulaire.motDePasse"
            type="text"
            minlength="10"
            required
            placeholder="10 caractères minimum"
            class="mt-2 w-full rounded-[10px] border border-ligne px-3 py-2.5 text-[14px]"
          >
        </fieldset>

        <p v-if="erreur" class="rounded-[10px] border border-erreur bg-[#fdeeee] p-3 text-[13.5px] text-erreur">{{ erreur }}</p>

        <div class="flex flex-wrap gap-2">
          <UiBaseButton type="submit" taille="sm" :disabled="envoi">Créer le compte</UiBaseButton>
          <UiBaseButton taille="sm" variante="contour" @click="emit('fermer')">Annuler</UiBaseButton>
        </div>
        <p class="text-[12px] text-discret">
          Action journalisée. La fiche publique naît incomplète et hors index : elle sera publiée une fois renseignée.
        </p>
      </form>
    </div>
  </div>
</template>
