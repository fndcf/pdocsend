import { Timestamp } from "firebase-admin/firestore";
import { Imovel } from "./Imovel";

export interface Lote {
  id?: string;
  totalEnvios: number;
  enviados: number;
  erros: number;
  status: "em_andamento" | "finalizado" | "cancelado";
  pdfOrigem: string;
  criadoPor: string;
  tenantId: string;
  criadoEm: Timestamp;
  finalizadoEm: Timestamp | null;
}

export interface Envio {
  id?: string;
  telefone: string;
  nome: string;
  nomeContato: string;
  imoveis: Imovel[];
  mensagem: string;
  status: "pendente" | "enviando" | "enviado" | "erro";
  erro: string;
  enviadoEm: Timestamp | null;
  criadoEm: Timestamp;
}

export interface ImovelEnviado {
  telefone: string;
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  loteId: string;
  envioId: string;
  enviadoEm: Timestamp;
}
