/**
 * Forme de la fiche apprenant servie par `/api/formateur/apprenant/[id]`
 * (planche D, écran 04). Partagée par le composant `FormateurFicheApprenant`
 * et les deux écrans qui l'affichent.
 */
export interface FicheApprenant {
  prenom: string
  initiales: string
  nomAffiche: string
  ville: string
  pays: string
  nbModules: number
  persona: {
    secteur: string
    experience: string
    reseaux: string
    objectif: string
    entreprise: string
    audience: string
  } | null
  progressions: {
    moduleId: string
    titre: string
    chapitresVus: number
    chapitres: number
    pourcentage: number
  }[]
  sujet: { session: string; preoccupation: string; attente: string; lu: boolean } | null
  coachingPriveEnCours: number
  coachingPriveRealise: number
}
