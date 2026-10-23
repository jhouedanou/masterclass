/**
 * `X-Powered-By: Nuxt` retiré de toutes les réponses.
 *
 * Le moteur de rendu le pose sur chaque page et chaque charge utile : il
 * n'apprend rien au navigateur, et annonce à un balayage automatique quel
 * cadriciel viser. Deux points d'accroche, parce que le rendu en flux pose
 * l'en-tête directement sur la réponse au lieu de le rendre avec elle.
 */
export default defineNitroPlugin((nitro) => {
  nitro.hooks.hook('render:response', (reponse) => {
    if (reponse.headers) delete reponse.headers['x-powered-by']
  })
  nitro.hooks.hook('beforeResponse', (event) => {
    removeResponseHeader(event, 'x-powered-by')
  })
})
