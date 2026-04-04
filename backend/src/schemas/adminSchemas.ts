import { z } from "zod";

export const criarClienteSchema = z.object({
  uid: z.string().min(1, "UID do usuário é obrigatório"),
  nome: z.string().min(1, "Nome é obrigatório"),
  nomeCorretor: z.string().min(1, "Nome do corretor é obrigatório"),
  nomeEmpresa: z.string().min(1, "Nome da empresa é obrigatório"),
  cargo: z.string().optional().default("corretor"),
  textoPersonalizado: z.string().optional(),
  zapiInstanceId: z.string().min(1, "Z-API Instance ID é obrigatório"),
  zapiToken: z.string().min(1, "Z-API Token é obrigatório"),
  zapiClientToken: z.string().min(1, "Z-API Client Token é obrigatório"),
  limiteDiario: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
    .pipe(z.number().int().min(1).max(10000))
    .optional()
    .default(200),
});

export const editarClienteSchema = z.object({
  nome: z.string().min(1).optional(),
  nomeCorretor: z.string().min(1).optional(),
  nomeEmpresa: z.string().min(1).optional(),
  cargo: z.string().min(1).optional(),
  textoPersonalizado: z.string().optional(),
  zapiInstanceId: z.string().min(1).optional(),
  zapiToken: z.string().min(1).optional(),
  zapiClientToken: z.string().min(1).optional(),
  limiteDiario: z
    .union([z.string(), z.number()])
    .transform((val) => (typeof val === "string" ? parseInt(val, 10) : val))
    .pipe(z.number().int().min(1).max(10000))
    .optional(),
});

export const editarClienteParamsSchema = z.object({
  id: z.string().min(1, "ID do cliente é obrigatório"),
});
