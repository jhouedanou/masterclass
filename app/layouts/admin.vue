<script setup lang="ts">
const auth = useAuthStore()

const groupes = [
  {
    titre: 'Pilotage',
    liens: [
      { libelle: 'Vue d’ensemble', chemin: '/admin', icone: 'ph:gauge' },
      { libelle: 'Performances', chemin: '/admin/performances', icone: 'ph:chart-line-up' },
      { libelle: 'Revenus', chemin: '/admin/revenus', icone: 'ph:currency-circle-dollar' },
    ],
  },
  {
    titre: 'Contenus',
    liens: [
      { libelle: 'Modules & chapitres', chemin: '/admin/contenus', icone: 'ph:stack' },
      { libelle: 'Blog', chemin: '/admin/blog', icone: 'ph:article' },
      { libelle: 'Référencement (SEO)', chemin: '/admin/referencement', icone: 'ph:magnifying-glass' },
    ],
  },
  {
    titre: 'Communauté',
    liens: [
      { libelle: 'Formateurs', chemin: '/admin/formateurs', icone: 'ph:users-three' },
      { libelle: 'Calendrier des sessions', chemin: '/admin/sessions', icone: 'ph:calendar-dots' },
      { libelle: 'Coaching privé', chemin: '/admin/coaching-prive', icone: 'ph:target' },
      { libelle: 'Apprenants', chemin: '/admin/apprenants', icone: 'ph:student' },
    ],
  },
  {
    titre: 'Administration',
    liens: [
      { libelle: 'Transactions', chemin: '/admin/transactions', icone: 'ph:lock-key', restreint: true },
      { libelle: 'Historique & versions', chemin: '/admin/historique', icone: 'ph:clock-counter-clockwise' },
      { libelle: 'Paramètres', chemin: '/admin/parametres', icone: 'ph:sliders' },
    ],
  },
]
</script>

<template>
  <div class="flex min-h-screen bg-fond">
    <aside class="hidden w-64 shrink-0 flex-col overflow-y-auto bg-encre p-5 text-[#b9b4c4] lg:flex">
      <NuxtLink to="/" class="mb-7 block">
        <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-9 w-auto brightness-0 invert">
      </NuxtLink>

      <nav aria-label="Navigation d’administration" class="flex flex-col gap-5">
        <div v-for="groupe in groupes" :key="groupe.titre">
          <p class="surtitre mb-2 text-[#8f8a9c]">{{ groupe.titre }}</p>
          <div class="flex flex-col gap-0.5">
            <NuxtLink
              v-for="lien in groupe.liens"
              :key="lien.chemin"
              :to="lien.chemin"
              class="flex items-center gap-2 rounded-[10px] px-3 py-2 text-[13.5px] hover:bg-encre-800"
              active-class="bg-social text-white"
            >
              <Icon :name="lien.icone" size="17" />
              <span class="flex-1">{{ lien.libelle }}</span>
              <Icon v-if="lien.restreint && !auth.estAdminSuperieur" name="ph:lock-simple" size="14" />
            </NuxtLink>
          </div>
        </div>
      </nav>

      <div class="mt-auto pt-6 text-[12px] text-[#8f8a9c]">
        <p class="text-white">{{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }}</p>
        <p class="mt-0.5">
          {{ auth.estAdminSuperieur ? 'Admin principal — accès complet' : 'Admin de contenu' }}
        </p>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b border-ligne-claire bg-white px-6">
        <p class="font-title text-[17px] font-light">Back-office</p>
        <button
          class="text-[13px] text-discret hover:text-encre"
          @click="auth.deconnexion().then(() => navigateTo('/'))"
        >
          Se déconnecter
        </button>
      </header>
      <main class="min-w-0 flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
