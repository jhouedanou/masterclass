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
    erreur.value = (e as { statusMessage?: string }).statusMessage ?? 'Envoi impossible, réessayez.'
  } finally {
    envoi.value = false
  }
}
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <FilAriane :mailles="mailles" class="mb-6" />
        <UiSurtitre ton="social">Rejoindre E-Masterclass Big Five</UiSurtitre>
        <h1 class="mt-3 max-w-[900px] text-[40px] font-medium lg:text-[46px]">
          Devenir formateur E-Masterclass Big Five
        </h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Vous maîtrisez une compétence utile aux professionnels du Social Media ou aux
          entrepreneurs ? Proposez un module pratique et partagez votre expérience avec nos
          apprenants.
        </p>
        <p class="mt-3 max-w-[760px] text-[14.5px] text-discret">
          Notre équipe étudiera votre proposition et vous contactera principalement par WhatsApp
          pour poursuivre les échanges.
        </p>
      </div>
    </section>

    <section class="py-14">
      <div class="conteneur max-w-[840px]">
        <form
          v-if="!envoye"
          class="rounded-carte border border-ligne-douce p-8"
          @submit.prevent="soumettre"
        >
          <div class="grid gap-5 sm:grid-cols-2">
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom et prénom *</span>
              <input v-model="formulaire.nom" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp *</span>
              <input v-model="formulaire.whatsapp" required type="tel" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Email *</span>
              <input v-model="formulaire.email" required type="email" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Programme concerné *</span>
              <select v-model="formulaire.programme" required class="w-full rounded-[10px] border border-ligne bg-white px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
                <option value="">Choisir…</option>
                <option>Social Média</option>
                <option>Entrepreneurs</option>
                <option>Les deux</option>
              </select>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Domaine d’expertise *</span>
              <input v-model="formulaire.expertise" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Nombre d’années d’expérience *</span>
              <input v-model="formulaire.experience" required type="number" min="0" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Sujet du module proposé *</span>
              <input v-model="formulaire.sujet" required class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Message de motivation *</span>
              <textarea v-model="formulaire.motivation" required rows="5" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none" />
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Portfolio</span>
              <input v-model="formulaire.portfolio" type="url" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">LinkedIn</span>
              <input v-model="formulaire.linkedin" type="url" class="w-full rounded-[10px] border border-ligne px-4 py-2.5 text-[15px] focus:border-social focus:outline-none">
            </label>
          </div>

          <p v-if="erreur" class="mt-5 rounded-[10px] border border-erreur bg-[#fdeeee] p-3 text-[14px] text-erreur">{{ erreur }}</p>
          <UiBaseButton type="submit" class="mt-7 w-full" taille="lg" :disabled="envoi">
            Envoyer ma candidature
          </UiBaseButton>
        </form>

        <p v-else class="rounded-carte border border-succes bg-succes-voile p-8 text-[15px] text-succes">
          ✓ Votre candidature a bien été transmise. Notre équipe l’étudiera et vous contactera par
          WhatsApp si votre proposition correspond aux besoins du programme.
        </p>
      </div>
    </section>
  </div>
</template>
