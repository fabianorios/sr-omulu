import type { AppState, EntidadeLinha, Filho, ObligationType } from '../types'
import { emptyEndereco } from '../types'
import type { MaeDeCabeca, PaiDeCabeca, TipoEntidade } from './catalog'

export const DEFAULT_TIPOS: ObligationType[] = [
  {
    id: '1_ano',
    name: 'Obrigação de 1 Ano',
    description: 'Confirmação anual após a feitura ou última obrigação.',
    yearsOffset: 1,
    color: '#3B6EA5',
    active: true,
  },
  {
    id: '3_anos',
    name: 'Obrigação de 3 Anos',
    description: 'Ciclo trienal de consolidação espiritual.',
    yearsOffset: 3,
    color: '#1E4D7B',
    active: true,
  },
  {
    id: '7_anos',
    name: 'Obrigação de 7 Anos',
    description: 'Grande ciclo de amadurecimento na corrente.',
    yearsOffset: 7,
    color: '#0F2F4A',
    active: true,
  },
  {
    id: 'feitura',
    name: 'Feitura',
    description: 'Iniciação / fechamento de corpo do filho.',
    yearsOffset: null,
    color: '#7BA3C4',
    active: true,
  },
  {
    id: 'troca_guia',
    name: 'Troca de Guia',
    description: 'Renovação ou troca de guia espiritual.',
    yearsOffset: null,
    color: '#C4A35A',
    active: true,
  },
  {
    id: 'festiva',
    name: 'Obrigação Festiva',
    description: 'Compromisso ligado a festa de Orixá ou gira especial.',
    yearsOffset: 1,
    isFestiva: true,
    color: '#8B9A7D',
    active: true,
  },
]

/** Data de referência da demo (Novembro 2026). */
export const REFERENCE_DATE = new Date(2026, 10, 15)

function sample(
  partial: Omit<Filho, 'endereco' | 'telefone2'> & Partial<Filho>,
): Filho {
  return {
    telefone2: partial.telefone2 ?? '',
    endereco: partial.endereco ?? {
      ...emptyEndereco(),
      cep: '01001-000',
      logradouro: 'Praça da Sé',
      numero: '100',
      bairro: 'Sé',
      cidade: 'São Paulo',
      uf: 'SP',
    },
    ...partial,
  }
}

function e(tipo: TipoEntidade, nome: string): EntidadeLinha {
  return { tipo, nome }
}

/** Dados de exemplo anonimizados (não são pessoas reais). */
export function createSampleFilhos(): Filho[] {
  const rows: Array<{
    id: string
    pai: PaiDeCabeca
    mae: MaeDeCabeca
    entidades: EntidadeLinha[]
    iniciacao: string
    entrada: string
    nasc: string
    tel: string
    tel2?: string
  }> = [
    {
      id: 'f1',
      pai: 'Omulu',
      mae: 'Nanã Buruquê',
      entidades: [e('Caboclo', 'Sete Flechas'), e('Preto Velho', 'Pai Joaquim')],
      iniciacao: '2019-08-12',
      entrada: '2018-03-10',
      nasc: '1992-05-14',
      tel: '(11) 90000-0001',
    },
    {
      id: 'f2',
      pai: 'Ogum',
      mae: 'Iansã',
      entidades: [e('Exu', 'Tranca Rua')],
      iniciacao: '2017-03-22',
      entrada: '2016-01-15',
      nasc: '1988-02-01',
      tel: '(11) 90000-0002',
    },
    {
      id: 'f3',
      pai: 'Oxossi',
      mae: 'Iemanjá',
      entidades: [e('Marinheiro', 'João do Mar'), e('Marujo', 'Zé do Cais')],
      iniciacao: '2021-02-02',
      entrada: '2020-08-01',
      nasc: '1995-11-20',
      tel: '(11) 90000-0003',
    },
    {
      id: 'f4',
      pai: 'Xango',
      mae: 'Oxum',
      entidades: [e('Boiadeiro', 'Zé Mineiro')],
      iniciacao: '2015-11-08',
      entrada: '2014-06-20',
      nasc: '1985-07-09',
      tel: '(11) 90000-0004',
    },
    {
      id: 'f5',
      pai: 'Oxossi',
      mae: 'Oxum',
      entidades: [e('Cigano', 'Wenceslau')],
      iniciacao: '2020-06-15',
      entrada: '2019-11-02',
      nasc: '1993-03-18',
      tel: '(11) 90000-0005',
    },
    {
      id: 'f6',
      pai: 'Omulu',
      mae: 'Nanã Buruquê',
      entidades: [e('Baiano', 'Zé Pelintra')],
      iniciacao: '2018-01-20',
      entrada: '2017-04-12',
      nasc: '1990-09-30',
      tel: '(11) 90000-0006',
    },
    {
      id: 'f7',
      pai: 'Ogum',
      mae: 'Iansã',
      entidades: [e('Pomba-Gira', 'Maria Padilha')],
      iniciacao: '2022-09-30',
      entrada: '2022-01-08',
      nasc: '1998-12-05',
      tel: '(11) 90000-0007',
    },
    {
      id: 'f8',
      pai: 'Oxossi',
      mae: 'Oxum',
      entidades: [e('Caboclo', 'Arranca Toco')],
      iniciacao: '2016-05-04',
      entrada: '2015-09-18',
      nasc: '1987-06-22',
      tel: '(11) 90000-0008',
    },
    {
      id: 'f9',
      pai: 'Omulu',
      mae: 'Nanã Buruquê',
      entidades: [e('Preto Velho', 'Vovó Catarina')],
      iniciacao: '2014-12-18',
      entrada: '2013-07-22',
      nasc: '1982-01-11',
      tel: '(11) 90000-0009',
    },
    {
      id: 'f10',
      pai: 'Omulu',
      mae: 'Iemanjá',
      entidades: [e('Erê', 'Curumim')],
      iniciacao: '2023-04-07',
      entrada: '2022-12-01',
      nasc: '2000-08-08',
      tel: '(11) 90000-0010',
    },
    {
      id: 'f11',
      pai: 'Ogum',
      mae: 'Oxum',
      entidades: [e('Malandro', 'Zé do Morro')],
      iniciacao: '2019-11-25',
      entrada: '2019-02-14',
      nasc: '1991-04-04',
      tel: '(11) 90000-0011',
    },
    {
      id: 'f12',
      pai: 'Xango',
      mae: 'Oxum',
      entidades: [
        e('Cigano', 'Cigano Pablo'),
        e('Marinheiro', 'Marinheiro Antônio'),
        e('Cigano', 'Cigana Esmeralda'),
      ],
      iniciacao: '2021-07-14',
      entrada: '2020-10-30',
      nasc: '1994-10-16',
      tel: '(11) 90000-0012',
      tel2: '(11) 90000-1012',
    },
  ]

  return rows.map((r, i) =>
    sample({
      id: r.id,
      nome: `Médium Exemplo ${String(i + 1).padStart(2, '0')}`,
      paiDeCabeca: r.pai,
      maeDeCabeca: r.mae,
      entidades: r.entidades,
      iniciacao: r.iniciacao,
      dataEntrada: r.entrada,
      dataNascimento: r.nasc,
      telefone1: r.tel,
      telefone2: r.tel2 ?? '',
    }),
  )
}

export function createInitialState(): AppState {
  return {
    dataSource: 'sample',
    tipos: DEFAULT_TIPOS.map((t) => ({ ...t })),
    filhos: createSampleFilhos(),
    obrigacoes: [
      { id: 'o1', filhoId: 'f6', tipoId: '1_ano', data: '2026-10-30', ultimaData: '2025-10-30' },
      { id: 'o2', filhoId: 'f9', tipoId: '7_anos', data: '2026-11-05', ultimaData: '2019-11-05' },
      { id: 'o3', filhoId: 'f2', tipoId: '3_anos', data: '2026-11-08', ultimaData: '2023-11-08' },
      { id: 'o4', filhoId: 'f5', tipoId: 'troca_guia', data: '2026-11-18' },
      { id: 'o5', filhoId: 'f1', tipoId: '1_ano', data: '2026-11-20', ultimaData: '2025-11-20' },
      { id: 'o6', filhoId: 'f11', tipoId: '1_ano', data: '2026-11-25', ultimaData: '2025-11-25' },
      { id: 'o7', filhoId: 'f4', tipoId: '7_anos', data: '2026-11-28', ultimaData: '2019-11-28' },
      { id: 'o8', filhoId: 'f3', tipoId: '1_ano', data: '2026-12-02', ultimaData: '2025-12-02' },
      { id: 'o9', filhoId: 'f7', tipoId: '1_ano', data: '2026-12-12', ultimaData: '2025-12-12' },
      { id: 'o10', filhoId: 'f8', tipoId: '1_ano', data: '2027-01-15', ultimaData: '2026-01-15' },
      { id: 'o11', filhoId: 'f10', tipoId: 'feitura', data: '2027-04-07' },
      { id: 'o12', filhoId: 'f12', tipoId: 'festiva', data: '2026-11-20', ultimaData: '2025-11-20' },
      { id: 'o13', filhoId: 'f5', tipoId: 'troca_guia', data: '2026-11-19' },
      { id: 'o14', filhoId: 'f12', tipoId: 'troca_guia', data: '2026-11-23' },
    ],
    eventos: [
      { id: 'e1', titulo: 'Gira de Desenvolvimento', data: '2026-11-16', tipo: 'gira' },
      { id: 'e2', titulo: 'Festa de Nanã', data: '2026-11-05', tipo: 'festa' },
      { id: 'e3', titulo: 'Gira de Ogum', data: '2026-11-08', tipo: 'gira' },
      { id: 'e4', titulo: 'Reunião da Corrente', data: '2026-11-25', tipo: 'evento' },
      { id: 'e5', titulo: 'Festa de Xangô', data: '2026-11-28', tipo: 'festa' },
    ],
  }
}
