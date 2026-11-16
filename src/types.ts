import type { Guia, MaeDeCabeca, PaiDeCabeca } from './data/catalog'

export type ObligationStatus = 'em_dia' | 'proxima' | 'vencida'

export type ObligationTypeId =
  | '1_ano'
  | '3_anos'
  | '7_anos'
  | 'feitura'
  | 'troca_guia'
  | 'festiva'

export interface ObligationType {
  id: ObligationTypeId
  name: string
  description: string
  yearsOffset: number | null
  isFestiva?: boolean
  color: string
  active: boolean
}

export interface Endereco {
  cep: string
  logradouro: string
  numero: string
  complemento: string
  bairro: string
  cidade: string
  uf: string
}

export interface Filho {
  id: string
  nome: string
  paiDeCabeca: PaiDeCabeca
  maeDeCabeca: MaeDeCabeca
  guias: Guia[]
  dataNascimento: string
  dataEntrada: string
  iniciacao: string
  telefone1: string
  telefone2: string
  email?: string
  endereco: Endereco
}

export type FilhoInput = Omit<Filho, 'id'> & { id?: string }

export interface Obrigacao {
  id: string
  filhoId: string
  tipoId: ObligationTypeId
  data: string
  ultimaData?: string
}

export interface HouseEvent {
  id: string
  titulo: string
  data: string
  tipo: 'gira' | 'festa' | 'evento'
}

export type DataSource = 'sample' | 'local' | 'postgres' | 'pglite'

export interface AppState {
  filhos: Filho[]
  obrigacoes: Obrigacao[]
  eventos: HouseEvent[]
  tipos: ObligationType[]
  dataSource: DataSource
}

export function emptyEndereco(): Endereco {
  return {
    cep: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
  }
}
