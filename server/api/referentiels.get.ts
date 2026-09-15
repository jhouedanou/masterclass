import { listerReferentielsActifs } from '../database/referentiels'

/** Valeurs proposées aux champs à choix multiple du profil apprenant.
 *  Seules les entrées actives sortent : une entrée retirée disparaît du
 *  formulaire sans effacer les fiches qui la portent encore. */
export default defineEventHandler(() => listerReferentielsActifs())
