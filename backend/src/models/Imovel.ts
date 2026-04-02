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
  hashesNovos: string[];
  hashesExistentes: string[];
}
