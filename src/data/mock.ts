import type { AppState, Filho, ObligationType, Orixa } from '../types'
import { emptyEndereco } from '../types'

export const ORIXAS: Orixa[] = [
  'Omulu',
  'Ogum',
  'Iemanjá',
  'Xangô',
  'Oxum',
  'Oxalá',
  'Iansã',
  'Oxóssi',
  'Nanã',
]

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

function sampleFilho(
  partial: Omit<Filho, 'endereco' | 'guias' | 'paiDeCabeca' | 'maeDeCabeca' | 'telefone2' | 'dataNascimento' | 'dataEntrada'> &
    Partial<Filho>,
): Filho {
  return {
    paiDeCabeca: partial.paiDeCabeca ?? partial.orixa,
    maeDeCabeca: partial.maeDeCabeca ?? '',
    guias: partial.guias ?? ['Guia Exemplo'],
    dataNascimento: partial.dataNascimento ?? '1990-01-01',
    dataEntrada: partial.dataEntrada ?? partial.iniciacao,
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
    telefone1: partial.telefone1,
  }
}

/**
 * Dados de exemplo anonimizados (não são pessoas reais).
 * Usados só quando Supabase não está configurado.
 */
export function createSampleFilhos(): Filho[] {
  return [
    sampleFilho({
      id: 'f1',
      nome: 'Médium Exemplo 01',
      orixa: 'Omulu',
      paiDeCabeca: 'Omulu',
      maeDeCabeca: 'Nanã',
      guias: ['Pretos Velhos', 'Caboclo Exemplo'],
      iniciacao: '2019-08-12',
      dataEntrada: '2018-03-10',
      dataNascimento: '1992-05-14',
      telefone1: '(11) 90000-0001',
    }),
    sampleFilho({
      id: 'f2',
      nome: 'Médium Exemplo 02',
      orixa: 'Ogum',
      paiDeCabeca: 'Ogum',
      maeDeCabeca: 'Iansã',
      guias: ['Exu Exemplo'],
      iniciacao: '2017-03-22',
      dataEntrada: '2016-01-15',
      telefone1: '(11) 90000-0002',
    }),
    sampleFilho({
      id: 'f3',
      nome: 'Médium Exemplo 03',
      orixa: 'Iemanjá',
      paiDeCabeca: 'Oxalá',
      maeDeCabeca: 'Iemanjá',
      guias: ['Sereia Exemplo', 'Marinheiro Exemplo'],
      iniciacao: '2021-02-02',
      dataEntrada: '2020-08-01',
      telefone1: '(11) 90000-0003',
    }),
    sampleFilho({
      id: 'f4',
      nome: 'Médium Exemplo 04',
      orixa: 'Xangô',
      paiDeCabeca: 'Xangô',
      maeDeCabeca: 'Oxum',
      guias: ['Boadeiro Exemplo'],
      iniciacao: '2015-11-08',
      dataEntrada: '2014-06-20',
      telefone1: '(11) 90000-0004',
    }),
    sampleFilho({
      id: 'f5',
      nome: 'Médium Exemplo 05',
      orixa: 'Oxum',
      paiDeCabeca: 'Oxóssi',
      maeDeCabeca: 'Oxum',
      guias: ['Cigana Exemplo'],
      iniciacao: '2020-06-15',
      dataEntrada: '2019-11-02',
      telefone1: '(11) 90000-0005',
    }),
    sampleFilho({
      id: 'f6',
      nome: 'Médium Exemplo 06',
      orixa: 'Oxalá',
      paiDeCabeca: 'Oxalá',
      maeDeCabeca: 'Nanã',
      guias: ['Baiano Exemplo'],
      iniciacao: '2018-01-20',
      dataEntrada: '2017-04-12',
      telefone1: '(11) 90000-0006',
    }),
    sampleFilho({
      id: 'f7',
      nome: 'Médium Exemplo 07',
      orixa: 'Iansã',
      paiDeCabeca: 'Ogum',
      maeDeCabeca: 'Iansã',
      guias: ['Pomba Gira Exemplo'],
      iniciacao: '2022-09-30',
      dataEntrada: '2022-01-08',
      telefone1: '(11) 90000-0007',
    }),
    sampleFilho({
      id: 'f8',
      nome: 'Médium Exemplo 08',
      orixa: 'Oxóssi',
      paiDeCabeca: 'Oxóssi',
      maeDeCabeca: 'Oxum',
      guias: ['Caboclo da Mata'],
      iniciacao: '2016-05-04',
      dataEntrada: '2015-09-18',
      telefone1: '(11) 90000-0008',
    }),
    sampleFilho({
      id: 'f9',
      nome: 'Médium Exemplo 09',
      orixa: 'Nanã',
      paiDeCabeca: 'Omulu',
      maeDeCabeca: 'Nanã',
      guias: ['Preto Velho Exemplo'],
      iniciacao: '2014-12-18',
      dataEntrada: '2013-07-22',
      telefone1: '(11) 90000-0009',
    }),
    sampleFilho({
      id: 'f10',
      nome: 'Médium Exemplo 10',
      orixa: 'Omulu',
      paiDeCabeca: 'Omulu',
      maeDeCabeca: 'Iemanjá',
      guias: ['Erê Exemplo'],
      iniciacao: '2023-04-07',
      dataEntrada: '2022-12-01',
      telefone1: '(11) 90000-0010',
    }),
    sampleFilho({
      id: 'f11',
      nome: 'Médium Exemplo 11',
      orixa: 'Ogum',
      paiDeCabeca: 'Ogum',
      maeDeCabeca: 'Oxum',
      guias: ['Zé Pilintra Exemplo'],
      iniciacao: '2019-11-25',
      dataEntrada: '2019-02-14',
      telefone1: '(11) 90000-0011',
    }),
    sampleFilho({
      id: 'f12',
      nome: 'Médium Exemplo 12',
      orixa: 'Oxum',
      paiDeCabeca: 'Xangô',
      maeDeCabeca: 'Oxum',
      guias: ['Cigano Exemplo', 'Marinheiro Exemplo'],
      iniciacao: '2021-07-14',
      dataEntrada: '2020-10-30',
      telefone1: '(11) 90000-0012',
      telefone2: '(11) 90000-1012',
    }),
  ]
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
