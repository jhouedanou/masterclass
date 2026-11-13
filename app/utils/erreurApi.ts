/**
 * Message d'une erreur renvoyée par l'API, à afficher tel quel à l'écran.
 *
 * Le texte se lit d'abord dans le corps de la réponse (`data`). L'en-tête de
 * statut ne suffit pas : en HTTP/2 — donc en production — il ne transporte
 * aucun libellé, et `statusMessage` vaut alors une chaîne vide. Une chaîne
 * vide n'étant pas « absente », `??` ne retombait pas sur le message par
 * défaut : l'écran n'affichait rien du tout.
 */
export function messageErreurApi(e: unknown, parDefaut: string): string {
  const r = e as { statusMessage?: string; data?: { statusMessage?: string; message?: string } }
  return r?.data?.statusMessage || r?.data?.message || r?.statusMessage || parDefaut
}
