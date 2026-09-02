<script setup lang="ts">
const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}
const liens = [
  { libelle: 'Tableau de bord', chemin: '/mon-espace', icone: 'ph:squares-four' },
  { libelle: 'Mes modules', chemin: '/mon-espace/modules', icone: 'ph:play-circle' },
  { libelle: 'Mes sessions', chemin: '/mon-espace/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Mes certificats', chemin: '/mon-espace/certificats', icone: 'ph:certificate' },
  { libelle: 'Ma fiche apprenant', chemin: '/mon-espace/profil', icone: 'ph:user' },
]
</script>

<template>
  <div class="flex min-h-screen flex-col bg-white">
    <LayoutTheHeader />
    <div class="conteneur flex-1 py-8 lg:grid lg:grid-cols-[230px_1fr] lg:gap-10">
      <aside class="mb-6 lg:mb-0">
        <p class="surtitre text-discret">Mon espace</p>
        <nav aria-label="Navigation de l’espace apprenant" class="mt-4 flex gap-2 overflow-x-auto lg:flex-col">
          <NuxtLink
            v-for="lien in liens"
            :key="lien.chemin"
            :to="lien.chemin"
            class="flex shrink-0 items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[14px] text-texte hover:bg-fond-clair"
            active-class="bg-social text-white hover:bg-social"
          >
            <Icon :name="lien.icone" size="18" />
            {{ lien.libelle }}
          </NuxtLink>
        </nav>
        <button
          class="mt-6 text-[13px] text-discret hover:text-encre"
          @click="seDeconnecter"
        >
          Se déconnecter
        </button>
      </aside>
      <main>
        <slot />
      </main>
    </div>
    <LayoutTheFooter />
  </div>
</template>
