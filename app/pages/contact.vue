<script setup lang="ts">
const groupesFaq = [
  {
    titre: 'Achat et paiement',
    questions: [
      {
        question: 'Puis-je acheter un seul module ?',
        reponse: 'Oui. Chaque module est indépendant et peut être acheté séparément.',
      },
      {
        question: 'Combien coûte un module ?',
        reponse:
          'Chaque module coûte 10 000 FCFA TTC, sauf indication différente affichée sur sa fiche.',
      },
      {
        question: 'Quels moyens de paiement sont acceptés ?',
        reponse:
          'Le paiement s’effectue via FeexPay avec les moyens proposés au moment de la commande, notamment Mobile Money, Djamo, Wave et Visa.',
      },
      {
        question: 'Quand mon module devient-il accessible ?',
        reponse: 'Le module apparaît dans votre espace apprenant après la confirmation du paiement.',
      },
    ],
  },
  {
    titre: 'Accès aux modules',
    questions: [
      {
        question: 'Combien de temps puis-je accéder à un module acheté ?',
        reponse: 'Vous conservez un accès à vie au module depuis votre espace apprenant.',
      },
      {
        question: 'Puis-je suivre les modules depuis mon téléphone ?',
        reponse:
          'Oui. La plateforme est adaptée aux mobiles et peut également être installée comme une PWA.',
      },
    ],
  },
  {
    titre: 'Coaching collectif',
    questions: [
      {
        question: 'Comment participer à une session ?',
        reponse:
          'Consultez le calendrier depuis votre espace apprenant. Vous devrez avoir accès à un module concerné et compléter votre fiche apprenant avant de rejoindre la session.',
      },
      {
        question: 'Comment suis-je informé d’une modification ou d’une annulation ?',
        reponse:
          'Les informations concernant la création, la modification ou l’annulation d’une session sont envoyées par email et WhatsApp.',
      },
    ],
  },
  {
    titre: 'Certificat et assistance',
    questions: [
      {
        question: 'Quel document est délivré après le module ?',
        reponse: 'Un certificat de participation est disponible après la réalisation du module.',
      },
      {
        question: 'Que faire si une vidéo ne se charge pas ?',
        reponse:
          'Vérifiez votre connexion, actualisez la page et essayez un autre navigateur. Si le problème persiste, contactez l’assistance en précisant le module, l’appareil et le navigateur utilisés.',
      },
    ],
  },
  {
    titre: 'Achat définitif',
    questions: [
      {
        question: 'Puis-je demander le remboursement d’un module ?',
        reponse:
          'Les conditions applicables aux contenus numériques accessibles après paiement sont précisées dans les Conditions générales de vente.',
      },
    ],
  },
]

const sujets = [
  'Paiement',
  'Accès à un module',
  'Session de coaching',
  'Certificat de participation',
  'Problème technique',
  'Autre demande',
]

const formulaire = reactive({
  nom: '',
  email: '',
  whatsapp: '',
  sujet: '',
  reference: '',
  message: '',
})
const etat = ref<'saisie' | 'envoi' | 'envoye' | 'erreur'>('saisie')
/** Erreurs par champ, renvoyées par le serveur (« Adresse email incomplète — vérifiez le format. »). */
const erreurs = ref<Record<string, string>>({})

const CHAMP = 'w-full rounded-[10px] border px-4 py-2.5 text-[15px] focus:outline-none'
function classeChamp(nom: string) {
  return [CHAMP, erreurs.value[nom] ? 'border-erreur bg-[#fdeeee] focus:border-erreur' : 'border-ligne focus:border-social']
}

function verifierEmail() {
  if (formulaire.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formulaire.email)) {
    erreurs.value = { ...erreurs.value, email: 'Adresse email incomplète — vérifiez le format.' }
  } else {
    const { email: _email, ...reste } = erreurs.value
    erreurs.value = reste
  }
}

async function soumettre() {
  verifierEmail()
  if (Object.keys(erreurs.value).length) return
  etat.value = 'envoi'
  try {
    await $fetch('/api/contact', { method: 'POST', body: formulaire })
    etat.value = 'envoye'
  } catch (e) {
    const r = e as { data?: { data?: { erreurs?: Record<string, string> } } }
    if (r.data?.data?.erreurs) {
      erreurs.value = r.data.data.erreurs
      etat.value = 'saisie'
      return
    }
    etat.value = 'erreur'
  }
}

usePageSeo({
  titreAuto: 'Contact et FAQ | E-Masterclass Big Five',
  descriptionAuto:
    'Consultez les réponses aux questions fréquentes ou contactez l’équipe E-Masterclass Big Five. Pour une question rapide, privilégiez WhatsApp au +225 05 75 15 21 44.',
  chemin: '/contact',
})

const mailles = [{ libelle: 'Accueil', chemin: '/' }, { libelle: 'Contact & FAQ' }]
useFilAriane(mailles)

useJsonLd({
  '@type': 'FAQPage',
  mainEntity: groupesFaq.flatMap((g) =>
    g.questions.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.reponse },
    })),
  ),
})
</script>

<template>
  <div>
    <section class="rayures-social border-b border-ligne-claire">
      <div class="conteneur py-12">
        <UiSurtitre ton="social">Contact et assistance</UiSurtitre>
        <h1 class="mt-3 text-[42px] font-medium">Une question ? Parlons-en.</h1>
        <p class="mt-4 max-w-[760px] text-[17px] leading-relaxed text-texte">
          Consultez les réponses aux questions fréquentes ou contactez notre équipe. Pour une
          question rapide, privilégiez WhatsApp. Pour une demande détaillée ou administrative,
          utilisez le formulaire.
        </p>
        <UiBaseButton
          class="mt-6"
          variante="whatsapp"
          taille="lg"
          :href="lienWhatsApp('Bonjour, j’ai une question.')"
        >
          <Icon name="ph:whatsapp-logo-fill" size="20" />
          Discuter sur WhatsApp
        </UiBaseButton>
      </div>
    </section>

    <section class="py-14">
      <div class="conteneur grid gap-12 lg:grid-cols-[1fr_1fr]">
        <!-- Planche A, écran 08 : FAQ à gauche, formulaire à droite. -->
        <div>
          <h2 class="font-title text-[27px] font-light">FAQ générale</h2>
          <div class="mt-6 flex flex-col gap-8">
            <div v-for="groupe in groupesFaq" :key="groupe.titre">
              <h3 class="surtitre text-discret">{{ groupe.titre }}</h3>
              <UiAccordeonFaq class="mt-3" taille="sm" :questions="groupe.questions" :ouvert-par-defaut="-1" />
            </div>
          </div>
        </div>

        <div>
          <h2 class="font-title text-[27px] font-light">Envoyez-nous un message</h2>

          <form v-if="etat !== 'envoye'" class="mt-6 grid gap-5 sm:grid-cols-2" novalidate @submit.prevent="soumettre">
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Nom et prénom *</span>
              <input v-model="formulaire.nom" required :class="classeChamp('nom')" :aria-invalid="!!erreurs.nom">
              <span v-if="erreurs.nom" class="mt-1.5 block text-[12.5px] text-erreur">{{ erreurs.nom }}</span>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Email *</span>
              <input
                v-model="formulaire.email"
                required
                type="email"
                :class="classeChamp('email')"
                :aria-invalid="!!erreurs.email"
                @blur="verifierEmail"
              >
              <span v-if="erreurs.email" class="mt-1.5 block text-[12.5px] text-erreur">{{ erreurs.email }}</span>
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Numéro WhatsApp (facultatif)</span>
              <input v-model="formulaire.whatsapp" type="tel" :class="classeChamp('whatsapp')">
            </label>
            <label class="block">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Sujet *</span>
              <select v-model="formulaire.sujet" required :class="[...classeChamp('sujet'), 'bg-white']" :aria-invalid="!!erreurs.sujet">
                <option value="">Choisir…</option>
                <option v-for="sujet in sujets" :key="sujet">{{ sujet }}</option>
              </select>
              <span v-if="erreurs.sujet" class="mt-1.5 block text-[12.5px] text-erreur">{{ erreurs.sujet }}</span>
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Référence de paiement (facultatif)</span>
              <input v-model="formulaire.reference" placeholder="Ex. FP-2608-14352" :class="classeChamp('reference')">
            </label>
            <label class="block sm:col-span-2">
              <span class="mb-1.5 block text-[13px] font-bold text-texte">Message *</span>
              <textarea v-model="formulaire.message" required rows="6" :class="classeChamp('message')" :aria-invalid="!!erreurs.message" />
              <span v-if="erreurs.message" class="mt-1.5 block text-[12.5px] text-erreur">{{ erreurs.message }}</span>
            </label>

            <div class="sm:col-span-2">
              <UiBaseButton type="submit" class="w-full" taille="lg" :disabled="etat === 'envoi'">
                {{ etat === 'envoi' ? 'Envoi…' : 'Envoyer mon message' }}
              </UiBaseButton>
              <p v-if="etat === 'erreur'" class="mt-3 text-[14px] text-erreur">
                L’envoi a échoué. Réessayez ou passez par WhatsApp.
              </p>
            </div>
          </form>

          <p v-else class="mt-6 rounded-[14px] border border-succes bg-succes-voile p-6 text-[15px] text-succes" role="status">
            ✓ Message envoyé. Vous recevrez une réponse par email sous 24 h ouvrées — un accusé vient
            de vous être adressé.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>
