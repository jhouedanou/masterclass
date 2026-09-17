<script setup lang="ts">
usePageSeo({
  titreAuto: 'Devenir formateur | E-Masterclass Big Five',
  descriptionAuto:
    'Vous maîtrisez une compétence utile aux professionnels du Social Media ou aux entrepreneurs ? Proposez un module pratique à E-Masterclass Big Five.',
  chemin: '/devenir-formateur',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Devenir formateur' }]
useFilAriane(mailles)

const formulaire = reactive({
  nom: '',
  whatsapp: '',
  email: '',
  programme: '',
  expertise: '',
  sujet: '',
  experience: '',
  motivation: '',
  portfolio: '',
  linkedin: '',
})
const CHAMP = 'w-full rounded-[10px] border-[1.5px] border-ligne px-3.5 py-[13px] text-[14px] focus:border-social focus:outline-none'
/** WhatsApp est le canal prioritaire : la maquette cerne son champ de violet. */
const CHAMP_PRIORITAIRE = 'w-full rounded-[10px] border-[1.5px] border-social px-3.5 py-[13px] text-[14px] focus:outline-none'
const ETIQUETTE = 'mb-1.5 block text-[13px] font-bold text-encre'
const envoye = ref(false)
const erreur = ref('')
const envoi = ref(false)

async function soumettre() {
  erreur.value = ''
  envoi.value = true
  try {
    await $fetch('/api/candidatures', { method: 'POST', body: { ...formulaire } })
    envoye.value = true
  } catch (e) {
    const r = e as { statusMessage?: string; data?: { statusMessage?: string } }
    erreur.value = r.data?.statusMessage ?? r.statusMessage ?? 'Envoi impossible, réessayez.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <!-- Colonne unique : le motif de marque coiffe la page en bandeau, la
       candidature suit sans encadré. -->
  <div class="mx-auto w-full max-w-[500px] px-5 py-10">
    <img
      src="/images/brand/pattern.png"
      alt=""
      aria-hidden="true"
      width="1144"
      height="1090"
      class="mb-5.5 h-[72px] w-full rounded-[12px] object-cover"
    >
    <UiSurtitre ton="discret" taille="section">Rejoindre E-Masterclass Big Five</UiSurtitre>
    <h1 class="mt-2.5 mb-2 font-title text-[30px] font-light">
      Devenir formateur E-Masterclass Big Five
    </h1>
    <p class="mb-3 text-[14.5px] leading-relaxed text-texte">
      Vous maîtrisez une compétence utile aux professionnels du Social Media ou aux
      entrepreneurs ? Proposez un module pratique et partagez votre expérience avec nos
      apprenants.
    </p>
    <p class="mb-5.5 rounded-[12px] border border-ligne-douce bg-fond-clair px-4 py-3.5 text-[13px] leading-[1.55] text-texte">
      Notre équipe étudiera votre proposition et vous contactera principalement par WhatsApp
      pour poursuivre les échanges.
    </p>

    <form class="flex flex-col gap-3.5" @submit.prevent="soumettre">
      <template v-if="!envoye">
        <label class="block">
          <span :class="ETIQUETTE">Numéro WhatsApp *</span>
          <input
            v-model="formulaire.whatsapp"
            required
            type="tel"
            placeholder="+225 07 00 00 00 00 — notre canal prioritaire"
            :class="CHAMP_PRIORITAIRE"
          >
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Nom et prénom *</span>
          <input v-model="formulaire.nom" required placeholder="Votre identité complète" :class="CHAMP">
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Programme concerné *</span>
          <select v-model="formulaire.programme" required :class="[CHAMP, 'bg-white text-texte']">
            <option value="">Choisir…</option>
            <option>Social Média</option>
            <option>Entrepreneurs</option>
            <option>Les deux</option>
          </select>
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Domaine d’expertise *</span>
          <input
            v-model="formulaire.expertise"
            required
            placeholder="Ex. copywriting, publicité en ligne, gestion financière…"
            :class="CHAMP"
          >
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Sujet du module proposé *</span>
          <input
            v-model="formulaire.sujet"
            required
            placeholder="Le titre du module que vous souhaitez animer"
            :class="CHAMP"
          >
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Nombre d’années d’expérience *</span>
          <input v-model="formulaire.experience" required type="number" min="0" placeholder="Ex. 7" :class="CHAMP">
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Message de motivation *</span>
          <textarea
            v-model="formulaire.motivation"
            required
            rows="3"
            placeholder="Ce que vous voulez enseigner, et à qui."
            :class="[CHAMP, 'min-h-[84px]']"
          />
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Email *</span>
          <input
            v-model="formulaire.email"
            required
            type="email"
            placeholder="Pour le suivi administratif"
            :class="CHAMP"
          >
        </label>
        <label class="block">
          <span :class="ETIQUETTE">Portfolio *</span>
          <input
            v-model="formulaire.portfolio"
            required
            type="url"
            placeholder="Lien vers vos travaux, site ou dossier de références"
            :class="CHAMP"
          >
        </label>
        <label class="block">
          <span :class="ETIQUETTE">LinkedIn *</span>
          <input
            v-model="formulaire.linkedin"
            required
            type="url"
            placeholder="Lien vers votre profil LinkedIn"
            :class="CHAMP"
          >
        </label>

        <p v-if="erreur" class="rounded-[12px] border border-erreur-bordure bg-erreur-voile px-4 py-3.5 text-[13px] leading-[1.55] text-erreur-fonce">
          {{ erreur }}
        </p>
        <UiBaseButton type="submit" class="w-full" variante="sombre" taille="lg" :disabled="envoi">
          Envoyer ma candidature
        </UiBaseButton>
      </template>

      <p v-else class="rounded-[12px] border border-succes-bordure bg-succes-voile px-4 py-3.5 text-[13px] leading-[1.55] text-succes-fonce" role="status">
        ✓ Votre candidature a bien été transmise. Notre équipe l’étudiera et vous contactera par
        WhatsApp si votre proposition correspond aux besoins du programme.
      </p>
    </form>
  </div>
</template>
