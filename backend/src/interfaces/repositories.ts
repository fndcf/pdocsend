import { Timestamp } from "firebase-admin/firestore";
import { Tenant, User } from "../models/Tenant";
import { Lote, Envio, ImovelEnviado } from "../models/Envio";
import { Imovel } from "../models/Imovel";

// --- Paginação genérica ---

export interface PaginatedResult<T> {
  items: T[];
  hasMore: boolean;
  nextCursor?: string;
}

// --- Tenant Repository ---

export interface ITenantRepository {
  buscarPorId(tenantId: string): Promise<(Tenant & { id: string }) | null>;
  listarTodos(): Promise<(Tenant & { id: string })[]>;
  listarPaginado(limite?: number, cursor?: string): Promise<PaginatedResult<Tenant & { id: string }>>;
  listarResumo(): Promise<Array<{ id: string; nome: string; limiteDiario: number; mensagemTemplate: Tenant["mensagemTemplate"]; criadoEm: Timestamp }>>;
  criar(data: Omit<Tenant, "criadoEm">): Promise<string>;
  atualizar(tenantId: string, data: Record<string, unknown>): Promise<void>;
}

// --- User Repository ---

export interface IUserRepository {
  buscarPorId(uid: string): Promise<(User & { id: string }) | null>;
  listarPorTenant(): Promise<Record<string, Array<{ uid: string; email: string; nome: string; role: string }>>>;
  listarPendentesIds(): Promise<Map<string, { tenantId: string; role: string }>>;
  criar(uid: string, data: Omit<User, "criadoEm">): Promise<void>;
}

// --- Lote Repository ---

export interface CriarLoteData {
  totalEnvios: number;
  pdfOrigem: string;
  criadoPor: string;
}

export interface ContadoresLote {
  enviados: number;
  erros: number;
  cancelados: number;
}

export interface ILoteRepository {
  buscarPorId(tenantId: string, loteId: string): Promise<(Lote & { id: string }) | null>;
  listarPorTenant(tenantId: string, limite?: number, cursor?: string): Promise<{ lotes: (Lote & { id: string })[]; hasMore: boolean; nextCursor?: string }>;
  listarDesde(tenantId: string, desde: Timestamp): Promise<(Lote & { id: string })[]>;
  criar(tenantId: string, data: CriarLoteData): Promise<string>;
  atualizarStatus(tenantId: string, loteId: string, status: string): Promise<void>;
  atualizarContadores(tenantId: string, loteId: string, contadores: Partial<ContadoresLote>): Promise<void>;
  finalizar(tenantId: string, loteId: string, contadores: ContadoresLote): Promise<void>;
  listarRecentes(tenantId: string, limite?: number): Promise<(Lote & { id: string })[]>;
}

// --- Envio Repository ---

export interface CriarEnvioData {
  telefone: string;
  nome: string;
  nomeContato: string;
  imoveis: Imovel[];
  mensagem?: string;
}

export interface ContadoresEnvio {
  enviados: number;
  erros: number;
  cancelados: number;
  total: number;
}

export interface IEnvioRepository {
  buscarPorId(tenantId: string, loteId: string, envioId: string): Promise<(Envio & { id: string }) | null>;
  listarPorLote(tenantId: string, loteId: string, limite?: number, cursor?: string): Promise<{ envios: (Envio & { id: string })[]; hasMore: boolean; nextCursor?: string }>;
  criar(tenantId: string, loteId: string, data: CriarEnvioData): Promise<string>;
  atualizarStatus(tenantId: string, loteId: string, envioId: string, status: string, extra?: Record<string, unknown>): Promise<void>;
  marcarEnviado(tenantId: string, loteId: string, envioId: string, mensagem: string): Promise<void>;
  marcarErro(tenantId: string, loteId: string, envioId: string, erro: string): Promise<void>;
  cancelarPendentes(tenantId: string, loteId: string): Promise<number>;
  contarPorStatus(tenantId: string, loteId: string): Promise<ContadoresEnvio>;
}

// --- Imovel Enviado Repository ---

export interface IImovelEnviadoRepository {
  buscarHashesExistentes(tenantId: string, hashes: string[]): Promise<Set<string>>;
  registrarEnviados(tenantId: string, telefone: string, imoveis: Imovel[], loteId: string, envioId: string): Promise<void>;
  buscarPorTelefone(tenantId: string, telefone: string): Promise<(ImovelEnviado & { id: string })[]>;
  limparAntigos(tenantId: string, anteriorA: Timestamp): Promise<number>;
}
