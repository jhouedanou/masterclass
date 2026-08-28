export interface Consentement {
  /** Connexion, sécurité, paiement — toujours actifs, non désactivables. */
  essentiels: true
  mesure: boolean
  marketing: boolean
  /** Horodatage du choix : sa date fait foi en cas de contrôle. */
  decideLe: string
}

const CLE = 'emc_consentement'

/** Le consentement se redemande au bout d'un an, comme le veut l'usage. */
const VALIDITE_JOURS = 365

/**
 * Consentement aux cookies (planche A, écran 10).
 *
 * Le choix vit dans le stockage local du navigateur : il n'a pas à voyager
 * jusqu'au serveur, et le site doit fonctionner à l'identique qu'il soit
 * accordé ou refusé. Rien n'est chargé tant que le visiteur n'a pas tranché.
 */
export function useConsentement() {
  const consentement = useState<Consentement | null>('consentement', () => null)
  const decide = computed(() => consentement.value !== null)

  function lire(): Consentement | null {
    if (import.meta.server) return null
    try {
      const brut = localStorage.getItem(CLE)
      if (!brut) return null
      const valeur = JSON.parse(brut) as Consentement
      const age = Date.now() - new Date(valeur.decideLe).getTime()
      if (age > VALIDITE_JOURS * 24 * 60 * 60 * 1000) return null
      return valeur
    } catch {
      // Navigation privée, stockage bloqué, valeur corrompue : on redemande.
      return null
    }
  }

  function enregistrer(choix: { mesure: boolean; marketing: boolean }) {
    const valeur: Consentement = {
      essentiels: true,
      mesure: choix.mesure,
      marketing: choix.marketing,
      decideLe: new Date().toISOString(),
    }
    consentement.value = valeur
    try {
      localStorage.setItem(CLE, JSON.stringify(valeur))
    } catch {
      // Le refus du stockage ne doit pas casser la navigation : le bandeau
      // reparaîtra à la prochaine visite, c'est tout.
    }
  }

  function reinitialiser() {
    consentement.value = null
    try {
      localStorage.removeItem(CLE)
    } catch {
      /* rien à faire */
    }
  }

  return { consentement, decide, lire, enregistrer, reinitialiser }
}
