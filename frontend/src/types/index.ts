export interface Imovel {
  edificio: string;
  endereco: string;
  numero: string;
  apartamento: string;
  operacao: "venda" | "locacao" | "venda e locacao";
  valorVenda: string;
  valorLocacao: string;
}

export interface Contato {
  nome: string;
  telefone: string;
  imoveis: Imovel[];
}

export interface ContatoComStatus extends Contato {
  status: "novo" | "ja_enviado";
  dataUltimoEnvio?: string;
  mensagemPreview?: string;
}

export interface Lote {
  id: string;
  totalEnvios: number;
  enviados: number;
  erros: number;
  status: "em_andamento" | "finalizado" | "cancelado";
  pdfOrigem: string;
  criadoEm: string;
  finalizadoEm: string | null;
}

export interface EnvioItem {
  id: string;
  telefone: string;
  nome: string;
  nomeContato: string;
  imoveis: Imovel[];
  mensagem: string;
  status: "pendente" | "enviando" | "enviado" | "erro" | "cancelado";
  erro: string;
  enviadoEm: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
