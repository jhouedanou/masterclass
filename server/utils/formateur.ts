import { acces, certificats, formateurs, modules, sessionsCoaching, thematiques } from '../data/db'

export const TAUX_FRAIS_PAIEMENT = 0.04
export const PART_FORMATEUR = 0.3
export const PART_PLATEFORME = 0.7

/**
 * Statistiques de démonstration : les compteurs de ventes ne sont pas encore
 * historisés, on les dérive de façon déterministe depuis les identifiants.
 */
function ventesSimulees(moduleId: string): number {
  const somme = [...moduleId].reduce((s, c) => s + c.charCodeAt(0), 0)
  return 12 + (somme % 40)
}

export function statistiquesModules(formateurId: string) {
  return modules
    .filter((m) => m.formateurId === formateurId)
    .map((m) => {
      const enPreparation = m.statut !== 'disponible'
      const inscrits = enPreparation ? 0 : ventesSimulees(m.id)
      const reels = acces.filter((a) => a.moduleId === m.id)
      const completion = enPreparation ? 0 : 60 + (inscrits % 20)
      return {
        id: m.id,
        slug: m.slug,
        titre: m.titre,
        programme: m.programme,
        statut: m.statut,
        thematique: thematiques.find((t) => t.id === m.thematiqueId)?.nom ?? '',
        inscrits,
        nouveaux: enPreparation ? 0 : 1 + (inscrits % 9),
        completion,
        certificats: enPreparation
          ? 0
          : Math.round((inscrits * completion) / 100) + certificats.filter((c) => c.moduleId === m.id).length,
        accesReels: reels.length,
      }
    })
}

export function revenusFormateur(formateurId: string) {
  const lignes = statistiquesModules(formateurId)
    .filter((m) => m.statut === 'disponible')
    .map((m) => {
      const ca = m.inscrits * 10_000
      const marge = Math.round(ca * (1 - TAUX_FRAIS_PAIEMENT))
      return {
        libelle: m.titre,
        ventes: m.inscrits,
        ca,
        marge,
        part: Math.round(marge * PART_FORMATEUR),
      }
    })

  // Coaching privé : 3 séances de démonstration.
  const heuresCoaching = 5
  const caCoaching = heuresCoaching * 50_000
  const margeCoaching = Math.round(caCoaching * (1 - TAUX_FRAIS_PAIEMENT))
  lignes.push({
    libelle: `Coaching privé — ${heuresCoaching} h à 50 000 F`,
    ventes: 3,
    ca: caCoaching,
    marge: margeCoaching,
    part: Math.round(margeCoaching * PART_FORMATEUR),
  })

  const ca = lignes.reduce((s, l) => s + l.ca, 0)
  const frais = Math.round(ca * TAUX_FRAIS_PAIEMENT)
  const marge = ca - frais
  return {
    lignes,
    total: {
      ca,
      frais,
      marge,
      remuneration: Math.round(marge * PART_FORMATEUR),
      margePlateforme: Math.round(marge * PART_PLATEFORME),
    },
  }
}

export function sessionsFormateur(formateurId: string) {
  return sessionsCoaching
    .filter((s) => s.formateurId === formateurId)
    .map((s) => ({
      ...s,
      thematique: thematiques.find((t) => t.id === s.thematiqueId) ?? null,
      participation: s.statut === 'terminee' ? 76 + (s.inscrits % 15) : null,
      note: s.statut === 'terminee' ? 4.7 : null,
    }))
}

export function ficheFormateur(formateurId: string) {
  return formateurs.find((f) => f.id === formateurId) ?? null
}
