import {
  listerFormateurs,
  listerModules,
  listerPhases,
  listerProgrammes,
  listerThematiques,
} from '../../database/catalogue'
import { exigerSection } from '../../utils/session'

/**
 * Arbre Programme → Phase → Thématique → Module (planche C, écran 02).
 *
 * Les trois objets d'un module — fiche commerciale, module pédagogique, offre —
 * sont indépendants, et c'est tout le propos de l'écran. Ils étaient jusqu'ici
 * dérivés du seul `statut`, ce qui les rendait mécaniquement solidaires : un
 * module ne pouvait pas être « prêt » sans être en vente, ni annoncé sans être
 * publié. Chacun lit désormais sa propre source.
 */
export default defineEventHandler(async (event) => {
  await exigerSection(event, 'modules-chapitres')

  const [programmes, phases, thematiques, modules, formateurs] = await Promise.all([
    listerProgrammes(),
    listerPhases(),
    listerThematiques(),
    listerModules(),
    listerFormateurs(),
  ])

  return programmes.map((p) => ({
    id: p.id,
    slug: p.slug,
    nom: p.nom,
    couleur: p.couleur,
    statut: p.statut,
    phases: phases
      .filter((ph) => ph.programme === p.slug)
      .map((ph) => ({
        id: ph.id,
        numero: ph.numero,
        nom: ph.nom,
        statut: ph.statut,
        dateOuverture: ph.dateOuverture,
        thematiques: thematiques
          .filter((t) => t.phaseId === ph.id)
          .map((t) => ({
            id: t.id,
            numero: t.numero,
            nom: t.nom,
            statut: t.statut,
            position: t.position,
            modules: modules
              .filter((m) => m.thematiqueId === t.id)
              .sort((a, b) => a.numero - b.numero)
              .map((m) => ({
                id: m.id,
                slug: m.slug,
                numero: m.numero,
                titre: m.titre,
                statut: m.statut,
                nbChapitres: m.chapitres.length,
                // Un chapitre sans transcription se voit dans l'arbre : c'est
                // ce qui reste à faire avant de pouvoir marquer « Prêt ».
                nbScripts: m.chapitres.filter((c) => (c.script?.length ?? 0) > 0).length,
                nbVideos: m.chapitres.filter((c) => c.videoCle).length,
                // « Vidéo de bienvenue — Uploadée / À téléverser » en tête du
                // panneau module (écran 02).
                videoIntro: Boolean(m.videoIntroCle),
                chapitres: m.chapitres.map((c) => ({
                  libelle: c.libelle,
                  titre: c.titre,
                  script: (c.script?.length ?? 0) > 0,
                  video: Boolean(c.videoCle),
                })),
                formateur: formateurs.find((f) => f.id === m.formateurId)?.nom ?? '',
                // Fiche commerciale : publiée dès que le module sort du
                // brouillon, « Annonce » ayant sa propre valeur de statut.
                fiche: m.statut === 'brouillon' ? 'brouillon' : m.statut === 'annonce' ? 'annonce' : 'publiee',
                // Module pédagogique : « prêt » se gagne à l'écran 09, une fois
                // les vidéos déposées et les scripts importés.
                contenu: m.pretLe ? 'pret' : 'en-preparation',
                // Offre : ouverte ou fermée, indépendamment des deux autres.
                offre: m.statut === 'disponible' ? 'ouverte' : 'fermee',
                pretLe: m.pretLe,
                dateLancement: m.dateLancement,
                prixFcfa: m.prixFcfa,
              })),
          })),
      })),
  }))
})
