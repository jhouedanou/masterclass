<script setup lang="ts">
const auth = useAuthStore()
const liens = [
  { libelle: 'Vue d’ensemble', chemin: '/admin', icone: 'ph:gauge' },
  { libelle: 'Contenus', chemin: '/admin/modules', icone: 'ph:stack' },
  { libelle: 'Formateurs', chemin: '/admin/formateurs', icone: 'ph:users-three' },
  { libelle: 'Sessions', chemin: '/admin/sessions', icone: 'ph:calendar-dots' },
  { libelle: 'Apprenants', chemin: '/admin/apprenants', icone: 'ph:student' },
  { libelle: 'Blog', chemin: '/admin/blog', icone: 'ph:article' },
  { libelle: 'Référencement', chemin: '/admin/referencement', icone: 'ph:magnifying-glass' },
]
</script>

<template>
  <div class="flex min-h-screen bg-fond">
    <aside class="hidden w-60 shrink-0 flex-col bg-encre p-5 text-[#b9b4c4] lg:flex">
      <NuxtLink to="/" class="mb-8 block">
        <img src="/images/brand/logo.png" alt="E-Masterclass Big Five" class="h-9 w-auto brightness-0 invert">
      </NuxtLink>
      <p class="surtitre mb-3 text-[#8f8a9c]">Administration</p>
      <nav aria-label="Navigation d’administration" class="flex flex-col gap-1">
        <NuxtLink
          v-for="lien in liens"
          :key="lien.chemin"
          :to="lien.chemin"
          class="flex items-center gap-2 rounded-[10px] px-3.5 py-2.5 text-[14px] hover:bg-encre-800"
          active-class="bg-social text-white"
        >
          <Icon :name="lien.icone" size="18" />
          {{ lien.libelle }}
        </NuxtLink>
      </nav>
      <div class="mt-auto pt-6 text-[12px] text-[#8f8a9c]">
        <p>{{ auth.utilisateur?.prenom }} {{ auth.utilisateur?.nom }}</p>
        <p class="mt-1">{{ auth.utilisateur?.role }}</p>
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
