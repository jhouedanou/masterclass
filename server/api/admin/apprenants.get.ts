import { acces, certificats, modules, personas, utilisateurs } from '../../data/db'
import { exigerAdmin } from '../../utils/session'

export default defineEventHandler((event) => {
  exigerAdmin(event)
  const { programme, profil } = getQuery(event) as Record<string, string | undefined>

  return utilisateurs
    .filter((u) => u.role === 'apprenant')
    .map((u) => {
      const siens = acces.filter((a) => a.utilisateurId === u.id)
      const modulesAcquis = siens
        .map((a) => modules.find((m) => m.id === a.moduleId))
        .filter((m): m is NonNullable<typeof m> => !!m)
      return {
        id: u.id,
        nom: `${u.prenom} ${u.nom}`,
        email: u.email,
        whatsapp: u.whatsapp ?? '',
        pays: u.pays ?? '',
        ficheCompletee: u.ficheCompletee === true,
        // Le profil doit être à 100 % pour rejoindre une session de coaching.
        profilPourcent: u.ficheCompletee ? 100 : 60,
        modulesAcquis: modulesAcquis.map((m) => ({ id: m.id, titre: m.titre, programme: m.programme })),
        progression: siens.length
          ? Math.round(siens.reduce((s, a) => s + a.progression, 0) / siens.length)
          : 0,
        certificats: certificats.filter((c) => c.utilisateurId === u.id).length,
        persona: personas[u.id] ?? null,
        montantPaye: siens.length * 10_000,
      }
    })
    .filter((a) => !programme || a.modulesAcquis.some((m) => m.programme === programme))
    .filter((a) => !profil || (profil === 'complet' ? a.profilPourcent === 100 : a.profilPourcent < 100))
})
