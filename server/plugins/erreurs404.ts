import { enregistrerErreur404 } from '../database/administration'

/**
 * Journalise les chemins publics qui répondent 404, pour le bloc « État
 * technique » de l'écran 23.
 *
 * Le comptage ne peut pas vivre dans `server/middleware/redirections.ts` :
 * celui-ci s'exécute avant le routage et ignore si le chemin aboutira. On
 * s'accroche donc à la réponse, une fois le statut connu.
 *
 * Sont écartés : les chemins d'API et de fichiers internes, qui ne disent rien
 * du référencement, et tout ce qui n'est pas une lecture de page.
 */
const IGNORES = /^\/(api|_nuxt|_ipx|__nuxt|_payload|sw\.js|manifest|favicon|images|medias|robots\.txt)/

export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (reponse, { event }) => {
    if (reponse.statusCode !== 404) return
    if (event.method !== 'GET') return

    const chemin = event.path.split('?')[0] ?? ''
    if (!chemin || chemin.length > 400 || IGNORES.test(chemin)) return

    // Sans `await` : la page d'erreur ne doit pas attendre l'écriture.
    void enregistrerErreur404(chemin)
  })
})
