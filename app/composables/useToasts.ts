/**
 * Messages brefs, en bas d'écran.
 *
 * Le back-office annonçait ses succès dans un bandeau posé tout en haut de la
 * page. Sur l'écran d'un module, où la liste des chapitres est à mi-hauteur, on
 * dupliquait un chapitre et rien ne bougeait à l'endroit où l'on regardait : le
 * bandeau confirmait l'action huit cents pixels plus haut.
 *
 * L'état est volontairement partagé — `useState` plutôt qu'un `ref` de module —
 * pour que n'importe quel composant puisse annoncer quelque chose sans que le
 * rendu serveur ne mélange les files de deux visiteurs.
 */

export interface Toast {
  id: number
  texte: string
  ton: 'succes' | 'erreur'
}

/** Assez pour lire une phrase courte, assez peu pour ne pas encombrer. */
const DUREE_MS = 4000

let compteur = 0

export function useToasts() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function retirer(id: number) {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }

  function annoncer(texte: string, ton: Toast['ton'] = 'succes') {
    const id = ++compteur
    toasts.value = [...toasts.value, { id, texte, ton }]
    // Pas de minuterie au rendu serveur : elle n'y aurait rien à effacer, et
    // laisserait un `setTimeout` en suspens à chaque requête.
    if (import.meta.client) setTimeout(() => retirer(id), DUREE_MS)
    return id
  }

  return { toasts, annoncer, retirer }
}
