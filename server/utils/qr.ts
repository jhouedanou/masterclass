// @ts-expect-error — modules internes de `qrcode`, sans déclarations de types.
import { create } from 'qrcode/lib/core/qrcode.js'
// @ts-expect-error — idem.
import { render } from 'qrcode/lib/renderer/svg-tag.js'

/**
 * QR code en URL `data:` (SVG), à poser dans un `<img>`.
 *
 * Le rendu PNG de `qrcode` (`toDataURL`) passe par `pngjs`, qui hérite des flux
 * de Node : sur Cloudflare Workers l'héritage échoue (« superCtor.prototype
 * must be of type object ») et la route répond 500. Le SVG ne dépend de rien
 * d'autre que du calcul de la matrice, et reste net à toute taille.
 */
export function qrEnDataUrl(texte: string, options: { margin?: number; width?: number } = {}): string {
  const svg: string = render(create(texte, { errorCorrectionLevel: 'M' }), options)
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`
}
