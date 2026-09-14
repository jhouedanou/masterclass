/**
 * Export CSV côté navigateur (planche C : apprenants, transactions, revenus,
 * référencement). BOM UTF-8 et point-virgule : le fichier s'ouvre dans Excel
 * en français sans assistant d'import, accents compris.
 */
export interface ColonneCsv<T> {
  cle: keyof T | ((ligne: T) => unknown)
  libelle: string
}

function cellule(valeur: unknown): string {
  if (valeur === null || valeur === undefined) return ''
  const texte = Array.isArray(valeur) ? valeur.join(', ') : String(valeur)
  return /[";\n\r]/.test(texte) ? `"${texte.replace(/"/g, '""')}"` : texte
}

export function genererCsv<T>(colonnes: ColonneCsv<T>[], lignes: T[]): string {
  const entete = colonnes.map((c) => cellule(c.libelle)).join(';')
  const corps = lignes.map((ligne) =>
    colonnes
      .map((c) => cellule(typeof c.cle === 'function' ? c.cle(ligne) : ligne[c.cle]))
      .join(';'),
  )
  return `﻿${[entete, ...corps].join('\r\n')}`
}

export function exporterCsv<T>(nomFichier: string, colonnes: ColonneCsv<T>[], lignes: T[]) {
  if (!import.meta.client) return
  const blob = new Blob([genererCsv(colonnes, lignes)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = nomFichier.endsWith('.csv') ? nomFichier : `${nomFichier}.csv`
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  URL.revokeObjectURL(url)
}
