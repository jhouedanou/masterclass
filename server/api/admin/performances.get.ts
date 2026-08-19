import { reglagesFinanciers } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

/**
 * Indicateurs marketing de démonstration. La collecte réelle passe par Google
 * Tag Manager (Meta Pixel + CAPI, GA4, TikTok, LinkedIn) — à brancher.
 */
export default defineEventHandler((event) => {
  exigerAdmin(event)
  return {
    ca: 3_120_000,
    evolutionCa: 18,
    ventes: 312,
    modulesParAcheteur: 1.7,
    visites: 8456,
    visiteursUniques: 6902,
    tauxConversion: 3.7,
    repartitionProgramme: { socialMedia: 58, entrepreneurs: 42 },
    topPays: 'Côte d’Ivoire (61 %)',
    ltv: 17_000,
    appareils: { mobile: 78, desktop: 22 },
    topSource: 'Meta / social (44 %)',
    directReferents: 31,
    pageLaPlusVue: '/programmes/social-media',
    acheteurs: 184,
    nouveaux: 67,
    recurrents: 52,
    objectifCa: reglagesFinanciers.objectifCaMensuel,
    caQuotidien: [
      62000, 71000, 58000, 94000, 88000, 76000, 102000, 118000, 96000, 208000, 142000, 121000,
      99000, 87000, 133000, 156000, 111000, 94000, 128000, 147000,
    ],
  }
})
