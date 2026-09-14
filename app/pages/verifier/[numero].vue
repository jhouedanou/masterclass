<script setup lang="ts">
/** Ce que la route publique consent à dire : ce qui figure sur le document,
 *  et rien de plus — ni compte, ni module, ni motif de révocation. */
interface AttestationVerifiee {
  numero: string
  prenomNom: string
  titreModule: string
  programme: string
  thematique: string
  formateur: string
  dateDelivrance: string
  revoqueLe: string | null
}

const route = useRoute()
// Au rendu serveur, l'appel à Nitro ne passe pas par le réseau : sans ces
// en-têtes, la route ne verrait jamais l'adresse du visiteur et compterait
// toutes les vérifications sous une seule et même clé.
const { data, error } = await useFetch<AttestationVerifiee>(
  () => `/api/verifier/${route.params.numero}`,
  { headers: useRequestHeaders(['x-vercel-forwarded-for', 'x-forwarded-for']) },
)

const revoquee = computed(() => Boolean(data.value?.revoqueLe))

// Page de destination du QR code : accessible sans compte, mais hors index —
// un moteur n'a pas à référencer le nom des apprenants. La page de saisie
// /verifier, elle, est indexable.
usePagePrivee('Vérification d’attestation')
</script>

<template>
  <div class="conteneur max-w-[640px] py-14">
    <h1 class="text-[34px] font-medium">Vérification d’attestation</h1>
    <p class="mt-2 text-[14px] text-discret">
      Numéro recherché : <span class="font-mono">{{ route.params.numero }}</span>
    </p>

    <div v-if="data && revoquee" class="mt-8 rounded-carte border border-erreur bg-[#fdeeee] p-8">
      <p class="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[14px] text-erreur-fonce">
        <Icon name="ph:seal-warning-fill" size="18" />
        Attestation révoquée
      </p>
      <p class="mt-5 text-[15px] leading-relaxed text-erreur-fonce">
        Cette attestation a été annulée par E-Masterclass Big Five et n’est plus valable.
      </p>
      <p class="mt-2 text-[13px] text-erreur">
        Révoquée le {{ formatDate(data.revoqueLe!) }}. Pour toute question, écrivez-nous sur
        WhatsApp au {{ WHATSAPP.affichage }}.
      </p>
    </div>

    <div v-else-if="data" class="mt-8 rounded-carte border border-succes p-8">
      <p class="inline-flex items-center gap-2 rounded-full bg-succes-voile px-3.5 py-1.5 text-[14px] text-succes">
        <Icon name="ph:seal-check-fill" size="18" />
        Attestation authentique
      </p>

      <dl class="mt-6 space-y-3 text-[14px]">
        <div class="flex justify-between gap-4"><dt class="text-discret">Titulaire</dt><dd class="text-right font-bold">{{ data.prenomNom }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Module</dt><dd class="text-right">{{ data.titreModule }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Programme</dt><dd class="text-right">{{ data.programme }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Thématique</dt><dd class="text-right">{{ data.thematique }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Formateur</dt><dd class="text-right">{{ data.formateur }}</dd></div>
        <div class="flex justify-between gap-4"><dt class="text-discret">Délivrée le</dt><dd class="text-right">{{ formatDate(data.dateDelivrance) }}</dd></div>
      </dl>

      <p class="mt-6 border-t border-ligne-claire pt-4 text-[12px] text-discret">
        Cette attestation confirme le suivi du module et ne constitue ni un diplôme ni une
        certification professionnelle.
      </p>
    </div>

    <div
      v-else-if="error?.statusCode === 429"
      class="mt-8 rounded-carte border border-ligne bg-[#fdf6ec] p-8"
    >
      <p class="font-title text-[21px] font-light">Trop de vérifications</p>
      <p class="mt-2 text-[14px] text-texte">
        Trop de numéros ont été essayés depuis cette connexion. Patientez quelques minutes avant de
        réessayer.
      </p>
    </div>

    <div v-else-if="error" class="mt-8 rounded-carte border border-erreur bg-[#fdeeee] p-8">
      <p class="font-title text-[21px] font-light text-erreur-fonce">
        Aucune attestation ne correspond à ce numéro.
      </p>
      <p class="mt-2 text-[14px] text-erreur">
        Vérifiez la saisie, ou contactez-nous sur WhatsApp au {{ WHATSAPP.affichage }}.
      </p>
    </div>

    <UiBaseButton to="/" variante="contour" class="mt-8">Retour à l’accueil</UiBaseButton>
  </div>
</template>
