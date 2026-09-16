import { trouverBlocVitrine } from '../../database/backoffice'
import { assainirHtml } from '../../utils/texteRiche'

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

/** Champs dont la valeur est du HTML saisi au back-office. */
const CHAMPS_HTML = ['corps']

function assainirContenu(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(assainirContenu)
  if (valeur && typeof valeur === 'object') {
    return Object.fromEntries(
      Object.entries(valeur as Record<string, unknown>).map(([cle, v]) => [
        cle,
        CHAMPS_HTML.includes(cle) && typeof v === 'string' ? assainirHtml(v) : assainirContenu(v),
      ]),
    )
  }
  return valeur
}

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

  return { cle, contenu: assainirContenu(bloc.contenu) as Record<string, unknown> }
})
