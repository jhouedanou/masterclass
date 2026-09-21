<script setup lang="ts">
/**
 * Vue d'ensemble du fonds vidéo.
 *
 * Elle répond à une question que l'administration ne savait pas poser : qu'y
 * a-t-il en ligne, et qui s'en sert ? Jusqu'ici une vidéo n'existait que dans
 * le chapitre qui la portait, et rien ne distinguait un fichier déposé deux
 * fois d'un fichier déposé une seule.
 */
definePageMeta({ layout: 'admin', middleware: 'admin' })
usePagePrivee('Médiathèque vidéo — administration')
</script>

<template>
  <div>
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <h1 class="font-title text-[24px] font-light">Médiathèque vidéo</h1>
      <p class="text-[12.5px] text-discret">
        Les fichiers déposés depuis les chapitres. Une même vidéo peut en servir plusieurs.
      </p>
    </div>

    <div class="mt-5 rounded-[14px] border border-ligne-douce bg-white p-5">
      <AdminMediatheque />
    </div>
  </div>
</template>
