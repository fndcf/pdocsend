import { z } from "zod";

export const processarPdfFormFieldsSchema = z.object({
  filtroOperacao: z.enum(["todos", "venda", "locacao"]).optional().default("todos"),
  valorVendaMin: z.string().optional(),
  valorVendaMax: z.string().optional(),
  valorLocacaoMin: z.string().optional(),
  valorLocacaoMax: z.string().optional(),
});
