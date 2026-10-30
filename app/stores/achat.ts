import { defineStore } from 'pinia'

export interface ModuleAchete {
  id: string
  slug: string
  titre: string
  prixFcfa: number
  programme: string
  thematique: string
  formateur: string
  dureeMinutes: number
}

/** Séance de coaching privé à régler (« Accepter et payer », planche B, écran 10). */
export interface SeanceAchetee {
  demandeId: string
  titre: string
  prixFcfa: number
  heures: number
  creneau: string
  formateur: string
}

/** Inscription à une Live Session (CDC v1.3, planche 04) : réglée au prix du module. */
export interface LiveAchetee {
  slug: string
  titre: string
  prixFcfa: number
  debut: string
  dureeMinutes: number
  formateur: string
  programme: string
}

/**
 * Le tunnel de la maquette porte un seul module à la fois :
 * 1. Compte · 2. Récapitulatif · 3. Paiement.
 * L'achat en cours doit survivre à la connexion. Une séance de coaching privé
 * emprunte la même étape de paiement, comme une inscription à une Live Session.
 */
export const useAchatStore = defineStore('achat', () => {
  const module = ref<ModuleAchete | null>(null)
  const seance = ref<SeanceAchetee | null>(null)
  const live = ref<LiveAchetee | null>(null)
  const reference = ref<string | null>(null)
  const moyen = ref<'mobile-money' | 'wave' | 'djamo' | 'visa'>('mobile-money')

  function definir(m: ModuleAchete) {
    module.value = m
    seance.value = null
    live.value = null
    reference.value = null
  }
  function definirSeance(s: SeanceAchetee) {
    seance.value = s
    module.value = null
    live.value = null
    reference.value = null
  }
  function definirLive(l: LiveAchetee) {
    live.value = l
    module.value = null
    seance.value = null
    reference.value = null
  }
  function vider() {
    module.value = null
    seance.value = null
    live.value = null
  }

  return { module, seance, live, reference, moyen, definir, definirSeance, definirLive, vider }
})
