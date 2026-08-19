import type { H3Event } from 'h3'
import type { Utilisateur } from '#shared/types'
import { utilisateurs } from '../data/db'

const COOKIE = 'emc_session'

/**
 * Session de démonstration : l'identifiant utilisateur est stocké en clair dans
 * un cookie. À remplacer par une vraie authentification signée côté serveur
 * avant toute mise en production.
 */
export function lireSession(event: H3Event): Utilisateur | null {
  const id = getCookie(event, COOKIE)
  if (!id) return null
  return utilisateurs.find((u) => u.id === id) ?? null
}

export function ouvrirSession(event: H3Event, utilisateur: Utilisateur) {
  setCookie(event, COOKIE, utilisateur.id, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

export function fermerSession(event: H3Event) {
  deleteCookie(event, COOKIE, { path: '/' })
}

export function exigerUtilisateur(event: H3Event): Utilisateur {
  const utilisateur = lireSession(event)
  if (!utilisateur) {
    throw createError({ statusCode: 401, statusMessage: 'Authentification requise' })
  }
  return utilisateur
}

export function exigerFormateur(event: H3Event): Utilisateur {
  const utilisateur = exigerUtilisateur(event)
  if (utilisateur.role !== 'formateur') {
    throw createError({ statusCode: 403, statusMessage: 'Espace réservé aux formateurs' })
  }
  return utilisateur
}

export function exigerAdmin(event: H3Event, superieur = false): Utilisateur {
  const utilisateur = exigerUtilisateur(event)
  const autorise = superieur
    ? utilisateur.role === 'admin-superieur'
    : utilisateur.role === 'admin-contenu' || utilisateur.role === 'admin-superieur'
  if (!autorise) {
    throw createError({ statusCode: 403, statusMessage: 'Droits insuffisants' })
  }
  return utilisateur
}
