<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()
const ouvert = ref(false)

watch(() => route.fullPath, () => (ouvert.value = false))

const liens = [
  { libelle: 'Accueil', chemin: '/', couleur: '' },
  { libelle: 'Social Média', chemin: '/programmes/social-media', couleur: 'text-social' },
  { libelle: 'Entrepreneurs', chemin: '/programmes/entrepreneurs', couleur: 'text-entrepreneurs' },
  { libelle: 'Formateurs', chemin: '/formateurs', couleur: '' },
  { libelle: 'Blog', chemin: '/blog', couleur: '' },
  { libelle: 'Contact & FAQ', chemin: '/contact', couleur: '' },
]
</script>

<template>
  <header class="sticky top-0 z-40 border-b border-ligne-claire bg-white">
    <div class="conteneur flex items-center justify-between gap-6 py-[18px]">
      <NuxtLink to="/" aria-label="E-Masterclass Big Five — accueil">
        <img
          src="/images/brand/logo.png"
          alt="E-Masterclass Programme | Big Five"
          class="block h-[46px] w-auto lg:h-[58px]"
          width="260"
          height="58"
        >
      </NuxtLink>

      <nav aria-label="Navigation principale" class="hidden items-center gap-8 text-[15px] font-semibold lg:flex">
        <NuxtLink
          v-for="lien in liens"
          :key="lien.chemin"
          :to="lien.chemin"
          class="hover:opacity-70"
          :class="lien.couleur || 'text-encre'"
        >
          {{ lien.libelle }}
        </NuxtLink>
        <NuxtLink
          :to="auth.estConnecte ? '/mon-espace' : '/connexion'"
          class="rounded-full bg-encre px-[22px] py-[11px] text-[14px] font-bold text-white hover:bg-encre-800"
        >
          Mon espace
        </NuxtLink>
      </nav>

      <button
        class="rounded-full p-2 text-encre lg:hidden"
        :aria-expanded="ouvert"
        aria-controls="menu-mobile"
        :aria-label="ouvert ? 'Fermer le menu' : 'Ouvrir le menu'"
        @click="ouvert = !ouvert"
      >
        <Icon :name="ouvert ? 'ph:x' : 'ph:list'" size="26" />
      </button>
    </div>

    <div v-if="ouvert" id="menu-mobile" class="border-t border-ligne-claire bg-white lg:hidden">
      <nav aria-label="Navigation mobile" class="conteneur flex flex-col py-2">
        <NuxtLink
          v-for="lien in liens"
          :key="lien.chemin"
          :to="lien.chemin"
          class="border-b border-ligne-claire py-3.5 text-[15px] font-semibold"
          :class="lien.couleur || 'text-encre'"
        >
          {{ lien.libelle }}
        </NuxtLink>
        <NuxtLink
          :to="auth.estConnecte ? '/mon-espace' : '/connexion'"
          class="mt-4 mb-3 rounded-full bg-encre px-[22px] py-3 text-center text-[14px] font-bold text-white"
        >
          Mon espace
        </NuxtLink>
      </nav>
    </div>
  </header>
</template>
