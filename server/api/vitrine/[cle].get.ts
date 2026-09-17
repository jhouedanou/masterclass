import { trouverBlocVitrine } from '../../database/backoffice'
import { assainirContenuCms } from '../../utils/texteRiche'

/**
 * Contenu public d'un bloc du CMS (planche C, écran 15).
 *
 * Le back-office éditait ces blocs depuis le début, mais aucune route ne les
 * servait : la bannière d'accueil et les pages légales lisaient des valeurs
 * écrites dans le code. Cette route est la moitié manquante.
 *
 * Elle ne rend que ce qui est publié, et respecte la fenêtre `publie_du` /
 * `publie_au` — seul le bandeau d'annonce s'en sert, mais la règle vaut pour
 * tous. Un bloc en brouillon ou hors fenêtre rend un contenu vide plutôt
 * qu'une erreur : la page publique retombe alors sur ses valeurs par défaut.
 */
const CLES = ['banniere', 'accueil', 'programmes', 'annonce', 'legales'] as const

export default defineEventHandler(async (event) => {
  const cle = getRouterParam(event, 'cle') ?? ''
  if (!CLES.includes(cle as (typeof CLES)[number])) {
    throw createError({ statusCode: 404, statusMessage: 'Bloc introuvable' })
  }

  const bloc = await trouverBlocVitrine(cle)
  if (!bloc || bloc.statut !== 'publie') return { cle, contenu: {} }

  // Bornes inclusives, comparées en date seule : `publie_du` et `publie_au`
  // sont des `date`, pas des horodatages.
  const aujourdhui = new Date().toISOString().slice(0, 10)
  if (bloc.publieDu && aujourdhui < bloc.publieDu) return { cle, contenu: {} }
  if (bloc.publieAu && aujourdhui > bloc.publieAu) return { cle, contenu: {} }

  return { cle, contenu: assainirContenuCms(bloc.contenu) as Record<string, unknown> }
})
