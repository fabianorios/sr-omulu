/** Fixed catalogs — always displayed A–Z. */

export const PAIS_DE_CABECA = ['Ogum', 'Omulu', 'Oxossi', 'Xango'] as const

export const MAES_DE_CABECA = [
  'Iansã',
  'Iemanjá',
  'Nanã Buruquê',
  'Oxum',
] as const

export const TIPOS_ENTIDADE = [
  'Baiano',
  'Boiadeiro',
  'Caboclo',
  'Cigano',
  'Erê',
  'Exu',
  'Exu Mirim',
  'Malandro',
  'Marinheiro',
  'Marujo',
  'Pomba-Gira',
  'Preto Velho',
] as const

export type PaiDeCabeca = (typeof PAIS_DE_CABECA)[number]
export type MaeDeCabeca = (typeof MAES_DE_CABECA)[number]
export type TipoEntidade = (typeof TIPOS_ENTIDADE)[number]

export function isPaiDeCabeca(value: string): value is PaiDeCabeca {
  return (PAIS_DE_CABECA as readonly string[]).includes(value)
}

export function isMaeDeCabeca(value: string): value is MaeDeCabeca {
  return (MAES_DE_CABECA as readonly string[]).includes(value)
}

export function isTipoEntidade(value: string): value is TipoEntidade {
  return (TIPOS_ENTIDADE as readonly string[]).includes(value)
}
