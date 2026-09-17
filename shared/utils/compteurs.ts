/**
 * Décomptes affichés : « 8 modules », « 3 thématiques », « 25 places ».
 *
 * Ces nombres étaient écrits en dur dans les textes de la vitrine, et mentaient
 * dès qu'un module changeait de programme ou repassait en brouillon. Ailleurs le
 * nombre était calculé mais le pluriel recopié à côté, d'où les « 1 modules ».
 *
 * Deux usages, un seul endroit :
 *
 *   compterModules(8)                          → « 8 modules »
 *   interpolerCompteurs(texte, { modules: 8 }) → le jeton du texte est remplacé
 *
 * Le jeton porte le nombre *et* le nom, sinon une phrase tombe sur « parmi
 * 1 modules » : c'est l'accord qui doit voyager avec le chiffre, pas seulement
 * le chiffre.
 *
 * Même intention que `shared/utils/coaching.ts` pour la durée et les places.
 */

/** Accord français : 0 et 1 au singulier, au-delà le pluriel. */
export function compter(nombre: number, singulier: string, pluriel = `${singulier}s`): string {
  return `${nombre} ${nombre > 1 ? pluriel : singulier}`
}

export const compterModules = (nombre: number) => compter(nombre, 'module')
export const compterThematiques = (nombre: number) => compter(nombre, 'thématique')
export const compterChapitres = (nombre: number) => compter(nombre, 'chapitre')
export const compterFormateurs = (nombre: number) => compter(nombre, 'formateur')
export const compterProgrammes = (nombre: number) => compter(nombre, 'programme')
export const compterPlaces = (nombre: number) => compter(nombre, 'place')

/** Décomptes qu'un texte éditorial peut réclamer, par jeton. */
export interface Compteurs {
  modules?: number
  thematiques?: number
  chapitres?: number
  formateurs?: number
  programmes?: number
}

const JETONS: { [K in keyof Compteurs]-?: (nombre: number) => string } = {
  modules: compterModules,
  thematiques: compterThematiques,
  chapitres: compterChapitres,
  formateurs: compterFormateurs,
  programmes: compterProgrammes,
}

/** Le jeton des modules, exporté pour les tests et la documentation du CMS. */
export const JETON_MODULES = '{modules}'

/**
 * Remplace `{modules}`, `{thematiques}`… par le décompte accordé.
 *
 * Un texte sans jeton ressort tel quel, et un jeton dont le décompte n'est pas
 * fourni reste en place : un contenu rédigé avant cette mécanique s'affiche
 * toujours, et une faute de frappe dans un jeton se voit à l'écran plutôt que
 * de vider la phrase.
 */
export function interpolerCompteurs(texte: string, compteurs: Compteurs): string {
  let resultat = texte
  for (const [nom, formater] of Object.entries(JETONS) as [keyof Compteurs, (n: number) => string][]) {
    const nombre = compteurs[nom]
    if (nombre !== undefined) resultat = resultat.replaceAll(`{${nom}}`, formater(nombre))
  }
  return resultat
}
