/**
 * Saisie d'un numéro WhatsApp.
 *
 * Le numéro est conservé au format E.164 (`+` puis chiffres, sans espace) :
 * c'est ce qu'attendent `wa.me` et les passerelles de notification. Le masque
 * n'existe que pour la saisie — il découpe le numéro national en groupes
 * lisibles et rappelle un exemple, pays par pays.
 *
 * Distinction voulue entre les deux moitiés de ce fichier :
 *
 * - `PAYS_TELEPHONE` sert **l'affichage**. Les longueurs et les groupes qui y
 *   figurent changent avec les plans de numérotation nationaux — le Bénin est
 *   passé à dix chiffres, la Côte d'Ivoire l'avait fait avant lui. Une table
 *   qui prend du retard doit gêner la mise en forme, jamais bloquer.
 * - `validerTelephone` sert **le contrôle**, côté serveur comme côté
 *   navigateur, et ne connaît que l'enveloppe E.164 : de huit à quinze
 *   chiffres. Elle ne se périme pas. Sans cette séparation, un compte déjà
 *   enregistré sous un ancien format se verrait refuser l'enregistrement d'une
 *   fiche qu'il n'a même pas modifiée.
 */

export interface PaysTelephone {
  /** Code ISO 3166-1 alpha-2, clé stable du choix dans le menu. */
  code: string
  nom: string
  /** Indicatif international, sans le `+`. */
  indicatif: string
  /** Découpage du numéro national, pour l'affichage uniquement. */
  groupes: number[]
  /** Numéro national d'exemple, déjà découpé. */
  exemple: string
}

/**
 * Pays proposés : ceux du choix à l'inscription (planche A, écran 04) et leurs
 * voisins immédiats, l'audience de la plateforme étant ouest-africaine. Tout
 * autre pays passe par la saisie internationale libre.
 */
export const PAYS_TELEPHONE: PaysTelephone[] = [
  { code: 'CI', nom: 'Côte d’Ivoire', indicatif: '225', groupes: [2, 2, 2, 2, 2], exemple: '07 09 88 12 34' },
  { code: 'BJ', nom: 'Bénin', indicatif: '229', groupes: [2, 2, 2, 2, 2], exemple: '01 96 12 34 56' },
  { code: 'BF', nom: 'Burkina Faso', indicatif: '226', groupes: [2, 2, 2, 2], exemple: '70 12 34 56' },
  { code: 'SN', nom: 'Sénégal', indicatif: '221', groupes: [2, 3, 2, 2], exemple: '77 123 45 67' },
  { code: 'TG', nom: 'Togo', indicatif: '228', groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
  { code: 'ML', nom: 'Mali', indicatif: '223', groupes: [2, 2, 2, 2], exemple: '65 12 34 56' },
  { code: 'NE', nom: 'Niger', indicatif: '227', groupes: [2, 2, 2, 2], exemple: '90 12 34 56' },
  { code: 'GN', nom: 'Guinée', indicatif: '224', groupes: [3, 2, 2, 2], exemple: '620 12 34 56' },
  { code: 'CM', nom: 'Cameroun', indicatif: '237', groupes: [1, 2, 2, 2, 2], exemple: '6 71 23 45 67' },
  { code: 'GH', nom: 'Ghana', indicatif: '233', groupes: [2, 3, 4], exemple: '24 123 4567' },
  { code: 'NG', nom: 'Nigeria', indicatif: '234', groupes: [3, 3, 4], exemple: '802 123 4567' },
  { code: 'FR', nom: 'France', indicatif: '33', groupes: [1, 2, 2, 2, 2], exemple: '6 12 34 56 78' },
  { code: 'BE', nom: 'Belgique', indicatif: '32', groupes: [3, 2, 2, 2], exemple: '470 12 34 56' },
  { code: 'CA', nom: 'Canada', indicatif: '1', groupes: [3, 3, 4], exemple: '514 123 4567' },
]

/** Valeur du menu quand le pays n'est pas dans la liste : saisie libre. */
export const PAYS_AUTRE = 'AUTRE'

export function trouverPaysTelephone(code: string): PaysTelephone | undefined {
  return PAYS_TELEPHONE.find((p) => p.code === code)
}

/**
 * Rapproche le `pays` du compte — texte libre, saisi à l'inscription — d'une
 * entrée de la table. La comparaison ignore la casse, les accents et les
 * apostrophes, faute de quoi « Côte d’Ivoire » (apostrophe typographique du
 * menu d'achat) et « Cote d'Ivoire » (saisie au clavier) ne se
 * reconnaîtraient pas. Sans correspondance, on ne devine pas un indicatif :
 * on renvoie la saisie libre.
 */
export function paysDepuisLibelle(libelle: string | null | undefined): string {
  const normaliser = (v: string) =>
    v
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/['’]/g, '')
      .toLowerCase()
      .trim()
  if (!libelle?.trim()) return PAYS_AUTRE
  const cible = normaliser(libelle)
  return PAYS_TELEPHONE.find((p) => normaliser(p.nom) === cible)?.code ?? PAYS_AUTRE
}

/**
 * Enveloppe E.164 : `+` puis 8 à 15 chiffres, le premier non nul.
 *
 * Volontairement large. Le contrôle sert à écarter une saisie qui n'est pas un
 * numéro, pas à arbitrer un plan de numérotation national.
 */
export function validerTelephone(valeur: string | null | undefined): boolean {
  return /^\+[1-9]\d{7,14}$/.test((valeur ?? '').trim())
}

/** Ne garde que les chiffres d'une saisie. */
export function chiffres(valeur: string): string {
  return valeur.replace(/\D/g, '')
}

/** Découpe un numéro national selon les groupes du pays, sans jamais tronquer. */
export function formaterNational(valeur: string, pays: PaysTelephone | undefined): string {
  const brut = chiffres(valeur)
  if (!pays || !brut) return brut
  const morceaux: string[] = []
  let reste = brut
  for (const taille of pays.groupes) {
    if (!reste) break
    morceaux.push(reste.slice(0, taille))
    reste = reste.slice(taille)
  }
  // Un numéro plus long que le gabarit garde sa fin plutôt que de la perdre :
  // le masque décrit le cas courant, il n'arbitre pas.
  if (reste) morceaux.push(reste)
  return morceaux.join(' ')
}

/** Assemble la valeur E.164 enregistrée. */
export function versE164(pays: PaysTelephone | undefined, national: string): string {
  const brut = chiffres(national)
  if (!brut) return ''
  if (!pays) return `+${brut}`
  // Le zéro de la forme nationale ne se porte pas à l'international.
  return `+${pays.indicatif}${brut.replace(/^0+/, '')}`
}

/**
 * Sépare un numéro enregistré en pays et partie nationale, pour réafficher une
 * valeur existante dans le champ.
 *
 * L'indicatif le plus long l'emporte : `+225` doit être reconnu avant `+22`,
 * qui n'existe pas, mais le principe protège des préfixes emboîtés. Un numéro
 * dont l'indicatif n'est pas dans la table revient en saisie libre avec ses
 * chiffres intacts — jamais vidé.
 */
export function separerTelephone(valeur: string | null | undefined): { pays: string; national: string } {
  const brut = chiffres(valeur ?? '')
  if (!brut) return { pays: PAYS_AUTRE, national: '' }
  const candidats = [...PAYS_TELEPHONE].sort((a, b) => b.indicatif.length - a.indicatif.length)
  const pays = candidats.find((p) => brut.startsWith(p.indicatif))
  if (!pays) return { pays: PAYS_AUTRE, national: brut }
  return { pays: pays.code, national: brut.slice(pays.indicatif.length) }
}
