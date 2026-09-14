<script setup lang="ts">
import type { Persona, ProgrammeSlug, Utilisateur } from '#shared/types'
import { CHAMPS_ENTREPRENEUR, CHAMPS_SOCIAL_MEDIA, NIVEAUX_EXPERIENCE, calculerCompletionProfil } from '#shared/utils/profil'

definePageMeta({ layout: 'espace', middleware: 'auth' })
usePagePrivee('Votre profil apprenant')

const auth = useAuthStore()
const { data, refresh } = await useFetch<{ utilisateur: Utilisateur; persona: Persona; programme: ProgrammeSlug | null }>(
  '/api/mon-espace/compte',
)

const formulaire = reactive<Persona & { prenom: string; nom: string }>({
  prenom: data.value?.utilisateur.prenom ?? '',
  nom: data.value?.utilisateur.nom ?? '',
  ...(data.value?.persona ?? {}),
})

/** « Modifier » déverrouille les champs, « Enregistrer » sauvegarde et les reverrouille. */
const edition = ref(false)
const message = ref('')
const erreur = ref('')
const envoi = ref(false)

const programme = computed(() => data.value?.programme ?? null)
const completion = computed(
  () => calculerCompletionProfil({ ...formulaire, whatsapp: data.value?.utilisateur.whatsapp }, formulaire, programme.value).pourcentage,
)

const STADES = ['En projet / idée', 'Lancement (< 2 ans)', 'En croissance (2 ans et +)']
const TAILLES = ['Seul(e)', '2 à 5 personnes', '6 à 20 personnes', 'Plus de 20']
const BUDGETS = ['Moins de 50 000 FCFA', '50 000 – 150 000 FCFA', '150 000 – 500 000 FCFA', 'Plus de 500 000 FCFA']
const AUDIENCES = ['Moins de 1 000 abonnés', '1 000 à 10 000 abonnés', '10 000 à 100 000 abonnés', 'Plus de 100 000 abonnés']

const CHAMP = 'w-full rounded-[10px] border px-4 py-2.5 text-[15px] focus:outline-none disabled:bg-fond-clair disabled:text-texte'
const classe = computed(() => [CHAMP, edition.value ? 'border-ligne focus:border-social' : 'border-ligne-claire'])

async function enregistrer() {
  erreur.value = ''
  message.value = ''
  envoi.value = true
  try {
    const { prenom, nom, ...persona } = formulaire
    await $fetch('/api/mon-espace/compte/profil', {
      method: 'PUT',
      body: {
        prenom,
        nom,
        whatsapp: data.value?.utilisateur.whatsapp,
        persona: { ...persona, age: persona.age || undefined },
      },
    })
    await Promise.all([auth.rafraichir(), refresh()])
    edition.value = false
    message.value =
      completion.value === 100
        ? 'Profil enregistré à 100 % : vous pouvez rejoindre vos coaching sessions.'
        : `Profil enregistré à ${completion.value} %. Complétez-le à 100 % pour rejoindre une coaching session.`
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Enregistrement impossible.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div class="max-w-[760px]">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <h1 class="text-[30px] font-medium">Votre profil apprenant</h1>
      <p class="font-title text-[34px] leading-none font-light" :class="completion === 100 ? 'text-succes' : 'text-alerte'">{{ completion }} %</p>
    </div>
    <div class="mt-3 h-1.5 w-full rounded-full bg-fond-voile">
      <div class="h-full rounded-full transition-all" :class="completion === 100 ? 'bg-succes' : 'bg-alerte'" :style="{ width: `${completion}%` }" />
    </div>
    <p class="mt-3 text-[14.5px] text-texte">
      Ces informations permettent à vos coachs de préparer des sessions adaptées à votre contexte.
      Complétion à 100 % requise pour rejoindre une coaching session. Votre pays, renseigné à la
      création du compte, n’est plus demandé ici.
    </p>

    <form class="mt-8" @submit.prevent="enregistrer">
      <fieldset :disabled="!edition" class="grid gap-5 sm:grid-cols-2">
        <legend class="surtitre mb-4 text-discret">Vous, en quelques repères</legend>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Prénom *</span>
          <input v-model="formulaire.prenom" required :class="classe">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom *</span>
          <input v-model="formulaire.nom" required :class="classe">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Âge</span>
          <input v-model.number="formulaire.age" type="number" min="12" max="120" :class="classe">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Ville</span>
          <input v-model="formulaire.ville" :class="classe" placeholder="Abidjan, Bouaké, Cotonou…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Secteur d’activité</span>
          <input v-model="formulaire.secteur" :class="classe" placeholder="Agence digitale, commerce, restauration…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Niveau d’expérience</span>
          <select v-model="formulaire.niveau" :class="[...classe, 'bg-white']">
            <option value="">Choisir…</option>
            <option v-for="n in NIVEAUX_EXPERIENCE" :key="n.valeur" :value="n.valeur">{{ n.libelle }}</option>
          </select>
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Objectif principal</span>
          <textarea v-model="formulaire.objectif" rows="3" :class="classe" placeholder="Doubler mes ventes en ligne et déléguer ma communication d’ici 6 mois." />
        </label>
      </fieldset>

      <!-- Bloc propre au programme -->
      <fieldset v-if="programme === 'entrepreneurs'" :disabled="!edition" class="mt-8 grid gap-5 sm:grid-cols-2">
        <legend class="surtitre mb-4 text-entrepreneurs">Spécifique au profil Entrepreneur</legend>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">{{ CHAMPS_ENTREPRENEUR[0]!.libelle }}</span>
          <input v-model="formulaire.entreprise" :class="classe">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Stade de développement</span>
          <select v-model="formulaire.stade" :class="[...classe, 'bg-white']">
            <option value="">Choisir…</option>
            <option v-for="s in STADES" :key="s">{{ s }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Taille de l’équipe</span>
          <select v-model="formulaire.tailleEquipe" :class="[...classe, 'bg-white']">
            <option value="">Choisir…</option>
            <option v-for="t in TAILLES" :key="t">{{ t }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Canaux de vente actuels</span>
          <input v-model="formulaire.canaux" :class="classe" placeholder="WhatsApp, boutique, marchés, site…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Présence en ligne existante</span>
          <input v-model="formulaire.presenceEnLigne" :class="classe" placeholder="Page Facebook, compte Instagram, site…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Budget communication mensuel</span>
          <select v-model="formulaire.budget" :class="[...classe, 'bg-white']">
            <option value="">Choisir…</option>
            <option v-for="b in BUDGETS" :key="b">{{ b }}</option>
          </select>
        </label>
        <label class="block sm:col-span-2">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Votre principal défi business aujourd’hui</span>
          <textarea v-model="formulaire.defi" rows="3" :class="classe" placeholder="Attirer des clients réguliers sans dépendre uniquement du bouche-à-oreille." />
        </label>
      </fieldset>

      <fieldset v-else-if="programme === 'social-media'" :disabled="!edition" class="mt-8 grid gap-5 sm:grid-cols-2">
        <legend class="surtitre mb-4 text-social">Spécifique au programme Social Média</legend>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">{{ CHAMPS_SOCIAL_MEDIA[0]!.libelle }} actuellement</span>
          <input v-model="formulaire.reseaux" :class="classe" placeholder="Instagram, TikTok, LinkedIn…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Taille d’audience approximative</span>
          <select v-model="formulaire.audience" :class="[...classe, 'bg-white']">
            <option value="">Choisir…</option>
            <option v-for="a in AUDIENCES" :key="a">{{ a }}</option>
          </select>
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Outils utilisés</span>
          <input v-model="formulaire.outils" :class="classe" placeholder="Canva, CapCut, Meta Business Suite…">
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[13px] font-bold text-texte">Clients / marques accompagnés</span>
          <input v-model="formulaire.clients" :class="classe" placeholder="Une marque de cosmétiques, un restaurant…">
        </label>
      </fieldset>

      <p v-else class="mt-8 rounded-[12px] border border-dashed border-ligne p-4 text-[13.5px] text-discret">
        Le bloc propre à votre programme (Entrepreneur ou Social Média) apparaît dès votre premier module.
      </p>

      <div class="mt-8 flex flex-wrap items-center gap-3">
        <UiBaseButton v-if="!edition" type="button" variante="contour" @click="edition = true">Modifier</UiBaseButton>
        <UiBaseButton v-else type="submit" :disabled="envoi">Enregistrer</UiBaseButton>
        <p class="text-[12.5px] text-discret">« Modifier » déverrouille les champs, « Enregistrer » sauvegarde et les reverrouille.</p>
      </div>
      <p v-if="message" class="mt-3 text-[14px] text-succes" role="status">{{ message }}</p>
      <p v-if="erreur" class="mt-3 text-[14px] text-erreur" role="alert">{{ erreur }}</p>
    </form>
  </div>
</template>
