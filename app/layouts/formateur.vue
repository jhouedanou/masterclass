<script setup lang="ts">
const auth = useAuthStore()

async function seDeconnecter() {
  await auth.deconnexion()
  await navigateTo('/')
}
const liens = [
  { libelle: 'Vue d’ensemble', chemin: '/formateur', icone: 'ph:gauge' },
  { libelle: 'Mes modules', chemin: '/formateur/modules', icone: 'ph:stack' },
  { libelle: 'Coaching collectif', chemin: '/formateur/sessions', icone: 'ph:users-three' },
  { libelle: 'Coaching privé', chemin: '/formateur/coaching-prive', icone: 'ph:target' },
  { libelle: 'Revenus', chemin: '/formateur/revenus', icone: 'ph:currency-circle-dollar' },
  { libelle: 'Mon profil', chemin: '/formateur/profil', icone: 'ph:user' },
]
</script>

<template>
  <div class="flex min-h-screen bg-fond">
    <aside class="sur-sombre hidden w-60 shrink-0 flex-col bg-encre p-5 text-[#b9b4c4] lg:flex">
      <NuxtLink to="/" class="mb-8 block">
        <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-9 w-auto brightness-0 invert">
      </NuxtLink>
      <p class="surtitre mb-3 text-[#8f8a9c]">Espace formateur</p>
      <nav aria-label="Navigation de l’espace formateur" class="flex flex-col gap-1">
        <NuxtLink
          v-for="lien in liens"
          :key="lien.chemin"
          :to="lien.chemin"
          class="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[14px] text-[#b9b4c4] hover:bg-encre-800 hover:text-white"
          active-class="bg-social text-white"
        >
          <Icon :name="lien.icone" size="18" />
          {{ lien.libelle }}
        </NuxtLink>
      </nav>
      <div class="mt-auto pt-6 text-[12px] text-[#8f8a9c]">
        <p>{{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }}</p>
        <button class="mt-2 underline" @click="seDeconnecter">
          Déconnexion
        </button>
      </div>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header class="flex h-14 items-center justify-between border-b border-ligne-claire bg-white px-6">
        <p class="font-title text-[17px] font-light">Espace formateur</p>
        <span class="grid size-9 place-items-center rounded-full bg-social text-[13px] font-bold text-white">
          {{ auth.utilisateur?.prenom?.[0] }}{{ auth.utilisateur?.nom?.[0] }}
        </span>
      </header>
      <main class="min-w-0 flex-1 p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
