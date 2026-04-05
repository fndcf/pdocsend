import { Contato, ContatoComStatus, Imovel } from "../models/Imovel";
import { MensagemTemplate } from "../models/Tenant";

// --- PDF Parser ---

export interface ImovelBruto {
  proprietario: string;
  telefone: string;
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  locacao: string;
  venda: string;
}

export interface IPdfParserService {
  extrairDoPdf(buffer: Buffer): Promise<ImovelBruto[]>;
}

// --- Data Cleaner ---

export interface IDataCleanerService {
  processar(dadosBrutos: ImovelBruto[]): Contato[];
}

// --- Message Builder ---

export interface IMessageBuilderService {
  montarMensagem(contato: Contato, template: MensagemTemplate): string;
  montarMensagemPreview(contato: Contato, template: MensagemTemplate): string;
  aplicarSaudacao(mensagem: string): string;
  montarNomeContato(contato: Contato): string;
}

// --- Deduplicacao ---

export interface IDeduplicacaoService {
  verificar(tenantId: string, contatos: Contato[]): Promise<ContatoComStatus[]>;
  registrarEnviados(tenantId: string, telefone: string, imoveis: Imovel[], loteId: string, envioId: string): Promise<void>;
}

// --- Z-API ---

export interface IZApiService {
  verificarConexao(instanceId: string, token: string, clientToken: string): Promise<boolean>;
  enviarMensagem(instanceId: string, token: string, clientToken: string, telefone: string, mensagem: string): Promise<unknown>;
}

// --- Fila Envio ---

export interface EnvioPayload {
  tenantId: string;
  loteId: string;
  envioId: string;
}

export interface IFilaEnvioService {
  criarTasks(payloads: EnvioPayload[], functionUrl: string): Promise<void>;
}
