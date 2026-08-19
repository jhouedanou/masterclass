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

/**
 * Le tunnel de la maquette porte un seul module à la fois :
 * 1. Compte · 2. Récapitulatif · 3. Paiement.
 * L'achat en cours doit survivre à la connexion.
 */
export const useAchatStore = defineStore('achat', () => {
  const module = ref<ModuleAchete | null>(null)
  const reference = ref<string | null>(null)
  const moyen = ref<'mobile-money' | 'wave' | 'djamo' | 'visa'>('mobile-money')

  function definir(m: ModuleAchete) {
    module.value = m
    reference.value = null
  }
  function vider() {
    module.value = null
  }

  return { module, reference, moyen, definir, vider }
})
