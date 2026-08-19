<template>
  <footer class="border-t border-ligne-douce bg-fond-clair pt-12 pb-7">
    <div class="conteneur grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.3fr_1fr_1fr_1fr]">
      <div>
        <img
          src="/images/brand/logo.png"
          alt="E-Masterclass | Big Five"
          class="mb-3.5 block h-9 w-auto"
          width="160"
          height="36"
        >
        <p class="text-[13.5px] leading-relaxed text-discret">
          E-Masterclass Big Five propose des modules de formation en ligne conçus pour aider les
          professionnels du Social Media et les entrepreneurs d’Afrique francophone à renforcer des
          compétences précises.
        </p>
      </div>

      <nav aria-label="Programmes" class="flex flex-col gap-2.5 text-[14px]">
        <p class="mb-1 font-title text-[15px] font-light text-encre">Programmes</p>
        <NuxtLink to="/programmes/social-media">Social Média</NuxtLink>
        <NuxtLink to="/programmes/entrepreneurs">Entrepreneurs</NuxtLink>
        <NuxtLink to="/sessions">Calendrier des sessions</NuxtLink>
      </nav>

      <nav aria-label="Plateforme" class="flex flex-col gap-2.5 text-[14px]">
        <p class="mb-1 font-title text-[15px] font-light text-encre">Plateforme</p>
        <NuxtLink to="/formateurs">Formateurs</NuxtLink>
        <NuxtLink to="/devenir-formateur">Devenir formateur</NuxtLink>
        <NuxtLink to="/blog">Blog</NuxtLink>
        <NuxtLink to="/contact">Contact &amp; FAQ</NuxtLink>
        <NuxtLink to="/mon-espace">Mon espace</NuxtLink>
      </nav>

      <nav aria-label="Informations légales" class="flex flex-col gap-2.5 text-[14px]">
        <p class="mb-1 font-title text-[15px] font-light text-encre">Légal</p>
        <NuxtLink to="/mentions-legales">Mentions légales</NuxtLink>
        <NuxtLink to="/cgu">CGU</NuxtLink>
        <NuxtLink to="/cgv">CGV</NuxtLink>
        <NuxtLink to="/confidentialite">Confidentialité</NuxtLink>
        <NuxtLink to="/cookies">Cookies</NuxtLink>
      </nav>
    </div>

    <div class="conteneur mt-9 border-t border-ligne-douce pt-4.5">
      <p class="text-[12.5px] text-discret">
        © {{ new Date().getFullYear() }} BigFiveAbidjan SARL — RCCM CI-ABJ-2017-B-27600 — Abidjan,
        Côte d’Ivoire
      </p>
    </div>
  </footer>
</template>
