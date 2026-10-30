/**
 * La fonctionnalité Live Sessions est-elle visible pour ce visiteur (CDC
 * 10.G) ? Le menu, le pied de page, l'accueil et l'espace formateur s'y
 * règlent. Une seule requête par page : la clé partage le résultat.
 */
export function useLiveVisible() {
  const { data } = useFetch<{ visible: boolean }>('/api/live-sessions/visibilite', {
    key: 'live-visible',
    default: () => ({ visible: false }),
  })
  return computed(() => data.value?.visible === true)
}
