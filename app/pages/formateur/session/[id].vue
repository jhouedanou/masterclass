<script setup lang="ts">
/**
 * Salle du formateur (planche D, écran 05). Même écran que côté apprenant : c'est
 * `/api/mon-espace/session/[id]` qui accorde le rôle `hote` au formateur propriétaire,
 * et `/api/zoom/signature` qui lui signe un jeton d'hôte avec le lien de secours.
 */
definePageMeta({ layout: false, middleware: 'formateur' })

const route = useRoute()
</script>

<template>
  <EspaceSalleSession :id="String(route.params.id)" espace="formateur" />
</template>
