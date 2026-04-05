// Status de envio individual
export const ENVIO_STATUS = {
  PENDENTE: "pendente",
  ENVIANDO: "enviando",
  ENVIADO: "enviado",
  ERRO: "erro",
  CANCELADO: "cancelado",
} as const;

export type EnvioStatus = (typeof ENVIO_STATUS)[keyof typeof ENVIO_STATUS];

// Status de lote
export const LOTE_STATUS = {
  EM_ANDAMENTO: "em_andamento",
  FINALIZADO: "finalizado",
  CANCELADO: "cancelado",
} as const;

export type LoteStatus = (typeof LOTE_STATUS)[keyof typeof LOTE_STATUS];

// Query keys centralizadas
export const queryKeys = {
  dashboard: ["dashboard"] as const,
  lotes: (tenantId?: string) => ["lotes", tenantId] as const,
  admin: {
    all: ["admin"] as const,
    clientes: ["admin", "clientes"] as const,
    pendentes: ["admin", "pendentes"] as const,
    monitoramento: ["admin", "monitoramento"] as const,
  },
};

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
  status: LoteStatus;
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
  status: EnvioStatus;
  erro: string;
  enviadoEm: string | null;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
