import { z } from "zod";

const imovelSchema = z.object({
  edificio: z.string(),
  endereco: z.string(),
  numero: z.string(),
  apartamento: z.string(),
  operacao: z.enum(["venda", "locacao", "venda e locacao"]),
  valorVenda: z.string(),
  valorLocacao: z.string(),
});

const contatoComStatusSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  telefone: z.string().min(1, "Telefone é obrigatório"),
  imoveis: z.array(imovelSchema).min(1, "Pelo menos um imóvel é obrigatório"),
  status: z.enum(["novo", "ja_enviado"]),
  dataUltimoEnvio: z.string().optional(),
  mensagemPreview: z.string().optional(),
  hashesNovos: z.array(z.string()),
  hashesExistentes: z.array(z.string()),
});

export const confirmarEnvioSchema = z.object({
  contatos: z
    .array(contatoComStatusSchema)
    .min(1, "Pelo menos um contato é obrigatório"),
  pdfOrigem: z.string().min(1, "Nome do PDF de origem é obrigatório"),
});

export const cancelarLoteParamsSchema = z.object({
  id: z.string().min(1, "ID do lote é obrigatório"),
});

export const cancelarEnvioParamsSchema = z.object({
  id: z.string().min(1, "ID do lote é obrigatório"),
  envioId: z.string().min(1, "ID do envio é obrigatório"),
});

export const contatoTelefoneParamsSchema = z.object({
  telefone: z.string().min(1, "Telefone é obrigatório"),
});
