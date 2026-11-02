<script setup lang="ts">
import { ligneHoraireLive } from '#shared/utils/live'

definePageMeta({ middleware: 'auth' })

const achat = useAchatStore()
const conditions = ref(false)

/** Le clic ne mène au paiement qu'une fois les CGV acceptées. */
function allerAuPaiement() {
  if (!conditions.value) return
  return navigateTo('/achat/paiement')
}
/** Les CGV s'ouvrent en surimpression : quitter la page ferait perdre sa place à l'acheteur. */
const cgvOuvertes = ref(false)

usePagePrivee('Vérifiez votre achat')

/** « ← Revenir en arrière ou annuler » : retour à la fiche, panier vidé. */
async function annuler() {
  const slug = achat.module?.slug
  const live = achat.live?.slug
  achat.vider()
  await navigateTo(live ? `/live-sessions/${live}` : slug ? `/modules/${slug}` : '/modules')
}
</script>

<template>
  <div class="mx-auto w-full max-w-[480px] px-5 py-9">
    <UiEtapesAchat :etape="2" />

    <h1 class="mt-2.5 mb-5.5 text-center font-title text-[24px] font-light">{{ achat.live ? 'Vérifiez votre inscription' : 'Vérifiez votre achat' }}</h1>

    <!-- Live Session (planche 04, étape 2) : date, formateur, connexion, après
         la session ; mention d'enregistrement dans la case à cocher (10.H). -->
    <dl v-if="achat.live" class="mb-4.5 flex flex-col gap-2.5 rounded-bloc border border-ligne-douce p-5 text-[14px]">
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Live Session</dt>
        <dd class="text-right font-bold">{{ achat.live.titre }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Date</dt>
        <dd class="text-right font-bold">{{ ligneHoraireLive(achat.live.debut, achat.live.dureeMinutes) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Formateur</dt>
        <dd class="text-right font-bold">{{ achat.live.formateur }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Connexion</dt>
        <dd class="text-right font-bold">Depuis votre espace · rappel par e-mail la veille, 10 min avant et à l’heure</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Après la session</dt>
        <dd class="text-right font-bold">Quiz, support si fourni, puis version vidéo</dd>
      </div>
      <div class="flex justify-between gap-4 border-t border-ligne-claire pt-2.5">
        <dt class="text-discret">Total TTC</dt>
        <dd class="text-[18px] font-bold">{{ formatFcfa(achat.live.prixFcfa) }}</dd>
      </div>
    </dl>

    <!-- Récapitulatif en lignes « intitulé / valeur », le total détaché par un filet. -->
    <dl v-if="achat.module" class="mb-4.5 flex flex-col gap-2.5 rounded-bloc border border-ligne-douce p-5 text-[14px]">
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Module</dt>
        <dd class="text-right font-bold">{{ achat.module.titre }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Programme</dt>
        <dd class="font-bold">{{ achat.module.programme }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Thématique</dt>
        <dd class="text-right font-bold">{{ achat.module.thematique }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Formateur</dt>
        <dd class="font-bold">{{ achat.module.formateur }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Durée</dt>
        <dd class="font-bold">{{ formatDuree(achat.module.dureeMinutes) }}</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Durée d’accès</dt>
        <dd class="font-bold text-whatsapp">À vie</dd>
      </div>
      <div class="flex justify-between gap-4">
        <dt class="text-discret">Coaching</dt>
        <dd class="text-right font-bold">Collectif, lié à la thématique</dd>
      </div>
      <div class="flex justify-between gap-4 border-t border-ligne-claire pt-2.5">
        <dt class="text-discret">Total TTC</dt>
        <dd class="text-[18px] font-bold">{{ formatFcfa(achat.module.prixFcfa) }}</dd>
      </div>
    </dl>

    <label class="mb-4 flex items-start gap-3 rounded-[12px] border-[1.5px] border-social bg-social-nuage p-4 text-[13px] leading-[1.55] text-texte">
      <input v-model="conditions" type="checkbox" class="mt-0.5 size-[18px] accent-social" required>
      <span v-if="achat.live">
        J’accepte les
        <button type="button" class="font-bold text-social underline" @click.stop="cgvOuvertes = true">CGV</button>
        et j’ai noté que <b>la session est enregistrée</b>.
      </span>
      <span v-else>
        Je reconnais acheter un <b>contenu numérique à accès immédiat</b> et accepte que la vente
        soit <b>ferme et définitive</b> après confirmation, conformément aux
        <!-- `.stop` : le bouton est dans le `<label>`, son clic cocherait la case. -->
        <button type="button" class="font-bold text-social underline" @click.stop="cgvOuvertes = true">CGV</button>.
      </span>
    </label>

    <!-- Un vrai `button` désactivé, et non un lien neutralisé par
         `pointer-events-none` : cette règle n'arrête que la souris, et l'on
         atteignait le paiement en tabulant jusqu'au lien puis en pressant
         Entrée — donc sans avoir accepté les CGV, que la vente exige. -->
    <UiBaseButton class="mb-2 w-full" taille="lg" :disabled="!conditions" @click="allerAuPaiement">
      Confirmer et passer au paiement
    </UiBaseButton>
    <p class="mb-2.5 text-center text-[12.5px] text-discret">
      Vous serez redirigé vers FeexPay pour régler votre achat.
    </p>

    <LegalModaleCgv v-if="cgvOuvertes" @fermer="cgvOuvertes = false" />
    <p class="text-center text-[13px]">
      <button type="button" class="text-discret hover:text-encre hover:underline" @click="annuler">
        ← Revenir en arrière ou annuler
      </button>
    </p>
  </div>
</template>
