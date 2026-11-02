import { listerInscriptionsLiveDetaillees } from '../../../../utils/liveInscrits'
import { exigerSection } from '../../../../utils/session'

function cellule(valeur: string | null | undefined): string {
  const texte = valeur ?? ''
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

/**
 * Export CSV des inscrits confirmés (CDC §5.2) : nom, email, téléphone, date,
 * référence de transaction. BOM UTF-8 et point-virgule, comme les autres
 * exports du back-office (app/utils/csv.ts) : il s'ouvre dans Excel en français.
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'live-sessions')
  const { session, inscrits } = await listerInscriptionsLiveDetaillees(getRouterParam(event, 'id') ?? '')
  const lignes = [
    ['Nom', 'Email', 'Téléphone', 'Date d’inscription', 'Référence de transaction'],
    ...inscrits
      .filter((i) => i.statut === 'confirmee')
      .map((i) => [i.nom, i.email, i.telephone, i.confirmeLe?.slice(0, 16).replace('T', ' ') ?? '', i.referenceTransaction]),
  ]
  setResponseHeaders(event, {
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="inscrits-${session.slug}.csv"`,
    'Cache-Control': 'no-store',
  })
  return '﻿' + lignes.map((l) => l.map(cellule).join(';')).join('\r\n') + '\r\n'
})
