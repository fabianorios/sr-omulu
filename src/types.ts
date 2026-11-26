import type { MaeDeCabeca, PaiDeCabeca, TipoEntidade } from './data/catalog'

export type ObligationStatus = 'em_dia' | 'proxima' | 'vencida'

/**
 * Id do tipo no catálogo (`obrigacao_tipos`).
 * Seeds fixos: 1_ano, 3_anos, 7_anos, feitura, troca_guia, festiva, manual.
 * Tipos novos usam uuid text.
 */
export type ObligationTypeId = string

export interface ObligationType {
  id: ObligationTypeId
  name: string
  description: string
  yearsOffset: number | null
  isFestiva?: boolean
  color: string
  active: boolean
  /** Itens sugeridos ao agendar este tipo. */
  itensPadrao?: ObrigacaoItem[]
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

/** Uma linha: tipo de entidade + nome próprio. */
export interface EntidadeLinha {
  tipo: TipoEntidade
  nome: string
}

export interface Filho {
  id: string
  nome: string
  paiDeCabeca: PaiDeCabeca
  maeDeCabeca: MaeDeCabeca
  entidades: EntidadeLinha[]
  dataNascimento: string
  dataEntrada: string
  iniciacao: string
  telefone1: string
  telefone2: string
  email?: string
  endereco: Endereco
}

export type FilhoInput = Omit<Filho, 'id'> & { id?: string }

export interface ObrigacaoItem {
  nome: string
  quantidade: number
  /** Observação opcional por item (ex.: cor, tamanho). */
  observacao?: string
}

export interface Obrigacao {
  id: string
  filhoId: string
  tipoId: ObligationTypeId
  data: string
  ultimaData?: string
  itens: ObrigacaoItem[]
  /**
   * Título livre (legado / snapshot). Preferir o nome do tipo no catálogo;
   * usado quando o tipo foi removido ou em linhas antigas `manual`.
   */
  nome?: string
  observacoes?: string
  /** Lote de replicação aos filhos (idempotência por filho+lote). */
  loteId?: string
}

export type CobrancaCategoria = 'mensalidade' | 'contribuicao' | 'outro'

export type FinanceStatus = 'pago' | 'aberto' | 'vencido'

export interface CobrancaTipo {
  id: string
  nome: string
  categoria: CobrancaCategoria
  ativo: boolean
}

export interface Cobranca {
  id: string
  filhoId: string
  tipoId?: string
  tipoNome: string
  categoria: CobrancaCategoria
  valor: number
  vencimento: string
  /** Dia do mês (1–28) para mensalidades recorrentes. */
  diaVencimento?: number
  referencia?: string
  descricao?: string
  pago: boolean
  pagoEm?: string
}

export type CobrancaInput = Omit<Cobranca, 'id' | 'pago' | 'pagoEm'> & {
  id?: string
  pago?: boolean
  pagoEm?: string
}

export interface HouseEvent {
  id: string
  titulo: string
  data: string
  tipo: 'gira' | 'festa' | 'evento'
}

export type DataSource =
  | 'sample'
  | 'local'
  | 'supabase'
  | 'postgres'
  | 'pglite'

export interface AppState {
  filhos: Filho[]
  obrigacoes: Obrigacao[]
  eventos: HouseEvent[]
  tipos: ObligationType[]
  cobrancas: Cobranca[]
  cobrancaTipos: CobrancaTipo[]
  dataSource: DataSource
}

export function emptyObrigacaoItem(): ObrigacaoItem {
  return { nome: '', quantidade: 1, observacao: '' }
}

export function formatObrigacaoItem(item: ObrigacaoItem): string {
  const q = Number.isFinite(item.quantidade) ? item.quantidade : 0
  const base = `${item.nome.trim() || 'Item'} × ${q}`
  const obs = item.observacao?.trim()
  return obs ? `${base} (${obs})` : base
}

/** Rótulo de exibição: nome manual ou nome do tipo cadastrado. */
export function obrigacaoLabel(
  o: Pick<Obrigacao, 'nome' | 'tipoId'>,
  tipoName?: string,
): string {
  const nome = o.nome?.trim()
  if (nome) return nome
  return tipoName?.trim() || o.tipoId
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

export function emptyEntidadeLinha(): EntidadeLinha {
  return { tipo: 'Caboclo', nome: '' }
}

export function formatEntidade(e: EntidadeLinha): string {
  const nome = e.nome.trim()
  return nome ? `${e.tipo} (${nome})` : e.tipo
}
