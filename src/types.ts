export type Orixa =
  | 'Omulu'
  | 'Ogum'
  | 'Iemanjá'
  | 'Xangô'
  | 'Oxum'
  | 'Oxalá'
  | 'Iansã'
  | 'Oxóssi'
  | 'Nanã'

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

export interface Filho {
  id: string
  nome: string
  orixa: Orixa
  iniciacao: string
  telefone: string
  email?: string
}

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

export interface AppState {
  filhos: Filho[]
  obrigacoes: Obrigacao[]
  eventos: HouseEvent[]
  tipos: ObligationType[]
}
