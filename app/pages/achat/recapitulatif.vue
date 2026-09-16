<script setup lang="ts">
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
  achat.vider()
  await navigateTo(slug ? `/modules/${slug}` : '/modules')
}
</script>

<template>
  <div class="conteneur max-w-[840px] py-12">
    <UiEtapesAchat :etape="2" />

    <h1 class="mt-8 text-[36px] font-medium">Vérifiez votre achat</h1>

    <div v-if="achat.module" class="mt-8 overflow-hidden rounded-carte border border-ligne-douce">
      <table class="w-full text-[14.5px]">
        <tbody class="divide-y divide-ligne-claire">
          <tr>
            <th scope="row" class="w-40 px-6 py-3.5 text-left font-normal text-discret">Module</th>
            <td class="px-6 py-3.5 font-title text-[19px] font-light text-encre">{{ achat.module.titre }}</td>
          </tr>
          <tr class="hidden lg:table-row">
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Programme</th>
            <td class="px-6 py-3.5">{{ achat.module.programme }}</td>
          </tr>
          <tr class="hidden lg:table-row">
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Thématique</th>
            <td class="px-6 py-3.5">{{ achat.module.thematique }}</td>
          </tr>
          <tr class="hidden lg:table-row">
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Formateur</th>
            <td class="px-6 py-3.5">{{ achat.module.formateur }}</td>
          </tr>
          <tr class="hidden lg:table-row">
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Durée</th>
            <td class="px-6 py-3.5">{{ formatDuree(achat.module.dureeMinutes) }}</td>
          </tr>
          <tr>
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Durée d’accès</th>
            <td class="px-6 py-3.5">À vie</td>
          </tr>
          <tr class="hidden lg:table-row">
            <th scope="row" class="px-6 py-3.5 text-left font-normal text-discret">Coaching</th>
            <td class="px-6 py-3.5">Collectif, lié à la thématique</td>
          </tr>
        </tbody>
      </table>

      <div class="flex items-center justify-between border-t border-ligne-claire bg-fond-clair px-6 py-5">
        <span class="font-title text-[19px] font-light">Total TTC</span>
        <span class="font-title text-[27px] font-light">
          {{ formatFcfa(achat.module.prixFcfa, true) }}
        </span>
      </div>
    </div>

    <label class="mt-6 flex items-start gap-3 text-[14px] leading-relaxed text-texte">
      <input v-model="conditions" type="checkbox" class="mt-1" required>
      <span>
        Je reconnais acheter un <b>contenu numérique à accès immédiat</b> et accepte que la vente
        soit <b>ferme et définitive</b> après confirmation, conformément aux
        <!-- `.stop` : le bouton est dans le `<label>`, son clic cocherait la case. -->
        <button type="button" class="font-bold underline" @click.stop="cgvOuvertes = true">CGV</button>.
      </span>
    </label>

    <!-- Un vrai `button` désactivé, et non un lien neutralisé par
         `pointer-events-none` : cette règle n'arrête que la souris, et l'on
         atteignait le paiement en tabulant jusqu'au lien puis en pressant
         Entrée — donc sans avoir accepté les CGV, que la vente exige. -->
    <UiBaseButton
      class="mt-6 w-full"
      taille="lg"
      :disabled="!conditions"
      @click="allerAuPaiement"
    >
      Confirmer et passer au paiement
    </UiBaseButton>
    <p class="mt-3 text-center text-[13px] text-discret">
      Vous serez redirigé vers FeexPay pour régler votre achat.
    </p>

    <LegalModaleCgv v-if="cgvOuvertes" @fermer="cgvOuvertes = false" />
    <p class="mt-5 text-center">
      <button type="button" class="text-[14px] text-discret hover:text-encre hover:underline" @click="annuler">
        ← Revenir en arrière ou annuler
      </button>
    </p>
  </div>
</template>
