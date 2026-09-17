import { listerModules, listerProgrammes, listerThematiques } from '../../database/catalogue'
import { compteursProgramme, programmePublic } from '../../utils/public'

/**
 * Les deux programmes, textes déjà garnis de leurs décomptes.
 *
 * La route rendait `listerProgrammes()` tel quel, donc les « 9 modules » écrits
 * dans la base. Le catalogue est lu ici pour que le nombre annoncé soit celui
 * du jour.
 */
export default defineEventHandler(async () => {
  const [programmes, modules, thematiques] = await Promise.all([
    listerProgrammes(),
    listerModules(),
    listerThematiques(),
  ])

  return programmes.map((p) =>
    programmePublic(p, compteursProgramme(p.slug, modules, thematiques)),
  )
})
