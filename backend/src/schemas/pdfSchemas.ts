import { z } from "zod";

export const processarPdfFormFieldsSchema = z.object({
  filtroOperacao: z.enum(["todos", "venda", "locacao"]).optional().default("todos"),
});
