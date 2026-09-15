import type { Persona, ProgrammeSlug, Utilisateur } from '#shared/types'

/**
 * Complétion du profil apprenant (planche B) : le bandeau « Votre profil
 * apprenant est à 60 % » et les verrous « complétez-le à 100 % pour débloquer
 * le bouton Rejoindre la session » reposent sur ce calcul, côté serveur comme
 * côté navigateur.
 *
 * Champs communs (écran 04, « Vous, en quelques repères ») plus le bloc propre
 * au programme du premier module possédé : Entrepreneur ou Social Média.
 * Sans module encore acheté, seuls les champs communs comptent.
 */

export const NIVEAUX_EXPERIENCE = [
  { valeur: 'debutant', libelle: 'Débutant — je commence' },
  { valeur: 'intermediaire', libelle: 'Intermédiaire — je pratique déjà' },
  { valeur: 'confirme', libelle: 'Confirmé — je veux aller plus loin' },
] as const

export interface ChampProfil {
  cle: keyof Persona | 'prenom' | 'nom' | 'whatsapp' | 'photo'
  libelle: string
}

export const CHAMPS_COMMUNS: ChampProfil[] = [
  { cle: 'prenom', libelle: 'Prénom' },
  { cle: 'nom', libelle: 'Nom' },
  { cle: 'whatsapp', libelle: 'Numéro WhatsApp' },
  // La photo compte comme les autres, sans exception : un compte déjà complet
  // qui n'en a pas redescend sous les 100 % et reperd l'accès aux coaching
  // sessions jusqu'à ce qu'il en dépose une. Règle voulue, uniforme.
  { cle: 'photo', libelle: 'Photo de profil' },
  { cle: 'age', libelle: 'Âge' },
  { cle: 'ville', libelle: 'Ville' },
  { cle: 'secteur', libelle: 'Secteur d’activité' },
  { cle: 'niveau', libelle: 'Niveau d’expérience' },
  { cle: 'objectif', libelle: 'Objectif principal' },
]

export const CHAMPS_ENTREPRENEUR: ChampProfil[] = [
  { cle: 'entreprise', libelle: 'Nom de l’entreprise' },
  { cle: 'stade', libelle: 'Stade de développement' },
  { cle: 'tailleEquipe', libelle: 'Taille de l’équipe' },
  { cle: 'canaux', libelle: 'Canaux de vente' },
  { cle: 'presenceEnLigne', libelle: 'Présence en ligne' },
  { cle: 'budget', libelle: 'Budget communication mensuel' },
  { cle: 'defi', libelle: 'Votre principal défi business aujourd’hui' },
]

export const CHAMPS_SOCIAL_MEDIA: ChampProfil[] = [
  { cle: 'reseaux', libelle: 'Réseaux gérés' },
  { cle: 'audience', libelle: 'Taille d’audience' },
  { cle: 'outils', libelle: 'Outils utilisés' },
  { cle: 'clients', libelle: 'Clients / marques accompagnés' },
]

export function champsProfil(programme: ProgrammeSlug | null): ChampProfil[] {
  if (programme === 'entrepreneurs') return [...CHAMPS_COMMUNS, ...CHAMPS_ENTREPRENEUR]
  if (programme === 'social-media') return [...CHAMPS_COMMUNS, ...CHAMPS_SOCIAL_MEDIA]
  return CHAMPS_COMMUNS
}

function renseigne(valeur: unknown): boolean {
  if (valeur === null || valeur === undefined) return false
  if (typeof valeur === 'number') return Number.isFinite(valeur) && valeur > 0
  return String(valeur).trim().length > 0
}

export function calculerCompletionProfil(
  utilisateur: Pick<Utilisateur, 'prenom' | 'nom' | 'whatsapp' | 'photo'>,
  persona: Persona | null | undefined,
  programme: ProgrammeSlug | null,
): { pourcentage: number; champsManquants: ChampProfil[] } {
  const champs = champsProfil(programme)
  const source: Record<string, unknown> = { ...(persona ?? {}), ...utilisateur }
  const champsManquants = champs.filter((c) => !renseigne(source[c.cle]))
  const pourcentage = Math.round(((champs.length - champsManquants.length) / champs.length) * 100)
  return { pourcentage, champsManquants }
}
