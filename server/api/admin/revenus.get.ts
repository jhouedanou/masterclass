import { formateurs, reglagesFinanciers } from '../../data/db'
import { statistiquesModules } from '../../utils/formateur'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)
  const { fraisPaiementPourcent, partBigFivePourcent, partFormateurPourcent } = reglagesFinanciers

  const parFormateur = formateurs.map((f) => {
    const ventes = statistiquesModules(f.id).filter((m) => m.statut === 'disponible')
    const caModules = ventes.reduce((s, m) => s + m.inscrits * 10_000, 0)
    // Le coaching privé est porté par le formateur ; le collectif est inclus dans le module.
    const caPrive = 50_000 * (f.id === 'for-othniel' ? 5 : f.id === 'for-soboro' ? 3 : 2)
    const ca = caModules + caPrive
    const marge = Math.round(ca * (1 - fraisPaiementPourcent / 100))
    return {
      id: f.id,
      nom: f.nom,
      ca,
      marge,
      remuneration: Math.round((marge * partFormateurPourcent) / 100),
    }
  })

  const caModules = parFormateur.reduce((s, f) => s + f.ca, 0)
  const frais = Math.round((caModules * fraisPaiementPourcent) / 100)
  const marge = caModules - frais

  return {
    reglages: reglagesFinanciers,
    total: {
      ca: caModules,
      frais,
      marge,
      revenuBigFive: Math.round((marge * partBigFivePourcent) / 100),
      revenuFormateurs: Math.round((marge * partFormateurPourcent) / 100),
    },
    parFormateur: parFormateur.sort((a, b) => b.ca - a.ca),
  }
})
