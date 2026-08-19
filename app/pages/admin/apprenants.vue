<script setup lang="ts">
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Apprenants — administration')
</script>

<template>
  <div>
    <h1 class="text-2xl">Apprenants</h1>
    <p class="mt-2 text-sm text-texte">
      Comptes, achats et attestations délivrées.
    </p>
    <p class="mt-6 rounded-[14px] border border-dashed border-ligne bg-white p-10 text-center text-sm text-discret">
      Écran à construire une fois la base de données branchée : liste des comptes, historique
      d’achat, progression et attestations.
    </p>
  </div>
</template>
