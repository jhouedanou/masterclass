<template>
  <div class="grid min-h-screen lg:grid-cols-2">
    <div class="flex flex-col justify-center px-6 py-12 sm:px-12">
      <NuxtLink to="/" class="mb-10 inline-block" aria-label="E-Masterclass Big Five — accueil">
        <img
          src="/images/brand/logo.png"
          alt="E-Masterclass Programme | Big Five"
          class="block h-12 w-auto"
          width="220"
          height="48"
        >
      </NuxtLink>
      <div class="w-full max-w-md">
        <slot />
      </div>
    </div>
    <div class="rayures-visuel-social hidden flex-col justify-end p-12 lg:flex">
      <p class="max-w-md font-title text-[34px] leading-tight font-light text-encre">
        Montez en compétences.
      </p>
      <p class="mt-4 max-w-md text-[15px] text-texte">
        Des modules de 60 minutes, animés par des professionnels de terrain. 10 000 FCFA TTC par
        module, accès à vie.
      </p>
    </div>
  </div>
</template>
