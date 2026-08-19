import { articles, formateurs } from '../../data/db'

export default defineEventHandler((event) => {
  const { categorie } = getQuery(event) as Record<string, string | undefined>
  return articles
    .filter((a) => a.statut === 'publie')
    .filter((a) => !categorie || a.categorie === categorie)
    .sort((a, b) => (b.publieLe ?? '').localeCompare(a.publieLe ?? ''))
    .map((a) => ({ ...a, auteur: formateurs.find((f) => f.id === a.auteurId) ?? null }))
})
