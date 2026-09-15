import sanitizeHtml from 'sanitize-html'

/**
 * Assainissement du HTML produit par l'éditeur du back-office.
 *
 * Stocker du HTML rend l'écriture confortable mais rouvre la porte au XSS
 * stocké : ces champs s'affichent en `v-html` sur des pages publiques. La
 * protection tient donc **entièrement** à ce fichier, appelé à l'écriture et
 * nulle part ailleurs — un contenu enregistré est propre, on ne le réexamine
 * pas à chaque affichage.
 *
 * L'assainissement passe par `sanitize-html`, qui analyse vraiment le
 * balisage. Un filtrage maison par expressions régulières tomberait sur les
 * mêmes pièges que tous ceux qui l'ont tenté : attributs sans guillemets,
 * balises mal fermées, entités encodées, `javascript:` déguisé.
 *
 * La liste est blanche et courte : ce que l'éditeur sait produire, rien de
 * plus. Tout le reste est retiré — `script` et `style` disparaissent avec leur
 * contenu, les autres balises inconnues laissent leur texte.
 */

/** Balises autorisées : la mise en forme de l'éditeur, pas davantage. */
const BALISES = ['p', 'br', 'strong', 'em', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'blockquote']

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: BALISES,
  allowedAttributes: {
    // Seuls les liens portent un attribut, et seulement leur cible.
    a: ['href', 'target', 'rel'],
  },
  // `javascript:` et `data:` sont écartés : un lien ne doit pas exécuter.
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesAppliedToAttributes: ['href'],
  // Retire le contenu de ces balises, et pas seulement leurs chevrons.
  nonTextTags: ['script', 'style', 'textarea', 'option', 'noscript'],
  transformTags: {
    // Un lien sortant ne doit pas donner la main sur l'onglet d'origine
    // (`window.opener`), ni faire fuiter le référent.
    a: (nomBalise, attributs) => ({
      tagName: nomBalise,
      attribs: {
        ...attributs,
        ...(attributs.target === '_blank' ? { rel: 'noopener noreferrer' } : {}),
      },
    }),
    // L'éditeur des navigateurs produit encore `b` et `i` : on les ramène aux
    // balises porteuses de sens plutôt que de les jeter.
    b: 'strong',
    i: 'em',
    div: 'p',
  },
}

/**
 * Renvoie un HTML sûr, ou une chaîne vide si le contenu ne portait que du
 * balisage sans texte — l'éditeur laisse volontiers un `<p><br></p>` derrière
 * lui, qu'on ne veut pas prendre pour un champ renseigné.
 */
export function assainirHtml(valeur: string | null | undefined): string {
  if (!valeur) return ''
  const propre = sanitizeHtml(valeur, OPTIONS).trim()
  return propre.replace(/<[^>]+>|&nbsp;|\s/g, '') ? propre : ''
}
