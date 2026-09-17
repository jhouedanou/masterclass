/**
 * Compteurs substitués dans les textes éditoriaux.
 *
 * « Choisissez parmi 9 modules » a été écrit en dur dans `description_hero`, et
 * la phrase a menti dès qu'un module a changé de programme ou est repassé en
 * brouillon. Le texte reste éditable — c'est du contenu — mais le nombre, lui,
 * se calcule à l'affichage.
 *
 * Le jeton porte le nom au singulier ou au pluriel avec le nombre, sinon une
 * phrase tomberait sur « parmi 1 modules ».
 */

/** Jeton à écrire dans le texte, à la place du nombre et du mot « modules ». */
export const JETON_MODULES = '{modules}'

/** `Choisissez parmi {modules} de 60 minutes` → `Choisissez parmi 8 modules …` */
export function compterModules(nombre: number): string {
  return `${nombre} module${nombre > 1 ? 's' : ''}`
}

/**
 * Remplace le jeton par le décompte réel. Un texte sans jeton ressort tel quel :
 * les contenus antérieurs au jeton restent affichables.
 */
export function interpolerCompteurs(texte: string, nombreDeModules: number): string {
  return texte.replaceAll(JETON_MODULES, compterModules(nombreDeModules))
}
